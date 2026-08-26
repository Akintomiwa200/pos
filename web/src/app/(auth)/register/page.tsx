"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { homePathForSession } from "@/lib/access";
import { useAuth } from "../../../components/AuthProvider";
import { GoogleAuthButton } from "../../../components/site/GoogleAuthButton";
import { writeGoogleSignupCredential } from "@/lib/google-signup";
import {
  AuthFooterLink,
  AuthInput,
  AuthPrimaryButton,
  AuthSectionLabel,
  AuthSplit,
} from "../../../components/site/AuthSplit";
import { AuthCountryStateFields } from "@/components/geo/CountryStateFields";

export default function RegisterPage() {
  const router = useRouter();
  const { registerCompany, session, loading } = useAuth();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) {
      router.replace(homePathForSession(session));
    }
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
    const companyName = String(form.get("companyName") ?? "").trim();
    if (!companyName) {
      toast.error("Enter your company name.");
      return;
    }

    setBusy(true);
    try {
      await registerCompany({
        company: {
          name: companyName,
          legalName: String(form.get("legalName") ?? "").trim() || companyName,
          email: String(form.get("companyEmail") ?? "").trim() || undefined,
          phone: String(form.get("companyPhone") ?? "").trim() || undefined,
          state: String(form.get("companyState") ?? "").trim() || undefined,
          country: String(form.get("companyCountry") ?? "").trim() || "Nigeria",
          currency: "NGN",
        },
        account: {
          name: String(form.get("name") ?? ""),
          email: String(form.get("email") ?? ""),
          username: String(form.get("username") ?? ""),
          password,
        },
      });
      toast.success("Company created. Welcome to HQ.");
      router.replace("/setup/others/company");
    } catch (err) {
      toast.error(err, "Could not complete company signup");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthSplit
      title="Sign up"
      subtitle="Sign up with Google, then onboard your company — or fill the form and create it directly."
      mode="signup"
      googleSlot={
        <GoogleAuthButton
          intent="signup"
          label="Sign up with Google"
          disabled={busy}
          onCredential={async (credential) => {
            writeGoogleSignupCredential(credential);
            toast.success("Google connected. Onboard your company next.");
            router.push("/register/company");
          }}
        />
      }
      footer={
        <>
          Already have an HQ account?{" "}
          <AuthFooterLink href="/login">Login</AuthFooterLink>
        </>
      }
    >
      <form onSubmit={(event) => void onSubmit(event)}>
        <AuthSectionLabel>Company</AuthSectionLabel>
        <AuthInput label="Company name" name="companyName" autoComplete="organization" required />
        <AuthInput label="Legal name (optional)" name="legalName" autoComplete="organization" />
        <AuthInput
          label="Company email"
          name="companyEmail"
          type="email"
          autoComplete="organization"
        />
        <AuthInput label="Phone" name="companyPhone" autoComplete="tel" />
        <AuthCountryStateFields />

        <AuthSectionLabel>Administrator</AuthSectionLabel>
        <AuthInput label="Full name" name="name" autoComplete="name" required />
        <AuthInput label="Work email" name="email" type="email" autoComplete="email" required />
        <AuthInput label="Username" name="username" autoComplete="username" required />
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
        <AuthPrimaryButton busy={busy}>Create company</AuthPrimaryButton>
      </form>
    </AuthSplit>
  );
}
