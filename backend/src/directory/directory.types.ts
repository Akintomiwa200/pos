export const DIRECTORY_NAMES = [
  "customers",
  "vendors",
  "sales-reps",
  "staff",
  "manufacturers",
  "payment-methods",
  "promotions",
  "expense-accounts",
  "item-groups",
  "units",
] as const;

export type DirectoryName = (typeof DIRECTORY_NAMES)[number];

export type DirectoryRecord = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  note?: string;
  active: boolean;
  extra?: Record<string, string | number | boolean | null>;
};

export function isDirectoryName(value: string): value is DirectoryName {
  return (DIRECTORY_NAMES as readonly string[]).includes(value);
}
