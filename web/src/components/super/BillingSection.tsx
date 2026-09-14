"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Banknote,
  BarChart3,
  Check,
  Copy,
  CreditCard,
  Crown,
  FileText,
  Landmark,
  Loader2,
  Pencil,
  Percent,
  Receipt,
  Sparkles,
  Store,
  Trash2,
  Wifi,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { parseNairaInput } from "@/lib/catalog";
import { useLivePos } from "@/lib/live-pos";
import {
  assignSubscription,
  deletePlan,
  planCapLabel,
  planPrice,
  payInvoice,
  savePlan,
  useLiveBilling,
  type BillingInvoice,
  type BillingPlan,
} from "@/lib/billing";
import { listSales, renewTill, type HqSale } from "@/lib/hq-api";
import { useAuth } from "@/components/AuthProvider";
import { ManagerSkeleton } from "@/components/Skeleton";
import {
  DataTable,
  PrimaryButton,
  SetupHeader,
  SetupStat,
} from "@/components/setup/SetupChrome";

function LiveBadge({ live }: { live: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-xl border border-pos-border px-3 py-2.5 text-[12px] font-medium ${
        live ? "bg-pos-success/10 text-pos-success" : "bg-pos-surface-muted text-pos-ink-faint"
      }`}
    >
      {live ? <Wifi size={13} /> : <WifiOff size={13} />}
      {live ? "Live" : "Offline"}
    </span>
  );
}

function money(minor: number) {
  return `₦${(minor / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function dateLabel(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function InvoiceTone({ status }: { status: string }) {
  const tone =
    status === "paid"
      ? "bg-pos-success/10 text-pos-success"
      : status === "overdue"
        ? "bg-pos-danger/10 text-pos-danger"
        : status === "void"
          ? "bg-pos-surface-muted text-pos-ink-faint"
          : "bg-pos-warning/10 text-pos-warning";
  const label =
    status === "paid" ? "Paid" : status === "overdue" ? "Overdue" : status === "void" ? "Void" : "Pending";
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}>{label}</span>
  );
}

function PlanModal({
  plan,
  onClose,
  token,
  onSaved,
}: {
  plan: BillingPlan | null;
  onClose: () => void;
  token: string;
  onSaved: () => void;
}) {
  const [name, setName] = useState(plan?.name ?? "");
  const [code, setCode] = useState(plan?.code ?? "");
  const [tagline, setTagline] = useState(plan?.tagline ?? "");
  const [price, setPrice] = useState(
    plan ? String(plan.priceMinor / 100 || "") : "",
  );
  const [tillCap, setTillCap] = useState(plan ? (plan.tillCap === -1 ? "" : String(plan.tillCap)) : "");
  const [popular, setPopular] = useState(plan?.popular ?? false);
  const [features, setFeatures] = useState((plan?.features ?? []).join("\n"));
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim() || !code.trim()) {
      toast.error("Plan name and code are required.");
      return;
    }
    setBusy(true);
    try {
      await savePlan(
        {
          id: plan?.id,
          name: name.trim(),
          code: code.trim(),
          tagline: tagline.trim(),
          priceMinor: parseNairaInput(price || "0"),
          tillCap: tillCap.trim() ? Number(tillCap.trim()) : -1,
          popular,
          features: features
            .split("\n")
            .map((row) => row.trim())
            .filter(Boolean),
        },
        token,
      );
      toast.success(plan ? "Plan updated." : "Plan created.");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err, "Could not save plan");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "w-full rounded-2xl bg-pos-surface-muted px-4 py-2.5 text-sm text-pos-ink outline-none ring-1 ring-transparent transition focus:ring-pos-primary/30";

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-pos-ink/45 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative flex min-h-full items-center justify-center p-3 sm:p-6">
        <div className="relative w-full max-w-lg rounded-3xl bg-pos-surface p-5 shadow-pos-lg ring-1 ring-pos-border sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-pos-ink">
                {plan ? `Edit ${plan.name}` : "New plan"}
              </h2>
              <p className="mt-0.5 text-[12px] text-pos-ink-muted">
                Plans define the till allowance and price tenants are billed yearly.
              </p>
            </div>
            <button
              onClick={onClose}
              className="grid size-8 shrink-0 place-items-center rounded-lg text-pos-ink-faint transition hover:bg-pos-surface-muted hover:text-pos-ink"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-pos-ink-muted">Name</label>
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Pro Suite" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-pos-ink-muted">Code</label>
              <input className={inputClass} value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. pro" />
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            <label className="text-[12px] font-medium text-pos-ink-muted">Tagline</label>
            <input className={inputClass} value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="One line that sells the plan" />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-pos-ink-muted">Price per year (₦)</label>
              <input className={inputClass} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0 = Free / Custom" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-pos-ink-muted">Till allowance (blank = unlimited)</label>
              <input className={inputClass} inputMode="numeric" value={tillCap} onChange={(e) => setTillCap(e.target.value)} placeholder="e.g. 10" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPopular((value) => !value)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-medium transition ${
                popular
                  ? "border-pos-primary bg-pos-primary-soft text-pos-primary"
                  : "border-pos-border text-pos-ink-muted hover:bg-pos-surface-muted"
              }`}
            >
              <Sparkles size={14} /> Most popular
            </button>
          </div>
          <div className="mt-3 space-y-1.5">
            <label className="text-[12px] font-medium text-pos-ink-muted">
              Features (one per line)
            </label>
            <textarea
              className={`${inputClass} min-h-[96px] resize-y`}
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              placeholder={"10 till licences\nUnlimited branches\nPriority support"}
            />
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-pos-border px-4 py-2.5 text-[13px] font-medium text-pos-ink-muted transition hover:bg-pos-surface-muted"
            >
              Cancel
            </button>
            <PrimaryButton disabled={busy} onClick={submit}>
              {busy ? (
                <>
                  <Loader2 size={14} className="mr-1.5 animate-spin" /> Saving…
                </>
              ) : plan ? (
                "Save changes"
              ) : (
                "Create plan"
              )}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlansPage() {
  const { plans, subscriptions, live, ready } = useLiveBilling();
  const { tills } = useLivePos();
  const { session } = useAuth();
  const token = session?.token ?? "";
  const producer = session?.scope === "producer";
  const [editing, setEditing] = useState<BillingPlan | "new" | null>(null);

  if (!ready) return <ManagerSkeleton variant="table" />;
  const activePlanId = subscriptions[0]?.planId ?? null;
  const subscription = subscriptions[0] ?? null;
  const hasTills = tills.length;
  const withinCap = (plan: BillingPlan) =>
    plan.tillCap === -1 || hasTills <= plan.tillCap;

  return (
    <div>
      <SetupHeader
        kicker="Producer · Billing"
        title="Plans"
        copy="Subscription plans available to tenant companies. Every till carries a yearly licence; higher tiers add branches, users, and support."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <SetupStat label="Till licences" value={String(tills.length)} hint="Across the platform" tone="accent" />
        <SetupStat label="Active plan" value={subscription?.planName ?? "Free"} hint={subscription ? "On this account" : "Assign a plan"} />
        <SetupStat label="Plans published" value={String(plans.length)} hint="In the catalogue" />
        <SetupStat label="Renews on" value={subscription?.renewsAt ? dateLabel(subscription.renewsAt) : "—"} hint="Subscription period" />
      </div>

      {producer ? (
        <div className="mb-5 flex justify-end">
          <PrimaryButton onClick={() => setEditing("new")}>
            <Sparkles size={15} /> New plan
          </PrimaryButton>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => {
          const active = activePlanId === plan.id;
          const fits = withinCap(plan);
          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-[22px] border p-5 ${
                active
                  ? "border-pos-primary/40 bg-pos-surface shadow-pos-primary/10 shadow-pos-md"
                  : plan.popular
                    ? "border-pos-primary/20 bg-pos-surface shadow-pos-sm"
                    : "border-pos-border bg-pos-surface shadow-pos-sm"
              }`}
            >
              {plan.popular ? (
                <span className="absolute -top-3 left-5 inline-flex items-center gap-1 rounded-full bg-pos-primary px-3 py-1 text-[11px] font-semibold text-white shadow-pos-primary">
                  <Sparkles size={12} /> Most popular
                </span>
              ) : null}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Crown size={18} className={active ? "text-pos-primary" : "text-pos-ink-faint"} />
                  <span className="text-[15px] font-semibold text-pos-ink">{plan.name}</span>
                </div>
                {producer ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditing(plan)}
                      className="grid size-7 place-items-center rounded-lg text-pos-ink-faint transition hover:bg-pos-surface-muted hover:text-pos-ink"
                      aria-label={`Edit ${plan.name}`}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={async () => {
                        if (!window.confirm(`Delete the ${plan.name} plan?`)) return;
                        try {
                          await deletePlan(plan.id, token);
                          toast.success(`${plan.name} plan deleted.`);
                        } catch (err) {
                          toast.error(err, "Could not delete plan");
                        }
                      }}
                      className="grid size-7 place-items-center rounded-lg text-pos-ink-faint transition hover:bg-pos-surface-muted hover:text-pos-danger"
                      aria-label={`Delete ${plan.name}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ) : null}
              </div>
              <p className="mt-1 text-[12px] text-pos-ink-faint">{plan.tagline}</p>
              <div className="mt-4">
                <span className="text-[26px] font-semibold tracking-tight text-pos-ink">
                  {planPrice(plan)}
                </span>
                <span className="text-[12px] text-pos-ink-faint">
                  {" "}
                  / year · {planCapLabel(plan)} tills
                </span>
              </div>
              <ul className="mt-4 space-y-2 text-[13px]">
                {(plan.features ?? []).map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-pos-ink-muted">
                    <Check size={14} className="mt-0.5 shrink-0 text-pos-success" />
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex flex-col gap-2 pt-5">
                {active ? (
                  <span className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-pos-success/10 px-4 py-2.5 text-sm font-semibold text-pos-success">
                    <BadgeCheck size={15} /> Current plan
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={!producer}
                    onClick={async () => {
                      try {
                        await assignSubscription(plan.id, {}, token);
                        toast.success(`${plan.name} is now the active plan.`);
                      } catch (err) {
                        toast.error(err, "Could not assign plan");
                      }
                    }}
                    className={`inline-flex w-full items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold ${
                      plan.popular
                        ? "bg-pos-primary text-white shadow-pos-primary"
                        : "bg-pos-surface-muted text-pos-ink"
                    } ${producer ? "transition hover:opacity-90" : "cursor-default"}`}
                  >
                    {producer ? "Set as active plan" : fits ? "Available" : "Over allowance"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editing ? (
        <PlanModal
          plan={editing === "new" ? null : editing}
          token={token}
          onClose={() => setEditing(null)}
          onSaved={() => undefined}
        />
      ) : null}
    </div>
  );
}

function SubscriptionsPage() {
  const { subscriptions, live, ready } = useLiveBilling();
  const { tills } = useLivePos();
  if (!ready) return <ManagerSkeleton variant="table" />;

  const sub = subscriptions[0] ?? null;
  const now = Date.now();
  const active = tills.filter((t) => t.online);
  const expired = tills.filter((t) => t.expired);
  const expiring = tills.filter(
    (t) => !t.expired && t.subscriptionExpiresAt && new Date(t.subscriptionExpiresAt).getTime() - now < 30 * 86400000,
  );
  const maxTills = (sub && sub.planTillCap > 0 ? sub.planTillCap : Math.max(1, tills.length));
  const utilisation = sub && sub.planTillCap > 0 ? Math.min(100, Math.round((tills.length / maxTills) * 100)) : 100;

  return (
    <div>
      <SetupHeader
        kicker="Producer · Billing"
        title="Subscriptions"
        copy="Company plan plus the live till licences attached to it. Renew before a licence lapses."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Active plan" value={sub?.planName ?? "Free"} hint={sub?.status ?? "trial"} tone="accent" />
        <SetupStat label="Tills" value={String(tills.length)} hint={`${active.length} online`} />
        <SetupStat label="Expiring" value={String(expiring.length)} hint="Within 30 days" />
        <SetupStat label="Expired" value={String(expired.length)} hint="Need renewal" />
      </div>

      {sub ? (
        <section className="mb-6 rounded-[22px] border border-pos-border bg-pos-surface p-5 shadow-pos-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pos-ink-faint">
                  {sub.companyName}
                </p>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    sub.status === "cancelled"
                      ? "bg-pos-danger/10 text-pos-danger"
                      : sub.status === "trial"
                        ? "bg-pos-warning/10 text-pos-warning"
                        : "bg-pos-success/10 text-pos-success"
                  }`}
                >
                  {sub.status}
                </span>
              </div>
              <h2 className="mt-1 text-[22px] font-semibold tracking-tight text-pos-ink">
                {sub.planName}
                {sub.planPopular ? <Sparkles size={16} className="ml-2 inline text-pos-primary" /> : null}
              </h2>
              <p className="mt-1 text-sm text-pos-ink-muted">
                {money(sub.planPriceMinor)} / year · up to {planCapLabel({ tillCap: sub.planTillCap } as BillingPlan)} till{" "}
                {sub.planTillCap === 1 ? "licence" : "licences"} · renews {dateLabel(sub.renewsAt)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/billing/plans"
                className="inline-flex items-center gap-1.5 rounded-xl border border-pos-border px-4 py-2.5 text-sm font-medium text-pos-ink transition hover:bg-pos-surface-muted"
              >
                <Crown size={14} /> Change plan
              </Link>
            </div>
          </div>
          <div className="mt-5">
            <div className="mb-1.5 flex items-center justify-between text-[12px] text-pos-ink-muted">
              <span className="font-medium text-pos-ink">Till allowance usage</span>
              <span className="tabular-nums">
                {tills.length} of {maxTills} {sub.planTillCap > 0 ? "used" : "· unlimited"} · {utilisation}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-pos-surface-muted">
              <div
                className={`h-full rounded-full transition-all ${
                  utilisation > 85 ? "bg-pos-danger" : utilisation > 60 ? "bg-pos-warning" : "bg-pos-primary"
                }`}
                style={{ width: `${utilisation}%` }}
              />
            </div>
          </div>
        </section>
      ) : (
        <div className="mb-6 rounded-[18px] border border-pos-border bg-pos-surface p-8 text-center text-sm text-pos-ink-muted">
          No subscription assigned yet — pick one on the{" "}
          <Link href="/admin/billing/plans" className="font-medium text-pos-primary hover:underline">
            Plans
          </Link>{" "}
          page.
        </div>
      )}

      {tills.length === 0 ? (
        <div className="rounded-[18px] border border-pos-border bg-pos-surface p-8 text-center text-sm text-pos-ink-muted">
          No till subscriptions yet. Tills issued under{" "}
          <Link href="/admin/tills" className="font-medium text-pos-primary hover:underline">
            Tills / POS
          </Link>{" "}
          will show their licence here.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tills.map((till) => {
            const pastDue = Boolean(till.expired);
            const urgent = !pastDue && Boolean(
              till.subscriptionExpiresAt && new Date(till.subscriptionExpiresAt).getTime() - now < 30 * 86400000,
            );
            return (
              <div
                key={till.id}
                className={`rounded-[20px] border bg-pos-surface p-5 ${
                  pastDue ? "border-pos-danger/30" : urgent ? "border-pos-warning/40" : "border-pos-border"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-pos-ink">{till.name}</p>
                    <p className="mt-0.5 text-[12px] text-pos-ink-muted">
                      {till.branchName || "Unassigned branch"} · {till.product}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      pastDue
                        ? "bg-pos-danger/10 text-pos-danger"
                        : urgent
                          ? "bg-pos-warning/10 text-pos-warning"
                          : "bg-pos-success/10 text-pos-success"
                    }`}
                  >
                    {pastDue ? "Expired" : urgent ? "Expiring soon" : till.online ? "Active" : "Active"}
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
                  <div className="rounded-2xl bg-pos-surface-muted p-3">
                    <dt className="text-[11px] text-pos-ink-faint">Licence fee</dt>
                    <dd className="mt-0.5 font-medium text-pos-ink">{money(2_500_000)} / yr</dd>
                  </div>
                  <div className="rounded-2xl bg-pos-surface-muted p-3">
                    <dt className="text-[11px] text-pos-ink-faint">Renews on</dt>
                    <dd className="mt-0.5 font-medium text-pos-ink">{dateLabel(till.subscriptionExpiresAt)}</dd>
                  </div>
                </dl>
                {pastDue || urgent ? (
                  <button
                    type="button"
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-pos-primary px-4 py-2.5 text-sm font-semibold text-white shadow-pos-primary transition hover:opacity-90"
                    onClick={async () => {
                      try {
                        await renewTill(till.id);
                        toast.success(`${till.name} licence renewed.`);
                      } catch (err) {
                        toast.error(err, "Could not renew licence");
                      }
                    }}
                  >
                    <Zap size={15} /> Renew now
                  </button>
                ) : (
                  <p className="mt-4 flex items-center gap-1.5 text-[12px] text-pos-success">
                    <BadgeCheck size={14} /> Licence covered for this period.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const PAY_METHODS = [
  { id: "paystack", label: "Paystack", hint: "Card, transfer or USSD" },
  { id: "bank", label: "Bank transfer", hint: "Account transfer" },
  { id: "cash", label: "Cash", hint: "Paid in person" },
  { id: "credit", label: "Credit", hint: "Granted by Super Admin" },
];

function PayInvoiceModal({
  invoice,
  onClose,
}: {
  invoice: BillingInvoice;
  onClose: () => void;
}) {
  const [method, setMethod] = useState("paystack");
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      await payInvoice(invoice.id, { provider: method });
      toast.success(`${invoice.invoiceNo} marked as paid via ${method}.`);
      onClose();
    } catch (err) {
      toast.error(err, "Could not confirm payment");
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
            <div>
              <h2 className="text-lg font-semibold text-pos-ink">Mark invoice paid</h2>
              <p className="mt-0.5 text-[12px] text-pos-ink-muted">
                {invoice.invoiceNo} · {invoice.companyName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="grid size-8 shrink-0 place-items-center rounded-lg text-pos-ink-faint transition hover:bg-pos-surface-muted hover:text-pos-ink"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-4 rounded-2xl bg-pos-primary-soft/70 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-pos-primary">
              {money(invoice.amountMinor)} due
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-pos-ink-muted">
              Confirm how {invoice.companyName} settled this invoice on the platform — it updates
              everywhere in real time.
            </p>
          </div>

          <div className="mt-4 space-y-2">
            {PAY_METHODS.map((row) => (
              <button
                key={row.id}
                onClick={() => setMethod(row.id)}
                className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                  method === row.id ? "border-pos-primary bg-pos-primary-soft/50" : "border-pos-border hover:bg-pos-surface-muted"
                }`}
              >
                <span
                  className={`grid size-9 shrink-0 place-items-center rounded-full ${
                    method === row.id ? "bg-pos-primary text-white" : "bg-pos-surface-muted"
                  }`}
                >
                  {row.id === "paystack" ? (
                    <CreditCard size={16} />
                  ) : row.id === "bank" ? (
                    <Landmark size={16} />
                  ) : row.id === "cash" ? (
                    <Banknote size={16} />
                  ) : (
                    <BadgeCheck size={16} />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[13px] font-semibold ${method === row.id ? "text-pos-primary" : "text-pos-ink"}`}>
                    {row.label}
                  </span>
                  <span className="block text-[11px] text-pos-ink-faint">{row.hint}</span>
                </span>
                <span
                  className={`size-4 shrink-0 rounded-full border-2 ${
                    method === row.id ? "border-pos-primary bg-pos-primary" : "border-pos-border"
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-pos-border px-4 py-2.5 text-[13px] font-medium text-pos-ink-muted transition hover:bg-pos-surface-muted"
            >
              Cancel
            </button>
            <PrimaryButton disabled={busy} onClick={confirm}>
              {busy ? (
                <>
                  <Loader2 size={14} className="mr-1.5 animate-spin" /> Confirming…
                </>
              ) : (
                "Confirm payment"
              )}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function InvoicesPage() {
  const { invoices, live, ready } = useLiveBilling();
  const [paying, setPaying] = useState<BillingInvoice | null>(null);
  if (!ready) return <ManagerSkeleton variant="table" />;

  const paid = invoices.filter((row) => row.status === "paid");
  const outstanding = invoices.filter((row) => row.status === "pending" || row.status === "overdue");
  const revenue = paid.reduce((sum, row) => sum + row.amountMinor, 0);
  const dueAmount = outstanding.reduce((sum, row) => sum + row.amountMinor, 0);

  return (
    <div>
      <SetupHeader
        kicker="Producer · Billing"
        title="Invoices"
        copy="Every subscription and till licence generates an invoice. Mark pending invoices paid when the money lands."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Total" value={String(invoices.length)} hint="All time" tone="accent" />
        <SetupStat label="Paid" value={String(paid.length)} hint="Settled" />
        <SetupStat label="Outstanding" value={money(dueAmount)} hint={`${outstanding.length} pending`} />
        <SetupStat label="Collected" value={money(revenue)} hint="Confirmed revenue" />
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-[18px] border border-pos-border bg-pos-surface p-8 text-center text-sm text-pos-ink-muted">
          No invoices yet — assign a paid plan or renew a till to generate the first one.
        </div>
      ) : (
        <DataTable columns={["Invoice", "Company", "Line item", "Amount", "Issued", "Due", "Status", ""]}>
          {invoices.map((row) => (
            <tr key={row.id} className="hover:bg-pos-surface-muted">
              <td className="px-4 py-3 font-mono text-[13px] font-medium text-pos-ink">{row.invoiceNo}</td>
              <td className="px-4 py-3 font-medium text-pos-ink">{row.companyName}</td>
              <td className="px-4 py-3 text-pos-ink-muted">{row.label || row.planName || row.tillName || "—"}</td>
              <td className="px-4 py-3 tabular-nums">{money(row.amountMinor)}</td>
              <td className="px-4 py-3 text-pos-ink-muted">{dateLabel(row.issuedAt)}</td>
              <td className="px-4 py-3 text-pos-ink-muted">{dateLabel(row.dueAt)}</td>
              <td className="px-4 py-3">
                <InvoiceTone status={row.status} />
              </td>
              <td className="px-4 py-3 text-right">
                {row.status === "pending" && row.amountMinor > 0 ? (
                  <button
                    type="button"
                    onClick={() => setPaying(row)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-pos-primary px-3 py-1.5 text-[12px] font-semibold text-white shadow-pos-primary transition hover:opacity-90"
                  >
                    <Receipt size={13} /> Mark paid
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      <div className="mt-5 flex items-center gap-3 rounded-[18px] border border-pos-border bg-pos-surface p-4 text-sm text-pos-ink-muted">
        <FileText size={16} className="shrink-0 text-pos-primary" />
        Invoices appear in real time as plans are assigned, tills activate, and licences renew.
      </div>

      {paying ? <PayInvoiceModal invoice={paying} onClose={() => setPaying(null)} /> : null}
    </div>
  );
}

function PaymentsPage() {
  const { payments, live, ready } = useLiveBilling();
  const [sales, setSales] = useState<HqSale[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    listSales().then((rows) => {
      setSales(rows);
      setLoaded(true);
    });
  }, []);

  if (!ready) return <ManagerSkeleton variant="table" />;
  const totalMinor = sales.reduce((sum, sale) => sum + sale.totalMinor, 0);
  const byTender = new Map<string, number>();
  for (const sale of sales) {
    byTender.set(sale.tender, (byTender.get(sale.tender) ?? 0) + sale.totalMinor);
  }
  const licenceRevenue = payments
    .filter((row) => Number(row.amountMinor) > 0)
    .reduce((sum, row) => sum + Number(row.amountMinor), 0);

  return (
    <div>
      <SetupHeader
        kicker="Producer · Billing"
        title="Payments"
        copy="Money flowing through the platform — tender mix from live sales plus every confirmed licence payment."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Gross sales" value={money(totalMinor)} hint={loaded ? `${sales.length} sales` : "Loading…"} tone="accent" />
        <SetupStat label="Licence revenue" value={money(licenceRevenue)} hint={`${payments.length} payments`} />
        <SetupStat label="Tenders" value={String(byTender.size)} hint="Methods in use" />
        <SetupStat label="Licence payments" value={String(payments.length)} hint="Confirmed" />
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-[20px] border border-pos-border bg-pos-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-pos-ink">Tender breakdown</h2>
            <CreditCard size={16} className="text-pos-ink-faint" />
          </div>
          {byTender.size === 0 ? (
            <p className="text-sm text-pos-ink-faint">No tender mix yet — payment methods appear from live sales.</p>
          ) : (
            <ul className="space-y-3">
              {[...byTender.entries()].map(([tender, minor]) => {
                const pct = totalMinor ? Math.round((minor / totalMinor) * 100) : 0;
                return (
                  <li key={tender}>
                    <div className="mb-1 flex items-center justify-between text-[13px]">
                      <span className="font-medium capitalize text-pos-ink">{tender}</span>
                      <span className="tabular-nums text-pos-ink-muted">
                        {money(minor)} · {pct}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-pos-surface-muted">
                      <div className="h-full rounded-full bg-pos-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="rounded-[20px] border border-pos-border bg-pos-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-pos-ink">Licence payments</h2>
            <Receipt size={16} className="text-pos-ink-faint" />
          </div>
          {payments.length === 0 ? (
            <p className="text-sm text-pos-ink-faint">
              Licence payments appear here the moment they are confirmed — plan renewals and till
              renewals alike.
            </p>
          ) : (
            <ul className="space-y-2 text-[13px]">
              {payments.slice(0, 6).map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 rounded-2xl bg-pos-surface-muted px-4 py-3">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-pos-ink">{row.tillName}</span>
                    <span className="block text-[11px] text-pos-ink-faint">
                      {row.provider} · {dateLabel(row.paidAt)}
                    </span>
                  </span>
                  <span className="shrink-0 font-medium text-pos-ink">{money(row.amountMinor)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {payments.length > 0 ? (
        <DataTable columns={["Line item", "Provider", "Reference", "Amount", "Paid", "Licence runs to"]}>
          {payments.map((row) => (
            <tr key={row.id} className="hover:bg-pos-surface-muted">
              <td className="px-4 py-3 font-medium text-pos-ink">{row.tillName}</td>
              <td className="px-4 py-3 capitalize text-pos-ink-muted">{row.provider}</td>
              <td className="px-4 py-3 font-mono text-[12px] text-pos-ink-muted">{row.reference}</td>
              <td className="px-4 py-3 tabular-nums">{money(row.amountMinor)}</td>
              <td className="px-4 py-3 text-pos-ink-muted">{dateLabel(row.paidAt)}</td>
              <td className="px-4 py-3 text-pos-ink-muted">{dateLabel(row.expiresAt)}</td>
            </tr>
          ))}
        </DataTable>
      ) : null}
    </div>
  );
}

function DiscountsPage() {
  const [codes, setCodes] = useState<Array<{ code: string; percent: number; uses: number; expires: string; active: boolean }>>([
    { code: "LAUNCH-10", percent: 10, uses: 0, expires: "31 Dec 2026", active: true },
    { code: "TEAM-25", percent: 25, uses: 0, expires: "31 Dec 2026", active: true },
    { code: "RETAIL50", percent: 50, uses: 0, expires: "31 Dec 2026", active: false },
  ]);
  const [newCode, setNewCode] = useState("");

  function addCode() {
    if (!newCode.trim()) return;
    setCodes((rows) => [
      { code: newCode.trim().toUpperCase(), percent: 10, uses: 0, expires: "31 Dec 2026", active: true },
      ...rows,
    ]);
    setNewCode("");
    toast.success("Discount code created.");
  }

  return (
    <div>
      <SetupHeader
        kicker="Producer · Billing"
        title="Discounts"
        copy="Promotional codes that apply to subscription licences. Codes are distributed to prospective tenants."
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <SetupStat label="Active codes" value={String(codes.filter((c) => c.active).length)} tone="accent" />
        <SetupStat label="Total uses" value={String(codes.reduce((sum, c) => sum + c.uses, 0))} />
        <SetupStat label="Revenue lost" value="₦0" hint="Discount given" />
        <SetupStat label="Expiry" value="31 Dec 2026" hint="Uniform across codes" />
      </div>
      <div className="mb-6 rounded-[20px] border border-pos-border bg-pos-surface p-5">
        <p className="text-[15px] font-semibold text-pos-ink">Create a code</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            className="flex-1 rounded-full bg-pos-surface-muted px-4 py-2.5 text-sm text-pos-ink outline-none ring-1 ring-transparent transition focus:ring-pos-primary/30"
            placeholder="e.g. BLACKFRIDAY-30"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCode()}
          />
          <PrimaryButton onClick={addCode}>
            <Percent size={15} /> Create code
          </PrimaryButton>
        </div>
      </div>
      <ul className="space-y-2">
        {codes.map((row) => (
          <li
            key={row.code}
            className="flex flex-wrap items-center gap-3 rounded-[18px] border border-pos-border bg-pos-surface px-5 py-4"
          >
            <code className="rounded-lg bg-pos-surface-muted px-2.5 py-1 font-semibold text-pos-primary">{row.code}</code>
            <span className="text-[12px] text-pos-ink-faint">{row.percent}% off licence</span>
            <span className="text-[12px] text-pos-ink-faint">{row.uses} uses</span>
            <span className="text-[12px] text-pos-ink-faint">Expires {row.expires}</span>
            <span
              className={`ml-auto rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                row.active ? "bg-pos-success/10 text-pos-success" : "bg-pos-surface-muted text-pos-ink-faint"
              }`}
            >
              {row.active ? "Active" : "Paused"}
            </span>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full bg-pos-surface-muted px-3 py-1.5 text-[12px] font-medium text-pos-ink hover:text-pos-primary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(row.code);
                  toast.success("Code copied.");
                } catch {
                  toast.error("Could not copy code.");
                }
              }}
            >
              <Copy size={13} /> Copy
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function UsagePage() {
  const { subscriptions, plans, live, ready } = useLiveBilling();
  const { tills, stores, branches } = useLivePos();
  if (!ready) return <ManagerSkeleton variant="table" />;

  const sub = subscriptions[0] ?? null;
  const plan = plans.find((row) => row.id === (sub?.planId ?? "")) ?? null;
  const active = tills.filter((t) => t.online).length;
  const total = tills.length;
  const allowance = plan?.tillCap !== undefined && plan.tillCap > 0 ? plan.tillCap : total;
  const pct = total ? Math.min(100, Math.round((total / (plan?.tillCap && plan.tillCap > 0 ? plan.tillCap : total)) * 100)) : 0;

  return (
    <div>
      <SetupHeader
        kicker="Producer · Billing"
        title="Usage"
        copy="Licence consumption against the active plan. Stay under your till allowance to avoid overage."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Till licences" value={String(total)} hint={`${active} online now`} tone="accent" />
        <SetupStat label="Allowance" value={String(allowance)} hint={plan?.name ?? "No plan"} />
        <SetupStat label="Plan price" value={plan ? planPrice(plan) : "—"} hint="Per year" />
        <SetupStat label="Branches" value={String(branches.length)} hint={`${stores.length} stores`} />
      </div>
      <div className="mb-6 rounded-[20px] border border-pos-border bg-pos-surface p-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-medium text-pos-ink">Licence usage · {plan?.name ?? "custom"}</span>
          <span className="tabular-nums text-pos-ink-muted">
            {plan?.tillCap && plan.tillCap > 0
              ? `${total} of ${plan.tillCap} used · ${pct}%`
              : `${total} tills · unlimited`}
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-pos-surface-muted">
          <div
            className={`h-full rounded-full transition-all ${
              pct > 85 ? "bg-pos-danger" : pct > 60 ? "bg-pos-warning" : "bg-pos-primary"
            }`}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
        {plan?.tillCap != null && plan.tillCap > 0 && total > plan.tillCap ? (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-pos-danger/10 px-3 py-1 text-[12px] font-medium text-pos-danger">
            Over your allowance — upgrade the plan under Billing → Plans.
          </p>
        ) : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[20px] border border-pos-border bg-pos-surface p-5">
          <h2 className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-pos-ink">
            <Store size={15} className="text-pos-ink-muted" /> By store
          </h2>
          {stores.length === 0 ? (
            <p className="text-sm text-pos-ink-faint">No stores yet.</p>
          ) : (
            <ul className="space-y-3">
              {stores.map((store) => {
                const count = tills.filter((t) => t.storeId === store.id).length;
                const p = total ? (count / total) * 100 : 0;
                return (
                  <li key={store.id}>
                    <div className="mb-1 flex justify-between text-[13px]">
                      <span className="font-medium text-pos-ink">{store.name}</span>
                      <span className="tabular-nums text-pos-ink-muted">{count} tills</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-pos-surface-muted">
                      <div className="h-full rounded-full bg-pos-primary" style={{ width: `${p}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="rounded-[20px] border border-pos-border bg-pos-surface p-5">
          <h2 className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-pos-ink">
            <BarChart3 size={15} className="text-pos-ink-muted" /> By branch
          </h2>
          {branches.length === 0 ? (
            <p className="text-sm text-pos-ink-faint">No branches yet.</p>
          ) : (
            <ul className="divide-y divide-pos-border/45">
              {branches.map((branch) => {
                const count = tills.filter((t) => t.branchId === branch.id).length;
                return (
                  <li key={branch.id} className="flex items-center justify-between py-2.5 text-[13px]">
                    <span className="font-medium text-pos-ink">{branch.name}</span>
                    <span className="tabular-nums text-pos-ink-muted">
                      {count} till{count === 1 ? "" : "s"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export function BillingSection({ path }: { path: string }) {
  if (path === "/admin/billing/plans") return <PlansPage />;
  if (path === "/admin/billing/invoices") return <InvoicesPage />;
  if (path === "/admin/billing/payments") return <PaymentsPage />;
  if (path === "/admin/billing/discounts") return <DiscountsPage />;
  if (path === "/admin/billing/usage") return <UsagePage />;
  return <SubscriptionsPage />;
}