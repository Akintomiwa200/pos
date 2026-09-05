"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Search,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  createCombo,
  deleteCombo,
  listCombos,
  updateCombo,
  useLiveCombos,
  type ComboView,
} from "@/lib/combo-api";
import { parseNairaInput, resolveSellPriceMinor } from "@/lib/catalog";
import { naira } from "@/lib/hq-ops";
import { toast } from "@/lib/toast";
import { useLiveCatalog } from "@/lib/live-catalog";
import { ManagerSkeleton } from "../Skeleton";
import { PrimaryButton, SetupStat } from "./SetupChrome";
import { ComboFormSheet, type ComboDraft } from "./ComboFormSheet";

const PAGE_SIZES = [10, 25, 50] as const;

const blank: ComboDraft = {
  name: "",
  description: "",
  components: [],
  price: "",
  pricingMode: "direct",
  marginInput: "",
  active: true,
};

function toDraft(combo: ComboView): ComboDraft {
  return {
    id: combo.id,
    name: combo.name,
    description: combo.description ?? "",
    components: combo.components.map((line) => ({
      itemId: line.itemId,
      quantity: line.quantity,
    })),
    price: (combo.priceMinor / 100).toFixed(2),
    pricingMode: "direct",
    marginInput: "",
    active: combo.active !== false,
  };
}

const outlineBtn =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-pos-border bg-pos-surface px-4 py-2.5 text-sm font-medium text-pos-ink transition hover:bg-pos-surface-muted";

const filterSelect =
  "appearance-none rounded-xl border border-pos-border bg-pos-surface py-2.5 pl-3.5 pr-9 text-sm text-pos-ink outline-none transition focus:border-pos-primary focus:ring-1 focus:ring-pos-primary/25";

export function CombosManager() {
  const {
    combos: rows,
    setCombos: setRows,
    live,
    removeCombo,
  } = useLiveCombos();
  const { items: catalog } = useLiveCatalog();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "short">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(10);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ComboDraft>(blank);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  async function load() {
    const combos = await listCombos();
    setRows(combos);
    setReady(true);
  }

  useEffect(() => {
    load().catch((err) => {
      toast.error(err, "Could not load your combos.");
      setReady(true);
    });
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, pageSize]);

  useEffect(() => {
    function closeMenu() {
      setMenuId(null);
    }
    if (!menuId) return;
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, [menuId]);

  const itemsById = useMemo(
    () => new Map(catalog.map((item) => [item.id, item] as const)),
    [catalog],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter === "active" && row.active === false) return false;
      if (statusFilter === "inactive" && row.active !== false) return false;
      if (statusFilter === "short" && row.availableSets < 1) return false;
      if (!query) return true;
      return [row.name, row.description, ...row.components.map((c) => c.name)]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query));
    });
  }, [rows, search, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageStart = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, filtered.length);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const pageButtons = useMemo(() => {
    const buttons: number[] = [];
    const windowSize = 5;
    let start = Math.max(1, safePage - Math.floor(windowSize / 2));
    const end = Math.min(pageCount, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);
    for (let i = start; i <= end; i += 1) buttons.push(i);
    return buttons;
  }, [safePage, pageCount]);

  const activeCount = rows.filter((row) => row.active !== false).length;
  const buildable = rows.filter(
    (row) => row.active !== false && row.availableSets >= 1,
  ).length;
  const valueAtCost = rows
    .filter((row) => row.active !== false)
    .reduce((sum, row) => sum + row.costMinorEach, 0);

  if (!ready) return <ManagerSkeleton variant="table" />;

  function openNew() {
    setDraft(blank);
    setOpen(true);
  }

  function openEdit(combo: ComboView) {
    setDraft(toDraft(combo));
    setOpen(true);
    setMenuId(null);
  }

  async function confirmDelete(combo: ComboView) {
    if (!window.confirm(`Delete combo "${combo.name}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await deleteCombo(combo.id);
      removeCombo(combo.id);
      toast.success("Combo deleted.");
    } catch (err) {
      toast.error(err, "Could not delete this combo.");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!draft.name.trim()) {
      toast.error("Enter a combo name.");
      return;
    }
    const components = draft.components
      .filter((line) => line.itemId.trim() && line.quantity > 0)
      .map((line) => ({ itemId: line.itemId.trim(), quantity: Math.max(1, line.quantity) }));
    if (components.length === 0) {
      toast.error("Add at least one component.");
      return;
    }
    const costMinor = components.reduce((sum, line) => {
      const item = itemsById.get(line.itemId);
      return sum + (item?.costMinor ?? 0) * line.quantity;
    }, 0);
    const priceMinor = resolveSellPriceMinor({
      pricingMode: draft.pricingMode,
      costMinor,
      priceMinor: parseNairaInput(draft.price),
      marginInput: draft.marginInput,
    });
    if (priceMinor <= 0) {
      toast.error("Enter a positive selling price.");
      return;
    }

    setBusy(true);
    try {
      const payload = {
        name: draft.name.trim(),
        description: draft.description.trim() || undefined,
        components,
        priceMinor,
        active: draft.active,
      };
      if (draft.id) await updateCombo(draft.id, payload);
      else await createCombo(payload);
      setOpen(false);
      toast.success(draft.id ? "Combo updated." : "Combo created.");
    } catch (err) {
      toast.error(err, draft.id ? "Could not save this combo." : "Could not create this combo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative space-y-5 text-pos-ink">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold tracking-tight text-pos-ink sm:text-[24px]">
            Combos
          </h1>
          <p className="mt-1 text-[13px] text-pos-ink-muted">
            {rows.length} combos · {activeCount} active on tills
          </p>
        </div>
        <PrimaryButton onClick={openNew} className="!rounded-xl shadow-pos-primary">
          <Plus size={16} strokeWidth={2.2} />
          New Combo
        </PrimaryButton>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SetupStat label="Combos" value={String(rows.length)} hint="Total bundles" />
        <SetupStat label="Active" value={String(activeCount)} hint="Sold as one unit" />
        <SetupStat
          label="Buildable"
          value={String(buildable)}
          hint="Have stock for every component"
        />
        <SetupStat
          label="Unit cost"
          value={naira(valueAtCost)}
          hint="Sum of one of each active combo"
        />
      </div>

      <section className="overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
        <div className="flex flex-wrap items-center gap-3 border-b border-pos-border/60 px-4 py-3.5 sm:px-5">
          <label className="relative min-w-[12rem] flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-pos-ink-faint"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search combos or components…"
              className="w-full rounded-xl border border-pos-border bg-pos-surface py-2.5 pl-10 pr-4 text-sm text-pos-ink outline-none placeholder:text-pos-ink-faint focus:border-pos-primary focus:ring-1 focus:ring-pos-primary/25"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2.5">
            <label className="relative">
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as typeof statusFilter)
                }
                className={filterSelect}
                aria-label="Filter by status"
              >
                <option value="all">Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="short">Can't build</option>
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-pos-ink-faint"
              />
            </label>

            <span
              className={`inline-flex items-center gap-1.5 rounded-xl border border-pos-border px-3 py-2.5 text-[12px] font-medium ${
                live
                  ? "bg-pos-success/10 text-pos-success"
                  : "bg-pos-surface-muted text-pos-ink-faint"
              }`}
              title={live ? "Combos are live" : "Live sync offline"}
            >
              {live ? <Wifi size={13} /> : <WifiOff size={13} />}
              {live ? "Live" : "Offline"}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-pos-border/60 text-[12px] font-medium text-pos-ink-muted">
                <th className="px-3 py-3.5 font-medium sm:pl-5">Combo</th>
                <th className="px-3 py-3.5 font-medium">Components</th>
                <th className="px-3 py-3.5 font-medium">Unit cost</th>
                <th className="px-3 py-3.5 font-medium">Selling price</th>
                <th className="px-3 py-3.5 font-medium">Margin</th>
                <th className="px-3 py-3.5 font-medium">Can build</th>
                <th className="px-3 py-3.5 font-medium">Status</th>
                <th className="w-16 px-3 py-3.5 text-right font-medium sm:pr-5">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pos-border/45">
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-pos-ink-faint">
                    {rows.length === 0
                      ? "No combos yet. Combine stock items into a bundle."
                      : "No combos match your filters."}
                  </td>
                </tr>
              ) : (
                pageRows.map((combo) => {
                  const buildableNow = combo.availableSets >= 1;
                  const status =
                    combo.active === false
                      ? {
                          label: "Inactive",
                          className: "bg-red-500/10 text-red-600 dark:text-red-400",
                        }
                      : buildableNow
                        ? {
                            label: "Active",
                            className: "bg-pos-success/10 text-pos-success",
                          }
                        : {
                            label: "Can't build",
                            className: "bg-pos-warning/15 text-pos-warning",
                          };
                  return (
                    <tr key={combo.id} className="group transition hover:bg-pos-surface-muted/50">
                      <td className="px-3 py-3.5 sm:pl-5">
                        <span className="block font-medium text-pos-ink">{combo.name}</span>
                        {combo.description ? (
                          <span className="mt-0.5 block max-w-[220px] truncate text-[12px] text-pos-ink-faint">
                            {combo.description}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex max-w-[260px] flex-wrap gap-1">
                          {combo.components.map((line) => (
                            <span
                              key={line.itemId}
                              className="rounded-lg bg-pos-surface-muted px-2 py-0.5 text-[12px] text-pos-ink-muted"
                            >
                              {line.quantity} × {line.name}
                            </span>
                          ))}
                          {combo.components.length === 0 ? (
                            <span className="text-[12px] text-pos-ink-faint">No components</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-3.5 font-medium tabular-nums text-pos-ink-muted">
                        {naira(combo.costMinorEach)}
                      </td>
                      <td className="px-3 py-3.5 font-medium tabular-nums text-pos-ink">
                        {naira(combo.priceMinor)}
                      </td>
                      <td className="px-3 py-3.5 font-medium tabular-nums text-pos-ink">
                        {combo.margin}%
                      </td>
                      <td
                        className={`px-3 py-3.5 font-medium tabular-nums ${
                          buildableNow
                            ? combo.availableSets >= 10
                              ? "text-pos-success"
                              : "text-pos-warning"
                            : "text-pos-danger"
                        }`}
                      >
                        {combo.availableSets > 999
                          ? "∞"
                          : combo.availableSets > 9999
                            ? `${combo.availableSets.toLocaleString()}+`
                            : combo.availableSets}
                      </td>
                      <td className="px-3 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[12px] font-semibold ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="relative px-3 py-3.5 text-right sm:pr-5">
                        <button
                          type="button"
                          className="inline-grid h-8 w-8 place-items-center rounded-lg text-pos-ink-muted transition hover:bg-pos-surface-muted hover:text-pos-ink"
                          aria-label={`Actions for ${combo.name}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setMenuId((current) => (current === combo.id ? null : combo.id));
                          }}
                        >
                          <MoreHorizontal size={18} />
                        </button>
                        {menuId === combo.id ? (
                          <div className="absolute right-4 top-11 z-20 min-w-[150px] overflow-hidden rounded-xl border border-pos-border bg-pos-surface py-1 shadow-pos-md">
                            <button
                              type="button"
                              className="block w-full px-3.5 py-2 text-left text-sm text-pos-ink hover:bg-pos-surface-muted"
                              onClick={() => openEdit(combo)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="block w-full px-3.5 py-2 text-left text-sm text-pos-danger hover:bg-pos-surface-muted"
                              onClick={() => confirmDelete(combo)}
                            >
                              Delete
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-pos-border/60 px-4 py-3.5 sm:px-5">
          <p className="text-[13px] text-pos-ink-muted">
            Result {pageStart}-{pageEnd} of {filtered.length}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <label className="relative inline-flex items-center gap-2 text-[13px] text-pos-ink-muted">
              <span className="sr-only">Rows per page</span>
              <select
                value={pageSize}
                onChange={(event) =>
                  setPageSize(Number(event.target.value) as (typeof PAGE_SIZES)[number])
                }
                className="appearance-none rounded-lg border border-pos-border bg-pos-surface py-1.5 pl-2.5 pr-7 text-[13px] text-pos-ink outline-none focus:border-pos-primary"
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={12}
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-pos-ink-faint"
              />
            </label>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-pos-ink-muted transition hover:bg-pos-surface-muted disabled:opacity-40"
              >
                <ChevronLeft size={15} />
                Previous
              </button>
              {pageButtons.map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setPage(num)}
                  className={`grid h-8 min-w-8 place-items-center rounded-lg px-2 text-[13px] font-medium transition ${
                    num === safePage
                      ? "border border-pos-primary text-pos-primary"
                      : "text-pos-ink-muted hover:bg-pos-surface-muted"
                  }`}
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                disabled={safePage >= pageCount}
                onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-pos-ink-muted transition hover:bg-pos-surface-muted disabled:opacity-40"
              >
                Next
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <ComboFormSheet
        open={open}
        draft={draft}
        busy={busy}
        catalog={catalog}
        onClose={() => setOpen(false)}
        onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
        onSubmit={save}
      />
    </div>
  );
}