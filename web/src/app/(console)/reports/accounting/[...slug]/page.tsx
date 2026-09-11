import { DepartmentPage } from "@/components/DepartmentPage";
import { BalanceSheetPage } from "@/components/reports/accounting/BalanceSheetPage";
import { CashBookPage } from "@/components/reports/accounting/CashBookPage";
import { ChartOfAccountsPage } from "@/components/reports/accounting/ChartOfAccountsPage";
import { JournalPage } from "@/components/reports/accounting/JournalPage";
import { ProfitLossPage } from "@/components/reports/accounting/ProfitLossPage";
import { TrialBalancePage } from "@/components/reports/accounting/TrialBalancePage";

export default async function AccountingReportPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const key = slug.join("/");

  if (key === "chart-of-accounts") return <ChartOfAccountsPage />;
  if (key === "journal") return <JournalPage />;
  if (key === "trial-balance") return <TrialBalancePage />;
  if (key === "profit-loss") return <ProfitLossPage />;
  if (key === "balance-sheet") return <BalanceSheetPage />;
  if (key === "cash-book") return <CashBookPage />;

  return (
    <DepartmentPage
      kicker="Account"
      title={slug.length ? slug.join(" / ") : "Accounting"}
    />
  );
}