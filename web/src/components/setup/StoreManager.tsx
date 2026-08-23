"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  deleteStore,
  listBranches,
  listStores,
  saveStore,
  type HqBranch,
  type HqStore,
} from "@/lib/hq-setup";
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

const blank: Partial<HqStore> = {
  name: "",
  branchId: "",
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
  const [rows, setRows] = useState<HqStore[]>([]);
  const [branches, setBranches] = useState<HqBranch[]>([]);
  const [draft, setDraft] = useState(blank);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState("");

  async function load() {
    const [stores, branchRows] = await Promise.all([listStores(), listBranches()]);
    setRows(stores);
    setBranches(branchRows);
    setReady(true);
  }

  useEffect(() => {
    load().catch((err) => {
      toast.error(err, "Could not load stores");
      setReady(true);
    });
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name));
    if (!query) return sorted;
    return sorted.filter((row) => {
      const branch = branches.find((item) => item.id === row.branchId)?.name ?? "";
      return [row.name, branch, row.kind, row.address ?? ""].some((value) =>
        value.toLowerCase().includes(query),
      );
    });
  }, [rows, branches, search]);

  const activeCount = rows.filter((row) => row.active).length;
  const byKind = useMemo(() => {
    const counts = { retail: 0, warehouse: 0, "dark-kitchen": 0 };
    for (const row of rows) counts[row.kind] += 1;
    return counts;
  }, [rows]);

  if (!ready) return <ManagerSkeleton variant="table" />;

  return (
    <div>
      <SetupHeader
        kicker="Analytics · Point of Sales"
        title="Stores"
        copy="Stock and selling space inside a branch — retail floor, warehouse, or dark kitchen. Tills sell from a store; inventory is counted here."
        action={
          <PrimaryButton
            onClick={() => {
              setDraft({ ...blank, branchId: branches[0]?.id ?? "" });
              setOpen(true);
            }}
          >
            <span className="inline-flex items-center gap-2">
              <Plus size={16} />
              New store
            </span>
          </PrimaryButton>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Stores" value={String(rows.length)} hint={`${activeCount} active`} />
        <SetupStat label="Retail" value={String(byKind.retail)} tone="accent" />
        <SetupStat label="Warehouse" value={String(byKind.warehouse)} />
        <SetupStat label="Dark kitchen" value={String(byKind["dark-kitchen"])} />
      </div>

      <DataTable
        columns={["Name", "Branch", "Type", "Address", "Status"]}
        toolbar={
          <input
            className={`${fieldClass} max-w-sm`}
            placeholder="Search stores, branches, types…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        }
      >
        {filtered.length === 0 ? (
          <tr>
            <td className="px-4 py-6 text-pos-ink-faint" colSpan={5}>
              No stores yet. Add one under a branch.
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
              <td className="px-4 py-3 text-pos-ink-muted">
                {branches.find((item) => item.id === row.branchId)?.name ?? row.branchId}
              </td>
              <td className="px-4 py-3">{KIND_LABEL[row.kind]}</td>
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
                    await load();
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
                if (!draft.branchId) {
                  toast.error("Pick a branch.");
                  return;
                }
                setBusy(true);
                try {
                  await saveStore(draft);
                  await load();
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
        <Field label="Branch">
          <select
            className={fieldClass}
            value={draft.branchId ?? ""}
            onChange={(e) => setDraft({ ...draft, branchId: e.target.value })}
          >
            {!branches.length ? <option value="">No branches yet</option> : null}
            {branches.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
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
