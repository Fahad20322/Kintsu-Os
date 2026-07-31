# Architecture

## Data model

43 tables across 11 schema files under `src/db/schema/`. Highlights:

- **Multi-store ready from day one**: `store` is a first-class table and
  every transactional table (`sale`, `inventory`, `stockMovement`,
  `bridalOrder`, `alteration`, `purchaseOrder`, `staffTarget`, ...) carries
  a `storeId`. The product catalog (`product`, `productVariant`) is
  intentionally **not** store-scoped — it's a shared source of truth, with
  per-store stock tracked in `inventory` — so the same SKU can be sold from
  multiple stores (or a future website) without duplicating catalog data.
  Today the app provisions one store per Owner sign-up; nothing in the
  schema blocks adding a store switcher later.
- **Inventory is a ledger, not just a counter**: every stock change
  (`inventory.quantity`) is paired with a `stockMovement` row recording the
  type (`PURCHASE_IN`, `SALE_OUT`, `RETURN_IN`, `EXCHANGE_IN/OUT`,
  `DAMAGE_OUT`, `TRANSFER_IN/OUT`, `ADJUSTMENT_IN/OUT`), quantity, resulting
  balance, and who/why. This is what makes the Dead Stock report, the
  Inventory movement history, and cross-module debugging possible.
- **Money as `numeric`, not `float`**: every monetary column is Postgres
  `numeric`, passed to/from JS as strings and only converted to `Number`
  for display or arithmetic that's then rounded back to 2dp before storage
  (see `round2()` in `src/actions/pos.ts`). This avoids floating-point
  drift across the app's various discount/GST/loyalty calculations.
- **Auth tables** (`user`, `session`, `account`, `verification`) follow
  Better Auth's expected shape exactly, with `role`, `storeId`, `phone`,
  `isActive` added as `additionalFields` (see `src/lib/auth.ts`). `role`
  and `storeId` are marked `input: false` so a client-side sign-up request
  can never set its own role — only server code (the onboarding flow, or
  `createStaffAccount`) can.

## Request flow

```
Client Component ──(server action call)──> src/actions/*.ts
                                              │
                                              ├─ requirePermission() / requireUser()  (src/lib/session.ts)
                                              ├─ zod schema parse                     (src/lib/validations/*.ts)
                                              ├─ db.transaction(...) for multi-step
                                              │  writes that must be atomic
                                              └─ revalidatePath(...)
```

Every mutation that touches money or stock (`checkout`, `processReturn`,
`processExchange`, `receiveGrn`, the website-order webhook) runs inside a
single `db.transaction`, and re-derives prices/stock levels from the
database rather than trusting client-submitted numbers — the POS checkout
action, for example, re-fetches `product.sellingPrice`/`gstRate` for every
cart line server-side before computing totals.

## RBAC

`src/lib/rbac.ts` defines:
- `ROLES` — the 6 role strings
- `PERMISSIONS` — ~29 fine-grained permission strings (`"products:manage"`,
  `"pos:discount_override"`, ...)
- `ROLE_PERMISSIONS` — the matrix mapping each role to its permission set

`src/lib/session.ts` wraps Better Auth's session lookup:
- `requireUser()` — redirects to `/login` if unauthenticated
- `requirePermission(permission)` — throws `ForbiddenError` if the user's
  role lacks it

Server actions call `requirePermission` as their **first line** — this is
the actual security boundary. The sidebar (`src/components/layout/nav-config.ts`
+ `sidebar-nav.tsx`) filters visible links by the same permissions purely
for UX; hiding a link is not itself a security control.

## Tier 3 extension points

- **Notifications** (`src/lib/notifications/index.ts`): call
  `sendNotification({ channel, event, recipient, data, refType?, refId? })`
  from any module to notify a customer/staff member. It renders the
  matching template from `NOTIFICATION_TEMPLATES`, picks a real adapter if
  its env vars are set (else falls back to the console adapter), and always
  logs the outcome. No other module currently calls this automatically
  (e.g. bridal trial reminders, low-stock alerts) — wiring those up is a
  natural next step and doesn't require touching the notification
  infrastructure itself.
- **AI Assistant** (`src/lib/ai/intent-parser.ts` + `handlers.ts`): add a
  new intent by extending the `Intent` union, adding a keyword rule in
  `parseQuery`, and a handler function in `handlers.ts`. If a real LLM
  becomes available later, the cleanest integration is to keep the
  rule-based parser as a fast/free first pass and fall back to the LLM only
  on `UNKNOWN`, rather than replacing it outright.
- **Website Sync** (`src/app/api/integrations/`): both endpoints are
  documented in a comment block at the top of their route files. The
  webhook deliberately does not create `sale`/`saleItem` rows for website
  orders (those are POS/store-scoped in this schema) — it only reconciles
  inventory and upserts the customer. A dedicated `onlineOrder` table would
  be the natural next step if website orders need their own lifecycle.

## Module 0 — Cloud architecture

The spec for Module 0 asks for a full enterprise cloud platform: multi-region
HA, auto-failover, database replication, 99.9% uptime, a CDN, and more. Most
of that is a property of *where and how* this app is deployed, not something
application code can create by itself — a Next.js app cannot make a single
Postgres instance replicate itself. So this module was built the same way
the rest of the app is: real, working code for everything that *is*
application-level, wired through pluggable adapters that fall back to a
local/dev implementation when no cloud credentials are configured (the same
pattern as the notifications adapters, see above) — and clear documentation
of what's a deployment-platform responsibility instead.

**Implemented in code, real and exercisable today:**

- **Cache / rate limiting** (`src/lib/cache.ts`, `src/lib/rate-limit.ts`,
  `src/proxy.ts`): a `CacheStore` interface with a Redis adapter (`ioredis`,
  works with self-hosted Redis, Valkey, or Upstash — set `REDIS_URL`) and an
  in-memory fallback. `proxy.ts` (Next.js 16 renamed `middleware.ts` →
  `proxy.ts`, and it now always runs on the Node.js runtime, not Edge —
  see the upgrade notes in `node_modules/next/dist/docs`) rate-limits
  `/api/auth/*` and `/api/integrations/*` per-IP. The in-memory fallback
  only shares state within one instance — set `REDIS_URL` for correct
  limits behind a load balancer.
- **Event bus** (`src/lib/events/`): an in-process `EventEmitter`-backed
  pub/sub with a typed event map (`sale.completed`, `inventory.updated`,
  `purchase.received`, `customer.created`, `loyalty.points_earned`,
  `bridal.status_changed`). Producers (`src/actions/*.ts`) and the one
  subscriber registered today (the audit logger, `src/lib/events/subscribers.ts`)
  only ever talk to `emitEvent`/`onEvent` — swapping the in-process bus for
  SNS/EventBridge/Kafka/Redis Streams later is a change to `bus.ts` alone.
- **Audit trail** (`src/lib/audit.ts`, `audit_log` table): every event-bus
  subscriber, plus direct calls from the actions that don't go through the
  bus, write a row capturing user, store, IP, user-agent and time. Covers
  login/logout (via Better Auth hooks in `src/lib/auth.ts`), product
  edit/price-change/deactivate, purchase order create/receive/cancel,
  billing, return, and exchange — the exact action list the spec calls out.
  Inventory changes also have a dedicated ledger (`stockMovement`, see
  above) which already carries who/why/when per movement.
- **File storage** (`src/lib/storage/`): `putObject`/`deleteObject` behind
  an adapter interface. `S3StorageAdapter` talks to AWS S3 or Cloudflare R2
  (same API, just point `S3_ENDPOINT` at R2) via `@aws-sdk/client-s3`;
  `LocalDiskAdapter` writes to `public/uploads` when `S3_BUCKET` isn't set.
  Wired into a real feature — product image upload
  (`src/actions/uploads.ts`, the "Images" card in the product form) — not
  just left as unused scaffolding.
- **Secure auth** (`src/lib/auth.ts`): Better Auth's `twoFactor` (TOTP +
  backup codes) and `emailOTP` (passwordless login, delivered through the
  existing notification pipeline) plugins, both wired into the login form
  and a new Settings → Security tab. Session/device management and login
  history use Better Auth's built-in session API (`listSessions`,
  `revokeSession`) plus the audit trail above — no extra plugin needed for
  those.
- **Health check** (`src/app/api/health/route.ts`): checks DB connectivity
  and latency; wired into the `Dockerfile`'s `HEALTHCHECK` and is the
  natural target for a load balancer or uptime monitor.
- **Backups** (`scripts/backup.sh`, `scripts/restore.sh`): `pg_dump`-based,
  daily/weekly/monthly retention, optional upload to S3/R2 via the AWS CLI.
  Point-in-time recovery and cross-region replication are the managed
  Postgres provider's job (see below) — this script is the logical dump
  rotation layered on top of that.
- **Offline POS** (`src/lib/offline/`, wired into `pos-terminal.tsx`): if a
  checkout can't reach the server (offline, or the request fails), the
  cart is saved to IndexedDB with a client-generated `clientRequestId` and
  auto-synced on reconnect; the server dedupes on that ID so a retried
  sync can't double-bill. This covers the realistic failure mode — the
  connection drops between building the cart and submitting it — not full
  offline product/price browsing, which would need a local product cache
  and is a larger, separate feature.
- **CI/CD** (`.github/workflows/ci.yml`): install → lint → typecheck →
  build → Docker build on every push/PR.

**Deployment-platform responsibilities (config, not code):**

- **High availability / auto-failover / DB replication / 99.9% uptime /
  point-in-time recovery**: properties of the managed Postgres service you
  deploy to (RDS Multi-AZ, Cloud SQL HA, Neon, Supabase, ...) plus running
  more than one app instance behind a load balancer pointed at
  `/api/health`. `docker-compose.yml` demonstrates the shape (Postgres +
  Redis + app, each with health checks) but a single `docker compose up`
  is not itself highly available — that's what the managed cloud provider
  gives you.
- **CDN**: put Cloudflare/CloudFront in front of the app and the file
  storage bucket. `next.config.ts`'s image handling and the storage
  adapter's public URLs both work unchanged behind a CDN.
- **Multi-region / nationwide scaling**: the schema is already multi-store
  (see "Data model" above) with no per-store code paths — going from 1
  store to 100 is a data/ops question, not a rewrite. Running the app
  itself in multiple regions in front of one primary database is a
  deployment topology choice.

## Path to multi-tenant SaaS

Today every deployment is single-brand: one Postgres database, any number
of `store` rows, no tenant boundary above the store. To become a
multi-tenant SaaS platform (each retailer gets isolated data on shared
infrastructure) without a rewrite:

1. Add an `organization` table and an `organizationId` column to `store`
   (and, if per-tenant user pools are desired, to `user`). This is an
   additive migration — every existing table is already scoped by
   `storeId`, so `organization` slots in as a parent of `store` rather than
   requiring every table to be touched.
2. Scope `requirePermission`/`requireUser` (`src/lib/session.ts`) to also
   assert the acting user's organization matches the resource's
   organization — one additional check alongside the existing role check.
3. Better Auth ships an `organization` plugin (see
   `node_modules/better-auth/dist/plugins/organization`) that covers
   invitations, org-scoped roles and switching between organizations, if a
   richer multi-org-per-user model is needed later instead of the
   simpler one-organization-per-account model above.

This isn't implemented now because it's a real schema/authz migration with
no corresponding product requirement yet (KINTSU OS today is single-brand)
— but nothing in the current schema blocks adding it later.

## Adding a new module

1. Add tables to a new `src/db/schema/<domain>.ts`, export from
   `src/db/schema/index.ts`, add `relations()` if it references existing
   tables, then `npm run db:generate && npm run db:migrate`.
2. Add permission strings to `PERMISSIONS`/`ROLE_PERMISSIONS` in
   `src/lib/rbac.ts`.
3. Add zod schemas in `src/lib/validations/<module>.ts`. If any field uses
   `z.coerce.number()`, export both `z.output<>` (the parsed type) and
   `z.input<>` (the raw form type) — `@hookform/resolvers`'s `zodResolver`
   needs `useForm<InputType, unknown, OutputType>()` for these to typecheck
   (see `src/lib/validations/product.ts` for the canonical example).
4. Add server actions in `src/actions/<module>.ts`, each starting with
   `requirePermission(...)`.
5. Add pages under `src/app/(dashboard)/<module>/`, components under
   `src/components/<module>/`, and a nav entry in
   `src/components/layout/nav-config.ts`.
