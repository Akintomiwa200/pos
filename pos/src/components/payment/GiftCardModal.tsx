import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CreditCard } from "lucide-react";
import { formatMoney } from "../../lib/types";
import { listGiftCards, type GiftCard } from "../../lib/gift-cards";

export type GiftCardSelection = {
  id: string;
  code: string;
  balanceMinor: number;
};

type Props = {
  amountMinor: number;
  currency: string;
  onConfirm: (card: GiftCardSelection) => void;
  onCancel: () => void;
};

export function GiftCardModal({ amountMinor, currency, onConfirm, onCancel }: Props) {
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void listGiftCards()
      .then((rows) => {
        if (!cancelled) setCards(rows);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setLoadError(
            cause instanceof Error ? cause.message : "Could not load gift cards.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const match = useMemo(() => {
    const key = code.trim().replace(/\s+/g, "").toUpperCase();
    if (!key) return undefined;
    return cards.find((card) => card.code.replace(/\s+/g, "").toUpperCase() === key);
  }, [cards, code]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const clean = code.trim().replace(/\s+/g, "").toUpperCase();
    if (!clean) {
      setError("Enter the gift card code.");
      return;
    }
    if (loading) {
      setError("Gift cards are still loading. Try again in a moment.");
      return;
    }
    if (loadError) {
      setError(loadError);
      return;
    }
    const card = match;
    if (!card) {
      setError("No gift card found with that code.");
      return;
    }
    if (!card.active) {
      setError("This gift card is inactive.");
      return;
    }
    if (card.expiresAt && Date.parse(card.expiresAt) <= Date.now()) {
      setError("This gift card has expired.");
      return;
    }
    if (card.balanceMinor < amountMinor) {
      setError(
        `Balance is ${formatMoney(card.balanceMinor, currency)} but the ticket is ${formatMoney(amountMinor, currency)}. Partial gift-card payments are not supported.`,
      );
      return;
    }
    setError("");
    onConfirm({
      id: card.id,
      code: card.code,
      balanceMinor: card.balanceMinor,
    });
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
        <p className="shift-modal-kicker">Gift card</p>
        <h3>Pay with gift card</h3>
        <p className="shift-modal-copy">
          Enter the card code. The full ticket of {formatMoney(amountMinor, currency)} will be
          deducted from its balance when the sale is confirmed.
        </p>
        <label className="loyalty-field">
          Gift card code
          <input
            value={code}
            onChange={(event) => {
              setCode(event.target.value);
              setError("");
            }}
            placeholder="e.g. GIFT-2026-001"
            autoComplete="off"
            autoFocus
          />
        </label>
        {match ? (
          <div className="handoff-summary">
            <div>
              <span>Available balance</span>
              <strong>{formatMoney(match.balanceMinor, currency)}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>
                {!match.active
                  ? "Inactive"
                  : match.expiresAt && Date.parse(match.expiresAt) <= Date.now()
                    ? "Expired"
                    : "Active"}
              </strong>
            </div>
          </div>
        ) : null}
        {loading ? <p className="shift-modal-copy">Loading gift cards…</p> : null}
        {error ? <p className="pin-error">{error}</p> : null}
        <div className="shift-modal-actions">
          <button className="continue" type="submit" disabled={loading}>
            Use gift card
          </button>
          <button className="shift-modal-out" type="button" onClick={onCancel}>
            Back to payment
          </button>
        </div>
      </form>
    </div>
  );
}
