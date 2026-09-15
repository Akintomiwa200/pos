"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FlaskConical, Plus, ReceiptText, Trash2, TriangleAlert } from "lucide-react";
import { naira } from "@/lib/hq-ops";
import {
  deleteProductionBatch,
  deleteProductionDeviation,
  deleteProductionRecipe,
  deleteProductionWaste,
  getProductionBook,
  saveProductionBatch,
  saveProductionDeviation,
  saveProductionRecipe,
  saveProductionWaste,
  type ProductionBatch,
  type ProductionBook,
  type ProductionDeviation,
  type ProductionRecipe,
  type ProductionWaste,
} from "@/lib/hq-production";
import { ManagerSkeleton } from "../Skeleton";
import { Card, EmptyRow, PageHeader, StatCard, TableShell } from "../console/Chrome";

type Tab = "batches" | "recipes" | "deviations" | "waste";

const inputCls =
  "w-full rounded-xl border border-pos-border bg-pos-surface px-3 py-2 text-sm text-pos-ink outline-none focus:border-pos-primary";
const labelCls = "text-xs font-medium uppercase tracking-wide text-pos-ink-muted";

function SectionForm({
  title,
  children,
  onSave,
  saving,
}: {
  title: string;
  children: React.ReactNode[];
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="rounded-2xl border border-pos-border p-4">
      <p className="mb-3 text-sm font-semibold text-pos-ink">{title}</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
      <button
        onClick={onSave}
        disabled={saving}
        className="mt-3 flex items-center gap-2 rounded-xl bg-pos-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        <Plus size={14} /> {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

export function ProductionDashboard() {
  const [book, setBook] = useState<ProductionBook | null>(null);
  const [tab, setTab] = useState<Tab>("batches");
  const [saving, setSaving] = useState(false);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });

  const [batch, setBatch] = useState({ productName: "", producedUnits: "0", plannedUnits: "1", staff: "", line: "", notes: "" });
  const [recipe, setRecipe] = useState({ productName: "", yieldUnits: "1", salePriceMinor: "0", ingredients: "" });
  const [deviation, setDeviation] = useState({ batchId: "", stage: "", expectedUnits: "0", actualUnits: "0", reason: "", severity: "medium" as ProductionDeviation["severity"] });
  const [waste, setWaste] = useState({ batchId: "", itemName: "", quantity: "0", unitCostMinor: "0", reason: "" });

  useEffect(() => {
    getProductionBook()
      .then(setBook)
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Could not load production");
        setBook({ batches: [], recipes: [], deviations: [], waste: [] });
      });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setDimensions({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  function refresh(next: Partial<ProductionBook>) {
    const rows = { ...next, w: undefined, h: undefined };
    void rows;
    setBook((prev) =>
      prev
        ? {
            batches: next.batches ?? prev.batches,
            recipes: next.recipes ?? prev.recipes,
            deviations: next.deviations ?? prev.deviations,
            waste: next.waste ?? prev.waste,
          }
        : prev,
    );
  }

  async function handleSaveBatch() {
    setSaving(true);
    try {
      const saved = await saveProductionBatch({
        productName: batch.productName,
        plannedUnits: Number(batch.plannedUnits) || 1,
        producedUnits: Number(batch.producedUnits) || 0,
        staff: batch.staff,
        line: batch.line,
        notes: batch.notes,
      });
      refresh({
        batches: [saved, ...(book?.batches ?? [])],
        recipes: book?.recipes,
        deviations: book?.deviations,
        waste: book?.waste,
      });
      setBatch({ productName: "", producedUnits: "0", plannedUnits: "1", staff: "", line: "", notes: "" });
      toast.success("Batch saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveRecipe() {
    setSaving(true);
    try {
      const saved = await saveProductionRecipe({
        productName: recipe.productName,
        yieldUnits: Number(recipe.yieldUnits) || 1,
        salePriceMinor: Number(recipe.salePriceMinor) || 0,
        ingredients: recipe.ingredients
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const match = line.match(/^(.+?)\s*[xX]\s*([\d.]+)/) ?? line.match(/^([\d.]+)\s*\*?\s*(.+)$/);
            return match
              ? { name: (match[1] ?? match[2]).trim(), requiredUnits: Number(match[2] ?? match[1]) || 1 }
              : { name: line, requiredUnits: 1 };
          }),
      });
      refresh({
        batches: book?.batches,
        recipes: [saved, ...(book?.recipes ?? [])],
        deviations: book?.deviations,
        waste: book?.waste,
      });
      setRecipe({ productName: "", yieldUnits: "1", salePriceMinor: "0", ingredients: "" });
      toast.success("Recipe saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDeviation() {
    setSaving(true);
    try {
      const saved = await saveProductionDeviation({
        batchId: deviation.batchId,
        stage: deviation.stage,
        expectedUnits: Number(deviation.expectedUnits) || 0,
        actualUnits: Number(deviation.actualUnits) || 0,
        reason: deviation.reason,
        severity: deviation.severity,
      });
      refresh({
        batches: book?.batches,
        recipes: book?.recipes,
        deviations: [saved, ...(book?.deviations ?? [])],
        waste: book?.waste,
      });
      setDeviation({ batchId: "", stage: "", expectedUnits: "0", actualUnits: "0", reason: "", severity: "medium" });
      toast.success("Deviation recorded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveWaste() {
    setSaving(true);
    try {
      const saved = await saveProductionWaste({
        batchId: waste.batchId,
        itemName: waste.itemName,
        quantity: Number(waste.quantity) || 0,
        unitCostMinor: Number(waste.unitCostMinor) || 0,
        reason: waste.reason,
      });
      refresh({
        batches: book?.batches,
        recipes: book?.recipes,
        deviations: book?.deviations,
        waste: [saved, ...(book?.waste ?? [])],
      });
      setWaste({ batchId: "", itemName: "", quantity: "0", unitCostMinor: "0", reason: "" });
      toast.success("Waste recorded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(kind: Tab, id: string) {
    try {
      if (kind === "batches") await deleteProductionBatch(id);
      if (kind === "recipes") await deleteProductionRecipe(id);
      if (kind === "deviations") await deleteProductionDeviation(id);
      if (kind === "waste") await deleteProductionWaste(id);
      setBook((prev) =>
        prev
          ? {
              batches: kind === "batches" ? prev.batches.filter((row) => row.id !== id) : prev.batches,
              recipes: kind === "recipes" ? prev.recipes.filter((row) => row.id !== id) : prev.recipes,
              deviations: kind === "deviations" ? prev.deviations.filter((row) => row.id !== id) : prev.deviations,
              waste: kind === "waste" ? prev.waste.filter((row) => row.id !== id) : prev.waste,
            }
          : prev,
      );
      toast.success("Removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Remove failed");
    }
  }

  const stats = useMemo(() => {
    if (!book) return null;
    const completed = book.batches.filter((row) => row.status === "completed");
    return {
      batches: book.batches.length,
      completed,
      units: book.batches.reduce((sum, row) => sum + row.producedUnits, 0),
      wasteMinor: book.waste.reduce((sum, row) => sum + row.quantity * row.unitCostMinor, 0),
      deviations: book.deviations.length,
    };
  }, [book]);

  if (!book || !stats) return <ManagerSkeleton variant="table" />;

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: "batches", label: `Batches (${book.batches.length})` },
    { key: "recipes", label: `Recipes (${book.recipes.length})` },
    { key: "deviations", label: `Deviations (${book.deviations.length})` },
    { key: "waste", label: `Waste (${book.waste.length})` },
  ];

  void dimensions;

  return (
    <div>
      <PageHeader
        kicker="Production"
        title="Production desk"
        copy="Record what you make — batches, recipes, deviations and waste — and every entry immediately feeds the production report suite."
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Batches" value={String(stats.batches)} hint={`${stats.completed.length} completed`} />
        <StatCard label="Units produced" value={stats.units.toLocaleString()} hint="across all batches" />
        <StatCard label="Waste value" value={naira(stats.wasteMinor)} hint={stats.wasteMinor ? "at recorded unit cost" : "none recorded"} />
        <StatCard label="Deviations" value={String(stats.deviations)} hint={stats.deviations ? "documented for review" : "none recorded"} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              tab === item.key ? "bg-pos-primary text-white" : "border border-pos-border bg-pos-surface text-pos-ink-muted hover:text-pos-ink"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "batches" && (
        <Card title="Batch register" subtitle="Production orders — planned, in progress, completed or cancelled.">
          <SectionForm title="New batch" onSave={handleSaveBatch} saving={saving}>
            <label>
              <span className={labelCls}>Product</span>
              <input className={inputCls} value={batch.productName} onChange={(e) => setBatch({ ...batch, productName: e.target.value })} placeholder="e.g. Chin-chin 1kg" />
            </label>
            <label>
              <span className={labelCls}>Planned units</span>
              <input className={inputCls} type="number" min="1" value={batch.plannedUnits} onChange={(e) => setBatch({ ...batch, plannedUnits: e.target.value })} />
            </label>
            <label>
              <span className={labelCls}>Produced units</span>
              <input className={inputCls} type="number" min="0" value={batch.producedUnits} onChange={(e) => setBatch({ ...batch, producedUnits: e.target.value })} />
            </label>
            <label>
              <span className={labelCls}>Line / station</span>
              <input className={inputCls} value={batch.line} onChange={(e) => setBatch({ ...batch, line: e.target.value })} placeholder="e.g. Bakery line B" />
            </label>
            <label>
              <span className={labelCls}>Staff</span>
              <input className={inputCls} value={batch.staff} onChange={(e) => setBatch({ ...batch, staff: e.target.value })} placeholder="Lead operator" />
            </label>
            <label className="sm:col-span-2 xl:col-span-3">
              <span className={labelCls}>Notes</span>
              <input className={inputCls} value={batch.notes} onChange={(e) => setBatch({ ...batch, notes: e.target.value })} placeholder="Anything worth remembering" />
            </label>
          </SectionForm>
          <TableShell columns={["#", "Product", "Planned", "Produced", "Line", "Staff", "Status", ""]} minWidth={820}>
            {book.batches.length === 0 ? (
              <EmptyRow colSpan={8} message="No batches yet — start one above." />
            ) : (
              book.batches.map((row) => (
                <tr key={row.id} className="border-b border-pos-border/60">
                  <td className="px-4 py-3 font-mono text-xs text-pos-ink-muted">{row.number}</td>
                  <td className="px-4 py-3 font-medium">{row.productName}</td>
                  <td className="px-4 py-3">{row.plannedUnits}</td>
                  <td className="px-4 py-3 font-semibold">{row.producedUnits}</td>
                  <td className="px-4 py-3 text-pos-ink-muted">{row.line ?? "—"}</td>
                  <td className="px-4 py-3 text-pos-ink-muted">{row.staff ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${row.status === "completed" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : row.status === "cancelled" ? "bg-red-500/15 text-red-500" : row.status === "in-progress" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-pos-surface-muted text-pos-ink-muted"}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove("batches", row.id)} className="text-pos-ink-faint hover:text-pos-danger" aria-label="Delete batch">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </TableShell>
        </Card>
      )}

      {tab === "recipes" && (
        <Card title="Recipes / Bill of materials" subtitle="List each product's ingredients — one ingredient per line as `Name x 2` or `2 Name`.">
          <SectionForm title="New recipe" onSave={handleSaveRecipe} saving={saving}>
            <label>
              <span className={labelCls}>Product</span>
              <input className={inputCls} value={recipe.productName} onChange={(e) => setRecipe({ ...recipe, productName: e.target.value })} placeholder="e.g. Chin-chin 1kg" />
            </label>
            <label>
              <span className={labelCls}>Yield units</span>
              <input className={inputCls} type="number" min="1" value={recipe.yieldUnits} onChange={(e) => setRecipe({ ...recipe, yieldUnits: e.target.value })} />
            </label>
            <label>
              <span className={labelCls}>Selling price (₦)</span>
              <input className={inputCls} type="number" min="0" value={recipe.salePriceMinor} onChange={(e) => setRecipe({ ...recipe, salePriceMinor: e.target.value })} />
            </label>
            <label className="sm:col-span-2 xl:col-span-4">
              <span className={labelCls}>Ingredients (one per line)</span>
              <textarea className={inputCls} rows={4} value={recipe.ingredients} onChange={(e) => setRecipe({ ...recipe, ingredients: e.target.value })} placeholder={"Flour x 4\nSugar x 1\nGroundnut oil x 1.5"} />
            </label>
          </SectionForm>
          <TableShell columns={["Product", "Yield", "Sale price", "Ingredients", ""]} minWidth={760}>
            {book.recipes.length === 0 ? (
              <EmptyRow colSpan={5} message="No recipes yet — ingredients will price your batches automatically." />
            ) : (
              book.recipes.map((row) => (
                <tr key={row.id} className="border-b border-pos-border/60 align-top">
                  <td className="px-4 py-3">
                    <FlaskConical size={14} className="mr-1 inline text-pos-ink-faint" />
                    <span className="font-medium">{row.productName}</span>
                  </td>
                  <td className="px-4 py-3">{row.yieldUnits}</td>
                  <td className="px-4 py-3">{naira(row.salePriceMinor)}</td>
                  <td className="px-4 py-3 text-xs text-pos-ink-muted">{row.ingredients.map((ing) => `${ing.name} ×${ing.requiredUnits}`).join(", ")}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove("recipes", row.id)} className="text-pos-ink-faint hover:text-pos-danger" aria-label="Delete recipe">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </TableShell>
        </Card>
      )}

      {tab === "deviations" && (
        <Card title="Deviation log" subtitle="Anything that went off standard — yield shortfalls, scrap, rejected runs.">
          <SectionForm title="Record deviation" onSave={handleSaveDeviation} saving={saving}>
            <label>
              <span className={labelCls}>Batch</span>
              <select className={inputCls} value={deviation.batchId} onChange={(e) => setDeviation({ ...deviation, batchId: e.target.value })}>
                <option value="">Standalone / none</option>
                {book.batches.map((row) => (
                  <option key={row.id} value={row.id}>{row.number} · {row.productName}</option>
                ))}
              </select>
            </label>
            <label>
              <span className={labelCls}>Stage</span>
              <input className={inputCls} value={deviation.stage} onChange={(e) => setDeviation({ ...deviation, stage: e.target.value })} placeholder="e.g. Cooling" />
            </label>
            <label>
              <span className={labelCls}>Expected</span>
              <input className={inputCls} type="number" value={deviation.expectedUnits} onChange={(e) => setDeviation({ ...deviation, expectedUnits: e.target.value })} />
            </label>
            <label>
              <span className={labelCls}>Actual</span>
              <input className={inputCls} type="number" value={deviation.actualUnits} onChange={(e) => setDeviation({ ...deviation, actualUnits: e.target.value })} />
            </label>
            <label>
              <span className={labelCls}>Reason</span>
              <input className={inputCls} value={deviation.reason} onChange={(e) => setDeviation({ ...deviation, reason: e.target.value })} placeholder="e.g. Under-proofed, oven temp drop" />
            </label>
            <label>
              <span className={labelCls}>Severity</span>
              <select className={inputCls} value={deviation.severity} onChange={(e) => setDeviation({ ...deviation, severity: e.target.value as ProductionDeviation["severity"] })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
          </SectionForm>
          <TableShell columns={["When", "Batch", "Stage", "Expected", "Actual", "Reason", "Severity", ""]} minWidth={820}>
            {book.deviations.length === 0 ? (
              <EmptyRow colSpan={8} message="No deviations recorded — clean runs so far." />
            ) : (
              book.deviations.map((row) => (
                <tr key={row.id} className="border-b border-pos-border/60">
                  <td className="px-4 py-3 text-pos-ink-muted">{new Date(row.at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-pos-ink-muted">{row.batchId ? book.batches.find((b) => b.id === row.batchId)?.number ?? row.batchId : "—"}</td>
                  <td className="px-4 py-3">{row.stage}</td>
                  <td className="px-4 py-3">{row.expectedUnits}</td>
                  <td className="px-4 py-3 font-semibold">{row.actualUnits}</td>
                  <td className="px-4 py-3 text-pos-ink-muted">{row.reason}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${row.severity === "high" ? "bg-red-500/15 text-red-500" : row.severity === "medium" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-sky-500/15 text-sky-600"}`}>
                      {row.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove("deviations", row.id)} className="text-pos-ink-faint hover:text-pos-danger" aria-label="Delete deviation">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </TableShell>
        </Card>
      )}

      {tab === "waste" && (
        <Card title="Waste log" subtitle="The value you threw away — spoiled materials, rejected batches and spillage.">
          <SectionForm title="Record waste" onSave={handleSaveWaste} saving={saving}>
            <label>
              <span className={labelCls}>Item</span>
              <input className={inputCls} value={waste.itemName} onChange={(e) => setWaste({ ...waste, itemName: e.target.value })} placeholder="e.g. Packet of flour" />
            </label>
            <label>
              <span className={labelCls}>Quantity</span>
              <input className={inputCls} type="number" min="0" value={waste.quantity} onChange={(e) => setWaste({ ...waste, quantity: e.target.value })} />
            </label>
            <label>
              <span className={labelCls}>Unit cost (₦)</span>
              <input className={inputCls} type="number" min="0" value={waste.unitCostMinor} onChange={(e) => setWaste({ ...waste, unitCostMinor: e.target.value })} />
            </label>
            <label>
              <span className={labelCls}>Reason</span>
              <input className={inputCls} value={waste.reason} onChange={(e) => setWaste({ ...waste, reason: e.target.value })} placeholder="e.g. Over-cooked" />
            </label>
            <label>
              <span className={labelCls}>Batch</span>
              <select className={inputCls} value={waste.batchId} onChange={(e) => setWaste({ ...waste, batchId: e.target.value })}>
                <option value="">Standalone / none</option>
                {book.batches.map((row) => (
                  <option key={row.id} value={row.id}>{row.number} · {row.productName}</option>
                ))}
              </select>
            </label>
          </SectionForm>
          <TableShell columns={["When", "Item", "Qty", "Unit cost", "Value", "Reason", ""]} minWidth={700}>
            {book.waste.length === 0 ? (
              <EmptyRow colSpan={7} message="No waste recorded — the floor is winning." />
            ) : (
              book.waste.map((row) => (
                <tr key={row.id} className="border-b border-pos-border/60">
                  <td className="px-4 py-3 text-pos-ink-muted">{new Date(row.at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <TriangleAlert size={13} className="mr-1 inline text-amber-500" />
                    <span className="font-medium">{row.itemName}</span>
                  </td>
                  <td className="px-4 py-3">{row.quantity}</td>
                  <td className="px-4 py-3">{naira(row.unitCostMinor)}</td>
                  <td className="px-4 py-3 font-semibold text-pos-danger">{naira(row.quantity * row.unitCostMinor)}</td>
                  <td className="px-4 py-3 text-pos-ink-muted">{row.reason}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove("waste", row.id)} className="text-pos-ink-faint hover:text-pos-danger" aria-label="Delete waste entry">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </TableShell>
        </Card>
      )}
    </div>
  );
}