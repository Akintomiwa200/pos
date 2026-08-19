import { DepartmentPage } from "@/components/DepartmentPage";

const TITLES: Record<string, { kicker: string; title: string }> = {
  analytics: { kicker: "Report · Sales", title: "Analytics" },
  "invoice/list": { kicker: "Report · Sales · Invoice", title: "Invoice list" },
  "invoice/summary": { kicker: "Report · Sales · Invoice", title: "Invoice summary" },
  "invoice/balance": { kicker: "Report · Sales · Invoice", title: "Invoice balance" },
  "invoice/history": { kicker: "Report · Sales · Invoice", title: "Invoice history" },
  "invoice/shift": { kicker: "Report · Sales · Invoice", title: "Invoice shift" },
  "gross-profit/by-group": { kicker: "Report · Sales · Gross Profit", title: "By group" },
  "gross-profit/by-subgroup": { kicker: "Report · Sales · Gross Profit", title: "By subgroup" },
  "gross-profit/by-item": { kicker: "Report · Sales · Gross Profit", title: "By item" },
  "quote/list": { kicker: "Report · Sales · Quote", title: "Quote list" },
  "quote/summary": { kicker: "Report · Sales · Quote", title: "Quote summary" },
  "return/list": { kicker: "Report · Sales · Return", title: "Return list" },
  "return/summary": { kicker: "Report · Sales · Return", title: "Return summary" },
};

export default async function SalesReportPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const key = slug.join("/");
  const page = TITLES[key] ?? {
    kicker: "Report · Sales",
    title: slug.length ? slug.join(" / ") : "Sales",
  };

  return <DepartmentPage kicker={page.kicker} title={page.title} />;
}
