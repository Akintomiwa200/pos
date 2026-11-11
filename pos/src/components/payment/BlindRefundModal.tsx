import { useState } from "react";
import { RotateCcw, X } from "lucide-react";
import { formatMoney, type TenderType } from "../../lib/types";
import { enabledTenders, type StoreSettings } from "../../lib/store-settings";
import { TENDER_LABEL } from "../../lib/receipt";

type Props = {
  settings: StoreSettings;
  onSubmit: (input: {
    amountMinor: number;
    tender: TenderType;
    reason: string;
  }) => void;
  onCancel: () => void;
};

export function BlindRefundModal({ settings, onSubmit, onCancel }: Props) {
  const currency = settings.currency || "NGN";
  const tenders = enabledTenders(settings).filter((id) => id !== "split");
  const [amount, setAmount] = useState("");
  const [tender, setTender] = useState<TenderType>(tenders[0] ?? "cash");
  const [reason, setReason] = useState("");

  const parsed = Number(amount);
  const amountMinor =
    Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) : 0;

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
        <h3>Refund without a ticket</h3>
        <p className="pos-modal-copy">
          Use this when the customer no longer has the receipt. The refund is
          recorded as a negative sale and appears in the shift totals.
        </p>

        <label className="pos-field">
          <span>Amount to refund ({currency})</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={amount}
            placeholder="0.00"
            autoFocus
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>

        <label className="pos-field">
          <span>Refund method</span>
          <select
            value={tender}
            onChange={(event) => setTender(event.target.value as TenderType)}
          >
            {tenders.map((id) => (
              <option key={id} value={id}>
                {TENDER_LABEL[id]}
              </option>
            ))}
          </select>
        </label>

        <label className="pos-field">
          <span>Reason (optional)</span>
          <input
            type="text"
            value={reason}
            placeholder="e.g. Customer lost the receipt"
            onChange={(event) => setReason(event.target.value)}
          />
        </label>

        <div className="refund-total">
          <span>Refund to customer</span>
          <strong>{formatMoney(amountMinor, currency)}</strong>
        </div>

        <div className="pos-modal-actions">
          <button
            className="continue"
            disabled={amountMinor <= 0}
            onClick={() => onSubmit({ amountMinor, tender, reason })}
          >
            Refund {formatMoney(amountMinor, currency)}
          </button>
          <button className="pos-link" type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
