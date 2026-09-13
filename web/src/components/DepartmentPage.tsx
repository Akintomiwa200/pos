import Link from "next/link";
import { Home, LayoutGrid, LifeBuoy } from "lucide-react";

export function DepartmentPage({
  title,
  kicker,
}: {
  title: string;
  kicker: string;
}) {
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
            <p className="text-[15px] font-semibold text-pos-ink">Module not built yet</p>
            <p className="text-[12px] text-pos-ink-muted">This part of the app is still on the roadmap.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-pos-surface-muted px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">
            <span className="h-1.5 w-1.5 rounded-full bg-pos-warning" />
            Coming soon
          </span>
        </div>
        <div className="px-6 py-5">
          <p className="text-[14px] leading-relaxed text-pos-ink-muted">
            <strong className="font-semibold text-pos-ink">{title}</strong> belongs to the{" "}
            {kicker.toLowerCase()} area. The full module — lists, forms, and reports — is
            scheduled next. In the meantime you can keep using the rest of the platform.
          </p>
          <div className="mt-6 grid gap-2.5 sm:grid-cols-3">
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