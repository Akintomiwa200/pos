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

type HelpTopic = {
  id: string;
  title: string;
  summary: string;
  href?: string;
  external?: boolean;
  section: string;
  keywords: string[];
};

const TOPICS: HelpTopic[] = [
  {
    id: "start",
    title: "Getting started",
    summary: "Sign in with your HQ account. Sidebar menus follow your group privileges.",
    href: "/dashboard",
    section: "Basics",
    keywords: ["login", "start", "dashboard"],
  },
  {
    id: "products",
    title: "Products & catalog",
    summary: "Add items, categories, packs/cartons, brands, and barcodes under Products.",
    href: "/setup/items/items",
    section: "Modules",
    keywords: ["catalog", "items", "barcode", "pack"],
  },
  {
    id: "orders",
    title: "Purchase orders",
    summary: "Draft → approve → send → receive workflow under Analytics → Orders.",
    href: "/orders/list",
    section: "Modules",
    keywords: ["purchase", "order", "receive"],
  },
  {
    id: "customers",
    title: "Customers & loyalty",
    summary: "Directory, groups, credits, loyalty cards, and gift cards in Workspace.",
    href: "/setup/customers/list",
    section: "Modules",
    keywords: ["customer", "loyalty", "gift"],
  },
  {
    id: "support",
    title: "Support workspace",
    summary: "Contacts, deals, pipeline, tickets, activity, projects, and GitHub-style issues.",
    href: "/crm/overview",
    section: "Modules",
    keywords: ["support", "deals", "pipeline", "issues", "tickets"],
  },
  {
    id: "chat",
    title: "Live chat",
    summary: "Three-column inbox with customer profile. Updates in real time via SSE.",
    href: "/chat",
    section: "Modules",
    keywords: ["chat", "message", "real-time"],
  },
  {
    id: "transactions",
    title: "Transactions",
    summary: "Payments dashboard with spend analysis and tabbed history.",
    href: "/transactions/payments",
    section: "Modules",
    keywords: ["payment", "transaction", "refund"],
  },
  {
    id: "till",
    title: "Till & store",
    summary: "Issue till codes and manage store locations under Point of Sales.",
    href: "/setup/others/till",
    section: "Modules",
    keywords: ["till", "store", "pos"],
  },
  {
    id: "users",
    title: "Users & access",
    summary: "Accounts and groups control which sidebar items each user sees.",
    href: "/setup/users/account",
    section: "Settings",
    keywords: ["user", "group", "privilege", "access"],
  },
  {
    id: "support",
    title: "Install & releases",
    summary: "Build guides, releases, and troubleshooting on the public support page.",
    href: "/support",
    section: "Support",
    keywords: ["install", "exe", "apk", "release"],
  },
  {
    id: "github",
    title: "Source on GitHub",
    summary: "Report bugs and browse releases on the project repository.",
    href: "https://github.com/Akintomiwa200/pos",
    external: true,
    section: "Support",
    keywords: ["github", "source", "bug"],
  },
];

const SECTIONS = ["Basics", "Modules", "Settings", "Support"] as const;

export function HelpCenter() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TOPICS;
    return TOPICS.filter(
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

      {SECTIONS.map((section) => {
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
                  <Link key={topic.id} href={topic.href ?? "/help"} className={shell}>
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
