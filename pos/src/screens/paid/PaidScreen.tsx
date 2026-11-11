import { useEffect, useState } from "react";
import { Check, Printer, RotateCcw } from "lucide-react";
import { formatMoney } from "../../lib/types";
import { formatLineQty } from "../../lib/units";
import { printReceipt, TENDER_LABEL, type SaleReceipt } from "../../lib/receipt";
import { loadPrinterConfig } from "../../lib/printers";
import { useStoreSettings } from "../../lib/use-store-settings";
import { overlayReceiptIdentity } from "../../lib/receipt-identity";
import { ReceiptVisual } from "../../components/receipt/ReceiptVisual";

type Props = {
  sale: SaleReceipt;
  saveState?: "saving" | "saved" | "queued";
  onNewOrder: () => void;
  onRefund?: () => void;
};

const SAVE_COPY = {
  saving: "Saving to HQ…",
  saved: "Receipt saved.",
  queued: "HQ unreachable — receipt is safe on this till and will retry.",
} as const;

const autoPrintedTickets = new Set<string>();

export function PaidScreen({
  sale,
  saveState = "saved",
  onNewOrder,
  onRefund,
}: Props) {
  // Keep the receipt card on the same HQ + branch configuration used at print time.
  const settings = overlayReceiptIdentity(useStoreSettings());
  const [status, setStatus] = useState<string>(SAVE_COPY[saveState]);
  const [busy, setBusy] = useState(false);
  const isRefund = sale.kind === "refund" || sale.totalMinor < 0;
  const total = Math.abs(sale.totalMinor);

  useEffect(() => {
    setStatus(SAVE_COPY[saveState]);
  }, [saveState]);

  async function handlePrint() {
    const assigned = loadPrinterConfig().receiptPrinter;
    setBusy(true);
    setStatus(assigned ? `Printing on ${assigned}…` : "Printing…");
    try {
      const printer = await printReceipt(sale);
      setStatus(`Sent to ${printer}. Receipt is stored.`);
    } catch (error) {
      setStatus(
        error instanceof Error
          ? `${error.message} Receipt is still stored.`
          : "Print failed. Receipt is still stored.",
      );
    } finally {
      setBusy(false);
    }
  }

  const autoPrint = isRefund
    ? settings.autoPrintRefund
    : settings.autoPrintReceipt;

  useEffect(() => {
    if (autoPrint && !autoPrintedTickets.has(sale.ticketId)) {
      autoPrintedTickets.add(sale.ticketId);
      void handlePrint();
    }
    // print once per ticket even under StrictMode re-mounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sale.ticketId, autoPrint]);

  return (
    <section className="paid">
      <div className={`paid-mark ${isRefund ? "refund" : ""}`}>
        {isRefund ? (
          <RotateCcw size={34} strokeWidth={2.2} />
        ) : (
          <Check size={36} strokeWidth={2.4} />
        )}
      </div>
      <h1>{isRefund ? "Refund complete" : "Payment successful"}</h1>
      <p className="pay-sub">
        {TENDER_LABEL[sale.tender]} · {formatMoney(total, settings.currency)}
        {isRefund && sale.refundOf ? ` · Refund of ${sale.refundOf}` : ""}
        {isRefund && !sale.refundOf ? " · No original ticket" : ""}
        {isRefund && sale.refundedBy ? ` · by ${sale.refundedBy}` : ""}
        {!isRefund && sale.tipMinor ? ` · Tip ${formatMoney(sale.tipMinor, settings.currency)}` : ""}
        {!isRefund && sale.loyaltyNumber ? ` · Loyalty ${sale.loyaltyNumber}` : ""}
        {sale.tillKey ? ` · ${sale.tillKey}` : ""}
        {(isRefund ? settings.autoPrintRefund : settings.autoPrintReceipt)
          ? ` · ${settings.receiptCopies} cop${settings.receiptCopies === 1 ? "y" : "ies"}`
          : ""}
      </p>
      <div style={{ display: "flex", justifyContent: "center", margin: "16px 0" }}>
        <ReceiptVisual
          settings={settings}
          lines={sale.lines.map((l) => ({
            name: l.name,
            quantity: l.quantity,
            unitPriceMinor: l.unitPriceMinor,
            sku: l.sku,
            taxPercent: l.taxPercent,
          }))}
          ticketId={sale.ticketId}
          paidAt={sale.paidAt}
          cashier={sale.cashierName}
          till={sale.tillKey || ""}
          tender={sale.tender}
          customerName={sale.customerName}
          customerPhone={sale.customerPhone}
          tenderedMinor={sale.amountTenderedMinor || sale.totalMinor}
          changeMinor={sale.changeMinor || 0}
          loyaltyNumber={sale.loyaltyNumber}
          loyaltyPointsEarned={sale.loyaltyPointsEarned}
          loyaltyPointsRedeemed={sale.loyaltyPointsRedeemed}
          loyaltyBalanceBefore={sale.loyaltyBalanceBefore}
          loyaltyBalanceAfter={sale.loyaltyBalanceAfter}
          loyaltyRedeemMinor={sale.loyaltyRedeemMinor}
          giftCardCode={sale.giftCardCode}
          giftCardChargedMinor={sale.giftCardChargedMinor}
          giftCardBalanceAfterMinor={sale.giftCardBalanceAfterMinor}
          discountMinor={sale.discountMinor}
          totalMinor={sale.totalMinor}
          tipMinor={sale.tipMinor}
          kind={sale.kind}
          refundOf={sale.refundOf}
          refundReason={sale.refundReason}
          refundedBy={sale.refundedBy}
        />
      </div>
      {status ? <p className="pay-sub">{status}</p> : null}
      <div className="paid-actions">
        <button className="ghost-btn" onClick={onNewOrder}>
          New order
        </button>
        {onRefund && !isRefund ? (
          <button className="ghost-btn refund-entry" onClick={onRefund}>
            <RotateCcw size={17} /> Refund
          </button>
        ) : null}
        <button
          className="continue print-btn"
          onClick={() => void handlePrint()}
          disabled={busy}
        >
          <Printer size={18} /> Print receipt
        </button>
      </div>
    </section>
  );
}
