import Link from "next/link";
import { FOOTER_COLUMNS, SITE } from "../../lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-5">
        <div className="md:col-span-1">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#6d4aff] text-sm font-extrabold text-white">
              {SITE.short}
            </span>
            {SITE.name}
          </Link>
          <p className="mt-3 text-sm leading-relaxed text-neutral-500">{SITE.tagline}</p>
        </div>
        {FOOTER_COLUMNS.map((column) => (
          <div key={column.heading}>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6d4aff]">
              {column.heading}
            </p>
            <ul className="mt-3 space-y-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-neutral-600 hover:text-[#6d4aff]">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-neutral-100">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-neutral-400 sm:px-6">
          <p>© {new Date().getFullYear()} {SITE.name}</p>
          <div className="flex gap-4">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/login">Login</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
