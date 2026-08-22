import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowLeftRight,
  Award,
  Banknote,
  Boxes,
  Building2,
  Calculator,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  Factory,
  FileText,
  Flag,
  History,
  IdCard,
  Landmark,
  Megaphone,
  Package,
  Plug,
  RotateCcw,
  Scale,
  ScanBarcode,
  Settings,
  ShoppingBasket,
  ShoppingCart,
  TrendingUp,
  Truck,
  User,
  UserRound,
  Users,
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
        id: "stock-report",
        label: "Stock",
        icon: Boxes,
        children: [
          { id: "stock-balance", label: "Balance", href: "/reports/stock/balance" },
          { id: "stock-sheet", label: "Sheet", href: "/reports/stock/sheet" },
          { id: "stock-movement", label: "Movement", href: "/reports/stock/movement" },
          { id: "stock-bin-card", label: "Bin Card", href: "/reports/stock/bin-card" },
          { id: "stock-expiry", label: "Expiry", href: "/reports/stock/expiry" },
          { id: "stock-count", label: "Count", href: "/reports/stock/count" },
        ],
      },
      {
        id: "balance",
        label: "Balance",
        icon: Scale,
        children: [
          { id: "balance-customer", label: "Customer", href: "/reports/balance/customer" },
          { id: "balance-vendor", label: "Vendor", href: "/reports/balance/vendor" },
          {
            id: "balance-sales-rep",
            label: "Sales Representative",
            href: "/reports/balance/sales-representative",
          },
          { id: "balance-staff", label: "Staff", href: "/reports/balance/staff" },
        ],
      },
      {
        id: "ledger",
        label: "Ledger",
        icon: FileText,
        children: [
          { id: "ledger-customer", label: "Customer", href: "/reports/ledger/customer" },
          { id: "ledger-vendor", label: "Vendor", href: "/reports/ledger/vendor" },
          {
            id: "ledger-sales-rep",
            label: "Sales Representative",
            href: "/reports/ledger/sales-representative",
          },
          { id: "ledger-staff", label: "Staff", href: "/reports/ledger/staff" },
        ],
      },
      {
        id: "trail",
        label: "Trail",
        icon: History,
        children: [
          { id: "trail-customer", label: "Customer", href: "/reports/trail/customer" },
          { id: "trail-vendor", label: "Vendor", href: "/reports/trail/vendor" },
          {
            id: "trail-sales-rep",
            label: "Sales Representative",
            href: "/reports/trail/sales-representative",
          },
        ],
      },
      {
        id: "tax",
        label: "Tax",
        icon: CircleDollarSign,
        children: [
          { id: "tax-output", label: "Output Tax", href: "/reports/tax/output-tax" },
          { id: "tax-input", label: "Input Tax", href: "/reports/tax/input-tax" },
          { id: "tax-liability", label: "Liability", href: "/reports/tax/liability" },
          { id: "tax-detail", label: "Detail", href: "/reports/tax/detail" },
          { id: "tax-by-category", label: "By Category", href: "/reports/tax/by-category" },
        ],
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
            children: [
              { id: "purchase-order-list", label: "List", href: "/transactions/purchase/order/list" },
              {
                id: "purchase-order-summary",
                label: "Summary",
                href: "/transactions/purchase/order/summary",
              },
            ],
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
        children: [
          { id: "items-items", label: "All Products", href: "/setup/items/items" },
          { id: "items-groups", label: "Categories", href: "/setup/items/groups" },
          { id: "items-subgroups", label: "Subcategories", href: "/setup/items/subgroups" },
          { id: "items-units", label: "Units of Measure", href: "/setup/items/units" },
          { id: "items-packs", label: "Pack & Cartons", href: "/setup/items/packs" },
          { id: "manufacturer", label: "Brands", href: "/setup/manufacturer" },
          { id: "scan-barcode", label: "Scan Barcode", href: "/catalog" },
          { id: "others-import", label: "Import Products", href: "/setup/others/import" },
        ],
      },
      { id: "customer", label: "Customer", icon: User, href: "/setup/customer" },
      { id: "vendor", label: "Vendor", icon: Building2, href: "/setup/vendor" },
      {
        id: "sales-rep",
        label: "Sales Representative",
        icon: IdCard,
        href: "/setup/sales-representative",
      },
      { id: "staff", label: "Staff", icon: UserRound, href: "/setup/staff" },
      { id: "manufacturer", label: "Manufacturer", icon: Factory, href: "/setup/manufacturer" },
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
        id: "expense-account",
        label: "Expense Account",
        icon: Calculator,
        href: "/setup/expense-account",
      },
      {
        id: "billing",
        label: "Billing",
        icon: FileText,
        children: [
          {
            id: "billing-subscriptions",
            label: "Subscriptions",
            href: "/setup/billing/subscriptions",
          },
        ],
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
          { id: "others-till", label: "Till", href: "/setup/others/till" },
          { id: "others-store", label: "Store", href: "/setup/others/store" },
          { id: "others-storefront", label: "Storefront", href: "/setup/others/storefront" },
          {
            id: "others-payment-gateway",
            label: "Payment Gateway",
            href: "/setup/others/payment-gateway",
          },
          { id: "others-tax", label: "Tax", href: "/setup/others/tax" },
          { id: "others-settings", label: "Settings", href: "/setup/others/settings" },
          { id: "others-data", label: "Data", href: "/setup/others/data" },
          { id: "others-import", label: "Import", href: "/setup/others/import" },
          { id: "others-export", label: "Export", href: "/setup/others/export" },
        ],
      },
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
        id: "items",
        label: "Products",
        icon: ShoppingCart,
        children: [
          { id: "items-items", label: "All Products", href: "/setup/items/items" },
          { id: "items-groups", label: "Categories", href: "/setup/items/groups" },
          { id: "items-subgroups", label: "Subcategories", href: "/setup/items/subgroups" },
          { id: "items-units", label: "Units of Measure", href: "/setup/items/units" },
          { id: "items-packs", label: "Pack & Cartons", href: "/setup/items/packs" },
          { id: "manufacturer", label: "Brands", href: "/setup/manufacturer" },
          { id: "scan-barcode", label: "Scan Barcode", href: "/catalog" },
          { id: "others-import", label: "Import Products", href: "/setup/others/import" },
        ],
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
        children: [
          { id: "purchase-order-list", label: "Order List", href: "/transactions/purchase/order/list" },
          {
            id: "purchase-order-summary",
            label: "Order Summary",
            href: "/transactions/purchase/order/summary",
          },
        ],
      },
      {
        id: "sales-return-list",
        label: "Refund",
        icon: RotateCcw,
        href: "/reports/sales/return/list",
      },
      {
        id: "tax",
        label: "Taxes",
        icon: CircleDollarSign,
        children: [
          { id: "tax-output", label: "Output Tax", href: "/reports/tax/output-tax" },
          { id: "tax-input", label: "Input Tax", href: "/reports/tax/input-tax" },
        ],
      },
      {
        id: "stock-report",
        label: "Stock",
        icon: ClipboardList,
        children: [
          { id: "stock-balance", label: "Balance", href: "/reports/stock/balance" },
          { id: "stock-movement", label: "Movement", href: "/reports/stock/movement" },
        ],
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
    heading: "Workspace",
    department: "Setup",
    items: [
      { id: "admin-hub", label: "Admin", icon: Landmark, href: "/admin" },
      { id: "audit-hub", label: "Audit", icon: ClipboardList, href: "/audit" },
      { id: "finance-hub", label: "Finance", icon: Banknote, href: "/finance" },
      { id: "hr-hub", label: "HR", icon: UserRound, href: "/hr" },
      { id: "procurement-hub", label: "Procurement", icon: Truck, href: "/procurement" },
      { id: "catalog-browser", label: "Catalog", icon: ScanBarcode, href: "/catalog" },
      {
        id: "verticals",
        label: "Verticals",
        icon: Boxes,
        children: [
          { id: "vertical-supermarket", label: "Supermarket", href: "/verticals/supermarket" },
          { id: "vertical-hotel", label: "Hotel", href: "/verticals/hotel" },
          { id: "vertical-restaurant", label: "Restaurant", href: "/verticals/restaurant" },
          { id: "vertical-dark-kitchen", label: "Dark Kitchen", href: "/verticals/dark-kitchen" },
        ],
      },
      { id: "it-integrations", label: "IT & Integrations", icon: Plug, href: "/it" },
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
          { id: "others-till", label: "Till", href: "/setup/others/till" },
          { id: "others-store", label: "Store", href: "/setup/others/store" },
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
    ],
  },
];

export function accessTree(): { heading: DepartmentName; items: AccessNode[] }[] {
  const buckets: Record<DepartmentName, AccessNode[]> = {
    Report: [],
    Transaction: [],
    Setup: [],
  };

  for (const section of ACCESS_NAV) {
    for (const item of section.items) {
      buckets[section.department].push(itemToAccess(item));
    }
  }

  return DEPARTMENTS.map((heading) => ({ heading, items: buckets[heading] }));
}
