"use client";

import { useEffect, useMemo, useState } from "react";
import { Barcode, FileBox, PackageOpen, Ruler } from "lucide-react";
import { toast } from "@/lib/toast";
import { listCatalog, type HqCatalogItem } from "@/lib/hq-api";
import { listMovements, listStockLevels, naira, prettyDay, type StockLevel, type StockMovement } from "@/lib/hq-ops";
import { formatLineQty, formatMovementQty, formatStock } from "@/lib/units";
import { ManagerSkeleton } from "../../Skeleton";
import { fieldClass } from "../../setup/SetupChrome";

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
}

export function BinCardPage() {
  const [catalog, setCatalog] = useState<HqCatalogItem[] | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [levels, setLevels] = useState<StockLevel[]>([]);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    Promise.all([listCatalog(), listMovements(), listStockLevels()])
      .then(([items, moves, stock]) => {
        setCatalog(items);
        setMovements(moves);
        setLevels(stock);
        setSelected((current) => current || items[0]?.id || "");
      })
      .catch((err) => {
        toast.error(err, "Could not load bin card");
        setCatalog([]);
      });
  }, []);

  const item = useMemo(() => catalog?.find((row) => row.id === selected) ?? null, [catalog, selected]);
  const level = useMemo(() => levels.find((row) => row.itemId === selected) ?? null, [levels, selected]);

  const itemMoves = useMemo(
    () =>
      movements
        .filter((move) => move.itemId === selected)
        .sort((a, b) => b.at.localeCompare(a.at)),
    [movements, selected],
  );

  const withRunning = useMemo(() => {
    let balance = level?.onHand ?? item?.onHand ?? 0;
    return itemMoves.map((move) => {
      balance -= move.quantity;
      return { move, balance };
    });
  }, [itemMoves, level, item]);

  if (catalog === null) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">
          Report · Stock
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">Bin card</h1>
        <p className="mt-1.5 text-sm text-pos-ink-muted">
          Per-item movement ledger with the current shelf balance.
        </p>
      </header>

      <label className="relative mb-5 block max-w-xl">
        <FileBox
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-pos-ink-faint"
        />
        <select
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          className={`${fieldClass} w-full appearance-none rounded-full py-3 pl-10 pr-10`}
        >
          {catalog.length === 0 ? (
            <option value="">No items in catalog</option>
          ) : (
            catalog.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))
          )}
        </select>
      </label>

      {!item ? (
        <div className="rounded-[20px] bg-pos-surface py-16 text-center shadow-pos-md">
          <PackageOpen size={32} className="mx-auto mb-3 opacity-30 text-pos-ink-faint" />
          <p className="text-sm text-pos-ink-faint">Pick an item above to open its bin card.</p>
        </div>
      ) : (
        <>
          <section className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[20px] bg-pos-surface p-5 shadow-pos-md">
              <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">On hand</p>
              <p
                className={`mt-1 truncate text-xl font-bold tabular-nums ${
                  (level?.onHand ?? item.onHand) <= (level?.reorderPoint ?? item.reorderLevel)
                    ? "text-pos-warning"
                    : "text-pos-ink"
                }`}
              >
                {formatStock(level?.onHand ?? item.onHand, level?.unit ?? item.unit, level?.packSize ?? item.packSize ?? 1, level?.unitLabel ?? item.unitLabel)}
              </p>
              <p className="mt-1 text-xs text-pos-ink-faint">
                {item.active ? "Active item" : "Inactive item"}
              </p>
            </div>
            <div className="rounded-[20px] bg-pos-surface p-5 shadow-pos-md">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-pos-ink-faint">
                <Ruler size={14} /> Price
              </div>
              <p className="mt-1 truncate text-xl font-bold tabular-nums text-pos-ink">
                {naira(item.priceMinor)}
              </p>
              <p className="mt-1 text-xs text-pos-ink-faint">{item.category}</p>
            </div>
            <div className="rounded-[20px] bg-pos-surface p-5 shadow-pos-md">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-pos-ink-faint">
                <Barcode size={14} /> SKU
              </div>
              <p className="mt-1 truncate font-mono text-sm font-bold text-pos-ink">{item.sku || "—"}</p>
              <p className="mt-1 truncate font-mono text-xs text-pos-ink-faint">{item.barcode || "—"}</p>
            </div>
            <div className="rounded-[20px] bg-pos-surface p-5 shadow-pos-md">
              <p className="text-[11px] uppercase tracking-wide text-pos-ink-faint">Movements</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-pos-ink">{itemMoves.length}</p>
              <p className="mt-1 text-xs text-pos-ink-faint">Posted against this bin</p>
            </div>
          </section>

          <section className="overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
            <header className="border-b border-pos-border px-5 py-4">
              <h2 className="font-semibold text-pos-ink">Ledger</h2>
              <p className="mt-0.5 text-xs text-pos-ink-faint">
                Newest first — running balance after each entry
              </p>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm" style={{ minWidth: 640 }}>
                <thead className="border-b border-pos-border text-[11px] font-semibold uppercase tracking-[0.08em] text-pos-ink-faint">
                  <tr>
                    <th className="px-5 py-3">When</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3 text-right">Qty</th>
                    <th className="px-5 py-3">Detail</th>
                    <th className="px-5 py-3">By</th>
                    <th className="px-5 py-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pos-border/50">
                  {itemMoves.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-pos-ink-faint">
                        <PackageOpen size={28} className="mx-auto mb-2 opacity-40" />
                        No movements for this item yet.
                      </td>
                    </tr>
                  ) : (
                    withRunning.map(({ move, balance: run }) => (
                      <tr key={move.id} className="hover:bg-pos-surface-muted/40">
                        <td className="whitespace-nowrap px-5 py-3.5">
                          {prettyDay(move.at.slice(0, 10))}{" "}
                          <span className="text-xs text-pos-ink-faint">{timeOf(move.at)}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="capitalize text-pos-ink-muted">{move.type}</span>
                        </td>
                        <td
                          className={`px-5 py-3.5 text-right font-mono font-semibold tabular-nums ${
                            move.quantity < 0 ? "text-pos-danger" : "text-pos-success"
                          }`}
                        >
                          {formatMovementQty(move.quantity, item.unit, item.unitLabel)}
                        </td>
                        <td className="px-5 py-3.5 text-pos-ink-muted">
                          {move.type === "transfer"
                            ? `${move.from || "—"} → ${move.to || "—"}`
                            : move.reason || (typeof move.countedOnHand === "number" ? `Counted ${move.countedOnHand}` : "—")}
                        </td>
                        <td className="px-5 py-3.5">{move.staff || "—"}</td>
                        <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-pos-ink">
                          {formatLineQty(run, item.unit, item.unitLabel)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}