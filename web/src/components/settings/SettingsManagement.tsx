"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/console/Chrome";
import { EXISTING_LINKS, POLICY_CONFIGS, type PolicyConfig } from "@/components/settings/settings-configs";
import { PolicyManager } from "./PolicyManager";

const GROUPS = [
  "Business",
  "People",
  "Money",
  "Operations",
  "Notifications",
  "Administration & Data",
  "My account",
] as const;

type Group = (typeof GROUPS)[number];

export function SettingsManagement() {
  const [group, setGroup] = useState<Group>("Business");
  const [openConfig, setOpenConfig] = useState<PolicyConfig | null>(null);

  const byGroup = useMemo(() => {
    const map = new Map<Group, { policies: PolicyConfig[]; links: typeof EXISTING_LINKS }>();
    for (const g of GROUPS) map.set(g, { policies: [], links: [] });
    for (const config of POLICY_CONFIGS) {
      map.get(config.group as Group)?.policies.push(config);
    }
    for (const link of EXISTING_LINKS) {
      map.get(link.group as Group)?.links.push(link);
    }
    return map;
  }, []);

  const active = byGroup.get(group);
  if (!active) return null;

  return (
    <div>
      <PageHeader
        kicker="Settings"
        title="Settings"
        copy="Everything that controls how your Simplebks account works — business, people, money, operations, notifications and data."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {GROUPS.map((g) => (
          <button
            key={g}
            onClick={() => {
              setGroup(g);
              setOpenConfig(null);
            }}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              group === g
                ? "bg-pos-primary text-white"
                : "border border-pos-border bg-pos-surface text-pos-ink-muted hover:text-pos-ink"
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {openConfig ? (
        <div>
          <button
            onClick={() => setOpenConfig(null)}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-pos-ink-muted hover:text-pos-ink"
          >
            <ChevronLeft size={16} /> Back to {group}
          </button>
          <PolicyManager
            kicker={openConfig.kicker}
            title={openConfig.title}
            copy={openConfig.copy}
            kind={openConfig.kind}
            columns={openConfig.columns}
            fields={openConfig.fields}
            blank={openConfig.blank}
            createLabel={`Add ${openConfig.label}`}
          />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {active.policies.map((config) => (
            <button
              key={config.kind}
              onClick={() => setOpenConfig(config)}
              className="flex min-h-[150px] flex-col items-start justify-between rounded-[18px] border border-pos-border bg-pos-surface p-5 text-left transition hover:border-pos-primary/30 hover:shadow-pos-md"
            >
              <div className="w-full">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-pos-ink">{config.label}</p>
                  <ArrowUpRight size={16} className="shrink-0 text-pos-ink-faint" />
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-pos-ink-muted">{config.copy}</p>
              </div>
            </button>
          ))}

          {active.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex min-h-[150px] flex-col items-start justify-between rounded-[18px] border border-pos-border bg-pos-surface p-5 text-left transition hover:border-pos-primary/30 hover:shadow-pos-md"
            >
              <div className="w-full">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-pos-ink">{link.label}</p>
                  <ArrowUpRight size={16} className="shrink-0 text-pos-ink-faint" />
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-pos-ink-muted">{link.copy}</p>
              </div>
            </Link>
          ))}

          {active.policies.length + active.links.length === 0 ? (
            <p className="col-span-full rounded-[18px] border border-dashed border-pos-border px-4 py-10 text-center text-sm text-pos-ink-faint">
              Nothing configured here yet.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}