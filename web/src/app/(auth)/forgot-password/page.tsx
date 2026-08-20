"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authErrorMessage, forgotPassword } from "../../../lib/hq-api";
import { AuthCard, AuthField, AuthLinks, AuthSubmit } from "../../../components/site/AuthCard";

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
      toast.error(authErrorMessage(err, "Could not start a reset"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title="Forgot password"
      copy="If that HQ account exists, the API creates a one-hour reset. This server has no mailer, so the next screen opens immediately."
    >
      <form onSubmit={(event) => void onSubmit(event)}>
        <AuthField label="Email or username" name="email" autoComplete="username" />
        <AuthSubmit busy={busy} label="Continue" />
      </form>
      <AuthLinks items={[{ href: "/login", label: "Back to login" }]} />
    </AuthCard>
  );
}
