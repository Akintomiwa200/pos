"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

export function AuthCard({
  title,
  copy,
  children,
}: {
  title: string;
  copy: string;
  children: ReactNode;
}) {
  const live = useApiLive();

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-10 sm:px-6 sm:py-14">
      <div className="rounded-[24px] bg-pos-surface p-6 shadow-pos-md sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pos-ink-faint">
              HQ access
            </p>
            <h1 className="mt-2 text-[clamp(1.5rem,3vw,1.85rem)] font-semibold tracking-tight text-pos-ink">
              {title}
            </h1>
            <p className="mt-2 text-[14px] leading-relaxed text-pos-ink-muted">{copy}</p>
          </div>
          <p
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              live === null
                ? "bg-pos-surface-muted text-pos-ink-faint"
                : live
                  ? "bg-pos-success/10 text-pos-success"
                  : "bg-red-500/10 text-red-600"
            }`}
          >
            {live === null ? "Checking…" : live ? "Live API" : "API offline"}
          </p>
        </div>
        {children}
      </div>
    </main>
  );
}

export function AuthField({
  label,
  name,
  type = "text",
  autoComplete,
  required = true,
  defaultValue,
  minLength,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  defaultValue?: string;
  minLength?: number;
}) {
  return (
    <label className="mt-4 block text-sm font-medium text-pos-ink first:mt-0">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        minLength={minLength}
        className="mt-1.5 w-full rounded-2xl border-0 bg-pos-surface-muted px-3.5 py-2.5 text-sm font-normal text-pos-ink outline-none ring-1 ring-transparent transition placeholder:text-pos-ink-faint focus:bg-pos-surface focus:ring-pos-primary/30"
      />
    </label>
  );
}

export function AuthSubmit({ busy, label }: { busy: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="mt-6 w-full rounded-full bg-pos-primary py-3 text-sm font-semibold text-white shadow-pos-primary transition hover:opacity-90 disabled:opacity-60"
    >
      {busy ? "Please wait…" : label}
    </button>
  );
}

export function AuthLinks({
  items,
}: {
  items: { href: string; label: string }[];
}) {
  return (
    <p className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-1 text-center text-sm text-pos-ink-muted">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="font-medium text-pos-primary hover:underline"
        >
          {item.label}
        </Link>
      ))}
    </p>
  );
}

function useApiLive() {
  const [live, setLive] = useState<boolean | null>(null);

  useEffect(() => {
    let stopped = false;
    async function ping() {
      try {
        const response = await fetch("/api/console/groups");
        if (!stopped) setLive(response.ok);
      } catch {
        if (!stopped) setLive(false);
      }
    }
    void ping();
    const timer = window.setInterval(() => void ping(), 5000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, []);

  return live;
}
