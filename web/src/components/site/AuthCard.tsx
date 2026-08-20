"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandLogo } from "./BrandLogo";

export function AuthCard({
  title,
  copy,
  children,
}: {
  title: string;
  copy: string;
  children: React.ReactNode;
}) {
  const live = useApiLive();

  return (
    <main className="flex items-center justify-center px-4 py-16 sm:px-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-[0_8px_30px_rgba(28,28,30,0.06)]">
        <div className="mb-8 flex items-center justify-between">
          <BrandLogo />
          <p
            className={`text-xs font-medium ${
              live === null ? "text-neutral-400" : live ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {live === null ? "Checking API…" : live ? "Live API" : "API offline"}
          </p>
        </div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-neutral-500">{copy}</p>
        {children}
      </div>
    </main>
  );
}

export function AuthField({
  label,
  name,
  type = "text",
  autoComplete,
  required = true,
  defaultValue,
  minLength,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  defaultValue?: string;
  minLength?: number;
}) {
  return (
    <label className="mt-4 block text-sm font-medium first:mt-6">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        minLength={minLength}
        className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 font-normal outline-none focus:border-[#6d4aff]"
      />
    </label>
  );
}

export function AuthSubmit({ busy, label }: { busy: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="mt-6 w-full rounded-xl bg-[#6d4aff] py-3 font-semibold text-white disabled:opacity-60"
    >
      {busy ? "Please wait…" : label}
    </button>
  );
}

export function AuthLinks({
  items,
}: {
  items: { href: string; label: string }[];
}) {
  return (
    <p className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-1 text-center text-sm text-neutral-500">
      {items.map((item) => (
        <Link key={item.href} href={item.href} className="font-medium text-[#6d4aff]">
          {item.label}
        </Link>
      ))}
    </p>
  );
}

function useApiLive() {
  const [live, setLive] = useState<boolean | null>(null);

  useEffect(() => {
    let stopped = false;
    async function ping() {
      try {
        const response = await fetch("/api/console/groups");
        if (!stopped) setLive(response.ok);
      } catch {
        if (!stopped) setLive(false);
      }
    }
    void ping();
    const timer = window.setInterval(() => void ping(), 5000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, []);

  return live;
}
