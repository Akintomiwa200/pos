"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  deleteBranch,
  listBranches,
  saveBranch,
  type HqBranch,
} from "../../lib/hq-setup";
import { ManagerSkeleton } from "../Skeleton";
import { SlideOver } from "../SlideOver";
import { DataTable, Field, PrimaryButton, SetupHeader, ToggleField, fieldClass } from "./SetupChrome";

const blank: Omit<HqBranch, "id" | "companyId"> & { id?: string; companyId?: string } = {
  name: "",
  city: "",
  state: "Lagos",
  address: "",
  phone: "",
  manager: "",
  active: true,
};

export function BranchManager() {
  const [rows, setRows] = useState<HqBranch[]>([]);
  const [draft, setDraft] = useState(blank);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  async function load() {
    setRows(await listBranches());
    setReady(true);
  }

  useEffect(() => {
    load().catch((err) => {
      toast.error(err instanceof Error ? err.message : "Could not load branches");
      setReady(true);
    });
  }, []);

  if (!ready) return <ManagerSkeleton variant="list" />;

  return (
    <div>
      <SetupHeader
        title="Branch"
        copy="Physical locations. Tills pick a branch when they are issued. Stores sit under a branch."
        action={
          <PrimaryButton
            onClick={() => {
              setDraft(blank);
              setOpen(true);
            }}
          >
            New branch
          </PrimaryButton>
        }
      />
      <DataTable columns={["Name", "City", "Phone", "Manager", "Status"]}>
        {rows.length === 0 ? (
          <tr>
            <td className="px-4 py-6 text-neutral-400" colSpan={5}>
              No branches yet.
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr
              key={row.id}
              className="cursor-pointer border-b border-neutral-50 hover:bg-[#f6f5f8]"
              onClick={() => {
                setDraft(row);
                setOpen(true);
              }}
            >
              <td className="px-4 py-3 font-medium">{row.name}</td>
              <td className="px-4 py-3">{row.city}</td>
              <td className="px-4 py-3">{row.phone || "—"}</td>
              <td className="px-4 py-3">{row.manager || "—"}</td>
              <td className="px-4 py-3">{row.active ? "Active" : "Closed"}</td>
            </tr>
          ))
        )}
      </DataTable>
      <SlideOver
        open={open}
        title={draft.id ? "Edit branch" : "New branch"}
        onClose={() => setOpen(false)}
        footer={
          <div className="flex gap-2">
            {draft.id ? (
              <button
                type="button"
                className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm"
                onClick={async () => {
                  try {
                    await deleteBranch(draft.id!);
                    await load();
                    setOpen(false);
                    toast.success("Branch deleted.");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Could not delete branch");
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
                  await saveBranch(draft);
                  await load();
                  setOpen(false);
                  toast.success("Branch saved.");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not save branch");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Save branch
            </PrimaryButton>
          </div>
        }
      >
        <Field label="Name">
          <input className={fieldClass} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </Field>
        <Field label="City">
          <input className={fieldClass} value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
        </Field>
        <Field label="State">
          <input className={fieldClass} value={draft.state} onChange={(e) => setDraft({ ...draft, state: e.target.value })} />
        </Field>
        <Field label="Address">
          <input className={fieldClass} value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
        </Field>
        <Field label="Phone">
          <input className={fieldClass} value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
        </Field>
        <Field label="Manager">
          <input className={fieldClass} value={draft.manager} onChange={(e) => setDraft({ ...draft, manager: e.target.value })} />
        </Field>
        <ToggleField label="Active" checked={draft.active} onChange={(active) => setDraft({ ...draft, active })} />
      </SlideOver>
    </div>
  );
}
