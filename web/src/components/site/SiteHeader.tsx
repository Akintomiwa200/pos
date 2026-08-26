"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { useAuth } from "../AuthProvider";
import { homePathForSession } from "../../lib/access";
import { HEADER_NAV, type SiteLink } from "../../lib/site";
import { BrandLogo } from "./BrandLogo";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const { session, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
    setSolutionsOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50">
      <div className="mx-auto max-w-5xl px-4 pt-4 sm:px-6">
        <div className="flex h-14 items-center gap-2 rounded-full bg-pos-surface/95 px-2 shadow-pos-md ring-1 ring-black/[0.04] backdrop-blur sm:px-3">
          <BrandLogo size="sm" />
          <nav className="hidden flex-1 items-center justify-center gap-0.5 md:flex">
            {HEADER_NAV.map((item) =>
              item.children ? (
                <div key={item.href} className="relative">
                  <button
                    type="button"
                    className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm ${
                      isActive(pathname, item.href)
                        ? "font-medium text-pos-primary"
                        : "text-pos-ink-muted hover:text-pos-ink"
                    }`}
                    onClick={() => setSolutionsOpen((value) => !value)}
                    aria-expanded={solutionsOpen}
                  >
                    {item.label}
                    <ChevronDown size={14} className={solutionsOpen ? "rotate-180" : ""} />
                  </button>
                  {solutionsOpen ? (
                    <div className="absolute left-0 top-full z-20 mt-2 w-52 rounded-2xl border border-pos-border bg-pos-surface py-2 shadow-pos-md">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="block px-4 py-2 text-sm text-pos-ink-muted hover:bg-pos-primary-soft hover:text-pos-primary"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-3 py-1.5 text-sm ${
                    isActive(pathname, item.href)
                      ? "font-medium text-pos-ink"
                      : "text-pos-ink-muted hover:text-pos-ink"
                  }`}
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            {!loading && !session ? (
              <>
                <Link
                  href="/login"
                  className={`hidden rounded-full px-3 py-2 text-sm font-medium md:inline-flex ${
                    pathname.startsWith("/login") ||
                    pathname.startsWith("/forgot-password") ||
                    pathname.startsWith("/reset-password")
                      ? "text-pos-primary"
                      : "text-pos-ink-muted hover:text-pos-ink"
                  }`}
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="hidden rounded-full bg-pos-primary px-4 py-2 text-sm font-medium text-white shadow-pos-primary md:inline-flex md:px-5"
                >
                  Sign up company
                </Link>
              </>
            ) : null}
            {!loading && session ? (
              <Link
                href={homePathForSession(session)}
                className="hidden rounded-full bg-pos-primary px-4 py-2 text-sm font-medium text-white shadow-pos-primary md:inline-flex md:px-5"
              >
                My dashboard
              </Link>
            ) : null}
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-full text-pos-ink-muted md:hidden"
              onClick={() => setOpen((value) => !value)}
              aria-label={open ? "Close menu" : "Open menu"}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        {open ? (
          <div className="mt-2 rounded-2xl bg-pos-surface px-3 py-3 shadow-pos-md ring-1 ring-black/[0.04] md:hidden">
            {HEADER_NAV.map((item) => (
              <MobileBlock key={item.href} item={item} pathname={pathname} />
            ))}
            {!loading && !session ? (
              <div className="mt-2 space-y-1 border-t border-pos-border/80 pt-2">
                <Link
                  href="/login"
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-pos-ink"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="block rounded-lg bg-pos-primary px-3 py-2.5 text-center text-sm font-medium text-white shadow-pos-primary"
                >
                  Sign up company
                </Link>
              </div>
            ) : null}
            {!loading && session ? (
              <div className="mt-2 border-t border-pos-border/80 pt-2">
                <Link
                  href={homePathForSession(session)}
                  className="block rounded-lg bg-pos-primary px-3 py-2.5 text-center text-sm font-medium text-white shadow-pos-primary"
                >
                  My dashboard
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}

function MobileBlock({ item, pathname }: { item: SiteLink; pathname: string }) {
  if (!item.children) {
    return (
      <Link
        href={item.href}
        className={`block rounded-lg px-3 py-2.5 text-sm ${
          isActive(pathname, item.href) ? "font-medium text-pos-primary" : "text-pos-ink"
        }`}
      >
        {item.label}
      </Link>
    );
  }
  return (
    <div className="py-1">
      <Link
        href={item.href}
        className={`block rounded-lg px-3 py-2.5 text-sm ${
          isActive(pathname, item.href) ? "font-medium text-pos-primary" : "text-pos-ink"
        }`}
      >
        {item.label}
      </Link>
      <div className="ml-3 border-l border-pos-primary-muted pl-3">
        {item.children.map((child) => (
          <Link
            key={child.href}
            href={child.href}
            className="block rounded-lg px-3 py-2 text-sm text-pos-ink-muted"
          >
            {child.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
