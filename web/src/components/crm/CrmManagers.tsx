"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CircleDot,
  GitBranch,
  MessageSquare,
  Plus,
  SendHorizontal,
  Trash2,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { naira, prettyDay } from "@/lib/hq-ops";
import { useLiveCrm } from "@/lib/live-workspace";
import {
  DEAL_STAGE_LABEL,
  ISSUE_STATUS_LABEL,
  TICKET_STATUS_LABEL,
  addCrmIssueComment,
  deleteCrmActivity,
  deleteCrmContact,
  deleteCrmDeal,
  deleteCrmIssue,
  deleteCrmProject,
  deleteCrmTicket,
  getCrmIssue,
  getCrmSummary,
  saveCrmActivity,
  saveCrmContact,
  saveCrmDeal,
  saveCrmIssue,
  saveCrmProject,
  saveCrmTicket,
  type CrmActivity,
  type CrmContact,
  type CrmDeal,
  type CrmDealStage,
  type CrmIssue,
  type CrmIssueComment,
  type CrmProject,
  type CrmSummary,
  type CrmTicket,
  type CrmTicketPriority,
  type CrmTicketStatus,
} from "@/lib/hq-crm";
import { ManagerSkeleton } from "../Skeleton";
import { SlideOver } from "../SlideOver";
import {
  DataTable,
  Field,
  PrimaryButton,
  SetupHeader,
  SetupStat,
  fieldClass,
  secondaryButtonClass,
} from "../setup/SetupChrome";

const KICKER = "Workspace · Support";

const STAGE_PILL: Record<string, string> = {
  lead: "bg-sky-50 text-sky-800",
  prospect: "bg-amber-50 text-amber-800",
  customer: "bg-emerald-50 text-emerald-700",
  churned: "bg-red-50 text-red-700",
  qualification: "bg-sky-50 text-sky-800",
  proposal: "bg-violet-50 text-violet-800",
  negotiation: "bg-amber-50 text-amber-800",
  won: "bg-emerald-50 text-emerald-700",
  lost: "bg-red-50 text-red-700",
  open: "bg-pos-primary-soft text-pos-primary",
  in_progress: "bg-amber-50 text-amber-800",
  waiting: "bg-sky-50 text-sky-800",
  resolved: "bg-emerald-50 text-emerald-700",
  closed: "bg-pos-surface-muted text-pos-ink-muted",
  review: "bg-violet-50 text-violet-800",
  low: "bg-pos-surface-muted text-pos-ink-muted",
  medium: "bg-sky-50 text-sky-800",
  high: "bg-amber-50 text-amber-800",
  urgent: "bg-red-50 text-red-700",
};

function Pill({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${STAGE_PILL[value] ?? "bg-pos-surface-muted text-pos-ink-muted"}`}
    >
      {value.replace(/_/g, " ")}
    </span>
  );
}

function minorFromInput(value: string) {
  const n = Number.parseFloat(value.replace(/,/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function inputFromMinor(minor: number) {
  return (minor / 100).toFixed(2);
}

function LiveDot({ live }: { live: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-pos-ink-faint">
      <span
        className={`h-2 w-2 rounded-full ${live ? "bg-pos-success animate-pulse" : "bg-pos-ink-faint/40"}`}
      />
      {live ? "Live" : "Offline"}
    </span>
  );
}

export function CrmOverviewManager() {
  const { contacts, deals, tickets, issues, activities, live } = useLiveCrm();
  const [summary, setSummary] = useState<CrmSummary | null>(null);

  useEffect(() => {
    getCrmSummary().then(setSummary).catch(() => setSummary(null));
  }, [contacts.length, deals.length, tickets.length, issues.length]);

  const recentActivity = useMemo(
    () => [...activities].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6),
    [activities],
  );

  if (!summary) return <ManagerSkeleton variant="table" />;

  return (
    <div>
      <SetupHeader
        kicker={KICKER}
        title="Support overview"
        copy="Contacts, deals, tickets, and GitHub-style issues — all updating in real time."
        action={<LiveDot live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Contacts" value={String(summary.contacts)} hint="Leads & customers" />
        <SetupStat
          label="Pipeline"
          value={naira(summary.pipelineValueMinor)}
          hint={`${summary.openDeals} open deals`}
          tone="accent"
        />
        <SetupStat label="Open Tickets" value={String(summary.openTickets)} hint="Support queue" />
        <SetupStat label="Open Issues" value={String(summary.openIssues)} hint="Projects backlog" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-[20px] bg-pos-surface p-5 shadow-pos-sm">
          <h2 className="text-sm font-semibold text-pos-ink">Recent activity</h2>
          <ul className="mt-4 space-y-3">
            {recentActivity.map((row) => (
              <li key={row.id} className="flex items-start gap-3 text-sm">
                <CircleDot size={16} className="mt-0.5 shrink-0 text-pos-primary" />
                <div>
                  <p className="font-medium text-pos-ink">{row.title}</p>
                  <p className="text-pos-ink-faint">
                    {row.type} · {row.author} · {prettyDay(row.at)}
                  </p>
                </div>
              </li>
            ))}
            {!recentActivity.length ? (
              <li className="text-sm text-pos-ink-faint">No activity yet.</li>
            ) : null}
          </ul>
        </section>

        <section className="rounded-[20px] bg-pos-surface p-5 shadow-pos-sm">
          <h2 className="text-sm font-semibold text-pos-ink">Quick links</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              { href: "/crm/contacts", label: "Contacts" },
              { href: "/crm/deals", label: "Deals" },
              { href: "/crm/pipeline", label: "Pipeline board" },
              { href: "/crm/tickets", label: "Support tickets" },
              { href: "/crm/projects", label: "Projects" },
              { href: "/crm/issues", label: "Issues" },
              { href: "/chat", label: "Customer chat" },
              { href: "/help", label: "Help center" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl bg-pos-surface-muted px-4 py-3 text-sm font-medium text-pos-ink transition hover:bg-pos-primary-soft hover:text-pos-primary"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export function CrmContactsManager() {
  const { contacts, live } = useLiveCrm();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<CrmContact>>({ stage: "lead", tags: [] });
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) =>
      [c.name, c.company, c.email, c.phone].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [contacts, search]);

  async function onSave() {
    setBusy(true);
    try {
      await saveCrmContact({
        ...draft,
        tags: draft.tags ?? [],
      });
      setOpen(false);
      setDraft({ stage: "lead", tags: [] });
      toast.success("Contact saved.");
    } catch (err) {
      toast.error(err, "Could not save contact.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <SetupHeader
        kicker={KICKER}
        title="Contacts"
        copy="Manage leads, prospects, and customers. Link to directory records when ready."
        action={
          <div className="flex items-center gap-3">
            <LiveDot live={live} />
            <PrimaryButton onClick={() => setOpen(true)}>
              <Plus size={16} /> New contact
            </PrimaryButton>
          </div>
        }
      />
      <div className="mb-4">
        <input
          className={fieldClass}
          placeholder="Search contacts…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <DataTable columns={["Name", "Company", "Stage", "Owner", ""]}>
        {filtered.length === 0 ? (
          <tr>
            <td className="px-4 py-6 text-pos-ink-faint" colSpan={5}>
              No contacts yet.
            </td>
          </tr>
        ) : (
          filtered.map((row) => (
            <tr key={row.id} className="border-b border-pos-border/60 hover:bg-pos-surface-muted">
              <td className="px-4 py-3 font-medium">{row.name}</td>
              <td className="px-4 py-3">{row.company ?? "—"}</td>
              <td className="px-4 py-3">
                <Pill value={row.stage} />
              </td>
              <td className="px-4 py-3">{row.owner ?? "—"}</td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className={secondaryButtonClass}
                    onClick={() => {
                      setDraft(row);
                      setOpen(true);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={secondaryButtonClass}
                    onClick={() =>
                      void deleteCrmContact(row.id)
                        .then(() => toast.success("Deleted."))
                        .catch((err) => toast.error(err, "Could not delete."))
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))
        )}
      </DataTable>

      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        title={draft.id ? "Edit contact" : "New contact"}
      >
        <Field label="Name">
          <input
            className={fieldClass}
            value={draft.name ?? ""}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </Field>
        <Field label="Company">
          <input
            className={fieldClass}
            value={draft.company ?? ""}
            onChange={(e) => setDraft({ ...draft, company: e.target.value })}
          />
        </Field>
        <Field label="Email">
          <input
            className={fieldClass}
            value={draft.email ?? ""}
            onChange={(e) => setDraft({ ...draft, email: e.target.value })}
          />
        </Field>
        <Field label="Phone">
          <input
            className={fieldClass}
            value={draft.phone ?? ""}
            onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
          />
        </Field>
        <Field label="Stage">
          <select
            className={fieldClass}
            value={draft.stage ?? "lead"}
            onChange={(e) =>
              setDraft({ ...draft, stage: e.target.value as CrmContact["stage"] })
            }
          >
            <option value="lead">Lead</option>
            <option value="prospect">Prospect</option>
            <option value="customer">Customer</option>
            <option value="churned">Churned</option>
          </select>
        </Field>
        <Field label="Owner">
          <input
            className={fieldClass}
            value={draft.owner ?? ""}
            onChange={(e) => setDraft({ ...draft, owner: e.target.value })}
          />
        </Field>
        <PrimaryButton disabled={busy} onClick={() => void onSave()}>
          Save contact
        </PrimaryButton>
      </SlideOver>
    </div>
  );
}

export function CrmDealsManager() {
  const { deals, contacts, live } = useLiveCrm();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<CrmDeal>>({ stage: "qualification" });
  const [busy, setBusy] = useState(false);

  async function onSave() {
    setBusy(true);
    try {
      const contact = contacts.find((c) => c.id === draft.contactId);
      await saveCrmDeal({
        ...draft,
        contactName: contact?.name ?? draft.contactName,
      });
      setOpen(false);
      setDraft({ stage: "qualification" });
      toast.success("Deal saved.");
    } catch (err) {
      toast.error(err, "Could not save deal.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <SetupHeader
        kicker={KICKER}
        title="Deals"
        copy="Track revenue opportunities from first touch to close."
        action={
          <div className="flex items-center gap-3">
            <LiveDot live={live} />
            <PrimaryButton onClick={() => setOpen(true)}>
              <Plus size={16} /> New deal
            </PrimaryButton>
          </div>
        }
      />
      <DataTable columns={["Deal", "Contact", "Stage", "Amount", "Owner", ""]}>
        {deals.length === 0 ? (
          <tr>
            <td className="px-4 py-6 text-pos-ink-faint" colSpan={6}>
              No deals yet.
            </td>
          </tr>
        ) : (
          deals.map((row) => (
            <tr key={row.id} className="border-b border-pos-border/60 hover:bg-pos-surface-muted">
              <td className="px-4 py-3 font-medium">{row.title}</td>
              <td className="px-4 py-3">{row.contactName ?? "—"}</td>
              <td className="px-4 py-3">
                <Pill value={row.stage} />
              </td>
              <td className="px-4 py-3 tabular-nums">{naira(row.amountMinor)}</td>
              <td className="px-4 py-3">{row.owner ?? "—"}</td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className={secondaryButtonClass}
                    onClick={() => {
                      setDraft(row);
                      setOpen(true);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={secondaryButtonClass}
                    onClick={() =>
                      void deleteCrmDeal(row.id)
                        .then(() => toast.success("Deleted."))
                        .catch((err) => toast.error(err, "Could not delete."))
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))
        )}
      </DataTable>

      <SlideOver open={open} onClose={() => setOpen(false)} title={draft.id ? "Edit deal" : "New deal"}>
        <Field label="Title">
          <input
            className={fieldClass}
            value={draft.title ?? ""}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        </Field>
        <Field label="Contact">
          <select
            className={fieldClass}
            value={draft.contactId ?? ""}
            onChange={(e) => setDraft({ ...draft, contactId: e.target.value || undefined })}
          >
            <option value="">— None —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Stage">
          <select
            className={fieldClass}
            value={draft.stage ?? "qualification"}
            onChange={(e) =>
              setDraft({ ...draft, stage: e.target.value as CrmDealStage })
            }
          >
            {Object.entries(DEAL_STAGE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Amount (₦)">
          <input
            className={fieldClass}
            value={draft.amountMinor != null ? inputFromMinor(draft.amountMinor) : ""}
            onChange={(e) =>
              setDraft({ ...draft, amountMinor: minorFromInput(e.target.value) })
            }
          />
        </Field>
        <Field label="Close date">
          <input
            type="date"
            className={fieldClass}
            value={draft.closeDate?.slice(0, 10) ?? ""}
            onChange={(e) => setDraft({ ...draft, closeDate: e.target.value })}
          />
        </Field>
        <Field label="Owner">
          <input
            className={fieldClass}
            value={draft.owner ?? ""}
            onChange={(e) => setDraft({ ...draft, owner: e.target.value })}
          />
        </Field>
        <PrimaryButton disabled={busy} onClick={() => void onSave()}>
          Save deal
        </PrimaryButton>
      </SlideOver>
    </div>
  );
}

const PIPELINE_STAGES: CrmDealStage[] = [
  "qualification",
  "proposal",
  "negotiation",
  "won",
  "lost",
];

export function CrmPipelineManager() {
  const { deals, live } = useLiveCrm();

  async function moveDeal(deal: CrmDeal, stage: CrmDealStage) {
    try {
      await saveCrmDeal({ ...deal, stage });
    } catch (err) {
      toast.error(err, "Could not move deal.");
    }
  }

  return (
    <div>
      <SetupHeader
        kicker={KICKER}
        title="Pipeline"
        copy="Kanban view of deal stages — click a card to advance it."
        action={<LiveDot live={live} />}
      />
      <div className="grid gap-3 xl:grid-cols-5">
        {PIPELINE_STAGES.map((stage) => {
          const column = deals.filter((d) => d.stage === stage);
          const total = column.reduce((sum, d) => sum + d.amountMinor, 0);
          return (
            <section
              key={stage}
              className="flex min-h-[320px] flex-col rounded-[20px] bg-pos-surface-muted/60 p-3"
            >
              <header className="mb-3 px-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-pos-ink-faint">
                  {DEAL_STAGE_LABEL[stage]}
                </p>
                <p className="mt-1 text-sm font-medium text-pos-ink">
                  {column.length} · {naira(total)}
                </p>
              </header>
              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
                {column.map((deal) => (
                  <article
                    key={deal.id}
                    className="rounded-2xl bg-pos-surface p-3 shadow-pos-sm"
                  >
                    <p className="text-sm font-semibold text-pos-ink">{deal.title}</p>
                    <p className="mt-1 text-xs text-pos-ink-faint">
                      {deal.contactName ?? "No contact"} · {naira(deal.amountMinor)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {PIPELINE_STAGES.filter((s) => s !== deal.stage).map((s) => (
                        <button
                          key={s}
                          type="button"
                          className="rounded-full bg-pos-surface-muted px-2 py-0.5 text-[10px] font-semibold text-pos-ink-muted hover:bg-pos-primary-soft hover:text-pos-primary"
                          onClick={() => void moveDeal(deal, s)}
                        >
                          → {DEAL_STAGE_LABEL[s]}
                        </button>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function CrmTicketsManager() {
  const { tickets, contacts, live } = useLiveCrm();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<CrmTicket>>({
    status: "open",
    priority: "medium",
  });
  const [busy, setBusy] = useState(false);

  async function onSave() {
    setBusy(true);
    try {
      const contact = contacts.find((c) => c.id === draft.contactId);
      await saveCrmTicket({
        ...draft,
        contactName: contact?.name ?? draft.contactName,
      });
      setOpen(false);
      setDraft({ status: "open", priority: "medium" });
      toast.success("Ticket saved.");
    } catch (err) {
      toast.error(err, "Could not save ticket.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <SetupHeader
        kicker={KICKER}
        title="Support tickets"
        copy="Track customer issues with priority, status, and assignment."
        action={
          <div className="flex items-center gap-3">
            <LiveDot live={live} />
            <PrimaryButton onClick={() => setOpen(true)}>
              <Plus size={16} /> New ticket
            </PrimaryButton>
          </div>
        }
      />
      <DataTable columns={["Subject", "Contact", "Status", "Priority", "Assignee", ""]}>
        {tickets.length === 0 ? (
          <tr>
            <td className="px-4 py-6 text-pos-ink-faint" colSpan={6}>
              No tickets yet.
            </td>
          </tr>
        ) : (
          tickets.map((row) => (
            <tr key={row.id} className="border-b border-pos-border/60 hover:bg-pos-surface-muted">
              <td className="px-4 py-3 font-medium">{row.subject}</td>
              <td className="px-4 py-3">{row.contactName ?? "—"}</td>
              <td className="px-4 py-3">
                <Pill value={row.status} />
              </td>
              <td className="px-4 py-3">
                <Pill value={row.priority} />
              </td>
              <td className="px-4 py-3">{row.assignee ?? "—"}</td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className={secondaryButtonClass}
                    onClick={() => {
                      setDraft(row);
                      setOpen(true);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={secondaryButtonClass}
                    onClick={() =>
                      void deleteCrmTicket(row.id)
                        .then(() => toast.success("Deleted."))
                        .catch((err) => toast.error(err, "Could not delete."))
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))
        )}
      </DataTable>

      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        title={draft.id ? "Edit ticket" : "New ticket"}
      >
        <Field label="Subject">
          <input
            className={fieldClass}
            value={draft.subject ?? ""}
            onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
          />
        </Field>
        <Field label="Description">
          <textarea
            className={fieldClass}
            rows={4}
            value={draft.body ?? ""}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
          />
        </Field>
        <Field label="Contact">
          <select
            className={fieldClass}
            value={draft.contactId ?? ""}
            onChange={(e) => setDraft({ ...draft, contactId: e.target.value || undefined })}
          >
            <option value="">— None —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select
            className={fieldClass}
            value={draft.status ?? "open"}
            onChange={(e) =>
              setDraft({ ...draft, status: e.target.value as CrmTicketStatus })
            }
          >
            {Object.entries(TICKET_STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Priority">
          <select
            className={fieldClass}
            value={draft.priority ?? "medium"}
            onChange={(e) =>
              setDraft({ ...draft, priority: e.target.value as CrmTicketPriority })
            }
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </Field>
        <Field label="Assignee">
          <input
            className={fieldClass}
            value={draft.assignee ?? ""}
            onChange={(e) => setDraft({ ...draft, assignee: e.target.value })}
          />
        </Field>
        <PrimaryButton disabled={busy} onClick={() => void onSave()}>
          Save ticket
        </PrimaryButton>
      </SlideOver>
    </div>
  );
}

export function CrmActivityManager() {
  const { activities, contacts, live } = useLiveCrm();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<CrmActivity>>({ type: "note", done: false });
  const [busy, setBusy] = useState(false);

  async function onSave() {
    setBusy(true);
    try {
      const contact = contacts.find((c) => c.id === draft.contactId);
      await saveCrmActivity({
        ...draft,
        contactName: contact?.name ?? draft.contactName,
        author: draft.author ?? "You",
      });
      setOpen(false);
      setDraft({ type: "note", done: false });
      toast.success("Activity logged.");
    } catch (err) {
      toast.error(err, "Could not save activity.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <SetupHeader
        kicker={KICKER}
        title="Activity timeline"
        copy="Calls, notes, tasks, and meetings linked to contacts and deals."
        action={
          <div className="flex items-center gap-3">
            <LiveDot live={live} />
            <PrimaryButton onClick={() => setOpen(true)}>
              <Plus size={16} /> Log activity
            </PrimaryButton>
          </div>
        }
      />
      <div className="space-y-3">
        {activities.map((row) => (
          <article
            key={row.id}
            className="flex items-start justify-between gap-4 rounded-[20px] bg-pos-surface p-4 shadow-pos-sm"
          >
            <div>
              <div className="flex items-center gap-2">
                <Pill value={row.type} />
                {row.type === "task" && row.done ? (
                  <span className="text-[11px] font-semibold text-pos-success">Done</span>
                ) : null}
              </div>
              <p className="mt-2 font-medium text-pos-ink">{row.title}</p>
              {row.body ? <p className="mt-1 text-sm text-pos-ink-muted">{row.body}</p> : null}
              <p className="mt-2 text-xs text-pos-ink-faint">
                {row.contactName ?? "—"} · {row.author} · {prettyDay(row.at)}
              </p>
            </div>
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() =>
                void deleteCrmActivity(row.id)
                  .then(() => toast.success("Deleted."))
                  .catch((err) => toast.error(err, "Could not delete."))
              }
            >
              <Trash2 size={14} />
            </button>
          </article>
        ))}
        {!activities.length ? (
          <p className="text-sm text-pos-ink-faint">No activity logged yet.</p>
        ) : null}
      </div>

      <SlideOver open={open} onClose={() => setOpen(false)} title="Log activity">
        <Field label="Type">
          <select
            className={fieldClass}
            value={draft.type ?? "note"}
            onChange={(e) =>
              setDraft({ ...draft, type: e.target.value as CrmActivity["type"] })
            }
          >
            <option value="note">Note</option>
            <option value="call">Call</option>
            <option value="email">Email</option>
            <option value="meeting">Meeting</option>
            <option value="task">Task</option>
          </select>
        </Field>
        <Field label="Title">
          <input
            className={fieldClass}
            value={draft.title ?? ""}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        </Field>
        <Field label="Details">
          <textarea
            className={fieldClass}
            rows={3}
            value={draft.body ?? ""}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
          />
        </Field>
        <Field label="Contact">
          <select
            className={fieldClass}
            value={draft.contactId ?? ""}
            onChange={(e) => setDraft({ ...draft, contactId: e.target.value || undefined })}
          >
            <option value="">— None —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        {draft.type === "task" ? (
          <Field label="Done">
            <input
              type="checkbox"
              checked={draft.done ?? false}
              onChange={(e) => setDraft({ ...draft, done: e.target.checked })}
            />
          </Field>
        ) : null}
        <PrimaryButton disabled={busy} onClick={() => void onSave()}>
          Save
        </PrimaryButton>
      </SlideOver>
    </div>
  );
}

export function CrmProjectsManager() {
  const { projects, live } = useLiveCrm();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<CrmProject>>({ visibility: "team" });
  const [busy, setBusy] = useState(false);

  async function onSave() {
    setBusy(true);
    try {
      await saveCrmProject(draft);
      setOpen(false);
      setDraft({ visibility: "team" });
      toast.success("Project saved.");
    } catch (err) {
      toast.error(err, "Could not save project.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <SetupHeader
        kicker={KICKER}
        title="Projects"
        copy="GitHub-style repositories for internal work — each project has its own issue backlog."
        action={
          <div className="flex items-center gap-3">
            <LiveDot live={live} />
            <PrimaryButton onClick={() => setOpen(true)}>
              <Plus size={16} /> New project
            </PrimaryButton>
          </div>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {projects.map((project) => (
          <article
            key={project.id}
            className="rounded-[20px] bg-pos-surface p-5 shadow-pos-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <GitBranch size={18} className="text-pos-primary" />
                <h2 className="font-semibold text-pos-ink">{project.name}</h2>
              </div>
              <Pill value={project.visibility} />
            </div>
            {project.description ? (
              <p className="mt-2 text-sm text-pos-ink-muted">{project.description}</p>
            ) : null}
            <p className="mt-3 text-xs text-pos-ink-faint">
              {project.openIssues} open issues · {project.owner ?? "Unassigned"}
            </p>
            <div className="mt-4 flex gap-2">
              <Link
                href={`/crm/issues?project=${project.id}`}
                className={secondaryButtonClass}
              >
                View issues
              </Link>
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => {
                  setDraft(project);
                  setOpen(true);
                }}
              >
                Edit
              </button>
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() =>
                  void deleteCrmProject(project.id)
                    .then(() => toast.success("Deleted."))
                    .catch((err) => toast.error(err, "Could not delete."))
                }
              >
                <Trash2 size={14} />
              </button>
            </div>
          </article>
        ))}
      </div>

      <SlideOver open={open} onClose={() => setOpen(false)} title={draft.id ? "Edit project" : "New project"}>
        <Field label="Name">
          <input
            className={fieldClass}
            value={draft.name ?? ""}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </Field>
        <Field label="Description">
          <textarea
            className={fieldClass}
            rows={3}
            value={draft.description ?? ""}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
        </Field>
        <Field label="Visibility">
          <select
            className={fieldClass}
            value={draft.visibility ?? "team"}
            onChange={(e) =>
              setDraft({
                ...draft,
                visibility: e.target.value as CrmProject["visibility"],
              })
            }
          >
            <option value="private">Private</option>
            <option value="team">Team</option>
            <option value="public">Public</option>
          </select>
        </Field>
        <Field label="Owner">
          <input
            className={fieldClass}
            value={draft.owner ?? ""}
            onChange={(e) => setDraft({ ...draft, owner: e.target.value })}
          />
        </Field>
        <PrimaryButton disabled={busy} onClick={() => void onSave()}>
          Save project
        </PrimaryButton>
      </SlideOver>
    </div>
  );
}

export function CrmIssuesManager({ initialProjectId }: { initialProjectId?: string }) {
  const { issues, projects, issueComments, live } = useLiveCrm();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    issue: CrmIssue;
    comments: CrmIssueComment[];
  } | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<CrmIssue>>({ status: "open", labels: [] });
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [projectFilter, setProjectFilter] = useState(initialProjectId ?? "");

  const filtered = useMemo(() => {
    if (!projectFilter) return issues;
    return issues.filter((i) => i.projectId === projectFilter);
  }, [issues, projectFilter]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    getCrmIssue(selectedId)
      .then(setDetail)
      .catch(() => setDetail(null));
  }, [selectedId, issueComments.length]);

  async function onSaveIssue() {
    setBusy(true);
    try {
      const project = projects.find((p) => p.id === draft.projectId);
      await saveCrmIssue({
        ...draft,
        projectId: draft.projectId ?? projectFilter,
        projectName: project?.name,
        labels: draft.labels ?? [],
      });
      setOpen(false);
      setDraft({ status: "open", labels: [] });
      toast.success("Issue saved.");
    } catch (err) {
      toast.error(err, "Could not save issue.");
    } finally {
      setBusy(false);
    }
  }

  async function onComment() {
    if (!selectedId || !comment.trim()) return;
    setBusy(true);
    try {
      await addCrmIssueComment(selectedId, comment.trim());
      setComment("");
      const next = await getCrmIssue(selectedId);
      setDetail(next);
    } catch (err) {
      toast.error(err, "Could not post comment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <SetupHeader
        kicker={KICKER}
        title="Issues"
        copy="GitHub-style issue tracking with status, labels, assignees, and threaded comments."
        action={
          <div className="flex items-center gap-3">
            <LiveDot live={live} />
            <PrimaryButton onClick={() => setOpen(true)}>
              <Plus size={16} /> New issue
            </PrimaryButton>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          className={fieldClass}
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
        >
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <DataTable columns={["#", "Title", "Project", "Status", "Assignee", ""]}>
          {filtered.length === 0 ? (
            <tr>
              <td className="px-4 py-6 text-pos-ink-faint" colSpan={6}>
                No issues yet.
              </td>
            </tr>
          ) : (
            filtered.map((row) => (
              <tr key={row.id} className="border-b border-pos-border/60 hover:bg-pos-surface-muted">
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="font-mono text-pos-primary hover:underline"
                    onClick={() => setSelectedId(row.id)}
                  >
                    #{row.number}
                  </button>
                </td>
                <td className="px-4 py-3 font-medium">{row.title}</td>
                <td className="px-4 py-3">{row.projectName ?? "—"}</td>
                <td className="px-4 py-3">
                  <Pill value={row.status} />
                </td>
                <td className="px-4 py-3">{row.assignee ?? "—"}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className={secondaryButtonClass}
                    onClick={() =>
                      void deleteCrmIssue(row.id)
                        .then(() => {
                          if (selectedId === row.id) setSelectedId(null);
                          toast.success("Deleted.");
                        })
                        .catch((err) => toast.error(err, "Could not delete."))
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))
          )}
        </DataTable>

        <aside className="rounded-[20px] bg-pos-surface p-4 shadow-pos-sm">
          {!detail ? (
            <p className="text-sm text-pos-ink-faint">Select an issue to view details and comments.</p>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-pos-ink-faint">
                {detail.issue.projectName} · #{detail.issue.number}
              </p>
              <h2 className="mt-2 text-lg font-semibold text-pos-ink">{detail.issue.title}</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                <Pill value={detail.issue.status} />
                {detail.issue.labels.map((label) => (
                  <span
                    key={label}
                    className="rounded-full bg-pos-surface-muted px-2 py-0.5 text-[11px] font-medium text-pos-ink-muted"
                  >
                    {label}
                  </span>
                ))}
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm text-pos-ink-muted">
                {detail.issue.body || "No description."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(["open", "in_progress", "review", "closed"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={secondaryButtonClass}
                    onClick={() =>
                      void saveCrmIssue({ ...detail.issue, status }).then((updated) => {
                        setDetail({ ...detail, issue: updated });
                        toast.success("Status updated.");
                      })
                    }
                  >
                    {ISSUE_STATUS_LABEL[status]}
                  </button>
                ))}
              </div>

              <div className="mt-6 border-t border-pos-border/70 pt-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-pos-ink">
                  <MessageSquare size={16} /> Comments
                </h3>
                <ul className="mt-3 max-h-48 space-y-3 overflow-y-auto">
                  {detail.comments.map((row) => (
                    <li key={row.id} className="rounded-xl bg-pos-surface-muted p-3 text-sm">
                      <p className="font-medium text-pos-ink">{row.author}</p>
                      <p className="mt-1 text-pos-ink-muted">{row.body}</p>
                      <p className="mt-1 text-[11px] text-pos-ink-faint">{prettyDay(row.at)}</p>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex gap-2">
                  <input
                    className={fieldClass}
                    placeholder="Add a comment…"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void onComment();
                      }
                    }}
                  />
                  <button type="button" className={secondaryButtonClass} onClick={() => void onComment()} disabled={busy}>
                    <SendHorizontal size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </aside>
      </div>

      <SlideOver open={open} onClose={() => setOpen(false)} title="New issue">
        <Field label="Project">
          <select
            className={fieldClass}
            value={draft.projectId ?? projectFilter}
            onChange={(e) => setDraft({ ...draft, projectId: e.target.value })}
          >
            <option value="">Select project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Title">
          <input
            className={fieldClass}
            value={draft.title ?? ""}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        </Field>
        <Field label="Description">
          <textarea
            className={fieldClass}
            rows={4}
            value={draft.body ?? ""}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
          />
        </Field>
        <Field label="Labels (comma-separated)">
          <input
            className={fieldClass}
            value={(draft.labels ?? []).join(", ")}
            onChange={(e) =>
              setDraft({
                ...draft,
                labels: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </Field>
        <Field label="Assignee">
          <input
            className={fieldClass}
            value={draft.assignee ?? ""}
            onChange={(e) => setDraft({ ...draft, assignee: e.target.value })}
          />
        </Field>
        <PrimaryButton disabled={busy} onClick={() => void onSaveIssue()}>
          Create issue
        </PrimaryButton>
      </SlideOver>
    </div>
  );
}
