import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CATEGORIES } from "../../lib/demo";
import type { CatalogItem } from "../../lib/types";
import { computeTotals, formatMoney } from "../../lib/types";
import {
  loyaltyPointsEarned,
  normalizeBarcode,
  type StockMode,
  type StoreSettings,
} from "../../lib/store-settings";
import { formatReceiptText, type SaleReceipt } from "../../lib/receipt";
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
  const sample = "0008901234560001";
  const normalized = normalizeBarcode(sample, settings);

  return (
    <>
      <p className="set-lede">
        These rules apply the moment a cashier scans or types a barcode on Items.
        Change a control and the next scan on this till uses it.
      </p>
      <LiveNote>
        A scan of <strong>{sample}</strong> is read as <strong>{normalized || "(empty)"}</strong>
        {normalized.length < settings.barcodeMinLength
          ? ` — too short (need ${settings.barcodeMinLength} characters).`
          : "."}{" "}
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
  const sampleSubtotal = 1_000_000;
  const sample = computeTotals(sampleSubtotal, settings);

  return (
    <>
      <p className="set-lede">
        Nigerian VAT and optional service charge. Totals on Current Order and the
        receipt update as soon as you change a rate or toggle.
      </p>
      <LiveNote>
        On a {formatMoney(sampleSubtotal)} ticket: service {formatMoney(sample.serviceMinor)}, VAT{" "}
        {formatMoney(sample.vatMinor)}, total <strong>{formatMoney(sample.totalMinor)}</strong>
        {settings.pricesIncludeVat ? " (prices already include VAT)." : "."}{" "}
        {settings.firs
          ? "FIRS e-invoice fields (TIN, legal name) go on the slip."
          : "FIRS e-invoicing is off."}
      </LiveNote>
      <SetCard title="VAT">
        <SetRow label="How much VAT should be added?" hint="FIRS standard rate is 7.5%">
          <NumField
            value={settings.vatPercent}
            step={0.5}
            onChange={(vatPercent) => patch({ vatPercent: Math.max(0, vatPercent) })}
          />
        </SetRow>
        <SetRow
          label="Prices already include VAT?"
          hint="On: VAT is extracted from the shelf price. Off: VAT is added on top."
        >
          <Toggle
            on={settings.pricesIncludeVat}
            onChange={(pricesIncludeVat) => patch({ pricesIncludeVat })}
          />
        </SetRow>
        <SetRow label="Print the VAT breakdown on the receipt?">
          <Toggle
            on={settings.includeVatBreakdown}
            onChange={(includeVatBreakdown) => patch({ includeVatBreakdown })}
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
            onChange={(applyServiceCharge) => patch({ applyServiceCharge })}
          />
        </SetRow>
        <SetRow label="How much service charge should be added?">
          <NumField
            value={settings.servicePercent}
            step={0.5}
            onChange={(servicePercent) =>
              patch({ servicePercent: Math.max(0, servicePercent) })
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
  const sample = 350_000;
  const points = loyaltyPointsEarned(sample, settings);

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
        A {formatMoney(sample)} ticket earns <strong>{points} point{points === 1 ? "" : "s"}</strong>{" "}
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
  const [settings, patch] = useSettings();
  const preview = useMemo(() => {
    const sale: SaleReceipt = {
      ticketId: `${settings.invoicePrefix}-${String(settings.nextInvoiceNumber).padStart(4, "0")}`,
      paidAt: new Date().toISOString(),
      tender: "cash",
      cashierName: "Tosin Adeyemi",
      tillKey: "TILL-01",
      customerName: "Chioma Adeyemi",
      customerPhone: "0803 123 4567",
      loyaltyNumber: settings.loyaltyEnabled ? "LY-88421" : null,
      loyaltyBalanceBefore: settings.loyaltyEnabled ? 1240 : null,
      loyaltyPointsRedeemed: settings.loyaltyEnabled ? 100 : null,
      loyaltyRedeemMinor: settings.loyaltyEnabled ? 1000_00 : null,
      loyaltyPointsEarned: settings.loyaltyEnabled
        ? loyaltyPointsEarned(350000, settings)
        : null,
      giftCardCode: "GC48219901",
      giftCardChargedMinor: 2000_00,
      giftCardBalanceAfterMinor: 8000_00,
      amountTenderedMinor: 20000_00,
      changeMinor: 500_00,
      discountMinor: 500_00,
      lines: [
        {
          id: "p1",
          itemId: "raspberry-tart",
          name: "Raspberry Tart",
          quantity: 1,
          unitPriceMinor: 350000,
          image: "",
        },
      ],
      totalMinor: computeTotals(350000, settings).totalMinor,
    };
    return formatReceiptText(sale, settings);
  }, [settings]);

  return (
    <>
      <p className="set-lede">
        Header, tax lines, cashier, and footer printed after payment. The preview
        below is live — it is the same layout the till prints.
      </p>
      <pre className="set-preview">{preview}</pre>
      <SetCard title="Header">
        <SetRow label="Store name on the receipt">
          <TextField
            value={settings.storeName}
            onChange={(storeName) => patch({ storeName })}
            width={280}
          />
        </SetRow>
        <SetRow label="Address">
          <TextField
            value={settings.storeAddress}
            onChange={(storeAddress) => patch({ storeAddress })}
            width={280}
          />
        </SetRow>
        <SetRow label="Phone">
          <TextField
            value={settings.storePhone}
            onChange={(storePhone) => patch({ storePhone })}
            width={200}
          />
        </SetRow>
        <SetRow label="Email">
          <TextField
            value={settings.storeEmail}
            onChange={(storeEmail) => patch({ storeEmail })}
            width={220}
          />
        </SetRow>
        <SetRow label="TIN">
          <TextField
            value={settings.storeTin}
            onChange={(storeTin) => patch({ storeTin })}
            width={160}
          />
        </SetRow>
        <SetRow label="Policy line under the header">
          <AreaField
            value={settings.receiptHeader}
            onChange={(receiptHeader) => patch({ receiptHeader })}
          />
        </SetRow>
      </SetCard>
      <SetCard title="Ticket">
        <SetRow label="Show the cashier name?">
          <Toggle
            on={settings.receiptShowCashier}
            onChange={(receiptShowCashier) => patch({ receiptShowCashier })}
          />
        </SetRow>
        <SetRow label="Print a barcode of the ticket number?">
          <Toggle
            on={settings.receiptShowBarcode}
            onChange={(receiptShowBarcode) => patch({ receiptShowBarcode })}
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
        <SetRow label="Footer">
          <AreaField
            value={settings.receiptFooter}
            onChange={(receiptFooter) => patch({ receiptFooter })}
          />
        </SetRow>
        <SetRow label="Copies after payment">
          <NumField
            value={settings.receiptCopies}
            step={1}
            min={1}
            onChange={(receiptCopies) =>
              patch({ receiptCopies: Math.max(1, Math.round(receiptCopies)) })
            }
          />
        </SetRow>
        <SetRow label="Auto-print after payment?">
          <Toggle
            on={settings.autoPrintReceipt}
            onChange={(autoPrintReceipt) => patch({ autoPrintReceipt })}
          />
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
        Payment screen will show: <strong>{shown.join(", ") || "Cash (fallback)"}</strong>. Transfer
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

export function ItemsAdmin({
  items,
  onUpdateItem,
}: {
  items: CatalogItem[];
  onUpdateItem: (
    id: string,
    patch: { priceMinor?: number; onHand?: number },
  ) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const filtered = items.filter((item) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.barcode.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <p className="set-lede">
        Prices and on-hand here are the live catalogue. A price change shows on
        Home and Items immediately. Stock changes affect sold-out hiding and
        negative-stock blocks.
      </p>
      <LiveNote>
        {items.length} products · showing {filtered.length}
        {query.trim() ? ` matching “${query.trim()}”` : ""}.
      </LiveNote>
      <div className="set-items-search">
        <TextField
          value={query}
          onChange={setQuery}
          width={420}
          placeholder="Search name, SKU, barcode, or category"
        />
      </div>
      <SetCard title="Catalogue">
        {filtered.length === 0 ? (
          <SetRow label="No matching items">
            <span className="set-muted">Clear the search</span>
          </SetRow>
        ) : (
          filtered.map((item) => (
            <SetRow
              key={item.id}
              label={item.name}
              hint={`${item.sku} · ${item.barcode || "no barcode"} · ${item.category} · ${item.onHand} on hand`}
            >
              <span className="till-key-actions">
                <span className="set-muted">Qty</span>
                <NumField
                  value={item.onHand}
                  step={1}
                  min={0}
                  onChange={(onHand) => {
                    void onUpdateItem(item.id, {
                      onHand: Math.max(0, Math.round(onHand)),
                    });
                  }}
                />
                <span className="set-muted">₦</span>
                <NumField
                  value={item.priceMinor / 100}
                  step={0.01}
                  onChange={(naira) => {
                    if (!Number.isFinite(naira)) return;
                    void onUpdateItem(item.id, {
                      priceMinor: Math.max(0, Math.round(naira * 100)),
                    });
                  }}
                />
              </span>
            </SetRow>
          ))
        )}
      </SetCard>
    </>
  );
}

export function CategoriesAdmin({ items }: { items: CatalogItem[] }) {
  const [settings, patch] = useSettings();
  const names = Array.from(new Set([...CATEGORIES, ...items.map((item) => item.category)]));

  function setVisible(name: string, visible: boolean) {
    const hidden = new Set(settings.hiddenCategories);
    if (visible) hidden.delete(name);
    else hidden.add(name);
    patch({ hiddenCategories: [...hidden] });
  }

  const visible = names.filter((name) => !settings.hiddenCategories.includes(name));

  return (
    <>
      <p className="set-lede">
        Category chips on Items follow these rules immediately. Hidden categories
        disappear from the chip row and their products are not listed there.
      </p>
      <LiveNote>
        {visible.length} of {names.length} categories show on Items
        {settings.sortCategoriesAz ? ", sorted A–Z" : ", in catalogue order"}.
        {settings.hideEmptyCategories ? " Empty groups are hidden." : ""}
      </LiveNote>
      <SetCard title="Display">
        <SetRow label="Hide empty categories on the till?">
          <Toggle
            on={settings.hideEmptyCategories}
            onChange={(hideEmptyCategories) => patch({ hideEmptyCategories })}
          />
        </SetRow>
        <SetRow label="Sort categories A–Z?">
          <Toggle
            on={settings.sortCategoriesAz}
            onChange={(sortCategoriesAz) => patch({ sortCategoriesAz })}
          />
        </SetRow>
        <SetRow label="Allow items without a category?">
          <Toggle
            on={settings.allowUncategorized}
            onChange={(allowUncategorized) => patch({ allowUncategorized })}
          />
        </SetRow>
        <SetRow label="Print the category on kitchen tickets?">
          <Toggle
            on={settings.showCategoryOnKitchen}
            onChange={(showCategoryOnKitchen) => patch({ showCategoryOnKitchen })}
          />
        </SetRow>
      </SetCard>
      <SetCard title="Show on Items">
        {names.map((name) => {
          const count = items.filter((item) => item.category === name).length;
          return (
            <SetRow
              key={name}
              label={`Show ${name} on the till?`}
              hint={`${count} item${count === 1 ? "" : "s"}`}
            >
              <Toggle
                on={!settings.hiddenCategories.includes(name)}
                onChange={(on) => setVisible(name, on)}
              />
            </SetRow>
          );
        })}
      </SetCard>
    </>
  );
}

export function InvoicesAdmin() {
  const [settings, patch] = useSettings();
  const next = `${settings.invoicePrefix}-${String(settings.nextInvoiceNumber).padStart(4, "0")}`;

  return (
    <>
      <p className="set-lede">
        The next closed sale on this till takes this ticket number, then the
        counter moves up by one.
      </p>
      <LiveNote>
        Next ticket will be <strong>{next}</strong>
        {settings.autoPrintInvoice ? " · an invoice copy prints after payment" : ""}.
      </LiveNote>
      <SetCard title="Numbering">
        <SetRow label="Invoice number prefix">
          <TextField
            value={settings.invoicePrefix}
            onChange={(invoicePrefix) => patch({ invoicePrefix })}
            width={120}
          />
        </SetRow>
        <SetRow label="Next invoice number">
          <NumField
            value={settings.nextInvoiceNumber}
            step={1}
            onChange={(nextInvoiceNumber) =>
              patch({ nextInvoiceNumber: Math.max(1, Math.round(nextInvoiceNumber)) })
            }
          />
        </SetRow>
        <SetRow label="Auto-print an invoice when a sale closes?">
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
        <SetRow label="Show a customer line on the invoice?">
          <Toggle
            on={settings.invoiceShowCustomer}
            onChange={(invoiceShowCustomer) => patch({ invoiceShowCustomer })}
          />
        </SetRow>
        <SetRow label="Mark the invoice paid when the till takes payment?">
          <Toggle
            on={settings.markPaidOnTill}
            onChange={(markPaidOnTill) => patch({ markPaidOnTill })}
          />
        </SetRow>
      </SetCard>
    </>
  );
}

export function HoldAdmin() {
  const [settings, patch] = useSettings();
  return (
    <>
      <p className="set-lede">
        Held tickets on this till follow these rules. A name is required before
        hold if that toggle is on.
      </p>
      <LiveNote>
        Holds expire after <strong>{settings.holdExpiryMinutes} minutes</strong>
        {settings.autoCancelExpiredHolds ? " and then cancel themselves" : ""}.{" "}
        {settings.showHoldsOnAllTills
          ? "Other tills at this branch can recall them."
          : "Only this till can recall them."}
      </LiveNote>
      <SetCard title="Holds">
        <SetRow label="How many minutes before a hold expires?">
          <NumField
            value={settings.holdExpiryMinutes}
            step={1}
            onChange={(holdExpiryMinutes) =>
              patch({ holdExpiryMinutes: Math.max(1, Math.round(holdExpiryMinutes)) })
            }
          />
        </SetRow>
        <SetRow label="Auto-cancel expired holds?">
          <Toggle
            on={settings.autoCancelExpiredHolds}
            onChange={(autoCancelExpiredHolds) => patch({ autoCancelExpiredHolds })}
          />
        </SetRow>
        <SetRow label="Require a customer name to hold an order?">
          <Toggle
            on={settings.requireNameOnHold}
            onChange={(requireNameOnHold) => patch({ requireNameOnHold })}
          />
        </SetRow>
        <SetRow label="Show held tickets on every till?">
          <Toggle
            on={settings.showHoldsOnAllTills}
            onChange={(showHoldsOnAllTills) => patch({ showHoldsOnAllTills })}
          />
        </SetRow>
        <SetRow label="Play a sound when a hold is recalled?">
          <Toggle
            on={settings.soundOnHoldRecall}
            onChange={(soundOnHoldRecall) => patch({ soundOnHoldRecall })}
          />
        </SetRow>
      </SetCard>
    </>
  );
}

export function RefundsAdmin() {
  const [settings, patch] = useSettings();
  return (
    <>
      <p className="set-lede">
        Refunds from the till follow these controls, including whether stock
        comes back onto the shelf.
      </p>
      <LiveNote>
        {settings.requireManagerPin ? "A supervisor PIN is required." : "Any signed-in cashier can refund."}{" "}
        {settings.allowPartialRefunds ? "Partial refunds are allowed." : "Only full-ticket refunds."}{" "}
        {settings.restockOnRefund ? "Refunded qty returns to on-hand." : "Stock is not restocked."}
      </LiveNote>
      <SetCard title="Refunds">
        <SetRow label="Require a manager PIN to refund?">
          <Toggle
            on={settings.requireManagerPin}
            onChange={(requireManagerPin) => patch({ requireManagerPin })}
          />
        </SetRow>
        <SetRow label="Allow partial refunds?">
          <Toggle
            on={settings.allowPartialRefunds}
            onChange={(allowPartialRefunds) => patch({ allowPartialRefunds })}
          />
        </SetRow>
        <SetRow label="Auto-print the refund receipt?">
          <Toggle
            on={settings.autoPrintRefund}
            onChange={(autoPrintRefund) => patch({ autoPrintRefund })}
          />
        </SetRow>
        <SetRow label="Restock items when a refund is posted?">
          <Toggle
            on={settings.restockOnRefund}
            onChange={(restockOnRefund) => patch({ restockOnRefund })}
          />
        </SetRow>
        <SetRow label="Allow a refund without the original ticket?">
          <Toggle
            on={settings.refundWithoutTicket}
            onChange={(refundWithoutTicket) => patch({ refundWithoutTicket })}
          />
        </SetRow>
      </SetCard>
    </>
  );
}

export function AccountingAdmin() {
  const [settings, patch] = useSettings();
  const targets = [
    settings.quickbooks && "QuickBooks",
    settings.sage && "Sage",
    settings.zoho && "Zoho Books",
    settings.firs && "FIRS",
  ].filter(Boolean);

  return (
    <>
      <p className="set-lede">
        Choose which ledgers receive closed sales from this till, and how often.
      </p>
      <LiveNote>
        {targets.length
          ? `Exporting to ${targets.join(", ")} · ${settings.syncMode === "realtime" ? "as each sale closes" : "once a day"}.`
          : "No accounting export is on."}{" "}
        Service charge {settings.includeServiceInExport ? "is" : "is not"} included.
      </LiveNote>
      <SetCard title="Ledgers">
        <SetRow label="Send sales to QuickBooks?">
          <Toggle on={settings.quickbooks} onChange={(quickbooks) => patch({ quickbooks })} />
        </SetRow>
        <SetRow label="Send sales to Sage?">
          <Toggle on={settings.sage} onChange={(sage) => patch({ sage })} />
        </SetRow>
        <SetRow label="Send sales to Zoho Books?">
          <Toggle on={settings.zoho} onChange={(zoho) => patch({ zoho })} />
        </SetRow>
        <SetRow label="Submit FIRS e-invoices?">
          <Toggle on={settings.firs} onChange={(firs) => patch({ firs })} />
        </SetRow>
        <SetRow label="How often should we sync?">
          <SelectField
            value={settings.syncMode}
            onChange={(syncMode) =>
              patch({ syncMode: syncMode as StoreSettings["syncMode"] })
            }
            options={[
              { value: "daily", label: "Daily" },
              { value: "realtime", label: "Real time" },
            ]}
          />
        </SetRow>
        <SetRow label="Include service charge in the export?">
          <Toggle
            on={settings.includeServiceInExport}
            onChange={(includeServiceInExport) => patch({ includeServiceInExport })}
          />
        </SetRow>
      </SetCard>
    </>
  );
}

export function PrintingSettings() {
  const [settings, patch] = useSettings();
  const [detected, setDetected] = useState<DetectedPrinter[]>([]);
  const [config, setConfig] = useState<PrinterConfig>(loadPrinterConfig);
  const [busy, setBusy] = useState(false);

  async function scan() {
    setBusy(true);
    const id = toast.loading("Reading installed printer drivers…");
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
      if (list.length) {
        toast.success(`${list.length} printer(s) found.`, { id });
      } else {
        toast.error("No printers found. Install a driver, then scan again.", { id });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Scan failed.", { id });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void scan();
  }, []);

  function assign(role: keyof PrinterConfig, name: string) {
    const next = { ...config, [role]: name || null };
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

  return (
    <>
      <p className="set-lede">
        Assign Windows printers and how many copies leave the till after a sale.
        A test print uses the live store name and paper width.
      </p>
      <LiveNote>
        Receipt printer: <strong>{config.receiptPrinter ?? "not assigned"}</strong>
        {settings.autoPrintReceipt
          ? ` · auto-prints ${settings.receiptCopies} cop${settings.receiptCopies === 1 ? "y" : "ies"} after payment`
          : " · cashier prints from Paid"}
        {settings.openCashDrawer ? " · cash drawer pulse with the receipt" : ""}.
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
            {busy ? "Scanning…" : "Scan"}
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
