import type { DirectoryName, DirectoryRecord } from "@/lib/hq-directory";

export type DirectoryFieldKind = "text" | "textarea" | "select" | "number" | "date";

export type DirectoryField = {
  key: string;
  label: string;
  kind?: DirectoryFieldKind;
  options?: string[];
  placeholder?: string;
  suffix?: string;
};

export type DirectoryColumn = {
  key: string;
  label: string;
  badge?: boolean;
  mono?: boolean;
  date?: boolean;
  tone?: string;
  toneFor?: (row: DirectoryRecord) => string;
  render?: (row: DirectoryRecord) => string;
};

export type DirectoryConfig = {
  directory: DirectoryName;
  kicker: string;
  title: string;
  copy: string;
  singular: string;
  columns: DirectoryColumn[];
  fields: DirectoryField[];
  secondary?: string;
  detail?: string;
  insight?: (rows: DirectoryRecord[]) => { label: string; value: string; hint?: string };
  status?: (row: DirectoryRecord) => { label: string; tone: string };
};

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const second = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + second).toUpperCase();
}

export function prettyDate(value: string | number | boolean | null | undefined) {
  const raw = value === null || value === undefined ? "" : String(value);
  if (!raw) return "—";
  const parsed = new Date(raw.length === 10 ? `${raw}T00:00:00` : raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function fix(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export function labelize(value: string) {
  return (value || "--")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function cellValue(row: DirectoryRecord, key: string): string {
  if (key.startsWith("extra.")) {
    const value = (row.extra ?? {})[key.slice(6)];
    return value === null || value === undefined ? "" : String(value);
  }
  const direct = row[key as "phone" | "email" | "address" | "note"];
  return direct ?? "";
}

export function setField(
  draft: Partial<DirectoryRecord>,
  key: string,
  value: string,
): Partial<DirectoryRecord> {
  if (key.startsWith("extra.")) {
    const field = key.slice(6);
    return { ...draft, extra: { ...(draft.extra ?? {}), [field]: value } };
  }
  return { ...draft, [key]: value };
}

function promotionValue(row: DirectoryRecord) {
  const extra = row.extra ?? {};
  const type = String(extra.type ?? "");
  const value = String(extra.value ?? "");
  if (type === "fixed") return `₦${Number(value).toLocaleString()} off`;
  if (type === "percent") return `${value}% off`;
  return fix(value);
}

const validStatus = (row: DirectoryRecord) => {
  if (!row.active) return { label: "Paused", tone: "slate" as const };
  const to = String((row.extra ?? {}).validTo ?? "");
  const now = new Date().toISOString().slice(0, 10);
  if (to && to < now) return { label: "Ended", tone: "slate" as const };
  return { label: "Live", tone: "emerald" as const };
};

export const DIRECTORY_CONFIGS: Record<string, DirectoryConfig> = {
  customer: {
    directory: "customers",
    kicker: "Setup · Customer",
    title: "Customer",
    copy: "People and businesses you sell to on credit or keep on file for receipts.",
    singular: "customer",
    columns: [
      { key: "phone", label: "Phone" },
      { key: "address", label: "Address" },
    ],
    fields: [
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "address", label: "Address" },
      { key: "note", label: "Credit terms / note", kind: "textarea" },
    ],
  },
  vendor: {
    directory: "vendors",
    kicker: "Setup · Vendor",
    title: "Vendor",
    copy: "Suppliers you raise purchase orders and record purchase invoices against.",
    singular: "vendor",
    detail: "/setup/vendor",
    secondary: "extra.category",
    columns: [
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
    ],
    fields: [
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "address", label: "Address" },
      { key: "note", label: "Note", kind: "textarea" },
    ],
  },
  "sales-representative": {
    directory: "sales-reps",
    kicker: "Setup · Sales Representative",
    title: "Sales Representative",
    copy: "Reps attached to sales for commission and leaderboard attribution.",
    singular: "sales rep",
    detail: "/setup/sales-representative",
    secondary: "extra.territory",
    columns: [
      { key: "extra.territory", label: "Territory", badge: true },
      {
        key: "extra.commissionPct",
        label: "Commission",
        badge: true,
        tone: "emerald",
        render: (row) => `${String((row.extra ?? {}).commissionPct ?? "")}%`,
      },
      { key: "phone", label: "Phone" },
    ],
    fields: [
      { key: "name", label: "Full name", placeholder: "e.g. Ada Eze" },
      { key: "extra.territory", label: "Territory", placeholder: "e.g. Lagos Mainland" },
      { key: "extra.commissionPct", label: "Commission rate", kind: "number", suffix: "%" },
      { key: "extra.monthlyTarget", label: "Monthly target", kind: "number", suffix: "₦" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "note", label: "Note", kind: "textarea" },
    ],
    insight: (rows) => ({
      label: "Territories",
      value: String(new Set(rows.map((row) => String((row.extra ?? {}).territory ?? "")).filter(Boolean)).size),
    }),
  },
  staff: {
    directory: "staff",
    kicker: "Setup · Staff",
    title: "Staff",
    copy: "Your people — roles, departments and roster status.",
    singular: "staff member",
    detail: "/setup/staff",
    secondary: "extra.role",
    columns: [
      { key: "extra.role", label: "Role", badge: true },
      { key: "extra.department", label: "Department", badge: true },
      { key: "phone", label: "Phone" },
      { key: "extra.staffCode", label: "ID", mono: true },
    ],
    fields: [
      { key: "name", label: "Full name", placeholder: "e.g. Chika Okonkwo" },
      {
        key: "extra.role",
        label: "Role",
        kind: "select",
        options: [
          "Store Manager",
          "Supervisor",
          "Cashier",
          "Baker",
          "Barista",
          "Stock Controller",
          "Rider",
          "Cleaner",
        ],
      },
      {
        key: "extra.department",
        label: "Department",
        kind: "select",
        options: ["Office", "Counter", "Bakery", "Kitchen", "Store", "Dispatch"],
      },
      { key: "extra.staffCode", label: "Staff ID", placeholder: "e.g. ST-012" },
      { key: "extra.joined", label: "Joined", kind: "date" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "note", label: "Notes", kind: "textarea" },
    ],
    insight: (rows) => ({
      label: "Departments",
      value: String(
        new Set(
          rows.map((row) => String((row.extra ?? {}).department ?? "")).filter(Boolean),
        ).size,
      ),
    }),
  },
  manufacturer: {
    directory: "manufacturers",
    kicker: "Setup · Manufacturer",
    title: "Manufacturer",
    copy: "Brands and manufacturers used when setting up catalog items.",
    singular: "manufacturer",
    columns: [{ key: "note", label: "Note" }],
    fields: [{ key: "note", label: "Note", kind: "textarea" }],
  },
  "payment-method": {
    directory: "payment-methods",
    kicker: "Setup · Payment Method",
    title: "Payment Method",
    copy: "Tenders cashiers can select at checkout — toggle each one on to offer it at the till.",
    singular: "payment method",
    detail: "/setup/payment-method",
    secondary: "extra.kind",
    columns: [
      { key: "extra.kind", label: "Type", badge: true },
      { key: "note", label: "Instructions" },
    ],
    fields: [
      { key: "name", label: "Name", placeholder: "e.g. Bank Transfer" },
      {
        key: "extra.kind",
        label: "Type",
        kind: "select",
        options: ["cash", "card", "transfer", "ussd", "mobile", "cheque"],
      },
      { key: "note", label: "Instructions at checkout", kind: "textarea" },
    ],
    insight: (rows) => ({
      label: "Methods",
      value: String(new Set(rows.map((row) => String((row.extra ?? {}).kind ?? "")).filter(Boolean)).size),
      hint: "distinct tender types",
    }),
  },
  "sales-promotion": {
    directory: "promotions",
    kicker: "Setup · Sales Promotion",
    title: "Sales Promotion",
    copy: "Discount campaigns your cashiers can apply at the till — percentage or fixed, with validity windows.",
    singular: "promotion",
    detail: "/setup/sales-promotion",
    columns: [
      { key: "extra.type", label: "Type", badge: true },
      {
        key: "promotionValue",
        label: "Value",
        badge: true,
        render: promotionValue,
        toneFor: (row) => (String((row.extra ?? {}).type ?? "") === "fixed" ? "indigo" : "emerald"),
      },
      { key: "extra.validFrom", label: "Starts", date: true },
      { key: "extra.validTo", label: "Ends", date: true },
    ],
    fields: [
      { key: "name", label: "Name", placeholder: "e.g. Happy Hour 20% pastry" },
      {
        key: "extra.type",
        label: "Discount type",
        kind: "select",
        options: ["percent", "fixed"],
      },
      {
        key: "extra.value",
        label: "Value",
        kind: "number",
        suffix: "%",
        placeholder: "e.g. 10",
      },
      { key: "extra.minOrder", label: "Minimum order", kind: "number", suffix: "₦" },
      { key: "extra.maxDiscount", label: "Maximum discount off", kind: "number", suffix: "₦" },
      { key: "extra.appliesTo", label: "Applies to", kind: "select", options: ["all", "select-items"] },
      { key: "extra.validFrom", label: "Starts", kind: "date" },
      { key: "extra.validTo", label: "Ends", kind: "date" },
      { key: "note", label: "Rules shown at the till", kind: "textarea" },
    ],
    status: validStatus,
    insight: (rows) => {
      const now = new Date().toISOString().slice(0, 10);
      const liveRows = rows.filter((row) => {
        if (!row.active) return false;
        const to = String((row.extra ?? {}).validTo ?? "");
        return !to || to >= now;
      }).length;
      return { label: "Live now", value: String(liveRows), hint: "running promotions" };
    },
  },
  "expense-account": {
    directory: "expense-accounts",
    kicker: "Setup · Expense Account",
    title: "Expense Account",
    copy: "Accounts expenses are booked against, e.g. Diesel, Rent, Logistics.",
    singular: "expense account",
    columns: [{ key: "note", label: "Description" }],
    fields: [{ key: "note", label: "Description", kind: "textarea" }],
  },
};