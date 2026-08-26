"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Wifi, WifiOff } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  TILL_PRODUCTS,
  deleteTill,
  regenerateTillCode,
  renewTill,
  saveTill,
  tillProductLabel,
  type HqTill,
  type TillProduct,
} from "@/lib/hq-api";
import { useLivePos } from "@/lib/live-pos";
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
import { useOrgLinks } from "@/lib/org-links";

const blank = {
  id: "",
  name: "",
  storeId: "",
  branchId: "",
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
  const links = useOrgLinks();
  const { company, tills, stores, branches, live, ready } = useLivePos();
  const [draft, setDraft] = useState(blank);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const sorted = [...tills].sort((a, b) => a.name.localeCompare(b.name));
    if (!query) return sorted;
    return sorted.filter((row) => {
      const store = stores.find((item) => item.id === row.storeId);
      const branch = branches.find((item) => item.id === row.branchId);
      return [
        row.name,
        row.code,
        store?.name ?? "",
        branch?.name ?? row.branchName,
        tillProductLabel(row.product),
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [tills, search, stores, branches]);

  const onlineCount = tills.filter((row) => row.online && row.active && !row.expired).length;
  const pairedCount = tills.filter((row) => Boolean(row.hardwareHex)).length;
  const expiredCount = tills.filter((row) => row.expired || !row.active).length;

  function storeOf(till: HqTill) {
    return stores.find((row) => row.id === till.storeId);
  }

  function branchOf(till: HqTill) {
    return branches.find((row) => row.id === till.branchId);
  }

  function branchesOfStore(storeId: string) {
    if (!storeId) return branches;
    const linked = branches.filter((row) => row.storeId === storeId);
    return linked.length ? linked : branches;
  }

  const storeBranches = branchesOfStore(draft.storeId);

  function edit(row: HqTill) {
    setDraft({
      id: row.id,
      name: row.name,
      storeId: row.storeId || stores[0]?.id || "",
      branchId: row.branchId || "",
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
    if (!draft.storeId) {
      toast.error("Choose a store.");
      return;
    }
    if (!draft.branchId) {
      toast.error("Choose a branch. A till stays on that branch only.");
      return;
    }
    setBusy(true);
    try {
      const saved = await saveTill(draft);
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
        kicker={links.area === "producer" ? "Producer · Companies" : "Analytics · Point of Sales"}
        title="Tills"
        copy={`${company?.name || "Company"} → store → till. Assign each till to one branch. It cannot be used at another branch.`}
        action={
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-xl border border-pos-border px-3 py-2.5 text-[12px] font-medium ${
                live
                  ? "bg-pos-success/10 text-pos-success"
                  : "bg-pos-surface-muted text-pos-ink-faint"
              }`}
              title={live ? "Tills are live from HQ" : "Live sync offline"}
            >
              {live ? <Wifi size={13} /> : <WifiOff size={13} />}
              {live ? "Live" : "Offline"}
            </span>
            <PrimaryButton
              disabled={stores.length === 0 || branches.length === 0}
              onClick={() => {
                const storeId = stores[0]?.id ?? "";
                const storeBranches = storeId
                  ? branches.filter((row) => row.storeId === storeId)
                  : branches;
                const branchPool = storeBranches.length ? storeBranches : branches;
                setDraft({
                  ...blank,
                  storeId,
                  branchId: branchPool[0]?.id ?? "",
                });
                setOpen(true);
              }}
            >
              <span className="inline-flex items-center gap-2">
                <Plus size={16} />
                Issue till
              </span>
            </PrimaryButton>
          </div>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Issued" value={String(tills.length)} hint={`${pairedCount} paired`} />
        <SetupStat label="Online now" value={String(onlineCount)} tone="accent" />
        <SetupStat label="Paired devices" value={String(pairedCount)} />
        <SetupStat label="Expired / off" value={String(expiredCount)} />
      </div>

      {stores.length === 0 || branches.length === 0 ? (
        <p className="mb-3 text-sm text-pos-ink-muted">
          Create a{" "}
          <Link href={links.store} className="font-medium text-pos-primary hover:underline">
            store
          </Link>{" "}
          and a{" "}
          <Link href={links.branch} className="font-medium text-pos-primary hover:underline">
            branch
          </Link>{" "}
          first. Then issue a till for that one branch.
        </p>
      ) : null}

      <DataTable
        columns={["Till", "Code", "Device", "Product", "Store · Branch", "Expires", "Status", ""]}
        toolbar={
          <input
            className={`${fieldClass} max-w-sm`}
            placeholder="Search tills, codes, stores…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        }
      >
        {rows.length === 0 ? (
          <tr>
            <td className="px-4 py-6 text-pos-ink-faint" colSpan={8}>
              No tills issued yet. Create a store, then issue a till for that device.
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
                <td className="px-4 py-3 text-pos-ink-muted">
                  {(() => {
                    const store = storeOf(row);
                    const branch = branchOf(row);
                    if (!store && !branch) return row.branchName || "—";
                    return (
                      <span>
                        {store?.name || "Store"}
                        <span className="mt-1 block text-[11px] text-pos-ink-faint">
                          {branch?.name || row.branchName || "No branch"} · locked
                        </span>
                      </span>
                    );
                  })()}
                </td>
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
        subtitle="Assigned to one branch only. Activate this code on that device — it will not work as another till at a different branch."
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
        <Field label="Store">
          <select
            className={fieldClass}
            value={draft.storeId}
            disabled={Boolean(draft.id) || stores.length === 0}
            onChange={(event) => {
              const storeId = event.target.value;
              const nextBranches = branchesOfStore(storeId);
              const branchId = nextBranches.some((row) => row.id === draft.branchId)
                ? draft.branchId
                : (nextBranches[0]?.id ?? "");
              setDraft({ ...draft, storeId, branchId });
            }}
          >
            {stores.length === 0 ? (
              <option value="">Add a store first</option>
            ) : (
              stores.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))
            )}
          </select>
        </Field>
        <Field label="Branch">
          <select
            className={fieldClass}
            value={draft.branchId}
            disabled={Boolean(draft.id) || storeBranches.length === 0}
            onChange={(event) => setDraft({ ...draft, branchId: event.target.value })}
          >
            {storeBranches.length === 0 ? (
              <option value="">Add a branch of this store first</option>
            ) : (
              storeBranches.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))
            )}
          </select>
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
