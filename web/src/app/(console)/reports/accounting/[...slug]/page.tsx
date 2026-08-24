import { DepartmentPage } from "@/components/DepartmentPage";
import {
  AccountingReports,
  type AccountingVariant,
} from "@/components/reports/AccountingReports";

const VARIANTS: Record<string, AccountingVariant> = {
  "chart-of-accounts": "chart-of-accounts",
  journal: "journal",
  "trial-balance": "trial-balance",
  "profit-loss": "profit-loss",
  "balance-sheet": "balance-sheet",
  "cash-book": "cash-book",
};

export default async function AccountingReportPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const key = slug.join("/");
  const variant = VARIANTS[key];
  if (!variant) {
    return (
      <DepartmentPage
        kicker="Account"
        title={slug.length ? slug.join(" / ") : "Accounting"}
      />
    );
  }
  return <AccountingReports variant={variant} />;
}
