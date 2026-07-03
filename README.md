# Kintsu OS

Enterprise retail operating system for a premium ethnic and bridal wear
fashion brand — POS billing, inventory, bridal order tracking, alterations,
vendor/purchase management, CRM, loyalty, staff, reporting, and more, built
on a multi-store-ready architecture.

## Tech stack

- **Next.js 16** (App Router, Turbopack, React 19) + TypeScript
- **Tailwind CSS v4** + **shadcn/ui** (New York style)
- **PostgreSQL** + **Drizzle ORM** (see [note below](#why-drizzle-instead-of-prisma))
- **Better Auth** for authentication, with a custom 6-role RBAC layer
- **React Query**, **React Hook Form**, **Zod**
- **Recharts**, **bwip-js** (Code128 barcodes), **xlsx** (Excel export),
  **date-fns**
- Docker / Docker Compose for containerized deployment

### Why Drizzle instead of Prisma?

The spec calls for Prisma. In the sandbox this project was built in, the
Prisma CLI could not complete `generate` or `migrate` — every attempt
(including retries, small and large payloads) had its connection to
`engines.prisma.sh` / `binaries.prisma.sh` reset by the environment's egress
policy, making Prisma fully non-functional there. Drizzle ORM was used
instead: it's pure TypeScript, talks to Postgres directly through `pg`, and
needs no binary downloads at all, which let every migration and query in
this codebase be run and verified against a real database during
development instead of being written on faith.

If your deployment environment can reach Prisma's CDN, porting back is
straightforward — the schema in `src/db/schema/*.ts` maps almost 1:1 to a
`schema.prisma` file (same tables, columns, enums and relations), and none
of the application code talks to Drizzle outside of `src/db` and the
`src/actions/*.ts` files.

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Start Postgres

Either run it natively, or via Docker Compose:

```bash
docker compose up -d db
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in `DATABASE_URL` (matches the Docker Compose service by default) and
generate a `BETTER_AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Run migrations

```bash
npm run db:migrate
```

This applies the SQL migrations in `src/db/migrations` (generated from the
schema with `npm run db:generate`) to your database.

### 5. Start the dev server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000). The first visit
redirects to `/signup` — creating an account there provisions a new store,
a default warehouse, default store settings, and makes you its **Owner**.
Every other role (Admin, Manager, Cashier, Sales Staff, Inventory Manager)
is created afterwards from **Staff → Add staff**, not through public
sign-up — this keeps role assignment under the Owner/Admin's control.

### Scripts

| Script              | Purpose                                        |
| -------------------- | ----------------------------------------------- |
| `npm run dev`         | Start the dev server (Turbopack)                |
| `npm run build`       | Production build (standalone output)            |
| `npm run start`       | Run the production build                        |
| `npm run lint`        | ESLint                                          |
| `npm run db:generate` | Generate a SQL migration from the schema changes|
| `npm run db:migrate`  | Apply pending migrations                        |
| `npm run db:push`     | Push schema directly (dev convenience, skips migration files) |
| `npm run db:studio`   | Open Drizzle Studio to browse the database       |

### Docker

```bash
docker compose up -d db          # Postgres only, for local `npm run dev`
docker compose --profile full up -d   # Postgres + the built app container
```

The `Dockerfile` produces a Next.js standalone build; only `server.js`,
`.next/static`, and `public` ship in the final image.

## Module status

Built with **tiered depth**: full breadth across all 18 spec modules, with
deliberately different levels of polish based on how central each is to
daily store operations.

**Tier 1 — deep, end-to-end, verified against a live database:**
Auth & RBAC, Dashboard, Products & Barcode, Inventory, POS Billing,
Customer CRM, Bridal Management, Alteration Management, Vendor Management,
Purchase Management, Settings.

**Tier 2 — functional, lighter UI:**
Reports (Sales/GST/Inventory/Profit/Purchase/Vendor/Customer/Best
Seller/Dead Stock/Staff Sales, with CSV/Excel/print-to-PDF export), Staff
Management (accounts, attendance, targets, audit log), Loyalty Program
(tiers, points, birthday offers).

**Tier 3 — real architecture, no live third-party credentials:**
- **Notifications** (`src/lib/notifications/`): a pluggable adapter
  interface. WhatsApp/SMS/Email adapters exist and are env-var gated
  (`WHATSAPP_API_KEY`, `SMS_API_KEY`, `EMAIL_SMTP_*` — see `.env.example`);
  without those set, a console/dev adapter runs instead and still writes a
  real `notificationLog` row, so the whole pipeline is exercisable today at
  `/notifications`.
- **AI Assistant** (`src/lib/ai/`): a rule-based intent parser and query
  handlers that answer questions about stock, sales, customers, and
  restocking directly from your Postgres data — no LLM API key required or
  used. Try it at `/assistant`.
- **Website Sync** (`src/app/api/integrations/`): an authenticated
  (`x-api-key` header, `WEBSITE_SYNC_API_KEY`) REST contract — `GET
  /api/integrations/inventory` for reading the shared stock/catalog, `POST
  /api/integrations/webhooks/order` for reconciling a website order against
  inventory. Both are real, tested endpoints; there's simply no e-commerce
  frontend in this repo to call them yet.

## Role-based access control

Six roles — Owner, Admin, Manager, Cashier, Sales Staff, Inventory
Manager — map to a permission matrix in `src/lib/rbac.ts`. Server actions
always re-check permissions server-side via `requirePermission()`
(`src/lib/session.ts`); the sidebar simply hides links a role can't use.

## Project structure

```
src/
  actions/        Server actions — one file per module, all "use server"
  app/
    (auth)/       Login / signup, no sidebar
    (dashboard)/  Every authenticated module, behind the app shell
    api/          Better Auth handler, barcode image renderer,
                  website-sync REST endpoints
  components/
    ui/           shadcn/ui primitives
    layout/       Sidebar, topbar, theme toggle
    <module>/     Per-module client components (forms, dialogs, tables)
  db/
    schema/       Drizzle table definitions, one file per domain
    migrations/   Generated SQL migrations
  lib/
    ai/           Intent parser + query handlers (AI Assistant)
    notifications/  Adapter interface + WhatsApp/SMS/Email/console adapters
    export/       CSV / Excel export helpers
    validations/  Zod schemas, one file per module
    rbac.ts, session.ts, auth.ts, barcode.ts, numbering.ts, ...
```

## Verification

Every module listed under Tier 1/2 above, plus the Tier 3 architecture,
was exercised through the real UI (or `curl` for the API endpoints) against
a live Postgres database during development — not just typechecked. That
includes: end-to-end POS checkout with inventory decrement and GST
calculation, a return with inventory restoration, GRN receiving with
damaged-goods handling, the website-sync webhook actually moving stock, and
the AI assistant answering from real rows. `npm run build` and `npm run
lint` are clean.
