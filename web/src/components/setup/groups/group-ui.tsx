"use client";

import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  Calculator,
  Headphones,
  Package,
  Settings2,
  Shield,
  ShoppingBag,
  Warehouse,
} from "lucide-react";
import type { ConsoleGroup } from "@/lib/access";

const GROUP_ICON_TONES: Array<{ bg: string; fg: string; Icon: LucideIcon }> = [
  { bg: "#eee8ff", fg: "#5b3fd4", Icon: Shield },
  { bg: "#fff1e8", fg: "#c2410c", Icon: Calculator },
  { bg: "#e8f8ef", fg: "#15803d", Icon: ShoppingBag },
  { bg: "#e8f2ff", fg: "#2563eb", Icon: Briefcase },
  { bg: "#fef3c7", fg: "#b45309", Icon: Package },
  { bg: "#ecfeff", fg: "#0e7490", Icon: Warehouse },
  { bg: "#fce7f3", fg: "#be185d", Icon: Headphones },
  { bg: "#f3f4f6", fg: "#4b5563", Icon: Settings2 },
];

export function groupVisual(name: string, index = 0) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash + name.charCodeAt(i) * (i + 1)) % 997;
  const tone = GROUP_ICON_TONES[(hash + index) % GROUP_ICON_TONES.length];
  const key = name.toLowerCase();
  if (key.includes("admin")) return { ...GROUP_ICON_TONES[0], Icon: Shield };
  if (key.includes("account")) return { ...GROUP_ICON_TONES[1], Icon: Calculator };
  if (key.includes("sales") || key.includes("cashier"))
    return { ...GROUP_ICON_TONES[2], Icon: ShoppingBag };
  if (key.includes("manager") || key.includes("store"))
    return { ...GROUP_ICON_TONES[3], Icon: Briefcase };
  if (key.includes("inventory") || key.includes("stock"))
    return { ...GROUP_ICON_TONES[5], Icon: Warehouse };
  if (key.includes("support")) return { ...GROUP_ICON_TONES[6], Icon: Headphones };
  return tone;
}

export function isAdminGroup(group: ConsoleGroup) {
  return group.privileges.includes("*") || group.departments.includes("*");
}

export function privilegeSummary(group: ConsoleGroup) {
  if (group.privileges.includes("*")) return "Full access";
  return `${group.privileges.length} privilege${group.privileges.length === 1 ? "" : "s"}`;
}

export function roleBlurb(name: string) {
  const key = name.toLowerCase();
  if (key.includes("admin")) return "Full console access — users, settings, and every department.";
  if (key.includes("store manager") || key.includes("manager"))
    return "Runs the floor — products, stock, sales, staff, and day-to-day ops.";
  if (key.includes("account"))
    return "Books, statements, tax, billing, and financial reports.";
  if (key.includes("sales associate") || key === "sales")
    return "Sells and supports customers — POS, invoices, and promotions.";
  if (key.includes("cashier"))
    return "Till-focused — POS, payments, refunds, and customers only.";
  if (key.includes("inventory"))
    return "Catalogue and warehouse — products, stock, orders, and vendors.";
  if (key.includes("support"))
    return "Customer care — chat, CRM support tools, and customer records.";
  return "Custom access defined by the privileges ticked for this group.";
}
