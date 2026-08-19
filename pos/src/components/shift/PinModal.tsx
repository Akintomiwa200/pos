import { useEffect, useState } from "react";
import { Delete, Lock } from "lucide-react";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "del", "0", "clear"] as const;

type Props = {
  title: string;
  subtitle: string;
  confirmLabel: string;
  error?: string;
  busy?: boolean;
  onCancel?: () => void;
  onSubmit: (pin: string) => void;
};

export function PinModal({
  title,
  subtitle,
  confirmLabel,
  error,
  busy,
  onCancel,
  onSubmit,
}: Props) {
  const [pin, setPin] = useState("");

  useEffect(() => {
    setPin("");
  }, [title]);

  function confirm() {
    if (pin.length < 4 || busy) return;
    onSubmit(pin);
    setPin("");
  }

  function press(key: (typeof KEYS)[number]) {
    if (key === "clear") {
      setPin("");
      return;
    }
    if (key === "del") {
      setPin((current) => current.slice(0, -1));
      return;
    }
    setPin((current) => (current.length >= 4 ? current : current + key));
  }

  return (
    <div className="dialog-scrim">
      <div className="shift-modal pin-modal" onClick={(event) => event.stopPropagation()}>
        <div className="shift-modal-icon">
          <Lock size={26} strokeWidth={1.8} />
        </div>
        <p className="shift-modal-kicker">Supervisor PIN</p>
        <h3>{title}</h3>
        <p className="shift-modal-copy">{subtitle}</p>
        <div className="pin-slots" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <span key={index} className={pin.length > index ? "on" : ""}>
              {pin.length > index ? "•" : ""}
            </span>
          ))}
        </div>
        {error ? <p className="pin-banner">{error}</p> : null}
        <div className="pin-pad">
          {KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className={key === "del" || key === "clear" ? "muted" : ""}
              onClick={() => press(key)}
              disabled={busy}
              aria-label={key === "del" ? "Delete" : key === "clear" ? "Clear" : key}
            >
              {key === "del" ? <Delete size={20} /> : key === "clear" ? "C" : key}
            </button>
          ))}
        </div>
        <div className="shift-modal-actions">
          <button
            className="continue"
            disabled={busy || pin.length < 4}
            onClick={confirm}
          >
            {busy ? "Please wait…" : confirmLabel}
          </button>
          {onCancel ? (
            <button
              className="shift-modal-out"
              type="button"
              onClick={onCancel}
              disabled={busy}
            >
              Cancel
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
