"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Check,
  CircleDot,
  Clock,
  ExternalLink,
  Headphones,
  Mail,
  Megaphone,
  Plus,
  Search,
  Send,
  Ticket,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useLivePos } from "@/lib/live-pos";
import { SetupHeader, SetupStat } from "@/components/setup/SetupChrome";
import { asNum, asStr } from "@/lib/hq-policies";
import { usePolicyCollection } from "@/lib/use-policy-collection";

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

type TicketStatus = "Open" | "In progress" | "Resolved";
type TicketPriority = "High" | "Medium" | "Low";

function statusTone(status: TicketStatus) {
  return status === "Resolved"
    ? "bg-pos-success/10 text-pos-success"
    : status === "In progress"
      ? "bg-pos-warning/10 text-pos-warning"
      : "bg-pos-surface-muted text-pos-ink";
}

function priorityDot(priority: TicketPriority) {
  return priority === "High" ? "bg-pos-danger" : priority === "Medium" ? "bg-pos-warning" : "bg-pos-success";
}

function shortTime(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" });
}

function SupportDashboard() {
  const { live } = useLivePos();
  const tickets = usePolicyCollection("supportTickets");
  const announcements = usePolicyCollection("announcements");
  const rows = tickets.rows;
  const resolvedToday = rows.filter((row) => {
    if (asStr(row.status) !== "Resolved") return false;
    const at = new Date(asStr(row.updatedAt ?? row.at));
    return !Number.isNaN(at.getTime()) && at.toDateString() === new Date().toDateString();
  }).length;

  return (
    <div>
      <SetupHeader
        kicker="Producer · Support"
        title="Support dashboard"
        copy="Customer support overview across all tenant companies. Prioritise the open queue, then triage the pipeline."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Open tickets" value={String(rows.filter((row) => asStr(row.status) === "Open").length)} hint="Awaiting response" />
        <SetupStat label="In progress" value={String(rows.filter((row) => asStr(row.status) === "In progress").length)} hint="Being handled" tone="accent" />
        <SetupStat label="Resolved today" value={String(resolvedToday)} hint="Closed" />
        <SetupStat label="Published notices" value={String(announcements.rows.filter((row) => asBoolish(row.active)).length)} hint="Copied to tenant notification feeds" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/admin/support/tickets" className="flex items-center gap-3 rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm text-pos-ink hover:bg-pos-surface-muted">
          <span className="grid size-10 place-items-center rounded-[12px] bg-pos-primary/10 text-pos-primary"><Ticket size={18} /></span>
          <div>
            <div className="font-medium">Tickets</div>
            <div className="text-pos-ink-muted">Priority pipeline and triage</div>
          </div>
          <ExternalLink size={14} className="ml-auto text-pos-ink-faint" />
        </Link>
        <Link href="/admin/support/requests" className="flex items-center gap-3 rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm text-pos-ink hover:bg-pos-surface-muted">
          <span className="grid size-10 place-items-center rounded-[12px] bg-pos-primary/10 text-pos-primary"><Headphones size={18} /></span>
          <div>
            <div className="font-medium">Customer requests</div>
            <div className="text-pos-ink-muted">Inbound enquiries inbox</div>
          </div>
          <ExternalLink size={14} className="ml-auto text-pos-ink-faint" />
        </Link>
        <Link href="/admin/support/knowledge" className="flex items-center gap-3 rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm text-pos-ink hover:bg-pos-surface-muted">
          <span className="grid size-10 place-items-center rounded-[12px] bg-pos-primary/10 text-pos-primary"><BookOpen size={18} /></span>
          <div>
            <div className="font-medium">Knowledge base</div>
            <div className="text-pos-ink-muted">Help articles &amp; FAQs</div>
          </div>
          <ExternalLink size={14} className="ml-auto text-pos-ink-faint" />
        </Link>
        <Link href="/admin/support/announcements" className="flex items-center gap-3 rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm text-pos-ink hover:bg-pos-surface-muted">
          <span className="grid size-10 place-items-center rounded-[12px] bg-pos-primary/10 text-pos-primary"><Megaphone size={18} /></span>
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

function asBoolish(value: unknown) {
  return value === true || value === "true" || value === 1;
}

function TicketsPage() {
  const { live } = useLivePos();
  const { rows, save, remove } = usePolicyCollection("supportTickets");
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("Medium");
  const [company, setCompany] = useState("");

  async function addTicket() {
    if (!subject.trim()) return;
    await save({
      id: `TK-${Date.now().toString(36).toUpperCase()}`,
      subject: subject.trim(),
      company: company.trim() || "Walk-in",
      source: "Producer console",
      priority,
      status: "Open",
      at: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setSubject("");
    setCompany("");
  }

  async function advance(id: string, status: TicketStatus) {
    const next: TicketStatus =
      status === "Open" ? "In progress" : status === "In progress" ? "Resolved" : "Open";
    await save({ id, status: next, updatedAt: new Date().toISOString() });
  }

  const columns: TicketStatus[] = ["Open", "In progress", "Resolved"];

  return (
    <div>
      <SetupHeader
        kicker="Producer · Support"
        title="Tickets"
        copy="Producer-side support ticket records. Entries are logged here in HQ; tenants do not submit tickets to this board. Click a ticket to move it from Open to In progress to Resolved."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-4 flex flex-col gap-2 rounded-[18px] border border-pos-border bg-pos-surface p-4 sm:flex-row">
        <input className={inputClass} placeholder="New ticket subject…" value={subject} onChange={(e) => setSubject(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void addTicket()} />
        <input className={`${inputClass} sm:max-w-[180px]`} placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} />
        <select className={`${inputClass} sm:max-w-[140px]`} value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority)}>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
        <button type="button" onClick={() => void addTicket()} className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-pos-primary px-5 py-2.5 text-sm font-semibold text-white shadow-pos-primary transition hover:opacity-90">
          <Plus size={15} /> Record ticket
        </button>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-[18px] border border-pos-border bg-pos-surface p-8 text-center text-sm text-pos-ink-muted">
          <Ticket size={20} className="mx-auto mb-2 text-pos-ink-faint" />
          No tickets recorded yet. Add one above to start the triage pipeline.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {columns.map((column) => (
            <div key={column} className="rounded-[20px] border border-pos-border bg-pos-surface/60 p-4">
              <div className="mb-3 flex items-center gap-2 px-1 text-[13px] font-semibold text-pos-ink">
                <span className={`h-2 w-2 rounded-full ${column === "Resolved" ? "bg-pos-success" : column === "In progress" ? "bg-pos-warning" : "bg-pos-ink-faint"}`} />
                {column}
                <span className="ml-auto rounded-full bg-pos-surface-muted px-2 py-0.5 text-[11px] tabular-nums text-pos-ink-faint">
                  {rows.filter((row) => asStr(row.status) === column).length}
                </span>
              </div>
              <div className="space-y-2">
                {rows.filter((row) => asStr(row.status) === column).map((row) => {
                  const status = asStr(row.status) as TicketStatus;
                  const rowPriority = (asStr(row.priority) || "Medium") as TicketPriority;
                  return (
                    <div key={row.id} className="rounded-2xl border border-pos-border bg-pos-surface p-4">
                      <button type="button" onClick={() => void advance(row.id, status)} className="w-full text-left">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[13px] font-medium text-pos-ink">{asStr(row.subject)}</span>
                          <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${priorityDot(rowPriority)}`} />
                        </div>
                        <p className="mt-1.5 text-[11px] text-pos-ink-faint">
                          {row.id} · {asStr(row.company)} · {shortTime(asStr(row.at))}
                        </p>
                        <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusTone(status)}`}>
                          {rowPriority}
                        </span>
                      </button>
                      <button type="button" aria-label="Delete ticket" className="mt-2 text-pos-ink-faint hover:text-pos-danger" onClick={() => void remove(row.id)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
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
  const { rows, save } = usePolicyCollection("supportRequests");
  const [subject, setSubject] = useState("");
  const [from, setFrom] = useState("");
  const [email, setEmail] = useState("");

  async function send() {
    if (!subject.trim()) return;
    await save({
      id: `RQ-${Date.now().toString(36).toUpperCase()}`,
      from: from.trim() || "Producer console",
      email: email.trim() || "support@pos.local",
      subject: subject.trim(),
      read: false,
      at: new Date().toISOString(),
    });
    setSubject("");
  }

  return (
    <div>
      <SetupHeader kicker="Producer · Support" title="Customer requests" copy="Producer-side record of support requests. Entries added here are stored in HQ; tenant submissions do not reach this list." action={<LiveBadge live={live} />} />
      <div className="mb-4 flex flex-col gap-2 rounded-[18px] border border-pos-border bg-pos-surface p-4 sm:flex-row">
        <input className={inputClass} placeholder="Request subject…" value={subject} onChange={(e) => setSubject(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void send()} />
        <input className={`${inputClass} sm:max-w-[160px]`} placeholder="From" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input className={`${inputClass} sm:max-w-[200px]`} placeholder="Reply email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button type="button" onClick={() => void send()} className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-pos-primary px-5 py-2.5 text-sm font-semibold text-white shadow-pos-primary transition hover:opacity-90">
          <Send size={14} /> Log request
        </button>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-[18px] border border-pos-border bg-pos-surface p-8 text-center text-sm text-pos-ink-muted">
          <Mail size={20} className="mx-auto mb-2 text-pos-ink-faint" />
          No requests logged yet. Requests added above are stored in this producer record.
        </div>
      ) : (
        <ul className="overflow-hidden rounded-[18px] border border-pos-border bg-pos-surface">
          {rows.map((row) => (
            <li key={row.id} className={`flex items-start gap-3 border-b border-pos-border/60 px-5 py-4 last:border-0 ${asBoolish(row.read) ? "" : "bg-pos-primary/5"}`}>
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-pos-primary" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-[14px] font-medium text-pos-ink">{asStr(row.subject)}</p>
                  <span className="shrink-0 text-[11px] text-pos-ink-faint">{shortTime(asStr(row.at))}</span>
                </div>
                <p className="mt-0.5 text-[12px] text-pos-ink-muted">{asStr(row.from)} · {asStr(row.email)}</p>
              </div>
              <button type="button" className="shrink-0 rounded-full bg-pos-surface-muted px-3 py-1 text-[11px] font-semibold text-pos-ink hover:bg-pos-primary/10 hover:text-pos-primary" onClick={() => void save({ ...row, read: !asBoolish(row.read) })}>
                {asBoolish(row.read) ? "Unread" : "Mark read"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const STARTER_ARTICLES = [
  { title: "Pairing a new till", category: "Getting started", body: "Open Settings → Tills on the terminal, choose Add till, then approve the pairing request from HQ.", views: 1240 },
  { title: "Setting up payment methods", category: "Payments", body: "In HQ → Register studio, enable at least one tender and set the default gateway before charging cards.", views: 980 },
  { title: "Running end-of-day reports", category: "Reports", body: "Open the shift menu, choose Close day, authorise with a PIN, then print or export the report.", views: 860 },
  { title: "Adding staff and roles", category: "People", body: "Create staff in HQ, assign a role, then set a PIN on the till if PIN login is enabled.", views: 720 },
  { title: "Managing stock and low-stock alerts", category: "Catalogue", body: "Set a reorder point per item in the catalogue. Low stock appears on the HQ dashboard and inventory report.", views: 640 },
  { title: "Understanding invoice and balance reports", category: "Reports", body: "Invoice reports show issued documents; balance reports show what is still owed across all orders.", views: 512 },
];

function KnowledgePage() {
  const { live } = useLivePos();
  const { rows, save } = usePolicyCollection("knowledgeArticles");
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Getting started");
  const [body, setBody] = useState("");
  const [openId, setOpenId] = useState("");
  const [seeded, setSeeded] = useState(false);

  async function seed() {
    if (!rows.length && !seeded) {
      setSeeded(true);
      for (const article of STARTER_ARTICLES) {
        await save({ id: `KB-${article.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, ...article, updatedAt: new Date().toISOString() });
      }
    }
  }
  useEffect(() => {
    if (rows.length === 0 && !seeded) void seed();
    // Seed once per mount; records persist after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addArticle() {
    if (!title.trim()) return;
    await save({
      id: `KB-${Date.now().toString(36).toUpperCase()}`,
      title: title.trim(),
      category: category.trim() || "General",
      body: body.trim() || "No content yet.",
      views: 0,
      updatedAt: new Date().toISOString(),
    });
    setTitle("");
    setBody("");
  }

  async function openArticle(row: (typeof rows)[number]) {
    setOpenId(row.id);
    await save({ ...row, views: asNum(row.views) + 1 });
  }

  const filtered = rows.filter((row) => asStr(row.title).toLowerCase().includes(query.toLowerCase()));
  const active = rows.find((row) => row.id === openId);

  return (
    <div>
      <SetupHeader kicker="Producer · Support" title="Knowledge base" copy="Help articles, FAQs, and onboarding guides for tenants. Write once — reduce support volume forever." action={<LiveBadge live={live} />} />
      <div className="mb-4 grid gap-2 rounded-[18px] border border-pos-border bg-pos-surface p-4 sm:grid-cols-[1fr_180px]">
        <input className={inputClass} placeholder="Article title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className={inputClass} placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
        <textarea className={`${inputClass} min-h-[80px] resize-none sm:col-span-2`} placeholder="Article content…" value={body} onChange={(e) => setBody(e.target.value)} />
        <button type="button" onClick={() => void addArticle()} className="inline-flex items-center gap-2 rounded-full bg-pos-primary px-5 py-2.5 text-sm font-semibold text-white shadow-pos-primary transition hover:opacity-90 sm:col-span-2 sm:justify-self-end">
          <Plus size={15} /> Add article
        </button>
      </div>
      <div className="relative mb-6">
        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-pos-ink-faint" />
        <input className={`${inputClass} pl-10`} placeholder="Search articles…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {active ? (
        <div className="mb-5 rounded-[18px] border border-pos-border bg-pos-surface p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[16px] font-semibold text-pos-ink">{asStr(active.title)}</p>
              <p className="mt-1 text-[11px] text-pos-ink-faint">{asStr(active.category)} · {asNum(active.views).toLocaleString()} views</p>
            </div>
            <button type="button" className="text-[12px] text-pos-ink-muted hover:text-pos-primary" onClick={() => setOpenId("")}>Close</button>
          </div>
          <p className="mt-4 whitespace-pre-wrap text-[13px] text-pos-ink-muted">{asStr(active.body)}</p>
        </div>
      ) : null}
      {filtered.length === 0 ? (
        <div className="rounded-[18px] border border-pos-border bg-pos-surface p-8 text-center text-sm text-pos-ink-muted">
          No articles match "{query}".
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((article) => (
            <button key={article.id} type="button" onClick={() => void openArticle(article)} className="group rounded-[18px] border border-pos-border bg-pos-surface p-5 text-left transition hover:border-pos-primary/30">
              <span className="inline-block rounded-full bg-pos-primary/10 px-2.5 py-1 text-[11px] font-semibold text-pos-primary">{asStr(article.category)}</span>
              <p className="mt-3 text-[15px] font-medium text-pos-ink group-hover:text-pos-primary">{asStr(article.title)}</p>
              <p className="mt-2 flex items-center gap-3 text-[12px] text-pos-ink-faint">
                <span className="inline-flex items-center gap-1"><Clock size={12} /> {shortTime(asStr(article.updatedAt))}</span>
                <span>{asNum(article.views).toLocaleString()} views</span>
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
  const { rows, save, remove } = usePolicyCollection("announcements");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  async function publish() {
    if (!title.trim()) return;
    await save({
      id: `AN-${Date.now().toString(36).toUpperCase()}`,
      title: title.trim(),
      body: body.trim() || "Platform update notice.",
      active: true,
      at: new Date().toISOString(),
    });
    setTitle("");
    setBody("");
  }

  return (
    <div>
      <SetupHeader kicker="Producer · Support" title="Announcements" copy="Platform-wide messages for tenant dashboards. Publishing copies an active notice into each tenant's HQ feed; pausing stops delivery of unread copies." action={<LiveBadge live={live} />} />
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[20px] border border-pos-border bg-pos-surface p-5">
          <div className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-pos-ink">
            <Megaphone size={16} className="text-pos-primary" /> New announcement
          </div>
          <input className={inputClass} placeholder="Headline" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className={`${inputClass} mt-3 min-h-[110px] resize-none`} placeholder="Message to tenants…" value={body} onChange={(e) => setBody(e.target.value)} />
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => void publish()} className="inline-flex items-center gap-2 rounded-full bg-pos-primary px-5 py-2.5 text-sm font-semibold text-white shadow-pos-primary transition hover:opacity-90">
              <Send size={14} /> Publish
            </button>
          </div>
        </div>
        <div className="rounded-[20px] border border-pos-border bg-pos-surface p-5">
          <div className="mb-4 text-[15px] font-semibold text-pos-ink">Published announcements</div>
          {rows.length === 0 ? (
            <p className="rounded-2xl bg-pos-surface-muted px-4 py-8 text-center text-sm text-pos-ink-faint">
              Nothing published yet. Your announcements appear here the moment you press Publish.
            </p>
          ) : (
            <ul className="space-y-2">
              {rows.map((row) => (
                <li key={row.id} className="rounded-2xl border border-pos-border/70 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-medium text-pos-ink">{asStr(row.title)}</span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${asBoolish(row.active) ? "bg-pos-success/10 text-pos-success" : "bg-pos-surface-muted text-pos-ink-faint"}`}>
                      {asBoolish(row.active) ? <Check size={11} /> : <CircleDot size={11} />}
                      {asBoolish(row.active) ? "Live" : "Paused"}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] text-pos-ink-muted">{asStr(row.body)}</p>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-pos-ink-faint">{shortTime(asStr(row.at))}</span>
                    <span className="flex gap-2">
                      <button type="button" className="text-[11px] font-semibold text-pos-primary" onClick={() => void save({ ...row, active: !asBoolish(row.active) })}>
                        {asBoolish(row.active) ? "Pause" : "Resume"}
                      </button>
                      <button type="button" aria-label="Delete announcement" className="text-pos-ink-faint hover:text-pos-danger" onClick={() => void remove(row.id)}>
                        <Trash2 size={12} />
                      </button>
                    </span>
                  </div>
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
