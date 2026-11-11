import { useState } from "react";
import {
  Bookmark,
  Clock3,
  ReceiptText,
  RotateCcw,
  Trash2,
  Undo2,
} from "lucide-react";
import type { HeldTicket } from "../../lib/holds";
import { holdMinutesLeft } from "../../lib/holds";
import { formatMoney } from "../../lib/types";
import type { StoreSettings } from "../../lib/store-settings";
import type { SaleReceipt } from "../../lib/receipt";
import { loadLocalSales } from "../../lib/sales";
import { remainingRefundLines } from "../../lib/refunds";

type Props = {
  holds: HeldTicket[];
  settings: StoreSettings;
  tillKey: string;
  onRecall: (hold: HeldTicket) => void;
  onDelete: (id: string) => void;
  onRefund: (sale: SaleReceipt) => void;
};

function when(value: string) {
  const date = new Date(value);
  return `${date.toLocaleDateString("en-GB")} ${date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })}`;
}

export function SavedScreen({
  holds,
  settings,
  tillKey,
  onRecall,
  onDelete,
  onRefund,
}: Props) {
  const [tab, setTab] = useState<"holds" | "sales">("holds");
  const currency = settings.currency || "NGN";
  const sales = loadLocalSales().filter(
    (sale) => sale.kind !== "refund" && sale.totalMinor > 0,
  );

  const visibleHolds = holds
    .filter((hold) =>
      settings.showHoldsOnAllTills ? true : hold.tillKey === tillKey,
    )
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <section className="saved-screen">
      <header className="saved-head">
        <div>
          <h1>Saved</h1>
          <p>Parked orders and tickets that can still be refunded.</p>
        </div>
        <div className="saved-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === "holds"}
            className={tab === "holds" ? "on" : ""}
            onClick={() => setTab("holds")}
          >
            <Bookmark size={16} /> Held orders
            <span>{visibleHolds.length}</span>
          </button>
          <button
            role="tab"
            aria-selected={tab === "sales"}
            className={tab === "sales" ? "on" : ""}
            onClick={() => setTab("sales")}
          >
            <ReceiptText size={16} /> Recent sales
          </button>
        </div>
      </header>

      {tab === "holds" ? (
        visibleHolds.length === 0 ? (
          <div className="saved-empty">
            <Bookmark size={26} strokeWidth={1.6} />
            <h3>No parked orders</h3>
            <p>
              Add items to a ticket, then use <strong>Hold</strong> to park it.
              Held orders can be recalled here or on another till.
            </p>
          </div>
        ) : (
          <div className="saved-list">
            {visibleHolds.map((hold) => {
              const left = holdMinutesLeft(hold);
              const expired = left != null && left <= 0;
              const total = hold.lines.reduce(
                (sum, line) => sum + line.unitPriceMinor * line.quantity,
                0,
              );
              return (
                <article className="saved-card" key={hold.id}>
                  <div className="saved-card-main">
                    <div className="saved-avatar">
                      {hold.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="saved-card-body">
                      <div className="saved-card-top">
                        <strong>{hold.name}</strong>
                        <span className="saved-total">
                          {formatMoney(total - hold.discountMinor, currency)}
                        </span>
                      </div>
                      <span className="saved-meta">
                        {hold.lines.length} item
                        {hold.lines.length === 1 ? "" : "s"} · Parked{" "}
                        {when(hold.createdAt)}
                        {hold.cashierName ? ` by ${hold.cashierName}` : ""}
                      </span>
                      <span className={`saved-expiry ${expired ? "expired" : ""}`}>
                        <Clock3 size={13} />
                        {hold.expiresAt
                          ? expired
                            ? "Expired — recall to review before selling"
                            : `${left} min left`
                          : "No expiry"}
                        {!settings.showHoldsOnAllTills ? ` · ${hold.tillKey}` : ""}
                      </span>
                      {hold.note ? (
                        <p className="saved-note">{hold.note}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="saved-card-actions">
                    <button
                      className="saved-delete"
                      onClick={() => {
                        if (window.confirm(`Delete the held order for ${hold.name}?`)) {
                          onDelete(hold.id);
                        }
                      }}
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                    <button className="saved-recall" onClick={() => onRecall(hold)}>
                      <Undo2 size={16} /> Recall
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )
      ) : sales.length === 0 ? (
        <div className="saved-empty">
          <ReceiptText size={26} strokeWidth={1.6} />
          <h3>No sales on this till yet</h3>
          <p>Completed tickets appear here so they can be refunded later.</p>
        </div>
      ) : (
        <div className="saved-list">
          {sales.map((sale) => {
            const remaining = remainingRefundLines(sale);
            const refundable = remaining.length > 0;
            return (
              <article className="saved-card" key={sale.ticketId}>
                <div className="saved-card-main">
                  <div className="saved-avatar sale">
                    <ReceiptText size={18} />
                  </div>
                  <div className="saved-card-body">
                    <div className="saved-card-top">
                      <strong>{sale.ticketId}</strong>
                      <span className="saved-total">
                        {formatMoney(sale.totalMinor, currency)}
                      </span>
                    </div>
                    <span className="saved-meta">
                      {when(sale.paidAt)} · {sale.lines.length} item
                      {sale.lines.length === 1 ? "" : "s"} · {sale.cashierName}
                    </span>
                    <span
                      className={`saved-expiry ${refundable ? "" : "expired"}`}
                    >
                      <RotateCcw size={13} />
                      {refundable
                        ? `${remaining.length} line${
                            remaining.length === 1 ? "" : "s"
                          } still refundable`
                        : "Fully refunded"}
                    </span>
                  </div>
                </div>
                <div className="saved-card-actions">
                  <button
                    className="saved-recall"
                    disabled={!refundable}
                    onClick={() => onRefund(sale)}
                  >
                    <RotateCcw size={16} /> Refund
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
