"use client";

import { FormEvent, useState } from "react";
import { Clock, Mail, MessageSquare, Shield } from "lucide-react";
import {
  MarketingField,
  MarketingHero,
  MarketingPanel,
  MarketingPrimaryLink,
  MarketingSecondaryLink,
  MarketingSection,
  MarketingSubmit,
  MarketingTextarea,
} from "../../../components/site/MarketingChrome";

const topics = [
  "Company signup and HQ onboarding",
  "Till activation and device licensing",
  "Packaging API, till EXE, or Android APK",
  "Integrations, reports, or custom rollout",
];

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      setSent(true);
    }, 400);
  }

  return (
    <>
      <MarketingHero
        kicker="Contact"
        title="Talk to HQ onboarding."
        copy="Use this form for implementation questions, packaging help, or rollout planning. Never send till codes, staff passwords, or customer data."
      >
        <MarketingSecondaryLink href="/support">Browse support</MarketingSecondaryLink>
      </MarketingHero>

      <MarketingSection className="pb-20">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <MarketingPanel>
            {sent ? (
              <div className="py-6 text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-pos-success-soft text-pos-success">
                  <Mail size={24} />
                </span>
                <h2 className="mt-5 text-xl font-semibold text-pos-ink">Message received</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-pos-ink-muted">
                  Thanks — we have your note and will reply to the email you entered. For urgent till
                  issues, check Support docs while you wait.
                </p>
                <div className="mt-8">
                  <MarketingPrimaryLink href="/">Back to home</MarketingPrimaryLink>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-pos-ink">Send a message</h2>
                <p className="mt-1 text-sm text-pos-ink-muted">
                  We usually respond within one business day.
                </p>
                <form className="mt-6 space-y-4" onSubmit={onSubmit}>
                  <MarketingField label="Name" name="name" required placeholder="Your name" />
                  <MarketingField
                    label="Email"
                    name="email"
                    type="email"
                    required
                    placeholder="you@company.com"
                  />
                  <MarketingField
                    label="Company (optional)"
                    name="company"
                    placeholder="Store or brand name"
                  />
                  <MarketingTextarea
                    label="Message"
                    name="message"
                    required
                    placeholder="Tell us about your stores, tills, and timeline…"
                  />
                  <MarketingSubmit busy={busy} label={busy ? "Sending…" : "Send message"} />
                </form>
              </>
            )}
          </MarketingPanel>

          <aside className="space-y-4">
            <MarketingPanel>
              <div className="flex gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-pos-primary-soft text-pos-primary">
                  <Clock size={18} />
                </span>
                <div>
                  <p className="font-semibold text-pos-ink">Response time</p>
                  <p className="mt-1 text-sm leading-6 text-pos-ink-muted">
                    Weekdays, typically within 24 hours. Install and release questions are welcome.
                  </p>
                </div>
              </div>
            </MarketingPanel>

            <MarketingPanel>
              <div className="flex gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-pos-primary-soft text-pos-primary">
                  <MessageSquare size={18} />
                </span>
                <div>
                  <p className="font-semibold text-pos-ink">Good topics</p>
                  <ul className="mt-2 space-y-2">
                    {topics.map((topic) => (
                      <li key={topic} className="flex gap-2 text-sm text-pos-ink-muted">
                        <span className="text-pos-primary">•</span>
                        {topic}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </MarketingPanel>

            <MarketingPanel>
              <div className="flex gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-pos-primary-soft text-pos-primary">
                  <Shield size={18} />
                </span>
                <div>
                  <p className="font-semibold text-pos-ink">Keep it safe</p>
                  <p className="mt-1 text-sm leading-6 text-pos-ink-muted">
                    Do not email production till codes, HQ passwords, or customer PII. Use in-app
                    Support for account-specific issues after you sign in.
                  </p>
                </div>
              </div>
            </MarketingPanel>
          </aside>
        </div>
      </MarketingSection>
    </>
  );
}
