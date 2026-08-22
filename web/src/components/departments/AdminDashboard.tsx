"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { getSetupData, listBranches, type HqBranch } from "@/lib/hq-setup";
import { listTills, tillProductLabel, type HqTill } from "@/lib/hq-api";
import { ManagerSkeleton } from "../Skeleton";
import { EmptyRow, PageHeader, StatCard, TableShell } from "../console/Chrome";

type SetupData = {
  branches: number;
  stores: number;
  storefronts: number;
  tills: number;
  gateways: number;
  taxes: number;
  sales: number;
  catalog: number;
};

export function AdminDashboard() {
  const [data, setData] = useState<SetupData | null>(null);
  const [tills, setTills] = useState<HqTill[]>([]);
  const [branches, setBranches] = useState<HqBranch[]>([]);

  useEffect(() => {
    Promise.all([getSetupData(), listTills(), listBranches()])
      .then(([setupData, tillRows, branchRows]) => {
        setData(setupData);
        setTills(tillRows);
        setBranches(branchRows);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Could not load org data");
        setData(null);
      });
  }, []);

  if (!data) return <ManagerSkeleton variant="table" />;

  return (
    <div>
      <PageHeader
        kicker="Admin"
        title="Organization"
        copy="Locations, terminals and catalog size at a glance — everything a new tenant needs on day one."
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Sales recorded" value={data.sales.toLocaleString()} />
        <StatCard label="Catalog items" value={data.catalog.toLocaleString()} />
        <StatCard label="Terminals" value={String(data.tills)} hint={`${data.gateways} payment gateways`} />
        <StatCard
          label="Locations"
          value={String(data.branches)}
          hint={`${data.stores} stores · ${data.storefronts} storefronts`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <TableShell columns={["Terminal", "Product", "Status"]} minWidth={420}>
          {tills.length === 0 ? (
            <EmptyRow colSpan={3} message="No tills yet — create one under Setup → Others → Tills." />
          ) : (
            tills.map((till) => (
              <tr key={till.id} className="border-b border-pos-border/60">
                <td className="px-4 py-3 font-medium">{till.name}</td>
                <td className="px-4 py-3 capitalize">{tillProductLabel(till.product)}</td>
                <td className="px-4 py-3">
                  {"expired" in till && till.expired ? (
                    <span className="text-pos-danger">Licence expired</span>
                  ) : (
                    <span className="text-pos-success">Active</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </TableShell>

        <section className="rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
          <h2 className="font-semibold text-pos-ink">Quick links</h2>
          <div className="mt-4 grid gap-2 text-sm">
            {[
              { href: "/setup/others/company", label: "Company profile" },
              { href: "/setup/others/branch", label: "Branches & locations" },
              { href: "/setup/users/account", label: "Console users & groups" },
              { href: "/verticals/supermarket", label: "Vertical playbooks" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center justify-between rounded-xl border border-pos-border px-4 py-3 hover:bg-pos-surface-muted"
              >
                <span>{link.label}</span>
                <span className="text-pos-primary">→</span>
              </Link>
            ))}
          </div>
          <h3 className="mt-6 text-sm font-semibold text-pos-ink-muted">Branches</h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            {branches.length === 0 ? (
              <li className="text-pos-ink-faint">No branches configured.</li>
            ) : (
              branches.map((branch) => (
                <li key={branch.id} className="flex justify-between border-b border-pos-border/60 pb-1.5">
                  <span>{branch.name}</span>
                  <span className="text-pos-ink-muted">{branch.city || branch.address || "—"}</span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
