import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { CatalogItem } from "../../lib/types";
import { computeTotals, formatMoney } from "../../lib/types";
import {
  type StockMode,
  type StoreSettings,
} from "../../lib/store-settings";
import { formatReceiptText, printReceipt, type SaleReceipt } from "../../lib/receipt";
import {
  applyHqOrg,
  clearTaxOverrides,
  getPinnedTaxFields,
  loadCachedHqOrg,
  pinTaxFields,
} from "../../lib/hq-org";
import { loadDeviceTill } from "../../lib/tills";
import { ReceiptVisual } from "../../components/receipt/ReceiptVisual";
import {
  detectPrinters,
  loadPrinterConfig,
  savePrinterConfig,
  sendToPrinter,
  type DetectedPrinter,
  type PrinterConfig,
} from "../../lib/printers";
import {
  AreaField,
  LiveNote,
  NumField,
  SelectField,
  SetCard,
  SetRow,
  TextField,
  TickGroup,
  Toggle,
  useSettings,
} from "./settings-ui";

export function BarcodeSettings() {
  const [settings, patch] = useSettings();

  return (
    <>
      <p className="set-lede">
        These rules apply the moment a cashier scans or types a barcode on Items.
        Change a control and the next scan on this till uses it.
      </p>
      <LiveNote>
        Scans shorter than {settings.barcodeMinLength} characters are rejected as
        empty.{" "}
        {settings.barcodeBeep ? "A beep plays on a match." : "No beep."}{" "}
        {settings.barcodeAllowManual
          ? "Typing in search can add the item."
          : "Only the scan bar can add by code."}
      </LiveNote>
      <SetCard title="Scanner">
        <SetRow label="Beep when a barcode is found?" hint="Plays a short tone after a match on this till">
          <Toggle
            on={settings.barcodeBeep}
            onChange={(barcodeBeep) => patch({ barcodeBeep })}
          />
        </SetRow>
        <SetRow
          label="Require a barcode before an item can be sold?"
          hint="Blocks products that have no barcode on Home and Items"
        >
          <Toggle
            on={settings.requireBarcode}
            onChange={(requireBarcode) => patch({ requireBarcode })}
          />
        </SetRow>
        <SetRow
          label="Allow adding an item by typing the code?"
          hint="Off: search only filters the grid. The scan bar still adds."
        >
          <Toggle
            on={settings.barcodeAllowManual}
            onChange={(barcodeAllowManual) => patch({ barcodeAllowManual })}
          />
        </SetRow>
        <SetRow label="Strip leading zeros from scans?" hint="Useful when the scanner pads EAN codes">
          <Toggle
            on={settings.barcodeStripZeros}
            onChange={(barcodeStripZeros) => patch({ barcodeStripZeros })}
          />
        </SetRow>
        <SetRow
          label="Strip this prefix from every scan"
          hint="Leave blank if the scanner sends the raw code"
        >
          <TextField
            value={settings.barcodePrefix}
            onChange={(barcodePrefix) => patch({ barcodePrefix })}
            width={140}
            placeholder="e.g. A"
          />
        </SetRow>
        <SetRow label="Minimum characters before a scan is accepted">
          <NumField
            value={settings.barcodeMinLength}
            step={1}
            min={1}
            onChange={(barcodeMinLength) =>
              patch({ barcodeMinLength: Math.max(1, Math.round(barcodeMinLength)) })
            }
          />
        </SetRow>
        <SetRow label="Scanner sends this key after a scan">
          <SelectField
            value={settings.barcodeSuffix}
            onChange={(barcodeSuffix) =>
              patch({ barcodeSuffix: barcodeSuffix as StoreSettings["barcodeSuffix"] })
            }
            options={[
              { value: "enter", label: "Enter" },
              { value: "tab", label: "Tab" },
              { value: "none", label: "None" },
            ]}
          />
        </SetRow>
      </SetCard>
    </>
  );
}

export function TaxSettings() {
  const [settings, patch] = useSettings();
  const pinned = getPinnedTaxFields();

  const patchApplyVat = (applyVat: boolean) => {
    pinTaxFields(["applyVat"]);
    patch({ applyVat });
  };
  const patchVatPercent = (vatPercent: number) => {
    pinTaxFields(["vatPercent"]);
    patch({ vatPercent });
  };
  const patchIncludeVat = (pricesIncludeVat: boolean) => {
    pinTaxFields(["pricesIncludeVat"]);
    patch({ pricesIncludeVat });
  };
  const patchBreakdown = (includeVatBreakdown: boolean) => {
    pinTaxFields(["includeVatBreakdown", "receiptShowTax"]);
    patch({ includeVatBreakdown });
  };
  const patchServiceCharge = (applyServiceCharge: boolean) => {
    pinTaxFields(["applyServiceCharge"]);
    patch({ applyServiceCharge });
  };
  const patchServicePercent = (servicePercent: number) => {
    pinTaxFields(["servicePercent"]);
    patch({ servicePercent });
  };

  const restoreWebDefaults = () => {
    clearTaxOverrides();
    const cached = loadCachedHqOrg();
    if (cached) {
      applyHqOrg(cached, loadDeviceTill());
    } else {
      patch({});
    }
  };

  return (
    <>
      <p className="set-lede">
        Nigerian VAT and optional service charge. Totals on Current Order and the
        receipt update as soon as you change a rate or toggle.
      </p>
      <LiveNote>
        {settings.applyVat
          ? `VAT is applied on every sale at the default ${settings.vatPercent}%.`
          : "VAT is off on this terminal — sales leave VAT-free."}{" "}
        Products with their own dashboard rate override the default; 0% items
        are VAT-exempt.{" "}
        {settings.firs
          ? "FIRS e-invoice fields (TIN, legal name) go on the slip."
          : "FIRS e-invoicing is off."}
        {pinned.size
          ? " Changes you make here apply on this terminal at once and stay until the web dashboard changes that value."
          : " Changes made on the web dashboard flow here in real time."}
      </LiveNote>
      {pinned.size ? (
        <SetRow
          label="Held on this terminal"
          hint="Your values stay until the web dashboard changes one of these fields"
        >
          <button type="button" className="set-text-btn" onClick={restoreWebDefaults}>
            Take dashboard values now
          </button>
        </SetRow>
      ) : null}
      <SetCard title="VAT">
        <SetRow label="Apply VAT on sales?" hint="Off makes this till VAT-free. Products with their own dashboard rate are taxed only while this is on.">
          <Toggle
            on={settings.applyVat}
            onChange={(applyVat) => patchApplyVat(applyVat)}
          />
        </SetRow>
        <SetRow label="How much VAT should be added?" hint="FIRS standard rate is 7.5% — the default for products without their own rate">
          <NumField
            value={settings.vatPercent}
            step={0.5}
            onChange={(vatPercent) => patchVatPercent(Math.max(0, vatPercent))}
          />
        </SetRow>
        <SetRow
          label="Prices already include VAT?"
          hint="On: VAT is extracted from the shelf price. Off: VAT is added on top."
        >
          <Toggle
            on={settings.pricesIncludeVat}
            onChange={(pricesIncludeVat) => patchIncludeVat(pricesIncludeVat)}
          />
        </SetRow>
        <SetRow label="Print the VAT breakdown on the receipt?">
          <Toggle
            on={settings.includeVatBreakdown}
            onChange={(includeVatBreakdown) => patchBreakdown(includeVatBreakdown)}
          />
        </SetRow>
        <SetRow label="Show TIN on the receipt?">
          <Toggle
            on={settings.showTinOnReceipt}
            onChange={(showTinOnReceipt) => patch({ showTinOnReceipt })}
          />
        </SetRow>
        <SetRow label="Submit FIRS e-invoices for VAT?" hint="Uses company TIN and legal name">
          <Toggle on={settings.firs} onChange={(firs) => patch({ firs })} />
        </SetRow>
      </SetCard>
      <SetCard title="Service charge">
        <SetRow label="Add a service charge on every ticket?">
          <Toggle
            on={settings.applyServiceCharge}
            onChange={(applyServiceCharge) => patchServiceCharge(applyServiceCharge)}
          />
        </SetRow>
        <SetRow label="How much service charge should be added?">
          <NumField
            value={settings.servicePercent}
            step={0.5}
            onChange={(servicePercent) =>
              patchServicePercent(Math.max(0, servicePercent))
            }
          />
        </SetRow>
        <SetRow label="Include service charge when exporting to accounts?">
          <Toggle
            on={settings.includeServiceInExport}
            onChange={(includeServiceInExport) => patch({ includeServiceInExport })}
          />
        </SetRow>
      </SetCard>
    </>
  );
}

export function StockSettings({ items }: { items: CatalogItem[] }) {
  const [settings, patch] = useSettings();
  const out = items.filter((item) => item.onHand <= 0).length;
  const low = items.filter(
    (item) => item.onHand > 0 && item.onHand <= settings.lowStockQty,
  ).length;

  return (
    <>
      <p className="set-lede">
        Choose where this till reads stock, whether sold-out items appear on the
        grid, and whether a sale reduces on-hand immediately.
      </p>
      <LiveNote>
        Reading <strong>{settings.stockMode}</strong> · {items.length} items on this till ·{" "}
        {out} out of stock · {low} at or below the low-stock level ({settings.lowStockQty}).{" "}
        {settings.showOutOfStock
          ? "Sold-out products stay on the grid."
          : "Sold-out products are hidden now."}{" "}
        {settings.trackStockOnTill
          ? "Each sale reduces on-hand."
          : "Sales do not change on-hand."}
      </LiveNote>
      <SetCard title="Source">
        <SetRow
          label="Where should this till read stock from?"
          hint="Online uses HQ. Offline uses the till copy. Both tries HQ then falls back."
        >
          <TickGroup<StockMode>
            value={settings.stockMode}
            onChange={(stockMode) => patch({ stockMode })}
            options={[
              { id: "online", label: "Online" },
              { id: "offline", label: "Offline" },
              { id: "both", label: "Both" },
            ]}
          />
        </SetRow>
        <SetRow label="Push price changes to Price Check live?">
          <Toggle
            on={settings.syncPriceCheck}
            onChange={(syncPriceCheck) => patch({ syncPriceCheck })}
          />
        </SetRow>
      </SetCard>
      <SetCard title="On the till">
        <SetRow label="Show out-of-stock items on Home and Items?">
          <Toggle
            on={settings.showOutOfStock}
            onChange={(showOutOfStock) => patch({ showOutOfStock })}
          />
        </SetRow>
        <SetRow
          label="Track stock when an item is sold?"
          hint="On: on-hand drops as soon as payment succeeds"
        >
          <Toggle
            on={settings.trackStockOnTill}
            onChange={(trackStockOnTill) => patch({ trackStockOnTill })}
          />
        </SetRow>
        <SetRow
          label="Block selling more than is on hand?"
          hint="Cashier sees a notice instead of adding the extra unit"
        >
          <Toggle
            on={settings.blockNegativeStock}
            onChange={(blockNegativeStock) => patch({ blockNegativeStock })}
          />
        </SetRow>
        <SetRow label="Warn when stock is at or below this quantity?">
          <Toggle
            on={settings.lowStockAlert}
            onChange={(lowStockAlert) => patch({ lowStockAlert })}
          />
        </SetRow>
        <SetRow label="Low-stock quantity">
          <NumField
            value={settings.lowStockQty}
            step={1}
            min={0}
            onChange={(lowStockQty) =>
              patch({ lowStockQty: Math.max(0, Math.round(lowStockQty)) })
            }
          />
        </SetRow>
        <SetRow label="Restock items when a refund is posted?">
          <Toggle
            on={settings.restockOnRefund}
            onChange={(restockOnRefund) => patch({ restockOnRefund })}
          />
        </SetRow>
      </SetCard>
    </>
  );
}

export function LoyaltySettings() {
  const [settings, patch] = useSettings();

  return (
    <>
      <p className="set-lede">
        Asked after a tender is chosen, before the payment overlay. Turn it off
        and the till skips the card prompt on the next sale.
      </p>
      <LiveNote>
        {settings.loyaltyEnabled
          ? `Loyalty prompt is on (${
              settings.loyaltyPrompt === "card"
                ? "card only"
                : settings.loyaltyPrompt === "phone"
                  ? "phone only"
                  : "card or phone"
            }, min ${settings.loyaltyMinDigits} digits).`
          : "Loyalty prompt is off — payment goes straight through."}{" "}
        (1 point per ₦{settings.loyaltyEarnNaira}). Redeem value {formatMoney(settings.loyaltyRedeemMinor)}{" "}
        per point.
      </LiveNote>
      <SetCard title="Prompt">
        <SetRow label="Ask for a loyalty card or phone at payment?">
          <Toggle
            on={settings.loyaltyEnabled}
            onChange={(loyaltyEnabled) => patch({ loyaltyEnabled })}
          />
        </SetRow>
        <SetRow label="Allow continue without loyalty?">
          <Toggle
            on={settings.loyaltyAllowSkip}
            onChange={(loyaltyAllowSkip) => patch({ loyaltyAllowSkip })}
          />
        </SetRow>
        <SetRow label="What should the cashier enter?">
          <SelectField
            value={settings.loyaltyPrompt}
            onChange={(loyaltyPrompt) =>
              patch({ loyaltyPrompt: loyaltyPrompt as StoreSettings["loyaltyPrompt"] })
            }
            options={[
              { value: "either", label: "Card or phone" },
              { value: "card", label: "Card only" },
              { value: "phone", label: "Phone only" },
            ]}
          />
        </SetRow>
        <SetRow label="Minimum digits">
          <NumField
            value={settings.loyaltyMinDigits}
            step={1}
            min={4}
            onChange={(loyaltyMinDigits) =>
              patch({ loyaltyMinDigits: Math.max(4, Math.round(loyaltyMinDigits)) })
            }
          />
        </SetRow>
      </SetCard>
      <SetCard title="Points">
        <SetRow
          label="Naira spent per 1 point"
          hint="₦100 means a ₦3,500 ticket earns 35 points"
        >
          <NumField
            value={settings.loyaltyEarnNaira}
            step={10}
            min={1}
            onChange={(loyaltyEarnNaira) =>
              patch({ loyaltyEarnNaira: Math.max(1, Math.round(loyaltyEarnNaira)) })
            }
          />
        </SetRow>
        <SetRow label="Naira value of 1 redeemed point">
          <NumField
            value={settings.loyaltyRedeemMinor / 100}
            step={0.5}
            min={0}
            onChange={(naira) =>
              patch({ loyaltyRedeemMinor: Math.max(0, Math.round(naira * 100)) })
            }
          />
        </SetRow>
        <SetRow
          label="Auto-apply points when a card is entered?"
          hint="Off: points print on the receipt only"
        >
          <Toggle
            on={settings.loyaltyAutoApply}
            onChange={(loyaltyAutoApply) => patch({ loyaltyAutoApply })}
          />
        </SetRow>
      </SetCard>
    </>
  );
}

export function ReceiptSettings() {
  const [settings] = useSettings();
  const sampleLines = [
    {
      id: "sample-coke",
      itemId: "sample-coke",
      name: "COKE 50CL",
      quantity: 1,
      unitPriceMinor: 30000,
      image: "",
      unit: "each",
      unitLabel: "",
    },
    {
      id: "sample-fab",
      itemId: "sample-fab",
      name: "PARLE FAB BISCUIT",
      quantity: 2,
      unitPriceMinor: 12500,
      image: "",
      unit: "each",
      unitLabel: "",
    },
  ];
  const sampleTotalMinor = computeTotals(
    sampleLines.reduce(
      (sum, line) => sum + line.unitPriceMinor * line.quantity,
      0,
    ),
    settings,
  ).totalMinor;
  const sale: SaleReceipt = {
    ticketId: "T-1001",
    paidAt: new Date().toISOString(),
    tender: "cash",
    cashierName: "",
    tillKey: "",
    customerName: "",
    customerPhone: "",
    loyaltyNumber: null,
    loyaltyBalanceBefore: null,
    loyaltyPointsRedeemed: null,
    loyaltyRedeemMinor: null,
    loyaltyPointsEarned: null,
    giftCardCode: "",
    giftCardChargedMinor: null,
    giftCardBalanceAfterMinor: null,
    amountTenderedMinor: 60000,
    changeMinor: Math.max(0, 60000 - sampleTotalMinor),
    discountMinor: 0,
    lines: sampleLines,
    totalMinor: sampleTotalMinor,
  };
  const preview = useMemo(() => formatReceiptText(sale, settings), [settings, sale]);

  function sendPreviewToPrinter() {
    const printer = loadPrinterConfig().receiptPrinter;
    if (!printer) {
      toast.error("Assign a receipt printer in Settings → Printing first.");
      return;
    }
    const id = toast.loading(`Printing preview on ${printer}…`);
    printReceipt(sale)
      .then(() => toast.success(`Preview printed on ${printer}.`, { id }))
      .catch((error) =>
        toast.error(error instanceof Error ? error.message : "Print failed.", { id }),
      );
  }

  function openPopupPreview() {
    const body = preview
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const win = window.open("", "receipt-preview", "width=460,height=840");
    if (!win) {
      toast.error("Pop-ups are blocked. Allow pop-ups for this site to preview the receipt.");
      return;
    }
    win.document.open();
    win.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>Receipt preview</title>` +
        `<style>` +
        `body{margin:0;background:#e5e7eb;display:flex;justify-content:center;padding:24px 0}` +
        `pre{width:72mm;background:#fff;padding:16px 14px;margin:0;font:12px/1.45 'Courier New',Courier,monospace;white-space:pre-wrap;box-shadow:0 6px 24px rgba(0,0,0,.14)}` +
        `</style></head><body><pre>${body}</pre></body></html>`,
    );
    win.document.close();
    win.focus();
  }

  return (
    <>
      <p className="set-lede">
        This till prints the live HQ receipt layout for{" "}
        <strong>{settings.receiptLocation || settings.storeName || "this branch"}</strong>.
        Change header, footer, tax, logo, and fields in the web workspace Settings → Receipts;
        this preview updates as soon as HQ saves.
      </p>
      <LiveNote>
        {settings.receiptPaper} · {settings.receiptTemplate}
        {settings.receiptShowTax ? " · tax on" : " · tax off"}
        {settings.receiptShowLogo ? " · logo on" : " · logo off"}
        {settings.receiptLocation ? ` · ${settings.receiptLocation}` : ""}
      </LiveNote>
      <ReceiptVisual
        settings={settings}
        lines={sampleLines}
        ticketId={sale.ticketId}
        paidAt={sale.paidAt}
        cashier={sale.cashierName}
        till={sale.tillKey ?? ""}
        tender={sale.tender}
        customerName={sale.customerName}
        customerPhone={sale.customerPhone}
        tenderedMinor={sale.amountTenderedMinor ?? undefined}
        changeMinor={sale.changeMinor ?? undefined}
      />
      <SetCard title="Print preview">
        <SetRow
          label="Print the current HQ layout on the receipt printer?"
          hint="Same slip the till sends after a sale"
        >
          <button type="button" className="set-text-btn" onClick={sendPreviewToPrinter}>
            Print preview
          </button>
        </SetRow>
        <SetRow label="See it on screen first?" hint="Opens a pop-up window with the slip">
          <button type="button" className="set-text-btn" onClick={openPopupPreview}>
            Open popup
          </button>
        </SetRow>
      </SetCard>
      <SetCard title="What HQ is sending">
        <SetRow label="Title">{settings.storeName || "—"}</SetRow>
        <SetRow label="Branch">{settings.receiptLocation || "—"}</SetRow>
        <SetRow label="Address">{settings.storeAddress || "—"}</SetRow>
        <SetRow label="Phone">{settings.storePhone || "—"}</SetRow>
        <SetRow label="Email">{settings.storeEmail || "—"}</SetRow>
        <SetRow label="Header note">{settings.receiptHeader || "—"}</SetRow>
        <SetRow label="Footer">{settings.receiptFooter || "—"}</SetRow>
        <SetRow label="Copies after payment">{String(settings.receiptCopies)}</SetRow>
        <SetRow label="Auto-print after payment?">
          {settings.autoPrintReceipt ? "On" : "Off"}
        </SetRow>
      </SetCard>
    </>
  );
}

export function PaymentsSettings() {
  const [settings, patch] = useSettings();
  const shown = [
    settings.payCash && "Cash",
    settings.payCard && "Card",
    settings.payTransfer && "Transfer",
    settings.payWallet && "Wallet",
    settings.paySplit && "Split",
  ].filter(Boolean);

  return (
    <>
      <p className="set-lede">
        Only ticked methods appear on the payment screen. Bank details print on
        Transfer. Wallet copy is shown under Wallet.
      </p>
      <LiveNote>
        Payment screen will show: <strong>{shown.join(", ") || "no methods"}</strong>. Transfer
        pays to {settings.payBankName} {settings.payAccountNumber} ({settings.payAccountName}).
        Cards go through {settings.gatewayDefault}.
      </LiveNote>
      <SetCard title="Methods on this till">
        <SetRow label="Accept cash?">
          <Toggle on={settings.payCash} onChange={(payCash) => patch({ payCash })} />
        </SetRow>
        <SetRow label="Accept credit and debit cards?">
          <Toggle on={settings.payCard} onChange={(payCard) => patch({ payCard })} />
        </SetRow>
        <SetRow label="Accept bank transfer?">
          <Toggle
            on={settings.payTransfer}
            onChange={(payTransfer) => patch({ payTransfer })}
          />
        </SetRow>
        <SetRow label="Accept wallets (OPay, PalmPay, Kuda)?">
          <Toggle on={settings.payWallet} onChange={(payWallet) => patch({ payWallet })} />
        </SetRow>
        <SetRow label="Allow split payments?">
          <Toggle on={settings.paySplit} onChange={(paySplit) => patch({ paySplit })} />
        </SetRow>
      </SetCard>
      <SetCard title="Transfer account">
        <SetRow label="Bank">
          <TextField
            value={settings.payBankName}
            onChange={(payBankName) => patch({ payBankName })}
            width={180}
          />
        </SetRow>
        <SetRow label="Account name">
          <TextField
            value={settings.payAccountName}
            onChange={(payAccountName) => patch({ payAccountName })}
            width={220}
          />
        </SetRow>
        <SetRow label="Account number">
          <TextField
            value={settings.payAccountNumber}
            onChange={(payAccountNumber) => patch({ payAccountNumber })}
            width={160}
          />
        </SetRow>
        <SetRow label="Wallet instruction">
          <AreaField
            value={settings.payWalletHint}
            onChange={(payWalletHint) => patch({ payWalletHint })}
          />
        </SetRow>
      </SetCard>
    </>
  );
}

const PRINTER_ROLES: { role: keyof PrinterConfig; label: string }[] = [
  { role: "receiptPrinter", label: "Receipt" },
  { role: "kitchenPrinter", label: "Kitchen" },
  { role: "labelPrinter", label: "Label" },
];

export function PrintingSettings() {
  const [settings, patch] = useSettings();
  const [detected, setDetected] = useState<DetectedPrinter[]>([]);
  const [config, setConfig] = useState<PrinterConfig>(loadPrinterConfig);
  const [busy, setBusy] = useState(false);

  async function scan() {
    setBusy(true);
    try {
      const list = await detectPrinters();
      setDetected(list);
      setConfig((current) => {
        if (current.receiptPrinter || list.length === 0) return current;
        const fallback = list.find((item) => item.isDefault) ?? list[0];
        const next = { ...current, receiptPrinter: fallback?.name ?? null };
        savePrinterConfig(next);
        return next;
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Scan failed.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void scan();
    const timer = window.setInterval(() => void scan(), 10_000);
    return () => window.clearInterval(timer);
  }, []);

  function assign(role: keyof PrinterConfig, name: string) {
    const next = { ...config, [role]: name || null };
    setConfig(next);
    savePrinterConfig(next);
  }

  function unassign(name: string) {
    const next = { ...config };
    for (const { role } of PRINTER_ROLES) {
      if (next[role] === name) next[role] = null;
    }
    setConfig(next);
    savePrinterConfig(next);
  }

  async function testPrint() {
    const name = config.receiptPrinter;
    if (!name) {
      toast.error("Choose a receipt printer first.");
      return;
    }
    setBusy(true);
    const id = toast.loading(`Sending test slip to ${name}…`);
    try {
      await sendToPrinter(
        name,
        `POS TEST PRINT\n${settings.storeName}\n${settings.storeAddress}\nPaper ${settings.receiptPaper}\nPrinter OK\n`,
        settings.receiptPaper === "58mm" ? 58 : 80,
      );
      toast.success(`Printed on ${name}.`, { id });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Test print failed.", { id });
    } finally {
      setBusy(false);
    }
  }

  const printerOptions = [
    { value: "", label: "None" },
    ...detected.map((printer) => ({
      value: printer.name,
      label: printer.offline ? `${printer.name} (offline)` : printer.name,
    })),
  ];
  const onlineCount = detected.filter((item) => !item.offline).length;

  return (
    <>
      <p className="set-lede">
        Assign Windows printers and how many copies leave the till after a sale.
        The list below refreshes live — connect a printer and it appears here.
      </p>
      <LiveNote>
        Receipt printer: <strong>{config.receiptPrinter ?? "not assigned"}</strong>
        {settings.autoPrintReceipt
          ? ` · auto-prints ${settings.receiptCopies} cop${settings.receiptCopies === 1 ? "y" : "ies"} after payment`
          : " · cashier prints from Paid"}
        {settings.openCashDrawer ? " · cash drawer pulse with the receipt" : ""}.
        {" "}{onlineCount} of {detected.length} printer{detected.length === 1 ? "" : "s"} online.
      </LiveNote>
      <SetCard title="After payment">
        <SetRow label="Auto-print a receipt after payment?">
          <Toggle
            on={settings.autoPrintReceipt}
            onChange={(autoPrintReceipt) => patch({ autoPrintReceipt })}
          />
        </SetRow>
        <SetRow label="Copies">
          <NumField
            value={settings.receiptCopies}
            step={1}
            min={1}
            onChange={(receiptCopies) =>
              patch({ receiptCopies: Math.max(1, Math.round(receiptCopies)) })
            }
          />
        </SetRow>
        <SetRow label="Print a kitchen ticket when the order is sent?">
          <Toggle
            on={settings.printKitchenOnSend}
            onChange={(printKitchenOnSend) => patch({ printKitchenOnSend })}
          />
        </SetRow>
        <SetRow label="Open the cash drawer with the receipt?">
          <Toggle
            on={settings.openCashDrawer}
            onChange={(openCashDrawer) => patch({ openCashDrawer })}
          />
        </SetRow>
        <SetRow label="Paper width">
          <SelectField
            value={settings.receiptPaper}
            onChange={(receiptPaper) =>
              patch({ receiptPaper: receiptPaper as StoreSettings["receiptPaper"] })
            }
            options={[
              { value: "80mm", label: "80 mm" },
              { value: "58mm", label: "58 mm" },
            ]}
          />
        </SetRow>
      </SetCard>
      <SetCard title="Live printers">
        {detected.length === 0 ? (
          <SetRow label="No printers detected">
            <span className="set-muted">
              Install a driver, then press Scan again.
            </span>
          </SetRow>
        ) : (
          detected.map((printer) => {
            const usedBy = PRINTER_ROLES.filter(
              ({ role }) => config[role] === printer.name,
            ).map(({ label }) => label);
            return (
              <SetRow
                key={printer.name}
                label={printer.name}
                hint={`${printer.driver || "driver"} · ${printer.port}`}
              >
                <span className="printer-actions">
                  <span
                    className={
                      printer.offline
                        ? "printer-badge offline"
                        : "printer-badge"
                    }
                  >
                    {printer.offline
                      ? "offline"
                      : printer.isDefault
                        ? "default"
                        : "online"}
                  </span>
                  {usedBy.length > 0 && (
                    <button
                      type="button"
                      className="set-text-btn set-danger"
                      onClick={() => unassign(printer.name)}
                    >
                      Unassign ({usedBy.join("/")})
                    </button>
                  )}
                  {PRINTER_ROLES.map(({ role, label }) =>
                    config[role] === printer.name ? null : (
                      <button
                        key={role}
                        type="button"
                        className="set-text-btn"
                        onClick={() => assign(role, printer.name)}
                      >
                        Use as {label}
                      </button>
                    ),
                  )}
                </span>
              </SetRow>
            );
          })
        )}
      </SetCard>
      <SetCard title="Hardware">
        <SetRow label="Receipt printer">
          <SelectField
            value={config.receiptPrinter ?? ""}
            onChange={(name) => assign("receiptPrinter", name)}
            options={printerOptions}
          />
        </SetRow>
        <SetRow label="Kitchen printer">
          <SelectField
            value={config.kitchenPrinter ?? ""}
            onChange={(name) => assign("kitchenPrinter", name)}
            options={printerOptions}
          />
        </SetRow>
        <SetRow label="Label printer">
          <SelectField
            value={config.labelPrinter ?? ""}
            onChange={(name) => assign("labelPrinter", name)}
            options={printerOptions}
          />
        </SetRow>
        <SetRow label="Scan for installed printers">
          <button
            type="button"
            className="set-text-btn"
            onClick={() => void scan()}
            disabled={busy}
          >
            {busy ? "Scanning…" : "Scan again"}
          </button>
        </SetRow>
        <SetRow label="Send a test print to the receipt printer">
          <button
            type="button"
            className="set-text-btn"
            onClick={() => void testPrint()}
            disabled={busy}
          >
            Test
          </button>
        </SetRow>
      </SetCard>
    </>
  );
}
