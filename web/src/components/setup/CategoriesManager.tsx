"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Boxes, Plus } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  categorySlug,
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
import { useLiveCatalog } from "@/lib/live-catalog";
import { ManagerSkeleton } from "../Skeleton";
import { SlideOver } from "../SlideOver";
import { DataTable, Field, PrimaryButton, ToggleField, fieldClass } from "./SetupChrome";

type Draft = { id?: string; name: string; note: string; active: boolean };

const blank: Draft = { name: "", note: "", active: true };

export function CategoriesManager() {
  const { items: catalog, live } = useLiveCatalog();
  const [rows, setRows] = useState<TaxonomyRecord[]>([]);
  const [usage, setUsage] = useState<TaxonomyUsage | null>(null);
  const [draft, setDraft] = useState<Draft>(blank);
  const [originalName, setOriginalName] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const valuesByCategory = useMemo(() => {
    const values = new Map<string, { cost: number; retail: number }>();
    for (const item of catalog) {
      const row = values.get(item.category) ?? { cost: 0, retail: 0 };
      row.cost += item.onHand * (item.costMinor ?? 0);
      row.retail += item.onHand * item.priceMinor;
      values.set(item.category, row);
    }
    return values;
  }, [catalog]);

  async function load() {
    const [categories, taxonomy] = await Promise.all([
      listCategories(),
      getTaxonomyUsage(),
    ]);
    setRows(categories);
    setUsage(taxonomy);
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

  const totalCost = [...valuesByCategory.values()].reduce((sum, row) => sum + row.cost, 0);
  const totalRetail = [...valuesByCategory.values()].reduce((sum, row) => sum + row.retail, 0);
  const activeCount = rows.filter((row) => row.active).length;

  return (
    <div className="relative space-y-5 text-pos-ink">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[clamp(1.5rem,3.5vw,2.25rem)] font-medium leading-none tracking-tight text-pos-ink-faint">
            Categories
          </h1>
          <p className="mt-3 text-[14px] text-pos-ink-muted">
            Top-level product groups · {activeCount} active · cost value{" "}
            {naira(totalCost, 0)} · {live ? "live" : "offline"}
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[20px] bg-pos-surface p-4 shadow-pos-sm">
          <p className="text-[13px] text-pos-ink-faint">Categories</p>
          <p className="mt-2 text-[24px] font-semibold tabular-nums">{rows.length}</p>
        </div>
        <div className="rounded-[20px] bg-pos-surface p-4 shadow-pos-sm">
          <p className="text-[13px] text-pos-ink-faint">Active</p>
          <p className="mt-2 text-[24px] font-semibold tabular-nums">{activeCount}</p>
        </div>
        <div className="rounded-[20px] bg-pos-surface p-4 shadow-pos-sm">
          <p className="text-[13px] text-pos-ink-faint">Cost value</p>
          <p className="mt-2 truncate text-[22px] font-semibold tabular-nums">
            {naira(totalCost, 0)}
          </p>
        </div>
        <div className="rounded-[20px] bg-pos-surface p-4 shadow-pos-sm">
          <p className="text-[13px] text-pos-ink-faint">Selling value</p>
          <p className="mt-2 truncate text-[22px] font-semibold tabular-nums">
            {naira(totalRetail, 0)}
          </p>
        </div>
      </div>

      <DataTable columns={["Category", "Description", "Products", "Cost value", "Selling value", "Status", ""]}>
        {sorted.length === 0 ? (
          <tr>
            <td className="px-4 py-12 text-center text-pos-ink-faint" colSpan={7}>
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
            const value = valuesByCategory.get(row.name) ?? { cost: 0, retail: 0 };
            const href = `/setup/items/groups/${categorySlug(row.name)}`;
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
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-pos-ink">{row.name}</span>
                      {!row.active ? (
                        <span className="mt-0.5 block text-[11px] text-pos-ink-faint">
                          Inactive — hidden on tills
                        </span>
                      ) : null}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-pos-ink-muted">
                  {row.note || "—"}
                </td>
                <td className="px-4 py-3.5 tabular-nums text-pos-ink">
                  {count}
                </td>
                <td className="px-4 py-3.5 font-medium tabular-nums text-pos-ink">
                  {naira(value.cost, 0)}
                </td>
                <td className="px-4 py-3.5 font-medium tabular-nums text-pos-ink">
                  {naira(value.retail, 0)}
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
                <td className="px-4 py-3.5 text-right">
                  <Link
                    href={href}
                    onClick={(event) => event.stopPropagation()}
                    className="inline-flex items-center gap-1.5 rounded-full bg-pos-surface px-3.5 py-2 text-[13px] font-medium text-pos-ink shadow-pos-sm transition hover:bg-pos-surface-muted"
                  >
                    <Boxes size={14} />
                    View products
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
        size="lg"
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
        <div className="space-y-6">
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
          {draft.id ? (
            <Link
              href={`/setup/items/groups/${categorySlug(draft.name) || categorySlug(originalName)}`}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-pos-surface px-4 py-2.5 text-sm font-medium text-pos-ink shadow-pos-sm transition hover:bg-pos-surface-muted"
            >
              <Boxes size={15} />
              View & manage products
            </Link>
          ) : null}
        </div>
      </SlideOver>
    </div>
  );
}
