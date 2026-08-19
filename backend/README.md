# POS Backend

NestJS API for the web console and the POS terminal.

```bash
pnpm install
pnpm dev
```

API prefix: `/api`  
Port: `3001`

| Path | Purpose |
| --- | --- |
| `/api/health` | Liveness |
| `/api/auth/login` | Staff / HQ login |
| `/api/tenants` | Supermarket, hotel, restaurant, dark kitchen |
| `/api/catalog/items` | Products, variants, bundles |
| `/api/inventory` | Stock / reorder |
| `/api/orders` | Open tickets |
| `/api/integrations` | Nigeria connectors (payments, delivery, hardware, ecom, books, CLI) |
| `/api/payments/charge` | Cash, card (Moniepoint), transfer, split |
| `/api/reports/x` `/api/reports/z` | Register audits |
| `/api/hardware/printers` | Installed Windows printer drivers |
| `/api/hardware/print` | Silent print to a named printer |

