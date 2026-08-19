import { useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Box,
  Boxes,
  CreditCard,
  FileText,
  Heart,
  Keyboard,
  Percent,
  Printer,
  ScanBarcode,
  Settings2,
} from "lucide-react";
import type { CatalogItem } from "../../lib/types";
import { TillKeysSettings } from "./TillKeysSettings";
import { OthersSettings } from "./OthersSettings";
import {
  AccountingAdmin,
  BarcodeSettings,
  CategoriesAdmin,
  HoldAdmin,
  InvoicesAdmin,
  ItemsAdmin,
  LoyaltySettings,
  PaymentsSettings,
  PrintingSettings,
  ReceiptSettings,
  RefundsAdmin,
  StockSettings,
  TaxSettings,
} from "./SettingsPages";

type Page =
  | "hub"
  | "keys"
  | "barcode"
  | "tax"
  | "stock"
  | "loyalty"
  | "printing"
  | "receipt"
  | "payments"
  | "others"
  | "items"
  | "categories"
  | "invoices"
  | "hold"
  | "refunds"
  | "accounting";

type Props = {
  items: CatalogItem[];
  onUpdateItem: (
    id: string,
    patch: { priceMinor?: number; onHand?: number },
  ) => Promise<void>;
  onBack: () => void;
  onOpenTill: () => void;
};

const TILES: { id: Page; label: string; icon: typeof Boxes }[] = [
  { id: "keys", label: "Till keys", icon: Keyboard },
  { id: "barcode", label: "Barcode", icon: ScanBarcode },
  { id: "tax", label: "Tax", icon: Percent },
  { id: "stock", label: "Stock", icon: Boxes },
  { id: "loyalty", label: "Loyalty", icon: Heart },
  { id: "printing", label: "Printing", icon: Printer },
  { id: "receipt", label: "Receipt", icon: FileText },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "items", label: "Items", icon: Box },
  { id: "others", label: "Others", icon: Settings2 },
];

const TITLES: Record<Page, string> = {
  hub: "Settings",
  keys: "Till keys",
  barcode: "Barcode",
  tax: "Tax",
  stock: "Stock",
  loyalty: "Loyalty",
  printing: "Printing",
  receipt: "Receipt",
  payments: "Payments",
  others: "Others",
  items: "Manage items",
  categories: "Manage categories",
  invoices: "Invoices",
  hold: "On hold orders",
  refunds: "Refund receipts",
  accounting: "Accounting",
};

export function SettingsScreen({
  items,
  onUpdateItem,
  onBack,
  onOpenTill,
}: Props) {
  const [page, setPage] = useState<Page>("hub");

  return (
    <section className="settings-full">
      {page === "hub" ? (
        <>
          <header className="settings-head">
            <button className="back" onClick={onBack}>
              <ArrowLeft size={18} /> Back to till
            </button>
            <h1>Settings</h1>
          </header>
          <div className="settings-grid">
            {TILES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className="settings-tile"
                onClick={() => setPage(id)}
              >
                <Icon size={54} strokeWidth={1.7} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <PageShell title={TITLES[page]} onBack={() => setPage(pageFromNested(page))}>
          {page === "keys" && <TillKeysSettings />}
          {page === "barcode" && <BarcodeSettings />}
          {page === "tax" && <TaxSettings />}
          {page === "stock" && <StockSettings items={items} />}
          {page === "loyalty" && <LoyaltySettings />}
          {page === "printing" && <PrintingSettings />}
          {page === "receipt" && <ReceiptSettings />}
          {page === "payments" && <PaymentsSettings />}
          {page === "others" && (
            <OthersSettings
              onOpenTill={onOpenTill}
              items={items}
              onUpdateItem={onUpdateItem}
            />
          )}
          {page === "items" && (
            <ItemsAdmin items={items} onUpdateItem={onUpdateItem} />
          )}
          {page === "categories" && <CategoriesAdmin items={items} />}
          {page === "invoices" && <InvoicesAdmin />}
          {page === "hold" && <HoldAdmin />}
          {page === "refunds" && <RefundsAdmin />}
          {page === "accounting" && <AccountingAdmin />}
        </PageShell>
      )}
    </section>
  );
}

function pageFromNested(page: Page): Page {
  if (
    page === "categories" ||
    page === "invoices" ||
    page === "hold" ||
    page === "refunds" ||
    page === "accounting"
  ) {
    return "others";
  }
  return "hub";
}

function PageShell({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <>
      <header className="settings-head">
        <button className="back" onClick={onBack}>
          <ArrowLeft size={18} /> Settings
        </button>
        <h1>{title}</h1>
      </header>
      <div className="settings-body">{children}</div>
    </>
  );
}
