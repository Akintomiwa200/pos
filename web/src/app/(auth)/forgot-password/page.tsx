"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authErrorMessage, forgotPassword } from "../../../lib/hq-api";
import { AuthCard, AuthField, AuthLinks, AuthSubmit } from "../../../components/site/AuthCard";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const result = await forgotPassword(String(form.get("email") ?? ""));
      if (result.resetToken) {
        router.push(`/reset-password?token=${encodeURIComponent(result.resetToken)}`);
        return;
      }
      setError("No matching HQ account for that email or username.");
    } catch (err) {
      setError(authErrorMessage(err, "Could not start a reset"));
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
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <AuthSubmit busy={busy} label="Continue" />
      </form>
      <AuthLinks items={[{ href: "/login", label: "Back to login" }]} />
    </AuthCard>
  );
}
