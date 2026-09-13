"use client";

import Link from "next/link";
import { BarChart3, Boxes, Building2, CreditCard, Monitor, ScrollText, TrendingUp, Users } from "lucide-react";
import { useLiveDirectory } from "@/lib/live-directory";
import { useLivePos } from "@/lib/live-pos";
import { groupScope } from "@/lib/access";
import { companyPath } from "@/lib/company-workspace";
import { ManagerSkeleton } from "@/components/Skeleton";
import { SetupHeader, SetupStat } from "@/components/setup/SetupChrome";

const DESKS = [
  { href: "/admin/companies", label: "Companies", copy: "Tenant profiles and workspaces", icon: Building2 },
  { href: "/admin/tills", label: "Tills / POS", copy: "Till pairing and licence allocation", icon: Monitor },
  { href: "/admin/billing/usage", label: "Usage", copy: "Licence and resource consumption", icon: BarChart3 },
  { href: "/admin/security/logins", label: "Login activity", copy: "Authentication across the platform", icon: Users },
  { href: "/admin/security/audit", label: "Audit logs", copy: "Administrative action history", icon: ScrollText },
  { href: "/admin/support/tickets", label: "Support tickets", copy: "Open and escalated requests", icon: CreditCard },
];

export function PlatformAnalytics() {
  const { accounts, groups, ready: dirReady } = useLiveDirectory();
  const { company, stores, branches, tills, live, ready } = useLivePos();
  if (!ready || !dirReady) return <ManagerSkeleton variant="table" />;

  const producerIds = new Set(
    groups.filter((row) => groupScope(row) === "producer").map((row) => row.id),
  );
  const staff = accounts.filter((row) => producerIds.has(row.groupId));

  return (
    <div>
      <SetupHeader
        kicker="Producer · Analytics"
        title="Platform analytics"
        copy="Platform-wide operational metrics — companies, tills, staff, and where to dig deeper."
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Companies" value={company ? "1" : "0"} hint={company?.name || "None yet"} tone="accent" />
        <SetupStat label="Tills" value={String(tills.length)} hint={`${tills.filter((t) => t.online).length} online`} />
        <SetupStat label="Locations" value={String(branches.length)} hint={`${stores.length} stores`} />
        <SetupStat label="Staff" value={String(staff.length)} hint={`${accounts.length} accounts`} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {DESKS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-start gap-3 rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm text-pos-ink hover:border-pos-primary/30"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-pos-surface-muted text-pos-ink-muted">
                <Icon size={16} />
              </span>
              <span className="min-w-0">
                <span className="block font-medium">{item.label}</span>
                <span className="mt-0.5 block text-pos-ink-muted">{item.copy}</span>
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm text-pos-ink-muted">
        <p>
          {live ? (
            <>Data is live from the connected company. Open the company workspace for sales and reports.</>
          ) : (
            <>Backend offline — metrics shown reflect cached state.</>
          )}{" "}
          {company ? (
            <Link href={companyPath(company.id, "sales")} className="font-medium text-pos-primary hover:underline">
              <TrendingUp size={13} className="mr-1 inline" />
              {company.name} sales
            </Link>
          ) : null}
        </p>
        <p className="mt-3 flex items-center gap-1.5 text-[12px] text-pos-ink-faint">
          <Boxes size={13} />
          Company-level sales, stock, and ledger analytics live inside the company workspace.
        </p>
      </div>
    </div>
  );
}