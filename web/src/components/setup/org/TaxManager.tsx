"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Percent, Plus } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  deleteTax,
  getCompany,
  listTaxes,
  saveTax,
  type HqTax,
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
  const [companyName, setCompanyName] = useState("");
  const [draft, setDraft] = useState(blank);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    const [taxes, company] = await Promise.all([
      listTaxes(),
      getCompany().catch(() => null),
    ]);
    setRows(taxes);
    setCompanyName(company?.name || "");
  }, []);

  useEffect(() => {
    load()
      .catch((err) => toast.error(err, "Could not load tax"))
      .finally(() => setReady(true));
  }, [load]);

  useOrgLive(load);

  if (!ready) return <ManagerSkeleton variant="table" />;

  const activeCount = rows.filter((row) => row.active).length;
  const defaultRow = rows.find((row) => row.isDefault);

  return (
    <div>
      <SetupHeader
        kicker="Setup · Organization"
        title="Tax"
        copy="VAT and service charge used on tickets. The default rate is what tills apply first."
        action={
          <PrimaryButton
            onClick={() => {
              setDraft(blank);
              setOpen(true);
            }}
          >
            <Plus size={16} />
            New tax
          </PrimaryButton>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <SetupStat label="Rates" value={String(rows.length)} hint={`${activeCount} active`} />
        <SetupStat
          label="Default"
          value={defaultRow ? `${defaultRow.ratePercent}%` : "—"}
          tone="accent"
          hint={defaultRow?.name}
        />
        <SetupStat label="Company" value={companyName || "—"} hint="Trading entity" />
      </div>

      <p className="mb-3 text-sm text-pos-ink-muted">
        Applied for{" "}
        <Link href="/setup/others/company" className="font-medium text-pos-primary hover:underline">
          {companyName || "company"}
        </Link>
        . Checkout rails are under{" "}
        <Link href="/setup/others/payment-gateway" className="font-medium text-pos-primary hover:underline">
          Payment gateways
        </Link>
        .
      </p>

      <DataTable columns={["Name", "Rate", "Inclusive", "Default", "Status"]}>
        {rows.length === 0 ? (
          <tr>
            <td className="px-4 py-8 text-center text-pos-ink-faint" colSpan={5}>
              No tax rates yet. Add VAT or service charge for tickets.
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
                  <Percent size={14} className="text-pos-ink-faint" />
                  {row.name}
                </span>
              </td>
              <td className="px-4 py-3 tabular-nums text-pos-ink-muted">{row.ratePercent}%</td>
              <td className="px-4 py-3">{row.inclusive ? "Yes" : "No"}</td>
              <td className="px-4 py-3">{row.isDefault ? "Yes" : "—"}</td>
              <td className="px-4 py-3">{row.active ? "On" : "Off"}</td>
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
                Organization · Tax
              </p>
              <h2 className="mt-2 text-xl font-medium text-pos-ink">
                {draft.id ? "Edit tax" : "New tax"}
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
              <ToggleField
                label="Prices include this tax"
                checked={draft.inclusive ?? false}
                onChange={(inclusive) => setDraft({ ...draft, inclusive })}
              />
              <ToggleField
                label="Compound"
                checked={draft.compound ?? false}
                onChange={(compound) => setDraft({ ...draft, compound })}
              />
              <ToggleField
                label="Active"
                checked={draft.active ?? true}
                onChange={(active) => setDraft({ ...draft, active })}
              />
              <ToggleField
                label="Default"
                checked={draft.isDefault ?? false}
                onChange={(isDefault) => setDraft({ ...draft, isDefault })}
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
                      await deleteTax(draft.id!);
                      await load();
                      setOpen(false);
                      toast.success("Tax deleted.");
                    } catch (err) {
                      toast.error(err, "Could not delete tax");
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
                    toast.error("Tax name is required.");
                    return;
                  }
                  if (Number.isNaN(Number(draft.ratePercent)) || Number(draft.ratePercent) < 0) {
                    toast.error("Enter a valid rate.");
                    return;
                  }
                  setBusy(true);
                  try {
                    await saveTax({ ...draft, ratePercent: Number(draft.ratePercent) });
                    await load();
                    setOpen(false);
                    toast.success("Tax saved.");
                  } catch (err) {
                    toast.error(err, "Could not save tax");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Saving…" : "Save tax"}
              </PrimaryButton>
            </footer>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
