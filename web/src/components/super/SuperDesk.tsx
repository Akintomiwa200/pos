"use client";

import Link from "next/link";
import { useLiveDirectory } from "@/lib/live-directory";
import { groupScope } from "@/lib/access";
import { ManagerSkeleton } from "@/components/Skeleton";
import { SetupHeader, SetupStat } from "@/components/setup/SetupChrome";

const DESKS: Record<
  string,
  { title: string; kicker: string; copy: string; groupIds: string[] }
> = {
  ceo: {
    title: "CEO office",
    kicker: "Executive",
    copy: "Companies, departments, and the producer org. Privileges for this desk are set on the CEO department.",
    groupIds: ["g-super-admin", "g-ceo"],
  },
  operations: {
    title: "Operations",
    kicker: "Operations",
    copy: "Live companies, stores, branches, and tills the producer supports.",
    groupIds: ["g-ops"],
  },
  finance: {
    title: "Finance",
    kicker: "Finance",
    copy: "Licences, billing, and producer-side commercial metrics.",
    groupIds: ["g-prod-finance"],
  },
  people: {
    title: "People",
    kicker: "People",
    copy: "Producer staff assigned to departments from CEO to Support.",
    groupIds: ["g-people"],
  },
  product: {
    title: "Product",
    kicker: "Product",
    copy: "Catalogue of POS products — supermarket, hotel, restaurant, dark kitchen.",
    groupIds: ["g-product"],
  },
  sales: {
    title: "Partnerships",
    kicker: "Sales",
    copy: "Tenant companies and onboarding.",
    groupIds: ["g-prod-sales"],
  },
  support: {
    title: "Support",
    kicker: "Support",
    copy: "Producer support desk. Tenant chat and tickets stay in company HQ.",
    groupIds: ["g-prod-support"],
  },
};

export function SuperDesk({ slug }: { slug: string }) {
  const desk = DESKS[slug];
  const { accounts, groups, ready } = useLiveDirectory();

  if (!desk) {
    return (
      <div>
        <SetupHeader kicker="Producer" title="Unknown desk" copy="This department page does not exist." />
      </div>
    );
  }

  if (!ready) return <ManagerSkeleton variant="table" />;

  const department = groups.filter(
    (row) => groupScope(row) === "producer" && desk.groupIds.includes(row.id),
  );
  const ids = new Set(department.map((row) => row.id));
  const people = accounts.filter((row) => ids.has(row.groupId) && row.active);

  return (
    <div>
      <SetupHeader kicker={`Producer · ${desk.kicker}`} title={desk.title} copy={desk.copy} />
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <SetupStat label="People on this desk" value={String(people.length)} />
        <SetupStat
          label="Privileges"
          value={department[0]?.privileges.includes("*") ? "All" : String(department[0]?.privileges.length ?? 0)}
        />
      </div>
      <ul className="rounded-[18px] border border-pos-border bg-pos-surface p-5">
        {people.length === 0 ? (
          <li className="text-sm text-pos-ink-muted">
            No one assigned yet.{" "}
            <Link href="/admin/accounts" className="font-medium text-pos-primary hover:underline">
              Assign staff
            </Link>
            .
          </li>
        ) : (
          people.map((row) => (
            <li key={row.id} className="border-b border-pos-border/60 py-2 last:border-0">
              <p className="font-medium">{row.name}</p>
              <p className="text-[13px] text-pos-ink-faint">{row.email}</p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
