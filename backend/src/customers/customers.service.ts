import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
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
  type CustomerRedemption,
  type GiftCardRedeemResult,
  type GiftCardRedemption,
  type LoyaltyRedeemResult,
  type LoyaltyRedemption,
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
  private redemptions: CustomerRedemption[] = [];

  private readonly loyaltyFile = join(this.dir, "hq-customer-loyalty.json");
  private readonly creditsFile = join(this.dir, "hq-customer-credits.json");
  private readonly creditRulesFile = join(this.dir, "hq-customer-credit-rules.json");
  private readonly membersFile = join(this.dir, "hq-customer-loyalty-members.json");
  private readonly cardsFile = join(this.dir, "hq-customer-loyalty-cards.json");
  private readonly giftCardsFile = join(this.dir, "hq-customer-gift-cards.json");
  private readonly giftBatchesFile = join(this.dir, "hq-customer-gift-batches.json");
  private readonly groupsFile = join(this.dir, "hq-customer-groups.json");
  private readonly redemptionsFile = join(this.dir, "hq-customer-redemptions.json");

  async onModuleInit() {
    await mkdir(this.dir, { recursive: true });
    this.loyaltyProgram = await this.readJson(this.loyaltyFile, SEED_LOYALTY_PROGRAM);
    this.credits = await this.readJson(this.creditsFile, []);
    this.creditRules = await this.readJson(this.creditRulesFile, []);
    this.loyaltyMembers = await this.readJson(this.membersFile, []);
    this.loyaltyCards = await this.readJson(this.cardsFile, []);
    this.giftCards = await this.readJson(this.giftCardsFile, []);
    this.giftBatches = await this.readJson(this.giftBatchesFile, []);
    this.customerGroups = await this.readJson(this.groupsFile, SEED_CUSTOMER_GROUPS);
    this.redemptions = await this.readJson(this.redemptionsFile, []);
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
      writeFile(this.redemptionsFile, JSON.stringify(this.redemptions, null, 2), "utf8"),
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

  private normalizeLookup(value: string) {
    return value.replace(/[\s-]/g, "").toLowerCase();
  }

  private resolveLoyaltyMember(
    memberId: string | undefined,
    identifier: string,
  ): LoyaltyMember | undefined {
    if (memberId) {
      return this.loyaltyMembers.find((row) => row.id === memberId);
    }
    const key = this.normalizeLookup(identifier);
    if (!key) return undefined;
    const card = this.loyaltyCards.find(
      (row) =>
        row.active &&
        this.normalizeLookup(row.cardNumber) === key,
    );
    return this.loyaltyMembers.find((row) => {
      if (!row.active) return false;
      return (
        this.normalizeLookup(row.phone) === key ||
        (row.cardNumber ? this.normalizeLookup(row.cardNumber) === key : false) ||
        (card ? row.id === card.memberId : false)
      );
    });
  }

  /**
   * Redeem loyalty points against a till ticket. The ledger entry is written
   * in the same in-memory step as the deduction so a retried request with the
   * same ticket id can never deduct twice.
   */
  async redeemLoyalty(input: {
    memberId?: string;
    identifier?: string;
    points?: number;
    ticketId?: string;
  }): Promise<LoyaltyRedeemResult> {
    const ticketId = String(input.ticketId ?? "").trim();
    if (!ticketId) throw new BadRequestException("ticketId is required");
    const points = Math.round(Number(input.points ?? 0));
    if (!Number.isFinite(points) || points <= 0) {
      throw new BadRequestException("A positive number of points is required");
    }
    const identifier = String(input.identifier ?? "").trim();
    const member = this.resolveLoyaltyMember(input.memberId?.trim(), identifier);
    if (!member) throw new NotFoundException("Loyalty member not found");
    if (!member.active) throw new BadRequestException("Loyalty member is inactive");

    const existing = this.redemptions.find((row) => row.ticketId === ticketId);
    if (existing) {
      if (
        existing.kind !== "loyalty" ||
        existing.memberId !== member.id ||
        existing.points !== points ||
        existing.reversedAt
      ) {
        throw new ConflictException("This ticket has already been redeemed");
      }
      return {
        member,
        pointsRedeemed: existing.points,
        valueMinor: existing.valueMinor,
        balanceBefore: existing.balanceBefore,
        balanceAfter: existing.balanceAfter,
      };
    }

    if (member.points < points) {
      throw new BadRequestException("Insufficient loyalty points");
    }
    const balanceBefore = member.points;
    const balanceAfter = balanceBefore - points;
    const valueMinor =
      points * Math.max(0, Math.round(this.loyaltyProgram.redeemValueMinor));
    const entry: LoyaltyRedemption = {
      ticketId,
      kind: "loyalty",
      memberId: member.id,
      identifier: identifier || member.phone,
      points,
      valueMinor,
      balanceBefore,
      balanceAfter,
      createdAt: new Date().toISOString(),
    };
    this.redemptions.push(entry);
    member.points = balanceAfter;
    await this.persist();
    return { member, pointsRedeemed: points, valueMinor, balanceBefore, balanceAfter };
  }

  /** Deduct a gift card against a till ticket, idempotently by ticket id. */
  async redeemGiftCard(input: {
    code?: string;
    amountMinor?: number;
    ticketId?: string;
  }): Promise<GiftCardRedeemResult> {
    const ticketId = String(input.ticketId ?? "").trim();
    if (!ticketId) throw new BadRequestException("ticketId is required");
    const code = String(input.code ?? "").trim().toUpperCase();
    if (!code) throw new BadRequestException("Gift card code is required");
    const amountMinor = Math.round(Number(input.amountMinor ?? 0));
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
      throw new BadRequestException("A positive amountMinor is required");
    }
    const card = this.giftCards.find(
      (row) => row.code.trim().toUpperCase() === code,
    );
    if (!card) throw new NotFoundException("Gift card not found");
    if (!card.active) throw new BadRequestException("Gift card is inactive");
    if (card.expiresAt) {
      const expires = Date.parse(card.expiresAt);
      if (Number.isFinite(expires) && expires <= Date.now()) {
        throw new BadRequestException("Gift card has expired");
      }
    }

    const existing = this.redemptions.find((row) => row.ticketId === ticketId);
    if (existing) {
      if (
        existing.kind !== "gift-card" ||
        existing.code !== card.code ||
        existing.amountMinor !== amountMinor ||
        existing.reversedAt
      ) {
        throw new ConflictException("This ticket has already been redeemed");
      }
      return {
        card,
        amountMinor: existing.amountMinor,
        balanceAfterMinor: existing.balanceAfterMinor,
      };
    }

    if (card.balanceMinor < amountMinor) {
      throw new BadRequestException("Gift card balance is too low");
    }
    const balanceAfterMinor = card.balanceMinor - amountMinor;
    const entry: GiftCardRedemption = {
      ticketId,
      kind: "gift-card",
      cardId: card.id,
      code: card.code,
      amountMinor,
      balanceAfterMinor,
      createdAt: new Date().toISOString(),
    };
    this.redemptions.push(entry);
    card.balanceMinor = balanceAfterMinor;
    await this.persist();
    return { card, amountMinor, balanceAfterMinor };
  }

  /** Restore a redemption when the sale could not be completed. */
  async reverseRedemption(ticketId: string) {
    const id = String(ticketId ?? "").trim();
    if (!id) throw new BadRequestException("ticketId is required");
    const entry = this.redemptions.find((row) => row.ticketId === id);
    if (!entry) throw new NotFoundException("Redemption not found");
    if (entry.reversedAt) return { ok: true, reversed: true, ticketId: id };

    if (entry.kind === "loyalty") {
      const member = this.loyaltyMembers.find((row) => row.id === entry.memberId);
      if (!member) {
        throw new NotFoundException(
          "Cannot reverse redemption: loyalty member no longer exists",
        );
      }
      member.points += entry.points;
    } else {
      const card = this.giftCards.find((row) => row.id === entry.cardId);
      if (!card) {
        throw new NotFoundException(
          "Cannot reverse redemption: gift card no longer exists",
        );
      }
      card.balanceMinor += entry.amountMinor;
    }
    entry.reversedAt = new Date().toISOString();
    await this.persist();
    return { ok: true, reversed: true, ticketId: id };
  }
}
