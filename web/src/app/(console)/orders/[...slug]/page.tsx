import { redirect } from "next/navigation";
import { DepartmentPage } from "@/components/DepartmentPage";
import {
  OrderApprovalManager,
  OrderEditor,
  OrderListManager,
  OrderPreview,
  OrderReceivingManager,
  OrderSummaryManager,
} from "@/components/orders/OrderManagers";

export default async function OrdersPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const key = slug.join("/");

  if (key === "" || key === "list") return <OrderListManager bucket="list" />;
  if (key === "new") return <OrderEditor />;
  if (key === "drafts") return <OrderListManager bucket="drafts" />;
  if (key === "pending") return <OrderApprovalManager />;
  if (key === "approved") return <OrderListManager bucket="approved" />;
  if (key === "receiving") return <OrderReceivingManager />;
  if (key === "received") return <OrderListManager bucket="received" />;
  if (key === "cancelled") return <OrderListManager bucket="cancelled" />;
  if (key === "summary") return <OrderSummaryManager />;

  if (slug[0] === "edit" && slug[1]) return <OrderEditor orderId={slug[1]} />;
  if (slug[0] === "preview" && slug[1]) return <OrderPreview orderId={slug[1]} />;

  if (key === "order/list") redirect("/orders/list");
  if (key === "order/summary") redirect("/orders/summary");

  return (
    <DepartmentPage
      kicker="Analytics · Orders"
      title={slug.length ? slug.join(" / ") : "Orders"}
    />
  );
}
