import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  SEED_CREDIT_RULES,
  SEED_CREDITS,
  SEED_GIFT_BATCHES,
  SEED_GIFT_CARDS,
  SEED_LOYALTY_CARDS,
  SEED_LOYALTY_MEMBERS,
  SEED_LOYALTY_PROGRAM,
  type CustomerCredit,
  type CustomerCreditRule,
  type GiftCard,
  type GiftCardBatch,
  type LoyaltyCard,
  type LoyaltyMember,
  type LoyaltyProgram,
  type CustomerGroup,
  SEED_CUSTOMER_GROUPS,
} from "./customers.types";

@Injectable()
export class CustomersService implements OnModuleInit {
  private readonly dir = join(process.cwd(), "data");
  private loyaltyProgram: LoyaltyProgram = SEED_LOYALTY_PROGRAM;
  private credits: CustomerCredit[] = [];
  private creditRules: CustomerCreditRule[] = [];
  private loyaltyMembers: LoyaltyMember[] = [];
  private loyaltyCards: LoyaltyCard[] = [];
  private giftCards: GiftCard[] = [];
  private giftBatches: GiftCardBatch[] = [];
  private customerGroups: CustomerGroup[] = [];

  private readonly loyaltyFile = join(this.dir, "hq-customer-loyalty.json");
  private readonly creditsFile = join(this.dir, "hq-customer-credits.json");
  private readonly creditRulesFile = join(this.dir, "hq-customer-credit-rules.json");
  private readonly membersFile = join(this.dir, "hq-customer-loyalty-members.json");
  private readonly cardsFile = join(this.dir, "hq-customer-loyalty-cards.json");
  private readonly giftCardsFile = join(this.dir, "hq-customer-gift-cards.json");
  private readonly giftBatchesFile = join(this.dir, "hq-customer-gift-batches.json");
  private readonly groupsFile = join(this.dir, "hq-customer-groups.json");

  async onModuleInit() {
    await mkdir(this.dir, { recursive: true });
    this.loyaltyProgram = await this.readJson(this.loyaltyFile, SEED_LOYALTY_PROGRAM);
    this.credits = await this.readJson(this.creditsFile, SEED_CREDITS);
    this.creditRules = await this.readJson(this.creditRulesFile, SEED_CREDIT_RULES);
    this.loyaltyMembers = await this.readJson(this.membersFile, SEED_LOYALTY_MEMBERS);
    this.loyaltyCards = await this.readJson(this.cardsFile, SEED_LOYALTY_CARDS);
    this.giftCards = await this.readJson(this.giftCardsFile, SEED_GIFT_CARDS);
    this.giftBatches = await this.readJson(this.giftBatchesFile, SEED_GIFT_BATCHES);
    this.customerGroups = await this.readJson(this.groupsFile, SEED_CUSTOMER_GROUPS);
    await this.persist();
  }

  private async readJson<T>(file: string, fallback: T): Promise<T> {
    try {
      const raw = await readFile(file, "utf8");
      return (JSON.parse(raw) as T) ?? fallback;
    } catch {
      return structuredClone(fallback);
    }
  }

  private async persist() {
    await mkdir(this.dir, { recursive: true });
    await Promise.all([
      writeFile(this.loyaltyFile, JSON.stringify(this.loyaltyProgram, null, 2), "utf8"),
      writeFile(this.creditsFile, JSON.stringify(this.credits, null, 2), "utf8"),
      writeFile(this.creditRulesFile, JSON.stringify(this.creditRules, null, 2), "utf8"),
      writeFile(this.membersFile, JSON.stringify(this.loyaltyMembers, null, 2), "utf8"),
      writeFile(this.cardsFile, JSON.stringify(this.loyaltyCards, null, 2), "utf8"),
      writeFile(this.giftCardsFile, JSON.stringify(this.giftCards, null, 2), "utf8"),
      writeFile(this.giftBatchesFile, JSON.stringify(this.giftBatches, null, 2), "utf8"),
      writeFile(this.groupsFile, JSON.stringify(this.customerGroups, null, 2), "utf8"),
    ]);
  }

  getLoyaltyProgram() {
    return this.loyaltyProgram;
  }

  async saveLoyaltyProgram(input: Partial<LoyaltyProgram>) {
    this.loyaltyProgram = { ...this.loyaltyProgram, ...input };
    await this.persist();
    return this.loyaltyProgram;
  }

  listCredits() {
    return this.credits;
  }

  async saveCredit(input: Partial<CustomerCredit> & { id?: string }) {
    if (!input.customerName?.trim()) {
      throw new BadRequestException("Customer name is required");
    }
    const existing = input.id ? this.credits.find((row) => row.id === input.id) : undefined;
    const next: CustomerCredit = {
      id: existing?.id ?? `cc-${Date.now()}`,
      customerId: input.customerId?.trim() || existing?.customerId || "",
      customerName: input.customerName.trim(),
      limitMinor: Math.max(0, Math.round(input.limitMinor ?? existing?.limitMinor ?? 0)),
      balanceMinor: Math.max(0, Math.round(input.balanceMinor ?? existing?.balanceMinor ?? 0)),
      terms: input.terms?.trim() || existing?.terms || "",
      active: input.active ?? existing?.active ?? true,
    };
    if (existing) {
      this.credits = this.credits.map((row) => (row.id === existing.id ? next : row));
    } else {
      this.credits.push(next);
    }
    await this.persist();
    return next;
  }

  async deleteCredit(id: string) {
    const exists = this.credits.some((row) => row.id === id);
    if (!exists) throw new NotFoundException("Credit account not found");
    this.credits = this.credits.filter((row) => row.id !== id);
    await this.persist();
    return { ok: true };
  }

  listCreditRules() {
    return this.creditRules;
  }

  async saveCreditRule(input: Partial<CustomerCreditRule> & { id?: string }) {
    if (!input.name?.trim()) throw new BadRequestException("Rule name is required");
    const existing = input.id ? this.creditRules.find((row) => row.id === input.id) : undefined;
    const next: CustomerCreditRule = {
      id: existing?.id ?? `cr-${Date.now()}`,
      name: input.name.trim(),
      maxDays: Math.max(0, Math.round(input.maxDays ?? existing?.maxDays ?? 0)),
      maxBalanceMinor: Math.max(0, Math.round(input.maxBalanceMinor ?? existing?.maxBalanceMinor ?? 0)),
      requireApproval: input.requireApproval ?? existing?.requireApproval ?? false,
      note: input.note?.trim() || existing?.note || "",
      active: input.active ?? existing?.active ?? true,
    };
    if (existing) {
      this.creditRules = this.creditRules.map((row) => (row.id === existing.id ? next : row));
    } else {
      this.creditRules.push(next);
    }
    await this.persist();
    return next;
  }

  async deleteCreditRule(id: string) {
    if (!this.creditRules.some((row) => row.id === id)) {
      throw new NotFoundException("Credit rule not found");
    }
    this.creditRules = this.creditRules.filter((row) => row.id !== id);
    await this.persist();
    return { ok: true };
  }

  listLoyaltyMembers() {
    return this.loyaltyMembers;
  }

  async saveLoyaltyMember(input: Partial<LoyaltyMember> & { id?: string }) {
    if (!input.name?.trim() || !input.phone?.trim()) {
      throw new BadRequestException("Name and phone are required");
    }
    const existing = input.id ? this.loyaltyMembers.find((row) => row.id === input.id) : undefined;
    const next: LoyaltyMember = {
      id: existing?.id ?? `lm-${Date.now()}`,
      customerId: input.customerId?.trim() || existing?.customerId,
      name: input.name.trim(),
      phone: input.phone.trim(),
      email: input.email?.trim() || existing?.email,
      cardNumber: input.cardNumber?.trim() || existing?.cardNumber,
      points: Math.max(0, Math.round(input.points ?? existing?.points ?? 0)),
      registeredAt: existing?.registeredAt ?? new Date().toISOString(),
      active: input.active ?? existing?.active ?? true,
    };
    if (existing) {
      this.loyaltyMembers = this.loyaltyMembers.map((row) => (row.id === existing.id ? next : row));
    } else {
      this.loyaltyMembers.push(next);
    }
    await this.persist();
    return next;
  }

  async deleteLoyaltyMember(id: string) {
    if (!this.loyaltyMembers.some((row) => row.id === id)) {
      throw new NotFoundException("Member not found");
    }
    this.loyaltyMembers = this.loyaltyMembers.filter((row) => row.id !== id);
    await this.persist();
    return { ok: true };
  }

  listLoyaltyCards() {
    return this.loyaltyCards;
  }

  async saveLoyaltyCard(input: Partial<LoyaltyCard> & { id?: string }) {
    if (!input.memberName?.trim() || !input.cardNumber?.trim()) {
      throw new BadRequestException("Member and card number are required");
    }
    const existing = input.id ? this.loyaltyCards.find((row) => row.id === input.id) : undefined;
    const next: LoyaltyCard = {
      id: existing?.id ?? `lc-${Date.now()}`,
      memberId: input.memberId?.trim() || existing?.memberId || "",
      memberName: input.memberName.trim(),
      cardNumber: input.cardNumber.trim().toUpperCase(),
      tier: input.tier?.trim() || existing?.tier || "Standard",
      issuedAt: existing?.issuedAt ?? new Date().toISOString(),
      active: input.active ?? existing?.active ?? true,
    };
    if (existing) {
      this.loyaltyCards = this.loyaltyCards.map((row) => (row.id === existing.id ? next : row));
    } else {
      this.loyaltyCards.push(next);
    }
    await this.persist();
    return next;
  }

  async deleteLoyaltyCard(id: string) {
    if (!this.loyaltyCards.some((row) => row.id === id)) {
      throw new NotFoundException("Loyalty card not found");
    }
    this.loyaltyCards = this.loyaltyCards.filter((row) => row.id !== id);
    await this.persist();
    return { ok: true };
  }

  listGiftCards() {
    return this.giftCards;
  }

  async saveGiftCard(input: Partial<GiftCard> & { id?: string }) {
    if (!input.code?.trim()) throw new BadRequestException("Gift card code is required");
    const existing = input.id ? this.giftCards.find((row) => row.id === input.id) : undefined;
    const initial = Math.max(0, Math.round(input.initialMinor ?? existing?.initialMinor ?? 0));
    const next: GiftCard = {
      id: existing?.id ?? `gc-${Date.now()}`,
      code: input.code.trim().toUpperCase(),
      balanceMinor: Math.max(0, Math.round(input.balanceMinor ?? existing?.balanceMinor ?? initial)),
      initialMinor: initial || existing?.initialMinor || 0,
      customerId: input.customerId?.trim() || existing?.customerId,
      customerName: input.customerName?.trim() || existing?.customerName,
      batchId: input.batchId?.trim() || existing?.batchId,
      expiresAt: input.expiresAt || existing?.expiresAt,
      active: input.active ?? existing?.active ?? true,
    };
    if (existing) {
      this.giftCards = this.giftCards.map((row) => (row.id === existing.id ? next : row));
    } else {
      this.giftCards.push(next);
    }
    await this.persist();
    return next;
  }

  async deleteGiftCard(id: string) {
    if (!this.giftCards.some((row) => row.id === id)) {
      throw new NotFoundException("Gift card not found");
    }
    this.giftCards = this.giftCards.filter((row) => row.id !== id);
    await this.persist();
    return { ok: true };
  }

  listGiftBatches() {
    return this.giftBatches;
  }

  async saveGiftBatch(input: Partial<GiftCardBatch> & { id?: string }) {
    if (!input.name?.trim()) throw new BadRequestException("Batch name is required");
    const existing = input.id ? this.giftBatches.find((row) => row.id === input.id) : undefined;
    const next: GiftCardBatch = {
      id: existing?.id ?? `gb-${Date.now()}`,
      name: input.name.trim(),
      count: Math.max(1, Math.round(input.count ?? existing?.count ?? 1)),
      amountMinor: Math.max(0, Math.round(input.amountMinor ?? existing?.amountMinor ?? 0)),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      note: input.note?.trim() || existing?.note,
    };
    if (existing) {
      this.giftBatches = this.giftBatches.map((row) => (row.id === existing.id ? next : row));
    } else {
      this.giftBatches.push(next);
    }
    await this.persist();
    return next;
  }

  async deleteGiftBatch(id: string) {
    if (!this.giftBatches.some((row) => row.id === id)) {
      throw new NotFoundException("Gift batch not found");
    }
    this.giftBatches = this.giftBatches.filter((row) => row.id !== id);
    await this.persist();
    return { ok: true };
  }

  listCustomerGroups() {
    return this.customerGroups;
  }

  async saveCustomerGroup(input: Partial<CustomerGroup> & { id?: string }) {
    if (!input.name?.trim()) throw new BadRequestException("Group name is required");
    const existing = input.id ? this.customerGroups.find((row) => row.id === input.id) : undefined;
    const next: CustomerGroup = {
      id: existing?.id ?? `cg-${Date.now()}`,
      name: input.name.trim(),
      note: input.note?.trim() || existing?.note || "",
      active: input.active ?? existing?.active ?? true,
    };
    if (existing) {
      this.customerGroups = this.customerGroups.map((row) => (row.id === existing.id ? next : row));
    } else {
      this.customerGroups.push(next);
    }
    await this.persist();
    return next;
  }

  async deleteCustomerGroup(id: string) {
    if (!this.customerGroups.some((row) => row.id === id)) {
      throw new NotFoundException("Customer group not found");
    }
    this.customerGroups = this.customerGroups.filter((row) => row.id !== id);
    await this.persist();
    return { ok: true };
  }
}
