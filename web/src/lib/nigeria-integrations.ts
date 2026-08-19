export const NIGERIA_INTEGRATIONS = [
  {
    category: "payments",
    label: "Payment providers",
    blurb:
      "Cards (Verve / Mastercard / Visa), bank transfer, USSD, and in-store terminals.",
    providers: [
      { name: "Paystack", role: "Online checkout, cards, transfer, USSD" },
      { name: "Flutterwave", role: "Cards, transfers, and payouts" },
      { name: "Moniepoint", role: "Push-to-terminal POS and transfer" },
      { name: "Interswitch", role: "WebPAY and Verve acquiring" },
    ],
  },
  {
    category: "delivery",
    label: "Food delivery systems",
    blurb: "Marketplace orders land on the same ticket as walk-in sales.",
    providers: [
      { name: "Chowdeck", role: "Nigeria-first restaurant delivery" },
      { name: "Glovo", role: "On-demand food and grocery" },
    ],
  },
  {
    category: "hardware",
    label: "Hardware",
    blurb: "Android POS, printers, and scanners used on Nigerian shop floors.",
    providers: [
      { name: "Moniepoint POS", role: "Android terminal, card + transfer" },
      { name: "OPay Smart POS", role: "Merchant Android POS" },
      { name: "PalmPay POS", role: "Agent and merchant terminals" },
      { name: "Sunmi", role: "Handheld POS and kitchen printers" },
      { name: "Zebra", role: "Barcode scanners and labels" },
    ],
  },
  {
    category: "ecommerce",
    label: "eCommerce",
    blurb: "Sync catalogue and stock between the store and online channels.",
    providers: [
      { name: "Jumia", role: "Nigeria marketplace orders" },
      { name: "Konga", role: "Marketplace catalogue sync" },
      { name: "Shopify", role: "Own online storefront" },
      { name: "WooCommerce", role: "WordPress storefront" },
    ],
  },
  {
    category: "accounting",
    label: "Accounting software",
    blurb: "Daily sales, VAT 7.5%, and FIRS-ready journals.",
    providers: [
      { name: "QuickBooks", role: "SME ledgers" },
      { name: "Sage", role: "Retail and hotel books" },
      { name: "Zoho Books", role: "Invoicing and expenses" },
      { name: "FIRS e-invoicing", role: "VAT 7.5% compliant invoices" },
    ],
  },
  {
    category: "caller_id",
    label: "Caller ID",
    blurb: "Recognise regulars on inbound MTN, Airtel, Glo, and 9mobile calls.",
    providers: [
      { name: "Phone-order CLI", role: "Match CLI to customer history" },
      { name: "MTN", role: "Inbound caller line identity" },
      { name: "Airtel", role: "Inbound caller line identity" },
      { name: "Glo", role: "Inbound caller line identity" },
    ],
  },
] as const;
