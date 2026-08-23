"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { useAuth } from "../../../components/AuthProvider";
import { GoogleAuthButton } from "../../../components/site/GoogleAuthButton";
import {
  AuthFooterLink,
  AuthInput,
  AuthPrimaryButton,
  AuthRememberRow,
  AuthSplit,
} from "../../../components/site/AuthSplit";

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithGoogle, session, loading } = useAuth();
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
    <AuthSplit
      title="Login"
      subtitle="Any HQ account can sign in — administrator, sales, accountant, and more."
      mode="signin"
      googleSlot={
        <GoogleAuthButton
          intent="login"
          label="Sign in with Google"
          disabled={busy}
          onCredential={async (credential) => {
            await loginWithGoogle(credential);
            toast.success("Signed in with Google.");
            router.replace("/dashboard");
          }}
        />
      }
      footer={
        <>
          Starting a new company?{" "}
          <AuthFooterLink href="/register">Sign up</AuthFooterLink>
        </>
      }
    >
      <form onSubmit={(event) => void onSubmit(event)}>
        <AuthInput
          label="Email or username"
          name="email"
          autoComplete="username"
          required
        />
        <AuthInput
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        <AuthRememberRow />
        <AuthPrimaryButton busy={busy}>Login</AuthPrimaryButton>
      </form>
    </AuthSplit>
  );
}
