import { useState } from "react";
import { toast } from "sonner";
import { apiUrl } from "../../lib/api-base";
import { pullHqOrgSnapshot } from "../../lib/hq-settings-sync";
import { loadCachedHqOrg } from "../../lib/hq-org";
import { resetTerminalState } from "../../lib/reset";
import { loadTills } from "../../lib/tills";
import { findTill } from "../../lib/tills";
import type { StoreSettings } from "../../lib/store-settings";
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

export function GeneralSettings() {
  const [settings, patch] = useSettings();
  return (
    <>
      <p className="set-lede">
        Store and company details printed on receipts and shown at sign-in. HQ
        values refresh automatically while this terminal is connected.
      </p>
      <LiveNote>
        {settings.storeName || "Your store"} · {settings.currency} ·{" "}
        {settings.receiptLocation || "branch not set"}
      </LiveNote>
      <SetCard title="Store details">
        <SetRow label="Store name">
          <TextField value={settings.storeName} onChange={(storeName) => patch({ storeName })} />
        </SetRow>
        <SetRow label="Address">
          <AreaField value={settings.storeAddress} onChange={(storeAddress) => patch({ storeAddress })} />
        </SetRow>
        <SetRow label="Phone">
          <TextField value={settings.storePhone} onChange={(storePhone) => patch({ storePhone })} />
        </SetRow>
        <SetRow label="Email">
          <TextField value={settings.storeEmail} onChange={(storeEmail) => patch({ storeEmail })} />
        </SetRow>
        <SetRow label="TIN">
          <TextField value={settings.storeTin} onChange={(storeTin) => patch({ storeTin })} />
        </SetRow>
        <SetRow label="Opening hours" hint="Printed in the receipt footer when set">
          <TextField value={settings.storeHours} onChange={(storeHours) => patch({ storeHours })} />
        </SetRow>
        <SetRow label="Currency">
          <TextField
            value={settings.currency}
            width={90}
            onChange={(currency) => patch({ currency: currency.toUpperCase() })}
          />
        </SetRow>
      </SetCard>
      <SetCard title="Company / legal details">
        <SetRow label="Legal name">
          <TextField
            value={settings.companyLegalName}
            onChange={(companyLegalName) => patch({ companyLegalName })}
          />
        </SetRow>
        <SetRow label="Company email">
          <TextField
            value={settings.companyEmail}
            onChange={(companyEmail) => patch({ companyEmail })}
          />
        </SetRow>
        <SetRow label="RC number">
          <TextField value={settings.companyRc} onChange={(companyRc) => patch({ companyRc })} />
        </SetRow>
        <SetRow label="State">
          <TextField value={settings.companyState} onChange={(companyState) => patch({ companyState })} />
        </SetRow>
      </SetCard>
    </>
  );
}

export function CategoriesSettings() {
  const [settings, patch] = useSettings();
  return (
    <>
      <p className="set-lede">
        Controls for the item grid on Home and Items. Changes appear on the next
        visit to the product screen.
      </p>
      <SetCard title="Category display">
        <SetRow label="Hide categories with no available items?">
          <Toggle
            on={settings.hideEmptyCategories}
            onChange={(hideEmptyCategories) => patch({ hideEmptyCategories })}
          />
        </SetRow>
        <SetRow label="Sort category chips A–Z?">
          <Toggle
            on={settings.sortCategoriesAz}
            onChange={(sortCategoriesAz) => patch({ sortCategoriesAz })}
          />
        </SetRow>
        <SetRow label="Show uncategorised items?">
          <Toggle
            on={settings.allowUncategorized}
            onChange={(allowUncategorized) => patch({ allowUncategorized })}
          />
        </SetRow>
        <SetRow
          label="Show category on kitchen tickets?"
          hint="Shows each line's catalogue category on kitchen tickets when the item is found"
        >
          <Toggle
            on={settings.showCategoryOnKitchen}
            onChange={(showCategoryOnKitchen) => patch({ showCategoryOnKitchen })}
          />
        </SetRow>
        <SetRow label="Hidden categories" hint="Comma-separated category names">
          <TextField
            width={320}
            value={settings.hiddenCategories.join(", ")}
            onChange={(value) =>
              patch({
                hiddenCategories: value
                  .split(",")
                  .map((name) => name.trim())
                  .filter(Boolean),
              })
            }
          />
        </SetRow>
      </SetCard>
    </>
  );
}

export function InvoiceSettings() {
  const [settings, patch] = useSettings();
  return (
    <>
      <p className="set-lede">
        Ticket numbering on this till. The prefix and next number are used by
        every completed sale. Invoice output preferences below are stored for HQ
        use and do not change this till's behaviour.
      </p>
      <LiveNote>
        Next ticket: {settings.invoicePrefix}-{String(settings.nextInvoiceNumber).padStart(4, "0")}
      </LiveNote>
      <SetCard title="Invoices">
        <SetRow label="Invoice / ticket prefix">
          <TextField
            width={110}
            value={settings.invoicePrefix}
            onChange={(invoicePrefix) => patch({ invoicePrefix })}
          />
        </SetRow>
        <SetRow label="Next invoice number">
          <NumField
            value={settings.nextInvoiceNumber}
            step={1}
            min={1}
            onChange={(nextInvoiceNumber) =>
              patch({ nextInvoiceNumber: Math.max(1, Math.round(nextInvoiceNumber)) })
            }
          />
        </SetRow>
        <SetRow label="Show VAT breakdown?" hint="Receipt and tax settings use this value">
          <Toggle
            on={settings.includeVatBreakdown}
            onChange={(includeVatBreakdown) => patch({ includeVatBreakdown })}
          />
        </SetRow>
      </SetCard>
      <SetCard title="Stored invoice preferences (HQ use)">
        <p className="set-lede">
          Saved on this terminal for HQ; they do not print, email, or mark sales
          paid by themselves.
        </p>
        <SetRow label="Print an invoice after a sale?">
          <Toggle
            on={settings.autoPrintInvoice}
            onChange={(autoPrintInvoice) => patch({ autoPrintInvoice })}
          />
        </SetRow>
        <SetRow label="Email a copy to the customer?">
          <Toggle
            on={settings.emailInvoiceCopy}
            onChange={(emailInvoiceCopy) => patch({ emailInvoiceCopy })}
          />
        </SetRow>
        <SetRow label="Mark the sale paid on this till?">
          <Toggle
            on={settings.markPaidOnTill}
            onChange={(markPaidOnTill) => patch({ markPaidOnTill })}
          />
        </SetRow>
        <SetRow label="Show the customer on the invoice?">
          <Toggle
            on={settings.invoiceShowCustomer}
            onChange={(invoiceShowCustomer) => patch({ invoiceShowCustomer })}
          />
        </SetRow>
      </SetCard>
    </>
  );
}

export function NotificationsSettings() {
  const [settings, patch] = useSettings();
  return (
    <>
      <p className="set-lede">
        Local alerts and print notifications on this terminal. These are stored
        preferences and do not send messages by themselves.
      </p>
      <SetCard title="Alerts">
        <SetRow label="Warn when stock reaches the low-stock level?">
          <Toggle
            on={settings.lowStockAlert}
            onChange={(lowStockAlert) => patch({ lowStockAlert })}
          />
        </SetRow>
        <SetRow label="Beep when a held order is recalled?">
          <Toggle
            on={settings.soundOnHoldRecall}
            onChange={(soundOnHoldRecall) => patch({ soundOnHoldRecall })}
          />
        </SetRow>
        <SetRow label="Notify the printer after a sale?">
          <Toggle
            on={settings.autoPrintReceipt}
            onChange={(autoPrintReceipt) => patch({ autoPrintReceipt })}
          />
        </SetRow>
        <SetRow label="Print a refund slip automatically?">
          <Toggle
            on={settings.autoPrintRefund}
            onChange={(autoPrintRefund) => patch({ autoPrintRefund })}
          />
        </SetRow>
      </SetCard>
    </>
  );
}

export function DataSyncSettings() {
  const [settings, patch] = useSettings();
  const [busy, setBusy] = useState(false);

  async function syncNow() {
    setBusy(true);
    try {
      await pullHqOrgSnapshot();
      toast.success("HQ settings pulled to this terminal.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reach HQ.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <p className="set-lede">
        Sync cadence, local data, and connection details. Sales are queued
        locally when HQ is unreachable and retried automatically.
      </p>
      <SetCard title="HQ connection">
        <SetRow label="API base URL">
          <span className="set-muted">{apiUrl("/").replace(/\/$/, "") || "same origin"}</span>
        </SetRow>
        <SetRow label="Sync mode">
          <SelectField
            value={settings.syncMode}
            onChange={(mode) => patch({ syncMode: mode as StoreSettings["syncMode"] })}
            options={[
              { value: "daily", label: "Daily" },
              { value: "realtime", label: "Real time" },
            ]}
          />
        </SetRow>
        <SetRow label="Pull HQ settings now">
          <button type="button" className="set-text-btn" disabled={busy} onClick={() => void syncNow()}>
            {busy ? "Syncing…" : "Sync now"}
          </button>
        </SetRow>
      </SetCard>
      <SetCard title="Local data">
        <SetRow
          label="Price Check sync preference"
          hint="Stored on this till only — Price Check reads /api/catalog/stream directly."
        >
          <Toggle
            on={settings.syncPriceCheck}
            onChange={(syncPriceCheck) => patch({ syncPriceCheck })}
          />
        </SetRow>
        <SetRow label="Export local data" hint="Downloads store settings as JSON">
          <button
            type="button"
            className="set-text-btn"
            onClick={() => {
              const blob = new Blob([JSON.stringify(settings, null, 2)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const anchor = document.createElement("a");
              anchor.href = url;
              anchor.download = `pos-settings-${new Date().toISOString().slice(0, 10)}.json`;
              anchor.click();
              URL.revokeObjectURL(url);
              toast.success("Settings exported.");
            }}
          >
            Download JSON
          </button>
        </SetRow>
        <SetRow label="Reset this terminal" hint="Clears local till data and settings; HQ data is untouched">
          <button
            type="button"
            className="set-text-btn set-danger"
            onClick={() => {
              if (window.confirm("Reset this terminal's local data? This cannot be undone.")) {
                resetTerminalState();
                window.location.reload();
              }
            }}
          >
            Reset local data
          </button>
        </SetRow>
      </SetCard>
    </>
  );
}

export function IntegrationsSettings() {
  const [settings] = useSettings();
  const status = (on: boolean) => (on ? "On (from HQ)" : "Off (from HQ)");
  return (
    <>
      <p className="set-lede">
        Accounting, storefront, and gateway status cached from HQ. These values
        refresh automatically and are read-only here — this build does not run
        an integration or submit e-invoices from the till.
      </p>
      <SetCard title="Accounting & tax">
        <SetRow label="QuickBooks">
          <span className="set-muted">{status(settings.quickbooks)}</span>
        </SetRow>
        <SetRow label="Sage">
          <span className="set-muted">{status(settings.sage)}</span>
        </SetRow>
        <SetRow label="Zoho">
          <span className="set-muted">{status(settings.zoho)}</span>
        </SetRow>
        <SetRow
          label="Tax identity fields (HQ)"
          hint="Receipt display follows Show tax identity on receipt in Tax settings"
        >
          <span className="set-muted">{status(settings.firs)}</span>
        </SetRow>
        <SetRow label="Include service charge in exports?">
          <span className="set-muted">{status(settings.includeServiceInExport)}</span>
        </SetRow>
      </SetCard>
      <SetCard title="Storefront">
        <SetRow label="Storefront enabled?">
          <span className="set-muted">{status(settings.storefrontEnabled)}</span>
        </SetRow>
        <SetRow label="Storefront URL">
          <span className="set-muted">{settings.storefrontUrl || "—"}</span>
        </SetRow>
        <SetRow label="Sync prices?">
          <span className="set-muted">{status(settings.storefrontSyncPrices)}</span>
        </SetRow>
        <SetRow label="Sync stock?">
          <span className="set-muted">{status(settings.storefrontSyncStock)}</span>
        </SetRow>
      </SetCard>
      <SetCard title="Payment gateways">
        <SetRow label="Paystack">
          <span className="set-muted">{status(settings.gatewayPaystack)}</span>
        </SetRow>
        <SetRow label="Moniepoint">
          <span className="set-muted">{status(settings.gatewayMoniepoint)}</span>
        </SetRow>
        <SetRow label="Flutterwave">
          <span className="set-muted">{status(settings.gatewayFlutterwave)}</span>
        </SetRow>
        <SetRow label="Default gateway">
          <span className="set-muted">{settings.gatewayDefault}</span>
        </SetRow>
      </SetCard>
    </>
  );
}

export function OrganizationSettings() {
  const [settings, patch] = useSettings();
  const org = loadCachedHqOrg();
  const tills = loadTills();
  const active = findTill(settings.activeTillId) ?? tills[0];
  return (
    <>
      <p className="set-lede">
        Organisation and connection details cached from HQ. Change company details
        in the web workspace; this page shows the last synced snapshot.
      </p>
      <LiveNote>
        {apiUrl("/").replace(/\/$/, "") || "same origin"} ·{" "}
        {org ? "HQ snapshot available" : "No HQ snapshot yet"}
      </LiveNote>
      <SetCard title="Organisation">
        <SetRow label="Company">{org?.company.name || settings.storeName || "—"}</SetRow>
        <SetRow label="Legal name">{org?.company.legalName || settings.companyLegalName || "—"}</SetRow>
        <SetRow label="RC / TIN">
          {org ? `${org.company.rc || "—"} / ${org.company.tin || "—"}` : "—"}
        </SetRow>
        <SetRow label="Branches cached">{String(org?.branches.length ?? 0)}</SetRow>
        <SetRow label="Stores cached">{String(org?.stores.length ?? 0)}</SetRow>
      </SetCard>
      <SetCard title="This terminal">
        <SetRow label="Active till">
          <SelectField
            value={settings.activeTillId}
            onChange={(activeTillId) => patch({ activeTillId })}
            options={tills.map((till) => ({
              value: till.id,
              label: till.name || till.id,
            }))}
          />
        </SetRow>
        <SetRow label="Till name">{active?.name || "This device"}</SetRow>
        <SetRow label="Branch">{active?.branchId || "—"}</SetRow>
        <SetRow label="Paired">{active?.paired ? "Yes" : "No"}</SetRow>
      </SetCard>
    </>
  );
}

const GUIDES: { title: string; steps: string[] }[] = [
  {
    title: "Cashier basics",
    steps: [
      "Sign in with your till PIN or username and password.",
      "Open a shift when prompted, then pick a category and tap items to add them.",
      "Review the order on the right, choose a tender, and press Charge.",
      "Hand over the receipt and press New order for the next customer.",
    ],
  },
  {
    title: "Barcode scanning",
    steps: [
      "Click the search bar on Home or Items and scan the product code.",
      "A matching item is added to the order; a short tone confirms the match.",
      "Settings → Barcode controls the minimum length, prefix, zeros, and manual entry.",
    ],
  },
  {
    title: "PINs and unlocking",
    steps: [
      "Settings → Security lets a staff member set or clear a PIN with their current password or supervisor PIN.",
      "A supervisor PIN is required for discounts, refunds, price overrides, and reports when that policy is on.",
      "Use Lock terminal to return to login without closing the till.",
    ],
  },
  {
    title: "Refunds",
    steps: [
      "Open Saved or the paid receipt and choose Refund.",
      "Select the lines and quantity, then enter a reason.",
      "A supervisor authorises the refund when the policy is enabled.",
    ],
  },
  {
    title: "Receipts and printers",
    steps: [
      "Settings → Printing detects Windows printers; assign Receipt, Kitchen, and Label roles.",
      "Use Test to check the receipt printer before a busy shift.",
      "Settings → Receipt previews the slip and prints a copy on demand.",
    ],
  },
  {
    title: "Held orders",
    steps: [
      "Press Hold on the order panel and give the order a name.",
      "Recall it from Saved on this or another till.",
      "Expired holds are removed automatically only when that option is on.",
    ],
  },
  {
    title: "Loyalty",
    steps: [
      "At payment, enter the customer's card or phone number when prompted.",
      "Points earned and the new balance print on the receipt.",
      "Members and cards are managed under Settings → Loyalty.",
    ],
  },
  {
    title: "HQ sync",
    steps: [
      "Settings → Data & Sync shows the API connection and sync mode.",
      "Press Sync now to pull the latest company, tax, and receipt settings.",
      "Sales made offline are queued locally and retried automatically.",
    ],
  },
];

export function HelpSettings() {
  return (
    <>
      <p className="set-lede">
        Quick local guides for the cashier workflow. No internet connection is
        needed to read them.
      </p>
      {GUIDES.map((guide) => (
        <SetCard key={guide.title} title={guide.title}>
          {guide.steps.map((step, index) => (
            <SetRow key={step} label={`${index + 1}. ${step}`}>
              <span className="set-muted">Guide</span>
            </SetRow>
          ))}
        </SetCard>
      ))}
    </>
  );
}
