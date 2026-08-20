"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { BrandLogo } from "./site/BrandLogo";
import {
  isNavGroup,
  type NavItem,
  type NavNode,
  type NavSection,
} from "../lib/nav";

function isActivePath(pathname: string, href?: string) {
  if (!href) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
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

function NestedList({
  nodes,
  pathname,
  open,
  onToggle,
}: {
  nodes: NavNode[];
  pathname: string;
  open: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="ml-4 border-l border-[#ddd6fe] pl-3">
      {nodes.map((node) => {
        if (isNavGroup(node)) {
          const expanded = Boolean(open[node.id]);
          const active = nodeMatches(pathname, node);
          return (
            <div key={node.id}>
              <button
                type="button"
                className={`flex w-full items-center gap-2 rounded-md py-1.5 pr-1 text-left text-[14px] ${
                  active ? "font-semibold text-[#6d4aff]" : "text-neutral-600 hover:text-[#6d4aff]"
                }`}
                onClick={() => onToggle(node.id)}
                aria-expanded={expanded}
              >
                <span className="flex-1">{node.label}</span>
                <ChevronDown
                  size={14}
                  className={`shrink-0 text-neutral-400 transition ${expanded ? "rotate-180" : ""}`}
                />
              </button>
              {expanded && (
                <NestedList
                  nodes={node.children}
                  pathname={pathname}
                  open={open}
                  onToggle={onToggle}
                />
              )}
            </div>
          );
        }

        const active = isActivePath(pathname, node.href);
        return (
          <Link
            key={node.id}
            href={node.href}
            className={`block rounded-md px-2 py-1.5 text-[14px] ${
              active
                ? "bg-[#f4f0ff] font-semibold text-[#6d4aff]"
                : "text-neutral-500 hover:text-[#6d4aff]"
            }`}
          >
            {node.label}
          </Link>
        );
      })}
    </div>
  );
}

export function Sidebar({
  nav,
  open = false,
  onClose,
}: {
  nav: NavSection[];
  open?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOpenMenus((current) => ({ ...current, ...openIdsForPath(pathname, nav) }));
  }, [pathname, nav]);

  function toggle(id: string) {
    setOpenMenus((current) => ({ ...current, [id]: !current[id] }));
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
        className={`fixed inset-y-0 left-0 z-50 flex h-svh w-72 shrink-0 flex-col border-r border-neutral-200 bg-white shadow-[8px_0_30px_rgba(28,28,30,0.12)] transition-transform duration-200 lg:static lg:z-auto lg:h-full lg:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        aria-label="Console navigation"
      >
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="min-w-0 flex-1">
            <BrandLogo href="/dashboard" size="sm" />
          </div>
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-full text-neutral-500 hover:bg-[#f6f5f8] lg:hidden"
            aria-label="Close menu"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          {nav.length === 0 && (
            <p className="px-3 text-sm text-neutral-400">No menus assigned to this group.</p>
          )}
          {nav.map((section) => (
            <div key={section.heading} className="mb-6">
              <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6d4aff]">
                {section.heading}
              </p>
              <div className="flex flex-col">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const dropdown = Array.isArray(item.children);
                  const expanded = Boolean(openMenus[item.id]);
                  const active = itemMatches(pathname, item);
                  const rowClass = `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] ${
                    active
                      ? "bg-[#f4f0ff] font-semibold text-[#6d4aff]"
                      : "text-[#1c1c1e] hover:bg-[#f6f5f8]"
                  }`;

                  return (
                    <div key={item.id} className="mb-0.5">
                      {dropdown ? (
                        <button
                          type="button"
                          className={rowClass}
                          onClick={() => toggle(item.id)}
                          aria-expanded={expanded}
                        >
                          <Icon size={18} strokeWidth={1.8} className="shrink-0" />
                          <span className="flex-1">{item.label}</span>
                          <ChevronDown
                            size={16}
                            className={`shrink-0 text-neutral-400 transition ${expanded ? "rotate-180" : ""}`}
                          />
                        </button>
                      ) : (
                        <Link href={item.href ?? "/dashboard"} className={rowClass}>
                          <Icon size={18} strokeWidth={1.8} className="shrink-0" />
                          <span className="flex-1">{item.label}</span>
                        </Link>
                      )}
                      {dropdown && expanded && (item.children?.length ?? 0) > 0 && (
                        <div className="mb-2 mt-1">
                          <NestedList
                            nodes={item.children!}
                            pathname={pathname}
                            open={openMenus}
                            onToggle={toggle}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
