"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, Plus } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  deleteGateway,
  getCompany,
  listGateways,
  saveGateway,
  type HqGateway,
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
import { useOrgLinks } from "@/lib/org-links";

const blank: Partial<HqGateway> = {
  name: "",
  provider: "paystack",
  enabled: true,
  isDefault: false,
  mode: "test",
  publicKey: "",
  secretKey: "",
  webhookSecret: "",
  merchantId: "",
  apiBase: "",
  accountName: "",
  accountNumber: "",
  bankName: "",
};

const electronicProviders = new Set<HqGateway["provider"]>([
  "paystack",
  "flutterwave",
  "moniepoint",
  "opay",
]);

export function GatewayManager() {
  const links = useOrgLinks();
  const [rows, setRows] = useState<HqGateway[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [draft, setDraft] = useState(blank);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    const [gateways, company] = await Promise.all([
      listGateways(),
      getCompany().catch(() => null),
    ]);
    setRows(gateways);
    setCompanyName(company?.name || "");
  }, []);

  useEffect(() => {
    load()
      .catch((err) => toast.error(err, "Could not load gateways"))
      .finally(() => setReady(true));
  }, [load]);

  useOrgLive(load);

  if (!ready) return <ManagerSkeleton variant="table" />;

  const onCount = rows.filter((row) => row.enabled).length;
  const defaultRow = rows.find((row) => row.isDefault);
  const electronic = electronicProviders.has(draft.provider ?? "paystack");

  return (
    <div>
      <SetupHeader
        kicker={links.area === "producer" ? "Producer · Payments" : "Setup · Organization"}
        title="Payment gateways"
        copy="Rails tills can offer. Cash and card stay on the register; online rails require provider confirmation before a sale completes."
        action={
          <PrimaryButton
            onClick={() => {
              setDraft(blank);
              setOpen(true);
            }}
          >
            <Plus size={16} />
            New gateway
          </PrimaryButton>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <SetupStat label="Gateways" value={String(rows.length)} hint={`${onCount} enabled`} />
        <SetupStat label="Default" value={defaultRow?.name || "—"} tone="accent" />
        <SetupStat
          label="Company"
          value={companyName || "—"}
          hint="Settlement entity"
        />
      </div>

      <p className="mb-3 text-sm text-pos-ink-muted">
        Settlement for{" "}
        <Link href={links.company} className="font-medium text-pos-primary hover:underline">
          {companyName || "company"}
        </Link>
        . Tax rates live under{" "}
        <Link href={links.tax} className="font-medium text-pos-primary hover:underline">
          Tax
        </Link>
        .
      </p>

      <DataTable columns={["Name", "Provider", "Default", "Status"]}>
        {rows.length === 0 ? (
          <tr>
            <td className="px-4 py-8 text-center text-pos-ink-faint" colSpan={4}>
              No gateways yet. Add Opay, Paystack, Flutterwave, Moniepoint, bank transfer, or till cash/card rails.
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
                  <CreditCard size={14} className="text-pos-ink-faint" />
                  {row.name}
                </span>
              </td>
              <td className="px-4 py-3 capitalize text-pos-ink-muted">
                {row.provider}
                {electronicProviders.has(row.provider) ? ` · ${row.mode ?? "test"}` : ""}
              </td>
              <td className="px-4 py-3">{row.isDefault ? "Yes" : "—"}</td>
              <td className="px-4 py-3">{row.enabled ? "On" : "Off"}</td>
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
                Organization · Gateways
              </p>
              <h2 className="mt-2 text-xl font-medium text-pos-ink">
                {draft.id ? "Edit gateway" : "New gateway"}
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
              <Field label="Provider">
                <select
                  className={fieldClass}
                  value={draft.provider ?? "paystack"}
                  onChange={(e) =>
                    setDraft({ ...draft, provider: e.target.value as HqGateway["provider"] })
                  }
                >
                  <option value="paystack">Paystack</option>
                  <option value="flutterwave">Flutterwave</option>
                  <option value="moniepoint">Moniepoint (Monnify)</option>
                  <option value="opay">Opay</option>
                  <option value="bank">Bank transfer</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card / POS</option>
                </select>
              </Field>
              {electronic ? (
                <>
                  <Field
                    label="Mode"
                    hint="Test and live credentials are separate. Live is used only when explicitly selected."
                  >
                    <select
                      className={fieldClass}
                      value={draft.mode ?? "test"}
                      onChange={(e) => setDraft({ ...draft, mode: e.target.value as "test" | "live" })}
                    >
                      <option value="test">Test / sandbox</option>
                      <option value="live">Live</option>
                    </select>
                  </Field>
                  <Field
                    label="Public key"
                    hint="Paystack and Opay send this in requests. Masked on save; leave unchanged to keep it."
                  >
                    <input
                      className={fieldClass}
                      value={draft.publicKey ?? ""}
                      onChange={(e) => setDraft({ ...draft, publicKey: e.target.value })}
                    />
                  </Field>
                  <Field label="Secret key" hint="Server-only. Never shown to tills or customers.">
                    <input
                      type="password"
                      autoComplete="off"
                      className={fieldClass}
                      value={draft.secretKey ?? ""}
                      onChange={(e) => setDraft({ ...draft, secretKey: e.target.value })}
                    />
                  </Field>
                  <Field label="Webhook secret" hint="Used to verify provider callback signatures.">
                    <input
                      type="password"
                      autoComplete="off"
                      className={fieldClass}
                      value={draft.webhookSecret ?? ""}
                      onChange={(e) => setDraft({ ...draft, webhookSecret: e.target.value })}
                    />
                  </Field>
                  <Field label="Merchant ID" hint="Required by Moniepoint/Monnify and Opay.">
                    <input
                      className={fieldClass}
                      value={draft.merchantId ?? ""}
                      onChange={(e) => setDraft({ ...draft, merchantId: e.target.value })}
                    />
                  </Field>
                  <Field label="API base URL" hint="Optional override for sandbox or a dedicated provider host.">
                    <input
                      className={fieldClass}
                      placeholder="https://api.paystack.co"
                      value={draft.apiBase ?? ""}
                      onChange={(e) => setDraft({ ...draft, apiBase: e.target.value })}
                    />
                  </Field>
                </>
              ) : null}
              <Field label="Account name">
                <input
                  className={fieldClass}
                  value={draft.accountName ?? ""}
                  onChange={(e) => setDraft({ ...draft, accountName: e.target.value })}
                />
              </Field>
              <Field label="Account number">
                <input
                  className={fieldClass}
                  value={draft.accountNumber ?? ""}
                  onChange={(e) => setDraft({ ...draft, accountNumber: e.target.value })}
                />
              </Field>
              <Field label="Bank">
                <input
                  className={fieldClass}
                  value={draft.bankName ?? ""}
                  onChange={(e) => setDraft({ ...draft, bankName: e.target.value })}
                />
              </Field>
              <ToggleField
                label="Enabled"
                checked={draft.enabled ?? true}
                onChange={(enabled) => setDraft({ ...draft, enabled })}
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
                      await deleteGateway(draft.id!);
                      await load();
                      setOpen(false);
                      toast.success("Gateway deleted.");
                    } catch (err) {
                      toast.error(err, "Could not delete gateway");
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
                    toast.error("Gateway name is required.");
                    return;
                  }
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
                {busy ? "Saving…" : "Save gateway"}
              </PrimaryButton>
            </footer>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
