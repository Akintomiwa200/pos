import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "../../components/site/BrandLogo";
import {
  ArrowRight,
  Building2,
  MonitorSmartphone,
  ScanBarcode,
  Store,
  UtensilsCrossed,
} from "lucide-react";

const trusted = ["Supermarket", "Hotel", "Restaurant", "Dark kitchen", "Price check"];

const steps = [
  {
    n: "01",
    title: "Issue the till in HQ",
    copy: "Create TILL-VI-01 (or any name), pick the branch and product, and copy the 16-character code. One till, one device.",
    href: "/login",
    cta: "Open HQ",
  },
  {
    n: "02",
    title: "Activate on the register",
    copy: "Staff enter the code once. The hardware hex binds to that licence. Sign-in is enough until the year is up.",
    href: "/download",
    cta: "Get the till",
  },
  {
    n: "03",
    title: "Sell — HQ already has the tickets",
    copy: "Cash, card, transfer, wallet. Sales land in HQ. Catalog, tax, and branches follow the next heartbeat.",
    href: "/product",
    cta: "See the product",
  },
];

const values = [
  {
    icon: Store,
    title: "Close the ticket on the floor",
    copy: "Barcode grid, rooms, or kitchen — the till UI follows the product you issued in HQ.",
  },
  {
    icon: MonitorSmartphone,
    title: "Run every branch from one console",
    copy: "Reports, users, tax, gateways, and till codes. Menus follow the group you assign.",
  },
  {
    icon: ScanBarcode,
    title: "Price check without a second database",
    copy: "Handhelds read the same catalog the till sells. Scan, see naira, walk on.",
  },
];

const stories = [
  {
    quote:
      "We stopped sharing one PC as both till and office. HQ is on 3000, the register stays on the counter.",
    name: "Chika O.",
    role: "Accountant · Victoria Island",
  },
  {
    quote:
      "First install is the till code. After that the shift PIN is enough — until the year ends, then we renew.",
    name: "Emma W.",
    role: "Administrator",
  },
  {
    quote:
      "Hotel rooms and supermarket barcodes on the same API. Price check on the floor matches what we charge.",
    name: "Tosin A.",
    role: "Sales · Ikeja",
  },
];

const stats = [
  { value: "1 year", label: "Licence from first activation" },
  { value: "1 till", label: "Per device, live heartbeat" },
  { value: "4", label: "Verticals on one catalog" },
  { value: "₦", label: "Naira on every ticket" },
];

function PreviewFrame({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[28px] bg-white shadow-[0_20px_60px_rgba(109,74,255,0.12)]">
      <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#f4b4b4]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#f5d98a]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#b8e0b8]" />
        <span className="ml-3 text-[12px] font-medium text-neutral-400">{kicker}</span>
      </div>
      <div className="bg-[#f4f0ff] p-5 sm:p-8">
        <p className="text-[13px] font-medium text-[#6d4aff]">{title}</p>
        {children}
      </div>
    </div>
  );
}

function HeroPreview() {
  return (
    <PreviewFrame kicker="till · HQ · price check" title="What you get on day one">
      <div className="mt-4 grid gap-3 sm:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl bg-white p-4 shadow-[0_8px_24px_rgba(28,28,30,0.06)]">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#6d4aff] text-white">
              <BrandMark className="h-[18px] w-[18px]" />
            </span>
            <div>
              <p className="text-sm font-semibold">TILL-VI-01</p>
              <p className="text-[11px] text-neutral-400">Victoria Island · supermarket</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {["Raspberry tart", "Still water", "Espresso", "Bread"].map((name) => (
              <div key={name} className="rounded-xl bg-[#f7f5ff] px-2 py-3 text-center text-[11px] font-medium">
                {name}
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between rounded-xl bg-[#111] px-3 py-2 text-white">
            <span className="text-[11px] text-white/60">Ticket</span>
            <span className="text-sm font-semibold tabular-nums">₦25,660</span>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-[0_8px_24px_rgba(28,28,30,0.06)]">
          <p className="text-[11px] text-neutral-400">HQ · last 30 days</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">₦2.1m</p>
          <div className="mt-4 h-16 rounded-xl bg-gradient-to-r from-[#22c55e] via-[#c4b5fd] to-[#6d4aff]" />
          <div className="mt-3 flex -space-x-2">
            {["EW", "CO", "TA"].map((initials) => (
              <span
                key={initials}
                className="grid h-7 w-7 place-items-center rounded-full bg-[#111] text-[9px] font-bold text-white ring-2 ring-white"
              >
                {initials}
              </span>
            ))}
          </div>
        </div>
      </div>
    </PreviewFrame>
  );
}

function StepPreview({ index }: { index: number }) {
  const frames = [
    <div key="hq" className="space-y-2">
      <div className="h-8 rounded-lg bg-white/80" />
      <div className="grid grid-cols-3 gap-2">
        <div className="h-16 rounded-xl bg-white" />
        <div className="h-16 rounded-xl bg-white" />
        <div className="h-16 rounded-xl bg-[#6d4aff]" />
      </div>
      <p className="pt-2 text-center text-[12px] font-medium text-[#6d4aff]">Setup → Others → Till</p>
    </div>,
    <div key="code" className="flex flex-col items-center justify-center py-4">
      <p className="font-mono text-lg font-semibold tracking-[0.18em] text-[#111]">XXXX-XXXX-XXXX-XXXX</p>
      <p className="mt-3 rounded-full bg-white px-3 py-1 text-[11px] font-medium">Activate this device</p>
    </div>,
    <div key="sale" className="space-y-2">
      <div className="h-3 w-24 rounded bg-white/80" />
      <div className="h-10 rounded-xl bg-white" />
      <div className="flex gap-2">
        <div className="h-8 flex-1 rounded-lg bg-[#22c55e]" />
        <div className="h-8 flex-1 rounded-lg bg-white" />
      </div>
    </div>,
  ];
  return (
    <div className="grid min-h-[180px] place-items-center rounded-[24px] bg-[#ece6ff] p-6">{frames[index]}</div>
  );
}

export default function HomePage() {
  return (
    <div className="bg-white">
      <section className="px-4 pb-8 pt-16 sm:px-6 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[13px] font-medium text-[#6d4aff]">Point of sale for Nigerian retail</p>
          <h1 className="mt-4 text-[2rem] font-medium leading-snug tracking-tight text-[#1c1c1e] sm:text-[2.5rem] lg:text-[2.75rem] lg:leading-[1.2]">
            Close every sale in naira — one till, one HQ, one year.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-7 text-neutral-600 sm:text-base">
            Paper books and a shared PC lose tickets. This stack keeps the register on the
            counter and the office in the browser: supermarket, hotel, restaurant, and dark
            kitchen on one API.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              className="rounded-full bg-[#6d4aff] px-5 py-2.5 text-sm font-medium text-white"
            >
              Get started
            </Link>
            <Link
              href="/download"
              className="rounded-full border border-neutral-200 bg-white px-5 py-2.5 text-sm font-medium text-[#1c1c1e]"
            >
              Download apps
            </Link>
          </div>
        </div>
        <div className="mx-auto mt-14 max-w-4xl">
          <HeroPreview />
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6">
        <p className="text-center text-[13px] font-medium text-neutral-500">
          Trusted by operators who need
        </p>
        <div className="mx-auto mt-6 flex max-w-4xl flex-wrap items-center justify-center gap-3">
          {trusted.map((name) => (
            <span
              key={name}
              className="rounded-full bg-[#f4f0ff] px-4 py-1.5 text-sm font-medium text-[#6d4aff]"
            >
              {name}
            </span>
          ))}
        </div>
      </section>

      <section id="how" className="px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-medium tracking-tight text-[#1c1c1e] sm:text-[1.75rem]">
            From till code to live tickets
          </h2>
          <p className="mt-3 text-[15px] leading-7 text-neutral-600">
            Three steps. HQ issues the licence, the device activates, sales show up without a second
            spreadsheet.
          </p>
        </div>
        <div className="mx-auto mt-12 max-w-5xl space-y-10">
          {steps.map((step, index) => (
            <div
              key={step.n}
              className={`grid items-center gap-8 lg:grid-cols-2 ${
                index % 2 === 1 ? "lg:[&>div:first-child]:order-2" : ""
              }`}
            >
              <StepPreview index={index} />
              <div>
                <p className="text-[13px] font-medium text-[#6d4aff]">Step {step.n}</p>
                <h3 className="mt-2 text-xl font-medium tracking-tight text-[#1c1c1e]">{step.title}</h3>
                <p className="mt-3 text-[15px] leading-7 text-neutral-600">{step.copy}</p>
                <Link
                  href={step.href}
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-[#6d4aff]"
                >
                  {step.cta} <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-medium tracking-tight text-[#1c1c1e] sm:text-[1.75rem]">
            What the stack actually does
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {values.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-[24px] bg-[#f7f5ff] p-6">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-[#6d4aff] shadow-[0_8px_20px_rgba(109,74,255,0.12)]">
                    <Icon size={20} />
                  </span>
                  <h3 className="mt-5 text-base font-medium text-[#1c1c1e]">{item.title}</h3>
                  <p className="mt-2 text-[15px] leading-7 text-neutral-600">{item.copy}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 pb-8 sm:px-6">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-[32px] bg-[#6d4aff] px-6 py-14 text-center text-white sm:px-12">
          <h2 className="text-2xl font-medium tracking-tight sm:text-[1.85rem] sm:leading-snug">
            Stop sharing one PC as the till and the office.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-7 text-white/80">
            Issue the code in HQ, activate the register, keep selling for a year. Renew with the same
            code when the licence ends.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/register"
              className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#6d4aff]"
            >
              Create an HQ account
            </Link>
            <Link
              href="/pricing"
              className="rounded-full border border-white/30 px-5 py-2.5 text-sm font-medium text-white"
            >
              See pricing
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-medium tracking-tight text-[#1c1c1e] sm:text-[1.75rem]">
            How teams use it
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {stories.map((item) => (
              <article
                key={item.name}
                className="rounded-[24px] border border-neutral-100 bg-white p-6 shadow-[0_8px_30px_rgba(28,28,30,0.04)]"
              >
                <p className="text-[15px] leading-7 text-neutral-600">“{item.quote}”</p>
                <div className="mt-5 flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-[#6d4aff] text-xs font-medium text-white">
                    {item.name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-[13px] text-neutral-400">{item.role}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-neutral-100 bg-[#f7f5ff] px-4 py-12 sm:px-6">
        <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((item) => (
            <div key={item.label} className="text-center">
              <p className="text-2xl font-medium tracking-tight text-[#6d4aff]">{item.value}</p>
              <p className="mt-1 text-sm text-neutral-600">{item.label}</p>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-8 flex max-w-5xl flex-wrap items-center justify-center gap-6 text-[13px] font-medium text-neutral-400">
          <span>Built for NG</span>
          <span>HQ · 3000</span>
          <span>API · 3001</span>
          <span>Till · 1420</span>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <h2 className="text-2xl font-medium tracking-tight text-[#1c1c1e] sm:text-[1.85rem] sm:leading-snug">
              Licence the till today. HQ is ready when you are.
            </h2>
            <p className="mt-4 text-[15px] leading-7 text-neutral-600">
              Create the HQ account, issue a till, download the register. The one-year clock starts
              on first activation — not on signup.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="rounded-full bg-[#6d4aff] px-5 py-2.5 text-sm font-medium text-white"
              >
                Get started
              </Link>
              <Link href="/contact" className="rounded-full px-5 py-2.5 text-sm font-medium text-[#6d4aff]">
                Talk to us
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-4 text-sm text-neutral-400">
              <span className="inline-flex items-center gap-1.5">
                <Store size={14} /> Supermarket
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Building2 size={14} /> Hotel
              </span>
              <span className="inline-flex items-center gap-1.5">
                <UtensilsCrossed size={14} /> Restaurant
              </span>
            </div>
          </div>
          <PreviewFrame kicker="first install" title="Why act now">
            <ol className="mt-4 space-y-3 text-sm text-neutral-600">
              <li className="rounded-2xl bg-white px-4 py-3">1. Register HQ — Sales group by default.</li>
              <li className="rounded-2xl bg-white px-4 py-3">2. Issue a till and copy the code.</li>
              <li className="rounded-2xl bg-white px-4 py-3">3. Activate the device. Sell for a year.</li>
            </ol>
          </PreviewFrame>
        </div>
      </section>
    </div>
  );
}
