import { api } from "./hq-api";
import { CSV_FIELDS, csvCell, downloadTextFile, normalizeHeader } from "./import-products";

/** Formats shared by every import method (upload, paste, template or sample). */
export type TransferFormat = "csv" | "tsv" | "json" | "html";
export type TransferFieldKind = "text" | "number" | "money" | "boolean" | "date" | "id";

export type TransferField = {
  /** Property name used in the API payload. */
  key: string;
  /** Column label used in downloads and templates. */
  label: string;
  kind: TransferFieldKind;
  aliases: string[];
  required?: boolean;
  /** Column->payload key differs (e.g. `price` in CSV -> `priceMinor` in the API). */
  apiKey?: string;
  /** Money columns are written in major units (naira) and stored in minor units. */
  minor?: boolean;
  /** Read a computed value from a stored record. */
  get?: (row: Record<string, unknown>) => string;
};

export type TransferDataset = {
  id: string;
  label: string;
  group: string;
  description: string;
  /** GET endpoint used for exports and duplicate detection. */
  endpoint: string;
  /** Set when the dataset can be written back to HQ. */
  importable?: boolean;
  fields: TransferField[];
  /** One realistic row used for templates and the "load sample" action. */
  sample: Record<string, string | number | boolean>;
};

const boolAliases = ["active", "enabled", "status"];
const idAliases = ["id", "internal id", "record id"];

function field(
  key: string,
  label: string,
  kind: TransferFieldKind,
  aliases: string[],
  extra: Partial<TransferField> = {},
): TransferField {
  return { key, label, kind, aliases, ...extra };
}

function moneyField(key: string, label: string, apiKey: string, aliases: string[]): TransferField {
  return {
    key,
    label,
    kind: "money",
    aliases,
    apiKey,
    minor: true,
    get: (row) => {
      const value = row[apiKey];
      return typeof value === "number" ? (value / 100).toFixed(2) : "";
    },
  };
}

const productFields: TransferField[] = CSV_FIELDS.map((source) => {
  const extra: Partial<TransferField> = {};
  if (source.key === "cost") Object.assign(extra, { apiKey: "costMinor", minor: true, get: (row: Record<string, unknown>) => typeof row.costMinor === "number" ? (row.costMinor / 100).toFixed(2) : "" });
  if (source.key === "price") Object.assign(extra, { apiKey: "priceMinor", minor: true, get: (row: Record<string, unknown>) => typeof row.priceMinor === "number" ? (row.priceMinor / 100).toFixed(2) : "" });
  if (source.key === "reorderLevel") Object.assign(extra, { apiKey: "reorderLevel", aliases: [...source.aliases, "reorder"] });
  return {
    key: source.key,
    label: source.label,
    kind: source.kind,
    aliases: source.aliases,
    required: source.key === "name",
    ...extra,
  } as TransferField;
});

export const TRANSFER_DATASETS: TransferDataset[] = [
  {
    id: "products",
    label: "Products",
    group: "Catalog",
    description: "Full catalogue with prices, stock, units and expiry dates.",
    endpoint: "/api/catalog/items",
    importable: true,
    fields: productFields,
    sample: { name: "Sample product", category: "General", sku: "SAMPLE-1", cost: "100", price: "250", onHand: "10", reorderLevel: "5", unit: "each", active: "yes" },
  },
  {
    id: "loyalty-members",
    label: "Loyalty members",
    group: "Customers",
    description: "Customer loyalty enrolments, points and cards.",
    endpoint: "/api/customers/loyalty/members",
    importable: true,
    fields: [
      field("id", "id", "id", idAliases),
      field("name", "name", "text", ["name", "customer", "customer name"], { required: true }),
      field("phone", "phone", "text", ["phone", "phone number", "mobile", "tel"]),
      field("email", "email", "text", ["email", "email address"]),
      field("cardNumber", "card number", "text", ["card number", "card", "loyalty card"]),
      field("points", "points", "number", ["points", "balance", "loyalty points"]),
      field("registeredAt", "registered at", "date", ["registered at", "registered", "enrolled at", "date"]),
      field("active", "active", "boolean", boolAliases),
    ],
    sample: { name: "Ada Okafor", phone: "08012345678", email: "ada@example.com", points: "0", registeredAt: "2026-01-15", active: "yes" },
  },
  {
    id: "customer-groups",
    label: "Customer groups",
    group: "Customers",
    description: "Segments used for pricing and loyalty rules.",
    endpoint: "/api/customers/groups",
    importable: true,
    fields: [
      field("id", "id", "id", idAliases),
      field("name", "name", "text", ["name", "group", "group name"], { required: true }),
      field("note", "note", "text", ["note", "notes", "description"]),
      field("active", "active", "boolean", boolAliases),
    ],
    sample: { name: "Wholesale", note: "Trade customers", active: "yes" },
  },
  {
    id: "gift-cards",
    label: "Gift cards",
    group: "Customers",
    description: "Issued gift cards and their balances.",
    endpoint: "/api/customers/gift-cards",
    importable: true,
    fields: [
      field("id", "id", "id", idAliases),
      field("code", "code", "text", ["code", "card code", "gift card code"], { required: true }),
      moneyField("balance", "balance", "balanceMinor", ["balance", "balance minor", "remaining"]),
      moneyField("initial", "initial value", "initialMinor", ["initial", "initial value", "amount", "value"]),
      field("customerName", "customer", "text", ["customer", "customer name"]),
      field("expiresAt", "expiry date", "date", ["expiry date", "expires at", "expires"]),
      field("active", "active", "boolean", boolAliases),
    ],
    sample: { code: "GIFT-1000", balance: "1000", initial: "1000", expiresAt: "2027-01-15", active: "yes" },
  },
  {
    id: "expenses",
    label: "Expenses",
    group: "Money",
    description: "Operating expenses posted from HQ and the tills.",
    endpoint: "/api/expenses",
    importable: true,
    fields: [
      field("id", "id", "id", idAliases),
      field("at", "date", "date", ["date", "at", "expense date"]),
      field("account", "account", "text", ["account", "expense account", "category"]),
      field("description", "description", "text", ["description", "desc", "note", "memo"], { required: true }),
      moneyField("amount", "amount", "amountMinor", ["amount", "amount minor", "value", "cost"]),
      field("method", "method", "text", ["method", "payment method", "paid with"]),
      field("staff", "staff", "text", ["staff", "staff name", "recorded by"]),
    ],
    sample: { at: "2026-02-01", account: "Transport", description: "Delivery fuel", amount: "4500", method: "cash" },
  },
  {
    id: "orders",
    label: "Orders",
    group: "Money",
    description: "Purchase orders, invoices, quotes and returns.",
    endpoint: "/api/orders",
    importable: true,
    fields: [
      field("id", "id", "id", idAliases),
      field("kind", "kind", "text", ["kind", "type", "document type"]),
      field("number", "number", "text", ["number", "doc number", "reference", "ref"]),
      field("party", "party", "text", ["party", "supplier", "customer", "vendor"], { required: true }),
      field("at", "date", "date", ["date", "at", "order date"]),
      field("expectedAt", "expected at", "date", ["expected at", "expected date", "delivery date"]),
      field("status", "status", "text", ["status", "state"]),
      field("total", "total", "money", ["total", "total minor", "amount"], { apiKey: "totalMinor", minor: true }),
      field("lines", "lines", "text", ["lines", "line items", "items"], {
        get: (row) =>
          Array.isArray(row.lines)
            ? row.lines
                .map((line) => {
                  const item = line as Record<string, unknown>;
                  return `${item.name ?? item.itemId ?? ""}|${item.quantity ?? 1}|${item.unitPriceMinor ?? 0}`;
                })
                .join(";")
            : "",
      }),
      field("notes", "notes", "text", ["notes", "note", "memo", "description"]),
    ],
    sample: {
      kind: "purchase-order",
      party: "Supplier Ltd",
      at: "2026-02-03",
      status: "draft",
      total: "25000",
      lines: "Paracetamol|10|1500;Vitamin C|5|2000",
      notes: "Restock",
    },
  },
  {
    id: "combos",
    label: "Combos",
    group: "Catalog",
    description: "Bundle products and their selling prices.",
    endpoint: "/api/combos",
    importable: true,
    fields: [
      field("id", "id", "id", idAliases),
      field("name", "name", "text", ["name", "combo", "bundle"], { required: true }),
      field("description", "description", "text", ["description", "desc", "note"]),
      moneyField("price", "price", "priceMinor", ["price", "selling price", "combo price"]),
      field("components", "components", "text", ["components", "items", "products"], {
        get: (row) =>
          Array.isArray(row.components)
            ? row.components
                .map((component) => {
                  const item = component as Record<string, unknown>;
                  return `${item.itemId ?? ""}:${item.quantity ?? 1}`;
                })
                .join(";")
            : "",
      }),
      field("active", "active", "boolean", boolAliases),
    ],
    sample: { name: "Family meal", description: "2 mains + 2 drinks", price: "1500", components: "item-1:2;item-2:1", active: "yes" },
  },
  {
    id: "ledger-accounts",
    label: "Ledger accounts",
    group: "Money",
    description: "Chart of accounts with opening balances.",
    endpoint: "/api/ledger/accounts",
    importable: true,
    fields: [
      field("id", "id", "id", idAliases),
      field("code", "code", "text", ["code", "account code", "number"], { required: true }),
      field("name", "name", "text", ["name", "account name", "account"], { required: true }),
      field("kind", "kind", "text", ["kind", "type", "account type"]),
      moneyField("opening", "opening balance", "openingMinor", ["opening", "opening balance", "opening minor"]),
      field("group", "group", "text", ["group", "category"]),
      field("active", "active", "boolean", boolAliases),
    ],
    sample: { code: "1000", name: "Cash on hand", kind: "asset", opening: "0", group: "Current assets", active: "yes" },
  },
  {
    id: "crm-contacts",
    label: "CRM contacts",
    group: "Customers",
    description: "Leads, prospects and customer contacts.",
    endpoint: "/api/crm/contacts",
    importable: true,
    fields: [
      field("id", "id", "id", idAliases),
      field("name", "name", "text", ["name", "contact", "contact name"], { required: true }),
      field("company", "company", "text", ["company", "business", "organisation"]),
      field("email", "email", "text", ["email", "email address"]),
      field("phone", "phone", "text", ["phone", "phone number", "mobile"]),
      field("stage", "stage", "text", ["stage", "status"]),
      field("owner", "owner", "text", ["owner", "assigned to"]),
      field("tags", "tags", "text", ["tags", "labels"]),
      field("note", "note", "text", ["note", "notes"]),
    ],
    sample: { name: "Tunde Bakare", company: "Bakare Stores", email: "tunde@example.com", stage: "lead", tags: "wholesale" },
  },
  {
    id: "crm-deals",
    label: "CRM deals",
    group: "Customers",
    description: "Pipeline deals, stages and expected values.",
    endpoint: "/api/crm/deals",
    importable: true,
    fields: [
      field("id", "id", "id", idAliases),
      field("title", "title", "text", ["title", "deal", "deal name"], { required: true }),
      field("contactName", "contact", "text", ["contact", "contact name", "customer"]),
      field("stage", "stage", "text", ["stage", "status"]),
      moneyField("amount", "amount", "amountMinor", ["amount", "value", "deal value"]),
      field("closeDate", "close date", "date", ["close date", "closing date", "expected close"]),
      field("owner", "owner", "text", ["owner", "assigned to"]),
      field("note", "note", "text", ["note", "notes"]),
    ],
    sample: { title: "Supply contract", contactName: "Bakare Stores", stage: "qualification", amount: "120000", closeDate: "2026-04-30" },
  },
  {
    id: "crm-tickets",
    label: "CRM tickets",
    group: "Customers",
    description: "Support tickets with priority and status.",
    endpoint: "/api/crm/tickets",
    importable: true,
    fields: [
      field("id", "id", "id", idAliases),
      field("subject", "subject", "text", ["subject", "title", "ticket"], { required: true }),
      field("body", "body", "text", ["body", "description", "message"]),
      field("contactName", "contact", "text", ["contact", "contact name", "customer"]),
      field("status", "status", "text", ["status", "state"]),
      field("priority", "priority", "text", ["priority", "urgency"]),
      field("assignee", "assignee", "text", ["assignee", "assigned to", "owner"]),
    ],
    sample: { subject: "Late delivery", body: "Order arrived a day late", status: "open", priority: "medium" },
  },
  {
    id: "production-batches",
    label: "Production batches",
    group: "Operations",
    description: "Manufacturing batches and yields.",
    endpoint: "/api/production/batches",
    importable: true,
    fields: [
      field("id", "id", "id", idAliases),
      field("number", "number", "text", ["number", "batch number", "batch"]),
      field("productName", "product", "text", ["product", "product name", "item"], { required: true }),
      field("plannedUnits", "planned units", "number", ["planned units", "planned", "target"]),
      field("producedUnits", "produced units", "number", ["produced units", "produced", "actual"]),
      field("status", "status", "text", ["status", "state"]),
      field("startedAt", "started at", "date", ["started at", "start date", "date"]),
      field("completedAt", "completed at", "date", ["completed at", "end date"]),
      field("staff", "staff", "text", ["staff", "operator"]),
      field("notes", "notes", "text", ["notes", "note"]),
    ],
    sample: { number: "B-2026-01", productName: "Bread", plannedUnits: "100", producedUnits: "96", status: "completed", startedAt: "2026-02-04" },
  },
  {
    id: "branches",
    label: "Branches",
    group: "Organization",
    description: "Company branches and their managers.",
    endpoint: "/api/console/setup/branches",
    importable: true,
    fields: [
      field("id", "id", "id", idAliases),
      field("name", "name", "text", ["name", "branch", "branch name"], { required: true }),
      field("city", "city", "text", ["city", "town"]),
      field("state", "state", "text", ["state", "region"]),
      field("address", "address", "text", ["address", "location"]),
      field("phone", "phone", "text", ["phone", "phone number"]),
      field("manager", "manager", "text", ["manager", "branch manager"]),
      field("active", "active", "boolean", boolAliases),
    ],
    sample: { name: "Ikeja", city: "Lagos", state: "Lagos", address: "12 Allen Avenue", phone: "08011112222", active: "yes" },
  },
  {
    id: "taxes",
    label: "Taxes",
    group: "Organization",
    description: "VAT and other tax rules.",
    endpoint: "/api/console/setup/taxes",
    importable: true,
    fields: [
      field("id", "id", "id", idAliases),
      field("name", "name", "text", ["name", "tax", "tax name"], { required: true }),
      field("ratePercent", "rate percent", "number", ["rate percent", "rate", "percent", "vat rate"]),
      field("inclusive", "inclusive", "boolean", ["inclusive", "price inclusive"]),
      field("compound", "compound", "boolean", ["compound"]),
      field("active", "active", "boolean", boolAliases),
      field("isDefault", "default", "boolean", ["default", "is default"]),
    ],
    sample: { name: "VAT", ratePercent: "7.5", inclusive: "yes", compound: "no", active: "yes", isDefault: "yes" },
  },
  {
    id: "storefronts",
    label: "Storefronts",
    group: "Organization",
    description: "Online storefronts and their sync rules.",
    endpoint: "/api/console/setup/storefronts",
    importable: true,
    fields: [
      field("id", "id", "id", idAliases),
      field("storeId", "store id", "id", ["store id", "store"]),
      field("name", "name", "text", ["name", "storefront"], { required: true }),
      field("url", "url", "text", ["url", "website", "domain"]),
      field("hours", "hours", "text", ["hours", "opening hours"]),
      field("enabled", "enabled", "boolean", ["enabled", "active"]),
      field("syncPrices", "sync prices", "boolean", ["sync prices", "price sync"]),
      field("syncStock", "sync stock", "boolean", ["sync stock", "stock sync"]),
    ],
    sample: { name: "Web shop", url: "https://shop.example.com", hours: "08:00-20:00", enabled: "yes", syncPrices: "yes", syncStock: "yes" },
  },
  {
    id: "directory-customers",
    label: "Directory customers",
    group: "Organization",
    description: "Simple customer directory used across the console.",
    endpoint: "/api/directory/customers",
    importable: true,
    fields: [
      field("id", "id", "id", idAliases),
      field("name", "name", "text", ["name", "customer", "customer name"], { required: true }),
      field("phone", "phone", "text", ["phone", "phone number"]),
      field("email", "email", "text", ["email", "email address"]),
      field("address", "address", "text", ["address"]),
      field("note", "note", "text", ["note", "notes"]),
      field("active", "active", "boolean", boolAliases),
    ],
    sample: { name: "Walk-in customer", phone: "08000000000", active: "yes" },
  },
  {
    id: "staff",
    label: "Staff",
    group: "People",
    description: "Till operators and their roles (read-only).",
    endpoint: "/api/staff",
    fields: [
      field("id", "id", "id", idAliases),
      field("name", "name", "text", ["name", "staff name"]),
      field("username", "username", "text", ["username", "user name"]),
      field("email", "email", "text", ["email"]),
      field("role", "role", "text", ["role", "staff role"]),
      field("roleName", "role name", "text", ["role name", "group"]),
      field("posLogin", "till login", "boolean", ["till login", "pos login"]),
      field("hasPin", "has pin", "boolean", ["has pin", "pin set"]),
    ],
    sample: {},
  },
  {
    id: "sales",
    label: "Sales",
    group: "Transactions",
    description: "Ticket history posted from every till (read-only).",
    endpoint: "/api/sales",
    fields: [
      field("id", "id", "id", idAliases, { apiKey: "ticketId", get: (row) => String(row.ticketId ?? row.id ?? "") }),
      field("ticket", "ticket", "text", ["ticket", "ticket id", "receipt"], { apiKey: "ticketId" }),
      field("at", "date", "date", ["date", "at", "sold at"], { apiKey: "paidAt" }),
      field("customer", "customer", "text", ["customer", "customer name"], { apiKey: "customerName" }),
      field("total", "total", "money", ["total", "total minor", "amount"], { apiKey: "totalMinor", minor: true }),
      field("payment", "payment", "text", ["payment", "payment method", "method"], { apiKey: "tender" }),
      field("store", "store", "text", ["store", "branch"], { apiKey: "storeName" }),
    ],
    sample: {},
  },
  {
    id: "inventory",
    label: "Inventory",
    group: "Transactions",
    description: "Stock on hand by product (read-only).",
    endpoint: "/api/inventory",
    fields: [
      field("id", "id", "id", idAliases, { apiKey: "itemId" }),
      field("product", "product", "text", ["product", "product name", "item"], { get: (row) => String(row.name ?? row.itemId ?? "") }),
      field("sku", "sku", "text", ["sku", "code"]),
      field("onHand", "on hand", "number", ["on hand", "quantity", "qty", "stock"]),
      field("reorderLevel", "reorder level", "number", ["reorder level", "minimum"], { apiKey: "reorderPoint" }),
    ],
    sample: {},
  },
];

export function getDataset(id: string): TransferDataset | undefined {
  return TRANSFER_DATASETS.find((dataset) => dataset.id === id);
}

export const FORMAT_MIME: Record<TransferFormat, string> = {
  csv: "text/csv",
  tsv: "text/tab-separated-values",
  json: "application/json",
  html: "application/vnd.ms-excel",
};

export const FORMAT_EXTENSION: Record<TransferFormat, string> = {
  csv: "csv",
  tsv: "tsv",
  json: "json",
  html: "xls",
};

export function detectFormat(text: string, filename = ""): TransferFormat {
  const name = filename.toLowerCase();
  if (name.endsWith(".json")) return "json";
  if (name.endsWith(".tsv") || name.endsWith(".tab")) return "tsv";
  if (name.endsWith(".xls") || name.endsWith(".xlsx") || name.endsWith(".htm") || name.endsWith(".html")) return "html";
  const head = text.trimStart().slice(0, 400);
  if (head.startsWith("{") || head.startsWith("[")) return "json";
  if (/<table[\s>]/i.test(head)) return "html";
  const firstLine = head.split(/\r?\n/, 1)[0] ?? "";
  if (firstLine.includes("\t")) return "tsv";
  return "csv";
}

/** Guess the CSV separator from the header row. */
export function detectDelimiter(text: string): string {
  const firstLine = text.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0] ?? "";
  const options = [",", ";", "|", "\t"];
  return options.sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0] ?? ",";
}

/** RFC 4180-style delimiter parser. Works for CSV, TSV and semicolon files. */
export function parseDelimited(text: string, delimiter = ","): string[][] {
  const source = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (quoted) {
      if (ch === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"' && cell === "") {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\n") {
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell !== "" || row.length) {
    row.push(cell.trim());
    rows.push(row);
  }
  return rows.filter((entry) => entry.some((value) => value !== ""));
}

export type DecodedTable = {
  headers: string[];
  matrix: string[][];
  note?: string;
};

/** Turns any supported format into the same header + string matrix. */
export function decodeTable(text: string, format: TransferFormat, delimiter = ","): DecodedTable {
  const trimmed = text.trim();
  if (!trimmed) return { headers: [], matrix: [], note: "No data yet." };

  if (format === "json") {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      const array = Array.isArray(parsed)
        ? parsed
        : Array.isArray((parsed as { rows?: unknown[] }).rows)
          ? (parsed as { rows: unknown[] }).rows
          : Array.isArray((parsed as { data?: unknown[] }).data)
            ? (parsed as { data: unknown[] }).data
            : [];
      const objects = array.filter((row): row is Record<string, unknown> => !!row && typeof row === "object" && !Array.isArray(row));
      if (!objects.length) return { headers: [], matrix: [], note: "Expected a JSON array of objects (or { rows: [...] })." };
      const headers = Array.from(new Set(objects.flatMap((row) => Object.keys(row))));
      const matrix = objects.map((row) => headers.map((key) => stringifyValue(row[key])));
      return { headers, matrix };
    } catch {
      return { headers: [], matrix: [], note: "Invalid JSON — check the file and try again." };
    }
  }

  if (format === "html") {
    if (trimmed.startsWith("PK")) {
      return { headers: [], matrix: [], note: "An .xlsx workbook is a compressed file. Save it as CSV or Excel 2003 (.xls) table first." };
    }
    if (typeof DOMParser === "undefined") {
      return { headers: [], matrix: [], note: "HTML tables can only be read in the browser." };
    }
    const doc = new DOMParser().parseFromString(trimmed, "text/html");
    const table = doc.querySelector("table");
    if (!table) return { headers: [], matrix: [], note: "No HTML table found." };
    const lines = Array.from(table.querySelectorAll("tr")).map((tr) =>
      Array.from(tr.querySelectorAll("th,td")).map((cell) => (cell.textContent ?? "").trim()),
    );
    if (lines.length < 2) return { headers: [], matrix: [], note: "The table needs a header row and at least one data row." };
    return { headers: lines[0]!, matrix: lines.slice(1) };
  }

  const matrix = parseDelimited(trimmed, format === "tsv" ? "\t" : delimiter || ",");
  if (matrix.length < 2) return { headers: matrix[0] ?? [], matrix: [], note: "Add a header row and at least one data row." };
  return { headers: matrix[0]!, matrix: matrix.slice(1) };
}

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

export function formatCell(row: Record<string, unknown>, item: TransferField): string {
  if (item.get) return item.get(row);
  return stringifyValue(row[item.apiKey ?? item.key]);
}

export type ColumnMatch = { header: string; field: TransferField | null };

export function mapColumns(dataset: TransferDataset, headers: string[]): ColumnMatch[] {
  return headers.map((header) => {
    const normalized = normalizeHeader(header);
    const field =
      dataset.fields.find((item) => normalizeHeader(item.label) === normalized) ??
      dataset.fields.find((item) => normalizeHeader(item.key) === normalized || (item.apiKey ? normalizeHeader(item.apiKey) === normalized : false)) ??
      dataset.fields.find((item) => item.aliases.some((alias) => normalizeHeader(alias) === normalized)) ??
      null;
    return { header, field };
  });
}

export type PreparedRow = {
  index: number;
  label: string;
  payload: Record<string, unknown>;
  errors: string[];
  status: "new" | "update";
};

export type PrepareResult = {
  matches: ColumnMatch[];
  unknownHeaders: string[];
  rows: PreparedRow[];
  notice?: string;
};

export function parseNumber(raw: string): number {
  const cleaned = raw.replace(/[^\d\-.,]/g, "").replace(/,/g, "");
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : Number.NaN;
}

export function parseBoolean(raw: string): boolean {
  return ["yes", "true", "1", "y", "active", "enabled", "on"].includes(raw.trim().toLowerCase());
}

function normalizeDate(raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(value)) return value.replace(/\//g, "-");
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [day, month, year] = value.split("/");
    return `${year}-${month}-${day}`;
  }
  return value.slice(0, 10);
}

export function prepareRows(
  dataset: TransferDataset,
  table: DecodedTable,
  existing: Record<string, unknown>[] = [],
  options: { mode?: "update" | "skip" } = {},
): PrepareResult {
  const matches = mapColumns(dataset, table.headers);
  const unknownHeaders = matches.filter((match) => !match.field && normalizeHeader(match.header)).map((match) => match.header);
  const allowed = new Set(dataset.fields.map((item) => item.apiKey ?? item.key));
  const identity = dataset.fields.find((item) => item.key === "id");

  const index = new Set<string>();
  for (const row of existing) {
    const id = row.id;
    if (id !== undefined && id !== null && String(id).trim()) index.add(String(id).trim().toLowerCase());
  }

  const rows: PreparedRow[] = table.matrix.map((cells, rowIndex) => {
    const raw: Record<string, string> = {};
    matches.forEach((match, columnIndex) => {
      if (match.field) raw[match.field.key] = (cells[columnIndex] ?? "").trim();
    });

    const payload: Record<string, unknown> = {};
    const errors: string[] = [];
    for (const item of dataset.fields) {
      const value = raw[item.key] ?? "";
      if (!value) continue;
      if (item.kind === "number" || item.kind === "money") {
        const number = parseNumber(value);
        if (!Number.isFinite(number)) {
          errors.push(`${item.label}: not a number`);
          continue;
        }
        payload[item.apiKey ?? item.key] = item.minor ? Math.round(number * 100) : number;
      } else if (item.kind === "boolean") {
        payload[item.apiKey ?? item.key] = parseBoolean(value);
      } else if (item.kind === "date") {
        payload[item.apiKey ?? item.key] = normalizeDate(value);
      } else if (item.key === "tags" || item.key === "components" || item.key === "lines") {
        payload[item.apiKey ?? item.key] = value.includes(",") ? value.split(",").map((part) => part.trim()) : value;
      } else {
        payload[item.apiKey ?? item.key] = value;
      }
    }
    for (const item of dataset.fields) {
      if (!item.required) continue;
      const value = payload[item.apiKey ?? item.key];
      if (value === undefined || value === null || String(value).trim() === "") {
        errors.push(`${item.label} is required`);
      }
    }

    const id = identity ? String(raw[identity.key] ?? "").trim() : "";
    const matched = id ? index.has(id.toLowerCase()) : false;
    if (matched && options.mode === "skip") errors.push("Already exists — skipped");

    const labelField = dataset.fields.find((item) => item.required) ?? dataset.fields[1] ?? dataset.fields[0];
    const label = labelField ? String(raw[labelField.key] ?? "").trim() : `Row ${rowIndex + 2}`;
    return {
      index: rowIndex + 2,
      label: label || `Row ${rowIndex + 2}`,
      payload: Object.fromEntries(Object.entries(payload).filter(([key]) => allowed.has(key))),
      errors,
      status: matched ? "update" : "new",
    };
  });

  return { matches, unknownHeaders, rows, notice: table.note };
}

export function buildTemplate(dataset: TransferDataset, format: TransferFormat, includeSample = true): string {
  const headers = dataset.fields.map((item) => item.label);
  const values = dataset.fields.map((item) => {
    const sample = dataset.sample[item.key] ?? dataset.sample[item.apiKey ?? item.key] ?? "";
    if (item.kind === "boolean") return parseBoolean(String(sample)) ? "yes" : "no";
    return String(sample);
  });
  if (format === "json") {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = values[index] ?? "";
    });
    return JSON.stringify([includeSample ? record : Object.fromEntries(headers.map((header) => [header, ""]))], null, 2);
  }
  if (format === "html") {
    const cell = (value: string) => `<td>${value.replace(/[&<>]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[ch] ?? ch)}</td>`;
    return `<table><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr>${includeSample ? `<tr>${values.map(cell).join("")}</tr>` : ""}</table>`;
  }
  const delimiter = format === "tsv" ? "\t" : ",";
  const escape = (value: string) => (format === "tsv" ? value.replace(/[\t\n]/g, " ") : csvCell(value));
  const lines = [headers.map(escape).join(delimiter)];
  if (includeSample) lines.push(values.map(escape).join(delimiter));
  return `\uFEFF${lines.join("\n")}`;
}

export function encodeTable(
  dataset: TransferDataset,
  records: Record<string, unknown>[],
  format: TransferFormat,
  options: { delimiter?: string; headers?: boolean } = {},
): string {
  const headers = dataset.fields.map((item) => item.label);
  const matrix = records.map((record) => dataset.fields.map((item) => formatCell(record, item)));

  if (format === "json") {
    return JSON.stringify(records, null, 2);
  }
  if (format === "html") {
    const cell = (value: string) => `<td>${value.replace(/[&<>]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[ch] ?? ch)}</td>`;
    const head = options.headers === false ? "" : `<tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr>`;
    return `<table>${head}${matrix.map((row) => `<tr>${row.map(cell).join("")}</tr>`).join("")}</table>`;
  }
  const delimiter = format === "tsv" ? "\t" : options.delimiter || ",";
  const escape = (value: string) => (format === "tsv" ? value.replace(/[\t\n]/g, " ") : csvCell(value));
  const lines = options.headers === false ? matrix : [headers.map(escape).join(delimiter), ...matrix.map((row) => row.map(escape).join(delimiter))];
  return `\uFEFF${lines.join("\n")}`;
}

const rowCache = new Map<string, { at: number; rows: Record<string, unknown>[] }>();
const ROW_CACHE_MS = 60_000;

/** Clear one dataset (or all) after a write so the next preview is fresh. */
export function clearTransferRows(datasetId?: string) {
  if (!datasetId) {
    rowCache.clear();
    return;
  }
  const endpoint = getDataset(datasetId)?.endpoint;
  if (endpoint) rowCache.delete(endpoint);
}

export async function listTransferRows(
  dataset: TransferDataset,
  options: { fresh?: boolean } = {},
): Promise<Record<string, unknown>[]> {
  const cached = rowCache.get(dataset.endpoint);
  if (!options.fresh && cached && Date.now() - cached.at < ROW_CACHE_MS) return cached.rows;

  const data = await api<unknown>(dataset.endpoint);
  const rows = (Array.isArray(data)
    ? data
    : (data as { rows?: unknown[]; items?: unknown[] }).rows ??
      (data as { items?: unknown[] }).items ??
      []
  ).filter((row): row is Record<string, unknown> => !!row && typeof row === "object" && !Array.isArray(row));

  rowCache.set(dataset.endpoint, { at: Date.now(), rows });
  return rows;
}

export function downloadTransferFile(filename: string, text: string, format: TransferFormat) {
  downloadTextFile(filename, text, FORMAT_MIME[format]);
}

export type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{ row: number; label: string; message: string }>;
};

/** Every import method ends here, so behaviour does not depend on how data arrived. */
export async function importTransferRows(dataset: string, rows: Record<string, unknown>[]): Promise<ImportResult> {
  const result = await api<ImportResult>("/api/console/data-transfer/import", {
    method: "POST",
    body: JSON.stringify({ dataset, rows }),
  });
  clearTransferRows(dataset);
  return result;
}

export type QuickExportKind =
  | "org"
  | "catalog"
  | "sales"
  | "all"
  | "loyalty-members"
  | "gift-cards"
  | "expenses"
  | "orders"
  | "staff"
  | "crm-contacts"
  | "ledger-accounts";
