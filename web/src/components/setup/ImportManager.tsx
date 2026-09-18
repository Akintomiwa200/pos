"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  Loader2,
  PackagePlus,
  Sparkles,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { listCatalog } from "@/lib/hq-api";
import { importCatalogRows } from "../../lib/hq-setup";
import { toast } from "../../lib/toast";
import {
  buildCatalogIndex,
  CSV_TEMPLATE,
  type ImportProductRow,
  nairaMinor,
  parseImportCsv,
  rowKind,
  summarizeRows,
  toApiRows,
  downloadTextFile,
  type CatalogIndex,
} from "../../lib/import-products";
import {
  DataTable,
  Field,
  PrimaryButton,
  secondaryButtonClass,
  SetupHeader,
  SetupStat,
  ToggleField,
  fieldClass,
} from "./SetupChrome";

type Step = "source" | "review" | "done";

const statusPill = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold";

export function ImportManager() {
  const [step, setStep] = useState<Step>("source");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [defaults, setDefaults] = useState({ category: "General", unit: "each", reorder: "5", active: true });
  const [duplicateMode, setDuplicateMode] = useState<"update" | "skip">("update");
  const [includeErrors, setIncludeErrors] = useState(false);
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);
  const [existing, setExisting] = useState<CatalogIndex | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    updated: number;
    skipped: Array<{ name: string; reason: string }>;
  } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let disposed = false;
    listCatalog().then((items) => {
      if (!disposed) setExisting(buildCatalogIndex(items));
    });
    return () => {
      disposed = true;
    };
  }, []);

  const reorderDefault =
    defaults.reorder.trim() === "" ? 5 : Number(defaults.reorder.replace(/,/g, ""));
  const parse = useMemo(
    () =>
      parseImportCsv(text, {
        defaultCategory: defaults.category.trim() || undefined,
        defaultUnit: defaults.unit.trim() || undefined,
        defaultReorder: Number.isFinite(reorderDefault) ? reorderDefault : undefined,
        defaultActive: defaults.active,
      }),
    [text, defaults.category, defaults.unit, reorderDefault, defaults.active],
  );

  const summary = useMemo(
    () => (existing ? summarizeRows(parse.rows, existing) : null),
    [parse.rows, existing],
  );

  const importPlan = useMemo(() => {
    if (!existing || !parse.parsed) return null;
    const included: ImportProductRow[] = [];
    const skipped: Array<{ name: string; reason: string }> = [];
    for (const row of parse.rows) {
      const hasErrors = row.errors.length > 0;
      if (hasErrors && !includeErrors) {
        skipped.push({ name: row.name || `Row ${row.index}`, reason: "Has errors" });
        continue;
      }
      if (duplicateMode === "skip" && rowKind(row, existing) === "update") {
        skipped.push({ name: row.name || `Row ${row.index}`, reason: "Already exists" });
        continue;
      }
      included.push(row);
    }
    return { included, skipped };
  }, [parse, existing, duplicateMode, includeErrors]);

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setText(String(reader.result ?? ""));
      setFileName(file.name || null);
      setResult(null);
      setStep("source");
    };
    reader.readAsText(file);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) readFile(file);
  };

  const gotoReview = () => {
    if (!parse.parsed || !parse.rows.length) {
      toast.error(parse.notice ?? "Paste some CSV data first.");
      return;
    }
    setStep("review");
  };

  const handleImport = async () => {
    if (!importPlan || !importPlan.included.length) return;
    setBusy(true);
    try {
      const apiResult = await importCatalogRows(toApiRows(importPlan.included));
      setResult({
        created: apiResult.created,
        updated: apiResult.updated,
        skipped: importPlan.skipped,
      });
      setStep("done");
      toast.success(`Imported ${apiResult.created} new, updated ${apiResult.updated}.`);
    } catch (err) {
      toast.error(err, "Import failed");
    } finally {
      setBusy(false);
    }
  };

  const resetAll = () => {
    setStep("source");
    setResult(null);
    setShowErrorsOnly(false);
    setIncludeErrors(false);
    setText("");
    setFileName(null);
  };

  const matchedHeaders = parse.headerMappings.filter((match) => match.field);
  const unknownHeaders = parse.unknownHeaders;

  return (
    <div className="mx-auto max-w-5xl">
      <SetupHeader
        kicker="Setup · Products"
        title="Import products"
        copy="Add new products or update existing ones from a CSV file. Columns are matched by header name — name, sku, barcode, cost, price, on hand, reorder level and more are recognised. Rows that share a SKU or barcode with an existing product update it instead of creating a duplicate."
        action={
          <PrimaryButton onClick={() => downloadTextFile("products-import-template.csv", CSV_TEMPLATE())}>
            <Download size={16} />
            Download template
          </PrimaryButton>
        }
      />

      {step === "source" ? (
        <div className="space-y-5">
          <section className="rounded-[24px] bg-pos-surface p-6 shadow-pos-md">
            <div
              className={`grid place-items-center gap-3 rounded-[20px] border border-dashed px-6 py-10 text-center transition ${
                dragOver ? "border-pos-primary bg-pos-primary/5" : "border-pos-border bg-pos-surface-muted/60"
              }`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <span className="grid size-14 place-items-center rounded-[18px] bg-pos-primary/10 text-pos-primary">
                <Upload size={24} />
              </span>
              <div>
                <p className="text-[15px] font-semibold text-pos-ink">Drop your CSV here</p>
                <p className="mt-1 text-[13px] text-pos-ink-muted">
                  or{" "}
                  <button
                    type="button"
                    className="font-semibold text-pos-primary hover:underline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    browse files
                  </button>{" "}
                  .csv
                </p>
              </div>
              {fileName ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-pos-surface px-3.5 py-1.5 text-[12px] font-medium text-pos-ink">
                  <FileText size={14} className="text-pos-primary" />
                  {fileName}
                  <button
                    type="button"
                    aria-label="Remove file"
                    className="text-pos-ink-faint hover:text-pos-danger"
                    onClick={() => {
                      setText("");
                      setFileName(null);
                    }}
                  >
                    <XCircle size={14} />
                  </button>
                </span>
              ) : null}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) readFile(file);
                  event.target.value = "";
                }}
              />
            </div>
          </section>

          <section className="rounded-[24px] bg-pos-surface p-6 shadow-pos-md">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold text-pos-ink">Your CSV data</h2>
                <p className="mt-0.5 text-[13px] text-pos-ink-muted">
                  The first row must be column headers. Missing values fall back to sensible defaults.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={() => downloadTextFile("products-import-template.csv", CSV_TEMPLATE())}
                >
                  <Download size={15} />
                  Download template
                </button>
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={() => {
                    setText(CSV_TEMPLATE());
                    setFileName(null);
                  }}
                >
                  <Sparkles size={15} />
                  Load sample
                </button>
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={() => {
                    setText("");
                    setFileName(null);
                  }}
                >
                  <Trash2 size={15} />
                  Clear
                </button>
              </div>
            </div>
            <textarea
              className={`${fieldClass} min-h-[220px] font-mono text-[12px] leading-relaxed`}
              placeholder={"name,category,sku,barcode,cost,price,on hand,reorder level,unit,expiry date\nParacetamol 500mg,Pharmacy,PARA-500,8901234500001,250,500,120,20,pack,2026-12-31"}
              value={text}
              spellCheck={false}
              onChange={(event) => {
                setText(event.target.value);
                setFileName(null);
                setResult(null);
              }}
            />
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {parse.parsed ? (
                <span className={`${statusPill} bg-pos-success/10 text-pos-success`}>
                  <CheckCircle2 size={13} />
                  {parse.rows.length} data row{parse.rows.length === 1 ? "" : "s"} detected
                </span>
              ) : null}
              {summary ? (
                <span className={`${statusPill} bg-pos-surface-muted text-pos-ink-faint`}>
                  <ClipboardList size={13} />
                  {summary.create} new · {summary.update} will update
                </span>
              ) : null}
              {summary && summary.errors ? (
                <span className={`${statusPill} bg-pos-warning/10 text-pos-warning`}>
                  <AlertTriangle size={13} />
                  {summary.errors} with errors
                </span>
              ) : null}
              {unknownHeaders.length ? (
                <span className={`${statusPill} bg-pos-warning/10 text-pos-warning`} title={unknownHeaders.join(", ")}>
                  <AlertTriangle size={13} />
                  {unknownHeaders.length} unrecognised column{unknownHeaders.length === 1 ? "" : "s"}
                </span>
              ) : null}
              {matchedHeaders.length ? (
                <span className={`${statusPill} bg-pos-surface-muted text-pos-ink-faint`}>
                  {matchedHeaders.length} column{matchedHeaders.length === 1 ? "" : "s"} matched
                </span>
              ) : null}
            </div>
            <div className="mt-6 flex items-center justify-end gap-3 border-t border-pos-border/60 pt-4">
              <PrimaryButton onClick={gotoReview} disabled={busy || !parse.parsed || !parse.rows.length}>
                Review import
                <ArrowRight size={16} />
              </PrimaryButton>
            </div>
          </section>
        </div>
      ) : null}

      {step === "review" ? (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-pos-ink-muted hover:text-pos-ink"
              onClick={() => setStep("source")}
            >
              <ArrowLeft size={15} />
              Back to edit
            </button>
            <span className="text-[12px] text-pos-ink-faint">
              {fileName ? fileName : "Pasted data"} · {summary?.total ?? 0} rows
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <SetupStat label="Total rows" value={String(summary?.total ?? 0)} />
            <SetupStat label="Ready" value={String(summary?.ready ?? 0)} tone="accent" />
            <SetupStat
              label="With errors"
              value={String(summary?.errors ?? 0)}
              hint={includeErrors ? "Will still be imported" : "Skipped"}
            />
            <SetupStat label="New" value={String(summary?.create ?? 0)} tone="inverse" />
            <SetupStat label="Update" value={String(summary?.update ?? 0)} tone="inverse" />
          </div>

          <section className="rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
            <h2 className="text-[15px] font-semibold text-pos-ink">Import options</h2>
            <div className="mt-4 grid gap-5 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-pos-ink-faint">
                  Existing products
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDuplicateMode("update")}
                    className={`flex-1 rounded-2xl border px-3.5 py-2.5 text-left text-[13px] transition ${
                      duplicateMode === "update"
                        ? "border-pos-primary bg-pos-primary/5 text-pos-ink"
                        : "border-pos-border bg-pos-surface-muted text-pos-ink-muted"
                    }`}
                  >
                    <span className="block font-semibold text-pos-ink">Update existing</span>
                    <span className="text-[12px] text-pos-ink-faint">Matching SKU or barcode is refreshed</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDuplicateMode("skip")}
                    className={`flex-1 rounded-2xl border px-3.5 py-2.5 text-left text-[13px] transition ${
                      duplicateMode === "skip"
                        ? "border-pos-primary bg-pos-primary/5 text-pos-ink"
                        : "border-pos-border bg-pos-surface-muted text-pos-ink-muted"
                    }`}
                  >
                    <span className="block font-semibold text-pos-ink">Skip existing</span>
                    <span className="text-[12px] text-pos-ink-faint">Only brand-new products are added</span>
                  </button>
                </div>
              </div>
              <div>
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-pos-ink-faint">
                  Defaults for blank cells
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Category">
                    <input
                      className={fieldClass}
                      value={defaults.category}
                      onChange={(event) => setDefaults((d) => ({ ...d, category: event.target.value }))}
                    />
                  </Field>
                  <Field label="Unit">
                    <input
                      className={fieldClass}
                      value={defaults.unit}
                      onChange={(event) => setDefaults((d) => ({ ...d, unit: event.target.value }))}
                    />
                  </Field>
                  <Field label="Reorder level">
                    <input
                      className={fieldClass}
                      value={defaults.reorder}
                      inputMode="numeric"
                      onChange={(event) => setDefaults((d) => ({ ...d, reorder: event.target.value }))}
                    />
                  </Field>
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <ToggleField
                label="Import rows that have errors"
                checked={includeErrors}
                onChange={setIncludeErrors}
              />
              <ToggleField
                label="Only show rows with errors"
                checked={showErrorsOnly}
                onChange={setShowErrorsOnly}
              />
            </div>
          </section>

          <DataTable
            columns={["Row", "Product", "Category", "SKU / Barcode", "Price", "Cost", "On hand", "Status"]}
            toolbar={
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[12px] text-pos-ink-faint">
                  {summary?.valid ?? 0} rows ready to import
                  {includeErrors ? ` · ${summary?.errors ?? 0} rows with errors included` : ""}
                </p>
                <span className={`${statusPill} ${showErrorsOnly ? "bg-pos-warning/10 text-pos-warning" : "bg-pos-surface-muted text-pos-ink-faint"}`}>
                  {showErrorsOnly ? `${summary?.errors ?? 0} rows with errors` : "All rows"}
                </span>
              </div>
            }
          >
            {parse.rows
              .filter((row) => (showErrorsOnly ? row.errors.length > 0 : true))
              .map((row) => {
                const kind = existing ? rowKind(row, existing) : "new";
                const hasErrors = row.errors.length > 0;
                return (
                  <tr key={row.index} className={hasErrors ? "bg-pos-danger/[0.04]" : undefined}>
                    <td className="px-4 py-3 text-[12px] tabular-nums text-pos-ink-faint">#{row.index}</td>
                    <td className="max-w-[220px] px-4 py-3">
                      <p className="truncate text-[13px] font-medium text-pos-ink">{row.name || "—"}</p>
                      <p className="truncate text-[11px] text-pos-ink-faint">
                        {[row.brand, row.unit, row.packNum > 1 ? `pack of ${row.packNum}` : null]
                          .filter(Boolean)
                          .join(" · ") || " "}
                      </p>
                      {hasErrors ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {row.errors.map((error) => (
                            <span key={error} className="rounded-full bg-pos-danger/10 px-2 py-0.5 text-[10px] font-medium text-pos-danger">
                              {error}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-pos-ink-muted">{row.category || "—"}</td>
                    <td className="px-4 py-3 text-[13px] text-pos-ink-muted">
                      <span className="block truncate font-mono text-[12px]">{row.sku || row.barcode || "—"}</span>
                      {row.sku && row.barcode ? (
                        <span className="block truncate font-mono text-[11px] text-pos-ink-faint">{row.barcode}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-[13px] tabular-nums text-pos-ink">{nairaMinor(row.priceMinor)}</td>
                    <td className="px-4 py-3 text-[13px] tabular-nums text-pos-ink-muted">{nairaMinor(row.costMinor)}</td>
                    <td className="px-4 py-3 text-[13px] tabular-nums text-pos-ink-muted">{row.onHandNum}</td>
                    <td className="px-4 py-3">
                      {hasErrors ? (
                        <span className={`${statusPill} bg-pos-danger/10 text-pos-danger`}>
                          <XCircle size={13} />
                          Errors
                        </span>
                      ) : kind === "update" ? (
                        <span className={`${statusPill} bg-pos-surface-muted text-pos-ink`}>
                          <PackagePlus size={13} />
                          Update
                        </span>
                      ) : (
                        <span className={`${statusPill} bg-pos-success/10 text-pos-success`}>
                          <PackagePlus size={13} />
                          New
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
          </DataTable>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-pos-ink-muted">
              <strong className="font-semibold text-pos-ink">{importPlan?.included.length ?? 0}</strong> products will be
              sent
              {duplicateMode === "skip" ? " (existing products are kept untouched)" : ""}.
            </p>
            <PrimaryButton
              disabled={busy || !importPlan?.included.length}
              onClick={handleImport}
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              Import {importPlan?.included.length ?? 0} products
            </PrimaryButton>
          </div>
        </div>
      ) : null}

      {step === "done" ? (
        <div className="space-y-5">
          <section className="overflow-hidden rounded-[24px] bg-pos-surface shadow-pos-md">
            <div className="border-b border-pos-border/60 bg-pos-success/[0.06] px-6 py-8 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-pos-success/10 text-pos-success">
                <CheckCircle2 size={28} />
              </span>
              <h2 className="mt-3 text-[22px] font-semibold tracking-tight text-pos-ink">Import complete</h2>
              <p className="mt-1 text-[14px] text-pos-ink-muted">
                {result?.created ?? 0} new products added · {result?.updated ?? 0} existing products updated
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 px-6 py-6 sm:grid-cols-2">
              <div className="rounded-[18px] bg-pos-surface-muted/60 px-5 py-4">
                <p className="text-[12px] font-medium uppercase tracking-wide text-pos-ink-faint">Created</p>
                <p className="mt-1 text-[26px] font-semibold leading-none text-pos-success tabular-nums">
                  {result?.created ?? 0}
                </p>
              </div>
              <div className="rounded-[18px] bg-pos-surface-muted/60 px-5 py-4">
                <p className="text-[12px] font-medium uppercase tracking-wide text-pos-ink-faint">Updated</p>
                <p className="mt-1 text-[26px] font-semibold leading-none text-pos-primary tabular-nums">
                  {result?.updated ?? 0}
                </p>
              </div>
            </div>
            {result?.skipped.length ? (
              <div className="border-t border-pos-border/60 px-6 py-5">
                <p className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-pos-ink">
                  <AlertTriangle size={15} className="text-pos-warning" />
                  Skipped {result.skipped.length} row{result.skipped.length === 1 ? "" : "s"}
                </p>
                <div className="max-h-52 overflow-y-auto rounded-2xl border border-pos-border/60">
                  <table className="w-full text-left text-[13px]">
                    <tbody className="divide-y divide-pos-border/45">
                      {result.skipped.map((entry, i) => (
                        <tr key={`${entry.name}-${i}`}>
                          <td className="px-4 py-2.5 text-pos-ink">{entry.name}</td>
                          <td className="w-40 px-4 py-2.5 text-[12px] text-pos-ink-faint">{entry.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </section>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Link href="/setup/items/items" className={secondaryButtonClass}>
              View all products
            </Link>
            <PrimaryButton onClick={resetAll}>
              <Download size={16} />
              Import another file
            </PrimaryButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}