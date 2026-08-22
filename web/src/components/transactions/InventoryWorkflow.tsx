"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  listMovements,
  listStockLevels,
  recordMovement,
  type MovementInput,
  type StockLevel,
  type StockMovement,
} from "@/lib/hq-ops";
import { prettyDay } from "@/lib/hq-ops";
import { ManagerSkeleton } from "../Skeleton";
import { SlideOver } from "../SlideOver";
import { DataTable, Field, PrimaryButton, SetupHeader, fieldClass } from "../setup/SetupChrome";

type Variant = "transfer" | "adjustment";

const CONFIG = {
  transfer: {
    title: "Inventory Transfer",
    copy: "Move stock between locations — shelf to warehouse, branch to branch.",
    kicker: "Transaction · Stock",
    buttonLabel: "New transfer",
  },
  adjustment: {
    title: "Inventory Adjustment",
    copy: "Correct stock for damage, expiry, giveaways or count variances.",
    kicker: "Transaction · Stock",
    buttonLabel: "New adjustment",
  },
} as const;

export function InventoryWorkflow({ variant }: { variant: Variant }) {
  const config = CONFIG[variant];
  const [levels, setLevels] = useState<StockLevel[] | null>(null);
  const [moves, setMoves] = useState<StockMovement[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [from, setFrom] = useState("Main store");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [staff, setStaff] = useState("");

  async function load() {
    const [rows, movements] = await Promise.all([listStockLevels(), listMovements()]);
    setLevels(rows);
    setMoves(movements);
  }

  useEffect(() => {
    load().catch((err) => {
      toast.error(err instanceof Error ? err.message : "Could not load stock");
      setLevels([]);
    });
  }, []);

  const relevant = useMemo(
    () => moves.filter((move) => (variant === "transfer" ? move.type === "transfer" : move.type !== "transfer")),
    [moves, variant],
  );

  if (!levels) return <ManagerSkeleton variant="table" />;

  async function submit() {
    setBusy(true);
    try {
      const input: MovementInput = {
        type: variant === "transfer" ? "transfer" : "adjustment",
        itemId,
        reason: reason || undefined,
        staff: staff || undefined,
      };
      if (variant === "transfer") {
        input.from = from;
        input.to = to;
        input.quantity = Math.max(1, parseInt(quantity, 10) || 1);
      } else {
        const parsed = parseInt(quantity, 10);
        if (!Number.isFinite(parsed)) throw new Error("Enter a signed quantity, e.g. -2 or +5");
        input.quantity = parsed;
      }
      await recordMovement(input);
      await load();
      setOpen(false);
      setQuantity(variant === "transfer" ? "1" : "");
      setReason("");
      toast.success(`${config.title} recorded.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not record movement");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <SetupHeader
        kicker={config.kicker}
        title={config.title}
        copy={config.copy}
        action={<PrimaryButton onClick={() => setOpen(true)}>{config.buttonLabel}</PrimaryButton>}
      />
      <DataTable columns={["When", "Item", "Qty", "Detail", "By"]}>
        {relevant.length === 0 ? (
          <tr>
            <td className="px-4 py-6 text-pos-ink-faint" colSpan={5}>
              Nothing recorded yet.
            </td>
          </tr>
        ) : (
          [...relevant]
            .sort((a, b) => b.at.localeCompare(a.at))
            .slice(0, 200)
            .map((move) => (
              <tr key={move.id} className="border-b border-pos-border/60">
                <td className="whitespace-nowrap px-4 py-3">
                  {prettyDay(move.at.slice(0, 10))} ·{" "}
                  {new Date(move.at).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-4 py-3 font-medium">{move.itemName}</td>
                <td className={`px-4 py-3 font-semibold ${move.quantity < 0 ? "text-pos-danger" : "text-pos-success"}`}>
                  {move.quantity > 0 ? `+${move.quantity}` : move.quantity}
                </td>
                <td className="px-4 py-3 text-pos-ink-muted">
                  {move.type === "transfer"
                    ? `${move.from || "—"} → ${move.to || "—"}`
                    : move.reason || (typeof move.countedOnHand === "number" ? `Counted ${move.countedOnHand}` : "—")}
                </td>
                <td className="px-4 py-3">{move.staff || "—"}</td>
              </tr>
            ))
        )}
      </DataTable>

      <SlideOver
        open={open}
        title={`New ${config.title.toLowerCase()}`}
        onClose={() => setOpen(false)}
        footer={
          <PrimaryButton className="w-full" disabled={busy || !itemId} onClick={submit}>
            Post movement
          </PrimaryButton>
        }
      >
        <Field label="Item">
          <select className={fieldClass} value={itemId} onChange={(event) => setItemId(event.target.value)}>
            <option value="">Choose an item…</option>
            {levels.map((level) => (
              <option key={level.itemId} value={level.itemId}>
                {level.name} — {level.onHand} on hand
              </option>
            ))}
          </select>
        </Field>
        {variant === "transfer" ? (
          <>
            <Field label="Quantity">
              <input
                type="number"
                min="1"
                className={fieldClass}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </Field>
            <Field label="From location">
              <input className={fieldClass} value={from} onChange={(event) => setFrom(event.target.value)} />
            </Field>
            <Field label="To location">
              <input
                className={fieldClass}
                placeholder="e.g. Warehouse"
                value={to}
                onChange={(event) => setTo(event.target.value)}
              />
            </Field>
          </>
        ) : (
          <>
            <Field label="Signed quantity (+in / −out)">
              <input
                type="number"
                placeholder="e.g. -2 or +5"
                className={fieldClass}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </Field>
            <Field label="Reason">
              <select className={fieldClass} value={reason} onChange={(event) => setReason(event.target.value)}>
                <option value="">Choose a reason…</option>
                {["Damaged", "Expired", "Theft/loss", "Giveaway", "Count correction", "Supplier short-ship"].map(
                  (option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ),
                )}
              </select>
            </Field>
          </>
        )}
        <Field label="Recorded by">
          <input className={fieldClass} value={staff} onChange={(event) => setStaff(event.target.value)} />
        </Field>
      </SlideOver>
    </div>
  );
}
