import type { DirectoryName } from "@/lib/hq-directory";

export type EntityKind = "customer" | "vendor" | "sales-representative" | "staff";

export const DIRECTORY_OF: Record<EntityKind, DirectoryName> = {
  customer: "customers",
  vendor: "vendors",
  "sales-representative": "sales-reps",
  staff: "staff",
};

export const LABELS: Record<EntityKind, string> = {
  customer: "Customer",
  vendor: "Vendor",
  "sales-representative": "Sales Representative",
  staff: "Staff",
};

export function sameName(a?: string | null, b?: string | null) {
  return Boolean(a && b) && a!.trim().toLowerCase() === b!.trim().toLowerCase();
}