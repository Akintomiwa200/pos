"use client";

import { useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Layers, Percent } from "lucide-react";
import { toast } from "@/lib/toast";
import { naira, taxSummary, type TaxSummary } from "@/lib/hq-ops";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ManagerSkeleton } from "../../Skeleton";

const COLORS = ["primary", "chartSlice2", "chartSlice3", "chartSlice4"] as const;

export function TaxByCategoryPage() {
  const colors = useThemeColors();
  const [data, setData] = useState<TaxSummary | null>(null);

  useEffect(() => {
    taxSummary()
      .then(setData)
      .catch((err) => {
        toast.error(err, "Could not load tax data");
        setData(null);
      });
  }, []);

  const palette = useMemo(
    () => COLORS.map((key) => (key === "primary" ? colors.primary : colors[key as "chartSlice2"])),
    [colors],
  );

  if (!data) return <ManagerSkeleton variant="table" />;

  const totalNet = data.byCategory.reduce((sum, row) => sum + row.netMinor, 0);
  const totalTax = data.byCategory.reduce((sum, row) => sum + row.taxMinor, 0);
  const rateLabel = `${data.ratePercent}%${data.inclusive ? " (inclusive)" : ""}`;
  const donutData = data.byCategory.map((row) => ({ label: row.category, value: row.netMinor }));

  return (
    <div className="pb-8">
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">
          Report · Tax
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">Tax by category</h1>
        <p className="mt-1.5 text-sm text-pos-ink-muted">
          Where the taxable value sits across catalog categories.
        </p>
      </header>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[18px] bg-pos-surface p-5 shadow-pos-md">
          <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Taxable value</p>
          <p className="mt-1 truncate text-2xl font-bold tabular-nums text-pos-ink">{naira(totalNet)}</p>
        </div>
        <div className="rounded-[18px] bg-pos-surface p-5 shadow-pos-md">
          <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">VAT in scope</p>
          <p className="mt-1 truncate text-2xl font-bold tabular-nums text-pos-primary">{naira(totalTax)}</p>
        </div>
        <div className="flex items-center gap-3 rounded-[18px] bg-pos-surface p-5 shadow-pos-md">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-pos-primary-soft text-pos-primary">
            <Percent size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Rate</p>
            <p className="truncate text-2xl font-bold tabular-nums text-pos-ink">{rateLabel}</p>
          </div>
        </div>
      </div>

      <section className="grid gap-5 rounded-[24px] bg-pos-surface p-6 shadow-pos-md lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-pos-ink-faint">
            <Layers size={14} /> Category mix
          </p>
          <div className="mt-3 h-[260px]">
            {donutData.length === 0 ? (
              <div className="grid h-full place-items-center text-sm text-pos-ink-faint">
                No category-level sales yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    formatter={(value) => [naira(Number(value)), "Taxable value"]}
                    contentStyle={{
                      background: colors.surface,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 12,
                      color: colors.ink,
                    }}
                  />
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="label"
                    innerRadius="58%"
                    outerRadius="82%"
                    paddingAngle={3}
                  >
                    {donutData.map((row, index) => (
                      <Cell key={row.label} fill={palette[index % palette.length]} stroke={colors.surface} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-pos-border">
          <table className="w-full text-sm">
            <thead className="border-b border-pos-border bg-pos-surface-muted/50 text-[11px] font-semibold uppercase tracking-[0.08em] text-pos-ink-faint">
              <tr>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Share</th>
                <th className="px-4 py-3 text-right">Taxable</th>
                <th className="px-4 py-3 text-right">VAT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pos-border/50">
              {data.byCategory.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-pos-ink-faint">
                    No category-level sales yet.
                  </td>
                </tr>
              ) : (
                data.byCategory.map((row, index) => {
                  const share = totalNet ? Math.round((row.netMinor / totalNet) * 100) : 0;
                  return (
                    <tr key={row.category} className="hover:bg-pos-surface-muted/40">
                      <td className="px-4 py-3.5 font-medium text-pos-ink">
                        <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: palette[index % palette.length] }} />
                        {row.category}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-pos-ink-muted">{share}%</td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-pos-ink">{naira(row.netMinor)}</td>
                      <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-pos-primary">
                        {naira(row.taxMinor)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {data.byCategory.length > 0 ? (
              <tfoot>
                <tr className="border-t-2 border-pos-border bg-pos-surface-muted/60 font-semibold">
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right">100%</td>
                  <td className="px-4 py-3 text-right tabular-nums">{naira(totalNet)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-pos-primary">{naira(totalTax)}</td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </section>
    </div>
  );
}