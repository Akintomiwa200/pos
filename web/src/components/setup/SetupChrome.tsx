"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

export function SetupHeader({
  kicker = "Setup · Others",
  title,
  copy,
  action,
}: {
  kicker?: string;
  title: string;
  copy: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pos-ink-faint">
            {kicker}
          </p>
          <h1 className="mt-2 text-[clamp(1.5rem,3.5vw,2.25rem)] font-medium leading-none tracking-tight text-pos-ink-faint">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-pos-ink-muted">{copy}</p>
        </div>
        {action ? <div className="shrink-0 pt-1">{action}</div> : null}
      </div>
    </div>
  );
}

export function SetupStat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "inverse" | "accent";
}) {
  const shell =
    tone === "inverse"
      ? "bg-pos-inverse text-white"
      : tone === "accent"
        ? "bg-pos-primary text-white"
        : "bg-pos-surface text-pos-ink shadow-pos-sm";
  const muted =
    tone === "default" ? "text-pos-ink-faint" : "text-white/55";

  return (
    <div className={`flex min-h-[104px] flex-col rounded-[20px] p-4 ${shell}`}>
      <p className={`text-[13px] ${muted}`}>{label}</p>
      <p className="mt-auto truncate text-[22px] font-semibold leading-none tracking-tight tabular-nums">
        {value}
      </p>
      {hint ? <p className={`mt-2 truncate text-[12px] ${muted}`}>{hint}</p> : null}
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="mb-3 block text-sm font-medium text-pos-ink">
      {label}
      <span className="mt-1 block font-normal">{children}</span>
    </label>
  );
}

export const fieldClass =
  "w-full rounded-2xl border-0 bg-pos-surface-muted px-3.5 py-2.5 text-sm text-pos-ink outline-none ring-1 ring-transparent transition focus:bg-pos-surface focus:ring-pos-primary/30";

export function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-pos-surface-muted px-3.5 py-3 text-sm text-pos-ink">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`relative h-6 w-11 rounded-full transition-colors ${
          checked ? "bg-pos-primary" : "bg-pos-border"
        }`}
        onClick={() => onChange(!checked)}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-pos-surface transition ${
            checked ? "right-0.5" : "left-0.5"
          }`}
        />
      </button>
    </label>
  );
}

export function DataTable({
  columns,
  children,
  toolbar,
}: {
  columns: string[];
  children: ReactNode;
  toolbar?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[24px] bg-pos-surface shadow-pos-md">
      {toolbar ? <div className="border-b border-pos-border/60 px-4 py-3">{toolbar}</div> : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-pos-border/60 bg-pos-surface-muted/40 text-[11px] font-semibold uppercase tracking-[0.08em] text-pos-ink-faint">
              {columns.map((column) => (
                <th key={column || "thumb"} className="whitespace-nowrap px-4 py-3 font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-pos-border/45">{children}</tbody>
        </table>
      </div>
    </section>
  );
}

export function PrimaryButton({
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-pos-primary px-5 py-2.5 text-sm font-semibold text-white shadow-pos-primary transition hover:opacity-90 disabled:opacity-60 ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-full bg-pos-surface px-4 py-2.5 text-sm font-medium text-pos-ink shadow-pos-sm hover:bg-pos-surface-muted";
