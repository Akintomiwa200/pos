"use client";

import { FormEvent, useState } from "react";
import { PageHero } from "../../../components/site/PageHero";

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(true);
  }

  return (
    <>
      <PageHero
        kicker="Contact"
        title="Talk to HQ onboarding."
        copy="Use this form for implementation questions. Till codes and staff passwords stay in HQ — do not send them here."
      />
      <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
        {sent ? (
          <p className="rounded-2xl bg-white p-6 text-sm text-neutral-600 shadow-[0_8px_30px_rgba(28,28,30,0.06)]">
            Thanks. We have your message and will reply to the email you entered.
          </p>
        ) : (
          <form
            onSubmit={onSubmit}
            className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgba(28,28,30,0.06)]"
          >
            <label className="block text-sm font-medium">Name</label>
            <input
              name="name"
              required
              className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 outline-none focus:border-[#6d4aff]"
            />
            <label className="mt-4 block text-sm font-medium">Email</label>
            <input
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 outline-none focus:border-[#6d4aff]"
            />
            <label className="mt-4 block text-sm font-medium">Message</label>
            <textarea
              name="message"
              required
              rows={5}
              className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 outline-none focus:border-[#6d4aff]"
            />
            <button
              type="submit"
              className="mt-5 w-full rounded-xl bg-[#6d4aff] py-3 text-sm font-semibold text-white"
            >
              Send
            </button>
          </form>
        )}
      </div>
    </>
  );
}
