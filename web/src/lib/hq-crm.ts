import { api } from "./hq-api";

export type CrmContact = {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  stage: "lead" | "prospect" | "customer" | "churned";
  owner?: string;
  tags: string[];
  customerId?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

export type CrmDealStage =
  | "qualification"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export type CrmDeal = {
  id: string;
  title: string;
  contactId?: string;
  contactName?: string;
  stage: CrmDealStage;
  amountMinor: number;
  closeDate?: string;
  owner?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

export type CrmTicketStatus = "open" | "in_progress" | "waiting" | "resolved" | "closed";
export type CrmTicketPriority = "low" | "medium" | "high" | "urgent";

export type CrmTicket = {
  id: string;
  subject: string;
  body: string;
  contactId?: string;
  contactName?: string;
  status: CrmTicketStatus;
  priority: CrmTicketPriority;
  assignee?: string;
  createdAt: string;
  updatedAt: string;
};

export type CrmActivityType = "note" | "call" | "email" | "meeting" | "task";

export type CrmActivity = {
  id: string;
  type: CrmActivityType;
  title: string;
  body?: string;
  contactId?: string;
  contactName?: string;
  dealId?: string;
  ticketId?: string;
  dueAt?: string;
  done: boolean;
  author: string;
  at: string;
};

export type CrmProject = {
  id: string;
  name: string;
  description?: string;
  visibility: "private" | "team" | "public";
  owner?: string;
  openIssues: number;
  createdAt: string;
  updatedAt: string;
};

export type CrmIssueStatus = "open" | "in_progress" | "review" | "closed";

export type CrmIssueComment = {
  id: string;
  issueId: string;
  author: string;
  body: string;
  at: string;
};

export type CrmIssue = {
  id: string;
  number: number;
  projectId: string;
  projectName?: string;
  title: string;
  body: string;
  status: CrmIssueStatus;
  labels: string[];
  assignee?: string;
  author: string;
  createdAt: string;
  updatedAt: string;
};

export type CrmSnapshot = {
  contacts: CrmContact[];
  deals: CrmDeal[];
  tickets: CrmTicket[];
  activities: CrmActivity[];
  projects: CrmProject[];
  issues: CrmIssue[];
  issueComments: CrmIssueComment[];
};

export type CrmSummary = {
  contacts: number;
  openDeals: number;
  pipelineValueMinor: number;
  openTickets: number;
  openIssues: number;
  pendingTasks: number;
};

export type CrmEvent =
  | { type: "snapshot"; data: CrmSnapshot }
  | { type: "contact"; contact: CrmContact; action: "created" | "updated" | "deleted" }
  | { type: "deal"; deal: CrmDeal; action: "created" | "updated" | "deleted" }
  | { type: "ticket"; ticket: CrmTicket; action: "created" | "updated" | "deleted" }
  | { type: "activity"; activity: CrmActivity; action: "created" | "updated" | "deleted" }
  | { type: "project"; project: CrmProject; action: "created" | "updated" | "deleted" }
  | { type: "issue"; issue: CrmIssue; action: "created" | "updated" | "deleted" }
  | { type: "comment"; comment: CrmIssueComment; action: "created" };

export async function getCrmSummary() {
  return api<CrmSummary>("/api/crm/summary");
}

export async function listCrmContacts() {
  return api<CrmContact[]>("/api/crm/contacts");
}

export async function saveCrmContact(body: Partial<CrmContact> & { name?: string }) {
  return api<CrmContact>("/api/crm/contacts", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deleteCrmContact(id: string) {
  return api<{ ok: boolean }>(`/api/crm/contacts/${id}`, { method: "DELETE" });
}

export async function listCrmDeals() {
  return api<CrmDeal[]>("/api/crm/deals");
}

export async function saveCrmDeal(body: Partial<CrmDeal> & { title?: string }) {
  return api<CrmDeal>("/api/crm/deals", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deleteCrmDeal(id: string) {
  return api<{ ok: boolean }>(`/api/crm/deals/${id}`, { method: "DELETE" });
}

export async function listCrmTickets() {
  return api<CrmTicket[]>("/api/crm/tickets");
}

export async function saveCrmTicket(body: Partial<CrmTicket> & { subject?: string }) {
  return api<CrmTicket>("/api/crm/tickets", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deleteCrmTicket(id: string) {
  return api<{ ok: boolean }>(`/api/crm/tickets/${id}`, { method: "DELETE" });
}

export async function listCrmActivities() {
  return api<CrmActivity[]>("/api/crm/activities");
}

export async function saveCrmActivity(body: Partial<CrmActivity> & { title?: string }) {
  return api<CrmActivity>("/api/crm/activities", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deleteCrmActivity(id: string) {
  return api<{ ok: boolean }>(`/api/crm/activities/${id}`, { method: "DELETE" });
}

export async function listCrmProjects() {
  return api<CrmProject[]>("/api/crm/projects");
}

export async function saveCrmProject(body: Partial<CrmProject> & { name?: string }) {
  return api<CrmProject>("/api/crm/projects", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deleteCrmProject(id: string) {
  return api<{ ok: boolean }>(`/api/crm/projects/${id}`, { method: "DELETE" });
}

export async function listCrmIssues(projectId?: string) {
  const q = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
  return api<CrmIssue[]>(`/api/crm/issues${q}`);
}

export async function getCrmIssue(id: string) {
  return api<{ issue: CrmIssue; comments: CrmIssueComment[] }>(`/api/crm/issues/${id}`);
}

export async function saveCrmIssue(
  body: Partial<CrmIssue> & { title?: string; projectId?: string },
) {
  return api<CrmIssue>("/api/crm/issues", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deleteCrmIssue(id: string) {
  return api<{ ok: boolean }>(`/api/crm/issues/${id}`, { method: "DELETE" });
}

export async function addCrmIssueComment(
  issueId: string,
  body: string,
  author?: string,
) {
  return api<CrmIssueComment>(`/api/crm/issues/${issueId}/comments`, {
    method: "POST",
    body: JSON.stringify({ body, author }),
  });
}

export const DEAL_STAGE_LABEL: Record<CrmDealStage, string> = {
  qualification: "Qualification",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

export const TICKET_STATUS_LABEL: Record<CrmTicketStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  waiting: "Waiting",
  resolved: "Resolved",
  closed: "Closed",
};

export const ISSUE_STATUS_LABEL: Record<CrmIssueStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  review: "In Review",
  closed: "Closed",
};
