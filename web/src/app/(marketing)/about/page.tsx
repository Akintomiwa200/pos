import Link from "next/link";
import { PageHero } from "../../../components/site/PageHero";

export default function AboutPage() {
  return (
    <>
      <PageHero
        kicker="About"
        title="HQ for stores that already run a till."
        copy="This console is the back office for the POS till and price-check apps in the same repository."
      />
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-12 sm:px-6">
        <div className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgba(28,28,30,0.06)]">
          <h2 className="font-semibold">What we build</h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-500">
            A Nest API, a Next.js HQ, a Vite till, and a Vite price checker.
            Tills are issued here, activated on the device, and renewed yearly
            with the same code.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/contact" className="rounded-xl bg-[#6d4aff] px-4 py-2.5 text-sm font-semibold text-white">
            Contact
          </Link>
          <Link href="/support" className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold">
            Support
          </Link>
        </div>
      </div>
    </>
  );
}
