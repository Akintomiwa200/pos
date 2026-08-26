"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { provisionCompanyConsole } from "@/lib/hq-api";
import { getCompany, type HqCompany } from "@/lib/hq-setup";
import { useAuth } from "@/components/AuthProvider";
import { SetupCountryStateFields } from "@/components/geo/CountryStateFields";
import {
  Field,
  PrimaryButton,
  SetupHeader,
  fieldClass,
} from "@/components/setup/SetupChrome";

export function SuperRegisterCompany() {
  const router = useRouter();
  const { session } = useAuth();
  const [busy, setBusy] = useState(false);
  const [existing, setExisting] = useState<HqCompany | null>(null);
  const [country, setCountry] = useState("Nigeria");
  const [state, setState] = useState("");

  useEffect(() => {
    getCompany()
      .then(setExisting)
      .catch(() => setExisting(null));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.token) {
      toast.error("Sign in again.");
      return;
    }
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    const companyName = String(form.get("companyName") ?? "").trim();
    if (!companyName) {
      toast.error("Enter the company name.");
      return;
    }

    setBusy(true);
    try {
      const result = await provisionCompanyConsole(session.token, {
        company: {
          name: companyName,
          legalName: String(form.get("legalName") ?? "").trim() || companyName,
          email: String(form.get("companyEmail") ?? "").trim() || undefined,
          phone: String(form.get("companyPhone") ?? "").trim() || undefined,
          state: state.trim() || undefined,
          country: country.trim() || "Nigeria",
          currency: "NGN",
        },
        account: {
          name: String(form.get("name") ?? ""),
          email: String(form.get("email") ?? ""),
          username: String(form.get("username") ?? ""),
          password,
        },
      });
      toast.success(
        result.owner
          ? `${result.company.name} is ready. Login details were emailed to ${result.owner.email}.`
          : `${result.company.name} is ready.`,
      );
      router.push(result.company?.id ? `/admin/companies/${result.company.id}` : "/admin/companies");
    } catch (err) {
      toast.error(err, "Could not register the company");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <SetupHeader
        kicker="Producer · Companies"
        title="Register company"
        copy="Create the company administrator and save the organisation profile. You stay signed in as Super Admin — the owner gets a welcome email to log into company HQ."
      />

      {existing?.name ? (
        <p className="mb-6 rounded-[16px] border border-pos-border bg-pos-surface px-4 py-3 text-sm text-pos-ink-muted">
          This HQ currently holds <span className="font-medium text-pos-ink">{existing.name}</span>.
          Registering updates that company profile and adds a new administrator account.
        </p>
      ) : null}

      <form
        onSubmit={(event) => void onSubmit(event)}
        className="max-w-2xl rounded-[18px] border border-pos-border bg-pos-surface p-5"
      >
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-pos-ink-faint">
          Company
        </p>
        <Field label="Company name">
          <input className={fieldClass} name="companyName" autoComplete="organization" required />
        </Field>
        <Field label="Legal name" hint="Optional — defaults to the trading name">
          <input className={fieldClass} name="legalName" autoComplete="organization" />
        </Field>
        <Field label="Company email">
          <input className={fieldClass} name="companyEmail" type="email" autoComplete="organization" />
        </Field>
        <Field label="Phone">
          <input className={fieldClass} name="companyPhone" autoComplete="tel" />
        </Field>
        <SetupCountryStateFields
          country={country}
          state={state}
          onChange={(next) => {
            setCountry(next.country);
            setState(next.state);
          }}
        />

        <p className="mb-3 mt-6 text-[11px] font-semibold uppercase tracking-[0.14em] text-pos-ink-faint">
          Company administrator
        </p>
        <Field label="Full name">
          <input className={fieldClass} name="name" autoComplete="name" required />
        </Field>
        <Field label="Work email">
          <input className={fieldClass} name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Username">
          <input className={fieldClass} name="username" autoComplete="username" required />
        </Field>
        <Field label="Password">
          <input
            className={fieldClass}
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
          />
        </Field>
        <Field label="Confirm password">
          <input
            className={fieldClass}
            name="confirm"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
          />
        </Field>
        <div className="mt-4">
          <PrimaryButton type="submit" disabled={busy}>
            {busy ? "Registering…" : "Register company"}
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
}
