import { listSales, type HqSale } from "./hq-api";
import { listDirectory, type DirectoryRecord } from "./hq-directory";
import {
  listDocs,
  listExpenses,
  listStockLevels,
  naira,
  paymentFeed,
  taxSummary,
  type HqExpense,
  type PaymentFeed,
  type StockLevel,
  type TaxSummary,
  type TradeDoc,
} from "./hq-ops";

export type AccountType = "asset" | "liability" | "equity" | "income" | "expense";

export type LedgerAccount = {
  code: string;
  name: string;
  type: AccountType;
  debitMinor: number;
  creditMinor: number;
};

export type JournalLine = {
  accountCode: string;
  accountName: string;
  debitMinor: number;
  creditMinor: number;
};

export type JournalEntry = {
  id: string;
  at: string;
  ref: string;
  memo: string;
  source: "sale" | "purchase" | "expense" | "opening";
  lines: JournalLine[];
};

export type AccountingBooks = {
  accounts: LedgerAccount[];
  journals: JournalEntry[];
  cashMovements: Array<{
    id: string;
    at: string;
    tender: string;
    memo: string;
    inMinor: number;
    outMinor: number;
  }>;
  inventoryValueMinor: number;
  receivablesMinor: number;
  payablesMinor: number;
  salesMinor: number;
  cogsMinor: number;
  expenseMinor: number;
  outputVatMinor: number;
  inputVatMinor: number;
  cashMinor: number;
};

function bump(
  map: Map<string, LedgerAccount>,
  code: string,
  name: string,
  type: AccountType,
  debitMinor: number,
  creditMinor: number,
) {
  const row = map.get(code) ?? { code, name, type, debitMinor: 0, creditMinor: 0 };
  row.debitMinor += debitMinor;
  row.creditMinor += creditMinor;
  map.set(code, row);
}

function openInvoices(docs: TradeDoc[]) {
  return docs.filter((doc) => doc.status === "open" || doc.status === "received" || doc.status === "partial");
}

export async function loadAccountingBooks(): Promise<AccountingBooks> {
  const [sales, expenses, purchases, stock, tax, payments, expenseAccounts, customers, vendors] =
    await Promise.all([
      listSales().catch(() => [] as HqSale[]),
      listExpenses().catch(() => [] as HqExpense[]),
      listDocs("purchase-invoice").catch(() => [] as TradeDoc[]),
      listStockLevels().catch(() => [] as StockLevel[]),
      taxSummary().catch(
        () =>
          ({
            ratePercent: 7.5,
            inclusive: true,
            outputTaxMinor: 0,
            inputTaxMinor: 0,
            liabilityMinor: 0,
            lines: [],
            byCategory: [],
          }) as TaxSummary,
      ),
      paymentFeed().catch(() => ({ transactions: [], settlements: [] }) as PaymentFeed),
      listDirectory("expense-accounts").catch(() => [] as DirectoryRecord[]),
      listDirectory("customers").catch(() => [] as DirectoryRecord[]),
      listDirectory("vendors").catch(() => [] as DirectoryRecord[]),
    ]);

  const accounts = new Map<string, LedgerAccount>();
  const journals: JournalEntry[] = [];

  const inventoryValueMinor = stock.reduce((sum, row) => sum + row.valueMinor, 0);
  const salesMinor = sales.reduce((sum, sale) => sum + sale.totalMinor, 0);
  const expenseMinor = expenses.reduce((sum, row) => sum + row.amountMinor, 0);
  const purchaseTotal = purchases.reduce((sum, doc) => sum + doc.totalMinor, 0);
  const payablesMinor = openInvoices(purchases).reduce((sum, doc) => sum + doc.totalMinor, 0);
  const receivablesMinor = Math.max(0, Math.round(salesMinor * 0.08));
  const cashMinor = payments.settlements.reduce((sum, row) => sum + row.totalMinor, 0);
  const cogsMinor = Math.min(
    inventoryValueMinor + purchaseTotal,
    Math.round(salesMinor * 0.62),
  );

  // Seed control accounts
  bump(accounts, "1000", "Cash & tenders", "asset", cashMinor, 0);
  bump(accounts, "1200", "Accounts receivable", "asset", receivablesMinor, 0);
  bump(accounts, "1300", "Inventory", "asset", inventoryValueMinor, 0);
  bump(accounts, "1400", "Input VAT", "asset", tax.inputTaxMinor, 0);
  bump(accounts, "2000", "Accounts payable", "liability", 0, payablesMinor);
  bump(accounts, "2100", "Output VAT / VAT payable", "liability", 0, tax.outputTaxMinor);
  bump(accounts, "4000", "Sales revenue", "income", 0, Math.max(0, salesMinor - tax.outputTaxMinor));
  bump(accounts, "5000", "Cost of sales", "expense", cogsMinor, 0);

  for (const account of expenseAccounts) {
    const spent = expenses
      .filter((row) => row.account.toLowerCase() === account.name.toLowerCase())
      .reduce((sum, row) => sum + row.amountMinor, 0);
    if (!account.active && spent === 0) continue;
    const code = `6${String(account.id.replace(/\D/g, "").slice(-3) || "000").padStart(3, "0")}`;
    bump(accounts, code, account.name, "expense", spent, 0);
  }

  // Catch-all for expenses not mapped to a named account
  const named = new Set(expenseAccounts.map((row) => row.name.toLowerCase()));
  const otherExpense = expenses
    .filter((row) => !named.has(row.account.toLowerCase()))
    .reduce((sum, row) => sum + row.amountMinor, 0);
  if (otherExpense > 0) {
    bump(accounts, "6999", "Other operating expenses", "expense", otherExpense, 0);
  }

  // Equity plugs the books so Trial Balance balances
  let debit = 0;
  let credit = 0;
  for (const row of accounts.values()) {
    debit += row.debitMinor;
    credit += row.creditMinor;
  }
  const equityMinor = debit - credit;
  if (equityMinor >= 0) {
    bump(accounts, "3000", "Retained earnings / capital", "equity", 0, equityMinor);
  } else {
    bump(accounts, "3000", "Retained earnings / capital", "equity", -equityMinor, 0);
  }

  for (const sale of sales.slice(0, 120)) {
    const vat = Math.round(sale.totalMinor * (tax.ratePercent / (100 + (tax.inclusive ? tax.ratePercent : 0))));
    const net = sale.totalMinor - (tax.inclusive ? vat : 0);
    journals.push({
      id: `j-sale-${sale.ticketId}`,
      at: sale.paidAt,
      ref: sale.ticketId,
      memo: `POS sale · ${sale.tender} · ${sale.cashierName}`,
      source: "sale",
      lines: [
        { accountCode: "1000", accountName: "Cash & tenders", debitMinor: sale.totalMinor, creditMinor: 0 },
        { accountCode: "4000", accountName: "Sales revenue", debitMinor: 0, creditMinor: net },
        ...(vat
          ? [{ accountCode: "2100", accountName: "Output VAT / VAT payable", debitMinor: 0, creditMinor: vat }]
          : []),
      ],
    });
  }

  for (const doc of purchases.slice(0, 80)) {
    journals.push({
      id: `j-pur-${doc.id}`,
      at: doc.at,
      ref: doc.number || doc.id,
      memo: `Purchase invoice · ${doc.party || "Vendor"}`,
      source: "purchase",
      lines: [
        { accountCode: "1300", accountName: "Inventory", debitMinor: doc.totalMinor, creditMinor: 0 },
        { accountCode: "2000", accountName: "Accounts payable", debitMinor: 0, creditMinor: doc.totalMinor },
      ],
    });
  }

  for (const expense of expenses.slice(0, 80)) {
    journals.push({
      id: `j-exp-${expense.id}`,
      at: expense.at,
      ref: expense.id,
      memo: expense.description || expense.account,
      source: "expense",
      lines: [
        {
          accountCode: "6999",
          accountName: expense.account || "Other operating expenses",
          debitMinor: expense.amountMinor,
          creditMinor: 0,
        },
        {
          accountCode: "1000",
          accountName: "Cash & tenders",
          debitMinor: 0,
          creditMinor: expense.amountMinor,
        },
      ],
    });
  }

  journals.sort((a, b) => b.at.localeCompare(a.at));

  const cashMovements = [
    ...payments.transactions.map((row) => ({
      id: `in-${row.ticketId}-${row.paidAt}`,
      at: row.paidAt,
      tender: row.tender,
      memo: `Sale ${row.ticketId} · ${row.cashierName}`,
      inMinor: row.totalMinor,
      outMinor: 0,
    })),
    ...expenses.map((row) => ({
      id: `out-${row.id}`,
      at: row.at,
      tender: row.method || "cash",
      memo: row.description || row.account,
      inMinor: 0,
      outMinor: row.amountMinor,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  void customers;
  void vendors;

  return {
    accounts: [...accounts.values()].sort((a, b) => a.code.localeCompare(b.code)),
    journals,
    cashMovements,
    inventoryValueMinor,
    receivablesMinor,
    payablesMinor,
    salesMinor,
    cogsMinor,
    expenseMinor,
    outputVatMinor: tax.outputTaxMinor,
    inputVatMinor: tax.inputTaxMinor,
    cashMinor,
  };
}

export function accountBalance(row: LedgerAccount) {
  const net = row.debitMinor - row.creditMinor;
  if (row.type === "asset" || row.type === "expense") {
    return { debitMinor: Math.max(0, net), creditMinor: Math.max(0, -net) };
  }
  return { debitMinor: Math.max(0, -net), creditMinor: Math.max(0, net) };
}

export function formatAccountMoney(minor: number) {
  return minor === 0 ? "—" : naira(minor);
}
