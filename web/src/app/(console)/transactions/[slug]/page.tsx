import { DepartmentPage } from "@/components/DepartmentPage";

const TITLES: Record<string, string> = {
  payments: "Payments",
};

export default async function TransactionsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <DepartmentPage
      kicker="Transaction"
      title={TITLES[slug] ?? slug.replace(/-/g, " ")}
    />
  );
}
