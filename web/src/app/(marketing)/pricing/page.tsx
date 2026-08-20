import Link from "next/link";
import { PageHero } from "../../../components/site/PageHero";

const plans = [
  {
    name: "Till licence",
    price: "1 year",
    copy: "Each till code is valid for one calendar year from first activation. Enter the same code again to renew.",
    href: "/login",
    cta: "Issue a till in HQ",
  },
  {
    name: "HQ + API",
    price: "Your server",
    copy: "Run the Nest API and this console on a PC or Windows service. No per-seat HQ licence in this build.",
    href: "/download",
    cta: "See download",
  },
  {
    name: "Price check",
    price: "Included",
    copy: "Handhelds talk to the same API. No extra till code unless you also sell from that device.",
    href: "/download",
    cta: "Get the app",
  },
];

export default function PricingPage() {
  return (
    <>
      <PageHero
        kicker="Pricing"
        title="Licence the till, not the browser."
        copy="HQ login is for your staff. The 16-character till code is what starts the one-year subscription on a register."
      />
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-12 sm:px-6 lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className="flex flex-col rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgba(28,28,30,0.06)]"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6d4aff]">
              {plan.name}
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{plan.price}</p>
            <p className="mt-3 flex-1 text-sm text-neutral-500">{plan.copy}</p>
            <Link
              href={plan.href}
              className="mt-6 rounded-xl bg-[#6d4aff] px-4 py-2.5 text-center text-sm font-semibold text-white"
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>
    </>
  );
}
