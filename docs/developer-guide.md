# POS Developer Guide

This guide is for **engineers** working on the POS monorepo: local setup,
architecture, API modules, frontend apps, auth, data storage, and deployment.

For end-user workflows see the [User Guide](user-guide.md). For EXE/APK/service
packaging see [Build & ship](build/README.md).

---

## Table of contents

1. [Architecture](#architecture)
2. [Repository layout](#repository-layout)
3. [Requirements](#requirements)
4. [Local development](#local-development)
5. [Environment variables](#environment-variables)
6. [Backend API](#backend-api)
7. [Data storage](#data-storage)
8. [Authentication](#authentication)
9. [HQ web console](#hq-web-console)
10. [Till terminal](#till-terminal)
11. [Price check app](#price-check-app)
12. [Real-time updates (SSE)](#real-time-updates-sse)
13. [Navigation and access control](#navigation-and-access-control)
14. [Theming and dark mode](#theming-and-dark-mode)
15. [Integrations and hardware](#integrations-and-hardware)
16. [Quality checks](#quality-checks)
17. [Production builds](#production-builds)
18. [Contributing](#contributing)
19. [Security notes](#security-notes)

---

## Architecture

```text
                    ┌──────────────────────────────────────┐
                    │           HQ Console (web)           │
                    │   Next.js 16 · React 19 · :3000      │
                    │   /api/* rewritten → backend         │
                    └──────────────────┬───────────────────┘
                                       │
┌──────────────────────┐               │              ┌──────────────────────┐
│  Till (pos)          │               │              │  Price check         │
│  Vite · React · :1420│───────────────┼──────────────│  Vite · React · :1430│
│  Tauri 2 (EXE/APK)   │    HTTP /api  │              │  Tauri 2 (EXE/APK)   │
└──────────────────────┘               │              └──────────────────────┘
                                       ▼
                    ┌──────────────────────────────────────┐
                    │         NestJS API (backend)         │
                    │              :3001/api               │
                    │   JSON file persistence · Cloudinary │
                    └──────────────────────────────────────┘
```

| Layer | Technology |
| --- | --- |
| Language | TypeScript (apps); Rust (Tauri shells) |
| Package manager | pnpm 11 (`packageManager` in each app) |
| Node | 22 (`.nvmrc`) |
| API | NestJS 11, Express, class-validator |
| HQ | Next.js 16, React 19, Tailwind CSS 4, Recharts |
| Clients | Vite 8, React 19, Tauri 2 |
| Persistence | JSON files under `backend/data/` (no SQL) |

There is **no root workspace package.json**. Each app (`backend`, `web`, `pos`,
`price-check`) is an independent pnpm project with its own dependencies.

---

## Repository layout

```text
POS/
├── backend/           NestJS API
│   ├── src/           Modules (catalog, sales, console, crm, chat, …)
│   └── data/          Runtime JSON (gitignored, created on first run)
├── web/               Next.js HQ console + marketing site
│   └── src/
│       ├── app/       App Router routes
│       ├── components/
│       └── lib/       API clients, nav, ops helpers
├── pos/               Till terminal
│   └── src-tauri/     Tauri native project
├── price-check/       Handheld lookup
│   └── src-tauri/
├── docs/
│   ├── user-guide.md
│   ├── developer-guide.md
│   └── build/         Packaging manuals
├── .env.example       Pointer env vars
├── CONTRIBUTING.md
└── README.md
```

---

## Requirements

| Tool | Version | Notes |
| --- | --- | --- |
| Node.js | 22 | Use `nvm use` with `.nvmrc` |
| pnpm | 11 | `corepack enable` recommended |
| Rust + VS Build Tools | Latest stable | Only for Tauri EXE/APK builds |
| Android SDK | API 34+ | Only for APK builds |

See [docs/build/prerequisites.md](build/prerequisites.md) for full packaging
toolchain setup.

---

## Local development

### Start the full stack

```bash
# Terminal 1 — API (required for all clients)
cd backend
pnpm install
pnpm dev          # nest start --watch → http://localhost:3001/api

# Terminal 2 — HQ console
cd web
pnpm install
pnpm dev          # http://localhost:3000

# Terminal 3 — Till (optional)
cd pos
pnpm install
pnpm dev          # http://localhost:1420

# Terminal 4 — Price check (optional)
cd price-check
pnpm install
pnpm dev          # http://localhost:1430
```

### API proxying

| App | How `/api` reaches the backend |
| --- | --- |
| **web** | `next.config.ts` rewrites `/api/*` → `http://localhost:3001/api/*` |
| **pos** | Vite dev server proxy to `127.0.0.1:3001` |
| **price-check** | Vite dev server proxy to `127.0.0.1:3001` |

Packaged till/price-check builds have **no dev proxy**. Set `VITE_API_URL` or
the in-app API field to a reachable server.

### Demo HQ login

Seed data includes demo accounts (see `backend/src/console/` setup seeds).
Common local demo: username `emma` with password `demo` and broad privileges —
verify against current seed constants in the codebase.

### First run

On first API start, `backend/data/` is populated from TypeScript seed constants
if files are missing. Do not commit `backend/data/` — it is local state.

---

## Environment variables

Copy examples per app:

| File | App |
| --- | --- |
| `.env.example` → `backend/.env` | API |
| `web/.env.example` → `web/.env` | HQ |
| `pos/.env.example` → `pos/.env.production` | Packaged till |
| `price-check/.env.example` | Price check |

### Backend (`backend/.env`)

| Variable | Purpose |
| --- | --- |
| `PORT` | API port (default `3001`) |
| `CORS_ORIGINS` | Documented allowed origins |
| `GOOGLE_CLIENT_ID` | Verify Google ID tokens for HQ login/signup |
| `CLOUDINARY_CLOUD_NAME` | Product image uploads |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary secret (max upload 1 MB enforced in code) |
| `HQ_APP_URL` | Public HQ URL for links in welcome and reset emails |
| `SMTP_HOST` | Mail server host (Nodemailer) |
| `SMTP_PORT` | Mail server port (default `587`) |
| `SMTP_SECURE` | `true` for TLS on port 465 |
| `SMTP_USER` / `SMTP_PASS` | SMTP credentials (optional for open relays) |
| `SMTP_FROM` | From address, e.g. `POS HQ <noreply@yourdomain.com>` |

### Web (`web/.env`)

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google Sign-In button (must match API client ID) |

### Till / price-check

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Base URL for packaged builds (e.g. `http://192.168.1.10:3001`) |

Never commit real secrets or production `backend/data/` dumps.

### Account welcome emails

When SMTP is configured on the API, Nodemailer sends HTML emails for:

- **Company registration** — owner welcome after `/api/console/register-company` or Google signup
- **Admin-created accounts** — welcome with username, group, and temporary password
- **Legacy personal register** — welcome for staff-style signup
- **Forgot password** — reset link (dev fallback returns `resetToken` when SMTP is off)

If SMTP is not set, messages are **logged to the API console** instead of sent.

---

## Backend API

**Entry:** `backend/src/main.ts` — global prefix `/api`, default port `3001`.

**Module registration:** `backend/src/app.module.ts`

| Module | Prefix | Responsibility |
| --- | --- | --- |
| `health` | `/health` | Liveness probe |
| `auth` | `/auth` | Till staff login |
| `console` | `/console` | HQ auth, accounts, groups, tills, org setup, import/export |
| `tenants` | `/tenants` | Org snapshot |
| `catalog` | `/catalog` | Products, lookup, taxonomy, images |
| `inventory` | `/inventory` | Stock levels, movements |
| `orders` | `/orders` | Purchase order lifecycle |
| `sales` | `/sales` | POS sale tickets |
| `expenses` | `/expenses` | Expense records |
| `payments` | `/payments` | Payments list, charge |
| `reports` | `/reports` | X/Z/tax register reports |
| `staff` | `/staff` | Shifts, PIN unlock, day close |
| `customers` | `/customers` | Loyalty, credits, gift cards |
| `crm` | `/crm` | Support CRM + SSE stream |
| `chat` | `/chat` | Conversations + SSE stream |
| `directory` | `/directory/:name` | Generic JSON directories |
| `floor` | `/floor/:board` | Table/room boards |
| `integrations` | `/integrations` | Nigeria connector catalog |
| `hardware` | `/hardware` | Printers, silent print (Windows) |

Short endpoint cheat sheet: [backend/README.md](../backend/README.md).

### Adding a new API module

1. Create `backend/src/<name>/` with `*.module.ts`, `*.controller.ts`,
   `*.service.ts`, `*.types.ts`.
2. Register in `app.module.ts`.
3. Add JSON store file under `backend/data/` if persistence is needed.
4. Add client functions in `web/src/lib/hq-api.ts` (or a focused lib file).
5. Wire routes/pages in `web/src/app/`.

---

## Data storage

All persistent state is **JSON on disk** under `backend/data/`. Services read on
module init and write on mutations. There is no ORM or migration runner.

| File / path | Domain |
| --- | --- |
| `catalog.json` | Products |
| `sales.json` | Sales tickets |
| `stock-movements.json` | Inventory |
| `trade-docs.json` | Purchase orders |
| `expenses.json` | Expenses |
| `hq-company.json`, `hq-branches.json`, `hq-stores.json`, … | Organisation |
| `hq-accounts.json`, `hq-groups.json`, `hq-sessions.json` | HQ users & auth |
| `hq-tills.json` | Till licences and device binding |
| `hq-customer-*.json` | Customer programmes |
| `hq-crm.json` | Support CRM |
| `hq-chat-*.json` | Chat |
| `directories/*.json` | Named directories (customers, staff, …) |
| `boards/*.json` | Floor/table boards |

Seeds live beside modules (e.g. `catalog.seed.ts`, console setup types). Reset
local data by stopping the API and deleting files under `backend/data/` (back up
first).

---

## Authentication

Two separate auth domains:

### HQ console auth

| Step | Endpoint / storage |
| --- | --- |
| Register company | `POST /api/console/register-company` |
| Login | `POST /api/console/login` |
| Google | `POST /api/console/auth/google` (`intent: signup \| login`) |
| Session | Bearer token in `localStorage` key `hq.session.v1` |
| Validate | `GET /api/console/me` |
| Password reset | `/api/console/forgot-password`, `/api/console/reset-password` |

Groups in `hq-groups.json` carry `departments` and `privileges` that gate HQ
routes client-side (`canAccessPath` in console shell) and should be enforced
server-side for sensitive mutations.

### Till auth and licensing

| Step | Endpoint |
| --- | --- |
| HQ creates till | `POST /api/console/tills` → 16-char code |
| Device activation | `POST /api/console/tills/activate` + `hardwareHex` |
| Heartbeat | `POST /api/console/tills/heartbeat` |
| Staff login | `POST /api/auth/login` |
| Shifts | `/api/staff/*` (open/close shift, PIN unlock, day close) |

Till subscription: **1 year from activation**. Re-enter code when expired.

---

## HQ web console

**Framework:** Next.js 16 App Router under `web/src/app/`.

### Route groups

| Group | Path | Purpose |
| --- | --- | --- |
| `(marketing)/` | `/`, `/product`, `/pricing`, `/download`, … | Public site |
| `(auth)/` | `/login`, `/register`, … | Authentication |
| `(console)/` | `/dashboard`, `/setup/*`, `/reports/*`, … | Authenticated HQ |

Console layout wraps pages in `ConsoleShell` + `Sidebar` (`web/src/components/`).

### Key libraries

| Path | Role |
| --- | --- |
| `web/src/lib/hq-api.ts` | Fetch wrappers for console API |
| `web/src/lib/hq-ops.ts` | Sales aggregation, `naira()` formatting |
| `web/src/lib/nav.ts` | Sidebar `NAV`, access tree `ACCESS_NAV` |
| `web/src/hooks/useThemeColors.ts` | Chart/theme colours for light/dark |
| `web/src/lib/live-workspace.ts` | SSE hooks for chat/CRM |

### Notable custom pages

| Component | Route |
| --- | --- |
| `ItemSalesPage` | `/reports/sales/gross-profit/by-item` |
| `LeaderboardPage` | `/reports/sales/gross-profit/by-subgroup` |
| `CrmManagers` | `/crm/*` |
| `HelpCenter` | `/help` |
| `ChatPage` | `/chat` |

Routing for sales gross-profit slugs:
`web/src/app/(console)/reports/sales/[...slug]/page.tsx`

### Next.js agent rules

`web/AGENTS.md` and `web/CLAUDE.md` are auto-generated by `next dev` for
Next.js 16 conventions. Read `node_modules/next/dist/docs/` before assuming
older Next.js APIs.

---

## Till terminal

**Path:** `pos/src/`

| Script | Command |
| --- | --- |
| Dev | `pnpm dev` → Vite :1420 |
| Web build | `pnpm build` |
| Windows EXE | `pnpm tauri:build` |
| Android APK | `pnpm tauri:apk` (after `pnpm tauri android init`) |

Screens cover selling, payment, split pay, receipts, KDS, tables, rooms, shift
settings. State is fetched from `/api/catalog`, `/api/sales`, `/api/staff`, etc.

Native shell: `pos/src-tauri/`.

---

## Price check app

**Path:** `price-check/src/`

Lookup flow: scan barcode → `GET /api/catalog/lookup` (or equivalent) → display
price and product info.

Production builds need API URL via `VITE_API_URL` or the on-screen settings
field.

---

## Real-time updates (SSE)

Server-Sent Events keep HQ views live without polling.

| Stream | Endpoint | Module |
| --- | --- | --- |
| CRM | `GET /api/crm/stream` | `crm.service.ts` |
| Chat | `GET /api/chat/stream` | `chat.service.ts` |

Frontend: `web/src/lib/live-workspace.ts` — hooks consumed by Chat and CRM
managers. Restart the API after adding or changing SSE routes (404 until restart).

---

## Navigation and access control

**Sidebar:** `NAV` in `web/src/lib/nav.ts` — four sections (Main Menu,
Analytics, Workspace, Settings).

**Full privilege tree:** `ACCESS_NAV` — used when editing group permissions in
HQ. Departments: `Report`, `Transaction`, `Setup`.

**Active route logic:** `Sidebar.tsx` uses longest-prefix matching so parent
routes like `/crm/overview` do not stay active on every `/crm/*` child.

When adding a page:

1. Create the route under `web/src/app/(console)/…`
2. Add a nav entry in `NAV` and/or `ACCESS_NAV` with a **unique `id`**
3. Map privileges in group editor if access should be restricted

---

## Theming and dark mode

Design tokens live in `web/src/app/globals.css` as `--pos-*` CSS variables
(`bg-pos-surface`, `text-pos-ink`, `text-pos-primary`, etc.).

Rules for UI work:

- Prefer `pos-*` Tailwind classes over hard-coded `white` / `#fff` backgrounds
- Featured cards and stat pills should use semantic tokens (`bg-pos-primary`,
  `bg-pos-success-soft`) so dark mode inverts correctly
- Charts: `useThemeColors()` for grid, ink, and primary colours

---

## Integrations and hardware

| Area | Location |
| --- | --- |
| Nigeria connectors catalog | `backend/src/integrations/` |
| Payment charge | `/api/payments/charge` |
| Windows printers | `/api/hardware/printers`, `/api/hardware/print` |
| Cloudinary images | `backend/src/catalog/cloudinary.service.ts` |

Till payment UI references gateway config from HQ org setup.

---

## Quality checks

Run per app before opening a PR:

```bash
# HQ typecheck
cd web && pnpm exec tsc --noEmit

# API build
cd backend && pnpm build

# Till / price-check build
cd pos && pnpm build
cd price-check && pnpm build
```

Manual test matrix:

| Change type | Test |
| --- | --- |
| HQ page | Sign in, light + dark mode, mobile width |
| API | Hit endpoint with curl or HQ UI |
| Till | Activation, sale, payment, shift |
| SSE | Two browser tabs on Chat or CRM |

---

## Production builds

| App | Build | Run |
| --- | --- | --- |
| backend | `pnpm build` | `pnpm start:prod` |
| web | `pnpm build` | `pnpm start` |
| pos | `pnpm build` / `pnpm tauri:build` | `pnpm preview` or installer |
| price-check | same as pos | same |

Full packaging walkthrough: [docs/build/README.md](build/README.md)

- [Windows EXE](build/windows-exe.md)
- [Android APK](build/android-apk.md)
- [API + HQ Windows services](build/services.md)
- [Signing](build/signing.md)
- [GitHub Releases](build/github-releases.md)

Example production env files: `docs/build/examples/`.

---

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md):

- One concern per PR
- Node 22 + pnpm 11
- Imperative commit messages (`Add till heartbeat`, not `Added`)
- No secrets or `backend/data/` in commits
- Security-sensitive: till codes, hardware hex, session tokens

Issue and PR templates live under `.github/`.

---

## Security notes

- Report vulnerabilities per [SECURITY.md](../SECURITY.md) — do not open public
  issues for exploits.
- HQ sessions are bearer tokens in `localStorage`; treat XSS as in scope.
- Till activation binds `hardwareHex`; protect till codes like licence keys.
- JSON file storage is suitable for single-tenant / demo deployments; plan
  migration before high-scale multi-tenant production.
- CORS: `main.ts` may use permissive `origin: true` in dev — tighten for
  production deployments.

---

## Quick reference

```bash
# Typecheck HQ
cd web && pnpm exec tsc --noEmit

# API health
curl http://localhost:3001/api/health

# Reset local data (destructive)
rm -rf backend/data/*
cd backend && pnpm dev
```

| Doc | Audience |
| --- | --- |
| [User Guide](user-guide.md) | Managers, cashiers, HQ users |
| [Build & ship](build/README.md) | IT, release engineering |
| [Contributing](../CONTRIBUTING.md) | Contributors |
| [Backend README](../backend/README.md) | API endpoint summary |
