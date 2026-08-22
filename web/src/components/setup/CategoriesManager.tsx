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
import { DataTable, Field, PrimaryButton, SetupHeader, ToggleField, fieldClass } from "./SetupChrome";

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

  return (
    <div>
      <SetupHeader
        kicker="Setup · Products"
        title="Categories"
        copy="Top-level product groups used on items, reports, and the till grid. Assign categories when adding products."
        action={
          <PrimaryButton onClick={openNew}>
            <span className="inline-flex items-center gap-2">
              <Plus size={16} />
              New category
            </span>
          </PrimaryButton>
        }
      />
      <DataTable columns={["Category", "Products", "Stock value", "Status", ""]}>
        {sorted.length === 0 ? (
          <tr>
            <td colSpan={5} className="px-4 py-8 text-center text-pos-ink-faint">
              No categories yet.{" "}
              <Link href="/setup/items/items" className="text-pos-primary underline">
                Add a product
              </Link>{" "}
              or create a category here.
            </td>
          </tr>
        ) : (
          sorted.map((row) => {
            const count = productCount(usage, "categories", row.name);
            return (
              <tr
                key={row.id}
                className="cursor-pointer border-b border-pos-border/60 hover:bg-pos-surface-muted"
                onClick={() => openEdit(row)}
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-pos-ink">{row.name}</p>
                  {row.note ? <p className="text-xs text-pos-ink-muted">{row.note}</p> : null}
                </td>
                <td className="px-4 py-3">{count}</td>
                <td className="px-4 py-3">{naira(stockByCategory.get(row.name) ?? 0, 0)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      row.active
                        ? "bg-pos-primary/10 text-pos-primary"
                        : "bg-pos-surface-muted text-pos-ink-faint"
                    }`}
                  >
                    {row.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/setup/items/subgroups`}
                    className="text-xs font-medium text-pos-primary hover:underline"
                    onClick={(event) => event.stopPropagation()}
                  >
                    Subcategories
                  </Link>
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
                className="rounded-xl border border-pos-border px-4 py-2.5 text-sm text-pos-ink hover:bg-pos-surface-muted"
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
