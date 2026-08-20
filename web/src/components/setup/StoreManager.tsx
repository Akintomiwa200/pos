"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  deleteStore,
  listBranches,
  listStores,
  saveStore,
  type HqBranch,
  type HqStore,
} from "../../lib/hq-setup";
import { ManagerSkeleton } from "../Skeleton";
import { SlideOver } from "../SlideOver";
import { DataTable, Field, PrimaryButton, SetupHeader, ToggleField, fieldClass } from "./SetupChrome";

const blank: Partial<HqStore> = {
  name: "",
  branchId: "",
  kind: "retail",
  address: "",
  active: true,
};

export function StoreManager() {
  const [rows, setRows] = useState<HqStore[]>([]);
  const [branches, setBranches] = useState<HqBranch[]>([]);
  const [draft, setDraft] = useState(blank);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  async function load() {
    const [stores, branchRows] = await Promise.all([listStores(), listBranches()]);
    setRows(stores);
    setBranches(branchRows);
    setReady(true);
  }

  useEffect(() => {
    load().catch((err) => {
      toast.error(err instanceof Error ? err.message : "Could not load stores");
      setReady(true);
    });
  }, []);

  if (!ready) return <ManagerSkeleton variant="list" />;

  return (
    <div>
      <SetupHeader
        title="Store"
        copy="A store is stock and selling space inside a branch — retail floor, warehouse, or dark kitchen."
        action={
          <PrimaryButton
            onClick={() => {
              setDraft({ ...blank, branchId: branches[0]?.id ?? "" });
              setOpen(true);
            }}
          >
            New store
          </PrimaryButton>
        }
      />
      <DataTable columns={["Name", "Branch", "Type", "Status"]}>
        {rows.map((row) => (
          <tr
            key={row.id}
            className="cursor-pointer border-b border-neutral-50 hover:bg-[#f6f5f8]"
            onClick={() => {
              setDraft(row);
              setOpen(true);
            }}
          >
            <td className="px-4 py-3 font-medium">{row.name}</td>
            <td className="px-4 py-3">
              {branches.find((item) => item.id === row.branchId)?.name ?? row.branchId}
            </td>
            <td className="px-4 py-3 capitalize">{row.kind.replace("-", " ")}</td>
            <td className="px-4 py-3">{row.active ? "Active" : "Closed"}</td>
          </tr>
        ))}
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
                className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm"
                onClick={async () => {
                  try {
                    await deleteStore(draft.id!);
                    await load();
                    setOpen(false);
                    toast.success("Store deleted.");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Could not delete store");
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
                setBusy(true);
                try {
                  await saveStore(draft);
                  await load();
                  setOpen(false);
                  toast.success("Store saved.");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not save store");
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
          <input className={fieldClass} value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </Field>
        <Field label="Branch">
          <select className={fieldClass} value={draft.branchId ?? ""} onChange={(e) => setDraft({ ...draft, branchId: e.target.value })}>
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
          <input className={fieldClass} value={draft.address ?? ""} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
        </Field>
        <ToggleField label="Active" checked={draft.active ?? true} onChange={(active) => setDraft({ ...draft, active })} />
      </SlideOver>
    </div>
  );
}
