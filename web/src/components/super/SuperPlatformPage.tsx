"use client";

import Link from "next/link";
import { isNavGroup } from "@/lib/nav";
import { PRODUCER_NAV } from "@/lib/producer-nav";
import { useLivePos } from "@/lib/live-pos";
import { useLiveDirectory } from "@/lib/live-directory";
import { groupScope } from "@/lib/access";
import { companyPath } from "@/lib/company-workspace";
import { ManagerSkeleton } from "@/components/Skeleton";
import { SetupHeader, SetupStat } from "@/components/setup/SetupChrome";
import { AccountManager } from "@/components/AccountManager";
import { ProducerDepartments } from "@/components/super/ProducerDepartments";
import { SuperNotifications } from "@/components/super/SuperNotifications";
import { SuperAccount } from "@/components/super/SuperAccount";
import { SuperSupport } from "@/components/super/SuperSupport";
import { BillingSection } from "@/components/super/BillingSection";
import { SupportSection } from "@/components/super/SupportSection";
import { SecuritySection } from "@/components/super/SecuritySection";
import { SystemSection } from "@/components/super/SystemSection";
import { DeveloperSection } from "@/components/super/DeveloperSection";
import { AdminActivityPage } from "@/components/super/AdminActivityPage";

function navLabel(path: string) {
  let best: { href: string; label: string; heading: string } | null = null;
  for (const section of PRODUCER_NAV) {
    for (const item of section.items) {
      const nodes = item.href
        ? [{ id: item.id, href: item.href, label: item.label }, ...(item.children ?? [])]
        : (item.children ?? []);
      for (const node of nodes) {
        if (isNavGroup(node) || !("href" in node) || !node.href) continue;
        const matches = path === node.href || path.startsWith(`${node.href}/`);
        if (!matches) continue;
        if (!best || node.href.length > best.href.length) {
          best = { href: node.href, label: item.label, heading: section.heading };
        }
      }
    }
  }
  return best;
}

export function SuperPlatformPage({ path }: { path: string }) {
  const label = navLabel(path);

  if (path.startsWith("/admin/billing")) return <BillingSection path={path} />;
  if (path.startsWith("/admin/support")) return <SupportSection path={path} />;
  if (path.startsWith("/admin/security")) return <SecuritySection path={path} />;
  if (path.startsWith("/admin/system")) return <SystemSection path={path} />;
  if (path.startsWith("/admin/developer")) return <DeveloperSection path={path} />;
  if (path === "/admin/administrators") return <AccountManager scope="producer" />;
  if (path === "/admin/administrators/roles") return <ProducerDepartments />;
  if (path === "/admin/administrators/activity") return <AdminActivityPage />;
  if (path === "/admin/notifications") return <SuperNotifications />;
  if (path === "/admin/account") return <SuperAccount />;

  return <SuperPlatformPanel path={path} label={label} />;
}

function SuperPlatformPanel({
  path,
  label,
}: {
  path: string;
  label: { href: string; label: string; heading: string } | null;
}) {
  const { company, stores, branches, tills, live, ready } = useLivePos();
  const { accounts, groups, ready: dirReady } = useLiveDirectory();

  if (!ready || !dirReady) return <ManagerSkeleton variant="table" />;

  const title = label?.label ?? path.split("/").filter(Boolean).at(-1)?.replace(/-/g, " ") ?? "Admin";
  const kicker = `Producer · ${label?.heading ?? "Super Admin"}`;

  const producerIds = new Set(
    groups.filter((row) => groupScope(row) === "producer").map((row) => row.id),
  );
  const tenantStaff = accounts.filter((row) => !producerIds.has(row.groupId));
  const companyHref = company ? companyPath(company.id) : "/admin/companies/register";

  return (
    <div>
      <SetupHeader
        kicker={kicker}
        title={title}
        copy="Platform-level Super Admin. Company products, staff, and sales are managed inside Companies → that company."
        action={
          <span
            className={`inline-flex items-center gap-1.5 rounded-xl border border-pos-border px-3 py-2.5 text-[12px] font-medium ${
              live ? "bg-pos-success/10 text-pos-success" : "bg-pos-surface-muted text-pos-ink-faint"
            }`}
          >
            {live ? "Live" : "Offline"}
          </span>
        }
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Companies" value={company?.name ? "1" : "0"} hint={company?.name || "None"} tone="accent" />
        <SetupStat label="Tills" value={String(tills.length)} hint={`${tills.filter((t) => t.online).length} online`} />
        <SetupStat label="Locations" value={String(branches.length)} hint={`${stores.length} stores`} />
        <SetupStat label="Company users" value={String(tenantStaff.length)} />
      </div>
      <div className="rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm text-pos-ink-muted">
        <p>
          This desk is platform-wide. Shop operations (products, sales, cashiers) belong in the company
          workspace.
        </p>
        <p className="mt-3">
          <Link href={companyHref} className="font-medium text-pos-primary hover:underline">
            {company ? `Open ${company.name}` : "Register a company"}
          </Link>
          {" · "}
          <Link href="/admin/companies" className="font-medium text-pos-primary hover:underline">
            All companies
          </Link>
        </p>
        <p className="mt-4 text-[12px] text-pos-ink-faint">{path}</p>
      </div>
    </div>
  );
}
