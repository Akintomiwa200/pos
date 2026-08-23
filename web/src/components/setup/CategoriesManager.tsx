"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  deleteCategory,
  getTaxonomyUsage,
  listCategories,
  productCount,
  renameTaxonomy,
  saveCategory,
  type TaxonomyRecord,
  type TaxonomyUsage,
} from "@/lib/hq-taxonomy";
import { naira } from "@/lib/hq-ops";
import { listCatalog } from "@/lib/hq-api";
import { ManagerSkeleton } from "../Skeleton";
import { SlideOver } from "../SlideOver";
import { DataTable, Field, PrimaryButton, ToggleField, fieldClass } from "./SetupChrome";

type Draft = { id?: string; name: string; note: string; active: boolean };

const blank: Draft = { name: "", note: "", active: true };

export function CategoriesManager() {
  const [rows, setRows] = useState<TaxonomyRecord[]>([]);
  const [usage, setUsage] = useState<TaxonomyUsage | null>(null);
  const [stockByCategory, setStockByCategory] = useState<Map<string, number>>(new Map());
  const [draft, setDraft] = useState<Draft>(blank);
  const [originalName, setOriginalName] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  async function load() {
    const [categories, taxonomy, catalog] = await Promise.all([
      listCategories(),
      getTaxonomyUsage(),
      listCatalog(),
    ]);
    const stock = new Map<string, number>();
    for (const item of catalog) {
      stock.set(item.category, (stock.get(item.category) ?? 0) + item.onHand * item.priceMinor);
    }
    setRows(categories);
    setUsage(taxonomy);
    setStockByCategory(stock);
    setReady(true);
  }

  useEffect(() => {
    load().catch((err) => {
      toast.error(err, "Could not load categories.");
      setReady(true);
    });
  }, []);

  const sorted = useMemo(
    () =>
      [...rows].sort(
        (a, b) =>
          productCount(usage, "categories", b.name) - productCount(usage, "categories", a.name) ||
          a.name.localeCompare(b.name),
      ),
    [rows, usage],
  );

  if (!ready) return <ManagerSkeleton variant="table" />;

  function openNew() {
    setDraft(blank);
    setOriginalName("");
    setOpen(true);
  }

  function openEdit(row: TaxonomyRecord) {
    setDraft({ id: row.id, name: row.name, note: row.note ?? "", active: row.active });
    setOriginalName(row.name);
    setOpen(true);
  }

  async function save() {
    if (!draft.name.trim()) {
      toast.error("Enter a category name.");
      return;
    }
    setBusy(true);
    try {
      await saveCategory({
        id: draft.id,
        name: draft.name.trim(),
        note: draft.note.trim() || undefined,
        active: draft.active,
      });
      if (draft.id && originalName && originalName !== draft.name.trim()) {
        await renameTaxonomy("category", originalName, draft.name.trim());
      }
      await load();
      setOpen(false);
      toast.success(draft.id ? "Category updated." : "Category created.");
    } catch (err) {
      toast.error(err, "Could not save category.");
    } finally {
      setBusy(false);
    }
  }

  const totalValue = [...stockByCategory.values()].reduce((sum, value) => sum + value, 0);
  const activeCount = rows.filter((row) => row.active).length;

  return (
    <div className="relative space-y-5 text-pos-ink">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[clamp(1.5rem,3.5vw,2.25rem)] font-medium leading-none tracking-tight text-pos-ink-faint">
            Categories
          </h1>
          <p className="mt-3 text-[14px] text-pos-ink-muted">
            Top-level product groups · {activeCount} active · stock value{" "}
            {naira(totalValue, 0)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/setup/items/items"
            className="rounded-full bg-pos-surface px-4 py-2.5 text-sm font-medium text-pos-ink shadow-pos-sm"
          >
            All products
          </Link>
          <PrimaryButton onClick={openNew}>
            <Plus size={16} strokeWidth={2.2} />
            New category
          </PrimaryButton>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[20px] bg-pos-surface p-4 shadow-pos-sm">
          <p className="text-[13px] text-pos-ink-faint">Categories</p>
          <p className="mt-2 text-[24px] font-semibold tabular-nums">{rows.length}</p>
        </div>
        <div className="rounded-[20px] bg-pos-surface p-4 shadow-pos-sm">
          <p className="text-[13px] text-pos-ink-faint">Active</p>
          <p className="mt-2 text-[24px] font-semibold tabular-nums">{activeCount}</p>
        </div>
        <div className="rounded-[20px] bg-pos-surface p-4 shadow-pos-sm">
          <p className="text-[13px] text-pos-ink-faint">Stock value</p>
          <p className="mt-2 truncate text-[22px] font-semibold tabular-nums">
            {naira(totalValue, 0)}
          </p>
        </div>
      </div>

      <DataTable columns={["Category", "Description", "Products", "Stock value", "Status"]}>
        {sorted.length === 0 ? (
          <tr>
            <td className="px-4 py-12 text-center text-pos-ink-faint" colSpan={5}>
              No categories yet.{" "}
              <Link href="/setup/items/items" className="font-medium text-pos-primary">
                Add a product
              </Link>{" "}
              or create one here.
            </td>
          </tr>
        ) : (
          sorted.map((row) => {
            const count = productCount(usage, "categories", row.name);
            const value = stockByCategory.get(row.name) ?? 0;
            return (
              <tr
                key={row.id}
                className="cursor-pointer transition hover:bg-pos-surface-muted/70"
                onClick={() => openEdit(row)}
              >
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-pos-surface-muted text-[13px] font-semibold">
                      {row.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="font-semibold text-pos-ink">{row.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-pos-ink-muted">
                  {row.note || "—"}
                </td>
                <td className="px-4 py-3.5 tabular-nums text-pos-ink">
                  {count}
                </td>
                <td className="px-4 py-3.5 font-medium tabular-nums text-pos-ink">
                  {naira(value, 0)}
                </td>
                <td className="px-4 py-3.5">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                      row.active
                        ? "bg-pos-success/10 text-pos-success"
                        : "bg-pos-surface-muted text-pos-ink-faint"
                    }`}
                  >
                    {row.active ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            );
          })
        )}
      </DataTable>

      <SlideOver
        open={open}
        title={draft.id ? "Edit category" : "New category"}
        subtitle="Renaming updates all products in this category."
        onClose={() => setOpen(false)}
        footer={
          <div className="flex gap-2">
            {draft.id ? (
              <button
                type="button"
                className="rounded-full bg-pos-surface-muted px-4 py-2.5 text-sm text-pos-ink"
                disabled={busy}
                onClick={async () => {
                  const count = productCount(usage, "categories", draft.name);
                  if (count > 0) {
                    toast.error(`Remove or reassign ${count} product(s) before deleting.`);
                    return;
                  }
                  try {
                    await deleteCategory(draft.id!);
                    await load();
                    setOpen(false);
                    toast.success("Category deleted.");
                  } catch (err) {
                    toast.error(err, "Could not delete category.");
                  }
                }}
              >
                Delete
              </button>
            ) : null}
            <PrimaryButton className="flex-1" disabled={busy} onClick={save}>
              Save category
            </PrimaryButton>
          </div>
        }
      >
        <Field label="Name">
          <input
            className={fieldClass}
            value={draft.name}
            disabled={busy}
            placeholder="e.g. Beverages"
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
        </Field>
        <Field label="Description">
          <textarea
            rows={2}
            className={fieldClass}
            value={draft.note}
            disabled={busy}
            placeholder="Optional note for staff"
            onChange={(event) => setDraft({ ...draft, note: event.target.value })}
          />
        </Field>
        <ToggleField
          label="Active"
          checked={draft.active}
          onChange={(active) => setDraft({ ...draft, active })}
        />
      </SlideOver>
    </div>
  );
}
