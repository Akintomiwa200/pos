import Link from "next/link";
import { PageHeader } from "../console/Chrome";

type Playbook = {
  title: string;
  kicker: string;
  copy: string;
  features: { label: string; detail: string; href?: string; cta?: string }[];
};

export function VerticalPlaybook({ playbook }: { playbook: Playbook }) {
  return (
    <div>
      <PageHeader kicker={playbook.kicker} title={playbook.title} copy={playbook.copy} />
      <div className="grid gap-3 lg:grid-cols-2">
        {playbook.features.map((feature) => (
          <section key={feature.label} className="rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
            <h2 className="font-semibold text-pos-ink">{feature.label}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-pos-ink-muted">{feature.detail}</p>
            {feature.href ? (
              <Link
                href={feature.href}
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-pos-primary"
              >
                {feature.cta ?? "Open"} →
              </Link>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}
