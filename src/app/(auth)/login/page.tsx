"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../components/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { login, session, loading } = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) router.replace("/dashboard");
  }, [loading, session, router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    setBusy(true);
    setError("");
    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl bg-white p-8 shadow-[0_8px_30px_rgba(28,28,30,0.06)]"
      >
        <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-full bg-[#7B61FF] text-lg font-bold text-white">
          C
        </div>
        <h1 className="text-2xl font-semibold">POS Console</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Menus follow the departments and privileges on your group.
        </p>
        <label className="mt-6 block text-sm font-medium">Email or username</label>
        <input
          name="email"
          type="text"
          required
          autoComplete="username"
          className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 outline-none focus:border-[#7B61FF]"
        />
        <label className="mt-4 block text-sm font-medium">Password</label>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 outline-none focus:border-[#7B61FF]"
        />
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full rounded-xl bg-[#7B61FF] py-3 font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
