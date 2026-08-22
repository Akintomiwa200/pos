"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  deleteSubcategory,
  getTaxonomyUsage,
  listCategories,
  listSubcategories,
  productCount,
  renameTaxonomy,
  saveSubcategory,
  subcategoryParentId,
  subcategoryParentName,
  type TaxonomyRecord,
  type TaxonomyUsage,
} from "@/lib/hq-taxonomy";
import { ManagerSkeleton } from "../Skeleton";
import { SlideOver } from "../SlideOver";
import { DataTable, Field, PrimaryButton, SetupHeader, ToggleField, fieldClass } from "./SetupChrome";

type Draft = {
  id?: string;
  name: string;
  categoryId: string;
  active: boolean;
};

const blank: Draft = { name: "", categoryId: "", active: true };

export function SubcategoriesManager() {
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

  return (
    <div>
      <SetupHeader
        kicker="Setup · Products"
        title="Subcategories"
        copy="Second-level grouping under a category — e.g. Beverages → Soft drinks. Used in gross-profit reports."
        action={
          <PrimaryButton onClick={openNew}>
            <span className="inline-flex items-center gap-2">
              <Plus size={16} />
              New subcategory
            </span>
          </PrimaryButton>
        }
      />
      <label className="mb-4 block max-w-xs">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-pos-ink-muted">
          Filter by category
        </span>
        <select
          className={fieldClass}
          value={filterCategory}
          onChange={(event) => setFilterCategory(event.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
      </label>
      <DataTable columns={["Subcategory", "Category", "Products", "Status"]}>
        {filtered.length === 0 ? (
          <tr>
            <td colSpan={4} className="px-4 py-8 text-center text-pos-ink-faint">
              No subcategories yet.
            </td>
          </tr>
        ) : (
          filtered.map((row) => (
            <tr
              key={row.id}
              className="cursor-pointer border-b border-pos-border/60 hover:bg-pos-surface-muted"
              onClick={() => openEdit(row)}
            >
              <td className="px-4 py-3 font-medium">{row.name}</td>
              <td className="px-4 py-3 text-pos-ink-muted">
                {subcategoryParentName(row) || "—"}
              </td>
              <td className="px-4 py-3">{productCount(usage, "subcategories", row.name)}</td>
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
            </tr>
          ))
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
                className="rounded-xl border border-pos-border px-4 py-2.5 text-sm text-pos-ink hover:bg-pos-surface-muted"
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
      </SlideOver>
    </div>
  );
}
