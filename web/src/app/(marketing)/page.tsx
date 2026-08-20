import Link from "next/link";
import {
  Building2,
  MonitorSmartphone,
  ScanBarcode,
  Server,
  Store,
  UtensilsCrossed,
} from "lucide-react";

const products = [
  {
    href: "/product",
    icon: Store,
    title: "Till",
    copy: "Activate a 16-character till code, then sell on one device at a time.",
  },
  {
    href: "/product",
    icon: MonitorSmartphone,
    title: "HQ console",
    copy: "Reports, purchasing, billing, users, and till codes for every branch.",
  },
  {
    href: "/download",
    icon: ScanBarcode,
    title: "Price check",
    copy: "Scan a barcode on a handheld and see the live till price.",
  },
  {
    href: "/support",
    icon: Server,
    title: "API",
    copy: "One Nest service on port 3001. Tills and HQ both call /api.",
  },
];

const verticals = [
  { href: "/solutions/supermarket", icon: Store, title: "Supermarket" },
  { href: "/solutions/hotel", icon: Building2, title: "Hotel" },
  { href: "/solutions/restaurant", icon: UtensilsCrossed, title: "Restaurant" },
  { href: "/solutions/dark-kitchen", icon: UtensilsCrossed, title: "Dark kitchen" },
];

export default function HomePage() {
  return (
    <>
      <section className="border-b border-neutral-200/80 bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6d4aff]">
              Point of sale
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              One till, one HQ, one year of licence.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-neutral-500">
              Built for Nigerian supermarket, hotel, restaurant, and dark-kitchen
              operations. Activate the till on first use, then staff just sign in
              until the subscription ends.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-xl bg-[#6d4aff] px-5 py-3 text-sm font-semibold text-white"
              >
                HQ login
              </Link>
              <Link
                href="/download"
                className="rounded-xl border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold"
              >
                Download apps
              </Link>
              <Link href="/product" className="rounded-xl px-5 py-3 text-sm font-semibold text-[#6d4aff]">
                See the product
              </Link>
            </div>
          </div>
          <div className="rounded-3xl bg-[#f4f0ff] p-8">
            <p className="text-sm font-semibold text-[#6d4aff]">First install</p>
            <ol className="mt-4 space-y-3 text-sm text-neutral-600">
              <li>1. Issue a till in HQ → Setup → Others → Till.</li>
              <li>2. Open the till app and enter the 16-character code.</li>
              <li>3. Sign in. The licence lasts one year from activation.</li>
            </ol>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">What ships</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                href={item.href}
                className="rounded-2xl bg-white p-5 shadow-[0_8px_30px_rgba(28,28,30,0.06)]"
              >
                <Icon className="text-[#6d4aff]" size={22} />
                <h3 className="mt-3 font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-neutral-500">{item.copy}</p>
              </Link>
            );
          })}
        </div>
      </section>
      <section className="border-t border-neutral-200/80 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight">Solutions</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {verticals.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-2xl border border-neutral-100 p-5 hover:border-[#ddd6fe]"
                >
                  <Icon className="text-[#6d4aff]" size={20} />
                  <p className="mt-3 font-semibold">{item.title}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
