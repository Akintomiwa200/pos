import Link from "next/link";
import { PageHeader } from "@/components/console/Chrome";

const VERTICALS = [
  {
    href: "/verticals/supermarket",
    title: "Supermarket",
    copy: "Barcode-first selling, heavy procurement and shrink control.",
  },
  {
    href: "/verticals/hotel",
    title: "Hotel",
    copy: "Outlet reporting, folio posting and night-audit reconciliation.",
  },
  {
    href: "/verticals/restaurant",
    title: "Restaurant",
    copy: "Tables, kitchen tickets, course timing and recipe costing.",
  },
  {
    href: "/verticals/dark-kitchen",
    title: "Dark Kitchen",
    copy: "Delivery-first intake, prep-par inventory and platform payouts.",
  },
];

export default function VerticalsIndexPage() {
  return (
    <div>
      <PageHeader
        kicker="Verticals"
        title="Industry Playbooks"
        copy="One codebase, four industries — see which workflows light up for each."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {VERTICALS.map((vertical) => (
          <Link
            key={vertical.href}
            href={vertical.href}
            className="rounded-[24px] bg-pos-surface p-5 shadow-pos-md transition hover:bg-pos-surface-muted"
          >
            <h2 className="font-semibold text-pos-ink">{vertical.title}</h2>
            <p className="mt-1.5 text-sm text-pos-ink-muted">{vertical.copy}</p>
            <span className="mt-3 inline-block text-sm font-medium text-pos-primary">Open playbook →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
