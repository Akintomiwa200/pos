import Link from "next/link";
import { PageHero } from "../../../components/site/PageHero";

const verticals = [
  {
    href: "/solutions/supermarket",
    title: "Supermarket",
    copy: "Barcode-first selling, procurement, and shrink control. Tables and KDS stay off.",
  },
  {
    href: "/solutions/hotel",
    title: "Hotel",
    copy: "Outlets, room charge, and a night audit that still posts through the same till licence.",
  },
  {
    href: "/solutions/restaurant",
    title: "Restaurant",
    copy: "Tables, covers, kitchen tickets, and split tenders on the till.",
  },
  {
    href: "/solutions/dark-kitchen",
    title: "Dark kitchen",
    copy: "Delivery aggregators and bag labels without a dining-room floor plan.",
  },
];

export default function SolutionsPage() {
  return (
    <>
      <PageHero
        kicker="Solutions"
        title="The same stack, tuned per trade."
        copy="Issue tills in HQ, activate on the device, then run supermarket, hotel, restaurant, or dark-kitchen operations."
      />
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-12 sm:px-6 md:grid-cols-2">
        {verticals.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgba(28,28,30,0.06)]"
          >
            <h2 className="text-lg font-semibold">{item.title}</h2>
            <p className="mt-2 text-sm text-neutral-500">{item.copy}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
