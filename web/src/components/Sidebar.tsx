"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, LayoutDashboard, LogOut, SlidersHorizontal, X } from "lucide-react";
import { AccountSwitcher } from "./AccountSwitcher";
import { BrandLogo } from "./site/BrandLogo";
import { useAuth } from "./AuthProvider";
import { getCompany, type HqCompany } from "../lib/hq-setup";
import type { ConsoleSession } from "../lib/access";
import {
  isNavGroup,
  type NavItem,
  type NavNode,
  type NavSection,
} from "../lib/nav";

function navPathname(pathname: string) {
  return pathname === "/crm" ? "/crm/overview" : pathname;
}

function isActivePath(pathname: string, href?: string) {
  const path = navPathname(pathname);
  if (!href) return false;
  if (href === "/admin") return path === "/admin";
  return path === href || path.startsWith(`${href}/`);
}

function allNavHrefs(nav: NavSection[]): string[] {
  const hrefs: string[] = [];
  for (const section of nav) {
    for (const item of section.items) {
      if (item.href) hrefs.push(item.href);
      if (item.children?.length) hrefs.push(...collectLeafHrefs(item.children));
    }
  }
  return hrefs;
}

function collectLeafHrefs(nodes: NavNode[]): string[] {
  const hrefs: string[] = [];
  for (const node of nodes) {
    if (isNavGroup(node)) hrefs.push(...collectLeafHrefs(node.children));
    else if (node.href) hrefs.push(node.href);
  }
  return hrefs;
}

/** Highlight only the most specific matching nav link (avoids /crm + /crm/contacts both active). */
function isLeafNavActive(pathname: string, href: string, allHrefs: string[]) {
  const path = navPathname(pathname);
  const matches = allHrefs.filter((h) => path === h || path.startsWith(`${h}/`));
  if (!matches.length) return false;
  const best = matches.sort((a, b) => b.length - a.length)[0];
  return best === href;
}

function nodeMatches(pathname: string, node: NavNode): boolean {
  if (isNavGroup(node)) return node.children.some((child) => nodeMatches(pathname, child));
  return isActivePath(pathname, node.href);
}

function itemMatches(pathname: string, item: NavItem): boolean {
  if (isActivePath(pathname, item.href)) return true;
  return (item.children ?? []).some((child) => nodeMatches(pathname, child));
}

function openIdsForPath(pathname: string, nav: NavSection[]) {
  const open: Record<string, boolean> = {};

  function walkNodes(nodes: NavNode[]) {
    for (const node of nodes) {
      if (isNavGroup(node) && nodeMatches(pathname, node)) {
        open[node.id] = true;
        walkNodes(node.children);
      }
    }
  }

  for (const section of nav) {
    for (const item of section.items) {
      if (itemMatches(pathname, item) && item.children) {
        open[item.id] = true;
        walkNodes(item.children);
      }
    }
  }
  return open;
}

function subtreeIndent(depth: number) {
  // Align level 1 under parent label (icon + gaps), then step each level.
  return 48 + depth * 20;
}

function NestedList({
  nodes,
  pathname,
  open,
  onToggle,
  depth = 0,
  leafHrefs,
}: {
  nodes: NavNode[];
  pathname: string;
  open: Record<string, boolean>;
  onToggle: (id: string) => void;
  depth?: number;
  leafHrefs: string[];
}) {
  return (
    <div
      className="mt-1 mb-1 flex flex-col gap-0.5"
      style={{ paddingLeft: subtreeIndent(depth) }}
    >
      {nodes.map((node) => {
        if (isNavGroup(node)) {
          const expanded = Boolean(open[node.id]);
          const active = nodeMatches(pathname, node);
          return (
            <div key={node.id}>
              <button
                type="button"
                className={`flex w-full items-center gap-2 rounded-lg py-1.5 pr-1 text-left text-[13px] transition ${
                  active
                    ? "font-medium text-pos-primary"
                    : "text-pos-ink-muted hover:text-pos-primary"
                }`}
                onClick={() => onToggle(node.id)}
                aria-expanded={expanded}
              >
                <span className="flex-1">{node.label}</span>
                <ChevronDown
                  size={14}
                  className={`shrink-0 transition ${expanded ? "rotate-180" : ""} ${
                    active ? "text-pos-primary" : "text-pos-ink-faint"
                  }`}
                />
              </button>
              {expanded && (
                <NestedList
                  nodes={node.children}
                  pathname={pathname}
                  open={open}
                  onToggle={onToggle}
                  depth={depth + 1}
                  leafHrefs={leafHrefs}
                />
              )}
            </div>
          );
        }

        const active = isLeafNavActive(pathname, node.href, leafHrefs);
        return (
          <Link
            key={node.id}
            href={node.href}
            className={`block rounded-lg px-2 py-1.5 text-[13px] transition ${
              active
                ? "bg-pos-primary font-medium text-white shadow-[0_4px_12px_rgba(109,74,255,0.28)]"
                : "text-pos-ink-muted hover:bg-pos-primary-soft hover:text-pos-primary"
            }`}
          >
            {node.label}
          </Link>
        );
      })}
    </div>
  );
}

function NavRow({
  item,
  pathname,
  expanded,
  onToggle,
  leafHrefs,
}: {
  item: NavItem;
  pathname: string;
  expanded: boolean;
  onToggle: () => void;
  leafHrefs: string[];
}) {
  const Icon = item.icon;
  const dropdown = Array.isArray(item.children);
  const branchActive = itemMatches(pathname, item);
  const selfActive = !dropdown && Boolean(item.href) && isLeafNavActive(pathname, item.href!, leafHrefs);

  let rowClass =
    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] transition ";

  if (selfActive) {
    rowClass +=
      "bg-pos-primary font-medium text-white shadow-[0_4px_14px_rgba(109,74,255,0.3)]";
  } else if (branchActive && dropdown) {
    rowClass += "font-medium text-pos-primary";
  } else {
    rowClass += "text-pos-ink hover:bg-pos-surface-muted";
  }

  const iconClass = selfActive
    ? "shrink-0 text-white"
    : branchActive && dropdown
      ? "shrink-0 text-pos-primary"
      : "shrink-0 text-pos-ink-muted";

  const chevronClass = `shrink-0 transition ${expanded ? "rotate-180" : ""} ${
    selfActive || branchActive ? "text-current opacity-80" : "text-pos-ink-faint"
  }`;

  if (dropdown) {
    return (
      <button
        type="button"
        className={rowClass}
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <Icon size={18} strokeWidth={1.75} className={iconClass} />
        <span className="flex-1">{item.label}</span>
        <ChevronDown size={16} className={chevronClass} />
      </button>
    );
  }

  return (
    <Link href={item.href ?? "/dashboard"} className={rowClass}>
      <Icon size={18} strokeWidth={1.75} className={iconClass} />
      <span className="flex-1">{item.label}</span>
    </Link>
  );
}

function companyInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "C";
  return words
    .slice(0, 2)
    .map((word) => (word[0] ?? "").toUpperCase())
    .join("");
}

export function Sidebar({
  session,
  nav,
  homeHref = "/dashboard",
  open = false,
  onClose,
}: {
  session: ConsoleSession;
  nav: NavSection[];
  homeHref?: string;
  open?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [company, setCompany] = useState<HqCompany | null>(null);
  const dashboardActive = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const canSeeDashboard = nav.some(
    (section) =>
      section.heading === "Main Menu" &&
      section.items.some((item) => item.id === "dashboard"),
  );
  const settingsAllowed = nav.some(
    (section) =>
      section.heading === "Settings" &&
      section.items.some((item) => item.id === "others-settings"),
  );
  const navHrefs = allNavHrefs(nav);

  useEffect(() => {
    if (session.scope === "producer") return;
    let mounted = true;
    getCompany()
      .then((row) => {
        if (mounted) setCompany(row);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [session.scope]);

  useEffect(() => {
    setOpenMenus((current) => ({ ...current, ...openIdsForPath(pathname, nav) }));
  }, [pathname, nav]);

  function toggle(id: string) {
    setOpenMenus((current) => ({ ...current, [id]: !current[id] }));
  }

  function renderSection(section: NavSection) {
    return (
      <div key={section.heading} className="mb-5">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-pos-sidebar-muted">
          {section.heading}
        </p>
        <div className="flex flex-col gap-0.5">
          {section.items.map((item) => {
            const dropdown = Array.isArray(item.children);
            const expanded = Boolean(openMenus[item.id]);

            return (
              <div key={item.id}>
                <NavRow
                  item={item}
                  pathname={pathname}
                  expanded={expanded}
                  onToggle={() => toggle(item.id)}
                  leafHrefs={navHrefs}
                />
                {dropdown && expanded && (item.children?.length ?? 0) > 0 && (
                  <NestedList
                    nodes={item.children!}
                    pathname={pathname}
                    open={openMenus}
                    onToggle={toggle}
                    leafHrefs={collectLeafHrefs(item.children!)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const mainMenu = nav.find((section) => section.heading === "Main Menu");
  const settingsSection = nav.find((section) => section.heading === "Settings");
  const otherSections = nav.filter(
    (section) => section.heading !== "Main Menu" && section.heading !== "Settings",
  );
  const settingsActive = isActivePath(pathname, "/setup/others/settings");

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <>
      <button
        type="button"
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-label="Close menu"
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-svh w-72 shrink-0 flex-col border-r border-pos-border bg-pos-surface shadow-pos-md transition-transform duration-200 lg:static lg:z-auto lg:h-full lg:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        aria-label="Console navigation"
      >
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="min-w-0 flex-1">
            {session.scope !== "producer" && company ? (
              <Link href={homeHref} className="flex min-w-0 items-center gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-pos-primary text-white shadow-pos-primary">
                  <span className="text-[12px] font-semibold tracking-wide">
                    {companyInitials(company.name)}
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-medium leading-tight tracking-tight text-pos-ink">
                    {company.name}
                  </span>
                  <span className="block truncate text-[11px] text-pos-ink-faint">
                    {company.state || "Company"}
                  </span>
                </span>
              </Link>
            ) : (
              <BrandLogo href={homeHref} size="sm" />
            )}
            {session.scope === "producer" ? (
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-pos-primary">
                Super Admin
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-full text-pos-ink-muted hover:bg-pos-surface-muted lg:hidden"
            aria-label="Close menu"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          {(canSeeDashboard || (mainMenu?.items.filter((item) => item.id !== "dashboard").length ?? 0) > 0) ? (
          <div className="mb-5">
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-pos-sidebar-muted">
              Main Menu
            </p>
            <div className="flex flex-col gap-0.5">
              {canSeeDashboard ? (
                <Link
                  href="/dashboard"
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition ${
                    dashboardActive
                      ? "bg-pos-primary font-medium text-white shadow-[0_4px_14px_rgba(109,74,255,0.3)]"
                      : "text-pos-ink hover:bg-pos-surface-muted"
                  }`}
                >
                  <LayoutDashboard
                    size={18}
                    strokeWidth={1.75}
                    className={dashboardActive ? "text-white" : "text-pos-ink-muted"}
                  />
                  <span className="flex-1">Dashboard</span>
                </Link>
              ) : null}
              {mainMenu?.items
                .filter((item) => item.id !== "dashboard")
                .map((item) => {
                const dropdown = Array.isArray(item.children);
                const expanded = Boolean(openMenus[item.id]);

                return (
                  <div key={item.id}>
                    <NavRow
                      item={item}
                      pathname={pathname}
                      expanded={expanded}
                      onToggle={() => toggle(item.id)}
                      leafHrefs={navHrefs}
                    />
                    {dropdown && expanded && (item.children?.length ?? 0) > 0 && (
                      <NestedList
                        nodes={item.children!}
                        pathname={pathname}
                        open={openMenus}
                        onToggle={toggle}
                        leafHrefs={collectLeafHrefs(item.children!)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          ) : null}

          {nav.length === 0 && (
            <p className="px-3 text-sm text-pos-ink-faint">No menus assigned to this group.</p>
          )}

          {otherSections.map((section) => renderSection(section))}

          {settingsAllowed ||
          (settingsSection?.items.filter((item) => item.id !== "others-settings").length ?? 0) > 0 ? (
          <div className="mb-2">
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-pos-sidebar-muted">
              Settings
            </p>
            <div className="flex flex-col gap-0.5">
              {settingsSection?.items
                .filter((item) => item.id !== "others-settings")
                .map((item) => {
                  const dropdown = Array.isArray(item.children);
                  const expanded = Boolean(openMenus[item.id]);

                  return (
                    <div key={item.id}>
                      <NavRow
                        item={item}
                        pathname={pathname}
                        expanded={expanded}
                        onToggle={() => toggle(item.id)}
                        leafHrefs={navHrefs}
                      />
                      {dropdown && expanded && (item.children?.length ?? 0) > 0 && (
                        <NestedList
                          nodes={item.children!}
                          pathname={pathname}
                          open={openMenus}
                          onToggle={toggle}
                          leafHrefs={collectLeafHrefs(item.children!)}
                        />
                      )}
                    </div>
                  );
                })}
              {settingsAllowed ? (
                <Link
                  href="/setup/others/settings"
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition ${
                    settingsActive
                      ? "bg-pos-primary font-medium text-white shadow-[0_4px_14px_rgba(109,74,255,0.3)]"
                      : "text-pos-ink hover:bg-pos-surface-muted"
                  }`}
                >
                  <SlidersHorizontal
                    size={18}
                    strokeWidth={1.75}
                    className={settingsActive ? "text-white" : "text-pos-ink-muted"}
                  />
                  <span className="flex-1">Settings</span>
                </Link>
              ) : null}
            </div>
          </div>
          ) : null}

          <div className="mb-2">
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] text-pos-ink transition hover:bg-pos-surface-muted"
              >
                <LogOut size={18} strokeWidth={1.75} className="shrink-0 text-pos-ink-muted" />
                <span className="flex-1">Log Out</span>
              </button>
            </div>
          </div>
        </nav>

        <div className="p-3">
          <AccountSwitcher session={session} menu="up" layout="sidebar" />
        </div>
      </aside>
    </>
  );
}
