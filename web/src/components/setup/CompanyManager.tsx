"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getCompany, saveCompany, type HqCompany } from "../../lib/hq-setup";
import { ManagerSkeleton } from "../Skeleton";
import { SlideOver } from "../SlideOver";
import { DataTable, Field, PrimaryButton, SetupHeader, fieldClass } from "./SetupChrome";

export function CompanyManager() {
  const [company, setCompany] = useState<HqCompany | null>(null);
  const [draft, setDraft] = useState<HqCompany | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getCompany()
      .then(setCompany)
      .catch((err) => toast.error(err instanceof Error ? err.message : "Could not load company"))
      .finally(() => setReady(true));
  }, []);

  if (!ready) return <ManagerSkeleton variant="list" />;
  if (!company) {
    return (
      <div>
        <SetupHeader title="Company" copy="HQ API is not reachable. Start the backend on port 3001." />
      </div>
    );
  }

  return (
    <div>
      <SetupHeader
        title="Company"
        copy="Legal identity used on receipts, tax filings, and every branch under this HQ."
        action={<PrimaryButton onClick={() => { setDraft(company); setOpen(true); }}>Edit company</PrimaryButton>}
      />
      <DataTable columns={["Field", "Value"]}>
        {[
          ["Trading name", company.name],
          ["Legal name", company.legalName],
          ["RC", company.rc],
          ["TIN", company.tin],
          ["Email", company.email],
          ["Phone", company.phone],
          ["Address", company.address],
          ["State", company.state],
          ["Country", company.country],
          ["Currency", company.currency],
        ].map(([label, value]) => (
          <tr key={label} className="border-b border-neutral-50">
            <td className="px-4 py-3 text-neutral-500">{label}</td>
            <td className="px-4 py-3 font-medium">{value || "—"}</td>
          </tr>
        ))}
      </DataTable>
      <SlideOver
        open={open}
        title="Company"
        subtitle="Saved to HQ and pushed to tills on the next heartbeat."
        onClose={() => setOpen(false)}
        footer={
          <PrimaryButton
            className="w-full"
            disabled={busy}
            onClick={async () => {
              if (!draft) return;
              setBusy(true);
              try {
                const saved = await saveCompany(draft);
                setCompany(saved);
                setOpen(false);
                toast.success("Company saved.");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Could not save company");
              } finally {
                setBusy(false);
              }
            }}
          >
            Save company
          </PrimaryButton>
        }
      >
        {draft ? (
          <>
            <Field label="Trading name">
              <input className={fieldClass} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </Field>
            <Field label="Legal name">
              <input className={fieldClass} value={draft.legalName} onChange={(e) => setDraft({ ...draft, legalName: e.target.value })} />
            </Field>
            <Field label="RC number">
              <input className={fieldClass} value={draft.rc} onChange={(e) => setDraft({ ...draft, rc: e.target.value })} />
            </Field>
            <Field label="TIN">
              <input className={fieldClass} value={draft.tin} onChange={(e) => setDraft({ ...draft, tin: e.target.value })} />
            </Field>
            <Field label="Email">
              <input className={fieldClass} type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
            </Field>
            <Field label="Phone">
              <input className={fieldClass} value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
            </Field>
            <Field label="Address">
              <input className={fieldClass} value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
            </Field>
            <Field label="State">
              <input className={fieldClass} value={draft.state} onChange={(e) => setDraft({ ...draft, state: e.target.value })} />
            </Field>
            <Field label="Country">
              <input className={fieldClass} value={draft.country} onChange={(e) => setDraft({ ...draft, country: e.target.value })} />
            </Field>
            <Field label="Currency">
              <input className={fieldClass} value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value })} />
            </Field>
          </>
        ) : null}
      </SlideOver>
    </div>
  );
}
