import { DepartmentPage } from "@/components/DepartmentPage";

const TITLES: Record<string, string> = {
  list: "List",
  analysis: "Analysis",
};

export default async function ReceiptTransactionPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const key = slug.join("/");

  return (
    <DepartmentPage
      kicker="Transaction · Receipt"
      title={TITLES[key] ?? (slug.length ? slug.join(" / ") : "Receipt")}
    />
  );
}
