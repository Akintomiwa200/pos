"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../components/AuthProvider";
import { AuthCard, AuthField, AuthLinks, AuthSubmit } from "../../../components/site/AuthCard";
import { authErrorMessage } from "../../../lib/hq-api";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { session, loading, updatePassword } = useAuth();
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
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
      setError("Passwords do not match");
      setDone("");
      return;
    }
    setBusy(true);
    setError("");
    setDone("");
    try {
      await updatePassword(String(form.get("current") ?? ""), password);
      setDone("Password updated.");
      event.currentTarget.reset();
    } catch (err) {
      setError(authErrorMessage(err, "Could not update the password"));
    } finally {
      setBusy(false);
    }
  }

  if (loading || !session) {
    return <p className="p-16 text-center text-sm text-neutral-500">Loading…</p>;
  }

  return (
    <AuthCard title="Change password" copy="This updates your HQ password on the live API immediately.">
      <form onSubmit={(event) => void onSubmit(event)}>
        <AuthField
          label="Current password"
          name="current"
          type="password"
          autoComplete="current-password"
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
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        {done ? <p className="mt-3 text-sm text-emerald-600">{done}</p> : null}
        <AuthSubmit busy={busy} label="Update password" />
      </form>
      <AuthLinks
        items={[
          { href: "/dashboard", label: "Back to HQ" },
          { href: "/login", label: "Sign in with another account" },
        ]}
      />
    </AuthCard>
  );
}
