import type { HqCompany, HqOrgSettings } from "@/lib/hq-setup";

function money(n: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: currency || "NGN",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString()}`;
  }
}

/** Plain-text ticket matching till print layout, derived from real data only. */
export function buildReceiptPreviewText(
  draft: HqOrgSettings,
  company: HqCompany | null,
  options?: {
    lines?: { name: string; sku?: string; qty: number; price: number }[];
    customer?: { name?: string; phone?: string } | null;
  },
): string {
  const lines = options?.lines ?? [];
  const customerName = options?.customer?.name || "";
  const customerPhone = options?.customer?.phone || "";
  const title = (draft.receiptTitle ?? "").trim() || company?.name || "";
  const address = (draft.receiptAddress ?? "").trim() || company?.address || "";
  const email = (draft.receiptEmail ?? "").trim() || company?.email || "";
  const phone = company?.phone || "";
  const barcode = (draft.receiptBarcodeValue ?? "").trim() || "";
  const subtotal = lines.reduce((sum, line) => sum + line.qty * line.price, 0);
  const showDiscount = draft.receiptShowDiscount !== false;
  const discount = 0;
  const afterDiscount = Math.max(0, subtotal - discount);
  const tax = draft.receiptShowTax ? Math.round(afterDiscount * 0.075) : 0;
  const showLoyaltyRedeem = draft.receiptShowLoyalty && draft.receiptShowLoyaltyRedeemed !== false;
  const loyaltyRedeem = 0;
  const giftCharge = 0;
  const total = afterDiscount + (draft.pricesIncludeVat ? 0 : tax) - loyaltyRedeem;
  const due = Math.max(0, total - giftCharge);
  const change = 0;
  const when = new Date();
  const loyaltyAfter = 0;

  const isMinimal = draft.receiptTemplate === "minimal";
  const rows: string[] = [
    ...(draft.receiptShowTitle !== false && title ? [title] : []),
    ...(!isMinimal && draft.receiptShowAddress !== false && address ? [address] : []),
    ...(!isMinimal && draft.receiptShowEmail !== false && email ? [email] : []),
    ...(!isMinimal && draft.receiptShowPhone !== false && phone ? [phone] : []),
    ...(draft.receiptShowHeader !== false && draft.receiptHeader
      ? [draft.receiptHeader]
      : []),
    "--------------------------------",
    ...(draft.receiptShowTicketNumber !== false && barcode
      ? [`Receipt # ${barcode}`]
      : []),
    ...(draft.receiptShowDate !== false
      ? [
          `${when.toLocaleDateString("en-GB")} ${when.toLocaleTimeString("en-GB", {
            hour12: false,
          })}`,
        ]
      : []),
    ...(draft.receiptShowCashier ? [`Cashier: `] : []),
    ...(draft.receiptShowTill ? [`Till: `] : []),
    ...(draft.receiptShowCustomer
      ? [
          `Customer: ${customerName}`,
          ...(draft.receiptShowCustomerPhone !== false && customerPhone
            ? [`Phone: ${customerPhone}`]
            : []),
        ]
      : []),
    "--------------------------------",
    ...lines.flatMap((line) => [
      `${line.name}${draft.showSkuOnReceipt && line.sku ? ` · ${line.sku}` : ""}  ${money(
        line.qty * line.price,
        draft.currency,
      )}`,
      `  ${line.qty} × ${money(line.price, draft.currency)}`,
    ]),
    "--------------------------------",
    `Subtotal     ${money(subtotal, draft.currency)}`,
    ...(showDiscount && discount > 0
      ? [`Discount     -${money(discount, draft.currency)}`]
      : []),
    ...(draft.receiptShowTax ? [`VAT 7.5%     ${money(tax, draft.currency)}`] : []),
    ...(loyaltyRedeem > 0
      ? [`Loyalty      -${money(loyaltyRedeem, draft.currency)}`]
      : []),
    `TOTAL        ${money(total, draft.currency)}`,
    ...(draft.receiptShowTender
      ? [
          `Paid by `,
          `Tendered     ${money(0, draft.currency)}`,
          ...(draft.receiptShowChange !== false
            ? [`Change       ${money(change, draft.currency)}`]
            : []),
        ]
      : []),
    ...(draft.receiptShowLoyalty
      ? [
          "--------------------------------",
          "Loyalty",
          `No. `,
          ...(draft.receiptShowLoyaltyBalance !== false
            ? [`Balance before 0 pts`]
            : []),
          ...(draft.receiptShowLoyaltyRedeemed !== false
            ? [`Points used  -0 pts`]
            : []),
          ...(draft.receiptShowLoyaltyEarned !== false
            ? [`Points earned +0 pts`]
            : []),
          ...(draft.receiptShowLoyaltyBalance !== false
            ? [`Balance after ${loyaltyAfter} pts`]
            : []),
        ]
      : []),
    ...(draft.receiptShowGiftCard
      ? [
          "--------------------------------",
          "Gift card",
          `Card `,
          `Charged      ${money(0, draft.currency)}`,
          ...(draft.receiptShowGiftCardBalance !== false
            ? [`Balance left ${money(0, draft.currency)}`]
            : []),
        ]
      : []),
    ...(draft.receiptShowBarcode && barcode ? [`*${barcode}*`] : []),
    "--------------------------------",
    ...(draft.receiptShowFooter !== false && draft.receiptFooter
      ? [draft.receiptFooter]
      : []),
    ...(draft.receiptShowPoweredBy ? ["Powered by Herkintormiwer"] : []),
    "",
  ];

  return rows.filter((line) => line !== "").join("\n");
}