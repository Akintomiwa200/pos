"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getOrgSettings, saveOrgSettings, type HqOrgSettings } from "../../lib/hq-setup";
import { ManagerSkeleton } from "../Skeleton";
import { SlideOver } from "../SlideOver";
import { DataTable, Field, PrimaryButton, SetupHeader, ToggleField, fieldClass } from "./SetupChrome";

export function SettingsManager() {
  const [settings, setSettings] = useState<HqOrgSettings | null>(null);
  const [draft, setDraft] = useState<HqOrgSettings | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getOrgSettings()
      .then(setSettings)
      .catch((err) => toast.error(err instanceof Error ? err.message : "Could not load settings"))
      .finally(() => setReady(true));
  }, []);

  if (!ready) return <ManagerSkeleton variant="list" />;
  if (!settings) {
    return (
      <div>
        <SetupHeader title="Settings" copy="HQ API is not reachable. Start the backend on port 3001." />
      </div>
    );
  }

  return (
    <div>
      <SetupHeader
        title="Settings"
        copy="Receipt, invoice, and till behaviour for the whole company. Tills pick this up on heartbeat."
        action={
          <PrimaryButton
            onClick={() => {
              setDraft(settings);
              setOpen(true);
            }}
          >
            Edit settings
          </PrimaryButton>
        }
      />
      <DataTable columns={["Setting", "Value"]}>
        {[
          ["Timezone", settings.timezone],
          ["Language", settings.language],
          ["Currency", settings.currency],
          ["Invoice prefix", settings.invoicePrefix],
          ["Receipt paper", settings.receiptPaper],
          ["Prices include VAT", settings.pricesIncludeVat ? "Yes" : "No"],
          ["Require open shift", settings.requireOpenShift ? "Yes" : "No"],
          ["Idle lock (min)", String(settings.idleLockMinutes)],
          ["Low stock qty", String(settings.lowStockQty)],
          ["Block negative stock", settings.blockNegativeStock ? "Yes" : "No"],
        ].map(([label, value]) => (
          <tr key={label} className="border-b border-neutral-50">
            <td className="px-4 py-3 text-neutral-500">{label}</td>
            <td className="px-4 py-3 font-medium">{value}</td>
          </tr>
        ))}
      </DataTable>
      <SlideOver
        open={open}
        title="Settings"
        onClose={() => setOpen(false)}
        footer={
          <PrimaryButton
            className="w-full"
            disabled={busy}
            onClick={async () => {
              if (!draft) return;
              setBusy(true);
              try {
                const saved = await saveOrgSettings(draft);
                setSettings(saved);
                setOpen(false);
                toast.success("Settings saved.");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Could not save settings");
              } finally {
                setBusy(false);
              }
            }}
          >
            Save settings
          </PrimaryButton>
        }
      >
        {draft ? (
          <>
            <Field label="Timezone">
              <input className={fieldClass} value={draft.timezone} onChange={(e) => setDraft({ ...draft, timezone: e.target.value })} />
            </Field>
            <Field label="Language">
              <input className={fieldClass} value={draft.language} onChange={(e) => setDraft({ ...draft, language: e.target.value })} />
            </Field>
            <Field label="Currency">
              <input className={fieldClass} value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value })} />
            </Field>
            <Field label="Invoice prefix">
              <input className={fieldClass} value={draft.invoicePrefix} onChange={(e) => setDraft({ ...draft, invoicePrefix: e.target.value })} />
            </Field>
            <Field label="Receipt paper">
              <select
                className={fieldClass}
                value={draft.receiptPaper}
                onChange={(e) => setDraft({ ...draft, receiptPaper: e.target.value as HqOrgSettings["receiptPaper"] })}
              >
                <option value="80mm">80 mm</option>
                <option value="58mm">58 mm</option>
              </select>
            </Field>
            <Field label="Receipt header">
              <input className={fieldClass} value={draft.receiptHeader} onChange={(e) => setDraft({ ...draft, receiptHeader: e.target.value })} />
            </Field>
            <Field label="Receipt footer">
              <input className={fieldClass} value={draft.receiptFooter} onChange={(e) => setDraft({ ...draft, receiptFooter: e.target.value })} />
            </Field>
            <Field label="Idle lock minutes">
              <input
                className={fieldClass}
                type="number"
                min="0"
                value={draft.idleLockMinutes}
                onChange={(e) => setDraft({ ...draft, idleLockMinutes: Number(e.target.value) })}
              />
            </Field>
            <Field label="Low stock quantity">
              <input
                className={fieldClass}
                type="number"
                min="0"
                value={draft.lowStockQty}
                onChange={(e) => setDraft({ ...draft, lowStockQty: Number(e.target.value) })}
              />
            </Field>
            <ToggleField
              label="Prices include VAT"
              checked={draft.pricesIncludeVat}
              onChange={(pricesIncludeVat) => setDraft({ ...draft, pricesIncludeVat })}
            />
            <ToggleField
              label="Require open shift"
              checked={draft.requireOpenShift}
              onChange={(requireOpenShift) => setDraft({ ...draft, requireOpenShift })}
            />
            <ToggleField
              label="Block negative stock"
              checked={draft.blockNegativeStock}
              onChange={(blockNegativeStock) => setDraft({ ...draft, blockNegativeStock })}
            />
          </>
        ) : null}
      </SlideOver>
    </div>
  );
}
