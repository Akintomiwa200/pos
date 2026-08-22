import type { CartLine } from "./types";
import { ITEMS } from "./demo";

export type RoomStatus = "vacant" | "occupied" | "checkout" | "dirty";

export type HotelRoom = {
  id: string;
  name: string;
  floor: string;
  guests: number;
  guestName: string;
  status: RoomStatus;
  openedAt: string | null;
  lines: CartLine[];
};

export const ROOM_STATUS: Record<RoomStatus, { label: string; fill: string }> = {
  vacant: { label: "Vacant", fill: "#bbf7d0" },
  occupied: { label: "In house", fill: "#93c5fd" },
  checkout: { label: "Checking out", fill: "#fde68a" },
  dirty: { label: "Housekeeping", fill: "#fecaca" },
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

export function createRooms(): HotelRoom[] {
  return [
    { id: "r101", name: "101", floor: "Floor 1", guests: 0, guestName: "", status: "vacant", openedAt: null, lines: [] },
    { id: "r102", name: "102", floor: "Floor 1", guests: 2, guestName: "Adeola Mensah", status: "occupied", openedAt: ago(90), lines: [line("raspberry-tart", 1)] },
    { id: "r103", name: "103", floor: "Floor 1", guests: 0, guestName: "", status: "vacant", openedAt: null, lines: [] },
    { id: "r104", name: "104", floor: "Floor 1", guests: 1, guestName: "Chidi Okonkwo", status: "checkout", openedAt: ago(40), lines: [line("lemon-tart", 2)] },
    { id: "r105", name: "105", floor: "Floor 1", guests: 0, guestName: "", status: "dirty", openedAt: null, lines: [] },
    { id: "r106", name: "106", floor: "Floor 1", guests: 0, guestName: "", status: "vacant", openedAt: null, lines: [] },
    { id: "r201", name: "201", floor: "Floor 2", guests: 2, guestName: "Fatima Bello", status: "occupied", openedAt: ago(180), lines: [line("chocolate-cake", 1), line("fruit-tart", 1)] },
    { id: "r202", name: "202", floor: "Floor 2", guests: 0, guestName: "", status: "vacant", openedAt: null, lines: [] },
    { id: "r203", name: "203", floor: "Floor 2", guests: 3, guestName: "Ifeanyi & guests", status: "occupied", openedAt: ago(50), lines: [line("berry-cheesecake", 2)] },
    { id: "r204", name: "204", floor: "Floor 2", guests: 0, guestName: "", status: "dirty", openedAt: null, lines: [] },
    { id: "r205", name: "205", floor: "Floor 2", guests: 0, guestName: "", status: "vacant", openedAt: null, lines: [] },
    { id: "r206", name: "206", floor: "Floor 2", guests: 1, guestName: "Ngozi Eze", status: "checkout", openedAt: ago(15), lines: [line("vanilla-slice", 1)] },
    { id: "r301", name: "301", floor: "Floor 3", guests: 0, guestName: "", status: "vacant", openedAt: null, lines: [] },
    { id: "r302", name: "302", floor: "Floor 3", guests: 2, guestName: "Suite Adeyemi", status: "occupied", openedAt: ago(240), lines: [line("fruit-tart", 2)] },
    { id: "r303", name: "303", floor: "Floor 3", guests: 0, guestName: "", status: "vacant", openedAt: null, lines: [] },
    { id: "r304", name: "304", floor: "Floor 3", guests: 0, guestName: "", status: "dirty", openedAt: null, lines: [] },
  ];
}

export function roomTotal(room: HotelRoom) {
  return room.lines.reduce(
    (sum, line) => sum + line.unitPriceMinor * line.quantity,
    0,
  );
}
