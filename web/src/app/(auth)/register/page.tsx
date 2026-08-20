"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../components/AuthProvider";
import { AuthCard, AuthField, AuthLinks, AuthSubmit } from "../../../components/site/AuthCard";
import { authErrorMessage } from "../../../lib/hq-api";

export default function RegisterPage() {
  const router = useRouter();
  const { register, session, loading } = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) router.replace("/dashboard");
  }, [loading, session, router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await register({
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        username: String(form.get("username") ?? ""),
        password,
      });
      router.replace("/dashboard");
    } catch (err) {
      setError(authErrorMessage(err, "Could not create the account"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title="Create an HQ account"
      copy="New accounts join the Sales group. An administrator can move you in Setup → Users."
    >
      <form onSubmit={(event) => void onSubmit(event)}>
        <AuthField label="Full name" name="name" autoComplete="name" />
        <AuthField label="Email" name="email" type="email" autoComplete="email" />
        <AuthField label="Username" name="username" autoComplete="username" />
        <AuthField
          label="Password"
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
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <AuthSubmit busy={busy} label="Create account" />
      </form>
      <AuthLinks items={[{ href: "/login", label: "Already have an account? Sign in" }]} />
    </AuthCard>
  );
}
