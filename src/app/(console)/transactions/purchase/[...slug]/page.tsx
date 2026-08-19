import { DepartmentPage } from "@/components/DepartmentPage";

const TITLES: Record<string, { kicker: string; title: string }> = {
  "invoice/list": { kicker: "Transaction · Purchase · Invoice", title: "Invoice list" },
  "invoice/summary": { kicker: "Transaction · Purchase · Invoice", title: "Invoice summary" },
  "invoice/book": { kicker: "Transaction · Purchase · Invoice", title: "Invoice book" },
  "invoice/history": { kicker: "Transaction · Purchase · Invoice", title: "Invoice history" },
  "order/list": { kicker: "Transaction · Purchase · Order", title: "Order list" },
  "order/summary": { kicker: "Transaction · Purchase · Order", title: "Order summary" },
  "return/list": { kicker: "Transaction · Purchase · Return", title: "Return list" },
  "return/summary": { kicker: "Transaction · Purchase · Return", title: "Return summary" },
};

export default async function PurchaseTransactionPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const key = slug.join("/");
  const page = TITLES[key] ?? {
    kicker: "Transaction · Purchase",
    title: slug.length ? slug.join(" / ") : "Purchase",
  };

  return <DepartmentPage kicker={page.kicker} title={page.title} />;
}
