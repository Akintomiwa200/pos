import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowLeftRight,
  Banknote,
  BookOpen,
  Boxes,
  Building2,
  Calculator,
  CircleDollarSign,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Flag,
  HelpCircle,
  History,
  IdCard,
  Landmark,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  MessageSquare,
  Package,
  RotateCcw,
  Scale,
  ScrollText,
  Settings,
  ShieldCheck,
  ShoppingBasket,
  ShoppingCart,
  TrendingUp,
  Truck,
  User,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";

export type NavLink = {
  id: string;
  label: string;
  href: string;
};

export type NavGroup = {
  id: string;
  label: string;
  children: NavNode[];
};

export type NavNode = NavLink | NavGroup;

export type NavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  children?: NavNode[];
};

export type NavSection = {
  heading: string;
  department: DepartmentName;
  items: NavItem[];
};

export function isNavGroup(node: NavNode): node is NavGroup {
  return Array.isArray((node as NavGroup).children);
}

export const DEPARTMENTS = ["Report", "Transaction", "Setup"] as const;
export type DepartmentName = (typeof DEPARTMENTS)[number];

export type AccessNode = {
  id: string;
  label: string;
  href?: string;
  children?: AccessNode[];
};

const PRODUCTS_NAV: NavNode[] = [
  { id: "items-items", label: "All Products", href: "/setup/items/items" },
  { id: "items-groups", label: "Categories", href: "/setup/items/groups" },
  { id: "items-subgroups", label: "Subcategories", href: "/setup/items/subgroups" },
  { id: "items-units", label: "Units of Measure", href: "/setup/items/units" },
  { id: "items-packs", label: "Pack & Cartons", href: "/setup/items/packs" },
  { id: "manufacturer", label: "Brands", href: "/setup/items/brands" },
  { id: "items-prices", label: "Price List", href: "/setup/items/prices" },
  { id: "items-low-stock", label: "Low Stock", href: "/setup/items/low-stock" },
  { id: "items-expiring", label: "Expiring", href: "/setup/items/expiring" },
  { id: "scan-barcode", label: "Barcode Lookup", href: "/setup/items/barcode" },
  { id: "others-import", label: "Import Products", href: "/setup/items/import" },
  { id: "items-export", label: "Export Products", href: "/setup/items/export" },
];

const STOCK_REPORT_NAV: NavNode[] = [
  { id: "stock-balance", label: "Balance", href: "/reports/stock/balance" },
  { id: "stock-sheet", label: "Sheet", href: "/reports/stock/sheet" },
  { id: "stock-movement", label: "Movement", href: "/reports/stock/movement" },
  { id: "stock-bin-card", label: "Bin Card", href: "/reports/stock/bin-card" },
  { id: "stock-expiry", label: "Expiry", href: "/reports/stock/expiry" },
  { id: "stock-count", label: "Count", href: "/reports/stock/count" },
];

const BALANCE_REPORT_NAV: NavNode[] = [
  { id: "balance-customer", label: "Customer", href: "/reports/balance/customer" },
  { id: "balance-vendor", label: "Vendor", href: "/reports/balance/vendor" },
  {
    id: "balance-sales-rep",
    label: "Sales Representative",
    href: "/reports/balance/sales-representative",
  },
  { id: "balance-staff", label: "Staff", href: "/reports/balance/staff" },
];

const LEDGER_REPORT_NAV: NavNode[] = [
  { id: "ledger-customer", label: "Customer", href: "/reports/ledger/customer" },
  { id: "ledger-vendor", label: "Vendor", href: "/reports/ledger/vendor" },
  {
    id: "ledger-sales-rep",
    label: "Sales Representative",
    href: "/reports/ledger/sales-representative",
  },
  { id: "ledger-staff", label: "Staff", href: "/reports/ledger/staff" },
];

const TRAIL_REPORT_NAV: NavNode[] = [
  { id: "trail-customer", label: "Customer", href: "/reports/trail/customer" },
  { id: "trail-vendor", label: "Vendor", href: "/reports/trail/vendor" },
  {
    id: "trail-sales-rep",
    label: "Sales Representative",
    href: "/reports/trail/sales-representative",
  },
  { id: "trail-staff", label: "Staff", href: "/reports/trail/staff" },
];

const TAX_REPORT_NAV: NavNode[] = [
  { id: "tax-output", label: "Output Tax", href: "/reports/tax/output-tax" },
  { id: "tax-input", label: "Input Tax", href: "/reports/tax/input-tax" },
  { id: "tax-liability", label: "Liability", href: "/reports/tax/liability" },
  { id: "tax-detail", label: "Detail", href: "/reports/tax/detail" },
  { id: "tax-by-category", label: "By Category", href: "/reports/tax/by-category" },
];

const BILLING_NAV: NavNode[] = [
  {
    id: "billing-subscriptions",
    label: "Subscriptions",
    href: "/setup/billing/subscriptions",
  },
  {
    id: "billing-licences",
    label: "Till Licences",
    href: "/setup/billing/licences",
  },
];

const ACCOUNTING_BOOKS_NAV: NavNode[] = [
  {
    id: "accounting-coa",
    label: "Chart of Accounts",
    href: "/reports/accounting/chart-of-accounts",
  },
  { id: "accounting-journal", label: "Journal", href: "/reports/accounting/journal" },
  { id: "accounting-cash-book", label: "Cash Book", href: "/reports/accounting/cash-book" },
  {
    id: "accounting-trial-balance",
    label: "Trial Balance",
    href: "/reports/accounting/trial-balance",
  },
];

const AUDIT_NAV: NavNode[] = [
  { id: "audit-overview", label: "Today's Summary", href: "/audit" },
  { id: "audit-x-report", label: "Mid-day Check", href: "/audit/x-report" },
  { id: "audit-z-report", label: "End of Day", href: "/audit/z-report" },
  { id: "audit-tenders", label: "Payment Methods", href: "/audit/tenders" },
  { id: "audit-tickets", label: "Sales List", href: "/audit/tickets" },
  { id: "audit-cashiers", label: "Staff Sales", href: "/audit/cashiers" },
  { id: "audit-drawer", label: "Cash Count", href: "/audit/drawer" },
  { id: "audit-exceptions", label: "Problems to Check", href: "/audit/exceptions" },
];

const ACCOUNTING_STATEMENTS_NAV: NavNode[] = [
  {
    id: "accounting-profit-loss",
    label: "Profit & Loss",
    href: "/reports/accounting/profit-loss",
  },
  {
    id: "accounting-balance-sheet",
    label: "Balance Sheet",
    href: "/reports/accounting/balance-sheet",
  },
];

const ORDERS_NAV: NavNode[] = [
  { id: "purchase-order-list", label: "All Orders", href: "/orders/list" },
  { id: "purchase-order-new", label: "New Order", href: "/orders/new" },
  { id: "purchase-order-drafts", label: "Drafts", href: "/orders/drafts" },
  { id: "purchase-order-pending", label: "Pending Approval", href: "/orders/pending" },
  { id: "purchase-order-approved", label: "Approved & Sent", href: "/orders/approved" },
  { id: "purchase-order-receiving", label: "Receiving", href: "/orders/receiving" },
  { id: "purchase-order-received", label: "Received", href: "/orders/received" },
  { id: "purchase-order-cancelled", label: "Cancelled", href: "/orders/cancelled" },
  { id: "purchase-order-summary", label: "Summary", href: "/orders/summary" },
];

const CUSTOMER_NAV: NavNode[] = [
  { id: "customer-list", label: "All Customers", href: "/setup/customers/list" },
  { id: "customer-groups", label: "Groups", href: "/setup/customers/groups" },
  { id: "customer-credits", label: "Credits", href: "/setup/customers/credits" },
  { id: "customer-credit-rules", label: "Credit Rules", href: "/setup/customers/credit-rules" },
  {
    id: "customer-loyalty",
    label: "Loyalty",
    children: [
      { id: "customer-loyalty-program", label: "Programme", href: "/setup/customers/loyalty/program" },
      { id: "customer-loyalty-registration", label: "Registration", href: "/setup/customers/loyalty/registration" },
      { id: "customer-loyalty-rules", label: "Rules", href: "/setup/customers/loyalty/rules" },
      { id: "customer-loyalty-cards", label: "Assign Cards", href: "/setup/customers/loyalty/cards" },
    ],
  },
  {
    id: "customer-gift",
    label: "Gift Cards",
    children: [
      { id: "customer-gift-list", label: "All Gift Cards", href: "/setup/customers/gift-cards" },
      { id: "customer-gift-batches", label: "Issue Batches", href: "/setup/customers/gift-batches" },
    ],
  },
  { id: "customer-import", label: "Import", href: "/setup/customers/import" },
  {
    id: "customer-reports",
    label: "Reports",
    children: [
      { id: "customer-report-balance", label: "Balance", href: "/reports/balance/customer" },
      { id: "customer-report-ledger", label: "Ledger", href: "/reports/ledger/customer" },
      { id: "customer-report-trail", label: "Trail", href: "/reports/trail/customer" },
    ],
  },
];

const SUPPORT_NAV: NavNode[] = [
  { id: "support-overview", label: "Overview", href: "/crm/overview" },
  { id: "support-contacts", label: "Contacts", href: "/crm/contacts" },
  { id: "support-deals", label: "Deals", href: "/crm/deals" },
  { id: "support-pipeline", label: "Pipeline", href: "/crm/pipeline" },
  { id: "support-tickets", label: "Tickets", href: "/crm/tickets" },
  { id: "support-activity", label: "Activity", href: "/crm/activity" },
  { id: "support-projects", label: "Projects", href: "/crm/projects" },
  { id: "support-issues", label: "Issues", href: "/crm/issues" },
];

function nodeToAccess(node: NavNode): AccessNode {
  if (isNavGroup(node)) {
    return {
      id: node.id,
      label: node.label,
      children: node.children.map(nodeToAccess),
    };
  }
  return { id: node.id, label: node.label, href: node.href };
}

function itemToAccess(item: NavItem): AccessNode {
  return {
    id: item.id,
    label: item.label,
    href: item.href,
    children: item.children?.map(nodeToAccess),
  };
}

/** Full tree for group privileges and route access — not shown in the sidebar. */
export const ACCESS_NAV: NavSection[] = [
  {
    heading: "Report",
    department: "Report",
    items: [
      {
        id: "sales",
        label: "Sales",
        icon: ShoppingCart,
        children: [
          { id: "sales-analytics", label: "Analytics", href: "/reports/sales/analytics" },
          {
            id: "sales-invoice",
            label: "Invoice",
            children: [
              { id: "sales-invoice-list", label: "Invoice List", href: "/reports/sales/invoice/list" },
              {
                id: "sales-invoice-summary",
                label: "Summary",
                href: "/reports/sales/invoice/summary",
              },
              {
                id: "sales-invoice-balance",
                label: "Balance",
                href: "/reports/sales/invoice/balance",
              },
              {
                id: "sales-invoice-history",
                label: "History",
                href: "/reports/sales/invoice/history",
              },
              { id: "sales-invoice-shift", label: "Shift", href: "/reports/sales/invoice/shift" },
            ],
          },
          {
            id: "sales-gross-profit",
            label: "Gross Profit",
            children: [
              {
                id: "sales-gp-group",
                label: "By Group",
                href: "/reports/sales/gross-profit/by-group",
              },
              {
                id: "sales-gp-subgroup",
                label: "By Subgroup",
                href: "/reports/sales/gross-profit/by-subgroup",
              },
              {
                id: "sales-gp-item",
                label: "By Item",
                href: "/reports/sales/gross-profit/by-item",
              },
            ],
          },
          {
            id: "sales-quote",
            label: "Quote",
            children: [
              { id: "sales-quote-list", label: "List", href: "/reports/sales/quote/list" },
              {
                id: "sales-quote-summary",
                label: "Summary",
                href: "/reports/sales/quote/summary",
              },
            ],
          },
          {
            id: "sales-return",
            label: "Return",
            children: [
              { id: "sales-return-list", label: "List", href: "/reports/sales/return/list" },
              {
                id: "sales-return-summary",
                label: "Summary",
                href: "/reports/sales/return/summary",
              },
            ],
          },
        ],
      },
      {
        id: "pos-hub",
        label: "Point of Sales",
        icon: ShoppingBasket,
        children: [
          { id: "others-till", label: "Till", href: "/setup/others/till" },
          { id: "others-store", label: "Store", href: "/setup/others/store" },
        ],
      },
      {
        id: "stock-report",
        label: "Stock",
        icon: Boxes,
        children: STOCK_REPORT_NAV,
      },
      {
        id: "balance",
        label: "Balance",
        icon: Scale,
        children: BALANCE_REPORT_NAV,
      },
      {
        id: "accounting-books",
        label: "Books",
        icon: ScrollText,
        children: ACCOUNTING_BOOKS_NAV,
      },
      {
        id: "accounting-statements",
        label: "Statements",
        icon: FileSpreadsheet,
        children: ACCOUNTING_STATEMENTS_NAV,
      },
      {
        id: "ledger",
        label: "Ledger",
        icon: FileText,
        children: LEDGER_REPORT_NAV,
      },
      {
        id: "trail",
        label: "Trail",
        icon: History,
        children: TRAIL_REPORT_NAV,
      },
      {
        id: "tax",
        label: "Tax",
        icon: CircleDollarSign,
        children: TAX_REPORT_NAV,
      },
      { id: "audit", label: "Audit", icon: ShieldCheck, children: AUDIT_NAV },
      { id: "finance", label: "Finance", icon: Landmark, href: "/finance" },
      {
        id: "expense-account",
        label: "Expense Account",
        icon: Calculator,
        href: "/setup/expense-account",
      },
      {
        id: "billing",
        label: "Billing",
        icon: FileText,
        children: BILLING_NAV,
      },
    ],
  },
  {
    heading: "Transaction",
    department: "Transaction",
    items: [
      {
        id: "purchase",
        label: "Purchase",
        icon: Truck,
        children: [
          {
            id: "purchase-invoice",
            label: "Invoice",
            children: [
              {
                id: "purchase-invoice-list",
                label: "List",
                href: "/transactions/purchase/invoice/list",
              },
              {
                id: "purchase-invoice-summary",
                label: "Summary",
                href: "/transactions/purchase/invoice/summary",
              },
              {
                id: "purchase-invoice-book",
                label: "Book",
                href: "/transactions/purchase/invoice/book",
              },
              {
                id: "purchase-invoice-history",
                label: "History",
                href: "/transactions/purchase/invoice/history",
              },
            ],
          },
          {
            id: "purchase-order",
            label: "Order",
            children: ORDERS_NAV,
          },
          {
            id: "purchase-return",
            label: "Return",
            children: [
              {
                id: "purchase-return-list",
                label: "List",
                href: "/transactions/purchase/return/list",
              },
              {
                id: "purchase-return-summary",
                label: "Summary",
                href: "/transactions/purchase/return/summary",
              },
            ],
          },
        ],
      },
      {
        id: "stock-txn",
        label: "Stock",
        icon: ArrowLeftRight,
        children: [
          {
            id: "stock-txn-transfer",
            label: "Inventory Transfer",
            href: "/transactions/stock/inventory-transfer",
          },
          {
            id: "stock-txn-adjustment",
            label: "Inventory Adjustment",
            href: "/transactions/stock/inventory-adjustment",
          },
        ],
      },
      {
        id: "receipt",
        label: "Receipt",
        icon: FileText,
        children: [
          { id: "receipt-list", label: "List", href: "/transactions/receipt/list" },
          { id: "receipt-analysis", label: "Analysis", href: "/transactions/receipt/analysis" },
        ],
      },
      { id: "payments", label: "Payments", icon: CreditCard, href: "/transactions/payments" },
      {
        id: "expenses",
        label: "Expenses",
        icon: Banknote,
        children: [
          { id: "expenses-list", label: "List", href: "/transactions/expenses/list" },
          { id: "expenses-summary", label: "Summary", href: "/transactions/expenses/summary" },
        ],
      },
    ],
  },
  {
    heading: "Setup",
    department: "Setup",
    items: [
      {
        id: "items",
        label: "Products",
        icon: Package,
        children: PRODUCTS_NAV,
      },
      { id: "customer", label: "Customers", icon: User, children: CUSTOMER_NAV },
      { id: "support", label: "Support", icon: LifeBuoy, children: SUPPORT_NAV },
      { id: "chat", label: "Chat", icon: MessageSquare, href: "/chat" },
      { id: "vendor", label: "Vendor", icon: Building2, href: "/setup/vendor" },
      {
        id: "sales-rep",
        label: "Sales Representative",
        icon: IdCard,
        href: "/setup/sales-representative",
      },
      { id: "staff", label: "Staff", icon: UserRound, href: "/setup/staff" },
      {
        id: "payment-method",
        label: "Payment Method",
        icon: CreditCard,
        href: "/setup/payment-method",
      },
      {
        id: "sales-promotion",
        label: "Sales Promotion",
        icon: Megaphone,
        href: "/setup/sales-promotion",
      },
      {
        id: "users",
        label: "Users",
        icon: Users,
        children: [
          { id: "users-account", label: "Accounts", href: "/setup/users/account" },
          { id: "users-group", label: "Groups", href: "/setup/users/group" },
        ],
      },
      {
        id: "others",
        label: "Others",
        icon: Settings,
        children: [
          { id: "others-company", label: "Company", href: "/setup/others/company" },
          { id: "others-branch", label: "Branch", href: "/setup/others/branch" },
          { id: "others-storefront", label: "Storefront", href: "/setup/others/storefront" },
          {
            id: "others-payment-gateway",
            label: "Payment Gateway",
            href: "/setup/others/payment-gateway",
          },
          { id: "others-tax", label: "Tax", href: "/setup/others/tax" },
          { id: "others-settings", label: "Settings", href: "/setup/others/settings" },
          { id: "others-data", label: "Data", href: "/setup/others/data" },
          { id: "others-export", label: "Export", href: "/setup/others/export" },
        ],
      },
      { id: "help", label: "Help", icon: HelpCircle, href: "/help" },
    ],
  },
];

/** Sidebar — merged from both reference designs, no duplicate routes or ids. */
export const NAV: NavSection[] = [
  {
    heading: "Main Menu",
    department: "Setup",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        href: "/dashboard",
      },
      {
        id: "items",
        label: "Products",
        icon: ShoppingCart,
        children: PRODUCTS_NAV,
      },
    ],
  },
  {
    heading: "Analytics",
    department: "Report",
    items: [
      {
        id: "sales",
        label: "Sales",
        icon: TrendingUp,
        children: [
          { id: "sales-analytics", label: "Sales Summary", href: "/reports/sales/analytics" },
          {
            id: "sales-invoice-summary",
            label: "Sales Trends",
            href: "/reports/sales/invoice/summary",
          },
          {
            id: "sales-gp-item",
            label: "Item Sales",
            href: "/reports/sales/gross-profit/by-item",
          },
          {
            id: "sales-gp-group",
            label: "Employee Sales",
            href: "/reports/sales/gross-profit/by-group",
          },
        ],
      },
      {
        id: "pos-hub",
        label: "Point of Sales",
        icon: ShoppingBasket,
        children: [
          { id: "others-till", label: "Till", href: "/setup/others/till" },
          { id: "others-store", label: "Store", href: "/setup/others/store" },
        ],
      },
      {
        id: "sales-gp-subgroup",
        label: "Leaderboards",
        icon: Flag,
        href: "/reports/sales/gross-profit/by-subgroup",
      },
      {
        id: "purchase-order",
        label: "Orders",
        icon: ShoppingCart,
        children: ORDERS_NAV,
      },
      {
        id: "sales-return-list",
        label: "Refund",
        icon: RotateCcw,
        href: "/reports/sales/return/list",
      },
      {
        id: "stock-report",
        label: "Stock",
        icon: Boxes,
        children: STOCK_REPORT_NAV,
      },
      {
        id: "sales-invoice-list",
        label: "Invoices",
        icon: FileText,
        href: "/reports/sales/invoice/list",
      },
      { id: "payments", label: "Transactions", icon: Activity, href: "/transactions/payments" },
    ],
  },
  {
    heading: "Account",
    department: "Report",
    items: [
      { id: "audit", label: "Audit", icon: ShieldCheck, children: AUDIT_NAV },
      { id: "finance", label: "Finance", icon: Landmark, href: "/finance" },
      {
        id: "accounting-books",
        label: "Books",
        icon: ScrollText,
        children: ACCOUNTING_BOOKS_NAV,
      },
      {
        id: "accounting-statements",
        label: "Statements",
        icon: FileSpreadsheet,
        children: ACCOUNTING_STATEMENTS_NAV,
      },
      {
        id: "balance",
        label: "Balances",
        icon: Scale,
        children: BALANCE_REPORT_NAV,
      },
      {
        id: "ledger",
        label: "Ledger",
        icon: BookOpen,
        children: LEDGER_REPORT_NAV,
      },
      {
        id: "trail",
        label: "Trail",
        icon: History,
        children: TRAIL_REPORT_NAV,
      },
      {
        id: "tax",
        label: "Tax",
        icon: CircleDollarSign,
        children: TAX_REPORT_NAV,
      },
      {
        id: "expense-account",
        label: "Expense Accounts",
        icon: Calculator,
        href: "/setup/expense-account",
      },
      {
        id: "billing",
        label: "Billing",
        icon: Wallet,
        children: BILLING_NAV,
      },
    ],
  },
  {
    heading: "Workspace",
    department: "Setup",
    items: [
      { id: "chat", label: "Chat", icon: MessageSquare, href: "/chat" },
      { id: "support", label: "Support", icon: LifeBuoy, children: SUPPORT_NAV },
      { id: "customer", label: "Customers", icon: User, children: CUSTOMER_NAV },
      { id: "vendor", label: "Vendors", icon: Building2, href: "/setup/vendor" },
      { id: "staff", label: "Staff", icon: UserRound, href: "/setup/staff" },
      {
        id: "sales-rep",
        label: "Sales Representatives",
        icon: IdCard,
        href: "/setup/sales-representative",
      },
      {
        id: "payment-method",
        label: "Payment Methods",
        icon: CreditCard,
        href: "/setup/payment-method",
      },
      {
        id: "sales-promotion",
        label: "Sales Promotions",
        icon: Megaphone,
        href: "/setup/sales-promotion",
      },
    ],
  },
  {
    heading: "Settings",
    department: "Setup",
    items: [
      {
        id: "users",
        label: "Users",
        icon: Users,
        children: [
          { id: "users-account", label: "Accounts", href: "/setup/users/account" },
          { id: "users-group", label: "Groups", href: "/setup/users/group" },
        ],
      },
      {
        id: "others-org",
        label: "Organization",
        icon: Building2,
        children: [
          { id: "others-company", label: "Company", href: "/setup/others/company" },
          { id: "others-branch", label: "Branch", href: "/setup/others/branch" },
          { id: "others-storefront", label: "Storefront", href: "/setup/others/storefront" },
          {
            id: "others-payment-gateway",
            label: "Payment Gateway",
            href: "/setup/others/payment-gateway",
          },
          { id: "others-tax", label: "Tax", href: "/setup/others/tax" },
        ],
      },
      {
        id: "others-settings",
        label: "Settings",
        icon: Settings,
        href: "/setup/others/settings",
      },
      { id: "help", label: "Help", icon: HelpCircle, href: "/help" },
    ],
  },
];

/** Privilege registration tree — mirrors sidebar categories, not deep ACCESS_NAV pages. */
export function accessTree(): {
  heading: string;
  department: DepartmentName;
  items: AccessNode[];
}[] {
  return NAV.map((section) => ({
    heading: section.heading,
    department: section.department,
    items: section.items.map(itemToAccess),
  }));
}
