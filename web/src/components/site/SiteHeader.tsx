"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { useAuth } from "../AuthProvider";
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

  const cta = !loading && session
    ? { href: "/dashboard", label: "My dashboard" }
    : !loading
      ? { href: "/register", label: "Get started" }
      : null;

  return (
    <header className="sticky top-0 z-50">
      <div className="mx-auto max-w-5xl px-4 pt-4 sm:px-6">
        <div className="flex h-14 items-center gap-2 rounded-full bg-white/95 px-2 shadow-[0_8px_32px_rgba(28,28,30,0.08)] ring-1 ring-black/[0.04] backdrop-blur sm:px-3">
          <BrandLogo size="sm" />
          <nav className="hidden flex-1 items-center justify-center gap-0.5 md:flex">
            {HEADER_NAV.map((item) =>
              item.children ? (
                <div key={item.href} className="relative">
                  <button
                    type="button"
                    className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm ${
                      isActive(pathname, item.href)
                        ? "font-medium text-[#6d4aff]"
                        : "text-neutral-500 hover:text-[#1c1c1e]"
                    }`}
                    onClick={() => setSolutionsOpen((value) => !value)}
                    aria-expanded={solutionsOpen}
                  >
                    {item.label}
                    <ChevronDown size={14} className={solutionsOpen ? "rotate-180" : ""} />
                  </button>
                  {solutionsOpen ? (
                    <div className="absolute left-0 top-full z-20 mt-2 w-52 rounded-2xl border border-neutral-100 bg-white py-2 shadow-[0_12px_40px_rgba(28,28,30,0.08)]">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="block px-4 py-2 text-sm text-neutral-600 hover:bg-[#f4f0ff] hover:text-[#6d4aff]"
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
                      ? "font-medium text-[#1c1c1e]"
                      : "text-neutral-500 hover:text-[#1c1c1e]"
                  }`}
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            {cta ? (
              <Link
                href={cta.href}
                className="rounded-full bg-[#6d4aff] px-4 py-2 text-sm font-medium text-white sm:px-5"
              >
                {cta.label}
              </Link>
            ) : null}
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-full text-neutral-600 md:hidden"
              onClick={() => setOpen((value) => !value)}
              aria-label={open ? "Close menu" : "Open menu"}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        {open ? (
          <div className="mt-2 rounded-2xl bg-white px-3 py-3 shadow-[0_12px_40px_rgba(28,28,30,0.08)] ring-1 ring-black/[0.04] md:hidden">
            {HEADER_NAV.map((item) => (
              <MobileBlock key={item.href} item={item} pathname={pathname} />
            ))}
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
          isActive(pathname, item.href) ? "font-medium text-[#6d4aff]" : "text-neutral-700"
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
          isActive(pathname, item.href) ? "font-medium text-[#6d4aff]" : "text-neutral-700"
        }`}
      >
        {item.label}
      </Link>
      <div className="ml-3 border-l border-[#ddd6fe] pl-3">
        {item.children.map((child) => (
          <Link
            key={child.href}
            href={child.href}
            className="block rounded-lg px-3 py-2 text-sm text-neutral-500"
          >
            {child.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
