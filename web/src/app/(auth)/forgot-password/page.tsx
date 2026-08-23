"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { forgotPassword } from "../../../lib/hq-api";
import {
  AuthFooterLink,
  AuthInput,
  AuthPrimaryButton,
  AuthSplit,
} from "../../../components/site/AuthSplit";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const result = await forgotPassword(String(form.get("email") ?? ""));
      if (result.resetToken) {
        toast.success("Reset started. Set a new password next.");
        router.push(`/reset-password?token=${encodeURIComponent(result.resetToken)}`);
        return;
      }
      toast.error("No matching HQ account for that email or username.");
    } catch (err) {
      toast.error(err, "Could not start a reset");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthSplit
      title="Forgot password"
      mode="other"
      footer={
        <>
          Remembered it? <AuthFooterLink href="/login">Login</AuthFooterLink>
        </>
      }
    >
      <p className="mb-5 text-[14px] leading-relaxed text-pos-ink-muted">
        Enter your HQ email or username. If the account exists, you can set a new password next.
      </p>
      <form onSubmit={(event) => void onSubmit(event)}>
        <AuthInput label="Email" name="email" autoComplete="username" required />
        <AuthPrimaryButton busy={busy}>Continue</AuthPrimaryButton>
      </form>
    </AuthSplit>
  );
}
