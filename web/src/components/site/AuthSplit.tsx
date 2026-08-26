"use client";

import Link from "next/link";
import { useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { MenuSelect } from "@/components/ui/MenuSelect";

/** Full-bleed split auth chrome — Figma layout, app theme tokens. */
export function AuthSplit({
  title,
  subtitle,
  children,
  footer,
  mode = "signin",
  googleSlot,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  mode?: "signin" | "signup" | "other";
  googleSlot?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-pos-surface text-pos-ink">
      <section className="flex w-full flex-col justify-center px-6 py-12 sm:px-10 lg:w-[46%] lg:px-14 xl:px-20">
        <div className="mx-auto w-full max-w-[380px]">
          <Link href="/" className="inline-flex items-center gap-2.5" aria-label="POS home">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-pos-primary text-white shadow-pos-primary">
              <BrandMark className="h-[22px] w-[22px]" />
            </span>
            <span className="text-[1.35rem] font-semibold tracking-tight text-pos-ink">
              pos<span className="text-pos-primary">.</span>
            </span>
          </Link>

          <h1 className="mt-8 text-[2rem] font-bold tracking-tight text-pos-ink">{title}</h1>
          {subtitle ? (
            <p className="mt-2 text-[14px] leading-relaxed text-pos-ink-muted">{subtitle}</p>
          ) : null}

          {mode !== "other" ? (
            <>
              {googleSlot}
              <p className="mt-5 text-center text-[13px] text-pos-ink-faint">
                {mode === "signup" ? "Or continue with email" : "Or sign in with email"}
              </p>
            </>
          ) : null}

          <div className={mode === "other" ? "mt-8" : "mt-5"}>{children}</div>
          {footer ? (
            <div className="mt-8 text-center text-[14px] text-pos-ink-muted">{footer}</div>
          ) : null}
        </div>
      </section>

      <aside className="relative hidden overflow-hidden border-l border-pos-border bg-pos-bg lg:block lg:w-[54%]">
        <AuthArtPanel />
      </aside>
    </div>
  );
}

function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle
        cx="16"
        cy="16"
        r="11"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="58 11"
        transform="rotate(-38 16 16)"
      />
    </svg>
  );
}

function AuthArtPanel() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_35%,color-mix(in_srgb,var(--pos-primary)_22%,transparent),transparent_42%),radial-gradient(circle_at_80%_70%,color-mix(in_srgb,var(--pos-primary-muted)_55%,transparent),transparent_45%)]" />

      <div
        className="absolute left-1/2 top-1/2 h-[220px] w-[280px] -translate-x-1/2 -translate-y-[58%] opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(color-mix(in srgb, var(--pos-ink-faint) 55%, transparent) 1.35px, transparent 1.35px)",
          backgroundSize: "16px 16px",
        }}
      />

      <div
        className="absolute left-[6%] top-[8%] h-[7.5rem] w-[7.5rem] rounded-full bg-gradient-to-br from-pos-primary-muted to-pos-primary opacity-90 shadow-pos-primary"
        aria-hidden
      />
      <div
        className="absolute right-[10%] top-[6%] h-16 w-28 rotate-12 rounded-[999px] bg-gradient-to-r from-pos-primary via-pos-primary-muted to-pos-primary-soft opacity-90 shadow-pos-md"
        aria-hidden
      />
      <div
        className="absolute left-[10%] top-[42%] h-[5.5rem] w-[5.5rem] rounded-full bg-pos-primary-soft ring-4 ring-pos-primary-muted/40 shadow-pos-md"
        aria-hidden
      />
      <div
        className="absolute right-[18%] top-[34%] h-14 w-14 rounded-full bg-pos-primary-muted opacity-95"
        aria-hidden
      />
      <div
        className="absolute bottom-[30%] left-[8%] h-20 w-40 rounded-[60%_40%_55%_45%] bg-gradient-to-r from-pos-primary-soft to-pos-primary-muted opacity-95 shadow-pos-md"
        aria-hidden
      />
      <div className="absolute bottom-[14%] right-[12%] h-36 w-36 overflow-hidden" aria-hidden>
        <div className="h-full w-full origin-bottom scale-y-50 rounded-full bg-gradient-to-br from-pos-primary-muted to-pos-primary opacity-90 shadow-pos-primary" />
      </div>
      <div
        className="absolute right-[6%] top-[52%] h-9 w-9 rounded-full bg-pos-primary shadow-pos-primary"
        aria-hidden
      />
      <div
        className="absolute bottom-[10%] left-[38%] h-10 w-24 rounded-full bg-pos-primary-soft ring-1 ring-pos-primary-muted/50"
        aria-hidden
      />

      <div className="absolute inset-0 flex items-center justify-center px-14">
        <p className="relative z-10 max-w-[17rem] text-center text-[2.25rem] font-bold leading-[1.18] tracking-tight text-pos-ink">
          Changing the way the floor sells
        </p>
      </div>
    </div>
  );
}

export function AuthInput({
  label,
  type = "text",
  ...props
}: {
  label: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (show ? "text" : "password") : type;

  return (
    <label className="relative mb-3.5 block">
      <span className="sr-only">{label}</span>
      <input
        {...props}
        type={inputType}
        placeholder={label}
        className="w-full rounded-[10px] border-0 bg-pos-surface-muted px-4 py-3.5 text-[14px] text-pos-ink outline-none ring-1 ring-transparent transition placeholder:text-pos-ink-faint focus:bg-pos-surface focus:ring-pos-primary/30"
      />
      {isPassword ? (
        <button
          type="button"
          tabIndex={-1}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-pos-ink-faint hover:text-pos-ink-muted"
          onClick={() => setShow((value) => !value)}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff size={18} strokeWidth={1.8} /> : <Eye size={18} strokeWidth={1.8} />}
        </button>
      ) : null}
    </label>
  );
}

export function AuthSelect({
  label,
  ...props
}: {
  label: string;
} & SelectHTMLAttributes<HTMLSelectElement>) {
  return <MenuSelect tone="auth" label={label} {...props} />;
}

export function AuthPrimaryButton({
  busy,
  children,
}: {
  busy?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="mt-5 w-full rounded-[10px] bg-pos-primary py-3.5 text-[15px] font-semibold text-white shadow-pos-primary transition hover:opacity-90 disabled:opacity-60"
    >
      {busy ? "Please wait…" : children}
    </button>
  );
}

export function AuthRememberRow() {
  return (
    <div className="mt-1 flex items-center justify-between gap-3">
      <label className="flex cursor-pointer items-center gap-2 text-[13px] text-pos-ink-muted">
        <input
          type="checkbox"
          name="remember"
          defaultChecked
          className="h-4 w-4 rounded border-pos-border accent-pos-primary"
        />
        Keep me logged in
      </label>
      <Link
        href="/forgot-password"
        className="text-[13px] font-medium text-pos-primary hover:underline"
      >
        Forgot password?
      </Link>
    </div>
  );
}

export function AuthFooterLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className="font-semibold text-pos-primary hover:underline">
      {children}
    </Link>
  );
}

export function AuthSectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2.5 mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-pos-ink-faint">
      {children}
    </p>
  );
}
