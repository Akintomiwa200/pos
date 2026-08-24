"use client";

import type { ReactNode } from "react";

export function PageHero({
  kicker,
  title,
  copy,
  children,
}: {
  kicker: string;
  title: string;
  copy: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-pos-border/60">
      <div aria-hidden className="marketing-soft-bg absolute inset-0 opacity-90" />
      <div aria-hidden className="hero-matrix absolute inset-0 opacity-40" />
      <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
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
