import Link from "next/link";
import { BrandLogo } from "./BrandLogo";

function DribbbleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="9" />
      <path d="M5.2 8.6c3.2 0 7.4.4 11.6 3.6" />
      <path d="M6.4 18.2c2-3.6 4.4-6.2 8.8-8.8" />
      <path d="M16.8 4.8c-1.6 2.4-3.8 6.6-4.2 12.4" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M18.244 2H21.5l-7.5 8.57L22.5 22h-6.59l-5.16-6.75L4.8 22H1.54l8.02-9.16L1.5 2h6.76l4.66 6.18L18.244 2Zm-1.16 18.04h1.8L7 3.86H5.07l12.014 16.18Z" />
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer className="px-4 pb-8 pt-2 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 rounded-[28px] bg-pos-surface px-5 py-4 shadow-[0_8px_28px_rgba(28,28,30,0.06)] md:flex-row md:justify-between md:rounded-full md:py-3">
        <BrandLogo size="sm" />
        <nav className="flex items-center gap-6 text-sm font-medium text-pos-ink">
          <Link href="/privacy" className="hover:text-pos-primary">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-pos-primary">
            Terms & Conditions
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <a
            href="https://dribbble.com"
            target="_blank"
            rel="noreferrer"
            aria-label="Dribbble"
            className="grid h-9 w-9 place-items-center rounded-full text-pos-ink ring-1 ring-pos-border hover:text-pos-primary"
          >
            <DribbbleIcon className="h-[15px] w-[15px]" />
          </a>
          <a
            href="https://x.com"
            target="_blank"
            rel="noreferrer"
            aria-label="X"
            className="grid h-9 w-9 place-items-center rounded-full text-pos-ink ring-1 ring-pos-border hover:text-pos-primary"
          >
            <XIcon className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
