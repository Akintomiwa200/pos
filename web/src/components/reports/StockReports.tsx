"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "@/lib/toast";
import { listCatalog, type HqCatalogItem } from "@/lib/hq-api";
import {
  listMovements,
  listStockLevels,
  recordMovement,
  type StockLevel,
  type StockMovement,
} from "@/lib/hq-ops";
import { naira, prettyDay } from "@/lib/hq-ops";
import { syncStockLevelsFromCatalog, useLiveCatalog } from "@/lib/live-catalog";
import { formatMovementQty, formatStock } from "@/lib/units";
import { ManagerSkeleton } from "../Skeleton";
import { EmptyRow, PageHeader, StatCard, TableShell, Toolbar } from "../console/Chrome";
import { PrimaryButton } from "../setup/SetupChrome";

export type StockVariant = "balance" | "sheet" | "movement" | "bin-card" | "expiry" | "count";

const HEADERS: Record<StockVariant, { kicker: string; title: string; copy: string }> = {
  balance: {
    kicker: "Report · Stock",
    title: "Balance",
    copy: "What is on the shelf right now, synced live from every till.",
  },
  sheet: {
    kicker: "Report · Stock",
    title: "Sheet",
    copy: "Full stock listing grouped by category — print-friendly.",
  },
  movement: {
    kicker: "Report · Stock",
    title: "Movement",
    copy: "Every transfer, adjustment and count posted against stock.",
  },
  "bin-card": {
    kicker: "Report · Stock",
    title: "Bin Card",
    copy: "Per-item movement ledger with the current shelf balance.",
  },
  expiry: {
    kicker: "Report · Stock",
    title: "Expiry",
    copy: "Items with expiry dates, soonest first. Red already expired.",
  },
  count: {
    kicker: "Report · Stock",
    title: "Count",
    copy: "Physical count worksheet — enter what is on the shelf and post the adjustment.",
  },
};

function expiryTone(expiresAt: string | undefined) {
  if (!expiresAt) return "";
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return "text-pos-danger font-semibold";
  if (days <= 30) return "text-pos-warning font-semibold";
  return "";
}

export function StockReports({ variant }: { variant: StockVariant }) {
  const [levels, setLevels] = useState<StockLevel[] | null>(null);
  const { items: catalog, setItems: setCatalog } = useLiveCatalog();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState("");
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [posting, setPosting] = useState(false);

  async function loadLevels() {
    const [rows, items, moves] = await Promise.all([listStockLevels(), listCatalog(), listMovements()]);
    setLevels(rows);
    setCatalog(items);
    setMovements(moves);
    setSelectedItem((current) => current || rows[0]?.itemId || "");
  }

  useEffect(() => {
    if (!catalog.length) return;
    setLevels((current) => (current ? syncStockLevelsFromCatalog(current, catalog) : current));
  }, [catalog]);

  useEffect(() => {
    loadLevels().catch((err) => {
      toast.error(err, "Could not load stock");
      setLevels([]);
    });
  }, []);

  const query = search.trim().toLowerCase();

  const filtered = useMemo(
    () =>
      (levels ?? []).filter((row) =>
        query
          ? [row.name, row.sku, row.barcode, row.category].some((value) =>
              value.toLowerCase().includes(query),
            )
          : true,
      ),
    [levels, query],
  );

  const header = HEADERS[variant];

  if (!levels) return <ManagerSkeleton variant="table" />;

  const totalValueMinor = levels.reduce((sum, row) => sum + row.valueMinor, 0);
  const lowCount = levels.filter((row) => row.onHand <= row.reorderPoint).length;

  if (variant === "balance" || variant === "sheet") {
    return (
      <div>
        <PageHeader kicker={header.kicker} title={header.title} copy={header.copy} />
        {variant === "balance" ? (
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <StatCard label="Stock value" value={naira(totalValueMinor, 0)} />
            <StatCard label="SKUs tracked" value={String(levels.length)} />
            <StatCard label="Low stock" value={String(lowCount)} hint="At or below reorder point" />
          </div>
        ) : null}
        <TableShell columns={["Name", "Category", "SKU", "On hand", "Reorder at", "Value"]}>
          {filtered.length === 0 ? (
            <EmptyRow colSpan={6} message="No stock records." />
          ) : (
            filtered.map((row) => (
              <tr key={row.itemId} className="border-b border-pos-border/60">
                <td className="px-4 py-3 font-medium">{row.name}</td>
                <td className="px-4 py-3">{row.category}</td>
                <td className="px-4 py-3 text-pos-ink-muted">{row.sku}</td>
                <td className={`px-4 py-3 ${row.onHand <= row.reorderPoint ? "font-semibold text-pos-danger" : ""}`}>
                  {formatStock(row.onHand, row.unit, row.packSize, row.unitLabel)}
                </td>
                <td className="px-4 py-3 text-pos-ink-muted">{row.reorderPoint}</td>
                <td className="px-4 py-3">{naira(row.valueMinor, 0)}</td>
              </tr>
            ))
          )}
        </TableShell>
      </div>
    );
  }

  if (variant === "movement") {
    const rows = [...movements].sort((a, b) => b.at.localeCompare(a.at));
    const visible = query
      ? rows.filter((row) =>
          [row.itemName, row.type, row.reason ?? "", row.staff ?? ""].some((value) =>
            value.toLowerCase().includes(query),
          ),
        )
      : rows;
    return (
      <div>
        <PageHeader kicker={header.kicker} title={header.title} copy={header.copy} />
        <TableShell
          columns={["When", "Type", "Item", "Qty", "Detail", "By"]}
          toolbar={<Toolbar search={search} onSearch={setSearch} />}
        >
          {visible.length === 0 ? (
            <EmptyRow colSpan={6} message="No stock movements posted yet." />
          ) : (
            visible.slice(0, 300).map((row) => {
              const item = catalog.find((entry) => entry.id === row.itemId);
              return (
              <tr key={row.id} className="border-b border-pos-border/60">
                <td className="whitespace-nowrap px-4 py-3">
                  {prettyDay(row.at.slice(0, 10))} ·{" "}
                  {new Date(row.at).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-4 py-3 capitalize">{row.type}</td>
                <td className="px-4 py-3 font-medium">{row.itemName}</td>
                <td className={`px-4 py-3 ${row.quantity < 0 ? "text-pos-danger" : "text-pos-success"} font-semibold`}>
                  {formatMovementQty(
                    row.quantity,
                    item?.unit ?? "each",
                    item?.unitLabel,
                  )}
                </td>
                <td className="px-4 py-3 text-pos-ink-muted">
                  {row.type === "transfer"
                    ? `${row.from || "—"} → ${row.to || "—"}`
                    : row.reason || (typeof row.countedOnHand === "number" ? `Counted ${row.countedOnHand}` : "—")}
                </td>
                <td className="px-4 py-3">{row.staff || "—"}</td>
              </tr>
            );
            })
          )}
        </TableShell>
      </div>
    );
  }

  if (variant === "bin-card") {
    const item = catalog.find((row) => row.id === selectedItem);
    const itemMoves = [...movements]
      .filter((move) => move.itemId === selectedItem)
      .sort((a, b) => b.at.localeCompare(a.at));
    const level = levels.find((row) => row.itemId === selectedItem);
    return (
      <div>
        <PageHeader kicker={header.kicker} title={header.title} copy={header.copy} />
        <label className="mb-4 block max-w-md text-sm font-medium text-pos-ink">
          Item
          <select
            className="mt-1 w-full rounded-xl border border-pos-border bg-pos-surface px-3 py-2.5 text-sm outline-none focus:border-pos-primary"
            value={selectedItem}
            onChange={(event) => setSelectedItem(event.target.value)}
          >
            {catalog.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
        {item && level ? (
          <div className="mb-4 grid gap-3 sm:grid-cols-4">
            <StatCard
              label="On hand"
              value={formatStock(level.onHand, level.unit, level.packSize, level.unitLabel)}
            />
            <StatCard label="Price" value={naira(item.priceMinor)} />
            <StatCard label="Category" value={item.category} />
            <StatCard label="Movements" value={String(itemMoves.length)} />
          </div>
        ) : null}
        <TableShell columns={["When", "Type", "Qty", "Detail", "By"]}>
          {itemMoves.length === 0 ? (
            <EmptyRow colSpan={5} message="No movements for this item yet." />
          ) : (
            itemMoves.map((move) => (
              <tr key={move.id} className="border-b border-pos-border/60">
                <td className="whitespace-nowrap px-4 py-3">{prettyDay(move.at.slice(0, 10))}</td>
                <td className="px-4 py-3 capitalize">{move.type}</td>
                <td className={`px-4 py-3 ${move.quantity < 0 ? "text-pos-danger" : "text-pos-success"} font-semibold`}>
                  {formatMovementQty(move.quantity, item?.unit ?? "each", item?.unitLabel)}
                </td>
                <td className="px-4 py-3 text-pos-ink-muted">
                  {move.reason || (typeof move.countedOnHand === "number" ? `Counted ${move.countedOnHand}` : "—")}
                </td>
                <td className="px-4 py-3">{move.staff || "—"}</td>
              </tr>
            ))
          )}
        </TableShell>
      </div>
    );
  }

  if (variant === "expiry") {
    const dated = catalog
      .filter((item) => Boolean(item.expiresAt))
      .sort((a, b) => (a.expiresAt ?? "").localeCompare(b.expiresAt ?? ""));
    return (
      <div>
        <PageHeader kicker={header.kicker} title={header.title} copy={header.copy} />
        <TableShell columns={["Item", "Batch", "Expiry", "On hand", "Sell", "Status"]}>
          {dated.length === 0 ? (
            <EmptyRow colSpan={6} message="No items carry expiry dates — set them on items to track batches." />
          ) : (
            dated.map((item) => {
              const tone = expiryTone(item.expiresAt);
              const days = Math.ceil((new Date(item.expiresAt!).getTime() - Date.now()) / 86_400_000);
              return (
                <tr key={item.id} className="border-b border-pos-border/60">
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-pos-ink-muted">
                    {item.batchNumber || "—"}
                  </td>
                  <td className={`px-4 py-3 ${tone}`}>{item.expiresAt!.slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    {formatStock(item.onHand, item.unit, item.packSize ?? 1, item.unitLabel)}
                  </td>
                  <td className="px-4 py-3">
                    {naira(item.priceMinor)}{" "}
                    <span className="text-xs text-pos-ink-muted">
                      {item.unitLabel ? `/${item.unitLabel.toLowerCase()}` : ""}
                    </span>
                  </td>
                  <td className={`px-4 py-3 ${tone}`}>
                    {days < 0 ? `Expired ${-days}d ago` : `${days}d left`}
                  </td>
                </tr>
              );
            })
          )}
        </TableShell>
      </div>
    );
  }

  // count worksheet
  const changed = Object.entries(counts)
    .map(([itemId, value]) => ({ itemId, counted: parseInt(value, 10), item: catalog.find((c) => c.id === itemId) }))
    .filter((row) => Number.isFinite(row.counted) && row.item && row.counted !== row.item!.onHand);

  async function postCounts() {
    setPosting(true);
    try {
      let applied = 0;
      for (const row of changed) {
        await recordMovement({
          type: "count",
          itemId: row.itemId,
          countedOnHand: row.counted,
          reason: "Physical count",
        });
        applied += 1;
      }
      setCounts({});
      await loadLevels();
      toast.success(`${applied} count${applied === 1 ? "" : "s"} posted.`);
    } catch (err) {
      toast.error(err, "Could not post counts");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div>
      <PageHeader
        kicker={header.kicker}
        title={header.title}
        copy={header.copy}
        action={
          <PrimaryButton disabled={posting || changed.length === 0} onClick={postCounts}>
            Post {changed.length || ""} adjustment{changed.length === 1 ? "" : "s"}
          </PrimaryButton>
        }
      />
      <TableShell
        columns={["Item", "System", "Counted", "Variance", ""]}
        toolbar={<Toolbar search={search} onSearch={setSearch} />}
      >
        {filtered.length === 0 ? (
          <EmptyRow colSpan={5} message="No items." />
        ) : (
          filtered.slice(0, 200).map((row) => {
            const typed = counts[row.itemId] ?? "";
            const variance = typed === "" ? null : parseInt(typed, 10) - row.onHand;
            return (
              <tr key={row.itemId} className="border-b border-pos-border/60">
                <td className="px-4 py-2.5 font-medium">
                  {row.name}
                  <span className="ml-2 text-xs text-pos-ink-faint">{row.category}</span>
                </td>
                <td className="px-4 py-2.5">
                  {formatStock(row.onHand, row.unit, row.packSize, row.unitLabel)}
                </td>
                <td className="w-28 px-4 py-2.5">
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded-lg border border-pos-border bg-pos-surface px-2 py-1.5 text-sm outline-none focus:border-pos-primary"
                    value={typed}
                    placeholder={String(row.onHand)}
                    onChange={(event) =>
                      setCounts((current) => ({ ...current, [row.itemId]: event.target.value }))
                    }
                  />
                </td>
                <td
                  className={`px-4 py-2.5 ${
                    variance === null ? "text-pos-ink-faint" : variance === 0 ? "text-pos-ink-muted" : variance > 0 ? "text-pos-success" : "text-pos-danger"
                  }`}
                >
                  {variance === null ? "—" : variance > 0 ? `+${variance}` : variance}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {variance !== null && variance !== 0 ? (
                    <button
                      type="button"
                      className="text-xs text-pos-primary"
                      onClick={() => setCounts((current) => ({ ...current, [row.itemId]: "" }))}
                    >
                      Clear
                    </button>
                  ) : null}
                </td>
              </tr>
            );
          })
        )}
      </TableShell>
    </div>
  );
}
