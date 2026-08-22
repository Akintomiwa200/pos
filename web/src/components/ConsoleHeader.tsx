"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Menu, Search } from "lucide-react";
import { AccountSwitcher } from "./AccountSwitcher";
import { NotificationMenu } from "./NotificationMenu";
import { filterAccessNav } from "../lib/access";
import type { ConsoleSession } from "../lib/access";
import { flattenNavForSearch, resolvePageCrumbs } from "../lib/page-meta";
import type { NavSection } from "../lib/nav";

function ConsolePageTitle({ pathname }: { pathname: string }) {
  const crumbs = useMemo(() => resolvePageCrumbs(pathname), [pathname]);

  if (crumbs.length <= 1) {
    return (
      <h1 className="min-w-0 truncate text-[15px] font-semibold tracking-tight text-pos-ink lg:text-base">
        {crumbs[0]}
      </h1>
    );
  }

  return (
    <nav
      aria-label="Current page"
      className="min-w-0 max-w-[10rem] sm:max-w-[14rem] md:max-w-[20rem] lg:max-w-[24rem] xl:max-w-none"
    >
      <ol className="flex min-w-0 items-center gap-1 text-[13px] lg:text-[14px]">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <li key={`${crumb}-${index}`} className="flex min-w-0 items-center gap-1">
              {index > 0 ? (
                <ChevronRight
                  size={13}
                  strokeWidth={2}
                  className="shrink-0 text-pos-ink-faint"
                  aria-hidden
                />
              ) : null}
              <span
                className={`truncate ${last ? "font-semibold text-pos-ink" : "font-medium text-pos-ink-muted"}`}
                title={crumb}
              >
                {crumb}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function ConsoleSearch({ nav }: { nav: NavSection[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const pages = useMemo(() => flattenNavForSearch(nav), [nav]);

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
    <div className="relative w-[min(100%,12.5rem)] sm:w-56 lg:w-60" ref={rootRef}>
      <label className="flex items-center gap-2 rounded-xl border border-transparent bg-pos-surface px-3 py-2 shadow-pos-sm focus-within:border-pos-primary">
        <Search size={16} strokeWidth={1.8} className="shrink-0 text-pos-ink-faint" />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search HQ"
          className="w-full bg-transparent text-sm text-pos-ink outline-none placeholder:text-pos-ink-faint"
        />
      </label>
      {open ? (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-2xl border border-pos-border bg-pos-surface py-1 shadow-pos-md">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-pos-ink-muted">No matching pages.</p>
          ) : (
            results.map((row) => (
              <button
                key={row.href}
                type="button"
                className="flex w-full flex-col px-3 py-2 text-left hover:bg-pos-surface-muted"
                onClick={() => {
                  setOpen(false);
                  setQuery("");
                  router.push(row.href);
                }}
              >
                <span className="text-sm text-pos-ink">{row.label}</span>
                <span className="text-[11px] text-pos-ink-faint">{row.trail}</span>
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
  const searchNav = filterAccessNav(session.departments, session.privileges);
  const pathname = usePathname();

  return (
    <header className="flex h-16 w-full shrink-0 items-center gap-3 bg-pos-bg px-4 sm:px-6 lg:h-[10vh] lg:gap-4 lg:px-8">
      <button
        type="button"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-pos-surface text-pos-ink shadow-pos-sm lg:hidden"
        aria-label="Open menu"
        onClick={onOpenNav}
      >
        <Menu size={18} strokeWidth={1.8} />
      </button>
      <ConsolePageTitle pathname={pathname} />
      <ConsoleSearch nav={searchNav} />
      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <NotificationMenu token={session.token} />
        <div className="w-[min(100%,13rem)] sm:w-56">
          <AccountSwitcher session={session} layout="sidebar" menu="down" />
        </div>
      </div>
    </header>
  );
}
