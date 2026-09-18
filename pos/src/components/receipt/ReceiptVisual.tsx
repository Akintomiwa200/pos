import { computeTotals, formatMoney, type TenderType } from "../../lib/types";
import { TENDER_LABEL } from "../../lib/receipt";
import type { StoreSettings } from "../../lib/store-settings";
import { ReceiptBarcode } from "./ReceiptBarcode";

export type ReceiptLine = {
  name: string;
  quantity: number;
  unitPriceMinor: number;
  sku?: string;
};

type Props = {
  settings: StoreSettings;
  lines: ReceiptLine[];
  ticketId: string;
  paidAt: string;
  cashier: string;
  till: string;
  tender: TenderType;
  customerName?: string | null;
  customerPhone?: string | null;
  tenderedMinor?: number;
  changeMinor?: number;
  loyaltyNumber?: string | null;
  loyaltyPointsEarned?: number | null;
  loyaltyPointsRedeemed?: number | null;
  loyaltyBalanceBefore?: number | null;
  loyaltyBalanceAfter?: number | null;
  loyaltyRedeemMinor?: number | null;
  giftCardCode?: string | null;
  giftCardChargedMinor?: number | null;
  giftCardBalanceAfterMinor?: number | null;
  /** Persisted sale values keep the on-screen receipt identical to the printed one. */
  discountMinor?: number | null;
  totalMinor?: number | null;
};

function initialsOf(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((word) => word.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

function maskGiftCard(code: string) {
  const clean = code.replace(/\s+/g, "");
  if (clean.length <= 4) return clean;
  return `${clean.slice(0, 2)}-····${clean.slice(-4)}`;
}

export function ReceiptVisual({
  settings,
  lines,
  ticketId,
  paidAt,
  cashier,
  till,
  tender,
  customerName,
  customerPhone,
  tenderedMinor,
  changeMinor,
  loyaltyNumber,
  loyaltyPointsEarned,
  loyaltyPointsRedeemed,
  loyaltyBalanceBefore,
  loyaltyBalanceAfter,
  loyaltyRedeemMinor,
  giftCardCode,
  giftCardChargedMinor,
  giftCardBalanceAfterMinor,
  discountMinor,
  totalMinor,
}: Props) {
  const subtotal = lines.reduce(
    (sum, line) => sum + line.unitPriceMinor * line.quantity,
    0,
  );
  const totals = computeTotals(subtotal, settings);
  const total = totalMinor ?? totals.totalMinor;
  const tendered = tenderedMinor ?? total;
  const change = changeMinor ?? Math.max(0, tendered - total);
  const money = (n: number) => formatMoney(n, settings.currency || "NGN");

  const dense =
    settings.receiptTemplate === "compact" ||
    settings.receiptTemplate === "minimal";
  const bold = settings.receiptTemplate === "bold";
  const paper = settings.receiptPaper === "58mm" ? 220 : 300;
  const accent = settings.receiptBrandColor || "#111827";
  const title = settings.storeName.trim() || "Your store";
  const isMinimal = settings.receiptTemplate === "minimal";
  const showTitle = settings.receiptShowTitle !== false;
  const showAddress = !isMinimal && settings.receiptShowAddress !== false;
  const showEmail = !isMinimal && settings.receiptShowEmail !== false;
  const showPhone = !isMinimal && settings.receiptShowPhone !== false;
  const showHeader = settings.receiptShowHeader !== false;
  const showFooter = settings.receiptShowFooter !== false;
  const showTax = settings.receiptShowTax !== false;
  const showDiscount = settings.receiptShowDiscount !== false;
  const showChange = settings.receiptShowChange !== false;

  const base = {
    fontFamily:
      "Consolas, 'Courier New', ui-monospace, SFMono-Regular, monospace",
    color: "#111827",
    fontSize: dense ? 10 : 11,
    lineHeight: dense ? 1.35 : 1.45,
  } as const;

  const row: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
  };
  const muted: React.CSSProperties = { opacity: 0.7 };
  const tabular: React.CSSProperties = { fontVariantNumeric: "tabular-nums" };
  const dash: React.CSSProperties = {
    borderTop: "1px dashed rgba(0,0,0,.25)",
    margin: "6px 0",
  };

  return (
    <div className="receipt-visual-paper" style={{ width: paper }}>
      <div style={base}>
        {settings.receiptShowLogo ? (
          <div
            style={{
              width: 40,
              height: 40,
              margin: "0 auto 8px",
              borderRadius: "50%",
              background: accent,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 11,
            }}
          >
            {initialsOf(title)}
          </div>
        ) : null}
        {showTitle ? (
          <div
            style={{
              fontWeight: bold ? 700 : 600,
              textAlign: "center",
              textTransform: bold ? "uppercase" : undefined,
              color: bold ? accent : undefined,
              fontSize: bold ? 13 : undefined,
            }}
          >
            {title}
          </div>
        ) : null}
        {settings.receiptLocation &&
        settings.receiptLocation !== title &&
        (showTitle || showAddress) ? (
          <div style={{ textAlign: "center", ...muted }}>{settings.receiptLocation}</div>
        ) : null}
        {showAddress && settings.storeAddress ? (
          <div style={{ textAlign: "center", ...muted }}>{settings.storeAddress}</div>
        ) : null}
        {showEmail && settings.storeEmail ? (
          <div style={{ textAlign: "center", ...muted }}>{settings.storeEmail}</div>
        ) : null}
        {showPhone && settings.storePhone ? (
          <div style={{ textAlign: "center", ...muted }}>{settings.storePhone}</div>
        ) : null}
        {showHeader && settings.receiptHeader ? (
          <div
            style={{
              marginTop: 6,
              padding: "5px 0",
              borderTop: "1px dashed rgba(0,0,0,.25)",
              borderBottom: "1px dashed rgba(0,0,0,.25)",
              textAlign: "center",
              opacity: 0.8,
            }}
          >
            {settings.receiptHeader}
          </div>
        ) : null}

        <div style={dash} />

        {settings.receiptShowTicketNumber !== false ? (
          <div style={row}>
            <span style={muted}>Receipt #</span>
            <span style={{ ...tabular, fontWeight: 600 }}>{ticketId}</span>
          </div>
        ) : null}
        {settings.receiptShowDate !== false ? (
          <div style={{ ...row, ...muted }}>
            <span>Date</span>
            <span style={tabular}>
              {new Date(paidAt).toLocaleDateString("en-GB")}{" "}
              {new Date(paidAt).toLocaleTimeString("en-GB", {
                hour12: false,
              })}
            </span>
          </div>
        ) : null}
        {settings.receiptShowCashier ? (
          <div style={{ ...row, ...muted }}>
            <span>Cashier</span>
            <span style={{ textAlign: "right" }}>{cashier}</span>
          </div>
        ) : null}
        {settings.receiptShowTill ? (
          <div style={{ ...row, ...muted }}>
            <span>Till</span>
            <span>{till}</span>
          </div>
        ) : null}
        {settings.receiptShowCustomer && (customerName || customerPhone) ? (
          <div style={{ paddingTop: 2 }}>
            <div style={dash} />
            {customerName ? (
              <div style={row}>
                <span style={muted}>Customer</span>
                <span style={{ fontWeight: 500 }}>{customerName}</span>
              </div>
            ) : null}
            {settings.receiptShowCustomerPhone !== false && customerPhone ? (
              <div style={{ ...row, ...muted }}>
                <span>Phone</span>
                <span>{customerPhone}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        <div style={dash} />

        {lines.map((line, index) => (
          <div key={`${line.name}-${index}`} style={{ marginBottom: 5 }}>
            <div style={row}>
              <span
                style={{
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {line.name}
                {settings.showSkuOnReceipt && line.sku ? (
                  <span style={{ opacity: 0.5 }}> · {line.sku}</span>
                ) : null}
              </span>
              <span style={{ ...tabular, whiteSpace: "nowrap" }}>
                {money(line.unitPriceMinor * line.quantity)}
              </span>
            </div>
            <div style={{ opacity: 0.55 }}>
              {line.quantity} × {money(line.unitPriceMinor)}
            </div>
          </div>
        ))}

        <div style={dash} />
        <div style={row}>
          <span>Subtotal</span>
          <span style={tabular}>{money(totals.subtotalMinor)}</span>
        </div>
        {showDiscount && (discountMinor ?? totals.discountMinor) > 0 ? (
          <div style={{ ...row, ...muted }}>
            <span>Discount</span>
            <span style={tabular}>-{money(discountMinor ?? totals.discountMinor)}</span>
          </div>
        ) : null}
        {showTax && settings.applyServiceCharge && totals.serviceMinor > 0 ? (
          <div style={{ ...row, ...muted }}>
            <span>Service {settings.servicePercent}%</span>
            <span style={tabular}>{money(totals.serviceMinor)}</span>
          </div>
        ) : null}
        {showTax ? (
          <div style={{ ...row, ...muted }}>
            <span>VAT {settings.vatPercent}%</span>
            <span style={tabular}>{money(totals.vatMinor)}</span>
          </div>
        ) : null}
        {settings.receiptShowLoyalty &&
        settings.receiptShowLoyaltyRedeemed !== false &&
        loyaltyRedeemMinor &&
        loyaltyRedeemMinor > 0 ? (
          <div style={{ ...row, ...muted }}>
            <span>Loyalty</span>
            <span style={tabular}>-{money(loyaltyRedeemMinor)}</span>
          </div>
        ) : null}
        <div
          style={{
            ...row,
            marginTop: 4,
            fontWeight: bold ? 700 : 600,
            color: bold ? accent : undefined,
            fontSize: bold ? 13 : undefined,
          }}
        >
          <span>TOTAL</span>
          <span style={tabular}>{money(total)}</span>
        </div>

        {settings.receiptShowTender ? (
          <div style={{ marginTop: 8, paddingTop: 6, borderTop: "1px dashed rgba(0,0,0,.25)" }}>
            <div style={{ ...row, ...muted }}>
              <span>Paid by</span>
              <span>{TENDER_LABEL[tender]}</span>
            </div>
            {tender === "cash" ? (
              <>
                <div style={{ ...row, ...muted }}>
                  <span>Tendered</span>
                  <span style={tabular}>{money(tendered)}</span>
                </div>
                {showChange ? (
                  <div style={{ ...row, fontWeight: 500 }}>
                    <span>Change</span>
                    <span style={tabular}>{money(change)}</span>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}

        {settings.receiptShowLoyalty && loyaltyNumber ? (
          <div style={{ marginTop: 8, paddingTop: 6, borderTop: "1px dashed rgba(0,0,0,.25)" }}>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>Loyalty</div>
            <div style={{ ...row, ...muted }}>
              <span>No.</span>
              <span>{loyaltyNumber}</span>
            </div>
            {settings.receiptShowLoyaltyBalance !== false && loyaltyBalanceBefore != null ? (
              <div style={{ ...row, ...muted }}>
                <span>Balance before</span>
                <span>{loyaltyBalanceBefore} pts</span>
              </div>
            ) : null}
            {settings.receiptShowLoyaltyRedeemed !== false &&
            loyaltyPointsRedeemed &&
            loyaltyPointsRedeemed > 0 ? (
              <div style={{ ...row, ...muted }}>
                <span>Points used</span>
                <span>-{loyaltyPointsRedeemed} pts</span>
              </div>
            ) : null}
            {settings.receiptShowLoyaltyEarned !== false &&
            loyaltyPointsEarned &&
            loyaltyPointsEarned > 0 ? (
              <div style={{ ...row, ...muted }}>
                <span>Points earned</span>
                <span>+{loyaltyPointsEarned} pts</span>
              </div>
            ) : null}
            {settings.receiptShowLoyaltyBalance !== false && loyaltyBalanceAfter != null ? (
              <div style={{ ...row, ...muted }}>
                <span>Balance after</span>
                <span>{loyaltyBalanceAfter} pts</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {settings.receiptShowGiftCard && giftCardCode ? (
          <div style={{ marginTop: 8, paddingTop: 6, borderTop: "1px dashed rgba(0,0,0,.25)" }}>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>Gift card</div>
            <div style={{ ...row, ...muted }}>
              <span>Card</span>
              <span>{maskGiftCard(giftCardCode)}</span>
            </div>
            {giftCardChargedMinor != null ? (
              <div style={{ ...row, ...muted }}>
                <span>Charged</span>
                <span style={tabular}>{money(giftCardChargedMinor)}</span>
              </div>
            ) : null}
            {settings.receiptShowGiftCardBalance !== false &&
            giftCardBalanceAfterMinor != null ? (
              <div style={{ ...row, ...muted }}>
                <span>Balance left</span>
                <span style={tabular}>{money(giftCardBalanceAfterMinor)}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {settings.receiptShowBarcode ? (
          <div style={{ marginTop: 10 }}>
            <ReceiptBarcode
              value={ticketId}
              width={settings.receiptPaper === "58mm" ? 1.1 : 1.35}
              height={settings.receiptPaper === "58mm" ? 36 : 44}
            />
          </div>
        ) : null}

        {showFooter && settings.receiptFooter ? (
          <div style={{ marginTop: 10, textAlign: "center", opacity: 0.8 }}>
            {settings.receiptFooter}
          </div>
        ) : null}
        {settings.receiptShowPoweredBy ? (
          <div
            style={{
              marginTop: 8,
              textAlign: "center",
              fontSize: 9,
              opacity: 0.45,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Powered by Herkintormiwer
          </div>
        ) : null}
      </div>
    </div>
  );
}
