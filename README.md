# POS

A full-stack point-of-sale platform for **supermarkets, hotels, restaurants, and
dark kitchens**. Run sales at the till, manage your business from a web HQ
console, look up prices on the shop floor, and keep everything in sync through
one shared API.

This repository is a **monorepo** of four applications that work together. There
is no single root `package.json` — each app is installed and run from its own
folder with **pnpm**.

---

## Table of contents

- [What you get](#what-you-get)
- [Who this is for](#who-this-is-for)
- [Applications](#applications)
- [Features by area](#features-by-area)
- [How it works](#how-it-works)
- [Requirements](#requirements)
- [Installation and quick start](#installation-and-quick-start)
- [Configuration](#configuration)
- [First-time setup walkthrough](#first-time-setup-walkthrough)
- [Development](#development)
- [Building for production](#building-for-production)
- [Project structure](#project-structure)
- [Documentation](#documentation)
- [Support and contributing](#support-and-contributing)
- [License](#license)

---

## What you get

| Capability | Where |
| --- | --- |
| Sell at checkout (scan, pay, receipt) | Till app (`pos/`) |
| Manage catalog, prices, stock, users | HQ console (`web/`) |
| Sales analytics, Item Sales, Leaderboards | HQ → Analytics |
| Purchase orders (draft → receive) | HQ → Orders |
| Customers, loyalty, credits, gift cards | HQ → Workspace |
| Support CRM (deals, tickets, issues) | HQ → Support |
| Live customer chat | HQ → Chat |
| Handheld barcode price lookup | Price check (`price-check/`) |
| Shared business data and auth | API (`backend/`) |

Packaged builds are available for **Windows (NSIS installer / MSI)** and
**Android (APK)** on the till and price-check apps. The API and HQ console can
run as Node processes or **Windows Services** on a back-office server.

---

## Who this is for

| Role | Primary app | What you do |
| --- | --- | --- |
| **Store owner / HQ admin** | HQ console | Company setup, users, tills, catalog, reports |
| **Manager** | HQ console | Orders, stock, refunds, staff oversight |
| **Cashier / waiter** | Till | Open shift, ring sales, take payment, close shift |
| **Floor staff** | Price check | Scan barcode, confirm price |
| **Developer / IT** | All apps + docs | Deploy API, build EXE/APK, integrate, extend |

**New to the product?** Start with the [User Guide](docs/user-guide.md).

**Building or extending the codebase?** Start with the
[Developer Guide](docs/developer-guide.md).

---

## Applications

| App | Folder | Dev URL | Stack | Purpose |
| --- | --- | --- | --- | --- |
| **API** | [`backend/`](backend/) | http://localhost:3001/api | NestJS 11, TypeScript | REST API, JSON persistence, SSE streams |
| **HQ Console** | [`web/`](web/) | http://localhost:3000 | Next.js 16, React 19, Tailwind 4 | Back-office web app + public marketing site |
| **Till** | [`pos/`](pos/) | http://localhost:1420 | Vite 8, React 19, Tauri 2 | Cashier terminal (browser, Windows EXE, Android APK) |
| **Price Check** | [`price-check/`](price-check/) | http://localhost:1430 | Vite 8, React 19, Tauri 2 | Handheld lookup (browser, Windows EXE, Android APK) |

### API (`backend/`)

The single source of truth for catalog, sales, users, tills, CRM, chat, and
organisation settings. Data is stored as **JSON files** under `backend/data/`
(created automatically on first run — not committed to git).

Key route groups: `/api/console` (HQ auth & setup), `/api/catalog`, `/api/sales`,
`/api/staff`, `/api/crm`, `/api/chat`, `/api/payments`, `/api/reports`, and more.
See [backend/README.md](backend/README.md) for the module list.

### HQ Console (`web/`)

Authenticated back-office with sidebar navigation:

- **Main Menu** — Products (catalog, categories, barcodes, import/export)
- **Analytics** — Sales, Item Sales, Leaderboards, orders, refunds, tax, stock
- **Workspace** — Chat, Support, customers, vendors, staff, promotions
- **Settings** — Users, organisation, help

Also includes a public marketing site (`/`, `/pricing`, `/download`, `/support`,
etc.) and auth pages (`/login`, `/register`).

Signed-in users can open **Settings → Help** (`/help`) for searchable in-app
topics.

### Till (`pos/`)

Cashier-facing terminal:

- Staff login and shift open/close
- Item sales, saved tickets, payments (cash, card, transfer, split)
- Receipts, kitchen display (KDS), restaurant tables, hotel rooms
- Must be **activated** with a 16-character code from HQ before first use
- Licence valid **one year** from activation

Native builds: `pnpm tauri:build` (Windows), `pnpm tauri:apk` (Android).

### Price Check (`price-check/`)

Lightweight app for scanning barcodes and viewing product name/price from the
live catalog. Ideal for shelf checks and customer enquiries on the shop floor.

---

## Features by area

### Products and inventory

- Full product catalog with categories, subcategories, units, packs/cartons, brands
- Price lists, low-stock and expiring alerts, barcode lookup
- Import/export, Cloudinary image uploads (when configured)
- Stock balance and movement reports

### Sales and analytics

- Sales summary and trend charts
- **Item Sales** dashboard — top sellers, trends, item grid (`/reports/sales/gross-profit/by-item`)
- **Leaderboards** — staff/subgroup rankings (`/reports/sales/gross-profit/by-subgroup`)
- Invoices, refunds, output/input tax reports

### Till operations

- Till activation, hardware binding, heartbeat, subscription renewal
- Shift lifecycle, staff PIN for privileged actions, day close
- X/Z register reports via API
- Windows printer discovery and silent print

### Customers

- Customer directory, groups, store credits and rules
- Loyalty programme (registration, rules, card assignment)
- Gift cards and batch issuance
- Customer balance, ledger, and trail reports

### Purchase orders

Draft → pending approval → approved & sent → receiving → received (or cancelled).
Full workflow under **Analytics → Orders**.

### Workspace

- **Chat** — three-column inbox with real-time SSE updates
- **Support** — contacts, deals, pipeline, tickets, activity, projects, GitHub-style issues
- Vendors, staff, sales reps, payment methods, promotions, expense accounts, billing

### Access control

HQ users belong to **groups** with privileges across three departments:

| Department | Examples |
| --- | --- |
| **Report** | Sales and stock analytics |
| **Transaction** | Payments, receipts, expenses, adjustments |
| **Setup** | Products, customers, users, organisation |

Till staff are separate from HQ accounts and sign in on the till app only.

### Verticals

Business-type workflows on the till and in HQ for **supermarket**, **hotel**,
**restaurant**, and **dark kitchen** (tables, rooms, KDS, etc.).

---

## How it works

```text
┌─────────────────────────────────────────────────────────────────┐
│                         Your network / LAN                        │
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────┐ │
│  │  HQ Console  │   │    Till      │   │    Price Check       │ │
│  │  :3000       │   │    :1420     │   │    :1430             │ │
│  │  (browser)   │   │  PC / tablet │   │  handheld / gun      │ │
│  └──────┬───────┘   └──────┬───────┘   └──────────┬───────────┘ │
│         │                  │                      │               │
│         │     HTTP  /api   │                      │               │
│         └──────────────────┼──────────────────────┘               │
│                            ▼                                      │
│                   ┌─────────────────┐                             │
│                   │   NestJS API    │                             │
│                   │   :3001 /api    │                             │
│                   └────────┬────────┘                             │
│                            │                                      │
│                            ▼                                      │
│                   ┌─────────────────┐                             │
│                   │  backend/data/  │                             │
│                   │  (*.json files) │                             │
│                   └─────────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

**Development:** HQ, till, and price-check proxy `/api` to `localhost:3001`.

**Production:** Packaged till and price-check apps need a reachable API URL
(`VITE_API_URL` at build time, or the in-app API field on price check). The API
must run on a server or PC that all devices can reach — not `localhost` from
another machine on the network.

---

## Requirements

### For running from source (development)

| Tool | Version |
| --- | --- |
| [Node.js](https://nodejs.org/) | **22** (see [`.nvmrc`](.nvmrc)) |
| [pnpm](https://pnpm.io) | **11** (`corepack enable` recommended) |

### For building Windows EXE / Android APK (optional)

| Tool | Purpose |
| --- | --- |
| [Rust](https://rustup.rs/) | Tauri native shell |
| Visual Studio Build Tools | Windows linker |
| Android SDK (API 34+) | APK builds |

Full toolchain steps: [docs/build/prerequisites.md](docs/build/prerequisites.md).

---

## Installation and quick start

### 1. Clone the repository

```bash
git clone https://github.com/Akintomiwa200/pos.git
cd pos
```

### 2. Start the API (required first)

```bash
cd backend
pnpm install
pnpm dev
```

The API listens at **http://localhost:3001/api**. On first start it creates
`backend/data/` and seeds demo data.

### 3. Start the HQ console

Open a **second terminal**:

```bash
cd web
pnpm install
pnpm dev
```

Open **http://localhost:3000** — register a company or sign in.

### 4. Start the till (optional)

Open a **third terminal**:

```bash
cd pos
pnpm install
pnpm dev
```

Open **http://localhost:1420**. Activate with a till code from HQ before
cashier login.

### 5. Start price check (optional)

```bash
cd price-check
pnpm install
pnpm dev
```

Open **http://localhost:1430**.

### Verify the stack

```bash
curl http://localhost:3001/api/health
```

You should get a successful health response when the API is up.

---

## Configuration

Copy environment examples into each app you run. **Do not commit** real secrets or
`backend/data/`.

| Copy from | To | App |
| --- | --- | --- |
| [`.env.example`](.env.example) | `backend/.env` | API port, CORS |
| [`backend/.env.example`](backend/.env.example) | `backend/.env` | Google OAuth, Cloudinary |
| [`web/.env.example`](web/.env.example) | `web/.env` | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` |
| [`pos/.env.example`](pos/.env.example) | `pos/.env.production` | `VITE_API_URL` for packaged till |
| [`price-check/.env.example`](price-check/.env.example) | `price-check/.env` | `VITE_API_URL` |

### Common variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `PORT` | backend | API port (default `3001`) |
| `GOOGLE_CLIENT_ID` | backend | Verify Google tokens for HQ login/signup |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | web | Must match backend Google client ID |
| `CLOUDINARY_*` | backend | Product image uploads (1 MB max) |
| `HQ_APP_URL` | backend | Link base for welcome and password-reset emails |
| `SMTP_*` | backend | Nodemailer — account welcome and password reset emails |
| `VITE_API_URL` | pos, price-check | API base URL for packaged clients |

Production examples: [`docs/build/examples/`](docs/build/examples/).

---

## First-time setup walkthrough

After HQ and API are running, a typical onboarding sequence:

| Step | Where | Action |
| --- | --- | --- |
| 1 | HQ → Register | Create company and admin account |
| 2 | Settings → Organization → Company | Set name, address, branding |
| 3 | Main Menu → Products → All Products | Add or import products |
| 4 | Analytics → Point of Sales → Till | Create till, copy 16-character code |
| 5 | Till app | Enter code to activate (1-year licence starts) |
| 6 | Settings → Users | Create HQ users and permission groups |
| 7 | Workspace → Staff | Add till staff for cashier login |
| 8 | Till app | Staff sign-in, open shift, test sale |

Detailed steps for managers and cashiers: [User Guide](docs/user-guide.md).

---

## Development

### Scripts per app

| App | Dev | Build | Production start |
| --- | --- | --- | --- |
| **backend** | `pnpm dev` | `pnpm build` | `pnpm start:prod` |
| **web** | `pnpm dev` | `pnpm build` | `pnpm start` |
| **pos** | `pnpm dev` | `pnpm build` | `pnpm preview` |
| **price-check** | `pnpm dev` | `pnpm build` | `pnpm preview` |

### Typecheck (HQ)

```bash
cd web && pnpm exec tsc --noEmit
```

### Demo login

Local seed data includes demo HQ accounts (check `backend/src/console/` seeds).
A common dev login is username **`emma`** / password **`demo`** with broad
privileges — confirm against current seed constants in the codebase.

### Data reset (local only)

Stop the API, back up then delete `backend/data/*`, restart `pnpm dev` to re-seed.

Architecture, modules, auth, SSE, and theming: [Developer Guide](docs/developer-guide.md).

---

## Building for production

| Deliverable | Guide |
| --- | --- |
| Till Windows installer / APK | [docs/build/windows-exe.md](docs/build/windows-exe.md), [android-apk.md](docs/build/android-apk.md) |
| Price check installer / APK | Same build docs in `price-check/` |
| API + HQ as Windows Services | [docs/build/services.md](docs/build/services.md) |
| Signing and store release | [docs/build/signing.md](docs/build/signing.md) |
| GitHub Releases (`v*` tags) | [docs/build/github-releases.md](docs/build/github-releases.md) |

Master packaging overview: [docs/build/README.md](docs/build/README.md).

**Important:** Installers do **not** include the database. Ship the API on a
reachable host; point till and price-check clients at that URL.

---

## Project structure

```text
POS/
├── backend/                 NestJS API
│   ├── src/                 Modules: catalog, sales, console, crm, chat, …
│   └── data/                Runtime JSON (gitignored)
├── web/                     Next.js HQ + marketing site
│   └── src/
│       ├── app/             App Router (console, auth, marketing)
│       ├── components/      UI, reports, CRM, help
│       └── lib/             API client, nav, ops helpers
├── pos/                     Till terminal + src-tauri/
├── price-check/             Handheld lookup + src-tauri/
├── docs/
│   ├── README.md            Documentation index
│   ├── user-guide.md        End-user manual
│   ├── developer-guide.md   Engineering reference
│   └── build/               EXE, APK, services, signing
├── .github/                 CI, issue/PR templates
├── CONTRIBUTING.md
├── CHANGELOG.md
├── SECURITY.md
├── SUPPORT.md
└── LICENSE.md
```

---

## Documentation

### For users and managers

| Document | Description |
| --- | --- |
| [**User Guide**](docs/user-guide.md) | HQ console, till, price check, Support, Chat, troubleshooting |
| [**Documentation hub**](docs/README.md) | Full index of all docs |
| **In-app Help** | HQ → Settings → Help (`/help`) |

### For developers

| Document | Description |
| --- | --- |
| [**Developer Guide**](docs/developer-guide.md) | Architecture, API, auth, JSON storage, SSE, theming |
| [**Backend API**](backend/README.md) | Module and endpoint reference |
| [**Contributing**](CONTRIBUTING.md) | Branch style, PR checklist, code notes |

### Build, deploy, and release

| Document | Description |
| --- | --- |
| [**Build & ship**](docs/build/README.md) | EXE, APK, Windows services |
| [Prerequisites](docs/build/prerequisites.md) | Node, Rust, VS, Android SDK |
| [GitHub Releases](docs/build/github-releases.md) | Tags and release assets |

### Project policies

| Document | Description |
| --- | --- |
| [Changelog](CHANGELOG.md) | Release history |
| [Security](SECURITY.md) | Report vulnerabilities privately |
| [Support](SUPPORT.md) | Bugs, features, what to include in reports |
| [Code of Conduct](CODE_OF_CONDUCT.md) | Community standards |

---

## Support and contributing

- **Bug reports:** GitHub issues with the bug template — search existing issues first
- **Features:** Feature request template
- **Security:** Do not open public issues — see [SECURITY.md](SECURITY.md)
- **Pull requests:** Read [CONTRIBUTING.md](CONTRIBUTING.md); one focused change per PR
- **Docs improvements:** PRs welcome — user and developer guides live in `docs/`

Repository: [github.com/Akintomiwa200/pos](https://github.com/Akintomiwa200/pos)

When reporting till or HQ problems, include which app, OS/browser, and steps to
reproduce. Never paste production till codes, passwords, or customer data.

---

## License

This project is licensed under the [MIT License](LICENSE.md).
