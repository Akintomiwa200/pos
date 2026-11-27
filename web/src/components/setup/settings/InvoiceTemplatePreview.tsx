"use client";

import type { CSSProperties, ReactElement } from "react";
import type { HqCompany, HqOrgSettings } from "@/lib/hq-setup";
import {
  invoiceTemplateMeta,
  type InvoiceTemplateId,
} from "@/lib/invoice-templates";
import { usePreviewData } from "./DocumentPreviews";

type PreviewLine = { name: string; sku?: string; qty: number; price: number };

type InvoiceModel = {
  brand: string;
  panel: string;
  currency: string;
  invoiceNo: string;
  issued: string;
  due: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  lines: PreviewLine[];
  subtotal: number;
  tax: number;
  total: number;
};

function money(n: number, currency: string, fraction = 2) {
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
  const parts = (name || "Your company").trim().split(/\s+/).filter(Boolean);
  return (parts.length ? parts.slice(0, 2) : ["Y", "C"])
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function CompanyMark({
  company,
  showLogo,
  onDark = false,
  brand,
}: {
  company: HqCompany | null;
  showLogo: boolean;
  onDark?: boolean;
  brand: string;
}) {
  if (!showLogo) return null;
  if (company?.logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={company.logoUrl}
        alt={company.name}
        className="mb-2 block size-9 rounded-md object-cover"
      />
    );
  }
  return (
    <span
      className={`mb-2 grid size-9 place-items-center rounded-md text-[11px] font-bold ${
        onDark ? "bg-white/15 text-white" : "text-white"
      }`}
      style={onDark ? undefined : { backgroundColor: brand }}
    >
      {initials(company?.name)}
    </span>
  );
}

function LineRows({
  model,
  variant,
}: {
  model: InvoiceModel;
  variant: "plain" | "striped" | "bordered" | "tight";
}) {
  const rowClass =
    variant === "striped"
      ? "border-b border-slate-200 bg-slate-50/70 even:bg-white"
      : variant === "bordered"
        ? "border-b border-dashed border-current/20"
        : variant === "tight"
          ? "border-b border-slate-100"
          : "border-b border-slate-200/80";

  return (
    <>
      {model.lines.map((line, index) => (
        <tr key={`${line.name}-${index}`} className={rowClass}>
          <td className="py-2 text-slate-800">
            <span className="block truncate font-medium">{line.name}</span>
            {line.sku ? (
              <span className="block text-[9px] uppercase tracking-wide text-slate-400">
                {line.sku}
              </span>
            ) : null}
          </td>
          <td className="py-2 text-center tabular-nums text-slate-500">{line.qty}</td>
          <td className="py-2 text-right tabular-nums text-slate-500">
            {money(line.price, model.currency)}
          </td>
          <td className="py-2 text-right font-semibold tabular-nums text-slate-900">
            {money(line.qty * line.price, model.currency)}
          </td>
        </tr>
      ))}
    </>
  );
}

function Totals({
  model,
  variant,
  accent,
}: {
  model: InvoiceModel;
  variant: "plain" | "boxed" | "dark" | "gold" | "coral";
  accent: string;
}) {
  const wrapper =
    variant === "dark"
      ? "rounded-xl bg-slate-900 p-3 text-white"
      : variant === "coral"
        ? "rounded-xl p-3 text-white"
        : variant === "gold"
          ? "rounded-none border border-amber-700/40 p-3"
          : variant === "boxed"
            ? "rounded-lg border border-slate-200 bg-slate-50/70 p-3"
            : "";
  const muted = variant === "dark" || variant === "coral" ? "text-white/65" : "text-slate-500";
  const line = variant === "dark" || variant === "coral" ? "border-white/20" : "border-current/15";

  return (
    <div
      className={`ml-auto w-full max-w-[220px] space-y-1 text-[12px] ${wrapper}`}
      style={variant === "coral" ? { backgroundColor: accent } : undefined}
    >
      <div className={`flex justify-between ${muted}`}>
        <span>Subtotal</span>
        <span className="tabular-nums">{money(model.subtotal, model.currency)}</span>
      </div>
      <div className={`flex justify-between ${muted}`}>
        <span>Tax / VAT 7.5%</span>
        <span className="tabular-nums">{money(model.tax, model.currency)}</span>
      </div>
      <div
        className={`flex justify-between border-t pt-2 text-[14px] font-semibold ${line}`}
        style={variant === "dark" || variant === "coral" ? { color: "#ffffff" } : { color: accent }}
      >
        <span>Total</span>
        <span className="tabular-nums">{money(model.total, model.currency)}</span>
      </div>
    </div>
  );
}

function Notes({ draft, muted = "text-slate-500" }: { draft: HqOrgSettings; muted?: string }) {
  return (
    <>
      {draft.invoicePaymentNote ? (
        <p className={`mt-4 text-[11px] ${muted}`}>{draft.invoicePaymentNote}</p>
      ) : null}
      {draft.invoiceTerms ? (
        <p className={`mt-2 text-[11px] leading-relaxed ${muted}`}>{draft.invoiceTerms}</p>
      ) : null}
    </>
  );
}

function useInvoiceModel(draft: HqOrgSettings): InvoiceModel {
  const { invoiceLines, sale, firstCustomer } = usePreviewData();
  const subtotal = invoiceLines.reduce((sum, line) => sum + line.qty * line.price, 0);
  const tax = Math.round(subtotal * 0.075);
  return {
    brand: draft.invoiceBrandColor || "#0F2C59",
    panel: draft.invoicePanelColor || "#5788D3",
    currency: draft.currency || "NGN",
    invoiceNo: `${draft.invoicePrefix || "INV"}-${String(draft.invoiceNextNumber || 1).padStart(4, "0")}`,
    issued: new Date().toLocaleDateString("en-GB"),
    due: new Date(Date.now() + 7 * 86400000).toLocaleDateString("en-GB"),
    customerName: sale.customerName || firstCustomer?.name || "Customer record",
    customerPhone: sale.customerPhone || firstCustomer?.phone || "",
    customerEmail: firstCustomer?.email || "",
    lines: invoiceLines,
    subtotal,
    tax,
    total: draft.pricesIncludeVat ? subtotal : subtotal + tax,
  };
}

function MetaGrid({
  model,
  tint,
}: {
  model: InvoiceModel;
  tint: CSSProperties["backgroundColor"];
}) {
  const fields = [
    ["Invoice no.", model.invoiceNo],
    ["Issued", model.issued],
    ["Due", model.due],
    ["Currency", model.currency],
  ];
  return (
    <div
      className="grid grid-cols-2 gap-2 px-4 py-3 text-[10px] uppercase tracking-wide sm:grid-cols-4 sm:px-5"
      style={{ backgroundColor: tint }}
    >
      {fields.map(([label, value]) => (
        <div key={label}>
          <p className="text-slate-400">{label}</p>
          <p className="mt-0.5 font-semibold normal-case tracking-normal text-slate-700">{value}</p>
        </div>
      ))}
    </div>
  );
}

function ModernInvoice({
  draft,
  company,
  model,
}: InvoiceProps & { model: InvoiceModel }) {
  return (
    <div className="bg-white">
      <div
        className="px-4 py-4 text-white sm:px-5"
        style={{ background: `linear-gradient(120deg, ${model.brand}, ${model.panel})` }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CompanyMark company={company} showLogo={draft.invoiceShowLogo} onDark brand={model.brand} />
            <p className="truncate text-[15px] font-semibold">{company?.name || "Your company"}</p>
            <p className="mt-1 truncate text-[11px] text-white/75">{company?.address || "—"}</p>
            <p className="truncate text-[11px] text-white/75">
              {[company?.email, company?.phone].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[18px] font-semibold tracking-wide">INVOICE</p>
            <span className="mt-1 inline-flex rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-semibold text-slate-900">
              LIVE
            </span>
          </div>
        </div>
      </div>
      <MetaGrid model={model} tint={`${model.panel}22` as CSSProperties["backgroundColor"]} />
      <div className="px-4 py-4 sm:px-5">
        <p className="text-[11px] text-slate-400">Bill to</p>
        <p className="text-sm font-semibold text-slate-800">{model.customerName}</p>
        {model.customerPhone || model.customerEmail ? (
          <p className="mt-0.5 text-[10px] text-slate-400">
            {[model.customerPhone, model.customerEmail].filter(Boolean).join(" · ")}
          </p>
        ) : null}
        <table className="mt-4 w-full text-left text-[12px]">
          <thead>
            <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-400">
              <th className="pb-2 font-semibold">Item</th>
              <th className="pb-2 text-center font-semibold">Qty</th>
              <th className="pb-2 text-right font-semibold">Unit</th>
              <th className="pb-2 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            <LineRows model={model} variant="plain" />
          </tbody>
        </table>
        <div className="mt-4">
          <Totals model={model} variant="boxed" accent={model.brand} />
        </div>
        <Notes draft={draft} />
      </div>
    </div>
  );
}

function LetterheadInvoice({
  draft,
  company,
  model,
}: InvoiceProps & { model: InvoiceModel }) {
  return (
    <div className="bg-white text-slate-800">
      <div className="h-1" style={{ backgroundColor: model.brand }} />
      <div className="px-5 py-5 text-center sm:px-7">
        <CompanyMark company={company} showLogo={draft.invoiceShowLogo} brand={model.brand} />
        <p className="text-[16px] font-semibold uppercase tracking-[0.18em]">
          {company?.name || "Your company"}
        </p>
        <p className="mt-1 text-[10px] text-slate-500">{company?.address || "—"}</p>
        <p className="text-[10px] text-slate-500">
          {[company?.email, company?.phone, company?.tin].filter(Boolean).join(" · ")}
        </p>
        <div className="mt-4 flex items-center gap-3">
          <span className="h-px flex-1" style={{ backgroundColor: model.brand }} />
          <span className="font-serif text-[15px] italic tracking-wide">Invoice</span>
          <span className="h-px flex-1" style={{ backgroundColor: model.brand }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 border-y border-slate-200 px-5 py-3 text-[10px] sm:px-7">
        <div>
          <p className="uppercase tracking-wide text-slate-400">Bill to</p>
          <p className="mt-1 font-semibold">{model.customerName}</p>
          <p className="text-slate-500">{model.invoiceNo}</p>
        </div>
        <div className="text-right">
          <p className="uppercase tracking-wide text-slate-400">Dates</p>
          <p className="mt-1 font-semibold">Issued {model.issued}</p>
          <p className="text-slate-500">Due {model.due} · {model.currency}</p>
        </div>
      </div>
      <div className="px-5 py-4 sm:px-7">
        <table className="w-full text-left text-[12px]">
          <thead>
            <tr className="border-b-2 text-[10px] uppercase tracking-wide text-slate-500" style={{ borderColor: model.brand }}>
              <th className="pb-2 font-semibold">Item</th>
              <th className="pb-2 text-center font-semibold">Qty</th>
              <th className="pb-2 text-right font-semibold">Unit</th>
              <th className="pb-2 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            <LineRows model={model} variant="plain" />
          </tbody>
        </table>
        <div className="mt-4">
          <Totals model={model} variant="plain" accent={model.brand} />
        </div>
        <div className="mt-6 flex items-end justify-between gap-4">
          <Notes draft={draft} muted="text-slate-400" />
          <div className="w-32 shrink-0 border-t border-slate-300 pt-1 text-center text-[9px] uppercase tracking-wide text-slate-400">
            Authorised signature
          </div>
        </div>
      </div>
    </div>
  );
}

function ClassicInvoice({
  draft,
  company,
  model,
}: InvoiceProps & { model: InvoiceModel }) {
  return (
    <div className="bg-[#FCFCFD] p-3 text-slate-900">
      <div className="border-y-2 bg-white px-4 py-4 sm:px-5" style={{ borderColor: model.brand }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CompanyMark company={company} showLogo={draft.invoiceShowLogo} brand={model.brand} />
            <p className="font-serif text-[16px] font-bold uppercase tracking-wide">
              {company?.name || "Your company"}
            </p>
            <p className="mt-1 text-[10px] text-slate-500">{company?.address || "—"}</p>
          </div>
          <div className="text-right">
            <p className="font-serif text-[17px] font-bold tracking-[0.16em]">INVOICE</p>
            <p className="mt-1 text-[10px] font-semibold tabular-nums">{model.invoiceNo}</p>
          </div>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 border border-slate-200 bg-white p-3 text-[10px] sm:grid-cols-4">
        {[
          ["Invoice no.", model.invoiceNo],
          ["Issued", model.issued],
          ["Due", model.due],
          ["Currency", model.currency],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-0.5 font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-2 border border-slate-200 bg-white px-4 py-4 sm:px-5">
        <p className="text-[10px] uppercase tracking-wide text-slate-400">Bill to</p>
        <p className="text-[13px] font-semibold">{model.customerName}</p>
        <table className="mt-4 w-full border-collapse text-left text-[12px]">
          <thead>
            <tr className="bg-slate-100 text-[10px] uppercase tracking-wide">
              <th className="border border-slate-200 px-2 py-2 font-semibold">Item</th>
              <th className="border border-slate-200 px-1 py-2 text-center font-semibold">Qty</th>
              <th className="border border-slate-200 px-2 py-2 text-right font-semibold">Unit</th>
              <th className="border border-slate-200 px-2 py-2 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {model.lines.map((line, index) => (
              <tr key={`${line.name}-${index}`}>
                <td className="border border-slate-200 px-2 py-2">{line.name}</td>
                <td className="border border-slate-200 px-1 py-2 text-center tabular-nums">{line.qty}</td>
                <td className="border border-slate-200 px-2 py-2 text-right tabular-nums">
                  {money(line.price, model.currency)}
                </td>
                <td className="border border-slate-200 px-2 py-2 text-right font-semibold tabular-nums">
                  {money(line.qty * line.price, model.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4">
          <Totals model={model} variant="boxed" accent={model.brand} />
        </div>
        <Notes draft={draft} muted="text-slate-400" />
      </div>
    </div>
  );
}

function SapphireInvoice({
  draft,
  company,
  model,
}: InvoiceProps & { model: InvoiceModel }) {
  const sapphire = "#123A6B";
  return (
    <div className="flex min-h-[420px] flex-col bg-white sm:flex-row">
      <div
        className="flex shrink-0 flex-col p-4 text-white sm:w-[34%]"
        style={{ backgroundColor: sapphire }}
      >
        <CompanyMark company={company} showLogo={draft.invoiceShowLogo} onDark brand={sapphire} />
        <p className="text-[14px] font-semibold leading-snug">{company?.name || "Your company"}</p>
        <p className="mt-1 text-[10px] text-white/65">{company?.address || "—"}</p>
        <p className="mt-0.5 text-[10px] text-white/65">
          {[company?.email, company?.phone].filter(Boolean).join(" · ")}
        </p>
        <div className="mt-5 border-t border-white/20 pt-4">
          <p className="text-[9px] uppercase tracking-[0.16em] text-white/55">Invoice no.</p>
          <p className="mt-1 font-mono text-[12px] font-semibold">{model.invoiceNo}</p>
          <p className="mt-3 text-[9px] uppercase tracking-[0.16em] text-white/55">Amount due</p>
          <p className="mt-1 text-[16px] font-semibold tabular-nums">
            {money(model.total, model.currency)}
          </p>
        </div>
        <p className="mt-auto pt-5 text-[9px] uppercase tracking-[0.16em] text-white/45">
          Payment due {model.due}
        </p>
      </div>
      <div className="min-w-0 flex-1 p-4 sm:p-5">
        <p className="text-[17px] font-semibold tracking-wide" style={{ color: sapphire }}>
          INVOICE
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-[10px]">
          <div>
            <p className="uppercase tracking-wide text-slate-400">Bill to</p>
            <p className="mt-1 font-semibold text-slate-800">{model.customerName}</p>
          </div>
          <div className="text-right">
            <p className="uppercase tracking-wide text-slate-400">Issued</p>
            <p className="mt-1 font-semibold tabular-nums text-slate-800">{model.issued}</p>
          </div>
        </div>
        <table className="mt-4 w-full text-left text-[11px]">
          <thead>
            <tr className="text-[9px] uppercase tracking-wide text-white" style={{ backgroundColor: sapphire }}>
              <th className="px-2 py-2 font-semibold">Item</th>
              <th className="py-2 text-center font-semibold">Qty</th>
              <th className="py-2 text-right font-semibold">Unit</th>
              <th className="px-2 py-2 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            <LineRows model={model} variant="striped" />
          </tbody>
        </table>
        <div className="mt-4">
          <Totals model={model} variant="plain" accent={sapphire} />
        </div>
        <Notes draft={draft} muted="text-slate-400" />
      </div>
    </div>
  );
}

function IvoryInvoice({
  draft,
  company,
  model,
}: InvoiceProps & { model: InvoiceModel }) {
  const gold = "#B48845";
  return (
    <div className="bg-[#FBF6EC] text-[#4A3B27]">
      <div className="px-5 py-5 text-center sm:px-7">
        <CompanyMark company={company} showLogo={draft.invoiceShowLogo} brand={gold} />
        <p className="font-serif text-[17px] font-semibold uppercase tracking-[0.14em]">
          {company?.name || "Your company"}
        </p>
        <p className="mt-1 text-[10px] text-[#8B7355]">{company?.address || "—"}</p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <span className="h-px w-16" style={{ backgroundColor: gold }} />
          <span className="rotate-45 size-1.5" style={{ backgroundColor: gold }} />
          <span className="font-serif text-[15px] italic">Invoice</span>
          <span className="rotate-45 size-1.5" style={{ backgroundColor: gold }} />
          <span className="h-px w-16" style={{ backgroundColor: gold }} />
        </div>
      </div>
      <div className="mx-4 border-y border-dashed border-amber-700/30 py-3 text-[10px] sm:mx-6">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="uppercase tracking-[0.14em] text-[#9C8464]">Bill to</p>
            <p className="mt-1 font-semibold">{model.customerName}</p>
          </div>
          <div className="text-right">
            <p className="uppercase tracking-[0.14em] text-[#9C8464]">Invoice no.</p>
            <p className="mt-1 font-serif font-semibold tabular-nums">{model.invoiceNo}</p>
            <p className="text-[#9C8464]">Issued {model.issued} · Due {model.due}</p>
          </div>
        </div>
      </div>
      <div className="px-4 py-4 sm:px-6">
        <table className="w-full text-left text-[12px]">
          <thead>
            <tr className="border-b text-[10px] uppercase tracking-[0.12em]" style={{ borderColor: gold }}>
              <th className="pb-2 font-semibold">Item</th>
              <th className="pb-2 text-center font-semibold">Qty</th>
              <th className="pb-2 text-right font-semibold">Unit</th>
              <th className="pb-2 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            <LineRows model={model} variant="bordered" />
          </tbody>
        </table>
        <div className="mt-4">
          <Totals model={model} variant="gold" accent={gold} />
        </div>
        <Notes draft={draft} muted="text-[#9C8464]" />
      </div>
      <p className="pb-4 text-center font-serif text-[10px] italic text-[#9C8464]">
       Thank you for your business.
      </p>
    </div>
  );
}

function MinimalInvoice({
  draft,
  company,
  model,
}: InvoiceProps & { model: InvoiceModel }) {
  return (
    <div className="bg-white px-6 py-7 text-slate-900 sm:px-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold tracking-tight">
            {company?.name || "Your company"}
          </p>
          <p className="mt-1 text-[10px] text-slate-400">{company?.address || "—"}</p>
        </div>
        <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-400">Invoice</p>
      </div>
      <div className="mt-6 h-0.5 w-8" style={{ backgroundColor: model.brand }} />
      <div className="mt-5 grid grid-cols-2 gap-4 text-[10px] sm:grid-cols-4">
        {[
          ["No.", model.invoiceNo],
          ["Issued", model.issued],
          ["Due", model.due],
          ["Currency", model.currency],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="uppercase tracking-[0.14em] text-slate-300">{label}</p>
            <p className="mt-1 font-medium tabular-nums text-slate-600">{value}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 text-[10px] uppercase tracking-[0.14em] text-slate-300">Bill to</p>
      <p className="mt-1 text-[12px] font-medium">{model.customerName}</p>
      <table className="mt-6 w-full text-left text-[11px]">
        <thead>
          <tr className="border-b border-slate-200 text-[9px] uppercase tracking-[0.14em] text-slate-400">
            <th className="pb-2 font-medium">Item</th>
            <th className="pb-2 text-center font-medium">Qty</th>
            <th className="pb-2 text-right font-medium">Unit</th>
            <th className="pb-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          <LineRows model={model} variant="tight" />
        </tbody>
      </table>
      <div className="mt-5">
        <Totals model={model} variant="plain" accent={model.brand} />
      </div>
      <Notes draft={draft} muted="text-slate-300" />
    </div>
  );
}

function CoralInvoice({
  draft,
  company,
  model,
}: InvoiceProps & { model: InvoiceModel }) {
  const coral = "#F97362";
  return (
    <div className="bg-white">
      <div className="relative overflow-hidden px-4 py-5 text-white sm:px-5" style={{ backgroundColor: coral }}>
        <span className="pointer-events-none absolute -right-8 -top-10 size-32 rounded-full bg-white/15 blur-xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CompanyMark company={company} showLogo={draft.invoiceShowLogo} onDark brand={coral} />
            <p className="truncate text-[15px] font-semibold">{company?.name || "Your company"}</p>
            <p className="mt-1 truncate text-[11px] text-white/75">{company?.address || "—"}</p>
          </div>
          <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold tracking-wide ring-1 ring-white/30">
            INVOICE
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 bg-[#FFF1ED] px-4 py-3 text-[10px] sm:grid-cols-4 sm:px-5">
        {[
          ["Invoice no.", model.invoiceNo],
          ["Issued", model.issued],
          ["Due", model.due],
          ["Currency", model.currency],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="uppercase tracking-wide text-[#C98B7F]">{label}</p>
            <p className="mt-0.5 font-semibold tabular-nums text-[#7A3F35]">{value}</p>
          </div>
        ))}
      </div>
      <div className="px-4 py-4 sm:px-5">
        <p className="text-[11px] text-[#C98B7F]">Bill to</p>
        <p className="text-sm font-semibold text-slate-800">{model.customerName}</p>
        <table className="mt-4 w-full text-left text-[12px]">
          <thead>
            <tr className="border-b border-[#F8CFC8] text-[10px] uppercase tracking-wide text-[#C98B7F]">
              <th className="pb-2 font-semibold">Item</th>
              <th className="pb-2 text-center font-semibold">Qty</th>
              <th className="pb-2 text-right font-semibold">Unit</th>
              <th className="pb-2 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            <LineRows model={model} variant="tight" />
          </tbody>
        </table>
        <div className="mt-4">
          <Totals model={model} variant="coral" accent={coral} />
        </div>
        <Notes draft={draft} muted="text-slate-400" />
      </div>
    </div>
  );
}

function SlateInvoice({
  draft,
  company,
  model,
}: InvoiceProps & { model: InvoiceModel }) {
  return (
    <div className="bg-white">
      <div className="bg-slate-900 px-4 py-4 text-white sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CompanyMark company={company} showLogo={draft.invoiceShowLogo} onDark brand="#1F2937" />
            <p className="truncate text-[15px] font-semibold">{company?.name || "Your company"}</p>
            <p className="mt-1 truncate text-[10px] text-white/55">{company?.address || "—"}</p>
          </div>
          <div className="text-right">
            <p className="text-[16px] font-semibold tracking-[0.18em]">INVOICE</p>
            <p className="mt-1 font-mono text-[10px] text-white/55">{model.invoiceNo}</p>
          </div>
        </div>
      </div>
      <div className="h-1" style={{ backgroundColor: model.brand }} />
      <div className="grid grid-cols-2 gap-2 bg-slate-100 px-4 py-3 text-[10px] sm:grid-cols-4 sm:px-5">
        {[
          ["Issued", model.issued],
          ["Due", model.due],
          ["Currency", model.currency],
          ["Status", "Live"],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-0.5 font-semibold tabular-nums text-slate-700">{value}</p>
          </div>
        ))}
      </div>
      <div className="px-4 py-4 sm:px-5">
        <p className="text-[11px] text-slate-400">Bill to</p>
        <p className="text-sm font-semibold text-slate-800">{model.customerName}</p>
        <table className="mt-4 w-full text-left text-[12px]">
          <thead>
            <tr className="bg-slate-800 text-[10px] uppercase tracking-wide text-white">
              <th className="px-2 py-2 font-semibold">Item</th>
              <th className="py-2 text-center font-semibold">Qty</th>
              <th className="py-2 text-right font-semibold">Unit</th>
              <th className="px-2 py-2 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            <LineRows model={model} variant="striped" />
          </tbody>
        </table>
        <div className="mt-4">
          <Totals model={model} variant="dark" accent={model.brand} />
        </div>
        <Notes draft={draft} muted="text-slate-400" />
      </div>
      <div className="flex items-center justify-between bg-slate-900 px-4 py-2 text-[9px] uppercase tracking-wide text-white/45 sm:px-5">
        <span>{company?.name || "Your company"}</span>
        <span>{model.currency}</span>
      </div>
    </div>
  );
}

type InvoiceProps = {
  draft: HqOrgSettings;
  company: HqCompany | null;
};

const RENDERERS: Record<InvoiceTemplateId, (props: InvoiceProps & { model: InvoiceModel }) => ReactElement> = {
  modern: ModernInvoice,
  letterhead: LetterheadInvoice,
  classic: ClassicInvoice,
  sapphire: SapphireInvoice,
  ivory: IvoryInvoice,
  minimal: MinimalInvoice,
  coral: CoralInvoice,
  slate: SlateInvoice,
};

/** Live A4 invoice — each template has its own layout, not just a colour swap. */
export function InvoiceLivePreview({ draft, company }: InvoiceProps) {
  const model = useInvoiceModel(draft);
  const meta = invoiceTemplateMeta(draft.invoiceTemplate);
  const Renderer = RENDERERS[draft.invoiceTemplate] ?? ModernInvoice;

  return (
    <div className="overflow-hidden rounded-[22px] border border-pos-border/70 bg-pos-surface shadow-pos-md">
      <div className="flex items-center justify-between gap-3 border-b border-pos-border/60 bg-pos-surface-muted/50 px-4 py-2.5">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-pos-ink-faint">
          Live invoice preview
        </p>
        <span
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
          style={{ backgroundColor: model.brand }}
        >
          {meta.label}
        </span>
      </div>
      <div className="bg-[#EEF1F5] p-3 sm:p-4">
        <div className="overflow-hidden rounded-lg bg-white shadow-sm" style={{ backgroundColor: meta.paper }}>
          <Renderer draft={draft} company={company} model={model} />
        </div>
      </div>
    </div>
  );
}
