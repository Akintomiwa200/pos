"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BookOpen,
  ExternalLink,
  MessageSquare,
  Search,
  ShoppingCart,
  Users,
} from "lucide-react";
import { SetupHeader } from "../setup/SetupChrome";
import { HELP_SECTIONS, HELP_TOPICS } from "./help-topics";

export function HelpCenter() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return HELP_TOPICS;
    return HELP_TOPICS.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.summary.toLowerCase().includes(q) ||
        t.keywords.some((k) => k.includes(q)),
    );
  }, [query]);

  return (
    <div>
      <SetupHeader
        kicker="Settings · Help"
        title="Help center"
        copy="Guides for every module in HQ — products, orders, support, chat, and more."
      />

      <div className="mb-6 flex items-center gap-2 rounded-full bg-pos-surface px-4 py-3 shadow-pos-sm">
        <Search size={18} className="shrink-0 text-pos-ink-faint" />
        <input
          className="w-full bg-transparent text-sm text-pos-ink outline-none placeholder:text-pos-ink-faint"
          placeholder="Search help topics…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Link
          href="/crm/overview"
          className="flex items-start gap-3 rounded-[20px] bg-pos-primary p-4 text-white shadow-pos-sm transition hover:opacity-95"
        >
          <Users size={22} className="shrink-0 opacity-90" />
          <div>
            <p className="font-semibold">Support</p>
            <p className="mt-1 text-sm text-white/75">Tickets, contacts & issues</p>
          </div>
        </Link>
        <Link
          href="/chat"
          className="flex items-start gap-3 rounded-[20px] bg-pos-surface p-4 shadow-pos-sm transition hover:bg-pos-primary-soft"
        >
          <MessageSquare size={22} className="shrink-0 text-pos-primary" />
          <div>
            <p className="font-semibold text-pos-ink">Chat</p>
            <p className="mt-1 text-sm text-pos-ink-muted">Real-time customer inbox</p>
          </div>
        </Link>
        <Link
          href="/setup/items/items"
          className="flex items-start gap-3 rounded-[20px] bg-pos-surface p-4 shadow-pos-sm transition hover:bg-pos-primary-soft"
        >
          <ShoppingCart size={22} className="shrink-0 text-pos-primary" />
          <div>
            <p className="font-semibold text-pos-ink">Products</p>
            <p className="mt-1 text-sm text-pos-ink-muted">Catalog & stock setup</p>
          </div>
        </Link>
      </div>

      {HELP_SECTIONS.map((section) => {
        const items = filtered.filter((t) => t.section === section);
        if (!items.length) return null;
        return (
          <section key={section} className="mb-8">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-pos-ink-faint">
              <BookOpen size={16} /> {section}
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {items.map((topic) => {
                const shell =
                  "group rounded-[20px] bg-pos-surface p-5 shadow-pos-sm transition hover:shadow-pos-md";
                const inner = (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold text-pos-ink group-hover:text-pos-primary">
                        {topic.title}
                      </h3>
                      {topic.external ? (
                        <ExternalLink size={16} className="shrink-0 text-pos-ink-faint" />
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-pos-ink-muted">
                      {topic.summary}
                    </p>
                  </>
                );
                if (topic.external && topic.href) {
                  return (
                    <a
                      key={topic.id}
                      href={topic.href}
                      target="_blank"
                      rel="noreferrer"
                      className={shell}
                    >
                      {inner}
                    </a>
                  );
                }
                return (
                  <Link key={`${topic.id}-${topic.href ?? topic.title}`} href={topic.href ?? "/help"} className={shell}>
                    {inner}
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}

      {!filtered.length ? (
        <p className="text-sm text-pos-ink-faint">No topics match your search.</p>
      ) : null}
    </div>
  );
}
