import { DepartmentPage } from "@/components/DepartmentPage";
import {
  DocManager,
  PURCHASE_INVOICE_CONFIG,
  PURCHASE_ORDER_CONFIG,
  PURCHASE_RETURN_CONFIG,
} from "@/components/transactions/DocManager";

const ROUTES: Record<string, { config: typeof PURCHASE_ORDER_CONFIG; mode: "list" | "summary" | "book" | "history" }> = {
  "invoice/list": { config: PURCHASE_INVOICE_CONFIG, mode: "list" },
  "invoice/summary": { config: PURCHASE_INVOICE_CONFIG, mode: "summary" },
  "invoice/book": { config: PURCHASE_INVOICE_CONFIG, mode: "book" },
  "invoice/history": { config: PURCHASE_INVOICE_CONFIG, mode: "history" },
  "order/list": { config: PURCHASE_ORDER_CONFIG, mode: "list" },
  "order/summary": { config: PURCHASE_ORDER_CONFIG, mode: "summary" },
  "return/list": { config: PURCHASE_RETURN_CONFIG, mode: "list" },
  "return/summary": { config: PURCHASE_RETURN_CONFIG, mode: "summary" },
};

export default async function PurchaseTransactionPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const key = slug.join("/");
  const route = ROUTES[key];
  if (!route) {
    return (
      <DepartmentPage
        kicker="Transaction · Purchase"
        title={slug.length ? slug.join(" / ") : "Purchase"}
      />
    );
  }
  return <DocManager config={route.config} mode={route.mode} />;
}
