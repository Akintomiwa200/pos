import { ProductHero } from "../../../components/site/ProductHero";
import {
  MarketingCtaBand,
  MarketingSecondaryLink,
} from "../../../components/site/MarketingChrome";

const APPS = [
  {
    name: "Till",
    badge: "Windows · Android",
    cta: "Download till",
    href: "/download",
    copy: "Cashier terminal for supermarket, food service, and hotel. One device per till code. Staff sign in after HQ activation — licence runs one year from first use.",
  },
  {
    name: "HQ console",
    badge: "Browser",
    cta: "Open HQ",
    href: "/login",
    copy: "Reports, catalog, purchase orders, users, tills, and billing. Sidebar menus follow group privileges across Report, Transaction, and Setup.",
  },
  {
    name: "Price check",
    badge: "Handheld",
    cta: "Get price check",
    href: "/download",
    copy: "Floor staff scan a barcode and see live name and price from the same catalog the till sells — no duplicate database.",
  },
  {
    name: "API",
    badge: "Port 3001",
    cta: "Read setup docs",
    href: "/support",
    copy: "NestJS service for catalog, sales, staff shifts, till activate/heartbeat, CRM, chat, and hardware. Run beside HQ or as a Windows service.",
  },
] as const;

const FLOWS = [
  {
    title: "Issue & activate",
    copy: "HQ creates a till and copies the 16-character code. The device binds on first activation.",
  },
  {
    title: "Sell & sync",
    copy: "Tickets close on the till and land in HQ for reports, tax, and inventory without a second spreadsheet.",
  },
  {
    title: "Run the business",
    copy: "Managers use Analytics, Workspace, and Settings — from Item Sales to Support and Chat.",
  },
] as const;

function SplitTitle({ kicker, rest }: { kicker: string; rest: string }) {
  return (
    <header className="flex items-center gap-4 sm:gap-6">
      <h2 className="shrink-0 text-[clamp(1.35rem,3.2vw,2.15rem)] font-semibold tracking-[-0.02em] text-pos-ink">
        {kicker}
      </h2>
      <div
        className="relative h-px min-w-0 flex-1 bg-pos-ink/55 dark:bg-pos-ink/70"
        aria-hidden
      >
        <span className="absolute left-1/2 top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-pos-ink" />
      </div>
      <h2 className="shrink-0 text-[clamp(1.35rem,3.2vw,2.15rem)] font-semibold tracking-[-0.02em] text-pos-ink">
        {rest}
      </h2>
    </header>
  );
}

export default function ProductPage() {
  return (
    <>
      <ProductHero />

      {/* Four apps */}
      <section className="bg-pos-bg px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-4 sm:gap-6">
            <p className="shrink-0 text-[13px] font-semibold uppercase tracking-[0.12em] text-pos-ink-muted sm:text-[14px]">
              Four apps
            </p>
            <div className="h-px min-w-0 flex-1 bg-pos-ink/55 dark:bg-pos-ink/70" aria-hidden />
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 md:mt-16">
            {APPS.map((app) => (
              <article
                key={app.name}
                className="flex flex-col rounded-[24px] border border-pos-border/80 bg-pos-surface p-7 shadow-pos-md sm:p-8"
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-[16px] font-semibold tracking-[-0.02em] text-pos-ink sm:text-[18px]">
                    {app.name}
                  </h3>
                  <span className="shrink-0 rounded-full bg-pos-surface-muted px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-pos-ink-muted">
                    {app.badge}
                  </span>
                </div>
                <p className="mt-4 flex-1 text-[13px] font-normal leading-[1.7] text-pos-ink-muted sm:text-[14px] sm:leading-[1.75]">
                  {app.copy}
                </p>
                <div className="mt-6">
                  <MarketingSecondaryLink href={app.href}>{app.cta}</MarketingSecondaryLink>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How operators use it */}
      <section className="bg-pos-bg px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <SplitTitle kicker="How" rest="operators use it" />
          <div className="mt-12 grid gap-4 md:mt-16 md:grid-cols-3">
            {FLOWS.map((flow) => (
              <article
                key={flow.title}
                className="rounded-[24px] border border-pos-border/80 bg-pos-surface p-7 shadow-pos-md sm:p-8"
              >
                <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-pos-ink sm:text-[15px]">
                  {flow.title}
                </h3>
                <p className="mt-3 text-[13px] font-normal italic leading-[1.7] text-pos-ink-muted sm:text-[14px] sm:leading-[1.75]">
                  {flow.copy}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <MarketingCtaBand
        title="Ready to issue your first till?"
        copy="Create an HQ account, add products, then generate a till code under Point of Sales."
      />
    </>
  );
}
