import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { DbService } from "../db/db.service";
import {
  SEED_BRANCHES,
  SEED_COMPANY,
  SEED_GATEWAYS,
  SEED_SETTINGS,
  SEED_STOREFRONTS,
  SEED_STORES,
  SEED_TAXES,
  type HqBranch,
  type HqCompany,
  type HqGateway,
  type HqOrgSettings,
  type HqOrgSnapshot,
  type HqStore,
  type HqStorefront,
  type HqTax,
  type StoreKind,
} from "./setup.types";

function nid(prefix: string) {
  return `${prefix}-${randomBytes(4).toString("hex")}`;
}

@Injectable()
export class SetupService implements OnModuleInit {
  private company: HqCompany = SEED_COMPANY;
  private branches: HqBranch[] = [];
  private stores: HqStore[] = [];
  private storefronts: HqStorefront[] = [];
  private gateways: HqGateway[] = [];
  private taxes: HqTax[] = [];
  private settings: HqOrgSettings = SEED_SETTINGS;

  constructor(private readonly db: DbService) {}

  async onModuleInit() {
    const rows = await this.db.query<{ key: string; data: unknown }>(
      `select key, data from hq_org_kv`,
    );
    const stored = new Map(rows.rows.map((row) => [row.key, row.data]));
    this.company = this.pick<HqCompany>(stored, "company", SEED_COMPANY);
    this.branches = this.pick<HqBranch[]>(stored, "branches", SEED_BRANCHES);
    this.stores = this.pick<HqStore[]>(stored, "stores", SEED_STORES);
    this.storefronts = this.pick<HqStorefront[]>(stored, "storefronts", SEED_STOREFRONTS);
    this.gateways = this.pick<HqGateway[]>(stored, "gateways", SEED_GATEWAYS);
    this.taxes = this.pick<HqTax[]>(stored, "taxes", SEED_TAXES);
    this.settings = {
      ...SEED_SETTINGS,
      ...this.pick<HqOrgSettings>(stored, "settings", SEED_SETTINGS),
    };
    await this.persist();
  }

  private pick<T>(stored: Map<string, unknown>, key: string, fallback: T): T {
    const value = stored.get(key);
    return (value === undefined || value === null ? fallback : value) as T;
  }

  private async persist() {
    const entries: Array<[string, unknown]> = [
      ["company", this.company],
      ["branches", this.branches],
      ["stores", this.stores],
      ["storefronts", this.storefronts],
      ["gateways", this.gateways],
      ["taxes", this.taxes],
      ["settings", this.settings],
    ];
    for (const [key, data] of entries) {
      await this.db.query(
        `insert into hq_org_kv (key, data) values ($1, $2::jsonb)
         on conflict (key) do update set data = excluded.data`,
        [key, JSON.stringify(data)],
      );
    }
  }

  snapshot(): HqOrgSnapshot {
    return {
      company: this.company,
      branches: this.branches,
      stores: this.stores,
      storefronts: this.storefronts,
      gateways: this.gateways.map((row) => ({ ...row, publicKey: row.publicKey ? "••••" : "" })),
      taxes: this.taxes,
      settings: this.settings,
    };
  }

  getCompany() {
    return this.company;
  }

  async saveCompany(input: Partial<HqCompany>) {
    const name = input.name?.trim();
    if (!name) throw new BadRequestException("Company name is required");
    this.company = {
      ...this.company,
      ...input,
      id: this.company.id,
      name,
      legalName: input.legalName?.trim() ?? this.company.legalName,
      rc: input.rc?.trim() ?? this.company.rc,
      tin: input.tin?.trim() ?? this.company.tin,
      email: input.email?.trim() ?? this.company.email,
      phone: input.phone?.trim() ?? this.company.phone,
      address: input.address?.trim() ?? this.company.address,
      state: input.state?.trim() ?? this.company.state,
      country: input.country?.trim() ?? this.company.country,
      currency: input.currency?.trim() || this.company.currency,
    };
    await this.persist();
    return this.company;
  }

  listBranches() {
    return this.branches;
  }

  async saveBranch(input: Partial<HqBranch>) {
    const name = input.name?.trim();
    if (!name) throw new BadRequestException("Branch name is required");
    const existing = input.id ? this.branches.find((row) => row.id === input.id) : undefined;
    const next: HqBranch = {
      id: existing?.id ?? nid("br"),
      companyId: input.companyId || existing?.companyId || this.company.id,
      name,
      city: input.city?.trim() || existing?.city || "",
      state: input.state?.trim() || existing?.state || this.company.state,
      address: input.address?.trim() || existing?.address || "",
      phone: input.phone?.trim() || existing?.phone || "",
      manager: input.manager?.trim() || existing?.manager || "",
      active: input.active ?? existing?.active ?? true,
    };
    this.branches = existing
      ? this.branches.map((row) => (row.id === existing.id ? next : row))
      : [...this.branches, next];
    await this.persist();
    return next;
  }

  async deleteBranch(id: string) {
    if (this.stores.some((row) => row.branchId === id)) {
      throw new BadRequestException("Move or delete stores on this branch first");
    }
    if (!this.branches.some((row) => row.id === id)) throw new NotFoundException("Branch not found");
    this.branches = this.branches.filter((row) => row.id !== id);
    await this.persist();
    return { ok: true };
  }

  listStores() {
    return this.stores;
  }

  async saveStore(input: Partial<HqStore>) {
    const name = input.name?.trim();
    if (!name) throw new BadRequestException("Store name is required");
    if (!input.branchId && !this.stores.find((row) => row.id === input.id)?.branchId) {
      throw new BadRequestException("Choose a branch");
    }
    const existing = input.id ? this.stores.find((row) => row.id === input.id) : undefined;
    const kind = (["retail", "warehouse", "dark-kitchen"].includes(input.kind ?? "")
      ? input.kind
      : existing?.kind ?? "retail") as StoreKind;
    const next: HqStore = {
      id: existing?.id ?? nid("st"),
      branchId: input.branchId || existing?.branchId || "",
      name,
      kind,
      address: input.address?.trim() || existing?.address || "",
      active: input.active ?? existing?.active ?? true,
    };
    this.stores = existing
      ? this.stores.map((row) => (row.id === existing.id ? next : row))
      : [...this.stores, next];
    await this.persist();
    return next;
  }

  async deleteStore(id: string) {
    if (this.storefronts.some((row) => row.storeId === id)) {
      throw new BadRequestException("Remove storefronts on this store first");
    }
    if (!this.stores.some((row) => row.id === id)) throw new NotFoundException("Store not found");
    this.stores = this.stores.filter((row) => row.id !== id);
    await this.persist();
    return { ok: true };
  }

  listStorefronts() {
    return this.storefronts;
  }

  async saveStorefront(input: Partial<HqStorefront>) {
    const name = input.name?.trim();
    if (!name) throw new BadRequestException("Storefront name is required");
    const existing = input.id ? this.storefronts.find((row) => row.id === input.id) : undefined;
    const storeId = input.storeId || existing?.storeId || "";
    if (!storeId) throw new BadRequestException("Choose a store");
    const next: HqStorefront = {
      id: existing?.id ?? nid("sf"),
      storeId,
      name,
      url: input.url?.trim() || existing?.url || "",
      hours: input.hours?.trim() || existing?.hours || "",
      enabled: input.enabled ?? existing?.enabled ?? false,
      syncPrices: input.syncPrices ?? existing?.syncPrices ?? true,
      syncStock: input.syncStock ?? existing?.syncStock ?? true,
    };
    this.storefronts = existing
      ? this.storefronts.map((row) => (row.id === existing.id ? next : row))
      : [...this.storefronts, next];
    await this.persist();
    return next;
  }

  async deleteStorefront(id: string) {
    if (!this.storefronts.some((row) => row.id === id)) {
      throw new NotFoundException("Storefront not found");
    }
    this.storefronts = this.storefronts.filter((row) => row.id !== id);
    await this.persist();
    return { ok: true };
  }

  listGateways() {
    return this.gateways;
  }

  async saveGateway(input: Partial<HqGateway>) {
    const name = input.name?.trim();
    if (!name) throw new BadRequestException("Gateway name is required");
    const existing = input.id ? this.gateways.find((row) => row.id === input.id) : undefined;
    const next: HqGateway = {
      id: existing?.id ?? nid("gw"),
      name,
      provider: input.provider || existing?.provider || "paystack",
      enabled: input.enabled ?? existing?.enabled ?? true,
      isDefault: input.isDefault ?? existing?.isDefault ?? false,
      publicKey: input.publicKey?.trim() ?? existing?.publicKey ?? "",
      accountName: input.accountName?.trim() ?? existing?.accountName ?? "",
      accountNumber: input.accountNumber?.trim() ?? existing?.accountNumber ?? "",
      bankName: input.bankName?.trim() ?? existing?.bankName ?? "",
    };
    this.gateways = existing
      ? this.gateways.map((row) => (row.id === existing.id ? next : row))
      : [...this.gateways, next];
    if (next.isDefault) {
      this.gateways = this.gateways.map((row) => ({ ...row, isDefault: row.id === next.id }));
    }
    await this.persist();
    return this.gateways.find((row) => row.id === next.id)!;
  }

  async deleteGateway(id: string) {
    if (!this.gateways.some((row) => row.id === id)) throw new NotFoundException("Gateway not found");
    this.gateways = this.gateways.filter((row) => row.id !== id);
    if (this.gateways.length && !this.gateways.some((row) => row.isDefault)) {
      this.gateways[0] = { ...this.gateways[0]!, isDefault: true };
    }
    await this.persist();
    return { ok: true };
  }

  listTaxes() {
    return this.taxes;
  }

  async saveTax(input: Partial<HqTax>) {
    const name = input.name?.trim();
    if (!name) throw new BadRequestException("Tax name is required");
    const existing = input.id ? this.taxes.find((row) => row.id === input.id) : undefined;
    const rate = Number(input.ratePercent ?? existing?.ratePercent ?? 0);
    if (!Number.isFinite(rate) || rate < 0) throw new BadRequestException("Rate must be zero or more");
    const next: HqTax = {
      id: existing?.id ?? nid("tax"),
      name,
      ratePercent: rate,
      inclusive: input.inclusive ?? existing?.inclusive ?? false,
      compound: input.compound ?? existing?.compound ?? false,
      active: input.active ?? existing?.active ?? true,
      isDefault: input.isDefault ?? existing?.isDefault ?? false,
    };
    this.taxes = existing
      ? this.taxes.map((row) => (row.id === existing.id ? next : row))
      : [...this.taxes, next];
    if (next.isDefault) {
      this.taxes = this.taxes.map((row) => ({ ...row, isDefault: row.id === next.id }));
    }
    await this.persist();
    return this.taxes.find((row) => row.id === next.id)!;
  }

  async deleteTax(id: string) {
    if (!this.taxes.some((row) => row.id === id)) throw new NotFoundException("Tax not found");
    this.taxes = this.taxes.filter((row) => row.id !== id);
    await this.persist();
    return { ok: true };
  }

  getSettings() {
    return this.settings;
  }

  async saveSettings(input: Partial<HqOrgSettings>) {
    this.settings = {
      ...this.settings,
      ...input,
      timezone: input.timezone?.trim() || this.settings.timezone,
      language: input.language?.trim() || this.settings.language,
      currency: input.currency?.trim() || this.settings.currency,
      receiptHeader: input.receiptHeader ?? this.settings.receiptHeader,
      receiptFooter: input.receiptFooter ?? this.settings.receiptFooter,
      receiptPaper: input.receiptPaper === "58mm" ? "58mm" : input.receiptPaper === "80mm" ? "80mm" : this.settings.receiptPaper,
      invoicePrefix: input.invoicePrefix?.trim() || this.settings.invoicePrefix,
    };
    await this.persist();
    return this.settings;
  }

  async counts() {
    let sales = 0;
    try {
      const raw = await readFile(join(process.cwd(), "data", "sales.json"), "utf8");
      const parsed = JSON.parse(raw) as unknown[];
      sales = Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      sales = 0;
    }
    return {
      branches: this.branches.length,
      stores: this.stores.length,
      storefronts: this.storefronts.length,
      tills: 0,
      gateways: this.gateways.length,
      taxes: this.taxes.length,
      sales,
    };
  }

  async exportBundle(kind: string, extra: { tills?: number; catalog?: unknown[]; sales?: unknown[] }) {
    if (kind === "org") return this.snapshot();
    if (kind === "catalog") return extra.catalog ?? [];
    if (kind === "sales") return extra.sales ?? [];
    if (kind === "all") {
      return {
        exportedAt: new Date().toISOString(),
        org: this.snapshot(),
        catalog: extra.catalog ?? [],
        sales: extra.sales ?? [],
      };
    }
    throw new BadRequestException("Unknown export");
  }
}
