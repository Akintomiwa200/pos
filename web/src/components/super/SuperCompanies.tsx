"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Wifi, WifiOff } from "lucide-react";
import { useLivePos } from "@/lib/live-pos";
import { COMPANY_LIST_STATUSES, companyPath, type CompanyListStatus } from "@/lib/company-workspace";
import { ManagerSkeleton } from "@/components/Skeleton";
import { SetupHeader, SetupStat } from "@/components/setup/SetupChrome";

function statusOf(hasCompany: boolean): CompanyListStatus {
  return hasCompany ? "active" : "pending";
}

export function SuperCompanies() {
  const router = useRouter();
  const search = useSearchParams();
  const filter = (search.get("status") as CompanyListStatus | null) || "all";
  const { company, stores, branches, tills, live, ready } = useLivePos();

  const rows = useMemo(() => {
    if (!company) return [];
    const status = statusOf(true);
    if (filter !== "all" && filter !== status) return [];
    return [{ company, status }];
  }, [company, filter]);

  if (!ready) return <ManagerSkeleton variant="table" />;

  return (
    <div>
      <SetupHeader
        kicker="Producer · Business"
        title="Companies"
        copy="Tenants on this platform. Open a company for its workspace — branches, tills, staff, catalogue, and billing stay there."
        action={
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-xl border border-pos-border px-3 py-2.5 text-[12px] font-medium ${
                live ? "bg-pos-success/10 text-pos-success" : "bg-pos-surface-muted text-pos-ink-faint"
              }`}
            >
              {live ? <Wifi size={13} /> : <WifiOff size={13} />}
              {live ? "Live" : "Offline"}
            </span>
            <Link
              href="/admin/companies/register"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-pos-primary px-5 py-2.5 text-sm font-semibold text-white shadow-pos-primary transition hover:opacity-90"
            >
              Register company
            </Link>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1">
        {COMPANY_LIST_STATUSES.map((tab) => {
          const active = filter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`rounded-full px-3 py-1.5 text-[13px] font-medium ${
                active ? "bg-pos-primary text-white" : "text-pos-ink-muted hover:bg-pos-surface-muted"
              }`}
              onClick={() =>
                router.replace(tab.id === "all" ? "/admin/companies" : `/admin/companies?status=${tab.id}`)
              }
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <SetupStat label="Companies" value={company ? "1" : "0"} />
        <SetupStat label="Stores" value={String(stores.length)} />
        <SetupStat label="Tills" value={String(tills.length)} hint={`${branches.length} branches`} />
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-pos-ink-muted">
          {company
            ? "No companies match this filter."
            : "No tenant company yet. "}
          {!company ? (
            <Link href="/admin/companies/register" className="font-medium text-pos-primary hover:underline">
              Register a company
            </Link>
          ) : null}
        </p>
      ) : (
        rows.map(({ company: row, status }) => (
          <Link
            key={row.id}
            href={companyPath(row.id)}
            className="block rounded-[18px] border border-pos-border bg-pos-surface p-5 hover:border-pos-primary/30"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[16px] font-semibold">{row.name}</p>
                <p className="mt-1 text-sm text-pos-ink-muted">
                  {row.legalName || row.name}
                  {row.email ? ` · ${row.email}` : ""}
                </p>
              </div>
              <span className="rounded-full bg-pos-success/10 px-2.5 py-1 text-[12px] font-medium capitalize text-pos-success">
                {status}
              </span>
            </div>
            <p className="mt-3 text-sm text-pos-ink-muted">
              {stores.length} store{stores.length === 1 ? "" : "s"} · {branches.length} branch
              {branches.length === 1 ? "" : "es"} · {tills.length} till{tills.length === 1 ? "" : "s"}
            </p>
          </Link>
        ))
      )}
    </div>
  );
}
