"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { useAuth } from "../../../components/AuthProvider";
import { AuthCard, AuthField, AuthLinks, AuthSubmit } from "../../../components/site/AuthCard";

export default function LoginPage() {
  const router = useRouter();
  const { login, session, loading } = useAuth();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) router.replace("/dashboard");
  }, [loading, session, router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await login(String(form.get("email") ?? ""), String(form.get("password") ?? ""));
      toast.success("Signed in.");
      router.replace("/dashboard");
    } catch (err) {
      toast.error(err, "Could not sign in");
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
