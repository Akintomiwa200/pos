import VerticalPage from "../_vertical";

export default function Page() {
  return (
    <VerticalPage
      kicker="Solutions · Restaurant"
      title="Floor, kitchen, and split bills."
      copy="Tables and KDS on the till; invoices and tax in HQ."
      points={[
        "Open a table, send to kitchen, split tenders, print a receipt.",
        "Service charge and VAT follow store settings from the till.",
        "Managers use HQ for Z reports, expenses, and staff groups.",
      ]}
    />
  );
}
