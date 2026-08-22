"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "@/lib/toast";
import { naira, prettyDay, taxSummary, type TaxSummary as TaxData } from "@/lib/hq-ops";
import { ManagerSkeleton } from "../Skeleton";
import { EmptyRow, PageHeader, StatCard, TableShell, Toolbar } from "../console/Chrome";

export type TaxVariant = "output-tax" | "input-tax" | "liability" | "detail" | "by-category";

const HEADERS: Record<TaxVariant, { kicker: string; title: string; copy: string }> = {
  "output-tax": {
    kicker: "Report · Tax",
    title: "Output Tax",
    copy: "VAT charged on your sales — the tax you collect on behalf of FIRS.",
  },
  "input-tax": {
    kicker: "Report · Tax",
    title: "Input Tax",
    copy: "VAT paid on purchases, taken from recorded purchase invoices.",
  },
  liability: {
    kicker: "Report · Tax",
    title: "Liability",
    copy: "What you actually remit: output tax minus recoverable input tax.",
  },
  detail: {
    kicker: "Report · Tax",
    title: "Detail",
    copy: "Per-ticket VAT computation behind every figure above.",
  },
  "by-category": {
    kicker: "Report · Tax",
    title: "By Category",
    copy: "Where the taxable value sits across catalog categories.",
  },
};

export function TaxReports({ variant }: { variant: TaxVariant }) {
  const [data, setData] = useState<TaxData | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    taxSummary()
      .then(setData)
      .catch((err) => {
        toast.error(err, "Could not load tax data");
        setData(null);
      });
  }, []);

  const header = HEADERS[variant];

  const detailRows = useMemo(() => {
    if (!data) return [];
    const query = search.trim().toLowerCase();
    const rows = [...data.lines].sort((a, b) => b.at.localeCompare(a.at));
    return query ? rows.filter((row) => row.ref.toLowerCase().includes(query)) : rows;
  }, [data, search]);

  if (!data) return <ManagerSkeleton variant="table" />;

  const rateLabel = `${data.ratePercent}%${data.inclusive ? " (inclusive)" : ""}`;

  if (variant === "output-tax") {
    return (
      <div>
        <PageHeader kicker={header.kicker} title={header.title} copy={header.copy} />
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <StatCard label="Taxable sales (net)" value={naira(data.lines.reduce((sum, line) => sum + line.netMinor, 0))} />
          <StatCard label="Output VAT" value={naira(data.outputTaxMinor)} hint={`Rate ${rateLabel}`} />
          <StatCard label="Tickets covered" value={String(data.lines.length)} />
        </div>
        <TableShell columns={["Ticket", "Date", "Net", "VAT", "Gross"]}>
          {data.lines.length === 0 ? (
            <EmptyRow colSpan={5} message="No sales recorded yet." />
          ) : (
            [...data.lines]
              .sort((a, b) => b.at.localeCompare(a.at))
              .slice(0, 200)
              .map((line) => (
                <tr key={line.ref} className="border-b border-pos-border/60">
                  <td className="px-4 py-3 font-mono text-xs">{line.ref}</td>
                  <td className="px-4 py-3">{prettyDay(line.at.slice(0, 10))}</td>
                  <td className="px-4 py-3">{naira(line.netMinor)}</td>
                  <td className="px-4 py-3 font-semibold">{naira(line.taxMinor)}</td>
                  <td className="px-4 py-3">{naira(line.grossMinor)}</td>
                </tr>
              ))
          )}
        </TableShell>
      </div>
    );
  }

  if (variant === "input-tax") {
    return (
      <div>
        <PageHeader kicker={header.kicker} title={header.title} copy={header.copy} />
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <StatCard label="Input VAT" value={naira(data.inputTaxMinor)} hint={`Rate ${rateLabel}`} />
          <StatCard
            label="Source"
            value="Purchase invoices"
            hint="Record invoices under Transaction → Purchase → Invoice"
          />
        </div>
        <p className="rounded-2xl bg-pos-surface p-5 text-sm text-pos-ink-muted shadow-pos-md">
          Input tax is derived from every purchase invoice on file. Raise or correct vendor bills there and this
          figure updates immediately — no manual journal needed.
        </p>
      </div>
    );
  }

  if (variant === "liability") {
    return (
      <div>
        <PageHeader kicker={header.kicker} title={header.title} copy={header.copy} />
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <StatCard label="Output VAT" value={naira(data.outputTaxMinor)} />
          <StatCard label="Less input VAT" value={`− ${naira(data.inputTaxMinor)}`} />
          <StatCard
            label="Net payable to FIRS"
            value={naira(Math.max(0, data.liabilityMinor))}
            hint={data.liabilityMinor < 0 ? "Credit position — carry forward" : undefined}
          />
        </div>
        <TableShell columns={["Line", "Amount"]}>
          <tr className="border-b border-pos-border/60">
            <td className="px-4 py-3">VAT collected on sales ({rateLabel})</td>
            <td className="px-4 py-3">{naira(data.outputTaxMinor)}</td>
          </tr>
          <tr className="border-b border-pos-border/60">
            <td className="px-4 py-3">VAT paid on purchases</td>
            <td className="px-4 py-3">− {naira(data.inputTaxMinor)}</td>
          </tr>
          <tr className="bg-pos-surface-muted font-semibold">
            <td className="px-4 py-3">Net VAT liability</td>
            <td className="px-4 py-3">{naira(data.liabilityMinor)}</td>
          </tr>
        </TableShell>
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div>
        <PageHeader kicker={header.kicker} title={header.title} copy={header.copy} />
        <TableShell
          columns={["Ticket", "Paid at", "Gross", `Net (${rateLabel})`, "VAT"]}
          toolbar={<Toolbar search={search} onSearch={setSearch} />}
        >
          {detailRows.length === 0 ? (
            <EmptyRow colSpan={5} message="No tickets found." />
          ) : (
            detailRows.slice(0, 300).map((line) => (
              <tr key={line.ref} className="border-b border-pos-border/60">
                <td className="px-4 py-3 font-mono text-xs">{line.ref}</td>
                <td className="px-4 py-3">
                  {prettyDay(line.at.slice(0, 10))} ·{" "}
                  {new Date(line.at).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-4 py-3">{naira(line.grossMinor)}</td>
                <td className="px-4 py-3">{naira(line.netMinor)}</td>
                <td className="px-4 py-3 font-semibold">{naira(line.taxMinor)}</td>
              </tr>
            ))
          )}
        </TableShell>
      </div>
    );
  }

  // by-category
  const total = data.byCategory.reduce((sum, row) => sum + row.netMinor, 0);
  return (
    <div>
      <PageHeader kicker={header.kicker} title={header.title} copy={header.copy} />
      <TableShell columns={["Category", "Taxable value", "Share", "VAT"]}>
        {data.byCategory.length === 0 ? (
          <EmptyRow colSpan={4} message="No category-level sales yet." />
        ) : (
          <>
            {data.byCategory.map((row) => (
              <tr key={row.category} className="border-b border-pos-border/60">
                <td className="px-4 py-3 font-medium">{row.category}</td>
                <td className="px-4 py-3">{naira(row.netMinor)}</td>
                <td className="px-4 py-3">{total ? `${Math.round((row.netMinor / total) * 100)}%` : "—"}</td>
                <td className="px-4 py-3 font-semibold">{naira(row.taxMinor)}</td>
              </tr>
            ))}
            <tr className="bg-pos-surface-muted font-semibold">
              <td className="px-4 py-3">Total</td>
              <td className="px-4 py-3">{naira(total)}</td>
              <td className="px-4 py-3">100%</td>
              <td className="px-4 py-3">{naira(data.byCategory.reduce((sum, row) => sum + row.taxMinor, 0))}</td>
            </tr>
          </>
        )}
      </TableShell>
    </div>
  );
}
