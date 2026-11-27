import { useEffect, useState } from "react";
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
import { HQ_ORG_EVENT, loadCachedHqOrg } from "../../lib/hq-org";
import type { PaymentProvider } from "../../lib/payments";

type Props = {
  selected: TenderType;
  amountMinor: number;
  reference: string;
  blockedReason?: string;
  provider: PaymentProvider | null;
  onProvider: (provider: PaymentProvider) => void;
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

const PROVIDER_IDS: PaymentProvider[] = ["paystack", "flutterwave", "moniepoint", "opay"];
const PROVIDER_LABEL: Record<PaymentProvider, string> = {
  paystack: "Paystack",
  flutterwave: "Flutterwave",
  moniepoint: "Moniepoint",
  opay: "OPay Cashier",
};

type GatewayOption = { provider: PaymentProvider; isDefault: boolean };

/** HQ snapshot is the only source of truth; tills never toggle gateways. */
function hqGateways(): GatewayOption[] {
  const org = loadCachedHqOrg();
  return (org?.gateways ?? [])
    .filter((row) => row.enabled && PROVIDER_IDS.includes(row.provider as PaymentProvider))
    .map((row) => ({
      provider: row.provider as PaymentProvider,
      isDefault: Boolean(row.isDefault),
    }));
}

export function PaymentMethodsScreen({
  selected,
  amountMinor,
  reference,
  blockedReason,
  provider,
  onProvider,
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

  const [gateways, setGateways] = useState<GatewayOption[]>(() => hqGateways());
  useEffect(() => {
    const refresh = () => setGateways(hqGateways());
    window.addEventListener(HQ_ORG_EVENT, refresh);
    refresh();
    return () => window.removeEventListener(HQ_ORG_EVENT, refresh);
  }, []);

  const electronic = selected === "card" || selected === "transfer" || selected === "wallet";
  const available = electronic ? gateways : [];
  const availableKey = available.map((row) => row.provider).join(",");

  useEffect(() => {
    if (!available.length) return;
    if (!provider || !available.some((row) => row.provider === provider)) {
      const preferred = available.find((row) => row.isDefault) ?? available[0];
      if (preferred) onProvider(preferred.provider);
    }
  }, [availableKey, provider, onProvider]);

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
      {electronic ? (
        <div className="pay-account">
          <strong>Online payment provider</strong>
          {available.length ? (
            <div className="methods">
              {available.map((gateway) => (
                <button
                  key={gateway.provider}
                  type="button"
                  className={`method ${provider === gateway.provider ? "selected" : ""}`}
                  onClick={() => onProvider(gateway.provider)}
                >
                  <span className="method-copy">
                    <span className="method-label">{PROVIDER_LABEL[gateway.provider]}</span>
                    <span className="method-hint">
                      {gateway.isDefault ? "HQ default" : "Enabled at HQ"} · hosted checkout
                    </span>
                  </span>
                  <span className="radio" />
                </button>
              ))}
            </div>
          ) : (
            <span>No Paystack, Flutterwave, Moniepoint, or OPay gateway is enabled at HQ.</span>
          )}
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
