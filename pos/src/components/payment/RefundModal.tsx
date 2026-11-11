import { useMemo, useState } from "react";
import { Minus, Plus, RotateCcw, X } from "lucide-react";
import type { CartLine } from "../../lib/types";
import { formatMoney } from "../../lib/types";
import type { SaleReceipt } from "../../lib/receipt";
import type { StoreSettings } from "../../lib/store-settings";
import { refundAmount, remainingRefundLines } from "../../lib/refunds";

type Props = {
  sale: SaleReceipt;
  settings: StoreSettings;
  onRefund: (lines: CartLine[], reason: string) => void;
  onCancel: () => void;
};

export function RefundModal({ sale, settings, onRefund, onCancel }: Props) {
  const remaining = useMemo(() => remainingRefundLines(sale), [sale]);
  const partial = settings.allowPartialRefunds !== false;
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(remaining.map((line) => [line.id, line.quantity])),
  );
  const [reason, setReason] = useState("");

  const selected = remaining
    .map((line) => ({
      ...line,
      quantity: Math.min(
        line.quantity,
        Math.max(0, quantities[line.id] ?? line.quantity),
      ),
    }))
    .filter((line) => line.quantity > 0);

  const amount = refundAmount(sale, selected, settings);
  const currency = settings.currency || "NGN";

  function step(line: CartLine, delta: number) {
    if (!partial) return;
    setQuantities((current) => {
      const next = Math.min(
        line.quantity,
        Math.max(0, (current[line.id] ?? line.quantity) + delta),
      );
      return { ...current, [line.id]: next };
    });
  }

  return (
    <div className="dialog-scrim" onClick={onCancel}>
      <div
        className="pos-modal refund-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="pos-modal-close" onClick={onCancel} aria-label="Close">
          <X size={18} />
        </button>
        <div className="pos-modal-icon refund">
          <RotateCcw size={24} strokeWidth={1.8} />
        </div>
        <h3>Refund ticket {sale.ticketId}</h3>
        <p className="pos-modal-copy">
          {partial
            ? "Choose what the customer is returning. The discount and tax on the original sale are refunded in proportion."
            : "This till only allows full refunds. All remaining items will be returned."}
        </p>

        {remaining.length === 0 ? (
          <p className="pos-error">Every item on this ticket has been refunded.</p>
        ) : (
          <div className="refund-lines">
            {remaining.map((line) => {
              const qty = partial
                ? Math.max(0, quantities[line.id] ?? line.quantity)
                : line.quantity;
              return (
                <div className={`refund-line ${qty > 0 ? "on" : ""}`} key={line.id}>
                  <div className="refund-line-body">
                    <strong>{line.name}</strong>
                    <span>
                      {formatMoney(line.unitPriceMinor, currency)} ·{" "}
                      {line.quantity} left
                    </span>
                  </div>
                  {partial ? (
                    <div className="refund-qty">
                      <button
                        type="button"
                        aria-label={`Less ${line.name}`}
                        onClick={() => step(line, -1)}
                        disabled={qty <= 0}
                      >
                        <Minus size={13} />
                      </button>
                      <span>{qty}</span>
                      <button
                        type="button"
                        aria-label={`More ${line.name}`}
                        onClick={() => step(line, 1)}
                        disabled={qty >= line.quantity}
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  ) : (
                    <span className="refund-fixed-qty">×{qty}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <label className="pos-field">
          <span>Reason (optional)</span>
          <input
            type="text"
            value={reason}
            placeholder="e.g. Wrong item, damaged pack"
            onChange={(event) => setReason(event.target.value)}
          />
        </label>

        <div className="refund-total">
          <span>Refund to customer</span>
          <strong>{formatMoney(amount, currency)}</strong>
        </div>

        <div className="pos-modal-actions">
          <button
            className="continue"
            disabled={amount <= 0}
            onClick={() => onRefund(selected, reason)}
          >
            Refund {formatMoney(amount, currency)}
          </button>
          <button className="pos-link" type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
