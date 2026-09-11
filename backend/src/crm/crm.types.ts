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

export type CrmEvent =
  | { type: "snapshot"; data: CrmSnapshot }
  | { type: "contact"; contact: CrmContact; action: "created" | "updated" | "deleted" }
  | { type: "deal"; deal: CrmDeal; action: "created" | "updated" | "deleted" }
  | { type: "ticket"; ticket: CrmTicket; action: "created" | "updated" | "deleted" }
  | { type: "activity"; activity: CrmActivity; action: "created" | "updated" | "deleted" }
  | { type: "project"; project: CrmProject; action: "created" | "updated" | "deleted" }
  | { type: "issue"; issue: CrmIssue; action: "created" | "updated" | "deleted" }
  | { type: "comment"; comment: CrmIssueComment; action: "created" };


