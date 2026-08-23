import { useEffect, useState } from "react";
import { Check, Printer } from "lucide-react";
import { formatMoney } from "../../lib/types";
import { formatLineQty } from "../../lib/units";
import { printReceipt, TENDER_LABEL, type SaleReceipt } from "../../lib/receipt";
import { loadPrinterConfig } from "../../lib/printers";
import { useStoreSettings } from "../../lib/use-store-settings";

type Props = {
  sale: SaleReceipt;
  saveState?: "saving" | "saved" | "queued";
  onNewOrder: () => void;
};

const SAVE_COPY = {
  saving: "Saving to HQ…",
  saved: "Receipt saved.",
  queued: "HQ unreachable — receipt is safe on this till and will retry.",
} as const;

export function PaidScreen({ sale, saveState = "saved", onNewOrder }: Props) {
  const settings = useStoreSettings();
  const [status, setStatus] = useState<string>(SAVE_COPY[saveState]);
  const [busy, setBusy] = useState(false);

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

  useEffect(() => {
    if (settings.autoPrintReceipt) {
      void handlePrint();
    }
    // print once when this ticket is shown
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sale.ticketId]);

  return (
    <section className="paid">
      <div className="paid-mark">
        <Check size={36} strokeWidth={2.4} />
      </div>
      <h1>Payment successful</h1>
      <p className="pay-sub">
        {TENDER_LABEL[sale.tender]} · {formatMoney(sale.totalMinor)}
        {sale.loyaltyNumber ? ` · Loyalty ${sale.loyaltyNumber}` : ""}
        {sale.tillKey ? ` · ${sale.tillKey}` : ""}
        {settings.autoPrintReceipt
          ? ` · ${settings.receiptCopies} cop${settings.receiptCopies === 1 ? "y" : "ies"}`
          : ""}
      </p>
      <ul className="paid-lines">
        {sale.lines.map((line) => (
          <li key={line.id}>
            <span>
              {line.name} · {formatLineQty(line.quantity, line.unit, line.unitLabel)}
            </span>
            <strong>{formatMoney(line.unitPriceMinor * line.quantity)}</strong>
          </li>
        ))}
      </ul>
      {status ? <p className="pay-sub">{status}</p> : null}
      <div className="paid-actions">
        <button className="ghost-btn" onClick={onNewOrder}>
          New order
        </button>
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
