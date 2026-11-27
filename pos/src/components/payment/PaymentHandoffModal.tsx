import { AlertCircle, CheckCircle2, CreditCard, ExternalLink, RefreshCw } from "lucide-react";
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
  checkoutUrl?: string;
  mode?: "test" | "live";
};

export type HandoffStatus = "pending" | "checking" | "paid" | "failed";

type Props = {
  handoff: Handoff;
  currency: string;
  status: HandoffStatus;
  message?: string;
  onConfirm: () => void;
  onCheck: () => void;
  onCancel: () => void;
};

const PROVIDER_LABEL: Record<string, string> = {
  paystack: "Paystack",
  flutterwave: "Flutterwave",
  moniepoint: "Moniepoint (Monnify)",
  opay: "OPay Cashier",
};

export function PaymentHandoffModal({
  handoff,
  currency,
  status,
  message,
  onConfirm,
  onCheck,
  onCancel,
}: Props) {
  const providerLabel = PROVIDER_LABEL[handoff.provider] ?? handoff.provider;
  const canComplete = status === "paid";

  return (
    <div className="dialog-scrim">
      <div className="shift-modal loyalty-modal" onClick={(event) => event.stopPropagation()}>
        <div className="shift-modal-icon">
          <CreditCard size={26} strokeWidth={1.8} />
        </div>
        <p className="shift-modal-kicker">Payment hand-off</p>
        <h3>Confirm {handoff.label} payment</h3>
        <p className="shift-modal-copy">
          {handoff.kind === "split" && handoff.part ? `Split part ${handoff.part}: ` : ""}
          Customer pays on {providerLabel}
          {handoff.mode === "test" ? " (sandbox)" : ""}. Cashier confirms after payment — the sale
          is not recorded until the status check succeeds.
        </p>
        <div className="handoff-summary">
          <div>
            <span>Amount</span>
            <strong>{formatMoney(handoff.amountMinor, currency)}</strong>
          </div>
          <div>
            <span>Provider</span>
            <strong>{providerLabel}</strong>
          </div>
          <div>
            <span>Reference</span>
            <strong>{handoff.reference}</strong>
          </div>
        </div>
        {handoff.checkoutUrl ? (
          <div className="handoff-summary">
            <div>
              <span>Checkout URL</span>
              <a href={handoff.checkoutUrl} target="_blank" rel="noreferrer">
                Open hosted checkout <ExternalLink size={14} />
              </a>
            </div>
            <div>
              <span>QR / payment code</span>
              <strong>{handoff.reference}</strong>
            </div>
          </div>
        ) : null}
        {status === "paid" ? (
          <div className="pay-account">
            <CheckCircle2 size={16} /> Provider confirmed payment. You may complete the sale.
          </div>
        ) : null}
        {status === "failed" ? (
          <div className="pay-blocked">
            <AlertCircle size={16} /> {message || "Payment was not confirmed."}
          </div>
        ) : null}
        {status === "pending" ? (
          <div className="pay-sub">Waiting for the cashier to check the payment status.</div>
        ) : null}
        <div className="shift-modal-actions">
          <button
            type="button"
            className="charge"
            onClick={onCheck}
            disabled={status === "checking"}
          >
            {status === "checking" ? "Checking…" : "Check payment status"}
            {status === "checking" ? null : <RefreshCw size={15} />}
          </button>
          <button type="button" className="continue" onClick={onConfirm} disabled={!canComplete}>
            {canComplete ? "Payment received — complete sale" : "Payment received"}
          </button>
          <button type="button" className="shift-modal-out" onClick={onCancel}>
            Cancel payment
          </button>
        </div>
      </div>
    </div>
  );
}
