export type ImportFieldKind = "text" | "money" | "number" | "boolean" | "date" | "id";

export type ImportField = {
  key: string;
  label: string;
  kind: ImportFieldKind;
  aliases: string[];
};

export const CSV_FIELDS: ImportField[] = [
  { key: "name", label: "name", kind: "text", aliases: ["name", "product name", "item name", "item", "product", "title", "product title"] },
  { key: "category", label: "category", kind: "text", aliases: ["category", "categories", "group", "product group", "department", "type"] },
  { key: "subcategory", label: "subcategory", kind: "text", aliases: ["subcategory", "sub category", "subgroup", "sub group", "class", "subclass", "product line"] },
  { key: "sku", label: "sku", kind: "text", aliases: ["sku", "stock keeping unit", "sku id", "item code", "product ref", "reference", "code"] },
  { key: "barcode", label: "barcode", kind: "text", aliases: ["barcode", "bar code", "bar", "ean", "ean13", "ean 13", "upc", "gtin", "gtin13", "scan code"] },
  { key: "batchNumber", label: "batch number", kind: "text", aliases: ["batch", "batch number", "batch no", "lot", "lot number", "lot no"] },
  { key: "brand", label: "brand", kind: "text", aliases: ["brand", "brand name", "manufacturer", "make"] },
  { key: "productCode", label: "product code", kind: "text", aliases: ["product code", "productcode", "code number", "catalogue no", "cat no"] },
  { key: "cost", label: "cost", kind: "money", aliases: ["cost", "cost price", "cost naira", "purchase price", "buy price", "unit cost", "wholesale", "costprice"] },
  { key: "price", label: "price", kind: "money", aliases: ["price", "selling price", "sale price", "unit price", "retail", "retail price", "sell price", "price naira", "amount", "pricenaira"] },
  { key: "onHand", label: "on hand", kind: "number", aliases: ["on hand", "onhand", "stock", "stock qty", "quantity", "qty", "quantity on hand", "in stock", "available", "qoh", "units on hand", "balance", "count"] },
  { key: "reorderLevel", label: "reorder level", kind: "number", aliases: ["reorder level", "reorderlevel", "reorder point", "min stock", "minimum stock", "reorder qty", "restock level", "threshold", "min quantity", "min level"] },
  { key: "unit", label: "unit", kind: "text", aliases: ["unit", "unit of measure", "uom", "measure"] },
  { key: "unitLabel", label: "unit label", kind: "text", aliases: ["unit label", "label unit", "unit name", "uom label"] },
  { key: "packSize", label: "pack size", kind: "number", aliases: ["pack size", "packsize", "pack", "units per pack", "pieces per pack", "pack qty", "cartons"] },
  { key: "description", label: "description", kind: "text", aliases: ["description", "desc", "notes", "detail", "details", "product description", "comment"] },
  { key: "active", label: "active", kind: "boolean", aliases: ["active", "status", "enabled"] },
  { key: "expiresAt", label: "expiry date", kind: "date", aliases: ["expiry date", "expires at", "expires", "expiration", "expiration date", "expiry", "exp date", "use by", "best before"] },
  { key: "trackBatches", label: "track batches", kind: "boolean", aliases: ["track batches", "track batch", "batched", "batch tracking", "serialized"] },
  { key: "baseId", label: "base id", kind: "id", aliases: ["base id", "base product", "parent id", "parent", "variation of"] },
  { key: "id", label: "id", kind: "id", aliases: ["id", "product id", "item id", "internal id"] },
];

export type HeaderMatch = { header: string; field: ImportField | null; blank: boolean };

export type ImportProductRow = {
  index: number;
  id: string;
  name: string;
  category: string;
  subcategory: string;
  sku: string;
  barcode: string;
  batchNumber: string;
  brand: string;
  productCode: string;
  cost: string;
  costMinor: number;
  price: string;
  priceMinor: number;
  onHand: string;
  onHandNum: number;
  reorder: string;
  reorderNum: number;
  unit: string;
  unitLabel: string;
  packSize: string;
  packNum: number;
  description: string;
  expiresAt: string;
  expiresIso: string;
  active: boolean;
  trackBatches: boolean;
  baseId: string;
  errors: string[];
};

export type ParseOptions = {
  defaultCategory?: string;
  defaultUnit?: string;
  defaultReorder?: number;
  defaultActive?: boolean;
};

export type ParseResult = {
  headers: string[];
  headerMappings: HeaderMatch[];
  unknownHeaders: string[];
  rows: ImportProductRow[];
  parsed: boolean;
  notice?: string;
};

export type CatalogIndex = {
  ids: Set<string>;
  skus: Set<string>;
  barcodes: Set<string>;
  byName: Map<string, string>;
};

export function normalizeHeader(text: string) {
  return text
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/^\s+|\s+$/g, "");
}

export function csvCell(text: string) {
  if (!/[",\n\r]/.test(text) && text.trim() === text) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

export function parseCsv(text: string) {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < normalized.length; i += 1) {
    const ch = normalized[i];
    if (inQuotes) {
      if (ch === '"') {
        if (normalized[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  return rows;
}

export function fieldForHeader(header: string) {
  const norm = normalizeHeader(header);
  if (!norm) return null;
  return CSV_FIELDS.find((field) => field.aliases.includes(norm)) ?? undefined;
}

export function moneyToMinor(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return { value: 0, ok: true };
  const cleaned = trimmed.replace(/[^0-9.\-]/g, "");
  if (!/^[0-9]*\.?[0-9]+$/.test(cleaned)) return { value: 0, ok: false };
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return { value: 0, ok: false };
  return { value: Math.round(n * 100), ok: true };
}

export function textNumber(text: string, fallback: number) {
  const trimmed = text.trim();
  if (!trimmed) return { value: fallback, ok: true };
  const n = Number(trimmed.replace(/,/g, ""));
  if (!Number.isFinite(n)) return { value: fallback, ok: false };
  const v = n < 0 ? 0 : n;
  return { value: Math.round(v * 100) / 100, ok: true };
}

export function textBoolean(text: string): boolean | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  if (["true", "1", "yes", "y", "on", "active", "enabled", "available", "in stock", "in"].includes(t)) return true;
  if (["false", "0", "no", "n", "off", "inactive", "disabled", "unavailable", "out of stock", "out"].includes(t)) return false;
  return null;
}

function toIsoDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function textDate(text: string) {
  const t = text.trim();
  if (!t) return { value: "", ok: true };
  const normal = new Date(t);
  if (!Number.isNaN(normal.getTime())) return { value: toIsoDate(normal), ok: true };
  const explicit = t.match(/^(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{2,4})$/);
  if (explicit) {
    let year = Number(explicit[3]);
    if (year < 100) year += 2000;
    const date = new Date(year, Number(explicit[2]) - 1, Number(explicit[1]));
    if (!Number.isNaN(date.getTime())) return { value: toIsoDate(date), ok: true };
  }
  return { value: "", ok: false };
}

export function CSV_TEMPLATE() {
  const headers = CSV_FIELDS.map((field) => field.label);
  const sampleRows = [
    [
      "Paracetamol 500mg",
      "Pharmacy",
      "Tablets",
      "PARA-500",
      "8901234500001",
      "",
      "Hela Labs",
      "",
      "250",
      "500",
      "120",
      "20",
      "pack",
      "Pack of 10",
      "10",
      "Pain relief tablets, 500mg",
      "yes",
      "2026-12-31",
      "",
      "",
      "",
    ],
    [
      "PureGro Sachet Water 50cl",
      "Store",
      "Beverages",
      "PG-50CL",
      "8901234500002",
      "",
      "PureGro",
      "",
      "35.5",
      "100",
      "400",
      "100",
      "pack",
      "",
      "20",
      "50cl sachet drinking water",
      "yes",
      "",
      "",
      "",
      "",
    ],
  ];
  const lines = [headers.join(","), ...sampleRows.map((row) => row.map(csvCell).join(","))];
  return lines.join("\n");
}

export function sampleCsvText() {
  return CSV_TEMPLATE();
}

export function downloadTextFile(filename: string, text: string, mime = "text/csv") {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function parseImportCsv(text: string, opts: ParseOptions = {}): ParseResult {
  const defaultCategory = opts.defaultCategory?.trim() || "General";
  const defaultUnit = opts.defaultUnit?.trim() || "each";
  const defaultReorder = typeof opts.defaultReorder === "number" ? opts.defaultReorder : 5;
  const defaultActive = opts.defaultActive ?? true;

  const csv = parseCsv(text);
  if (!csv.length) return { headers: [], headerMappings: [], unknownHeaders: [], rows: [], parsed: false, notice: "No rows found. Paste CSV data or choose a file." };

  const headers = csv[0]!;
  const headerMappings: HeaderMatch[] = headers.map((header) => {
    const field = fieldForHeader(header);
    return { header, field: field ?? null, blank: field === null && normalizeHeader(header) === "" };
  });
  const unknownHeaders = headerMappings
    .filter((match) => match.field === null && !match.blank)
    .map((match) => match.header.trim());

  const dataRows = csv.slice(1);
  const seenSku = new Map<string, number>();
  const seenBarcode = new Map<string, number>();
  const seenId = new Map<string, number>();

  const fieldOf = (key: string) => headerMappings.findIndex((match) => match.field?.key === key);

  const cellAt = (row: string[], key: string) => {
    const idx = fieldOf(key);
    if (idx === -1) return "";
    const cell = row[idx];
    return typeof cell === "string" ? cell.trim() : String(cell ?? "").trim();
  };

  const rows: ImportProductRow[] = dataRows.map((cells, rowIndex) => {
    const index = rowIndex + 2;
    const errors: string[] = [];

    const name = cellAt(cells, "name");
    if (!name) errors.push("Missing product name");

    const category = cellAt(cells, "category") || defaultCategory;
    const subcategory = cellAt(cells, "subcategory");
    const sku = cellAt(cells, "sku");
    const barcode = cellAt(cells, "barcode");
    const batchNumber = cellAt(cells, "batchNumber");
    const brand = cellAt(cells, "brand");
    const productCode = cellAt(cells, "productCode");
    const baseId = cellAt(cells, "baseId");
    const id = cellAt(cells, "id");
    const unit = cellAt(cells, "unit") || defaultUnit;
    const unitLabel = cellAt(cells, "unitLabel");
    const description = cellAt(cells, "description");
    const rawCost = cellAt(cells, "cost");
    const rawPrice = cellAt(cells, "price");
    const rawOnHand = cellAt(cells, "onHand");
    const rawReorder = cellAt(cells, "reorderLevel");
    const rawPack = cellAt(cells, "packSize");
    const rawExpiry = cellAt(cells, "expiresAt");

    const cost = rawCost ? moneyToMinor(rawCost) : { value: 0, ok: true };
    const price = rawPrice ? moneyToMinor(rawPrice) : { value: 0, ok: true };
    const onHand = textNumber(rawOnHand, 0);
    const reorder = textNumber(rawReorder, defaultReorder);
    const pack = textNumber(rawPack, 1);
    const expiry = textDate(rawExpiry);

    if (rawCost && !cost.ok) errors.push("Invalid cost");
    if (rawPrice && !price.ok) errors.push("Invalid price");
    if (rawOnHand && !onHand.ok) errors.push("Invalid on-hand quantity");
    if (rawReorder && !reorder.ok) errors.push("Invalid reorder level");
    if (rawPack && !pack.ok) errors.push("Invalid pack size");
    if (rawExpiry && !expiry.ok) errors.push("Invalid expiry date");

    const activeRaw = cellAt(cells, "active");
    const trackRaw = cellAt(cells, "trackBatches");
    const activeBool = activeRaw ? textBoolean(activeRaw) : null;
    const trackBool = trackRaw ? textBoolean(trackRaw) : null;
    if (activeRaw && activeBool === null) errors.push("Invalid active value (use yes/no or 1/0)");
    if (trackRaw && trackBool === null) errors.push("Invalid track-batches value");

    const active = activeBool ?? defaultActive;
    const trackBatches = trackBool ?? false;

    if (sku) {
      const prior = seenSku.get(sku.toLowerCase());
      if (prior) errors.push(`Duplicate SKU (also row ${prior})`);
      else seenSku.set(sku.toLowerCase(), index);
    }
    if (barcode) {
      const prior = seenBarcode.get(barcode.toLowerCase());
      if (prior) errors.push(`Duplicate barcode (also row ${prior})`);
      else seenBarcode.set(barcode.toLowerCase(), index);
    }
    if (id) {
      const prior = seenId.get(id.toLowerCase());
      if (prior) errors.push(`Duplicate ID (also row ${prior})`);
      else seenId.set(id.toLowerCase(), index);
    }
    if (!id && !sku && !barcode) {
      errors.push("No SKU or barcode — will be added as a new product");
    }

    return {
      index,
      id,
      name,
      category,
      subcategory,
      sku,
      barcode,
      batchNumber,
      brand,
      productCode,
      cost: rawCost,
      costMinor: cost.value,
      price: rawPrice,
      priceMinor: price.value,
      onHand: rawOnHand,
      onHandNum: onHand.value,
      reorder: rawReorder,
      reorderNum: reorder.value,
      unit,
      unitLabel,
      packSize: rawPack,
      packNum: pack.value,
      description,
      expiresAt: rawExpiry,
      expiresIso: expiry.value,
      active,
      trackBatches,
      baseId,
      errors,
    };
  });

  return { headers, headerMappings, unknownHeaders, rows, parsed: true };
}

export function buildCatalogIndex(items: Array<{ id: string; sku?: string; barcode?: string; name: string }>) {
  const index: CatalogIndex = { ids: new Set(), skus: new Set(), barcodes: new Set(), byName: new Map() };
  for (const item of items) {
    index.ids.add(item.id.toLowerCase());
    if (item.sku) index.skus.add(item.sku.toLowerCase());
    if (item.barcode) index.barcodes.add(item.barcode.toLowerCase());
    index.byName.set(item.name.trim().toLowerCase(), item.id);
  }
  return index;
}

export function rowKind(row: ImportProductRow, index: CatalogIndex): "new" | "update" {
  if (row.id && index.ids.has(row.id.toLowerCase())) return "update";
  if (row.sku && index.skus.has(row.sku.toLowerCase())) return "update";
  if (row.barcode && index.barcodes.has(row.barcode.toLowerCase())) return "update";
  return "new";
}

export function toApiRows(rows: ImportProductRow[]) {
  return rows.map((row) => ({
    id: row.id || undefined,
    name: row.name,
    category: row.category,
    subcategory: row.subcategory || undefined,
    sku: row.sku || undefined,
    barcode: row.barcode || undefined,
    batchNumber: row.batchNumber || undefined,
    brand: row.brand || undefined,
    productCode: row.productCode || undefined,
    trackBatches: row.trackBatches,
    baseId: row.baseId || undefined,
    costMinor: row.costMinor,
    priceMinor: row.priceMinor,
    onHand: row.onHandNum,
    reorderLevel: row.reorderNum,
    unit: row.unit,
    unitLabel: row.unitLabel || undefined,
    packSize: row.packNum,
    description: row.description || undefined,
    active: row.active,
    expiresAt: row.expiresIso || "",
  }));
}

export function nairaMinor(minor: number) {
  return `₦${(minor / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export type ImportSummary = {
  total: number;
  valid: number;
  errors: number;
  create: number;
  update: number;
  ready: number;
};

export function summarizeRows(rows: ImportProductRow[], index: CatalogIndex): ImportSummary {
  let valid = 0;
  let errors = 0;
  let create = 0;
  let update = 0;
  for (const row of rows) {
    if (row.errors.length) errors += 1;
    else valid += 1;
    const kind = rowKind(row, index);
    if (kind === "update") update += 1;
    else create += 1;
  }
  return { total: rows.length, valid, errors, create, update, ready: valid };
}