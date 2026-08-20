"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../components/AuthProvider";
import { AuthCard, AuthField, AuthLinks, AuthSubmit } from "../../../components/site/AuthCard";
import { authErrorMessage } from "../../../lib/hq-api";

export default function LoginPage() {
  const router = useRouter();
  const { login, session, loading } = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) router.replace("/dashboard");
  }, [loading, session, router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await login(String(form.get("email") ?? ""), String(form.get("password") ?? ""));
      router.replace("/dashboard");
    } catch (err) {
      setError(authErrorMessage(err, "Could not sign in"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title="HQ login" copy="Live sign-in against the API. Menus follow your group.">
      <form onSubmit={(event) => void onSubmit(event)}>
        <AuthField label="Email or username" name="email" autoComplete="username" />
        <AuthField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
        />
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <AuthSubmit busy={busy} label="Sign in" />
      </form>
      <AuthLinks
        items={[
          { href: "/register", label: "Create account" },
          { href: "/forgot-password", label: "Forgot password" },
        ]}
      />
    </AuthCard>
  );
}
