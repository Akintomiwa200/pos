"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_CURRENCY, DEFAULT_LANGUAGE, DEFAULT_TIMEZONE } from "@/lib/locale";

export type OrgLocale = {
  currency: string;
  language: string;
  timezone: string;
};

const STORAGE_KEY = "pos.org-locale";

const DEFAULT_LOCALE: OrgLocale = {
  currency: DEFAULT_CURRENCY,
  language: DEFAULT_LANGUAGE,
  timezone: DEFAULT_TIMEZONE,
};

let current: OrgLocale = { ...DEFAULT_LOCALE };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function getOrgLocale(): OrgLocale {
  return current;
}

export function getCurrency() {
  return current.currency;
}

export function subscribeOrgLocale(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setOrgLocale(partial: Partial<OrgLocale>) {
  const next: OrgLocale = {
    currency: (partial.currency ?? current.currency).trim().toUpperCase() || DEFAULT_CURRENCY,
    language: partial.language?.trim() || current.language,
    timezone: partial.timezone?.trim() || current.timezone,
  };
  if (
    next.currency === current.currency &&
    next.language === current.language &&
    next.timezone === current.timezone
  ) {
    return current;
  }
  current = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / private mode */
  }
  emit();
  return current;
}

export function hydrateOrgLocaleFromStorage() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<OrgLocale>;
    if (parsed.currency || parsed.language || parsed.timezone) {
      current = {
        currency: parsed.currency?.trim().toUpperCase() || current.currency,
        language: parsed.language?.trim() || current.language,
        timezone: parsed.timezone?.trim() || current.timezone,
      };
      emit();
    }
  } catch {
    /* ignore */
  }
}

export function useOrgLocale(): OrgLocale {
  return useSyncExternalStore(subscribeOrgLocale, getOrgLocale, () => DEFAULT_LOCALE);
}

function localeTag() {
  return current.language || "en";
}

export function formatMinor(minor: number, fractionDigits = 2, currency = current.currency) {
  const code = currency || DEFAULT_CURRENCY;
  try {
    return (minor / 100).toLocaleString(localeTag(), {
      style: "currency",
      currency: code,
      maximumFractionDigits: fractionDigits,
      minimumFractionDigits: fractionDigits === 0 ? 0 : Math.min(2, fractionDigits),
    });
  } catch {
    return `${code} ${(minor / 100).toFixed(fractionDigits)}`;
  }
}

export function currencySymbol(currency = current.currency) {
  const code = currency || DEFAULT_CURRENCY;
  try {
    const part = new Intl.NumberFormat(localeTag(), {
      style: "currency",
      currency: code,
    })
      .formatToParts(0)
      .find((row) => row.type === "currency");
    return part?.value || code;
  } catch {
    return code;
  }
}

export function compactMinor(minor: number, currency = current.currency) {
  const value = minor / 100;
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const amount =
    abs >= 1_000_000_000_000
      ? `${(abs / 1_000_000_000_000).toFixed(1)}tn`
      : abs >= 1_000_000_000
        ? `${(abs / 1_000_000_000).toFixed(1)}bn`
        : abs >= 1_000_000
          ? `${(abs / 1_000_000).toFixed(1)}m`
          : abs >= 1_000
            ? `${(abs / 1_000).toFixed(1)}k`
            : `${Math.round(abs)}`;
  return `${sign}${currencySymbol(currency)}${amount}`;
}
