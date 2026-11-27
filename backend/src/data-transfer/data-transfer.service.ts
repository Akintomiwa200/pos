import { BadRequestException, Injectable } from "@nestjs/common";
import { CatalogService, type CatalogRow } from "../catalog/catalog.service";
import { ComboService } from "../combos/combo.service";
import { SetupService } from "../console/setup.service";
import { CrmService } from "../crm/crm.service";
import { CustomersService } from "../customers/customers.service";
import { DirectoryService } from "../directory/directory.service";
import { DirectoryName } from "../directory/directory.types";
import { ExpensesService } from "../expenses/expenses.service";
import { LedgerService } from "../ledger/ledger.service";
import { OrdersService } from "../orders/orders.service";
import { ProductionService } from "../production/production.service";

type Row = Record<string, unknown>;

type Handler = {
  keys: readonly string[];
  list: () => unknown[];
  save?: (row: Row) => unknown | Promise<unknown>;
  bulk?: (rows: Row[]) => { created: number; updated: number } | Promise<{ created: number; updated: number }>;
  /** Last chance to fill required fields on a row coming from a flat file. */
  prepare?: (row: Row) => Row;
  defaults?: () => Row;
  label?: string;
};

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
        keys: ["id", "kind", "number", "party", "at", "expectedAt", "status", "notes"],
        list: () => this.orders.list(),
        save: (row) => this.orders.save(row),
        prepare: (row) => {
          const total = typeof row.totalMinor === "number" ? row.totalMinor : 0;
          return {
            ...row,
            at: String(row.at || new Date().toISOString()),
            lines: [{ itemId: "", name: "Imported line", quantity: 1, unitPriceMinor: total }],
          };
        },
        defaults: () => ({ kind: "purchase-order", status: "draft" }),
      },
      combos: {
        label: "name",
        keys: ["id", "name", "description", "priceMinor", "components", "active"],
        list: () => this.combos.list(),
        save: (row) => this.combos.create(row),
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
        list: () => [] as Row[],
        save: (row) => this.directory.save("customers" as DirectoryName, row),
      },
    };
  }

  datasets() {
    return Object.entries(this.handlers).map(([id, handler]) => ({
      id,
      count: handler.list().length,
      importable: typeof handler.save === "function" || typeof handler.bulk === "function",
    }));
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
      const result = await handler.bulk(rows);
      return { created: result.created, updated: result.updated, skipped: 0, failed: 0, errors: [] };
    }

    const ids = new Set(
      handler
        .list()
        .map((row) => String((row as Row).id ?? "").trim().toLowerCase())
        .filter(Boolean),
    );

    const result: TransferImportResult = { created: 0, updated: 0, skipped: 0, failed: 0, errors: [] };
    for (const [index, row] of rows.entries()) {
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
        const labelKey = handler.label ?? "name";
        result.errors.push({
          row: index + 2,
          label: String(row[labelKey] ?? `Row ${index + 2}`),
          message: error instanceof Error ? error.message : "Could not save this row",
        });
      }
    }
    return result;
  }
}
