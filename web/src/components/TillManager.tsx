"use client";

import { useEffect, useState } from "react";
import {
  TILL_PRODUCTS,
  deleteTill,
  listTills,
  regenerateTillCode,
  renewTill,
  saveTill,
  tillProductLabel,
  type HqTill,
  type TillProduct,
} from "../lib/hq-api";
import { ManagerSkeleton } from "./Skeleton";

const blank = {
  id: "",
  name: "",
  branchName: "Victoria Island",
  product: "supermarket" as TillProduct,
  active: true,
};

function expiryLabel(row: HqTill) {
  if (!row.subscriptionExpiresAt) return "Until first activation";
  return new Date(row.subscriptionExpiresAt).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusLabel(row: HqTill) {
  if (!row.active) return "Disabled";
  if (row.expired) return "Expired";
  if (row.online) return "Online";
  if (row.hardwareHex) return "Offline";
  return "Issued";
}

export function TillManager() {
  const [tills, setTills] = useState<HqTill[]>([]);
  const [draft, setDraft] = useState(blank);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  async function load() {
    setTills(await listTills());
    setReady(true);
  }

  useEffect(() => {
    load().catch((err) => {
      setError(err instanceof Error ? err.message : "Could not load tills");
      setReady(true);
    });
    const timer = window.setInterval(() => {
      load().catch(() => undefined);
    }, 4000);
    return () => window.clearInterval(timer);
  }, []);

  function edit(row: HqTill) {
    setDraft({
      id: row.id,
      name: row.name,
      branchName: row.branchName,
      product: row.product ?? "supermarket",
      active: row.active,
    });
    setError("");
    setStatus("");
  }

  async function onSave() {
    setError("");
    setStatus("");
    setBusy(true);
    try {
      const saved = await saveTill(draft);
      await load();
      setDraft(blank);
      setStatus(
        draft.id
          ? "Till updated."
          : `Till issued. Code ${saved.code} — enter it on that device only.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save till");
    } finally {
      setBusy(false);
    }
  }

  async function onRegenerate(id: string) {
    setError("");
    setBusy(true);
    try {
      const next = await regenerateTillCode(id);
      await load();
      setStatus(`New code issued: ${next.code}. The previous device must activate again.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not regenerate code");
    } finally {
      setBusy(false);
    }
  }

  async function onRenew(id: string) {
    setError("");
    setBusy(true);
    try {
      const next = await renewTill(id);
      await load();
      setStatus(
        `Subscription extended to ${
          next.subscriptionExpiresAt
            ? new Date(next.subscriptionExpiresAt).toLocaleDateString("en-NG", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "next year"
        }.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not renew till");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    setError("");
    try {
      await deleteTill(id);
      await load();
      if (draft.id === id) setDraft(blank);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete till");
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setStatus("Till code copied.");
    } catch {
      setStatus(code);
    }
  }

  if (!ready) return <ManagerSkeleton />;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <section className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgba(28,28,30,0.06)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-100 text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Till name</th>
              <th className="px-4 py-3 font-medium">Provider code</th>
              <th className="px-4 py-3 font-medium">Hardware hex</th>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Branch</th>
              <th className="px-4 py-3 font-medium">Expires</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {tills.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-neutral-400" colSpan={8}>
                  No tills issued yet. Create one and give the code to that device.
                </td>
              </tr>
            ) : (
              tills.map((row) => (
                <tr key={row.id} className="border-b border-neutral-50 align-top">
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="font-mono text-[13px] text-[#6d4aff]"
                      onClick={() => void copyCode(row.code)}
                    >
                      {row.code}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {row.hardwareHex ? (
                      <span className="block font-mono text-[12px] text-neutral-700">
                        {row.hardwareHex}
                      </span>
                    ) : (
                      <span className="text-neutral-400">Not paired</span>
                    )}
                    {row.lastSeenAt ? (
                      <span className="mt-1 block text-[11px] text-neutral-400">
                        Seen {new Date(row.lastSeenAt).toLocaleTimeString("en-NG")}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{tillProductLabel(row.product)}</td>
                  <td className="px-4 py-3 text-neutral-600">{row.branchName || "—"}</td>
                  <td className="px-4 py-3 text-neutral-600">{expiryLabel(row)}</td>
                  <td className="px-4 py-3">{statusLabel(row)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button type="button" className="text-[#6d4aff]" onClick={() => edit(row)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="ml-3 text-[#6d4aff]"
                      onClick={() => void onRenew(row.id)}
                      disabled={busy}
                    >
                      +1 year
                    </button>
                    <button
                      type="button"
                      className="ml-3 text-[#6d4aff]"
                      onClick={() => void onRegenerate(row.id)}
                      disabled={busy}
                    >
                      New code
                    </button>
                    <button
                      type="button"
                      className="ml-3 text-neutral-400"
                      onClick={() => void onDelete(row.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <form
        className="rounded-2xl bg-white p-5 shadow-[0_8px_30px_rgba(28,28,30,0.06)]"
        onSubmit={(event) => {
          event.preventDefault();
          void onSave();
        }}
      >
        <h2 className="font-semibold">{draft.id ? "Edit till" : "Issue a till"}</h2>
        <p className="mt-1 text-sm text-neutral-500">
          The till name is what the register shows (for example TILL-VI-01). The
          product decides which till UI that device opens after activation —
          supermarket is the current barcode grid. The 16-character code is
          generated here and entered on that one device. First activation starts
          a one-year subscription.
        </p>
        <label className="mt-4 block text-sm font-medium">Till name</label>
        <input
          value={draft.name}
          onChange={(event) =>
            setDraft({ ...draft, name: event.target.value.toUpperCase() })
          }
          className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 font-mono outline-none focus:border-[#7B61FF]"
          placeholder="TILL-VI-01"
          required
        />
        <label className="mt-3 block text-sm font-medium">Software product</label>
        <select
          value={draft.product}
          onChange={(event) =>
            setDraft({ ...draft, product: event.target.value as TillProduct })
          }
          className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 outline-none focus:border-[#7B61FF]"
        >
          {TILL_PRODUCTS.map((row) => (
            <option key={row.id} value={row.id}>
              {row.label}
            </option>
          ))}
        </select>
        <label className="mt-3 block text-sm font-medium">Branch</label>
        <input
          value={draft.branchName}
          onChange={(event) => setDraft({ ...draft, branchName: event.target.value })}
          className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 outline-none focus:border-[#7B61FF]"
        />
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.active}
            onChange={(event) => setDraft({ ...draft, active: event.target.checked })}
          />
          Active
        </label>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        {status ? <p className="mt-3 text-sm text-[#6d4aff]">{status}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="mt-5 w-full rounded-xl bg-[#6d4aff] py-2.5 font-semibold text-white disabled:opacity-60"
        >
          {draft.id ? "Save till" : "Issue till and generate code"}
        </button>
        {draft.id ? (
          <button
            type="button"
            className="mt-2 w-full py-2 text-sm text-neutral-500"
            onClick={() => setDraft(blank)}
          >
            Cancel
          </button>
        ) : null}
      </form>
    </div>
  );
}
