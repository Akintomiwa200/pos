"use client";

import type { HqCompany, HqOrgSettings } from "@/lib/hq-setup";
import { ReceiptBarcode } from "./ReceiptBarcode";

const RECEIPT_LINES = [
  { name: "Jollof rice (large)", sku: "FD-101", qty: 2, price: 3500 },
  { name: "Chapman", sku: "DR-044", qty: 1, price: 2500 },
  { name: "Grilled chicken", sku: "FD-220", qty: 1, price: 6500 },
];

const INVOICE_LINES = [
  { name: "Business consultation", qty: 1, price: 150000 },
  { name: "Website development", qty: 1, price: 280000 },
  { name: "Logo design", qty: 1, price: 65000 },
];

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
  const subtotal = RECEIPT_LINES.reduce((sum, line) => sum + line.qty * line.price, 0);
  const tax = draft.receiptShowTax ? Math.round(subtotal * 0.075) : 0;
  const total = subtotal + (draft.pricesIncludeVat ? 0 : tax);
  const paperPx = draft.receiptPaper === "58mm" ? 220 : 300;
  const accent = draft.receiptBrandColor || "#111827";
  const dense = draft.receiptTemplate === "compact" || draft.receiptTemplate === "minimal";
  const bold = draft.receiptTemplate === "bold";
  const editable = Boolean(onChange);
  const title = (draft.receiptTitle ?? "").trim() || company?.name || "Your company";
  const address = (draft.receiptAddress ?? "").trim() || company?.address || "";
  const email = (draft.receiptEmail ?? "").trim() || company?.email || "";
  const barcodeValue = (draft.receiptBarcodeValue ?? "").trim() || "10482001933";

  return (
    <div className="overflow-hidden rounded-[22px] bg-pos-inverse p-4 shadow-pos-md sm:p-5">
      <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
        {editable ? "Live receipt — click header or footer to edit" : "Live receipt preview"}
      </p>
      <div className="mx-auto rounded-sm bg-[#f7f4ef] p-3 shadow-inner" style={{ width: paperPx }}>
        <div
          className={`font-mono text-pos-ink ${dense ? "text-[10px] leading-[1.35]" : "text-[11px] leading-[1.45]"}`}
        >
          {draft.receiptShowLogo ? (
            <div
              className="mx-auto mb-2 grid size-10 place-items-center rounded-full text-[11px] font-bold text-white"
              style={{ backgroundColor: accent }}
            >
              {initials(title)}
            </div>
          ) : null}
          <p
            className={`text-center ${bold ? "text-[13px] font-bold uppercase" : "font-semibold"}`}
            style={bold ? { color: accent } : undefined}
          >
            {title}
          </p>
          {draft.receiptTemplate !== "minimal" ? (
            <>
              {address ? <p className="text-center opacity-70">{address}</p> : null}
              {email ? <p className="text-center opacity-70">{email}</p> : null}
              {company?.phone ? <p className="text-center opacity-70">{company.phone}</p> : null}
            </>
          ) : null}

          {editable ? (
            <label className="mt-2 block border-y border-dashed border-black/25 py-1">
              <span className="sr-only">Receipt header</span>
              <textarea
                rows={2}
                value={draft.receiptHeader}
                placeholder="Header note — type here"
                className="w-full resize-none bg-transparent text-center font-mono opacity-80 outline-none placeholder:opacity-40 focus:bg-black/[0.03]"
                style={{ fontSize: "inherit", lineHeight: "inherit" }}
                onChange={(e) => onChange?.({ receiptHeader: e.target.value })}
              />
            </label>
          ) : draft.receiptHeader ? (
            <p className="mt-2 border-y border-dashed border-black/25 py-1.5 text-center opacity-80">
              {draft.receiptHeader}
            </p>
          ) : null}

          <div className="mt-2 flex justify-between opacity-70">
            <span>RCP-{barcodeValue.slice(-5)}</span>
            <span>{new Date().toLocaleString("en-GB", { hour12: false })}</span>
          </div>
          {draft.receiptShowCashier ? <p className="opacity-70">Cashier: Adaeze</p> : null}
          <div className="my-2 border-t border-dashed border-black/25" />
          {RECEIPT_LINES.map((line) => (
            <div key={line.sku} className="mb-1.5">
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
          {draft.receiptShowTax ? (
            <div className="flex justify-between opacity-80">
              <span>VAT 7.5%</span>
              <span className="tabular-nums">{money(tax, draft.currency)}</span>
            </div>
          ) : null}
          <div
            className={`mt-1 flex justify-between ${bold ? "text-[13px] font-bold" : "font-semibold"}`}
            style={bold ? { color: accent } : undefined}
          >
            <span>TOTAL</span>
            <span className="tabular-nums">{money(total, draft.currency)}</span>
          </div>

          {editable ? (
            <label className="mt-3 block">
              <span className="sr-only">Receipt footer</span>
              <textarea
                rows={2}
                value={draft.receiptFooter}
                placeholder="Footer message — type here"
                className="w-full resize-none bg-transparent text-center font-mono opacity-80 outline-none placeholder:opacity-40 focus:bg-black/[0.03]"
                style={{ fontSize: "inherit", lineHeight: "inherit" }}
                onChange={(e) => onChange?.({ receiptFooter: e.target.value })}
              />
            </label>
          ) : draft.receiptFooter ? (
            <p className="mt-3 text-center opacity-80">{draft.receiptFooter}</p>
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

/** Live A4 invoice — mirrors customer invoice from current HQ settings. */
export function InvoiceLivePreview({
  draft,
  company,
}: {
  draft: HqOrgSettings;
  company: HqCompany | null;
}) {
  const subtotal = INVOICE_LINES.reduce((sum, line) => sum + line.qty * line.price, 0);
  const tax = Math.round(subtotal * 0.075);
  const total = draft.pricesIncludeVat ? subtotal : subtotal + tax;
  const brand = draft.invoiceBrandColor || "#0F2C59";
  const panel = draft.invoicePanelColor || "#5788D3";
  const soft =
    draft.invoiceTemplate === "ivory"
      ? "#F7F1E8"
      : draft.invoiceTemplate === "classic"
        ? "#F3F4F6"
        : `${panel}22`;
  const invoiceNo = `${draft.invoicePrefix || "INV"}-${String(draft.invoiceNextNumber || 1).padStart(4, "0")}`;

  return (
    <div className="overflow-hidden rounded-[22px] border border-pos-border/70 bg-pos-surface shadow-pos-md">
      <p className="border-b border-pos-border/60 bg-pos-surface-muted/50 px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-pos-ink-faint">
        Live invoice preview
      </p>
      <div className="bg-[#EEF1F5] p-3 sm:p-4">
        <div className="overflow-hidden rounded-lg bg-white shadow-sm">
          <div
            className={`px-4 py-4 text-white sm:px-5 ${
              draft.invoiceTemplate === "letterhead" ? "border-b-4" : ""
            }`}
            style={{
              background:
                draft.invoiceTemplate === "ivory"
                  ? brand
                  : draft.invoiceTemplate === "modern"
                    ? `linear-gradient(120deg, ${brand}, ${panel})`
                    : brand,
              borderColor: panel,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {draft.invoiceShowLogo ? (
                  <div className="mb-2 grid size-9 place-items-center rounded-md bg-white/15 text-[11px] font-bold">
                    {initials(company?.name)}
                  </div>
                ) : null}
                <p className="truncate text-[15px] font-semibold">
                  {company?.name || "Your company"}
                </p>
                <p className="mt-1 text-[11px] text-white/75">
                  {company?.address || "Address"}
                </p>
                <p className="text-[11px] text-white/75">
                  {[company?.email, company?.phone].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[18px] font-semibold tracking-wide">INVOICE</p>
                <span
                  className="mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ backgroundColor: "#E8C547", color: "#1F2937" }}
                >
                  LIVE
                </span>
              </div>
            </div>
          </div>

          <div
            className="grid grid-cols-2 gap-2 px-4 py-3 text-[10px] uppercase tracking-wide sm:grid-cols-4 sm:px-5"
            style={{ backgroundColor: soft }}
          >
            <div>
              <p className="text-pos-ink-faint">Invoice no.</p>
              <p className="mt-0.5 font-semibold normal-case tracking-normal text-pos-ink">
                {invoiceNo}
              </p>
            </div>
            <div>
              <p className="text-pos-ink-faint">Issued</p>
              <p className="mt-0.5 font-semibold normal-case tracking-normal text-pos-ink">
                {new Date().toLocaleDateString("en-GB")}
              </p>
            </div>
            <div>
              <p className="text-pos-ink-faint">Due</p>
              <p className="mt-0.5 font-semibold normal-case tracking-normal text-pos-ink">
                {new Date(Date.now() + 7 * 86400000).toLocaleDateString("en-GB")}
              </p>
            </div>
            <div>
              <p className="text-pos-ink-faint">Currency</p>
              <p className="mt-0.5 font-semibold normal-case tracking-normal text-pos-ink">
                {draft.currency || "NGN"}
              </p>
            </div>
          </div>

          <div className="px-4 py-4 sm:px-5">
            <p className="text-[11px] text-pos-ink-faint">Bill to</p>
            <p className="text-sm font-semibold text-pos-ink">Sample Customer</p>
            <table className="mt-4 w-full text-left text-[12px]">
              <thead>
                <tr className="border-b border-pos-border text-[10px] uppercase tracking-wide text-pos-ink-faint">
                  <th className="pb-2 font-semibold">Item</th>
                  <th className="pb-2 font-semibold">Qty</th>
                  <th className="pb-2 text-right font-semibold">Unit</th>
                  <th className="pb-2 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {INVOICE_LINES.map((line) => (
                  <tr key={line.name} className="border-b border-pos-border/50">
                    <td className="py-2 text-pos-ink">{line.name}</td>
                    <td className="py-2 text-pos-ink-muted">{line.qty}</td>
                    <td className="py-2 text-right tabular-nums text-pos-ink-muted">
                      {money(line.price, draft.currency, 2)}
                    </td>
                    <td className="py-2 text-right tabular-nums font-medium text-pos-ink">
                      {money(line.qty * line.price, draft.currency, 2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 ml-auto w-full max-w-[220px] space-y-1 text-[12px]">
              <div className="flex justify-between text-pos-ink-muted">
                <span>Subtotal</span>
                <span className="tabular-nums">{money(subtotal, draft.currency, 2)}</span>
              </div>
              <div className="flex justify-between text-pos-ink-muted">
                <span>Tax / VAT 7.5%</span>
                <span className="tabular-nums">{money(tax, draft.currency, 2)}</span>
              </div>
              <div
                className="flex justify-between border-t border-pos-border pt-2 text-[14px] font-semibold"
                style={{ color: brand }}
              >
                <span>Total</span>
                <span className="tabular-nums">{money(total, draft.currency, 2)}</span>
              </div>
            </div>
            {draft.invoicePaymentNote ? (
              <p className="mt-4 text-[11px] text-pos-ink-muted">{draft.invoicePaymentNote}</p>
            ) : null}
            {draft.invoiceTerms ? (
              <p className="mt-2 text-[11px] leading-relaxed text-pos-ink-faint">
                {draft.invoiceTerms}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
