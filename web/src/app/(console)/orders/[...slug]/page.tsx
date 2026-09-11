import { redirect } from "next/navigation";
import { OrderApprovedPage } from "@/components/orders/OrderApprovedPage";
import { OrderCancelledPage } from "@/components/orders/OrderCancelledPage";
import { OrderDetailPage } from "@/components/orders/OrderDetailPage";
import { OrderDraftsPage } from "@/components/orders/OrderDraftsPage";
import { OrderEditorPage } from "@/components/orders/OrderEditorPage";
import OrderIndexPage from "@/components/orders/OrderIndexPage";
import { OrderListPage } from "@/components/orders/OrderListPage";
import { OrderPendingPage } from "@/components/orders/OrderPendingPage";
import { OrderPreviewPage } from "@/components/orders/OrderPreviewPage";
import { OrderReceivePage } from "@/components/orders/OrderReceivePage";
import { OrderReceivedPage } from "@/components/orders/OrderReceivedPage";
import { OrderReceivingPage } from "@/components/orders/OrderReceivingPage";
import { OrderSummaryPage } from "@/components/orders/OrderSummaryPage";

const HUB_ROUTES = new Set([
  "",
  "index",
  "list",
  "new",
  "drafts",
  "pending",
  "approved",
  "receiving",
  "received",
  "cancelled",
  "summary",
]);

export default async function OrdersPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const key = slug.join("/");

  if (key === "" || key === "index") return <OrderIndexPage />;
  if (key === "list") return <OrderListPage />;
  if (key === "new") return <OrderEditorPage />;
  if (key === "drafts") return <OrderDraftsPage />;
  if (key === "pending") return <OrderPendingPage />;
  if (key === "approved") return <OrderApprovedPage />;
  if (key === "receiving") return <OrderReceivingPage />;
  if (key === "received") return <OrderReceivedPage />;
  if (key === "cancelled") return <OrderCancelledPage />;
  if (key === "summary") return <OrderSummaryPage />;

  if (slug[0] === "edit" && slug[1]) return <OrderEditorPage orderId={slug[1]} />;
  if (slug[0] === "preview" && slug[1]) return <OrderPreviewPage orderId={slug[1]} />;
  if (slug[0] === "receive" && slug[1]) return <OrderReceivePage orderId={slug[1]} />;

  if (slug.length === 1 && !HUB_ROUTES.has(slug[0])) {
    return <OrderDetailPage orderId={slug[0]} />;
  }

  redirect("/orders");
}