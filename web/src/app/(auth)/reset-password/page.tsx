"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { authErrorMessage, resetPassword } from "../../../lib/hq-api";
import { AuthCard, AuthField, AuthLinks, AuthSubmit } from "../../../components/site/AuthCard";

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const preset = params.get("token") ?? "";
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    const token = String(form.get("token") ?? preset);
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      await resetPassword(token, password);
      toast.success("Password updated. Sign in with the new password.");
      router.replace("/login");
    } catch (err) {
      toast.error(authErrorMessage(err, "Could not reset the password"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Set a new password" copy="Paste the reset token if it is not already filled, then choose a new password.">
      <form onSubmit={(event) => void onSubmit(event)}>
        <AuthField
          key={preset}
          label="Reset token"
          name="token"
          autoComplete="off"
          defaultValue={preset}
        />
        <AuthField
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={6}
        />
        <AuthField
          label="Confirm password"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={6}
        />
        <AuthSubmit busy={busy} label="Save password" />
      </form>
      <AuthLinks items={[{ href: "/login", label: "Back to login" }]} />
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="p-16 text-center text-sm text-neutral-500">Loading…</p>}>
      <ResetForm />
    </Suspense>
  );
}
