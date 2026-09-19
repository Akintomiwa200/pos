"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Download } from "lucide-react";
import { toast } from "@/lib/toast";
import type { HqCatalogItem } from "@/lib/hq-api";
import {
  exportSetup,
  getCompany,
  getOrgSettings,
  getSetupData,
  listBranches,
  listGateways,
  listStores,
  listStorefronts,
  listTaxes,
} from "@/lib/hq-setup";
import { useLiveCatalog } from "@/lib/live-catalog";
import { CSV_FIELDS, csvCell, downloadTextFile } from "@/lib/import-products";
import { LiveBadge, PrimaryButton, SetupHeader, fieldClass, secondaryButtonClass } from "./SetupChrome";
import { ManagerSkeleton } from "../Skeleton";

const today = () => new Date().toISOString().slice(0, 10);

function downloadJson(filename: string, data: unknown) {
  downloadTextFile(filename, JSON.stringify(data, null, 2), "application/json");
}

const CATALOG_CSV_VALUE: Record<string, (row: HqCatalogItem) => string> = {
  name: (row) => row.name,
  category: (row) => row.category,
  subcategory: (row) => row.subcategory ?? "",
  sku: (row) => row.sku,
  barcode: (row) => row.barcode,
  batchNumber: (row) => row.batchNumber ?? "",
  brand: (row) => row.brand ?? "",
  productCode: (row) => row.productCode ?? "",
  cost: (row) => (row.costMinor / 100).toFixed(2),
  price: (row) => (row.priceMinor / 100).toFixed(2),
  onHand: (row) => String(row.onHand),
  reorderLevel: (row) => String(row.reorderLevel),
  unit: (row) => row.unit,
  unitLabel: (row) => row.unitLabel ?? "",
  packSize: (row) => String(row.packSize),
  description: (row) => row.description ?? "",
  active: (row) => (row.active ? "yes" : "no"),
  expiresAt: (row) => row.expiresAt?.slice(0, 10) ?? "",
  taxPercent: (row) =>
    typeof row.taxPercent === "number" ? String(row.taxPercent) : "",
  trackBatches: (row) => (row.trackBatches ? "yes" : "no"),
  baseId: (row) => row.baseId ?? "",
  id: (row) => row.id,
};

export function catalogToCsv(rows: HqCatalogItem[]) {
  const header = CSV_FIELDS.map((field) => field.label).join(",");
  const lines = [
    header,
    ...rows.map((row) =>
      CSV_FIELDS.map((field) => csvCell(CATALOG_CSV_VALUE[field.key]?.(row) ?? "")).join(","),
    ),
  ];
  return `\uFEFF${lines.join("\n")}`;
}

type GroupId =
  | "company"
  | "branches"
  | "stores"
  | "storefronts"
  | "gateways"
  | "taxes"
  | "settings"
  | "catalog"
  | "sales";

const GROUP_DEFS: Array<{
  id: GroupId;
  label: string;
  desc: string;
  countKey?: string;
  fetch: () => Promise<unknown>;
}> = [
  { id: "company", label: "Company", desc: "Name, registration, contact and currency.", fetch: getCompany },
  { id: "branches", label: "Branches", desc: "Every branch of the organisation.", countKey: "branches", fetch: listBranches },
  { id: "stores", label: "Stores", desc: "Stores and warehouses under each branch.", countKey: "stores", fetch: listStores },
  { id: "storefronts", label: "Storefronts", desc: "Online storefronts and syncing rules.", countKey: "storefronts", fetch: listStorefronts },
  { id: "gateways", label: "Payment gateways", desc: "Paystack, Flutterwave, bank and cash setups.", countKey: "gateways", fetch: listGateways },
  { id: "taxes", label: "Taxes", desc: "VAT and other tax rules.", countKey: "taxes", fetch: listTaxes },
  { id: "settings", label: "Settings", desc: "Receipts, pricing, security and appearance settings.", fetch: getOrgSettings },
  { id: "catalog", label: "Catalog", desc: "All products — individually or as a full CSV/JSON.", countKey: "catalog", fetch: () => Promise.resolve([]) },
  { id: "sales", label: "Sales", desc: "Every ticket posted from the tills.", countKey: "sales", fetch: () => exportSetup("sales") },
];

export function ExportManager() {
  const { items, live } = useLiveCatalog();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<GroupId[]>(GROUP_DEFS.map((group) => group.id));
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setCounts(await getSetupData());
      } catch {
        setCounts({});
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) set.add(item.category);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (category && item.category !== category) return false;
      if (!q) return true;
      return [item.name, item.sku, item.barcode, item.subcategory ?? "", item.brand ?? ""].some(
        (value) => value.toLowerCase().includes(q),
      );
    });
  }, [items, search, category]);

  const pickedIds = useMemo(() => new Set(Array.from(picked)), [picked]);
  const pickedItems = useMemo(
    () => items.filter((item) => pickedIds.has(item.id)),
    [items, pickedIds],
  );

  const visibleAll = filtered.length > 0 && filtered.every((item) => picked.has(item.id));
  const toggleVisible = () => {
    const next = new Set(picked);
    if (visibleAll) {
      for (const item of filtered) next.delete(item.id);
    } else {
      for (const item of filtered) next.add(item.id);
    }
    setPicked(next);
  };

  const togglePicked = (id: string) => {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
  };

  const run = async (task: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await task();
    } catch (err) {
      toast.error(err, "Export failed.");
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = (rows: HqCatalogItem[], filename: string) => {
    if (!rows.length) {
      toast.error("Nothing to export.");
      return;
    }
    downloadTextFile(filename, catalogToCsv(rows));
    toast.success(`Exported ${rows.length} product${rows.length === 1 ? "" : "s"}.`);
  };

  const exportCsvAll = () => exportCsv(items, `products-${today()}.csv`);
  const exportCsvPicked = () =>
    exportCsv(pickedItems, `products-selected-${today()}.csv`);
  const exportCsvCategory = () =>
    exportCsv(filtered, `products-${(category || "all").toLowerCase().replace(/\s+/g, "-")}-${today()}.csv`);

  const exportJsonAllCatalog = () =>
    downloadJson(`catalog-${today()}.json`, items);

  const exportJsonPicked = () => {
    if (!pickedItems.length) {
      toast.error("Nothing to export.");
      return;
    }
    downloadJson(`products-selected-${today()}.json`, pickedItems);
    toast.success(`Exported ${pickedItems.length} product${pickedItems.length === 1 ? "" : "s"}.`);
  };

  const groupData = async (ids: GroupId[]): Promise<Record<string, unknown>> => {
    const out: Record<string, unknown> = {};
    await Promise.all(
      GROUP_DEFS.filter((group) => ids.includes(group.id)).map(async (group) => {
        let data: unknown;
        if (group.id === "catalog") data = items;
        else data = await group.fetch();
        out[group.id] = data;
      }),
    );
    return out;
  };

  const exportGroupJson = async (id: GroupId) => {
    await run(async () => {
      const data = await groupData([id]);
      downloadJson(`${id}-${today()}.json`, { app: "PosHQ", exportedAt: new Date().toISOString(), ...data });
      toast.success("Downloaded.");
    });
  };

  const exportBundleJson = async () => {
    if (!selected.length) {
      toast.error("Pick at least one group.");
      return;
    }
    await run(async () => {
      const data = await groupData(selected);
      downloadJson(`pos-backup-${today()}.json`, { app: "PosHQ", exportedAt: new Date().toISOString(), ...data });
      toast.success("Backup downloaded.");
    });
  };

  const exportEverythingJson = async () => {
    await run(async () => {
      const data = await exportSetup("all");
      downloadJson(`pos-everything-${today()}.json`, data);
      toast.success("Everything exported.");
    });
  };

  const toggleGroup = (id: GroupId) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(Array.from(next));
  };

  if (loading) return <ManagerSkeleton />;

  return (
    <div>
      <SetupHeader
        title="Export data"
        copy="Download products as CSV or JSON, pick individual items or whole categories, and back up organisation data — company, branches, stores, tax, settings and sales — as one bundle."
        action={
          <PrimaryButton disabled={busy} onClick={exportEverythingJson}>
            Everything · JSON
          </PrimaryButton>
        }
      />
      <div className="space-y-6">
        <section className="rounded-[24px] bg-pos-surface p-6 shadow-pos-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-pos-ink">Products &amp; catalog</h2>
              <p className="mt-1 text-sm text-pos-ink-muted">
                {items.length} products — columns match the import format so exports reload directly.
              </p>
            </div>
            <LiveBadge live={live} />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <PrimaryButton className="flex-1 min-w-36" onClick={exportCsvAll}>
              All products · CSV
            </PrimaryButton>
            <button type="button" className={`${secondaryButtonClass} flex-1 min-w-36`} onClick={exportJsonAllCatalog}>
              All products · JSON
            </button>
            {category ? (
              <button type="button" className={`${secondaryButtonClass} flex-1 min-w-36`} onClick={exportCsvCategory}>
                {category} · CSV
              </button>
            ) : null}
          </div>

          <div className="mt-6 rounded-2xl border border-pos-border/60 p-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
              <input
                className={fieldClass}
                placeholder="Search name, SKU, barcode, brand…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <select className={fieldClass} value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="">All categories</option>
                {categories.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
              <button type="button" className="inline-flex items-center gap-1.5 font-medium text-pos-primary" onClick={toggleVisible}>
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded border ${
                    visibleAll ? "border-pos-primary bg-pos-primary text-white" : "border-pos-border bg-pos-surface"
                  }`}
                >
                  {visibleAll ? <Check className="h-3 w-3" /> : null}
                </span>
                {visibleAll ? "Clear all visible" : "Select all visible"}
              </button>
              <p className="text-pos-ink-faint">
                {picked.size} selected · {filtered.length} shown
              </p>
            </div>
            <div className="mt-3 max-h-[340px] overflow-y-auto rounded-xl border border-pos-border/50">
              {filtered.length ? (
                filtered.map((item) => {
                  const checked = picked.has(item.id);
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => togglePicked(item.id)}
                      className={`flex w-full items-center gap-3 border-b border-pos-border/40 px-3 py-2.5 text-left transition last:border-0 hover:bg-pos-surface-muted/50 ${
                        checked ? "bg-pos-primary/5" : ""
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          checked ? "border-pos-primary bg-pos-primary text-white" : "border-pos-border bg-pos-surface"
                        }`}
                      >
                        {checked ? <Check className="h-3 w-3" /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-sm font-medium ${checked ? "text-pos-primary" : "text-pos-ink"}`}>
                          {item.name}
                        </span>
                        <span className="block truncate text-[12px] text-pos-ink-faint">
                          {item.category}
                          {item.subcategory ? ` · ${item.subcategory}` : ""} · {item.sku || item.barcode || "no code"}
                        </span>
                      </span>
                      <span className="shrink-0 text-[12px] tabular-nums text-pos-ink-faint">
                        {((item.priceMinor as number) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    </button>
                  );
                })
              ) : (
                <p className="px-4 py-6 text-sm text-pos-ink-faint">No products match.</p>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <PrimaryButton className="flex-1 min-w-40" disabled={!pickedItems.length} onClick={exportCsvPicked}>
                Export {pickedItems.length ? `${pickedItems.length} selected` : "selected"} · CSV
              </PrimaryButton>
              <button
                type="button"
                className={`${secondaryButtonClass} flex-1 min-w-40`}
                disabled={!pickedItems.length}
                onClick={exportJsonPicked}
              >
                Export selected · JSON
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-[24px] bg-pos-surface p-6 shadow-pos-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-pos-ink">Organisation backup · JSON</h2>
              <p className="mt-1 text-sm text-pos-ink-muted">
                Pick the groups to export — one group, a few, or everything — and download a single JSON bundle.
              </p>
            </div>
            <button
              type="button"
              className="text-sm font-medium text-pos-primary"
              onClick={() =>
                setSelected(selected.length === GROUP_DEFS.length ? [] : GROUP_DEFS.map((group) => group.id))
              }
            >
              {selected.length === GROUP_DEFS.length ? "Deselect all" : "Select all"}
            </button>
          </div>

          <div className="mt-5 space-y-2">
            {GROUP_DEFS.map((group) => {
              const checked = selected.includes(group.id);
              const count = group.countKey ? (counts[group.countKey] ?? 0) : 1;
              return (
                <div
                  key={group.id}
                  className={`rounded-2xl border px-4 py-3 transition ${
                    checked ? "border-pos-primary/50 bg-pos-primary/5" : "border-pos-border/60 bg-pos-surface"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => toggleGroup(group.id)}>
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          checked ? "border-pos-primary bg-pos-primary text-white" : "border-pos-border bg-pos-surface"
                        }`}
                      >
                        {checked ? <Check className="h-3 w-3" /> : null}
                      </span>
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-pos-ink">
                          {group.label}
                          <span className="rounded-full bg-pos-surface-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums text-pos-ink-faint">
                            {count}
                          </span>
                        </span>
                        <span className="block truncate text-[12px] text-pos-ink-faint">{group.desc}</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-pos-primary disabled:opacity-50"
                      disabled={busy}
                      onClick={() => exportGroupJson(group.id)}
                    >
                      <Download className="h-3.5 w-3.5" /> JSON
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-pos-ink-faint">
              {selected.length} of {GROUP_DEFS.length} groups selected
            </p>
            <PrimaryButton disabled={!selected.length || busy} onClick={exportBundleJson}>
              Download bundle · JSON
            </PrimaryButton>
          </div>
        </section>
      </div>
    </div>
  );
}