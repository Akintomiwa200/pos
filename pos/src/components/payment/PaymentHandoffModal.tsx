import { CreditCard } from "lucide-react";
import { formatMoney } from "../../lib/types";

export type Handoff = {
  method: string;
  label: string;
  provider: string;
  reference: string;
  amountMinor: number;
  kind: "sale" | "split";
  part?: number;
  splitIndex?: number;
};

type Props = {
  handoff: Handoff;
  currency: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function PaymentHandoffModal({ handoff, currency, onConfirm, onCancel }: Props) {
  return (
    <div className="dialog-scrim">
      <div className="shift-modal loyalty-modal" onClick={(event) => event.stopPropagation()}>
        <div className="shift-modal-icon">
          <CreditCard size={26} strokeWidth={1.8} />
        </div>
        <p className="shift-modal-kicker">Payment hand-off</p>
        <h3>Confirm {handoff.label} payment</h3>
        <p className="shift-modal-copy">
          {handoff.kind === "split" && handoff.part
            ? `Split part ${handoff.part}: `
            : ""}
          A payment reference has been started with {handoff.provider}. Confirm only after the
          customer’s payment is visibly approved.
        </p>
        <div className="handoff-summary">
          <div>
            <span>Amount</span>
            <strong>{formatMoney(handoff.amountMinor, currency)}</strong>
          </div>
          <div>
            <span>Reference</span>
            <strong>{handoff.reference}</strong>
          </div>
        </div>
        <div className="shift-modal-actions">
          <button type="button" className="continue" onClick={onConfirm}>
            Payment received
          </button>
          <button type="button" className="shift-modal-out" onClick={onCancel}>
            Cancel payment
          </button>
        </div>
      </div>
    </div>
  );
}
