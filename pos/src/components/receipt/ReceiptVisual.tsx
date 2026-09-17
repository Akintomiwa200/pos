import { computeTotals, formatMoney, type TenderType } from "../../lib/types";
import { TENDER_LABEL } from "../../lib/receipt";
import type { StoreSettings } from "../../lib/store-settings";

export type ReceiptLine = {
  name: string;
  quantity: number;
  unitPriceMinor: number;
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
};

const ACCENT = "#111827";

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
}: Props) {
  const subtotal = lines.reduce(
    (sum, line) => sum + line.unitPriceMinor * line.quantity,
    0,
  );
  const totals = computeTotals(subtotal, settings);
  const total = totals.totalMinor;
  const tendered = tenderedMinor ?? total;
  const change = changeMinor ?? Math.max(0, tendered - total);

  const dense =
    settings.receiptTemplate === "compact" ||
    settings.receiptTemplate === "minimal";
  const bold = settings.receiptTemplate === "bold";
  const paper = settings.receiptPaper === "58mm" ? 220 : 300;
  const title = settings.storeName.trim() || "Your store";
  const showTitle = settings.receiptShowTitle !== false;
  const showAddress = settings.receiptShowAddress !== false;
  const showEmail = settings.receiptShowEmail !== false;
  const showPhone = settings.receiptShowPhone !== false;
  const showHeader = settings.receiptShowHeader !== false;
  const showFooter = settings.receiptShowFooter !== false;

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
        {showTitle ? (
          <div style={{ textAlign: "center", marginBottom: "4px" }}>
            {settings.receiptShowTitle && (
              <div
                style={{
                  width: 36,
                  height: 36,
                  margin: "0 auto 6px",
                  borderRadius: "50%",
                  background: ACCENT,
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
            )}
            <div
              style={{
                fontWeight: bold ? 700 : 600,
                textAlign: "center",
                textTransform: bold ? "uppercase" : undefined,
                color: bold ? ACCENT : undefined,
                fontSize: bold ? 13 : undefined,
              }}
            >
              {title}
            </div>
          </div>
        ) : null}
        {settings.receiptTemplate !== "minimal" ? (
          <>
            {showAddress && settings.storeAddress ? (
              <div style={{ textAlign: "center", ...muted }}>
                {settings.storeAddress}
              </div>
            ) : null}
            {showEmail && settings.storeEmail ? (
              <div style={{ textAlign: "center", ...muted }}>
                {settings.storeEmail}
              </div>
            ) : null}
            {showPhone && settings.storePhone ? (
              <div style={{ textAlign: "center", ...muted }}>
                {settings.storePhone}
              </div>
            ) : null}
          </>
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
        {settings.receiptShowCustomer ? (
          <div style={dash} />
        ) : null}
        {settings.receiptShowCustomer && customerName ? (
          <div style={{ paddingTop: "2px" }}>
            <div style={row}>
              <span style={muted}>Customer</span>
              <span style={{ fontWeight: 500 }}>{customerName}</span>
            </div>
            {settings.receiptShowCustomerPhone !== false &&
            customerPhone ? (
              <div style={{ ...row, ...muted }}>
                <span>Phone</span>
                <span>{customerPhone}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        <div style={dash} />

        {lines.map((line, index) => (
          <div
            key={`${line.name}-${index}`}
            style={{ marginBottom: "5px" }}
          >
            <div style={row}>
              <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {line.name}
              </span>
              <span style={{ ...tabular, whiteSpace: "nowrap" }}>
                {formatMoney(line.unitPriceMinor * line.quantity)}
              </span>
            </div>
            <div style={{ opacity: 0.55 }}>
              {line.quantity} × {formatMoney(line.unitPriceMinor)}
            </div>
          </div>
        ))}

        <div style={dash} />
        <div style={row}>
          <span>Subtotal</span>
          <span style={tabular}>{formatMoney(totals.subtotalMinor)}</span>
        </div>
        {settings.receiptShowDiscount && totals.discountMinor > 0 ? (
          <div style={{ ...row, ...muted }}>
            <span>Discount</span>
            <span style={tabular}>-{formatMoney(totals.discountMinor)}</span>
          </div>
        ) : null}
        {settings.applyServiceCharge && totals.serviceMinor > 0 ? (
          <div style={{ ...row, ...muted }}>
            <span>Service {settings.servicePercent}%</span>
            <span style={tabular}>{formatMoney(totals.serviceMinor)}</span>
          </div>
        ) : null}
        {settings.includeVatBreakdown ? (
          <div style={{ ...row, ...muted }}>
            <span>VAT {settings.vatPercent}%</span>
            <span style={tabular}>{formatMoney(totals.vatMinor)}</span>
          </div>
        ) : null}
        <div
          style={{
            ...row,
            marginTop: 4,
            fontWeight: bold ? 700 : 600,
            color: bold ? ACCENT : undefined,
            fontSize: bold ? 13 : undefined,
          }}
        >
          <span>TOTAL</span>
          <span style={tabular}>{formatMoney(total)}</span>
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
                  <span style={tabular}>{formatMoney(tendered)}</span>
                </div>
                <div style={{ ...row, fontWeight: 500 }}>
                  <span>Change</span>
                  <span style={tabular}>{formatMoney(change)}</span>
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        {settings.receiptShowBarcode ? (
          <div
            style={{
              marginTop: 10,
              textAlign: "center",
              fontWeight: 700,
              letterSpacing: "0.12em",
            }}
          >
            *{ticketId}*
          </div>
        ) : null}

        {showFooter && settings.receiptFooter ? (
          <div style={{ marginTop: 10, textAlign: "center", opacity: 0.8 }}>
            {settings.receiptFooter}
          </div>
        ) : null}
        {settings.receiptShowPoweredBy ? (
          <div style={{ marginTop: 8, textAlign: "center", fontSize: 9, opacity: 0.45, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Powered by Herkintormiwer
          </div>
        ) : null}

        <div style={{ marginTop: 6, textAlign: "center", fontSize: 9, opacity: 0.4 }}>
          {settings.receiptPaper} · {settings.receiptTemplate}
        </div>
      </div>
    </div>
  );
}