import { DepartmentPage } from "@/components/DepartmentPage";

const TITLES: Record<string, { kicker: string; title: string }> = {
  balance: { kicker: "Report · Stock", title: "Balance" },
  sheet: { kicker: "Report · Stock", title: "Sheet" },
  movement: { kicker: "Report · Stock", title: "Movement" },
  "bin-card": { kicker: "Report · Stock", title: "Bin Card" },
  expiry: { kicker: "Report · Stock", title: "Expiry" },
  count: { kicker: "Report · Stock", title: "Count" },
};

export default async function StockReportPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const key = slug.join("/");
  const page = TITLES[key] ?? {
    kicker: "Report · Stock",
    title: slug.length ? slug.join(" / ") : "Stock",
  };

  return <DepartmentPage kicker={page.kicker} title={page.title} />;
}
