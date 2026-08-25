"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Percent,
  CreditCard,
  Store,
} from "lucide-react";
import { toast } from "@/lib/toast";
import {
  getCompany,
  getSetupData,
  listBranches,
  saveCompany,
  type HqCompany,
} from "@/lib/hq-setup";
import { ManagerSkeleton } from "@/components/Skeleton";
import {
  Field,
  PrimaryButton,
  SetupHeader,
  SetupStat,
  fieldClass,
  secondaryButtonClass,
} from "@/components/setup/SetupChrome";
import { useOrgLive } from "./useOrgLive";

function requiredCompany(draft: Partial<HqCompany>) {
  if (!draft.name?.trim()) return "Trading name is required";
  if (!draft.legalName?.trim()) return "Legal name is required";
  if (draft.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) {
    return "Enter a valid email";
  }
  return null;
}

export function CompanyManager() {
  const [company, setCompany] = useState<HqCompany | null>(null);
  const [draft, setDraft] = useState<HqCompany | null>(null);
  const [stats, setStats] = useState<{
    branches: number;
    stores: number;
    storefronts: number;
    gateways: number;
    taxes: number;
  } | null>(null);
  const [branchPreview, setBranchPreview] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    const [next, data, branches] = await Promise.all([
      getCompany(),
      getSetupData().catch(() => null),
      listBranches().catch(() => []),
    ]);
    setCompany(next);
    if (data) {
      setStats({
        branches: data.branches,
        stores: data.stores,
        storefronts: data.storefronts,
        gateways: data.gateways,
        taxes: data.taxes,
      });
    }
    setBranchPreview(branches.filter((b) => b.active).slice(0, 4).map((b) => b.name));
  }, []);

  useEffect(() => {
    load()
      .catch((err) => toast.error(err, "Could not load company"))
      .finally(() => setReady(true));
  }, [load]);

  useOrgLive(load);

  if (!ready) return <ManagerSkeleton variant="list" />;

  if (!company) {
    return (
      <div>
        <SetupHeader
          kicker="Setup · Organization"
          title="Company"
          copy="HQ API is not reachable. Start the backend, then refresh."
        />
      </div>
    );
  }

  return (
    <div>
      <SetupHeader
        kicker="Setup · Organization"
        title="Company"
        copy="Legal identity on receipts and filings. Branches, storefronts, gateways, and tax hang off this profile."
        action={
          <PrimaryButton
            onClick={() => {
              setDraft(company);
              setOpen(true);
            }}
          >
            <Pencil size={15} />
            Edit company
          </PrimaryButton>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SetupStat
          label="Branches"
          value={String(stats?.branches ?? "—")}
          hint="Locations"
        />
        <SetupStat
          label="Stores"
          value={String(stats?.stores ?? "—")}
          hint="Under branches"
        />
        <SetupStat
          label="Storefronts"
          value={String(stats?.storefronts ?? "—")}
          hint="Online shops"
        />
        <SetupStat
          label="Gateways"
          value={String(stats?.gateways ?? "—")}
          hint="Payment rails"
        />
        <SetupStat
          label="Tax rates"
          value={String(stats?.taxes ?? "—")}
          hint="VAT & service"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="overflow-hidden rounded-[24px] bg-pos-surface shadow-pos-md">
          <div className="flex items-start gap-4 border-b border-pos-border/70 px-5 py-5">
            <span className="grid size-12 place-items-center rounded-full bg-pos-primary text-white shadow-pos-primary">
              <Building2 size={20} />
            </span>
            <div className="min-w-0">
              <h2 className="text-[20px] font-semibold tracking-tight text-pos-ink">
                {company.name || "Untitled company"}
              </h2>
              <p className="mt-1 text-sm text-pos-ink-muted">
                {company.legalName || "Legal name not set"}
              </p>
              <p className="mt-2 text-[12px] text-pos-ink-faint">
                {company.currency || "NGN"} · {company.country || "Nigeria"}
              </p>
            </div>
          </div>
          <dl className="divide-y divide-pos-border/50">
            {[
              ["RC number", company.rc],
              ["TIN", company.tin],
              ["Email", company.email],
              ["Phone", company.phone],
              ["Address", company.address],
              ["State", company.state],
            ].map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-4 px-5 py-3.5">
                <dt className="text-sm text-pos-ink-faint">{label}</dt>
                <dd className="max-w-[60%] text-right text-sm font-medium text-pos-ink">
                  {value || "—"}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="space-y-4">
          <section className="rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-pos-ink-faint">
              Contact
            </h3>
            <ul className="mt-3 space-y-3 text-sm text-pos-ink">
              <li className="flex items-center gap-3">
                <Mail size={15} className="text-pos-ink-faint" />
                {company.email ? (
                  <a href={`mailto:${company.email}`} className="hover:text-pos-primary">
                    {company.email}
                  </a>
                ) : (
                  <span className="text-pos-ink-faint">No email</span>
                )}
              </li>
              <li className="flex items-center gap-3">
                <Phone size={15} className="text-pos-ink-faint" />
                {company.phone || <span className="text-pos-ink-faint">No phone</span>}
              </li>
              <li className="flex items-start gap-3">
                <MapPin size={15} className="mt-0.5 text-pos-ink-faint" />
                <span>
                  {[company.address, company.state, company.country].filter(Boolean).join(", ") ||
                    "No address"}
                </span>
              </li>
            </ul>
          </section>

          <section className="rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-pos-ink-faint">
                Active branches
              </h3>
              <Link
                href="/setup/others/branch"
                className="text-[12px] font-medium text-pos-primary hover:underline"
              >
                Manage
              </Link>
            </div>
            {branchPreview.length === 0 ? (
              <p className="text-sm text-pos-ink-faint">
                No branches yet.{" "}
                <Link href="/setup/others/branch" className="text-pos-primary hover:underline">
                  Add a branch
                </Link>
              </p>
            ) : (
              <ul className="space-y-2">
                {branchPreview.map((name) => (
                  <li
                    key={name}
                    className="rounded-2xl bg-pos-surface-muted/70 px-3 py-2.5 text-sm font-medium text-pos-ink"
                  >
                    {name}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/setup/others/storefront" className={secondaryButtonClass}>
                <Store size={14} />
                Storefronts
              </Link>
              <Link href="/setup/others/payment-gateway" className={secondaryButtonClass}>
                <CreditCard size={14} />
                Gateways
              </Link>
              <Link href="/setup/others/tax" className={secondaryButtonClass}>
                <Percent size={14} />
                Tax
              </Link>
            </div>
          </section>
        </div>
      </div>

      {open && draft ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-pos-ink/45 backdrop-blur-[2px]"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 right-0 flex h-full w-full max-w-xl flex-col bg-pos-bg shadow-pos-md">
            <header className="border-b border-pos-border bg-pos-surface px-6 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pos-ink-faint">
                Organization
              </p>
              <h2 className="mt-2 text-xl font-medium text-pos-ink-faint">Edit company</h2>
              <p className="mt-1 text-sm text-pos-ink-muted">
                Saved live to HQ. Tills pick this up on the next sync.
              </p>
            </header>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-5 py-4">
              <Field label="Trading name">
                <input
                  className={fieldClass}
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  required
                />
              </Field>
              <Field label="Legal name">
                <input
                  className={fieldClass}
                  value={draft.legalName}
                  onChange={(e) => setDraft({ ...draft, legalName: e.target.value })}
                  required
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="RC number">
                  <input
                    className={fieldClass}
                    value={draft.rc}
                    onChange={(e) => setDraft({ ...draft, rc: e.target.value })}
                  />
                </Field>
                <Field label="TIN">
                  <input
                    className={fieldClass}
                    value={draft.tin}
                    onChange={(e) => setDraft({ ...draft, tin: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Email">
                <input
                  className={fieldClass}
                  type="email"
                  value={draft.email}
                  onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                />
              </Field>
              <Field label="Phone">
                <input
                  className={fieldClass}
                  value={draft.phone}
                  onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                />
              </Field>
              <Field label="Address">
                <input
                  className={fieldClass}
                  value={draft.address}
                  onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="State">
                  <input
                    className={fieldClass}
                    value={draft.state}
                    onChange={(e) => setDraft({ ...draft, state: e.target.value })}
                  />
                </Field>
                <Field label="Country">
                  <input
                    className={fieldClass}
                    value={draft.country}
                    onChange={(e) => setDraft({ ...draft, country: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Currency">
                <input
                  className={fieldClass}
                  value={draft.currency}
                  onChange={(e) => setDraft({ ...draft, currency: e.target.value })}
                />
              </Field>
            </div>
            <footer className="flex gap-2 border-t border-pos-border bg-pos-surface px-5 py-4">
              <button type="button" className={secondaryButtonClass} onClick={() => setOpen(false)}>
                Cancel
              </button>
              <PrimaryButton
                className="flex-1"
                disabled={busy}
                onClick={async () => {
                  const error = requiredCompany(draft);
                  if (error) {
                    toast.error(error);
                    return;
                  }
                  setBusy(true);
                  try {
                    const saved = await saveCompany(draft);
                    setCompany(saved);
                    setOpen(false);
                    toast.success("Company saved.");
                    await load();
                  } catch (err) {
                    toast.error(err, "Could not save company");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Saving…" : "Save company"}
              </PrimaryButton>
            </footer>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
