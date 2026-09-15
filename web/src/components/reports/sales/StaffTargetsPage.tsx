"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleDollarSign, Crosshair, Save, UserRound } from "lucide-react";
import { listSales, type HqSale } from "@/lib/hq-api";
import { listDirectory, type DirectoryRecord } from "@/lib/hq-directory";
import { naira } from "@/lib/hq-ops";
import { listStaffTargets, saveStaffTarget, type StaffTarget } from "@/lib/hq-ledger";
import { useOrgLocale } from "@/lib/org-locale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

const STORAGE_KEY = "pos.reports.staffTargets";

type Targets = Record<string, number>;

function loadLocalTargets(): Targets {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Targets) : {};
  } catch {
    return {};
  }
}

function serverTargetsToMap(targets: StaffTarget[]): Targets {
  const byName: Targets = {};
  for (const row of targets) {
    byName[row.staffName] = (byName[row.staffName] ?? 0) + row.targetMinor;
  }
  return byName;
}

export function StaffTargetsPage() {
  const colors = useThemeColors();
  useOrgLocale();
  const [sales, setSales] = useState<HqSale[] | null>(null);
  const [staff, setStaff] = useState<DirectoryRecord[] | null>(null);
  const [targets, setTargets] = useState<Targets>({});
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listSales(), listDirectory("staff"), listStaffTargets()])
      .then(([s, d, t]) => {
        setSales(s);
        setStaff(d);
        const server = Array.isArray(t) ? serverTargetsToMap(t) : {};
        setTargets(Object.keys(server).length ? server : loadLocalTargets());
      })
      .catch(() => {
        setSales([]);
        setStaff([]);
        setTargets(loadLocalTargets());
      });
  }, []);

  const rows = useMemo(() => {
    if (!sales || !staff) return null;
    const byName = new Map<string, { tickets: number; totalMinor: number }>();
    for (const sale of sales) {
      const name = sale.cashierName || "Unknown";
      const row = byName.get(name) ?? { tickets: 0, totalMinor: 0 };
      row.tickets += 1;
      row.totalMinor += sale.totalMinor;
      byName.set(name, row);
    }
    const names = new Set([...staff.map((s) => s.name), ...byName.keys()]);
    const workers = [...names].map((name) => {
      const key = [...byName.keys()].find((k) => k.toLowerCase() === name.toLowerCase());
      const row = key ? byName.get(key)! : { tickets: 0, totalMinor: 0 };
      const active = staff.some((s) => s.name === name && s.active);
      return { name, ...row, active };
    });
    const total = workers.reduce((sum, row) => sum + row.totalMinor, 0);
    return { workers: workers.sort((a, b) => b.totalMinor - a.totalMinor), total };
  }, [sales, staff]);

  const save = async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(targets));
    for (const [name, targetMinor] of Object.entries(targets)) {
      if (targetMinor <= 0) continue;
      try {
        await saveStaffTarget({ staffName: name, targetMinor });
      } catch {
        // server save best-effort; local copy still retained
      }
    }
    setSavedAt(new Date().toLocaleTimeString());
  };

  if (!rows) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-pos-primary p-6 text-white shadow-pos-primary sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Report · Sales · Staff targets</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Staff targets</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Set a sales target per person and watch attainment update live as till sales come in. Targets save to
            the network and to this device.
          </p>
        </div>
      </section>

      <article className="mt-5 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-pos-ink">Attainment</h2>
            <p className="mt-0.5 text-sm text-pos-ink-muted">Team sold {naira(rows.total)} across all staff this period.</p>
          </div>
          {savedAt ? (
            <span className="flex items-center gap-1.5 rounded-full bg-pos-surface-muted px-3 py-1.5 text-xs text-pos-ink-muted">
              <Save size={12} /> Saved {savedAt}
            </span>
          ) : null}
        </header>
        {rows.workers.length === 0 ? (
          <div className="grid h-[160px] place-items-center rounded-2xl border border-dashed border-pos-border text-sm text-pos-ink-faint">
            Add staff in the Staff directory to begin.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pos-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse">
                <thead>
                  <tr className="border-b border-pos-border bg-pos-surface-muted">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Staff</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Sales</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Target (₦)</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">Attainment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/60">
                  {rows.workers.map((row) => {
                    const target = targets[row.name] ?? 0;
                    const attained = target > 0 ? Math.round((row.totalMinor / target) * 100) : 0;
                    const over = target > 0 && attained >= 100;
                    return (
                      <tr key={row.name} className="hover:bg-pos-surface-muted/50">
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-2 text-[13px] font-medium text-pos-ink">
                            <UserRound size={14} className="text-pos-ink-faint" />
                            {row.name}
                            {!row.active ? (
                              <span className="rounded-full bg-pos-surface-muted px-2 py-0.5 text-[10px] font-medium uppercase text-pos-ink-faint">inactive</span>
                            ) : null}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-pos-ink">{naira(row.totalMinor)}</td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            min={0}
                            step={1000}
                            value={target || ""}
                            placeholder="0"
                            onChange={(event) => setTargets((prev) => ({ ...prev, [row.name]: Number(event.target.value) || 0 }))}
                            className="h-9 w-32 rounded-[10px] border border-pos-border bg-pos-surface-muted px-3 text-right text-[13px] tabular-nums text-pos-ink outline-none focus:border-pos-primary/60"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="ml-auto flex max-w-[200px] items-center gap-2">
                            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-pos-surface-muted">
                              <span
                                className="block h-full rounded-full"
                                style={{
                                  width: `${Math.min(100, attained)}%`,
                                  background: over ? "#22c55e" : colors.primary,
                                }}
                              />
                            </span>
                            <span className={`w-10 text-right text-[11px] font-semibold tabular-nums ${over ? "text-emerald-600 dark:text-emerald-400" : "text-pos-ink-faint"}`}>
                              {target > 0 ? `${attained}%` : "—"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </article>

      <article className="mt-5 rounded-[20px] bg-pos-surface p-5 shadow-pos-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px]" style={{ background: `${colors.primary}1a`, color: colors.primary }}>
              <Crosshair size={18} strokeWidth={1.75} />
            </span>
            <div>
              <p className="text-sm font-semibold text-pos-ink">How attainment is computed</p>
              <p className="mt-0.5 text-xs text-pos-ink-muted">
                Attainment is live sales (all time till activity) ÷ the target you enter. Team total uses the combined
                targets where set, else sales. Setting a target to 0 means no target for that person.
              </p>
            </div>
          </div>
          <button
            onClick={save}
            className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-pos-primary px-5 text-sm font-semibold text-white shadow-pos-primary transition hover:opacity-90"
          >
            <Save size={15} /> Save targets
          </button>
        </div>
      </article>
    </div>
  );
}