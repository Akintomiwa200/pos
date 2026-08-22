import { VerticalPlaybook } from "@/components/departments/VerticalPlaybook";

export default function HotelPage() {
  return (
    <VerticalPlaybook
      playbook={{
        kicker: "Vertical · Hotel",
        title: "Hotel",
        copy: "Room service, bar and restaurant sales posting to guest folios — with city ledger reconciliation at checkout.",
        features: [
          {
            label: "Post to room folios",
            detail:
              "Charge F&B, laundry and minibar spend to a guest room; the night auditor reconciles folios against the Z-report before close of day.",
            href: "/audit",
            cta: "Night audit",
          },
          {
            label: "Outlet reporting",
            detail:
              "Split revenue by outlet — front desk, pool bar, restaurant — using categories on every item in the catalog.",
            href: "/reports/sales/analytics",
            cta: "Sales analytics",
          },
          {
            label: "Minibar restock",
            detail:
              "Housekeeping posts consumption as stock adjustments per floor pantry; procurement tops up from the reorder desk.",
            href: "/transactions/stock/inventory-adjustment",
            cta: "Adjust stock",
          },
          {
            label: "Corporate accounts",
            detail:
              "Bill companies monthly via the customer ledger — track balances under Reports → Balance → Customers.",
            href: "/reports/balance/customer",
            cta: "Customer balances",
          },
        ],
      }}
    />
  );
}
