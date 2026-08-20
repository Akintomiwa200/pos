"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  deleteStorefront,
  listStorefronts,
  listStores,
  saveStorefront,
  type HqStore,
  type HqStorefront,
} from "../../lib/hq-setup";
import { ManagerSkeleton } from "../Skeleton";
import { SlideOver } from "../SlideOver";
import { DataTable, Field, PrimaryButton, SetupHeader, ToggleField, fieldClass } from "./SetupChrome";

const blank: Partial<HqStorefront> = {
  name: "",
  storeId: "",
  url: "",
  hours: "08:00 – 22:00",
  enabled: false,
  syncPrices: true,
  syncStock: true,
};

export function StorefrontManager() {
  const [rows, setRows] = useState<HqStorefront[]>([]);
  const [stores, setStores] = useState<HqStore[]>([]);
  const [draft, setDraft] = useState(blank);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  async function load() {
    const [fronts, storeRows] = await Promise.all([listStorefronts(), listStores()]);
    setRows(fronts);
    setStores(storeRows);
    setReady(true);
  }

  useEffect(() => {
    load().catch((err) => {
      toast.error(err instanceof Error ? err.message : "Could not load storefronts");
      setReady(true);
    });
  }, []);

  if (!ready) return <ManagerSkeleton variant="list" />;

  return (
    <div>
      <SetupHeader
        title="Storefront"
        copy="Online shop for a store. Price and stock can follow the live till catalog."
        action={
          <PrimaryButton
            onClick={() => {
              setDraft({ ...blank, storeId: stores[0]?.id ?? "" });
              setOpen(true);
            }}
          >
            New storefront
          </PrimaryButton>
        }
      />
      <DataTable columns={["Name", "Store", "URL", "Hours", "Live"]}>
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
            <td className="px-4 py-3">{stores.find((item) => item.id === row.storeId)?.name ?? row.storeId}</td>
            <td className="px-4 py-3 truncate">{row.url || "—"}</td>
            <td className="px-4 py-3">{row.hours || "—"}</td>
            <td className="px-4 py-3">{row.enabled ? "On" : "Off"}</td>
          </tr>
        ))}
      </DataTable>
      <SlideOver
        open={open}
        title={draft.id ? "Edit storefront" : "New storefront"}
        onClose={() => setOpen(false)}
        footer={
          <div className="flex gap-2">
            {draft.id ? (
              <button
                type="button"
                className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm"
                onClick={async () => {
                  try {
                    await deleteStorefront(draft.id!);
                    await load();
                    setOpen(false);
                    toast.success("Storefront deleted.");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Could not delete storefront");
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
                  await saveStorefront(draft);
                  await load();
                  setOpen(false);
                  toast.success("Storefront saved.");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not save storefront");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Save storefront
            </PrimaryButton>
          </div>
        }
      >
        <Field label="Name">
          <input className={fieldClass} value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </Field>
        <Field label="Store">
          <select className={fieldClass} value={draft.storeId ?? ""} onChange={(e) => setDraft({ ...draft, storeId: e.target.value })}>
            {stores.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="URL">
          <input className={fieldClass} value={draft.url ?? ""} onChange={(e) => setDraft({ ...draft, url: e.target.value })} />
        </Field>
        <Field label="Hours">
          <input className={fieldClass} value={draft.hours ?? ""} onChange={(e) => setDraft({ ...draft, hours: e.target.value })} />
        </Field>
        <ToggleField label="Enabled" checked={draft.enabled ?? false} onChange={(enabled) => setDraft({ ...draft, enabled })} />
        <ToggleField label="Sync prices" checked={draft.syncPrices ?? true} onChange={(syncPrices) => setDraft({ ...draft, syncPrices })} />
        <ToggleField label="Sync stock" checked={draft.syncStock ?? true} onChange={(syncStock) => setDraft({ ...draft, syncStock })} />
      </SlideOver>
    </div>
  );
}
