"use client";

import { LockKeyhole } from "lucide-react";
import type { SessionLockState } from "../lib/access";
import { useAuth } from "./AuthProvider";

export function LockedScreen({ locked }: { locked: SessionLockState }) {
  const { logout } = useAuth();
  const subscription = locked.reason === "subscription_expired";
  const title = subscription ? "Subscription ended" : "Account locked";

  return (
    <div className="flex h-svh items-center justify-center bg-pos-bg p-4">
      <div className="w-full max-w-md rounded-3xl bg-pos-surface p-6 text-center shadow-pos-lg ring-1 ring-pos-border sm:p-8">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-pos-danger-soft text-pos-danger">
          <LockKeyhole size={26} strokeWidth={1.8} />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-pos-ink">{title}</h1>
        <p className="mt-2 text-sm text-pos-ink-muted">{locked.message}</p>
        <p className="mt-1 text-[12px] text-pos-ink-faint">
          {subscription
            ? "This HQ is locked because the free trial / subscription ran out. Ask the Super Admin to renew the company plan — every page unlocks itself in real time once renewed."
            : "Ask an administrator if you believe this is a mistake."}
        </p>
        <button
          onClick={() => void logout()}
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-pos-ink px-4 py-2.5 text-sm font-medium text-pos-bg transition hover:opacity-90"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}