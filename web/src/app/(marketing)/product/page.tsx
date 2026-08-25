import {
  ArrowLeftRight,
  BarChart3,
  ScanBarcode,
  Server,
  ShieldCheck,
  Store,
} from "lucide-react";
import {
  MarketingCard,
  MarketingCtaBand,
  MarketingHero,
  MarketingPrimaryLink,
  MarketingSecondaryLink,
  MarketingSection,
  MarketingStat,
} from "../../../components/site/MarketingChrome";

const apps = [
  {
    icon: Store,
    name: "Till",
    badge: "Windows · Android",
    href: "/download",
    cta: "Download till",
    copy: "Cashier terminal for supermarket, food service, and hotel. One device per till code. Staff sign in after HQ activation — licence runs one year from first use.",
    featured: true,
  },
  {
    icon: BarChart3,
    name: "HQ console",
    badge: "Browser",
    href: "/login",
    cta: "Open HQ",
    copy: "Reports, catalog, purchase orders, users, tills, and billing. Sidebar menus follow group privileges across Report, Transaction, and Setup.",
  },
  {
    icon: ScanBarcode,
    name: "Price check",
    badge: "Handheld",
    href: "/download",
    cta: "Get price check",
    copy: "Floor staff scan a barcode and see live name and price from the same catalog the till sells — no duplicate database.",
  },
  {
    icon: Server,
    name: "API",
    badge: "Port 3001",
    href: "/support",
    cta: "Read setup docs",
    copy: "NestJS service for catalog, sales, staff shifts, till activate/heartbeat, CRM, chat, and hardware. Run beside HQ or as a Windows service.",
  },
];

const flows = [
  {
    icon: ShieldCheck,
    title: "Issue & activate",
    copy: "HQ creates a till and copies the 16-character code. The device binds on first activation.",
  },
  {
    icon: ArrowLeftRight,
    title: "Sell & sync",
    copy: "Tickets close on the till and land in HQ for reports, tax, and inventory without a second spreadsheet.",
  },
  {
    icon: BarChart3,
    title: "Run the business",
    copy: "Managers use Analytics, Workspace, and Settings — from Item Sales to Support and Chat.",
  },
];

export default function ProductPage() {
  return (
    <>
      <MarketingHero
        kicker="Product"
        title="Four apps. One catalog. One store."
        copy="The till sells at the counter. HQ runs purchasing, users, and reports. Price check keeps the floor aligned. The API keeps every client on the same data."
      >
        <MarketingPrimaryLink href="/register">Sign up company</MarketingPrimaryLink>
        <MarketingSecondaryLink href="/download">Download apps</MarketingSecondaryLink>
      </MarketingHero>

      <MarketingSection
        title="The stack"
        subtitle="Each app has a clear job. Together they cover front-of-house and back-office without duplicate product data."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {apps.map((app) => (
            <MarketingCard key={app.name} {...app} title={app.name} />
          ))}
        </div>
      </MarketingSection>

      <MarketingSection className="bg-pos-surface-muted/60">
        <div className="grid gap-4 sm:grid-cols-3">
          <MarketingStat label="Till licence" value="1 year" hint="From first device activation" />
          <MarketingStat label="HQ access" value="By group" hint="Report · Transaction · Setup" />
          <MarketingStat label="Catalog" value="Shared" hint="Till, HQ, and price check" />
        </div>
      </MarketingSection>

      <MarketingSection
        title="How operators use it"
        subtitle="From issuing a till code to closing the day — one predictable flow."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {flows.map((item) => (
            <MarketingCard key={item.title} {...item} />
          ))}
        </div>
      </MarketingSection>

      <MarketingSection>
        <div className="overflow-hidden rounded-[32px] border border-pos-border/80 bg-pos-surface p-8 text-center shadow-pos-md sm:p-12">
          <h2 className="text-[clamp(1.5rem,3vw,2rem)] font-semibold tracking-tight text-pos-ink">
            Ready to issue your first till?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-[15px] leading-7 text-pos-ink-muted">
            Create an HQ account, add products, then generate a till code under Point of Sales.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <MarketingPrimaryLink href="/register">Get started</MarketingPrimaryLink>
            <MarketingSecondaryLink href="/pricing">View pricing</MarketingSecondaryLink>
          </div>
        </div>
      </MarketingSection>

      <MarketingCtaBand
        title="Ready to run the till without sharing a PC?"
        copy="Create an HQ account. Issue a till. No pressure. No second spreadsheet."
      />
    </>
  );
}
