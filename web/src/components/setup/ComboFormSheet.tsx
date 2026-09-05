"use client";

import { useEffect, useMemo, type FormEvent, type ReactNode } from "react";
import { Layers, Plus, ShoppingBag, Trash2, Wallet, X } from "lucide-react";
import type { HqCatalogItem } from "@/lib/hq-api";
import { marginPercent, nairaInputFromMinor, parseNairaInput } from "@/lib/catalog";
import { naira } from "@/lib/hq-ops";
import { currencySymbol, useOrgLocale } from "@/lib/org-locale";
import { formatStock } from "@/lib/units";
import { fieldClass } from "./SetupChrome";

export type ComboLineDraft = {
  itemId: string;
  quantity: number;
};

export type ComboDraft = {
  id?: string;
  name: string;
  description: string;
  components: ComboLineDraft[];
  price: string;
  pricingMode: "direct" | "margin";
  marginInput: string;
  active: boolean;
};

type Props = {
  open: boolean;
  draft: ComboDraft;
  busy: boolean;
  catalog: HqCatalogItem[];
  onClose: () => void;
  onChange: (patch: Partial<ComboDraft>) => void;
  onSubmit: () => void;
};

function Section({
  icon,
  title,
  hint,
  children,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[20px] bg-pos-surface p-4 shadow-pos-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-pos-surface-muted text-pos-ink">
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-pos-ink">{title}</h3>
          {hint ? <p className="mt-0.5 text-xs text-pos-ink-faint">{hint}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function InputLabel({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-pos-ink-muted">{label}</span>
      {hint ? <span className="mt-0.5 block text-[11px] text-pos-ink-faint">{hint}</span> : null}
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}

export function ComboFormSheet({
  open,
  draft,
  busy,
  catalog,
  onClose,
  onChange,
  onSubmit,
}: Props) {
  const { currency } = useOrgLocale();
  const mark = currencySymbol(currency);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const itemsById = useMemo(
    () => new Map(catalog.map((item) => [item.id, item] as const)),
    [catalog],
  );

  const cost = useMemo(
    () =>
      draft.components.reduce((sum, line) => {
        const item = itemsById.get(line.itemId);
        return sum + (item?.costMinor ?? 0) * Math.max(0, line.quantity);
      }, 0),
    [draft.components, itemsById],
  );

  const sell = useMemo(
    () => Math.round((parseFloat(draft.price) || 0) * 100),
    [draft.price],
  );

  const margin = useMemo(() => {
    if (draft.pricingMode === "margin") {
      const input = parseFloat(draft.marginInput);
      if (Number.isFinite(input)) return Math.max(-9999, Math.min(100, input));
    }
    return marginPercent(cost, sell);
  }, [draft.pricingMode, draft.marginInput, cost, sell]);

  const effectiveSell = useMemo(() => {
    if (draft.pricingMode === "margin") {
      const pct = Number.isFinite(parseFloat(draft.marginInput))
        ? Math.max(-9999, Math.min(100, parseFloat(draft.marginInput)))
        : 0;
      return pct >= 100 ? 0 : Math.round(cost / (1 - pct / 100));
    }
    return sell;
  }, [draft.pricingMode, draft.marginInput, cost, sell]);

  if (!open) return null;

  const selectable = catalog
    .filter((item) => item.active !== false)
    .sort((a, b) => a.name.localeCompare(b.name));
  const chosenIds = new Set(draft.components.map((line) => line.itemId));

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  const isEdit = Boolean(draft.id);

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-pos-ink/45 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />
      <aside className="absolute inset-y-0 right-0 flex h-full w-full max-w-2xl flex-col bg-pos-bg text-pos-ink shadow-pos-md">
        <header className="flex shrink-0 items-start justify-between gap-4 bg-pos-surface px-6 py-5 shadow-pos-sm">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pos-ink-faint">
              {isEdit ? "Edit combo" : "New combo"}
            </p>
            <h2 className="mt-2 text-[clamp(1.25rem,2.5vw,1.75rem)] font-medium leading-none tracking-tight text-pos-ink-faint">
              {isEdit ? draft.name || "Untitled combo" : "Combine stock into a product"}
            </h2>
            <p className="mt-2 text-sm text-pos-ink-muted">
              Pick items from stock, set quantities, and give the bundle a selling price.
            </p>
          </div>
          <button
            type="button"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-pos-surface-muted text-pos-ink hover:bg-pos-border/60"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <Section icon={<Layers size={18} />} title="Combo details">
              <div className="space-y-4">
                <InputLabel label="Name">
                  <input
                    required
                    className={fieldClass}
                    placeholder="e.g. Family Sunday Pack"
                    value={draft.name}
                    disabled={busy}
                    onChange={(event) => onChange({ name: event.target.value })}
                  />
                </InputLabel>
                <InputLabel label="Description" hint="Optional — sold as one unit on tills.">
                  <textarea
                    className={`${fieldClass} min-h-[72px] resize-y`}
                    placeholder="What makes up this combo…"
                    value={draft.description}
                    disabled={busy}
                    onChange={(event) => onChange({ description: event.target.value })}
                  />
                </InputLabel>
                <label className="flex items-center justify-between gap-3 rounded-xl border border-pos-border bg-pos-surface-muted px-3 py-2.5 text-sm">
                  <span className="font-medium text-pos-ink">Active on tills</span>
                  <input
                    type="checkbox"
                    className="accent-pos-primary"
                    checked={draft.active}
                    disabled={busy}
                    onChange={(event) => onChange({ active: event.target.checked })}
                  />
                </label>
              </div>
            </Section>

            <Section
              icon={<ShoppingBag size={18} />}
              title="Components"
              hint="Each line is a stock item plus how many go into one combo."
            >
              <div className="space-y-3">
                {draft.components.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-pos-border bg-pos-surface-muted px-4 py-6 text-center text-sm text-pos-ink-faint">
                    No components yet. Add at least one stock item below.
                  </p>
                ) : (
                  draft.components.map((line, index) => {
                    const item = itemsById.get(line.itemId);
                    return (
                      <div
                        key={index}
                        className="flex flex-wrap items-end gap-3 rounded-xl border border-pos-border bg-pos-surface-muted px-3 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <select
                            className={fieldClass}
                            value={line.itemId}
                            disabled={busy}
                            onChange={(event) =>
                              onChange({
                                components: draft.components.map((row, i) =>
                                  i === index ? { ...row, itemId: event.target.value } : row,
                                ),
                              })
                            }
                          >
                            <option value="">Choose item…</option>
                            {selectable.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.name} · {naira(option.priceMinor)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="w-24">
                          <InputLabel label="Qty">
                            <input
                              type="number"
                              min="1"
                              step="1"
                              className={fieldClass}
                              value={line.quantity}
                              disabled={busy}
                              onChange={(event) =>
                                onChange({
                                  components: draft.components.map((row, i) =>
                                    i === index
                                      ? { ...row, quantity: Math.max(1, parseInt(event.target.value) || 1) }
                                      : row,
                                  ),
                                })
                              }
                            />
                          </InputLabel>
                        </div>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            onChange({
                              components: draft.components.filter((_, i) => i !== index),
                            })
                          }
                          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-pos-border text-pos-ink-muted transition hover:bg-pos-surface hover:text-pos-danger"
                          aria-label={`Remove ${item?.name ?? "component"}`}
                        >
                          <Trash2 size={15} />
                        </button>
                        {item ? (
                          <p className="w-full text-[11px] text-pos-ink-faint">
                            {naira(item.costMinor)} each · on hand{" "}
                            {formatStock(item.onHand, item.unit, item.packSize, item.unitLabel)}
                          </p>
                        ) : null}
                      </div>
                    );
                  })
                )}

                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    onChange({
                      components: [...draft.components, { itemId: "", quantity: 1 }],
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-full border border-dashed border-pos-border px-4 py-2 text-sm font-medium text-pos-ink-muted transition hover:border-pos-primary hover:text-pos-primary"
                >
                  <Plus size={15} />
                  Add component
                </button>

                {chosenIds.size !== draft.components.length ? (
                  <p className="text-[12px] text-pos-warning">
                    Finish choosing an item for every component line.
                  </p>
                ) : null}
              </div>
            </Section>

            <Section
              icon={<Wallet size={18} />}
              title="Pricing"
              hint="Cost is the sum of its components — recalculates live with stock."
            >
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onChange({ pricingMode: "direct" })}
                  className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
                    draft.pricingMode === "direct"
                      ? "bg-pos-primary text-white shadow-pos-primary"
                      : "bg-pos-surface-muted text-pos-ink-muted hover:text-pos-ink"
                  }`}
                >
                  Set selling price directly
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onChange({ pricingMode: "margin" })}
                  className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
                    draft.pricingMode === "margin"
                      ? "bg-pos-primary text-white shadow-pos-primary"
                      : "bg-pos-surface-muted text-pos-ink-muted hover:text-pos-ink"
                  }`}
                >
                  Set by margin
                </button>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-pos-border bg-pos-surface-muted px-3 py-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-pos-ink-muted">
                    Unit cost ({mark})
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-pos-ink">
                    {naira(cost)}
                  </p>
                </div>
                {draft.pricingMode === "direct" ? (
                  <InputLabel
                    label={`Selling price (${mark})`}
                    hint="What customers pay for one combo."
                  >
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      className={fieldClass}
                      placeholder="0.00"
                      value={draft.price}
                      disabled={busy}
                      onChange={(event) => onChange({ price: event.target.value })}
                    />
                  </InputLabel>
                ) : (
                  <InputLabel
                    label="Margin (%)"
                    hint="Selling price is derived from unit cost."
                  >
                    <input
                      type="number"
                      step="0.1"
                      min={-999}
                      max={99.9}
                      className={fieldClass}
                      placeholder="e.g. 30"
                      value={draft.marginInput}
                      disabled={busy}
                      onChange={(event) => onChange({ marginInput: event.target.value })}
                    />
                  </InputLabel>
                )}
              </div>

              <div className="mt-4 rounded-xl border border-pos-border bg-pos-surface-muted px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-pos-ink-muted">Gross margin</span>
                  <span className="font-semibold text-pos-ink">{margin}%</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-3 text-xs text-pos-ink-faint">
                  <span>
                    {draft.pricingMode === "margin" ? "Computed selling price" : "Markup per combo"}
                  </span>
                  <span>{naira(effectiveSell)}</span>
                </div>
              </div>
            </Section>
          </div>

          <footer className="shrink-0 bg-pos-surface px-6 py-4 shadow-[0_-8px_24px_rgba(28,28,30,0.04)]">
            <div className="flex gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={onClose}
                className="flex-1 rounded-full bg-pos-surface-muted px-4 py-2.5 text-sm font-semibold text-pos-ink hover:bg-pos-border/50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="flex-[1.4] rounded-full bg-pos-primary px-4 py-2.5 text-sm font-semibold text-white shadow-pos-primary hover:opacity-90 disabled:opacity-60"
              >
                {busy ? "Saving…" : isEdit ? "Save changes" : "Create combo"}
              </button>
            </div>
          </footer>
        </form>
      </aside>
    </div>
  );
}