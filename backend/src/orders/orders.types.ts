export const DOC_KINDS = [
  "purchase-order",
  "purchase-invoice",
  "purchase-return",
  "sales-quote",
  "sales-return",
] as const;

export type DocKind = (typeof DOC_KINDS)[number];

/** Purchase-order workflow statuses (legacy `open` kept for older docs). */
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
  "sales-return": "SRET",
};

export const ORDER_STATUSES: DocStatus[] = [
  "draft",
  "pending_approval",
  "approved",
  "open",
  "partial",
  "received",
  "closed",
  "cancelled",
  "rejected",
];

export function nextNumber(kind: DocKind, existing: TradeDoc[]): string {
  const year = new Date().getFullYear();
  const count = existing.filter((row) => row.kind === kind).length + 1;
  return `${KIND_LABELS[kind]}-${year}-${String(count).padStart(4, "0")}`;
}

export const SEED_PURCHASE_ORDERS: TradeDoc[] = [
  {
    id: "po-seed-1",
    kind: "purchase-order",
    number: `PO-${new Date().getFullYear()}-0001`,
    party: "Nestle Nigeria Plc",
    at: new Date(Date.now() - 86400000 * 3).toISOString(),
    expectedAt: new Date(Date.now() + 86400000 * 4).toISOString().slice(0, 10),
    status: "pending_approval",
    lines: [
      { itemId: "", name: "Peak Milk 400g", quantity: 48, unitPriceMinor: 2_450_00 },
      { itemId: "", name: "Milo 500g", quantity: 24, unitPriceMinor: 3_100_00 },
    ],
    totalMinor: 48 * 2_450_00 + 24 * 3_100_00,
    notes: "Weekly dry goods restock",
    createdBy: "Procurement",
    submittedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "po-seed-2",
    kind: "purchase-order",
    number: `PO-${new Date().getFullYear()}-0002`,
    party: "Chi Limited",
    at: new Date(Date.now() - 86400000 * 8).toISOString(),
    expectedAt: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
    status: "open",
    lines: [
      { itemId: "", name: "Chivita Active 1L", quantity: 60, unitPriceMinor: 1_800_00 },
    ],
    totalMinor: 60 * 1_800_00,
    notes: "Approved juice order",
    createdBy: "Procurement",
    submittedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    approvedAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    approvedBy: "Admin",
  },
];
