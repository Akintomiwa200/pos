import { VerticalPlaybook } from "@/components/departments/VerticalPlaybook";

export default function DarkKitchenPage() {
  return (
    <VerticalPlaybook
      playbook={{
        kicker: "Vertical · Dark Kitchen",
        title: "Dark Kitchen",
        copy: "Delivery-first kitchens: no dining room, all tickets from online orders and rider dispatch.",
        features: [
          {
            label: "Order intake",
            detail:
              "Phone and marketplace orders become quotes you convert to sales; caller ID hooks live under IT → Nigeria integrations.",
            href: "/reports/sales/quote/list",
            cta: "Quote list",
          },
          {
            label: "Prep-par inventory",
            detail:
              "Count prep batches each shift with the stock count sheet; adjustments absorb waste before it hides in your GP.",
            href: "/reports/stock/count",
            cta: "Count prep",
          },
          {
            label: "Platform payouts",
            detail:
              "Reconcile Chowcity, Glovo and Jumia settlements against tender totals in the payments feed — flag short payouts fast.",
            href: "/transactions/payments",
            cta: "Payments feed",
          },
          {
            label: "Menu engineering",
            detail:
              "Track category mix to decide which brands on your licence earn kitchen hours; kill the losers quarterly.",
            href: "/reports/tax/by-category",
            cta: "Category mix",
          },
        ],
      }}
    />
  );
}
