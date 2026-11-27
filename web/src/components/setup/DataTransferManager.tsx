"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  ClipboardList,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { toast } from "@/lib/toast";
import { exportSetup } from "@/lib/hq-setup";
import {
  TRANSFER_DATASETS,
  buildTemplate,
  decodeTable,
  detectDelimiter,
  detectFormat,
  encodeTable,
  getDataset,
  importTransferRows,
  listTransferRows,
  prepareRows,
  type ImportResult,
  type TransferFormat,
} from "@/lib/data-transfer";
import {
  EXPORT_EXTENSION,
  EXPORT_FORMATS,
  datasetTable,
  downloadBundle,
  downloadDataset,
  exportLabel,
  type ExportFormat,
} from "@/lib/data-transfer-export";
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

const today = () => new Date().toISOString().slice(0, 10);
const pill = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold";
type Method = "upload" | "paste" | "template" | "sample";
type FormatChoice = TransferFormat | "auto";

const IMPORT_FORMATS: Array<{ id: FormatChoice; label: string }> = [
  { id: "auto", label: "Auto-detect" },
  { id: "csv", label: "CSV · comma" },
  { id: "tsv", label: "TSV · tab" },
  { id: "json", label: "JSON" },
  { id: "html", label: "Excel table (.xls)" },
];

function importFormatLabel(format: FormatChoice) {
  return IMPORT_FORMATS.find((item) => item.id === format)?.label ?? "Auto-detect";
}

function isBinaryFormat(format: ExportFormat) {
  return format === "xlsx" || format === "pdf";
}

function datasetLabel(id: string) {
  return getDataset(id)?.label ?? id;
}

export function DataTransferManager() {
  const [tab, setTab] = useState<"export" | "import">("export");
  const [exportId, setExportId] = useState("products");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("xlsx");
  const [backupFormat, setBackupFormat] = useState<ExportFormat>("xlsx");
  const [delimiter, setDelimiter] = useState(",");
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [exportRows, setExportRows] = useState<Record<string, unknown>[]>([]);
  const [loadingExport, setLoadingExport] = useState(true);
  const [busy, setBusy] = useState(false);

  const [importId, setImportId] = useState("products");
  const [method, setMethod] = useState<Method>("paste");
  const [format, setFormat] = useState<FormatChoice>("auto");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [duplicateMode, setDuplicateMode] = useState<"update" | "skip">("update");
  const [includeErrors, setIncludeErrors] = useState(false);
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);
  const [existing, setExisting] = useState<Record<string, unknown>[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const exportDataset = getDataset(exportId)!;
  const importDataset = getDataset(importId)!;

  useEffect(() => {
    let disposed = false;
    setLoadingExport(true);
    listTransferRows(exportDataset)
      .then((rows) => {
        if (!disposed) setExportRows(rows);
      })
      .catch(() => {
        if (!disposed) setExportRows([]);
      })
      .finally(() => {
        if (!disposed) setLoadingExport(false);
      });
    return () => {
      disposed = true;
    };
  }, [exportDataset]);

  useEffect(() => {
    let disposed = false;
    setLoadingExisting(true);
    listTransferRows(importDataset)
      .then((rows) => {
        if (!disposed) setExisting(rows);
      })
      .catch(() => {
        if (!disposed) setExisting([]);
      })
      .finally(() => {
        if (!disposed) setLoadingExisting(false);
      });
    return () => {
      disposed = true;
    };
  }, [importDataset]);

  const exportPreview = useMemo(
    () =>
      isBinaryFormat(exportFormat)
        ? ""
        : encodeTable(exportDataset, exportRows.slice(0, 6), exportFormat, { delimiter, headers: includeHeaders }),
    [exportDataset, exportRows, exportFormat, delimiter, includeHeaders],
  );
  const exportPreviewTable = useMemo(
    () => datasetTable(exportDataset, exportRows.slice(0, 6), { headers: includeHeaders }),
    [exportDataset, exportRows, includeHeaders],
  );

  const effectiveFormat: TransferFormat = format === "auto" ? detectFormat(text, fileName ?? "") : format;
  const table = useMemo(
    () => decodeTable(text, effectiveFormat, delimiter),
    [text, effectiveFormat, delimiter],
  );
  const prepared = useMemo(
    () => prepareRows(importDataset, table, existing, { mode: duplicateMode }),
    [importDataset, table, existing, duplicateMode],
  );
  const ready = useMemo(
    () => prepared.rows.filter((row) => row.errors.length === 0 || includeErrors),
    [prepared, includeErrors],
  );
  const errorCount = prepared.rows.filter((row) => row.errors.length).length;

  const chooseExport = (id: string) => {
    setExportId(id);
    setBusy(false);
  };

  const chooseImport = (id: string) => {
    setImportId(id);
    setText("");
    setFileName(null);
    setResult(null);
    setMethod("paste");
  };

  const downloadExport = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await downloadDataset(exportDataset, exportRows, exportFormat, {
        filename: `${exportId}-${today()}`,
        delimiter,
        headers: includeHeaders,
      });
      toast.success(`${exportLabel(exportFormat)} downloaded · ${exportRows.length} row${exportRows.length === 1 ? "" : "s"}.`);
    } catch (err) {
      toast.error(err, "Export failed");
    } finally {
      setBusy(false);
    }
  };

  const fullBackup = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const data = await exportSetup("all");
      await downloadBundle("all", data, backupFormat, `pos-full-backup-${today()}`);
      toast.success(`Full backup downloaded as ${exportLabel(backupFormat)}.`);
    } catch (err) {
      toast.error(err, "Could not export");
    } finally {
      setBusy(false);
    }
  };

  const loadTemplate = (nextFormat: FormatChoice = format) => {
    const chosen = nextFormat === "auto" ? "csv" : nextFormat;
    setText(buildTemplate(importDataset, chosen, true));
    setFileName(null);
    setMethod("template");
    setResult(null);
  };

  const loadSample = () => {
    const chosen = format === "auto" ? "csv" : format;
    setText(buildTemplate(importDataset, chosen, true));
    setFileName(null);
    setMethod("sample");
    setResult(null);
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result ?? "");
      setText(content);
      setDelimiter(detectDelimiter(content));
      setFileName(file.name || null);
      setFormat("auto");
      setMethod("upload");
      setResult(null);
    };
    reader.onerror = () => toast.error("Could not read that file.");
    reader.readAsText(file);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) readFile(file);
  };

  const runImport = async () => {
    if (!ready.length) return;
    setBusy(true);
    try {
      const outcome = await importTransferRows(importId, ready.map((row) => row.payload));
      const refreshed = await listTransferRows(importDataset, { fresh: true });
      setExisting(refreshed);
      if (exportId === importId) setExportRows(refreshed);
      setResult(outcome);
      toast.success(`Imported ${outcome.created} new, updated ${outcome.updated}.`);
    } catch (err) {
      toast.error(err, "Import failed");
    } finally {
      setBusy(false);
    }
  };

  const clearSource = () => {
    setText("");
    setFileName(null);
    setResult(null);
    setMethod("paste");
  };

  return (
    <div>
      <SetupHeader
        kicker="Setup · Data transfer"
        title="Data transfer"
        copy="Export any dataset as CSV, formatted Excel, PDF, JSON or TSV, then import it back from uploads, pasted text or templates with the same live validation."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Full backup format"
              className={`${fieldClass} w-36`}
              value={backupFormat}
              onChange={(event) => setBackupFormat(event.target.value as ExportFormat)}
              disabled={busy}
            >
              {EXPORT_FORMATS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={fullBackup}
              disabled={busy}
            >
              <Download size={15} />
              Full backup
            </button>
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {([
          { id: "export" as const, label: "Export centre", icon: ArrowDownToLine },
          { id: "import" as const, label: "Import centre", icon: ArrowUpFromLine },
        ]).map((entry) => {
          const on = tab === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setTab(entry.id)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition ${
                on ? "bg-pos-primary text-white" : "bg-pos-surface text-pos-ink-muted shadow-pos-sm hover:text-pos-ink"
              }`}
            >
              <entry.icon size={15} />
              {entry.label}
            </button>
          );
        })}
        <Link href="/setup/others/data" className={`${secondaryButtonClass} ml-auto`}>
          Data overview
        </Link>
      </div>

      {tab === "export" ? (
        <div className="space-y-5">
          <section className="rounded-[24px] bg-pos-surface p-6 shadow-pos-md">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-pos-ink">Choose a dataset</h2>
                <p className="mt-1 text-sm text-pos-ink-muted">
                  Each export uses the same column names as its import template, so a downloaded file can be reloaded directly.
                </p>
              </div>
              <span className={`${pill} bg-pos-surface-muted text-pos-ink-faint`}>
                {TRANSFER_DATASETS.length} datasets
              </span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {TRANSFER_DATASETS.map((dataset) => (
                <button
                  key={dataset.id}
                  type="button"
                  onClick={() => chooseExport(dataset.id)}
                  className={`rounded-full px-3.5 py-2 text-[12px] font-semibold transition ${
                    dataset.id === exportId
                      ? "bg-pos-primary text-white"
                      : "bg-pos-surface-muted text-pos-ink-muted hover:bg-pos-primary/10 hover:text-pos-ink"
                  }`}
                >
                  {dataset.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[13px] text-pos-ink-muted">{exportDataset.description}</p>
          </section>

          <section className="rounded-[24px] bg-pos-surface p-6 shadow-pos-md">
            <h2 className="text-[15px] font-semibold text-pos-ink">Export parameters</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Field label="Format" hint={EXPORT_FORMATS.find((item) => item.id === exportFormat)?.hint}>
                <select
                  className={fieldClass}
                  value={exportFormat}
                  onChange={(event) => setExportFormat(event.target.value as ExportFormat)}
                >
                  {EXPORT_FORMATS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Delimiter" hint="Applies to CSV exports.">
                <select
                  className={fieldClass}
                  value={delimiter}
                  disabled={exportFormat !== "csv"}
                  onChange={(event) => setDelimiter(event.target.value)}
                >
                  <option value=",">Comma (,)</option>
                  <option value=";">Semicolon (;)</option>
                  <option value="|">Pipe (|)</option>
                </select>
              </Field>
              <div className="pt-6">
                <ToggleField
                  label={isBinaryFormat(exportFormat) ? "Headers always included" : "Include header row"}
                  checked={includeHeaders}
                  disabled={isBinaryFormat(exportFormat)}
                  onChange={setIncludeHeaders}
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <SetupStat label="Rows ready" value={String(exportRows.length)} tone="accent" />
              <SetupStat label="Columns" value={String(exportDataset.fields.length)} />
              <SetupStat label="Format" value={exportFormat.toUpperCase()} hint={exportLabel(exportFormat)} />
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-pos-ink-faint">Live preview</p>
                <p className="text-[12px] text-pos-ink-faint">First {Math.min(6, exportRows.length)} rows</p>
              </div>
              {loadingExport ? (
                <p className="rounded-2xl bg-pos-surface-muted/60 p-4 text-[12px] text-pos-ink-faint">Loading…</p>
              ) : isBinaryFormat(exportFormat) ? (
                exportPreviewTable.rows.length ? (
                  <div className="max-h-64 overflow-auto rounded-2xl border border-pos-border/60">
                    <table className="w-full min-w-[640px] text-left text-[11px]">
                      <thead className="sticky top-0 bg-pos-primary text-white">
                        <tr>
                          {exportPreviewTable.headers.map((header) => (
                            <th key={header} className="whitespace-nowrap px-3 py-2 font-semibold">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-pos-border/50">
                        {exportPreviewTable.rows.map((row, rowIndex) => (
                          <tr key={rowIndex} className={rowIndex % 2 ? "bg-pos-surface-muted/50" : undefined}>
                            {row.map((cell, cellIndex) => (
                              <td key={cellIndex} className="max-w-[220px] truncate px-3 py-2 text-pos-ink-muted">
                                {cell || "—"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="rounded-2xl bg-pos-surface-muted/60 p-4 text-[12px] text-pos-ink-faint">
                    No rows found for this dataset.
                  </p>
                )
              ) : (
                <pre className="max-h-64 overflow-auto rounded-2xl bg-pos-surface-muted/60 p-4 font-mono text-[11px] leading-relaxed text-pos-ink-muted">
                  {exportPreview || "No rows found for this dataset."}
                </pre>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-pos-border/60 pt-4">
              <p className="text-[13px] text-pos-ink-muted">
                Download <strong className="font-semibold text-pos-ink">{exportDataset.label}</strong> as {exportLabel(exportFormat)}.
              </p>
              <PrimaryButton disabled={busy || loadingExport || !exportRows.length} onClick={downloadExport}>
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                Download · {EXPORT_EXTENSION[exportFormat].toUpperCase()}
              </PrimaryButton>
            </div>
          </section>
        </div>
      ) : null}

      {tab === "import" ? (
        <div className="space-y-5">
          {result ? (
            <section className="rounded-[24px] bg-pos-surface p-6 shadow-pos-md">
              <div className="flex flex-wrap items-center gap-3">
                <span className="grid size-11 place-items-center rounded-full bg-pos-success/10 text-pos-success">
                  <CheckCircle2 size={22} />
                </span>
                <div>
                  <h2 className="text-[16px] font-semibold text-pos-ink">Import complete</h2>
                  <p className="text-[13px] text-pos-ink-muted">
                    {result.created} created · {result.updated} updated · {result.skipped} skipped · {result.failed} failed
                  </p>
                </div>
                <button type="button" className={`${secondaryButtonClass} ml-auto`} onClick={clearSource}>
                  Import another file
                </button>
              </div>
              {result.errors.length ? (
                <div className="mt-4 max-h-56 overflow-y-auto rounded-2xl border border-pos-danger/20">
                  <table className="w-full text-left text-[13px]">
                    <tbody className="divide-y divide-pos-border/45">
                      {result.errors.map((error, index) => (
                        <tr key={`${error.row}-${index}`}>
                          <td className="px-4 py-2 text-pos-ink-faint">Row {error.row}</td>
                          <td className="px-4 py-2 text-pos-ink">{error.label}</td>
                          <td className="px-4 py-2 text-pos-danger">{error.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="rounded-[24px] bg-pos-surface p-6 shadow-pos-md">
            <h2 className="text-lg font-semibold text-pos-ink">Where is the data coming from?</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {TRANSFER_DATASETS.filter((dataset) => dataset.importable).map((dataset) => (
                <button
                  key={dataset.id}
                  type="button"
                  onClick={() => chooseImport(dataset.id)}
                  className={`rounded-full px-3.5 py-2 text-[12px] font-semibold transition ${
                    dataset.id === importId
                      ? "bg-pos-primary text-white"
                      : "bg-pos-surface-muted text-pos-ink-muted hover:bg-pos-primary/10 hover:text-pos-ink"
                  }`}
                >
                  {dataset.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[13px] text-pos-ink-muted">{importDataset.description}</p>

            <div className="mt-5 flex flex-wrap gap-2">
              {([
                { id: "upload" as const, label: "Upload file", icon: Upload },
                { id: "paste" as const, label: "Paste data", icon: ClipboardList },
                { id: "template" as const, label: "Template", icon: FileSpreadsheet },
                { id: "sample" as const, label: "Load sample", icon: Sparkles },
              ]).map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => {
                    if (entry.id === "template") loadTemplate();
                    else if (entry.id === "sample") loadSample();
                    else setMethod(entry.id);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-2xl px-3 py-2 text-[12px] font-semibold transition ${
                    method === entry.id ? "bg-pos-primary/10 text-pos-primary" : "bg-pos-surface-muted text-pos-ink-muted hover:text-pos-ink"
                  }`}
                >
                  <entry.icon size={14} />
                  {entry.label}
                </button>
              ))}
            </div>
          </section>

          {method === "upload" ? (
            <section className="rounded-[24px] bg-pos-surface p-6 shadow-pos-md">
              <div
                className={`grid place-items-center gap-3 rounded-[20px] border border-dashed px-6 py-9 text-center transition ${
                  dragOver ? "border-pos-primary bg-pos-primary/5" : "border-pos-border bg-pos-surface-muted/60"
                }`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <span className="grid size-12 place-items-center rounded-[16px] bg-pos-primary/10 text-pos-primary">
                  <Upload size={22} />
                </span>
                <div>
                  <p className="text-[15px] font-semibold text-pos-ink">Drop a file here</p>
                  <p className="mt-1 text-[13px] text-pos-ink-muted">
                    or{" "}
                    <button
                      type="button"
                      className="font-semibold text-pos-primary hover:underline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      browse files
                    </button>{" "}
                    — CSV, TSV, JSON or Excel-compatible .xls
                  </p>
                </div>
                {fileName ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-pos-surface px-3 py-1.5 text-[12px]">
                    <FileText size={14} className="text-pos-primary" />
                    {fileName}
                    <button type="button" aria-label="Remove file" onClick={clearSource}>
                      <XCircle size={14} />
                    </button>
                  </span>
                ) : null}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.tsv,.tab,.txt,.json,.xls,.xlsx,.htm,.html"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) readFile(file);
                    event.target.value = "";
                  }}
                />
              </div>
            </section>
          ) : null}

          <section className="rounded-[24px] bg-pos-surface p-6 shadow-pos-md">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold text-pos-ink">Source data</h2>
                <p className="mt-0.5 text-[13px] text-pos-ink-muted">
                  Paste rows, upload a file, or start from a template — validation runs instantly either way.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={secondaryButtonClass} onClick={() => loadTemplate(format)}>
                  <Download size={14} />
                  Download template
                </button>
                <button type="button" className={secondaryButtonClass} onClick={clearSource}>
                  <Trash2 size={14} />
                  Clear
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Field label="Format">
                <select className={fieldClass} value={format} onChange={(event) => setFormat(event.target.value as FormatChoice)}>
                  {IMPORT_FORMATS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Delimiter" hint="Used for CSV when format is auto.">
                <select
                  className={fieldClass}
                  value={delimiter}
                  disabled={effectiveFormat !== "csv"}
                  onChange={(event) => setDelimiter(event.target.value)}
                >
                  <option value=",">Comma (,)</option>
                  <option value=";">Semicolon (;)</option>
                  <option value="|">Pipe (|)</option>
                </select>
              </Field>
              <Field label="Expected columns">
                <input className={fieldClass} readOnly value={importDataset.fields.map((item) => item.label).join(", ")} />
              </Field>
            </div>

            <textarea
              className={`${fieldClass} mt-4 min-h-[180px] font-mono text-[12px] leading-relaxed`}
              spellCheck={false}
              placeholder={`${importDataset.fields.map((item) => item.label).join(",")}\n${importDataset.fields.map((item) => String(importDataset.sample[item.key] ?? "")).join(",")}`}
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setDelimiter(detectDelimiter(event.target.value));
                setFileName(null);
                setResult(null);
              }}
            />

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {table.matrix.length ? (
                <>
                  <span className={`${pill} bg-pos-success/10 text-pos-success`}>
                    <CheckCircle2 size={13} />
                    {table.matrix.length} row{table.matrix.length === 1 ? "" : "s"} detected
                  </span>
                  {format === "auto" ? (
                    <span className={`${pill} bg-pos-primary/10 text-pos-primary`}>
                      {importFormatLabel(effectiveFormat)}
                    </span>
                  ) : null}
                </>
              ) : null}
              {prepared.matches.filter((match) => match.field).length ? (
                <span className={`${pill} bg-pos-surface-muted text-pos-ink-faint`}>
                  {prepared.matches.filter((match) => match.field).length} column
                  {prepared.matches.filter((match) => match.field).length === 1 ? "" : "s"} matched
                </span>
              ) : null}
              {prepared.unknownHeaders.length ? (
                <span className={`${pill} bg-pos-warning/10 text-pos-warning`} title={prepared.unknownHeaders.join(", ")}>
                  <AlertTriangle size={13} />
                  {prepared.unknownHeaders.length} unknown column{prepared.unknownHeaders.length === 1 ? "" : "s"}
                </span>
              ) : null}
              {errorCount ? (
                <span className={`${pill} bg-pos-danger/10 text-pos-danger`}>
                  <XCircle size={13} />
                  {errorCount} row{errorCount === 1 ? "" : "s"} with errors
                </span>
              ) : null}
              {!text ? (
                <span className={`${pill} bg-pos-surface-muted text-pos-ink-faint`}>{table.note ?? "No data yet"}</span>
              ) : null}
            </div>
          </section>

          <section className="rounded-[24px] bg-pos-surface p-6 shadow-pos-md">
            <h2 className="text-[15px] font-semibold text-pos-ink">Import options</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-pos-ink-faint">Rows with a matching id</p>
                <div className="flex gap-2">
                  {([
                    { id: "update" as const, label: "Update", hint: "Refresh the existing record" },
                    { id: "skip" as const, label: "Skip", hint: "Keep the stored record" },
                  ]).map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setDuplicateMode(mode.id)}
                      className={`flex-1 rounded-2xl border px-3 py-2.5 text-left text-[13px] transition ${
                        duplicateMode === mode.id
                          ? "border-pos-primary bg-pos-primary/5 text-pos-ink"
                          : "border-pos-border bg-pos-surface-muted text-pos-ink-muted"
                      }`}
                    >
                      <span className="block font-semibold">{mode.label}</span>
                      <span className="text-[12px] text-pos-ink-faint">{mode.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid content-start gap-2">
                <ToggleField label="Import rows that have errors" checked={includeErrors} onChange={setIncludeErrors} />
                <ToggleField label="Only show rows with errors" checked={showErrorsOnly} onChange={setShowErrorsOnly} />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SetupStat label="Rows" value={String(prepared.rows.length)} />
              <SetupStat label="Ready" value={String(ready.length)} tone="accent" />
              <SetupStat label="With errors" value={String(errorCount)} />
              <SetupStat label="New" value={String(prepared.rows.filter((row) => row.status === "new").length)} tone="inverse" />
            </div>
          </section>

          <DataTable
            columns={["Row", "Record", "Columns", "Status", "Issue"]}
            toolbar={
              <p className="text-[12px] text-pos-ink-faint">
                {loadingExisting ? "Checking existing records…" : `${existing.length} existing records loaded for duplicate detection`}
              </p>
            }
          >
            {prepared.rows
              .filter((row) => (showErrorsOnly ? row.errors.length > 0 : true))
              .slice(0, 200)
              .map((row) => {
                const filled = Object.keys(row.payload).length;
                return (
                  <tr key={row.index} className={row.errors.length ? "bg-pos-danger/[0.04]" : undefined}>
                    <td className="px-4 py-3 text-[12px] tabular-nums text-pos-ink-faint">#{row.index}</td>
                    <td className="max-w-[240px] truncate px-4 py-3 text-[13px] font-medium text-pos-ink">{row.label}</td>
                    <td className="px-4 py-3 text-[12px] tabular-nums text-pos-ink-muted">{filled}</td>
                    <td className="px-4 py-3">
                      {row.errors.length ? (
                        <span className={`${pill} bg-pos-danger/10 text-pos-danger`}>Errors</span>
                      ) : row.status === "update" ? (
                        <span className={`${pill} bg-pos-surface-muted text-pos-ink`}>Update</span>
                      ) : (
                        <span className={`${pill} bg-pos-success/10 text-pos-success`}>New</span>
                      )}
                    </td>
                    <td className="max-w-[320px] px-4 py-3 text-[12px] text-pos-danger">{row.errors.join(" · ") || "—"}</td>
                  </tr>
                );
              })}
          </DataTable>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-pos-ink-muted">
              <strong className="font-semibold text-pos-ink">{ready.length}</strong> rows will be sent to{" "}
              <strong className="font-semibold text-pos-ink">{datasetLabel(importId)}</strong>.
              {duplicateMode === "skip" ? " Matching ids are kept untouched." : ""}
            </p>
            <PrimaryButton disabled={busy || !ready.length} onClick={runImport}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpFromLine size={16} />}
              Import {ready.length} row{ready.length === 1 ? "" : "s"}
            </PrimaryButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
