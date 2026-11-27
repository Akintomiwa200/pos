"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  CheckCircle2,
  ClipboardList,
  Copy,
  Database,
  Download,
  ExternalLink,
  FileCode,
  FileSpreadsheet,
  FileText,
  FolderArchive,
  Layers,
  Loader2,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Table,
  Trash2,
  Upload,
  X,
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
  type TransferDataset,
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
import { SetupHeader, fieldClass, secondaryButtonClass } from "./SetupChrome";

const today = () => new Date().toISOString().slice(0, 10);

type Method = "upload" | "paste" | "template" | "sample";
type FormatChoice = TransferFormat | "auto";
type CategoryFilter = "all" | "catalog" | "customers" | "finance" | "operations";

const CATEGORIES: Array<{ id: CategoryFilter; label: string; count?: number }> = [
  { id: "all", label: "All Datasets" },
  { id: "catalog", label: "Catalog & Stock" },
  { id: "customers", label: "Customers & CRM" },
  { id: "finance", label: "Finance & Accounts" },
  { id: "operations", label: "Operations & Admin" },
];

function getDatasetCategory(dataset: TransferDataset): CategoryFilter {
  const g = dataset.group?.toLowerCase() || "";
  if (g.includes("catalog") || dataset.id === "inventory" || dataset.id === "production-batches" || dataset.id === "combos") {
    return "catalog";
  }
  if (g.includes("customer") || g.includes("crm")) {
    return "customers";
  }
  if (g.includes("money") || dataset.id === "taxes" || dataset.id === "expenses" || dataset.id === "orders" || dataset.id === "ledger-accounts") {
    return "finance";
  }
  return "operations";
}

const IMPORT_FORMATS: Array<{ id: FormatChoice; label: string }> = [
  { id: "auto", label: "Auto-detect Format" },
  { id: "csv", label: "CSV · Comma Separated" },
  { id: "tsv", label: "TSV · Tab Separated" },
  { id: "json", label: "JSON · Key-Value Objects" },
  { id: "html", label: "Excel Table (.xls)" },
];

function importFormatLabel(format: FormatChoice) {
  return IMPORT_FORMATS.find((item) => item.id === format)?.label ?? "Auto-detect";
}

function isBinaryFormat(format: ExportFormat) {
  return format === "xlsx" || format === "pdf";
}

const FORMAT_META: Record<
  ExportFormat,
  { name: string; tag: string; description: string; badge?: string; icon: typeof FileSpreadsheet }
> = {
  xlsx: {
    name: "Excel Workbook",
    tag: ".xlsx",
    description: "Styled headers, auto-filter, and column sizing for Microsoft Excel & Google Sheets.",
    badge: "Recommended",
    icon: FileSpreadsheet,
  },
  csv: {
    name: "CSV Spreadsheet",
    tag: ".csv",
    description: "Standard delimited text file compatible with any database, accounting tool, or POS.",
    icon: FileText,
  },
  pdf: {
    name: "PDF Report",
    tag: ".pdf",
    description: "Print-ready paginated table document with clean styling, headers, and date stamp.",
    icon: FileText,
  },
  json: {
    name: "Raw JSON",
    tag: ".json",
    description: "Full structured schema payload ideal for automated pipelines, backups, and APIs.",
    icon: FileCode,
  },
  tsv: {
    name: "TSV Tab-Separated",
    tag: ".tsv",
    description: "Tab-delimited text for instant clipboard copy-pasting into spreadsheet rows.",
    icon: Table,
  },
  html: {
    name: "Excel Table",
    tag: ".xls",
    description: "Legacy HTML workbook format for older spreadsheet viewers and legacy ERPs.",
    icon: FileSpreadsheet,
  },
};

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
  const [previewTab, setPreviewTab] = useState<"table" | "raw">("table");
  const [previewSearch, setPreviewSearch] = useState("");
  const [datasetSearch, setDatasetSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [backupModalOpen, setBackupModalOpen] = useState(false);

  // Import states
  const [importId, setImportId] = useState("products");
  const [method, setMethod] = useState<Method>("upload");
  const [format, setFormat] = useState<FormatChoice>("auto");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [duplicateMode, setDuplicateMode] = useState<"update" | "skip">("update");
  const [includeErrors, setIncludeErrors] = useState(false);
  const [filterRowsStatus, setFilterRowsStatus] = useState<"all" | "errors" | "valid" | "new" | "update">("all");
  const [existing, setExisting] = useState<Record<string, unknown>[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const exportDataset = getDataset(exportId) ?? TRANSFER_DATASETS[0];
  const importDataset = getDataset(importId) ?? TRANSFER_DATASETS[0];

  const refreshExportRows = async () => {
    setLoadingExport(true);
    try {
      const rows = await listTransferRows(exportDataset, { fresh: true });
      setExportRows(rows);
    } catch {
      setExportRows([]);
    } finally {
      setLoadingExport(false);
    }
  };

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

  // Filtered dataset lists
  const filteredExportDatasets = useMemo(() => {
    return TRANSFER_DATASETS.filter((ds) => {
      const matchesSearch =
        ds.label.toLowerCase().includes(datasetSearch.toLowerCase()) ||
        ds.description.toLowerCase().includes(datasetSearch.toLowerCase()) ||
        ds.id.toLowerCase().includes(datasetSearch.toLowerCase());
      const cat = getDatasetCategory(ds);
      const matchesCategory = activeCategory === "all" || cat === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [datasetSearch, activeCategory]);

  const filteredImportDatasets = useMemo(() => {
    return TRANSFER_DATASETS.filter((ds) => ds.importable).filter((ds) => {
      const matchesSearch =
        ds.label.toLowerCase().includes(datasetSearch.toLowerCase()) ||
        ds.description.toLowerCase().includes(datasetSearch.toLowerCase()) ||
        ds.id.toLowerCase().includes(datasetSearch.toLowerCase());
      const cat = getDatasetCategory(ds);
      const matchesCategory = activeCategory === "all" || cat === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [datasetSearch, activeCategory]);

  // Export previews
  const previewSlice = useMemo(() => exportRows.slice(0, 10), [exportRows]);

  const exportPreview = useMemo(
    () =>
      isBinaryFormat(exportFormat)
        ? ""
        : encodeTable(exportDataset, previewSlice, exportFormat, { delimiter, headers: includeHeaders }),
    [exportDataset, previewSlice, exportFormat, delimiter, includeHeaders],
  );

  const exportPreviewTable = useMemo(
    () => datasetTable(exportDataset, previewSlice, { headers: includeHeaders }),
    [exportDataset, previewSlice, includeHeaders],
  );

  // Filtered preview rows based on search
  const filteredPreviewTableRows = useMemo(() => {
    if (!previewSearch.trim()) return exportPreviewTable.rows;
    const term = previewSearch.toLowerCase();
    return exportPreviewTable.rows.filter((row) =>
      row.some((cell) => cell.toLowerCase().includes(term)),
    );
  }, [exportPreviewTable.rows, previewSearch]);

  // Import parsing
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
  const errorCount = prepared.rows.filter((row) => row.errors.length > 0).length;
  const updateCount = prepared.rows.filter((row) => row.status === "update" && !row.errors.length).length;
  const newCount = prepared.rows.filter((row) => row.status === "new" && !row.errors.length).length;

  const filteredImportRows = useMemo(() => {
    return prepared.rows.filter((row) => {
      if (filterRowsStatus === "errors") return row.errors.length > 0;
      if (filterRowsStatus === "valid") return row.errors.length === 0;
      if (filterRowsStatus === "new") return row.status === "new" && row.errors.length === 0;
      if (filterRowsStatus === "update") return row.status === "update" && row.errors.length === 0;
      return true;
    });
  }, [prepared.rows, filterRowsStatus]);

  const chooseExport = (id: string) => {
    setExportId(id);
    setPreviewSearch("");
    setBusy(false);
  };

  const chooseImport = (id: string) => {
    setImportId(id);
    setText("");
    setFileName(null);
    setFileSize(null);
    setResult(null);
    setMethod("upload");
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
      toast.success(
        `${exportDataset.label} exported as ${exportLabel(exportFormat)} (${exportRows.length} record${exportRows.length === 1 ? "" : "s"}).`,
      );
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
      toast.success(`Full system backup downloaded as ${exportLabel(backupFormat)}.`);
      setBackupModalOpen(false);
    } catch (err) {
      toast.error(err, "Could not generate full backup");
    } finally {
      setBusy(false);
    }
  };

  const loadTemplate = (nextFormat: FormatChoice = format) => {
    const chosen = nextFormat === "auto" ? "csv" : nextFormat;
    setText(buildTemplate(importDataset, chosen, false));
    setFileName(`${importDataset.id}-template.${chosen === "html" ? "xls" : chosen}`);
    setFileSize(null);
    setMethod("template");
    setResult(null);
  };

  const loadSample = () => {
    const chosen = format === "auto" ? "csv" : format;
    setText(buildTemplate(importDataset, chosen, true));
    setFileName(`${importDataset.id}-sample.${chosen === "html" ? "xls" : chosen}`);
    setFileSize(null);
    setMethod("sample");
    setResult(null);
  };

  const copyRawPreview = async () => {
    if (!exportPreview) return;
    try {
      await navigator.clipboard.writeText(exportPreview);
      setCopiedRaw(true);
      toast.success("Preview copied to clipboard");
      setTimeout(() => setCopiedRaw(false), 2000);
    } catch {
      toast.error("Failed to copy text to clipboard");
    }
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result ?? "");
      setText(content);
      setDelimiter(detectDelimiter(content));
      setFileName(file.name || null);
      setFileSize(file.size);
      setFormat("auto");
      setMethod("upload");
      setResult(null);
      toast.success(`Loaded "${file.name}"`);
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
      const outcome = await importTransferRows(
        importId,
        ready.map((row) => row.payload),
      );
      const refreshed = await listTransferRows(importDataset, { fresh: true });
      setExisting(refreshed);
      if (exportId === importId) setExportRows(refreshed);
      setResult(outcome);
      toast.success(`Successfully imported: ${outcome.created} created, ${outcome.updated} updated.`);
    } catch (err) {
      toast.error(err, "Import failed");
    } finally {
      setBusy(false);
    }
  };

  const clearSource = () => {
    setText("");
    setFileName(null);
    setFileSize(null);
    setResult(null);
    setMethod("upload");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <SetupHeader
        kicker="Setup · Data Transfer"
        title="Data transfer"
        copy="Export datasets as formatted Excel, CSV, PDF, JSON or TSV, and import them back with instant schema validation and duplicate detection."
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/setup/others/data"
              className="inline-flex items-center gap-1.5 rounded-2xl border border-pos-border bg-pos-surface px-3.5 py-2 text-xs font-semibold text-pos-ink-muted shadow-pos-sm transition hover:bg-pos-surface-muted hover:text-pos-ink"
            >
              <Database size={14} className="text-pos-primary" />
              <span>Data Overview</span>
              <ExternalLink size={12} className="opacity-50" />
            </Link>

            <button
              type="button"
              onClick={() => setBackupModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-pos-border bg-pos-surface px-3.5 py-2 text-xs font-semibold text-pos-ink shadow-pos-sm transition hover:border-pos-primary/40 hover:bg-pos-primary/5 hover:text-pos-primary"
            >
              <FolderArchive size={14} className="text-pos-primary" />
              <span>Full System Backup</span>
            </button>
          </div>
        }
      />

      {/* Main Tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-pos-border/70 pb-3">
        <div className="inline-flex rounded-2xl bg-pos-surface-muted p-1 shadow-inner">
          <button
            type="button"
            onClick={() => setTab("export")}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-semibold transition ${
              tab === "export"
                ? "bg-pos-surface text-pos-ink shadow-pos-sm"
                : "text-pos-ink-muted hover:text-pos-ink"
            }`}
          >
            <ArrowDownToLine size={15} className={tab === "export" ? "text-pos-primary" : ""} />
            <span>Export Hub</span>
            <span className="rounded-full bg-pos-surface-muted px-2 py-0.5 text-[10px] text-pos-ink-faint">
              {TRANSFER_DATASETS.length} datasets
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab("import")}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-semibold transition ${
              tab === "import"
                ? "bg-pos-surface text-pos-ink shadow-pos-sm"
                : "text-pos-ink-muted hover:text-pos-ink"
            }`}
          >
            <ArrowUpFromLine size={15} className={tab === "import" ? "text-pos-primary" : ""} />
            <span>Import Hub</span>
            <span className="rounded-full bg-pos-surface-muted px-2 py-0.5 text-[10px] text-pos-ink-faint">
              Live Validation
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-pos-ink-muted">
          <span className="inline-flex size-2 rounded-full bg-pos-success" />
          <span>HQ Schema Synced</span>
        </div>
      </div>

      {/* ===================== EXPORT TAB ===================== */}
      {tab === "export" && (
        <div className="space-y-6">
          {/* Dataset Selector Card */}
          <section className="rounded-[24px] border border-pos-border/70 bg-pos-surface p-6 shadow-pos-md">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-pos-ink">Select a dataset to export</h2>
                  <span className="rounded-full bg-pos-primary/10 px-2 py-0.5 text-[11px] font-semibold text-pos-primary">
                    Step 1
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-pos-ink-muted">
                  Export directly in formats ready for reporting, accounting, or re-importing into HQ.
                </p>
              </div>

              {/* Dataset Search */}
              <div className="relative min-w-[240px]">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-pos-ink-faint" />
                <input
                  type="text"
                  placeholder="Filter 19 datasets..."
                  value={datasetSearch}
                  onChange={(e) => setDatasetSearch(e.target.value)}
                  className="w-full rounded-xl border border-pos-border bg-pos-surface-muted py-2 pl-9 pr-3 text-xs text-pos-ink placeholder:text-pos-ink-faint focus:border-pos-primary focus:bg-pos-surface focus:outline-none"
                />
                {datasetSearch && (
                  <button
                    type="button"
                    onClick={() => setDatasetSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-pos-ink-faint hover:text-pos-ink"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="mt-4 flex flex-wrap gap-1.5 border-b border-pos-border/50 pb-3">
              {CATEGORIES.map((cat) => {
                const active = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      active
                        ? "bg-pos-ink text-white"
                        : "bg-pos-surface-muted text-pos-ink-muted hover:bg-pos-border/60 hover:text-pos-ink"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Dataset Pill Grid */}
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filteredExportDatasets.map((dataset) => {
                const selected = dataset.id === exportId;
                return (
                  <button
                    key={dataset.id}
                    type="button"
                    onClick={() => chooseExport(dataset.id)}
                    className={`group relative flex flex-col items-start rounded-2xl border p-3 text-left transition ${
                      selected
                        ? "border-pos-primary bg-pos-primary-soft shadow-pos-sm ring-1 ring-pos-primary/50"
                        : "border-pos-border/70 bg-pos-surface hover:border-pos-border hover:bg-pos-surface-muted/60"
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-pos-ink-faint">
                        {dataset.group}
                      </span>
                      {selected && <CheckCircle2 size={13} className="text-pos-primary" />}
                    </div>
                    <span
                      className={`mt-1 font-semibold text-xs transition ${
                        selected ? "text-pos-primary" : "text-pos-ink group-hover:text-pos-primary"
                      }`}
                    >
                      {dataset.label}
                    </span>
                    <span className="mt-1 line-clamp-1 text-[11px] text-pos-ink-muted">
                      {dataset.fields.length} columns
                    </span>
                  </button>
                );
              })}
            </div>

            {filteredExportDatasets.length === 0 && (
              <p className="mt-4 text-center text-xs text-pos-ink-faint">No datasets match your search.</p>
            )}
          </section>

          {/* Active Dataset Hero Banner & Export Actions */}
          <section className="rounded-[24px] border border-pos-border/70 bg-pos-surface p-6 shadow-pos-md">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="grid size-9 place-items-center rounded-xl bg-pos-primary/10 text-pos-primary">
                    <Package size={18} />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-pos-ink">{exportDataset.label}</h3>
                      <span className="rounded-full bg-pos-surface-muted px-2 py-0.5 text-[11px] font-medium text-pos-ink-faint">
                        {exportDataset.group}
                      </span>
                    </div>
                    <p className="text-xs text-pos-ink-muted">{exportDataset.description}</p>
                  </div>
                </div>

                {/* Quick Dataset Metrics */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-pos-surface-muted px-2.5 py-1 text-xs">
                    <span className="size-1.5 rounded-full bg-pos-success" />
                    <span className="font-semibold text-pos-ink tabular-nums">
                      {loadingExport ? "..." : exportRows.length}
                    </span>
                    <span className="text-pos-ink-muted">records available</span>
                  </div>

                  <div className="inline-flex items-center gap-1.5 rounded-full bg-pos-surface-muted px-2.5 py-1 text-xs text-pos-ink-muted">
                    <Layers size={12} className="text-pos-ink-faint" />
                    <span className="font-semibold text-pos-ink tabular-nums">
                      {exportDataset.fields.length}
                    </span>
                    <span>columns</span>
                  </div>

                  <button
                    type="button"
                    onClick={refreshExportRows}
                    disabled={loadingExport}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-pos-ink-muted hover:text-pos-primary"
                    title="Refresh records from server"
                  >
                    <RefreshCw size={11} className={loadingExport ? "animate-spin" : ""} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* Primary Download Button */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  disabled={busy || loadingExport || !exportRows.length}
                  onClick={downloadExport}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-pos-primary px-6 py-3.5 text-sm font-semibold text-white shadow-pos-primary transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  <span>Download {exportDataset.label}</span>
                  <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-[11px] uppercase tracking-wide">
                    {EXPORT_EXTENSION[exportFormat]}
                  </span>
                </button>
              </div>
            </div>
          </section>

          {/* Format Selection Cards */}
          <section className="rounded-[24px] border border-pos-border/70 bg-pos-surface p-6 shadow-pos-md">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-pos-ink">Choose export format</h2>
                  <span className="rounded-full bg-pos-primary/10 px-2 py-0.5 text-[11px] font-semibold text-pos-primary">
                    Step 2
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-pos-ink-muted">
                  Choose the structure best suited for your spreadsheets, accounting, or reporting workflows.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {EXPORT_FORMATS.map((fmt) => {
                const meta = FORMAT_META[fmt.id];
                const active = exportFormat === fmt.id;
                const IconComponent = meta.icon;
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setExportFormat(fmt.id)}
                    className={`relative flex flex-col items-start rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-pos-primary bg-pos-primary-soft shadow-pos-sm ring-1 ring-pos-primary/50"
                        : "border-pos-border/80 bg-pos-surface hover:border-pos-border hover:bg-pos-surface-muted/50"
                    }`}
                  >
                    {meta.badge && (
                      <span className="absolute right-3 top-3 rounded-full bg-pos-primary/15 px-2 py-0.5 text-[10px] font-semibold text-pos-primary">
                        {meta.badge}
                      </span>
                    )}
                    <div className="flex items-center gap-2">
                      <span
                        className={`grid size-8 place-items-center rounded-xl transition ${
                          active ? "bg-pos-primary text-white" : "bg-pos-surface-muted text-pos-ink-muted"
                        }`}
                      >
                        <IconComponent size={16} />
                      </span>
                      <div>
                        <span className="font-semibold text-xs text-pos-ink">{meta.name}</span>
                        <span className="ml-1.5 rounded bg-pos-surface-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-pos-ink-faint">
                          {meta.tag}
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-pos-ink-muted">{meta.description}</p>
                  </button>
                );
              })}
            </div>

            {/* Delimiter & Header Options for CSV / Text */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-pos-border/60 pt-4">
              <div className="flex flex-wrap items-center gap-4">
                {exportFormat === "csv" && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium text-pos-ink">CSV Delimiter:</span>
                    <div className="inline-flex rounded-xl bg-pos-surface-muted p-0.5">
                      {[
                        { id: ",", label: "Comma (,)" },
                        { id: ";", label: "Semicolon (;)" },
                        { id: "|", label: "Pipe (|)" },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setDelimiter(item.id)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                            delimiter === item.id ? "bg-pos-surface text-pos-ink shadow-pos-sm" : "text-pos-ink-muted"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {!isBinaryFormat(exportFormat) && (
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-pos-ink">
                    <input
                      type="checkbox"
                      checked={includeHeaders}
                      onChange={(e) => setIncludeHeaders(e.target.checked)}
                      className="size-4 rounded border-pos-border text-pos-primary focus:ring-pos-primary"
                    />
                    <span>Include column headers row</span>
                  </label>
                )}

                {isBinaryFormat(exportFormat) && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-pos-ink-muted">
                    <ShieldCheck size={14} className="text-pos-success" />
                    <span>Formatted headers and auto-filters are automatically included in {exportFormat.toUpperCase()}</span>
                  </span>
                )}
              </div>

              <div className="text-xs text-pos-ink-faint">
                Filename: <span className="font-mono">{exportDataset.id}-{today()}.{EXPORT_EXTENSION[exportFormat]}</span>
              </div>
            </div>
          </section>

          {/* Live Data Preview Section */}
          <section className="rounded-[24px] border border-pos-border/70 bg-pos-surface p-6 shadow-pos-md">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-pos-ink">Live Data Preview</h2>
                  <span className="rounded-full bg-pos-surface-muted px-2 py-0.5 text-[11px] font-medium text-pos-ink-muted">
                    First {Math.min(10, exportRows.length)} rows
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-pos-ink-muted">
                  Verify the column schema and real record values before downloading.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Switch between Table grid and Raw text view (if text format) */}
                {!isBinaryFormat(exportFormat) && (
                  <div className="inline-flex rounded-xl bg-pos-surface-muted p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setPreviewTab("table")}
                      className={`rounded-lg px-2.5 py-1 font-medium transition ${
                        previewTab === "table" ? "bg-pos-surface text-pos-ink shadow-pos-sm" : "text-pos-ink-muted"
                      }`}
                    >
                      Table View
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab("raw")}
                      className={`rounded-lg px-2.5 py-1 font-medium transition ${
                        previewTab === "raw" ? "bg-pos-surface text-pos-ink shadow-pos-sm" : "text-pos-ink-muted"
                      }`}
                    >
                      Raw Syntax
                    </button>
                  </div>
                )}

                {!isBinaryFormat(exportFormat) && previewTab === "raw" && (
                  <button
                    type="button"
                    onClick={copyRawPreview}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-pos-border bg-pos-surface px-3 py-1.5 text-xs font-semibold text-pos-ink hover:bg-pos-surface-muted"
                  >
                    {copiedRaw ? <Check size={13} className="text-pos-success" /> : <Copy size={13} />}
                    <span>{copiedRaw ? "Copied" : "Copy to Clipboard"}</span>
                  </button>
                )}

                {/* Filter preview rows */}
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-pos-ink-faint" />
                  <input
                    type="text"
                    placeholder="Filter preview..."
                    value={previewSearch}
                    onChange={(e) => setPreviewSearch(e.target.value)}
                    className="rounded-xl border border-pos-border bg-pos-surface-muted py-1.5 pl-8 pr-2.5 text-xs text-pos-ink placeholder:text-pos-ink-faint focus:border-pos-primary focus:bg-pos-surface focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Preview Body */}
            <div className="mt-4">
              {loadingExport ? (
                <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-2xl bg-pos-surface-muted/60 text-xs text-pos-ink-muted">
                  <Loader2 size={20} className="animate-spin text-pos-primary" />
                  <span>Loading live dataset records...</span>
                </div>
              ) : exportRows.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-2xl bg-pos-surface-muted/60 text-center p-6">
                  <Package size={28} className="text-pos-ink-faint" />
                  <p className="text-xs font-medium text-pos-ink">No records currently stored in {exportDataset.label}.</p>
                  <p className="text-[11px] text-pos-ink-muted">
                    You can switch to the Import tab to load initial data from templates or uploads.
                  </p>
                </div>
              ) : !isBinaryFormat(exportFormat) && previewTab === "raw" ? (
                <div className="relative">
                  <pre className="max-h-72 overflow-auto rounded-2xl border border-pos-border/80 bg-pos-surface-muted/80 p-4 font-mono text-[11px] leading-relaxed text-pos-ink">
                    {exportPreview}
                  </pre>
                </div>
              ) : (
                /* Spreadsheet Table View */
                <div className="relative max-h-80 overflow-auto rounded-2xl border border-pos-border/80 shadow-inner">
                  <table className="w-full min-w-[720px] text-left text-xs">
                    <thead className="sticky top-0 z-10 border-b border-pos-border bg-pos-surface-muted/95 backdrop-blur-sm">
                      <tr>
                        <th className="w-10 px-3 py-2.5 text-center font-mono text-[10px] uppercase text-pos-ink-faint">
                          #
                        </th>
                        {exportPreviewTable.headers.map((header) => (
                          <th key={header} className="whitespace-nowrap px-3.5 py-2.5 font-semibold text-pos-ink">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-pos-border/50 bg-pos-surface">
                      {filteredPreviewTableRows.length > 0 ? (
                        filteredPreviewTableRows.map((row, rowIndex) => (
                          <tr key={rowIndex} className="transition hover:bg-pos-surface-muted/40">
                            <td className="px-3 py-2 text-center font-mono text-[10px] text-pos-ink-faint">
                              {rowIndex + 1}
                            </td>
                            {row.map((cell, cellIndex) => {
                              const isBool = cell === "true" || cell === "false";
                              return (
                                <td
                                  key={cellIndex}
                                  className="max-w-[220px] truncate px-3.5 py-2 text-pos-ink-muted font-normal"
                                >
                                  {isBool ? (
                                    <span
                                      className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                                        cell === "true"
                                          ? "bg-pos-success/10 text-pos-success"
                                          : "bg-pos-surface-muted text-pos-ink-faint"
                                      }`}
                                    >
                                      {cell}
                                    </span>
                                  ) : (
                                    cell || <span className="text-pos-ink-faint/60">—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={exportPreviewTable.headers.length + 1}
                            className="p-6 text-center text-xs text-pos-ink-faint"
                          >
                            No rows matched &ldquo;{previewSearch}&rdquo;.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Bottom Download Bar */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-pos-border/60 pt-4">
              <p className="text-xs text-pos-ink-muted">
                Showing <strong className="font-semibold text-pos-ink">{Math.min(10, exportRows.length)}</strong> of{" "}
                <strong className="font-semibold text-pos-ink">{exportRows.length}</strong> total records in{" "}
                <strong className="font-semibold text-pos-ink">{exportDataset.label}</strong>.
              </p>
              <button
                type="button"
                disabled={busy || loadingExport || !exportRows.length}
                onClick={downloadExport}
                className="inline-flex items-center gap-2 rounded-xl bg-pos-primary px-4 py-2 text-xs font-semibold text-white shadow-pos-sm transition hover:opacity-95 disabled:opacity-50"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                <span>Download {EXPORT_EXTENSION[exportFormat].toUpperCase()}</span>
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ===================== IMPORT TAB ===================== */}
      {tab === "import" && (
        <div className="space-y-6">
          {/* Post-Import Result Banner */}
          {result && (
            <section className="rounded-[24px] border border-pos-success/30 bg-pos-success-soft p-6 shadow-pos-md">
              <div className="flex flex-wrap items-center gap-4">
                <span className="grid size-12 place-items-center rounded-2xl bg-pos-success text-white shadow-sm">
                  <CheckCircle2 size={24} />
                </span>
                <div>
                  <h3 className="text-base font-bold text-pos-ink">Import Completed Successfully</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-pos-success/15 px-2.5 py-0.5 font-semibold text-pos-success">
                      +{result.created} created
                    </span>
                    <span className="rounded-full bg-pos-surface px-2.5 py-0.5 font-semibold text-pos-ink">
                      ~{result.updated} updated
                    </span>
                    {result.skipped > 0 && (
                      <span className="rounded-full bg-pos-surface px-2.5 py-0.5 font-semibold text-pos-ink-muted">
                        {result.skipped} skipped
                      </span>
                    )}
                    {result.failed > 0 && (
                      <span className="rounded-full bg-pos-danger/15 px-2.5 py-0.5 font-semibold text-pos-danger">
                        {result.failed} failed
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearSource}
                  className="ml-auto rounded-xl border border-pos-border bg-pos-surface px-3.5 py-2 text-xs font-semibold text-pos-ink shadow-pos-sm hover:bg-pos-surface-muted"
                >
                  Import Another File
                </button>
              </div>

              {result.errors.length > 0 && (
                <div className="mt-4 max-h-48 overflow-y-auto rounded-xl border border-pos-danger/20 bg-pos-surface p-3 text-xs">
                  <p className="mb-2 font-semibold text-pos-danger">Failed row details:</p>
                  <div className="space-y-1">
                    {result.errors.map((err, i) => (
                      <div key={i} className="flex items-center gap-2 text-pos-ink-muted">
                        <span className="font-mono text-pos-ink-faint">Row {err.row}:</span>
                        <span className="font-medium text-pos-ink">{err.label}</span>
                        <span className="text-pos-danger">— {err.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Step 1: Select Target Dataset */}
          <section className="rounded-[24px] border border-pos-border/70 bg-pos-surface p-6 shadow-pos-md">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-pos-ink">Select destination dataset</h2>
                  <span className="rounded-full bg-pos-primary/10 px-2 py-0.5 text-[11px] font-semibold text-pos-primary">
                    Step 1
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-pos-ink-muted">
                  Choose where imported records will be saved. Schema matching validates fields in real time.
                </p>
              </div>

              <div className="relative min-w-[240px]">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-pos-ink-faint" />
                <input
                  type="text"
                  placeholder="Search importable datasets..."
                  value={datasetSearch}
                  onChange={(e) => setDatasetSearch(e.target.value)}
                  className="w-full rounded-xl border border-pos-border bg-pos-surface-muted py-2 pl-9 pr-3 text-xs text-pos-ink placeholder:text-pos-ink-faint focus:border-pos-primary focus:bg-pos-surface focus:outline-none"
                />
              </div>
            </div>

            {/* Category tabs */}
            <div className="mt-4 flex flex-wrap gap-1.5 border-b border-pos-border/50 pb-3">
              {CATEGORIES.map((cat) => {
                const active = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      active
                        ? "bg-pos-ink text-white"
                        : "bg-pos-surface-muted text-pos-ink-muted hover:bg-pos-border/60 hover:text-pos-ink"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filteredImportDatasets.map((dataset) => {
                const selected = dataset.id === importId;
                return (
                  <button
                    key={dataset.id}
                    type="button"
                    onClick={() => chooseImport(dataset.id)}
                    className={`group relative flex flex-col items-start rounded-2xl border p-3 text-left transition ${
                      selected
                        ? "border-pos-primary bg-pos-primary-soft shadow-pos-sm ring-1 ring-pos-primary/50"
                        : "border-pos-border/70 bg-pos-surface hover:border-pos-border hover:bg-pos-surface-muted/60"
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-pos-ink-faint">
                        {dataset.group}
                      </span>
                      {selected && <CheckCircle2 size={13} className="text-pos-primary" />}
                    </div>
                    <span
                      className={`mt-1 font-semibold text-xs transition ${
                        selected ? "text-pos-primary" : "text-pos-ink group-hover:text-pos-primary"
                      }`}
                    >
                      {dataset.label}
                    </span>
                    <span className="mt-1 line-clamp-1 text-[11px] text-pos-ink-muted">
                      {dataset.fields.length} columns
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Step 2: Choose Source Data (Upload, Paste, Template) */}
          <section className="rounded-[24px] border border-pos-border/70 bg-pos-surface p-6 shadow-pos-md">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-pos-ink">Provide data source</h2>
                  <span className="rounded-full bg-pos-primary/10 px-2 py-0.5 text-[11px] font-semibold text-pos-primary">
                    Step 2
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-pos-ink-muted">
                  Uploading into <strong className="font-semibold text-pos-ink">{importDataset.label}</strong> (
                  {importDataset.fields.length} fields supported).
                </p>
              </div>

              {/* Source Method Switcher */}
              <div className="inline-flex rounded-xl bg-pos-surface-muted p-1 text-xs">
                {[
                  { id: "upload" as const, label: "Upload File", icon: Upload },
                  { id: "paste" as const, label: "Paste Text", icon: ClipboardList },
                  { id: "template" as const, label: "Template", icon: FileSpreadsheet },
                  { id: "sample" as const, label: "Load Sample", icon: Sparkles },
                ].map((m) => {
                  const active = method === m.id;
                  const IconComp = m.icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        if (m.id === "template") loadTemplate();
                        else if (m.id === "sample") loadSample();
                        else setMethod(m.id);
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition ${
                        active
                          ? "bg-pos-surface text-pos-ink shadow-pos-sm"
                          : "text-pos-ink-muted hover:text-pos-ink"
                      }`}
                    >
                      <IconComp size={13} className={active ? "text-pos-primary" : ""} />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Upload Drag & Drop Zone */}
            {method === "upload" && (
              <div className="mt-4">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`grid place-items-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition ${
                    dragOver
                      ? "border-pos-primary bg-pos-primary-soft/80"
                      : "border-pos-border bg-pos-surface-muted/50 hover:bg-pos-surface-muted/80"
                  }`}
                >
                  <span className="grid size-12 place-items-center rounded-2xl bg-pos-primary/10 text-pos-primary">
                    <Upload size={22} />
                  </span>

                  <div>
                    <p className="text-sm font-semibold text-pos-ink">Drag and drop your spreadsheet here</p>
                    <p className="mt-1 text-xs text-pos-ink-muted">
                      or{" "}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="font-semibold text-pos-primary underline hover:text-pos-primary/80"
                      >
                        browse from your computer
                      </button>
                    </p>
                    <p className="mt-1 text-[11px] text-pos-ink-faint">
                      Supported formats: .csv, .tsv, .json, or Excel compatible .xls
                    </p>
                  </div>

                  {fileName && (
                    <div className="mt-2 inline-flex items-center gap-2 rounded-xl border border-pos-border bg-pos-surface px-3 py-1.5 text-xs text-pos-ink shadow-pos-sm">
                      <FileText size={14} className="text-pos-primary" />
                      <span className="font-medium">{fileName}</span>
                      {fileSize && (
                        <span className="text-[11px] text-pos-ink-faint">({Math.round(fileSize / 1024)} KB)</span>
                      )}
                      <button
                        type="button"
                        onClick={clearSource}
                        className="ml-1 rounded text-pos-ink-faint hover:text-pos-danger"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.tsv,.tab,.txt,.json,.xls,.htm,.html"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) readFile(file);
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>
            )}

            {/* Paste Code / Textarea */}
            {(method === "paste" || method === "template" || method === "sample") && (
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-pos-ink">Direct Data Input</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => loadTemplate(format)}
                      className="inline-flex items-center gap-1 text-xs text-pos-ink-muted hover:text-pos-primary"
                    >
                      <Download size={12} />
                      <span>Insert Blank Headers</span>
                    </button>
                    <button
                      type="button"
                      onClick={clearSource}
                      className="inline-flex items-center gap-1 text-xs text-pos-ink-faint hover:text-pos-danger"
                    >
                      <Trash2 size={12} />
                      <span>Clear</span>
                    </button>
                  </div>
                </div>

                <textarea
                  className="w-full min-h-[160px] rounded-2xl border border-pos-border bg-pos-surface-muted/60 p-4 font-mono text-xs leading-relaxed text-pos-ink placeholder:text-pos-ink-faint/60 focus:border-pos-primary focus:bg-pos-surface focus:outline-none"
                  spellCheck={false}
                  placeholder={`Paste CSV, TSV, or JSON rows here...\nExample for ${importDataset.label}:\n${importDataset.fields.map((f) => f.label).join(",")}`}
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    setDelimiter(detectDelimiter(e.target.value));
                    setFileName(null);
                    setResult(null);
                  }}
                />
              </div>
            )}

            {/* Format & Delimiter Toolbar */}
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-pos-ink">Input Format</label>
                <select
                  className="w-full rounded-xl border border-pos-border bg-pos-surface-muted px-3 py-2 text-xs text-pos-ink focus:border-pos-primary focus:bg-pos-surface focus:outline-none"
                  value={format}
                  onChange={(e) => setFormat(e.target.value as FormatChoice)}
                >
                  {IMPORT_FORMATS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-pos-ink">Delimiter (CSV/TSV)</label>
                <select
                  className="w-full rounded-xl border border-pos-border bg-pos-surface-muted px-3 py-2 text-xs text-pos-ink focus:border-pos-primary focus:bg-pos-surface focus:outline-none disabled:opacity-50"
                  value={delimiter}
                  disabled={effectiveFormat !== "csv"}
                  onChange={(e) => setDelimiter(e.target.value)}
                >
                  <option value=",">Comma (,)</option>
                  <option value=";">Semicolon (;)</option>
                  <option value="|">Pipe (|)</option>
                  <option value={"\t"}>Tab (\t)</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-pos-ink">Detected Encoding</label>
                <div className="flex h-[34px] items-center rounded-xl bg-pos-surface-muted px-3 text-xs text-pos-ink-muted">
                  {text ? (
                    <span className="inline-flex items-center gap-1.5 font-semibold text-pos-ink">
                      <CheckCircle2 size={13} className="text-pos-success" />
                      {importFormatLabel(effectiveFormat)}
                    </span>
                  ) : (
                    <span className="text-pos-ink-faint">Awaiting data input...</span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Step 3: Validation, Duplicate Mode & Pre-Import Review */}
          {text.trim() && (
            <section className="rounded-[24px] border border-pos-border/70 bg-pos-surface p-6 shadow-pos-md">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-pos-ink">Validation & Schema Check</h2>
                    <span className="rounded-full bg-pos-primary/10 px-2 py-0.5 text-[11px] font-semibold text-pos-primary">
                      Step 3
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-pos-ink-muted">
                    Inspecting {prepared.rows.length} rows against {importDataset.label} rules.
                  </p>
                </div>

                {/* Duplicate resolution buttons */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-pos-ink">Existing IDs:</span>
                  <div className="inline-flex rounded-xl bg-pos-surface-muted p-0.5">
                    <button
                      type="button"
                      onClick={() => setDuplicateMode("update")}
                      className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                        duplicateMode === "update"
                          ? "bg-pos-surface text-pos-ink shadow-pos-sm"
                          : "text-pos-ink-muted"
                      }`}
                    >
                      Update Existing
                    </button>
                    <button
                      type="button"
                      onClick={() => setDuplicateMode("skip")}
                      className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                        duplicateMode === "skip"
                          ? "bg-pos-surface text-pos-ink shadow-pos-sm"
                          : "text-pos-ink-muted"
                      }`}
                    >
                      Skip Duplicates
                    </button>
                  </div>
                </div>
              </div>

              {/* KPI Status Strip */}
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
                <div className="rounded-2xl border border-pos-border bg-pos-surface-muted/50 p-3.5">
                  <p className="text-[11px] font-medium text-pos-ink-faint uppercase">Parsed Rows</p>
                  <p className="mt-1 text-xl font-bold text-pos-ink tabular-nums">{prepared.rows.length}</p>
                </div>

                <div className="rounded-2xl border border-pos-success/30 bg-pos-success/5 p-3.5">
                  <p className="text-[11px] font-medium text-pos-success uppercase">Ready to Import</p>
                  <p className="mt-1 text-xl font-bold text-pos-success tabular-nums">{ready.length}</p>
                </div>

                <div className="rounded-2xl border border-pos-border bg-pos-surface-muted/50 p-3.5">
                  <p className="text-[11px] font-medium text-pos-ink-faint uppercase">New Records</p>
                  <p className="mt-1 text-xl font-bold text-pos-ink tabular-nums">{newCount}</p>
                </div>

                <div className="rounded-2xl border border-pos-border bg-pos-surface-muted/50 p-3.5">
                  <p className="text-[11px] font-medium text-pos-ink-faint uppercase">Updates</p>
                  <p className="mt-1 text-xl font-bold text-pos-ink tabular-nums">{updateCount}</p>
                </div>

                <div
                  className={`rounded-2xl border p-3.5 ${
                    errorCount > 0
                      ? "border-pos-danger/30 bg-pos-danger/5"
                      : "border-pos-border bg-pos-surface-muted/50"
                  }`}
                >
                  <p
                    className={`text-[11px] font-medium uppercase ${
                      errorCount > 0 ? "text-pos-danger" : "text-pos-ink-faint"
                    }`}
                  >
                    Errors
                  </p>
                  <p
                    className={`mt-1 text-xl font-bold tabular-nums ${
                      errorCount > 0 ? "text-pos-danger" : "text-pos-ink"
                    }`}
                  >
                    {errorCount}
                  </p>
                </div>
              </div>

              {/* Column mapping feedback pills */}
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-pos-surface-muted px-2.5 py-1 text-pos-ink-muted">
                  <Layers size={13} className="text-pos-primary" />
                  <span>{prepared.matches.filter((m) => m.field).length} of {importDataset.fields.length} columns recognized</span>
                </span>

                {prepared.unknownHeaders.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-pos-warning/15 px-2.5 py-1 text-pos-warning">
                    <AlertTriangle size={13} />
                    <span>{prepared.unknownHeaders.length} unmapped column(s): {prepared.unknownHeaders.slice(0, 3).join(", ")}</span>
                  </span>
                )}

                <label className="ml-auto flex cursor-pointer items-center gap-2 text-pos-ink-muted">
                  <input
                    type="checkbox"
                    checked={includeErrors}
                    onChange={(e) => setIncludeErrors(e.target.checked)}
                    className="size-3.5 rounded border-pos-border text-pos-primary focus:ring-pos-primary"
                  />
                  <span>Allow importing valid rows even if some rows fail</span>
                </label>
              </div>

              {/* Row Status Filter Pills */}
              <div className="mt-5 flex flex-wrap gap-1.5 border-b border-pos-border/50 pb-3">
                {[
                  { id: "all" as const, label: `All (${prepared.rows.length})` },
                  { id: "valid" as const, label: `Ready (${ready.length})` },
                  { id: "new" as const, label: `New (${newCount})` },
                  { id: "update" as const, label: `Updates (${updateCount})` },
                  ...(errorCount > 0
                    ? [{ id: "errors" as const, label: `With Errors (${errorCount})` }]
                    : []),
                ].map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setFilterRowsStatus(chip.id)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      filterRowsStatus === chip.id
                        ? "bg-pos-ink text-white"
                        : "bg-pos-surface-muted text-pos-ink-muted hover:bg-pos-border/60 hover:text-pos-ink"
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Live Row Validation Table */}
              <div className="mt-3 max-h-72 overflow-auto rounded-2xl border border-pos-border/80">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-pos-surface-muted/95 backdrop-blur-sm border-b border-pos-border">
                    <tr>
                      <th className="px-3.5 py-2 font-mono text-[10px] uppercase text-pos-ink-faint">Row</th>
                      <th className="px-3.5 py-2 font-semibold text-pos-ink">Identifier / Label</th>
                      <th className="px-3.5 py-2 font-semibold text-pos-ink">Columns</th>
                      <th className="px-3.5 py-2 font-semibold text-pos-ink">Action</th>
                      <th className="px-3.5 py-2 font-semibold text-pos-ink">Validation Issues</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pos-border/40 bg-pos-surface">
                    {filteredImportRows.slice(0, 100).map((row) => {
                      const hasErr = row.errors.length > 0;
                      return (
                        <tr
                          key={row.index}
                          className={`transition ${hasErr ? "bg-pos-danger/[0.04]" : "hover:bg-pos-surface-muted/30"}`}
                        >
                          <td className="px-3.5 py-2 font-mono text-[11px] text-pos-ink-faint">#{row.index}</td>
                          <td className="max-w-[200px] truncate px-3.5 py-2 font-medium text-pos-ink">{row.label}</td>
                          <td className="px-3.5 py-2 tabular-nums text-pos-ink-muted">
                            {Object.keys(row.payload).length}
                          </td>
                          <td className="px-3.5 py-2">
                            {hasErr ? (
                              <span className="rounded-md bg-pos-danger/10 px-2 py-0.5 text-[10px] font-semibold text-pos-danger">
                                Invalid
                              </span>
                            ) : row.status === "update" ? (
                              <span className="rounded-md bg-pos-surface-muted px-2 py-0.5 text-[10px] font-semibold text-pos-ink">
                                Update
                              </span>
                            ) : (
                              <span className="rounded-md bg-pos-success/10 px-2 py-0.5 text-[10px] font-semibold text-pos-success">
                                New
                              </span>
                            )}
                          </td>
                          <td className="max-w-[300px] px-3.5 py-2 text-pos-danger">
                            {hasErr ? row.errors.join(" · ") : <span className="text-pos-ink-faint">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Confirm Import Action Button */}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-pos-border/60 pt-4">
                <p className="text-xs text-pos-ink-muted">
                  <strong className="font-semibold text-pos-ink">{ready.length}</strong> validated record
                  {ready.length === 1 ? "" : "s"} ready to commit to{" "}
                  <strong className="font-semibold text-pos-ink">{importDataset.label}</strong>.
                </p>

                <button
                  type="button"
                  disabled={busy || !ready.length}
                  onClick={runImport}
                  className="inline-flex items-center gap-2 rounded-xl bg-pos-primary px-5 py-2.5 text-xs font-semibold text-white shadow-pos-primary transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <ArrowUpFromLine size={14} />}
                  <span>Commit Import ({ready.length} rows)</span>
                </button>
              </div>
            </section>
          )}
        </div>
      )}

      {/* ===================== FULL BACKUP MODAL ===================== */}
      {backupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-[28px] border border-pos-border bg-pos-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="grid size-10 place-items-center rounded-2xl bg-pos-primary/10 text-pos-primary">
                  <FolderArchive size={20} />
                </span>
                <div>
                  <h3 className="text-base font-bold text-pos-ink">Full System Backup</h3>
                  <p className="text-xs text-pos-ink-muted">
                    Export entire HQ configuration and business datasets at once.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBackupModalOpen(false)}
                className="rounded-full p-1.5 text-pos-ink-faint hover:bg-pos-surface-muted hover:text-pos-ink"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-2xl bg-pos-surface-muted/70 p-4 text-xs text-pos-ink-muted space-y-2">
                <p className="font-medium text-pos-ink">Included in this bundle:</p>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <span>• Products & Inventory</span>
                  <span>• Orders & Sales</span>
                  <span>• Customers & CRM</span>
                  <span>• Expenses & Ledgers</span>
                  <span>• Branches & Taxes</span>
                  <span>• Staff & Permissions</span>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-pos-ink">Export Archive Format</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "xlsx" as const, name: "Excel Workbook (.xlsx)", desc: "Multi-tab spreadsheet" },
                    { id: "json" as const, name: "JSON Bundle (.json)", desc: "Full schema data objects" },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setBackupFormat(fmt.id)}
                      className={`rounded-xl border p-3 text-left transition ${
                        backupFormat === fmt.id
                          ? "border-pos-primary bg-pos-primary-soft ring-1 ring-pos-primary/40"
                          : "border-pos-border bg-pos-surface hover:bg-pos-surface-muted"
                      }`}
                    >
                      <p className="text-xs font-semibold text-pos-ink">{fmt.name}</p>
                      <p className="mt-0.5 text-[11px] text-pos-ink-muted">{fmt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-pos-border/70 pt-4">
              <button
                type="button"
                onClick={() => setBackupModalOpen(false)}
                className="rounded-xl border border-pos-border px-4 py-2 text-xs font-semibold text-pos-ink-muted hover:bg-pos-surface-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={fullBackup}
                className="inline-flex items-center gap-2 rounded-xl bg-pos-primary px-5 py-2 text-xs font-semibold text-white shadow-pos-primary hover:opacity-95 disabled:opacity-50"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                <span>Generate Full Backup</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
