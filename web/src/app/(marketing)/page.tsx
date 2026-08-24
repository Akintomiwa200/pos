import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "../../components/site/BrandLogo";
import { PartnerMarquee } from "../../components/site/PartnerMarquee";
import {
  Bell,
  Briefcase,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  CircleAlert,
  CircleDollarSign,
  Clock,
  Coins,
  Lock,
  MessageCircle,
  ScanBarcode,
  Search,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  Truck,
  Users,
  UtensilsCrossed,
  Wrench,
} from "lucide-react";

const steps = [
  {
    icon: Users,
    title: "You issue the till",
    copy: "HQ names the device and copies the code.",
  },
  {
    icon: Wrench,
    title: "The floor activates",
    copy: "The hardware binds. Sign-in lasts a year.",
    featured: true,
  },
  {
    icon: CircleDollarSign,
    title: "You sell — HQ has it",
    copy: "Tickets land as they close.",
  },
];

const stackApps = [
  { title: "Till UI", screen: "till" as const },
  { title: "HQ console", screen: "hq" as const },
  { title: "Price check", screen: "scan" as const },
  { title: "Activate & licence", screen: "code" as const },
];

const floors = [
  {
    icon: Store,
    title: "Supermarket & retail",
    copy: "Barcode, weigh, and ticket on the till. Price check on the floor reads the same catalog.",
  },
  {
    icon: UtensilsCrossed,
    title: "Food store & kitchen",
    copy: "Tables, courses, and kitchen fire. The ticket that leaves the pass is the sale HQ already has.",
  },
  {
    icon: Building2,
    title: "Hotel & rooms",
    copy: "Folio the night, breakfast, and minibar on one till. Housekeeping is not a second system.",
  },
];

const pains = [
  { icon: Coins, label: "Shared PCs" },
  { icon: Clock, label: "Lost tickets" },
  { icon: Truck, label: "Late HQ numbers" },
  { icon: CircleAlert, label: "Mismatched prices" },
];

const whyItems = [
  { icon: Briefcase, label: "No shared PCs" },
  { icon: SlidersHorizontal, label: "Predictable licence" },
  { icon: ShieldCheck, label: "Transparent pricing" },
  { icon: MessageCircle, label: "Live HQ numbers" },
  { icon: Users, label: "One till, one device" },
  { icon: Share2, label: "One catalog, not two" },
];

const getItems = [
  "Till UI for supermarket, food, hotel",
  "HQ console and reports",
  "Price check on the floor",
  "Activation and device bind",
  "One-year licence from first use",
];

const faqs = [
  {
    q: "One till per device ?",
    a: "Yes. HQ issues a code for that hardware. The hex binds on first activation — another till needs its own code.",
  },
  {
    q: "Licence from first activation ?",
    a: "The year starts when the floor activates, not when you create the HQ account. Renew with the same code when it ends.",
  },
  {
    q: "Same catalog on price check ?",
    a: "Price check reads the catalog the till sells. Scan, see naira, walk on — no second database.",
  },
  {
    q: "HQ sees tickets live ?",
    a: "Tickets land as they close. Catalog, tax, and branches follow the heartbeat without a second spreadsheet.",
  },
];

function PhoneStatus() {
  return (
    <div className="flex items-center justify-between px-1 text-[9px] font-medium text-pos-ink-faint">
      <span>9:40 PM</span>
      <span className="flex gap-0.5">
        <span className="h-1.5 w-3 rounded-sm bg-pos-border" />
        <span className="h-1.5 w-2 rounded-sm bg-pos-border" />
        <span className="h-1.5 w-4 rounded-sm bg-pos-ink-faint" />
      </span>
    </div>
  );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <article
      className="relative h-[28rem] overflow-hidden rounded-[24px] bg-pos-surface p-3 shadow-pos-md sm:h-[34rem] sm:rounded-[28px] sm:p-4"
      style={{
        WebkitMaskImage: "linear-gradient(to bottom, #000 48%, transparent 88%)",
        maskImage: "linear-gradient(to bottom, #000 48%, transparent 88%)",
      }}
    >
      {children}
    </article>
  );
}

function MiniPhone({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-[22px] bg-pos-surface p-2.5 text-pos-ink shadow-pos-md ${className}`}
    >
      <PhoneStatus />
      {children}
    </div>
  );
}

function TillMini() {
  return (
    <MiniPhone>
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-pos-primary text-white">
            <Store size={10} />
          </span>
          <div>
            <p className="text-[8px] text-pos-ink-faint">Ikeja branch</p>
            <p className="text-[10px] font-medium">Supermarket</p>
          </div>
        </div>
        <span className="grid h-6 w-6 place-items-center rounded-full bg-pos-primary-soft text-pos-ink-muted">
          <Search size={10} />
        </span>
      </div>
      <h3 className="mt-2.5 text-[13px] font-medium tracking-tight">Floor sales</h3>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <div className="rounded-xl bg-pos-primary-soft px-2 py-1.5">
          <p className="text-[8px] text-pos-ink-faint">Today</p>
          <p className="text-[11px] font-medium tabular-nums">₦184,200</p>
        </div>
        <div className="rounded-xl bg-pos-primary-soft px-2 py-1.5">
          <p className="text-[8px] text-pos-ink-faint">Tickets</p>
          <p className="text-[11px] font-medium tabular-nums">42</p>
        </div>
      </div>
      <div className="relative mt-2">
        <div className="grid grid-cols-2 gap-1.5">
          {["Rice 5kg", "Peak milk", "Bread", "Palm oil"].map((name) => (
            <div key={name} className="rounded-xl bg-pos-primary-soft px-1.5 py-2 text-center text-[9px] font-medium">
              {name}
            </div>
          ))}
        </div>
        <div className="absolute -bottom-3 -right-1 rounded-xl bg-pos-inverse px-2 py-1.5 text-[8px] text-white shadow-pos-md">
          Open · ₦11,750
        </div>
      </div>
    </MiniPhone>
  );
}

function FoodMini() {
  return (
    <MiniPhone>
      <div className="mt-2 flex items-center justify-between">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-pos-primary-soft text-pos-ink-muted">
          <ChevronLeft size={12} />
        </span>
        <p className="text-[10px] font-medium">Table 7</p>
        <span className="grid h-6 w-6 place-items-center rounded-full bg-pos-inverse text-[7px] font-medium text-white">
          CK
        </span>
      </div>
      <div className="relative mt-2 overflow-hidden rounded-2xl bg-gradient-to-br from-pos-primary-soft to-pos-primary-muted p-2.5">
        <p className="text-[8px] text-pos-primary">Kitchen · food store</p>
        <p className="mt-0.5 text-[11px] font-medium">Courses in</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-pos-surface/70">
          <div className="h-full w-[72%] rounded-full bg-pos-primary" />
        </div>
      </div>
      <div className="mt-2 space-y-1">
        {["Jollof rice", "Grilled chicken", "Zobo"].map((name) => (
          <div key={name} className="flex items-center justify-between rounded-lg bg-pos-surface-muted px-2 py-1 text-[9px]">
            <span>{name}</span>
            <span className="text-pos-ink-faint">Firing</span>
          </div>
        ))}
      </div>
    </MiniPhone>
  );
}

function HqMini() {
  return (
    <MiniPhone>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-[10px] font-medium">HQ today</p>
        <span className="grid h-6 w-6 place-items-center rounded-full bg-pos-primary-soft text-pos-ink-muted">
          <Bell size={10} />
        </span>
      </div>
      <p className="mt-1 text-[8px] text-pos-ink-faint">All sales · supermarket, food, hotel</p>
      <div className="relative mx-auto mt-2 grid h-20 w-20 place-items-center">
        <div className="absolute inset-0 rounded-full border-[7px] border-pos-primary-muted" />
        <div className="absolute inset-0 rounded-full border-[7px] border-transparent border-t-pos-primary border-r-pos-primary border-b-pos-primary-muted" />
        <div className="text-center">
          <p className="text-[7px] text-pos-ink-faint">Net</p>
          <p className="text-[12px] font-medium tabular-nums">₦2.1m</p>
        </div>
      </div>
      <div className="mt-2 space-y-1.5">
        {[
          ["Supermarket", "58%"],
          ["Food store", "24%"],
          ["Hotel", "18%"],
        ].map(([label, width]) => (
          <div key={label}>
            <div className="flex items-center justify-between text-[8px] text-pos-ink-muted">
              <span>{label}</span>
            </div>
            <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-pos-primary-soft">
              <div className="h-full rounded-full bg-pos-primary" style={{ width }} />
            </div>
          </div>
        ))}
      </div>
    </MiniPhone>
  );
}

function ScanMini() {
  return (
    <MiniPhone>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-[10px] font-medium">Price check</p>
        <span className="grid h-6 w-6 place-items-center rounded-full bg-pos-primary-soft text-pos-ink-muted">
          <ScanBarcode size={10} />
        </span>
      </div>
      <div className="relative mt-2 grid h-24 place-items-center overflow-hidden rounded-2xl bg-pos-primary-soft">
        <div className="h-14 w-14 rounded-2xl border-2 border-pos-primary/35" />
        <ScanBarcode size={22} className="absolute text-pos-primary" />
      </div>
      <div className="relative mt-2 rounded-2xl bg-pos-surface p-2 shadow-pos-md ring-1 ring-pos-border">
        <p className="text-[8px] text-pos-ink-faint">In catalog</p>
        <p className="text-[11px] font-medium">Rice 5kg</p>
        <div className="absolute -bottom-2 -right-1 rounded-xl bg-pos-primary px-2 py-1 text-[9px] font-medium text-white shadow-pos-primary">
          ₦4,200
        </div>
      </div>
    </MiniPhone>
  );
}

function CodeMini() {
  return (
    <MiniPhone>
      <div className="mt-3 flex flex-col items-center">
        <span className="grid h-8 w-8 place-items-center rounded-2xl bg-pos-primary text-white">
          <BrandMark className="h-4 w-4" />
        </span>
        <p className="mt-2 text-[8px] text-pos-ink-faint">Activate this till</p>
        <p className="mt-1 font-mono text-[12px] font-semibold tracking-[0.14em]">7K2M-9Q4P</p>
        <p className="mt-3 w-full rounded-full bg-pos-primary py-1.5 text-center text-[9px] font-medium text-white">
          Activate this device
        </p>
        <p className="mt-2 text-[8px] text-pos-ink-faint">One till, one device</p>
      </div>
    </MiniPhone>
  );
}

function HotelMini() {
  return (
    <MiniPhone>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-[10px] font-medium">Room 412</p>
        <span className="grid h-6 w-6 place-items-center rounded-full bg-pos-primary-soft text-pos-ink-muted">
          <Building2 size={10} />
        </span>
      </div>
      <div className="mt-2 space-y-1">
        {["Breakfast", "Minibar", "Laundry"].map((name) => (
          <div key={name} className="flex items-center justify-between rounded-lg bg-pos-surface-muted px-2 py-1.5 text-[9px]">
            <span>{name}</span>
            <span className="tabular-nums text-pos-ink-faint">Open</span>
          </div>
        ))}
      </div>
    </MiniPhone>
  );
}

function StackLayers({
  left,
  center,
  right,
}: {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
}) {
  return (
    <div className="relative h-[300px] overflow-hidden bg-pos-surface-muted sm:h-[340px]">
      <div className="pointer-events-none absolute -left-[38%] top-7 w-[68%] rotate-[-8deg] scale-90 opacity-40">
        {left}
      </div>
      <div className="pointer-events-none absolute -right-[38%] top-7 w-[68%] rotate-[8deg] scale-90 opacity-40">
        {right}
      </div>
      <div className="absolute inset-x-[5%] -top-2 z-10">{center}</div>
    </div>
  );
}

function StackMock({ kind }: { kind: "till" | "hq" | "scan" | "code" }) {
  if (kind === "till") {
    return <StackLayers left={<FoodMini />} center={<TillMini />} right={<HotelMini />} />;
  }
  if (kind === "hq") {
    return <StackLayers left={<TillMini />} center={<HqMini />} right={<FoodMini />} />;
  }
  if (kind === "scan") {
    return <StackLayers left={<TillMini />} center={<ScanMini />} right={<HqMini />} />;
  }
  return <StackLayers left={<HqMini />} center={<CodeMini />} right={<TillMini />} />;
}

function HeroPreview() {
  return (
    <div className="relative mx-auto max-w-5xl">
      <div
        className="rounded-[28px] bg-pos-surface/80 p-2 shadow-pos-primary sm:rounded-[36px] sm:p-4"
        style={{
          WebkitMaskImage: "linear-gradient(to bottom, #000 68%, transparent 92%)",
          maskImage: "linear-gradient(to bottom, #000 68%, transparent 92%)",
        }}
      >
        <div className="flex items-center justify-between px-3 py-1.5 sm:px-4">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-pos-primary text-white">
              <BrandMark className="h-4 w-4" />
            </span>
            <span className="text-sm font-medium">POS</span>
          </div>
          <span className="text-sm text-pos-ink-faint">Supermarket · Food · Hotel</span>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <PhoneFrame>
            <PhoneStatus />
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-pos-primary text-white">
                  <Store size={12} />
                </span>
                <div>
                  <p className="text-[10px] text-pos-ink-faint">Ikeja branch</p>
                  <p className="text-[12px] font-medium">Supermarket</p>
                </div>
              </div>
              <span className="grid h-7 w-7 place-items-center rounded-full bg-pos-primary-soft text-pos-ink-muted">
                <Search size={12} />
              </span>
            </div>
            <h3 className="mt-4 text-[1.15rem] font-medium leading-tight tracking-tight">Floor sales</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-pos-primary-soft px-3 py-2.5">
                <p className="text-[10px] text-pos-ink-faint">Today</p>
                <p className="text-sm font-medium tabular-nums">₦184,200</p>
              </div>
              <div className="rounded-2xl bg-pos-primary-soft px-3 py-2.5">
                <p className="text-[10px] text-pos-ink-faint">Tickets</p>
                <p className="text-sm font-medium tabular-nums">42</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {["Rice 5kg", "Peak milk", "Bread", "Palm oil"].map((name) => (
                <div key={name} className="rounded-2xl bg-pos-primary-soft px-2 py-3 text-center text-[11px] font-medium">
                  {name}
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1.5">
              {[
                ["Indomie carton", "₦6,800"],
                ["Sugar 1kg", "₦1,450"],
                ["Water pack", "₦2,200"],
                ["Soap 3-pack", "₦3,100"],
              ].map(([name, price]) => (
                <div key={name} className="flex items-center justify-between rounded-xl bg-pos-surface-muted px-2.5 py-2 text-[11px]">
                  <span>{name}</span>
                  <span className="tabular-nums text-pos-ink-muted">{price}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-pos-inverse px-3 py-2.5 text-white">
              <span className="text-[10px] text-white/55">Open ticket</span>
              <span className="text-sm font-medium tabular-nums">₦11,750</span>
            </div>
          </PhoneFrame>

          <PhoneFrame>
            <PhoneStatus />
            <div className="mt-2 flex items-center justify-between">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-pos-primary-soft text-pos-ink-muted">
                <ChevronLeft size={14} />
              </span>
              <p className="text-[12px] font-medium">Table 7</p>
              <span className="grid h-7 w-7 place-items-center rounded-full bg-pos-inverse text-[8px] font-medium text-white">
                CK
              </span>
            </div>
            <div className="relative mt-3 overflow-hidden rounded-[22px] bg-gradient-to-br from-pos-primary-soft to-pos-primary-muted p-4">
              <p className="text-[10px] text-pos-primary">Kitchen · food store</p>
              <p className="mt-1 text-sm font-medium">Courses in</p>
              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-pos-ink-muted">Firing</span>
                  <span className="font-medium text-pos-primary">2 / 3</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-pos-surface/70">
                  <div className="h-full w-[72%] rounded-full bg-pos-primary" />
                </div>
              </div>
              <UtensilsCrossed className="absolute -right-2 -bottom-2 h-16 w-16 text-pos-primary/20" />
            </div>
            <div className="mt-3 space-y-1.5">
              {[
                ["Jollof rice", "Ready"],
                ["Grilled chicken", "Firing"],
                ["Zobo", "Queued"],
                ["Asun", "Queued"],
                ["Chapman", "Queued"],
              ].map(([name, state]) => (
                <div key={name} className="flex items-center justify-between rounded-xl bg-pos-surface-muted px-2.5 py-2 text-[11px]">
                  <span>{name}</span>
                  <span className={state === "Ready" ? "text-pos-primary" : "text-pos-ink-faint"}>{state}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl bg-pos-primary px-3 py-2.5 text-center text-[12px] font-medium text-white">
              Send to kitchen · ₦9,100
            </div>
          </PhoneFrame>

          <PhoneFrame>
            <PhoneStatus />
            <div className="mt-2 flex items-center justify-between">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-pos-primary-soft text-pos-ink-muted">
                <ChevronLeft size={14} />
              </span>
              <p className="text-[12px] font-medium">HQ today</p>
              <span className="grid h-7 w-7 place-items-center rounded-full bg-pos-primary-soft text-pos-ink-muted">
                <Bell size={12} />
              </span>
            </div>
            <p className="mt-3 text-[10px] text-pos-ink-faint">All sales · supermarket, food, hotel</p>
            <div className="relative mx-auto mt-3 grid h-36 w-36 place-items-center">
              <div className="absolute inset-0 rounded-full border-[10px] border-pos-primary-muted" />
              <div className="absolute inset-0 rounded-full border-[10px] border-transparent border-t-pos-primary border-r-pos-primary border-b-pos-primary-muted" />
              <div className="text-center">
                <p className="text-[10px] text-pos-ink-faint">Net</p>
                <p className="text-lg font-medium tabular-nums">₦2.1m</p>
              </div>
            </div>
            <div className="mt-4 space-y-2.5">
              {[
                ["Supermarket", "58%", "₦1.22m"],
                ["Food store", "24%", "₦504k"],
                ["Hotel", "18%", "₦378k"],
                ["Dark kitchen", "8%", "₦168k"],
              ].map(([label, width, amount]) => (
                <div key={label}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-pos-ink-muted">{label}</span>
                    <span className="tabular-nums text-pos-ink-muted">{amount}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-pos-primary-soft">
                    <div className="h-full rounded-full bg-pos-primary" style={{ width }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex h-16 items-end gap-1">
              {[32, 48, 40, 70, 58, 88, 64, 76, 52, 90].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-md bg-gradient-to-t from-pos-primary to-pos-primary-muted"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </PhoneFrame>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 marketing-fade-bottom" />
    </div>
  );
}


export default function HomePage() {
  return (
    <div className="bg-pos-bg text-pos-ink">
      <section className="relative -mt-[4.5rem] min-h-[100vh]">
        <div aria-hidden className="marketing-hero-bg absolute inset-x-0 top-0 h-[100vh]">
          <div className="hero-matrix absolute inset-0" />
        </div>
        <div className="relative flex min-h-[100vh] flex-col px-4 pt-48 sm:px-6 sm:pt-56 md:pt-64">
          <div className="mx-auto max-w-2xl text-center">
            <p className="inline-flex rounded-full bg-pos-surface/15 px-3 py-1 text-xs font-medium text-white/90 ring-1 ring-white/20">
              Sales POS for retail and hospitality
            </p>
            <h1 className="mt-4 text-[1.85rem] font-medium leading-[1.15] tracking-tight text-white sm:text-[2.35rem] lg:text-[2.65rem]">
              One POS for supermarket,
              <br className="hidden sm:block" /> food store, and hotel sales.
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/80 sm:text-[15px]">
              Sell on the till, run the business in HQ, check prices on the floor. One catalog
              for shelves, tables, rooms, and dark kitchens.
            </p>
            <Link
              href="/register"
              className="mt-6 inline-flex rounded-full bg-pos-surface px-5 py-2 text-sm font-medium text-pos-primary shadow-pos-md"
            >
              Get started
            </Link>
          </div>
          <div className="mt-10 sm:mt-12">
            <HeroPreview />
          </div>
        </div>
      </section>

      <PartnerMarquee />

      <section className="px-4 py-16 sm:px-6">
        <h2 className="text-center text-[1.85rem] font-medium tracking-tight text-pos-ink sm:text-[2.15rem]">
          Built for the floor you run
        </h2>
        <div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-3">
          {floors.map(({ icon: Icon, title, copy }) => (
            <article
              key={title}
              className="rounded-[28px] bg-pos-surface px-6 py-10 text-center shadow-pos-md"
            >
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-pos-border">
                <Icon size={22} strokeWidth={1.6} className="text-pos-ink" />
              </span>
              <h3 className="mt-5 text-base font-medium tracking-tight text-pos-ink">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-pos-ink-muted">{copy}</p>
            </article>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-pos-ink-faint">
          Restaurant and dark kitchen sit on the same catalog
        </p>
      </section>

      <section className="relative z-20 px-4 pt-16 sm:px-6">
        <div className="mx-auto grid max-w-5xl items-start gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative z-20 lg:-mb-14">
            <div className="overflow-hidden rounded-[32px] bg-pos-surface-muted shadow-pos-md">
              <img
                src="/operator-portrait.png"
                alt=""
                className="h-[480px] w-full object-cover object-[center_18%] sm:h-[520px]"
              />
            </div>
          </div>
          <div>
            <p className="inline-flex rounded-full bg-pos-surface-muted px-3 py-1 text-xs font-medium text-pos-ink">
              One POS for every trade
            </p>
            <h2 className="mt-4 max-w-md text-[1.85rem] font-semibold leading-[1.15] tracking-tight text-pos-ink sm:text-[2.15rem]">
              Floor sales are high-volume but high-risk
            </h2>
            <p className="mt-3 text-[15px] text-pos-ink-muted">Running supermarket, food, and hotel without POS means</p>
            <ul className="mt-5 space-y-2.5">
              {pains.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-3 rounded-2xl bg-pos-surface px-4 py-3.5 shadow-pos-md"
                >
                  <Icon size={18} strokeWidth={1.6} className="text-pos-ink" />
                  <span className="text-sm font-semibold text-pos-ink">{label}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm text-pos-ink-muted">Saying no means lost tickets.</p>
          </div>
        </div>
      </section>

      <section id="how" className="relative z-0 overflow-hidden">
        <div aria-hidden className="marketing-hero-stack-bg absolute inset-0">
          <div className="hero-matrix absolute inset-0" />
        </div>

        <div className="relative px-4 pt-16 sm:px-6 sm:pt-20">
          <div className="mx-auto w-full max-w-5xl text-center">
            <h2 className="text-[1.85rem] font-medium leading-[1.15] tracking-tight text-white sm:text-[2.15rem]">
              Till, HQ, and price check — one stack
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/80 sm:text-[15px]">
              The register stays on the counter. The office stays in the browser.
            </p>
          </div>
          <div className="mx-auto mt-14 grid w-full max-w-6xl grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {stackApps.map((app) => (
              <article
                key={app.title}
                className="overflow-hidden rounded-[28px] bg-pos-surface shadow-pos-md sm:rounded-[32px]"
              >
                <StackMock kind={app.screen} />
                <p className="px-3 py-4 text-center text-sm font-semibold tracking-tight text-pos-ink">
                  {app.title}
                </p>
              </article>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm font-medium text-white">
            <span className="inline-flex items-center gap-2">
              <Lock size={15} strokeWidth={1.7} /> One till, one device
            </span>
            <span className="inline-flex items-center gap-2">
              <ShieldCheck size={15} strokeWidth={1.7} /> Licence from activation
            </span>
          </div>
        </div>

        <div className="relative mx-auto max-w-5xl px-4 pb-20 pt-16 text-center sm:px-6 sm:pb-24 sm:pt-20">
          <h2 className="text-[1.85rem] font-semibold tracking-tight text-pos-ink sm:text-[2.15rem]">
            How it works
          </h2>
          <p className="mt-2 text-[15px] text-pos-ink-muted">
            HQ issues the code. The floor activates. Sales show up without a second spreadsheet.
          </p>
          <div className="relative mt-12 flex flex-col items-center gap-5 md:mt-16 md:flex-row md:items-start md:justify-center md:pt-12">
            {steps.map(({ icon: Icon, title, copy, featured }) => (
              <article
                key={title}
                className={`w-full rounded-[28px] bg-pos-surface px-7 py-14 shadow-pos-md md:w-[31%] ${
                  featured
                    ? "md:-translate-y-12"
                    : "md:box-border md:flex md:h-[calc(18.25rem-0.25em)] md:flex-col md:justify-center"
                }`}
              >
                <span className="relative mx-auto inline-flex">
                  <Icon size={36} strokeWidth={1.45} className="text-pos-ink" />
                  <span className="absolute -right-0.5 bottom-0.5 h-2 w-2 rounded-full bg-pos-primary" />
                </span>
                <h3 className="mt-6 text-base font-semibold tracking-tight text-pos-ink">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-pos-ink-muted">{copy}</p>
              </article>
            ))}
            <p className="mt-8 whitespace-nowrap text-sm text-pos-ink-faint md:absolute md:bottom-8 md:left-1/2 md:mt-0 md:-translate-x-1/2">
              Clean <span className="mx-1.5 text-pos-primary">•</span> One catalog{" "}
              <span className="mx-1.5 text-pos-primary">•</span> Naira
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-5xl items-stretch gap-5 lg:grid-cols-[1.2fr_0.88fr]">
          <article className="flex h-full flex-col rounded-[28px] bg-pos-surface px-7 py-8 shadow-pos-md sm:px-8 sm:py-9">
            <h2 className="text-[1.45rem] font-semibold tracking-tight text-pos-ink sm:text-[1.65rem]">
              Why operators run on POS
            </h2>
            <p className="mt-1.5 text-[15px] text-pos-ink-muted">The till stays on the counter. HQ stays in the browser.</p>
            <div className="mt-8 grid flex-1 grid-cols-2 gap-2.5">
              {whyItems.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex flex-col justify-center rounded-2xl border border-pos-border bg-pos-surface px-4 py-4"
                >
                  <Icon size={18} strokeWidth={1.6} className="text-pos-ink-faint" />
                  <span className="mt-2.5 text-[13px] font-medium leading-snug text-pos-ink">{label}</span>
                </div>
              ))}
            </div>
          </article>

          <div className="flex h-full flex-col items-center">
            <article className="w-full rounded-[28px] bg-pos-surface px-7 py-8 shadow-pos-md sm:px-8 sm:py-9">
              <h2 className="text-[1.45rem] font-semibold tracking-tight text-pos-ink sm:text-[1.65rem]">
                What you get
              </h2>
              <p className="mt-1.5 text-[15px] text-pos-ink-muted">Everything on one catalog.</p>
              <ul className="mt-8 space-y-2.5">
                {getItems.map((label) => (
                  <li
                    key={label}
                    className="flex items-center gap-3 rounded-full border border-pos-border bg-pos-surface px-3 py-3"
                  >
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-pos-success text-white">
                      <Check size={13} strokeWidth={2.4} />
                    </span>
                    <span className="text-[13px] font-medium text-pos-ink">{label}</span>
                  </li>
                ))}
              </ul>
            </article>
            <span aria-hidden className="h-8 w-px bg-pos-border" />
            <Link
              href="/register"
              className="rounded-full bg-pos-primary px-6 py-3 text-sm font-medium text-white shadow-pos-primary"
            >
              Get started
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-[1.85rem] font-semibold tracking-tight text-pos-ink sm:text-[2.15rem]">
            Frequently asked questions
          </h2>
          <p className="mt-2 text-[15px] text-pos-ink-muted">
            HQ issues the code. The floor activates. Sales show up without a second spreadsheet.
          </p>
          <div className="mt-10 space-y-3 text-left">
            {faqs.map(({ q, a }) => (
              <details
                key={q}
                className="group rounded-full bg-pos-surface px-6 shadow-pos-md open:rounded-[28px]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-medium text-pos-ink [&::-webkit-details-marker]:hidden">
                  {q}
                  <ChevronDown
                    size={18}
                    strokeWidth={1.8}
                    className="shrink-0 text-pos-ink-faint transition group-open:rotate-180"
                  />
                </summary>
                <p className="pb-4 pr-8 text-sm leading-6 text-pos-ink-muted">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-10 pt-6 sm:px-6">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[32px] px-6 py-20 text-center sm:rounded-[40px] sm:px-12 sm:py-24">
          <div aria-hidden className="marketing-hero-bg absolute inset-0">
            <div className="hero-matrix absolute inset-0" />
          </div>
          <div className="relative">
            <p className="inline-flex rounded-full bg-pos-surface/15 px-3 py-1 text-xs font-medium text-white/90 ring-1 ring-white/25">
              Sales POS for retail and hospitality
            </p>
            <h2 className="mx-auto mt-5 max-w-xl text-[1.85rem] font-semibold leading-[1.15] tracking-tight text-white sm:text-[2.35rem]">
              Ready to run the till without sharing a PC?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/85 sm:text-[15px]">
              Create an HQ account. Issue a till. No pressure. No second spreadsheet.
            </p>
            <Link
              href="/register"
              className="mt-8 inline-flex rounded-full bg-pos-surface px-6 py-3 text-sm font-medium text-pos-ink shadow-pos-md"
            >
              Get started
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
