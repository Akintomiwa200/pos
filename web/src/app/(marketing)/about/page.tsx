import { Building2, HeartHandshake, Layers, Rocket, Users } from "lucide-react";
import {
  MarketingCard,
  MarketingHero,
  MarketingPanel,
  MarketingPrimaryLink,
  MarketingSecondaryLink,
  MarketingSection,
} from "../../../components/site/MarketingChrome";

const pillars = [
  {
    icon: Building2,
    title: "Built for operators",
    copy: "Supermarket shelves, restaurant tables, hotel rooms, and dark kitchens — one platform shaped for how Nigerian stores actually run.",
  },
  {
    icon: Layers,
    title: "One source of truth",
    copy: "Catalog, tax, and sales live in the API. Till, HQ, and price check read the same data — not three spreadsheets.",
  },
  {
    icon: HeartHandshake,
    title: "Honest licensing",
    copy: "Each till is one device with a clear one-year subscription from activation. Renew with the same code when it ends.",
  },
];

const build = [
  "NestJS API with JSON persistence and real-time SSE for Chat and Support",
  "Next.js HQ console with role-based sidebar and in-app Help",
  "Vite till and price-check clients with Tauri builds for Windows and Android",
  "Purchase orders, loyalty, CRM-style Support, and hardware print on Windows",
];

const milestones = [
  { year: "Day 1", label: "Register company and set up catalog in HQ" },
  { year: "Week 1", label: "Issue till codes, activate devices, open shifts" },
  { year: "Ongoing", label: "Reports, orders, and customer programmes from one console" },
];

export default function AboutPage() {
  return (
    <>
      <MarketingHero
        kicker="About"
        title="HQ for stores that already run a till."
        copy="POS is the back office for the till and price-check apps in this project — designed for teams who need sales on the floor and control in the browser."
      >
        <MarketingPrimaryLink href="/contact">Talk to us</MarketingPrimaryLink>
        <MarketingSecondaryLink href="/product">See the product</MarketingSecondaryLink>
      </MarketingHero>

      <MarketingSection
        title="What we believe"
        subtitle="Retail and hospitality software should be fast on the counter and clear in the office."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {pillars.map((item) => (
            <MarketingCard key={item.title} {...item} />
          ))}
        </div>
      </MarketingSection>

      <MarketingSection className="bg-pos-surface-muted/60">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <MarketingPanel title="What we build">
            <ul className="mt-4 space-y-3">
              {build.map((line) => (
                <li key={line} className="flex gap-3 text-sm leading-6 text-pos-ink-muted">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-pos-primary" />
                  {line}
                </li>
              ))}
            </ul>
          </MarketingPanel>

          <MarketingPanel title="Typical rollout">
            <ul className="mt-4 space-y-4">
              {milestones.map((row) => (
                <li key={row.year} className="flex gap-4">
                  <span className="w-16 shrink-0 text-sm font-semibold text-pos-primary">{row.year}</span>
                  <span className="text-sm leading-6 text-pos-ink-muted">{row.label}</span>
                </li>
              ))}
            </ul>
          </MarketingPanel>
        </div>
      </MarketingSection>

      <MarketingSection
        title="Who it is for"
        subtitle="Owners, managers, cashiers, and floor staff — each with the right tool."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <MarketingCard
            icon={Users}
            title="HQ administrators"
            copy="Configure company, branches, users, groups, catalog, tills, and integrations from the web console."
          />
          <MarketingCard
            icon={Rocket}
            title="Store teams"
            copy="Cashiers sell on the till. Managers approve orders and read analytics. Floor staff check prices on handhelds."
          />
        </div>
      </MarketingSection>

      <MarketingSection className="pb-20">
        <div className="flex flex-col items-start justify-between gap-6 rounded-[28px] border border-pos-border/80 bg-pos-surface p-8 shadow-pos-md sm:flex-row sm:items-center sm:p-10">
          <div className="max-w-xl">
            <h2 className="text-xl font-semibold tracking-tight text-pos-ink">Questions about rollout?</h2>
            <p className="mt-2 text-sm leading-6 text-pos-ink-muted">
              We can walk through till activation, HQ groups, and packaging the API for your store network.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <MarketingPrimaryLink href="/contact">Contact</MarketingPrimaryLink>
            <MarketingSecondaryLink href="/support">Support docs</MarketingSecondaryLink>
          </div>
        </div>
      </MarketingSection>
    </>
  );
}
