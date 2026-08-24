import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function MarketingHero({
  kicker,
  title,
  copy,
  children,
}: {
  kicker: string;
  title: string;
  copy: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-pos-border/60">
      <div aria-hidden className="marketing-soft-bg absolute inset-0 opacity-90" />
      <div aria-hidden className="hero-matrix absolute inset-0 opacity-40" />
      <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <p className="inline-flex rounded-full bg-pos-primary-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-pos-primary">
          {kicker}
        </p>
        <h1 className="mt-4 max-w-3xl text-[clamp(1.75rem,4vw,2.65rem)] font-semibold leading-[1.12] tracking-tight text-pos-ink">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-7 text-pos-ink-muted sm:text-base">{copy}</p>
        {children ? <div className="mt-8 flex flex-wrap items-center gap-3">{children}</div> : null}
      </div>
    </section>
  );
}

export function MarketingPrimaryLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-full bg-pos-primary px-5 py-2.5 text-sm font-semibold text-white shadow-pos-primary transition hover:opacity-95"
    >
      {children}
    </Link>
  );
}

export function MarketingSecondaryLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-full border border-pos-border bg-pos-surface px-5 py-2.5 text-sm font-semibold text-pos-ink shadow-pos-sm transition hover:bg-pos-surface-muted"
    >
      {children}
    </Link>
  );
}

export function MarketingSection({
  title,
  subtitle,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`px-4 py-14 sm:px-6 sm:py-16 ${className}`}>
      <div className="mx-auto max-w-6xl">
        {title ? (
          <div className="mb-8 max-w-2xl">
            <h2 className="text-[clamp(1.45rem,3vw,2rem)] font-semibold tracking-tight text-pos-ink">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-2 text-[15px] leading-7 text-pos-ink-muted">{subtitle}</p>
            ) : null}
          </div>
        ) : null}
        {children}
      </div>
    </section>
  );
}

export function MarketingCard({
  icon: Icon,
  title,
  copy,
  href,
  cta,
  badge,
  featured,
}: {
  icon: LucideIcon;
  title: string;
  copy: string;
  href?: string;
  cta?: string;
  badge?: string;
  featured?: boolean;
}) {
  const body = (
    <article
      className={`flex h-full flex-col rounded-[24px] border p-6 shadow-pos-md transition hover:-translate-y-0.5 hover:shadow-pos-primary sm:p-7 ${
        featured
          ? "border-pos-primary/30 bg-pos-primary-soft ring-1 ring-pos-primary/20"
          : "border-pos-border/80 bg-pos-surface"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${
            featured ? "bg-pos-primary text-white" : "bg-pos-primary-soft text-pos-primary"
          }`}
        >
          <Icon size={22} strokeWidth={1.6} />
        </span>
        {badge ? (
          <span className="rounded-full bg-pos-surface-muted px-2.5 py-1 text-[11px] font-semibold text-pos-ink-muted">
            {badge}
          </span>
        ) : null}
      </div>
      <h3 className="mt-5 text-lg font-semibold tracking-tight text-pos-ink">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-pos-ink-muted">{copy}</p>
      {href && cta ? (
        <span className="mt-5 inline-flex text-sm font-semibold text-pos-primary">{cta} →</span>
      ) : null}
    </article>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {body}
      </Link>
    );
  }
  return body;
}

export function MarketingStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[20px] border border-pos-border/80 bg-pos-surface px-5 py-4 shadow-pos-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-pos-ink-faint">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">{value}</p>
      {hint ? <p className="mt-1 text-sm text-pos-ink-muted">{hint}</p> : null}
    </div>
  );
}

export function MarketingField({
  label,
  name,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-pos-ink">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-pos-border bg-pos-surface px-3.5 py-2.5 text-sm text-pos-ink outline-none transition placeholder:text-pos-ink-faint focus:border-pos-primary focus:ring-2 focus:ring-pos-primary/20"
      />
    </label>
  );
}

export function MarketingTextarea({
  label,
  name,
  rows = 5,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  rows?: number;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-pos-ink">{label}</span>
      <textarea
        name={name}
        rows={rows}
        required={required}
        placeholder={placeholder}
        className="mt-2 w-full resize-y rounded-xl border border-pos-border bg-pos-surface px-3.5 py-2.5 text-sm text-pos-ink outline-none transition placeholder:text-pos-ink-faint focus:border-pos-primary focus:ring-2 focus:ring-pos-primary/20"
      />
    </label>
  );
}

export function MarketingSubmit({ busy, label }: { busy?: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="mt-2 w-full rounded-full bg-pos-primary px-5 py-3 text-sm font-semibold text-white shadow-pos-primary transition hover:opacity-95 disabled:opacity-60"
    >
      {label}
    </button>
  );
}

export function MarketingPanel({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[24px] border border-pos-border/80 bg-pos-surface p-6 shadow-pos-md sm:p-7 ${className}`}
    >
      {title ? <h3 className="text-lg font-semibold text-pos-ink">{title}</h3> : null}
      {children}
    </div>
  );
}
