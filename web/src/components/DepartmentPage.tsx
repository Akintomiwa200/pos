import Link from "next/link";
import { ArrowUpRight, Home, LayoutGrid, LifeBuoy } from "lucide-react";

export type DepartmentItem = {
  label: string;
  description?: string;
  href?: string;
};

type Section = { href: string; label: string };

function sectionFor(kicker: string): Section {
  const key = kicker.toLowerCase();
  if (key.includes("report")) return { href: "/reports", label: "Reports" };
  if (key.includes("audit")) return { href: "/audit", label: "Audit" };
  if (key.includes("support") || key.includes("crm")) return { href: "/crm", label: "CRM & support" };
  if (key.includes("billing")) return { href: "/setup/billing/subscriptions", label: "Billing" };
  if (key.includes("production")) return { href: "/production", label: "Production" };
  if (key.includes("user")) return { href: "/setup/users/account", label: "Users" };
  if (key.includes("stock")) return { href: "/stock-taking", label: "Stock taking" };
  if (key.includes("setup") || key.includes("main menu")) {
    return { href: "/setup/others/settings", label: "Setup" };
  }
  if (key.includes("transaction")) return { href: "/transactions/payments", label: "Transactions" };
  return { href: "/dashboard", label: "Dashboard" };
}

export function DepartmentPage({
  title,
  kicker,
  items = [],
  section,
}: {
  title: string;
  kicker: string;
  items?: DepartmentItem[];
  section?: Section;
}) {
  const target = section ?? sectionFor(kicker);

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-pos-primary">
        {kicker}
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">{title}</h1>
      <div className="mt-6 overflow-hidden rounded-[22px] border border-pos-border bg-pos-surface shadow-pos-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-pos-border/60 bg-pos-surface-muted/60 px-6 py-4">
          <span className="grid size-11 place-items-center rounded-[14px] bg-pos-primary/10 text-pos-primary">
            <LayoutGrid size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-pos-ink">Module overview</p>
            <p className="text-[12px] text-pos-ink-muted">
              Status for the {title} area of this build.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-pos-surface-muted px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">
            <span className="h-1.5 w-1.5 rounded-full bg-pos-success" />
            Live routes
          </span>
        </div>
        <div className="px-6 py-5">
          <p className="text-[14px] leading-relaxed text-pos-ink-muted">
            <strong className="font-semibold text-pos-ink">{title}</strong> is exposed in this
            build through the live {target.label.toLowerCase()} routes. Open the section below to
            work with current records.
          </p>

          <Link
            href={target.href}
            className="mt-5 flex items-center gap-3 rounded-2xl border border-pos-primary/25 bg-pos-primary/5 px-4 py-3 transition hover:bg-pos-primary/10"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-pos-primary/10 text-pos-primary">
              <LayoutGrid size={16} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-pos-ink">{target.label}</span>
              <span className="block text-[12px] text-pos-ink-muted">
                Open the live section for {title}.
              </span>
            </span>
            <ArrowUpRight size={16} className="shrink-0 text-pos-primary" />
          </Link>

          {items.length ? (
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {items.map((item) =>
                item.href ? (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex items-center gap-2.5 rounded-2xl border border-pos-border bg-pos-surface px-4 py-3 text-[13px] font-medium text-pos-ink transition hover:border-pos-primary/30 hover:bg-pos-surface-muted"
                  >
                    <ArrowUpRight size={15} className="shrink-0 text-pos-ink-faint" />
                    <span className="min-w-0">
                      <span className="block truncate">{item.label}</span>
                      {item.description ? (
                        <span className="block truncate text-[12px] font-normal text-pos-ink-muted">
                          {item.description}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                ) : (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-pos-border bg-pos-surface px-4 py-3 text-[13px] font-medium text-pos-ink"
                  >
                    <span className="block">{item.label}</span>
                    {item.description ? (
                      <span className="mt-0.5 block text-[12px] font-normal text-pos-ink-muted">
                        {item.description}
                      </span>
                    ) : null}
                  </div>
                ),
              )}
            </div>
          ) : (
            <p className="mt-3 text-[12px] text-pos-ink-faint">
              No extra records were passed to this overview; the linked section shows the available
              data.
            </p>
          )}

          <div className="mt-6 grid gap-2.5 border-t border-pos-border/60 pt-5 sm:grid-cols-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 rounded-2xl border border-pos-border bg-pos-surface px-4 py-3 text-[13px] font-medium text-pos-ink transition hover:bg-pos-surface-muted hover:border-pos-primary/30"
            >
              <Home size={16} className="shrink-0 text-pos-ink-faint" />
              Dashboard
            </Link>
            <Link
              href="/setup/others/settings"
              className="flex items-center gap-2.5 rounded-2xl border border-pos-border bg-pos-surface px-4 py-3 text-[13px] font-medium text-pos-ink transition hover:bg-pos-surface-muted hover:border-pos-primary/30"
            >
              <LayoutGrid size={16} className="shrink-0 text-pos-ink-faint" />
              Settings
            </Link>
            <Link
              href="/help"
              className="flex items-center gap-2.5 rounded-2xl border border-pos-border bg-pos-surface px-4 py-3 text-[13px] font-medium text-pos-ink transition hover:bg-pos-surface-muted hover:border-pos-primary/30"
            >
              <LifeBuoy size={16} className="shrink-0 text-pos-ink-faint" />
              Help centre
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
