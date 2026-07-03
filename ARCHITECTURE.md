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
