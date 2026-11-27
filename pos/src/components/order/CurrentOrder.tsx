import { useState } from "react";
import type { CartLine } from "../../lib/types";
import type { AppliedPromotion } from "../../lib/promotions";
import { computeLineTotals, formatMoney } from "../../lib/types";
import { formatPricePer } from "../../lib/units";
import { useStoreSettings } from "../../lib/use-store-settings";
import type { StaffUser } from "../../lib/staff";
import type { RegisterAction } from "../../lib/register-config";
import {
  loadCustomers,
  saveCustomers,
  upsertCustomer,
  type CustomerRecord,
} from "../../lib/customers";
import { Bookmark, Minus, Percent, Plus, ShoppingBag, Trash2, Wallet } from "lucide-react";

type Props = {
  staff: StaffUser;
  tableLabel?: string;
  lines: CartLine[];
  discountMinor?: number;
  promotion?: AppliedPromotion | null;
  onQty: (id: string, delta: number) => void;
  onPrice?: (id: string, unitPriceMinor: number) => void;
  onRegisterAction?: (action: RegisterAction) => void;
  saleDetails: Record<string, string>;
  onSaleDetail: (key: string, value: string) => void;
  onContinue: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
};

const ACTION_ICONS: Record<RegisterAction, typeof Percent> = {
  discount: Percent,
  hold: Bookmark,
  saved: Bookmark,
  payment: Wallet,
  new: Plus,
};

export function CurrentOrder({
  staff,
  tableLabel,
  lines,
  discountMinor = 0,
  promotion = null,
  onQty,
  onPrice,
  onRegisterAction,
  saleDetails,
  onSaleDetail,
  onContinue,
  continueLabel = "Continue",
  continueDisabled = false,
}: Props) {
  const rates = useStoreSettings();
  const [customers, setCustomers] = useState<CustomerRecord[]>(loadCustomers);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const subtotalMinor = lines.reduce(
    (sum, line) => sum + line.unitPriceMinor * line.quantity,
    0,
  );
  const effectiveDiscountMinor = Math.min(
    subtotalMinor,
    discountMinor + (promotion?.discountMinor ?? 0),
  );
  const totals = computeLineTotals(lines, rates, effectiveDiscountMinor);
  const actions = rates.registerQuickButtons.filter(
    (button) => button.active && button.kind === "action",
  );
  const saleFields = [...rates.registerSaleFields]
    .filter((field) => field.mode !== "hidden")
    .sort((a, b) => a.order - b.order);
  const query = customerSearch.trim().toLowerCase();
  const filteredCustomers = customers.filter((customer) =>
    query
      ? `${customer.name} ${customer.phone} ${customer.email}`.toLowerCase().includes(query)
      : true,
  );

  function applyCustomer(id: string) {
    const customer = customers.find((row) => row.id === id);
    if (!customer) return;
    const visible = new Set<string>(saleFields.map((field) => field.key));
    const values: Record<string, string> = {
      customer: customer.name,
      phone: customer.phone,
      email: customer.email,
    };
    for (const [key, value] of Object.entries(values)) {
      if (visible.has(key)) onSaleDetail(key, value);
    }
    setCustomerNote(`Loaded ${customer.name}.`);
  }

  function saveCurrentCustomer() {
    const name = saleDetails.customer?.trim() ?? "";
    const phone = saleDetails.phone?.trim() ?? "";
    const email = saleDetails.email?.trim() ?? "";
    if (!name && !phone) {
      setCustomerNote("Enter a customer name or phone before saving.");
      return;
    }
    const rows = upsertCustomer({ id: "", name, phone, email });
    setCustomers(rows);
    const match = rows.find((row) =>
      phone
        ? row.phone.trim() === phone
        : email && row.email.trim().toLowerCase() === email.toLowerCase(),
    );
    setSelectedCustomerId(match?.id ?? "");
    setCustomerNote("Customer saved.");
  }

  function deleteSelectedCustomer() {
    if (!selectedCustomerId) return;
    if (!window.confirm("Remove this saved customer?")) return;
    const next = customers.filter((row) => row.id !== selectedCustomerId);
    saveCustomers(next);
    setCustomers(next);
    setSelectedCustomerId("");
    setCustomerNote("Customer removed.");
  }

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

        {lines.length > 0 && actions.length > 0 && onRegisterAction ? (
          <div className="order-actions">
            {actions.map((button) => {
              const Icon = ACTION_ICONS[button.value as RegisterAction] ?? Percent;
              return (
                <button
                  key={button.id}
                  type="button"
                  className={`order-action ${
                    button.value === "discount" && discountMinor > 0 ? "on" : ""
                  }`}
                  style={{ borderColor: button.color }}
                  onClick={() => onRegisterAction(button.value as RegisterAction)}
                >
                  <Icon size={16} strokeWidth={2} />
                  {button.value === "discount" && discountMinor > 0
                    ? `Discount ${formatMoney(discountMinor)}`
                    : button.label}
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="sale-fields" style={{ marginTop: 12 }}>
          <label className="sale-field">
            <span>Saved customer</span>
            <input
              value={customerSearch}
              onChange={(event) => {
                setCustomerSearch(event.target.value);
                setCustomerNote("");
              }}
              placeholder="Search name or phone"
              aria-label="Search saved customers"
            />
          </label>
          <label className="sale-field">
            <select
              value={selectedCustomerId}
              onChange={(event) => {
                setSelectedCustomerId(event.target.value);
                applyCustomer(event.target.value);
              }}
              aria-label="Choose a saved customer"
              style={{
                border: "1px solid #ececf0",
                borderRadius: 10,
                padding: "8px 10px",
                font: "inherit",
                background: "#fafafa",
              }}
            >
              <option value="">
                {filteredCustomers.length
                  ? `Choose a saved customer (${filteredCustomers.length})`
                  : "No matching saved customer"}
              </option>
              {filteredCustomers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name || customer.phone}
                  {customer.phone ? ` · ${customer.phone}` : ""}
                </option>
              ))}
            </select>
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              className="order-action"
              onClick={saveCurrentCustomer}
              style={{ flex: "0 0 auto" }}
            >
              Save customer
            </button>
            {selectedCustomerId ? (
              <button
                type="button"
                className="order-action"
                onClick={deleteSelectedCustomer}
                style={{ flex: "0 0 auto" }}
              >
                Delete
              </button>
            ) : null}
            {customerNote ? <span className="price">{customerNote}</span> : null}
          </div>
        </div>

        {saleFields.length > 0 ? (
          <div className="sale-fields">
            {saleFields.map((field) => (
              <label className="sale-field" key={field.key}>
                <span>
                  {field.label}
                  {field.mode === "required" ? <em aria-hidden="true"> *</em> : null}
                </span>
                {field.key === "notes" ? (
                  <textarea
                    rows={2}
                    value={saleDetails[field.key] ?? ""}
                    placeholder={field.mode === "required" ? "Required" : "Optional"}
                    onChange={(event) => onSaleDetail(field.key, event.target.value)}
                  />
                ) : (
                  <input
                    type={field.key === "email" ? "email" : "text"}
                    value={saleDetails[field.key] ?? ""}
                    placeholder={field.mode === "required" ? "Required" : "Optional"}
                    onChange={(event) => onSaleDetail(field.key, event.target.value)}
                  />
                )}
              </label>
            ))}
          </div>
        ) : null}

        <div className="summary">
          <div className="row">
            <span>Subtotal</span>
            <span>{formatMoney(totals.subtotalMinor)}</span>
          </div>
          <div className={`row ${totals.discountMinor > 0 ? "discount" : ""}`}>
            <span>
              {promotion ? (discountMinor > 0 ? `Discount · ${promotion.name}` : promotion.name) : "Discount"}
            </span>
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
