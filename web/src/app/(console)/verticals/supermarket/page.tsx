import { VerticalPlaybook } from "@/components/departments/VerticalPlaybook";

export default function SupermarketPage() {
  return (
    <VerticalPlaybook
      playbook={{
        kicker: "Vertical · Supermarket",
        title: "Supermarket",
        copy: "Barcode-first selling, heavy procurement and shrink control. Tables and the kitchen display stay off.",
        features: [
          {
            label: "Barcode everything",
            detail:
              "Scan-to-sell on every till with barcode search in the item browser. Print shelf labels straight from Setup → Items.",
            href: "/setup/items/items",
            cta: "Manage items",
          },
          {
            label: "Reorder discipline",
            detail:
              "Procurement watches reorder points across all branches; purchase invoices land as trade docs you can book and audit.",
            href: "/procurement",
            cta: "Open reorder desk",
          },
          {
            label: "Shrink control",
            detail:
              "Run stock counts from Reports → Stock → Count sheet; variances post as adjustments with a reason trail.",
            href: "/reports/stock/count",
            cta: "Start a count",
          },
          {
            label: "Fast lanes",
            detail:
              "Weighed goods (kg), pack sizes and quick-tender cash handling keep queues moving at peak hours.",
            href: "/setup/others/settings",
            cta: "Till settings",
          },
        ],
      }}
    />
  );
}
