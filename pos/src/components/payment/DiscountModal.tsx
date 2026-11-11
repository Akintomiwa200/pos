import { useState } from "react";
import { Percent, X } from "lucide-react";
import { formatMoney } from "../../lib/types";

type Props = {
  subtotalMinor: number;
  currentMinor: number;
  maxPercent: number;
  currency: string;
  onApply: (discountMinor: number) => void;
  onClear: () => void;
  onCancel: () => void;
};

const QUICK = [5, 10, 15, 20, 25, 30];

export function DiscountModal({
  subtotalMinor,
  currentMinor,
  maxPercent,
  currency,
  onApply,
  onClear,
  onCancel,
}: Props) {
  const cap = Math.max(0, Math.min(100, maxPercent));
  const currentPercent =
    subtotalMinor > 0 ? Math.round((currentMinor / subtotalMinor) * 100) : 0;
  const [percent, setPercent] = useState(String(currentPercent));
  const parsed = Math.max(0, Math.min(cap, Number(percent) || 0));
  const discountMinor = Math.min(
    subtotalMinor,
    Math.round((subtotalMinor * parsed) / 100),
  );
  const overLimit = Number(percent) > cap;

  return (
    <div className="dialog-scrim" onClick={onCancel}>
      <div
        className="pos-modal discount-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="pos-modal-close" onClick={onCancel} aria-label="Close">
          <X size={18} />
        </button>
        <div className="pos-modal-icon">
          <Percent size={24} strokeWidth={1.8} />
        </div>
        <h3>Order discount</h3>
        <p className="pos-modal-copy">
          Discounts apply to the whole ticket before service and VAT. This till
          allows up to {cap}%.
        </p>

        <div className="discount-quick">
          {QUICK.filter((value) => value <= cap).map((value) => (
            <button
              key={value}
              type="button"
              className={parsed === value ? "on" : ""}
              onClick={() => setPercent(String(value))}
            >
              {value}%
            </button>
          ))}
        </div>

        <label className="pos-field">
          <span>Discount percentage</span>
          <div className="pos-input-suffix">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={cap}
              step={0.5}
              value={percent}
              autoFocus
              onChange={(event) => setPercent(event.target.value)}
            />
            <span>%</span>
          </div>
        </label>

        <div className="discount-preview">
          <span>Customer saves</span>
          <strong>{formatMoney(discountMinor, currency)}</strong>
        </div>
        <div className="discount-preview muted">
          <span>New subtotal</span>
          <strong>{formatMoney(subtotalMinor - discountMinor, currency)}</strong>
        </div>

        {overLimit ? (
          <p className="pos-error">
            The maximum discount on this till is {cap}%.
          </p>
        ) : null}

        <div className="pos-modal-actions">
          <button
            className="continue"
            disabled={discountMinor <= 0 || overLimit}
            onClick={() => onApply(discountMinor)}
          >
            Apply discount
          </button>
          {currentMinor > 0 ? (
            <button className="ghost-btn" type="button" onClick={onClear}>
              Remove discount
            </button>
          ) : null}
          <button className="pos-link" type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
