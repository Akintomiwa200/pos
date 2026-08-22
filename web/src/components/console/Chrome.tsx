"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { naira } from "@/lib/hq-ops";
import { useThemeColors } from "@/hooks/useThemeColors";

export function PageHeader({
  kicker,
  title,
  copy,
  action,
}: {
  kicker: string;
  title: string;
  copy?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0 max-w-3xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-pos-primary">{kicker}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">{title}</h1>
        {copy ? <p className="mt-2 text-pos-ink-muted">{copy}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[20px] bg-pos-surface p-5 shadow-pos-md">
      <p className="text-xs font-medium uppercase tracking-wide text-pos-ink-muted">{label}</p>
      <p className="mt-2 truncate text-[28px] font-semibold tracking-tight text-pos-ink">{value}</p>
      {hint ? <p className="mt-1 text-sm text-pos-ink-faint">{hint}</p> : null}
    </div>
  );
}

export function Card({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[24px] bg-pos-surface p-5 shadow-pos-md ${className}`}>
      {title ? (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-pos-ink">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-pos-ink-muted">{subtitle}</p> : null}
          </div>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function Toolbar({ search, onSearch }: { search: string; onSearch: (value: string) => void }) {
  return (
    <label className="relative mb-4 block">
      <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-pos-ink-faint" />
      <input
        value={search}
        onChange={(event) => onSearch(event.target.value)}
        placeholder="Search…"
        className="w-full rounded-full border border-pos-border bg-pos-surface py-2.5 pl-10 pr-4 text-sm text-pos-ink outline-none focus:border-pos-primary"
      />
    </label>
  );
}

export function useFilter<T>(rows: T[], match: (row: T, query: string) => boolean) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(
    () => (search.trim() ? rows.filter((row) => match(row, search.trim().toLowerCase())) : rows),
    [rows, search, match],
  );
  return { search, setSearch, filtered };
}

export function TableShell({
  columns,
  toolbar,
  children,
  minWidth = 640,
}: {
  columns: string[];
  toolbar?: ReactNode;
  children: ReactNode;
  minWidth?: number;
}) {
  return (
    <section className="overflow-hidden rounded-2xl bg-pos-surface shadow-pos-md">
      {toolbar ? <div className="border-b border-pos-border px-4 py-3">{toolbar}</div> : null}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm" style={{ minWidth }}>
          <thead className="border-b border-pos-border text-pos-ink-muted">
            <tr>
              {columns.map((column) => (
                <th key={column} className="whitespace-nowrap px-4 py-3 font-medium">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </section>
  );
}

export function EmptyRow({ colSpan, message = "Nothing recorded yet." }: { colSpan: number; message?: string }) {
  return (
    <tr>
      <td className="px-4 py-8 text-center text-pos-ink-faint" colSpan={colSpan}>
        {message}
      </td>
    </tr>
  );
}

export function ChartCard({
  title,
  subtitle,
  height = 260,
  children,
}: {
  title: string;
  subtitle?: string;
  height?: number;
  children: (colors: ReturnType<typeof useThemeColors>) => ReactNode;
}) {
  const colors = useThemeColors();
  return (
    <Card title={title} subtitle={subtitle}>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children(colors) as ReactNode}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function TrendLineChart({ data }: { data: Array<{ label: string; value: number }> }) {
  const colors = useThemeColors();
  const axis = { stroke: colors.inkFaint, fontSize: 11 };
  return (
    <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
      <CartesianGrid stroke={colors.chartGrid} vertical={false} />
      <XAxis dataKey="label" tickLine={false} axisLine={false} {...axis} />
      <YAxis tickLine={false} axisLine={false} width={56} {...axis} tickFormatter={(v: number) => `₦${compact(v / 100)}`} />
      <Tooltip
        formatter={(value) => [naira(Number(value)), "Revenue"]}
        contentStyle={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          color: colors.ink,
        }}
      />
      <Line type="monotone" dataKey="value" stroke={colors.primary} strokeWidth={2.5} dot={false} />
    </LineChart>
  );
}

export function RankBarChart({
  data,
  money = true,
}: {
  data: Array<{ label: string; value: number }>;
  money?: boolean;
}) {
  const colors = useThemeColors();
  if (!data.length) {
    return (
      <div className="grid h-full place-items-center text-sm text-pos-ink-faint">No data yet.</div>
    );
  }
  return (
    <BarChart data={data.slice(0, 7)} layout="vertical" margin={{ top: 4, right: 24, bottom: 0, left: 8 }}>
      <XAxis type="number" hide />
      <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={120} {...{ stroke: colors.inkMuted, fontSize: 11 }} />
      <Tooltip
        formatter={(value) => [money ? naira(Number(value)) : Number(value).toLocaleString(), ""]}
        contentStyle={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          color: colors.ink,
        }}
      />
      <Bar dataKey="value" fill={colors.primary} radius={[0, 6, 6, 0]} barSize={18} />
    </BarChart>
  );
}

const PIE_COLORS = ["primary", "chartSlice2", "chartSlice3", "chartSlice4"] as const;

export function SharePieChart({ data }: { data: Array<{ label: string; value: number }> }) {
  const colors = useThemeColors();
  if (!data.length) {
    return (
      <div className="grid h-full place-items-center text-sm text-pos-ink-faint">No data yet.</div>
    );
  }
  const palette = PIE_COLORS.map((key) =>
    key === "primary" ? colors.primary : colors[key as "chartSlice2"],
  );
  return (
    <PieChart>
      <Tooltip
        formatter={(value) => [naira(Number(value)), "Revenue"]}
        contentStyle={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          color: colors.ink,
        }}
      />
      <Pie data={data} dataKey="value" nameKey="label" innerRadius="55%" outerRadius="85%" paddingAngle={2}>
        {data.map((entry, index) => (
          <Cell key={entry.label} fill={palette[index % palette.length]} stroke={colors.surface} />
        ))}
      </Pie>
    </PieChart>
  );
}

function compact(value: number) {
  if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}bn`;
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return `${Math.round(value)}`;
}
