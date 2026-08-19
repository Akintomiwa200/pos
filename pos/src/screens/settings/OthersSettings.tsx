import { useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Building2,
  Database,
  Download,
  FileText,
  Globe,
  Landmark,
  Pause,
  RotateCcw,
  Settings2,
  Store,
  Tags,
  Upload,
  Wallet,
} from "lucide-react";
import type { CatalogItem } from "../../lib/types";
import { formatMoney } from "../../lib/types";
import { downloadText, parseCsv, toCsv } from "../../lib/csv";
import { loadCustomers, saveCustomers, type CustomerRecord } from "../../lib/customers";
import { loadLocalSales } from "../../lib/sales";
import { loadPrinterConfig } from "../../lib/printers";
import {
  loadBranches,
  loadTills,
  saveBranches,
  type BranchRecord,
} from "../../lib/tills";
import { TillKeysSettings } from "./TillKeysSettings";
import {
  AccountingAdmin,
  CategoriesAdmin,
  HoldAdmin,
  InvoicesAdmin,
  RefundsAdmin,
} from "./SettingsPages";
import {
  AreaField,
  LiveNote,
  NumField,
  SelectField,
  SetCard,
  SetRow,
  TextField,
  Toggle,
  useSettings,
} from "./settings-ui";

type OtherPage =
  | "hub"
  | "company"
  | "branch"
  | "till"
  | "store"
  | "storefront"
  | "gateway"
  | "general"
  | "data"
  | "import"
  | "export"
  | "categories"
  | "invoices"
  | "hold"
  | "refunds"
  | "accounting";

const OTHER_TILES: { id: OtherPage; label: string; icon: typeof Store }[] = [
  { id: "company", label: "Company", icon: Landmark },
  { id: "branch", label: "Branch", icon: Building2 },
  { id: "till", label: "Till", icon: Store },
  { id: "store", label: "Store", icon: Store },
  { id: "storefront", label: "Storefront", icon: Globe },
  { id: "gateway", label: "Payment Gateway", icon: Wallet },
  { id: "general", label: "Settings", icon: Settings2 },
  { id: "categories", label: "Categories", icon: Tags },
  { id: "invoices", label: "Invoices", icon: FileText },
  { id: "hold", label: "On hold", icon: Pause },
  { id: "refunds", label: "Refunds", icon: RotateCcw },
  { id: "accounting", label: "Accounting", icon: BookOpen },
  { id: "data", label: "Data", icon: Database },
  { id: "import", label: "Import", icon: Upload },
  { id: "export", label: "Export", icon: Download },
];

type Props = {
  onOpenTill: () => void;
  items: CatalogItem[];
  onUpdateItem: (
    id: string,
    patch: { priceMinor?: number; onHand?: number },
  ) => Promise<void>;
};

export function OthersSettings({ onOpenTill, items, onUpdateItem }: Props) {
  const [page, setPage] = useState<OtherPage>("hub");

  if (page === "hub") {
    return (
      <>
        <p className="set-lede">
          Company, branches, tills, storefront, gateways, and the data that lives
          on this register. Every field here is stored on the till and used live.
        </p>
        <div className="settings-grid">
          {OTHER_TILES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className="settings-tile"
              onClick={() => setPage(id)}
            >
              <Icon size={54} strokeWidth={1.7} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <button type="button" className="back" onClick={() => setPage("hub")}>
        ← Others
      </button>
      <h2 className="others-subhead">
        {OTHER_TILES.find((tile) => tile.id === page)?.label}
      </h2>
      {page === "company" && <CompanySettings />}
      {page === "branch" && <BranchSettings />}
      {page === "till" && <TillKeysSettings />}
      {page === "store" && <StoreSettingsPage />}
      {page === "storefront" && <StorefrontSettings />}
      {page === "gateway" && <GatewaySettings />}
      {page === "general" && <GeneralSettings onOpenTill={onOpenTill} />}
      {page === "data" && <DataSettings items={items} />}
      {page === "import" && (
        <ImportSettings items={items} onUpdateItem={onUpdateItem} />
      )}
      {page === "export" && <ExportSettings items={items} />}
      {page === "categories" && <CategoriesAdmin items={items} />}
      {page === "invoices" && <InvoicesAdmin />}
      {page === "hold" && <HoldAdmin />}
      {page === "refunds" && <RefundsAdmin />}
      {page === "accounting" && <AccountingAdmin />}
    </>
  );
}

function CompanySettings() {
  const [settings, patch] = useSettings();
  return (
    <>
      <p className="set-lede">
        Legal identity used on receipts, invoices, and FIRS lines. The trading
        name is what the customer sees first on the slip.
      </p>
      <LiveNote>
        Receipts now print <strong>{settings.storeName}</strong>
        {settings.showTinOnReceipt ? ` · TIN ${settings.storeTin}` : ""}. Legal
        name {settings.companyLegalName}.
      </LiveNote>
      <SetCard title="Trading">
        <SetRow label="What name should appear on the receipt?">
          <TextField
            value={settings.storeName}
            onChange={(storeName) => patch({ storeName })}
            width={260}
          />
        </SetRow>
        <SetRow label="What is the company address?">
          <TextField
            value={settings.storeAddress}
            onChange={(storeAddress) => patch({ storeAddress })}
            width={280}
          />
        </SetRow>
        <SetRow label="What phone number should appear on papers?">
          <TextField
            value={settings.storePhone}
            onChange={(storePhone) => patch({ storePhone })}
            width={200}
          />
        </SetRow>
        <SetRow label="Company email">
          <TextField
            value={settings.companyEmail}
            onChange={(companyEmail) => patch({ companyEmail })}
            width={220}
          />
        </SetRow>
      </SetCard>
      <SetCard title="Legal">
        <SetRow label="Registered company name">
          <TextField
            value={settings.companyLegalName}
            onChange={(companyLegalName) => patch({ companyLegalName })}
            width={260}
          />
        </SetRow>
        <SetRow label="RC number">
          <TextField
            value={settings.companyRc}
            onChange={(companyRc) => patch({ companyRc })}
            width={160}
          />
        </SetRow>
        <SetRow label="State of registration">
          <TextField
            value={settings.companyState}
            onChange={(companyState) => patch({ companyState })}
            width={160}
          />
        </SetRow>
        <SetRow label="What is the company TIN?">
          <TextField
            value={settings.storeTin}
            onChange={(storeTin) => patch({ storeTin })}
            width={160}
          />
        </SetRow>
        <SetRow label="Show TIN on the receipt?">
          <Toggle
            on={settings.showTinOnReceipt}
            onChange={(showTinOnReceipt) => patch({ showTinOnReceipt })}
          />
        </SetRow>
      </SetCard>
    </>
  );
}

function BranchSettings() {
  const [rows, setRows] = useState<BranchRecord[]>(loadBranches);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Lagos");
  const [state, setState] = useState("Lagos");
  const [phone, setPhone] = useState("");
  const [manager, setManager] = useState("");
  const [active, setActive] = useState(true);
  const open = rows.filter((row) => row.active).length;

  function persist(next: BranchRecord[]) {
    setRows(next);
    saveBranches(next);
  }

  function edit(row: BranchRecord) {
    setSelectedId(row.id);
    setName(row.name);
    setAddress(row.address);
    setCity(row.city);
    setState(row.state);
    setPhone(row.phone);
    setManager(row.manager);
    setActive(row.active);
  }

  function save() {
    if (!name.trim()) return;
    const next: BranchRecord = {
      id: selectedId ?? `br-${Date.now()}`,
      name: name.trim(),
      address: address.trim(),
      city: city.trim() || "Lagos",
      state: state.trim() || "Lagos",
      phone: phone.trim(),
      manager: manager.trim(),
      active,
    };
    persist(selectedId ? rows.map((row) => (row.id === selectedId ? next : row)) : [...rows, next]);
    setSelectedId(null);
    setName("");
    setAddress("");
    setCity("Lagos");
    setState("Lagos");
    setPhone("");
    setManager("");
    setActive(true);
  }

  return (
    <>
      <p className="set-lede">
        Branches tills can be assigned to. Disabling a branch does not delete
        its tills, but new assignments should use an open branch.
      </p>
      <LiveNote>
        {rows.length} branch{rows.length === 1 ? "" : "es"} · {open} open. Tills
        pick a branch when you add or update a till key.
      </LiveNote>
      <SetCard title="Branches">
        {rows.map((row) => (
          <SetRow
            key={row.id}
            label={row.name}
            hint={`${row.address}, ${row.city}, ${row.state} · ${row.manager || "no manager"} · ${row.active ? "Open" : "Closed"}`}
          >
            <span className="till-key-actions">
              <button type="button" className="set-text-btn" onClick={() => edit(row)}>
                Update
              </button>
              <button
                type="button"
                className="set-text-btn set-danger"
                onClick={() => persist(rows.filter((item) => item.id !== row.id))}
              >
                Remove
              </button>
            </span>
          </SetRow>
        ))}
      </SetCard>
      <SetCard title={selectedId ? "Update branch" : "Add branch"}>
        <SetRow label="What is the branch name?">
          <TextField value={name} onChange={setName} width={200} />
        </SetRow>
        <SetRow label="What is the branch address?">
          <TextField value={address} onChange={setAddress} width={240} />
        </SetRow>
        <SetRow label="City">
          <TextField value={city} onChange={setCity} width={160} />
        </SetRow>
        <SetRow label="State">
          <TextField value={state} onChange={setState} width={160} />
        </SetRow>
        <SetRow label="Phone">
          <TextField value={phone} onChange={setPhone} width={180} />
        </SetRow>
        <SetRow label="Manager">
          <TextField value={manager} onChange={setManager} width={180} />
        </SetRow>
        <SetRow label="Is this branch open?">
          <Toggle on={active} onChange={setActive} />
        </SetRow>
        <SetRow label={selectedId ? "Save branch" : "Add branch"}>
          <button type="button" className="set-text-btn" onClick={save}>
            {selectedId ? "Update" : "Add"}
          </button>
        </SetRow>
      </SetCard>
    </>
  );
}

function StoreSettingsPage() {
  const [settings, patch] = useSettings();
  return (
    <>
      <p className="set-lede">
        Outlet-level rules for this store: hours, contact, price override, and
        whether sold-out items stay on the till.
      </p>
      <LiveNote>
        Shift screen and receipts use <strong>{settings.storeName}</strong>. Price
        override is {settings.allowPriceOverride ? "on — cashiers can edit unit price on Current Order" : "off"}.
      </LiveNote>
      <SetCard title="Outlet">
        <SetRow label="What is the store display name?">
          <TextField
            value={settings.storeName}
            onChange={(storeName) => patch({ storeName })}
            width={240}
          />
        </SetRow>
        <SetRow label="Store address">
          <TextField
            value={settings.storeAddress}
            onChange={(storeAddress) => patch({ storeAddress })}
            width={280}
          />
        </SetRow>
        <SetRow label="Store email">
          <TextField
            value={settings.storeEmail}
            onChange={(storeEmail) => patch({ storeEmail })}
            width={220}
          />
        </SetRow>
        <SetRow label="Opening hours">
          <TextField
            value={settings.storeHours}
            onChange={(storeHours) => patch({ storeHours })}
            width={180}
          />
        </SetRow>
      </SetCard>
      <SetCard title="Till behaviour">
        <SetRow
          label="Allow cashiers to override prices?"
          hint="Shows an editable unit price on Current Order"
        >
          <Toggle
            on={settings.allowPriceOverride}
            onChange={(allowPriceOverride) => patch({ allowPriceOverride })}
          />
        </SetRow>
        <SetRow label="Show out-of-stock items on this store’s till?">
          <Toggle
            on={settings.showOutOfStock}
            onChange={(showOutOfStock) => patch({ showOutOfStock })}
          />
        </SetRow>
        <SetRow label="Require an open shift before selling?">
          <Toggle
            on={settings.requireOpenShift}
            onChange={(requireOpenShift) => patch({ requireOpenShift })}
          />
        </SetRow>
        <SetRow
          label="Lock the till after this many idle minutes"
          hint="0 means never"
        >
          <NumField
            value={settings.idleLockMinutes}
            step={1}
            min={0}
            onChange={(idleLockMinutes) =>
              patch({ idleLockMinutes: Math.max(0, Math.round(idleLockMinutes)) })
            }
          />
        </SetRow>
      </SetCard>
    </>
  );
}

function StorefrontSettings() {
  const [settings, patch] = useSettings();
  return (
    <>
      <p className="set-lede">
        Online shop linked to this outlet. When sync is on, till price and stock
        edits are the source the storefront should follow.
      </p>
      <LiveNote>
        Storefront is <strong>{settings.storefrontEnabled ? "on" : "off"}</strong>
        {settings.storefrontEnabled ? ` · ${settings.storefrontUrl}` : ""}.{" "}
        {settings.storefrontSyncPrices ? "Prices sync." : "Prices stay till-only."}{" "}
        {settings.storefrontSyncStock ? "Stock sync." : "Stock stays till-only."}
      </LiveNote>
      <SetCard title="Online shop">
        <SetRow label="Turn on the online storefront?">
          <Toggle
            on={settings.storefrontEnabled}
            onChange={(storefrontEnabled) => patch({ storefrontEnabled })}
          />
        </SetRow>
        <SetRow label="What is the storefront URL?">
          <TextField
            value={settings.storefrontUrl}
            onChange={(storefrontUrl) => patch({ storefrontUrl })}
            width={260}
          />
        </SetRow>
        <SetRow label="Sync till prices to the storefront?">
          <Toggle
            on={settings.storefrontSyncPrices}
            onChange={(storefrontSyncPrices) => patch({ storefrontSyncPrices })}
          />
        </SetRow>
        <SetRow label="Sync on-hand to the storefront?">
          <Toggle
            on={settings.storefrontSyncStock}
            onChange={(storefrontSyncStock) => patch({ storefrontSyncStock })}
          />
        </SetRow>
      </SetCard>
    </>
  );
}

function GatewaySettings() {
  const [settings, patch] = useSettings();
  const live = [
    settings.gatewayPaystack && "Paystack",
    settings.gatewayMoniepoint && "Moniepoint",
    settings.gatewayFlutterwave && "Flutterwave",
  ].filter(Boolean);

  return (
    <>
      <p className="set-lede">
        Card acquirers for this till. The default is used when the cashier
        chooses Credit Card. Turn one off and it cannot be the default.
      </p>
      <LiveNote>
        {live.length ? `Live: ${live.join(", ")}.` : "No card gateway is on."} Default
        acquirer: <strong>{settings.gatewayDefault}</strong>
        {settings.payCard ? "" : " (card is hidden on the payment screen)."}.
      </LiveNote>
      <SetCard title="Acquirers">
        <SetRow label="Accept Paystack?">
          <Toggle
            on={settings.gatewayPaystack}
            onChange={(gatewayPaystack) => {
              patch({
                gatewayPaystack,
                gatewayDefault:
                  !gatewayPaystack && settings.gatewayDefault === "paystack"
                    ? "moniepoint"
                    : settings.gatewayDefault,
              });
            }}
          />
        </SetRow>
        <SetRow label="Accept Moniepoint?">
          <Toggle
            on={settings.gatewayMoniepoint}
            onChange={(gatewayMoniepoint) => {
              patch({
                gatewayMoniepoint,
                gatewayDefault:
                  !gatewayMoniepoint && settings.gatewayDefault === "moniepoint"
                    ? "paystack"
                    : settings.gatewayDefault,
              });
            }}
          />
        </SetRow>
        <SetRow label="Accept Flutterwave?">
          <Toggle
            on={settings.gatewayFlutterwave}
            onChange={(gatewayFlutterwave) => {
              patch({
                gatewayFlutterwave,
                gatewayDefault:
                  !gatewayFlutterwave && settings.gatewayDefault === "flutterwave"
                    ? "paystack"
                    : settings.gatewayDefault,
              });
            }}
          />
        </SetRow>
        <SetRow label="Default card acquirer">
          <SelectField
            value={settings.gatewayDefault}
            onChange={(gatewayDefault) =>
              patch({
                gatewayDefault: gatewayDefault as typeof settings.gatewayDefault,
              })
            }
            options={[
              ...(settings.gatewayPaystack
                ? [{ value: "paystack", label: "Paystack" }]
                : []),
              ...(settings.gatewayMoniepoint
                ? [{ value: "moniepoint", label: "Moniepoint" }]
                : []),
              ...(settings.gatewayFlutterwave
                ? [{ value: "flutterwave", label: "Flutterwave" }]
                : []),
              { value: settings.gatewayDefault, label: "None enabled" },
            ].filter(
              (option, index, list) =>
                list.findIndex((row) => row.value === option.value) === index,
            )}
          />
        </SetRow>
        <SetRow label="Show Credit Card on the payment screen?">
          <Toggle on={settings.payCard} onChange={(payCard) => patch({ payCard })} />
        </SetRow>
      </SetCard>
    </>
  );
}

function GeneralSettings({ onOpenTill }: { onOpenTill: () => void }) {
  const [settings, patch] = useSettings();
  return (
    <>
      <p className="set-lede">
        Register behaviour that is not tax, stock, or printing — price override,
        shift lock, and a shortcut back to selling.
      </p>
      <LiveNote>
        {settings.requireOpenShift
          ? "A cashier must open a shift before selling."
          : "Selling is allowed without opening a shift."}{" "}
        Idle lock {settings.idleLockMinutes ? `after ${settings.idleLockMinutes} min` : "is off"}.
      </LiveNote>
      <SetCard title="This register">
        <SetRow label="Allow cashiers to override prices?">
          <Toggle
            on={settings.allowPriceOverride}
            onChange={(allowPriceOverride) => patch({ allowPriceOverride })}
          />
        </SetRow>
        <SetRow label="Require an open shift before selling?">
          <Toggle
            on={settings.requireOpenShift}
            onChange={(requireOpenShift) => patch({ requireOpenShift })}
          />
        </SetRow>
        <SetRow label="Play a sound when a hold is recalled?">
          <Toggle
            on={settings.soundOnHoldRecall}
            onChange={(soundOnHoldRecall) => patch({ soundOnHoldRecall })}
          />
        </SetRow>
        <SetRow label="Idle lock (minutes, 0 = never)">
          <NumField
            value={settings.idleLockMinutes}
            step={1}
            min={0}
            onChange={(idleLockMinutes) =>
              patch({ idleLockMinutes: Math.max(0, Math.round(idleLockMinutes)) })
            }
          />
        </SetRow>
        <SetRow label="Open the Point of Sale">
          <button type="button" className="set-text-btn" onClick={onOpenTill}>
            Open till
          </button>
        </SetRow>
      </SetCard>
    </>
  );
}

function DataSettings({ items }: { items: CatalogItem[] }) {
  const [settings] = useSettings();
  const sales = loadLocalSales();
  const till = loadTills()[0];
  const branches = loadBranches();
  const customers = loadCustomers();
  const printers = loadPrinterConfig();
  const last = sales[0];

  return (
    <>
      <p className="set-lede">
        What this register is holding locally right now. Sales stay on the till
        even if HQ is offline.
      </p>
      <LiveNote>
        {sales.length} sale{sales.length === 1 ? "" : "s"} stored · {items.length}{" "}
        catalogue items ·{" "}
        {till?.paired ? (
          <>
            this device is <strong>{till.name}</strong> (licensed)
          </>
        ) : (
          <>this device is <strong>not licensed</strong></>
        )}
        {last
          ? ` · last ticket ${last.ticketId} (${formatMoney(last.totalMinor)})`
          : " · no sales yet"}
        .
      </LiveNote>
      <SetCard title="On this till">
        <SetRow label="Local sales" hint="pos.sales.v1, last 500 tickets">
          <span className="set-muted">{sales.length} tickets</span>
        </SetRow>
        <SetRow label="Catalogue">
          <span className="set-muted">
            {items.length} items · {settings.stockMode}
          </span>
        </SetRow>
        <SetRow label="This device’s till" hint="One till per device">
          <span className="set-muted">
            {till?.paired ? `${till.name} · licensed` : "not licensed"} · {branches.length}{" "}
            branches
          </span>
        </SetRow>
        <SetRow label="Customers imported">
          <span className="set-muted">{customers.length}</span>
        </SetRow>
        <SetRow label="Receipt printer">
          <span className="set-muted">{printers.receiptPrinter ?? "not assigned"}</span>
        </SetRow>
        <SetRow label="Next invoice">
          <span className="set-muted">
            {settings.invoicePrefix}-{String(settings.nextInvoiceNumber).padStart(4, "0")}
          </span>
        </SetRow>
      </SetCard>
    </>
  );
}

function ImportSettings({
  items,
  onUpdateItem,
}: {
  items: CatalogItem[];
  onUpdateItem: (
    id: string,
    patch: { priceMinor?: number; onHand?: number },
  ) => Promise<void>;
}) {
  const itemInput = useRef<HTMLInputElement>(null);
  const customerInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");

  async function importItems(file: File) {
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) {
      setStatus("CSV needs a header row and at least one item.");
      return;
    }
    const header = rows[0]!.map((cell) => cell.toLowerCase());
    const skuIdx = header.findIndex((cell) => cell === "sku" || cell === "code");
    const barcodeIdx = header.findIndex((cell) => cell === "barcode");
    const priceIdx = header.findIndex(
      (cell) => cell === "price" || cell === "price_naira" || cell === "naira",
    );
    const qtyIdx = header.findIndex(
      (cell) => cell === "onhand" || cell === "on_hand" || cell === "qty" || cell === "stock",
    );
    let updated = 0;
    let missed = 0;
    for (const row of rows.slice(1)) {
      const sku = skuIdx >= 0 ? row[skuIdx] ?? "" : "";
      const barcode = barcodeIdx >= 0 ? row[barcodeIdx] ?? "" : "";
      const match = items.find(
        (item) =>
          (sku && item.sku.toLowerCase() === sku.toLowerCase()) ||
          (barcode && item.barcode === barcode),
      );
      if (!match) {
        missed += 1;
        continue;
      }
      const patch: { priceMinor?: number; onHand?: number } = {};
      if (priceIdx >= 0) {
        const naira = Number(row[priceIdx]);
        if (Number.isFinite(naira)) patch.priceMinor = Math.round(naira * 100);
      }
      if (qtyIdx >= 0) {
        const qty = Number(row[qtyIdx]);
        if (Number.isFinite(qty)) patch.onHand = Math.max(0, Math.round(qty));
      }
      if (Object.keys(patch).length) {
        await onUpdateItem(match.id, patch);
        updated += 1;
      }
    }
    setStatus(`Updated ${updated} item${updated === 1 ? "" : "s"}. ${missed} row${missed === 1 ? "" : "s"} had no matching SKU or barcode.`);
  }

  async function importCustomers(file: File) {
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) {
      setStatus("CSV needs a header row and at least one customer.");
      return;
    }
    const header = rows[0]!.map((cell) => cell.toLowerCase());
    const nameIdx = header.findIndex((cell) => cell === "name");
    const phoneIdx = header.findIndex((cell) => cell === "phone");
    const emailIdx = header.findIndex((cell) => cell === "email");
    const existing = loadCustomers();
    const next = [...existing];
    for (const row of rows.slice(1)) {
      const name = (nameIdx >= 0 ? row[nameIdx] : row[0])?.trim() ?? "";
      if (!name) continue;
      const phone = (phoneIdx >= 0 ? row[phoneIdx] : "")?.trim() ?? "";
      const email = (emailIdx >= 0 ? row[emailIdx] : "")?.trim() ?? "";
      const found = next.find(
        (row) =>
          (phone && row.phone === phone) ||
          (email && row.email.toLowerCase() === email.toLowerCase()),
      );
      if (found) {
        found.name = name;
        if (phone) found.phone = phone;
        if (email) found.email = email;
      } else {
        next.push({
          id: `cus-${Date.now()}-${next.length}`,
          name,
          phone,
          email,
        });
      }
    }
    saveCustomers(next);
    setStatus(`Customer list now has ${next.length} record${next.length === 1 ? "" : "s"}.`);
  }

  return (
    <>
      <p className="set-lede">
        Import CSV files into this till. Item rows must match an existing SKU or
        barcode. Columns: sku, barcode, price (naira), onhand. Customers: name,
        phone, email.
      </p>
      <LiveNote>
        {status ||
          `${items.length} items on the till can be updated. ${loadCustomers().length} customers stored.`}
      </LiveNote>
      <SetCard title="Files">
        <SetRow
          label="Import items from a CSV?"
          hint="Matches sku or barcode, then writes price and on-hand live"
        >
          <>
            <input
              ref={itemInput}
              className="set-file"
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importItems(file);
                event.target.value = "";
              }}
            />
            <button
              type="button"
              className="set-text-btn"
              onClick={() => itemInput.current?.click()}
            >
              Choose file
            </button>
          </>
        </SetRow>
        <SetRow label="Import customers from a CSV?" hint="Stored on this till as pos.customers.v1">
          <>
            <input
              ref={customerInput}
              className="set-file"
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importCustomers(file);
                event.target.value = "";
              }}
            />
            <button
              type="button"
              className="set-text-btn"
              onClick={() => customerInput.current?.click()}
            >
              Choose file
            </button>
          </>
        </SetRow>
      </SetCard>
    </>
  );
}

function ExportSettings({ items }: { items: CatalogItem[] }) {
  const sales = useMemo(() => loadLocalSales(), []);
  const customers = loadCustomers();
  const [status, setStatus] = useState("");

  function exportSales() {
    const today = new Date().toISOString().slice(0, 10);
    const rows = sales.filter((sale) => sale.paidAt.slice(0, 10) === today);
    const source = rows.length ? rows : sales;
    downloadText(
      `sales-${today}.csv`,
      toCsv([
        ["ticket", "paidAt", "tender", "total_naira", "cashier", "loyalty"],
        ...source.map((sale) => [
          sale.ticketId,
          sale.paidAt,
          sale.tender,
          (sale.totalMinor / 100).toFixed(2),
          sale.cashierName,
          sale.loyaltyNumber ?? "",
        ]),
      ]),
    );
    setStatus(
      `Exported ${source.length} sale${source.length === 1 ? "" : "s"}${rows.length ? " from today" : " (all stored)"}.`,
    );
  }

  function exportItems() {
    downloadText(
      "items.csv",
      toCsv([
        ["sku", "barcode", "name", "category", "price", "onhand"],
        ...items.map((item) => [
          item.sku,
          item.barcode,
          item.name,
          item.category,
          (item.priceMinor / 100).toFixed(2),
          item.onHand,
        ]),
      ]),
    );
    setStatus(`Exported ${items.length} items.`);
  }

  function exportCustomers() {
    downloadText(
      "customers.csv",
      toCsv([
        ["name", "phone", "email"],
        ...customers.map((row: CustomerRecord) => [row.name, row.phone, row.email]),
      ]),
    );
    setStatus(`Exported ${customers.length} customers.`);
  }

  return (
    <>
      <p className="set-lede">
        Download what this till holds. Today’s sales export falls back to the
        full archive if nothing has closed today.
      </p>
      <LiveNote>
        {status ||
          `${sales.length} sales · ${items.length} items · ${customers.length} customers ready to download.`}
      </LiveNote>
      <SetCard title="Download">
        <SetRow label="Export today’s sales?">
          <button type="button" className="set-text-btn" onClick={exportSales}>
            Export
          </button>
        </SetRow>
        <SetRow label="Export the item list?">
          <button type="button" className="set-text-btn" onClick={exportItems}>
            Export
          </button>
        </SetRow>
        <SetRow label="Export customers?">
          <button type="button" className="set-text-btn" onClick={exportCustomers}>
            Export
          </button>
        </SetRow>
      </SetCard>
    </>
  );
}
