import type { CartLine } from "./types";

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

export function createRooms(): HotelRoom[] {
  return [];
}

export function roomTotal(room: HotelRoom) {
  return room.lines.reduce(
    (sum, line) => sum + line.unitPriceMinor * line.quantity,
    0,
  );
}
