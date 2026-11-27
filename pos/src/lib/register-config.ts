/** Register configuration mirrored from HQ into the till's local settings. */

export const REGISTER_BUTTON_KINDS = ["category", "product", "combo", "action"] as const;
export type RegisterButtonKind = (typeof REGISTER_BUTTON_KINDS)[number];

export const REGISTER_ACTIONS = ["discount", "hold", "saved", "payment", "new"] as const;
export type RegisterAction = (typeof REGISTER_ACTIONS)[number];

export const REGISTER_FIELD_KEYS = [
  "customer",
  "phone",
  "email",
  "notes",
  "reference",
  "tax",
  "tip",
] as const;
export type RegisterFieldKey = (typeof REGISTER_FIELD_KEYS)[number];

export const REGISTER_FIELD_MODES = ["hidden", "optional", "required"] as const;
export type RegisterFieldMode = (typeof REGISTER_FIELD_MODES)[number];

export const REGISTER_TENDER_IDS = ["cash", "card", "transfer", "wallet", "split"] as const;
export type RegisterTenderId = (typeof REGISTER_TENDER_IDS)[number];

export type RegisterQuickButton = {
  id: string;
  label: string;
  kind: RegisterButtonKind;
  value: string;
  color: string;
  active: boolean;
};

export type RegisterSaleField = {
  key: RegisterFieldKey;
  label: string;
  mode: RegisterFieldMode;
  order: number;
};

export type RegisterTender = {
  id: RegisterTenderId;
  label: string;
  hint: string;
  color: string;
  active: boolean;
  requiresReference: boolean;
};

export type RegisterOutletOverride = {
  id: string;
  scope: "branch" | "store";
  scopeId: string;
  label: string;
  requireOpenShift?: boolean;
  idleLockMinutes?: number;
  autoPrintReceipt?: boolean;
  receiptCopies?: number;
  receiptTemplate?: "classic" | "compact" | "bold" | "minimal";
  printDuplicateReceipt?: boolean;
  showSkuOnReceipt?: boolean;
  enabledTenders?: RegisterTenderId[];
  receiptFooter?: string;
};

export const DEFAULT_REGISTER_QUICK_BUTTONS: RegisterQuickButton[] = [
  { id: "all", label: "All items", kind: "category", value: "all", color: "#0F766E", active: true },
  { id: "combos", label: "Combos", kind: "combo", value: "combos", color: "#7C3AED", active: true },
];

export const DEFAULT_REGISTER_SALE_FIELDS: RegisterSaleField[] = [
  { key: "customer", label: "Customer name", mode: "optional", order: 0 },
  { key: "phone", label: "Phone number", mode: "optional", order: 1 },
  { key: "notes", label: "Sale note", mode: "optional", order: 2 },
];

export const DEFAULT_REGISTER_TENDERS: RegisterTender[] = [
  {
    id: "cash",
    label: "Cash",
    hint: "Count notes and coins, then confirm.",
    color: "#16A34A",
    active: true,
    requiresReference: false,
  },
  {
    id: "card",
    label: "Credit Card",
    hint: "Wait for the approval slip.",
    color: "#2563EB",
    active: true,
    requiresReference: false,
  },
  {
    id: "transfer",
    label: "Bank Transfer",
    hint: "Confirm the bank alert before closing.",
    color: "#7C3AED",
    active: true,
    requiresReference: true,
  },
  {
    id: "wallet",
    label: "Wallet",
    hint: "Confirm credit in the wallet app.",
    color: "#DB2777",
    active: true,
    requiresReference: false,
  },
  {
    id: "split",
    label: "Split Payment",
    hint: "Share this ticket across methods.",
    color: "#EA580C",
    active: true,
    requiresReference: false,
  },
];

export const DEFAULT_REGISTER_OUTLET_OVERRIDES: RegisterOutletOverride[] = [];

export function labelForRegisterField(key: RegisterFieldKey) {
  switch (key) {
    case "customer":
      return "Customer name";
    case "phone":
      return "Phone number";
    case "email":
      return "Email address";
    case "notes":
      return "Sale note";
    case "reference":
      return "Reference";
    case "tax":
      return "Tax exemption";
    case "tip":
      return "Tip";
    default:
      return key;
  }
}
