"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Boxes, Plus } from "lucide-react";
import { toast } from "@/lib/toast";
import { categorySlug, deleteSubcategory, getTaxonomyUsage, listCategories, listSubcategories, productCount, renameTaxonomy, saveSubcategory, subcategoryParentId, subcategoryParentName, type TaxonomyRecord, type TaxonomyUsage } from "@/lib/hq-taxonomy";
import { naira } from "@/lib/hq-ops";
import { useLiveCatalog } from "@/lib/live-catalog";
import { ManagerSkeleton } from "../Skeleton";
import { SlideOver } from "../SlideOver";
import { DataTable, Field, PrimaryButton, ToggleField, fieldClass } from "./SetupChrome";

type Draft = {
  id?: string;
  name: string;
  categoryId: string;
  active: boolean;
};

const blank: Draft = { name: "", categoryId: "", active: true };

export function SubcategoriesManager() {
  const { items: catalog, live } = useLiveCatalog();
  const [categories, setCategories] = useState<TaxonomyRecord[]>([]);
  const [rows, setRows] = useState<TaxonomyRecord[]>([]);
  const [usage, setUsage] = useState<TaxonomyUsage | null>(null);
  const [filterCategory, setFilterCategory] = useState("");
  const [draft, setDraft] = useState<Draft>(blank);
  const [originalName, setOriginalName] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  async function load() {
    const [cats, subs, taxonomy] = await Promise.all([
      listCategories(),
      listSubcategories(),
      getTaxonomyUsage(),
    ]);
    setCategories(cats.filter((row) => row.active));
    setRows(subs);
    setUsage(taxonomy);
    setReady(true);
  }

  useEffect(() => {
    load().catch((err) => {
      toast.error(err, "Could not load subcategories.");
      setReady(true);
    });
  }, []);

  const filtered = useMemo(() => {
    let list = [...rows];
    if (filterCategory) {
      list = list.filter((row) => subcategoryParentId(row) === filterCategory);
    }
    return list.sort(
      (a, b) =>
        subcategoryParentName(a).localeCompare(subcategoryParentName(b)) ||
        a.name.localeCompare(b.name),
    );
  }, [rows, filterCategory]);

  const valuesBySubcategory = useMemo(() => {
    const values = new Map<string, { cost: number; retail: number }>();
    for (const item of catalog) {
      if (item.subcategory) {
        const row = values.get(item.subcategory) ?? { cost: 0, retail: 0 };
        row.cost += item.onHand * (item.costMinor ?? 0);
        row.retail += item.onHand * item.priceMinor;
        values.set(item.subcategory, row);
      }
    }
    return values;
  }, [catalog]);

  if (!ready) return <ManagerSkeleton variant="table" />;

  function openNew() {
    setDraft({ ...blank, categoryId: filterCategory || categories[0]?.id || "" });
    setOriginalName("");
    setOpen(true);
  }

  function openEdit(row: TaxonomyRecord) {
    setDraft({
      id: row.id,
      name: row.name,
      categoryId: subcategoryParentId(row) || categories[0]?.id || "",
      active: row.active,
    });
    setOriginalName(row.name);
    setOpen(true);
  }

  async function save() {
    if (!draft.name.trim()) {
      toast.error("Enter a subcategory name.");
      return;
    }
    if (!draft.categoryId) {
      toast.error("Choose a parent category.");
      return;
    }
    const parent = categories.find((row) => row.id === draft.categoryId);
    setBusy(true);
    try {
      await saveSubcategory({
        id: draft.id,
        name: draft.name.trim(),
        active: draft.active,
        extra: { categoryId: draft.categoryId, categoryName: parent?.name ?? "" },
      });
      if (draft.id && originalName && originalName !== draft.name.trim()) {
        await renameTaxonomy("subcategory", originalName, draft.name.trim());
      }
      await load();
      setOpen(false);
      toast.success(draft.id ? "Subcategory updated." : "Subcategory created.");
    } catch (err) {
      toast.error(err, "Could not save subcategory.");
    } finally {
      setBusy(false);
    }
  }

  const activeCount = rows.filter((row) => row.active).length;

  const totalCost = [...valuesBySubcategory.values()].reduce((sum, row) => sum + row.cost, 0);
  const totalRetail = [...valuesBySubcategory.values()].reduce((sum, row) => sum + row.retail, 0);

  return (
    <div className="relative space-y-5 text-pos-ink">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[clamp(1.5rem,3.5vw,2.25rem)] font-medium leading-none tracking-tight text-pos-ink-faint">
            Subcategories
          </h1>
          <p className="mt-3 text-[14px] text-pos-ink-muted">
            Second-level grouping under a category · {activeCount} active · cost value{" "}
            {naira(totalCost, 0)} · {live ? "live" : "offline"}
          </p>
        </div>
        <PrimaryButton onClick={openNew}>
          <Plus size={16} strokeWidth={2.2} />
          New subcategory
        </PrimaryButton>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[20px] bg-pos-surface p-4 shadow-pos-sm">
          <p className="text-[13px] text-pos-ink-faint">Subcategories</p>
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

      <DataTable
        columns={["Subcategory", "Parent category", "Products", "Cost value", "Selling value", "Status", ""]}
        toolbar={
          <select
            className="w-full max-w-sm rounded-full bg-pos-surface-muted px-4 py-2.5 text-sm text-pos-ink outline-none focus:bg-pos-surface focus:ring-1 focus:ring-pos-primary/25"
            value={filterCategory}
            onChange={(event) => setFilterCategory(event.target.value)}
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {categories.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        }
      >
        {filtered.length === 0 ? (
          <tr>
            <td className="px-4 py-12 text-center text-pos-ink-faint" colSpan={7}>
              No subcategories yet.
            </td>
          </tr>
        ) : (
          filtered.map((row) => {
            const href = `/setup/items/subgroups/${categorySlug(row.name)}`;
            return (
            <tr
              key={row.id}
              className="cursor-pointer transition hover:bg-pos-surface-muted/70"
              onClick={() => openEdit(row)}
            >
              <td className="px-4 py-3.5 font-semibold text-pos-ink">{row.name}</td>
              <td className="px-4 py-3.5 text-pos-ink-muted">
                {subcategoryParentName(row) || "Unassigned"}
              </td>
              <td className="px-4 py-3.5 tabular-nums text-pos-ink">
                {productCount(usage, "subcategories", row.name)}
              </td>
              <td className="px-4 py-3.5 font-medium tabular-nums text-pos-ink">
                {naira(valuesBySubcategory.get(row.name)?.cost ?? 0, 0)}
              </td>
              <td className="px-4 py-3.5 font-medium tabular-nums text-pos-ink">
                {naira(valuesBySubcategory.get(row.name)?.retail ?? 0, 0)}
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
        title={draft.id ? "Edit subcategory" : "New subcategory"}
        onClose={() => setOpen(false)}
        footer={
          <div className="flex gap-2">
            {draft.id ? (
              <button
                type="button"
                className="rounded-full bg-pos-surface-muted px-4 py-2.5 text-sm text-pos-ink"
                disabled={busy}
                onClick={async () => {
                  const count = productCount(usage, "subcategories", draft.name);
                  if (count > 0) {
                    toast.error(`Remove or reassign ${count} product(s) before deleting.`);
                    return;
                  }
                  try {
                    await deleteSubcategory(draft.id!);
                    await load();
                    setOpen(false);
                    toast.success("Subcategory deleted.");
                  } catch (err) {
                    toast.error(err, "Could not delete subcategory.");
                  }
                }}
              >
                Delete
              </button>
            ) : null}
            <PrimaryButton className="flex-1" disabled={busy} onClick={save}>
              Save subcategory
            </PrimaryButton>
          </div>
        }
      >
        <Field label="Parent category">
          <select
            className={fieldClass}
            value={draft.categoryId}
            disabled={busy}
            onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}
          >
            <option value="">Select category…</option>
            {categories.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Name">
          <input
            className={fieldClass}
            value={draft.name}
            disabled={busy}
            placeholder="e.g. Soft drinks"
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
        </Field>
        <ToggleField
          label="Active"
          checked={draft.active}
          onChange={(active) => setDraft({ ...draft, active })}
        />
        {draft.id ? (
          <Link
            href={`/setup/items/subgroups/${categorySlug(draft.name) || categorySlug(originalName)}`}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-pos-surface px-4 py-2.5 text-sm font-medium text-pos-ink shadow-pos-sm transition hover:bg-pos-surface-muted"
          >
            <Boxes size={15} />
            View & manage products
          </Link>
        ) : null}
      </SlideOver>
    </div>
  );
}
