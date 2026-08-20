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
}: {
  session: ConsoleSession;
  menu?: "up" | "down";
  extraItems?: AccountMenuItem[];
  plain?: boolean;
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

  return (
    <div className="relative" ref={rootRef}>
      {open ? (
        <div
          role="menu"
          className={`absolute z-50 w-56 overflow-hidden rounded-2xl border border-neutral-100 bg-white py-1 shadow-[0_12px_40px_rgba(28,28,30,0.12)] ${
            menu === "up" ? "bottom-full left-0 right-0 mb-1 w-auto" : "right-0 top-full mt-1"
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
                    ? "bg-[#f4f0ff] font-medium text-[#6d4aff]"
                    : "text-[#1c1c1e] hover:bg-[#f6f5f8]"
                }`}
              >
                <Icon size={16} strokeWidth={1.8} className="shrink-0 text-neutral-400" />
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-[#1c1c1e] hover:bg-[#fef2f2] hover:text-red-600"
            onClick={() => {
              setOpen(false);
              void logout().then(() => router.replace("/login"));
            }}
          >
            <LogOut size={16} strokeWidth={1.8} className="shrink-0 text-neutral-400" />
            Sign out
          </button>
        </div>
      ) : null}
      <button
        type="button"
        className={`flex w-full min-w-0 items-center gap-3 rounded-2xl px-2 py-1.5 text-left sm:min-w-[12rem] sm:px-3 sm:py-2 ${
          plain
            ? "bg-white shadow-[0_1px_2px_rgba(28,28,30,0.04)]"
            : "bg-[#f6f5f8] hover:bg-[#f4f0ff]"
        }`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span
          aria-hidden
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#6d4aff] text-[11px] font-semibold tracking-wide text-white"
        >
          {initials(session.name)}
        </span>
        <span className="hidden min-w-0 flex-1 sm:block">
          <span className="block truncate text-sm font-semibold leading-5 text-[#1c1c1e]">
            {session.name}
          </span>
          <span className="mt-0.5 block truncate text-xs capitalize text-neutral-500">
            {session.groupName}
          </span>
        </span>
        <ChevronsUpDown size={16} strokeWidth={1.8} className="shrink-0 text-neutral-400" />
      </button>
    </div>
  );
}

export const openHqItem: AccountMenuItem = {
  href: "/dashboard",
  label: "Open HQ",
  icon: LayoutDashboard,
};
