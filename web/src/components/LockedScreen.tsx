"use client";

import { useState, type FormEvent } from "react";
import { LockKeyhole } from "lucide-react";
import { toast } from "@/lib/toast";
import type { SessionLockState } from "../lib/access";
import { useAuth } from "./AuthProvider";
import { PrimaryButton, fieldClass } from "./setup/SetupChrome";

export function LockedScreen({ locked }: { locked: SessionLockState }) {
  const { logout, unlockSession } = useAuth();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const local = locked.reason === "manual_lock" || locked.reason === "idle_lock";
  const subscription = locked.reason === "subscription_expired";
  const title = local ? "HQ is locked" : subscription ? "Subscription ended" : "Account locked";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password) return;
    setBusy(true);
    try {
      await unlockSession(password);
      setPassword("");
      toast.success("Welcome back.");
    } catch (err) {
      toast.error(err, "Could not unlock HQ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-svh items-center justify-center bg-pos-bg p-4">
      <div className="w-full max-w-md rounded-3xl bg-pos-surface p-6 text-center shadow-pos-lg ring-1 ring-pos-border sm:p-8">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-pos-danger-soft text-pos-danger">
          <LockKeyhole size={26} strokeWidth={1.8} />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-pos-ink">{title}</h1>
        <p className="mt-2 text-sm text-pos-ink-muted">{locked.message}</p>
        {local ? (
          <form className="mt-6 space-y-3 text-left" onSubmit={(event) => void onSubmit(event)}>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-pos-ink-muted">
                Account password
              </span>
              <input
                className={fieldClass}
                type="password"
                autoFocus
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                required
              />
            </label>
            <PrimaryButton className="w-full" type="submit" disabled={busy}>
              {busy ? "Unlocking…" : "Unlock HQ"}
            </PrimaryButton>
          </form>
        ) : (
          <p className="mt-1 text-[12px] text-pos-ink-faint">
            {subscription
              ? "This HQ is locked because the free trial / subscription ran out. Ask the Super Admin to renew the company plan — every page unlocks itself in real time once renewed."
              : "Ask an administrator if you believe this is a mistake."}
          </p>
        )}
        <button
          onClick={() => void logout()}
          className="mt-4 inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium text-pos-ink-muted transition hover:bg-pos-surface-muted hover:text-pos-ink"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
