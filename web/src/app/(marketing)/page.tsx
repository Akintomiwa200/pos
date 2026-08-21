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
    <div className="flex items-center justify-between px-1 text-[9px] font-medium text-neutral-400">
      <span>9:40 PM</span>
      <span className="flex gap-0.5">
        <span className="h-1.5 w-3 rounded-sm bg-neutral-300" />
        <span className="h-1.5 w-2 rounded-sm bg-neutral-300" />
        <span className="h-1.5 w-4 rounded-sm bg-neutral-400" />
      </span>
    </div>
  );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <article
      className="relative h-[28rem] overflow-hidden rounded-[24px] bg-white p-3 shadow-[0_10px_30px_rgba(28,28,30,0.06)] sm:h-[34rem] sm:rounded-[28px] sm:p-4"
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
      className={`overflow-hidden rounded-[22px] bg-white p-2.5 shadow-[0_14px_32px_rgba(28,28,30,0.12)] ${className}`}
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
          <span className="grid h-6 w-6 place-items-center rounded-full bg-[#6d4aff] text-white">
            <Store size={10} />
          </span>
          <div>
            <p className="text-[8px] text-neutral-400">Ikeja branch</p>
            <p className="text-[10px] font-medium">Supermarket</p>
          </div>
        </div>
        <span className="grid h-6 w-6 place-items-center rounded-full bg-[#f4f0ff] text-neutral-500">
          <Search size={10} />
        </span>
      </div>
      <h3 className="mt-2.5 text-[13px] font-medium tracking-tight">Floor sales</h3>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <div className="rounded-xl bg-[#f7f5ff] px-2 py-1.5">
          <p className="text-[8px] text-neutral-400">Today</p>
          <p className="text-[11px] font-medium tabular-nums">₦184,200</p>
        </div>
        <div className="rounded-xl bg-[#f7f5ff] px-2 py-1.5">
          <p className="text-[8px] text-neutral-400">Tickets</p>
          <p className="text-[11px] font-medium tabular-nums">42</p>
        </div>
      </div>
      <div className="relative mt-2">
        <div className="grid grid-cols-2 gap-1.5">
          {["Rice 5kg", "Peak milk", "Bread", "Palm oil"].map((name) => (
            <div key={name} className="rounded-xl bg-[#f4f0ff] px-1.5 py-2 text-center text-[9px] font-medium">
              {name}
            </div>
          ))}
        </div>
        <div className="absolute -bottom-3 -right-1 rounded-xl bg-[#1c1c1e] px-2 py-1.5 text-[8px] text-white shadow-[0_8px_18px_rgba(28,28,30,0.25)]">
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
        <span className="grid h-6 w-6 place-items-center rounded-full bg-[#f4f0ff] text-neutral-500">
          <ChevronLeft size={12} />
        </span>
        <p className="text-[10px] font-medium">Table 7</p>
        <span className="grid h-6 w-6 place-items-center rounded-full bg-[#1c1c1e] text-[7px] font-medium text-white">
          CK
        </span>
      </div>
      <div className="relative mt-2 overflow-hidden rounded-2xl bg-gradient-to-br from-[#ece6ff] to-[#d6ccff] p-2.5">
        <p className="text-[8px] text-[#6d4aff]">Kitchen · food store</p>
        <p className="mt-0.5 text-[11px] font-medium">Courses in</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/70">
          <div className="h-full w-[72%] rounded-full bg-[#6d4aff]" />
        </div>
      </div>
      <div className="mt-2 space-y-1">
        {["Jollof rice", "Grilled chicken", "Zobo"].map((name) => (
          <div key={name} className="flex items-center justify-between rounded-lg bg-[#faf9ff] px-2 py-1 text-[9px]">
            <span>{name}</span>
            <span className="text-neutral-400">Firing</span>
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
        <span className="grid h-6 w-6 place-items-center rounded-full bg-[#f4f0ff] text-neutral-500">
          <Bell size={10} />
        </span>
      </div>
      <p className="mt-1 text-[8px] text-neutral-400">All sales · supermarket, food, hotel</p>
      <div className="relative mx-auto mt-2 grid h-20 w-20 place-items-center">
        <div className="absolute inset-0 rounded-full border-[7px] border-[#eee9ff]" />
        <div className="absolute inset-0 rounded-full border-[7px] border-transparent border-t-[#6d4aff] border-r-[#6d4aff] border-b-[#c4b5fd]" />
        <div className="text-center">
          <p className="text-[7px] text-neutral-400">Net</p>
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
            <div className="flex items-center justify-between text-[8px] text-neutral-500">
              <span>{label}</span>
            </div>
            <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-[#f4f0ff]">
              <div className="h-full rounded-full bg-[#6d4aff]" style={{ width }} />
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
        <span className="grid h-6 w-6 place-items-center rounded-full bg-[#f4f0ff] text-neutral-500">
          <ScanBarcode size={10} />
        </span>
      </div>
      <div className="relative mt-2 grid h-24 place-items-center overflow-hidden rounded-2xl bg-[#efeaff]">
        <div className="h-14 w-14 rounded-2xl border-2 border-[#6d4aff]/35" />
        <ScanBarcode size={22} className="absolute text-[#6d4aff]" />
      </div>
      <div className="relative mt-2 rounded-2xl bg-white p-2 shadow-[0_8px_20px_rgba(28,28,30,0.06)] ring-1 ring-neutral-100">
        <p className="text-[8px] text-neutral-400">In catalog</p>
        <p className="text-[11px] font-medium">Rice 5kg</p>
        <div className="absolute -bottom-2 -right-1 rounded-xl bg-[#6d4aff] px-2 py-1 text-[9px] font-medium text-white shadow-[0_8px_16px_rgba(109,74,255,0.35)]">
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
        <span className="grid h-8 w-8 place-items-center rounded-2xl bg-[#6d4aff] text-white">
          <BrandMark className="h-4 w-4" />
        </span>
        <p className="mt-2 text-[8px] text-neutral-400">Activate this till</p>
        <p className="mt-1 font-mono text-[12px] font-semibold tracking-[0.14em]">7K2M-9Q4P</p>
        <p className="mt-3 w-full rounded-full bg-[#6d4aff] py-1.5 text-center text-[9px] font-medium text-white">
          Activate this device
        </p>
        <p className="mt-2 text-[8px] text-neutral-400">One till, one device</p>
      </div>
    </MiniPhone>
  );
}

function HotelMini() {
  return (
    <MiniPhone>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-[10px] font-medium">Room 412</p>
        <span className="grid h-6 w-6 place-items-center rounded-full bg-[#f4f0ff] text-neutral-500">
          <Building2 size={10} />
        </span>
      </div>
      <div className="mt-2 space-y-1">
        {["Breakfast", "Minibar", "Laundry"].map((name) => (
          <div key={name} className="flex items-center justify-between rounded-lg bg-[#faf9ff] px-2 py-1.5 text-[9px]">
            <span>{name}</span>
            <span className="tabular-nums text-neutral-400">Open</span>
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
    <div className="relative h-[300px] overflow-hidden bg-[#f6f4fb] sm:h-[340px]">
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
        className="rounded-[28px] bg-white/80 p-2 shadow-[0_24px_60px_rgba(85,56,224,0.16)] sm:rounded-[36px] sm:p-4"
        style={{
          WebkitMaskImage: "linear-gradient(to bottom, #000 68%, transparent 92%)",
          maskImage: "linear-gradient(to bottom, #000 68%, transparent 92%)",
        }}
      >
        <div className="flex items-center justify-between px-3 py-1.5 sm:px-4">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-[#6d4aff] text-white">
              <BrandMark className="h-4 w-4" />
            </span>
            <span className="text-sm font-medium">POS</span>
          </div>
          <span className="text-sm text-neutral-400">Supermarket · Food · Hotel</span>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <PhoneFrame>
            <PhoneStatus />
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[#6d4aff] text-white">
                  <Store size={12} />
                </span>
                <div>
                  <p className="text-[10px] text-neutral-400">Ikeja branch</p>
                  <p className="text-[12px] font-medium">Supermarket</p>
                </div>
              </div>
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[#f4f0ff] text-neutral-500">
                <Search size={12} />
              </span>
            </div>
            <h3 className="mt-4 text-[1.15rem] font-medium leading-tight tracking-tight">Floor sales</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-[#f7f5ff] px-3 py-2.5">
                <p className="text-[10px] text-neutral-400">Today</p>
                <p className="text-sm font-medium tabular-nums">₦184,200</p>
              </div>
              <div className="rounded-2xl bg-[#f7f5ff] px-3 py-2.5">
                <p className="text-[10px] text-neutral-400">Tickets</p>
                <p className="text-sm font-medium tabular-nums">42</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {["Rice 5kg", "Peak milk", "Bread", "Palm oil"].map((name) => (
                <div key={name} className="rounded-2xl bg-[#f4f0ff] px-2 py-3 text-center text-[11px] font-medium">
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
                <div key={name} className="flex items-center justify-between rounded-xl bg-[#faf9ff] px-2.5 py-2 text-[11px]">
                  <span>{name}</span>
                  <span className="tabular-nums text-neutral-500">{price}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-[#1c1c1e] px-3 py-2.5 text-white">
              <span className="text-[10px] text-white/55">Open ticket</span>
              <span className="text-sm font-medium tabular-nums">₦11,750</span>
            </div>
          </PhoneFrame>

          <PhoneFrame>
            <PhoneStatus />
            <div className="mt-2 flex items-center justify-between">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[#f4f0ff] text-neutral-500">
                <ChevronLeft size={14} />
              </span>
              <p className="text-[12px] font-medium">Table 7</p>
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[#1c1c1e] text-[8px] font-medium text-white">
                CK
              </span>
            </div>
            <div className="relative mt-3 overflow-hidden rounded-[22px] bg-gradient-to-br from-[#ece6ff] to-[#d6ccff] p-4">
              <p className="text-[10px] text-[#6d4aff]">Kitchen · food store</p>
              <p className="mt-1 text-sm font-medium">Courses in</p>
              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-500">Firing</span>
                  <span className="font-medium text-[#6d4aff]">2 / 3</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/70">
                  <div className="h-full w-[72%] rounded-full bg-[#6d4aff]" />
                </div>
              </div>
              <UtensilsCrossed className="absolute -right-2 -bottom-2 h-16 w-16 text-[#6d4aff]/20" />
            </div>
            <div className="mt-3 space-y-1.5">
              {[
                ["Jollof rice", "Ready"],
                ["Grilled chicken", "Firing"],
                ["Zobo", "Queued"],
                ["Asun", "Queued"],
                ["Chapman", "Queued"],
              ].map(([name, state]) => (
                <div key={name} className="flex items-center justify-between rounded-xl bg-[#faf9ff] px-2.5 py-2 text-[11px]">
                  <span>{name}</span>
                  <span className={state === "Ready" ? "text-[#6d4aff]" : "text-neutral-400"}>{state}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl bg-[#6d4aff] px-3 py-2.5 text-center text-[12px] font-medium text-white">
              Send to kitchen · ₦9,100
            </div>
          </PhoneFrame>

          <PhoneFrame>
            <PhoneStatus />
            <div className="mt-2 flex items-center justify-between">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[#f4f0ff] text-neutral-500">
                <ChevronLeft size={14} />
              </span>
              <p className="text-[12px] font-medium">HQ today</p>
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[#f4f0ff] text-neutral-500">
                <Bell size={12} />
              </span>
            </div>
            <p className="mt-3 text-[10px] text-neutral-400">All sales · supermarket, food, hotel</p>
            <div className="relative mx-auto mt-3 grid h-36 w-36 place-items-center">
              <div className="absolute inset-0 rounded-full border-[10px] border-[#eee9ff]" />
              <div className="absolute inset-0 rounded-full border-[10px] border-transparent border-t-[#6d4aff] border-r-[#6d4aff] border-b-[#c4b5fd]" />
              <div className="text-center">
                <p className="text-[10px] text-neutral-400">Net</p>
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
                    <span className="text-neutral-600">{label}</span>
                    <span className="tabular-nums text-neutral-500">{amount}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#f4f0ff]">
                    <div className="h-full rounded-full bg-[#6d4aff]" style={{ width }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex h-16 items-end gap-1">
              {[32, 48, 40, 70, 58, 88, 64, 76, 52, 90].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-md bg-gradient-to-t from-[#6d4aff] to-[#ddd6fe]"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </PhoneFrame>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(to_top,#fff_0%,#fff_45%,transparent_100%)]" />
    </div>
  );
}


export default function HomePage() {
  return (
    <div className="bg-white">
      <section className="relative -mt-[4.5rem] min-h-[100vh] bg-white">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-[100vh] bg-[linear-gradient(180deg,#5538e0_0%,#6d4aff_42%,#c4b5fd_78%,#ffffff_100%)]"
        >
          <div className="hero-matrix absolute inset-0" />
        </div>
        <div className="relative flex min-h-[100vh] flex-col px-4 pt-48 sm:px-6 sm:pt-56 md:pt-64">
          <div className="mx-auto max-w-2xl text-center">
            <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white/90 ring-1 ring-white/20">
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
              className="mt-6 inline-flex rounded-full bg-white px-5 py-2 text-sm font-medium text-[#6d4aff] shadow-[0_8px_24px_rgba(28,28,30,0.08)]"
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
        <h2 className="text-center text-[1.85rem] font-medium tracking-tight text-[#1c1c1e] sm:text-[2.15rem]">
          Built for the floor you run
        </h2>
        <div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-3">
          {floors.map(({ icon: Icon, title, copy }) => (
            <article
              key={title}
              className="rounded-[28px] bg-white px-6 py-10 text-center shadow-[0_8px_30px_rgba(28,28,30,0.06)]"
            >
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-neutral-200">
                <Icon size={22} strokeWidth={1.6} className="text-[#1c1c1e]" />
              </span>
              <h3 className="mt-5 text-base font-medium tracking-tight text-[#1c1c1e]">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-neutral-500">{copy}</p>
            </article>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-neutral-400">
          Restaurant and dark kitchen sit on the same catalog
        </p>
      </section>

      <section className="relative z-20 bg-white px-4 pt-16 sm:px-6">
        <div className="mx-auto grid max-w-5xl items-start gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative z-20 lg:-mb-14">
            <div className="overflow-hidden rounded-[32px] bg-[#ececec] shadow-[0_16px_40px_rgba(28,28,30,0.1)]">
              <img
                src="/operator-portrait.png"
                alt=""
                className="h-[480px] w-full object-cover object-[center_18%] sm:h-[520px]"
              />
            </div>
          </div>
          <div>
            <p className="inline-flex rounded-full bg-neutral-200/70 px-3 py-1 text-xs font-medium text-[#1c1c1e]">
              One POS for every trade
            </p>
            <h2 className="mt-4 max-w-md text-[1.85rem] font-semibold leading-[1.15] tracking-tight text-[#1c1c1e] sm:text-[2.15rem]">
              Floor sales are high-volume but high-risk
            </h2>
            <p className="mt-3 text-[15px] text-neutral-500">Running supermarket, food, and hotel without POS means</p>
            <ul className="mt-5 space-y-2.5">
              {pains.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-[0_8px_24px_rgba(28,28,30,0.04)]"
                >
                  <Icon size={18} strokeWidth={1.6} className="text-[#1c1c1e]" />
                  <span className="text-sm font-semibold text-[#1c1c1e]">{label}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm text-neutral-500">Saying no means lost tickets.</p>
          </div>
        </div>
      </section>

      <section className="relative z-0 min-h-[100vh]">
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(180deg,#5538e0_0%,#6d4aff_42%,#8b74f0_82%,#c4b5fd_100%)]"
        >
          <div className="hero-matrix absolute inset-0" />
        </div>
        <div className="relative flex min-h-[100vh] flex-col justify-between px-4 py-16 sm:px-6 sm:py-20">
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
                className="overflow-hidden rounded-[28px] bg-white shadow-[0_16px_40px_rgba(28,28,30,0.1)] sm:rounded-[32px]"
              >
                <StackMock kind={app.screen} />
                <p className="px-3 py-4 text-center text-sm font-semibold tracking-tight text-[#1c1c1e]">{app.title}</p>
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
      </section>

      <section id="how" className="relative overflow-hidden px-4 py-20 sm:px-6 sm:py-24">
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(180deg,#c4b5fd_0%,#ddd6fe_32%,#f5f3ff_62%,#ffffff_100%)]"
        >
          <div className="hero-matrix absolute inset-0" />
        </div>
        <div className="relative mx-auto max-w-5xl text-center">
          <h2 className="text-[1.85rem] font-semibold tracking-tight text-[#1c1c1e] sm:text-[2.15rem]">
            How it works
          </h2>
          <p className="mt-2 text-[15px] text-neutral-500">
            HQ issues the code. The floor activates. Sales show up without a second spreadsheet.
          </p>
          <div className="relative mt-12 flex flex-col items-center gap-5 md:mt-16 md:flex-row md:items-start md:justify-center md:pt-12">
            {steps.map(({ icon: Icon, title, copy, featured }) => (
              <article
                key={title}
                className={`w-full rounded-[28px] bg-white px-7 py-14 shadow-[0_16px_44px_rgba(28,28,30,0.08)] md:w-[31%] ${
                  featured
                    ? "md:-translate-y-12"
                    : "md:box-border md:flex md:h-[calc(18.25rem-0.25em)] md:flex-col md:justify-center"
                }`}
              >
                <span className="relative mx-auto inline-flex">
                  <Icon size={36} strokeWidth={1.45} className="text-[#1c1c1e]" />
                  <span className="absolute -right-0.5 bottom-0.5 h-2 w-2 rounded-full bg-[#6d4aff]" />
                </span>
                <h3 className="mt-6 text-base font-semibold tracking-tight text-[#1c1c1e]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-neutral-500">{copy}</p>
              </article>
            ))}
            <p className="mt-8 whitespace-nowrap text-sm text-neutral-400 md:absolute md:bottom-8 md:left-1/2 md:mt-0 md:-translate-x-1/2">
              Clean <span className="mx-1.5 text-[#6d4aff]">•</span> One catalog{" "}
              <span className="mx-1.5 text-[#6d4aff]">•</span> Naira
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-5xl items-stretch gap-5 lg:grid-cols-[1.2fr_0.88fr]">
          <article className="flex h-full flex-col rounded-[28px] bg-white px-7 py-8 shadow-[0_8px_30px_rgba(28,28,30,0.04)] sm:px-8 sm:py-9">
            <h2 className="text-[1.45rem] font-semibold tracking-tight text-[#1c1c1e] sm:text-[1.65rem]">
              Why operators run on POS
            </h2>
            <p className="mt-1.5 text-[15px] text-neutral-500">The till stays on the counter. HQ stays in the browser.</p>
            <div className="mt-8 grid flex-1 grid-cols-2 gap-2.5">
              {whyItems.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex flex-col justify-center rounded-2xl border border-neutral-200 bg-white px-4 py-4"
                >
                  <Icon size={18} strokeWidth={1.6} className="text-neutral-400" />
                  <span className="mt-2.5 text-[13px] font-medium leading-snug text-[#1c1c1e]">{label}</span>
                </div>
              ))}
            </div>
          </article>

          <div className="flex h-full flex-col items-center">
            <article className="w-full rounded-[28px] bg-white px-7 py-8 shadow-[0_8px_30px_rgba(28,28,30,0.04)] sm:px-8 sm:py-9">
              <h2 className="text-[1.45rem] font-semibold tracking-tight text-[#1c1c1e] sm:text-[1.65rem]">
                What you get
              </h2>
              <p className="mt-1.5 text-[15px] text-neutral-500">Everything on one catalog.</p>
              <ul className="mt-8 space-y-2.5">
                {getItems.map((label) => (
                  <li
                    key={label}
                    className="flex items-center gap-3 rounded-full border border-neutral-200 bg-white px-3 py-3"
                  >
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#22c55e] text-white">
                      <Check size={13} strokeWidth={2.4} />
                    </span>
                    <span className="text-[13px] font-medium text-[#1c1c1e]">{label}</span>
                  </li>
                ))}
              </ul>
            </article>
            <span aria-hidden className="h-8 w-px bg-neutral-200" />
            <Link
              href="/register"
              className="rounded-full bg-[#6d4aff] px-6 py-3 text-sm font-medium text-white shadow-[0_8px_24px_rgba(109,74,255,0.28)]"
            >
              Get started
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-[1.85rem] font-semibold tracking-tight text-[#1c1c1e] sm:text-[2.15rem]">
            Frequently asked questions
          </h2>
          <p className="mt-2 text-[15px] text-neutral-500">
            HQ issues the code. The floor activates. Sales show up without a second spreadsheet.
          </p>
          <div className="mt-10 space-y-3 text-left">
            {faqs.map(({ q, a }) => (
              <details
                key={q}
                className="group rounded-full bg-white px-6 shadow-[0_8px_24px_rgba(28,28,30,0.04)] open:rounded-[28px]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-medium text-[#1c1c1e] [&::-webkit-details-marker]:hidden">
                  {q}
                  <ChevronDown
                    size={18}
                    strokeWidth={1.8}
                    className="shrink-0 text-neutral-300 transition group-open:rotate-180"
                  />
                </summary>
                <p className="pb-4 pr-8 text-sm leading-6 text-neutral-500">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-10 pt-6 sm:px-6">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[32px] px-6 py-20 text-center sm:rounded-[40px] sm:px-12 sm:py-24">
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(180deg,#5538e0_0%,#6d4aff_42%,#c4b5fd_78%,#ffffff_100%)]"
          >
            <div className="hero-matrix absolute inset-0" />
          </div>
          <div className="relative">
            <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white/90 ring-1 ring-white/25">
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
              className="mt-8 inline-flex rounded-full bg-white px-6 py-3 text-sm font-medium text-[#1c1c1e] shadow-[0_8px_24px_rgba(28,28,30,0.08)]"
            >
              Get started
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
