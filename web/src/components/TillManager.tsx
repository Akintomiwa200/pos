"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "@/lib/toast";
import { listBranches, type HqBranch } from "@/lib/hq-setup";
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
} from "@/lib/hq-api";
import { ManagerSkeleton } from "./Skeleton";
import { SlideOver } from "./SlideOver";
import {
  DataTable,
  Field,
  PrimaryButton,
  SetupHeader,
  SetupStat,
  ToggleField,
  fieldClass,
  secondaryButtonClass,
} from "./setup/SetupChrome";

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

function statusOf(row: HqTill): { label: string; tone: "ok" | "warn" | "bad" | "muted" } {
  if (!row.active) return { label: "Disabled", tone: "muted" };
  if (row.expired) return { label: "Expired", tone: "bad" };
  if (row.online) return { label: "Online", tone: "ok" };
  if (row.hardwareHex) return { label: "Offline", tone: "warn" };
  return { label: "Issued", tone: "muted" };
}

const statusClass: Record<string, string> = {
  ok: "bg-emerald-50 text-emerald-700",
  warn: "bg-amber-50 text-amber-800",
  bad: "bg-red-50 text-red-700",
  muted: "bg-pos-surface-muted text-pos-ink-muted",
};

export function TillManager() {
  const [tills, setTills] = useState<HqTill[]>([]);
  const [branches, setBranches] = useState<HqBranch[]>([]);
  const [draft, setDraft] = useState(blank);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState("");

  async function load() {
    const [tillRows, branchRows] = await Promise.all([listTills(), listBranches().catch(() => [])]);
    setTills(tillRows);
    setBranches(branchRows);
    setReady(true);
  }

  useEffect(() => {
    load().catch((err) => {
      toast.error(err, "Could not load tills");
      setReady(true);
    });
    const timer = window.setInterval(() => {
      load().catch(() => undefined);
    }, 4000);
    return () => window.clearInterval(timer);
  }, []);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const sorted = [...tills].sort((a, b) => a.name.localeCompare(b.name));
    if (!query) return sorted;
    return sorted.filter((row) =>
      [row.name, row.code, row.branchName, tillProductLabel(row.product)].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [tills, search]);

  const onlineCount = tills.filter((row) => row.online && row.active && !row.expired).length;
  const pairedCount = tills.filter((row) => Boolean(row.hardwareHex)).length;
  const expiredCount = tills.filter((row) => row.expired || !row.active).length;

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
    if (!draft.name.trim()) {
      toast.error("Enter a till name.");
      return;
    }
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
      toast.error(err, "Could not save till");
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
      toast.error(err, "Could not regenerate code");
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
      toast.error(err, "Could not renew till");
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
      toast.error(err, "Could not delete till");
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

  if (!ready) return <ManagerSkeleton variant="table" />;

  return (
    <div>
      <SetupHeader
        kicker="Analytics · Point of Sales"
        title="Tills"
        copy="Each physical register is one till. Issue a code, activate it on that device only, then renew yearly when the subscription ends."
        action={
          <PrimaryButton
            onClick={() => {
              setDraft({ ...blank, branchName: branches[0]?.name ?? "Victoria Island" });
              setOpen(true);
            }}
          >
            <span className="inline-flex items-center gap-2">
              <Plus size={16} />
              Issue till
            </span>
          </PrimaryButton>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Issued" value={String(tills.length)} hint={`${pairedCount} paired`} />
        <SetupStat label="Online now" value={String(onlineCount)} tone="accent" />
        <SetupStat label="Paired devices" value={String(pairedCount)} />
        <SetupStat label="Expired / off" value={String(expiredCount)} />
      </div>

      <DataTable
        columns={["Till", "Code", "Device", "Product", "Branch", "Expires", "Status", ""]}
        toolbar={
          <input
            className={`${fieldClass} max-w-sm`}
            placeholder="Search tills, codes, branches…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        }
      >
        {rows.length === 0 ? (
          <tr>
            <td className="px-4 py-6 text-pos-ink-faint" colSpan={8}>
              No tills issued yet. Create one and give the code to that device.
            </td>
          </tr>
        ) : (
          rows.map((row) => {
            const status = statusOf(row);
            return (
              <tr
                key={row.id}
                className="cursor-pointer border-b border-pos-border/60 align-top hover:bg-pos-surface-muted"
                onClick={() => edit(row)}
              >
                <td className="px-4 py-3 font-medium">{row.name}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="font-mono text-[13px] text-pos-primary hover:underline"
                    onClick={(event) => {
                      event.stopPropagation();
                      void copyCode(row.code);
                    }}
                  >
                    {row.code}
                  </button>
                </td>
                <td className="px-4 py-3">
                  {row.hardwareHex ? (
                    <span className="block font-mono text-[12px] text-pos-ink">{row.hardwareHex}</span>
                  ) : (
                    <span className="text-pos-ink-faint">Not paired</span>
                  )}
                  {row.lastSeenAt ? (
                    <span className="mt-1 block text-[11px] text-pos-ink-faint">
                      Seen {new Date(row.lastSeenAt).toLocaleTimeString("en-NG")}
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-pos-ink-muted">{tillProductLabel(row.product)}</td>
                <td className="px-4 py-3 text-pos-ink-muted">{row.branchName || "—"}</td>
                <td className="px-4 py-3 text-pos-ink-muted">{expiryLabel(row)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClass[status.tone]}`}
                  >
                    {status.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button
                    type="button"
                    className="text-sm text-pos-primary"
                    disabled={busy}
                    onClick={(event) => {
                      event.stopPropagation();
                      void onRenew(row.id);
                    }}
                  >
                    +1 year
                  </button>
                  <button
                    type="button"
                    className="ml-3 text-sm text-pos-primary"
                    disabled={busy}
                    onClick={(event) => {
                      event.stopPropagation();
                      void onRegenerate(row.id);
                    }}
                  >
                    New code
                  </button>
                </td>
              </tr>
            );
          })
        )}
      </DataTable>

      <SlideOver
        open={open}
        title={draft.id ? "Edit till" : "Issue a till"}
        subtitle="The 16-character code is generated here and entered on that one device."
        onClose={() => setOpen(false)}
        footer={
          <div className="flex gap-2">
            {draft.id ? (
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => void onDelete(draft.id)}
              >
                Delete
              </button>
            ) : null}
            <PrimaryButton className="flex-1" disabled={busy} onClick={() => void onSave()}>
              {draft.id ? "Save till" : "Issue till and generate code"}
            </PrimaryButton>
          </div>
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
        <ToggleField
          label="Active"
          checked={draft.active}
          onChange={(active) => setDraft({ ...draft, active })}
        />
      </SlideOver>
    </div>
  );
}
