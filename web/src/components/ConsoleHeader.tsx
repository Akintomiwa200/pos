"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Menu, Search } from "lucide-react";
import { AccountSwitcher } from "./AccountSwitcher";
import { NotificationMenu } from "./NotificationMenu";
import type { ConsoleSession } from "../lib/access";
import { isNavGroup, type NavNode, type NavSection } from "../lib/nav";

type SearchHit = { href: string; label: string; trail: string };

function flattenNav(nav: NavSection[]): SearchHit[] {
  const hits: SearchHit[] = [];

  function walk(nodes: NavNode[], trail: string[]) {
    for (const node of nodes) {
      if (isNavGroup(node)) {
        walk(node.children, [...trail, node.label]);
        continue;
      }
      hits.push({
        href: node.href,
        label: node.label,
        trail: [...trail, node.label].join(" · "),
      });
    }
  }

  for (const section of nav) {
    for (const item of section.items) {
      if (item.href) {
        hits.push({
          href: item.href,
          label: item.label,
          trail: `${section.heading} · ${item.label}`,
        });
      }
      if (item.children?.length) {
        walk(item.children, [section.heading, item.label]);
      }
    }
  }

  return hits;
}

function ConsoleSearch({ nav }: { nav: NavSection[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const pages = useMemo(() => flattenNav(nav), [nav]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pages.slice(0, 6);
    return pages
      .filter(
        (row) =>
          row.label.toLowerCase().includes(q) || row.trail.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [pages, query]);

  useEffect(() => {
    setOpen(false);
    setQuery("");
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

  return (
    <div className="relative min-w-0 flex-1" ref={rootRef}>
      <label className="flex items-center gap-2 rounded-xl border border-transparent bg-white px-3 py-2 shadow-[0_1px_2px_rgba(28,28,30,0.04)] focus-within:border-[#6d4aff]">
        <Search size={16} strokeWidth={1.8} className="shrink-0 text-neutral-400" />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search HQ"
          className="w-full bg-transparent text-sm text-[#1c1c1e] outline-none placeholder:text-neutral-400"
        />
      </label>
      {open ? (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-2xl border border-neutral-100 bg-white py-1 shadow-[0_12px_40px_rgba(28,28,30,0.12)]">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-neutral-500">No matching pages.</p>
          ) : (
            results.map((row) => (
              <button
                key={row.href}
                type="button"
                className="flex w-full flex-col px-3 py-2 text-left hover:bg-[#f6f5f8]"
                onClick={() => {
                  setOpen(false);
                  setQuery("");
                  router.push(row.href);
                }}
              >
                <span className="text-sm text-[#1c1c1e]">{row.label}</span>
                <span className="text-[11px] text-neutral-400">{row.trail}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

export function ConsoleHeader({
  session,
  nav,
  onOpenNav,
}: {
  session: ConsoleSession;
  nav: NavSection[];
  onOpenNav?: () => void;
}) {
  return (
    <header className="flex h-16 w-full shrink-0 items-center gap-3 bg-[#f3f4f8] px-4 sm:px-6 lg:h-[10vh] lg:gap-4 lg:px-8">
      <button
        type="button"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#1c1c1e] shadow-[0_1px_2px_rgba(28,28,30,0.04)] lg:hidden"
        aria-label="Open menu"
        onClick={onOpenNav}
      >
        <Menu size={18} strokeWidth={1.8} />
      </button>
      <ConsoleSearch nav={nav} />
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <NotificationMenu token={session.token} />
        <AccountSwitcher session={session} plain />
      </div>
    </header>
  );
}
