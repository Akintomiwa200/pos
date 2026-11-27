export type CustomerCredit = {
  id: string;
  customerId: string;
  customerName: string;
  limitMinor: number;
  balanceMinor: number;
  terms: string;
  active: boolean;
};

export type CustomerCreditRule = {
  id: string;
  name: string;
  maxDays: number;
  maxBalanceMinor: number;
  requireApproval: boolean;
  note: string;
  active: boolean;
};

export type LoyaltyProgram = {
  enabled: boolean;
  earnPerNaira: number;
  redeemValueMinor: number;
  minDigits: number;
  allowSkip: boolean;
  autoApply: boolean;
  prompt: "phone" | "card" | "either";
  welcomeBonusPoints: number;
};

export type LoyaltyMember = {
  id: string;
  customerId?: string;
  name: string;
  phone: string;
  email?: string;
  cardNumber?: string;
  points: number;
  registeredAt: string;
  active: boolean;
};

export type LoyaltyCard = {
  id: string;
  memberId: string;
  memberName: string;
  cardNumber: string;
  tier: string;
  issuedAt: string;
  active: boolean;
};

export type GiftCard = {
  id: string;
  code: string;
  balanceMinor: number;
  initialMinor: number;
  customerId?: string;
  customerName?: string;
  batchId?: string;
  expiresAt?: string;
  active: boolean;
};

export type GiftCardBatch = {
  id: string;
  name: string;
  count: number;
  amountMinor: number;
  createdAt: string;
  note?: string;
};

export type CustomerGroup = {
  id: string;
  name: string;
  note: string;
  active: boolean;
};

/** Persisted redemption ledger entries, keyed by the till ticket id. */
export type LoyaltyRedemption = {
  ticketId: string;
  kind: "loyalty";
  memberId: string;
  identifier: string;
  points: number;
  valueMinor: number;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
  reversedAt?: string;
};

export type GiftCardRedemption = {
  ticketId: string;
  kind: "gift-card";
  cardId: string;
  code: string;
  amountMinor: number;
  balanceAfterMinor: number;
  createdAt: string;
  reversedAt?: string;
};

export type CustomerRedemption = LoyaltyRedemption | GiftCardRedemption;

export type LoyaltyRedeemResult = {
  member: LoyaltyMember;
  pointsRedeemed: number;
  valueMinor: number;
  balanceBefore: number;
  balanceAfter: number;
};

export type GiftCardRedeemResult = {
  card: GiftCard;
  amountMinor: number;
  balanceAfterMinor: number;
};

export const SEED_CUSTOMER_GROUPS: CustomerGroup[] = [
  { id: "cg-trade", name: "Trade", note: "Wholesale & B2B", active: true },
  { id: "cg-walkin", name: "Walk-in", note: "Retail counter", active: true },
];

export const SEED_LOYALTY_PROGRAM: LoyaltyProgram = {
  enabled: true,
  earnPerNaira: 100,
  redeemValueMinor: 100,
  minDigits: 6,
  allowSkip: true,
  autoApply: false,
  prompt: "either",
  welcomeBonusPoints: 50,
};
