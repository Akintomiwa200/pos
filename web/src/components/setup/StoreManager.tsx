"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Wifi, WifiOff } from "lucide-react";
import { toast } from "@/lib/toast";
import { deleteStore, saveStore, type HqStore } from "@/lib/hq-setup";
import { useLivePos } from "@/lib/live-pos";
import { ManagerSkeleton } from "../Skeleton";
import { SlideOver } from "../SlideOver";
import {
  DataTable,
  Field,
  PrimaryButton,
  SetupHeader,
  SetupStat,
  ToggleField,
  fieldClass,
  secondaryButtonClass,
} from "./SetupChrome";
import { useOrgLinks } from "@/lib/org-links";

const blank: Partial<HqStore> = {
  name: "",
  kind: "retail",
  address: "",
  active: true,
};

const KIND_LABEL: Record<HqStore["kind"], string> = {
  retail: "Retail",
  warehouse: "Warehouse",
  "dark-kitchen": "Dark kitchen",
};

export function StoreManager() {
  const links = useOrgLinks();
  const { company, stores: rows, branches, tills, live, ready } = useLivePos();
  const [draft, setDraft] = useState(blank);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");

  const tillsByStore = useMemo(() => {
    const map = new Map<string, number>();
    for (const till of tills) {
      if (!till.storeId) continue;
      map.set(till.storeId, (map.get(till.storeId) ?? 0) + 1);
    }
    return map;
  }, [tills]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name));
    if (!query) return sorted;
    return sorted.filter((row) =>
      [row.name, row.kind, row.address ?? "", company?.name ?? ""].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [rows, search, company?.name]);

  const activeCount = rows.filter((row) => row.active).length;

  if (!ready) return <ManagerSkeleton variant="table" />;

  const orgName = company?.name || "your company";

  return (
    <div>
      <SetupHeader
        kicker={links.area === "producer" ? "Producer · Companies" : "Analytics · Point of Sales"}
        title="Stores"
        copy={`${orgName} → store → tills. A store covers every branch. Issue each till to one branch — it cannot be used at another.`}
        action={
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-xl border border-pos-border px-3 py-2.5 text-[12px] font-medium ${
                live
                  ? "bg-pos-success/10 text-pos-success"
                  : "bg-pos-surface-muted text-pos-ink-faint"
              }`}
              title={live ? "Company, stores and tills are live" : "Live sync offline"}
            >
              {live ? <Wifi size={13} /> : <WifiOff size={13} />}
              {live ? "Live" : "Offline"}
            </span>
            <PrimaryButton
              onClick={() => {
                setDraft({ ...blank });
                setOpen(true);
              }}
            >
              <span className="inline-flex items-center gap-2">
                <Plus size={16} />
                New store
              </span>
            </PrimaryButton>
          </div>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Company" value={orgName} hint="Trading entity" />
        <SetupStat label="Stores" value={String(rows.length)} hint={`${activeCount} active`} />
        <SetupStat label="Branches" value={String(branches.length)} hint="All locations" tone="accent" />
        <SetupStat label="Tills" value={String(tills.length)} hint="Assigned per branch" />
      </div>

      <p className="mb-3 text-sm text-pos-ink-muted">
        Add{" "}
        <Link href={links.branch} className="font-medium text-pos-primary hover:underline">
          branches
        </Link>{" "}
        as locations of this store, then{" "}
        <Link href={links.till} className="font-medium text-pos-primary hover:underline">
          issue tills
        </Link>{" "}
        to one branch each.
      </p>

      <DataTable
        columns={["Name", "Type", "Branches", "Tills", "Address", "Status"]}
        toolbar={
          <input
            className={`${fieldClass} max-w-sm`}
            placeholder="Search stores…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        }
      >
        {filtered.length === 0 ? (
          <tr>
            <td className="px-4 py-6 text-pos-ink-faint" colSpan={6}>
              No stores yet. Create the company store, then add branches and tills.
            </td>
          </tr>
        ) : (
          filtered.map((row) => (
            <tr
              key={row.id}
              className="cursor-pointer border-b border-pos-border/60 hover:bg-pos-surface-muted"
              onClick={() => {
                setDraft(row);
                setOpen(true);
              }}
            >
              <td className="px-4 py-3 font-medium">{row.name}</td>
              <td className="px-4 py-3">{KIND_LABEL[row.kind]}</td>
              <td className="px-4 py-3 tabular-nums text-pos-ink-muted">{branches.length}</td>
              <td className="px-4 py-3 tabular-nums text-pos-ink-muted">
                {tillsByStore.get(row.id) ?? 0}
              </td>
              <td className="max-w-[220px] truncate px-4 py-3 text-pos-ink-muted">
                {row.address || "—"}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                    row.active
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-pos-surface-muted text-pos-ink-muted"
                  }`}
                >
                  {row.active ? "Active" : "Closed"}
                </span>
              </td>
            </tr>
          ))
        )}
      </DataTable>

      <SlideOver
        open={open}
        title={draft.id ? "Edit store" : "New store"}
        subtitle="This store represents every branch of the company."
        onClose={() => setOpen(false)}
        footer={
          <div className="flex gap-2">
            {draft.id ? (
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={async () => {
                  try {
                    await deleteStore(draft.id!);
                    setOpen(false);
                    toast.success("Store deleted.");
                  } catch (err) {
                    toast.error(err, "Could not delete store");
                  }
                }}
              >
                Delete
              </button>
            ) : null}
            <PrimaryButton
              className="flex-1"
              disabled={busy}
              onClick={async () => {
                if (!draft.name?.trim()) {
                  toast.error("Enter a store name.");
                  return;
                }
                setBusy(true);
                try {
                  await saveStore({ ...draft, companyId: company?.id });
                  setOpen(false);
                  toast.success("Store saved.");
                } catch (err) {
                  toast.error(err, "Could not save store");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Save store
            </PrimaryButton>
          </div>
        }
      >
        <Field label="Name">
          <input
            className={fieldClass}
            value={draft.name ?? ""}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </Field>
        <Field label="Type">
          <select
            className={fieldClass}
            value={draft.kind ?? "retail"}
            onChange={(e) => setDraft({ ...draft, kind: e.target.value as HqStore["kind"] })}
          >
            <option value="retail">Retail</option>
            <option value="warehouse">Warehouse</option>
            <option value="dark-kitchen">Dark kitchen</option>
          </select>
        </Field>
        <Field label="Address">
          <input
            className={fieldClass}
            value={draft.address ?? ""}
            onChange={(e) => setDraft({ ...draft, address: e.target.value })}
          />
        </Field>
        <ToggleField
          label="Active"
          checked={draft.active ?? true}
          onChange={(active) => setDraft({ ...draft, active })}
        />
      </SlideOver>
    </div>
  );
}
