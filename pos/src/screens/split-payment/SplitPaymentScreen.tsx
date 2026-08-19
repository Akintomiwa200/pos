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
  onCount: (delta: number) => void;
  onTender: (index: number, tender: TenderType) => void;
  onCharge: (index: number) => void;
  onBack: () => void;
};

export function SplitPaymentScreen({
  count,
  parts,
  onCount,
  onTender,
  onCharge,
  onBack,
}: Props) {
  const settings = useStoreSettings();
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
          <strong>{formatMoney(part.amountMinor)}</strong>
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
