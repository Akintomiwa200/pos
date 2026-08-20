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

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <BrandLogo />
        <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          {HEADER_NAV.map((item) =>
            item.children ? (
              <div key={item.href} className="relative">
                <button
                  type="button"
                  className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm ${
                    isActive(pathname, item.href)
                      ? "font-semibold text-[#6d4aff]"
                      : "text-neutral-600 hover:text-[#6d4aff]"
                  }`}
                  onClick={() => setSolutionsOpen((value) => !value)}
                  aria-expanded={solutionsOpen}
                >
                  {item.label}
                  <ChevronDown size={14} className={solutionsOpen ? "rotate-180" : ""} />
                </button>
                {solutionsOpen ? (
                  <div className="absolute left-0 top-full z-20 mt-1 w-52 rounded-xl border border-neutral-100 bg-white py-2 shadow-[0_12px_40px_rgba(28,28,30,0.08)]">
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
                className={`rounded-lg px-3 py-2 text-sm ${
                  isActive(pathname, item.href)
                    ? "font-semibold text-[#6d4aff]"
                    : "text-neutral-600 hover:text-[#6d4aff]"
                }`}
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {!loading && session ? (
            <Link
              href="/dashboard"
              className="rounded-full bg-[#6d4aff] px-4 py-2 text-sm font-medium text-white"
            >
              My dashboard
            </Link>
          ) : !loading ? (
            <Link
              href="/register"
              className="rounded-full bg-[#6d4aff] px-4 py-2 text-sm font-medium text-white"
            >
              Get started
            </Link>
          ) : null}
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-xl border border-neutral-200 lg:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      {open ? (
        <div className="border-t border-neutral-100 bg-white px-4 py-4 lg:hidden">
          {HEADER_NAV.map((item) => (
            <MobileBlock key={item.href} item={item} pathname={pathname} />
          ))}
        </div>
      ) : null}
    </header>
  );
}

function MobileBlock({ item, pathname }: { item: SiteLink; pathname: string }) {
  if (!item.children) {
    return (
      <Link
        href={item.href}
        className={`block rounded-lg px-3 py-2.5 text-sm ${
          isActive(pathname, item.href) ? "font-semibold text-[#6d4aff]" : "text-neutral-700"
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
          isActive(pathname, item.href) ? "font-semibold text-[#6d4aff]" : "text-neutral-700"
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
