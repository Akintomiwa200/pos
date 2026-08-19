export default function FinancePage() {
  return (
    <section>
      <h1 className="text-2xl font-semibold">Finance</h1>
      <p className="mt-1 text-neutral-500">
        Naira settlements, FIRS VAT at 7.5%, and books export.
      </p>
      <ul className="mt-6 list-disc space-y-1 pl-5 text-sm text-neutral-700">
        <li>VAT 7.5% on taxable items (FIRS e-invoicing)</li>
        <li>Withholding tax on applicable B2B invoices</li>
        <li>Push daily sales to QuickBooks, Sage, or Zoho Books</li>
        <li>Paystack / Flutterwave / Moniepoint settlement reports</li>
      </ul>
    </section>
  );
}
