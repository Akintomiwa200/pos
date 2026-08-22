import type { CartLine } from "./types";
import { ITEMS } from "./demo";

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
  return [
    {
      id: "k1",
      channel: "chowdeck",
      orderNo: "CD-104",
      guestName: "Tunde A.",
      status: "prep",
      openedAt: ago(12),
      lines: [line("raspberry-tart", 2), line("lemon-tart", 1)],
    },
    {
      id: "k2",
      channel: "jumia",
      orderNo: "JF-018",
      guestName: "Amaka K.",
      status: "new",
      openedAt: ago(4),
      lines: [line("chocolate-cake", 1)],
    },
    {
      id: "k3",
      channel: "walk-in",
      orderNo: "W-011",
      guestName: "Counter",
      status: "ready",
      openedAt: ago(22),
      lines: [line("fruit-tart", 3)],
    },
    {
      id: "k4",
      channel: "phone",
      orderNo: "PH-007",
      guestName: "Mrs. Balogun",
      status: "prep",
      openedAt: ago(18),
      lines: [line("berry-cheesecake", 2), line("vanilla-slice", 1)],
    },
    {
      id: "k5",
      channel: "chowdeck",
      orderNo: "CD-105",
      guestName: "Ibrahim S.",
      status: "ready",
      openedAt: ago(28),
      lines: [line("lemon-tart", 4)],
    },
  ];
}

export function ticketTotal(ticket: KitchenTicket) {
  return ticket.lines.reduce(
    (sum, line) => sum + line.unitPriceMinor * line.quantity,
    0,
  );
}
