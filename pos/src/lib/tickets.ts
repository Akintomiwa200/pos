import type { CartLine } from "./types";

export type KitchenChannel = "walk-in" | "chowdeck" | "jumia" | "phone";
export type TicketStatus = "new" | "prep" | "ready" | "dispatched";

export type KitchenTicket = {
  id: string;
  channel: KitchenChannel;
  orderNo: string;
  guestName: string;
  status: TicketStatus;
  openedAt: string | null;
  lines: CartLine[];
};

export const KITCHEN_CHANNELS: { id: KitchenChannel; label: string }[] = [
  { id: "walk-in", label: "Walk-in" },
  { id: "chowdeck", label: "Chowdeck" },
  { id: "jumia", label: "Jumia Food" },
  { id: "phone", label: "Phone" },
];

export const TICKET_STATUS: Record<TicketStatus, { label: string; fill: string }> = {
  new: { label: "New", fill: "#fecaca" },
  prep: { label: "In kitchen", fill: "#fde68a" },
  ready: { label: "Ready", fill: "#93c5fd" },
  dispatched: { label: "Dispatched", fill: "#bbf7d0" },
};

export function channelLabel(id: KitchenChannel) {
  return KITCHEN_CHANNELS.find((row) => row.id === id)?.label ?? id;
}

export function nextOrderNo(channel: KitchenChannel, existing: KitchenTicket[]) {
  const prefix =
    channel === "walk-in"
      ? "W"
      : channel === "chowdeck"
        ? "CD"
        : channel === "jumia"
          ? "JF"
          : "PH";
  const count = existing.filter((row) => row.channel === channel).length + 1;
  return `${prefix}-${String(count).padStart(3, "0")}`;
}

export function createKitchenBoard(): KitchenTicket[] {
  return [];
}

export function ticketTotal(ticket: KitchenTicket) {
  return ticket.lines.reduce(
    (sum, line) => sum + line.unitPriceMinor * line.quantity,
    0,
  );
}
