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

export const SEED_CREDIT_RULES: CustomerCreditRule[] = [
  {
    id: "cr-net30",
    name: "Net 30",
    maxDays: 30,
    maxBalanceMinor: 500_000_00,
    requireApproval: false,
    note: "Standard trade credit",
    active: true,
  },
];

export const SEED_CREDITS: CustomerCredit[] = [
  {
    id: "cc-1",
    customerId: "cus-3",
    customerName: "Greenfield Hotels Ltd",
    limitMinor: 500_000_00,
    balanceMinor: 125_000_00,
    terms: "Net 30",
    active: true,
  },
];

export const SEED_LOYALTY_MEMBERS: LoyaltyMember[] = [
  {
    id: "lm-1",
    customerId: "cus-2",
    name: "Tunde Bakare",
    phone: "08127654321",
    email: "tunde@example.com",
    cardNumber: "LOY-100234",
    points: 420,
    registeredAt: new Date().toISOString(),
    active: true,
  },
];

export const SEED_LOYALTY_CARDS: LoyaltyCard[] = [
  {
    id: "lc-1",
    memberId: "lm-1",
    memberName: "Tunde Bakare",
    cardNumber: "LOY-100234",
    tier: "Gold",
    issuedAt: new Date().toISOString(),
    active: true,
  },
];

export const SEED_GIFT_CARDS: GiftCard[] = [
  {
    id: "gc-1",
    code: "GIFT-8K2M-4P9Q",
    balanceMinor: 10_000_00,
    initialMinor: 10_000_00,
    customerName: "Walk-in",
    active: true,
  },
];

export const SEED_GIFT_BATCHES: GiftCardBatch[] = [
  {
    id: "gb-1",
    name: "Holiday ₦5,000",
    count: 50,
    amountMinor: 5_000_00,
    createdAt: new Date().toISOString(),
    note: "Seasonal promo",
  },
];
