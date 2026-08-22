import { DepartmentPage } from "@/components/DepartmentPage";
import { InventoryWorkflow } from "@/components/transactions/InventoryWorkflow";

export default async function StockTransactionPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const key = slug.join("/");

  if (key === "inventory-transfer") return <InventoryWorkflow variant="transfer" />;
  if (key === "inventory-adjustment") return <InventoryWorkflow variant="adjustment" />;

  return (
    <DepartmentPage
      kicker="Transaction · Stock"
      title={slug.length ? slug.join(" / ") : "Stock"}
    />
  );
}
