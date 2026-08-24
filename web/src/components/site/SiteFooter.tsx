import Link from "next/link";
import { BrandLogo } from "./BrandLogo";

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
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
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 rounded-[28px] bg-pos-surface px-5 py-4 shadow-pos-md md:flex-row md:justify-between md:rounded-full md:py-3">
        <BrandLogo size="sm" />
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-medium text-pos-ink">
          <Link href="/product" className="hover:text-pos-primary">
            Product
          </Link>
          <Link href="/support" className="hover:text-pos-primary">
            Support
          </Link>
          <Link href="/privacy" className="hover:text-pos-primary">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-pos-primary">
            Terms & Conditions
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram"
            className="grid h-9 w-9 place-items-center rounded-full text-pos-ink ring-1 ring-pos-border hover:text-pos-primary"
          >
            <InstagramIcon className="h-[15px] w-[15px]" />
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
