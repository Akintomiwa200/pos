import {
  ArrowLeft,
  ArrowLeftRight,
  Banknote,
  CreditCard,
  PieChart,
  Wallet,
} from "lucide-react";
import type { TenderType } from "../../lib/types";
import { formatMoney } from "../../lib/types";
import { enabledTenders } from "../../lib/store-settings";
import { useStoreSettings } from "../../lib/use-store-settings";

type Props = {
  selected: TenderType;
  amountMinor: number;
  onSelect: (tender: TenderType) => void;
  onBack: () => void;
};

const METHODS: {
  id: TenderType;
  label: string;
  hint: string;
  icon: typeof Banknote;
  tone: "cash" | "card" | "split" | "transfer" | "wallet";
}[] = [
  {
    id: "cash",
    label: "Cash",
    hint: "Count naira notes and coins on the till, then confirm.",
    icon: Banknote,
    tone: "cash",
  },
  {
    id: "card",
    label: "Credit Card",
    hint: "Debit or credit on the POS. Wait for an approval slip.",
    icon: CreditCard,
    tone: "card",
  },
  {
    id: "split",
    label: "Split",
    hint: "Share this ticket across cash, card, transfer, or wallet.",
    icon: PieChart,
    tone: "split",
  },
  {
    id: "transfer",
    label: "Transfer",
    hint: "Customer pays to the shop account. Confirm the bank alert.",
    icon: ArrowLeftRight,
    tone: "transfer",
  },
  {
    id: "wallet",
    label: "Wallet",
    hint: "OPay, PalmPay, Kuda, or another naira wallet. Confirm credit.",
    icon: Wallet,
    tone: "wallet",
  },
];

export function PaymentMethodsScreen({
  selected,
  amountMinor,
  onSelect,
  onBack,
}: Props) {
  const settings = useStoreSettings();
  const methods = METHODS.filter((method) =>
    (enabledTenders(settings) as TenderType[]).includes(method.id),
  );

  return (
    <section className="pay">
      <button className="back" onClick={onBack}>
        <ArrowLeft size={18} strokeWidth={1.75} /> Back
      </button>
      <div className="pay-heading">
        <div>
          <h1 className="pay-title">Payment Methods</h1>
          <p className="pay-sub">Choose how this ticket will be paid.</p>
        </div>
        <div className="pay-amount">
          <span>Amount due</span>
          <strong>{formatMoney(amountMinor)}</strong>
        </div>
      </div>
      {settings.payTransfer && settings.payAccountNumber ? (
        <div className="pay-account">
          <strong>Transfer account</strong>
          {settings.payBankName} · {settings.payAccountName} · {settings.payAccountNumber}
        </div>
      ) : null}
      {settings.payWallet ? (
        <div className="pay-account">
          <strong>Wallet</strong>
          {settings.payWalletHint}
          {settings.payCard
            ? ` Cards go through ${settings.gatewayDefault}.`
            : ""}
        </div>
      ) : settings.payCard ? (
        <div className="pay-account">
          <strong>Cards</strong>
          Charged through {settings.gatewayDefault}.
        </div>
      ) : null}
      <div className="methods">
        {methods.map(({ id, label, hint, icon: Icon, tone }) => (
          <button
            key={id}
            className={`method ${selected === id ? "selected" : ""}`}
            onClick={() => onSelect(id)}
          >
            <span className={`method-icon ${tone}`}>
              <Icon size={28} strokeWidth={1.75} />
            </span>
            <span className="method-copy">
              <span className="method-label">{label}</span>
              <span className="method-hint">{hint}</span>
            </span>
            <span className="radio" />
          </button>
        ))}
      </div>
    </section>
  );
}
