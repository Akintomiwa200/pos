import { Injectable, NotFoundException } from "@nestjs/common";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  emptyBook,
  type LedgerAccount,
  type LedgerAdvance,
  type LedgerBook,
  type LedgerFixedAsset,
  type LedgerJournalEntry,
  type LedgerPrepaid,
  type StaffTarget,
  type StoreTarget,
} from "./ledger.types";

function gen(type: string) {
  return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function defaultPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

@Injectable()
export class LedgerService {
  private readonly dir = join(process.cwd(), "data");
  private readonly file = join(this.dir, "ledger.json");
  private book: LedgerBook = emptyBook();

  async onModuleInit() {
    try {
      const raw = await readFile(this.file, "utf8");
      const parsed = JSON.parse(raw) as Partial<LedgerBook>;
      this.book = {
        accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
        journalEntries: Array.isArray(parsed.journalEntries) ? parsed.journalEntries : [],
        fixedAssets: Array.isArray(parsed.fixedAssets) ? parsed.fixedAssets : [],
        prepaids: Array.isArray(parsed.prepaids) ? parsed.prepaids : [],
        advances: Array.isArray(parsed.advances) ? parsed.advances : [],
        storeTargets: Array.isArray(parsed.storeTargets) ? parsed.storeTargets : [],
        staffTargets: Array.isArray(parsed.staffTargets) ? parsed.staffTargets : [],
      };
    } catch {
      this.book = emptyBook();
    }
  }

  private async persist() {
    await mkdir(this.dir, { recursive: true });
    await writeFile(this.file, JSON.stringify(this.book, null, 2), "utf8");
  }

  snapshot(): LedgerBook {
    return this.book;
  }

  listAccounts(): LedgerAccount[] {
    return this.book.accounts;
  }

  async saveAccount(input: Partial<LedgerAccount>): Promise<LedgerAccount> {
    const existing = input.id ? this.book.accounts.find((row) => row.id === input.id) : undefined;
    if (!input.name?.trim() && !existing) throw new NotFoundException("Account name is required");
    const next: LedgerAccount = {
      id: existing?.id ?? gen("acct"),
      code: input.code?.trim() ?? existing?.code ?? "",
      name: input.name?.trim() ?? existing?.name ?? "",
      kind:
        input.kind === "asset" ||
        input.kind === "liability" ||
        input.kind === "equity" ||
        input.kind === "income" ||
        input.kind === "expense"
          ? input.kind
          : existing?.kind ?? "asset",
      openingMinor: Math.round(input.openingMinor ?? existing?.openingMinor ?? 0),
      active: input.active ?? existing?.active ?? true,
      group: input.group?.trim() ?? existing?.group ?? "General",
    };
    this.book.accounts = existing
      ? this.book.accounts.map((row) => (row.id === existing.id ? next : row))
      : [next, ...this.book.accounts];
    await this.persist();
    return next;
  }

  async deleteAccount(id: string) {
    const before = this.book.accounts.length;
    this.book.accounts = this.book.accounts.filter((row) => row.id !== id);
    if (this.book.accounts.length === before) throw new NotFoundException("Account not found");
    await this.persist();
  }

  listJournalEntries(): LedgerJournalEntry[] {
    return this.book.journalEntries;
  }

  async saveJournalEntry(input: Partial<LedgerJournalEntry>): Promise<LedgerJournalEntry> {
    const existing = input.id ? this.book.journalEntries.find((row) => row.id === input.id) : undefined;
    if (!input.date && !existing) throw new NotFoundException("Entry date is required");
    const lines = Array.isArray(input.lines)
      ? input.lines.filter(
          (line) => line && (line.accountId || line.accountName) && (line.debitMinor || line.creditMinor),
        )
      : existing?.lines ?? [];
    const next: LedgerJournalEntry = {
      id: existing?.id ?? gen("je"),
      number:
        existing?.number ??
        `JE-${new Date().getFullYear()}-${String(this.book.journalEntries.length + 1).padStart(3, "0")}`,
      date: existing?.date ?? input.date ?? new Date().toISOString().slice(0, 10),
      memo: input.memo?.trim() ?? existing?.memo ?? "",
      lines,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    this.book.journalEntries = existing
      ? this.book.journalEntries.map((row) => (row.id === existing.id ? next : row))
      : [next, ...this.book.journalEntries];
    await this.persist();
    return next;
  }

  async deleteJournalEntry(id: string) {
    const before = this.book.journalEntries.length;
    this.book.journalEntries = this.book.journalEntries.filter((row) => row.id !== id);
    if (this.book.journalEntries.length === before) throw new NotFoundException("Journal entry not found");
    await this.persist();
  }

  listFixedAssets(): LedgerFixedAsset[] {
    return this.book.fixedAssets;
  }

  async saveFixedAsset(input: Partial<LedgerFixedAsset>): Promise<LedgerFixedAsset> {
    const existing = input.id ? this.book.fixedAssets.find((row) => row.id === input.id) : undefined;
    if (!input.name?.trim() && !existing) throw new NotFoundException("Asset name is required");
    const next: LedgerFixedAsset = {
      id: existing?.id ?? gen("fa"),
      name: input.name?.trim() ?? existing?.name ?? "",
      category: input.category?.trim() ?? existing?.category ?? "Equipment",
      costMinor: Math.round(input.costMinor ?? existing?.costMinor ?? 0),
      salvageMinor: Math.round(input.salvageMinor ?? existing?.salvageMinor ?? 0),
      lifeYears: Math.max(1, Number(input.lifeYears ?? existing?.lifeYears ?? 5)),
      acquiredAt: existing?.acquiredAt ?? input.acquiredAt ?? new Date().toISOString().slice(0, 10),
      lastDepreciatedAt: input.lastDepreciatedAt ?? existing?.lastDepreciatedAt,
      note: input.note?.trim() ?? existing?.note,
    };
    this.book.fixedAssets = existing
      ? this.book.fixedAssets.map((row) => (row.id === existing.id ? next : row))
      : [next, ...this.book.fixedAssets];
    await this.persist();
    return next;
  }

  async deleteFixedAsset(id: string) {
    const before = this.book.fixedAssets.length;
    this.book.fixedAssets = this.book.fixedAssets.filter((row) => row.id !== id);
    if (this.book.fixedAssets.length === before) throw new NotFoundException("Fixed asset not found");
    await this.persist();
  }

  listPrepaids(): LedgerPrepaid[] {
    return this.book.prepaids;
  }

  async savePrepaid(input: Partial<LedgerPrepaid>): Promise<LedgerPrepaid> {
    const existing = input.id ? this.book.prepaids.find((row) => row.id === input.id) : undefined;
    if (!input.name?.trim() && !existing) throw new NotFoundException("Prepaid name is required");
    const next: LedgerPrepaid = {
      id: existing?.id ?? gen("pp"),
      name: input.name?.trim() ?? existing?.name ?? "",
      amountMinor: Math.round(input.amountMinor ?? existing?.amountMinor ?? 0),
      startedAt: existing?.startedAt ?? input.startedAt ?? new Date().toISOString().slice(0, 10),
      months: Math.max(1, Number(input.months ?? existing?.months ?? 12)),
      consumedMinor: Math.round(input.consumedMinor ?? existing?.consumedMinor ?? 0),
      note: input.note?.trim() ?? existing?.note,
    };
    this.book.prepaids = existing
      ? this.book.prepaids.map((row) => (row.id === existing.id ? next : row))
      : [next, ...this.book.prepaids];
    await this.persist();
    return next;
  }

  async deletePrepaid(id: string) {
    const before = this.book.prepaids.length;
    this.book.prepaids = this.book.prepaids.filter((row) => row.id !== id);
    if (this.book.prepaids.length === before) throw new NotFoundException("Prepaid not found");
    await this.persist();
  }

  listAdvances(): LedgerAdvance[] {
    return this.book.advances;
  }

  async saveAdvance(input: Partial<LedgerAdvance>): Promise<LedgerAdvance> {
    const existing = input.id ? this.book.advances.find((row) => row.id === input.id) : undefined;
    if (!input.customerName?.trim() && !existing) throw new NotFoundException("Customer name is required");
    const next: LedgerAdvance = {
      id: existing?.id ?? gen("adv"),
      customerId: input.customerId ?? existing?.customerId,
      customerName: input.customerName?.trim() ?? existing?.customerName ?? "",
      amountMinor: Math.round(input.amountMinor ?? existing?.amountMinor ?? 0),
      appliedMinor: Math.round(input.appliedMinor ?? existing?.appliedMinor ?? 0),
      at: existing?.at ?? input.at ?? new Date().toISOString(),
      note: input.note?.trim() ?? existing?.note,
    };
    this.book.advances = existing
      ? this.book.advances.map((row) => (row.id === existing.id ? next : row))
      : [next, ...this.book.advances];
    await this.persist();
    return next;
  }

  async deleteAdvance(id: string) {
    const before = this.book.advances.length;
    this.book.advances = this.book.advances.filter((row) => row.id !== id);
    if (this.book.advances.length === before) throw new NotFoundException("Advance not found");
    await this.persist();
  }

  listStoreTargets(): StoreTarget[] {
    return this.book.storeTargets;
  }

  async saveStoreTarget(input: Partial<StoreTarget>): Promise<StoreTarget> {
    const existing = input.id ? this.book.storeTargets.find((row) => row.id === input.id) : undefined;
    if (!input.storeName?.trim() && !existing) throw new NotFoundException("Store name is required");
    const next: StoreTarget = {
      id: existing?.id ?? gen("stt"),
      period: input.period?.trim() ?? existing?.period ?? defaultPeriod(),
      storeId: input.storeId ?? existing?.storeId ?? "",
      storeName: input.storeName?.trim() ?? existing?.storeName ?? "",
      targetMinor: Math.round(input.targetMinor ?? existing?.targetMinor ?? 0),
    };
    this.book.storeTargets = existing
      ? this.book.storeTargets.map((row) => (row.id === existing.id ? next : row))
      : [next, ...this.book.storeTargets];
    await this.persist();
    return next;
  }

  async deleteStoreTarget(id: string) {
    const before = this.book.storeTargets.length;
    this.book.storeTargets = this.book.storeTargets.filter((row) => row.id !== id);
    if (this.book.storeTargets.length === before) throw new NotFoundException("Store target not found");
    await this.persist();
  }

  listStaffTargets(): StaffTarget[] {
    return this.book.staffTargets;
  }

  async saveStaffTarget(input: Partial<StaffTarget>): Promise<StaffTarget> {
    const existing = input.id ? this.book.staffTargets.find((row) => row.id === input.id) : undefined;
    if (!input.staffName?.trim() && !existing) throw new NotFoundException("Staff name is required");
    const next: StaffTarget = {
      id: existing?.id ?? gen("sft"),
      period: input.period?.trim() ?? existing?.period ?? defaultPeriod(),
      staffId: input.staffId ?? existing?.staffId,
      staffName: input.staffName?.trim() ?? existing?.staffName ?? "",
      targetMinor: Math.round(input.targetMinor ?? existing?.targetMinor ?? 0),
    };
    this.book.staffTargets = existing
      ? this.book.staffTargets.map((row) => (row.id === existing.id ? next : row))
      : [next, ...this.book.staffTargets];
    await this.persist();
    return next;
  }

  async deleteStaffTarget(id: string) {
    const before = this.book.staffTargets.length;
    this.book.staffTargets = this.book.staffTargets.filter((row) => row.id !== id);
    if (this.book.staffTargets.length === before) throw new NotFoundException("Staff target not found");
    await this.persist();
  }
}