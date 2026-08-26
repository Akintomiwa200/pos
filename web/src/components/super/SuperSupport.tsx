"use client";

import Link from "next/link";
import { useLivePos } from "@/lib/live-pos";
import { ManagerSkeleton } from "@/components/Skeleton";
import { SetupHeader, SetupStat } from "@/components/setup/SetupChrome";

export function SuperSupport() {
  const { company, stores, branches, tills, ready } = useLivePos();

  if (!ready) return <ManagerSkeleton variant="table" />;

  return (
    <div>
      <SetupHeader
        kicker="Producer · Support"
        title="Support"
        copy="Help tenant companies from this desk. Company HQ chat stays with the tenant — Super Admin works the organisation, tills, and licences here."
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <SetupStat label="Company" value={company?.name || "None"} />
        <SetupStat label="Tills" value={String(tills.length)} hint={`${branches.length} branches`} />
        <SetupStat label="Stores" value={String(stores.length)} />
      </div>
      <ul className="space-y-2 rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm">
        <li>
          <Link href="/admin/companies" className="font-medium text-pos-primary hover:underline">
            Open company data
          </Link>
        </li>
        <li>
          <Link href="/admin/tills" className="font-medium text-pos-primary hover:underline">
            Tills and pairing codes
          </Link>
        </li>
        <li>
          <Link href="/admin/billing/subscriptions" className="font-medium text-pos-primary hover:underline">
            Subscriptions and renewals
          </Link>
        </li>
        <li>
          <Link href="/admin/people/owners" className="font-medium text-pos-primary hover:underline">
            Company owners
          </Link>
        </li>
      </ul>
    </div>
  );
}
