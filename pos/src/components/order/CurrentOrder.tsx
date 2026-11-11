import type { CartLine } from "../../lib/types";
import { computeLineTotals, formatMoney } from "../../lib/types";
import { formatPricePer } from "../../lib/units";
import { useStoreSettings } from "../../lib/use-store-settings";
import type { StaffUser } from "../../lib/staff";
import { Bookmark, Minus, Percent, Plus, ShoppingBag, Trash2 } from "lucide-react";

type Props = {
  staff: StaffUser;
  tableLabel?: string;
  lines: CartLine[];
  discountMinor?: number;
  onQty: (id: string, delta: number) => void;
  onPrice?: (id: string, unitPriceMinor: number) => void;
  onDiscount?: () => void;
  onHold?: () => void;
  onContinue: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
};

export function CurrentOrder({
  staff,
  tableLabel,
  lines,
  discountMinor = 0,
  onQty,
  onPrice,
  onDiscount,
  onHold,
  onContinue,
  continueLabel = "Continue",
  continueDisabled = false,
}: Props) {
  const rates = useStoreSettings();
  const totals = computeLineTotals(lines, rates, discountMinor);

  return (
    <aside className="order-wrap">
      <div className="order">
        <h2>Current Order</h2>
        {tableLabel ? <p className="order-table">{tableLabel}</p> : null}
        <div className="staff">
          <img src={staff.avatar} alt="" />
          <span>{staff.name}</span>
        </div>

        <div className="order-lines">
          {lines.length === 0 ? (
            <div className="order-empty">
              <div className="order-empty-icon" aria-hidden="true">
                <ShoppingBag size={22} strokeWidth={1.8} />
              </div>
              <h3>Ticket is empty</h3>
              <p>Tap a product, or search by name, SKU, or barcode to start this sale.</p>
            </div>
          ) : (
            lines.map((line) => (
              <div className="line" key={line.id}>
                {line.image ? (
                  <img src={line.image} alt="" />
                ) : (
                  <div className="card-img-fallback line-thumb-fallback">
                    {line.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="line-body">
                  <div className="line-top">
                    <div className="line-name">
                      {line.isCombo ? (
                        <span className="combo-badge">COMBO</span>
                      ) : null}
                      {line.name}
                    </div>
                    <button
                      type="button"
                      className="line-del"
                      onClick={() => onQty(line.id, -line.quantity)}
                      aria-label={`Remove ${line.name}`}
                    >
                      <Trash2 size={16} strokeWidth={1.8} />
                    </button>
                  </div>
                  <div className="line-unit">
                    {rates.allowPriceOverride && onPrice ? (
                      <input
                        className="line-price-edit"
                        type="number"
                        min={0}
                        step={0.01}
                        defaultValue={(line.unitPriceMinor / 100).toFixed(2)}
                        key={`${line.id}-${line.unitPriceMinor}`}
                        aria-label={`Unit price for ${line.name}`}
                        onBlur={(event) => {
                          const naira = Number(event.target.value);
                          if (!Number.isFinite(naira)) return;
                          onPrice(line.id, Math.max(0, Math.round(naira * 100)));
                        }}
                      />
                    ) : (
                      <>
                        {formatMoney(line.unitPriceMinor)}{" "}
                        {formatPricePer(line.unit ?? "each", line.unitLabel)}
                      </>
                    )}
                  </div>
                  <div className="line-bottom">
                    <div className="line-stepper">
                      <button
                        type="button"
                        onClick={() => onQty(line.id, -1)}
                        aria-label={`Decrease ${line.name}`}
                      >
                        <Minus size={12} strokeWidth={2.4} />
                      </button>
                      <span>{line.quantity}</span>
                      <button
                        type="button"
                        onClick={() => onQty(line.id, 1)}
                        aria-label={`Increase ${line.name}`}
                      >
                        <Plus size={12} strokeWidth={2.4} />
                      </button>
                    </div>
                    <div className="line-price">
                      {formatMoney(line.unitPriceMinor * line.quantity)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {lines.length > 0 && (onDiscount || onHold) ? (
          <div className="order-actions">
            {onDiscount ? (
              <button
                type="button"
                className={`order-action ${discountMinor > 0 ? "on" : ""}`}
                onClick={onDiscount}
              >
                <Percent size={16} strokeWidth={2} />
                {discountMinor > 0
                  ? `Discount ${formatMoney(discountMinor)}`
                  : "Discount"}
              </button>
            ) : null}
            {onHold ? (
              <button type="button" className="order-action" onClick={onHold}>
                <Bookmark size={16} strokeWidth={2} />
                Hold
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="summary">
          <div className="row">
            <span>Subtotal</span>
            <span>{formatMoney(totals.subtotalMinor)}</span>
          </div>
          <div className={`row ${totals.discountMinor > 0 ? "discount" : ""}`}>
            <span>Discount</span>
            <span>
              {totals.discountMinor > 0
                ? `-${formatMoney(totals.discountMinor)}`
                : formatMoney(0)}
            </span>
          </div>
          {rates.applyServiceCharge ? (
            <div className="row">
              <span>Service Charge ({rates.servicePercent}%)</span>
              <span>{formatMoney(totals.serviceMinor)}</span>
            </div>
          ) : null}
          {rates.includeVatBreakdown || !rates.pricesIncludeVat
            ? totals.vatSlices.map((slice) => (
                <div className="row" key={slice.ratePercent}>
                  <span>VAT ({slice.ratePercent}%)</span>
                  <span>{formatMoney(slice.taxMinor)}</span>
                </div>
              ))
            : null}
        </div>

        <div className="total-box">
          <span>Total</span>
          <span>{formatMoney(totals.totalMinor)}</span>
        </div>

        <button
          className="continue"
          onClick={onContinue}
          disabled={continueDisabled}
        >
          {continueLabel}
        </button>
      </div>
    </aside>
  );
}
