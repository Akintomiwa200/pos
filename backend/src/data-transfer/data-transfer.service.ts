import { BadRequestException, Injectable } from "@nestjs/common";
import { CatalogService, type CatalogRow } from "../catalog/catalog.service";
import { InventoryService } from "../inventory/inventory.service";
import { SalesService } from "../sales/sales.service";
import { StaffService } from "../staff/staff.service";
import { ComboService } from "../combos/combo.service";
import { SetupService } from "../console/setup.service";
import { CrmService } from "../crm/crm.service";
import { CustomersService } from "../customers/customers.service";
import { DirectoryService } from "../directory/directory.service";
import { DirectoryName } from "../directory/directory.types";
import { ExpensesService } from "../expenses/expenses.service";
import { LedgerService } from "../ledger/ledger.service";
import { OrdersService } from "../orders/orders.service";
import type { DocLine } from "../orders/orders.types";
import { ProductionService } from "../production/production.service";
import type { ComboComponent } from "../combos/combo.types";

type Row = Record<string, unknown>;

type Handler = {
  keys: readonly string[];
  list: () => unknown[] | Promise<unknown[]>;
  save?: (row: Row) => unknown | Promise<unknown>;
  bulk?: (rows: Row[]) => { created: number; updated: number } | Promise<{ created: number; updated: number }>;
  /** Last chance to fill required fields on a row coming from a flat file. */
  prepare?: (row: Row) => Row;
  /** Row-level validation that is reported without aborting the whole import. */
  validate?: (row: Row) => string | undefined;
  defaults?: () => Row;
  label?: string;
};

function numeric(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function splitPacked(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((row) => String(row).trim()).filter(Boolean);
  if (typeof value !== "string") return [];
  return value
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseDocLine(value: unknown): DocLine | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const row = value as Row;
    const name = String(row.name ?? row.itemName ?? "").trim();
    if (!name && !String(row.itemId ?? "").trim()) return null;
    return {
      itemId: String(row.itemId ?? "").trim(),
      name: name || String(row.itemId).trim(),
      quantity: Math.max(1, Math.round(numeric(row.quantity, 1))),
      unitPriceMinor: Math.max(0, Math.round(numeric(row.unitPriceMinor ?? row.priceMinor, 0))),
      receivedQty: Math.max(0, Math.round(numeric(row.receivedQty, 0))),
    };
  }
  const parts = String(value ?? "").split("|").map((part) => part.trim());
  const name = parts[0] ?? "";
  if (!name) return null;
  return {
    itemId: /^[A-Za-z0-9_-]+$/.test(name) ? name : "",
    name,
    quantity: Math.max(1, Math.round(numeric(parts[1], 1))),
    unitPriceMinor: Math.max(0, Math.round(numeric(parts[2], 0))),
  };
}

function parseComboComponent(value: unknown): ComboComponent | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const row = value as Row;
    const itemId = String(row.itemId ?? row.id ?? "").trim();
    return itemId ? { itemId, quantity: Math.max(1, Math.round(numeric(row.quantity, 1))) } : null;
  }
  const [itemId, quantity] = String(value ?? "")
    .split(":")
    .map((part) => part.trim());
  return itemId ? { itemId, quantity: Math.max(1, Math.round(numeric(quantity, 1))) } : null;
}

export type TransferImportResult = {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{ row: number; label: string; message: string }>;
};

@Injectable()
export class DataTransferService {
  private readonly handlers: Record<string, Handler>;

  constructor(
    private readonly catalog: CatalogService,
    private readonly combos: ComboService,
    private readonly setup: SetupService,
    private readonly crm: CrmService,
    private readonly customers: CustomersService,
    private readonly directory: DirectoryService,
    private readonly expenses: ExpensesService,
    private readonly ledger: LedgerService,
    private readonly orders: OrdersService,
    private readonly production: ProductionService,
    private readonly staff: StaffService,
    private readonly sales: SalesService,
    private readonly inventory: InventoryService,
  ) {
    this.handlers = {
      products: {
        label: "name",
        keys: [
          "id", "name", "category", "subcategory", "sku", "barcode", "batchNumber", "brand",
          "productCode", "costMinor", "priceMinor", "branchPrices", "onHand", "reorderLevel", "unit", "unitLabel",
          "packSize", "description", "active", "taxPercent", "expiresAt", "trackBatches", "baseId", "image",
        ],
        list: () => this.catalog.list(),
        bulk: (rows) => this.catalog.upsertMany(rows as CatalogRow[]),
        validate: (row) => (String(row.name ?? "").trim() ? undefined : "Name is required"),
      },
      "loyalty-members": {
        label: "name",
        keys: ["id", "customerId", "name", "phone", "email", "cardNumber", "points", "registeredAt", "active"],
        list: () => this.customers.listLoyaltyMembers(),
        save: (row) => this.customers.saveLoyaltyMember(row),
      },
      "customer-groups": {
        label: "name",
        keys: ["id", "name", "note", "active"],
        list: () => this.customers.listCustomerGroups(),
        save: (row) => this.customers.saveCustomerGroup(row),
      },
      "gift-cards": {
        label: "code",
        keys: ["id", "code", "balanceMinor", "initialMinor", "customerId", "customerName", "batchId", "expiresAt", "active"],
        list: () => this.customers.listGiftCards(),
        save: (row) => this.customers.saveGiftCard(row),
      },
      expenses: {
        label: "description",
        keys: ["id", "at", "account", "description", "amountMinor", "method", "staff"],
        list: () => this.expenses.list(),
        save: (row) => this.expenses.save(row),
        defaults: () => ({ at: new Date().toISOString(), account: "General", method: "cash", amountMinor: 0 }),
      },
      orders: {
        label: "party",
        keys: [
          "id", "kind", "number", "party", "at", "expectedAt", "status", "totalMinor", "lines", "notes",
          "createdBy", "submittedAt", "approvedAt", "approvedBy", "rejectedAt", "rejectedBy",
          "rejectionReason", "receivedAt",
        ],
        list: () => this.orders.list(),
        save: (row) => this.orders.save(row),
        prepare: (row) => {
          const lines = splitPacked(row.lines)
            .map(parseDocLine)
            .filter((line): line is DocLine => !!line);
          const explicitTotal = Math.max(0, Math.round(numeric(row.totalMinor, 0)));
          const resolvedLines = lines.length
            ? lines
            : explicitTotal > 0
              ? [{ itemId: "", name: "Imported total", quantity: 1, unitPriceMinor: explicitTotal }]
              : [];
          return {
            ...row,
            at: String(row.at || new Date().toISOString()),
            lines: resolvedLines,
            totalMinor: resolvedLines.reduce(
              (sum, line) => sum + line.quantity * line.unitPriceMinor,
              0,
            ),
          };
        },
        validate: (row) =>
          Array.isArray(row.lines) && row.lines.length > 0
            ? undefined
            : "Add at least one line (name|qty|price-minor) or a total",
        defaults: () => ({ kind: "purchase-order", status: "draft" }),
      },
      combos: {
        label: "name",
        keys: ["id", "name", "description", "priceMinor", "components", "active"],
        list: () => this.combos.list(),
        save: (row) => {
          const id = String(row.id ?? "").trim();
          return id
            ? this.combos.update(id, row) ?? this.combos.create(row)
            : this.combos.create(row);
        },
        prepare: (row) => ({
          ...row,
          components: splitPacked(row.components)
            .map(parseComboComponent)
            .filter((component): component is ComboComponent => !!component),
        }),
        validate: (row) =>
          Array.isArray(row.components) && row.components.length > 0
            ? undefined
            : "Add at least one component (item-id:qty)",
      },
      "ledger-accounts": {
        label: "name",
        keys: ["id", "code", "name", "kind", "openingMinor", "active", "group"],
        list: () => this.ledger.listAccounts(),
        save: (row) => this.ledger.saveAccount(row),
        defaults: () => ({ kind: "asset", openingMinor: 0, active: true, group: "General" }),
      },
      "crm-contacts": {
        label: "name",
        keys: ["id", "name", "company", "email", "phone", "stage", "owner", "tags", "customerId", "note"],
        list: () => this.crm.listContacts(),
        save: (row) => this.crm.saveContact(row),
        defaults: () => ({ stage: "lead" }),
      },
      "crm-deals": {
        label: "title",
        keys: ["id", "title", "contactId", "contactName", "stage", "amountMinor", "closeDate", "owner", "note"],
        list: () => this.crm.listDeals(),
        save: (row) => this.crm.saveDeal(row),
        defaults: () => ({ stage: "qualification", amountMinor: 0 }),
      },
      "crm-tickets": {
        label: "subject",
        keys: ["id", "subject", "body", "contactId", "contactName", "status", "priority", "assignee"],
        list: () => this.crm.listTickets(),
        save: (row) => this.crm.saveTicket(row),
        defaults: () => ({ status: "open", priority: "medium", body: "" }),
      },
      "production-batches": {
        label: "productName",
        keys: ["id", "number", "productId", "productName", "plannedUnits", "producedUnits", "status", "startedAt", "completedAt", "staff", "line", "notes", "unitCostMinor"],
        list: () => this.production.listBatches(),
        save: (row) => this.production.saveBatch(row),
        defaults: () => ({ status: "planned", plannedUnits: 0, producedUnits: 0, startedAt: new Date().toISOString() }),
      },
      branches: {
        label: "name",
        keys: ["id", "name", "city", "state", "address", "phone", "manager", "active"],
        list: () => this.setup.listBranches(),
        save: (row) => this.setup.saveBranch(row),
      },
      taxes: {
        label: "name",
        keys: ["id", "name", "ratePercent", "inclusive", "compound", "active", "isDefault"],
        list: () => this.setup.listTaxes(),
        save: (row) => this.setup.saveTax(row),
        defaults: () => ({ ratePercent: 0, inclusive: true, compound: false, active: true, isDefault: false }),
      },
      storefronts: {
        label: "name",
        keys: ["id", "storeId", "name", "url", "hours", "enabled", "syncPrices", "syncStock"],
        list: () => this.setup.listStorefronts(),
        save: (row) => this.setup.saveStorefront(row),
        defaults: () => ({ storeId: this.setup.listStores()[0]?.id ?? "", enabled: false, syncPrices: true, syncStock: true }),
      },
      "directory-customers": {
        label: "name",
        keys: ["id", "name", "phone", "email", "address", "note", "active"],
        list: () => this.directory.list("customers" as DirectoryName),
        save: (row) => this.directory.save("customers" as DirectoryName, row),
      },
      staff: {
        label: "name",
        keys: ["id", "name", "username", "email", "role", "roleName", "posLogin", "hasPin"],
        list: () => this.staff.list(),
      },
      sales: {
        label: "ticketId",
        keys: ["id", "ticketId", "paidAt", "customerName", "totalMinor", "tender", "storeName"],
        list: () => this.sales.list(),
      },
      inventory: {
        label: "name",
        keys: ["itemId", "name", "category", "sku", "barcode", "onHand", "reorderPoint", "unit", "unitLabel", "packSize"],
        list: () => this.inventory.levels(),
      },
    };
  }

  async datasets() {
    return Promise.all(
      Object.entries(this.handlers).map(async ([id, handler]) => ({
        id,
        count: (await handler.list()).length,
        importable: typeof handler.save === "function" || typeof handler.bulk === "function",
      })),
    );
  }

  async importRows(dataset: string, rawRows: unknown, mode: "update" | "skip" = "update"): Promise<TransferImportResult> {
    const handler = this.handlers[dataset];
    if (!handler) throw new BadRequestException(`Unknown dataset: ${dataset}`);
    if (!handler.save && !handler.bulk) throw new BadRequestException(`${dataset} is read-only`);
    if (!Array.isArray(rawRows)) throw new BadRequestException("Rows must be an array");
    if (rawRows.length > 5000) throw new BadRequestException("A batch can contain at most 5000 rows");

    const allowed = new Set(handler.keys);
    const rows = rawRows
      .filter((row): row is Row => !!row && typeof row === "object" && !Array.isArray(row))
      .map((row) =>
        Object.fromEntries(
          Object.entries(row)
            .filter(([key, value]) => allowed.has(key) && value !== "" && value !== null && value !== undefined)
            .map(([key, value]) => [key, typeof value === "string" ? value.trim() : value]),
        ),
      )
      .map((row) => (handler.prepare ? handler.prepare(row) : row))
      .filter((row) => Object.keys(row).length > 0);

    if (!rows.length) throw new BadRequestException("No usable rows found");

    if (handler.bulk) {
      const labelKey = handler.label ?? "name";
      const accepted: Row[] = [];
      const errors: TransferImportResult["errors"] = [];
      let skipped = 0;
      const known = new Set<string>();
      if (mode === "skip") {
        for (const row of await handler.list()) {
          const stored = row as Row;
          for (const key of [stored.id, stored.sku, stored.barcode]) {
            const value = String(key ?? "").trim().toLowerCase();
            if (value) known.add(value);
          }
        }
      }
      for (const [index, row] of rows.entries()) {
        const label = String(row[labelKey] ?? `Row ${index + 2}`);
        const problem = handler.validate?.(row);
        if (problem) {
          errors.push({ row: index + 2, label, message: problem });
          continue;
        }
        if (mode === "skip") {
          const keys = [row.id, row.sku, row.barcode]
            .map((key) => String(key ?? "").trim().toLowerCase())
            .filter(Boolean);
          if (keys.some((key) => known.has(key))) {
            skipped += 1;
            continue;
          }
          keys.forEach((key) => known.add(key));
        }
        accepted.push(row);
      }
      if (!accepted.length) {
        return { created: 0, updated: 0, skipped, failed: errors.length, errors };
      }
      const result = await handler.bulk(accepted);
      return { created: result.created, updated: result.updated, skipped, failed: errors.length, errors };
    }

    const existing = await handler.list();
    const ids = new Set(
      existing
        .map((row) => String((row as Row).id ?? "").trim().toLowerCase())
        .filter(Boolean),
    );

    const result: TransferImportResult = { created: 0, updated: 0, skipped: 0, failed: 0, errors: [] };
    for (const [index, row] of rows.entries()) {
      const labelKey = handler.label ?? "name";
      const label = String(row[labelKey] ?? `Row ${index + 2}`);
      const validationError = handler.validate?.(row);
      if (validationError) {
        result.failed += 1;
        result.errors.push({ row: index + 2, label, message: validationError });
        continue;
      }
      const id = String(row.id ?? "").trim().toLowerCase();
      if (id && ids.has(id) && mode === "skip") {
        result.skipped += 1;
        continue;
      }
      const updating = Boolean(id && ids.has(id));
      try {
        await handler.save!({ ...(handler.defaults?.() ?? {}), ...row });
        if (updating) result.updated += 1;
        else result.created += 1;
        if (id) ids.add(id);
      } catch (error) {
        result.failed += 1;
        result.errors.push({
          row: index + 2,
          label,
          message: error instanceof Error ? error.message : "Could not save this row",
        });
      }
    }
    return result;
  }
}
