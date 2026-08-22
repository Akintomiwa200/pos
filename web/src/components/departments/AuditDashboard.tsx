"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { naira, xReport, zReport, type DayReport } from "@/lib/hq-ops";
import { ManagerSkeleton } from "../Skeleton";
import {
  EmptyRow,
  PageHeader,
  StatCard,
  TableShell,
} from "../console/Chrome";

function ReportCard({ title, subtitle, report }: { title: string; subtitle: string; report: DayReport | null }) {
  return (
    <section className="rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
      <header className="mb-4">
        <h2 className="font-semibold text-pos-ink">{title}</h2>
        <p className="mt-1 text-sm text-pos-ink-muted">{subtitle}</p>
      </header>
      {report ? (
        <>
          <div className="grid grid-cols-3 gap-3 rounded-2xl bg-pos-surface-muted p-4 text-center">
            <div>
              <p className="text-xs text-pos-ink-muted">Net</p>
              <p className="mt-1 font-semibold">{naira(report.netMinor)}</p>
            </div>
            <div>
              <p className="text-xs text-pos-ink-muted">Tickets</p>
              <p className="mt-1 font-semibold">{report.transactions}</p>
            </div>
            <div>
              <p className="text-xs text-pos-ink-muted">Cash drawer</p>
              <p className="mt-1 font-semibold">{naira(report.cashExpectedMinor)}</p>
            </div>
          </div>
          <div className="mt-4">
            <TableShell columns={["Tender", "Count", "Amount"]} minWidth={280}>
              {report.tenders.length === 0 ? (
                <EmptyRow colSpan={3} message="No takings yet today." />
              ) : (
                report.tenders.map((row) => (
                  <tr key={row.tender} className="border-b border-pos-border/60">
                    <td className="px-4 py-2.5 font-medium capitalize">{row.tender}</td>
                    <td className="px-4 py-2.5">{row.count}</td>
                    <td className="px-4 py-2.5">{naira(row.totalMinor)}</td>
                  </tr>
                ))
              )}
            </TableShell>
          </div>
          {typeof report.closed === "boolean" ? (
            <p className={`mt-3 text-sm ${report.closed ? "text-pos-success" : "text-pos-warning"}`}>
              {report.closed ? "Day is closed — safe to count the drawer." : "Day still open — figures are live."}
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-pos-ink-faint">Loading…</p>
      )}
    </section>
  );
}

export function AuditDashboard() {
  const [x, setX] = useState<DayReport | null>(null);
  const [z, setZ] = useState<DayReport | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [nextX, nextZ] = await Promise.all([xReport(), zReport()]);
      setX(nextX);
      setZ(nextZ);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load audit reports");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!x && !z && busy) return <ManagerSkeleton variant="table" />;

  return (
    <div>
      <PageHeader
        kicker="Audit"
        title="Daily Audit"
        copy="X and Z reports straight from live till data — no end-of-day spreadsheet needed."
        action={
          <button
            type="button"
            onClick={load}
            disabled={busy}
            className="flex items-center gap-2 rounded-xl border border-pos-border px-4 py-2.5 text-sm text-pos-ink hover:bg-pos-surface-muted disabled:opacity-60"
          >
            <RefreshCw size={15} className={busy ? "animate-spin" : ""} /> Refresh
          </button>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Net today" value={naira(x?.netMinor ?? z?.netMinor ?? 0)} />
        <StatCard label="Transactions" value={String(x?.transactions ?? z?.transactions ?? 0)} />
        <StatCard
          label="Cash expected in drawers"
          value={naira(x?.cashExpectedMinor ?? z?.cashExpectedMinor ?? 0)}
          hint="Compare against the physical count"
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <ReportCard
          title="X-report"
          subtitle="Mid-shift snapshot — read-only, does not close anything."
          report={x}
        />
        <ReportCard
          title="Z-report"
          subtitle="End-of-day position used for banking and reconciliation."
          report={z}
        />
      </div>
    </div>
  );
}
