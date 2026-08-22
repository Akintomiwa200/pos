"use client";

import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import {
  deleteGateway,
  listGateways,
  saveGateway,
  type HqGateway,
} from "../../lib/hq-setup";
import { ManagerSkeleton } from "../Skeleton";
import { SlideOver } from "../SlideOver";
import { DataTable, Field, PrimaryButton, SetupHeader, ToggleField, fieldClass } from "./SetupChrome";

const blank: Partial<HqGateway> = {
  name: "",
  provider: "paystack",
  enabled: true,
  isDefault: false,
  publicKey: "",
  accountName: "",
  accountNumber: "",
  bankName: "",
};

export function GatewayManager() {
  const [rows, setRows] = useState<HqGateway[]>([]);
  const [draft, setDraft] = useState(blank);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  async function load() {
    setRows(await listGateways());
    setReady(true);
  }

  useEffect(() => {
    load().catch((err) => {
      toast.error(err, "Could not load gateways");
      setReady(true);
    });
  }, []);

  if (!ready) return <ManagerSkeleton variant="list" />;

  return (
    <div>
      <SetupHeader
        title="Payment gateway"
        copy="Which rails tills can take. Cash and card stay on the register; Paystack and bank details sync to HQ."
        action={
          <PrimaryButton
            onClick={() => {
              setDraft(blank);
              setOpen(true);
            }}
          >
            New gateway
          </PrimaryButton>
        }
      />
      <DataTable columns={["Name", "Provider", "Default", "Status"]}>
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
            <td className="px-4 py-3 capitalize">{row.provider}</td>
            <td className="px-4 py-3">{row.isDefault ? "Yes" : "—"}</td>
            <td className="px-4 py-3">{row.enabled ? "On" : "Off"}</td>
          </tr>
        ))}
      </DataTable>
      <SlideOver
        open={open}
        title={draft.id ? "Edit gateway" : "New gateway"}
        onClose={() => setOpen(false)}
        footer={
          <div className="flex gap-2">
            {draft.id ? (
              <button
                type="button"
                className="rounded-xl border border-pos-border px-4 py-2.5 text-sm text-pos-ink hover:bg-pos-surface-muted"
                onClick={async () => {
                  try {
                    await deleteGateway(draft.id!);
                    await load();
                    setOpen(false);
                    toast.success("Gateway deleted.");
                  } catch (err) {
                    toast.error(err, "Could not delete gateway");
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
                  await saveGateway(draft);
                  await load();
                  setOpen(false);
                  toast.success("Gateway saved.");
                } catch (err) {
                  toast.error(err, "Could not save gateway");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Save gateway
            </PrimaryButton>
          </div>
        }
      >
        <Field label="Name">
          <input className={fieldClass} value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </Field>
        <Field label="Provider">
          <select
            className={fieldClass}
            value={draft.provider ?? "paystack"}
            onChange={(e) => setDraft({ ...draft, provider: e.target.value as HqGateway["provider"] })}
          >
            <option value="paystack">Paystack</option>
            <option value="flutterwave">Flutterwave</option>
            <option value="moniepoint">Moniepoint</option>
            <option value="bank">Bank transfer</option>
            <option value="cash">Cash</option>
            <option value="card">Card / POS</option>
          </select>
        </Field>
        <Field label="Public key">
          <input className={fieldClass} value={draft.publicKey ?? ""} onChange={(e) => setDraft({ ...draft, publicKey: e.target.value })} />
        </Field>
        <Field label="Account name">
          <input className={fieldClass} value={draft.accountName ?? ""} onChange={(e) => setDraft({ ...draft, accountName: e.target.value })} />
        </Field>
        <Field label="Account number">
          <input className={fieldClass} value={draft.accountNumber ?? ""} onChange={(e) => setDraft({ ...draft, accountNumber: e.target.value })} />
        </Field>
        <Field label="Bank">
          <input className={fieldClass} value={draft.bankName ?? ""} onChange={(e) => setDraft({ ...draft, bankName: e.target.value })} />
        </Field>
        <ToggleField label="Enabled" checked={draft.enabled ?? true} onChange={(enabled) => setDraft({ ...draft, enabled })} />
        <ToggleField label="Default" checked={draft.isDefault ?? false} onChange={(isDefault) => setDraft({ ...draft, isDefault })} />
      </SlideOver>
    </div>
  );
}
