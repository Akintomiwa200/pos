"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Coins, Search } from "lucide-react";
import { toast } from "@/lib/toast";
import { loadAccountingBooks, type AccountingBooks } from "@/lib/hq-accounting";
import { naira, prettyDay } from "@/lib/hq-ops";
import { ManagerSkeleton } from "../../Skeleton";
import { fieldClass } from "../../setup/SetupChrome";

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
}

export function CashBookPage() {
  const [books, setBooks] = useState<AccountingBooks | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadAccountingBooks()
      .then(setBooks)
      .catch((err) => {
        toast.error(err, "Could not load accounting books");
        setBooks(null);
      });
  }, []);

  const query = search.trim().toLowerCase();

  const rows = useMemo(() => {
    if (!books) return [];
    const filtered = books.cashMovements.filter((row) =>
      query
        ? [row.tender, row.memo].some((value) => value.toLowerCase().includes(query))
        : true,
    );
    const totalIn = books.cashMovements.reduce((sum, row) => sum + row.inMinor, 0);
    const totalOut = books.cashMovements.reduce((sum, row) => sum + row.outMinor, 0);
    const opening = books.cashMinor - totalIn + totalOut;
    let running = opening;
    return filtered
      .sort((a, b) => a.at.localeCompare(b.at))
      .map((row) => {
        running += row.inMinor - row.outMinor;
        return { row, running };
      })
      .reverse();
  }, [books, query]);

  if (!books) return <ManagerSkeleton variant="table" />;

  const allIn = books.cashMovements.reduce((sum, row) => sum + row.inMinor, 0);
  const allOut = books.cashMovements.reduce((sum, row) => sum + row.outMinor, 0);
  const shownIn = rows.reduce((sum, row) => sum + row.row.inMinor, 0);
  const shownOut = rows.reduce((sum, row) => sum + row.row.outMinor, 0);

  return (
    <div className="pb-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">
            Account · Books
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">Cash book</h1>
          <p className="mt-1.5 text-sm text-pos-ink-muted">
            Money in from tenders and money out for expenses, with a running cash position.
          </p>
        </div>
        <label className="relative min-w-[220px]">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-pos-ink-faint"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tender or memo…"
            className={`${fieldClass} w-full rounded-full pl-10 shadow-pos-md`}
          />
        </label>
      </header>

      <section className="mb-5 grid gap-4 lg:grid-cols-3">
        <div className="flex items-center gap-4 rounded-[20px] bg-pos-surface p-5 shadow-pos-md">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-100 text-pos-success dark:bg-emerald-950/40">
            <ArrowDownLeft size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Cash in</p>
            <p className="truncate text-xl font-bold tabular-nums text-pos-ink">{naira(allIn)}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-[20px] bg-pos-surface p-5 shadow-pos-md">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-rose-100 text-pos-danger dark:bg-rose-950/40">
            <ArrowUpRight size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Cash out</p>
            <p className="truncate text-xl font-bold tabular-nums text-pos-ink">{naira(allOut)}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-[20px] bg-pos-primary p-5 text-white shadow-pos-primary">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/15 text-white">
            <Coins size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-white/70">Opening cash position</p>
            <p className="truncate text-xl font-bold tabular-nums">{naira(books.cashMinor)}</p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" style={{ minWidth: 680 }}>
            <thead className="border-b border-pos-border bg-pos-surface-muted/50 text-[11px] font-semibold uppercase tracking-[0.08em] text-pos-ink-faint">
              <tr>
                <th className="px-5 py-3.5">When</th>
                <th className="px-5 py-3.5">Tender</th>
                <th className="px-5 py-3.5">Detail</th>
                <th className="px-5 py-3.5 text-right">In</th>
                <th className="px-5 py-3.5 text-right">Out</th>
                <th className="px-5 py-3.5 text-right">Running</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pos-border/50">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-pos-ink-faint">
                    <Coins size={28} className="mx-auto mb-2 opacity-40" />
                    {search ? "No cash movements match your search." : "No cash movements yet."}
                  </td>
                </tr>
              ) : (
                rows.map(({ row, running }) => (
                  <tr key={row.id} className="hover:bg-pos-surface-muted/40">
                    <td className="whitespace-nowrap px-5 py-3.5">
                      {prettyDay(row.at.slice(0, 10))}{" "}
                      <span className="text-xs text-pos-ink-faint">{timeOf(row.at)}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex rounded-full bg-pos-surface-muted px-2.5 py-1 text-[11px] font-semibold capitalize text-pos-ink-muted">
                        {row.tender}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-pos-ink-muted">{row.memo}</td>
                    <td className="px-5 py-3.5 text-right tabular-nums">
                      {row.inMinor > 0 ? (
                        <span className="font-semibold text-pos-success">{naira(row.inMinor)}</span>
                      ) : (
                        <span className="text-pos-ink-faint">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums">
                      {row.outMinor > 0 ? (
                        <span className="font-semibold text-pos-danger">{naira(row.outMinor)}</span>
                      ) : (
                        <span className="text-pos-ink-faint">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-pos-ink">
                      {naira(running)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {rows.length > 0 ? (
              <tfoot>
                <tr className="border-t-2 border-pos-border bg-pos-surface-muted/70 font-semibold">
                  <td className="px-5 py-3.5" colSpan={3}>
                    Net movement
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-pos-success">{naira(shownIn)}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-pos-danger">{naira(shownOut)}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-pos-ink">
                    {naira(shownIn - shownOut)}
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </section>
    </div>
  );
}