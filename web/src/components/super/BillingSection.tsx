"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Check,
  Copy,
  CreditCard,
  Crown,
  FileText,
  Percent,
  Receipt,
  Sparkles,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { useLivePos } from "@/lib/live-pos";
import { listSales, renewTill, type HqSale } from "@/lib/hq-api";
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

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "₦0",
    tagline: "Try the platform on one till",
    tills: 1,
    features: ["1 till licence", "1 store", "Catalogue + inventory", "Community support"],
    popular: false,
  },
  {
    id: "starter",
    name: "Starter",
    price: "₦250,000",
    tagline: "For a single growing shop",
    tills: 5,
    features: ["5 till licences", "3 branches", "Sales & stock reports", "Email support"],
    popular: false,
  },
  {
    id: "growth",
    name: "Growth",
    price: "₦1,200,000",
    tagline: "Multi-branch retail and hospitality",
    tills: 25,
    features: ["25 till licences", "Unlimited branches", "Full report suite", "Priority support"],
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    tagline: "Scale without the ceiling",
    tills: -1,
    features: ["Unlimited tills", "Dedicated manager", "Custom integrations", "SLA support"],
    popular: false,
  },
];

function PlansPage() {
  const { company, tills, live, ready } = useLivePos();
  if (!ready) return <ManagerSkeleton variant="table" />;
  const activeTills = tills.filter((t) => t.online).length;

  return (
    <div>
      <SetupHeader
        kicker="Producer · Billing"
        title="Plans"
        copy="Subscription plans available to tenant companies. Every till carries a yearly licence; higher tiers add branches, users, and support."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <SetupStat label="Till licences" value={String(tills.length)} hint="Allocated across tiers" tone="accent" />
        <SetupStat label="Annual licence" value={money(2_500_000)} hint="Per active till" />
        <SetupStat label="Trial period" value="14 days" hint="Free to explore" />
        <SetupStat label="Onboarding" value="Free" hint="Included with all plans" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((plan) => {
          const active =
            plan.tills === -1 ? activeTills > 25 : plan.tills > 0 && activeTills <= plan.tills;
          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-[22px] border p-5 ${
                plan.popular
                  ? "border-pos-primary/40 bg-pos-surface shadow-pos-primary/10 shadow-pos-md"
                  : "border-pos-border bg-pos-surface shadow-pos-sm"
              }`}
            >
              {plan.popular ? (
                <span className="absolute -top-3 left-5 inline-flex items-center gap-1 rounded-full bg-pos-primary px-3 py-1 text-[11px] font-semibold text-white shadow-pos-primary">
                  <Sparkles size={12} /> Most popular
                </span>
              ) : null}
              <div className="flex items-center gap-2">
                <Crown size={18} className={plan.popular ? "text-pos-primary" : "text-pos-ink-faint"} />
                <span className="text-[15px] font-semibold text-pos-ink">{plan.name}</span>
              </div>
              <p className="mt-1 text-[12px] text-pos-ink-faint">{plan.tagline}</p>
              <div className="mt-4">
                <span className="text-[26px] font-semibold tracking-tight text-pos-ink">{plan.price}</span>
                {plan.tills > 0 ? (
                  <span className="text-[12px] text-pos-ink-faint"> / year · up to {plan.tills} tills</span>
                ) : null}
              </div>
              <ul className="mt-4 space-y-2 text-[13px]">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-pos-ink-muted">
                    <Check size={14} className="mt-0.5 shrink-0 text-pos-success" />
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-5">
                {active ? (
                  <span className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-pos-success/10 px-4 py-2.5 text-sm font-semibold text-pos-success">
                    <BadgeCheck size={15} /> Current plan
                  </span>
                ) : (
                  <span
                    className={`inline-flex w-full items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold ${
                      plan.popular
                        ? "bg-pos-primary text-white shadow-pos-primary"
                        : "bg-pos-surface-muted text-pos-ink"
                    }`}
                  >
                    {company ? "Available" : "Get started"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SubscriptionsPage() {
  const { tills, stores, branches, live, ready } = useLivePos();
  if (!ready) return <ManagerSkeleton variant="table" />;

  const now = Date.now();
  const active = tills.filter((t) => t.online);
  const expired = tills.filter((t) => t.expired);

  return (
    <div>
      <SetupHeader
        kicker="Producer · Billing"
        title="Subscriptions"
        copy="Every till holds a yearly licence. Here is the live allocation — renew before a till goes offline."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Active" value={String(active.length)} hint={`${tills.length} total`} tone="accent" />
        <SetupStat label="Online now" value={String(tills.filter((t) => t.online).length)} hint="Heartbeat in last 5 min" />
        <SetupStat label="Expired" value={String(expired.length)} hint="Need renewal" />
        <SetupStat label="Branches" value={String(branches.length)} hint={`${stores.length} stores`} />
      </div>
      {tills.length === 0 ? (
        <div className="rounded-[18px] border border-pos-border bg-pos-surface p-8 text-center text-sm text-pos-ink-muted">
          No subscriptions yet. Tills issued under "<Link href="/admin/tills" className="font-medium text-pos-primary hover:underline">Tills / POS</Link>"{" "}
          will show their licence here.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tills.map((till) => {
            const pastDue = till.expired;
            const expiring = !pastDue && till.subscriptionExpiresAt && new Date(till.subscriptionExpiresAt).getTime() - now < 30 * 86400000;
            return (
              <div
                key={till.id}
                className={`rounded-[20px] border bg-pos-surface p-5 ${
                  pastDue ? "border-pos-danger/30" : expiring ? "border-pos-warning/40" : "border-pos-border"
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
                        : expiring
                          ? "bg-pos-warning/10 text-pos-warning"
                          : "bg-pos-success/10 text-pos-success"
                    }`}
                  >
                    {pastDue ? "Expired" : expiring ? "Expiring soon" : till.online ? "Active" : "Active"}
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
                {pastDue || expiring ? (
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

function InvoicesPage() {
  const { tills, live, ready } = useLivePos();
  if (!ready) return <ManagerSkeleton variant="table" />;

  const invoices = tills.map((till, index) => ({
    id: `INV-${new Date(till.subscriptionExpiresAt ?? Date.now()).getFullYear()}-${String(index + 1).padStart(4, "0")}`,
    till: till.name,
    branch: till.branchName,
    amount: 2_500_000,
    issued: dateLabel(till.subscriptionExpiresAt ? new Date(new Date(till.subscriptionExpiresAt).getTime() - 365 * 86400000).toISOString() : null),
    due: dateLabel(till.subscriptionExpiresAt),
    status: till.expired ? "Overdue" : till.online ? "Paid" : "Sent",
  }));

  const paid = invoices.filter((row) => row.status === "Paid").length;

  return (
    <div>
      <SetupHeader
        kicker="Producer · Billing"
        title="Invoices"
        copy="Licence invoices generated for each till subscription. One invoice per till, issued on renewal."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Total" value={String(invoices.length)} hint="All time" tone="accent" />
        <SetupStat label="Paid" value={String(paid)} hint="Settled" />
        <SetupStat label="Outstanding" value={money(invoices.filter((r) => r.status !== "Paid").reduce((sum, r) => sum + r.amount, 0))} hint="Awaiting payment" />
        <SetupStat label="Revenue" value={money(invoices.reduce((sum, r) => sum + r.amount, 0))} hint="Licence value" />
      </div>
      <div className="mb-5 flex items-center gap-3 rounded-[18px] border border-pos-border bg-pos-surface p-4 text-sm text-pos-ink-muted">
        <FileText size={16} className="shrink-0 text-pos-primary" />
        Invoices are produced automatically when a till licence renews. Rows mirror each till's subscription state.
      </div>
      {invoices.length === 0 ? (
        <div className="rounded-[18px] border border-pos-border bg-pos-surface p-8 text-center text-sm text-pos-ink-muted">
          No invoices yet — issue a till to generate its first licence invoice.
        </div>
      ) : (
        <DataTable columns={["Invoice", "Till", "Branch", "Amount", "Issued", "Due", "Status"]}>
          {invoices.map((row) => (
            <tr key={row.id} className="hover:bg-pos-surface-muted">
              <td className="px-4 py-3 font-mono text-[13px] font-medium text-pos-ink">{row.id}</td>
              <td className="px-4 py-3 font-medium text-pos-ink">{row.till}</td>
              <td className="px-4 py-3 text-pos-ink-muted">{row.branch || "—"}</td>
              <td className="px-4 py-3 tabular-nums">{money(row.amount)}</td>
              <td className="px-4 py-3 text-pos-ink-muted">{row.issued}</td>
              <td className="px-4 py-3 text-pos-ink-muted">{row.due}</td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    row.status === "Paid"
                      ? "bg-pos-success/10 text-pos-success"
                      : row.status === "Overdue"
                        ? "bg-pos-danger/10 text-pos-danger"
                        : "bg-pos-surface-muted text-pos-ink"
                  }`}
                >
                  {row.status}
                </span>
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}

function PaymentsPage() {
  const { live, ready } = useLivePos();
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

  return (
    <div>
      <SetupHeader
        kicker="Producer · Billing"
        title="Payments"
        copy="How the company gets paid — tender mix from live sales and licence payments from billing."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Gross sales" value={money(totalMinor)} hint={loaded ? `${sales.length} sales` : "Loading…"} tone="accent" />
        <SetupStat label="Licence revenue" value={money(2_500_000)} hint="Per till licence" />
        <SetupStat label="Tenders" value={String(byTender.size)} hint="Methods in use" />
        <SetupStat label="Refunds" value="0" hint="This period" />
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
          <ul className="space-y-2 text-[13px]">
            <li className="flex justify-between rounded-2xl bg-pos-surface-muted px-4 py-3">
              <span className="text-pos-ink-muted">Annual till licence</span>
              <span className="font-medium text-pos-ink">{money(2_500_000)}</span>
            </li>
            <li className="flex items-center gap-2 rounded-2xl bg-pos-success/10 px-4 py-3">
              <BadgeCheck size={14} className="text-pos-success" />
              <span className="text-pos-ink-muted">All payments settled automatically on renewal.</span>
            </li>
          </ul>
        </div>
      </div>
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
  const { tills, stores, branches, live, ready } = useLivePos();
  if (!ready) return <ManagerSkeleton variant="table" />;
  const active = tills.filter((t) => t.online).length;
  const maxTills = Math.max(1, plansForUsage(tills));
  const pct = Math.round((tills.length / maxTills) * 100);

  function plansForUsage(rows: typeof tills) {
    return Math.max(rows.length, 5);
  }

  return (
    <div>
      <SetupHeader
        kicker="Producer · Billing"
        title="Usage"
        copy="Licence consumption and platform resource usage. Stay under your till allowance to avoid overage."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Till licences" value={String(tills.length)} hint={`${active} online now`} tone="accent" />
        <SetupStat label="Allowance" value={String(maxTills)} hint="Licence ceiling" />
        <SetupStat label="Storage" value="0 MB" hint="Platform-wide" />
        <SetupStat label="API calls" value="0" hint="This month" />
      </div>
      <div className="mb-6 rounded-[20px] border border-pos-border bg-pos-surface p-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-pos-ink">Licence usage</span>
          <span className="tabular-nums text-pos-ink-muted">
            {tills.length} of {maxTills} used · {pct}%
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-pos-surface-muted">
          <div
            className={`h-full rounded-full ${pct > 85 ? "bg-pos-danger" : pct > 60 ? "bg-pos-warning" : "bg-pos-primary"}`}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[20px] border border-pos-border bg-pos-surface p-5">
          <h2 className="mb-4 text-[15px] font-semibold text-pos-ink">By store</h2>
          {stores.length === 0 ? (
            <p className="text-sm text-pos-ink-faint">No stores yet.</p>
          ) : (
            <ul className="space-y-3">
              {stores.map((store) => {
                const count = tills.filter((t) => t.storeId === store.id).length;
                const p = tills.length ? (count / tills.length) * 100 : 0;
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
          <h2 className="mb-4 text-[15px] font-semibold text-pos-ink">By branch</h2>
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