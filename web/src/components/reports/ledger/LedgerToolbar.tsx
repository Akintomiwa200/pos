"use client";

import { FilterX, RotateCcw, Search } from "lucide-react";
import { fieldClass } from "../../setup/SetupChrome";
import type { LedgerFilters } from "./use-ledger";

function fieldLabel(label: string) {
  return (
    <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-pos-ink-faint">{label}</p>
  );
}

export function LedgerToolbar({
  filters,
  onChange,
  stores,
  statuses,
  sources,
  showStore = true,
}: {
  filters: LedgerFilters;
  onChange: (next: LedgerFilters) => void;
  stores: string[];
  statuses: string[];
  sources: string[];
  showStore?: boolean;
}) {
  const set = (patch: Partial<LedgerFilters>) => onChange({ ...filters, ...patch });
  const dirty = Object.values(filters).some(Boolean);

  return (
    <section className="mb-5 rounded-[20px] bg-pos-surface p-4 shadow-pos-md">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <label className="relative min-w-0 flex-1">
          {fieldLabel("Search account or reference")}
          <Search
            size={16}
            className="pointer-events-none absolute bottom-3 left-3.5 text-pos-ink-faint"
          />
          <input
            value={filters.name}
            onChange={(event) => set({ name: event.target.value })}
            placeholder="Type a name to search…"
            className={`${fieldClass} w-full rounded-full pl-10`}
          />
        </label>

        <label className="min-w-[160px]">
          {fieldLabel("From date")}
          <input
            type="date"
            value={filters.from}
            onChange={(event) => set({ from: event.target.value })}
            className={`${fieldClass} w-full`}
          />
        </label>
        <label className="min-w-[160px]">
          {fieldLabel("To date")}
          <input
            type="date"
            value={filters.to}
            onChange={(event) => set({ to: event.target.value })}
            className={`${fieldClass} w-full`}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
        {showStore && stores.length > 0 ? (
          <label className="min-w-0 flex-1">
            {fieldLabel("Branch / store")}
            <select
              value={filters.store}
              onChange={(event) => set({ store: event.target.value })}
              className={`${fieldClass} w-full`}
            >
              <option value="">All branches</option>
              {stores.map((store) => (
                <option key={store} value={store}>
                  {store}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {statuses.length > 0 ? (
          <label className="min-w-0 flex-1">
            {fieldLabel("Status")}
            <select
              value={filters.status}
              onChange={(event) => set({ status: event.target.value })}
              className={`${fieldClass} w-full`}
            >
              <option value="">All statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {sources.length > 0 ? (
          <label className="min-w-0 flex-1">
            {fieldLabel("Source")}
            <select
              value={filters.source}
              onChange={(event) => set({ source: event.target.value })}
              className={`${fieldClass} w-full`}
            >
              <option value="">All sources</option>
              {sources.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <button
          type="button"
          onClick={() => onChange({ ...filters, name: "", from: "", to: "", store: "", status: "", source: "" })}
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-pos-surface-muted px-4 py-2.5 text-sm font-medium text-pos-ink-muted transition hover:text-pos-ink"
          title="Clear filters"
        >
          {dirty ? <RotateCcw size={15} /> : <FilterX size={15} />}
          {dirty ? "Reset" : "Filters"}
        </button>
      </div>
    </section>
  );
}