"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/lib/toast";
import { resetPassword } from "../../../lib/hq-api";
import {
  AuthFooterLink,
  AuthInput,
  AuthPrimaryButton,
  AuthSplit,
} from "../../../components/site/AuthSplit";

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
      toast.error(err, "Could not reset the password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthSplit
      title="New password"
      mode="other"
      footer={
        <>
          <AuthFooterLink href="/login">Back to login</AuthFooterLink>
        </>
      }
    >
      <form onSubmit={(event) => void onSubmit(event)}>
        <AuthInput
          key={preset}
          label="Reset token"
          name="token"
          autoComplete="off"
          defaultValue={preset}
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
        <AuthPrimaryButton busy={busy}>Save password</AuthPrimaryButton>
      </form>
    </AuthSplit>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-pos-surface text-sm text-pos-ink-faint">
          Loading…
        </div>
      }
    >
      <ResetForm />
    </Suspense>
  );
}
