"use client";

import { useEffect, useMemo, useState } from "react";
import { Boxes, CircleDot, FileText, History } from "lucide-react";
import { toast } from "@/lib/toast";
import { listDirectory, type DirectoryRecord } from "@/lib/hq-directory";
import {
  listDocs,
  listMovements,
  naira,
  prettyDay,
  type StockMovement,
  type TradeDoc,
} from "@/lib/hq-ops";
import { ManagerSkeleton } from "../../Skeleton";
import { DIRECTORY_OF, LABELS, type EntityKind } from "./shared";

type Source = "document" | "stock";

type TrailEntry = {
  id: string;
  at: string;
  source: Source;
  kind: string;
  detail: string;
  amountMinor?: number;
};

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
}

export function EntityTrailFeed({ entity }: { entity: EntityKind }) {
  const isVendor = entity === "vendor";

  const [records, setRecords] = useState<DirectoryRecord[] | null>(null);
  const [docs, setDocs] = useState<TradeDoc[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [filter, setFilter] = useState<Source | "all">("all");

  useEffect(() => {
    const wanted: Array<"purchase-invoice" | "purchase-order" | "sales-quote"> = isVendor
      ? ["purchase-invoice", "purchase-order"]
      : ["sales-quote"];
    Promise.all([
      listDirectory(DIRECTORY_OF[entity]),
      ...wanted.map((kind) => listDocs(kind)),
      listMovements(),
    ])
      .then((results) => {
        setRecords(results[0]);
        setDocs(results.slice(1, 1 + wanted.length).flat() as TradeDoc[]);
        setMovements(results[1 + wanted.length] as StockMovement[]);
      })
      .catch((err) => {
        toast.error(err, "Could not load trail");
        setRecords([]);
      });
  }, [entity, isVendor]);

  const groups = useMemo(() => {
    const trail: TrailEntry[] = [];

    for (const doc of docs) {
      trail.push({
        id: doc.id,
        at: doc.at,
        source: "document",
        kind: doc.kind.replace("-", " "),
        detail: `${doc.number} · ${doc.party || "—"} · ${doc.lines.length} line(s)`,
        amountMinor: doc.totalMinor,
      });
    }
    for (const move of movements) {
      trail.push({
        id: move.id,
        at: move.at,
        source: "stock",
        kind: `stock ${move.type}`,
        detail: `${move.itemName} × ${move.quantity}${move.reason ? ` · ${move.reason}` : ""}`,
      });
    }

    const filtered = trail
      .filter((entry) => filter === "all" || entry.source === filter)
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 300);

    const byDay = new Map<string, TrailEntry[]>();
    for (const entry of filtered) {
      const day = entry.at.slice(0, 10);
      const list = byDay.get(day) ?? [];
      list.push(entry);
      byDay.set(day, list);
    }
    return [...byDay.entries()];
  }, [docs, movements, filter]);

  if (!records) return <ManagerSkeleton variant="table" />;

  const docCount = docs.length;
  const moveCount = movements.length;

  return (
    <div className="pb-8">
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">
          Report · Trail · {LABELS[entity]}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">{LABELS[entity]} activity trail</h1>
        <p className="mt-1.5 text-sm text-pos-ink-muted">
          Everything that happened involving this department across documents and stock, newest first.
        </p>
      </header>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {(
          [
            { key: "all" as const, label: `All activity`, count: docCount + moveCount },
            { key: "document" as const, label: "Documents", count: docCount },
            { key: "stock" as const, label: "Stock", count: moveCount },
          ]
        ).map((pill) => (
          <button
            key={pill.key}
            onClick={() => setFilter(pill.key)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              filter === pill.key
                ? "bg-pos-primary text-white shadow-pos-primary"
                : "bg-pos-surface text-pos-ink-muted shadow-pos-sm hover:text-pos-ink"
            }`}
          >
            <CircleDot size={14} />
            {pill.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[11px] tabular-nums ${
                filter === pill.key ? "bg-white/15" : "bg-pos-surface-muted"
              }`}
            >
              {pill.count}
            </span>
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <section className="rounded-[20px] bg-pos-surface py-16 text-center text-pos-ink-faint shadow-pos-md">
          <History size={30} className="mx-auto mb-3 opacity-40" />
          No activity recorded yet.
        </section>
      ) : (
        <section className="relative space-y-6 before:absolute before:left-[5px] before:top-2 before:bottom-2 before:hidden before:w-px before:bg-pos-border sm:before:block">
          {groups.map(([day, entries]) => (
            <div key={day} className="sm:pl-7">
              <header className="mb-2 flex items-center gap-3">
                <span className="hidden h-[11px] w-[11px] shrink-0 rounded-full border-2 border-pos-primary bg-pos-surface sm:block" />
                <p className="text-sm font-bold uppercase tracking-wide text-pos-ink">{prettyDay(day)}</p>
                <span className="h-px flex-1 bg-pos-border" />
                <span className="text-xs tabular-nums text-pos-ink-faint">
                  {entries.length} event{entries.length === 1 ? "" : "s"}
                </span>
              </header>
              <div className="space-y-2">
                {entries.map((entry) => (
                  <article
                    key={`${entry.source}-${entry.id}`}
                    className="flex items-center gap-4 rounded-[16px] bg-pos-surface px-4 py-3 shadow-pos-sm"
                  >
                    <div
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                        entry.source === "document"
                          ? "bg-pos-primary-soft text-pos-primary"
                          : "bg-pos-warning-soft text-pos-warning"
                      }`}
                    >
                      {entry.source === "document" ? <FileText size={16} /> : <Boxes size={16} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${
                            entry.source === "document"
                              ? "bg-pos-primary-soft text-pos-primary"
                              : "bg-pos-warning-soft text-pos-warning"
                          }`}
                        >
                          {entry.kind}
                        </span>
                        <span className="text-xs tabular-nums text-pos-ink-faint">
                          {prettyDay(entry.at.slice(0, 10))} · {timeOf(entry.at)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm font-medium text-pos-ink">{entry.detail}</p>
                    </div>
                    {entry.amountMinor !== undefined ? (
                      <p className="shrink-0 text-sm font-semibold tabular-nums text-pos-ink">
                        {naira(entry.amountMinor)}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}