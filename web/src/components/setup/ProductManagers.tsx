"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus, ScanBarcode, Search } from "lucide-react";
import { toast } from "@/lib/toast";
import { api, listCatalog, type HqCatalogItem } from "@/lib/hq-api";
import { importCatalogRows, exportSetup } from "@/lib/hq-setup";
import { naira } from "@/lib/hq-ops";
import { marginPercent, parseNairaInput } from "@/lib/catalog";
import {
  deleteDirectory,
  listDirectory,
  saveDirectory,
  type DirectoryRecord,
} from "@/lib/hq-directory";
import { ManagerSkeleton } from "../Skeleton";
import { SlideOver } from "../SlideOver";
import {
  DataTable,
  Field,
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
  const [rows, setRows] = useState<DirectoryRecord[]>([]);
  const [draft, setDraft] = useState<Partial<DirectoryRecord>>({ name: "", note: "", active: true });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState("");

  async function load() {
    setRows(await listDirectory("manufacturers"));
    setReady(true);
  }

  useEffect(() => {
    load().catch((err) => {
      toast.error(err, "Could not load brands.");
      setReady(true);
    });
  }, []);

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
        copy="Manufacturers and brand names attached to products — Nestlé, Chi, Indomie, and your own labels."
        action={
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
                    await load();
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
                  await load();
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
  const [items, setItems] = useState<HqCatalogItem[]>([]);
  const [edits, setEdits] = useState<Record<string, { cost: string; price: string }>>({});
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  async function load() {
    const rows = await listCatalog();
    setItems(rows);
    setEdits(
      Object.fromEntries(
        rows.map((row) => [
          row.id,
          {
            cost: (row.costMinor / 100).toFixed(2),
            price: (row.priceMinor / 100).toFixed(2),
          },
        ]),
      ),
    );
    setReady(true);
  }

  useEffect(() => {
    load().catch((err) => {
      toast.error(err, "Could not load price list.");
      setReady(true);
    });
  }, []);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));
    if (!query) return sorted;
    return sorted.filter((row) =>
      [row.name, row.sku, row.barcode, row.category].some((value) =>
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
        copy="Review and adjust cost and selling price across the catalog. Save only the rows you changed."
        action={
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
                await load();
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
  const [items, setItems] = useState<HqCatalogItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    listCatalog()
      .then(setItems)
      .catch((err) => toast.error(err, "Could not load stock."))
      .finally(() => setReady(true));
  }, []);

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
          <Link href="/orders/new" className={secondaryButtonClass}>
            New purchase order
          </Link>
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
  const [items, setItems] = useState<HqCatalogItem[]>([]);
  const [ready, setReady] = useState(false);
  const [windowDays, setWindowDays] = useState(30);

  useEffect(() => {
    listCatalog()
      .then(setItems)
      .catch((err) => toast.error(err, "Could not load expiry data."))
      .finally(() => setReady(true));
  }, []);

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
        <Field label="Show next (days)">
          <select
            className={fieldClass}
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

export function BarcodeLookupManager() {
  const [query, setQuery] = useState("");
  const [item, setItem] = useState<HqCatalogItem | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  async function lookup(value: string) {
    const q = value.trim();
    if (!q) {
      setItem(undefined);
      return;
    }
    setBusy(true);
    try {
      const data = await api<{ item: HqCatalogItem | null }>(
        `/api/catalog/lookup?q=${encodeURIComponent(q)}`,
      );
      setItem(data.item);
    } catch (err) {
      toast.error(err, "Lookup failed.");
      setItem(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <SetupHeader
        kicker={KICKER}
        title="Barcode Lookup"
        copy="Scan or type a barcode, SKU, or batch number to confirm price and stock before the till rings it up."
      />
      <section className="mx-auto max-w-xl rounded-[24px] bg-pos-surface p-6 shadow-pos-md">
        <Field label="Scan or type code">
          <div className="flex gap-2">
            <input
              autoFocus
              className={fieldClass}
              placeholder="Barcode / SKU / batch…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void lookup(query);
                }
              }}
            />
            <PrimaryButton disabled={busy} onClick={() => void lookup(query)}>
              <Search size={16} />
              Find
            </PrimaryButton>
          </div>
        </Field>
        {item === undefined ? (
          <div className="mt-8 flex flex-col items-center gap-3 py-10 text-center text-pos-ink-faint">
            <ScanBarcode size={40} strokeWidth={1.25} />
            <p className="text-sm">Ready to scan</p>
          </div>
        ) : item === null ? (
          <p className="mt-8 rounded-2xl bg-pos-surface-muted px-4 py-6 text-center text-sm text-pos-ink-muted">
            No active product matches that code.
          </p>
        ) : (
          <div className="mt-6 space-y-3 rounded-2xl bg-pos-surface-muted p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-pos-ink-faint">
              {item.category}
              {item.brand ? ` · ${item.brand}` : ""}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-pos-ink">{item.name}</h2>
            <p className="font-mono text-sm text-pos-ink-muted">
              {item.barcode} · {item.sku}
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <SetupStat label="Price" value={naira(item.priceMinor)} tone="accent" />
              <SetupStat label="On hand" value={String(item.onHand)} />
            </div>
            <Link href="/setup/items/items" className={`${secondaryButtonClass} mt-2 w-full`}>
              Open product list
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

export function ProductImportManager() {
  const [csv, setCsv] = useState(
    "name,category,subcategory,brand,sku,barcode,batch,cost,price,onHand,reorderLevel,unit,packSize,expiresAt\n",
  );
  const [busy, setBusy] = useState(false);

  function parseCsv(text: string) {
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0]!.split(",").map((cell) => cell.trim().toLowerCase());
    return lines.slice(1).map((line) => {
      const cells = line.split(",").map((cell) => cell.trim());
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = cells[index] ?? "";
      });
      const sell = Number(row.price || row.selling || "0");
      const cost = Number(row.cost || "0");
      return {
        name: row.name,
        category: row.category,
        subcategory: row.subcategory || row.sub || "",
        brand: row.brand || row.manufacturer || "",
        sku: row.sku,
        barcode: row.barcode,
        batchNumber: row.batch || row.batchnumber || "",
        costMinor: Math.round((Number.isFinite(cost) ? cost : 0) * 100),
        priceMinor: Math.round((Number.isFinite(sell) ? sell : 0) * 100),
        onHand: Number(row.onhand || row.stock || row.qty || "0"),
        reorderLevel: Number(row.reorder || row.reorderlevel || "5"),
        unit: row.unit || "each",
        packSize: Number(row.packsize || row.packSize || "1"),
        expiresAt: row.expires || row.expiry || row.expiresat || "",
      };
    });
  }

  return (
    <div>
      <SetupHeader
        kicker={KICKER}
        title="Import Products"
        copy="Paste a CSV of products. Matching SKU or barcode updates the existing item; blank codes are generated."
      />
      <section className="rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <Field label="CSV">
          <textarea
            rows={14}
            className={`${fieldClass} font-mono text-[12px]`}
            value={csv}
            onChange={(event) => setCsv(event.target.value)}
          />
        </Field>
        <PrimaryButton
          className="mt-2"
          disabled={busy}
          onClick={async () => {
            const rows = parseCsv(csv);
            if (!rows.length) {
              toast.error("Add at least one data row under the header.");
              return;
            }
            setBusy(true);
            try {
              const result = await importCatalogRows(rows);
              toast.success(`Imported ${result.created} new, updated ${result.updated}.`);
            } catch (err) {
              toast.error(err, "Import failed.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Import catalog
        </PrimaryButton>
      </section>
    </div>
  );
}

export function ProductExportManager() {
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<HqCatalogItem[]>([]);

  useEffect(() => {
    listCatalog()
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  function downloadCsv() {
    const header = [
      "name",
      "category",
      "subcategory",
      "brand",
      "sku",
      "barcode",
      "batch",
      "cost",
      "price",
      "onHand",
      "reorderLevel",
      "unit",
      "packSize",
      "expiresAt",
      "active",
    ];
    const lines = [
      header.join(","),
      ...items.map((row) =>
        [
          row.name,
          row.category,
          row.subcategory ?? "",
          row.brand ?? "",
          row.sku,
          row.barcode,
          row.batchNumber ?? "",
          (row.costMinor / 100).toFixed(2),
          (row.priceMinor / 100).toFixed(2),
          row.onHand,
          row.reorderLevel,
          row.unit,
          row.packSize,
          row.expiresAt?.slice(0, 10) ?? "",
          row.active !== false ? "1" : "0",
        ]
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `products-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <SetupHeader
        kicker={KICKER}
        title="Export Products"
        copy="Download the catalog as CSV for spreadsheets, or JSON for a full HQ backup of catalog data."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-[24px] bg-pos-surface p-6 shadow-pos-md">
          <h2 className="text-lg font-semibold text-pos-ink">CSV spreadsheet</h2>
          <p className="mt-2 text-sm text-pos-ink-muted">
            {items.length} products ready — columns match the import format.
          </p>
          <PrimaryButton className="mt-5" onClick={downloadCsv}>
            Download CSV
          </PrimaryButton>
        </section>
        <section className="rounded-[24px] bg-pos-surface p-6 shadow-pos-md">
          <h2 className="text-lg font-semibold text-pos-ink">JSON backup</h2>
          <p className="mt-2 text-sm text-pos-ink-muted">
            Full catalog payload for restore or another site.
          </p>
          <PrimaryButton
            className="mt-5"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const data = await exportSetup("catalog");
                const blob = new Blob([JSON.stringify(data, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `catalog-${new Date().toISOString().slice(0, 10)}.json`;
                link.click();
                URL.revokeObjectURL(url);
                toast.success("Catalog JSON downloaded.");
              } catch (err) {
                toast.error(err, "Export failed.");
              } finally {
                setBusy(false);
              }
            }}
          >
            Download JSON
          </PrimaryButton>
        </section>
      </div>
    </div>
  );
}
