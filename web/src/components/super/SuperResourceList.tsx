"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { useLivePos } from "@/lib/live-pos";
import { listStorefronts, type HqStorefront } from "@/lib/hq-setup";
import { tillProductLabel } from "@/lib/hq-api";
import { companyPath } from "@/lib/company-workspace";
import { ManagerSkeleton } from "@/components/Skeleton";
import { DataTable, SetupHeader, SetupStat } from "@/components/setup/SetupChrome";

type Kind = "tills" | "branches" | "stores" | "storefronts";

const TITLES: Record<Kind, { title: string; copy: string; section: string }> = {
  tills: {
    title: "Tills / POS",
    copy: "Every terminal on the platform. Open a row to manage it inside that company — Super Admin is not a cashier.",
    section: "tills",
  },
  branches: {
    title: "Branches",
    copy: "Locations across companies. Editing a branch happens in the company workspace.",
    section: "branches",
  },
  stores: {
    title: "Stores",
    copy: "Company-wide stores. Drill in to assign tills and staff on that company.",
    section: "stores",
  },
  storefronts: {
    title: "Storefronts",
    copy: "Online storefronts. Themes, domains, and orders stay on the company.",
    section: "storefronts",
  },
};

export function SuperResourceList({ kind }: { kind: Kind }) {
  const router = useRouter();
  const { company, tills, stores, branches, live, ready } = useLivePos();
  const [fronts, setFronts] = useState<HqStorefront[]>([]);
  const [frontsReady, setFrontsReady] = useState(kind !== "storefronts");

  useEffect(() => {
    if (kind !== "storefronts") return;
    listStorefronts()
      .then(setFronts)
      .catch(() => setFronts([]))
      .finally(() => setFrontsReady(true));
  }, [kind]);

  if (!ready || !frontsReady) return <ManagerSkeleton variant="table" />;

  const meta = TITLES[kind];
  const href = company ? companyPath(company.id, meta.section) : "/admin/companies/register";
  const companyName = company?.name || "—";

  function go() {
    router.push(href);
  }

  return (
    <div>
      <SetupHeader
        kicker="Producer · Business"
        title={meta.title}
        copy={meta.copy}
        action={
          <span
            className={`inline-flex items-center gap-1.5 rounded-xl border border-pos-border px-3 py-2.5 text-[12px] font-medium ${
              live ? "bg-pos-success/10 text-pos-success" : "bg-pos-surface-muted text-pos-ink-faint"
            }`}
          >
            {live ? <Wifi size={13} /> : <WifiOff size={13} />}
            {live ? "Live" : "Offline"}
          </span>
        }
      />

      {kind === "tills" ? (
        <>
          <Stats count={tills.length} extra={String(tills.filter((row) => row.online).length)} extraLabel="Online" company={companyName} />
          <DataTable columns={["Till", "Code", "Product", "Branch", "Status"]}>
            {tills.length === 0 ? (
              <EmptyRow cols={5} href={href} />
            ) : (
              tills.map((row) => (
                <ClickRow key={row.id} onClick={go}>
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-4 py-3 font-mono text-[12px]">{row.code}</td>
                  <td className="px-4 py-3">{tillProductLabel(row.product)}</td>
                  <td className="px-4 py-3 text-pos-ink-muted">{row.branchName || "—"}</td>
                  <td className="px-4 py-3">{row.online ? "Online" : row.active ? "Offline" : "Off"}</td>
                </ClickRow>
              ))
            )}
          </DataTable>
        </>
      ) : null}

      {kind === "branches" ? (
        <>
          <Stats count={branches.length} extra={String(branches.filter((row) => row.active).length)} extraLabel="Active" company={companyName} />
          <DataTable columns={["Branch", "City", "Manager", "Status"]}>
            {branches.length === 0 ? (
              <EmptyRow cols={4} href={href} />
            ) : (
              branches.map((row) => (
                <ClickRow key={row.id} onClick={go}>
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-4 py-3">{row.city || "—"}</td>
                  <td className="px-4 py-3 text-pos-ink-muted">{row.manager || "—"}</td>
                  <td className="px-4 py-3">{row.active ? "Active" : "Off"}</td>
                </ClickRow>
              ))
            )}
          </DataTable>
        </>
      ) : null}

      {kind === "stores" ? (
        <>
          <Stats count={stores.length} extra={String(stores.filter((row) => row.active).length)} extraLabel="Active" company={companyName} />
          <DataTable columns={["Store", "Type", "Address", "Status"]}>
            {stores.length === 0 ? (
              <EmptyRow cols={4} href={href} />
            ) : (
              stores.map((row) => (
                <ClickRow key={row.id} onClick={go}>
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-4 py-3 capitalize">{row.kind.replace("-", " ")}</td>
                  <td className="px-4 py-3 text-pos-ink-muted">{row.address || "—"}</td>
                  <td className="px-4 py-3">{row.active ? "Active" : "Off"}</td>
                </ClickRow>
              ))
            )}
          </DataTable>
        </>
      ) : null}

      {kind === "storefronts" ? (
        <>
          <Stats count={fronts.length} extra={String(fronts.filter((row) => row.enabled).length)} extraLabel="Live" company={companyName} />
          <DataTable columns={["Storefront", "URL", "Hours", "Status"]}>
            {fronts.length === 0 ? (
              <EmptyRow cols={4} href={href} />
            ) : (
              fronts.map((row) => (
                <ClickRow key={row.id} onClick={go}>
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-4 py-3 text-pos-ink-muted">{row.url || "—"}</td>
                  <td className="px-4 py-3">{row.hours || "—"}</td>
                  <td className="px-4 py-3">{row.enabled ? "Live" : "Off"}</td>
                </ClickRow>
              ))
            )}
          </DataTable>
        </>
      ) : null}

      <p className="mt-4 text-sm text-pos-ink-muted">
        Manage these inside{" "}
        <Link href={href} className="font-medium text-pos-primary hover:underline">
          {company?.name || "the company"}
        </Link>
        .
      </p>
    </div>
  );
}

function Stats({
  count,
  extra,
  extraLabel,
  company,
}: {
  count: number;
  extra: string;
  extraLabel: string;
  company: string;
}) {
  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-3">
      <SetupStat label="Records" value={String(count)} />
      <SetupStat label={extraLabel} value={extra} tone="accent" />
      <SetupStat label="Company" value={company} />
    </div>
  );
}

function ClickRow({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <tr className="cursor-pointer hover:bg-pos-surface-muted" onClick={onClick}>
      {children}
    </tr>
  );
}

function EmptyRow({ cols, href }: { cols: number; href: string }) {
  return (
    <tr>
      <td className="px-4 py-8 text-center text-pos-ink-faint" colSpan={cols}>
        Nothing registered yet.{" "}
        <Link href={href} className="font-medium text-pos-primary hover:underline">
          Open the company
        </Link>
        .
      </td>
    </tr>
  );
}
