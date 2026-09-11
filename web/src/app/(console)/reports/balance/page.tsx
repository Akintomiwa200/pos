import Link from "next/link";
import { ArrowUpRight, Building2, IdCard, Scale, UserRound, Users } from "lucide-react";

const PAGES = [
  {
    href: "/reports/balance/customer",
    label: "Customer balances",
    copy: "What each customer owes through quotes and invoices, on a live board of accounts.",
    icon: Users,
    circle: "bg-pos-primary-soft text-pos-primary",
  },
  {
    href: "/reports/balance/vendor",
    label: "Vendor balances",
    copy: "Suppliers you owe — open purchase invoices net of returns, with payable totals.",
    icon: Building2,
    circle: "bg-pos-warning-soft text-pos-warning",
  },
  {
    href: "/reports/balance/sales-representative",
    label: "Sales representative balances",
    copy: "Documented value and open quotes tied to each sales representative's accounts.",
    icon: IdCard,
    circle: "bg-pos-success-soft text-pos-success",
  },
  {
    href: "/reports/balance/staff",
    label: "Staff balances",
    copy: "Accounts and quantities associated with staff members across documents.",
    icon: UserRound,
    circle: "bg-sky-100 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300",
  },
];

export default function BalanceIndexPage() {
  return (
    <div className="pb-8">
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pos-primary">
          Report · Balances
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">Balances</h1>
        <p className="mt-1.5 text-sm text-pos-ink-muted">
          Party balances across every account type. Pick a page below — then open any account card to see its own
          balance statement.
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
              <h2 className="mt-4 flex items-center gap-2 text-lg font-semibold text-pos-ink">
                <Scale size={16} className="text-pos-ink-faint" />
                {page.label}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-pos-ink-muted">{page.copy}</p>
            </Link>
          );
        })}
      </section>
    </div>
  );
}