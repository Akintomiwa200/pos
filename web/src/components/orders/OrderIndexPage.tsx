import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  Clock4,
  FileCheck2,
  FilePlus2,
  PenLine,
  PlusCircle,
  Send,
  ShieldCheck,
  Truck,
  XCircle,
} from "lucide-react";

const PAGES = [
  {
    href: "/orders/summary",
    label: "Summary",
    copy: "Pipeline totals at a glance — value by status and top vendor spend.",
    icon: ClipboardList,
    circle: "bg-pos-primary-soft text-pos-primary",
  },
  {
    href: "/orders/new",
    label: "New Order",
    copy: "Create a purchase order from the item catalog, save as draft or submit.",
    icon: PlusCircle,
    circle: "bg-pos-success-soft text-pos-success",
  },
  {
    href: "/orders/list",
    label: "All Orders",
    copy: "Every purchase order from the first draft through final receipt.",
    icon: FilePlus2,
    circle: "bg-sky-100 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300",
  },
  {
    href: "/orders/drafts",
    label: "Drafts",
    copy: "Orders still being prepared. Submit them when the lines are ready.",
    icon: PenLine,
    circle: "bg-pos-surface-muted text-pos-ink-muted",
  },
  {
    href: "/orders/pending",
    label: "Pending Approval",
    copy: "Submitted orders waiting for a manager to approve or reject.",
    icon: ShieldCheck,
    circle: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  },
  {
    href: "/orders/approved",
    label: "Approved & Sent",
    copy: "Approved orders and those already sent to the vendor.",
    icon: Send,
    circle: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  {
    href: "/orders/receiving",
    label: "Receiving",
    copy: "Goods expected or partially delivered. Mark receipt against each open order.",
    icon: Truck,
    circle: "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
  },
  {
    href: "/orders/received",
    label: "Received",
    copy: "Orders fully received or closed on the books.",
    icon: CheckCircle2,
    circle: "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
  },
  {
    href: "/orders/cancelled",
    label: "Cancelled",
    copy: "Orders that were cancelled or sent back for revision.",
    icon: XCircle,
    circle: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  },
  {
    href: "/orders/detail",
    label: "Order Detail",
    copy: "Open any order number to follow its timeline, lines, and receipt progress.",
    icon: FileCheck2,
    circle: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
  },
  {
    href: "/orders/receive",
    label: "Receive an Order",
    copy: "Record goods received line by line — full or partial, against one order.",
    icon: Clock4,
    circle: "bg-lime-50 text-lime-700 dark:bg-lime-950/40 dark:text-lime-300",
  },
];

export default function OrdersIndexPage() {
  return (
    <div className="pb-8">
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">Analytics · Orders</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">Purchase orders</h1>
        <p className="mt-1.5 text-sm text-pos-ink-muted">
          From draft to receipt — every order page in one place. Pick a hub below, then open an individual order to
          follow its status or record receiving.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        {PAGES.map((page) => {
          const Icon = page.icon;
          return (
            <Link
              key={page.href}
              href={page.href}
              className="group rounded-[20px] bg-pos-surface p-6 shadow-pos-md transition hover:-translate-y-0.5 hover:shadow-pos-primary"
            >
              <div className="flex items-start justify-between gap-4">
                <span className={`grid h-12 w-12 place-items-center rounded-2xl ${page.circle}`}>
                  <Icon size={22} />
                </span>
                <span className="grid h-8 w-8 place-items-center rounded-full bg-pos-surface-muted text-pos-ink-faint transition group-hover:bg-pos-primary group-hover:text-white">
                  <ArrowUpRight size={16} />
                </span>
              </div>
              <h2 className="mt-4 flex items-center gap-2 text-lg font-semibold text-pos-ink">{page.label}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-pos-ink-muted">{page.copy}</p>
            </Link>
          );
        })}
      </section>
    </div>
  );
}