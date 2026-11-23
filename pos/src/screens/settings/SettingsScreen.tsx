import { useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Bell,
  Bookmark,
  Boxes,
  CreditCard,
  Database,
  FileText,
  Heart,
  HelpCircle,
  Keyboard,
  LayoutGrid,
  Network,
  Palette,
  Percent,
  Plug,
  Printer,
  RotateCcw,
  ScanBarcode,
  Shield,
  Store,
  Tag,
} from "lucide-react";
import type { CatalogItem } from "../../lib/types";
import type { StaffUser } from "../../lib/staff";
import { TillKeysSettings } from "./TillKeysSettings";
import { LoyaltyHub } from "./LoyaltyPages";
import { SecuritySettings } from "./SecuritySettings";
import {
  CategoriesSettings,
  DataSyncSettings,
  GeneralSettings,
  HelpSettings,
  IntegrationsSettings,
  InvoiceSettings,
  NotificationsSettings,
  OrganizationSettings,
} from "./MoreSettingsPages";
import {
  BarcodeSettings,
  HoldsSettings,
  PaymentsSettings,
  PrintingSettings,
  ReceiptSettings,
  RefundsSettings,
  SalesSettings,
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
  | "branding"
  | "payments"
  | "sales"
  | "holds"
  | "refunds"
  | "security"
  | "help"
  | "general"
  | "categories"
  | "invoice"
  | "notifications"
  | "data"
  | "integrations"
  | "organization";

type Props = {
  items: CatalogItem[];
  staff: StaffUser;
  onLockTerminal: () => void;
  onBack: () => void;
};

const TILES: { id: Page; label: string; icon: typeof Boxes }[] = [
  { id: "keys", label: "Till keys", icon: Keyboard },
  { id: "barcode", label: "Barcode", icon: ScanBarcode },
  { id: "sales", label: "Sales", icon: Tag },
  { id: "holds", label: "Holds", icon: Bookmark },
  { id: "refunds", label: "Refunds", icon: RotateCcw },
  { id: "tax", label: "Tax", icon: Percent },
  { id: "stock", label: "Stock", icon: Boxes },
  { id: "loyalty", label: "Loyalty", icon: Heart },
  { id: "printing", label: "Printing", icon: Printer },
  { id: "receipt", label: "Receipt", icon: FileText },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "security", label: "Security", icon: Shield },
  { id: "help", label: "Help & Training", icon: HelpCircle },
  { id: "general", label: "General", icon: Store },
  { id: "branding", label: "Receipt branding", icon: Palette },
  { id: "invoice", label: "Invoices", icon: FileText },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "categories", label: "Categories & display", icon: LayoutGrid },
  { id: "data", label: "Data & Sync", icon: Database },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "organization", label: "Organization", icon: Network },
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
  branding: "Receipt branding",
  payments: "Payments",
  sales: "Sales",
  holds: "Holds",
  refunds: "Refunds",
  security: "Security",
  help: "Help & Training",
  general: "General",
  categories: "Categories & display",
  invoice: "Invoices",
  notifications: "Notifications",
  data: "Data & Sync",
  integrations: "Integrations",
  organization: "Organization",
};

export function SettingsScreen({
  items,
  staff,
  onLockTerminal,
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
          {page === "sales" && <SalesSettings />}
          {page === "holds" && <HoldsSettings />}
          {page === "refunds" && <RefundsSettings />}
          {page === "tax" && <TaxSettings />}
          {page === "stock" && <StockSettings items={items} />}
          {page === "printing" && <PrintingSettings />}
          {page === "receipt" && <ReceiptSettings />}
          {page === "branding" && <ReceiptSettings />}
          {page === "payments" && <PaymentsSettings />}
          {page === "security" && (
            <SecuritySettings staff={staff} onLockTerminal={onLockTerminal} />
          )}
          {page === "help" && <HelpSettings />}
          {page === "general" && <GeneralSettings />}
          {page === "categories" && <CategoriesSettings />}
          {page === "invoice" && <InvoiceSettings />}
          {page === "notifications" && <NotificationsSettings />}
          {page === "data" && <DataSyncSettings />}
          {page === "integrations" && <IntegrationsSettings />}
          {page === "organization" && <OrganizationSettings />}
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
