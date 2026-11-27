"use client";

import { useMemo, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  Plus,
  Store,
  Trash2,
  MonitorSmartphone,
} from "lucide-react";
import type { HqOrgSettings } from "@/lib/hq-setup";
import { useLivePos } from "@/lib/live-pos";
import {
  REGISTER_ACTIONS,
  REGISTER_BUTTON_KINDS,
  REGISTER_FIELD_KEYS,
  REGISTER_FIELD_MODES,
  REGISTER_RECEIPT_TEMPLATES,
  REGISTER_TENDER_IDS,
  labelForRegisterAction,
  labelForRegisterField,
  type RegisterButtonKind,
  type RegisterFieldKey,
  type RegisterFieldMode,
  type RegisterOutletOverride,
  type RegisterQuickButton,
  type RegisterSaleField,
  type RegisterTender,
  type RegisterTenderId,
} from "@/lib/register-config";
import { PrimaryButton, fieldClass } from "@/components/setup/SetupChrome";
import {
  SettingsCard,
  SettingRow,
  Switch,
} from "./settings-ui";
import { settingsFieldClass, type SettingsFieldErrors } from "@/lib/settings-validation";

type Props = {
  draft: HqOrgSettings;
  busy: boolean;
  errors: SettingsFieldErrors;
  onChange: (next: HqOrgSettings) => void;
  onToggle: (key: keyof HqOrgSettings, value: boolean) => void;
  onSave: () => void;
};

const smallInput = `${fieldClass} !py-2 !text-[13px]`;
const smallSelect = `${fieldClass} !py-2 !text-[13px]`;

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function move<T>(rows: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (target < 0 || target >= rows.length) return rows;
  const next = [...rows];
  const [row] = next.splice(index, 1);
  next.splice(target, 0, row!);
  return next;
}

function RowTools({
  onUp,
  onDown,
  onRemove,
}: {
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button type="button" className="icon-btn" onClick={onUp} aria-label="Move up">
        <ArrowUp size={14} />
      </button>
      <button type="button" className="icon-btn" onClick={onDown} aria-label="Move down">
        <ArrowDown size={14} />
      </button>
      <button type="button" className="icon-btn danger" onClick={onRemove} aria-label="Remove">
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function ConfigGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 px-5 py-5 sm:grid-cols-2 sm:px-6">{children}</div>;
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">
        {label}
      </span>
      {children}
    </label>
  );
}

export function RegisterStudio({
  draft,
  busy,
  errors,
  onChange,
  onToggle,
  onSave,
}: Props) {
  const { branches, stores } = useLivePos();
  const outlets = useMemo(
    () => [
      ...branches.map((row) => ({
        id: row.id,
        name: row.name,
        scope: "branch" as const,
      })),
      ...stores.map((row) => ({
        id: row.id,
        name: row.name,
        scope: "store" as const,
      })),
    ],
    [branches, stores],
  );

  const buttons = draft.registerQuickButtons ?? [];
  const fields = [...(draft.registerSaleFields ?? [])].sort((a, b) => a.order - b.order);
  const tenders = draft.registerTenders ?? [];
  const overrides = draft.registerOutletOverrides ?? [];

  function patch(next: Partial<HqOrgSettings>) {
    onChange({ ...draft, ...next });
  }

  function setButtons(rows: RegisterQuickButton[]) {
    patch({ registerQuickButtons: rows });
  }

  function setFields(rows: RegisterSaleField[]) {
    patch({ registerSaleFields: rows.map((row, index) => ({ ...row, order: index })) });
  }

  function setTenders(rows: RegisterTender[]) {
    patch({ registerTenders: rows });
  }

  function setOverrides(rows: RegisterOutletOverride[]) {
    patch({ registerOutletOverrides: rows });
  }

  function addButton() {
    setButtons([
      ...buttons,
      {
        id: newId("btn"),
        label: "New button",
        kind: "action",
        value: "discount",
        color: "#0F766E",
        active: true,
      },
    ]);
  }

  function addField() {
    const used = new Set(fields.map((row) => row.key));
    const key = REGISTER_FIELD_KEYS.find((row) => !used.has(row));
    if (!key) return;
    setFields([
      ...fields,
      { key, label: labelForRegisterField(key), mode: "optional", order: fields.length },
    ]);
  }

  function addTender() {
    const used = new Set(tenders.map((row) => row.id));
    const id = REGISTER_TENDER_IDS.find((row) => !used.has(row));
    if (!id) return;
    setTenders([
      ...tenders,
      {
        id,
        label: id === "card" ? "Credit Card" : id.charAt(0).toUpperCase() + id.slice(1),
        hint: "Cashier instruction for this method.",
        color: "#0F766E",
        active: true,
        requiresReference: false,
      },
    ]);
  }

  function addOverride() {
    const outlet = outlets[0];
    setOverrides([
      ...overrides,
      {
        id: newId("outlet"),
        scope: outlet?.scope ?? "branch",
        scopeId: outlet?.id ?? "",
        label: outlet?.name ?? "Outlet",
        requireOpenShift: draft.requireOpenShift,
        idleLockMinutes: draft.idleLockMinutes,
        autoPrintReceipt: draft.autoPrintReceipt,
        receiptCopies: draft.receiptCopies,
        receiptTemplate: "classic",
        printDuplicateReceipt: draft.printDuplicateReceipt,
        showSkuOnReceipt: draft.showSkuOnReceipt,
        enabledTenders: [...REGISTER_TENDER_IDS],
        receiptFooter: draft.receiptFooter,
      },
    ]);
  }

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[24px] bg-pos-inverse p-5 text-pos-inverse-ink shadow-pos-md sm:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-pos-primary/25 blur-3xl"
        />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-pos-inverse-ink/12 ring-1 ring-pos-inverse-ink/15">
              <MonitorSmartphone size={22} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-pos-inverse-ink/55">
                Register studio
              </p>
              <h2 className="mt-1 text-[20px] font-semibold tracking-tight sm:text-[22px]">
                Build the till your way
              </h2>
              <p className="mt-1 text-[13px] text-pos-inverse-ink/60">
                {buttons.length} buttons · {fields.length} sale fields · {tenders.length} payment
                methods · {overrides.length} outlet overrides
              </p>
            </div>
          </div>
          <span className="rounded-full bg-pos-inverse-ink/10 px-3 py-1.5 text-[11px] font-semibold text-pos-inverse-ink/80 ring-1 ring-pos-inverse-ink/10">
            Live to tills
          </span>
        </div>
      </section>

      <SettingsCard title="Till behaviour" copy="Shift and lock rules inherited by every register.">
        <SettingRow
          title="Require open shift"
          description="Cashiers must open a shift before selling."
          control={
            <Switch
              checked={draft.requireOpenShift}
              disabled={busy}
              onChange={(value) => onToggle("requireOpenShift", value)}
            />
          }
        />
        <div className="border-t border-pos-border/50">
          <ConfigGrid>
            <Labeled label="Idle lock (minutes)">
              <input
                className={settingsFieldClass(smallInput, errors.idleLockMinutes)}
                type="number"
                min={0}
                max={240}
                value={draft.idleLockMinutes}
                aria-invalid={Boolean(errors.idleLockMinutes)}
                onChange={(event) =>
                  patch({ idleLockMinutes: Number(event.target.value) })
                }
              />
            </Labeled>
            <Labeled label="Held sale expiry (minutes)">
              <input
                className={settingsFieldClass(smallInput, errors.holdExpiryMinutes)}
                type="number"
                min={0}
                max={10080}
                value={draft.holdExpiryMinutes}
                onChange={(event) => patch({ holdExpiryMinutes: Number(event.target.value) })}
              />
            </Labeled>
          </ConfigGrid>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Till buttons"
        copy="Add, rename, recolour, and reorder the shortcuts cashiers see. Category buttons open a category; product buttons add an item by id or SKU."
        action={
          <button type="button" className="secondary-btn" onClick={addButton} disabled={busy}>
            <Plus size={15} /> Add button
          </button>
        }
      >
        {errors.registerQuickButtons ? (
          <p className="px-5 pt-4 text-[12px] text-pos-danger sm:px-6">
            {errors.registerQuickButtons}
          </p>
        ) : null}
        <div className="space-y-2 px-5 py-5 sm:px-6">
          {buttons.length === 0 ? (
            <p className="text-[13px] text-pos-ink-faint">No buttons yet. Add one to start.</p>
          ) : null}
          {buttons.map((button, index) => (
            <div
              key={button.id}
              className="rounded-2xl border border-pos-border/70 bg-pos-surface-muted/40 p-3"
            >
              <div className="flex items-start gap-2">
                <span
                  aria-hidden
                  className="mt-1 size-6 shrink-0 rounded-lg"
                  style={{ backgroundColor: button.color }}
                />
                <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-4">
                  <Labeled label="Label">
                    <input
                      className={smallInput}
                      value={button.label}
                      onChange={(event) =>
                        setButtons(
                          buttons.map((row) =>
                            row.id === button.id ? { ...row, label: event.target.value } : row,
                          ),
                        )
                      }
                    />
                  </Labeled>
                  <Labeled label="Kind">
                    <select
                      className={smallSelect}
                      value={button.kind}
                      onChange={(event) => {
                        const kind = event.target.value as RegisterButtonKind;
                        setButtons(
                          buttons.map((row) =>
                            row.id === button.id
                              ? {
                                  ...row,
                                  kind,
                                  value:
                                    kind === "action" && !REGISTER_ACTIONS.includes(row.value as never)
                                      ? "discount"
                                      : row.value,
                                }
                              : row,
                          ),
                        );
                      }}
                    >
                      {REGISTER_BUTTON_KINDS.map((kind) => (
                        <option key={kind} value={kind}>
                          {kind}
                        </option>
                      ))}
                    </select>
                  </Labeled>
                  <Labeled label={button.kind === "action" ? "Action" : "Category / id / SKU"}>
                    {button.kind === "action" ? (
                      <select
                        className={smallSelect}
                        value={button.value}
                        onChange={(event) =>
                          setButtons(
                            buttons.map((row) =>
                              row.id === button.id ? { ...row, value: event.target.value } : row,
                            ),
                          )
                        }
                      >
                        {REGISTER_ACTIONS.map((action) => (
                          <option key={action} value={action}>
                            {labelForRegisterAction(action)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className={smallInput}
                        value={button.value}
                        onChange={(event) =>
                          setButtons(
                            buttons.map((row) =>
                              row.id === button.id ? { ...row, value: event.target.value } : row,
                            ),
                          )
                        }
                      />
                    )}
                  </Labeled>
                  <Labeled label="Colour">
                    <input
                      className={smallInput}
                      type="color"
                      value={button.color}
                      onChange={(event) =>
                        setButtons(
                          buttons.map((row) =>
                            row.id === button.id ? { ...row, color: event.target.value } : row,
                          ),
                        )
                      }
                    />
                  </Labeled>
                </div>
                <RowTools
                  onUp={() => setButtons(move(buttons, index, -1))}
                  onDown={() => setButtons(move(buttons, index, 1))}
                  onRemove={() => setButtons(buttons.filter((row) => row.id !== button.id))}
                />
              </div>
              <div className="mt-2 flex items-center gap-2 pl-8">
                <Switch
                  checked={button.active}
                  onChange={(active) =>
                    setButtons(
                      buttons.map((row) =>
                        row.id === button.id ? { ...row, active } : row,
                      ),
                    )
                  }
                />
                <span className="text-[11px] text-pos-ink-muted">Visible on the till</span>
              </div>
            </div>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard
        title="Sale fields"
        copy="Make customer and ticket details optional, required, or hidden. Required fields block checkout until filled."
        action={
          <button type="button" className="secondary-btn" onClick={addField} disabled={busy}>
            <Plus size={15} /> Add field
          </button>
        }
      >
        {errors.registerSaleFields ? (
          <p className="px-5 pt-4 text-[12px] text-pos-danger sm:px-6">{errors.registerSaleFields}</p>
        ) : null}
        <div className="space-y-2 px-5 py-5 sm:px-6">
          {fields.map((field, index) => (
            <div
              key={field.key}
              className="grid items-end gap-2 rounded-2xl border border-pos-border/70 bg-pos-surface-muted/40 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
            >
              <Labeled label="Field">
                <select
                  className={smallSelect}
                  value={field.key}
                  onChange={(event) =>
                    setFields(
                      fields.map((row) =>
                        row.key === field.key
                          ? {
                              ...row,
                              key: event.target.value as RegisterFieldKey,
                              label: labelForRegisterField(event.target.value as RegisterFieldKey),
                            }
                          : row,
                        ),
                      )
                    }
                  >
                    {REGISTER_FIELD_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {labelForRegisterField(key)}
                      </option>
                    ))}
                  </select>
                </Labeled>
              <Labeled label="Label">
                <input
                  className={smallInput}
                  value={field.label}
                  onChange={(event) =>
                    setFields(
                      fields.map((row) =>
                        row.key === field.key ? { ...row, label: event.target.value } : row,
                      ),
                    )
                  }
                />
              </Labeled>
              <Labeled label="Mode">
                <select
                  className={smallSelect}
                  value={field.mode}
                  onChange={(event) =>
                    setFields(
                      fields.map((row) =>
                        row.key === field.key
                          ? { ...row, mode: event.target.value as RegisterFieldMode }
                          : row,
                        ),
                      )
                    }
                  >
                    {REGISTER_FIELD_MODES.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                </Labeled>
              <RowTools
                onUp={() => setFields(move(fields, index, -1))}
                onDown={() => setFields(move(fields, index, 1))}
                onRemove={() => setFields(fields.filter((row) => row.key !== field.key))}
              />
            </div>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard
        title="Payment methods"
        copy="Rename, reorder, recolour, enable, or disable the tenders cashiers can choose."
        action={
          <button type="button" className="secondary-btn" onClick={addTender} disabled={busy}>
            <Plus size={15} /> Add method
          </button>
        }
      >
        {errors.registerTenders ? (
          <p className="px-5 pt-4 text-[12px] text-pos-danger sm:px-6">{errors.registerTenders}</p>
        ) : null}
        <div className="space-y-2 px-5 py-5 sm:px-6">
          {tenders.map((tender, index) => (
            <div
              key={tender.id}
              className="grid items-end gap-2 rounded-2xl border border-pos-border/70 bg-pos-surface-muted/40 p-3 sm:grid-cols-[1fr_1.4fr_auto_auto]"
            >
              <Labeled label="Name">
                <input
                  className={smallInput}
                  value={tender.label}
                  onChange={(event) =>
                    setTenders(
                      tenders.map((row) =>
                        row.id === tender.id ? { ...row, label: event.target.value } : row,
                      ),
                    )
                  }
                />
              </Labeled>
              <Labeled label="Cashier hint">
                <input
                  className={smallInput}
                  value={tender.hint}
                  onChange={(event) =>
                    setTenders(
                      tenders.map((row) =>
                        row.id === tender.id ? { ...row, hint: event.target.value } : row,
                      ),
                    )
                  }
                />
              </Labeled>
              <Labeled label="Colour">
                <input
                  className={`${smallInput} size-10 p-1`}
                  type="color"
                  value={tender.color}
                  onChange={(event) =>
                    setTenders(
                      tenders.map((row) =>
                        row.id === tender.id ? { ...row, color: event.target.value } : row,
                      ),
                    )
                  }
                />
              </Labeled>
              <RowTools
                onUp={() => setTenders(move(tenders, index, -1))}
                onDown={() => setTenders(move(tenders, index, 1))}
                onRemove={() => setTenders(tenders.filter((row) => row.id !== tender.id))}
              />
              <div className="flex flex-wrap items-center gap-4 sm:col-span-4">
                <span className="flex items-center gap-2">
                  <Switch
                    checked={tender.active}
                    onChange={(active) =>
                      setTenders(
                        tenders.map((row) =>
                          row.id === tender.id ? { ...row, active } : row,
                        ),
                      )
                    }
                  />
                  <span className="text-[11px] text-pos-ink-muted">Enabled</span>
                </span>
                <span className="flex items-center gap-2">
                  <Switch
                    checked={tender.requiresReference}
                    onChange={(requiresReference) =>
                      setTenders(
                        tenders.map((row) =>
                          row.id === tender.id ? { ...row, requiresReference } : row,
                        ),
                      )
                    }
                  />
                  <span className="text-[11px] text-pos-ink-muted">Require reference</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard
        title="Receipt rules"
        copy="Register-level print behaviour. Detailed ticket content stays in Receipts."
      >
        <SettingRow
          title="Auto-print receipt"
          description="Print as soon as payment is confirmed."
          control={
            <Switch
              checked={draft.autoPrintReceipt}
              onChange={(value) => onToggle("autoPrintReceipt", value)}
            />
          }
        />
        <SettingRow
          title="Ask for duplicate copy"
          description="Prompt for a merchant copy after each sale."
          control={
            <Switch
              checked={draft.printDuplicateReceipt}
              onChange={(value) => onToggle("printDuplicateReceipt", value)}
            />
          }
        />
        <SettingRow
          title="Open cash drawer"
          description="Trigger the drawer when a sale completes."
          control={
            <Switch
              checked={draft.openCashDrawer}
              onChange={(value) => onToggle("openCashDrawer", value)}
            />
          }
        />
        <SettingRow
          title="Show SKU on receipt"
          description="Include product SKU beside each line."
          control={
            <Switch
              checked={draft.showSkuOnReceipt}
              onChange={(value) => onToggle("showSkuOnReceipt", value)}
            />
          }
        />
        <div className="border-t border-pos-border/50">
          <ConfigGrid>
            <Labeled label="Receipt copies">
              <input
                className={settingsFieldClass(smallInput, errors.receiptCopies)}
                type="number"
                min={1}
                max={5}
                value={draft.receiptCopies}
                onChange={(event) => patch({ receiptCopies: Number(event.target.value) })}
              />
            </Labeled>
            <Labeled label="Default receipt style">
              <select
                className={smallSelect}
                value={draft.receiptTemplate}
                onChange={(event) =>
                  patch({ receiptTemplate: event.target.value as HqOrgSettings["receiptTemplate"] })
                }
              >
                {REGISTER_RECEIPT_TEMPLATES.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </Labeled>
          </ConfigGrid>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Outlet overrides"
        copy="Give a branch or store its own register rules. Tills at that location use these values instead of the company defaults."
        action={
          <button type="button" className="secondary-btn" onClick={addOverride} disabled={busy}>
            <Plus size={15} /> Add override
          </button>
        }
      >
        {errors.registerOutletOverrides ? (
          <p className="px-5 pt-4 text-[12px] text-pos-danger sm:px-6">
            {errors.registerOutletOverrides}
          </p>
        ) : null}
        <div className="space-y-2 px-5 py-5 sm:px-6">
          {overrides.length === 0 ? (
            <p className="text-[13px] text-pos-ink-faint">
              No overrides yet. Every till follows the company defaults above.
            </p>
          ) : null}
          {overrides.map((override, index) => (
            <div
              key={override.id}
              className="rounded-2xl border border-pos-border/70 bg-pos-surface-muted/40 p-3"
            >
              <div className="grid gap-2 sm:grid-cols-3">
                <Labeled label="Scope">
                  <select
                    className={smallSelect}
                    value={override.scope}
                    onChange={(event) => {
                      const scope = event.target.value as "branch" | "store";
                      const first = outlets.find((row) => row.scope === scope);
                      setOverrides(
                        overrides.map((row) =>
                          row.id === override.id
                            ? {
                                ...row,
                                scope,
                                scopeId: first?.id ?? "",
                                label: first?.name ?? "Outlet",
                              }
                            : row,
                        ),
                      );
                    }}
                  >
                    <option value="branch">Branch</option>
                    <option value="store">Store</option>
                  </select>
                </Labeled>
                <Labeled label="Outlet">
                  <select
                    className={smallSelect}
                    value={override.scopeId}
                    onChange={(event) => {
                      const outlet = outlets.find((row) => row.id === event.target.value);
                      setOverrides(
                        overrides.map((row) =>
                          row.id === override.id
                            ? {
                                ...row,
                                scopeId: event.target.value,
                                label: outlet?.name ?? row.label,
                              }
                            : row,
                        ),
                      );
                    }}
                  >
                    {outlets
                      .filter((row) => row.scope === override.scope)
                      .map((outlet) => (
                        <option key={outlet.id} value={outlet.id}>
                          {outlet.name}
                        </option>
                      ))}
                  </select>
                </Labeled>
                <Labeled label="Label">
                  <input
                    className={smallInput}
                    value={override.label}
                    onChange={(event) =>
                      setOverrides(
                        overrides.map((row) =>
                          row.id === override.id ? { ...row, label: event.target.value } : row,
                        ),
                      )
                    }
                  />
                </Labeled>
              </div>
              <div className="mt-3 flex flex-wrap gap-4">
                {(
                  [
                    ["requireOpenShift", "Require shift"],
                    ["autoPrintReceipt", "Auto-print"],
                    ["printDuplicateReceipt", "Duplicate copy"],
                    ["showSkuOnReceipt", "Show SKU"],
                  ] as const
                ).map(([key, label]) => (
                  <span key={key} className="flex items-center gap-2">
                    <Switch
                      checked={Boolean(override[key])}
                      onChange={(value) =>
                        setOverrides(
                          overrides.map((row) =>
                            row.id === override.id ? { ...row, [key]: value } : row,
                          ),
                        )
                      }
                    />
                    <span className="text-[11px] text-pos-ink-muted">{label}</span>
                  </span>
                ))}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <Labeled label="Idle lock (minutes)">
                  <input
                    className={smallInput}
                    type="number"
                    min={0}
                    max={240}
                    value={override.idleLockMinutes ?? 0}
                    onChange={(event) =>
                      setOverrides(
                        overrides.map((row) =>
                          row.id === override.id
                            ? { ...row, idleLockMinutes: Number(event.target.value) }
                            : row,
                        ),
                      )
                    }
                  />
                </Labeled>
                <Labeled label="Copies">
                  <input
                    className={smallInput}
                    type="number"
                    min={1}
                    max={5}
                    value={override.receiptCopies ?? 1}
                    onChange={(event) =>
                      setOverrides(
                        overrides.map((row) =>
                          row.id === override.id
                            ? { ...row, receiptCopies: Number(event.target.value) }
                            : row,
                        ),
                      )
                    }
                  />
                </Labeled>
                <Labeled label="Receipt style">
                  <select
                    className={smallSelect}
                    value={override.receiptTemplate ?? "classic"}
                    onChange={(event) =>
                      setOverrides(
                        overrides.map((row) =>
                          row.id === override.id
                            ? {
                                ...row,
                                receiptTemplate: event.target.value as (typeof REGISTER_RECEIPT_TEMPLATES)[number],
                              }
                            : row,
                        ),
                      )
                    }
                  >
                    {REGISTER_RECEIPT_TEMPLATES.map((id) => (
                      <option key={id} value={id}>
                        {id}
                      </option>
                    ))}
                  </select>
                </Labeled>
              </div>
              <div className="mt-3">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">
                  Enabled tenders
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {REGISTER_TENDER_IDS.map((id: RegisterTenderId) => {
                    const enabled = (override.enabledTenders ?? []).includes(id);
                    const tender = tenders.find((row) => row.id === id);
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={enabled}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                          enabled
                            ? "bg-pos-primary text-white"
                            : "bg-pos-surface-muted text-pos-ink-muted"
                        }`}
                        onClick={() =>
                          setOverrides(
                            overrides.map((row) => {
                              if (row.id !== override.id) return row;
                              const current = row.enabledTenders ?? [];
                              return {
                                ...row,
                                enabledTenders: enabled
                                  ? current.filter((value) => value !== id)
                                  : [...current, id],
                              };
                            }),
                          )
                        }
                      >
                        {tender?.label ?? id}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <RowTools
                  onUp={() => setOverrides(move(overrides, index, -1))}
                  onDown={() => setOverrides(move(overrides, index, 1))}
                  onRemove={() => setOverrides(overrides.filter((row) => row.id !== override.id))}
                />
              </div>
            </div>
          ))}
        </div>
      </SettingsCard>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-pos-ink-muted">
          Changes save to HQ and stream to every paired till automatically.
        </p>
        <PrimaryButton disabled={busy} onClick={onSave}>
          {busy ? "Saving…" : "Save register"}
        </PrimaryButton>
      </div>
    </div>
  );
}
