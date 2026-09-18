"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "@/lib/toast";
import { listCatalog } from "@/lib/hq-api";
import { importCatalogRows } from "@/lib/hq-setup";
import { naira } from "@/lib/hq-ops";
import { marginPercent, parseNairaInput } from "@/lib/catalog";
import {
  deleteDirectory,
  listDirectory,
  saveDirectory,
  type DirectoryRecord,
} from "@/lib/hq-directory";
import { useLiveCatalog } from "@/lib/live-catalog";
import { useLiveDirectoryRows } from "@/lib/live-directory-rows";
import { ImportManager } from "./ImportManager";
import { ExportManager } from "./ExportManager";
import { ManagerSkeleton } from "../Skeleton";
import { SlideOver } from "../SlideOver";
import {
  DataTable,
  Field,
  LiveBadge,
  PrimaryButton,
  SetupHeader,
  SetupStat,
  ToggleField,
  fieldClass,
  secondaryButtonClass,
} from "./SetupChrome";

const KICKER = "Main Menu · Products";

function daysUntil(iso?: string) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

export function BrandsManager() {
  const { rows, live, ready, setRows } = useLiveDirectoryRows("manufacturers");
  const [draft, setDraft] = useState<Partial<DirectoryRecord>>({ name: "", note: "", active: true });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");

  async function refresh() {
    try {
      setRows(await listDirectory("manufacturers"));
    } catch (err) {
      toast.error(err, "Could not load brands.");
    }
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name));
    if (!query) return sorted;
    return sorted.filter((row) =>
      [row.name, row.note ?? ""].some((value) => value.toLowerCase().includes(query)),
    );
  }, [rows, search]);

  if (!ready) return <ManagerSkeleton variant="table" />;

  return (
    <div>
      <SetupHeader
        kicker={KICKER}
        title="Brands"
        copy="Manufacturers and brand names attached to products — Nestlé, Chi, Indomie, and your own labels. Updates in real-time."
        action={
          <div className="flex items-center gap-2">
            <LiveBadge live={live} />
            <PrimaryButton
              onClick={() => {
                setDraft({ name: "", note: "", active: true });
                setOpen(true);
              }}
            >
              <span className="inline-flex items-center gap-2">
                <Plus size={16} />
                New brand
              </span>
            </PrimaryButton>
          </div>
        }
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <SetupStat label="Brands" value={String(rows.length)} hint={`${rows.filter((r) => r.active).length} active`} />
        <SetupStat label="In view" value={String(filtered.length)} tone="accent" />
      </div>
      <DataTable
        columns={["Brand", "Note", "Status"]}
        toolbar={
          <input
            className={`${fieldClass} max-w-sm`}
            placeholder="Search brands…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        }
      >
        {filtered.length === 0 ? (
          <tr>
            <td className="px-4 py-6 text-pos-ink-faint" colSpan={3}>
              No brands yet.
            </td>
          </tr>
        ) : (
          filtered.map((row) => (
            <tr
              key={row.id}
              className="cursor-pointer border-b border-pos-border/60 hover:bg-pos-surface-muted"
              onClick={() => {
                setDraft(row);
                setOpen(true);
              }}
            >
              <td className="px-4 py-3 font-medium">{row.name}</td>
              <td className="px-4 py-3 text-pos-ink-muted">{row.note || "—"}</td>
              <td className="px-4 py-3">{row.active ? "Active" : "Inactive"}</td>
            </tr>
          ))
        )}
      </DataTable>
      <SlideOver
        open={open}
        title={draft.id ? "Edit brand" : "New brand"}
        onClose={() => setOpen(false)}
        footer={
          <div className="flex gap-2">
            {draft.id ? (
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={async () => {
                  try {
                    await deleteDirectory("manufacturers", draft.id!);
                    await refresh();
                    setOpen(false);
                    toast.success("Brand deleted.");
                  } catch (err) {
                    toast.error(err, "Could not delete brand.");
                  }
                }}
              >
                Delete
              </button>
            ) : null}
            <PrimaryButton
              className="flex-1"
              disabled={busy}
              onClick={async () => {
                if (!draft.name?.trim()) {
                  toast.error("Enter a brand name.");
                  return;
                }
                setBusy(true);
                try {
                  await saveDirectory("manufacturers", draft);
                  await refresh();
                  setOpen(false);
                  toast.success("Brand saved.");
                } catch (err) {
                  toast.error(err, "Could not save brand.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Save
            </PrimaryButton>
          </div>
        }
      >
        <Field label="Name">
          <input
            className={fieldClass}
            value={draft.name ?? ""}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
        </Field>
        <Field label="Note">
          <textarea
            rows={2}
            className={fieldClass}
            value={draft.note ?? ""}
            onChange={(event) => setDraft({ ...draft, note: event.target.value })}
          />
        </Field>
        <ToggleField
          label="Active"
          checked={draft.active ?? true}
          onChange={(active) => setDraft({ ...draft, active })}
        />
      </SlideOver>
    </div>
  );
}

export function PriceListManager() {
  const { items, setItems, live } = useLiveCatalog();
  const [edits, setEdits] = useState<Record<string, { cost: string; price: string }>>({});
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    listCatalog()
      .then((rows) => setItems(rows))
      .catch((err) => toast.error(err, "Could not load price list."))
      .finally(() => setReady(true));
  }, [setItems]);

  useEffect(() => {
    if (items.length === 0) return;
    setEdits((current) => {
      const next = { ...current };
      let changed = false;
      for (const item of items) {
        if (!next[item.id]) {
          next[item.id] = {
            cost: (item.costMinor / 100).toFixed(2),
            price: (item.priceMinor / 100).toFixed(2),
          };
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [items]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));
    if (!query) return sorted;
    return sorted.filter((row) =>
      [row.name, row.sku, row.productCode ?? "", row.barcode, row.category].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [items, search]);

  const dirty = useMemo(() => {
    return items.filter((item) => {
      const edit = edits[item.id];
      if (!edit) return false;
      return (
        parseNairaInput(edit.cost) !== item.costMinor ||
        parseNairaInput(edit.price) !== item.priceMinor
      );
    });
  }, [items, edits]);

  if (!ready) return <ManagerSkeleton variant="table" />;

  return (
    <div>
      <SetupHeader
        kicker={KICKER}
        title="Price List"
        copy="Review and adjust cost and selling price across the catalog. Save only the rows you changed. Prices and stock refresh in real-time."
        action={
          <div className="flex items-center gap-2">
            <LiveBadge live={live} />
            <PrimaryButton
              disabled={busy || dirty.length === 0}
              onClick={async () => {
                setBusy(true);
                try {
                  await importCatalogRows(
                    dirty.map((item) => ({
                      id: item.id,
                      name: item.name,
                      category: item.category,
                      costMinor: parseNairaInput(edits[item.id]?.cost ?? "0"),
                      priceMinor: parseNairaInput(edits[item.id]?.price ?? "0"),
                    })),
                  );
                  toast.success(`Updated ${dirty.length} product${dirty.length === 1 ? "" : "s"}.`);
                } catch (err) {
                  toast.error(err, "Could not save prices.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Save {dirty.length ? `(${dirty.length})` : "changes"}
            </PrimaryButton>
          </div>
        }
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <SetupStat label="Products" value={String(items.length)} />
        <SetupStat label="Unsaved edits" value={String(dirty.length)} tone="accent" />
        <SetupStat
          label="Catalog sell value"
          value={naira(items.reduce((sum, row) => sum + row.onHand * row.priceMinor, 0))}
        />
      </div>
      <DataTable
        columns={["Product", "SKU", "Cost ₦", "Sell ₦", "Margin"]}
        toolbar={
          <input
            className={`${fieldClass} max-w-sm`}
            placeholder="Search products…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        }
      >
        {rows.map((row) => {
          const edit = edits[row.id] ?? { cost: "0", price: "0" };
          const costMinor = parseNairaInput(edit.cost);
          const priceMinor = parseNairaInput(edit.price);
          return (
            <tr key={row.id} className="border-b border-pos-border/60">
              <td className="px-4 py-3 font-medium">{row.name}</td>
              <td className="px-4 py-3 font-mono text-[12px] text-pos-ink-muted">{row.sku}</td>
              <td className="px-4 py-3">
                <input
                  className={`${fieldClass} max-w-[120px]`}
                  value={edit.cost}
                  onChange={(event) =>
                    setEdits((current) => ({
                      ...current,
                      [row.id]: { ...edit, cost: event.target.value },
                    }))
                  }
                />
              </td>
              <td className="px-4 py-3">
                <input
                  className={`${fieldClass} max-w-[120px]`}
                  value={edit.price}
                  onChange={(event) =>
                    setEdits((current) => ({
                      ...current,
                      [row.id]: { ...edit, price: event.target.value },
                    }))
                  }
                />
              </td>
              <td className="px-4 py-3 tabular-nums text-pos-ink-muted">
                {marginPercent(costMinor, priceMinor)}%
              </td>
            </tr>
          );
        })}
      </DataTable>
    </div>
  );
}

export function LowStockManager() {
  const { items, setItems, live } = useLiveCatalog();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    listCatalog()
      .then(setItems)
      .catch((err) => toast.error(err, "Could not load stock."))
      .finally(() => setReady(true));
  }, [setItems]);

  const rows = useMemo(
    () =>
      items
        .filter((row) => row.active !== false && row.onHand <= (row.reorderLevel ?? 5))
        .sort((a, b) => a.onHand - b.onHand || a.name.localeCompare(b.name)),
    [items],
  );
  const out = rows.filter((row) => row.onHand <= 0).length;

  if (!ready) return <ManagerSkeleton variant="table" />;

  return (
    <div>
      <SetupHeader
        kicker={KICKER}
        title="Low Stock"
        copy="Products at or below reorder level. Raise a purchase order or adjust stock before shelves go empty."
        action={
          <div className="flex items-center gap-2">
            <LiveBadge live={live} />
            <Link href="/orders/new" className={secondaryButtonClass}>
              New purchase order
            </Link>
          </div>
        }
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <SetupStat label="Need attention" value={String(rows.length)} tone="accent" />
        <SetupStat label="Stock out" value={String(out)} />
        <SetupStat label="Low but available" value={String(rows.length - out)} />
      </div>
      <DataTable columns={["Product", "SKU", "On hand", "Reorder at", "Category", ""]}>
        {rows.length === 0 ? (
          <tr>
            <td className="px-4 py-6 text-pos-ink-faint" colSpan={6}>
              Stock levels look healthy.
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr key={row.id} className="border-b border-pos-border/60">
              <td className="px-4 py-3 font-medium">{row.name}</td>
              <td className="px-4 py-3 font-mono text-[12px]">{row.sku}</td>
              <td
                className={`px-4 py-3 tabular-nums font-semibold ${
                  row.onHand <= 0 ? "text-red-600" : "text-amber-700"
                }`}
              >
                {row.onHand}
              </td>
              <td className="px-4 py-3 tabular-nums">{row.reorderLevel}</td>
              <td className="px-4 py-3 text-pos-ink-muted">{row.category}</td>
              <td className="px-4 py-3 text-right">
                <Link href="/setup/items/items" className="text-sm text-pos-primary">
                  Open products
                </Link>
              </td>
            </tr>
          ))
        )}
      </DataTable>
    </div>
  );
}

export function ExpiringManager() {
  const { items, setItems, live } = useLiveCatalog();
  const [ready, setReady] = useState(false);
  const [windowDays, setWindowDays] = useState(30);

  useEffect(() => {
    listCatalog()
      .then(setItems)
      .catch((err) => toast.error(err, "Could not load expiry data."))
      .finally(() => setReady(true));
  }, [setItems]);

  const rows = useMemo(() => {
    return items
      .filter((row) => {
        const days = daysUntil(row.expiresAt);
        return days !== null && days <= windowDays;
      })
      .sort((a, b) => (daysUntil(a.expiresAt) ?? 0) - (daysUntil(b.expiresAt) ?? 0));
  }, [items, windowDays]);

  const expired = rows.filter((row) => (daysUntil(row.expiresAt) ?? 0) < 0).length;

  if (!ready) return <ManagerSkeleton variant="table" />;

  return (
    <div>
      <SetupHeader
        kicker={KICKER}
        title="Expiring Products"
        copy="Batches nearing or past expiry — clear shelves, discount, or write off before customers complain."
      />
      <div className="mb-6 flex flex-wrap items-end gap-4">
<div className="grid gap-3 sm:grid-cols-3 sm:flex-1">
                <SetupStat label="In window" value={String(rows.length)} tone="accent" />
                <SetupStat label="Already expired" value={String(expired)} />
                <SetupStat label="Window" value={`${windowDays} days`} />
              </div>
              <div className="flex items-end gap-2">
                <LiveBadge live={live} />
                <Field label="Show next (days)">
                  <select
                    className={`${fieldClass} min-w-[150px]`}
                    value={windowDays}
                    onChange={(event) => setWindowDays(Number(event.target.value))}
                  >
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                    <option value={30}>30 days</option>
                    <option value={60}>60 days</option>
                    <option value={90}>90 days</option>
                  </select>
                </Field>
              </div>
      </div>
      <DataTable columns={["Product", "Batch", "Expires", "Days left", "On hand", "Status"]}>
        {rows.length === 0 ? (
          <tr>
            <td className="px-4 py-6 text-pos-ink-faint" colSpan={6}>
              Nothing expiring in this window.
            </td>
          </tr>
        ) : (
          rows.map((row) => {
            const days = daysUntil(row.expiresAt) ?? 0;
            return (
              <tr key={row.id} className="border-b border-pos-border/60">
                <td className="px-4 py-3 font-medium">{row.name}</td>
                <td className="px-4 py-3 font-mono text-[12px]">{row.batchNumber || "—"}</td>
                <td className="px-4 py-3">
                  {row.expiresAt ? new Date(row.expiresAt).toLocaleDateString("en-NG") : "—"}
                </td>
                <td
                  className={`px-4 py-3 tabular-nums font-semibold ${
                    days < 0 ? "text-red-600" : days <= 7 ? "text-amber-700" : ""
                  }`}
                >
                  {days}
                </td>
                <td className="px-4 py-3 tabular-nums">{row.onHand}</td>
                <td className="px-4 py-3">{days < 0 ? "Expired" : "Expiring"}</td>
              </tr>
            );
          })
        )}
      </DataTable>
    </div>
  );
}

export function ProductImportManager() {
  return <ImportManager />;
}

export function ProductExportManager() {
  return <ExportManager />;
}
