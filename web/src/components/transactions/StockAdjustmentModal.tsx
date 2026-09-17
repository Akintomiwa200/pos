"use client";

import { useEffect, useState } from "react";
import { Loader2, Minus, Plus, TrendingUp, Trash2, X } from "lucide-react";
import { toast } from "@/lib/toast";
import { useLiveInventory } from "@/lib/live-inventory";
import { listStockLevels, recordMovements, type StockLevel } from "@/lib/hq-ops";
import {
  REASONS,
  REASON_TONES,
  TONE_CHIP,
  blankRow,
  todayISO,
  type Line,
} from "./stock-adjustment";

export function StockAdjustmentModal({
  initialReason = "",
  initialItemId = "",
  recordedBy = "",
  onClose,
  onSaved,
}: {
  initialReason?: string;
  initialItemId?: string;
  /** Default "Recorded by" value (e.g. the signed-in staff account). */
  recordedBy?: string;
  onClose: () => void;
  onSaved?: (levels: StockLevel[]) => void;
}) {
  const { levels } = useLiveInventory();
  const [busy, setBusy] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [staff, setStaff] = useState(recordedBy);
  const [rows, setRows] = useState<Line[]>([blankRow(initialReason, initialItemId)]);
  const [postError, setPostError] = useState("");

  useEffect(() => {
    setPostError("");
    setDate(todayISO());
    setStaff(recordedBy);
    setRows([blankRow(initialReason, initialItemId)]);
  }, [initialReason, initialItemId, recordedBy]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const setRow = (index: number, patch: Partial<Line>) =>
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  async function submit() {
    setPostError("");
    const filled = rows.filter(
      (row) => row.itemId && parseInt(row.quantity, 10) !== 0 && !isNaN(parseInt(row.quantity, 10)),
    );
    if (filled.length === 0) {
      setPostError("Add at least one item with a non-zero quantity.");
      return;
    }
    if (filled.some((row) => !row.reason)) {
      setPostError("Please select a reason for all adjustments.");
      return;
    }
    setBusy(true);
    try {
      await recordMovements({
        type: "adjustment",
        reason: filled[0].reason,
        staff: staff || undefined,
        at: date ? new Date(date).toISOString() : undefined,
        lines: filled.map((row) => ({
          itemId: row.itemId,
          quantity: parseInt(row.quantity, 10),
          reason: row.reason,
        })),
      });
      const fresh = await listStockLevels().catch(() => null);
      onSaved?.(fresh ?? []);
      toast.success("Adjustment posted.");
      onClose();
    } catch (err) {
      setPostError(err instanceof Error ? err.message : "Could not post adjustment");
    } finally {
      setBusy(false);
    }
  }

  const customFieldClass =
    "w-full rounded-[14px] border border-pos-border bg-pos-surface px-4 py-2 text-sm text-pos-ink outline-none transition focus:border-pos-primary focus:ring-1 focus:ring-pos-primary";
  const customSelectClass =
    "w-full cursor-pointer appearance-none rounded-[14px] border border-pos-border bg-pos-surface px-4 py-2 pr-10 text-sm text-pos-ink outline-none transition focus:border-pos-primary focus:ring-1 focus:ring-pos-primary";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex w-full max-w-2xl flex-col rounded-[24px] bg-pos-surface shadow-2xl animate-in zoom-in-95">
        <header className="flex shrink-0 items-center justify-between border-b border-pos-border/60 px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-pos-ink">New stock adjustment</h2>
            <p className="mt-1 text-sm text-pos-ink-muted">
              {initialReason ? (
                <>
                  Logged under reason{" "}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${TONE_CHIP[REASON_TONES[initialReason] ?? "sky"]}`}
                  >
                    {initialReason}
                  </span>
                </>
              ) : (
                "Pick a reason per line, then set the signed quantity."
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full bg-pos-surface-muted text-pos-ink transition hover:bg-pos-border/60"
          >
            <X size={20} />
          </button>
        </header>

        <div className="max-h-[70vh] flex-1 space-y-6 overflow-y-auto px-6 py-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-pos-ink">
              Date
              <input
                type="date"
                className={`${customFieldClass} mt-1.5`}
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
            <label className="block text-sm font-medium text-pos-ink">
              Recorded by
              <input
                className={`${customFieldClass} mt-1.5`}
                value={staff}
                onChange={(event) => setStaff(event.target.value)}
                placeholder="Staff name"
              />
            </label>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-pos-ink-muted">
                <TrendingUp size={15} /> Products to adjust
              </p>
              <button
                type="button"
                className="text-sm font-medium text-pos-primary hover:underline"
                onClick={() => setRows((prev) => [...prev, blankRow(initialReason)])}
              >
                + Add another item
              </button>
            </div>

            <div className="space-y-3">
              {rows.map((row, index) => (
                <div
                  key={row.key}
                  className="flex flex-col gap-3 rounded-[16px] border border-pos-border/60 bg-pos-surface-muted/40 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <label className="block flex-1 text-[13px] font-medium text-pos-ink">
                      Item
                      <select
                        className={`${customSelectClass} mt-1.5`}
                        value={row.itemId}
                        onChange={(event) => setRow(index, { itemId: event.target.value })}
                      >
                        <option value="">Choose an item…</option>
                        {levels.map((level) => (
                          <option key={level.itemId} value={level.itemId}>
                            {level.name} — {level.onHand} on hand
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block w-40 text-[13px] font-medium text-pos-ink">
                      Quantity (+/-)
                      <div className="mt-1.5 flex items-center gap-1">
                        <button
                          type="button"
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-pos-border/60 bg-pos-surface text-pos-ink transition hover:bg-pos-surface-muted"
                          onClick={() => setRow(index, { quantity: String((Math.round(Number(row.quantity)) || 0) - 1) })}
                        >
                          <Minus size={14} />
                        </button>
                        <input
                          type="number"
                          className="w-full rounded-[10px] border border-pos-border bg-pos-surface px-2 py-1.5 text-center text-sm font-medium tabular-nums text-pos-ink outline-none focus:border-pos-primary"
                          placeholder="0"
                          value={row.quantity}
                          onChange={(event) => setRow(index, { quantity: event.target.value })}
                        />
                        <button
                          type="button"
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-pos-border/60 bg-pos-surface text-pos-ink transition hover:bg-pos-surface-muted"
                          onClick={() => setRow(index, { quantity: String((Math.round(Number(row.quantity)) || 0) + 1) })}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </label>
                  </div>
                  <div className="flex items-end gap-3">
                    <label className="block flex-1 text-[13px] font-medium text-pos-ink">
                      Reason
                      <select
                        className={`${customSelectClass} mt-1.5`}
                        value={row.reason}
                        onChange={(event) => setRow(index, { reason: event.target.value })}
                      >
                        <option value="">Select reason…</option>
                        {REASONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      disabled={rows.length === 1}
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] border border-pos-border/60 bg-pos-surface text-pos-ink-faint transition hover:bg-pos-surface-muted hover:text-pos-danger disabled:opacity-30"
                      onClick={() => {
                        if (rows.length > 1) setRows((prev) => prev.filter((r) => r.key !== row.key));
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {postError ? (
            <p
              className="mt-2 rounded-[14px] bg-pos-danger/10 px-4 py-3 text-sm font-medium text-pos-danger"
              role="alert"
            >
              {postError}
            </p>
          ) : null}
        </div>

        <footer className="shrink-0 rounded-b-[24px] border-t border-pos-border/60 bg-pos-surface p-6">
          <button
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-pos-primary px-5 text-sm font-semibold text-white shadow-pos-primary transition-all hover:bg-pos-primary/90 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
            disabled={busy}
            onClick={submit}
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : null}
            {busy ? "Posting…" : "Post adjustment"}
          </button>
        </footer>
      </div>
    </div>
  );
}