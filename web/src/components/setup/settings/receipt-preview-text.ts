import type { HqCompany, HqOrgSettings } from "@/lib/hq-setup";

const LINES = [
  { name: "Jollof rice (large)", sku: "FD-101", qty: 2, price: 3500 },
  { name: "Chapman", sku: "DR-044", qty: 1, price: 2500 },
  { name: "Grilled chicken", sku: "FD-220", qty: 1, price: 6500 },
];

const DEMO = {
  ticketId: "10482001933",
  cashier: "Adaeze Okafor",
  till: "TILL-01 · VI",
  customerName: "Chioma Adeyemi",
  customerPhone: "0803 123 4567",
  tender: "Cash",
  tendered: 20000,
  discount: 500,
  loyaltyNumber: "LY-88421",
  loyaltyBalanceBefore: 1240,
  loyaltyPointsRedeemed: 100,
  loyaltyRedeemValue: 1000,
  loyaltyPointsEarned: 12,
  giftCardCode: "GC-····4821",
  giftCardCharged: 2000,
  giftCardBalanceAfter: 8000,
};

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

/** Plain-text ticket matching till print layout (sample sale for Settings). */
export function buildReceiptPreviewText(
  draft: HqOrgSettings,
  company: HqCompany | null,
): string {
  const title = (draft.receiptTitle ?? "").trim() || company?.name || "Your company";
  const address = (draft.receiptAddress ?? "").trim() || company?.address || "";
  const email = (draft.receiptEmail ?? "").trim() || company?.email || "";
  const phone = company?.phone || "";
  const barcode =
    (draft.receiptBarcodeValue ?? "").trim() || DEMO.ticketId;
  const subtotal = LINES.reduce((sum, line) => sum + line.qty * line.price, 0);
  const showDiscount = draft.receiptShowDiscount !== false;
  const discount = showDiscount ? DEMO.discount : 0;
  const afterDiscount = Math.max(0, subtotal - discount);
  const tax = draft.receiptShowTax ? Math.round(afterDiscount * 0.075) : 0;
  const showLoyaltyRedeem = draft.receiptShowLoyalty && draft.receiptShowLoyaltyRedeemed !== false;
  const loyaltyRedeem = showLoyaltyRedeem ? DEMO.loyaltyRedeemValue : 0;
  const giftCharge = draft.receiptShowGiftCard ? DEMO.giftCardCharged : 0;
  const total = afterDiscount + (draft.pricesIncludeVat ? 0 : tax) - loyaltyRedeem;
  const due = Math.max(0, total - giftCharge);
  const change = Math.max(0, DEMO.tendered - due);
  const when = new Date();
  const loyaltyAfter =
    DEMO.loyaltyBalanceBefore - DEMO.loyaltyPointsRedeemed + DEMO.loyaltyPointsEarned;

  const rows: string[] = [
    ...(draft.receiptShowTitle !== false ? [title] : []),
    ...(draft.receiptShowAddress !== false && address ? [address] : []),
    ...(draft.receiptShowEmail !== false && email ? [email] : []),
    ...(draft.receiptShowPhone !== false && phone ? [phone] : []),
    ...(draft.receiptShowHeader !== false && draft.receiptHeader
      ? [draft.receiptHeader]
      : []),
    "--------------------------------",
    ...(draft.receiptShowTicketNumber !== false ? [`Receipt # ${barcode}`] : []),
    ...(draft.receiptShowDate !== false
      ? [
          `${when.toLocaleDateString("en-GB")} ${when.toLocaleTimeString("en-GB", {
            hour12: false,
          })}`,
        ]
      : []),
    ...(draft.receiptShowCashier ? [`Cashier: ${DEMO.cashier}`] : []),
    ...(draft.receiptShowTill ? [`Till: ${DEMO.till}`] : []),
    ...(draft.receiptShowCustomer
      ? [
          `Customer: ${DEMO.customerName}`,
          ...(draft.receiptShowCustomerPhone !== false
            ? [`Phone: ${DEMO.customerPhone}`]
            : []),
        ]
      : []),
    "--------------------------------",
    ...LINES.flatMap((line) => [
      `${line.name}${draft.showSkuOnReceipt ? ` · ${line.sku}` : ""}  ${money(
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
          `Paid by ${DEMO.tender}`,
          `Tendered     ${money(DEMO.tendered, draft.currency)}`,
          ...(draft.receiptShowChange !== false
            ? [`Change       ${money(change, draft.currency)}`]
            : []),
        ]
      : []),
    ...(draft.receiptShowLoyalty
      ? [
          "--------------------------------",
          "Loyalty",
          `No. ${DEMO.loyaltyNumber}`,
          ...(draft.receiptShowLoyaltyBalance !== false
            ? [`Balance before ${DEMO.loyaltyBalanceBefore} pts`]
            : []),
          ...(draft.receiptShowLoyaltyRedeemed !== false
            ? [`Points used  -${DEMO.loyaltyPointsRedeemed} pts`]
            : []),
          ...(draft.receiptShowLoyaltyEarned !== false
            ? [`Points earned +${DEMO.loyaltyPointsEarned} pts`]
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
          `Card ${DEMO.giftCardCode}`,
          `Charged      ${money(DEMO.giftCardCharged, draft.currency)}`,
          ...(draft.receiptShowGiftCardBalance !== false
            ? [`Balance left ${money(DEMO.giftCardBalanceAfter, draft.currency)}`]
            : []),
        ]
      : []),
    ...(draft.receiptShowBarcode ? [`*${barcode}*`] : []),
    "--------------------------------",
    ...(draft.receiptShowFooter !== false && draft.receiptFooter
      ? [draft.receiptFooter]
      : []),
    ...(draft.receiptShowPoweredBy ? ["Powered by Herkintormiwer"] : []),
    "",
  ];

  return rows.filter((line) => line !== "").join("\n");
}
