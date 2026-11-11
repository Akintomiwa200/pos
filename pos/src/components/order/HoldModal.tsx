import { useState } from "react";
import { Bookmark, X } from "lucide-react";
import { formatMoney } from "../../lib/types";

type Props = {
  itemCount: number;
  totalMinor: number;
  currency: string;
  requireName: boolean;
  expiryMinutes: number;
  onHold: (name: string, note: string) => void;
  onCancel: () => void;
};

export function HoldModal({
  itemCount,
  totalMinor,
  currency,
  requireName,
  expiryMinutes,
  onHold,
  onCancel,
}: Props) {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const missingName = requireName && !name.trim();

  return (
    <div className="dialog-scrim" onClick={onCancel}>
      <div className="pos-modal" onClick={(event) => event.stopPropagation()}>
        <button className="pos-modal-close" onClick={onCancel} aria-label="Close">
          <X size={18} />
        </button>
        <div className="pos-modal-icon">
          <Bookmark size={24} strokeWidth={1.8} />
        </div>
        <h3>Park this order</h3>
        <p className="pos-modal-copy">
          {itemCount} item{itemCount === 1 ? "" : "s"} ·{" "}
          {formatMoney(totalMinor, currency)}. You can recall it from Saved on any
          till
          {expiryMinutes > 0
            ? ` for the next ${expiryMinutes} minutes`
            : ""}.
        </p>

        <label className="pos-field">
          <span>Customer or ticket name</span>
          <input
            type="text"
            value={name}
            autoFocus
            placeholder={requireName ? "Required" : "Walk-in"}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="pos-field">
          <span>Note for the cashier (optional)</span>
          <textarea
            rows={2}
            value={note}
            placeholder="e.g. Customer stepped out to get cash"
            onChange={(event) => setNote(event.target.value)}
          />
        </label>

        <div className="pos-modal-actions">
          <button
            className="continue"
            disabled={missingName}
            onClick={() => onHold(name, note)}
          >
            Park order
          </button>
          <button className="pos-link" type="button" onClick={onCancel}>
            Keep editing
          </button>
        </div>
      </div>
    </div>
  );
}
