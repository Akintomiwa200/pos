import { api } from "./hq-api";
import type { HqCatalogItem, HqSale } from "./hq-api";

export function naira(minor: number, fractionDigits = 2) {
  return (minor / 100).toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: fractionDigits,
  });
}

export function dayKey(iso: string) {
  return iso.slice(0, 10);
}

export function prettyDay(key: string) {
  const date = new Date(`${key}T00:00:00`);
  if (Number.isNaN(date.getTime())) return key;
  return date.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" });
}

export function hourOf(iso: string) {
  return new Date(iso).getHours();
}

/* ---------------- Expenses ---------------- */

export type HqExpense = {
  id: string;
  at: string;
  account: string;
  description: string;
  amountMinor: number;
  method: string;
  staff?: string;
};

export function listExpenses(account?: string): Promise<HqExpense[]> {
  return api<HqExpense[]>(`/api/expenses${account ? `?account=${encodeURIComponent(account)}` : ""}`);
}

export function saveExpense(expense: Partial<HqExpense>): Promise<HqExpense> {
  return api<HqExpense>("/api/expenses", {
    method: "POST",
    body: JSON.stringify(expense),
  });
}

export async function deleteExpense(id: string) {
  await api(`/api/expenses/${id}`, { method: "DELETE" });
}

/* ---------------- Stock movements ---------------- */

export type StockLevel = {
  itemId: string;
  name: string;
  category: string;
  sku: string;
  barcode: string;
  onHand: number;
  reorderPoint: number;
  valueMinor: number;
  unit: string;
  unitLabel?: string;
  packSize: number;
};

export type StockMovement = {
  id: string;
  at: string;
  type: "transfer" | "adjustment" | "count";
  itemId: string;
  itemName: string;
  quantity: number;
  from?: string;
  to?: string;
  countedOnHand?: number;
  reason?: string;
  staff?: string;
};

export async function listStockLevels(lowOnly = false): Promise<StockLevel[]> {
  return api<StockLevel[]>(`/api/inventory${lowOnly ? "?low=1" : ""}`);
}

export function listMovements(itemId?: string): Promise<StockMovement[]> {
  return api<StockMovement[]>(`/api/inventory/movements${itemId ? `?itemId=${encodeURIComponent(itemId)}` : ""}`);
}

export type MovementInput = {
  type: "transfer" | "adjustment" | "count";
  itemId: string;
  quantity?: number;
  from?: string;
  to?: string;
  countedOnHand?: number;
  reason?: string;
  staff?: string;
};

export function recordMovement(input: MovementInput): Promise<StockMovement> {
  return api<StockMovement>("/api/inventory/movements", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/* ---------------- Trade documents (purchase + quotes) ---------------- */

export type DocKind =
  | "purchase-order"
  | "purchase-invoice"
  | "purchase-return"
  | "sales-quote"
  | "sales-return";
export type DocStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "open"
  | "partial"
  | "received"
  | "closed"
  | "cancelled"
  | "rejected";

export type DocLine = {
  itemId: string;
  name: string;
  quantity: number;
  unitPriceMinor: number;
  receivedQty?: number;
};

export type TradeDoc = {
  id: string;
  kind: DocKind;
  number: string;
  party: string;
  at: string;
  expectedAt?: string;
  status: DocStatus;
  lines: DocLine[];
  totalMinor: number;
  notes?: string;
  createdBy?: string;
  submittedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  receivedAt?: string;
};

export function listDocs(kind: DocKind): Promise<TradeDoc[]> {
  return api<TradeDoc[]>(`/api/orders?kind=${kind}`);
}

export function saveDoc(doc: Partial<TradeDoc>): Promise<TradeDoc> {
  return api<TradeDoc>("/api/orders", { method: "POST", body: JSON.stringify(doc) });
}

export async function deleteDoc(id: string) {
  await api(`/api/orders/${id}`, { method: "DELETE" });
}

/* ---------------- Reports ---------------- */

export type DayReport = {
  kind: "X" | "Z";
  day: string;
  netMinor: number;
  transactions: number;
  cashExpectedMinor: number;
  closed?: boolean;
  tenders: Array<{ tender: string; totalMinor: number; count: number }>;
};

export function xReport(day?: string) {
  return api<DayReport>(`/api/reports/x${day ? `?day=${day}` : ""}`);
}

export function zReport(day?: string) {
  return api<DayReport>(`/api/reports/z${day ? `?day=${day}` : ""}`);
}

export type TaxSummary = {
  ratePercent: number;
  inclusive: boolean;
  outputTaxMinor: number;
  inputTaxMinor: number;
  liabilityMinor: number;
  lines: Array<{ ref: string; at: string; netMinor: number; taxMinor: number; grossMinor: number }>;
  byCategory: Array<{ category: string; netMinor: number; taxMinor: number }>;
};

export function taxSummary(day?: string) {
  return api<TaxSummary>(`/api/reports/tax${day ? `?day=${day}` : ""}`);
}

export type PaymentFeed = {
  transactions: Array<{
    ticketId: string;
    paidAt: string;
    tender: string;
    totalMinor: number;
    cashierName: string;
  }>;
  settlements: Array<{ tender: string; totalMinor: number; count: number }>;
};

export function paymentFeed(): Promise<PaymentFeed> {
  return api<PaymentFeed>("/api/payments");
}

/* ---------------- Client-side report derivation ---------------- */

export type SalesAggregate = {
  revenueMinor: number;
  tickets: number;
  units: number;
  byDay: Array<{ day: string; totalMinor: number; tickets: number }>;
  byHour: Array<{ hour: number; totalMinor: number }>;
  byTender: Array<{ tender: string; totalMinor: number; count: number }>;
  byCategory: Array<{ category: string; totalMinor: number; units: number }>;
  byItem: Array<{ itemId: string; name: string; totalMinor: number; units: number }>;
  byCashier: Array<{ name: string; totalMinor: number; tickets: number }>;
  avgTicketMinor: number;
};

const EMPTY_AGGREGATE: SalesAggregate = {
  revenueMinor: 0,
  tickets: 0,
  units: 0,
  byDay: [],
  byHour: [],
  byTender: [],
  byCategory: [],
  byItem: [],
  byCashier: [],
  avgTicketMinor: 0,
};

function bumpMap<K>(map: Map<K, number>, key: K, amount: number) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

export function aggregateSales(
  sales: HqSale[],
  catalog: HqCatalogItem[] = [],
): SalesAggregate {
  if (!sales.length) return EMPTY_AGGREGATE;
  const categoryOf = new Map(catalog.map((item) => [item.id, item.category] as const));
  const days = new Map<string, { totalMinor: number; tickets: number }>();
  const hours = new Map<number, number>();
  const tenders = new Map<string, { totalMinor: number; count: number }>();
  const categories = new Map<string, { totalMinor: number; units: number }>();
  const items = new Map<string, { name: string; totalMinor: number; units: number }>();
  const cashiers = new Map<string, { totalMinor: number; tickets: number }>();

  let revenue = 0;
  let units = 0;

  for (const sale of sales) {
    revenue += sale.totalMinor;
    const day = dayKey(sale.paidAt);
    const dayRow = days.get(day) ?? { totalMinor: 0, tickets: 0 };
    dayRow.totalMinor += sale.totalMinor;
    dayRow.tickets += 1;
    days.set(day, dayRow);

    bumpMap(hours, hourOf(sale.paidAt), sale.totalMinor);

    const tender = tenders.get(sale.tender) ?? { totalMinor: 0, count: 0 };
    tender.totalMinor += sale.totalMinor;
    tender.count += 1;
    tenders.set(sale.tender, tender);

    const cashier = cashiers.get(sale.cashierName || "Unknown") ?? {
      totalMinor: 0,
      tickets: 0,
    };
    cashier.totalMinor += sale.totalMinor;
    cashier.tickets += 1;
    cashiers.set(sale.cashierName || "Unknown", cashier);

    for (const line of sale.lines ?? []) {
      const lineTotal = line.unitPriceMinor * line.quantity;
      units += line.quantity;
      const category = categoryOf.get(line.itemId ?? "") ?? "General";
      const catRow = categories.get(category) ?? { totalMinor: 0, units: 0 };
      catRow.totalMinor += lineTotal;
      catRow.units += line.quantity;
      categories.set(category, catRow);

      const itemKey = line.itemId ?? line.name;
      const itemRow = items.get(itemKey) ?? { name: line.name, totalMinor: 0, units: 0 };
      itemRow.totalMinor += lineTotal;
      itemRow.units += line.quantity;
      items.set(itemKey, itemRow);
    }
  }

  const sortDesc = <T extends { totalMinor: number }>(rows: T[]) =>
    rows.sort((a, b) => b.totalMinor - a.totalMinor);

  return {
    revenueMinor: revenue,
    tickets: sales.length,
    units,
    byDay: [...days.entries()]
      .map(([day, row]) => ({ day, ...row }))
      .sort((a, b) => a.day.localeCompare(b.day)),
    byHour: [...hours.entries()].map(([hour, totalMinor]) => ({ hour, totalMinor })).sort((a, b) => a.hour - b.hour),
    byTender: sortDesc([...tenders.entries()].map(([tender, row]) => ({ tender, ...row }))),
    byCategory: sortDesc([...categories.entries()].map(([category, row]) => ({ category, ...row }))),
    byItem: sortDesc([...items.entries()].map(([itemId, row]) => ({ itemId, ...row }))),
    byCashier: sortDesc([...cashiers.entries()].map(([name, row]) => ({ name, ...row }))),
    avgTicketMinor: Math.round(revenue / Math.max(1, sales.length)),
  };
}
