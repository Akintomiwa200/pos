import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Observable, Subject } from "rxjs";
import {
  SEED_ACTIVITIES,
  SEED_CONTACTS,
  SEED_DEALS,
  SEED_ISSUE_COMMENTS,
  SEED_ISSUES,
  SEED_PROJECTS,
  SEED_TICKETS,
  type CrmActivity,
  type CrmContact,
  type CrmDeal,
  type CrmEvent,
  type CrmIssue,
  type CrmIssueComment,
  type CrmProject,
  type CrmSnapshot,
  type CrmTicket,
} from "./crm.types";

@Injectable()
export class CrmService implements OnModuleInit {
  private contacts: CrmContact[] = [];
  private deals: CrmDeal[] = [];
  private tickets: CrmTicket[] = [];
  private activities: CrmActivity[] = [];
  private projects: CrmProject[] = [];
  private issues: CrmIssue[] = [];
  private issueComments: CrmIssueComment[] = [];
  private issueCounter = 42;

  private readonly events = new Subject<CrmEvent>();
  private readonly dir = join(process.cwd(), "data");
  private readonly file = join(this.dir, "hq-crm.json");

  async onModuleInit() {
    await mkdir(this.dir, { recursive: true });
    const stored = await this.readJson<{
      contacts?: CrmContact[];
      deals?: CrmDeal[];
      tickets?: CrmTicket[];
      activities?: CrmActivity[];
      projects?: CrmProject[];
      issues?: CrmIssue[];
      issueComments?: CrmIssueComment[];
      issueCounter?: number;
    } | null>(this.file, null);

    if (stored?.contacts?.length) {
      this.contacts = stored.contacts;
      this.deals = stored.deals ?? [];
      this.tickets = stored.tickets ?? [];
      this.activities = stored.activities ?? [];
      this.projects = stored.projects ?? [];
      this.issues = stored.issues ?? [];
      this.issueComments = stored.issueComments ?? [];
      this.issueCounter = stored.issueCounter ?? 42;
    } else {
      this.contacts = structuredClone(SEED_CONTACTS);
      this.deals = structuredClone(SEED_DEALS);
      this.tickets = structuredClone(SEED_TICKETS);
      this.activities = structuredClone(SEED_ACTIVITIES);
      this.projects = structuredClone(SEED_PROJECTS);
      this.issues = structuredClone(SEED_ISSUES);
      this.issueComments = structuredClone(SEED_ISSUE_COMMENTS);
      this.issueCounter = 42;
      await this.persist();
    }
  }

  private async readJson<T>(file: string, fallback: T): Promise<T> {
    try {
      const raw = await readFile(file, "utf8");
      return JSON.parse(raw) as T;
    } catch {
      return structuredClone(fallback);
    }
  }

  private async persist() {
    await writeFile(
      this.file,
      JSON.stringify(
        {
          contacts: this.contacts,
          deals: this.deals,
          tickets: this.tickets,
          activities: this.activities,
          projects: this.projects,
          issues: this.issues,
          issueComments: this.issueComments,
          issueCounter: this.issueCounter,
        },
        null,
        2,
      ),
      "utf8",
    );
  }

  private emit(event: CrmEvent) {
    this.events.next(event);
  }

  private id(prefix: string) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  snapshot(): CrmSnapshot {
    return {
      contacts: [...this.contacts],
      deals: [...this.deals],
      tickets: [...this.tickets],
      activities: [...this.activities],
      projects: [...this.projects],
      issues: [...this.issues],
      issueComments: [...this.issueComments],
    };
  }

  stream(): Observable<CrmEvent> {
    return new Observable((subscriber) => {
      subscriber.next({ type: "snapshot", data: this.snapshot() });
      const sub = this.events.subscribe((event) => subscriber.next(event));
      return () => sub.unsubscribe();
    });
  }

  summary() {
    const openDeals = this.deals.filter((d) => !["won", "lost"].includes(d.stage));
    const openTickets = this.tickets.filter((t) => !["resolved", "closed"].includes(t.status));
    const openIssues = this.issues.filter((i) => i.status !== "closed");
    const pipelineValue = openDeals.reduce((sum, d) => sum + d.amountMinor, 0);
    return {
      contacts: this.contacts.length,
      openDeals: openDeals.length,
      pipelineValueMinor: pipelineValue,
      openTickets: openTickets.length,
      openIssues: openIssues.length,
      pendingTasks: this.activities.filter((a) => a.type === "task" && !a.done).length,
    };
  }

  // ── Contacts ──────────────────────────────────────────────────────────────

  listContacts() {
    return [...this.contacts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async saveContact(body: Partial<CrmContact> & { name?: string }) {
    const name = body.name?.trim();
    if (!name) throw new BadRequestException("Contact name is required");
    const now = new Date().toISOString();
    if (body.id) {
      const idx = this.contacts.findIndex((c) => c.id === body.id);
      if (idx === -1) throw new NotFoundException("Contact not found");
      const updated: CrmContact = {
        ...this.contacts[idx],
        ...body,
        name,
        tags: body.tags ?? this.contacts[idx].tags,
        updatedAt: now,
      };
      this.contacts[idx] = updated;
      await this.persist();
      this.emit({ type: "contact", contact: updated, action: "updated" });
      return updated;
    }
    const created: CrmContact = {
      id: this.id("crm-c"),
      name,
      company: body.company?.trim(),
      email: body.email?.trim(),
      phone: body.phone?.trim(),
      stage: body.stage ?? "lead",
      owner: body.owner?.trim(),
      tags: body.tags ?? [],
      customerId: body.customerId,
      note: body.note?.trim(),
      createdAt: now,
      updatedAt: now,
    };
    this.contacts.push(created);
    await this.persist();
    this.emit({ type: "contact", contact: created, action: "created" });
    return created;
  }

  async deleteContact(id: string) {
    const contact = this.contacts.find((c) => c.id === id);
    if (!contact) throw new NotFoundException("Contact not found");
    this.contacts = this.contacts.filter((c) => c.id !== id);
    await this.persist();
    this.emit({ type: "contact", contact, action: "deleted" });
    return { ok: true };
  }

  // ── Deals ─────────────────────────────────────────────────────────────────

  listDeals() {
    return [...this.deals].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async saveDeal(body: Partial<CrmDeal> & { title?: string }) {
    const title = body.title?.trim();
    if (!title) throw new BadRequestException("Deal title is required");
    const now = new Date().toISOString();
    if (body.id) {
      const idx = this.deals.findIndex((d) => d.id === body.id);
      if (idx === -1) throw new NotFoundException("Deal not found");
      const updated: CrmDeal = { ...this.deals[idx], ...body, title, updatedAt: now };
      this.deals[idx] = updated;
      await this.persist();
      this.emit({ type: "deal", deal: updated, action: "updated" });
      return updated;
    }
    const created: CrmDeal = {
      id: this.id("crm-d"),
      title,
      contactId: body.contactId,
      contactName: body.contactName?.trim(),
      stage: body.stage ?? "qualification",
      amountMinor: body.amountMinor ?? 0,
      closeDate: body.closeDate,
      owner: body.owner?.trim(),
      note: body.note?.trim(),
      createdAt: now,
      updatedAt: now,
    };
    this.deals.push(created);
    await this.persist();
    this.emit({ type: "deal", deal: created, action: "created" });
    return created;
  }

  async deleteDeal(id: string) {
    const deal = this.deals.find((d) => d.id === id);
    if (!deal) throw new NotFoundException("Deal not found");
    this.deals = this.deals.filter((d) => d.id !== id);
    await this.persist();
    this.emit({ type: "deal", deal, action: "deleted" });
    return { ok: true };
  }

  // ── Tickets ───────────────────────────────────────────────────────────────

  listTickets() {
    return [...this.tickets].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async saveTicket(body: Partial<CrmTicket> & { subject?: string }) {
    const subject = body.subject?.trim();
    if (!subject) throw new BadRequestException("Ticket subject is required");
    const now = new Date().toISOString();
    if (body.id) {
      const idx = this.tickets.findIndex((t) => t.id === body.id);
      if (idx === -1) throw new NotFoundException("Ticket not found");
      const updated: CrmTicket = { ...this.tickets[idx], ...body, subject, updatedAt: now };
      this.tickets[idx] = updated;
      await this.persist();
      this.emit({ type: "ticket", ticket: updated, action: "updated" });
      return updated;
    }
    const created: CrmTicket = {
      id: this.id("crm-t"),
      subject,
      body: body.body?.trim() ?? "",
      contactId: body.contactId,
      contactName: body.contactName?.trim(),
      status: body.status ?? "open",
      priority: body.priority ?? "medium",
      assignee: body.assignee?.trim(),
      createdAt: now,
      updatedAt: now,
    };
    this.tickets.push(created);
    await this.persist();
    this.emit({ type: "ticket", ticket: created, action: "created" });
    return created;
  }

  async deleteTicket(id: string) {
    const ticket = this.tickets.find((t) => t.id === id);
    if (!ticket) throw new NotFoundException("Ticket not found");
    this.tickets = this.tickets.filter((t) => t.id !== id);
    await this.persist();
    this.emit({ type: "ticket", ticket, action: "deleted" });
    return { ok: true };
  }

  // ── Activities ────────────────────────────────────────────────────────────

  listActivities() {
    return [...this.activities].sort((a, b) => b.at.localeCompare(a.at));
  }

  async saveActivity(body: Partial<CrmActivity> & { title?: string }) {
    const title = body.title?.trim();
    if (!title) throw new BadRequestException("Activity title is required");
    const now = new Date().toISOString();
    if (body.id) {
      const idx = this.activities.findIndex((a) => a.id === body.id);
      if (idx === -1) throw new NotFoundException("Activity not found");
      const updated: CrmActivity = { ...this.activities[idx], ...body, title };
      this.activities[idx] = updated;
      await this.persist();
      this.emit({ type: "activity", activity: updated, action: "updated" });
      return updated;
    }
    const created: CrmActivity = {
      id: this.id("crm-a"),
      type: body.type ?? "note",
      title,
      body: body.body?.trim(),
      contactId: body.contactId,
      contactName: body.contactName?.trim(),
      dealId: body.dealId,
      ticketId: body.ticketId,
      dueAt: body.dueAt,
      done: body.done ?? false,
      author: body.author?.trim() || "You",
      at: now,
    };
    this.activities.push(created);
    await this.persist();
    this.emit({ type: "activity", activity: created, action: "created" });
    return created;
  }

  async deleteActivity(id: string) {
    const activity = this.activities.find((a) => a.id === id);
    if (!activity) throw new NotFoundException("Activity not found");
    this.activities = this.activities.filter((a) => a.id !== id);
    await this.persist();
    this.emit({ type: "activity", activity, action: "deleted" });
    return { ok: true };
  }

  // ── Projects ──────────────────────────────────────────────────────────────

  listProjects() {
    return [...this.projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async saveProject(body: Partial<CrmProject> & { name?: string }) {
    const name = body.name?.trim();
    if (!name) throw new BadRequestException("Project name is required");
    const now = new Date().toISOString();
    if (body.id) {
      const idx = this.projects.findIndex((p) => p.id === body.id);
      if (idx === -1) throw new NotFoundException("Project not found");
      const updated: CrmProject = { ...this.projects[idx], ...body, name, updatedAt: now };
      this.projects[idx] = updated;
      await this.persist();
      this.emit({ type: "project", project: updated, action: "updated" });
      return updated;
    }
    const created: CrmProject = {
      id: this.id("crm-p"),
      name,
      description: body.description?.trim(),
      visibility: body.visibility ?? "team",
      owner: body.owner?.trim(),
      openIssues: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.projects.push(created);
    await this.persist();
    this.emit({ type: "project", project: created, action: "created" });
    return created;
  }

  async deleteProject(id: string) {
    const project = this.projects.find((p) => p.id === id);
    if (!project) throw new NotFoundException("Project not found");
    this.projects = this.projects.filter((p) => p.id !== id);
    this.issues = this.issues.filter((i) => i.projectId !== id);
    await this.persist();
    this.emit({ type: "project", project, action: "deleted" });
    return { ok: true };
  }

  // ── Issues (GitHub-like) ──────────────────────────────────────────────────

  listIssues(projectId?: string) {
    const rows = projectId
      ? this.issues.filter((i) => i.projectId === projectId)
      : [...this.issues];
    return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  getIssue(id: string) {
    const issue = this.issues.find((i) => i.id === id);
    if (!issue) throw new NotFoundException("Issue not found");
    const comments = this.issueComments
      .filter((c) => c.issueId === id)
      .sort((a, b) => a.at.localeCompare(b.at));
    return { issue, comments };
  }

  async saveIssue(body: Partial<CrmIssue> & { title?: string; projectId?: string }) {
    const title = body.title?.trim();
    if (!title) throw new BadRequestException("Issue title is required");
    const now = new Date().toISOString();
    if (body.id) {
      const idx = this.issues.findIndex((i) => i.id === body.id);
      if (idx === -1) throw new NotFoundException("Issue not found");
      const updated: CrmIssue = { ...this.issues[idx], ...body, title, updatedAt: now };
      this.issues[idx] = updated;
      this.syncProjectOpenCounts(updated.projectId);
      await this.persist();
      this.emit({ type: "issue", issue: updated, action: "updated" });
      return updated;
    }
    const projectId = body.projectId?.trim();
    if (!projectId) throw new BadRequestException("projectId is required");
    const project = this.projects.find((p) => p.id === projectId);
    if (!project) throw new NotFoundException("Project not found");
    this.issueCounter += 1;
    const created: CrmIssue = {
      id: this.id("crm-i"),
      number: this.issueCounter,
      projectId,
      projectName: project.name,
      title,
      body: body.body?.trim() ?? "",
      status: body.status ?? "open",
      labels: body.labels ?? [],
      assignee: body.assignee?.trim(),
      author: body.author?.trim() || "You",
      createdAt: now,
      updatedAt: now,
    };
    this.issues.push(created);
    this.syncProjectOpenCounts(projectId);
    await this.persist();
    this.emit({ type: "issue", issue: created, action: "created" });
    return created;
  }

  async deleteIssue(id: string) {
    const issue = this.issues.find((i) => i.id === id);
    if (!issue) throw new NotFoundException("Issue not found");
    const projectId = issue.projectId;
    this.issues = this.issues.filter((i) => i.id !== id);
    this.issueComments = this.issueComments.filter((c) => c.issueId !== id);
    this.syncProjectOpenCounts(projectId);
    await this.persist();
    this.emit({ type: "issue", issue, action: "deleted" });
    return { ok: true };
  }

  private syncProjectOpenCounts(projectId: string) {
    const project = this.projects.find((p) => p.id === projectId);
    if (!project) return;
    project.openIssues = this.issues.filter(
      (i) => i.projectId === projectId && i.status !== "closed",
    ).length;
    project.updatedAt = new Date().toISOString();
  }

  listIssueComments(issueId: string) {
    return this.issueComments
      .filter((c) => c.issueId === issueId)
      .sort((a, b) => a.at.localeCompare(b.at));
  }

  async addIssueComment(issueId: string, body: { body?: string; author?: string }) {
    const text = body.body?.trim();
    if (!text) throw new BadRequestException("Comment body is required");
    const issue = this.issues.find((i) => i.id === issueId);
    if (!issue) throw new NotFoundException("Issue not found");
    const comment: CrmIssueComment = {
      id: this.id("crm-ic"),
      issueId,
      author: body.author?.trim() || "You",
      body: text,
      at: new Date().toISOString(),
    };
    this.issueComments.push(comment);
    issue.updatedAt = comment.at;
    await this.persist();
    this.emit({ type: "comment", comment, action: "created" });
    return comment;
  }
}
