# POS Documentation

Welcome to the POS documentation hub. This project is a full point-of-sale
platform for **supermarkets, hotels, restaurants, and dark kitchens**. It
includes a till terminal, an HQ web console, a shared API, and a price-check
handheld app.

## Who should read what

| Audience | Start here | What you will learn |
| --- | --- | --- |
| **Store owners, managers, HQ staff** | [User Guide](user-guide.md) | Sign in, manage products, run reports, activate tills, use Support and Chat |
| **Developers and integrators** | [Developer Guide](developer-guide.md) | Architecture, local setup, API modules, data storage, theming, deployment |
| **IT / packaging** | [Build & ship](../docs/build/README.md) | Windows EXE, Android APK, Windows services, signing, releases |
| **Contributors** | [Contributing](../CONTRIBUTING.md) | Branch style, PR expectations, code notes |

## Applications at a glance

| App | Folder | Default URL | Purpose |
| --- | --- | --- | --- |
| **HQ Console** | [`web/`](../web/) | http://localhost:3000 | Back-office: catalog, reports, users, Support, Chat |
| **API** | [`backend/`](../backend/) | http://localhost:3001/api | Shared backend for all clients |
| **Till** | [`pos/`](../pos/) | http://localhost:1420 | Cashier terminal for sales, payments, shifts |
| **Price Check** | [`price-check/`](../price-check/) | http://localhost:1430 | Barcode / product lookup on the shop floor |

The till and HQ console proxy `/api` to the backend during development.
Packaged till and price-check builds must point at a reachable API URL.

## Quick start (developers)

```bash
# Terminal 1 — API (required)
cd backend && pnpm install && pnpm dev

# Terminal 2 — HQ console
cd web && pnpm install && pnpm dev

# Terminal 3 — Till (optional)
cd pos && pnpm install && pnpm dev
```

Requirements: **Node.js 22** (see [`.nvmrc`](../.nvmrc)) and **pnpm 11**.

Copy [`.env.example`](../.env.example) to `backend/.env` when you need local
overrides. Runtime data under `backend/data/` is created automatically and is
not committed to git.

## In-app help

Signed-in HQ users can open **Settings → Help** (`/help`) for searchable topics
and links to common tasks inside the console.

## Other project docs

| Document | Description |
| --- | --- |
| [User Guide](user-guide.md) | Day-to-day use of HQ, till, and price check |
| [Developer Guide](developer-guide.md) | Codebase, API, auth, and extension points |
| [Backend API cheat sheet](../backend/README.md) | Short endpoint reference |
| [Build EXE, APK, services](build/README.md) | Production packaging |
| [Contributing](../CONTRIBUTING.md) | How to submit changes |
| [Security](../SECURITY.md) | Reporting vulnerabilities |
| [Support](../SUPPORT.md) | Getting help |
| [Changelog](../CHANGELOG.md) | Release history |

## License

MIT — see [LICENSE.md](../LICENSE.md).
