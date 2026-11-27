import type { jsPDF as PdfDocument } from "jspdf";
import type { UserOptions as AutoTableOptions } from "jspdf-autotable";
import { downloadTextFile } from "./import-products";
import { exportSetup } from "./hq-setup";
import {
  FORMAT_EXTENSION,
  FORMAT_MIME,
  encodeTable,
  formatCell,
  getDataset,
  listTransferRows,
  type QuickExportKind,
  type TransferDataset,
  type TransferFieldKind,
  type TransferFormat,
} from "./data-transfer";

export type { QuickExportKind } from "./data-transfer";

export type ExportFormat = TransferFormat | "xlsx" | "pdf";

export const EXPORT_FORMATS: Array<{ id: ExportFormat; label: string; hint: string }> = [
  { id: "csv", label: "CSV", hint: "Universal spreadsheet text" },
  { id: "xlsx", label: "Excel workbook", hint: "Formatted sheets and filters" },
  { id: "pdf", label: "PDF report", hint: "Print-ready, paginated table" },
  { id: "json", label: "JSON", hint: "Restorable raw data" },
  { id: "tsv", label: "TSV", hint: "Tab-separated text" },
  { id: "html", label: "Excel table (.xls)", hint: "Legacy Excel-compatible HTML" },
];

export function isTextFormat(format: ExportFormat): format is TransferFormat {
  return format !== "xlsx" && format !== "pdf";
}

export function exportLabel(format: ExportFormat) {
  return EXPORT_FORMATS.find((item) => item.id === format)?.label ?? format.toUpperCase();
}

export const EXPORT_EXTENSION: Record<ExportFormat, string> = {
  ...FORMAT_EXTENSION,
  xlsx: "xlsx",
  pdf: "pdf",
};

const EXPORT_MIME: Record<ExportFormat, string> = {
  ...FORMAT_MIME,
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};

export type ExportTable = {
  title: string;
  headers: string[];
  rows: string[][];
  kinds?: Array<TransferFieldKind | "text">;
};

const stamp = () => new Date().toISOString().slice(0, 10);

function escapeHtml(value: string) {
  return value.replace(/[&<>]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[ch] ?? ch);
}

function objectText(value: unknown, maxLength = 320): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  const text = JSON.stringify(value);
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function flattenRecord(record: Record<string, unknown>, prefix = ""): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    const name = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(out, flattenRecord(value as Record<string, unknown>, name));
    } else {
      out[name] = value;
    }
  }
  return out;
}

function keyValueTable(record: Record<string, unknown>, title: string): ExportTable {
  const flat = flattenRecord(record);
  const entries = Object.entries(flat);
  return {
    title,
    headers: ["Field", "Value"],
    rows: entries.map(([key, value]) => [key, objectText(value)]),
    kinds: ["text", "text"],
  };
}

function recordsTable(records: Record<string, unknown>[], title: string): ExportTable {
  const keys = Array.from(new Set(records.flatMap((row) => Object.keys(row)))).sort();
  return {
    title,
    headers: keys,
    rows: records.map((row) => keys.map((key) => objectText(row[key]))),
    kinds: keys.map(() => "text"),
  };
}

export function datasetTable(
  dataset: TransferDataset,
  records: Record<string, unknown>[],
  options: { headers?: boolean } = {},
): ExportTable {
  return {
    title: dataset.label,
    headers: options.headers === false ? [] : dataset.fields.map((item) => item.label),
    rows: records.map((record) => dataset.fields.map((item) => formatCell(record, item))),
    kinds: dataset.fields.map((item) => item.kind),
  };
}

function bundleTables(kind: QuickExportKind, data: unknown): ExportTable[] {
  if (Array.isArray(data)) {
    return [recordsTable(data.filter((row): row is Record<string, unknown> => !!row && typeof row === "object"), kind)];
  }
  if (!data || typeof data !== "object") return [keyValueTable({ value: data }, kind)];

  const bundle = data as Record<string, unknown>;
  if (kind !== "all") return [keyValueTable(bundle, kind)];

  const catalog = Array.isArray(bundle.catalog) ? (bundle.catalog as Record<string, unknown>[]) : [];
  const sales = Array.isArray(bundle.sales) ? (bundle.sales as Record<string, unknown>[]) : [];
  const tables: ExportTable[] = [
    keyValueTable(
      {
        exportedAt: bundle.exportedAt,
        catalogRows: catalog.length,
        salesRows: sales.length,
        organizationFields: Object.keys(flattenRecord((bundle.org ?? {}) as Record<string, unknown>)).length,
      },
      "Backup summary",
    ),
  ];
  if (bundle.org && typeof bundle.org === "object") tables.push(keyValueTable(bundle.org as Record<string, unknown>, "Organization"));
  if (catalog.length) tables.push(recordsTable(catalog, "Catalog"));
  if (sales.length) tables.push(recordsTable(sales, "Sales"));
  return tables;
}

function encodeTablesText(
  tables: ExportTable[],
  format: TransferFormat,
  delimiter = ",",
  original?: unknown,
): string {
  if (format === "json") return JSON.stringify(original ?? tables, null, 2);
  if (format === "html") {
    return tables
      .map(
        (table) =>
          `<h3>${escapeHtml(table.title)}</h3><table><tr>${table.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>${table.rows
            .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
            .join("")}</table>`,
      )
      .join("\n");
  }

  const separator = format === "tsv" ? "\t" : delimiter || ",";
  const escape = (value: string) => (format === "tsv" ? value.replace(/[\t\n]/g, " ") : downloadCell(value));
  const lines: string[] = [];
  tables.forEach((table, index) => {
    if (index) lines.push("");
    lines.push(`# ${table.title}`);
    if (table.headers.length) lines.push(table.headers.map(escape).join(separator));
    table.rows.forEach((row) => lines.push(row.map(escape).join(separator)));
  });
  return `\uFEFF${lines.join("\n")}`;
}

function downloadCell(value: string) {
  const escaped = value.replace(/"/g, '""');
  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

let exceljsModule: Promise<typeof import("exceljs")> | null = null;
function loadExcelJS() {
  exceljsModule ??= import("exceljs");
  return exceljsModule;
}

let pdfModules: Promise<[typeof import("jspdf"), typeof import("jspdf-autotable")]> | null = null;
function loadPdfModules() {
  pdfModules ??= Promise.all([import("jspdf"), import("jspdf-autotable")]);
  return pdfModules;
}

function sheetName(title: string, index: number) {
  const cleaned = title.replace(/[[\]:*?/\\]/g, "").trim().slice(0, 28) || "Sheet";
  return `${cleaned}${index ? ` ${index + 1}` : ""}`.slice(0, 31);
}

function columnWidth(header: string, values: string[]) {
  const longest = values.reduce((size, value) => Math.max(size, value.length), header.length);
  return Math.min(46, Math.max(11, longest + 2));
}

/** Built only when the user chooses Excel — the library lives in its own lazy chunk. */
async function downloadWorkbook(tables: ExportTable[], filename: string) {
  const module = await loadExcelJS();
  const ExcelJS = ("default" in module ? module.default : module) as typeof import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "POS Console";
  workbook.lastModifiedBy = "POS Console";
  workbook.created = new Date();
  workbook.modified = new Date();

  tables.forEach((table, tableIndex) => {
    const sheet = workbook.addWorksheet(sheetName(table.title, tableIndex), {
      views: [{ state: "frozen", ySplit: 3 }],
      properties: { defaultRowHeight: 18 },
    });

    table.headers.forEach((header, columnIndex) => {
      sheet.getColumn(columnIndex + 1).width = columnWidth(
        header,
        table.rows.map((row) => row[columnIndex] ?? ""),
      );
    });

    const span = Math.max(1, table.headers.length);
    sheet.mergeCells(1, 1, 1, span);
    const title = sheet.getCell(1, 1);
    title.value = `${table.title} — POS export`;
    title.font = { name: "Aptos", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF123A4A" } };
    title.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    sheet.getRow(1).height = 30;

    sheet.mergeCells(2, 1, 2, span);
    const subtitle = sheet.getCell(2, 1);
    subtitle.value = `${table.rows.length} row${table.rows.length === 1 ? "" : "s"} · exported ${new Date().toLocaleString()}`;
    subtitle.font = { name: "Aptos", size: 9, color: { argb: "FF5A6B76" } };
    subtitle.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    sheet.getRow(2).height = 20;

    const headerRow = sheet.getRow(3);
    table.headers.forEach((header, columnIndex) => headerRow.getCell(columnIndex + 1).value = header);
    headerRow.font = { name: "Aptos", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F6478" } };
    headerRow.alignment = { vertical: "middle", wrapText: true };
    headerRow.border = { bottom: { style: "medium", color: { argb: "FF0E2F3C" } } };
    headerRow.height = 26;

    table.rows.forEach((values, rowIndex) => {
      const row = sheet.getRow(4 + rowIndex);
      values.forEach((value, columnIndex) => {
        const cell = row.getCell(columnIndex + 1);
        const kind = table.kinds?.[columnIndex] ?? "text";
        const numeric = kind === "money" || kind === "number";
        const parsed = numeric && value.trim() ? Number(value.replace(/,/g, "")) : Number.NaN;
        cell.value = numeric && Number.isFinite(parsed) ? parsed : value;
        if (numeric) cell.numFmt = kind === "money" ? '#,##0.00' : '#,##0.##';
        if (kind === "date" && value) cell.numFmt = "yyyy-mm-dd";
        cell.font = { name: "Aptos", size: 10, color: { argb: "FF24313A" } };
        cell.alignment = { vertical: "middle", horizontal: numeric ? "right" : "left" };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: rowIndex % 2 ? "FFF7FAFC" : "FFFFFFFF" },
        };
        cell.border = { bottom: { style: "hair", color: { argb: "FFE3E8EE" } } };
      });
    });

    if (table.headers.length && table.rows.length) {
      sheet.autoFilter = {
        from: { row: 3, column: 1 },
        to: { row: 3 + table.rows.length, column: table.headers.length },
      };
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(filename, new Blob([buffer as BlobPart], { type: EXPORT_MIME.xlsx }));
}

function pdfHeader(doc: PdfDocument, table: ExportTable, pageNumber: number) {
  const width = doc.internal.pageSize.getWidth();
  doc.setFillColor(18, 58, 74);
  doc.rect(0, 0, width, 58, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(table.title, 36, 25);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`${table.rows.length} rows · ${stamp()}`, 36, 42);
  doc.text(`POS export · ${pageNumber}`, width - 36, 42, { align: "right" });
  doc.setTextColor(36, 49, 58);
}

function pdfFooter(doc: PdfDocument) {
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(110, 125, 136);
  doc.text("Generated by POS Console", 36, height - 18);
  doc.text(`Page ${doc.getCurrentPageInfo().pageNumber}`, width - 36, height - 18, { align: "right" });
}

/** Built only when the user chooses PDF — jsPDF and autoTable load on demand. */
async function downloadPdf(tables: ExportTable[], filename: string) {
  const [pdfModule, autoTableModule] = await loadPdfModules();
  const autoTable = ("default" in autoTableModule
    ? autoTableModule.default
    : autoTableModule.autoTable) as (doc: PdfDocument, options: AutoTableOptions) => void;
  if (typeof autoTable !== "function") throw new Error("PDF table plugin is unavailable");

  const doc = new pdfModule.jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  tables.forEach((table, index) => {
    if (index) doc.addPage();
    pdfHeader(doc, table, index + 1);
    const options: AutoTableOptions = {
      head: table.headers.length ? [table.headers] : undefined,
      body: table.rows,
      startY: 76,
      margin: { left: 36, right: 36, top: 72, bottom: 46 },
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: 5,
        lineColor: [224, 231, 237],
        lineWidth: 0.4,
        textColor: [36, 49, 58],
        valign: "middle",
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [31, 100, 120],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8.5,
      },
      alternateRowStyles: { fillColor: [247, 250, 252] },
      didDrawPage: () => pdfFooter(doc),
    };
    autoTable(doc, options);
  });

  downloadBlob(filename, doc.output("blob"));
}

export async function downloadTables(
  baseName: string,
  tables: ExportTable[],
  format: ExportFormat,
  options: { delimiter?: string; original?: unknown } = {},
) {
  const filename = `${baseName}.${EXPORT_EXTENSION[format]}`;
  if (format === "xlsx") {
    await downloadWorkbook(tables, filename);
    return;
  }
  if (format === "pdf") {
    await downloadPdf(tables, filename);
    return;
  }
  downloadTextFile(filename, encodeTablesText(tables, format, options.delimiter, options.original), EXPORT_MIME[format]);
}

export async function downloadDataset(
  dataset: TransferDataset,
  records: Record<string, unknown>[],
  format: ExportFormat,
  options: { filename?: string; delimiter?: string; headers?: boolean } = {},
) {
  const baseName = options.filename ?? `${dataset.id}-${stamp()}`;
  const filename = `${baseName}.${EXPORT_EXTENSION[format]}`;
  if (isTextFormat(format)) {
    const content =
      format === "json"
        ? JSON.stringify(records, null, 2)
        : encodeTable(dataset, records, format, { delimiter: options.delimiter, headers: options.headers });
    downloadTextFile(filename, content, EXPORT_MIME[format]);
    return;
  }
  await downloadTables(baseName, [datasetTable(dataset, records, { headers: options.headers })], format);
}

export async function downloadBundle(
  kind: QuickExportKind,
  data: unknown,
  format: ExportFormat,
  baseName = `pos-${kind}-${stamp()}`,
) {
  await downloadTables(baseName, bundleTables(kind, data), format, { original: data });
}

/** One-click downloads used by Settings → Data, in any supported format. */
export async function exportQuick(kind: QuickExportKind, format: ExportFormat = "csv") {
  if (kind === "org" || kind === "catalog" || kind === "sales" || kind === "all") {
    const data = await exportSetup(kind);
    await downloadBundle(kind, data, format);
    return;
  }
  const dataset = getDataset(kind);
  if (!dataset) throw new Error(`Unknown export: ${kind}`);
  const rows = await listTransferRows(dataset);
  await downloadDataset(dataset, rows, format);
}
