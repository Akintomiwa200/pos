"use client";

import type { HqCompany, HqOrgSettings } from "@/lib/hq-setup";
import { Field, PrimaryButton, fieldClass } from "@/components/setup/SetupChrome";
import { settingsFieldClass, type SettingsFieldErrors } from "@/lib/settings-validation";
import { InvoiceLivePreview } from "./DocumentPreviews";
import {
  ColorField,
  SettingRow,
  SettingsCard,
  Switch,
} from "./settings-ui";

const INVOICE_TEMPLATES: {
  id: HqOrgSettings["invoiceTemplate"];
  label: string;
}[] = [
  { id: "modern", label: "Modern" },
  { id: "letterhead", label: "Letterhead" },
  { id: "classic", label: "Classic" },
  { id: "sapphire", label: "Sapphire" },
  { id: "ivory", label: "Ivory" },
];

function firstErrorLine(errors: SettingsFieldErrors) {
  for (const value of Object.values(errors)) {
    if (value) return value;
  }
  return null;
}

export function InvoiceStudio({
  draft,
  company,
  busy,
  errors = {},
  onChange,
  onSave,
  onCompanyHint,
}: {
  draft: HqOrgSettings;
  company: HqCompany | null;
  busy: boolean;
  errors?: SettingsFieldErrors;
  onChange: (next: HqOrgSettings) => void;
  onSave: () => void;
  onCompanyHint?: () => void;
}) {
  const blocking = firstErrorLine(errors);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(380px,1.05fr)]">
        <div className="space-y-4">
          <SettingsCard
            title="Business details"
            copy="Pulled from Company. Edit there to change what customers see on invoices."
            action={
              onCompanyHint ? (
                <button
                  type="button"
                  onClick={onCompanyHint}
                  className="text-sm font-medium text-pos-primary hover:underline"
                >
                  Edit company
                </button>
              ) : null
            }
          >
            <div className="grid gap-3 px-5 py-5 sm:grid-cols-2 sm:px-6">
              <Field label="Company name">
                <input className={fieldClass} value={company?.name || ""} readOnly />
              </Field>
              <Field label="Email">
                <input className={fieldClass} value={company?.email || ""} readOnly />
              </Field>
              <Field label="Phone">
                <input className={fieldClass} value={company?.phone || ""} readOnly />
              </Field>
              <Field label="Country">
                <input className={fieldClass} value={company?.country || ""} readOnly />
              </Field>
              <Field label="TIN">
                <input className={fieldClass} value={company?.tin || ""} readOnly />
              </Field>
              <Field label="RC No.">
                <input className={fieldClass} value={company?.rc || ""} readOnly />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Address">
                  <input className={fieldClass} value={company?.address || ""} readOnly />
                </Field>
              </div>
            </div>
          </SettingsCard>

          <SettingsCard
            title="Numbering & copy"
            copy="Prefix and next number for new invoices. Terms print under the totals."
          >
            <div className="space-y-3 px-5 py-5 sm:px-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Invoice prefix" error={errors.invoicePrefix}>
                  <input
                    className={settingsFieldClass(fieldClass, errors.invoicePrefix)}
                    value={draft.invoicePrefix}
                    aria-invalid={Boolean(errors.invoicePrefix)}
                    onChange={(e) => onChange({ ...draft, invoicePrefix: e.target.value })}
                  />
                </Field>
                <Field label="Next number" error={errors.invoiceNextNumber}>
                  <input
                    className={settingsFieldClass(fieldClass, errors.invoiceNextNumber)}
                    type="number"
                    min={1}
                    value={draft.invoiceNextNumber}
                    aria-invalid={Boolean(errors.invoiceNextNumber)}
                    onChange={(e) =>
                      onChange({ ...draft, invoiceNextNumber: Number(e.target.value) })
                    }
                  />
                </Field>
              </div>
              <Field label="Payment note" error={errors.invoicePaymentNote}>
                <textarea
                  className={`${settingsFieldClass(fieldClass, errors.invoicePaymentNote)} min-h-[72px] resize-y`}
                  value={draft.invoicePaymentNote}
                  aria-invalid={Boolean(errors.invoicePaymentNote)}
                  onChange={(e) => onChange({ ...draft, invoicePaymentNote: e.target.value })}
                />
              </Field>
              <Field label="Terms & conditions" error={errors.invoiceTerms}>
                <textarea
                  className={`${settingsFieldClass(fieldClass, errors.invoiceTerms)} min-h-[96px] resize-y`}
                  value={draft.invoiceTerms}
                  aria-invalid={Boolean(errors.invoiceTerms)}
                  onChange={(e) => onChange({ ...draft, invoiceTerms: e.target.value })}
                />
              </Field>
            </div>
          </SettingsCard>

          <SettingsCard title="Branding" copy="Colours carry through every invoice template.">
            <div className="space-y-4 px-5 py-5 sm:px-6">
              <ColorField
                label="Brand colour"
                value={draft.invoiceBrandColor}
                error={errors.invoiceBrandColor}
                onChange={(invoiceBrandColor) => onChange({ ...draft, invoiceBrandColor })}
              />
              <ColorField
                label="Panel background"
                value={draft.invoicePanelColor}
                error={errors.invoicePanelColor}
                onChange={(invoicePanelColor) => onChange({ ...draft, invoicePanelColor })}
              />
              <SettingRow
                title="Show logo mark"
                description="Company initials in the invoice header."
                control={
                  <Switch
                    checked={draft.invoiceShowLogo}
                    onChange={(invoiceShowLogo) => onChange({ ...draft, invoiceShowLogo })}
                  />
                }
              />
            </div>
          </SettingsCard>
        </div>

        <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <SettingsCard title="Template" copy="Style for customer-facing invoices.">
            <div className="flex flex-wrap gap-2 px-5 py-4 sm:px-6">
              {INVOICE_TEMPLATES.map((tpl) => {
                const on = draft.invoiceTemplate === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => onChange({ ...draft, invoiceTemplate: tpl.id })}
                    className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${
                      on
                        ? "bg-pos-primary text-white shadow-pos-primary"
                        : "bg-pos-surface-muted text-pos-ink-muted hover:text-pos-ink"
                    }`}
                  >
                    {on ? "✓ " : ""}
                    {tpl.label}
                  </button>
                );
              })}
            </div>
          </SettingsCard>

          <InvoiceLivePreview draft={draft} company={company} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={`text-sm ${blocking ? "text-pos-danger" : "text-pos-ink-muted"}`}>
          {busy
            ? "Saving to HQ…"
            : blocking ?? "Edits save to the API in real time. Preview updates as you type."}
        </p>
        <PrimaryButton disabled={busy || Boolean(blocking)} onClick={onSave}>
          {busy ? "Saving…" : "Save now"}
        </PrimaryButton>
      </div>
    </div>
  );
}
