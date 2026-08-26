"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { homePathForSession } from "@/lib/access";
import { useAuth } from "../../../../components/AuthProvider";
import {
  clearGoogleSignupCredential,
  googleCredentialProfile,
  readGoogleSignupCredential,
} from "@/lib/google-signup";
import {
  AuthFooterLink,
  AuthInput,
  AuthPrimaryButton,
  AuthSectionLabel,
  AuthSplit,
} from "../../../../components/site/AuthSplit";
import { AuthCountryStateFields } from "@/components/geo/CountryStateFields";

export default function GoogleCompanyOnboardPage() {
  const router = useRouter();
  const { signupCompanyWithGoogle, session, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [credential, setCredential] = useState("");
  const [profile, setProfile] = useState({ email: "", name: "" });

  useEffect(() => {
    if (!loading && session) {
      router.replace(homePathForSession(session));
    }
  }, [loading, session, router]);

  useEffect(() => {
    const token = readGoogleSignupCredential();
    if (!token) {
      toast.error("Sign up with Google first, then onboard your company.");
      router.replace("/register");
      return;
    }
    setCredential(token);
    setProfile(googleCredentialProfile(token));
  }, [router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!credential) {
      router.replace("/register");
      return;
    }
    const form = new FormData(event.currentTarget);
    const name = String(form.get("companyName") ?? "").trim();
    if (!name) {
      toast.error("Enter your company name.");
      return;
    }

    setBusy(true);
    try {
      await signupCompanyWithGoogle(credential, {
        name,
        legalName: String(form.get("legalName") ?? "").trim() || name,
        email: String(form.get("companyEmail") ?? "").trim() || profile.email || undefined,
        phone: String(form.get("companyPhone") ?? "").trim() || undefined,
        state: String(form.get("companyState") ?? "").trim() || undefined,
        country: String(form.get("companyCountry") ?? "").trim() || "Nigeria",
        currency: "NGN",
      });
      clearGoogleSignupCredential();
      toast.success("Company onboarded with Google.");
      router.replace("/setup/others/company");
    } catch (err) {
      toast.error(err, "Could not complete company onboarding");
    } finally {
      setBusy(false);
    }
  }

  if (!credential) {
    return (
      <AuthSplit title="Onboard your company" mode="other">
        <div className="mt-8 h-24 animate-pulse rounded-[10px] bg-pos-surface-muted" />
      </AuthSplit>
    );
  }

  return (
    <AuthSplit
      title="Onboard your company"
      subtitle="Same organisation profile as email sign-up. Your Google account is the administrator."
      mode="other"
      footer={
        <>
          Use a different Google account?{" "}
          <AuthFooterLink href="/register">Back to sign up</AuthFooterLink>
        </>
      }
    >
      <div className="mb-6 rounded-[10px] border border-pos-border bg-pos-surface-muted px-4 py-3 text-[13px] text-pos-ink-muted">
        <p className="font-medium text-pos-ink">Administrator (Google)</p>
        <p className="mt-1">
          {profile.name || "Google account"}
          {profile.email ? ` · ${profile.email}` : ""}
        </p>
      </div>

      <form onSubmit={(event) => void onSubmit(event)}>
        <AuthSectionLabel>Company</AuthSectionLabel>
        <AuthInput label="Company name" name="companyName" autoComplete="organization" required />
        <AuthInput label="Legal name (optional)" name="legalName" autoComplete="organization" />
        <AuthInput
          label="Company email"
          name="companyEmail"
          type="email"
          autoComplete="organization"
          defaultValue={profile.email}
        />
        <AuthInput label="Phone" name="companyPhone" autoComplete="tel" />
        <AuthCountryStateFields />
        <AuthPrimaryButton busy={busy}>Create company</AuthPrimaryButton>
      </form>
    </AuthSplit>
  );
}
