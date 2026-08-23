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

const ago = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();
const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

export const SEED_CONTACTS: CrmContact[] = [
  {
    id: "crm-c1",
    name: "Jenny Wilson",
    company: "Wilson Retail",
    email: "jenny@wilson.ng",
    phone: "+234 801 234 5678",
    stage: "customer",
    owner: "Emma",
    tags: ["vip", "wholesale"],
    customerId: "cust-jenny",
    createdAt: daysAgo(90),
    updatedAt: ago(2),
  },
  {
    id: "crm-c2",
    name: "Floyd Miles",
    company: "Miles Foods",
    email: "floyd@miles.ng",
    phone: "+234 802 345 6789",
    stage: "prospect",
    owner: "Emma",
    tags: ["restaurant"],
    createdAt: daysAgo(14),
    updatedAt: ago(6),
  },
  {
    id: "crm-c3",
    name: "Acme Supplies Ltd",
    company: "Acme Supplies",
    email: "procurement@acme.ng",
    stage: "lead",
    owner: "James",
    tags: ["b2b"],
    createdAt: daysAgo(3),
    updatedAt: daysAgo(1),
  },
];

export const SEED_DEALS: CrmDeal[] = [
  {
    id: "crm-d1",
    title: "Wilson — Chivita carton contract",
    contactId: "crm-c1",
    contactName: "Jenny Wilson",
    stage: "negotiation",
    amountMinor: 4_500_000_00,
    closeDate: new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10),
    owner: "Emma",
    createdAt: daysAgo(21),
    updatedAt: ago(4),
  },
  {
    id: "crm-d2",
    title: "Miles Foods — weekly produce",
    contactId: "crm-c2",
    contactName: "Floyd Miles",
    stage: "proposal",
    amountMinor: 850_000_00,
    owner: "Emma",
    createdAt: daysAgo(7),
    updatedAt: ago(12),
  },
  {
    id: "crm-d3",
    title: "Acme — office pantry setup",
    contactId: "crm-c3",
    contactName: "Acme Supplies Ltd",
    stage: "qualification",
    amountMinor: 1_200_000_00,
    owner: "James",
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
  },
];

export const SEED_TICKETS: CrmTicket[] = [
  {
    id: "crm-t1",
    subject: "Wrong pack size delivered",
    body: "Customer received 6-pack instead of 12-pack Chivita.",
    contactId: "crm-c1",
    contactName: "Jenny Wilson",
    status: "in_progress",
    priority: "high",
    assignee: "Emma",
    createdAt: ago(8),
    updatedAt: ago(1),
  },
  {
    id: "crm-t2",
    subject: "Loyalty card not syncing",
    body: "Points from yesterday's sale missing on card.",
    contactName: "Devon Lane",
    status: "open",
    priority: "medium",
    assignee: "James",
    createdAt: ago(20),
    updatedAt: ago(18),
  },
];

export const SEED_ACTIVITIES: CrmActivity[] = [
  {
    id: "crm-a1",
    type: "call",
    title: "Follow-up on carton pricing",
    contactId: "crm-c1",
    contactName: "Jenny Wilson",
    dealId: "crm-d1",
    done: true,
    author: "Emma",
    at: ago(4),
  },
  {
    id: "crm-a2",
    type: "task",
    title: "Send revised proposal",
    contactId: "crm-c2",
    contactName: "Floyd Miles",
    dealId: "crm-d2",
    dueAt: new Date(Date.now() + 86_400_000).toISOString(),
    done: false,
    author: "Emma",
    at: ago(10),
  },
  {
    id: "crm-a3",
    type: "note",
    title: "Acme wants net-30 terms",
    contactId: "crm-c3",
    contactName: "Acme Supplies Ltd",
    body: "Decision maker is procurement lead — ask for credit check.",
    done: true,
    author: "James",
    at: daysAgo(1),
  },
];

export const SEED_PROJECTS: CrmProject[] = [
  {
    id: "crm-p1",
    name: "pos-platform",
    description: "HQ console, till sync, and reporting.",
    visibility: "team",
    owner: "Emma",
    openIssues: 3,
    createdAt: daysAgo(120),
    updatedAt: ago(2),
  },
  {
    id: "crm-p2",
    name: "customer-loyalty",
    description: "Loyalty cards, points, and gift card flows.",
    visibility: "team",
    owner: "James",
    openIssues: 2,
    createdAt: daysAgo(60),
    updatedAt: ago(24),
  },
];

export const SEED_ISSUES: CrmIssue[] = [
  {
    id: "crm-i1",
    number: 42,
    projectId: "crm-p1",
    projectName: "pos-platform",
    title: "Real-time chat updates via SSE",
    body: "Wire chat inbox to server-sent events like catalog stream.",
    status: "in_progress",
    labels: ["enhancement", "real-time"],
    assignee: "Emma",
    author: "James",
    createdAt: daysAgo(5),
    updatedAt: ago(2),
  },
  {
    id: "crm-i2",
    number: 41,
    projectId: "crm-p1",
    projectName: "pos-platform",
    title: "CRM pipeline board drag-and-drop",
    body: "Kanban view for deal stages.",
    status: "open",
    labels: ["crm", "ui"],
    assignee: "Emma",
    author: "Emma",
    createdAt: daysAgo(7),
    updatedAt: daysAgo(6),
  },
  {
    id: "crm-i3",
    number: 18,
    projectId: "crm-p2",
    projectName: "customer-loyalty",
    title: "Gift card batch expiry alerts",
    body: "Notify HQ when batches expire within 30 days.",
    status: "review",
    labels: ["loyalty"],
    assignee: "James",
    author: "Emma",
    createdAt: daysAgo(10),
    updatedAt: ago(48),
  },
];

export const SEED_ISSUE_COMMENTS: CrmIssueComment[] = [
  {
    id: "crm-ic1",
    issueId: "crm-i1",
    author: "Emma",
    body: "SSE endpoint added on chat module — wiring frontend next.",
    at: ago(3),
  },
  {
    id: "crm-ic2",
    issueId: "crm-i1",
    author: "James",
    body: "Match catalog stream pattern for consistency.",
    at: ago(2),
  },
];
