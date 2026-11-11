import { useState } from "react";
import { Coins, X } from "lucide-react";
import { formatMoney } from "../../lib/types";

type Props = {
  baseMinor: number;
  currency: string;
  onConfirm: (tipMinor: number) => void;
  onSkip: () => void;
  onCancel: () => void;
};

const QUICK_PERCENTS = [5, 10, 15, 20];

export function TipModal({
  baseMinor,
  currency,
  onConfirm,
  onSkip,
  onCancel,
}: Props) {
  const [percent, setPercent] = useState<number | null>(null);
  const [custom, setCustom] = useState("");

  const quickMinor =
    percent != null ? Math.round((baseMinor * percent) / 100) : 0;
  const parsedCustom = custom.trim() ? Number(custom) : 0;
  const customMinor =
    Number.isFinite(parsedCustom) && parsedCustom > 0
      ? Math.round(parsedCustom * 100)
      : 0;
  const tipMinor = custom.trim() ? customMinor : quickMinor;
  const money = (n: number) => formatMoney(n, currency || "NGN");

  return (
    <div className="dialog-scrim" onClick={onCancel}>
      <div
        className="pos-modal tip-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="pos-modal-close" onClick={onCancel} aria-label="Close">
          <X size={18} />
        </button>
        <div className="pos-modal-icon tip">
          <Coins size={24} strokeWidth={1.8} />
        </div>
        <h3>Add a tip?</h3>
        <p className="pos-modal-copy">
          The customer can tip the team on this ticket. Choose a quick amount or
          enter a custom tip.
        </p>

        <div className="discount-quick">
          {QUICK_PERCENTS.map((value) => (
            <button
              key={value}
              type="button"
              className={percent === value && !custom.trim() ? "on" : ""}
              onClick={() => {
                setPercent(value);
                setCustom("");
              }}
            >
              {value}%
            </button>
          ))}
          <button
            type="button"
            className={percent === 0 && !custom.trim() ? "on" : ""}
            onClick={() => {
              setPercent(0);
              setCustom("");
            }}
          >
            None
          </button>
        </div>

        <label className="pos-field">
          <span>Custom tip</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={custom}
            placeholder={`e.g. ${money(500)}`}
            onChange={(event) => setCustom(event.target.value)}
          />
        </label>

        <div className="refund-total">
          <span>Ticket {money(baseMinor)}</span>
          <strong>
            Tip {money(tipMinor)} · Total {money(baseMinor + tipMinor)}
          </strong>
        </div>

        <div className="pos-modal-actions">
          <button
            className="continue"
            disabled={tipMinor < 0}
            onClick={() => onConfirm(Math.max(0, tipMinor))}
          >
            Charge {money(baseMinor + Math.max(0, tipMinor))}
          </button>
          <button className="pos-link" type="button" onClick={onSkip}>
            No tip
          </button>
        </div>
      </div>
    </div>
  );
}
