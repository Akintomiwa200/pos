import { useEffect, useMemo, useRef, useState } from "react";
import type { CartLine, CatalogItem, TenderType } from "./lib/types";
import { computeTotals, formatMoney } from "./lib/types";
import { Sidebar } from "./components/layout/Sidebar";
import { ProfileMenu, type MenuAction } from "./components/layout/ProfileMenu";
import { CurrentOrder } from "./components/order/CurrentOrder";
import { PaymentOverlay } from "./components/payment/PaymentOverlay";
import { LoyaltyModal } from "./components/payment/LoyaltyModal";
import { ItemsScreen } from "./screens/items/ItemsScreen";
import { PaymentMethodsScreen } from "./screens/payment-methods/PaymentMethodsScreen";
import { SplitPaymentScreen } from "./screens/split-payment/SplitPaymentScreen";
import { PaidScreen } from "./screens/paid/PaidScreen";
import { SettingsScreen } from "./screens/settings/SettingsScreen";
import { KdsScreen } from "./screens/kds/KdsScreen";
import { LoginScreen } from "./screens/login/LoginScreen";
import { OpenShiftModal } from "./components/shift/OpenShiftModal";
import { PinModal } from "./components/shift/PinModal";
import { ActivateTillModal } from "./components/shift/ActivateTillModal";
import { createFloor, type FloorTable } from "./lib/tables";
import { findCatalogItem, lookupCatalog, useCatalog } from "./lib/catalog";
import { TENDER_LABEL, type SaleReceipt } from "./lib/receipt";
import { archiveSale } from "./lib/sales";
import {
  loadStoreSettings,
  normalizeBarcode,
  takeNextTicketId,
} from "./lib/store-settings";
import { useStoreSettings, useTills } from "./lib/use-store-settings";
import { findTill, heartbeatDeviceTill, TILL_EXPIRED_EVENT, TILL_TAKEN_EVENT, tillLabel, tillNeedsActivation } from "./lib/tills";
import { useHardwareHex } from "./lib/device-hex";
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
  openShift,
  printReport,
  recordShiftSale,
  unlockWithPin,
} from "./lib/session";

type Screen = "home" | "items" | "payment" | "split" | "paid" | "kds" | "settings";
type Gate =
  | "print-shift"
  | "close-shift"
  | "print-day"
  | "close-day"
  | "logout"
  | "settings";

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
};

export default function App() {
  const { items: catalog, updateItem, adjustOnHand } = useCatalog();
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
  const [notice, setNotice] = useState("");
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [floor, setFloor] = useState(createFloor);
  const [screen, setScreen] = useState<Screen>("home");
  const [category, setCategory] = useState("Cakes");
  const [query, setQuery] = useState("");
  const [barcode, setBarcode] = useState("");
  const [lookupNotice, setLookupNotice] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [tender, setTender] = useState<TenderType>("cash");
  const [splitCount, setSplitCount] = useState(2);
  const [splitTenders, setSplitTenders] = useState<TenderType[]>([
    "cash",
    "card",
  ]);
  const [splitPaid, setSplitPaid] = useState<boolean[]>([false, false]);
  const [paying, setPaying] = useState(false);
  const [loyaltyOpen, setLoyaltyOpen] = useState(false);
  const [loyaltyNumber, setLoyaltyNumber] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<SaleReceipt | null>(null);
  const [dialog, setDialog] = useState<"profile" | null>(null);
  const [lockoutMessage, setLockoutMessage] = useState("");
  const awaitingActivation = useRef(false);

  const items = catalog.filter((item) => {
    if (screen === "items" && item.category !== category) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.barcode.toLowerCase().includes(q)
    );
  });
  const totals = computeTotals(cartSubtotal(cart), settings);
  const activeTill = tills[0] ?? findTill();
  const needsActivation = tillNeedsActivation(activeTill);
  const tillClosed = needsActivation || !activeTill.paired || !activeTill.active;
  const shiftLocked = Boolean(needsShift && settings.requireOpenShift) || tillClosed;
  const empty = cart.length === 0;
  const activeTable = floor.find((table) => table.id === activeTableId) ?? null;

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

  const splitParts = useMemo(() => {
    const n = Math.max(1, splitCount);
    const base = Math.floor(totals.totalMinor / n);
    const remainder = totals.totalMinor - base * n;
    return Array.from({ length: n }, (_, i) => ({
      tender: splitTenders[i] ?? "cash",
      amountMinor: base + (i === 0 ? remainder : 0),
      paid: splitPaid[i] ?? false,
    }));
  }, [splitCount, splitTenders, splitPaid, totals.totalMinor]);

  function resetTill() {
    setCart([]);
    setTender("cash");
    setSplitCount(2);
    setSplitTenders(["cash", "card"]);
    setSplitPaid([false, false]);
    setReceipt(null);
    setPaying(false);
    setLoyaltyOpen(false);
    setLoyaltyNumber(null);
    setScreen("home");
    setCategory("Cakes");
    setQuery("");
    setBarcode("");
    setLookupNotice("");
    setActiveTableId(null);
  }

  function signOut() {
    setSession(null);
    setShift(null);
    setNeedsShift(false);
    setGate(null);
    setPinError("");
    setNotice("");
    setFloor(createFloor());
    resetTill();
  }

  async function startShift(user: StaffUser) {
    const next = await openShift(user.id);
    setShift(next);
    setNeedsShift(false);
  }

  async function handleLogin(user: StaffUser, mustOpenShift: boolean) {
    setLockoutMessage("");
    setSession(user);
    setFloor(createFloor());
    resetTill();
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

  function openTable(table: FloorTable, guests: number) {
    patchTable(table.id, {
      status: "occupied",
      guests,
      openedAt: new Date().toISOString(),
      lines: [],
    });
    setActiveTableId(table.id);
    setCart([]);
    setReceipt(null);
    setScreen("items");
  }

  function selectTable(table: FloorTable) {
    setActiveTableId(table.id);
    setCart(table.lines);
    setReceipt(null);
    setScreen("items");
  }

  function walkIn() {
    setActiveTableId(null);
    setCart([]);
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

  function onMenu(action: MenuAction) {
    if (action === "profile") setDialog("profile");
    if (action === "settings") requestSettings();
    if (action === "logout") requestGate("logout");
    if (action === "print-shift") requestGate("print-shift");
    if (action === "close-shift") requestGate("close-shift");
    if (action === "print-day") requestGate("print-day");
    if (action === "close-day") requestGate("close-day");
  }

  async function handlePin(pin: string) {
    if (!session || !gate) return;
    setPinBusy(true);
    setPinError("");
    try {
      const unlockedBy = await unlockWithPin(pin);
      if (gate === "settings") {
        setGate(null);
        setScreen("settings");
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
        await closeShift(session.id, pin);
        setShift(null);
        if (isSellOnly(session)) setNeedsShift(true);
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
      await closeDay(pin);
      signOut();
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
      setLookupNotice(
        item.onHand <= 0
          ? `${item.name} is out of stock.`
          : `Only ${item.onHand} ${item.name} on hand.`,
      );
      return;
    }
    if (settings.lowStockAlert && item.onHand <= settings.lowStockQty) {
      setLookupNotice(
        `${item.name} is low — ${item.onHand} left (alert at ${settings.lowStockQty}).`,
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
          unitPriceMinor: item.priceMinor,
          image: item.image,
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
    const local = findCatalogItem(catalog, code);
    if (local) {
      addItem(local);
      if (settings.barcodeBeep) beep();
      setLookupNotice(`Added ${local.name}`);
      setQuery("");
      setBarcode("");
      return;
    }
    try {
      const remote = await lookupCatalog(code);
      if (remote) {
        addItem(remote);
        if (settings.barcodeBeep) beep();
        setLookupNotice(`Added ${remote.name}`);
        setQuery("");
        setBarcode("");
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
    setCart((current) =>
      current.map((line) =>
        line.id === id ? { ...line, unitPriceMinor } : line,
      ),
    );
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
  }

  function completeSale(method: TenderType, loyalty = loyaltyNumber) {
    if (!session) return;
    const totalMinor = computeTotals(cartSubtotal(cart), settings).totalMinor;
    const till = activeTill;
    const sale: SaleReceipt = {
      ticketId: takeNextTicketId(settings),
      paidAt: new Date().toISOString(),
      lines: cart,
      totalMinor,
      tender: method,
      cashierName: session.name,
      loyaltyNumber: loyalty,
      tillKey: till?.name ?? null,
    };
    if (settings.trackStockOnTill) {
      for (const line of cart) {
        adjustOnHand(line.itemId, -line.quantity);
      }
    }
    setReceipt(sale);
    void archiveSale(sale);
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
    setPaying(false);
    setScreen("paid");
  }

  function startCharge(method: TenderType) {
    if (empty || paying || loyaltyOpen || screen === "paid" || shiftLocked) return;
    setTender(method);
    if (method === "split") {
      setSplitPaid(Array.from({ length: splitCount }, () => false));
      setScreen("split");
      return;
    }
    if (!settings.loyaltyEnabled) {
      finishLoyalty(null, method);
      return;
    }
    setLoyaltyNumber(null);
    setLoyaltyOpen(true);
  }

  function finishLoyalty(number: string | null, method: TenderType = tender) {
    setLoyaltyNumber(number);
    setLoyaltyOpen(false);
    setPaying(true);
    window.setTimeout(() => completeSale(method, number), 1600);
  }

  function chargeSplitPart(index: number) {
    if (paying || loyaltyOpen || splitPaid[index] || empty) return;
    setPaying(true);
    window.setTimeout(() => {
      setSplitPaid((prev) => {
        const next = prev.map((value, i) => (i === index ? true : value));
        if (next.every(Boolean)) {
          setPaying(false);
          if (!settings.loyaltyEnabled) {
            finishLoyalty(null);
          } else {
            setLoyaltyNumber(null);
            setLoyaltyOpen(true);
          }
        } else {
          setPaying(false);
        }
        return next;
      });
    }, 1600);
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
    setCart([]);
    setTender("cash");
    setSplitCount(2);
    setSplitTenders(["cash", "card"]);
    setSplitPaid([false, false]);
    setReceipt(null);
    setPaying(false);
    setLoyaltyOpen(false);
    setLoyaltyNumber(null);
    setScreen("home");
  }

  function continueAction() {
    if (shiftLocked) return;
    if (screen === "paid") {
      newOrder();
      return;
    }
    if (screen === "home" || screen === "items" || screen === "kds") {
      if (empty) return;
      setScreen("payment");
      return;
    }
    if (screen === "payment") {
      startCharge(tender);
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
          active={
            screen === "home"
              ? "home"
              : screen === "kds"
                ? "chat"
                : screen === "items"
                  ? "items"
                  : "orders"
          }
          onSelect={(id) => {
            if (shiftLocked) return;
            if (id === "home") setScreen("home");
            if (id === "items") setScreen("items");
            if (id === "orders" && !empty) setScreen("payment");
            if (id === "chat") setScreen("kds");
          }}
          onSettings={requestSettings}
          onLogout={() => requestGate("logout")}
        />
      )}
      <main className={fullscreen ? "stage-full" : "stage"}>
        {(screen === "home" || screen === "items") && (
          <ItemsScreen
            mode={screen === "home" ? "home" : "items"}
            items={items}
            category={category}
            onCategory={setCategory}
            onAdd={addItem}
            query={query}
            onQuery={(value) => {
              setQuery(value);
              setLookupNotice("");
            }}
            onCommitQuery={(value) => void addByCode(value, false)}
            barcode={barcode}
            onBarcode={(value) => {
              setBarcode(value);
              setLookupNotice("");
            }}
            onCommitBarcode={(value) => void addByCode(value, true)}
            notice={lookupNotice}
          />
        )}
        {screen === "payment" && (
          <PaymentMethodsScreen
            selected={tender}
            amountMinor={totals.totalMinor}
            onSelect={startCharge}
            onBack={() => setScreen("home")}
          />
        )}
        {screen === "split" && (
          <SplitPaymentScreen
            count={splitCount}
            parts={splitParts}
            onCount={(delta) =>
              resizeSplit(Math.min(6, Math.max(2, splitCount + delta)))
            }
            onTender={(index, next) =>
              setSplitTenders((prev) =>
                prev.map((value, i) => (i === index ? next : value)),
              )
            }
            onCharge={chargeSplitPart}
            onBack={() => setScreen("payment")}
          />
        )}
        {screen === "paid" && receipt && (
          <PaidScreen
            sale={receipt}
            onNewOrder={newOrder}
          />
        )}
        {screen === "settings" && (
          <SettingsScreen
            items={catalog}
            onUpdateItem={updateItem}
            onBack={() => setScreen("home")}
            onOpenTill={() => setScreen("home")}
          />
        )}
        {screen === "kds" && <KdsScreen />}
      </main>
      {!fullscreen && (
      <div className="right-col">
        <ProfileMenu user={session} onAction={onMenu} />
        <CurrentOrder
          staff={session}
          tableLabel={
            activeTable
              ? `Table ${activeTable.name} · ${activeTable.guests} guests`
              : "Walk-in"
          }
          lines={screen === "paid" && receipt ? receipt.lines : cart}
          onQty={changeQty}
          onPrice={changePrice}
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
            setPinError("");
          }}
          onSubmit={(pin) => void handlePin(pin)}
        />
      )}
      {loyaltyOpen && (
        <LoyaltyModal
          onApply={(number) => finishLoyalty(number)}
          onSkip={() => finishLoyalty(null)}
        />
      )}
      <PaymentOverlay
        visible={paying}
        label={TENDER_LABEL[tender]}
      />
    </div>
  );
}
