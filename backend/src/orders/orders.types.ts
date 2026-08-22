export const DOC_KINDS = [
  "purchase-order",
  "purchase-invoice",
  "purchase-return",
  "sales-quote",
] as const;

export type DocKind = (typeof DOC_KINDS)[number];

export type DocStatus = "draft" | "open" | "received" | "closed" | "cancelled";

export type DocLine = {
  itemId: string;
  name: string;
  quantity: number;
  unitPriceMinor: number;
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
};

export function isDocKind(value: string): value is DocKind {
  return (DOC_KINDS as readonly string[]).includes(value);
}

export function docTotal(lines: DocLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity * line.unitPriceMinor, 0);
}

export const KIND_LABELS: Record<DocKind, string> = {
  "purchase-order": "PO",
  "purchase-invoice": "PINV",
  "purchase-return": "PRET",
  "sales-quote": "QUO",
};

export function nextNumber(kind: DocKind, existing: TradeDoc[]): string {
  const year = new Date().getFullYear();
  const count = existing.filter((row) => row.kind === kind).length + 1;
  return `${KIND_LABELS[kind]}-${year}-${String(count).padStart(4, "0")}`;
}
