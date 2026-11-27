import { ArrowLeft } from "lucide-react";
import type { TenderType } from "../../lib/types";
import { formatMoney } from "../../lib/types";
import { enabledTenders } from "../../lib/store-settings";
import { useStoreSettings } from "../../lib/use-store-settings";

export type SplitPart = {
  tender: TenderType;
  amountMinor: number;
  paid: boolean;
};

const TENDERS: { id: TenderType; label: string }[] = [
  { id: "cash", label: "Cash" },
  { id: "card", label: "Credit Card" },
  { id: "transfer", label: "Transfer" },
  { id: "wallet", label: "Wallet" },
];

type Props = {
  count: number;
  parts: SplitPart[];
  totalMinor: number;
  onCount: (delta: number) => void;
  onTender: (index: number, tender: TenderType) => void;
  onAmount: (index: number, minor: number) => void;
  onCharge: (index: number) => void;
  onBack: () => void;
};

export function SplitPaymentScreen({
  count,
  parts,
  totalMinor,
  onCount,
  onTender,
  onAmount,
  onCharge,
  onBack,
}: Props) {
  const settings = useStoreSettings();
  const allocatedMinor = parts.reduce(
    (sum, part) => sum + Math.max(0, part.amountMinor),
    0,
  );
  const remainingMinor = totalMinor - allocatedMinor;
  return (
    <section className="pay">
      <button className="back" onClick={onBack}>
        <ArrowLeft size={16} /> Back
      </button>
      <h1 className="pay-title">Split Payment</h1>
      <p className="pay-sub">
        Choose how many payments you want to split the bill into.
      </p>
      <div className="qty" style={{ margin: "12px 0 20px" }}>
        <button onClick={() => onCount(-1)}>-</button>
        <strong>{count}</strong>
        <button onClick={() => onCount(1)}>+</button>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <span>
          Total to split <strong>{formatMoney(totalMinor)}</strong>
        </span>
        <span
          className={remainingMinor === 0 ? "" : "pin-error"}
          style={{ color: remainingMinor === 0 ? "#15803d" : undefined }}
        >
          {remainingMinor === 0
            ? "Fully allocated"
            : `${remainingMinor > 0 ? "Remaining" : "Over by"} ${formatMoney(Math.abs(remainingMinor))}`}
        </span>
      </div>
      {parts.map((part, index) => (
        <div className="split-row" key={`split-${index}`}>
          <label>
            <div className="price">Select Payment</div>
            <select
              value={part.tender}
              disabled={part.paid}
              onChange={(event) =>
                onTender(index, event.target.value as TenderType)
              }
            >
              {TENDERS.filter((option) =>
                (enabledTenders(settings) as TenderType[]).includes(option.id),
              ).map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <div className="price">Amount (₦)</div>
            <input
              type="number"
              min={0}
              step="0.01"
              value={Number((part.amountMinor / 100).toFixed(2))}
              disabled={part.paid}
              aria-label={`Amount for payment ${index + 1} in naira`}
              onChange={(event) => {
                const naira = Number(event.target.value);
                onAmount(
                  index,
                  Number.isFinite(naira) ? Math.max(0, Math.round(naira * 100)) : 0,
                );
              }}
              style={{
                marginTop: 4,
                width: "100%",
                border: "1px solid #ececf0",
                borderRadius: 10,
                padding: "8px 10px",
                font: "inherit",
                background: "#fafafa",
              }}
            />
          </label>
          <button
            className="charge"
            disabled={part.paid}
            onClick={() => onCharge(index)}
          >
            {part.paid ? "Paid" : "Charge"}
          </button>
        </div>
      ))}
    </section>
  );
}
