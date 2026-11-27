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
  reference: string;
  blockedReason?: string;
  onSelect: (tender: TenderType) => void;
  onReference: (value: string) => void;
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
  reference,
  blockedReason,
  onSelect,
  onReference,
  onBack,
}: Props) {
  const settings = useStoreSettings();
  const activeIds = enabledTenders(settings) as TenderType[];
  const configured = settings.registerTenders?.length
    ? settings.registerTenders
    : FALLBACK_METHODS;
  const selectedMethods = configured.filter(
    (method) => method.active && activeIds.includes(method.id),
  );
  // HQ can leave a non-empty list with every method switched off. Never strand
  // the cashier on an empty payment grid.
  const methods = selectedMethods.length
    ? selectedMethods
    : FALLBACK_METHODS.filter((method) => activeIds.includes(method.id));
  const selectedMethod = methods.find((method) => method.id === selected);
  const needsReference = Boolean(selectedMethod?.requiresReference);

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
            ? ` Cards go through ${settings.gatewayDefault} (set at HQ, shown read-only).`
            : ""}
        </div>
      ) : settings.payCard ? (
        <div className="pay-account">
          <strong>Cards</strong>
          Charged through {settings.gatewayDefault} (HQ-derived, read-only).
        </div>
      ) : null}
      {blockedReason ? <div className="pay-blocked">{blockedReason}</div> : null}
      {needsReference ? (
        <label className="loyalty-field pay-reference">
          Payment reference ({selectedMethod?.label})
          <input
            value={reference}
            onChange={(event) => onReference(event.target.value)}
            placeholder="Transfer or transaction reference"
            autoComplete="off"
          />
        </label>
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
