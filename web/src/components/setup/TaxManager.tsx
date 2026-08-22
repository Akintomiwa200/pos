"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { deleteTax, listTaxes, saveTax, type HqTax } from "../../lib/hq-setup";
import { ManagerSkeleton } from "../Skeleton";
import { SlideOver } from "../SlideOver";
import { DataTable, Field, PrimaryButton, SetupHeader, ToggleField, fieldClass } from "./SetupChrome";

const blank: Partial<HqTax> = {
  name: "",
  ratePercent: 7.5,
  inclusive: false,
  compound: false,
  active: true,
  isDefault: false,
};

export function TaxManager() {
  const [rows, setRows] = useState<HqTax[]>([]);
  const [draft, setDraft] = useState(blank);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  async function load() {
    setRows(await listTaxes());
    setReady(true);
  }

  useEffect(() => {
    load().catch((err) => {
      toast.error(err instanceof Error ? err.message : "Could not load tax");
      setReady(true);
    });
  }, []);

  if (!ready) return <ManagerSkeleton variant="list" />;

  return (
    <div>
      <SetupHeader
        title="Tax"
        copy="VAT and service charge used on tickets. The default rate is what tills apply first."
        action={
          <PrimaryButton
            onClick={() => {
              setDraft(blank);
              setOpen(true);
            }}
          >
            New tax
          </PrimaryButton>
        }
      />
      <DataTable columns={["Name", "Rate", "Inclusive", "Default", "Status"]}>
        {rows.map((row) => (
          <tr
            key={row.id}
            className="cursor-pointer border-b border-pos-border/60 hover:bg-pos-surface-muted"
            onClick={() => {
              setDraft(row);
              setOpen(true);
            }}
          >
            <td className="px-4 py-3 font-medium">{row.name}</td>
            <td className="px-4 py-3 tabular-nums">{row.ratePercent}%</td>
            <td className="px-4 py-3">{row.inclusive ? "Yes" : "No"}</td>
            <td className="px-4 py-3">{row.isDefault ? "Yes" : "—"}</td>
            <td className="px-4 py-3">{row.active ? "On" : "Off"}</td>
          </tr>
        ))}
      </DataTable>
      <SlideOver
        open={open}
        title={draft.id ? "Edit tax" : "New tax"}
        onClose={() => setOpen(false)}
        footer={
          <div className="flex gap-2">
            {draft.id ? (
              <button
                type="button"
                className="rounded-xl border border-pos-border px-4 py-2.5 text-sm text-pos-ink hover:bg-pos-surface-muted"
                onClick={async () => {
                  try {
                    await deleteTax(draft.id!);
                    await load();
                    setOpen(false);
                    toast.success("Tax deleted.");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Could not delete tax");
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
                  await saveTax({ ...draft, ratePercent: Number(draft.ratePercent) });
                  await load();
                  setOpen(false);
                  toast.success("Tax saved.");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not save tax");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Save tax
            </PrimaryButton>
          </div>
        }
      >
        <Field label="Name">
          <input className={fieldClass} value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </Field>
        <Field label="Rate %">
          <input
            className={fieldClass}
            type="number"
            step="0.1"
            min="0"
            value={draft.ratePercent ?? 0}
            onChange={(e) => setDraft({ ...draft, ratePercent: Number(e.target.value) })}
          />
        </Field>
        <ToggleField label="Prices include this tax" checked={draft.inclusive ?? false} onChange={(inclusive) => setDraft({ ...draft, inclusive })} />
        <ToggleField label="Compound" checked={draft.compound ?? false} onChange={(compound) => setDraft({ ...draft, compound })} />
        <ToggleField label="Active" checked={draft.active ?? true} onChange={(active) => setDraft({ ...draft, active })} />
        <ToggleField label="Default" checked={draft.isDefault ?? false} onChange={(isDefault) => setDraft({ ...draft, isDefault })} />
      </SlideOver>
    </div>
  );
}
