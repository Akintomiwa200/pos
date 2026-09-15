import { DepartmentPage } from "@/components/DepartmentPage";
import { DiscountCardsPage } from "@/components/reports/pos/DiscountCardsPage";
import { DiscountExceptionsPage } from "@/components/reports/pos/DiscountExceptionsPage";
import { GiftCardsReportPage } from "@/components/reports/pos/GiftCardsReportPage";
import { LoyaltyAccruedPage } from "@/components/reports/pos/LoyaltyAccruedPage";
import { LoyaltyRedeemedPage } from "@/components/reports/pos/LoyaltyRedeemedPage";
import { POSReconciliationPage } from "@/components/reports/pos/POSReconciliationPage";
import { PromotionsPage } from "@/components/reports/pos/PromotionsPage";

export default async function PosReportPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const key = slug.join("/");

  if (key === "reconciliation") return <POSReconciliationPage />;
  if (key === "promotions") return <PromotionsPage />;
  if (key === "discount-cards") return <DiscountCardsPage />;
  if (key === "discount-exceptions") return <DiscountExceptionsPage />;
  if (key === "gift-cards") return <GiftCardsReportPage />;
  if (key === "loyalty-accrued") return <LoyaltyAccruedPage />;
  if (key === "loyalty-redeemed") return <LoyaltyRedeemedPage />;

  return (
    <DepartmentPage
      kicker="Report · Point of Sale"
      title={slug.length ? slug.join(" / ") : "Point of Sale"}
    />
  );
}