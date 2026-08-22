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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0 max-w-3xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-pos-primary">{kicker}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">{title}</h1>
        <p className="mt-2 text-pos-ink-muted">{copy}</p>
      </div>
      {action}
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
  "w-full rounded-xl border border-pos-border bg-pos-surface px-3 py-2 text-sm text-pos-ink outline-none focus:border-pos-primary";

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
    <label className="mb-3 flex items-center justify-between gap-3 text-sm text-pos-ink">
      <span>{label}</span>
      <input
        type="checkbox"
        className="accent-pos-primary"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

export function DataTable({
  columns,
  children,
}: {
  columns: string[];
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl bg-pos-surface shadow-pos-md">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-pos-border text-pos-ink-muted">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-4 py-3 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
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
      className={`rounded-xl bg-pos-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export const secondaryButtonClass =
  "rounded-xl border border-pos-border px-4 py-2.5 text-sm text-pos-ink hover:bg-pos-surface-muted";
