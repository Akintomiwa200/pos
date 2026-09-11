"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Eye, Plus, Trash2, X, XCircle } from "lucide-react";
import { toast } from "@/lib/toast";
import { listCatalog, type HqCatalogItem } from "@/lib/hq-api";
import { listDirectory, type DirectoryRecord } from "@/lib/hq-directory";
import { naira } from "@/lib/hq-ops";
import {
  ORDER_STATUS_LABEL,
  cancelOrder,
  closeOrder,
  deleteOrder,
  getOrder,
  receiveOrder,
  saveOrder,
  sendOrder,
  submitOrder,
  type DocLine,
  type DocStatus,
  type TradeDoc,
} from "@/lib/hq-orders";
import { ManagerSkeleton } from "../Skeleton";

const STATUS_PILL: Record<string, string> = {
  draft: "bg-pos-surface-muted text-pos-ink-muted",
  pending_approval: "bg-amber-50 text-amber-800",
  approved: "bg-pos-primary-soft text-pos-primary",
  open: "bg-sky-50 text-sky-800",
  partial: "bg-amber-50 text-amber-800",
  received: "bg-emerald-50 text-emerald-700",
  closed: "bg-pos-surface-muted text-pos-ink-muted",
  cancelled: "bg-red-50 text-red-700",
  rejected: "bg-red-50 text-red-700",
};

type LineDraft = { itemId: string; name: string; quantity: string; unitPrice: string };

const emptyLine = (): LineDraft => ({ itemId: "", name: "", quantity: "1", unitPrice: "" });

function StatusPill({ status }: { status: DocStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_PILL[status] ?? STATUS_PILL.draft}`}
    >
      {ORDER_STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function OrderEditorPage({ orderId }: { orderId?: string }) {
  const router = useRouter();
  const isNew = !orderId;
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [vendors, setVendors] = useState<DirectoryRecord[]>([]);
  const [catalog, setCatalog] = useState<HqCatalogItem[]>([]);
  const [id, setId] = useState<string | undefined>(orderId);
  const [number, setNumber] = useState("");
  const [party, setParty] = useState("");
  const [status, setStatus] = useState<DocStatus>("draft");
  const [expectedAt, setExpectedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);

  useEffect(() => {
    let mounted = true;
    async function boot() {
      const [vendorRows, items] = await Promise.all([listDirectory("vendors"), listCatalog()]);
      if (!mounted) return;
      setVendors(vendorRows);
      setCatalog(items);
      if (orderId) {
        const doc = await getOrder(orderId);
        if (!mounted) return;
        setId(doc.id);
        setNumber(doc.number);
        setParty(doc.party);
        setStatus(doc.status);
        setExpectedAt(doc.expectedAt?.slice(0, 10) ?? "");
        setNotes(doc.notes ?? "");
        setLines(
          doc.lines.map((line) => ({
            itemId: line.itemId,
            name: line.name,
            quantity: String(line.quantity),
            unitPrice: (line.unitPriceMinor / 100).toFixed(2),
          })),
        );
      }
      setReady(true);
    }
    boot().catch((err) => {
      if (!mounted) return;
      toast.error(err, "Could not open order.");
      setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, [orderId]);

  const totalMinor = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const qty = Number(line.quantity) || 0;
        const price = Math.round((Number(line.unitPrice) || 0) * 100);
        return sum + qty * price;
      }, 0),
    [lines],
  );

  const locked = ["received", "closed", "cancelled"].includes(status);

  async function persist(nextStatus?: DocStatus) {
    const mapped: DocLine[] = lines
      .filter((line) => line.name.trim())
      .map((line) => ({
        itemId: line.itemId,
        name: line.name.trim(),
        quantity: Math.max(1, Math.round(Number(line.quantity) || 1)),
        unitPriceMinor: Math.max(0, Math.round((Number(line.unitPrice) || 0) * 100)),
      }));
    if (!party.trim()) {
      toast.error("Select or enter a vendor.");
      return null;
    }
    if (!mapped.length) {
      toast.error("Add at least one line.");
      return null;
    }
    setBusy(true);
    try {
      const saved = await saveOrder({
        id,
        number: number || undefined,
        party,
        status: nextStatus ?? status,
        expectedAt: expectedAt || undefined,
        notes,
        lines: mapped,
        createdBy: "HQ",
      });
      setId(saved.id);
      setNumber(saved.number);
      setStatus(saved.status);
      toast.success("Order saved.");
      return saved;
    } catch (err) {
      toast.error(err, "Could not save order.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <ManagerSkeleton variant="table" />;

  return (
    <div className="pb-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">Analytics · Orders</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">
            {isNew ? "New purchase order" : `Edit ${number || "order"}`}
          </h1>
          <p className="mt-1.5 text-sm text-pos-ink-muted">
            Build the order, save it as a draft, then submit it for approval.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {id ? (
            <Link
              href={`/orders/${id}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-pos-border bg-pos-surface px-4 py-2.5 text-sm font-medium text-pos-ink transition hover:bg-pos-surface-muted"
            >
              <Eye size={15} />
              View
            </Link>
          ) : null}
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full bg-pos-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            disabled={busy || locked}
            onClick={() => void persist()}
          >
            Save draft
          </button>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <section className="space-y-4 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-pos-ink-muted">Vendor</label>
              <select
                className="w-full rounded-2xl border-0 bg-pos-surface-muted px-4 py-3 text-sm shadow-inner outline-none ring-1 ring-pos-border/60 focus:ring-2 focus:ring-pos-primary/60"
                value={vendors.some((v) => v.name === party) ? party : ""}
                disabled={locked}
                onChange={(event) => setParty(event.target.value)}
              >
                <option value="">Select vendor…</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.name}>
                    {vendor.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-pos-ink-muted">Or type vendor name</label>
              <input
                className="w-full rounded-2xl border-0 bg-pos-surface-muted px-4 py-3 text-sm shadow-inner outline-none ring-1 ring-pos-border/60 focus:ring-2 focus:ring-pos-primary/60"
                value={party}
                disabled={locked}
                onChange={(event) => setParty(event.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-pos-ink-muted">Expected delivery</label>
              <input
                type="date"
                className="w-full rounded-2xl border-0 bg-pos-surface-muted px-4 py-3 text-sm shadow-inner outline-none ring-1 ring-pos-border/60 focus:ring-2 focus:ring-pos-primary/60"
                value={expectedAt}
                disabled={locked}
                onChange={(event) => setExpectedAt(event.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-pos-ink-muted">Status</label>
              <div className="pt-2">
                <StatusPill status={status} />
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-pos-ink-muted">Notes</label>
            <textarea
              rows={2}
              className="w-full rounded-2xl border-0 bg-pos-surface-muted px-4 py-3 text-sm shadow-inner outline-none ring-1 ring-pos-border/60 focus:ring-2 focus:ring-pos-primary/60"
              value={notes}
              disabled={locked}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-pos-ink">Line items</h2>
            {!locked ? (
              <button type="button" className="text-sm text-pos-primary" onClick={() => setLines([...lines, emptyLine()])}>
                + Add line
              </button>
            ) : null}
          </div>

          <div className="space-y-3">
            {lines.map((line, index) => (
              <div
                key={index}
                className="grid gap-2 rounded-2xl bg-pos-surface-muted p-3 sm:grid-cols-[1.4fr_0.5fr_0.7fr_auto]"
              >
                <select
                  className="w-full rounded-2xl border-0 bg-pos-surface px-3 py-2.5 text-sm shadow-inner outline-none ring-1 ring-pos-border/60 focus:ring-2 focus:ring-pos-primary/60"
                  value={line.itemId}
                  disabled={locked}
                  onChange={(event) => {
                    const item = catalog.find((row) => row.id === event.target.value);
                    const next = [...lines];
                    next[index] = {
                      itemId: event.target.value,
                      name: item?.name ?? line.name,
                      quantity: line.quantity,
                      unitPrice: item ? (item.priceMinor / 100).toFixed(2) : line.unitPrice,
                    };
                    setLines(next);
                  }}
                >
                  <option value="">Catalog item or custom…</option>
                  {catalog.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <input
                  className="w-full rounded-2xl border-0 bg-pos-surface px-3 py-2.5 text-sm shadow-inner outline-none ring-1 ring-pos-border/60 focus:ring-2 focus:ring-pos-primary/60"
                  placeholder="Qty"
                  value={line.quantity}
                  disabled={locked}
                  onChange={(event) => {
                    const next = [...lines];
                    next[index] = { ...line, quantity: event.target.value };
                    setLines(next);
                  }}
                />
                <input
                  className="w-full rounded-2xl border-0 bg-pos-surface px-3 py-2.5 text-sm shadow-inner outline-none ring-1 ring-pos-border/60 focus:ring-2 focus:ring-pos-primary/60"
                  placeholder="Unit ₦"
                  value={line.unitPrice}
                  disabled={locked}
                  onChange={(event) => {
                    const next = [...lines];
                    next[index] = { ...line, unitPrice: event.target.value };
                    setLines(next);
                  }}
                />
                {!locked ? (
                  <button
                    type="button"
                    className="rounded-xl px-2 text-pos-ink-faint hover:text-pos-danger"
                    onClick={() => setLines(lines.filter((_, i) => i !== index))}
                  >
                    <Trash2 size={16} />
                  </button>
                ) : (
                  <span />
                )}
                {!line.itemId ? (
                  <input
                    className="w-full rounded-2xl border-0 bg-pos-surface px-3 py-2.5 text-sm shadow-inner outline-none ring-1 ring-pos-border/60 focus:ring-2 focus:ring-pos-primary/60 sm:col-span-4"
                    placeholder="Custom item name"
                    value={line.name}
                    disabled={locked}
                    onChange={(event) => {
                      const next = [...lines];
                      next[index] = { ...line, name: event.target.value };
                      setLines(next);
                    }}
                  />
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-[24px] bg-pos-primary-soft p-5 shadow-pos-md">
            <p className="text-[13px] text-pos-primary">Order total</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-pos-ink">{naira(totalMinor)}</p>
            <p className="mt-1 text-sm text-pos-ink-muted">
              {lines.filter((l) => l.name.trim()).length} lines
            </p>
          </section>
          <section className="space-y-2 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
            <p className="mb-3 text-sm font-semibold text-pos-ink">Workflow</p>
            {!locked && (status === "draft" || status === "rejected") ? (
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-pos-success px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                disabled={busy}
                onClick={async () => {
                  const saved = await persist("draft");
                  if (!saved) return;
                  try {
                    await submitOrder(saved.id);
                    toast.success("Submitted for approval.");
                    router.push("/orders/pending");
                  } catch (err) {
                    toast.error(err, "Could not submit.");
                  }
                }}
              >
                Submit for approval
              </button>
            ) : null}
            {status === "approved" ? (
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-pos-primary px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                disabled={busy}
                onClick={async () => {
                  if (!id) return;
                  try {
                    await sendOrder(id);
                    toast.success("Marked as sent to vendor.");
                    router.push("/orders/receiving");
                  } catch (err) {
                    toast.error(err, "Could not send order.");
                  }
                }}
              >
                Mark sent to vendor
              </button>
            ) : null}
            {["approved", "open", "partial"].includes(status) && id ? (
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-full border border-pos-border bg-pos-surface px-4 py-3 text-sm font-medium text-pos-ink transition hover:bg-pos-surface-muted"
                onClick={async () => {
                  try {
                    await receiveOrder(id, { full: true });
                    toast.success("Marked fully received.");
                    router.push("/orders/received");
                  } catch (err) {
                    toast.error(err, "Could not receive.");
                  }
                }}
              >
                Receive all goods
              </button>
            ) : null}
            {status === "received" && id ? (
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-pos-primary px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                onClick={async () => {
                  try {
                    await closeOrder(id);
                    toast.success("Order closed.");
                    router.push("/orders/received");
                  } catch (err) {
                    toast.error(err, "Could not close.");
                  }
                }}
              >
                Close order
              </button>
            ) : null}
            {id && !["received", "closed", "cancelled"].includes(status) ? (
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-full border border-pos-border bg-pos-surface px-4 py-3 text-sm font-medium text-pos-ink transition hover:bg-pos-surface-muted"
                onClick={async () => {
                  try {
                    await cancelOrder(id);
                    toast.success("Order cancelled.");
                    router.push("/orders/cancelled");
                  } catch (err) {
                    toast.error(err, "Could not cancel.");
                  }
                }}
              >
                <XCircle size={15} className="text-pos-danger" />
                Cancel order
              </button>
            ) : null}
            {id && status === "draft" ? (
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-full border border-red-300 bg-white px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                onClick={async () => {
                  try {
                    await deleteOrder(id);
                    toast.success("Order deleted.");
                    router.push("/orders/list");
                  } catch (err) {
                    toast.error(err, "Could not delete.");
                  }
                }}
              >
                <X size={15} />
                Delete draft
              </button>
            ) : null}
          </section>
          <p className="flex items-start gap-2 px-1 text-xs text-pos-ink-faint">
            <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-pos-success" />
            Saving keeps the order as a draft — nothing reaches a vendor until approval and release.
          </p>
        </aside>
      </div>
    </div>
  );
}