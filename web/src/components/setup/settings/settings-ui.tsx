"use client";

import type { ReactNode } from "react";
import type { HqCompany, HqOrgSettings } from "@/lib/hq-setup";
import { Field, PrimaryButton, fieldClass } from "@/components/setup/SetupChrome";
import { settingsFieldClass, type SettingsFieldErrors } from "@/lib/settings-validation";
import { ReceiptLivePreview } from "./DocumentPreviews";

const RECEIPT_TEMPLATES: {
  id: HqOrgSettings["receiptTemplate"];
  label: string;
}[] = [
  { id: "classic", label: "Classic" },
  { id: "compact", label: "Compact" },
  { id: "bold", label: "Bold" },
  { id: "minimal", label: "Minimal" },
];

const SWATCHES = [
  "#111827",
  "#0F2C59",
  "#5788D3",
  "#6D4AFF",
  "#0F766E",
  "#B45309",
  "#BE123C",
  "#374151",
];

const HEX_COLOR = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

export function SettingsCard({
  title,
  copy,
  children,
  action,
}: {
  title: string;
  copy: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[22px] bg-pos-surface shadow-pos-sm">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-pos-border/60 px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="text-[18px] font-semibold tracking-tight text-pos-ink">{title}</h2>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-pos-ink-muted">{copy}</p>
        </div>
        {action}
      </header>
      <div>{children}</div>
    </section>
  );
}

export function SettingRow({
  title,
  description,
  control,
}: {
  title: string;
  description: string;
  control: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-pos-border/50 px-5 py-4 first:border-t-0 sm:px-6">
      <div className="min-w-0">
        <p className="text-[14px] font-semibold text-pos-ink">{title}</p>
        <p className="mt-0.5 text-[13px] leading-snug text-pos-ink-muted">{description}</p>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={`relative h-7 w-12 rounded-full transition-colors disabled:opacity-50 ${
        checked ? "bg-pos-primary" : "bg-pos-border"
      }`}
      onClick={() => onChange(!checked)}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition ${
          checked ? "right-0.5" : "left-0.5"
        }`}
      />
    </button>
  );
}

export function ColorField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-pos-ink">{label}</p>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="color"
          value={HEX_COLOR.test(value) ? value : "#111827"}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-14 cursor-pointer rounded-xl border-0 bg-transparent p-0"
        />
        <input
          className={`${settingsFieldClass(fieldClass, error)} max-w-[140px] font-mono uppercase`}
          value={value}
          aria-invalid={Boolean(error)}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      {error ? (
        <p className="mt-1.5 text-[12px] text-pos-danger" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {SWATCHES.map((swatch) => (
          <button
            key={swatch}
            type="button"
            aria-label={swatch}
            className={`size-7 rounded-full ring-2 transition ${
              value.toLowerCase() === swatch.toLowerCase()
                ? "ring-pos-primary"
                : "ring-transparent hover:ring-pos-border"
            }`}
            style={{ backgroundColor: swatch }}
            onClick={() => onChange(swatch)}
          />
        ))}
      </div>
    </div>
  );
}

export function ReceiptStudio({
  draft,
  company,
  busy,
  errors = {},
  onChange,
  onPatch,
  onSave,
}: {
  draft: HqOrgSettings;
  company: HqCompany | null;
  busy: boolean;
  errors?: SettingsFieldErrors;
  onChange: (next: HqOrgSettings) => void;
  onPatch?: (partial: Partial<HqOrgSettings>) => void;
  onSave: () => void;
}) {
  function patchField(partial: Partial<HqOrgSettings>) {
    if (onPatch) onPatch(partial);
    else onChange({ ...draft, ...partial });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <div className="space-y-4">
          <SettingsCard
            title="Store identity on ticket"
            copy="Title, branch address, and email printed at the top of every receipt."
          >
            <div className="space-y-3 px-5 py-5 sm:px-6">
              <Field label="Title name" error={errors.receiptTitle}>
                <input
                  className={settingsFieldClass(fieldClass, errors.receiptTitle)}
                  value={draft.receiptTitle ?? ""}
                  aria-invalid={Boolean(errors.receiptTitle)}
                  placeholder="Store or brand name"
                  onChange={(e) => patchField({ receiptTitle: e.target.value })}
                />
              </Field>
              <Field label="Branch address" error={errors.receiptAddress}>
                <textarea
                  className={`${settingsFieldClass(fieldClass, errors.receiptAddress)} min-h-[64px] resize-y`}
                  value={draft.receiptAddress ?? ""}
                  aria-invalid={Boolean(errors.receiptAddress)}
                  placeholder="Street, city"
                  onChange={(e) => patchField({ receiptAddress: e.target.value })}
                />
              </Field>
              <Field label="Email" error={errors.receiptEmail}>
                <input
                  className={settingsFieldClass(fieldClass, errors.receiptEmail)}
                  type="email"
                  value={draft.receiptEmail ?? ""}
                  aria-invalid={Boolean(errors.receiptEmail)}
                  placeholder="store@example.com"
                  onChange={(e) => patchField({ receiptEmail: e.target.value })}
                />
              </Field>
            </div>
          </SettingsCard>

          <SettingsCard
            title="Ticket content"
            copy="Header and footer edit live — type here or directly on the receipt preview."
          >
            <div className="space-y-3 px-5 py-5 sm:px-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Paper width">
                  <select
                    className={fieldClass}
                    value={draft.receiptPaper}
                    onChange={(e) =>
                      patchField({
                        receiptPaper: e.target.value as HqOrgSettings["receiptPaper"],
                      })
                    }
                  >
                    <option value="80mm">80 mm (standard)</option>
                    <option value="58mm">58 mm (compact)</option>
                  </select>
                </Field>
                <Field label="Currency on ticket">
                  <input className={fieldClass} value={draft.currency} readOnly />
                </Field>
              </div>
              <Field label="Header note" error={errors.receiptHeader}>
                <textarea
                  className={`${settingsFieldClass(fieldClass, errors.receiptHeader)} min-h-[72px] resize-y`}
                  value={draft.receiptHeader}
                  aria-invalid={Boolean(errors.receiptHeader)}
                  onChange={(e) => patchField({ receiptHeader: e.target.value })}
                />
              </Field>
              <Field label="Footer message" error={errors.receiptFooter}>
                <textarea
                  className={`${settingsFieldClass(fieldClass, errors.receiptFooter)} min-h-[72px] resize-y`}
                  value={draft.receiptFooter}
                  aria-invalid={Boolean(errors.receiptFooter)}
                  onChange={(e) => patchField({ receiptFooter: e.target.value })}
                />
              </Field>
            </div>
          </SettingsCard>

          <SettingsCard
            title="Branding"
            copy="Accent colour and logo mark for the printed ticket."
          >
            <div className="space-y-4 px-5 py-5 sm:px-6">
              <ColorField
                label="Brand colour"
                value={draft.receiptBrandColor}
                error={errors.receiptBrandColor}
                onChange={(receiptBrandColor) => patchField({ receiptBrandColor })}
              />
              <SettingRow
                title="Show logo mark"
                description="Print company initials at the top of the ticket."
                control={
                  <Switch
                    checked={draft.receiptShowLogo}
                    onChange={(receiptShowLogo) => patchField({ receiptShowLogo })}
                  />
                }
              />
            </div>
          </SettingsCard>

          <SettingsCard title="Lines on the ticket" copy="Choose what cashiers and customers see.">
            <SettingRow
              title="Show tax line"
              description="Print VAT / service charge breakdown."
              control={
                <Switch
                  checked={draft.receiptShowTax}
                  onChange={(receiptShowTax) => patchField({ receiptShowTax })}
                />
              }
            />
            <SettingRow
              title="Show cashier"
              description="Include signed-in till user on the receipt."
              control={
                <Switch
                  checked={draft.receiptShowCashier}
                  onChange={(receiptShowCashier) => patchField({ receiptShowCashier })}
                />
              }
            />
            <SettingRow
              title="Show barcode"
              description="Print a real Code 128 barcode for the ticket id at the bottom."
              control={
                <Switch
                  checked={draft.receiptShowBarcode}
                  onChange={(receiptShowBarcode) => patchField({ receiptShowBarcode })}
                />
              }
            />
            {draft.receiptShowBarcode ? (
              <div className="border-t border-pos-border/50 px-5 py-4 sm:px-6">
                <Field label="Barcode value (preview)" error={errors.receiptBarcodeValue}>
                  <input
                    className={settingsFieldClass(fieldClass, errors.receiptBarcodeValue)}
                    value={draft.receiptBarcodeValue ?? ""}
                    aria-invalid={Boolean(errors.receiptBarcodeValue)}
                    placeholder="e.g. 10482001933"
                    onChange={(e) => patchField({ receiptBarcodeValue: e.target.value })}
                  />
                </Field>
                <p className="mt-1 text-[12px] text-pos-ink-faint">
                  Encoded as Code 128. Live sales use the ticket id; this value drives the settings
                  preview.
                </p>
              </div>
            ) : null}
            <SettingRow
              title="Show SKU"
              description="Print item codes next to product names."
              control={
                <Switch
                  checked={draft.showSkuOnReceipt}
                  onChange={(showSkuOnReceipt) => patchField({ showSkuOnReceipt })}
                />
              }
            />
            <SettingRow
              title="Powered by Herkintormiwer"
              description="Show company credit at the bottom of every receipt."
              control={
                <Switch
                  checked={Boolean(draft.receiptShowPoweredBy)}
                  onChange={(receiptShowPoweredBy) => patchField({ receiptShowPoweredBy })}
                />
              }
            />
          </SettingsCard>
        </div>

        <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <SettingsCard title="Template" copy="Pick a receipt style. Live preview stays in sync.">
            <div className="flex flex-wrap gap-2 px-5 py-4 sm:px-6">
              {RECEIPT_TEMPLATES.map((tpl) => {
                const on = draft.receiptTemplate === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => patchField({ receiptTemplate: tpl.id })}
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

          <ReceiptLivePreview
            draft={draft}
            company={company}
            onChange={patchField}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          className={`text-sm ${
            errors.receiptHeader ||
            errors.receiptFooter ||
            errors.receiptBrandColor ||
            errors.receiptTitle ||
            errors.receiptAddress ||
            errors.receiptEmail ||
            errors.receiptBarcodeValue
              ? "text-pos-danger"
              : "text-pos-ink-muted"
          }`}
        >
          {busy
            ? "Saving to HQ…"
            : errors.receiptHeader ||
              errors.receiptFooter ||
              errors.receiptBrandColor ||
              errors.receiptTitle ||
              errors.receiptAddress ||
              errors.receiptEmail ||
              errors.receiptBarcodeValue ||
              "Header, identity, and barcode update the preview and save as you type."}
        </p>
        <PrimaryButton
          disabled={
            busy ||
            Boolean(
              errors.receiptHeader ||
                errors.receiptFooter ||
                errors.receiptBrandColor ||
                errors.receiptTitle ||
                errors.receiptAddress ||
                errors.receiptEmail ||
                errors.receiptBarcodeValue,
            )
          }
          onClick={onSave}
        >
          {busy ? "Saving…" : "Save now"}
        </PrimaryButton>
      </div>
    </div>
  );
}
