"use client";

import {
  CalendarClock,
  ClipboardList,
  Gift,
  PackageX,
  ShieldAlert,
  Truck,
  type LucideIcon,
} from "lucide-react";

export type Line = { key: string; itemId: string; quantity: string; reason: string };
export type ReasonTone = "rose" | "amber" | "red" | "orange" | "sky" | "violet";

export const REASONS = [
  "Damaged",
  "Expired",
  "Theft/loss",
  "Giveaway",
  "Count correction",
  "Supplier short-ship",
];

export const REASON_ICONS: Record<string, LucideIcon> = {
  Damaged: PackageX,
  Expired: CalendarClock,
  "Theft/loss": ShieldAlert,
  Giveaway: Gift,
  "Count correction": ClipboardList,
  "Supplier short-ship": Truck,
};

export const REASON_TONES: Record<string, ReasonTone> = {
  Damaged: "rose",
  Expired: "amber",
  "Theft/loss": "red",
  Giveaway: "orange",
  "Count correction": "sky",
  "Supplier short-ship": "violet",
};

export const TONE_TILE: Record<ReasonTone, string> = {
  rose: "border-rose-200/70 bg-rose-50 text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/40 dark:text-rose-300",
  amber: "border-amber-200/70 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-300",
  red: "border-red-200/70 bg-red-50 text-red-700 dark:border-red-800/50 dark:bg-red-950/40 dark:text-red-300",
  orange: "border-orange-200/70 bg-orange-50 text-orange-700 dark:border-orange-800/50 dark:bg-orange-950/40 dark:text-orange-300",
  sky: "border-sky-200/70 bg-sky-50 text-sky-700 dark:border-sky-800/50 dark:bg-sky-950/40 dark:text-sky-300",
  violet: "border-violet-200/70 bg-violet-50 text-violet-700 dark:border-violet-800/50 dark:bg-violet-950/40 dark:text-violet-300",
};

export const TONE_CHIP: Record<ReasonTone, string> = {
  rose: "bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300",
  red: "bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-300",
  orange: "bg-orange-100 text-orange-700 dark:bg-orange-950/70 dark:text-orange-300",
  sky: "bg-sky-100 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300",
  violet: "bg-violet-100 text-violet-700 dark:bg-violet-950/70 dark:text-violet-300",
};

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const blankRow = (reason = "", itemId = "") => ({
  key: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  itemId,
  quantity: "",
  reason,
});