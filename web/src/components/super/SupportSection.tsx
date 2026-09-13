"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  BookOpen,
  Check,
  CircleDot,
  Clock,
  ExternalLink,
  Headphones,
  Inbox,
  Mail,
  Megaphone,
  Plus,
  Search,
  Send,
  Ticket,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useLivePos } from "@/lib/live-pos";
import { SetupHeader, SetupStat } from "@/components/setup/SetupChrome";

function LiveBadge({ live }: { live: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-xl border border-pos-border px-3 py-2.5 text-[12px] font-medium ${
        live ? "bg-pos-success/10 text-pos-success" : "bg-pos-surface-muted text-pos-ink-faint"
      }`}
    >
      {live ? <Wifi size={13} /> : <WifiOff size={13} />}
      {live ? "Live" : "Offline"}
    </span>
  );
}

const inputClass =
  "w-full rounded-2xl border-0 bg-pos-surface-muted px-3.5 py-2.5 text-sm text-pos-ink outline-none ring-1 ring-transparent transition focus:bg-pos-surface focus:ring-pos-primary/30";

type TicketRow = {
  id: string;
  subject: string;
  company: string;
  source: string;
  priority: "High" | "Medium" | "Low";
  status: "Open" | "In progress" | "Resolved";
  at: string;
};

function statusTone(status: TicketRow["status"]) {
  return status === "Resolved"
    ? "bg-pos-success/10 text-pos-success"
    : status === "In progress"
      ? "bg-pos-warning/10 text-pos-warning"
      : "bg-pos-surface-muted text-pos-ink";
}

function priorityDot(priority: TicketRow["priority"]) {
  return priority === "High" ? "bg-pos-danger" : priority === "Medium" ? "bg-pos-warning" : "bg-pos-success";
}

function SupportDashboard() {
  const { live, ready } = useLivePos();
  if (!ready) return null;
  return (
    <div>
      <SetupHeader
        kicker="Producer · Support"
        title="Support dashboard"
        copy="Customer support overview across all tenant companies. Prioritise the open queue, then triage the pipeline."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Open tickets" value="0" hint="Awaiting response" />
        <SetupStat label="In progress" value="0" hint="Being handled" tone="accent" />
        <SetupStat label="Resolved today" value="0" hint="Closed" />
        <SetupStat label="Avg. response" value="—" hint="Time to first reply" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/support/tickets"
          className="flex items-center gap-3 rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm text-pos-ink hover:bg-pos-surface-muted"
        >
          <span className="grid size-10 place-items-center rounded-[12px] bg-pos-primary/10 text-pos-primary">
            <Ticket size={18} />
          </span>
          <div>
            <div className="font-medium">Tickets</div>
            <div className="text-pos-ink-muted">Priority pipeline and triage</div>
          </div>
          <ExternalLink size={14} className="ml-auto text-pos-ink-faint" />
        </Link>
        <Link
          href="/admin/support/requests"
          className="flex items-center gap-3 rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm text-pos-ink hover:bg-pos-surface-muted"
        >
          <span className="grid size-10 place-items-center rounded-[12px] bg-pos-primary/10 text-pos-primary">
            <Headphones size={18} />
          </span>
          <div>
            <div className="font-medium">Customer requests</div>
            <div className="text-pos-ink-muted">Inbound enquiries inbox</div>
          </div>
          <ExternalLink size={14} className="ml-auto text-pos-ink-faint" />
        </Link>
        <Link
          href="/admin/support/knowledge"
          className="flex items-center gap-3 rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm text-pos-ink hover:bg-pos-surface-muted"
        >
          <span className="grid size-10 place-items-center rounded-[12px] bg-pos-primary/10 text-pos-primary">
            <BookOpen size={18} />
          </span>
          <div>
            <div className="font-medium">Knowledge base</div>
            <div className="text-pos-ink-muted">Help articles &amp; FAQs</div>
          </div>
          <ExternalLink size={14} className="ml-auto text-pos-ink-faint" />
        </Link>
        <Link
          href="/admin/support/announcements"
          className="flex items-center gap-3 rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm text-pos-ink hover:bg-pos-surface-muted"
        >
          <span className="grid size-10 place-items-center rounded-[12px] bg-pos-primary/10 text-pos-primary">
            <Megaphone size={18} />
          </span>
          <div>
            <div className="font-medium">Announcements</div>
            <div className="text-pos-ink-muted">Platform-wide messages</div>
          </div>
          <ExternalLink size={14} className="ml-auto text-pos-ink-faint" />
        </Link>
      </div>
    </div>
  );
}

function TicketsPage() {
  const { live } = useLivePos();
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState<TicketRow["priority"]>("Medium");

  function addTicket() {
    if (!subject.trim()) return;
    const row: TicketRow = {
      id: `TK-${String(tickets.length + 1).padStart(4, "0")}`,
      subject: subject.trim(),
      company: "Tenant",
      source: "Email",
      priority,
      status: "Open",
      at: new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
    };
    setTickets([row, ...tickets]);
    setSubject("");
  }

  function advance(id: string) {
    setTickets((rows) =>
      rows.map((row) =>
        row.id === id
          ? {
              ...row,
              status:
                row.status === "Open" ? "In progress" : row.status === "In progress" ? "Resolved" : "Open",
            }
          : row,
      ),
    );
  }

  const columns: TicketRow["status"][] = ["Open", "In progress", "Resolved"];

  return (
    <div>
      <SetupHeader
        kicker="Producer · Support"
        title="Tickets"
        copy="Support tickets submitted by tenant companies. Drag a ticket forward by clicking it — from Open to In progress to Resolved."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-4 flex flex-col gap-2 rounded-[18px] border border-pos-border bg-pos-surface p-4 sm:flex-row">
        <input
          className={inputClass}
          placeholder="New ticket subject…"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTicket()}
        />
        <select
          className={`${inputClass} sm:max-w-[180px]`}
          value={priority}
          onChange={(e) => setPriority(e.target.value as TicketRow["priority"])}
        >
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
        <button
          type="button"
          onClick={addTicket}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-pos-primary px-5 py-2.5 text-sm font-semibold text-white shadow-pos-primary transition hover:opacity-90"
        >
          <Plus size={15} /> Add ticket
        </button>
      </div>
      {tickets.length === 0 ? (
        <div className="rounded-[18px] border border-pos-border bg-pos-surface p-8 text-center text-sm text-pos-ink-muted">
          <Ticket size={20} className="mx-auto mb-2 text-pos-ink-faint" />
          The pipeline stays empty until companies submit tickets. Add one above to preview the flow.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {columns.map((column) => (
            <div key={column} className="rounded-[20px] border border-pos-border bg-pos-surface/60 p-4">
              <div className="mb-3 flex items-center gap-2 px-1 text-[13px] font-semibold text-pos-ink">
                <span
                  className={`h-2 w-2 rounded-full ${
                    column === "Resolved" ? "bg-pos-success" : column === "In progress" ? "bg-pos-warning" : "bg-pos-ink-faint"
                  }`}
                />
                {column}
                <span className="ml-auto rounded-full bg-pos-surface-muted px-2 py-0.5 text-[11px] tabular-nums text-pos-ink-faint">
                  {tickets.filter((t) => t.status === column).length}
                </span>
              </div>
              <div className="space-y-2">
                {tickets
                  .filter((t) => t.status === column)
                  .map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => advance(row.id)}
                      className="w-full rounded-2xl border border-pos-border bg-pos-surface p-4 text-left transition hover:border-pos-primary/30"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[13px] font-medium text-pos-ink">{row.subject}</span>
                        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${priorityDot(row.priority)}`} />
                      </div>
                      <p className="mt-1.5 text-[11px] text-pos-ink-faint">
                        {row.id} · {row.source} · {row.at}
                      </p>
                      <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusTone(row.status)}`}>
                        {row.priority}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RequestsPage() {
  const { live } = useLivePos();
  const [requests, setRequests] = useState<
    Array<{ id: number; from: string; email: string; subject: string; read: boolean; at: string }>
  >([]);
  const [subject, setSubject] = useState("");

  function send() {
    if (!subject.trim()) return;
    setRequests([
      {
        id: requests.length + 1,
        from: "Tenant",
        email: "owner@company.test",
        subject: subject.trim(),
        read: false,
        at: "Just now",
      },
      ...requests,
    ]);
    setSubject("");
  }

  return (
    <div>
      <SetupHeader
        kicker="Producer · Support"
        title="Customer requests"
        copy="Inbound support enquiries from company administrators and staff. Answer them from this inbox."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-4 flex gap-2 rounded-[18px] border border-pos-border bg-pos-surface p-4">
        <div className="flex-1">
          <Inbox size={13} className="pointer-events-none absolute hidden" />
          <input
            className={inputClass}
            placeholder="Reply to a new request…"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
        </div>
        <button
          type="button"
          onClick={send}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-pos-primary px-5 py-2.5 text-sm font-semibold text-white shadow-pos-primary transition hover:opacity-90"
        >
          <Send size={14} /> Send
        </button>
      </div>
      {requests.length === 0 ? (
        <div className="rounded-[18px] border border-pos-border bg-pos-surface p-8 text-center text-sm text-pos-ink-muted">
          <Mail size={20} className="mx-auto mb-2 text-pos-ink-faint" />
          The inbox is quiet. New requests from tenant support channels land here in real time.
        </div>
      ) : (
        <ul className="overflow-hidden rounded-[18px] border border-pos-border bg-pos-surface">
          {requests.map((row) => (
            <li
              key={row.id}
              className={`flex items-start gap-3 border-b border-pos-border/60 px-5 py-4 last:border-0 ${
                row.read ? "" : "bg-pos-primary/5"
              }`}
            >
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-pos-primary" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-[14px] font-medium text-pos-ink">{row.subject}</p>
                  <span className="shrink-0 text-[11px] text-pos-ink-faint">{row.at}</span>
                </div>
                <p className="mt-0.5 text-[12px] text-pos-ink-muted">
                  {row.from} · {row.email}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const ARTICLES = [
  { title: "Pairing a new till", category: "Getting started", read: "4 min", views: 1240 },
  { title: "Setting up payment methods", category: "Payments", read: "6 min", views: 980 },
  { title: "Running end-of-day reports", category: "Reports", read: "5 min", views: 860 },
  { title: "Adding staff and roles", category: "People", read: "7 min", views: 720 },
  { title: "Managing stock and low-stock alerts", category: "Catalogue", read: "8 min", views: 640 },
  { title: "Understanding invoice and balance reports", category: "Reports", read: "6 min", views: 512 },
];

function KnowledgePage() {
  const { live } = useLivePos();
  const [query, setQuery] = useState("");
  const filtered = ARTICLES.filter((a) => a.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <SetupHeader
        kicker="Producer · Support"
        title="Knowledge base"
        copy="Help articles, FAQs, and onboarding guides for tenants. Write once — reduce support volume forever."
        action={<LiveBadge live={live} />}
      />
      <div className="relative mb-6">
        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-pos-ink-faint" />
        <input
          className={`${inputClass} pl-10`}
          placeholder="Search articles…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-[18px] border border-pos-border bg-pos-surface p-8 text-center text-sm text-pos-ink-muted">
          No articles match "{query}".
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((article) => (
            <button
              key={article.title}
              type="button"
              className="group rounded-[18px] border border-pos-border bg-pos-surface p-5 text-left transition hover:border-pos-primary/30"
            >
              <span className="inline-block rounded-full bg-pos-primary/10 px-2.5 py-1 text-[11px] font-semibold text-pos-primary">
                {article.category}
              </span>
              <p className="mt-3 text-[15px] font-medium text-pos-ink group-hover:text-pos-primary">{article.title}</p>
              <p className="mt-2 flex items-center gap-3 text-[12px] text-pos-ink-faint">
                <span className="inline-flex items-center gap-1">
                  <Clock size={12} /> {article.read}
                </span>
                <span>{article.views.toLocaleString()} views</span>
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AnnouncementsPage() {
  const { live } = useLivePos();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [announcements, setAnnouncements] = useState<
    Array<{ id: number; title: string; body: string; active: boolean; at: string }>
  >([]);

  function publish() {
    if (!title.trim()) return;
    setAnnouncements([
      { id: announcements.length + 1, title: title.trim(), body: body.trim() || "Platform update notice.", active: true, at: "Just now" },
      ...announcements,
    ]);
    setTitle("");
    setBody("");
  }

  return (
    <div>
      <SetupHeader
        kicker="Producer · Support"
        title="Announcements"
        copy="Platform-wide messages pushed to every tenant dashboard. Use them for updates, maintenance, and new features."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[20px] border border-pos-border bg-pos-surface p-5">
          <div className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-pos-ink">
            <Megaphone size={16} className="text-pos-primary" /> New announcement
          </div>
          <input className={inputClass} placeholder="Headline" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea
            className={`${inputClass} mt-3 min-h-[110px] resize-none`}
            placeholder="Message to tenants…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={publish}
              className="inline-flex items-center gap-2 rounded-full bg-pos-primary px-5 py-2.5 text-sm font-semibold text-white shadow-pos-primary transition hover:opacity-90"
            >
              <Send size={14} /> Publish
            </button>
          </div>
        </div>
        <div className="rounded-[20px] border border-pos-border bg-pos-surface p-5">
          <div className="mb-4 text-[15px] font-semibold text-pos-ink">Live announcements</div>
          {announcements.length === 0 ? (
            <p className="rounded-2xl bg-pos-surface-muted px-4 py-8 text-center text-sm text-pos-ink-faint">
              Nothing published yet. Your announcements appear here the moment you press Publish.
            </p>
          ) : (
            <ul className="space-y-2">
              {announcements.map((row) => (
                <li key={row.id} className="rounded-2xl border border-pos-border/70 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-medium text-pos-ink">{row.title}</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-pos-success/10 px-2 py-0.5 text-[11px] font-semibold text-pos-success">
                      <Check size={11} /> Live
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] text-pos-ink-muted">{row.body}</p>
                  <p className="mt-1.5 text-[11px] text-pos-ink-faint">{row.at}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export function SupportSection({ path }: { path: string }) {
  if (path === "/admin/support/tickets") return <TicketsPage />;
  if (path === "/admin/support/requests") return <RequestsPage />;
  if (path === "/admin/support/knowledge") return <KnowledgePage />;
  if (path === "/admin/support/announcements") return <AnnouncementsPage />;
  return <SupportDashboard />;
}