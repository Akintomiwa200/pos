# POS Backend

NestJS API for the HQ console, till terminal, and price-check app.

Full developer documentation: [Developer Guide](../docs/developer-guide.md).

## Quick start

```bash
pnpm install
pnpm dev
```

| | |
| --- | --- |
| **API prefix** | `/api` |
| **Default port** | `3001` |
| **Health check** | `GET /api/health` |

Copy [`.env.example`](.env.example) to `.env` for `PORT`, Google OAuth, and
Cloudinary. Data files are written to `data/` on first run (not committed).

## Modules

| Module | Prefix | Purpose |
| --- | --- | --- |
| `health` | `/health` | Liveness |
| `auth` | `/auth` | Till staff login |
| `console` | `/console` | HQ auth, accounts, groups, tills, org setup |
| `tenants` | `/tenants` | Org snapshot |
| `catalog` | `/catalog` | Products, lookup, images |
| `inventory` | `/inventory` | Stock and movements |
| `orders` | `/orders` | Purchase orders |
| `sales` | `/sales` | POS sale tickets |
| `expenses` | `/expenses` | Expenses |
| `payments` | `/payments` | Payments, charge |
| `reports` | `/reports` | X/Z/tax register |
| `staff` | `/staff` | Shifts, PIN, day close |
| `customers` | `/customers` | Loyalty, credits, gift cards |
| `crm` | `/crm` | Support CRM + `GET /crm/stream` (SSE) |
| `chat` | `/chat` | Messaging + `GET /chat/stream` (SSE) |
| `directory` | `/directory/:name` | Named JSON directories |
| `floor` | `/floor/:board` | Table/room boards |
| `integrations` | `/integrations` | Connector catalog |
| `hardware` | `/hardware` | Printers, silent print |

## Data

JSON files under `data/` — see [Data storage](../docs/developer-guide.md#data-storage)
in the developer guide.

## Packaging

Windows Service and production deployment: [docs/build](../docs/build/README.md).
