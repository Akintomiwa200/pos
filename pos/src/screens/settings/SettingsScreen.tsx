import { useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Boxes,
  CreditCard,
  FileText,
  Heart,
  Keyboard,
  Percent,
  Printer,
  ScanBarcode,
} from "lucide-react";
import type { CatalogItem } from "../../lib/types";
import { TillKeysSettings } from "./TillKeysSettings";
import { LoyaltyHub } from "./LoyaltyPages";
import {
  BarcodeSettings,
  PaymentsSettings,
  PrintingSettings,
  ReceiptSettings,
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
  | "payments";

type Props = {
  items: CatalogItem[];
  onBack: () => void;
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
};

export function SettingsScreen({
  items,
  onBack,
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
      ) : page === "loyalty" ? (
        <LoyaltyHub onBack={() => setPage("hub")} />
      ) : (
        <PageShell title={TITLES[page]} onBack={() => setPage("hub")}>
          {page === "keys" && <TillKeysSettings />}
          {page === "barcode" && <BarcodeSettings />}
          {page === "tax" && <TaxSettings />}
          {page === "stock" && <StockSettings items={items} />}
          {page === "printing" && <PrintingSettings />}
          {page === "receipt" && <ReceiptSettings />}
          {page === "payments" && <PaymentsSettings />}
        </PageShell>
      )}
    </section>
  );
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
