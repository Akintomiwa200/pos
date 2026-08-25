"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Briefcase,
  Eye,
  EyeOff,
  KeyRound,
  Shield,
  UserRound,
  X,
} from "lucide-react";
import type { ConsoleGroup } from "@/lib/access";
import {
  firstAccountError,
  validateAccountDraft,
  type AccountDraft,
  type AccountFieldErrors,
} from "@/lib/account-validation";
import { PrimaryButton, ToggleField, fieldClass, secondaryButtonClass } from "../SetupChrome";

type Props = {
  open: boolean;
  draft: AccountDraft;
  groups: ConsoleGroup[];
  busy: boolean;
  onClose: () => void;
  onChange: (patch: Partial<AccountDraft>) => void;
  onSubmit: () => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
};

function Section({
  icon,
  title,
  hint,
  children,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[20px] bg-pos-surface p-4 shadow-pos-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-pos-surface-muted text-pos-ink">
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-pos-ink">{title}</h3>
          {hint ? <p className="mt-0.5 text-xs text-pos-ink-faint">{hint}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function FormField({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="mb-3 block last:mb-0">
      <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-pos-ink-muted">
        {label}
        {required ? <span className="text-pos-danger">*</span> : null}
      </span>
      {hint ? <span className="mt-0.5 block text-[11px] text-pos-ink-faint">{hint}</span> : null}
      <span className="mt-1.5 block">{children}</span>
      {error ? <span className="mt-1.5 block text-[12px] text-pos-danger">{error}</span> : null}
    </label>
  );
}

function inputClass(error?: string) {
  return `${fieldClass} ${
    error ? "ring-1 ring-pos-danger/40 focus:ring-pos-danger/50" : ""
  }`;
}

export function AccountFormSheet({
  open,
  draft,
  groups,
  busy,
  onClose,
  onChange,
  onSubmit,
  onDelete,
}: Props) {
  const [errors, setErrors] = useState<AccountFieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const isEdit = Boolean(draft.id);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setShowPassword(false);
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, draft.id]);

  if (!open) return null;

  function patch(next: Partial<AccountDraft>) {
    onChange(next);
    const keys = Object.keys(next) as Array<keyof AccountFieldErrors>;
    if (keys.some((key) => errors[key])) {
      setErrors((current) => {
        const cleared = { ...current };
        for (const key of keys) delete cleared[key];
        return cleared;
      });
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validateAccountDraft(draft);
    setErrors(nextErrors);
    if (firstAccountError(nextErrors)) return;
    await onSubmit();
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-pos-ink/45 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />
      <aside className="absolute inset-y-0 right-0 flex h-full w-full max-w-xl flex-col bg-pos-bg text-pos-ink shadow-pos-md">
        <header className="flex shrink-0 items-start justify-between gap-4 bg-pos-surface px-6 py-5 shadow-pos-sm">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pos-ink-faint">
              Setup · Users
            </p>
            <h2 className="mt-2 text-[clamp(1.25rem,2.5vw,1.75rem)] font-medium leading-none tracking-tight text-pos-ink-faint">
              {isEdit ? draft.name || "Edit account" : "New account"}
            </h2>
            <p className="mt-2 text-sm text-pos-ink-muted">
              {isEdit
                ? "Update identity, group access, or reset their password."
                : "Invite someone to HQ. Required fields are marked with *."}
            </p>
          </div>
          <button
            type="button"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-pos-surface-muted text-pos-ink hover:bg-pos-border/60"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
            <Section
              icon={<UserRound size={16} />}
              title="Identity"
              hint="How this person appears across HQ and on receipts."
            >
              <FormField label="Full name" required error={errors.name}>
                <input
                  className={inputClass(errors.name)}
                  value={draft.name}
                  onChange={(event) => patch({ name: event.target.value })}
                  autoComplete="name"
                  placeholder="e.g. Emma Wang"
                  required
                  aria-invalid={Boolean(errors.name)}
                />
              </FormField>
              <FormField label="Email" required error={errors.email}>
                <input
                  type="email"
                  className={inputClass(errors.email)}
                  value={draft.email}
                  onChange={(event) => patch({ email: event.target.value })}
                  autoComplete="email"
                  placeholder="name@company.com"
                  required
                  aria-invalid={Boolean(errors.email)}
                />
              </FormField>
              <FormField
                label="Username"
                required
                error={errors.username}
                hint="Used to sign in. Letters, numbers, dots, underscores, hyphens."
              >
                <input
                  className={inputClass(errors.username)}
                  value={draft.username}
                  onChange={(event) => patch({ username: event.target.value })}
                  autoComplete="username"
                  placeholder="emma"
                  required
                  minLength={3}
                  maxLength={32}
                  pattern="[A-Za-z0-9._-]{3,32}"
                  aria-invalid={Boolean(errors.username)}
                />
              </FormField>
            </Section>

            <Section
              icon={<Briefcase size={16} />}
              title="Access"
              hint="The group controls which sidebar departments and menus they see."
            >
              <FormField label="Group" required error={errors.groupId}>
                <select
                  className={inputClass(errors.groupId)}
                  value={draft.groupId}
                  onChange={(event) => patch({ groupId: event.target.value })}
                  required
                  aria-invalid={Boolean(errors.groupId)}
                >
                  <option value="">Select a group…</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <ToggleField
                label="Active account"
                checked={draft.active}
                onChange={(active) => patch({ active })}
              />
            </Section>

            <Section
              icon={<KeyRound size={16} />}
              title="Sign-in"
              hint={
                isEdit
                  ? "Leave password blank to keep the current one."
                  : "They can change this after their first sign-in."
              }
            >
              <FormField
                label="Password"
                required={!isEdit}
                error={errors.password}
                hint={isEdit ? "Optional · min 6 characters if set" : "Min 6 characters"}
              >
                <span className="relative block">
                  <input
                    type={showPassword ? "text" : "password"}
                    className={`${inputClass(errors.password)} pr-11`}
                    value={draft.password}
                    onChange={(event) => patch({ password: event.target.value })}
                    autoComplete="new-password"
                    required={!isEdit}
                    minLength={isEdit ? undefined : 6}
                    aria-invalid={Boolean(errors.password)}
                    placeholder={isEdit ? "Leave blank to keep" : "Create a password"}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-pos-ink-faint hover:bg-pos-surface hover:text-pos-ink"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </span>
              </FormField>
              {!isEdit ? (
                <p className="mt-1 flex items-start gap-2 rounded-2xl bg-pos-primary-soft px-3 py-2.5 text-[12px] text-pos-ink-muted">
                  <Shield size={14} className="mt-0.5 shrink-0 text-pos-primary" />
                  A welcome email is sent when mail is configured, including their username
                  and temporary password.
                </p>
              ) : null}
            </Section>
          </div>

          <footer className="flex shrink-0 gap-2 border-t border-pos-border bg-pos-surface px-5 py-4">
            {isEdit && onDelete ? (
              <button
                type="button"
                className={secondaryButtonClass}
                disabled={busy}
                onClick={() => onDelete()}
              >
                Delete
              </button>
            ) : (
              <button
                type="button"
                className={secondaryButtonClass}
                disabled={busy}
                onClick={onClose}
              >
                Cancel
              </button>
            )}
            <PrimaryButton type="submit" className="flex-1" disabled={busy}>
              {busy ? "Saving…" : isEdit ? "Save changes" : "Create account"}
            </PrimaryButton>
          </footer>
        </form>
      </aside>
    </div>
  );
}
