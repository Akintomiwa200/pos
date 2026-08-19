export type IntegrationCategory =
  | 'payments'
  | 'delivery'
  | 'hardware'
  | 'ecommerce'
  | 'accounting'
  | 'caller_id';

export type IntegrationProvider = {
  id: string;
  name: string;
  role: string;
};

export type IntegrationGroup = {
  category: IntegrationCategory;
  label: string;
  blurb: string;
  providers: IntegrationProvider[];
};

export const NIGERIA_INTEGRATIONS: IntegrationGroup[] = [
  {
    category: 'payments',
    label: 'Payment providers',
    blurb: 'Cards (Verve/Mastercard/Visa), bank transfer, USSD, and in-store terminals.',
    providers: [
      { id: 'paystack', name: 'Paystack', role: 'Online checkout, cards, transfer, USSD' },
      { id: 'flutterwave', name: 'Flutterwave', role: 'Cards, transfers, and payouts' },
      { id: 'moniepoint', name: 'Moniepoint', role: 'Push-to-terminal POS and transfer' },
      { id: 'interswitch', name: 'Interswitch', role: 'WebPAY and Verve acquiring' },
    ],
  },
  {
    category: 'delivery',
    label: 'Food delivery systems',
    blurb: 'Marketplace orders land on the same ticket as walk-in sales.',
    providers: [
      { id: 'chowdeck', name: 'Chowdeck', role: 'Nigeria-first restaurant delivery' },
      { id: 'glovo', name: 'Glovo', role: 'On-demand food and grocery' },
    ],
  },
  {
    category: 'hardware',
    label: 'Hardware',
    blurb: 'Android POS, printers, and scanners used on Nigerian shop floors.',
    providers: [
      { id: 'moniepoint-pos', name: 'Moniepoint POS', role: 'Android terminal, card + transfer' },
      { id: 'opay-pos', name: 'OPay Smart POS', role: 'Merchant Android POS' },
      { id: 'palmpay-pos', name: 'PalmPay POS', role: 'Agent and merchant terminals' },
      { id: 'sunmi', name: 'Sunmi', role: 'Handheld POS and kitchen printers' },
      { id: 'zebra', name: 'Zebra', role: 'Barcode scanners and labels' },
    ],
  },
  {
    category: 'ecommerce',
    label: 'eCommerce',
    blurb: 'Sync catalogue and stock between the store and online channels.',
    providers: [
      { id: 'jumia', name: 'Jumia', role: 'Nigeria marketplace orders' },
      { id: 'konga', name: 'Konga', role: 'Marketplace catalogue sync' },
      { id: 'shopify', name: 'Shopify', role: 'Own online storefront' },
      { id: 'woocommerce', name: 'WooCommerce', role: 'WordPress storefront' },
    ],
  },
  {
    category: 'accounting',
    label: 'Accounting software',
    blurb: 'Daily sales, VAT 7.5%, and FIRS-ready journals.',
    providers: [
      { id: 'quickbooks', name: 'QuickBooks', role: 'SME ledgers' },
      { id: 'sage', name: 'Sage', role: 'Retail and hotel books' },
      { id: 'zoho-books', name: 'Zoho Books', role: 'Invoicing and expenses' },
      { id: 'firs', name: 'FIRS e-invoicing', role: 'VAT 7.5% compliant invoices' },
    ],
  },
  {
    category: 'caller_id',
    label: 'Caller ID',
    blurb: 'Recognise regulars on inbound MTN, Airtel, Glo, and 9mobile calls.',
    providers: [
      { id: 'cli-lookup', name: 'Phone-order CLI', role: 'Match CLI to customer history' },
      { id: 'mtn', name: 'MTN', role: 'Inbound caller line identity' },
      { id: 'airtel', name: 'Airtel', role: 'Inbound caller line identity' },
      { id: 'glo', name: 'Glo', role: 'Inbound caller line identity' },
    ],
  },
];
