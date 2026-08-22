import type { CartLine } from "./types";
import { ITEMS } from "./demo";

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

function ago(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function line(itemId: string, qty: number): CartLine {
  const item = ITEMS.find((entry) => entry.id === itemId)!;
  return {
    id: crypto.randomUUID(),
    itemId: item.id,
    name: item.name,
    quantity: qty,
    unitPriceMinor: item.priceMinor,
    image: item.image,
    unit: item.unit,
    unitLabel: item.unitLabel,
    packSize: item.packSize,
  };
}

export function createFloor(): FloorTable[] {
  return [
    { id: "t1", name: "1", area: "Dining", seats: 2, guests: 0, shape: "square", x: 8, y: 12, status: "free", openedAt: null, lines: [] },
    { id: "t2", name: "2", area: "Dining", seats: 4, guests: 3, shape: "round", x: 28, y: 10, status: "occupied", openedAt: ago(18), lines: [line("raspberry-tart", 2), line("lemon-tart", 1)] },
    { id: "t3", name: "3", area: "Dining", seats: 4, guests: 0, shape: "round", x: 50, y: 10, status: "free", openedAt: null, lines: [] },
    { id: "t4", name: "4", area: "Dining", seats: 6, guests: 5, shape: "rect", x: 72, y: 12, status: "ready", openedAt: ago(32), lines: [line("chocolate-cake", 1), line("fruit-tart", 2)] },
    { id: "t5", name: "5", area: "Dining", seats: 4, guests: 2, shape: "round", x: 18, y: 48, status: "served", openedAt: ago(54), lines: [line("berry-cheesecake", 2)] },
    { id: "t6", name: "6", area: "Dining", seats: 8, guests: 6, shape: "rect", x: 46, y: 46, status: "occupied", openedAt: ago(12), lines: [line("vanilla-slice", 3), line("raspberry-tart", 1)] },
    { id: "t7", name: "7", area: "Dining", seats: 2, guests: 0, shape: "square", x: 76, y: 52, status: "free", openedAt: null, lines: [] },
    { id: "t8", name: "8", area: "Dining", seats: 4, guests: 4, shape: "round", x: 30, y: 78, status: "billed", openedAt: ago(70), lines: [line("lemon-tart", 4)] },
    { id: "t9", name: "9", area: "Dining", seats: 4, guests: 0, shape: "round", x: 58, y: 78, status: "free", openedAt: null, lines: [] },
    { id: "t10", name: "11", area: "Terrace", seats: 4, guests: 2, shape: "round", x: 12, y: 22, status: "occupied", openedAt: ago(8), lines: [line("fruit-tart", 1)] },
    { id: "t11", name: "12", area: "Terrace", seats: 2, guests: 0, shape: "square", x: 42, y: 20, status: "free", openedAt: null, lines: [] },
    { id: "t12", name: "13", area: "Terrace", seats: 6, guests: 4, shape: "rect", x: 68, y: 28, status: "ready", openedAt: ago(22), lines: [line("chocolate-cake", 2)] },
    { id: "t13", name: "14", area: "Terrace", seats: 4, guests: 0, shape: "round", x: 28, y: 62, status: "free", openedAt: null, lines: [] },
    { id: "t14", name: "15", area: "Terrace", seats: 4, guests: 3, shape: "round", x: 62, y: 64, status: "served", openedAt: ago(40), lines: [line("raspberry-tart", 3)] },
    { id: "b1", name: "B1", area: "Bar", seats: 2, guests: 1, shape: "square", x: 14, y: 18, status: "occupied", openedAt: ago(6), lines: [line("lemon-tart", 1)] },
    { id: "b2", name: "B2", area: "Bar", seats: 2, guests: 0, shape: "square", x: 42, y: 18, status: "free", openedAt: null, lines: [] },
    { id: "b3", name: "B3", area: "Bar", seats: 2, guests: 2, shape: "square", x: 70, y: 18, status: "served", openedAt: ago(25), lines: [line("vanilla-slice", 2)] },
    { id: "b4", name: "B4", area: "Bar", seats: 4, guests: 0, shape: "rect", x: 38, y: 58, status: "free", openedAt: null, lines: [] },
  ];
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
