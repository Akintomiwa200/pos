"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Landmark,
  Laptop,
  Loader2,
  MonitorSmartphone,
  Package,
  RefreshCw,
  ShieldCheck,
  Store,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "@/lib/toast";
import {
  LICENCE_YEAR_MINOR,
  payTillLicense,
  tillProductLabel,
  unpairTill,
  type HqTill,
} from "@/lib/hq-api";
import { listGateways, type HqCompany, type HqGateway } from "@/lib/hq-setup";
import { formatMinor } from "@/lib/org-locale";
import { useLivePos } from "@/lib/live-pos";
import { ManagerSkeleton } from "../Skeleton";
import { DataTable, PrimaryButton, SetupHeader } from "./SetupChrome";
import { useOrgLinks } from "@/lib/org-links";

type LicenceStatus = "none" | "active" | "expiring" | "expired";

type LicenceView = { label: string; tone: string; badge: string; status: LicenceStatus };

function licenceState(till: HqTill): LicenceView {
  if (!till.subscriptionExpiresAt) {
    return {
      label: "Not activated",
      tone: "text-pos-ink-faint",
      badge: "bg-pos-surface-muted text-pos-ink-faint",
      status: "none",
    };
  }
  const days = Math.ceil(
    (new Date(till.subscriptionExpiresAt).getTime() - Date.now()) / 86_400_000,
  );
  if (days < 0) {
    return {
      label: `Expired ${-days}d ago`,
      tone: "text-pos-danger font-semibold",
      badge: "bg-pos-danger/10 text-pos-danger",
      status: "expired",
    };
  }
  if (days <= 30) {
    return {
      label: `${days}d left`,
      tone: "text-pos-warning font-semibold",
      badge: "bg-pos-warning/10 text-pos-warning",
      status: "expiring",
    };
  }
  return {
    label: `${days}d left`,
    tone: "text-pos-success font-semibold",
    badge: "bg-pos-success/10 text-pos-success",
    status: "active",
  };
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatCard({
  label,
  value,
  tone,
  iconClass,
  icon: Icon,
}: {
  label: string;
  value: number;
  tone: string;
  iconClass: string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-pos-border bg-pos-surface px-4 py-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-pos-surface-muted">
        <Icon size={16} strokeWidth={1.75} className={iconClass} />
      </span>
      <span className="min-w-0">
        <span className="block text-[12px] font-semibold uppercase tracking-[0.08em] text-pos-ink-faint">
          {label}
        </span>
        <span className={`block text-xl font-semibold leading-none ${tone}`}>{value}</span>
      </span>
    </div>
  );
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    try {
      const field = document.createElement("textarea");
      field.value = value;
      document.body.appendChild(field);
      field.select();
      document.execCommand("copy");
      document.body.removeChild(field);
      return true;
    } catch {
      return false;
    }
  }
}

function loadPaystackInline(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as { PaystackPop?: unknown }).PaystackPop) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    script.onload = () => resolve(Boolean((window as { PaystackPop?: unknown }).PaystackPop));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function makeReference(kind: string, tillId: string) {
  return `${kind === "paystack" ? "PAY" : kind.toUpperCase()}-${tillId}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;
}

function TillDetailModal({
  till,
  company,
  onClose,
  onRenew,
}: {
  till: HqTill;
  company: HqCompany | null;
  onClose: () => void;
  onRenew: (till: HqTill) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const state = licenceState(till);
  const days = daysUntil(till.subscriptionExpiresAt);
  const remaining =
    days === null ? 0 : Math.max(0, Math.min(100, Math.round((days / 365) * 100)));
  const paired = Boolean(till.hardwareHex);

  async function removeDevice() {
    setBusy(true);
    try {
      await unpairTill(till.id);
      setConfirmRemove(false);
      toast.success("Device removed. Enter the till code on the replacement device.");
    } catch (err) {
      toast.error(err, "Could not remove device");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-pos-ink/45 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative flex min-h-full items-center justify-center p-3 sm:p-6">
        <div className="relative max-h-[min(92vh,760px)] w-full max-w-xl overflow-y-auto rounded-3xl bg-pos-surface p-5 shadow-pos-lg ring-1 ring-pos-border sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-pos-primary-soft text-pos-primary">
                <Store size={20} strokeWidth={1.75} />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-pos-ink">{till.name}</h2>
                <button
                  onClick={async () => {
                    const ok = await copyText(till.code);
                    toast[ok ? "success" : "error"](ok ? "Till code copied" : "Could not copy");
                  }}
                  className="mt-0.5 inline-flex items-center gap-1.5 rounded-lg bg-pos-surface-muted px-2 py-1 font-mono text-[12px] text-pos-ink-muted transition hover:text-pos-ink"
                >
                  {till.code}
                  <Copy size={11} />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${state.badge}`}
              >
                {state.label}
              </span>
              <button
                onClick={onClose}
                className="grid size-8 shrink-0 place-items-center rounded-lg text-pos-ink-faint transition hover:bg-pos-surface-muted hover:text-pos-ink"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-2 text-[13px] sm:grid-cols-2">
            <DetailRow label="Product" value={tillProductLabel(till.product)} />
            <DetailRow label="Branch" value={till.branchName || "—"} />
            <DetailRow
              label="Online"
              value={
                <span
                  className={`inline-flex items-center gap-1.5 font-medium ${till.online ? "text-pos-success" : "text-pos-ink-faint"}`}
                >
                  <span
                    className={`size-1.5 rounded-full ${till.online ? "bg-pos-success" : "bg-pos-ink-faint"}`}
                  />
                  {till.online ? "Connected now" : "Offline"}
                </span>
              }
            />
            <DetailRow label="Paired" value={paired ? formatDate(till.pairedAt!) : "No device"} />
          </div>

          <div className="mt-4 rounded-2xl border border-pos-border bg-pos-surface-muted/60 p-4">
            <div className="flex items-center justify-between text-[12px] text-pos-ink-muted">
              <span className="font-medium text-pos-ink">Licence</span>
              <span>
                {days === null
                  ? "Not activated yet"
                  : `${state.status === "expired" ? "Expired" : "Licensed until"} ${formatDate(till.subscriptionExpiresAt!)}`}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-pos-surface">
              <div
                className={`h-full rounded-full ${
                  days === null
                    ? "bg-pos-ink-faint/40"
                    : state.status === "expired"
                      ? "bg-pos-danger"
                      : state.status === "expiring"
                        ? "bg-pos-warning"
                        : "bg-pos-success"
                }`}
                style={{ width: `${remaining}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-pos-ink-faint">
              {days === null
                ? "A year starts when the till code is entered on the device."
                : `Renews for another year from the current expiry date.`}
            </p>
          </div>

          <div className="mt-4 rounded-2xl border border-pos-border p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-pos-ink">
                <Laptop size={14} className="text-pos-ink-muted" />
                Device
              </h3>
              {!till.unpairedAt && paired ? (
                <button
                  onClick={() => setConfirmRemove(true)}
                  className="rounded-lg border border-pos-danger/25 px-2.5 py-1 text-[12px] font-medium text-pos-danger transition hover:bg-pos-danger/10"
                >
                  Remove device
                </button>
              ) : null}
            </div>
            {paired ? (
              <div className="mt-3 space-y-2 text-[12px]">
                <p className="flex items-center justify-between gap-3 text-pos-ink-muted">
                  <span>Device id</span>
                  <button
                    onClick={async () => {
                      const ok = await copyText(till.hardwareHex ?? "");
                      toast[ok ? "success" : "error"](ok ? "Device id copied" : "Could not copy");
                    }}
                    className="inline-flex items-center gap-1.5 font-mono text-[11px] text-pos-ink transition hover:text-pos-primary"
                  >
                    {till.hardwareHex}
                    <Copy size={11} />
                  </button>
                </p>
                <p className="flex items-center justify-between gap-3 text-pos-ink-muted">
                  <span>Paired</span>
                  <span className="text-pos-ink">{formatDate(till.pairedAt!)}</span>
                </p>
                <p className="flex items-center justify-between gap-3 text-pos-ink-muted">
                  <span>Last seen</span>
                  <span className={till.online ? "text-pos-success" : "text-pos-ink-muted"}>
                    {till.online ? "now" : till.lastSeenAt ? formatDate(till.lastSeenAt) : "—"}
                  </span>
                </p>
                <p className="rounded-xl bg-pos-surface-muted/70 px-3 py-2.5 text-pos-ink-faint">
                  One till is licensed to one device. If this PC broke or was replaced, remove the
                  device here, then enter the till code on the replacement.
                </p>
              </div>
            ) : (
              <p className="mt-3 text-[12px] leading-relaxed text-pos-ink-muted">
                {till.unpairedAt ? (
                  <>
                    Removed from its previous device on{" "}
                    <span className="font-medium text-pos-ink">{formatDate(till.unpairedAt)}</span>.
                    Enter the till code above on the replacement device to pair it here — the old
                    device is signed out automatically.
                  </>
                ) : (
                  "Not paired to any device yet. Enter the till code at the till to activate."
                )}
              </p>
            )}
          </div>

          {confirmRemove ? (
            <div className="mt-4 rounded-2xl border border-pos-danger/25 bg-pos-danger/10 p-4">
              <p className="text-[13px] font-medium text-pos-danger">Remove this device?</p>
              <p className="mt-1 text-[12px] leading-relaxed text-pos-ink-muted">
                The old device is signed out immediately in real time. The till keeps its licence
                and code — enter the code on the replacement device to re-pair.
              </p>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  onClick={() => setConfirmRemove(false)}
                  className="rounded-xl border border-pos-border px-3 py-2 text-[12px] font-medium text-pos-ink-muted transition hover:bg-pos-surface-muted"
                >
                  Cancel
                </button>
                <button
                  disabled={busy}
                  onClick={removeDevice}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-pos-danger px-3 py-2 text-[12px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? <Loader2 size={13} className="animate-spin" /> : <Laptop size={13} />}
                  Remove device
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-pos-border pt-4">
            <button
              onClick={onClose}
              className="rounded-xl border border-pos-border px-4 py-2.5 text-[13px] font-medium text-pos-ink-muted transition hover:bg-pos-surface-muted"
            >
              Close
            </button>
            <PrimaryButton
              onClick={() => onRenew(till)}
              className="inline-flex items-center gap-1.5"
            >
              <RefreshCw size={14} className="mr-1" />
              Renew for one year
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-pos-surface-muted/70 px-3 py-2.5">
      <span className="text-pos-ink-muted">{label}</span>
      <span className="min-w-0 truncate font-medium text-pos-ink">{value}</span>
    </div>
  );
}

function RenewalModal({
  till,
  company,
  onClose,
}: {
  till: HqTill;
  company: HqCompany | null;
  onClose: () => void;
}) {
  const [gateways, setGateways] = useState<HqGateway[]>([]);
  const [method, setMethod] = useState<string>("paystack");
  const [busy, setBusy] = useState(false);
  const reference = useMemo(() => makeReference("PAY", till.id), [till.id]);

  useEffect(() => {
    let cancelled = false;
    listGateways()
      .then((rows) => {
        if (cancelled) return;
        setGateways(rows);
        const online = rows.find(
          (row) => row.enabled && row.provider === "paystack" && row.publicKey.trim(),
        );
        if (online) setMethod("paystack");
        else if (
          rows.find(
            (row) =>
              row.enabled &&
              (row.provider === "moniepoint" || row.provider === "bank") &&
              row.accountNumber.trim(),
          )
        ) {
          setMethod("bank");
        } else if (rows.find((row) => row.enabled && row.provider === "cash")) {
          setMethod("cash");
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const paystack = gateways.find(
    (row) => row.enabled && row.provider === "paystack" && row.publicKey.trim(),
  );
  const bank = gateways.find(
    (row) =>
      row.enabled &&
      (row.provider === "moniepoint" || row.provider === "bank") &&
      row.accountNumber.trim(),
  );
  const cash = gateways.find((row) => row.enabled && row.provider === "cash");
  const byMethod: ("paystack" | "bank" | "cash")[] = ["paystack", "bank", "cash"];

  const state = licenceState(till);
  const currentExpiry = till.subscriptionExpiresAt
    ? formatDate(till.subscriptionExpiresAt)
    : "Not activated";

  async function payOnline() {
    if (!paystack) return;
    setBusy(true);
    const loaded = await loadPaystackInline();
    if (!loaded) {
      setBusy(false);
      toast.error("Could not load the payment card — try bank transfer or cash.");
      return;
    }
    const Pop = (window as { PaystackPop?: { setup: (opts: object) => { openIframe: () => void } } })
      .PaystackPop;
    if (!Pop) {
      setBusy(false);
      toast.error("Could not load the payment card — try bank transfer or cash.");
      return;
    }
    const handler = Pop.setup({
      key: paystack.publicKey,
      email: company?.email?.trim() || `${till.name.replace(/[^a-z0-9]/gi, "").toLowerCase()}@licence.ng`,
      amount: LICENCE_YEAR_MINOR,
      currency: "NGN",
      ref: reference,
      metadata: { tillId: till.id, tillName: till.name, kind: "till-licence-renewal" },
      callback: async (response: { reference?: string }) => {
        try {
          await payTillLicense(till.id, {
            reference: response.reference || reference,
            provider: "paystack",
            amountMinor: LICENCE_YEAR_MINOR,
          });
          toast.success(`${till.name} renewed for another year.`);
          onClose();
        } catch (err) {
          toast.error(err, "Payment confirmed, but renewal failed — retry.");
        } finally {
          setBusy(false);
        }
      },
      onClose: () => setBusy(false),
    });
    handler.openIframe();
  }

  async function confirmManual() {
    setBusy(true);
    try {
      const provider =
        method === "bank"
          ? bank?.name || "bank"
          : cash?.name || "cash";
      const kind = method === "bank" ? "TRF" : "CASH";
      await payTillLicense(till.id, {
        reference: makeReference(kind, till.id),
        provider,
        amountMinor: LICENCE_YEAR_MINOR,
      });
      toast.success(`${till.name} renewed for another year.`);
      onClose();
    } catch (err) {
      toast.error(err, "Could not confirm the renewal");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-pos-ink/45 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative flex min-h-full items-center justify-center p-3 sm:p-6">
        <div className="relative w-full max-w-md rounded-3xl bg-pos-surface p-5 shadow-pos-lg ring-1 ring-pos-border sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold text-pos-ink">Renew {till.name}</h2>
            <button
              onClick={onClose}
              className="grid size-8 shrink-0 place-items-center rounded-lg text-pos-ink-faint transition hover:bg-pos-surface-muted hover:text-pos-ink"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
          <p className="mt-0.5 text-[12px] text-pos-ink-muted">
            {tillProductLabel(till.product)} · now {state.status === "expired" ? "expired" : currentExpiry}
          </p>

          <div className="mt-4 rounded-2xl bg-pos-primary-soft/70 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-pos-primary">
              One year · {formatMinor(LICENCE_YEAR_MINOR)}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-pos-ink-muted">
              Renewals extend a year from the current expiry date, so you never lose unused time.
            </p>
          </div>

          <div className="mt-4 space-y-2">
            {byMethod.map((key) => {
              const gateway = key === "paystack" ? paystack : key === "bank" ? bank : cash;
              const Icon = key === "paystack" ? CreditCard : key === "bank" ? Landmark : Banknote;
              const label =
                key === "paystack"
                  ? paystack?.name || "Pay online"
                  : key === "bank"
                    ? bank?.name || "Bank transfer"
                    : cash?.name || "Cash";
              if (!gateway) return null;
              return (
                <button
                  key={key}
                  onClick={() => setMethod(key)}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                    method === key
                      ? "border-pos-primary bg-pos-primary-soft/50"
                      : "border-pos-border hover:bg-pos-surface-muted"
                  }`}
                >
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-full ${
                      method === key ? "bg-pos-primary text-white" : "bg-pos-surface-muted"
                    }`}
                  >
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-[13px] font-semibold ${
                        method === key ? "text-pos-primary" : "text-pos-ink"
                      }`}
                    >
                      {label}
                    </span>
                    <span className="block text-[11px] text-pos-ink-faint">
                      {key === "paystack"
                        ? "Card, transfer or USSD — instant confirmation"
                        : key === "bank"
                          ? bank!.accountName || "Account transfer"
                          : "Pay in person at this branch"}
                    </span>
                  </span>
                  <span
                    className={`size-4 shrink-0 rounded-full border-2 ${
                      method === key ? "border-pos-primary bg-pos-primary" : "border-pos-border"
                    }`}
                  />
                </button>
              );
            })}
            {!paystack && !bank && !cash ? (
              <p className="rounded-2xl bg-pos-surface-muted px-4 py-3 text-[12px] text-pos-ink-muted">
                No payment method is enabled yet — configure one under Settings → Organization →
                Payment gateways, then renew.
              </p>
            ) : null}
          </div>

          {method === "bank" && bank ? (
            <div className="mt-4 rounded-2xl border border-pos-border p-4">
              <p className="text-[12px] font-semibold text-pos-ink">Transfer {formatMinor(LICENCE_YEAR_MINOR)} to:</p>
              <div className="mt-2 space-y-1.5 text-[13px]">
                <p className="flex items-center justify-between gap-3">
                  <span className="text-pos-ink-muted">Account name</span>
                  <span className="font-medium text-pos-ink">{bank.accountName || "—"}</span>
                </p>
                <p className="flex items-center justify-between gap-3">
                  <span className="text-pos-ink-muted">Account number</span>
                  <button
                    onClick={async () => {
                      const ok = await copyText(bank.accountNumber);
                      toast[ok ? "success" : "error"](ok ? "Account number copied" : "Could not copy");
                    }}
                    className="inline-flex items-center gap-1.5 font-mono text-pos-ink transition hover:text-pos-primary"
                  >
                    {bank.accountNumber}
                    <Copy size={11} />
                  </button>
                </p>
                <p className="flex items-center justify-between gap-3">
                  <span className="text-pos-ink-muted">Bank</span>
                  <span className="font-medium text-pos-ink">{bank.bankName || "—"}</span>
                </p>
              </div>
            </div>
          ) : null}

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-pos-border px-4 py-2.5 text-[13px] font-medium text-pos-ink-muted transition hover:bg-pos-surface-muted"
            >
              Cancel
            </button>
            <PrimaryButton
              disabled={busy || (!paystack && !bank && !cash)}
              onClick={method === "paystack" ? payOnline : confirmManual}
            >
              {busy ? (
                <>
                  <Loader2 size={14} className="mr-1.5 animate-spin" /> Please wait…
                </>
              ) : method === "paystack" ? (
                "Pay now"
              ) : method === "bank" ? (
                "I have transferred"
              ) : (
                "Confirm cash payment"
              )}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SubscriptionManager({
  variant = "subscriptions",
}: {
  variant?: "subscriptions" | "licences";
}) {
  const { tills, ready, company } = useLivePos();
  const links = useOrgLinks();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [renewId, setRenewId] = useState<string | null>(null);

  const rows = useMemo(() => {
    if (!tills) return [];
    if (variant === "licences") {
      return [...tills].sort((a, b) => {
        const aAt = a.subscriptionExpiresAt ?? "";
        const bAt = b.subscriptionExpiresAt ?? "";
        return aAt.localeCompare(bAt);
      });
    }
    return tills;
  }, [tills, variant]);

  const stats = useMemo(() => {
    const buckets = new Map<
      string,
      { product: string; total: number; active: number; expiring: number; expired: number }
    >();
    for (const till of tills ?? []) {
      const product = tillProductLabel(till.product);
      const status = licenceState(till).status;
      const bucket = buckets.get(product) ?? {
        product,
        total: 0,
        active: 0,
        expiring: 0,
        expired: 0,
      };
      bucket.total += 1;
      if (status === "expired") bucket.expired += 1;
      else if (status === "expiring") bucket.expiring += 1;
      else if (status === "active") bucket.active += 1;
      buckets.set(product, bucket);
    }
    const byProduct = [...buckets.values()].sort(
      (a, b) => b.total - a.total || a.product.localeCompare(b.product),
    );
    return {
      byProduct,
      total: byProduct.reduce((sum, row) => sum + row.total, 0),
      active: byProduct.reduce((sum, row) => sum + row.active, 0),
      expiring: byProduct.reduce((sum, row) => sum + row.expiring, 0),
      expired: byProduct.reduce((sum, row) => sum + row.expired, 0),
      unactivated: (tills ?? []).filter((till) => !till.subscriptionExpiresAt).length,
    };
  }, [tills]);

  if (!ready) return <ManagerSkeleton variant="list" />;

  const isLicences = variant === "licences";
  const selectedTill = (tills ?? []).find((till) => till.id === selectedId) ?? null;
  const renewingTill = (tills ?? []).find((till) => till.id === renewId) ?? null;

  function openRenewal(till: HqTill) {
    setRenewId(till.id);
    setSelectedId(null);
  }

  if (!isLicences) {
    const coverage = stats.total
      ? Math.round(((stats.active + stats.expiring) / stats.total) * 100)
      : 0;
    const primaryProduct =
      stats.byProduct.find((row) => row.product)?.product ?? "Standard";
    const earliestExpiry = (tills ?? [])
      .map((till) => till.subscriptionExpiresAt)
      .filter((iso): iso is string => Boolean(iso))
      .sort()[0];
    const attentionTotal = stats.expired + stats.expiring + stats.unactivated;
    const tillCards = [...tills].sort((a, b) => {
      const order: Record<LicenceStatus, number> = {
        expired: 0,
        expiring: 1,
        none: 2,
        active: 3,
      };
      const diff = order[licenceState(a).status] - order[licenceState(b).status];
      if (diff) return diff;
      return (a.subscriptionExpiresAt ?? "").localeCompare(b.subscriptionExpiresAt ?? "");
    });

    return (
      <>
        <div className="space-y-5">
        <SetupHeader
          kicker={links.area === "producer" ? "Producer · Billing" : "Account · Billing"}
          title="Subscriptions"
          copy="Licences run per till, each valid one year from activation. See what is covered and what needs attention."
          action={
            <div className="flex items-center gap-2">
              <Link
                href="/setup/billing/licences"
                className="rounded-xl border border-pos-border px-4 py-2.5 text-sm text-pos-ink hover:bg-pos-surface-muted"
              >
                Till licences
              </Link>
              <a
                href={links.till}
                className="rounded-xl border border-pos-border px-4 py-2.5 text-sm text-pos-ink hover:bg-pos-surface-muted"
              >
                Manage tills
              </a>
            </div>
          }
        />

        <section className="rounded-[22px] border border-pos-border bg-pos-surface p-5 shadow-pos-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pos-ink-faint">
                Current plan
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-pos-ink">{primaryProduct}</h2>
                <span className="rounded-full bg-pos-primary-soft px-2.5 py-1 text-[11px] font-medium text-pos-primary">
                  {stats.total} till{stats.total === 1 ? "" : "s"}
                </span>
              </div>
              <p className="mt-1 max-w-xl text-sm text-pos-ink-muted">
                Every till runs on this product. A licence activates when the till code is entered
                on the device, and renews for another year from its current expiry.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-full bg-pos-primary-soft text-pos-primary">
                <ShieldCheck size={20} strokeWidth={1.75} />
              </span>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between text-[12px] text-pos-ink-muted">
              <span className="font-medium text-pos-ink">Licence coverage</span>
              <span>{coverage}% covered</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-pos-surface-muted">
              <div
                className={`h-full rounded-full transition-all ${
                  coverage > 0 ? "bg-pos-primary" : "bg-pos-ink-faint/40"
                }`}
                style={{ width: `${coverage}%` }}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-pos-success/10 px-2.5 py-1 text-[12px] font-medium text-pos-success">
                <CheckCircle2 size={13} /> {stats.active} active
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-pos-warning/10 px-2.5 py-1 text-[12px] font-medium text-pos-warning">
                <Clock size={13} /> {stats.expiring} expiring soon
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-pos-danger/10 px-2.5 py-1 text-[12px] font-medium text-pos-danger">
                <AlertTriangle size={13} /> {stats.expired + stats.unactivated} expired or unactivated
              </span>
            </div>
            {earliestExpiry ? (
              <p className="mt-3 text-[12px] text-pos-ink-faint">
                Earliest renewal due {formatDate(earliestExpiry)}.
              </p>
            ) : null}
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-4">
          <StatCard
            label="Tills"
            value={stats.total}
            tone="text-pos-primary"
            iconClass="text-pos-primary"
            icon={Store}
          />
          <StatCard
            label="Active"
            value={stats.active}
            tone="text-pos-success"
            iconClass="text-pos-success"
            icon={CheckCircle2}
          />
          <StatCard
            label="Expiring soon"
            value={stats.expiring}
            tone="text-pos-warning"
            iconClass="text-pos-warning"
            icon={Clock}
          />
          <StatCard
            label="Need attention"
            value={attentionTotal}
            tone="text-pos-danger"
            iconClass="text-pos-danger"
            icon={AlertTriangle}
          />
        </div>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-pos-ink">Coverage by product</h2>
            <span className="text-[12px] text-pos-ink-faint">
              Renewals extend a year from the current expiry
            </span>
          </div>
          <DataTable
            columns={["Product", "Tills", "Active", "Expiring", "Expired", "Next renewal"]}
          >
              {stats.byProduct.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-pos-ink-faint" colSpan={6}>
                    No tills registered yet — issue one under Settings → Organization or Point of
                    Sales → Till.
                  </td>
                </tr>
              ) : (
                stats.byProduct.map((row) => {
                  const next = (tills ?? [])
                    .filter(
                      (till) =>
                        tillProductLabel(till.product) === row.product &&
                        till.subscriptionExpiresAt,
                    )
                    .map((till) => till.subscriptionExpiresAt!)
                    .sort()[0];
                  return (
                    <tr key={row.product} className="border-b border-pos-border/60">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2 font-medium">
                          <Package size={14} className="text-pos-ink-muted" />
                          {row.product}
                        </span>
                      </td>
                      <td className="px-4 py-3">{row.total}</td>
                      <td className="px-4 py-3 text-pos-success">{row.active}</td>
                      <td className="px-4 py-3 text-pos-warning">{row.expiring}</td>
                      <td className="px-4 py-3 text-pos-danger">{row.expired}</td>
                      <td className="px-4 py-3 text-pos-ink-muted">
                        {next ? formatDate(next) : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </DataTable>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-pos-ink">
              Till licences
              {attentionTotal > 0 ? (
                <span className="ml-2 rounded-full bg-pos-danger/10 px-2 py-0.5 text-[11px] font-medium text-pos-danger">
                  {attentionTotal} need attention
                </span>
              ) : null}
            </h2>
            <Link
              href="/setup/billing/licences"
              className="inline-flex items-center gap-1 text-sm font-medium text-pos-primary hover:underline"
            >
              Manage licences <ArrowRight size={14} />
            </Link>
          </div>
          {tillCards.length === 0 ? (
            <div className="rounded-2xl border border-pos-border bg-pos-surface p-6 text-sm text-pos-ink-muted">
              No tills registered yet — issue one under Settings → Organization or Point of Sales →
              Till.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {tillCards.map((till) => {
                const state = licenceState(till);
                const days = daysUntil(till.subscriptionExpiresAt);
                const remaining = days === null ? 0 : Math.max(0, Math.min(100, Math.round((days / 365) * 100)));
                return (
                  <div
                    key={till.id}
                    className="flex flex-col gap-3 rounded-2xl border border-pos-border bg-pos-surface p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold text-pos-ink">
                          {till.name}
                        </p>
                        <p className="text-[12px] text-pos-ink-muted">
                          {till.code}
                          {till.branchName ? ` · ${till.branchName}` : ""}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${state.badge}`}
                      >
                        {state.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[12px] text-pos-ink-muted">
                      <Package size={13} />
                      {tillProductLabel(till.product)}
                    </div>
                    <div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-pos-surface-muted">
                        <div
                          className={`h-full rounded-full ${
                            days === null
                              ? "bg-pos-ink-faint/40"
                              : state.status === "expired"
                                ? "bg-pos-danger"
                                : state.status === "expiring"
                                  ? "bg-pos-warning"
                                  : "bg-pos-success"
                          }`}
                          style={{ width: `${remaining}%` }}
                        />
                      </div>
                      <p className="mt-1.5 text-[11px] text-pos-ink-faint">
                        {days === null
                          ? "No licence yet — enter the till code on the device to activate"
                          : `Licensed until ${formatDate(till.subscriptionExpiresAt!)} · ${remaining}% of a year remaining`}
                      </p>
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                      <span className={`text-[12px] ${state.tone}`}>{state.label}</span>
                      <PrimaryButton
                        onClick={() => openRenewal(till)}
                        className="!px-3 !py-1.5 text-xs"
                      >
                        <RefreshCw size={13} className="mr-1.5" />
                        Renew
                      </PrimaryButton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-pos-border bg-pos-surface-muted/60 p-5">
          <h3 className="text-[13px] font-semibold text-pos-ink">How licensing works</h3>
          <ol className="mt-3 grid gap-3 text-sm text-pos-ink-muted sm:grid-cols-3">
            <li className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-pos-primary-soft text-[12px] font-semibold text-pos-primary">
                1
              </span>
              <span>
                <b className="text-pos-ink">Create a till.</b> Issue it under Settings → Point of
                Sales → Till.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-pos-primary-soft text-[12px] font-semibold text-pos-primary">
                2
              </span>
              <span>
                <b className="text-pos-ink">Activate on the device.</b> Enter the till code at the
                till to start a one-year licence.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-pos-primary-soft text-[12px] font-semibold text-pos-primary">
                3
              </span>
              <span>
                <b className="text-pos-ink">Renew yearly.</b> Licences extend from the current
                expiry — renew on the Till licences page.
              </span>
            </li>
          </ol>
        </section>
      </div>
      {renewingTill ? (
        <RenewalModal till={renewingTill} company={company} onClose={() => setRenewId(null)} />
      ) : null}
      </>
    );
  }

  return (
    <div className="space-y-5">
      <SetupHeader
        kicker={links.area === "producer" ? "Producer · Billing" : "Account · Billing"}
        title="Till licences"
        copy={`${stats.expired} of ${stats.total} tills need attention · ${stats.active} active, ${stats.expiring} expiring soon. Click a till to manage its device and renewal.`}
        action={
          <Link
            href="/setup/billing/subscriptions"
            className="rounded-xl border border-pos-border px-4 py-2.5 text-sm text-pos-ink hover:bg-pos-surface-muted"
          >
            Subscriptions
          </Link>
        }
      />
      <DataTable columns={["Till", "Product", "Branch", "Device", "Status", "Licensed until", ""]}>
          {rows.length === 0 ? (
            <tr>
              <td className="px-4 py-6 text-pos-ink-faint" colSpan={7}>
                No tills registered yet — issue one under Settings → Organization or Point of Sales
                → Till.
              </td>
            </tr>
          ) : (
            rows.map((till) => {
              const state = licenceState(till);
              const paired = Boolean(till.hardwareHex);
              return (
                <tr
                  key={till.id}
                  onClick={() => setSelectedId(till.id)}
                  className="group cursor-pointer border-b border-pos-border/60 transition hover:bg-pos-surface-muted/50"
                >
                  <td className="px-4 py-3">
                    <span className="font-medium transition group-hover:text-pos-primary">
                      {till.name}
                    </span>
                    <span className="ml-2 font-mono text-xs text-pos-ink-faint">{till.code}</span>
                  </td>
                  <td className="px-4 py-3">{tillProductLabel(till.product)}</td>
                  <td className="px-4 py-3">{till.branchName}</td>
                  <td className="px-4 py-3">
                    {paired ? (
                      <span
                        className={`inline-flex items-center gap-1.5 text-[12px] ${
                          till.online ? "text-pos-success" : "text-pos-ink-muted"
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${till.online ? "bg-pos-success" : "bg-pos-ink-faint"}`}
                        />
                        <span className="max-w-[140px] truncate font-mono text-[11px]">
                          {till.hardwareHex}
                        </span>
                      </span>
                    ) : (
                      <span className="text-[12px] text-pos-ink-faint">
                        {till.unpairedAt ? "Re-pair needed" : "Unpaired"}
                      </span>
                    )}
                  </td>
                  <td className={`px-4 py-3 ${state.tone}`}>{state.label}</td>
                  <td className="px-4 py-3 text-pos-ink-muted">
                    {till.subscriptionExpiresAt
                      ? formatDate(till.subscriptionExpiresAt)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <PrimaryButton
                      onClick={(event) => {
                        event.stopPropagation();
                        openRenewal(till);
                      }}
                      className="!px-3 !py-1.5 text-xs"
                    >
                      Renew
                    </PrimaryButton>
                  </td>
                </tr>
              );
            })
          )}
        </DataTable>
      <p className="text-sm text-pos-ink-faint">
        Each licence runs one year from activation — renewals extend from the current expiry date.
        Removed devices are signed out in real time.
      </p>

      {selectedTill ? (
        <TillDetailModal
          till={selectedTill}
          company={company}
          onClose={() => setSelectedId(null)}
          onRenew={openRenewal}
        />
      ) : null}
      {renewingTill ? (
        <RenewalModal till={renewingTill} company={company} onClose={() => setRenewId(null)} />
      ) : null}
    </div>
  );
}