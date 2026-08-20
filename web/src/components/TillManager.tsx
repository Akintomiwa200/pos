"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { listBranches, type HqBranch } from "../lib/hq-setup";
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
import { SlideOver } from "./SlideOver";
import { Field, PrimaryButton, ToggleField, fieldClass } from "./setup/SetupChrome";

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
  const [branches, setBranches] = useState<HqBranch[]>([]);
  const [draft, setDraft] = useState(blank);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  async function load() {
    const [tillRows, branchRows] = await Promise.all([listTills(), listBranches().catch(() => [])]);
    setTills(tillRows);
    setBranches(branchRows);
    setReady(true);
  }

  useEffect(() => {
    load().catch((err) => {
      toast.error(err instanceof Error ? err.message : "Could not load tills");
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
    setOpen(true);
  }

  async function onSave() {
    setBusy(true);
    try {
      const saved = await saveTill(draft);
      await load();
      setDraft(blank);
      setOpen(false);
      toast.success(
        draft.id
          ? "Till updated."
          : `Till issued. Code ${saved.code} — enter it on that device only.`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save till");
    } finally {
      setBusy(false);
    }
  }

  async function onRegenerate(id: string) {
    setBusy(true);
    try {
      const next = await regenerateTillCode(id);
      await load();
      toast.success(`New code issued: ${next.code}. The previous device must activate again.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not regenerate code");
    } finally {
      setBusy(false);
    }
  }

  async function onRenew(id: string) {
    setBusy(true);
    try {
      const next = await renewTill(id);
      await load();
      toast.success(
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
      toast.error(err instanceof Error ? err.message : "Could not renew till");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    try {
      await deleteTill(id);
      await load();
      if (draft.id === id) {
        setDraft(blank);
        setOpen(false);
      }
      toast.success("Till deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete till");
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Till code copied.");
    } catch {
      toast.error(`Could not copy. Code: ${code}`);
    }
  }

  if (!ready) return <ManagerSkeleton variant="list" />;

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <PrimaryButton
          onClick={() => {
            setDraft({ ...blank, branchName: branches[0]?.name ?? "Victoria Island" });
            setOpen(true);
          }}
        >
          Issue till
        </PrimaryButton>
      </div>
      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgba(28,28,30,0.06)]">
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
      </div>
      <SlideOver
        open={open}
        title={draft.id ? "Edit till" : "Issue a till"}
        subtitle="The 16-character code is generated here and entered on that one device."
        onClose={() => setOpen(false)}
        footer={
          <PrimaryButton className="w-full" disabled={busy} onClick={() => void onSave()}>
            {draft.id ? "Save till" : "Issue till and generate code"}
          </PrimaryButton>
        }
      >
        <Field label="Till name">
          <input
            className={`${fieldClass} font-mono`}
            value={draft.name}
            placeholder="TILL-VI-01"
            onChange={(event) => setDraft({ ...draft, name: event.target.value.toUpperCase() })}
          />
        </Field>
        <Field label="Software product">
          <select
            className={fieldClass}
            value={draft.product}
            onChange={(event) => setDraft({ ...draft, product: event.target.value as TillProduct })}
          >
            {TILL_PRODUCTS.map((row) => (
              <option key={row.id} value={row.id}>
                {row.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Branch">
          {branches.length ? (
            <select
              className={fieldClass}
              value={draft.branchName}
              onChange={(event) => setDraft({ ...draft, branchName: event.target.value })}
            >
              {branches.map((row) => (
                <option key={row.id} value={row.name}>
                  {row.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              className={fieldClass}
              value={draft.branchName}
              onChange={(event) => setDraft({ ...draft, branchName: event.target.value })}
            />
          )}
        </Field>
        <ToggleField label="Active" checked={draft.active} onChange={(active) => setDraft({ ...draft, active })} />
      </SlideOver>
    </div>
  );
}
