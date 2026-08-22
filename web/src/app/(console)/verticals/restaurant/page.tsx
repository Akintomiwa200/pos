import { VerticalPlaybook } from "@/components/departments/VerticalPlaybook";

export default function RestaurantPage() {
  return (
    <VerticalPlaybook
      playbook={{
        kicker: "Vertical · Restaurant",
        title: "Restaurant",
        copy: "Table plans, kitchen tickets and course timing — built for full service floors and quick-service counters alike.",
        features: [
          {
            label: "Tables & covers",
            detail:
              "Open a table, add courses, split bills and settle by tender — the ticket history keeps every reprint for audit.",
            href: "/transactions/receipt/list",
            cta: "Ticket list",
          },
          {
            label: "Kitchen display",
            detail:
              "Modifiers and kitchen notes ride on every line item so the pass gets exact instructions; voids need supervisor PIN.",
            href: "/setup/items/items",
            cta: "Menu items & modifiers",
          },
          {
            label: "Recipe costing",
            detail:
              "Estimate plate margins with the gross profit report, then tune prices per category without touching the till.",
            href: "/reports/sales/gross-profit/item",
            cta: "GP by item",
          },
          {
            label: "Peak-hour staffing",
            detail:
              "Receipt analysis shows sales by hour and cashier share — roster smarter for Friday nights.",
            href: "/transactions/receipt/analysis",
            cta: "Receipt analysis",
          },
        ],
      }}
    />
  );
}
