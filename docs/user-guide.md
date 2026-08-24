# POS User Guide

This guide is for **store owners, managers, HQ administrators, and cashiers**
who use the POS platform day to day. It explains what each app does, how to get
started, and where to find common tasks in the HQ console.

For installation of Windows EXE, Android APK, or server services, see
[Build & ship](build/README.md). For technical details, see the
[Developer Guide](developer-guide.md).

---

## Table of contents

1. [What is POS?](#what-is-pos)
2. [The four apps](#the-four-apps)
3. [Getting started](#getting-started)
4. [HQ console overview](#hq-console-overview)
5. [Products and catalog](#products-and-catalog)
6. [Sales and analytics](#sales-and-analytics)
7. [Tills and stores](#tills-and-stores)
8. [Using the till (cashier)](#using-the-till-cashier)
9. [Price check handheld](#price-check-handheld)
10. [Customers, loyalty, and gift cards](#customers-loyalty-and-gift-cards)
11. [Purchase orders](#purchase-orders)
12. [Support workspace](#support-workspace)
13. [Live chat](#live-chat)
14. [Transactions and payments](#transactions-and-payments)
15. [Users and access control](#users-and-access-control)
16. [Organization settings](#organization-settings)
17. [Help inside the console](#help-inside-the-console)
18. [Troubleshooting](#troubleshooting)

---

## What is POS?

POS is a point-of-sale platform built for retail and hospitality. You can:

- Sell at the till with cash, card, transfer, and split payments
- Manage products, stock, prices, and barcodes from HQ
- Track sales, refunds, taxes, and inventory reports
- Run loyalty programmes, customer credits, and gift cards
- Handle purchase orders from draft through receiving
- Manage staff, shifts, and till licences
- Use **Support** (contacts, deals, tickets, issues) and **Chat** for customer
  communication

The system supports vertical workflows for **supermarkets, hotels, restaurants,
and dark kitchens** (tables, rooms, kitchen display, and more on the till).

---

## The four apps

```text
┌─────────────────┐     ┌─────────────────┐
│   HQ Console    │     │  Till terminal  │
│   (browser)     │     │  (PC / tablet)  │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │    HTTP /api          │
         └───────────┬───────────┘
                     │
              ┌──────▼──────┐
              │     API     │
              │  (server)   │
              └──────┬──────┘
                     │
         ┌───────────┴───────────┐
         │   Price check app     │
         │   (handheld / gun)    │
         └───────────────────────┘
```

| App | Who uses it | Typical device |
| --- | --- | --- |
| **HQ Console** | Owners, managers, back-office staff | Office PC, laptop, browser |
| **Till** | Cashiers, wait staff, front desk | Cashier PC, Android tablet |
| **Price Check** | Floor staff checking prices | Handheld scanner, phone |
| **API** | Installed by IT; users do not open it directly | Server or back-office PC |

The till and price-check apps **do not store your business data locally**. They
connect to the API over your network. The API holds catalog, sales, users, and
settings.

---

## Getting started

### 1. Create your company (first-time setup)

1. Open the HQ console in your browser (for example `http://localhost:3000` in
   development, or your organisation’s hosted URL in production).
2. Go to **Register** and create your company and administrator account.
3. Alternatively, use **Sign in with Google** if your organisation has Google
   login enabled.

After registration you land in the authenticated console with access based on
your administrator group.

### 2. Sign in

- **Email or username + password** on the login page.
- **Google Sign-In** when configured by your administrator.
- **Forgot password** sends a reset flow if email is set up.

Your session stays signed in until you log out or the token expires. Do not share
your HQ password with till staff — cashiers use a separate till login (see
[Using the till](#using-the-till-cashier)).

### 3. Recommended first steps

| Step | Where in HQ | Why |
| --- | --- | --- |
| Set company details | **Settings → Organization → Company** | Name, address, receipt header |
| Add branches and stores | **Organization → Branch / Store** | Multi-location businesses |
| Create products | **Main Menu → Products → All Products** | Till needs items to sell |
| Create a till and get a code | **Analytics → Point of Sales → Till** | Required before first till sign-in |
| Activate the till app | On the till device | Enter the 16-character till code |
| Add HQ users and groups | **Settings → Users** | Control who sees which menus |

---

## HQ console overview

After sign-in, the left **sidebar** is your main navigation. What you see
depends on your **user group** privileges — not every user sees every menu.

### Main Menu

| Item | Purpose |
| --- | --- |
| **Products** | Catalog: items, categories, units, prices, barcodes, import/export |

### Analytics

| Item | Purpose |
| --- | --- |
| **Sales** | Sales summary, trends, **Item Sales**, employee sales |
| **Point of Sales** | Till codes and store locations |
| **Leaderboards** | Staff / subgroup performance rankings |
| **Orders** | Purchase orders (draft → receive) |
| **Refund** | Sales returns |
| **Taxes** | Output and input tax reports |
| **Stock** | Balance and movement |
| **Invoices** | Invoice list |
| **Transactions** | Payments dashboard |

### Workspace

| Item | Purpose |
| --- | --- |
| **Chat** | Customer messaging inbox (real-time updates) |
| **Support** | Contacts, deals, pipeline, tickets, activity, projects, issues |
| **Customers** | Directory, groups, credits, loyalty, gift cards |
| **Vendors** | Supplier directory |
| **Staff** | Staff records for operations |
| **Sales Representatives** | Rep tracking |
| **Payment Methods** | Till payment types |
| **Sales Promotions** | Promotional rules |
| **Expense Accounts** | Expense categories |
| **Billing** | Subscriptions |

### Settings

| Item | Purpose |
| --- | --- |
| **Users** | HQ accounts and permission groups |
| **Organization** | Company, branch, storefront, gateways, tax |
| **Settings** | General org preferences |
| **Help** | Searchable help topics (same content as this guide’s quick links) |

---

## Products and catalog

Go to **Main Menu → Products** (or **Setup → Products** in the full access tree).

### Common tasks

| Task | Path |
| --- | --- |
| Add or edit a product | **All Products** → open item or create new |
| Organise categories | **Categories** / **Subcategories** |
| Set units and packs | **Units of Measure**, **Pack & Cartons** |
| Manage brands | **Brands** |
| Update selling prices | **Price List** |
| Find low or expiring stock | **Low Stock**, **Expiring** |
| Look up by barcode | **Barcode Lookup** |
| Bulk load products | **Import Products** |
| Export catalog | **Export Products** |

### Tips

- Product images can be uploaded when Cloudinary is configured by your IT team.
- **Inactive** products stay in the catalog but may be hidden from the till
  depending on settings.
- Stock levels and reorder alerts feed into reports and the Item Sales page.

---

## Sales and analytics

### Sales Summary and Trends

**Analytics → Sales → Sales Summary** and **Sales Trends** show revenue over
time, ticket counts, and high-level KPIs.

### Item Sales

**Analytics → Sales → Item Sales** (`/reports/sales/gross-profit/by-item`) is an
analytics dashboard for catalog performance:

- Summary cards for order totals and trends
- **Sales Trends** stacked chart (current vs previous period)
- **Top Selling Products** list
- **Item list** grid with search and stock filters

This page is for **reporting and catalog insight**. It does not sell items.
Use **Manage Products** to edit the catalog.

### Leaderboards

**Analytics → Leaderboards** ranks staff or subgroups by sales performance with a
podium-style view and detailed table.

### Other reports

Explore **Refund**, **Taxes**, **Stock**, **Invoices**, and customer reports
under **Customers → Reports** for balances, ledgers, and trails.

---

## Tills and stores

### Issue a till code (HQ admin)

1. Go to **Analytics → Point of Sales → Till**.
2. Create a new till record for the store/device.
3. Copy the **16-character activation code** shown by HQ.
4. Give the code to the person setting up the physical till.

Each till licence is valid for **one year from activation**. When it expires,
enter a new code on the till to renew.

### Activate the till (on device)

1. Install or open the till app (browser, Windows EXE, or Android APK).
2. Ensure the till can reach the API (same network or configured API URL).
3. Enter the till activation code when prompted.
4. The device is bound to your organisation; subscription starts.

### Stores

**Analytics → Point of Sales → Store** links tills to physical store locations
for reporting and operations.

### Heartbeat and online status

Activated tills send periodic heartbeats to HQ. If a till shows offline, check
network connectivity and that the API service is running.

---

## Using the till (cashier)

The till is optimised for speed at checkout.

### Typical flow

1. **Staff sign-in** — cashier username/PIN (separate from HQ login).
2. **Open shift** — required before taking sales (manager may close day end).
3. **Add items** — scan barcode or tap products.
4. **Payment** — cash, card, transfer, or split across methods.
5. **Receipt** — print or display paid receipt.
6. **Close shift** — end-of-shift totals and handover.

### Till screens

| Area | Use |
| --- | --- |
| **Home** | Shift status, quick actions |
| **Items / Sales** | Main selling screen |
| **Saved** | Held or parked tickets |
| **Orders** | Open order management |
| **Chat** | Staff/customer messages when enabled |
| **Settings** | Printer, display, API connection |

### Vertical features

Depending on your business type:

- **Restaurant** — table layout, send to kitchen (KDS)
- **Hotel** — room charges
- **Supermarket / retail** — standard scan-and-pay

### Privileged actions

Some actions (voids, discounts, manager overrides) may require a **staff PIN**
unlock configured in HQ under **Staff**.

---

## Price check handheld

The price-check app lets floor staff scan a barcode and see product name and
price without opening the full till.

1. Open the app on the handheld or PC.
2. Set the **API URL** if not baked in at build time (production handhelds).
3. Scan or type a barcode.
4. View product details from the live catalog.

Useful for shelf labelling, customer enquiries, and stock checks on the shop
floor.

---

## Customers, loyalty, and gift cards

Go to **Workspace → Customers**.

| Area | Purpose |
| --- | --- |
| **All Customers** | Customer directory |
| **Groups** | Segment pricing or reporting |
| **Credits** | Store credit balances |
| **Credit Rules** | When credits apply |
| **Loyalty** | Programme, registration, rules, card assignment |
| **Gift Cards** | Issue and track gift cards and batches |
| **Import** | Bulk customer load |
| **Reports** | Balance, ledger, trail |

Loyalty and credits can be applied at the till when configured.

---

## Purchase orders

Go to **Analytics → Orders**.

| Stage | Meaning |
| --- | --- |
| **Draft** | Order being prepared |
| **Pending Approval** | Awaiting manager sign-off |
| **Approved & Sent** | Sent to vendor |
| **Receiving** | Goods arriving |
| **Received** | Stock updated |
| **Cancelled** | Order voided |

Use **New Order** to start a purchase order and move it through the workflow
until stock is received into inventory.

---

## Support workspace

**Workspace → Support** is your CRM-style hub (routes under `/crm/*`):

| Screen | Purpose |
| --- | --- |
| **Overview** | Summary dashboard |
| **Contacts** | People and organisations |
| **Deals** | Sales opportunities |
| **Pipeline** | Deal stages |
| **Tickets** | Support requests |
| **Activity** | Timeline of actions |
| **Projects** | Larger initiatives |
| **Issues** | GitHub-style issue tracking |

Updates appear in real time when multiple users work in Support at once.

---

## Live chat

**Workspace → Chat** (`/chat`) provides a three-column inbox:

- Conversation list
- Message thread
- Customer profile panel

Messages update in **real time** without refreshing the page. Use Chat for
customer service alongside Support tickets.

---

## Transactions and payments

**Analytics → Transactions** (and the full **Transaction** department in access
settings) covers:

| Area | Purpose |
| --- | --- |
| **Payments** | Payment history and spend analysis |
| **Receipt** | Receipt list and analysis |
| **Expenses** | Expense list and summary |
| **Stock transactions** | Adjustments and stock-related entries |

Use these screens for reconciliation, audits, and finance review.

---

## Users and access control

HQ access is controlled by **accounts** and **groups**.

### Accounts

**Settings → Users → Accounts** — create HQ users with email/username and
password (or Google when enabled).

### Groups

**Settings → Users → Groups** — define which sidebar sections and pages each
role can open. Privileges are organised by department:

| Department | Examples |
| --- | --- |
| **Report** | Sales reports, stock reports, analytics |
| **Transaction** | Payments, receipts, expenses, stock adjustments |
| **Setup** | Products, customers, users, organisation |

Assign each user to one or more groups. If a menu item is missing, your
administrator needs to grant the matching privilege — not a bug.

When an administrator creates your account, or when you register a new company,
you receive a **welcome email** at the address on the account (if your
organisation has configured SMTP on the API server).

### Till staff

Till cashiers are managed under **Workspace → Staff** and sign in on the till
app, not the HQ console.

---

## Organization settings

**Settings → Organization**:

| Page | Purpose |
| --- | --- |
| **Company** | Legal name, contact, branding |
| **Branch** | Branches/locations |
| **Storefront** | Online/storefront settings |
| **Payment Gateway** | Card and digital payment connectors |
| **Tax** | Tax rates and rules |

**Settings → Settings** (`/setup/others/settings`) holds general preferences.

**Settings → Organization → Data / Export** (under full Setup tree) supports
data export for backups or migration — coordinate with IT before bulk exports.

---

## Help inside the console

Open **Settings → Help** (`/help`) from the sidebar.

The Help center includes searchable topics for:

- Getting started and dashboard
- Products and catalog
- Purchase orders
- Customers and loyalty
- Support workspace and Chat
- Transactions and till setup
- Users and access
- Install and releases (links to public support page)

Use the search box to filter by keyword (for example “barcode”, “till”, “loyalty”).

---

## Troubleshooting

### I cannot sign in to HQ

- Check username/email and password; use **Forgot password** if needed.
- Confirm Google Sign-In is enabled if you use Google.
- Ask an admin to verify your account is active and in a group.

### The till says activation required or licence expired

- HQ admin must create a till under **Point of Sales → Till** and provide a
  fresh code.
- Enter the code on the till; subscription runs one year from activation.

### Till cannot connect / sales fail

- Verify the API server is running and reachable on the network.
- Packaged apps need the correct **API URL** (not `localhost` from another
  device).
- Check firewall rules for the API port (default **3001**).

### Products missing on the till

- Confirm products are **active** in **All Products**.
- Check stock and catalog sync; restart till if cache is stale.
- Verify the till is activated for the same organisation as HQ.

### I do not see a sidebar menu item

- Your **group privileges** may exclude that section. Contact an administrator.

### Reports show no data

- Sales reports need completed till sales in the system.
- Demo/sample charts may appear on Item Sales when no history exists yet.

### Chat or Support not updating

- Real-time features need a live connection to the API SSE endpoints.
- Refresh the page; ensure the API was restarted after upgrades.

### Need more help

- In-app: **Settings → Help**
- Public: [Support page](../SUPPORT.md) and [GitHub issues](https://github.com/Akintomiwa200/pos)
- Packaging: [Build & ship](build/README.md)

---

## Quick reference — common URLs (HQ)

| Page | Path |
| --- | --- |
| Dashboard | `/dashboard` |
| All Products | `/setup/items/items` |
| Item Sales report | `/reports/sales/gross-profit/by-item` |
| Leaderboards | `/reports/sales/gross-profit/by-subgroup` |
| Till setup | `/setup/others/till` |
| Support overview | `/crm/overview` |
| Chat | `/chat` |
| Help | `/help` |
| User accounts | `/setup/users/account` |
| User groups | `/setup/users/group` |

Replace the host with your organisation’s HQ URL in production.
