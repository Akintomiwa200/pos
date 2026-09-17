import { DepartmentPage } from "@/components/DepartmentPage";
import { InventoryTransfer } from "@/components/transactions/InventoryTransfer";
import { InventoryTransferNew } from "@/components/transactions/InventoryTransferNew";
import { InventoryAdjustment } from "@/components/transactions/InventoryAdjustment";

export default async function StockTransactionPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const key = slug.join("/");

  if (key === "inventory-transfer") return <InventoryTransfer />;
  if (key === "inventory-transfer/new") return <InventoryTransferNew />;
  if (key === "inventory-adjustment") return <InventoryAdjustment />;

  return (
    <DepartmentPage
      kicker="Transaction · Stock"
      title={slug.length ? slug.join(" / ") : "Stock"}
    />
  );
}
