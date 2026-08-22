"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronsUpDown, KeyRound, LayoutDashboard, LogOut, type LucideIcon } from "lucide-react";
import { useAuth } from "./AuthProvider";
import type { ConsoleSession } from "../lib/access";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "P";
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export type AccountMenuItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export function AccountSwitcher({
  session,
  menu = "down",
  extraItems = [],
  plain = false,
  layout = "header",
}: {
  session: ConsoleSession;
  menu?: "up" | "down";
  extraItems?: AccountMenuItem[];
  plain?: boolean;
  layout?: "header" | "sidebar";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const items: AccountMenuItem[] = [
    ...extraItems,
    { href: "/password", label: "Password", icon: KeyRound },
  ];

  const isSidebar = layout === "sidebar";

  return (
    <div className="relative" ref={rootRef}>
      {open ? (
        <div
          role="menu"
          className={`absolute z-50 overflow-hidden rounded-2xl border border-pos-border bg-pos-surface py-1 shadow-pos-md ${
            menu === "up"
              ? "bottom-full left-0 right-0 mb-2"
              : "right-0 top-full mt-1 w-56"
          }`}
        >
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                role="menuitem"
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm ${
                  active
                    ? "bg-pos-primary-soft font-medium text-pos-primary"
                    : "text-pos-ink hover:bg-pos-surface-muted"
                }`}
              >
                <Icon size={16} strokeWidth={1.8} className="shrink-0 text-pos-ink-faint" />
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-pos-ink hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
            onClick={() => {
              setOpen(false);
              void logout().then(() => router.replace("/login"));
            }}
          >
            <LogOut size={16} strokeWidth={1.8} className="shrink-0 text-pos-ink-faint" />
            Sign out
          </button>
        </div>
      ) : null}
      <button
        type="button"
        className={`flex w-full min-w-0 items-center gap-3 rounded-2xl text-left ${
          isSidebar
            ? "border border-pos-border bg-pos-surface-muted px-3 py-2.5 hover:bg-pos-primary-soft"
            : `rounded-2xl px-2 py-1.5 sm:min-w-[12rem] sm:px-3 sm:py-2 ${
                plain
                  ? "bg-pos-surface shadow-pos-sm"
                  : "bg-pos-surface-muted hover:bg-pos-primary-soft"
              }`
        }`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span
          aria-hidden
          className={`grid shrink-0 place-items-center rounded-full bg-pos-primary font-semibold tracking-wide text-white ${
            isSidebar ? "h-10 w-10 text-xs" : "h-9 w-9 text-[11px]"
          }`}
        >
          {initials(session.name)}
        </span>
        <span className={`min-w-0 flex-1 ${isSidebar ? "block" : "hidden sm:block"}`}>
          <span className="block truncate text-sm font-semibold leading-5 text-pos-ink">
            {session.name}
          </span>
          <span className="mt-0.5 block truncate text-xs capitalize text-pos-ink-muted">
            {session.groupName}
          </span>
        </span>
        <ChevronsUpDown size={16} strokeWidth={1.8} className="shrink-0 text-pos-ink-faint" />
      </button>
    </div>
  );
}

export const openHqItem: AccountMenuItem = {
  href: "/dashboard",
  label: "Open HQ",
  icon: LayoutDashboard,
};
