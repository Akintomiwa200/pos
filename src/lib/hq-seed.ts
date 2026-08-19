import type { ConsoleAccount, ConsoleGroup } from "./access";

export const SEED_GROUPS: ConsoleGroup[] = [
  {
    id: "g-admin",
    name: "Administrator",
    departments: ["*"],
    privileges: ["*"],
  },
  {
    id: "g-accountant",
    name: "Accountant",
    departments: ["Report", "Transaction", "Setup"],
    privileges: [
      "sales",
      "stock-report",
      "balance",
      "ledger",
      "trail",
      "tax",
      "payments",
      "receipt",
      "expenses",
      "expense-account",
    ],
  },
  {
    id: "g-sales",
    name: "Sales",
    departments: ["Report", "Transaction", "Setup"],
    privileges: ["sales", "receipt", "customer", "sales-rep"],
  },
];

export const SEED_ACCOUNTS: ConsoleAccount[] = [
  {
    id: "a-emma",
    name: "Emma Wang",
    email: "emma.wang@example.com",
    username: "emma",
    password: "demo",
    groupId: "g-admin",
    active: true,
  },
  {
    id: "a-chika",
    name: "Chika Okonkwo",
    email: "chika.okonkwo@example.com",
    username: "chika",
    password: "demo",
    groupId: "g-accountant",
    active: true,
  },
  {
    id: "a-tosin",
    name: "Tosin Adeyemi",
    email: "tosin.adeyemi@example.com",
    username: "tosin",
    password: "demo",
    groupId: "g-sales",
    active: true,
  },
];
