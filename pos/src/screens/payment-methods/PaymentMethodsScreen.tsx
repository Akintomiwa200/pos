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
import type { RegisterTender } from "../../lib/register-config";

type Props = {
  selected: TenderType;
  amountMinor: number;
  onSelect: (tender: TenderType) => void;
  onBack: () => void;
};

const METHOD_STYLE: Record<
  RegisterTender["id"],
  { icon: typeof Banknote; tone: "cash" | "card" | "split" | "transfer" | "wallet" }
> = {
  cash: { icon: Banknote, tone: "cash" },
  card: { icon: CreditCard, tone: "card" },
  transfer: { icon: ArrowLeftRight, tone: "transfer" },
  wallet: { icon: Wallet, tone: "wallet" },
  split: { icon: PieChart, tone: "split" },
};

const FALLBACK_METHODS: RegisterTender[] = [
  {
    id: "cash",
    label: "Cash",
    hint: "Count naira notes and coins on the till, then confirm.",
    color: "#16A34A",
    active: true,
    requiresReference: false,
  },
  {
    id: "card",
    label: "Credit Card",
    hint: "Debit or credit on the POS. Wait for an approval slip.",
    color: "#2563EB",
    active: true,
    requiresReference: false,
  },
  {
    id: "split",
    label: "Split",
    hint: "Share this ticket across cash, card, transfer, or wallet.",
    color: "#EA580C",
    active: true,
    requiresReference: false,
  },
  {
    id: "transfer",
    label: "Transfer",
    hint: "Customer pays to the shop account. Confirm the bank alert.",
    color: "#7C3AED",
    active: true,
    requiresReference: false,
  },
  {
    id: "wallet",
    label: "Wallet",
    hint: "OPay, PalmPay, Kuda, or another naira wallet. Confirm credit.",
    color: "#DB2777",
    active: true,
    requiresReference: false,
  },
];

export function PaymentMethodsScreen({
  selected,
  amountMinor,
  onSelect,
  onBack,
}: Props) {
  const settings = useStoreSettings();
  const configured = settings.registerTenders?.length
    ? settings.registerTenders
    : FALLBACK_METHODS;
  const activeIds = enabledTenders(settings) as TenderType[];
  const methods = configured.filter((method) => method.active && activeIds.includes(method.id));

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
        {methods.map((method) => {
          const { icon: Icon, tone } = METHOD_STYLE[method.id];
          return (
            <button
              key={method.id}
              className={`method ${selected === method.id ? "selected" : ""}`}
              style={{ borderColor: selected === method.id ? method.color : undefined }}
              onClick={() => onSelect(method.id)}
            >
              <span
                className={`method-icon ${tone}`}
                style={{ color: method.color, backgroundColor: `${method.color}18` }}
              >
                <Icon size={28} strokeWidth={1.75} />
              </span>
              <span className="method-copy">
                <span className="method-label">{method.label}</span>
                <span className="method-hint">
                  {method.hint}
                  {method.requiresReference ? " Reference required." : ""}
                </span>
              </span>
              <span className="radio" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
