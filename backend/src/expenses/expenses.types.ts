export type Expense = {
  id: string;
  at: string;
  account: string;
  description: string;
  amountMinor: number;
  method: string;
  staff?: string;
};
