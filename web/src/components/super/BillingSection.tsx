"use client";

import Link from "next/link";
import {
  Wifi,
  WifiOff,
} from "lucide-react";
import { SetupHeader, SetupStat } from "@/components/setup/SetupChrome";
import { ManagerSkeleton } from "@/components/Skeleton";
import { useLivePos } from "@/lib/live-pos";

interface Plan {
  id: string;
  name: string;
  price: number;
  interval: string;
  features: string[];
}

interface Invoice {
  id: string;
  amount: number;
  status: string;
  date: string;
  company: string;
}

interface Payment {
  id: string;
  amount: number;
  method: string;
  status: string;
  date: string;
}

interface Discount {
  id: string;
  code: string;
  percent: number;
  uses: number;
  active: boolean;
}

const PLANS: Plan[] = [
  { id: "starter", name: "Starter", price: 15000, interval: "month", features: ["1 till", "Basic reporting", "Email support"] },
  { id: "growth", name: "Growth", price: 45000, interval: "month", features: ["5 tills", "Advanced analytics", "Priority support", "Multi-branch"] },
  { id: "enterprise", name: "Enterprise", price: 120000, interval: "month", features: ["Unlimited tills", "Custom integrations", "Dedicated support", "API access"] },
];

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

function naira(n: number) {
  return `₦${n.toLocaleString()}`;
}

function PlansPage() {
  return (
    <div>
      <SetupHeader
        kicker="Producer · Billing"
        title="Plans"
        copy="Subscription plans available to tenant companies."
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className="min-h-[180px] rounded-[18px] border border-pos-border bg-pos-surface p-5"
          >
            <div className="mb-3 text-[13px] font-semibold text-pos-ink">{plan.name}</div>
            <div className="mb-1 text-[22px] font-semibold tabular-nums text-pos-ink">
              {naira(plan.price)}
              <span className="text-[13px] font-normal text-pos-ink-muted">/{plan.interval}</span>
            </div>
            <ul className="mt-3 space-y-1.5">
              {plan.features.map((f) => (
                <li key={f} className="text-[13px] text-pos-ink-muted">
                  · {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function SubscriptionsPage() {
  const { live, ready } = useLivePos();
  if (!ready) return <ManagerSkeleton variant="table" />;
  return (
    <div>
      <SetupHeader
        kicker="Producer · Billing"
        title="Subscriptions"
        copy="Active company subscriptions and licence allocation."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Active" value="0" hint="No subscriptions yet" />
        <SetupStat label="Trial" value="0" hint="In trial period" />
        <SetupStat label="Expired" value="0" hint="Past due" />
        <SetupStat label="Revenue" value="₦0" hint="This month" tone="accent" />
      </div>
      <div className="rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm text-pos-ink-muted">
        <p>Company subscriptions appear here once tenants sign up for a plan.</p>
        <p className="mt-3">
          <Link href="/admin/billing/plans" className="font-medium text-pos-primary hover:underline">
            View plans
          </Link>
        </p>
      </div>
    </div>
  );
}

function InvoicesPage() {
  const { live, ready } = useLivePos();
  if (!ready) return <ManagerSkeleton variant="table" />;
  return (
    <div>
      <SetupHeader
        kicker="Producer · Billing"
        title="Invoices"
        copy="Generated invoices for company subscriptions and add-ons."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Total" value="0" hint="All time" />
        <SetupStat label="Paid" value="0" hint="Settled" tone="accent" />
        <SetupStat label="Pending" value="0" hint="Awaiting payment" />
        <SetupStat label="Overdue" value="0" hint="Past due date" />
      </div>
      <div className="rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm text-pos-ink-muted">
        <p>Invoices are generated when companies subscribe to plans or purchase add-ons.</p>
      </div>
    </div>
  );
}

function PaymentsPage() {
  const { live, ready } = useLivePos();
  if (!ready) return <ManagerSkeleton variant="table" />;
  return (
    <div>
      <SetupHeader
        kicker="Producer · Billing"
        title="Payments"
        copy="Payment transactions across all tenant companies."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Total received" value="₦0" hint="All time" tone="accent" />
        <SetupStat label="This month" value="₦0" hint="Current period" />
        <SetupStat label="Transactions" value="0" hint="All time" />
        <SetupStat label="Failed" value="0" hint="Need attention" />
      </div>
      <div className="rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm text-pos-ink-muted">
        <p>Payment records appear here as companies pay their subscription invoices.</p>
      </div>
    </div>
  );
}

function DiscountsPage() {
  const { live, ready } = useLivePos();
  if (!ready) return <ManagerSkeleton variant="table" />;
  return (
    <div>
      <SetupHeader
        kicker="Producer · Billing"
        title="Discounts"
        copy="Promotional codes and volume discounts for subscriptions."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Active codes" value="0" hint="Currently valid" />
        <SetupStat label="Total uses" value="0" hint="All time redemptions" />
        <SetupStat label="Revenue lost" value="₦0" hint="Discount given" />
        <SetupStat label="Expired" value="0" hint="No longer valid" />
      </div>
      <div className="rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm text-pos-ink-muted">
        <p>Create discount codes to offer promotional pricing on subscription plans.</p>
      </div>
    </div>
  );
}

function UsagePage() {
  const { tills, live, ready } = useLivePos();
  if (!ready) return <ManagerSkeleton variant="table" />;
  return (
    <div>
      <SetupHeader
        kicker="Producer · Billing"
        title="Usage"
        copy="Licence consumption and resource usage across the platform."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Till licences" value={String(tills.length)} hint="Allocated" tone="accent" />
        <SetupStat label="Active tills" value={String(tills.filter((t) => t.online).length)} hint="Currently online" />
        <SetupStat label="Storage" value="0 MB" hint="Platform-wide" />
        <SetupStat label="API calls" value="0" hint="This month" />
      </div>
      <div className="rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm text-pos-ink-muted">
        <p>Usage metrics track resource consumption for billing and capacity planning.</p>
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
