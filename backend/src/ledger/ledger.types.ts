export type LedgerAccount = {
  id: string;
  code: string;
  name: string;
  kind: "asset" | "liability" | "equity" | "income" | "expense";
  openingMinor: number;
  active: boolean;
  group: string;
};

export type LedgerJournalLine = {
  accountId: string;
  accountName: string;
  debitMinor: number;
  creditMinor: number;
};

export type LedgerJournalEntry = {
  id: string;
  number: string;
  date: string;
  memo: string;
  lines: LedgerJournalLine[];
  createdAt: string;
};

export type LedgerFixedAsset = {
  id: string;
  name: string;
  category: string;
  costMinor: number;
  salvageMinor: number;
  lifeYears: number;
  acquiredAt: string;
  lastDepreciatedAt?: string;
  note?: string;
};

export type LedgerPrepaid = {
  id: string;
  name: string;
  amountMinor: number;
  startedAt: string;
  months: number;
  consumedMinor: number;
  note?: string;
};

export type LedgerAdvance = {
  id: string;
  customerId?: string;
  customerName: string;
  amountMinor: number;
  appliedMinor: number;
  at: string;
  note?: string;
};

export type StoreTarget = {
  id: string;
  period: string;
  storeId: string;
  storeName: string;
  targetMinor: number;
};

export type StaffTarget = {
  id: string;
  period: string;
  staffId?: string;
  staffName: string;
  targetMinor: number;
};

export type LedgerBook = {
  accounts: LedgerAccount[];
  journalEntries: LedgerJournalEntry[];
  fixedAssets: LedgerFixedAsset[];
  prepaids: LedgerPrepaid[];
  advances: LedgerAdvance[];
  storeTargets: StoreTarget[];
  staffTargets: StaffTarget[];
};

export function emptyBook(): LedgerBook {
  return {
    accounts: [],
    journalEntries: [],
    fixedAssets: [],
    prepaids: [],
    advances: [],
    storeTargets: [],
    staffTargets: [],
  };
}