"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { homePathForSession } from "@/lib/access";
import { toast } from "@/lib/toast";
import { useAuth } from "../../../components/AuthProvider";
import {
  AuthFooterLink,
  AuthInput,
  AuthPrimaryButton,
  AuthSplit,
} from "../../../components/site/AuthSplit";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { session, loading, updatePassword } = useAuth();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !session) router.replace("/login");
  }, [loading, session, router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      await updatePassword(String(form.get("current") ?? ""), password);
      toast.success("Password updated.");
      event.currentTarget.reset();
    } catch (err) {
      toast.error(err, "Could not update the password");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !session) {
    return (
      <div className="grid min-h-screen place-items-center bg-pos-surface text-sm text-pos-ink-faint">
        Loading…
      </div>
    );
  }

  return (
    <AuthSplit
      title="Change password"
      mode="other"
      footer={
        <>
          <AuthFooterLink href={homePathForSession(session)}>Back</AuthFooterLink>
        </>
      }
    >
      <form onSubmit={(event) => void onSubmit(event)}>
        <AuthInput
          label="Current password"
          name="current"
          type="password"
          autoComplete="current-password"
          required
        />
        <AuthInput
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
        />
        <AuthInput
          label="Confirm password"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
        />
        <AuthPrimaryButton busy={busy}>Update password</AuthPrimaryButton>
      </form>
    </AuthSplit>
  );
}
