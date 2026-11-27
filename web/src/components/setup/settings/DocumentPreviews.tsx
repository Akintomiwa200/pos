"use client";

import { useEffect, useState } from "react";
import type { HqCompany, HqOrgSettings } from "@/lib/hq-setup";
import { useAuth } from "@/components/AuthProvider";
import { listCatalog, listSales, type HqCatalogItem, type HqSale } from "@/lib/hq-api";
import { listDirectory, type DirectoryRecord } from "@/lib/hq-directory";
import { ReceiptBarcode } from "./ReceiptBarcode";

type PreviewLine = { name: string; sku?: string; qty: number; price: number };

function tenderLabel(tender?: string | null) {
  switch ((tender || "").toLowerCase()) {
    case "cash":
      return "Cash";
    case "card":
      return "Credit Card";
    case "transfer":
      return "Bank Transfer";
    case "pos":
      return "POS";
    default:
      return tender || "Cash";
  }
}

/** Pulls the real amounts straight out of the till-printed receipt text. */
function parseReceiptAmounts(text: string | null | undefined) {
  const out: {
    subtotalMinor?: number;
    serviceMinor?: number;
    taxMinor?: number;
    discountMinor?: number;
    totalMinor?: number;
    tenderedMinor?: number;
    changeMinor?: number;
  } = {};
  if (!text) return out;
  const lineFor = (label: string) => {
    const m = text.match(new RegExp(`^${label}[^\\n]*$`, "m"));
    return m ? m[0] : "";
  };
  const amountOf = (label: string): number | undefined => {
    const line = lineFor(label);
    if (!line) return undefined;
    const tokens = line.match(/[?\d][\d.,]*\d/g);
    const last = tokens?.reverse().find((token) => /\d/.test(token));
    const n = last ? parseFloat(last.replace(/[^\d.]/g, "")) : NaN;
    return Number.isFinite(n) ? Math.round(n * 100) : undefined;
  };
  out.subtotalMinor = amountOf("Subtotal");
  out.serviceMinor = amountOf("Service");
  out.taxMinor = amountOf("VAT");
  out.discountMinor = amountOf("Discount");
  out.totalMinor = amountOf("TOTAL");
  out.tenderedMinor = amountOf("Tendered");
  out.changeMinor = amountOf("Change");
  return out;
}

/**
 * Fetches live data so Settings previews reflect the latest real sale:
 * catalog items, first customer, and the most recent till receipt.
 */
export function usePreviewData() {
  const { session } = useAuth();
  const [catalog, setCatalog] = useState<HqCatalogItem[]>([]);
  const [customers, setCustomers] = useState<DirectoryRecord[]>([]);
  const [sales, setSales] = useState<HqSale[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [items, people, sold] = await Promise.all([
          listCatalog(),
          listDirectory("customers"),
          listSales(),
        ]);
        if (!cancelled) {
          setCatalog(items);
          setCustomers(people);
          setSales(sold);
        }
      } catch {
        /* silent — fall back to sample lines */
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const sessionName = session?.name || "Cashier";
  const firstCustomer = customers[0] ?? null;
  const latest = sales[0] ?? null;
  const fromCatalog = (items: HqCatalogItem[]): PreviewLine[] =>
    items
      .filter((item) => item.priceMinor > 0)
      .slice(0, 3)
      .map((item) => ({
        name: item.name,
        sku: item.sku || item.barcode || "",
        qty: 1,
        price: item.priceMinor,
      }));
  const fromSale = (sale: HqSale): PreviewLine[] =>
    (sale.lines ?? []).map((line) => ({
      name: line.name,
      sku: "",
      qty: line.quantity,
      price: line.unitPriceMinor,
    }));
  const catalogLines = fromCatalog(catalog);
  const saleLines = latest ? fromSale(latest) : [];
  const receiptLines = saleLines.length ? saleLines : catalogLines;
  const invoiceLines = catalogLines;

  const amounts = parseReceiptAmounts(latest?.receiptText ?? null);
  const saleTotalMinor = amounts.totalMinor ?? latest?.totalMinor ?? 0;
  const tenderedMinor = latest
    ? amounts.tenderedMinor ?? Math.ceil(saleTotalMinor / 1000) * 1000
    : 0;
  const changeMinor = latest ? Math.max(0, tenderedMinor - saleTotalMinor) : 0;
  const tender = tenderLabel(latest?.tender);

  return {
    latestSale: latest,
    saleText: latest?.receiptText ?? null,
    sessionName,
    firstCustomer,
    receiptLines,
    invoiceLines,
    sale: {
      hasSale: Boolean(latest),
      isCash: tender.toLowerCase() === "cash",
      ticketId: latest?.ticketId || "",
      cashier: latest?.cashierName || sessionName,
      till: latest?.tillKey || "",
      tender,
      tendered: tenderedMinor,
      change: changeMinor,
      customerName: latest?.customerName || firstCustomer?.name || "",
      customerPhone: latest?.customerPhone || firstCustomer?.phone || "",
      paidAt: latest ? new Date(latest.paidAt) : new Date(),
      loyaltyNumber: latest?.loyaltyNumber ?? null,
      loyaltyPointsEarned: latest?.loyaltyPointsEarned ?? null,
      hasLoyalty: Boolean(latest?.loyaltyNumber || latest?.loyaltyPointsEarned),
      hasGiftCard: false,
      subtotalMinor: amounts.subtotalMinor,
      serviceMinor: amounts.serviceMinor,
      taxMinor: amounts.taxMinor,
      discountMinor: amounts.discountMinor,
      totalMinor: amounts.totalMinor,
    },
  };
}

function money(n: number, currency: string, fraction = 0) {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: currency || "NGN",
      minimumFractionDigits: fraction,
      maximumFractionDigits: fraction,
    }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString()}`;
  }
}

function initials(name?: string) {
  return (name || "POS")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/** Live thermal receipt — mirrors till printout from current HQ settings. */
export function ReceiptLivePreview({
  draft,
  company,
  onChange,
}: {
  draft: HqOrgSettings;
  company: HqCompany | null;
  onChange?: (patch: Partial<HqOrgSettings>) => void;
}) {
  const { receiptLines, sale } = usePreviewData();
  const computedSubtotal = receiptLines.reduce((sum, line) => sum + line.qty * line.price, 0);
  const subtotal =
    sale.hasSale && sale.subtotalMinor != null ? sale.subtotalMinor : computedSubtotal;
  const showDiscount = draft.receiptShowDiscount !== false;
  const discount = sale.hasSale ? (sale.discountMinor ?? 0) : 0;
  const afterDiscount = Math.max(0, subtotal - discount);
  const tax =
    sale.hasSale
      ? (sale.taxMinor ?? Math.round(afterDiscount * 0.075))
      : draft.receiptShowTax
        ? Math.round(afterDiscount * 0.075)
        : 0;
  const serviceCharge = sale.hasSale ? (sale.serviceMinor ?? 0) : 0;
  const loyaltyRedeem =
    draft.receiptShowLoyalty &&
    draft.receiptShowLoyaltyRedeemed !== false &&
    sale.hasSale
      ? sale.loyaltyNumber
        ? sale.tendered
        : 0
      : 0;
  const giftCharge = draft.receiptShowGiftCard
    ? sale.hasGiftCard && sale.hasSale
      ? sale.tendered
      : 0
    : 0;
  const total =
    sale.hasSale
      ? (sale.totalMinor ??
        afterDiscount + (draft.pricesIncludeVat ? 0 : tax) - loyaltyRedeem)
      : afterDiscount + (draft.pricesIncludeVat ? 0 : tax) - loyaltyRedeem;
  const due = Math.max(0, total - giftCharge);
  const change = sale.hasSale && !sale.isCash ? 0 : Math.max(0, sale.tendered - due);
  const paperPx = draft.receiptPaper === "58mm" ? 220 : 300;
  const accent = draft.receiptBrandColor || "#111827";
  const dense = draft.receiptTemplate === "compact" || draft.receiptTemplate === "minimal";
  const bold = draft.receiptTemplate === "bold";
  const editable = Boolean(onChange);
  const title = (draft.receiptTitle ?? "").trim() || company?.name || "Your company";
  const address = (draft.receiptAddress ?? "").trim() || company?.address || "";
  const email = (draft.receiptEmail ?? "").trim() || company?.email || "";
  const barcodeValue =
    (draft.receiptBarcodeValue ?? "").trim() || sale.ticketId;
  const paidAt = sale.paidAt;
  const showTicket = draft.receiptShowTicketNumber !== false;
  const showDate = draft.receiptShowDate !== false;
  const showTitle = draft.receiptShowTitle !== false;
  const showAddress = draft.receiptShowAddress !== false;
  const showEmail = draft.receiptShowEmail !== false;
  const showPhone = draft.receiptShowPhone !== false;
  const showHeader = draft.receiptShowHeader !== false;
  const showFooter = draft.receiptShowFooter !== false;

  return (
    <div className="overflow-hidden rounded-[22px] bg-pos-inverse p-4 shadow-pos-md sm:p-5">
      <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-pos-inverse-ink/55">
        {editable ? "Live receipt — click header or footer to edit" : "Live receipt preview"}
      </p>
      <div
        className="mx-auto rounded-sm bg-[#f7f4ef] p-3 text-[#111827] shadow-inner"
        style={{ width: paperPx, colorScheme: "light" }}
      >
        <div
          className={`font-mono text-[#111827] ${dense ? "text-[10px] leading-[1.35]" : "text-[11px] leading-[1.45]"}`}
        >
          {draft.receiptShowLogo ? (
            company?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={company.logoUrl}
                alt={title}
                className="mx-auto mb-2 block size-10 rounded-full object-cover"
              />
            ) : (
              <div
                className="mx-auto mb-2 grid size-10 place-items-center rounded-full text-[11px] font-bold text-white"
                style={{ backgroundColor: accent }}
              >
                {initials(title)}
              </div>
            )
          ) : null}
          {showTitle ? (
            <p
              className={`text-center ${bold ? "text-[13px] font-bold uppercase" : "font-semibold"}`}
              style={bold ? { color: accent } : undefined}
            >
              {title}
            </p>
          ) : null}
          {draft.receiptTemplate !== "minimal" ? (
            <>
              {showAddress && address ? (
                <p className="text-center opacity-70">{address}</p>
              ) : null}
              {showEmail && email ? <p className="text-center opacity-70">{email}</p> : null}
              {showPhone && company?.phone ? (
                <p className="text-center opacity-70">{company.phone}</p>
              ) : null}
            </>
          ) : null}

          {showHeader && editable ? (
            <label className="mt-2 block border-y border-dashed border-black/25 py-1">
              <span className="sr-only">Receipt header</span>
              <textarea
                rows={2}
                value={draft.receiptHeader}
                placeholder="Header note — type here"
                className="w-full resize-none bg-transparent text-center font-mono text-[#111827] opacity-80 outline-none placeholder:text-[#111827]/40 focus:bg-black/[0.04]"
                style={{ fontSize: "inherit", lineHeight: "inherit", color: "#111827" }}
                onChange={(e) => onChange?.({ receiptHeader: e.target.value })}
              />
            </label>
          ) : showHeader && draft.receiptHeader ? (
            <p className="mt-2 border-y border-dashed border-black/25 py-1.5 text-center text-[#111827]/80">
              {draft.receiptHeader}
            </p>
          ) : null}

          <div className="my-2 border-t border-dashed border-black/25" />

          {showTicket ? (
            <div className="flex justify-between gap-2">
              <span className="opacity-70">Receipt #</span>
              <span className="tabular-nums font-semibold">{barcodeValue}</span>
            </div>
          ) : null}
          {showDate ? (
            <div className="flex justify-between gap-2 opacity-80">
              <span>Date</span>
              <span className="tabular-nums">
                {paidAt.toLocaleDateString("en-GB")}{" "}
                {paidAt.toLocaleTimeString("en-GB", { hour12: false })}
              </span>
            </div>
          ) : null}
          {draft.receiptShowCashier ? (
            <div className="flex justify-between gap-2 opacity-80">
              <span>Cashier</span>
              <span className="truncate text-right">{sale.cashier}</span>
            </div>
          ) : null}
          {draft.receiptShowTill ? (
            <div className="flex justify-between gap-2 opacity-80">
              <span>Till</span>
              <span>{sale.till}</span>
            </div>
          ) : null}
          {draft.receiptShowCustomer ? (
            <div className="mt-1 space-y-0.5 border-t border-dashed border-black/20 pt-1">
              <div className="flex justify-between gap-2">
                <span className="opacity-70">Customer</span>
                <span className="truncate text-right font-medium">
                  {sale.customerName || "Customer"}
                </span>
              </div>
              {draft.receiptShowCustomerPhone !== false ? (
                <div className="flex justify-between gap-2 opacity-70">
                  <span>Phone</span>
                  <span>{sale.customerPhone || ""}</span>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="my-2 border-t border-dashed border-black/25" />
          {receiptLines.map((line, lineIndex) => (
            <div key={`${line.name}-${lineIndex}`} className="mb-1.5">
              <div className="flex justify-between gap-2">
                <span className="min-w-0 truncate">
                  {line.name}
                  {draft.showSkuOnReceipt ? (
                    <span className="opacity-50"> · {line.sku}</span>
                  ) : null}
                </span>
                <span className="shrink-0 tabular-nums">
                  {money(line.qty * line.price, draft.currency)}
                </span>
              </div>
              <div className="opacity-55">
                {line.qty} × {money(line.price, draft.currency)}
              </div>
            </div>
          ))}
          <div className="my-2 border-t border-dashed border-black/25" />
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="tabular-nums">{money(subtotal, draft.currency)}</span>
          </div>
          {showDiscount && discount > 0 ? (
            <div className="flex justify-between opacity-80">
              <span>Discount</span>
              <span className="tabular-nums">-{money(discount, draft.currency)}</span>
            </div>
          ) : null}
          {draft.receiptShowTax ? (
            <>
              {serviceCharge > 0 ? (
                <div className="flex justify-between opacity-80">
                  <span>Service 10%</span>
                  <span className="tabular-nums">{money(serviceCharge, draft.currency)}</span>
                </div>
              ) : null}
              <div className="flex justify-between opacity-80">
                <span>VAT 7.5%</span>
                <span className="tabular-nums">{money(tax, draft.currency)}</span>
              </div>
            </>
          ) : null}
          {draft.receiptShowLoyalty &&
          draft.receiptShowLoyaltyRedeemed !== false &&
          loyaltyRedeem > 0 ? (
            <div className="flex justify-between opacity-80">
              <span>Loyalty redeem</span>
              <span className="tabular-nums">-{money(loyaltyRedeem, draft.currency)}</span>
            </div>
          ) : null}
          <div
            className={`mt-1 flex justify-between ${bold ? "text-[13px] font-bold" : "font-semibold"}`}
            style={bold ? { color: accent } : undefined}
          >
            <span>TOTAL</span>
            <span className="tabular-nums">{money(total, draft.currency)}</span>
          </div>

          {draft.receiptShowTender ? (
            <div className="mt-2 space-y-0.5 border-t border-dashed border-black/25 pt-2">
              <div className="flex justify-between opacity-80">
                <span>Paid by</span>
                <span>{sale.tender}</span>
              </div>
              {sale.isCash || !sale.hasSale ? (
                <>
                  <div className="flex justify-between opacity-80">
                    <span>Tendered</span>
                    <span className="tabular-nums">{money(sale.tendered, draft.currency)}</span>
                  </div>
                  {draft.receiptShowChange !== false ? (
                    <div className="flex justify-between font-medium">
                      <span>Change</span>
                      <span className="tabular-nums">{money(change, draft.currency)}</span>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}

          {(sale.hasSale ? sale.hasLoyalty : draft.receiptShowLoyalty) ? (
            <div className="mt-2 space-y-0.5 border-t border-dashed border-black/25 pt-2">
              <p className="font-semibold opacity-90">Loyalty</p>
              {sale.loyaltyNumber ? (
                <div className="flex justify-between opacity-80">
                  <span>Card / No.</span>
                  <span>{sale.loyaltyNumber}</span>
                </div>
              ) : null}
              {draft.receiptShowLoyaltyEarned !== false && sale.loyaltyPointsEarned != null ? (
                <div className="flex justify-between opacity-80">
                  <span>Points earned</span>
                  <span className="tabular-nums">+{sale.loyaltyPointsEarned} pts</span>
                </div>
              ) : null}
            </div>
          ) : null}

          {sale.hasSale ? sale.hasGiftCard : draft.receiptShowGiftCard ? (
            <div className="mt-2 space-y-0.5 border-t border-dashed border-black/25 pt-2">
              <p className="font-semibold opacity-90">Gift card</p>
              <div className="flex justify-between opacity-80">
                <span>Card</span>
                <span>{sale.ticketId}</span>
              </div>
              <div className="flex justify-between opacity-80">
                <span>Charged</span>
                <span className="tabular-nums">{money(giftCharge, draft.currency)}</span>
              </div>
              {draft.receiptShowGiftCardBalance !== false ? (
                <div className="flex justify-between font-medium">
                  <span>Balance left</span>
                  <span className="tabular-nums">
                    {money(Math.max(0, sale.tendered - giftCharge), draft.currency)}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}

          {showFooter && editable ? (
            <label className="mt-3 block">
              <span className="sr-only">Receipt footer</span>
              <textarea
                rows={2}
                value={draft.receiptFooter}
                placeholder="Footer message — type here"
                className="w-full resize-none bg-transparent text-center font-mono text-[#111827] opacity-80 outline-none placeholder:text-[#111827]/40 focus:bg-black/[0.04]"
                style={{ fontSize: "inherit", lineHeight: "inherit", color: "#111827" }}
                onChange={(e) => onChange?.({ receiptFooter: e.target.value })}
              />
            </label>
          ) : showFooter && draft.receiptFooter ? (
            <p className="mt-3 text-center text-[#111827]/80">{draft.receiptFooter}</p>
          ) : null}

          {draft.receiptShowBarcode ? (
            <div className="mt-3 flex justify-center">
              <ReceiptBarcode
                value={barcodeValue}
                width={draft.receiptPaper === "58mm" ? 1.1 : 1.35}
                height={draft.receiptPaper === "58mm" ? 36 : 44}
              />
            </div>
          ) : null}

          {draft.receiptShowPoweredBy ? (
            <p className="mt-3 text-center text-[9px] uppercase tracking-[0.12em] opacity-45">
              Powered by Herkintormiwer
            </p>
          ) : null}

          <p className="mt-2 text-center text-[9px] opacity-40">
            {draft.receiptPaper} · {draft.receiptTemplate}
            {draft.printDuplicateReceipt ? " · duplicate" : ""}
            {draft.receiptCopies > 1 ? ` · ×${draft.receiptCopies}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
