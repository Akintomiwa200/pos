export default function AuditPage() {
  return (
    <section>
      <h1 className="text-2xl font-semibold">Audit</h1>
      <p className="mt-1 text-neutral-500">
        Daily financial summaries and cash register audits (X-report and
        Z-report).
      </p>
      <ul className="mt-6 list-disc space-y-1 pl-5 text-sm text-neutral-700">
        <li>X-report: mid-shift snapshot without closing the till</li>
        <li>Z-report: end-of-day close</li>
        <li>Voids, refunds, cash expected vs counted</li>
      </ul>
    </section>
  );
}
