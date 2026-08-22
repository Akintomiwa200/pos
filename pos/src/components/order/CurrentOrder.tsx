import type { CartLine } from "../../lib/types";
import { computeTotals, formatMoney } from "../../lib/types";
import { formatPricePer } from "../../lib/units";
import { useStoreSettings } from "../../lib/use-store-settings";
import type { StaffUser } from "../../lib/staff";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

type Props = {
  staff: StaffUser;
  tableLabel?: string;
  lines: CartLine[];
  onQty: (id: string, delta: number) => void;
  onPrice?: (id: string, unitPriceMinor: number) => void;
  onContinue: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
};

export function CurrentOrder({
  staff,
  tableLabel,
  lines,
  onQty,
  onPrice,
  onContinue,
  continueLabel = "Continue",
  continueDisabled = false,
}: Props) {
  const rates = useStoreSettings();
  const subtotal = lines.reduce(
    (sum, line) => sum + line.unitPriceMinor * line.quantity,
    0,
  );
  const totals = computeTotals(subtotal, rates);

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
                <img src={line.image} alt="" />
                <div className="line-body">
                  <div className="line-top">
                    <div className="line-name">{line.name}</div>
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

        <div className="summary">
          <div className="row">
            <span>Subtotal</span>
            <span>{formatMoney(totals.subtotalMinor)}</span>
          </div>
          <div className="row">
            <span>Discount</span>
            <span>{formatMoney(totals.discountMinor)}</span>
          </div>
          {rates.applyServiceCharge ? (
            <div className="row">
              <span>Service Charge ({rates.servicePercent}%)</span>
              <span>{formatMoney(totals.serviceMinor)}</span>
            </div>
          ) : null}
          {rates.includeVatBreakdown || !rates.pricesIncludeVat ? (
            <div className="row">
              <span>VAT ({rates.vatPercent}%)</span>
              <span>{formatMoney(totals.vatMinor)}</span>
            </div>
          ) : null}
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
