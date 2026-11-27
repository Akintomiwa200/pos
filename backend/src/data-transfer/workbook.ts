import { BadRequestException } from "@nestjs/common";
import type { Row } from "exceljs";
import { WORKBOOK_FIELDS, type WorkbookField } from "./transfer-fields";

/** Small enough to leave room for the 25mb JSON body parser and base64 encoding overhead. */
const MAX_WORKBOOK_BYTES = 20 * 1024 * 1024;
/** Matches the batch limit in DataTransferService.importRows. */
const MAX_DATA_ROWS = 5000;
const MAX_COLUMNS = 200;

export type WorkbookUpload = {
  filename?: string;
  /** Optional worksheet name; defaults to the first visible worksheet. */
  sheet?: string;
  /** Base64-encoded .xlsx bytes, optionally as a data URL. */
  data?: string;
};

export type DecodedWorkbook = {
  headers: string[];
  matrix: string[][];
  sheetName: string;
  rowCount: number;
};

let exceljsLoader: Promise<typeof import("exceljs")> | null = null;
function loadExcelJS() {
  // Node-side only: no browser APIs are required and the module stays out of the web bundle.
  exceljsLoader ??= import("exceljs");
  return exceljsLoader;
}

function decodeBase64(input: string): Buffer {
  const trimmed = input.trim();
  const dataUrl = /^data:([^;,]+)?;base64,([\s\S]*)$/i.exec(trimmed);
  if (dataUrl?.[1] && !/excel|spreadsheet|octet-stream|\.xlsx/i.test(dataUrl[1])) {
    throw new BadRequestException("Workbook data must be an .xlsx spreadsheet");
  }
  const encoded = (dataUrl ? dataUrl[2] : trimmed).replace(/\s+/g, "");
  if (!encoded || encoded.length % 4 === 1 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) {
    throw new BadRequestException("Invalid workbook data — expected base64-encoded .xlsx content");
  }
  const buffer = Buffer.from(encoded, "base64");
  if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new BadRequestException("Workbook data is not a valid .xlsx file");
  }
  if (buffer.length > MAX_WORKBOOK_BYTES) {
    throw new BadRequestException("Workbook is too large — the maximum size is 20 MB");
  }
  return buffer;
}

/** ExcelJS keeps formula results next to the formula; never import the formula string. */
function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  if (Array.isArray(value)) return value.map(cellText).join("").trim();
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if ("result" in record) return cellText(record.result);
    if ("richText" in record) return cellText(record.richText);
    if ("text" in record) return String(record.text ?? "").trim();
    if ("error" in record) return String(record.error ?? "").trim();
    if ("formula" in record || "sharedFormula" in record) return "";
    return JSON.stringify(value).trim();
  }
  return String(value).trim();
}

export async function decodeWorkbook(upload: WorkbookUpload): Promise<DecodedWorkbook> {
  if (!upload?.data || typeof upload.data !== "string") {
    throw new BadRequestException("Workbook data is required");
  }
  if (upload.filename && !/\.xlsx$/i.test(upload.filename.trim())) {
    throw new BadRequestException("Only binary .xlsx workbooks are supported — .xls is an HTML table");
  }
  if (upload.sheet !== undefined && (!String(upload.sheet).trim() || String(upload.sheet).length > 200)) {
    throw new BadRequestException("Invalid worksheet name");
  }

  const buffer = decodeBase64(upload.data);
  const ExcelJS = await loadExcelJS();
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  } catch {
    throw new BadRequestException("Could not read that workbook — check that it is a valid .xlsx file");
  }

  const sheet = String(upload.sheet ?? "").trim()
    ? workbook.getWorksheet(String(upload.sheet).trim())
    : workbook.worksheets.find((worksheet) => worksheet.state === "visible");
  if (!sheet) throw new BadRequestException("Worksheet not found (or no visible worksheet)");
  if (sheet.rowCount > MAX_DATA_ROWS + 1) {
    throw new BadRequestException(`Worksheet has too many rows — the import limit is ${MAX_DATA_ROWS} data rows`);
  }
  if (sheet.columnCount > MAX_COLUMNS) {
    throw new BadRequestException(`Worksheet has too many columns — the import limit is ${MAX_COLUMNS}`);
  }

  const table: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row: Row) => {
    const values: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      if (columnNumber <= MAX_COLUMNS) values[columnNumber - 1] = cellText(cell.value);
    });
    while (values.length && !values[values.length - 1]) values.pop();
    if (values.some(Boolean)) table.push(values.map((value) => value.trim()));
  });

  if (!table.length || !table[0]?.some(Boolean)) {
    throw new BadRequestException("The worksheet needs a header row and at least one data row");
  }
  if (table.length - 1 > MAX_DATA_ROWS) {
    throw new BadRequestException(`Worksheet has too many rows — the import limit is ${MAX_DATA_ROWS} data rows`);
  }

  return {
    headers: table[0]!,
    matrix: table.slice(1),
    sheetName: sheet.name,
    rowCount: table.length - 1,
  };
}

function normalizeHeader(text: string) {
  return text
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/^\s+|\s+$/g, "");
}

function matchField(fields: WorkbookField[], header: string): WorkbookField | null {
  const normalized = normalizeHeader(header);
  return (
    fields.find((item) => normalizeHeader(item.label) === normalized) ??
    fields.find(
      (item) =>
        normalizeHeader(item.key) === normalized ||
        (item.apiKey ? normalizeHeader(item.apiKey) === normalized : false),
    ) ??
    fields.find((item) => item.aliases.some((alias) => normalizeHeader(alias) === normalized)) ??
    null
  );
}

function parseNumber(raw: string) {
  const value = Number(raw.replace(/[^\d\-.,]/g, "").replace(/,/g, ""));
  return Number.isFinite(value) ? value : Number.NaN;
}

function parseBoolean(raw: string) {
  return ["yes", "true", "1", "y", "active", "enabled", "on"].includes(raw.trim().toLowerCase());
}

function normalizeDate(raw: string) {
  const value = raw.trim();
  if (!value) return "";
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(value)) return value.replace(/\//g, "-");
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [day, month, year] = value.split("/");
    return `${year}-${month}-${day}`;
  }
  return value.slice(0, 10);
}

const packedKeys = new Set(["tags", "components", "lines"]);

/**
 * Applies the same header aliases and cell conversions as the web preview, so a workbook
 * posted directly to the API behaves exactly like the same data pasted as CSV/TSV/JSON.
 * `issues` is aligned with `rows` and is merged into the normal per-row error report.
 */
export function mapWorkbookRows(dataset: string, headers: string[], matrix: string[][]) {
  const fields = WORKBOOK_FIELDS[dataset] ?? [];
  const matches = headers.map((header) => matchField(fields, header));

  const rows: Record<string, unknown>[] = [];
  const issues: Array<string | undefined> = [];

  for (const cells of matrix) {
    const raw: Record<string, string> = {};
    matches.forEach((field, columnIndex) => {
      if (field) raw[field.key] = (cells[columnIndex] ?? "").trim();
    });

    const payload: Record<string, unknown> = {};
    const problems: string[] = [];
    for (const item of fields) {
      const value = raw[item.key] ?? "";
      if (!value) continue;
      const target = item.apiKey ?? item.key;
      if (item.kind === "number" || item.kind === "money") {
        const number = parseNumber(value);
        if (!Number.isFinite(number)) {
          problems.push(`${item.label}: not a number`);
          continue;
        }
        payload[target] = item.minor ? Math.round(number * 100) : number;
      } else if (item.kind === "boolean") {
        payload[target] = parseBoolean(value);
      } else if (item.kind === "date") {
        payload[target] = normalizeDate(value);
      } else if (packedKeys.has(item.key)) {
        payload[target] = value.includes(",") ? value.split(",").map((part) => part.trim()) : value;
      } else {
        payload[target] = value;
      }
    }
    for (const item of fields) {
      if (!item.required) continue;
      const value = payload[item.apiKey ?? item.key];
      if (value === undefined || value === null || String(value).trim() === "") {
        problems.push(`${item.label} is required`);
      }
    }

    rows.push(payload);
    issues.push(problems.length ? problems.join(" · ") : undefined);
  }

  return { rows, issues };
}
