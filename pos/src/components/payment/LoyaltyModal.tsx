import { useState, type FormEvent } from "react";
import { CreditCard } from "lucide-react";
import { formatMoney } from "../../lib/types";
import { useStoreSettings } from "../../lib/use-store-settings";

type Props = {
  onApply: (number: string) => void;
  onSkip: () => void;
  busy?: boolean;
  onCancel?: () => void;
};

export function LoyaltyModal({ onApply, onSkip, busy = false, onCancel }: Props) {
  const settings = useStoreSettings();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  const prompt =
    settings.loyaltyPrompt === "card"
      ? "Loyalty card number"
      : settings.loyaltyPrompt === "phone"
        ? "Registered phone number"
        : "Card or phone number";

  function submit(event: FormEvent) {
    event.preventDefault();
    const number = value.trim().replace(/\s+/g, "");
    if (number.length < settings.loyaltyMinDigits) {
      setError(`Enter at least ${settings.loyaltyMinDigits} digits.`);
      return;
    }
    onApply(number);
  }

  return (
    <div className="dialog-scrim">
      <form
        className="shift-modal loyalty-modal"
        onSubmit={submit}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="shift-modal-icon">
          <CreditCard size={26} strokeWidth={1.8} />
        </div>
        <p className="shift-modal-kicker">Loyalty</p>
        <h3>Loyalty card</h3>
        <p className="shift-modal-copy">
          {settings.loyaltyPrompt === "phone"
            ? "Enter the customer’s registered phone number before payment is completed."
            : settings.loyaltyPrompt === "card"
              ? "Enter the loyalty card number before payment is completed."
              : "If this customer has a loyalty card or registered phone number, enter it before the payment is completed."}{" "}
          Spend ₦{settings.loyaltyEarnNaira} to earn 1 point. Each point is worth ₦
          {(settings.loyaltyRedeemMinor / 100).toFixed(2)} at checkout.
        </p>
        <label className="loyalty-field">
          {prompt}
          <input
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setError("");
            }}
            placeholder="e.g. 0803 123 4567"
            autoComplete="off"
            autoFocus
            disabled={busy}
          />
        </label>
        {error ? <p className="pin-error">{error}</p> : null}
        <div className="shift-modal-actions">
          <button className="continue" type="submit" disabled={busy}>
            {busy ? "Checking loyalty…" : "Apply and continue"}
          </button>
          {settings.loyaltyAllowSkip ? (
            <button
              className="shift-modal-out"
              type="button"
              onClick={onSkip}
              disabled={busy}
            >
              Continue without loyalty
            </button>
          ) : null}
          {onCancel ? (
            <button
              className="shift-modal-out"
              type="button"
              onClick={onCancel}
              disabled={busy}
            >
              Back to payment
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
