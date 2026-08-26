"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, Plus, Wifi, WifiOff } from "lucide-react";
import { toast } from "@/lib/toast";
import { deleteBranch, saveBranch, type HqBranch, type HqCompany } from "@/lib/hq-setup";
import { useLivePos } from "@/lib/live-pos";
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
import { SetupStateSelect } from "@/components/geo/CountryStateFields";
import { useOrgLinks } from "@/lib/org-links";

type Draft = Partial<HqBranch> & {
  name: string;
  city: string;
  state: string;
  address: string;
  phone: string;
  manager: string;
  active: boolean;
};

const blank = (company?: HqCompany | null, storeId = ""): Draft => ({
  name: "",
  city: "",
  state: company?.state || "Lagos",
  address: "",
  phone: "",
  manager: "",
  active: true,
  companyId: company?.id,
  storeId,
});

export function BranchManager() {
  const links = useOrgLinks();
  const { company, branches: rows, tills, stores, live, ready } = useLivePos();
  const [draft, setDraft] = useState<Draft>(blank());
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const tillCount = new Map<string, number>();
  for (const till of tills) {
    if (!till.branchId) continue;
    tillCount.set(till.branchId, (tillCount.get(till.branchId) ?? 0) + 1);
  }

  if (!ready) return <ManagerSkeleton variant="table" />;

  const activeCount = rows.filter((row) => row.active).length;

  return (
    <div>
      <SetupHeader
        kicker={links.area === "producer" ? "Producer · Companies" : "Setup · Organization"}
        title="Branches"
        copy={`Locations of ${company?.name || "your company"}. The store covers all of them. A till assigned here cannot be used at another branch.`}
        action={
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-xl border border-pos-border px-3 py-2.5 text-[12px] font-medium ${
                live
                  ? "bg-pos-success/10 text-pos-success"
                  : "bg-pos-surface-muted text-pos-ink-faint"
              }`}
              title={live ? "Branches are live from HQ" : "Live sync offline"}
            >
              {live ? <Wifi size={13} /> : <WifiOff size={13} />}
              {live ? "Live" : "Offline"}
            </span>
            <PrimaryButton
              onClick={() => {
                setDraft(blank(company, stores[0]?.id ?? ""));
                setOpen(true);
              }}
            >
              <Plus size={16} />
              New branch
            </PrimaryButton>
          </div>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <SetupStat label="Branches" value={String(rows.length)} hint={`${activeCount} active`} />
        <SetupStat label="Active" value={String(activeCount)} tone="accent" />
        <SetupStat label="Company" value={company?.name || "—"} hint={`${stores.length} store${stores.length === 1 ? "" : "s"}`} />
      </div>

      <p className="mb-3 text-sm text-pos-ink-muted">
        Linked to{" "}
        <Link href={links.company} className="font-medium text-pos-primary hover:underline">
          {company?.name || "company"}
        </Link>
        . Open a row to edit.{" "}
        <Link href={links.store} className="font-medium text-pos-primary hover:underline">
          Manage stores
        </Link>
        {" · "}
        <Link href={links.till} className="font-medium text-pos-primary hover:underline">
          Issue tills
        </Link>
        .
      </p>

      <DataTable columns={["Name", "City", "Phone", "Manager", "Tills", "Status"]}>
        {rows.length === 0 ? (
          <tr>
            <td className="px-4 py-8 text-center text-pos-ink-faint" colSpan={6}>
              No branches yet. Create a location, then issue tills that stay on that branch only.
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
                  <MapPin size={14} className="text-pos-ink-faint" />
                  {row.name}
                </span>
              </td>
              <td className="px-4 py-3 text-pos-ink-muted">
                {[row.city, row.state].filter(Boolean).join(", ") || "—"}
              </td>
              <td className="px-4 py-3 text-pos-ink-muted">{row.phone || "—"}</td>
              <td className="px-4 py-3 text-pos-ink-muted">{row.manager || "—"}</td>
              <td className="px-4 py-3 tabular-nums">{tillCount.get(row.id) ?? 0}</td>
              <td className="px-4 py-3">{row.active ? "Active" : "Closed"}</td>
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
                Organization · Branches
              </p>
              <h2 className="mt-2 text-xl font-medium text-pos-ink">
                {draft.id ? "Edit branch" : "New branch"}
              </h2>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <Field label="Name">
                <input
                  className={fieldClass}
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  required
                />
              </Field>
              <Field label="Store">
                <select
                  className={fieldClass}
                  value={draft.storeId || stores[0]?.id || ""}
                  onChange={(e) => setDraft({ ...draft, storeId: e.target.value })}
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
              <div className="grid grid-cols-2 gap-3">
                <Field label="City">
                  <input
                    className={fieldClass}
                    value={draft.city}
                    onChange={(e) => setDraft({ ...draft, city: e.target.value })}
                  />
                </Field>
                <Field label="State">
                  <SetupStateSelect
                    country={company?.country || "Nigeria"}
                    value={draft.state}
                    onChange={(state) => setDraft({ ...draft, state })}
                  />
                </Field>
              </div>
              <Field label="Address">
                <input
                  className={fieldClass}
                  value={draft.address}
                  onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                />
              </Field>
              <Field label="Phone">
                <input
                  className={fieldClass}
                  value={draft.phone}
                  onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                />
              </Field>
              <Field label="Manager">
                <input
                  className={fieldClass}
                  value={draft.manager}
                  onChange={(e) => setDraft({ ...draft, manager: e.target.value })}
                />
              </Field>
              <ToggleField
                label="Active"
                checked={draft.active}
                onChange={(active) => setDraft({ ...draft, active })}
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
                      await deleteBranch(draft.id!);
                      setOpen(false);
                      toast.success("Branch deleted.");
                    } catch (err) {
                      toast.error(err, "Could not delete branch");
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
                  if (!draft.name.trim()) {
                    toast.error("Branch name is required.");
                    return;
                  }
                  setBusy(true);
                  try {
                    await saveBranch({
                      ...draft,
                      companyId: draft.companyId || company?.id,
                    });
                    setOpen(false);
                    toast.success("Branch saved.");
                  } catch (err) {
                    toast.error(err, "Could not save branch");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Saving…" : "Save branch"}
              </PrimaryButton>
            </footer>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
