"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { useAuth } from "../../../components/AuthProvider";
import { AuthCard, AuthField, AuthLinks, AuthSubmit } from "../../../components/site/AuthCard";
export default function RegisterPage() {
  const router = useRouter();
  const { register, session, loading } = useAuth();
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
      toast.error("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      await register({
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        username: String(form.get("username") ?? ""),
        password,
      });
      toast.success("Account created.");
      router.replace("/dashboard");
    } catch (err) {
      toast.error(err, "Could not create the account");
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
        <AuthSubmit busy={busy} label="Create account" />
      </form>
      <AuthLinks items={[{ href: "/login", label: "Already have an account? Sign in" }]} />
    </AuthCard>
  );
}
