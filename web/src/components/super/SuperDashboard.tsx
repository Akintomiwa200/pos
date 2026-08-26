"use client";

import Link from "next/link";
import {
  BarChart3,
  Building2,
  CreditCard,
  Headphones,
  Monitor,
  Receipt,
  Shield,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useLiveDirectory } from "@/lib/live-directory";
import { useLivePos } from "@/lib/live-pos";
import { groupScope } from "@/lib/access";
import { companyPath } from "@/lib/company-workspace";
import { ManagerSkeleton } from "@/components/Skeleton";
import { SetupHeader, SetupStat } from "@/components/setup/SetupChrome";

const SHORTCUTS = [
  { href: "/admin/companies", label: "Companies", icon: Building2 },
  { href: "/admin/tills", label: "Tills / POS", icon: Monitor },
  { href: "/admin/billing/subscriptions", label: "Subscriptions", icon: Receipt },
  { href: "/admin/people/owners", label: "Company owners", icon: Users },
  { href: "/admin/commerce/gateways", label: "Gateways", icon: CreditCard },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/support", label: "Support", icon: Headphones },
  { href: "/admin/administrators", label: "Administrators", icon: Shield },
];

export function SuperDashboard() {
  const { accounts, groups, live, ready } = useLiveDirectory();
  const { company, stores, branches, tills, live: posLive, ready: posReady } = useLivePos();

  const producerIds = new Set(
    groups.filter((row) => groupScope(row) === "producer").map((row) => row.id),
  );
  const tenantIds = new Set(
    groups.filter((row) => groupScope(row) !== "producer").map((row) => row.id),
  );
  const staff = accounts.filter((row) => producerIds.has(row.groupId));
  const owners = accounts.filter((row) => tenantIds.has(row.groupId));

  if (!ready || !posReady) return <ManagerSkeleton variant="table" />;

  return (
    <div>
      <SetupHeader
        kicker="Producer · Super Admin"
        title="Platform overview"
        copy="You administer the SaaS — companies, billing, tills, and producer staff. Open a company to manage that tenant's products, cashiers, and sales."
        action={
          <span
            className={`inline-flex items-center gap-1.5 rounded-xl border border-pos-border px-3 py-2.5 text-[12px] font-medium ${
              live && posLive
                ? "bg-pos-success/10 text-pos-success"
                : "bg-pos-surface-muted text-pos-ink-faint"
            }`}
          >
            {live && posLive ? <Wifi size={13} /> : <WifiOff size={13} />}
            {live && posLive ? "Live" : "Offline"}
          </span>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat
          label="Companies"
          value={company?.name ? "1" : "0"}
          hint={company?.name || "None yet"}
          tone="accent"
        />
        <SetupStat
          label="Tills"
          value={String(tills.length)}
          hint={`${tills.filter((row) => row.online).length} online`}
        />
        <SetupStat label="Company users" value={String(owners.length)} hint={`${stores.length} stores`} />
        <SetupStat label="Producer staff" value={String(staff.length)} hint={`${branches.length} branches`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[18px] border border-pos-border bg-pos-surface p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold">Platform</h2>
            <Link href="/admin/activity" className="text-[13px] font-medium text-pos-primary hover:underline">
              Activity
            </Link>
          </div>
          <ul className="grid gap-1 sm:grid-cols-2">
            {SHORTCUTS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-pos-surface-muted"
                  >
                    <span className="grid size-9 place-items-center rounded-[10px] bg-pos-surface-muted text-pos-ink-muted">
                      <Icon size={16} />
                    </span>
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-[18px] border border-pos-border bg-pos-surface p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold">Registered company</h2>
            <Link href="/admin/companies" className="text-[13px] font-medium text-pos-primary hover:underline">
              All companies
            </Link>
          </div>
          {company ? (
            <div>
              <p className="text-[16px] font-semibold">{company.name}</p>
              <p className="mt-1 text-sm text-pos-ink-muted">
                {company.email || "No email"} · {company.state || company.country}
              </p>
              <p className="mt-3 text-sm text-pos-ink-muted">
                {stores.length} store{stores.length === 1 ? "" : "s"} · {branches.length} branch
                {branches.length === 1 ? "" : "es"} · {tills.length} till{tills.length === 1 ? "" : "s"}
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-[13px] font-medium">
                <Link href={companyPath(company.id)} className="text-pos-primary hover:underline">
                  Open workspace
                </Link>
                <Link href="/admin/companies/register" className="text-pos-primary hover:underline">
                  Register company
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-sm text-pos-ink-muted">
              No tenant company yet.{" "}
              <Link href="/admin/companies/register" className="font-medium text-pos-primary hover:underline">
                Register one
              </Link>
              .
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
