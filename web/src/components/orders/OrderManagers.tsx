"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Check, Eye, Plus, Trash2, X } from "lucide-react";
import { toast } from "@/lib/toast";
import { listCatalog, type HqCatalogItem } from "@/lib/hq-api";
import { listDirectory, type DirectoryRecord } from "@/lib/hq-directory";
import { naira, prettyDay } from "@/lib/hq-ops";
import {
  ORDER_STATUS_LABEL,
  approveOrder,
  cancelOrder,
  closeOrder,
  deleteOrder,
  getOrder,
  getOrderSummary,
  listPurchaseOrders,
  receiveOrder,
  rejectOrder,
  saveOrder,
  sendOrder,
  submitOrder,
  type DocLine,
  type DocStatus,
  type OrderSummary,
  type TradeDoc,
} from "@/lib/hq-orders";
import { ManagerSkeleton } from "../Skeleton";
import {
  DataTable,
  Field,
  PrimaryButton,
  SetupHeader,
  SetupStat,
  fieldClass,
  secondaryButtonClass,
} from "../setup/SetupChrome";

const KICKER = "Analytics · Orders";

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

function useOrders() {
  const [orders, setOrders] = useState<TradeDoc[]>([]);
  const [ready, setReady] = useState(false);

  async function load() {
    setOrders(await listPurchaseOrders());
    setReady(true);
  }

  useEffect(() => {
    load().catch((err) => {
      toast.error(err, "Could not load orders.");
      setReady(true);
    });
  }, []);

  return { orders, ready, reload: load, setOrders };
}

function filterByBucket(orders: TradeDoc[], bucket?: string) {
  if (!bucket || bucket === "list") return orders;
  if (bucket === "drafts") return orders.filter((row) => row.status === "draft");
  if (bucket === "pending") return orders.filter((row) => row.status === "pending_approval");
  if (bucket === "approved") {
    return orders.filter((row) => ["approved", "open"].includes(row.status));
  }
  if (bucket === "receiving") {
    return orders.filter((row) => ["approved", "open", "partial"].includes(row.status));
  }
  if (bucket === "received") {
    return orders.filter((row) => ["received", "closed"].includes(row.status));
  }
  if (bucket === "cancelled") {
    return orders.filter((row) => ["cancelled", "rejected"].includes(row.status));
  }
  return orders;
}

const TITLES: Record<string, { title: string; copy: string }> = {
  list: {
    title: "All Orders",
    copy: "Purchase orders from draft through receipt — create, approve, send, and receive.",
  },
  drafts: {
    title: "Drafts",
    copy: "Orders still being prepared. Submit them for approval when the lines are ready.",
  },
  pending: {
    title: "Pending Approval",
    copy: "Orders waiting for a manager to approve or reject before they go to the vendor.",
  },
  approved: {
    title: "Approved & Sent",
    copy: "Approved orders and those already sent to the vendor.",
  },
  receiving: {
    title: "Receiving",
    copy: "Goods expected or partially received. Mark full or partial receipt against each line.",
  },
  received: {
    title: "Received & Closed",
    copy: "Orders that have been fully received or closed on the books.",
  },
  cancelled: {
    title: "Cancelled & Rejected",
    copy: "Orders that were cancelled or sent back for revision.",
  },
};

export function OrderListManager({ bucket = "list" }: { bucket?: string }) {
  const { orders, ready, reload } = useOrders();
  const [search, setSearch] = useState("");
  const meta = TITLES[bucket] ?? TITLES.list;

  const rows = useMemo(() => {
    const scoped = filterByBucket(orders, bucket);
    const query = search.trim().toLowerCase();
    const sorted = [...scoped].sort((a, b) => b.at.localeCompare(a.at));
    if (!query) return sorted;
    return sorted.filter((row) =>
      [row.number, row.party, row.status, row.notes ?? ""].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [orders, bucket, search]);

  if (!ready) return <ManagerSkeleton variant="table" />;

  return (
    <div>
      <SetupHeader
        kicker={KICKER}
        title={meta.title}
        copy={meta.copy}
        action={
          <Link
            href="/orders/new"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-pos-primary px-5 py-2.5 text-sm font-semibold text-white shadow-pos-primary transition hover:opacity-90"
          >
            <Plus size={16} />
            New order
          </Link>
        }
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <SetupStat label="In view" value={String(rows.length)} />
        <SetupStat
          label="Value"
          value={naira(rows.reduce((sum, row) => sum + row.totalMinor, 0))}
          tone="accent"
        />
        <SetupStat
          label="Pending approval"
          value={String(orders.filter((row) => row.status === "pending_approval").length)}
        />
      </div>
      <DataTable
        columns={["Number", "Vendor", "Date", "Expected", "Status", "Total", ""]}
        toolbar={
          <input
            className={`${fieldClass} max-w-sm`}
            placeholder="Search number, vendor, notes…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        }
      >
        {rows.length === 0 ? (
          <tr>
            <td className="px-4 py-6 text-pos-ink-faint" colSpan={7}>
              No orders in this view.
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr key={row.id} className="border-b border-pos-border/60 hover:bg-pos-surface-muted">
              <td className="px-4 py-3 font-mono text-[13px] font-medium">{row.number}</td>
              <td className="px-4 py-3">{row.party || "—"}</td>
              <td className="px-4 py-3 text-pos-ink-muted">{prettyDay(row.at.slice(0, 10))}</td>
              <td className="px-4 py-3 text-pos-ink-muted">
                {row.expectedAt ? prettyDay(row.expectedAt.slice(0, 10)) : "—"}
              </td>
              <td className="px-4 py-3">
                <StatusPill status={row.status} />
              </td>
              <td className="px-4 py-3 tabular-nums font-medium">{naira(row.totalMinor)}</td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <Link href={`/orders/preview/${row.id}`} className="text-sm text-pos-primary">
                  Preview
                </Link>
                <Link href={`/orders/edit/${row.id}`} className="ml-3 text-sm text-pos-primary">
                  Edit
                </Link>
                {bucket === "pending" ? (
                  <Link href="/orders/pending" className="ml-3 text-sm text-pos-ink-muted">
                    Review
                  </Link>
                ) : null}
              </td>
            </tr>
          ))
        )}
      </DataTable>
      {bucket === "list" ? (
        <p className="mt-3 text-xs text-pos-ink-faint">
          Tip: use Pending Approval to approve or reject, Receiving to mark goods in.
          <button type="button" className="ml-2 text-pos-primary" onClick={() => void reload()}>
            Refresh
          </button>
        </p>
      ) : null}
    </div>
  );
}

export function OrderEditor({ orderId }: { orderId?: string }) {
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
    async function boot() {
      const [vendorRows, items] = await Promise.all([
        listDirectory("vendors"),
        listCatalog(),
      ]);
      setVendors(vendorRows);
      setCatalog(items);
      if (orderId) {
        const doc = await getOrder(orderId);
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
      toast.error(err, "Could not open order.");
      setReady(true);
    });
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
    <div>
      <SetupHeader
        kicker={KICKER}
        title={isNew ? "New Order" : `Edit ${number || "order"}`}
        copy="Build the purchase order, save as draft, then submit for approval."
        action={
          <div className="flex flex-wrap gap-2">
            {id ? (
              <Link href={`/orders/preview/${id}`} className={secondaryButtonClass}>
                <Eye size={16} />
                Preview
              </Link>
            ) : null}
            <PrimaryButton disabled={busy || locked} onClick={() => void persist()}>
              Save draft
            </PrimaryButton>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <section className="space-y-4 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Vendor">
              <select
                className={fieldClass}
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
            </Field>
            <Field label="Or type vendor name">
              <input
                className={fieldClass}
                value={party}
                disabled={locked}
                onChange={(event) => setParty(event.target.value)}
              />
            </Field>
            <Field label="Expected delivery">
              <input
                type="date"
                className={fieldClass}
                value={expectedAt}
                disabled={locked}
                onChange={(event) => setExpectedAt(event.target.value)}
              />
            </Field>
            <Field label="Status">
              <div className="pt-2">
                <StatusPill status={status} />
              </div>
            </Field>
          </div>
          <Field label="Notes">
            <textarea
              rows={2}
              className={fieldClass}
              value={notes}
              disabled={locked}
              onChange={(event) => setNotes(event.target.value)}
            />
          </Field>

          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-pos-ink">Line items</h2>
            {!locked ? (
              <button
                type="button"
                className="text-sm text-pos-primary"
                onClick={() => setLines([...lines, emptyLine()])}
              >
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
                  className={fieldClass}
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
                  className={fieldClass}
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
                  className={fieldClass}
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
                    className={`${fieldClass} sm:col-span-4`}
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
          <section className="rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
            <p className="text-[13px] text-pos-ink-faint">Order total</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{naira(totalMinor)}</p>
            <p className="mt-1 text-sm text-pos-ink-muted">{lines.filter((l) => l.name.trim()).length} lines</p>
          </section>
          <section className="space-y-2 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
            <p className="mb-3 text-sm font-semibold text-pos-ink">Workflow</p>
            {!locked && (status === "draft" || status === "rejected") ? (
              <PrimaryButton
                className="w-full"
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
              </PrimaryButton>
            ) : null}
            {status === "approved" ? (
              <PrimaryButton
                className="w-full"
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
              </PrimaryButton>
            ) : null}
            {["approved", "open", "partial"].includes(status) && id ? (
              <button
                type="button"
                className={secondaryButtonClass + " w-full"}
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
              <PrimaryButton
                className="w-full"
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
              </PrimaryButton>
            ) : null}
            {id && !["received", "closed", "cancelled"].includes(status) ? (
              <button
                type="button"
                className={secondaryButtonClass + " w-full"}
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
                Cancel order
              </button>
            ) : null}
            {id && status === "draft" ? (
              <button
                type="button"
                className={secondaryButtonClass + " w-full text-pos-danger"}
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
                Delete draft
              </button>
            ) : null}
          </section>
        </aside>
      </div>
    </div>
  );
}

export function OrderPreview({ orderId }: { orderId: string }) {
  const [doc, setDoc] = useState<TradeDoc | null>(null);

  useEffect(() => {
    getOrder(orderId)
      .then(setDoc)
      .catch((err) => toast.error(err, "Could not load order."));
  }, [orderId]);

  if (!doc) return <ManagerSkeleton variant="table" />;

  return (
    <div>
      <SetupHeader
        kicker={KICKER}
        title={doc.number}
        copy={`Purchase order preview for ${doc.party || "vendor"}.`}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href={`/orders/edit/${doc.id}`} className={secondaryButtonClass}>
              Edit
            </Link>
            <PrimaryButton onClick={() => window.print()}>Print / PDF</PrimaryButton>
          </div>
        }
      />
      <article className="mx-auto max-w-3xl rounded-[24px] bg-pos-surface p-8 shadow-pos-md print:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-pos-border/60 pb-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pos-ink-faint">
              Purchase order
            </p>
            <h2 className="mt-2 font-mono text-2xl font-semibold tracking-tight">{doc.number}</h2>
            <div className="mt-3">
              <StatusPill status={doc.status} />
            </div>
          </div>
          <div className="text-right text-sm text-pos-ink-muted">
            <p>Created {prettyDay(doc.at.slice(0, 10))}</p>
            {doc.expectedAt ? <p>Expected {prettyDay(doc.expectedAt.slice(0, 10))}</p> : null}
            {doc.approvedBy ? <p>Approved by {doc.approvedBy}</p> : null}
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-pos-ink-faint">
              Vendor
            </p>
            <p className="mt-1 text-lg font-medium">{doc.party || "—"}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-pos-ink-faint">
              Notes
            </p>
            <p className="mt-1 text-sm text-pos-ink-muted">{doc.notes || "—"}</p>
          </div>
        </div>
        <table className="mt-8 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-pos-border text-[11px] uppercase tracking-[0.08em] text-pos-ink-faint">
              <th className="py-2 font-semibold">Item</th>
              <th className="py-2 font-semibold">Qty</th>
              <th className="py-2 font-semibold">Received</th>
              <th className="py-2 font-semibold">Unit</th>
              <th className="py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {doc.lines.map((line, index) => (
              <tr key={index} className="border-b border-pos-border/50">
                <td className="py-3 font-medium">{line.name}</td>
                <td className="py-3 tabular-nums">{line.quantity}</td>
                <td className="py-3 tabular-nums">{line.receivedQty ?? 0}</td>
                <td className="py-3 tabular-nums">{naira(line.unitPriceMinor)}</td>
                <td className="py-3 text-right tabular-nums">
                  {naira(line.quantity * line.unitPriceMinor)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-6 flex justify-end">
          <div className="text-right">
            <p className="text-sm text-pos-ink-muted">Total</p>
            <p className="text-2xl font-semibold tabular-nums">{naira(doc.totalMinor)}</p>
          </div>
        </div>
        {doc.rejectionReason ? (
          <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            Rejected: {doc.rejectionReason}
          </p>
        ) : null}
      </article>
    </div>
  );
}

export function OrderApprovalManager() {
  const { orders, ready, reload } = useOrders();
  const [reason, setReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const pending = useMemo(
    () => orders.filter((row) => row.status === "pending_approval").sort((a, b) => b.at.localeCompare(a.at)),
    [orders],
  );

  if (!ready) return <ManagerSkeleton variant="table" />;

  return (
    <div>
      <SetupHeader
        kicker={KICKER}
        title="Pending Approval"
        copy="Review submitted purchase orders. Approve to release, or reject with a reason."
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <SetupStat label="Waiting" value={String(pending.length)} tone="accent" />
        <SetupStat
          label="Value"
          value={naira(pending.reduce((sum, row) => sum + row.totalMinor, 0))}
        />
      </div>
      {pending.length === 0 ? (
        <section className="rounded-[24px] bg-pos-surface p-8 text-sm text-pos-ink-muted shadow-pos-md">
          Nothing waiting for approval.
        </section>
      ) : (
        <div className="space-y-4">
          {pending.map((row) => (
            <section key={row.id} className="rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-sm font-semibold">{row.number}</p>
                  <p className="mt-1 text-lg font-medium">{row.party}</p>
                  <p className="mt-1 text-sm text-pos-ink-muted">
                    {row.lines.length} lines · {naira(row.totalMinor)} · Submitted{" "}
                    {row.submittedAt ? prettyDay(row.submittedAt.slice(0, 10)) : "—"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/orders/preview/${row.id}`} className={secondaryButtonClass}>
                    <Eye size={16} />
                    Preview
                  </Link>
                  <PrimaryButton
                    disabled={busyId === row.id}
                    onClick={async () => {
                      setBusyId(row.id);
                      try {
                        await approveOrder(row.id, "Approver");
                        toast.success("Order approved.");
                        await reload();
                      } catch (err) {
                        toast.error(err, "Could not approve.");
                      } finally {
                        setBusyId(null);
                      }
                    }}
                  >
                    <Check size={16} />
                    Approve
                  </PrimaryButton>
                  <button
                    type="button"
                    className={secondaryButtonClass}
                    disabled={busyId === row.id}
                    onClick={async () => {
                      setBusyId(row.id);
                      try {
                        await rejectOrder(row.id, reason || "Needs revision", "Approver");
                        toast.success("Order rejected.");
                        setReason("");
                        await reload();
                      } catch (err) {
                        toast.error(err, "Could not reject.");
                      } finally {
                        setBusyId(null);
                      }
                    }}
                  >
                    <X size={16} />
                    Reject
                  </button>
                </div>
              </div>
              <ul className="mt-4 space-y-1 border-t border-pos-border/60 pt-4 text-sm text-pos-ink-muted">
                {row.lines.map((line, index) => (
                  <li key={index} className="flex justify-between gap-4">
                    <span>
                      {line.name} × {line.quantity}
                    </span>
                    <span className="tabular-nums">{naira(line.quantity * line.unitPriceMinor)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <Field label="Rejection reason (used for Reject)">
            <input
              className={fieldClass}
              value={reason}
              placeholder="e.g. Over budget — revise quantities"
              onChange={(event) => setReason(event.target.value)}
            />
          </Field>
        </div>
      )}
    </div>
  );
}

export function OrderReceivingManager() {
  const { orders, ready, reload } = useOrders();
  const rows = useMemo(
    () =>
      orders
        .filter((row) => ["approved", "open", "partial"].includes(row.status))
        .sort((a, b) => b.at.localeCompare(a.at)),
    [orders],
  );

  if (!ready) return <ManagerSkeleton variant="table" />;

  return (
    <div>
      <SetupHeader
        kicker={KICKER}
        title="Receiving"
        copy="Mark goods received against open purchase orders — full receipt or leave partial."
      />
      <DataTable columns={["Number", "Vendor", "Status", "Expected", "Total", ""]}>
        {rows.length === 0 ? (
          <tr>
            <td className="px-4 py-6 text-pos-ink-faint" colSpan={6}>
              No orders awaiting goods.
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr key={row.id} className="border-b border-pos-border/60">
              <td className="px-4 py-3 font-mono text-[13px]">{row.number}</td>
              <td className="px-4 py-3">{row.party}</td>
              <td className="px-4 py-3">
                <StatusPill status={row.status} />
              </td>
              <td className="px-4 py-3 text-pos-ink-muted">
                {row.expectedAt ? prettyDay(row.expectedAt.slice(0, 10)) : "—"}
              </td>
              <td className="px-4 py-3 tabular-nums">{naira(row.totalMinor)}</td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <Link href={`/orders/preview/${row.id}`} className="text-sm text-pos-primary">
                  Preview
                </Link>
                <button
                  type="button"
                  className="ml-3 text-sm text-pos-primary"
                  onClick={async () => {
                    try {
                      await receiveOrder(row.id, { full: true });
                      toast.success("Fully received.");
                      await reload();
                    } catch (err) {
                      toast.error(err, "Could not receive.");
                    }
                  }}
                >
                  Receive all
                </button>
              </td>
            </tr>
          ))
        )}
      </DataTable>
    </div>
  );
}

export function OrderSummaryManager() {
  const [summary, setSummary] = useState<OrderSummary | null>(null);

  useEffect(() => {
    getOrderSummary()
      .then(setSummary)
      .catch((err) => toast.error(err, "Could not load summary."));
  }, []);

  if (!summary) return <ManagerSkeleton variant="table" />;

  const statusRows = Object.entries(summary.byStatus).sort((a, b) => b[1].totalMinor - a[1].totalMinor);

  return (
    <div>
      <SetupHeader
        kicker={KICKER}
        title="Order Summary"
        copy="Totals by status and vendor across all purchase orders."
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Orders" value={String(summary.count)} />
        <SetupStat label="Pipeline value" value={naira(summary.totalMinor)} tone="accent" />
        <SetupStat label="Pending approval" value={String(summary.pendingApproval)} />
        <SetupStat label="Awaiting receive" value={String(summary.awaitingReceive)} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <DataTable columns={["Status", "Count", "Value"]}>
          {statusRows.map(([status, stats]) => (
            <tr key={status} className="border-b border-pos-border/60">
              <td className="px-4 py-3">
                <StatusPill status={status as DocStatus} />
              </td>
              <td className="px-4 py-3 tabular-nums">{stats.count}</td>
              <td className="px-4 py-3 tabular-nums">{naira(stats.totalMinor)}</td>
            </tr>
          ))}
        </DataTable>
        <DataTable columns={["Vendor", "Orders", "Value"]}>
          {summary.topVendors.length === 0 ? (
            <tr>
              <td className="px-4 py-6 text-pos-ink-faint" colSpan={3}>
                No vendor spend yet.
              </td>
            </tr>
          ) : (
            summary.topVendors.map((row) => (
              <tr key={row.party} className="border-b border-pos-border/60">
                <td className="px-4 py-3 font-medium">{row.party}</td>
                <td className="px-4 py-3 tabular-nums">{row.count}</td>
                <td className="px-4 py-3 tabular-nums">{naira(row.totalMinor)}</td>
              </tr>
            ))
          )}
        </DataTable>
      </div>
    </div>
  );
}
