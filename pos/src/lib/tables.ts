import type { CartLine } from "./types";

export type TableStatus =
  | "free"
  | "occupied"
  | "ready"
  | "served"
  | "billed";

export type TableShape = "round" | "square" | "rect";

export type FloorTable = {
  id: string;
  name: string;
  area: "Dining" | "Terrace" | "Bar";
  seats: number;
  guests: number;
  shape: TableShape;
  x: number;
  y: number;
  status: TableStatus;
  openedAt: string | null;
  lines: CartLine[];
};

export const TABLE_STATUS: Record<
  TableStatus,
  { label: string; fill: string }
> = {
  free: { label: "Free", fill: "#bbf7d0" },
  occupied: { label: "With order", fill: "#fecaca" },
  ready: { label: "Ready to serve", fill: "#93c5fd" },
  served: { label: "Served", fill: "#4ade80" },
  billed: { label: "Bill printed", fill: "#fde68a" },
};

export function createFloor(): FloorTable[] {
  return [];
}

export function tableTotal(table: FloorTable) {
  return table.lines.reduce(
    (sum, line) => sum + line.unitPriceMinor * line.quantity,
    0,
  );
}

export function statusOf(table: FloorTable): TableStatus {
  if (table.status === "free") return "free";
  return table.status;
}
