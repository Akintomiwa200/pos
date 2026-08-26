"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Globe, Plus } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  deleteStorefront,
  getCompany,
  listBranches,
  listStorefronts,
  listStores,
  saveStorefront,
  type HqStore,
  type HqStorefront,
} from "@/lib/hq-setup";
import { ManagerSkeleton } from "@/components/Skeleton";
import {
  DataTable,
  Field,
  PrimaryButton,
  SetupHeader,
  SetupStat,
  ToggleField,
  fieldClass,
  secondaryButtonClass,
} from "@/components/setup/SetupChrome";
import { useOrgLive } from "./useOrgLive";
import { useOrgLinks } from "@/lib/org-links";

const blank = (storeId = ""): Partial<HqStorefront> => ({
  name: "",
  storeId,
  url: "",
  hours: "08:00 – 22:00",
  enabled: false,
  syncPrices: true,
  syncStock: true,
});

export function StorefrontManager() {
  const links = useOrgLinks();
  const [rows, setRows] = useState<HqStorefront[]>([]);
  const [stores, setStores] = useState<HqStore[]>([]);
  const [branchNames, setBranchNames] = useState<Map<string, string>>(new Map());
  const [companyName, setCompanyName] = useState("");
  const [draft, setDraft] = useState(blank());
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    const [fronts, storeRows, branches, company] = await Promise.all([
      listStorefronts(),
      listStores(),
      listBranches().catch(() => []),
      getCompany().catch(() => null),
    ]);
    setRows(fronts);
    setStores(storeRows);
    setBranchNames(new Map(branches.map((b) => [b.id, b.name])));
    setCompanyName(company?.name || "");
  }, []);

  useEffect(() => {
    load()
      .catch((err) => toast.error(err, "Could not load storefronts"))
      .finally(() => setReady(true));
  }, [load]);

  useOrgLive(load);

  if (!ready) return <ManagerSkeleton variant="table" />;

  const liveCount = rows.filter((row) => row.enabled).length;
  const storeLabel = (id: string) => {
    const store = stores.find((s) => s.id === id);
    if (!store) return id || "—";
    const n = branchNames.size;
    if (n) return `${store.name} · ${n} branch${n === 1 ? "" : "es"}`;
    return companyName ? `${store.name} · ${companyName}` : store.name;
  };

  return (
    <div>
      <SetupHeader
        kicker={links.area === "producer" ? "Producer · Companies" : "Setup · Organization"}
        title="Storefronts"
        copy="Online shop per store. Prices and stock can follow the live till catalog."
        action={
          <PrimaryButton
            disabled={stores.length === 0}
            onClick={() => {
              setDraft(blank(stores[0]?.id ?? ""));
              setOpen(true);
            }}
          >
            <Plus size={16} />
            New storefront
          </PrimaryButton>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <SetupStat label="Storefronts" value={String(rows.length)} hint={`${liveCount} live`} />
        <SetupStat label="Live" value={String(liveCount)} tone="accent" />
        <SetupStat label="Stores linked" value={String(stores.length)} hint={companyName || "Company"} />
      </div>

      {stores.length === 0 ? (
        <p className="mb-4 rounded-[16px] bg-pos-surface px-4 py-3 text-sm text-pos-ink-muted shadow-pos-sm">
          Add a company store first. It covers every branch.{" "}
          <Link href={links.store} className="font-medium text-pos-primary hover:underline">
            Open stores
          </Link>{" "}
          or{" "}
          <Link href={links.branch} className="font-medium text-pos-primary hover:underline">
            branches
          </Link>
          .
        </p>
      ) : (
        <p className="mb-3 text-sm text-pos-ink-muted">
          Each storefront belongs to one store.{" "}
          <Link href={links.store} className="font-medium text-pos-primary hover:underline">
            Manage stores
          </Link>
          .
        </p>
      )}

      <DataTable columns={["Name", "Store", "URL", "Hours", "Live"]}>
        {rows.length === 0 ? (
          <tr>
            <td className="px-4 py-8 text-center text-pos-ink-faint" colSpan={5}>
              No storefronts yet. Publish an online shop for a store.
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr
              key={row.id}
              className="cursor-pointer hover:bg-pos-surface-muted"
              onClick={() => {
                setDraft(row);
                setOpen(true);
              }}
            >
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-2 font-medium">
                  <Globe size={14} className="text-pos-ink-faint" />
                  {row.name}
                </span>
              </td>
              <td className="px-4 py-3 text-pos-ink-muted">{storeLabel(row.storeId)}</td>
              <td className="max-w-[220px] truncate px-4 py-3 text-pos-ink-muted">{row.url || "—"}</td>
              <td className="px-4 py-3 text-pos-ink-muted">{row.hours || "—"}</td>
              <td className="px-4 py-3">{row.enabled ? "On" : "Off"}</td>
            </tr>
          ))
        )}
      </DataTable>

      {open ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-pos-ink/45 backdrop-blur-[2px]"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 right-0 flex h-full w-full max-w-lg flex-col bg-pos-bg shadow-pos-md">
            <header className="border-b border-pos-border bg-pos-surface px-6 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pos-ink-faint">
                Organization · Storefronts
              </p>
              <h2 className="mt-2 text-xl font-medium text-pos-ink">
                {draft.id ? "Edit storefront" : "New storefront"}
              </h2>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <Field label="Name">
                <input
                  className={fieldClass}
                  value={draft.name ?? ""}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </Field>
              <Field label="Store">
                <select
                  className={fieldClass}
                  value={draft.storeId ?? ""}
                  onChange={(e) => setDraft({ ...draft, storeId: e.target.value })}
                >
                  {stores.map((row) => (
                    <option key={row.id} value={row.id}>
                      {storeLabel(row.id)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="URL">
                <input
                  className={fieldClass}
                  value={draft.url ?? ""}
                  onChange={(e) => setDraft({ ...draft, url: e.target.value })}
                  placeholder="https://"
                />
              </Field>
              <Field label="Hours">
                <input
                  className={fieldClass}
                  value={draft.hours ?? ""}
                  onChange={(e) => setDraft({ ...draft, hours: e.target.value })}
                />
              </Field>
              <ToggleField
                label="Enabled"
                checked={draft.enabled ?? false}
                onChange={(enabled) => setDraft({ ...draft, enabled })}
              />
              <ToggleField
                label="Sync prices"
                checked={draft.syncPrices ?? true}
                onChange={(syncPrices) => setDraft({ ...draft, syncPrices })}
              />
              <ToggleField
                label="Sync stock"
                checked={draft.syncStock ?? true}
                onChange={(syncStock) => setDraft({ ...draft, syncStock })}
              />
            </div>
            <footer className="flex gap-2 border-t border-pos-border bg-pos-surface px-5 py-4">
              {draft.id ? (
                <button
                  type="button"
                  className={secondaryButtonClass}
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await deleteStorefront(draft.id!);
                      await load();
                      setOpen(false);
                      toast.success("Storefront deleted.");
                    } catch (err) {
                      toast.error(err, "Could not delete storefront");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Delete
                </button>
              ) : (
                <button type="button" className={secondaryButtonClass} onClick={() => setOpen(false)}>
                  Cancel
                </button>
              )}
              <PrimaryButton
                className="flex-1"
                disabled={busy}
                onClick={async () => {
                  if (!draft.name?.trim()) {
                    toast.error("Storefront name is required.");
                    return;
                  }
                  if (!draft.storeId) {
                    toast.error("Pick a store for this storefront.");
                    return;
                  }
                  setBusy(true);
                  try {
                    await saveStorefront(draft);
                    await load();
                    setOpen(false);
                    toast.success("Storefront saved.");
                  } catch (err) {
                    toast.error(err, "Could not save storefront");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Saving…" : "Save storefront"}
              </PrimaryButton>
            </footer>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
