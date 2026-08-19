export default function ProcurementPage() {
  return (
    <section>
      <h1 className="text-2xl font-semibold">Procurement</h1>
      <p className="mt-1 text-neutral-500">
        Stock levels, waste reduction, and automatic reorder when on-hand hits
        the reorder point.
      </p>
      <ul className="mt-6 list-disc space-y-1 pl-5 text-sm text-neutral-700">
        <li>Purchase orders and receiving</li>
        <li>Supplier catalog</li>
        <li>Par levels / auto-reorder (domain: `StockLevel.needs_reorder`)</li>
      </ul>
    </section>
  );
}
