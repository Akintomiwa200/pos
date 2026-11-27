import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { CartLine, CatalogItem, TenderType } from "./lib/types";
import type { RegisterAction } from "./lib/register-config";
import { computeLineTotals, formatMoney, sellPrice } from "./lib/types";
import { formatStock, formatUnitLabel } from "./lib/units";
import { Sidebar, type NavId } from "./components/layout/Sidebar";
import { ProfileMenu, type MenuAction } from "./components/layout/ProfileMenu";
import { CurrentOrder } from "./components/order/CurrentOrder";
import { HoldModal } from "./components/order/HoldModal";
import { PaymentOverlay } from "./components/payment/PaymentOverlay";
import { PaymentHandoffModal, type Handoff } from "./components/payment/PaymentHandoffModal";
import { LoyaltyModal } from "./components/payment/LoyaltyModal";
import {
  GiftCardModal,
  type GiftCardSelection,
} from "./components/payment/GiftCardModal";
import { DiscountModal } from "./components/payment/DiscountModal";
import { RefundModal } from "./components/payment/RefundModal";
import { TipModal } from "./components/payment/TipModal";
import { BlindRefundModal } from "./components/payment/BlindRefundModal";
import { ItemsScreen } from "./screens/items/ItemsScreen";
import { PaymentMethodsScreen } from "./screens/payment-methods/PaymentMethodsScreen";
import { SplitPaymentScreen } from "./screens/split-payment/SplitPaymentScreen";
import { PaidScreen } from "./screens/paid/PaidScreen";
import { SettingsScreen } from "./screens/settings/SettingsScreen";
import { KitchenDisplay } from "./screens/kds/KitchenDisplay";
import { SavedScreen } from "./screens/saved/SavedScreen";
import type { TicketStatus } from "./lib/tickets";
import { LoginScreen } from "./screens/login/LoginScreen";
import { OpenShiftModal } from "./components/shift/OpenShiftModal";
import { PinModal } from "./components/shift/PinModal";
import { ActivateTillModal } from "./components/shift/ActivateTillModal";
import { createFloor, type FloorTable } from "./lib/tables";
import { createRooms, type HotelRoom } from "./lib/rooms";
import {
  channelLabel,
  createKitchenBoard,
  nextOrderNo,
  type KitchenChannel,
  type KitchenTicket,
} from "./lib/tickets";
import { findCatalogByCode, lookupCatalog, useCatalog } from "./lib/catalog";
import { useCombos, type ComboView } from "./lib/combos";
import { TENDER_LABEL, type SaleReceipt } from "./lib/receipt";
import { archiveSale, flushSalesOutbox } from "./lib/sales";
import {
  loadKitchenTickets,
  loadHolds,
  loadRooms,
  loadTables,
  saveKitchenTickets,
  saveHolds as pushHolds,
  saveRooms,
  saveTables,
} from "./lib/boards";
import {
  loadStoreSettings,
  loyaltyPointsEarned,
  normalizeBarcode,
  takeNextTicketId,
} from "./lib/store-settings";
import { createHeldTicket, loadLocalHolds, pruneExpiredHolds, saveLocalHolds, type HeldTicket } from "./lib/holds";
import { buildRefundSale } from "./lib/refunds";
import { pendingSaleCount as countPendingSales } from "./lib/sales";
import { requestCharge } from "./lib/payments";
import { useStoreSettings, useTills } from "./lib/use-store-settings";
import {
  listLoyaltyCards,
  listLoyaltyMembers,
  syncLoyaltyProgram,
  type LoyaltyMember,
} from "./lib/loyalty";
import { redeemLoyalty, reverseRedemption } from "./lib/redemptions";
import { redeemGiftCard, reverseGiftCard } from "./lib/gift-cards";
import { findTill, heartbeatDeviceTill, TILL_EXPIRED_EVENT, TILL_TAKEN_EVENT, tillLabel, tillNeedsActivation } from "./lib/tills";
import { normalizeTillProduct } from "./lib/till-code";
import { TablesScreen } from "./screens/tables/TablesScreen";
import { RoomsScreen } from "./screens/rooms/RoomsScreen";
import { KitchenHome } from "./screens/kitchen/KitchenHome";
import { startHqOrgSync } from "./lib/hq-settings-sync";
import { useHardwareHex } from "./lib/device-hex";
import {
  getPrinterGeometry,
  loadPrinterConfig,
  sendReceiptLayout,
  type ReceiptRichLine,
} from "./lib/printers";
import {
  canAccessSettings,
  isSellOnly,
  type ShiftRecord,
  type StaffUser,
} from "./lib/staff";
import {
  closeDay,
  closeShift,
  formatShiftReport,
  authorizeWithPin,
  openShift,
  printReport,
  recordShiftSale,
} from "./lib/session";

type Screen = "home" | "items" | "payment" | "split" | "paid" | "kds" | "settings" | "saved";
type Gate =
  | "print-shift"
  | "close-shift"
  | "print-day"
  | "close-day"
  | "logout"
  | "settings"
  | "price-override"
  | "discount"
  | "refund";

/** Shared state for one checkout attempt, including any redemption to reverse. */
type CheckoutContext = {
  ticketId: string;
  baseMinor: number;
  loyaltyNumber: string | null;
  loyaltyPointsRedeemed: number;
  loyaltyRedeemMinor: number;
  loyaltyBalanceBefore: number | null;
  loyaltyBalanceAfter: number | null;
  giftCardCode: string | null;
  giftCardChargedMinor: number | null;
  giftCardBalanceAfterMinor: number | null;
  redeemedLoyalty: boolean;
  redeemedGiftCard: boolean;
  loyaltyRedemptionId: string | null;
  giftRedemptionId: string | null;
};

type ChargeOutcome = "paid" | "handoff" | "failed";

type TipContext = { method: TenderType; checkout: CheckoutContext };

type LoyaltyConfirmation = {
  member: LoyaltyMember;
  points: number;
  valueMinor: number;
  method: TenderType;
};

function equalSplit(totalMinor: number, parts: number) {
  const count = Math.max(1, parts);
  const base = Math.floor(Math.max(0, totalMinor) / count);
  const remainder = Math.max(0, totalMinor) - base * count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

/** TENDER_LABEL may not yet include gift-card while HQ copy is syncing. */
function tenderLabel(method: TenderType) {
  return (TENDER_LABEL as Record<string, string>)[method] ?? method;
}

function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.07;
    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  } catch {
    /* ignore */
  }
}

function cartSubtotal(lines: CartLine[]) {
  return lines.reduce((sum, line) => sum + line.unitPriceMinor * line.quantity, 0);
}

const GATE_COPY: Record<Gate, { title: string; subtitle: string; confirm: string }> = {
  "print-shift": {
    title: "Print shift",
    subtitle: "A supervisor PIN is required to print this shift.",
    confirm: "Print shift",
  },
  "close-shift": {
    title: "Close shift",
    subtitle: "A supervisor PIN is required to close this shift.",
    confirm: "Close shift",
  },
  "print-day": {
    title: "Print day",
    subtitle: "A supervisor PIN is required to print the day report.",
    confirm: "Print day",
  },
  "close-day": {
    title: "Close day",
    subtitle: "A supervisor PIN is required to close the day and sign everyone out.",
    confirm: "Close day",
  },
  logout: {
    title: "Print shift",
    subtitle: "Enter a supervisor PIN to print this shift before logging out.",
    confirm: "Print and log out",
  },
  settings: {
    title: "Unlock settings",
    subtitle: "Cashiers cannot open Settings. A supervisor PIN is required.",
    confirm: "Unlock",
  },
  "price-override": {
    title: "Change item price",
    subtitle: "A supervisor PIN is required to override a selling price.",
    confirm: "Apply price",
  },
  refund: {
    title: "Authorise refund",
    subtitle: "A supervisor PIN is required to refund a completed sale.",
    confirm: "Authorise refund",
  },
  discount: {
    title: "Authorise discount",
    subtitle: "A supervisor PIN is required to apply this discount.",
    confirm: "Apply discount",
  },
};

export default function App() {
  const { items: catalog, updateItem, applySaleDeltas } = useCatalog();
  const { combos } = useCombos();
  const settings = useStoreSettings();
  const { tills } = useTills();
  const { hex: hardwareHex } = useHardwareHex();
  const [session, setSession] = useState<StaffUser | null>(null);
  const [shift, setShift] = useState<ShiftRecord | null>(null);
  const [needsShift, setNeedsShift] = useState(false);
  const [shiftBusy, setShiftBusy] = useState(false);
  const [gate, setGate] = useState<Gate | null>(null);
  const [pinError, setPinError] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const [pendingPrice, setPendingPrice] = useState<{ id: string; price: number } | null>(null);
  const [holds, setHolds] = useState<HeldTicket[]>(() => {
    const local = loadLocalHolds();
    return loadStoreSettings().autoCancelExpiredHolds
      ? pruneExpiredHolds(local)
      : local;
  });
  const [discountMinor, setDiscountMinor] = useState(0);
  const [saleDetails, setSaleDetails] = useState<Record<string, string>>({});
  const [holdOpen, setHoldOpen] = useState(false);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [refundSale, setRefundSale] = useState<SaleReceipt | null>(null);
  const [pendingRefund, setPendingRefund] = useState<{ sale: SaleReceipt; lines: CartLine[]; reason: string } | null>(null);
  const [blindRefundOpen, setBlindRefundOpen] = useState(false);
  const [pendingBlindRefund, setPendingBlindRefund] = useState<{ amountMinor: number; tender: TenderType; reason: string } | null>(null);
  const [tipOpen, setTipOpen] = useState(false);
  const [tipContext, setTipContext] = useState<TipContext | null>(null);
  const [tipMinor, setTipMinor] = useState(0);
  const [pendingDiscount, setPendingDiscount] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [floor, setFloor] = useState(createFloor);
  const [rooms, setRooms] = useState(createRooms);
  const [tickets, setTickets] = useState(createKitchenBoard);
  const [screen, setScreen] = useState<Screen>("home");
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [lookupNotice, setLookupNotice] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [tender, setTender] = useState<TenderType>("cash");
  const [splitCount, setSplitCount] = useState(2);
  const [splitTenders, setSplitTenders] = useState<TenderType[]>([
    "cash",
    "card",
  ]);
  const [splitPaid, setSplitPaid] = useState<boolean[]>([false, false]);
  const [splitAmounts, setSplitAmounts] = useState<number[]>(() => equalSplit(0, 2));
  const [paying, setPaying] = useState(false);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  const [loyaltyOpen, setLoyaltyOpen] = useState(false);
  const [loyaltyNumber, setLoyaltyNumber] = useState<string | null>(null);
  const [loyaltyConfirm, setLoyaltyConfirm] = useState<LoyaltyConfirmation | null>(null);
  const [giftCardOpen, setGiftCardOpen] = useState(false);
  const [checkout, setCheckout] = useState<CheckoutContext | null>(null);
  const checkoutRef = useRef<CheckoutContext | null>(null);
  const pendingGiftCardRef = useRef<GiftCardSelection | null>(null);
  const printedKitchenTickets = useRef(new Set<string>());
  const [receipt, setReceipt] = useState<SaleReceipt | null>(null);
  const [receiptSaved, setReceiptSaved] = useState<"saving" | "saved" | "queued">("saved");
  const [pendingSales, setPendingSales] = useState(countPendingSales);
  const [dialog, setDialog] = useState<"profile" | null>(null);
  const [lockoutMessage, setLockoutMessage] = useState("");
  const awaitingActivation = useRef(false);
  const boardsHydrated = useRef(false);
  const boardSyncTimer = useRef(0);

  useEffect(() => {
    saveLocalHolds(holds);
  }, [holds]);

  useEffect(() => {
    if (!settings.autoCancelExpiredHolds) return;
    const timer = window.setInterval(
      () => setHolds((current) => pruneExpiredHolds(current)),
      30_000,
    );
    return () => window.clearInterval(timer);
  }, [settings.autoCancelExpiredHolds]);

  // Keep the order discount within the ticket value and the store's cap when
  // lines are removed or the limit is lowered in Settings.
  useEffect(() => {
    const subtotal = cartSubtotal(cart);
    const cap = settings.allowDiscounts
      ? Math.min(subtotal, Math.round((subtotal * settings.maxDiscountPercent) / 100))
      : 0;
    setDiscountMinor((current) => (current > cap ? cap : current));
  }, [cart, settings.allowDiscounts, settings.maxDiscountPercent]);

  useEffect(() => startHqOrgSync(), []);

  // Keep the receipt printer's geometry warm so the first receipt prints
  // without paying a printer-detection scan (which used to add seconds).
  useEffect(() => {
    const warm = () => {
      const name = loadPrinterConfig().receiptPrinter;
      if (name) getPrinterGeometry(name).catch(() => undefined);
    };
    warm();
    const timer = window.setInterval(warm, 600_000);
    return () => window.clearInterval(timer);
  }, []);

  const items = catalog.filter((item) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.barcode.toLowerCase().includes(q)
    );
  });
  const totals = computeLineTotals(cart, settings, discountMinor);
  const redemptionMinor = checkout?.loyaltyRedeemMinor ?? 0;
  const chargeBaseMinor = Math.max(0, totals.totalMinor - redemptionMinor);
  const activeTill = tills[0] ?? findTill();
  const branchId = activeTill.branchId || null;
  const product = normalizeTillProduct(activeTill.product);
  const needsActivation = tillNeedsActivation(activeTill);
  const tillClosed = needsActivation || !activeTill.paired || !activeTill.active;
  const shiftLocked = Boolean(needsShift && settings.requireOpenShift) || tillClosed;
  const empty = cart.length === 0;
  const activeTable = floor.find((table) => table.id === activeTableId) ?? null;
  const activeRoom = rooms.find((room) => room.id === activeRoomId) ?? null;
  const activeTicket = tickets.find((ticket) => ticket.id === activeTicketId) ?? null;

  useEffect(() => {
    if (!activeTill.paired || !hardwareHex || needsActivation) return;
    let stopped = false;
    async function tick() {
      if (stopped) return;
      await heartbeatDeviceTill(hardwareHex);
    }
    void tick();
    const timer = window.setInterval(() => void tick(), 4000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [activeTill.paired, activeTill.sessionToken, hardwareHex, needsActivation]);

  useEffect(() => {
    function onTaken(event: Event) {
      const detail =
        event instanceof CustomEvent && typeof event.detail === "string"
          ? event.detail
          : "This till is in use on another device. You have been signed out.";
      setLockoutMessage(detail);
      setSession(null);
      setShift(null);
      setNeedsShift(false);
      setGate(null);
    }
    window.addEventListener(TILL_TAKEN_EVENT, onTaken);
    return () => window.removeEventListener(TILL_TAKEN_EVENT, onTaken);
  }, []);

  useEffect(() => {
    function onExpired(event: Event) {
      const detail =
        event instanceof CustomEvent && typeof event.detail === "string"
          ? event.detail
          : "Till subscription has ended. Enter the till code to renew for another year.";
      setLockoutMessage(detail);
      setSession(null);
      setShift(null);
      setNeedsShift(false);
      setGate(null);
    }
    window.addEventListener(TILL_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(TILL_EXPIRED_EVENT, onExpired);
  }, []);

  useEffect(() => {
    if (!session || !needsActivation) return;
    setLockoutMessage(
      "Till subscription has ended. Enter the till code to continue.",
    );
    setSession(null);
    setShift(null);
    setNeedsShift(false);
    setGate(null);
  }, [session, needsActivation]);

  useEffect(() => {
    if (needsActivation) {
      awaitingActivation.current = true;
      return;
    }
    if (awaitingActivation.current) {
      awaitingActivation.current = false;
      setLockoutMessage("");
    }
  }, [needsActivation]);

  useEffect(() => {
    if (!session || !settings.idleLockMinutes) return;
    let timer = 0;
    const bump = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        setSession(null);
        setShift(null);
        setNeedsShift(false);
        setGate(null);
      }, settings.idleLockMinutes * 60_000);
    };
    bump();
    window.addEventListener("pointerdown", bump);
    window.addEventListener("keydown", bump);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", bump);
      window.removeEventListener("keydown", bump);
    };
  }, [session, settings.idleLockMinutes]);

  useEffect(() => {
    if (!activeTableId) return;
    setFloor((current) =>
      current.map((table) =>
        table.id === activeTableId ? { ...table, lines: cart } : table,
      ),
    );
  }, [cart, activeTableId]);

  useEffect(() => {
    if (!activeRoomId) return;
    setRooms((current) =>
      current.map((room) =>
        room.id === activeRoomId ? { ...room, lines: cart } : room,
      ),
    );
  }, [cart, activeRoomId]);

  useEffect(() => {
    if (!activeTicketId) return;
    setTickets((current) =>
      current.map((ticket) =>
        ticket.id === activeTicketId ? { ...ticket, lines: cart } : ticket,
      ),
    );
  }, [cart, activeTicketId]);

  /* Pull the shared floor/rooms/kitchen boards from HQ after sign-in. */
  useEffect(() => {
    if (!session) return;
    boardsHydrated.current = false;
    let cancelled = false;
    async function hydrate() {
      const [tableRows, roomRows, ticketRows, holdRows] = await Promise.all([
        loadTables(),
        loadRooms(),
        loadKitchenTickets(),
        loadHolds(),
      ]);
      if (cancelled) return;
      if (tableRows?.length) setFloor(tableRows);
      if (roomRows?.length) setRooms(roomRows);
      if (ticketRows?.length) setTickets(ticketRows);
      if (holdRows) {
        const merged = new Map<string, HeldTicket>();
        for (const row of holdRows) merged.set(row.id, row);
        for (const row of loadLocalHolds()) {
          if (!merged.has(row.id)) merged.set(row.id, row);
        }
        const rows = [...merged.values()];
        setHolds(settings.autoCancelExpiredHolds ? pruneExpiredHolds(rows) : rows);
      }
      boardsHydrated.current = true;
    }
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [session]);

  /* Push board edits back to HQ (debounced so drag/qty changes coalesce). */
  useEffect(() => {
    if (!session || !boardsHydrated.current) return;
    window.clearTimeout(boardSyncTimer.current);
    boardSyncTimer.current = window.setTimeout(() => {
      void saveTables(floor);
      void saveRooms(rooms);
      void saveKitchenTickets(tickets);
      void pushHolds(holds);
    }, 800);
    return () => window.clearTimeout(boardSyncTimer.current);
  }, [session, floor, rooms, tickets, holds]);

  /* Retry any sales that failed to reach HQ earlier. */
  useEffect(() => {
    let stopped = false;
    async function flush() {
      const remaining = await flushSalesOutbox();
      if (!stopped) setPendingSales(remaining);
    }
    void flush();
    const timer = window.setInterval(() => void flush(), 30_000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    setSplitAmounts(equalSplit(chargeBaseMinor, splitCount));
  }, [chargeBaseMinor, splitCount]);

  const splitParts = useMemo(
    () =>
      Array.from({ length: Math.max(1, splitCount) }, (_, index) => ({
        tender: splitTenders[index] ?? "cash",
        amountMinor: splitAmounts[index] ?? 0,
        paid: splitPaid[index] ?? false,
      })),
    [splitCount, splitTenders, splitAmounts, splitPaid],
  );

  function setCheckoutContext(next: CheckoutContext | null) {
    checkoutRef.current = next;
    setCheckout(next);
  }

  function patchCheckout(patch: Partial<CheckoutContext>) {
    const current = checkoutRef.current;
    if (!current) return;
    const next = { ...current, ...patch };
    checkoutRef.current = next;
    setCheckout(next);
  }

  function resetTill() {
    setCart([]);
    setDiscountMinor(0);
    setTipMinor(0);
    setTipContext(null);
    setTipOpen(false);
    setTender("cash");
    setSplitCount(2);
    setSplitTenders(["cash", "card"]);
    setSplitPaid([false, false]);
    setSplitAmounts(equalSplit(0, 2));
    setReceipt(null);
    setReceiptSaved("saved");
    setPaying(false);
    setBusyLabel(null);
    setHandoff(null);
    setLoyaltyOpen(false);
    setLoyaltyNumber(null);
    setLoyaltyConfirm(null);
    setGiftCardOpen(false);
    pendingGiftCardRef.current = null;
    setCheckoutContext(null);
    setScreen("home");
    setCategory("all");
    setQuery("");
    setLookupNotice("");
    setActiveTableId(null);
    setActiveRoomId(null);
    setActiveTicketId(null);
  }

  function signOut() {
    setSession(null);
    setShift(null);
    setNeedsShift(false);
    setGate(null);
    setPinError("");
    setNotice("");
    setFloor(createFloor());
    setRooms(createRooms());
    setTickets(createKitchenBoard());
    resetTill();
  }

  async function startShift(user: StaffUser) {
    try {
      const next = await openShift(user.id);
      setShift(next);
      setNeedsShift(false);
    } catch (error) {
      // Server unreachable: keep the cashier on the shift prompt to retry,
      // or let them continue when offline mode is configured.
      setNotice(error instanceof Error ? error.message : "Could not open a shift.");
      setNeedsShift(true);
    }
  }

  async function handleLogin(user: StaffUser, mustOpenShift: boolean) {
    setLockoutMessage("");
    setSession(user);
    setFloor(createFloor());
    setRooms(createRooms());
    setTickets(createKitchenBoard());
    resetTill();
    void syncLoyaltyProgram().catch(() => undefined);
    if (mustOpenShift && loadStoreSettings().requireOpenShift) {
      setNeedsShift(true);
      setShift(null);
      return;
    }
    setNeedsShift(false);
    await startShift(user);
  }

  function patchTable(id: string, patch: Partial<FloorTable>) {
    setFloor((current) =>
      current.map((table) => (table.id === id ? { ...table, ...patch } : table)),
    );
  }

  function patchRoom(id: string, patch: Partial<HotelRoom>) {
    setRooms((current) =>
      current.map((room) => (room.id === id ? { ...room, ...patch } : room)),
    );
  }

  function patchTicket(id: string, patch: Partial<KitchenTicket>) {
    setTickets((current) =>
      current.map((ticket) => (ticket.id === id ? { ...ticket, ...patch } : ticket)),
    );
  }

  const TICKET_FLOW: Record<TicketStatus, TicketStatus> = {
    new: "prep",
    prep: "ready",
    ready: "dispatched",
    dispatched: "dispatched",
  };

  function advanceTicket(id: string) {
    const ticket = tickets.find((row) => row.id === id);
    if (!ticket) return;
    const status = TICKET_FLOW[ticket.status];
    patchTicket(id, { status });
    if (status === "prep") {
      void printKitchenTicket({
        id: ticket.id,
        label: `${channelLabel(ticket.channel)} · ${ticket.orderNo}`,
        lines: ticket.lines,
      });
    }
  }

  async function printKitchenTicket(input: {
    id: string;
    label: string;
    lines: CartLine[];
    note?: string;
  }) {
    if (!settings.printKitchenOnSend) return;
    const printer = loadPrinterConfig().kitchenPrinter;
    if (!printer) {
      toast.error("Kitchen printing is on but no kitchen printer is configured.");
      return;
    }
    if (printedKitchenTickets.current.has(input.id)) return;
    printedKitchenTickets.current.add(input.id);
    const layout: ReceiptRichLine[] = [
      { t: "c", text: settings.storeName || "Kitchen", bold: true },
      { t: "c", text: "KITCHEN TICKET", bold: true },
      { t: "d" },
      { t: "r", l: "Order", r: input.label, bold: true },
      {
        t: "r",
        l: "Sent",
        r: new Date().toLocaleTimeString("en-GB", { hour12: false }),
        gray: true,
      },
      { t: "d" },
      ...input.lines.map(
        (line) =>
          ({
            t: "r",
            l: `${line.quantity} × ${line.name}`,
            r: "",
          }) as ReceiptRichLine,
      ),
      ...(input.note ? ([{ t: "c", text: input.note }] as ReceiptRichLine[]) : []),
      { t: "d" },
    ];
    try {
      await sendReceiptLayout(printer, layout, 80);
    } catch (error) {
      printedKitchenTickets.current.delete(input.id);
      toast.error(
        `Kitchen ticket did not print: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
  }

  function openTable(table: FloorTable, guests: number) {
    patchTable(table.id, {
      status: "occupied",
      guests,
      openedAt: new Date().toISOString(),
      lines: [],
    });
    setActiveTableId(table.id);
    setActiveRoomId(null);
    setActiveTicketId(null);
    setCart([]);
    setDiscountMinor(0);
    setReceipt(null);
    setScreen("items");
  }

  function selectTable(table: FloorTable) {
    setActiveTableId(table.id);
    setActiveRoomId(null);
    setActiveTicketId(null);
    setCart(table.lines);
    setDiscountMinor(0);
    setReceipt(null);
    setScreen("items");
  }

  function walkIn() {
    setActiveTableId(null);
    setActiveRoomId(null);
    setActiveTicketId(null);
    setCart([]);
    setDiscountMinor(0);
    setReceipt(null);
    setScreen("items");
  }

  function openRoom(room: HotelRoom, guests: number, guestName: string) {
    patchRoom(room.id, {
      status: "occupied",
      guests,
      guestName,
      openedAt: new Date().toISOString(),
      lines: [],
    });
    setActiveRoomId(room.id);
    setActiveTableId(null);
    setActiveTicketId(null);
    setCart([]);
    setDiscountMinor(0);
    setReceipt(null);
    setScreen("items");
  }

  function selectRoom(room: HotelRoom) {
    setActiveRoomId(room.id);
    setActiveTableId(null);
    setActiveTicketId(null);
    setCart(room.lines);
    setDiscountMinor(0);
    setReceipt(null);
    setScreen("items");
  }

  function newKitchenTicket(channel: KitchenChannel) {
    const ticket: KitchenTicket = {
      id: crypto.randomUUID(),
      channel,
      orderNo: nextOrderNo(channel, tickets),
      guestName: channel === "walk-in" ? "Counter" : "",
      status: "new",
      openedAt: new Date().toISOString(),
      lines: [],
    };
    setTickets((current) => [ticket, ...current]);
    setActiveTicketId(ticket.id);
    setActiveTableId(null);
    setActiveRoomId(null);
    setCart([]);
    setDiscountMinor(0);
    setReceipt(null);
    setScreen("items");
  }

  function selectTicket(ticket: KitchenTicket) {
    setActiveTicketId(ticket.id);
    setActiveTableId(null);
    setActiveRoomId(null);
    setCart(ticket.lines);
    setDiscountMinor(0);
    setReceipt(null);
    setScreen("items");
  }

  function requestSettings() {
    if (!session) return;
    if (canAccessSettings(session)) {
      setScreen("settings");
      return;
    }
    setPinError("");
    setGate("settings");
  }

  function requestGate(next: Gate) {
    setPinError("");
    setGate(next);
  }

  function actionToGate(action: MenuAction): Gate {
    return action as Gate;
  }

  function gatePrivilege(gate: Gate): "settings" | "unlock" {
    return gate === "settings" ? "settings" : "unlock";
  }

  function onMenu(action: MenuAction) {
    if (action === "profile") {
      setDialog("profile");
      return;
    }
    if (action === "settings") {
      requestSettings();
      return;
    }
    if (!session) return;
    const gate = actionToGate(action);
    if (session.privileges.includes("unlock")) {
      setPinError("");
      setPinBusy(true);
      void runGate(gate, session, "").finally(() => setPinBusy(false));
      return;
    }
    setPinError("");
    setGate(gate);
  }

  async function runGate(gate: Gate, unlockedBy: StaffUser, pin?: string) {
    setPinError("");
    try {
      if (gate === "settings") {
        if (!unlockedBy.privileges.includes("settings")) {
          throw new Error("An administrator PIN is required.");
        }
        setGate(null);
        setScreen("settings");
        return;
      }
      if (gate === "price-override") {
        if (!unlockedBy.privileges.includes("unlock") && !unlockedBy.privileges.includes("settings")) {
          throw new Error("This PIN does not have supervisor privileges.");
        }
        if (pendingPrice) applyPrice(pendingPrice.id, pendingPrice.price);
        setPendingPrice(null);
        setGate(null);
        return;
      }
      if (gate === "discount") {
        if (!unlockedBy.privileges.includes("unlock") && !unlockedBy.privileges.includes("settings")) {
          throw new Error("This PIN does not have supervisor privileges.");
        }
        if (pendingDiscount != null) setDiscountMinor(pendingDiscount);
        setPendingDiscount(null);
        setGate(null);
        return;
      }
      if (gate === "refund") {
        if (!unlockedBy.privileges.includes("unlock") && !unlockedBy.privileges.includes("settings")) {
          throw new Error("This PIN does not have supervisor privileges.");
        }
        if (pendingBlindRefund) {
          await processBlindRefund(unlockedBy);
          return;
        }
        await processRefund(unlockedBy);
        return;
      }
      if (gate === "print-shift" || gate === "logout") {
        const report = formatShiftReport(shift, unlockedBy, "shift");
        let result = { printed: false as boolean, printer: null as string | null };
        try {
          result = await printReport(report);
        } catch {
          result = { printed: false, printer: null };
        }
        if (gate === "logout") {
          setGate(null);
          signOut();
          return;
        }
        setNotice(
          result.printed
            ? `Shift printed on ${result.printer}.`
            : "Shift report authorised. Assign a receipt printer to print it.",
        );
        setGate(null);
        return;
      }
      if (gate === "close-shift") {
        await closeShift(session!.id, pin);
        setShift(null);
        if (isSellOnly(session!)) setNeedsShift(true);
        setNotice("Shift closed.");
        setGate(null);
        return;
      }
      if (gate === "print-day") {
        const report = formatShiftReport(shift, unlockedBy, "day");
        let result = { printed: false as boolean, printer: null as string | null };
        try {
          result = await printReport(report);
        } catch {
          result = { printed: false, printer: null };
        }
        setNotice(
          result.printed
            ? `Day report printed on ${result.printer}.`
            : "Day report authorised. Assign a receipt printer to print it.",
        );
        setGate(null);
        return;
      }
      await closeDay(pin, session!.id);
      signOut();
    } catch (error) {
      setPinError(error instanceof Error ? error.message : "PIN rejected.");
    }
  }

  async function handlePin(pin: string) {
    if (!session || !gate) return;
    setPinBusy(true);
    setPinError("");
    try {
      const unlockedBy = await authorizeWithPin(pin, gatePrivilege(gate));
      await runGate(gate, unlockedBy, pin);
    } catch (error) {
      setPinError(error instanceof Error ? error.message : "PIN rejected.");
    } finally {
      setPinBusy(false);
    }
  }

  function addItem(item: CatalogItem) {
    if (screen === "paid" || shiftLocked) {
      if (tillClosed) {
        setLookupNotice(
          activeTill.paired
            ? "This till is closed on this device."
            : "This device is not licensed. Enter the till code from HQ to activate.",
        );
      }
      return;
    }
    if (settings.requireBarcode && !item.barcode.trim()) {
      setLookupNotice(`${item.name} has no barcode.`);
      return;
    }
    const already =
      cart.find((line) => line.itemId === item.id)?.quantity ?? 0;
    if (settings.blockNegativeStock && already + 1 > item.onHand) {
      const stockLabel = formatUnitLabel(item.unit ?? "each", item.unitLabel);
      setLookupNotice(
        item.onHand <= 0
          ? `${item.name} is out of stock.`
          : `Only ${item.onHand} ${stockLabel} on hand.`,
      );
      return;
    }
    if (settings.lowStockAlert && item.onHand <= settings.lowStockQty) {
      setLookupNotice(
        `${item.name} is low — ${formatStock(item.onHand, item.unit ?? "each", item.packSize ?? 1, item.unitLabel)} (alert at ${settings.lowStockQty}).`,
      );
    } else {
      setLookupNotice("");
    }
    setCart((current) => {
      const existing = current.find((line) => line.itemId === item.id);
      if (existing) {
        return current.map((line) =>
          line.id === existing.id
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }
      return [
        ...current,
        {
          id: crypto.randomUUID(),
          itemId: item.id,
          name: item.name,
          quantity: 1,
          unitPriceMinor: sellPrice(item, branchId),
          image: item.image,
          sku: item.sku,
          unit: item.unit,
          unitLabel: item.unitLabel,
          packSize: item.packSize,
          taxPercent: item.taxPercent,
        },
      ];
    });
  }

  function addCombo(combo: ComboView) {
    if (screen === "paid" || shiftLocked) {
      if (tillClosed) {
        setLookupNotice(
          activeTill.paired
            ? "This till is closed on this device."
            : "This device is not licensed. Enter the till code from HQ to activate.",
        );
      }
      return;
    }
    const already =
      cart.find((line) => line.itemId === combo.id)?.quantity ?? 0;
    if (settings.blockNegativeStock && already + 1 > combo.availableSets) {
      setLookupNotice(
        combo.availableSets <= 0
          ? `${combo.name} is out of stock.`
          : `Only ${combo.availableSets} ${combo.availableSets === 1 ? "set" : "sets"} of ${combo.name} left.`,
      );
      return;
    }
    if (settings.lowStockAlert && combo.availableSets <= settings.lowStockQty) {
      setLookupNotice(
        `${combo.name} is low — ${combo.availableSets} ${combo.availableSets === 1 ? "set" : "sets"} available (alert at ${settings.lowStockQty}).`,
      );
    } else {
      setLookupNotice("");
    }
    setCart((current) => {
      const existing = current.find((line) => line.itemId === combo.id);
      if (existing) {
        return current.map((line) =>
          line.id === existing.id
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }
      return [
        ...current,
        {
          id: crypto.randomUUID(),
          itemId: combo.id,
          name: combo.name,
          quantity: 1,
          unitPriceMinor: combo.priceMinor,
          image: "",
          unit: "each",
          isCombo: true,
        },
      ];
    });
  }

  async function addByCode(raw: string, fromScan = false) {
    if (!fromScan && !settings.barcodeAllowManual) {
      setLookupNotice("Typing only filters the grid. Scan a barcode to add.");
      return;
    }
    const code = normalizeBarcode(raw, settings);
    if (!code || screen === "paid" || shiftLocked) return;
    if (code.length < settings.barcodeMinLength) {
      setLookupNotice(
        `Code is too short. Need at least ${settings.barcodeMinLength} characters.`,
      );
      return;
    }
    const local = findCatalogByCode(catalog, code);
    if (local) {
      addItem(local);
      if (settings.barcodeBeep) beep();
      setLookupNotice(`Added ${local.name}`);
      setQuery("");
      return;
    }
    try {
      const remote = await lookupCatalog(code);
      if (remote) {
        addItem(remote);
        if (settings.barcodeBeep) beep();
        setLookupNotice(`Added ${remote.name}`);
        setQuery("");
        return;
      }
    } catch {
      /* offline lookup failed */
    }
    setLookupNotice(`No item for “${code}”.`);
  }

  function changeQty(id: string, delta: number) {
    if (screen === "paid" || paying || shiftLocked) return;
    const line = cart.find((row) => row.id === id);
    if (line && delta > 0 && settings.blockNegativeStock) {
      if (line.isCombo) {
        const combo = combos.find((row) => row.id === line.itemId);
        if (combo && line.quantity + delta > combo.availableSets) {
          setLookupNotice(
            `Only ${combo.availableSets} ${combo.availableSets === 1 ? "set" : "sets"} of ${combo.name} available.`,
          );
          return;
        }
      }
      const item = catalog.find((row) => row.id === line.itemId);
      if (item && line.quantity + delta > item.onHand) {
        setLookupNotice(
          `Only ${item.onHand} ${item.name} on hand.`,
        );
        return;
      }
    }
    setCart((current) =>
      current
        .map((row) =>
          row.id === id
            ? { ...row, quantity: Math.max(0, row.quantity + delta) }
            : row,
        )
        .filter((row) => row.quantity > 0),
    );
  }

  function changePrice(id: string, unitPriceMinor: number) {
    if (!settings.allowPriceOverride || screen === "paid" || paying) return;
    if (settings.requireManagerPin) {
      setPendingPrice({ id, price: unitPriceMinor });
      setPinError("");
      setGate("price-override");
      return;
    }
    applyPrice(id, unitPriceMinor);
  }

  function applyPrice(id: string, unitPriceMinor: number) {
    setCart((current) =>
      current.map((line) =>
        line.id === id ? { ...line, unitPriceMinor } : line,
      ),
    );
  }

  function parkOrder(name: string, note: string) {
    if (!session || !cart.length) return;
    const hold = createHeldTicket({
      name,
      note,
      lines: cart,
      discountMinor,
      holdExpiryMinutes: settings.autoCancelExpiredHolds ? settings.holdExpiryMinutes : 0,
      tillKey: activeTill.name,
      cashierName: session.name,
    });
    setHolds((current) =>
      settings.autoCancelExpiredHolds
        ? [hold, ...pruneExpiredHolds(current)]
        : [hold, ...current],
    );
    setHoldOpen(false);
    newOrder();
    setScreen("saved");
    toast.success("Order parked in Saved.");
  }

  async function processRefund(
    unlockedBy: StaffUser,
    payload: { sale: SaleReceipt; lines: CartLine[]; reason: string } | null = pendingRefund,
  ) {
    if (!payload || !session) return;
    const { sale, lines, reason } = payload;
    const refund = buildRefundSale({
      original: sale,
      selected: lines,
      settings,
      ticketId: takeNextTicketId(settings),
      cashierName: session.name,
      refundedBy: unlockedBy.name,
      reason,
    });
    if (settings.trackStockOnTill && settings.restockOnRefund) {
      applySaleDeltas(lines.filter((line) => !line.isCombo).map((line) => ({ itemId: line.itemId, delta: line.quantity })));
    }
    setRefundSale(null);
    setPendingRefund(null);
    setGate(null);
    setReceipt(refund);
    setReceiptSaved("saving");
    setScreen("paid");
    const delivered = await archiveSale(refund);
    setReceiptSaved(delivered ? "saved" : "queued");
    if (!delivered) {
      setPendingSales((count) => count + 1);
      toast.error("HQ unreachable — refund receipt queued and will retry automatically.");
    } else if (pendingSales > 0) {
      void flushSalesOutbox().then(setPendingSales);
    }
    setShift((current) =>
      current
        ? {
            ...current,
            salesCount: current.salesCount + 1,
            salesMinor: current.salesMinor + refund.totalMinor,
          }
        : current,
    );
    void recordShiftSale(session.id, refund.totalMinor, true);
    setShift((current) =>
      current
        ? {
            ...current,
            refundCount: (current.refundCount ?? 0) + 1,
            refundMinor: (current.refundMinor ?? 0) + Math.abs(refund.totalMinor),
          }
        : current,
    );
  }

  function requestRefund(sale: SaleReceipt, lines: CartLine[], reason: string) {
    setRefundSale(null);
    setPendingRefund({ sale, lines, reason });
    if (settings.requireManagerPin) {
      setPinError("");
      setGate("refund");
      return;
    }
    if (session) void processRefund(session, { sale, lines, reason });
  }

  async function processBlindRefund(
    unlockedBy: StaffUser,
    payload: { amountMinor: number; tender: TenderType; reason: string } | null = pendingBlindRefund,
  ) {
    if (!payload || !session) return;
    const amount = Math.max(0, Math.round(payload.amountMinor));
    if (amount <= 0) {
      setBlindRefundOpen(false);
      setPendingBlindRefund(null);
      setGate(null);
      return;
    }
    const refund: SaleReceipt = {
      ticketId: takeNextTicketId(settings),
      paidAt: new Date().toISOString(),
      lines: [],
      totalMinor: -amount,
      tender: payload.tender,
      cashierName: session.name,
      tillKey: activeTill?.name ?? null,
      discountMinor: 0,
      kind: "refund",
      refundOf: null,
      refundReason: payload.reason.trim() || "No original ticket",
      refundedBy: unlockedBy.name,
    };
    setBlindRefundOpen(false);
    setPendingBlindRefund(null);
    setGate(null);
    setReceipt(refund);
    setReceiptSaved("saving");
    setScreen("paid");
    const delivered = await archiveSale(refund);
    setReceiptSaved(delivered ? "saved" : "queued");
    if (!delivered) {
      setPendingSales((count) => count + 1);
      toast.error("HQ unreachable — refund receipt queued and will retry automatically.");
    } else if (pendingSales > 0) {
      void flushSalesOutbox().then(setPendingSales);
    }
    setShift((current) =>
      current
        ? {
            ...current,
            salesCount: current.salesCount + 1,
            salesMinor: current.salesMinor + refund.totalMinor,
          }
        : current,
    );
    void recordShiftSale(session.id, refund.totalMinor, true);
    setShift((current) =>
      current
        ? {
            ...current,
            refundCount: (current.refundCount ?? 0) + 1,
            refundMinor: (current.refundMinor ?? 0) + Math.abs(refund.totalMinor),
          }
        : current,
    );
  }

  function requestBlindRefund(input: {
    amountMinor: number;
    tender: TenderType;
    reason: string;
  }) {
    setBlindRefundOpen(false);
    setPendingBlindRefund(input);
    if (settings.requireManagerPin) {
      setPinError("");
      setGate("refund");
      return;
    }
    if (session) void processBlindRefund(session, input);
  }

  function resizeSplit(count: number) {
    setSplitCount(count);
    setSplitTenders((prev) => {
      const next = [...prev];
      while (next.length < count) {
        next.push(next.length % 2 === 0 ? "cash" : "card");
      }
      return next.slice(0, count);
    });
    setSplitPaid((prev) => {
      const next = [...prev];
      while (next.length < count) next.push(false);
      return next.slice(0, count);
    });
    setSplitAmounts(equalSplit(chargeBaseMinor, count));
  }

  function blankCheckout(): CheckoutContext {
    return {
      ticketId: takeNextTicketId(settings),
      baseMinor: totals.totalMinor,
      loyaltyNumber: null,
      loyaltyPointsRedeemed: 0,
      loyaltyRedeemMinor: 0,
      loyaltyBalanceBefore: null,
      loyaltyBalanceAfter: null,
      giftCardCode: null,
      giftCardChargedMinor: null,
      giftCardBalanceAfterMinor: null,
      redeemedLoyalty: false,
      redeemedGiftCard: false,
      loyaltyRedemptionId: null,
      giftRedemptionId: null,
    };
  }

  async function reverseCheckout() {
    const ctx = checkoutRef.current;
    if (!ctx) return;
    setCheckoutContext(null);
    const reversals: Promise<unknown>[] = [];
    if (ctx.loyaltyRedemptionId) {
      reversals.push(reverseRedemption(ctx.loyaltyRedemptionId));
    }
    if (ctx.giftRedemptionId) {
      reversals.push(reverseGiftCard(ctx.giftRedemptionId));
    }
    if (!reversals.length) return;
    setBusyLabel("Reversing redemption…");
    const results = await Promise.allSettled(reversals);
    if (results.every((result) => result.status === "fulfilled")) {
      toast.info("Redemption reversed — points and card balances restored.");
    } else {
      toast.error(
        "A redemption could not be reversed automatically. Record the ticket id and contact support.",
      );
    }
    setBusyLabel(null);
  }

  function completeSale(method: TenderType, ctx: CheckoutContext | null, tip: number) {
    if (!session) return;
    const problem = checkoutProblem(method);
    if (problem) {
      setNotice(problem);
      setPaying(false);
      void reverseCheckout();
      return;
    }
    const saleCtx = ctx ?? blankCheckout();
    const baseTotal = computeLineTotals(cart, settings, discountMinor).totalMinor;
    const tipAmount = Math.max(0, Math.round(tip));
    const totalMinor = baseTotal + tipAmount;
    const till = activeTill;
    const sale: SaleReceipt = {
      ticketId: saleCtx.ticketId,
      paidAt: new Date().toISOString(),
      lines: cart,
      totalMinor,
      tender: method,
      cashierName: session.name,
      loyaltyNumber: saleCtx.loyaltyNumber,
      loyaltyPointsEarned: saleCtx.loyaltyNumber
        ? loyaltyPointsEarned(Math.max(0, totalMinor - saleCtx.loyaltyRedeemMinor), settings)
        : null,
      loyaltyPointsRedeemed: saleCtx.loyaltyPointsRedeemed || null,
      loyaltyRedeemMinor: saleCtx.loyaltyRedeemMinor || null,
      loyaltyBalanceBefore: saleCtx.loyaltyBalanceBefore,
      loyaltyBalanceAfter: saleCtx.loyaltyBalanceAfter,
      giftCardCode: saleCtx.giftCardCode,
      giftCardChargedMinor: saleCtx.giftCardChargedMinor,
      giftCardBalanceAfterMinor: saleCtx.giftCardBalanceAfterMinor,
      tillKey: till?.name ?? null,
      discountMinor,
      tipMinor: tipAmount > 0 ? tipAmount : null,
      customerName: saleDetails.customer?.trim() || null,
      customerPhone: saleDetails.phone?.trim() || null,
      customerEmail: saleDetails.email?.trim() || null,
      note: saleDetails.notes?.trim() || null,
      reference: saleDetails.reference?.trim() || null,
      taxExemption: saleDetails.tax?.trim() || null,
    };
    if (settings.trackStockOnTill) {
      applySaleDeltas(
        cart
          .filter((line) => !line.isCombo)
          .map((line) => ({ itemId: line.itemId, delta: -line.quantity })),
      );
    }
    setReceipt(sale);
    setReceiptSaved("saving");
    setScreen("paid");
    void archiveSale(sale)
      .then((delivered) => {
        setReceiptSaved(delivered ? "saved" : "queued");
        if (delivered) {
          if (pendingSales > 0) {
            void flushSalesOutbox().then(setPendingSales);
          }
        } else {
          setPendingSales((count) => count + 1);
          toast.error("HQ unreachable — receipt queued and will retry automatically.");
        }
      });
    setShift((current) =>
      current
        ? {
            ...current,
            salesCount: current.salesCount + 1,
            salesMinor: current.salesMinor + totalMinor,
          }
        : current,
    );
    void recordShiftSale(session.id, totalMinor);
    if (activeTableId) {
      patchTable(activeTableId, { status: "billed", lines: cart });
    }
    if (activeRoomId) {
      patchRoom(activeRoomId, { status: "checkout", lines: cart });
    }
    if (activeTicketId) {
      patchTicket(activeTicketId, { status: "dispatched", lines: cart });
      void printKitchenTicket({
        id: activeTicketId,
        label: activeTicket
          ? `${channelLabel(activeTicket.channel)} · ${activeTicket.orderNo}`
          : "Kitchen",
        lines: cart,
        note: saleDetails.notes?.trim(),
      });
    } else if (product === "restaurant" || product === "dark-kitchen") {
      void printKitchenTicket({
        id: saleCtx.ticketId,
        label: activeTable ? `Table ${activeTable.name}` : "Counter",
        lines: cart,
        note: saleDetails.notes?.trim(),
      });
    }
    setCart([]);
    setDiscountMinor(0);
    setSplitAmounts(equalSplit(0, 2));
    setSaleDetails({});
    setTipMinor(0);
    setTipContext(null);
    setTipOpen(false);
    setTender("cash");
    setSplitCount(2);
    setSplitTenders(["cash", "card"]);
    setSplitPaid([false, false]);
    setLoyaltyOpen(false);
    setLoyaltyNumber(null);
    setLoyaltyConfirm(null);
    setGiftCardOpen(false);
    pendingGiftCardRef.current = null;
    setBusyLabel(null);
    setCheckoutContext(null);
    setPaying(false);
  }

  async function beginCharge(
    method: TenderType,
    amountMinor: number,
    options: { kind: "sale" | "split"; parts?: number; part?: number; splitIndex?: number } = {
      kind: "sale",
    },
  ): Promise<ChargeOutcome> {
    const problem = checkoutProblem(method);
    if (problem) {
      setNotice(problem);
      return "failed";
    }
    setPaying(true);
    try {
      const charge = await requestCharge({
        tender: method,
        amountMinor,
        parts: options.parts,
        reference: saleDetails.reference?.trim() || undefined,
      });
      if (charge.status === "paid") return "paid";
      setHandoff({
        method,
        label: tenderLabel(method),
        provider: charge.provider,
        reference: charge.reference,
        amountMinor: charge.amountMinor,
        kind: options.kind,
        part: options.part,
        splitIndex: options.splitIndex,
      });
      return "handoff";
    } catch (error) {
      // Manual tenders stay usable when HQ is unreachable; electronic tenders
      // must never be reported as paid without a provider hand-off.
      if (method === "cash" || method === "split" || method === "gift-card") {
        return "paid";
      }
      toast.error(error instanceof Error ? error.message : "Payment could not be started.");
      return "failed";
    } finally {
      setPaying(false);
    }
  }

  function openGiftCard() {
    if (empty || shiftLocked || paying || handoff || screen === "paid") return;
    setTender("gift-card");
    setGiftCardOpen(true);
  }

  function chooseGiftCard(card: GiftCardSelection) {
    setGiftCardOpen(false);
    pendingGiftCardRef.current = card;
    const ctx = blankCheckout();
    setCheckoutContext(ctx);
    if (!settings.loyaltyEnabled) {
      void finishGiftCard(ctx);
      return;
    }
    setLoyaltyNumber(null);
    setLoyaltyOpen(true);
  }

  function cancelLoyalty() {
    setLoyaltyOpen(false);
    setLoyaltyConfirm(null);
    void reverseCheckout();
  }

  async function startCharge(method: TenderType) {
    if (empty || paying || loyaltyOpen || handoff || checkoutRef.current || screen === "paid" || shiftLocked) {
      return;
    }
    if (method === "gift-card") {
      openGiftCard();
      return;
    }
    setTender(method);
    const ctx = blankCheckout();
    setCheckoutContext(ctx);
    if (method === "split") {
      setSplitPaid(Array.from({ length: splitCount }, () => false));
      setSplitAmounts(equalSplit(ctx.baseMinor - ctx.loyaltyRedeemMinor, splitCount));
      if (!settings.loyaltyEnabled) {
        await proceedToPayment(method, ctx);
        return;
      }
      setLoyaltyNumber(null);
      setLoyaltyOpen(true);
      return;
    }
    if (!settings.loyaltyEnabled) {
      await proceedToPayment(method, ctx);
      return;
    }
    setLoyaltyNumber(null);
    setLoyaltyOpen(true);
  }

  async function applyLoyaltyRedemption(
    member: LoyaltyMember,
    points: number,
    number: string | null,
    ctx: CheckoutContext,
  ) {
    setBusyLabel("Redeeming loyalty points…");
    try {
      const redemptionId = `${ctx.ticketId}-LOYALTY`;
      const result = await redeemLoyalty({
        memberId: member.id,
        identifier: number ?? member.phone,
        points,
        ticketId: redemptionId,
        ticketMinor: ctx.baseMinor,
      });
      patchCheckout({
        loyaltyNumber: number,
        loyaltyPointsRedeemed: result.pointsRedeemed,
        loyaltyRedeemMinor: result.valueMinor,
        loyaltyBalanceBefore: result.balanceBefore,
        loyaltyBalanceAfter: result.balanceAfter,
        redeemedLoyalty: true,
        loyaltyRedemptionId: redemptionId,
      });
      toast.success(
        `Used ${result.pointsRedeemed} points — ${formatMoney(result.valueMinor, settings.currency)} off.`,
      );
    } catch (error) {
      toast.error(
        `Loyalty points were not redeemed: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    } finally {
      setBusyLabel(null);
    }
  }

  async function finishLoyalty(number: string | null, method: TenderType = tender) {
    const ctx = checkoutRef.current;
    if (!ctx) return;
    setLoyaltyNumber(number);
    setLoyaltyOpen(false);
    patchCheckout({ loyaltyNumber: number });
    if (!number || !settings.loyaltyEnabled) {
      await proceedToPayment(method, ctx);
      return;
    }
    setBusyLabel("Checking loyalty…");
    try {
      const [members, cards] = await Promise.all([
        listLoyaltyMembers(),
        listLoyaltyCards(),
      ]);
      const clean = (value: string) => value.replace(/[\s-]/g, "").toLowerCase();
      const key = clean(number);
      const card = cards.find((row) => row.active && clean(row.cardNumber) === key);
      const member =
        members.find(
          (row) =>
            row.active &&
            (clean(row.phone) === key ||
              (row.cardNumber ? clean(row.cardNumber) === key : false) ||
              (card ? row.id === card.memberId : false)),
        ) ?? undefined;
      setBusyLabel(null);
      if (!member) {
        toast.info("No active loyalty member matched that number. Sale continues without points.");
        await proceedToPayment(method, ctx);
        return;
      }
      const perPoint = Math.max(1, Math.round(settings.loyaltyRedeemMinor));
      const points = Math.min(
        member.points,
        Math.floor(Math.max(0, ctx.baseMinor) / perPoint),
      );
      if (points <= 0) {
        toast.info("No points can be redeemed on this ticket.");
        await proceedToPayment(method, ctx);
        return;
      }
      const valueMinor = points * perPoint;
      if (settings.loyaltyAutoApply) {
        await applyLoyaltyRedemption(member, points, number, ctx);
        await proceedToPayment(method, ctx);
        return;
      }
      setLoyaltyConfirm({ member, points, valueMinor, method });
    } catch (error) {
      setBusyLabel(null);
      toast.error(
        `Loyalty lookup unavailable: ${error instanceof Error ? error.message : "unknown error"}. Sale continues without points.`,
      );
      await proceedToPayment(method, ctx);
    }
  }

  async function acceptLoyalty() {
    const confirmation = loyaltyConfirm;
    const ctx = checkoutRef.current;
    setLoyaltyConfirm(null);
    if (!confirmation || !ctx) return;
    await applyLoyaltyRedemption(
      confirmation.member,
      confirmation.points,
      checkoutRef.current?.loyaltyNumber ?? null,
      ctx,
    );
    await proceedToPayment(confirmation.method, ctx);
  }

  async function skipLoyalty() {
    const confirmation = loyaltyConfirm;
    const ctx = checkoutRef.current;
    setLoyaltyConfirm(null);
    if (!confirmation || !ctx) return;
    await proceedToPayment(confirmation.method, ctx);
  }

  async function finishGiftCard(ctx: CheckoutContext) {
    const card = pendingGiftCardRef.current;
    if (!card) {
      toast.error("Gift card selection was lost. Start the payment again.");
      await reverseCheckout();
      return;
    }
    const amount = Math.max(0, ctx.baseMinor - ctx.loyaltyRedeemMinor);
    if (amount <= 0) {
      // Points covered the whole ticket — there is nothing to put on the card.
      pendingGiftCardRef.current = null;
      completeSale("gift-card", ctx, 0);
      return;
    }
    if (card.balanceMinor < amount) {
      toast.error(
        `Gift card balance ${formatMoney(card.balanceMinor, settings.currency)} does not cover ${formatMoney(amount, settings.currency)}. Partial gift-card payments are not supported.`,
      );
      await reverseCheckout();
      return;
    }
    setBusyLabel("Redeeming gift card…");
    try {
      const redemptionId = `${ctx.ticketId}-GIFT`;
      const result = await redeemGiftCard({
        code: card.code,
        amountMinor: amount,
        ticketId: redemptionId,
      });
      patchCheckout({
        giftCardCode: result.card.code,
        giftCardChargedMinor: amount,
        giftCardBalanceAfterMinor: result.balanceAfterMinor,
        redeemedGiftCard: true,
        giftRedemptionId: redemptionId,
      });
    } catch (error) {
      setBusyLabel(null);
      toast.error(
        `Gift card was not charged: ${error instanceof Error ? error.message : "unknown error"}`,
      );
      await reverseCheckout();
      return;
    }
    setBusyLabel(null);
    pendingGiftCardRef.current = null;
    const outcome = await beginCharge("gift-card", amount);
    if (outcome !== "paid") {
      if (outcome === "failed") await reverseCheckout();
      return;
    }
    // A gift card is charged for the exact ticket total, so no extra tip is
    // added afterwards — that would leave the receipt and deducted amount out
    // of step.
    completeSale("gift-card", ctx, 0);
  }

  async function proceedToPayment(method: TenderType, ctx: CheckoutContext) {
    if (pendingGiftCardRef.current) {
      await finishGiftCard(ctx);
      return;
    }
    if (Math.max(0, ctx.baseMinor - ctx.loyaltyRedeemMinor) <= 0) {
      completeSale(method, ctx, 0);
      return;
    }
    if (method === "split") {
      setSplitAmounts(equalSplit(Math.max(0, ctx.baseMinor - ctx.loyaltyRedeemMinor), splitCount));
      setSplitPaid(Array.from({ length: splitCount }, () => false));
      setScreen("split");
      return;
    }
    const amount = Math.max(0, ctx.baseMinor - ctx.loyaltyRedeemMinor);
    const outcome = await beginCharge(method, amount);
    if (outcome !== "paid") {
      if (outcome === "failed") await reverseCheckout();
      return;
    }
    if (settings.tipsEnabled) {
      setTipContext({ method, checkout: ctx });
      setTipOpen(true);
      return;
    }
    completeSale(method, ctx, 0);
  }

  function finishSplitIfComplete(nextPaid: boolean[], ctx: CheckoutContext) {
    if (!nextPaid.every(Boolean)) return;
    if (settings.tipsEnabled) {
      setTipContext({ method: "split", checkout: ctx });
      setTipOpen(true);
      return;
    }
    completeSale("split", ctx, 0);
  }

  function confirmTip(amount: number) {
    const context = tipContext;
    const tipAmount = Math.max(0, Math.round(amount));
    setTipOpen(false);
    setTipContext(null);
    setTipMinor(tipAmount);
    completeSale(context?.method ?? tender, context?.checkout ?? null, tipAmount);
  }

  function cancelTip() {
    setTipOpen(false);
    setTipContext(null);
    void reverseCheckout();
  }

  async function chargeSplitPart(index: number) {
    const ctx = checkoutRef.current;
    if (
      paying ||
      loyaltyOpen ||
      handoff ||
      !ctx ||
      splitPaid[index] ||
      empty
    ) {
      return;
    }
    const allocated = splitAmounts.reduce((sum, value) => sum + Math.max(0, value), 0);
    const expected = Math.max(0, ctx.baseMinor - ctx.loyaltyRedeemMinor);
    if (allocated !== expected) {
      setNotice(
        `Split amounts must add up to ${formatMoney(expected, settings.currency)}. They currently add up to ${formatMoney(allocated, settings.currency)}.`,
      );
      return;
    }
    const method = splitTenders[index] ?? "cash";
    const share = Math.max(0, Math.round(splitAmounts[index] ?? 0));
    if (share <= 0) {
      setNotice("Enter a positive amount for this split part.");
      return;
    }
    const outcome = await beginCharge(method, share, {
      kind: "split",
      parts: splitCount,
      part: index + 1,
      splitIndex: index,
    });
    if (outcome !== "paid") {
      if (outcome === "failed") void reverseCheckout();
      return;
    }
    const next = splitPaid.map((value, i) => (i === index ? true : value));
    setSplitPaid(next);
    finishSplitIfComplete(next, ctx);
  }

  function confirmHandoff() {
    const ctx = checkoutRef.current;
    if (!handoff || !ctx) return;
    setHandoff(null);
    if (handoff.kind === "split" && handoff.splitIndex !== undefined) {
      const index = handoff.splitIndex;
      const next = splitPaid.map((value, i) => (i === index ? true : value));
      setSplitPaid(next);
      finishSplitIfComplete(next, ctx);
      return;
    }
    const method = handoff.method as TenderType;
    if (settings.tipsEnabled) {
      setTipContext({ method, checkout: ctx });
      setTipOpen(true);
      return;
    }
    completeSale(method, ctx, 0);
  }

  function cancelHandoff() {
    setHandoff(null);
    setPaying(false);
    void reverseCheckout();
  }

  function newOrder() {
    if (activeTableId) {
      patchTable(activeTableId, {
        status: "free",
        guests: 0,
        openedAt: null,
        lines: [],
      });
      setActiveTableId(null);
    }
    if (activeRoomId) {
      patchRoom(activeRoomId, {
        status: "dirty",
        guests: 0,
        guestName: "",
        openedAt: null,
        lines: [],
      });
      setActiveRoomId(null);
    }
    if (activeTicketId) {
      setTickets((current) => current.filter((ticket) => ticket.id !== activeTicketId));
      setActiveTicketId(null);
    }
    setCart([]);
    setDiscountMinor(0);
    setSaleDetails({});
    setTipMinor(0);
    setTipContext(null);
    setTipOpen(false);
    setTender("cash");
    setSplitCount(2);
    setSplitTenders(["cash", "card"]);
    setSplitPaid([false, false]);
    setSplitAmounts(equalSplit(0, 2));
    setReceipt(null);
    setPaying(false);
    setBusyLabel(null);
    setHandoff(null);
    setLoyaltyOpen(false);
    setLoyaltyNumber(null);
    setLoyaltyConfirm(null);
    setGiftCardOpen(false);
    pendingGiftCardRef.current = null;
    setCheckoutContext(null);
    setScreen("home");
  }

  function runRegisterAction(action: RegisterAction) {
    if (shiftLocked && action !== "new") return;
    if (action === "discount") {
      if (settings.allowDiscounts) setDiscountOpen(true);
      return;
    }
    if (action === "hold") {
      setHoldOpen(true);
      return;
    }
    if (action === "saved") {
      setScreen("saved");
      return;
    }
    if (action === "payment") {
      if (!empty) setScreen("payment");
      return;
    }
    if (action === "new") newOrder();
  }

  function missingRequiredSaleFields() {
    return settings.registerSaleFields.filter(
      (field) => field.mode === "required" && !(saleDetails[field.key] ?? "").trim(),
    );
  }

  function requiresPaymentReference(method: TenderType) {
    const configured = settings.registerTenders.find((tender) => tender.id === method);
    return configured?.requiresReference ?? (method === "transfer" || method === "wallet");
  }

  function checkoutProblem(method: TenderType) {
    const missing = missingRequiredSaleFields();
    if (missing.length) {
      return `Required before checkout: ${missing.map((field) => field.label).join(", ")}`;
    }
    if (requiresPaymentReference(method) && !(saleDetails.reference ?? "").trim()) {
      return "A payment reference is required for this payment method.";
    }
    return "";
  }

  function continueAction() {
    if (shiftLocked) return;
    if (screen === "paid") {
      newOrder();
      return;
    }
    if (screen === "home" || screen === "items" || screen === "kds" || screen === "saved") {
      if (empty) return;
      const problem = checkoutProblem(tender);
      if (problem) {
        setNotice(problem);
        return;
      }
      setScreen("payment");
      return;
    }
    if (screen === "payment") {
      const problem = checkoutProblem(tender);
      if (problem) {
        setNotice(problem);
        return;
      }
      void startCharge(tender);
    }
  }

  const continueLabel =
    screen === "paid"
      ? "New order"
      : screen === "payment"
        ? `Charge ${formatMoney(totals.totalMinor)}`
        : screen === "split"
          ? "Charge each share"
          : "Continue";

  if (!session) {
    if (needsActivation) {
      return (
        <ActivateTillModal
          expired={Boolean(activeTill.subscriptionExpiresAt)}
          message={lockoutMessage}
        />
      );
    }
    return <LoginScreen banner={lockoutMessage} onLogin={(user, mustOpen) => void handleLogin(user, mustOpen)} />;
  }

  const fullscreen = screen === "settings";
  const copy = gate ? GATE_COPY[gate] : null;

  return (
    <div className={fullscreen ? "shell shell-full" : "shell"}>
      {!fullscreen && (
        <Sidebar
          product={product}
          active={
            screen === "kds"
              ? "kds"
              : screen === "items"
                ? "items"
                : screen === "saved"
                  ? "saved"
                  : screen === "payment" || screen === "split" || screen === "paid"
                    ? "orders"
                    : screen === "home"
                      ? product === "supermarket"
                        ? "home"
                        : product === "restaurant"
                          ? "tables"
                          : product === "hotel"
                            ? "rooms"
                            : "kitchen"
                      : "orders"
          }
          onSelect={(id) => {
            if (shiftLocked) return;
            const homeNav: NavId =
              product === "supermarket"
                ? "home"
                : product === "restaurant"
                  ? "tables"
                  : product === "hotel"
                    ? "rooms"
                    : "kitchen";
            if (id === homeNav) setScreen("home");
            if (id === "items") setScreen("items");
            if (id === "orders" && !empty) setScreen("payment");
            if (id === "saved") setScreen("saved");
            if (id === "kds") setScreen("kds");
          }}
          onSettings={requestSettings}
          onLogout={() => requestGate("logout")}
        />
      )}
      <main className={fullscreen ? "stage-full" : "stage"}>
        {(screen === "home" || screen === "items") && product === "supermarket" && (
          <ItemsScreen
            mode={screen === "home" ? "home" : "items"}
            items={items}
            catalog={catalog}
            category={category}
            onCategory={setCategory}
            onAdd={addItem}
            combos={combos}
            onAddCombo={addCombo}
            branchId={branchId}
            query={query}
            onQuery={(value) => {
              setQuery(value);
              setLookupNotice("");
            }}
            onCommitQuery={(value) => {
              if (!settings.barcodeAllowManual) {
                setLookupNotice("Manual code entry is off — scan a barcode or pick from the grid.");
                return;
              }
              void addByCode(value, true);
            }}
            notice={lookupNotice}
          />
        )}
        {screen === "home" && product === "restaurant" && (
          <TablesScreen
            tables={floor}
            activeTableId={activeTableId}
            onSelect={selectTable}
            onOpen={openTable}
            onWalkIn={walkIn}
          />
        )}
        {screen === "home" && product === "hotel" && (
          <RoomsScreen
            rooms={rooms}
            activeRoomId={activeRoomId}
            onSelect={selectRoom}
            onOpen={openRoom}
            onFrontDesk={walkIn}
          />
        )}
        {screen === "home" && product === "dark-kitchen" && (
          <KitchenHome
            tickets={tickets}
            activeTicketId={activeTicketId}
            onSelect={selectTicket}
            onNew={newKitchenTicket}
          />
        )}
        {screen === "items" && product !== "supermarket" && (
          <ItemsScreen
            mode="items"
            items={items}
            catalog={catalog}
            category={category}
            onCategory={setCategory}
            onAdd={addItem}
            combos={combos}
            onAddCombo={addCombo}
            branchId={branchId}
            query={query}
            onQuery={(value) => {
              setQuery(value);
              setLookupNotice("");
            }}
            onCommitQuery={(value) => {
              if (!settings.barcodeAllowManual) {
                setLookupNotice("Manual code entry is off — scan a barcode or pick from the grid.");
                return;
              }
              void addByCode(value, true);
            }}
            notice={lookupNotice}
          />
        )}
        {screen === "payment" && (
          <PaymentMethodsScreen
            selected={tender}
            amountMinor={totals.totalMinor}
            reference={saleDetails.reference ?? ""}
            blockedReason={missingRequiredSaleFields().length
              ? `Required before checkout: ${missingRequiredSaleFields().map((field) => field.label).join(", ")}`
              : ""}
            onSelect={(method) => void startCharge(method)}
            onReference={(value) =>
              setSaleDetails((previous) => ({ ...previous, reference: value }))
            }
            onBack={() => setScreen("home")}
          />
        )}
        {screen === "payment" && (
          <div
            className="pay-account"
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
          >
            <span>
              <strong>Gift card</strong> — pay the full ticket from an issued card balance.
            </span>
            <button
              className="charge"
              type="button"
              onClick={openGiftCard}
              disabled={paying || Boolean(checkoutRef.current) || shiftLocked}
              style={{ minWidth: 180 }}
            >
              Pay with gift card
            </button>
          </div>
        )}
        {screen === "split" && (
          <SplitPaymentScreen
            count={splitCount}
            parts={splitParts}
            totalMinor={Math.max(
              0,
              (checkout?.baseMinor ?? totals.totalMinor) -
                (checkout?.loyaltyRedeemMinor ?? 0),
            )}
            onCount={(delta) =>
              resizeSplit(Math.min(6, Math.max(2, splitCount + delta)))
            }
            onTender={(index, next) =>
              setSplitTenders((prev) =>
                prev.map((value, i) => (i === index ? next : value)),
              )
            }
            onAmount={(index, minor) =>
              setSplitAmounts((prev) =>
                prev.map((value, i) => (i === index ? Math.max(0, minor) : value)),
              )
            }
            onCharge={chargeSplitPart}
            onBack={() => {
              setScreen("payment");
              void reverseCheckout();
            }}
          />
        )}
        {screen === "paid" && receipt && (
          <PaidScreen
            sale={receipt}
            saveState={receiptSaved}
            onNewOrder={newOrder}
            onRefund={() => setRefundSale(receipt)}
          />
        )}
        {screen === "settings" && (
          <SettingsScreen
            items={catalog}
            staff={session}
            onLockTerminal={signOut}
            onBack={() => setScreen("home")}
          />
        )}
        {screen === "kds" && (
          <KitchenDisplay
            tickets={tickets}
            onAdvance={advanceTicket}
            onClearDispatched={() =>
              setTickets((current) => current.filter((ticket) => ticket.status !== "dispatched"))
            }
          />
        )}
        {screen === "saved" && (
          <SavedScreen
            holds={holds}
            settings={settings}
            tillKey={activeTill.name}
            onDelete={(id) => setHolds((current) => current.filter((hold) => hold.id !== id))}
            onRecall={(hold) => {
              if (!empty && !window.confirm("Replace the current order with this saved order?")) return;
              setCart(hold.lines);
              setDiscountMinor(hold.discountMinor);
              setHolds((current) => current.filter((row) => row.id !== hold.id));
              setActiveTableId(null);
              setActiveRoomId(null);
              setActiveTicketId(null);
              setReceipt(null);
              setLoyaltyNumber(null);
              setTender("cash");
              if (settings.soundOnHoldRecall) beep();
              setScreen("items");
            }}
            onRefund={(sale) => setRefundSale(sale)}
            onBlindRefund={
              settings.refundWithoutTicket
                ? () => setBlindRefundOpen(true)
                : undefined
            }
          />
        )}
      </main>
      {!fullscreen && (
      <div className="right-col">
        <ProfileMenu user={session} onAction={onMenu} />
        <CurrentOrder
          staff={session}
          tableLabel={
            activeTable
              ? `Table ${activeTable.name} · ${activeTable.guests} guests`
              : activeRoom
                ? `Room ${activeRoom.name}${activeRoom.guestName ? ` · ${activeRoom.guestName}` : ""}`
                : activeTicket
                  ? `${channelLabel(activeTicket.channel)} · ${activeTicket.orderNo}`
                  : product === "hotel"
                    ? "Front desk"
                    : product === "dark-kitchen"
                      ? "New ticket"
                      : "Walk-in"
          }
lines={cart}
            onQty={changeQty}
          onPrice={changePrice}
          discountMinor={discountMinor}
          onRegisterAction={runRegisterAction}
          saleDetails={saleDetails}
          onSaleDetail={(key, value) =>
            setSaleDetails((current) => ({ ...current, [key]: value }))
          }
          onContinue={continueAction}
          continueLabel={continueLabel}
          continueDisabled={
            paying ||
            shiftLocked ||
            (empty && screen !== "paid") ||
            screen === "split"
          }
        />
      </div>
      )}
      {dialog === "profile" && (
        <div className="dialog-scrim" onClick={() => setDialog(null)}>
          <div className="dialog" onClick={(event) => event.stopPropagation()}>
            <h3>Profile</h3>
            <p>
              {session.name} · {session.role}
            </p>
            <p className="price">
              {shift
                ? `Shift ${shift.id} is open.`
                : "No shift is open on this till."}
            </p>
            <button className="back" onClick={() => setDialog(null)}>
              Close
            </button>
          </div>
        </div>
      )}
      {notice && (
        <div className="dialog-scrim" onClick={() => setNotice("")}>
          <div className="dialog" onClick={(event) => event.stopPropagation()}>
            <h3>Done</h3>
            <p>{notice}</p>
            <button className="continue" onClick={() => setNotice("")}>
              OK
            </button>
          </div>
        </div>
      )}
      {needsShift && !shift && settings.requireOpenShift && (
        <OpenShiftModal
          name={session.name}
          role={session.role}
          avatar={session.avatar}
          storeName={settings.storeName}
          tillName={tillLabel(activeTill)}
          busy={shiftBusy}
          onOpen={() => {
            setShiftBusy(true);
            void startShift(session).finally(() => setShiftBusy(false));
          }}
          onSignOut={signOut}
        />
      )}
      {copy && (
        <PinModal
          key={gate}
          title={copy.title}
          subtitle={copy.subtitle}
          confirmLabel={copy.confirm}
          error={pinError}
          busy={pinBusy}
          onCancel={() => {
            setGate(null);
            setPendingPrice(null);
            setPendingDiscount(null);
            setPendingRefund(null);
            setPendingBlindRefund(null);
            setPinError("");
          }}
          onSubmit={(pin) => void handlePin(pin)}
        />
      )}
      {loyaltyOpen && (
        <LoyaltyModal
          busy={busyLabel !== null}
          onApply={(number) => void finishLoyalty(number)}
          onSkip={() => void finishLoyalty(null)}
          onCancel={cancelLoyalty}
        />
      )}
      {loyaltyConfirm && (
        <div className="dialog-scrim">
          <div className="dialog" style={{ maxWidth: 420 }}>
            <h3>Redeem loyalty points?</h3>
            <p>
              {loyaltyConfirm.member.name} has {loyaltyConfirm.member.points} points. Use{" "}
              {loyaltyConfirm.points} points for{" "}
              {formatMoney(loyaltyConfirm.valueMinor, settings.currency)} off this ticket?
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="back" type="button" onClick={() => void skipLoyalty()}>
                No, continue
              </button>
              <button className="continue" type="button" onClick={() => void acceptLoyalty()}>
                Redeem points
              </button>
            </div>
          </div>
        </div>
      )}
      {giftCardOpen && (
        <GiftCardModal
          amountMinor={Math.max(
            0,
            (checkout?.baseMinor ?? totals.totalMinor) -
              (checkout?.loyaltyRedeemMinor ?? 0),
          )}
          currency={settings.currency}
          onConfirm={chooseGiftCard}
          onCancel={() => setGiftCardOpen(false)}
        />
      )}
      {holdOpen && (
        <HoldModal
          itemCount={cart.length}
          totalMinor={totals.totalMinor}
          currency={settings.currency}
          requireName={settings.requireNameOnHold}
          expiryMinutes={settings.autoCancelExpiredHolds ? settings.holdExpiryMinutes : 0}
          onHold={parkOrder}
          onCancel={() => setHoldOpen(false)}
        />
      )}
      {discountOpen && (
        <DiscountModal
          subtotalMinor={totals.subtotalMinor}
          currentMinor={discountMinor}
          maxPercent={settings.maxDiscountPercent}
          currency={settings.currency}
          onApply={(amount) => {
            setDiscountOpen(false);
            if (settings.requireManagerPin) {
              setPendingDiscount(amount);
              setPinError("");
              setGate("discount");
            } else setDiscountMinor(amount);
          }}
          onClear={() => {
            setDiscountMinor(0);
            setDiscountOpen(false);
          }}
          onCancel={() => setDiscountOpen(false)}
        />
      )}
      {refundSale && (
        <RefundModal
          sale={refundSale}
          settings={settings}
          onRefund={(lines, reason) => requestRefund(refundSale, lines, reason)}
          onCancel={() => setRefundSale(null)}
        />
      )}
      {blindRefundOpen && (
        <BlindRefundModal
          settings={settings}
          onSubmit={requestBlindRefund}
          onCancel={() => setBlindRefundOpen(false)}
        />
      )}
      {tipOpen && (
        <TipModal
          baseMinor={totals.totalMinor}
          currency={settings.currency}
          onConfirm={confirmTip}
          onSkip={() => confirmTip(0)}
          onCancel={cancelTip}
        />
      )}
      {handoff && (
        <PaymentHandoffModal
          handoff={handoff}
          currency={settings.currency}
          onConfirm={confirmHandoff}
          onCancel={cancelHandoff}
        />
      )}
      <PaymentOverlay
        visible={paying || busyLabel !== null}
        label={busyLabel ?? tenderLabel(tender)}
      />
    </div>
  );
}
