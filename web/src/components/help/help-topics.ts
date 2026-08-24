export type HelpTopic = {
  id: string;
  title: string;
  summary: string;
  href?: string;
  external?: boolean;
  section: string;
  keywords: string[];
};

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: "start",
    title: "Getting started",
    summary: "Sign in with your HQ account. Sidebar menus follow your group privileges.",
    href: "/dashboard",
    section: "Basics",
    keywords: ["login", "start", "dashboard", "begin", "home"],
  },
  {
    id: "products",
    title: "Products & catalog",
    summary: "Add items, categories, packs/cartons, brands, and barcodes under Products.",
    href: "/setup/items/items",
    section: "Modules",
    keywords: ["catalog", "items", "barcode", "pack", "product", "stock item"],
  },
  {
    id: "orders",
    title: "Purchase orders",
    summary: "Draft → approve → send → receive workflow under Analytics → Orders.",
    href: "/orders/list",
    section: "Modules",
    keywords: ["purchase", "order", "receive", "po", "supplier"],
  },
  {
    id: "customers",
    title: "Customers & loyalty",
    summary: "Directory, groups, credits, loyalty cards, and gift cards in Workspace.",
    href: "/setup/customers/list",
    section: "Modules",
    keywords: ["customer", "loyalty", "gift", "credit", "directory"],
  },
  {
    id: "crm",
    title: "Support workspace",
    summary: "Contacts, deals, pipeline, tickets, activity, projects, and GitHub-style issues.",
    href: "/crm/overview",
    section: "Modules",
    keywords: ["support", "deals", "pipeline", "issues", "tickets", "crm"],
  },
  {
    id: "chat",
    title: "Live chat",
    summary: "Three-column inbox with customer profile. Updates in real time via SSE.",
    href: "/chat",
    section: "Modules",
    keywords: ["chat", "message", "real-time", "inbox", "conversation"],
  },
  {
    id: "transactions",
    title: "Transactions",
    summary: "Payments dashboard with spend analysis and tabbed history.",
    href: "/transactions/payments",
    section: "Modules",
    keywords: ["payment", "transaction", "refund", "expense", "receipt"],
  },
  {
    id: "reports",
    title: "Reports & analytics",
    summary:
      "Sales and stock live under Analytics. Ledgers, trails, tax, audit, and finance live under Account.",
    href: "/reports/stock/balance",
    section: "Modules",
    keywords: [
      "report",
      "sales",
      "tax",
      "ledger",
      "balance",
      "analytics",
      "stock",
      "movement",
      "bin card",
      "expiry",
      "count",
      "audit",
      "finance",
      "trail",
    ],
  },
  {
    id: "account",
    title: "Account & audit",
    summary:
      "Live Audit (overview, X/Z, tenders, tickets, cashiers, drawer, exceptions), books, statements, balances, ledgers, trails, tax, expense accounts, and billing.",
    href: "/audit",
    section: "Modules",
    keywords: [
      "account",
      "audit",
      "finance",
      "ledger",
      "trail",
      "tax",
      "billing",
      "expense",
      "trial balance",
      "profit",
      "loss",
      "balance sheet",
      "journal",
      "cash book",
      "chart of accounts",
      "x-report",
      "z-report",
      "drawer",
      "tender",
    ],
  },
  {
    id: "till",
    title: "Till & store",
    summary: "Issue till codes and manage store locations under Point of Sales.",
    href: "/setup/others/till",
    section: "Modules",
    keywords: ["till", "store", "pos", "point of sale", "branch"],
  },
  {
    id: "users",
    title: "Users & access",
    summary: "Accounts and groups control which sidebar items each user sees.",
    href: "/setup/users/account",
    section: "Settings",
    keywords: ["user", "group", "privilege", "access", "permission", "role"],
  },
  {
    id: "settings",
    title: "Company settings",
    summary: "Organization details, tax, payment gateway, import/export, and billing live under Settings.",
    href: "/setup/others/settings",
    section: "Settings",
    keywords: ["settings", "company", "tax", "billing", "import", "export"],
  },
  {
    id: "install",
    title: "Install & releases",
    summary: "Build guides, releases, and troubleshooting on the public support page.",
    href: "/support",
    section: "Support",
    keywords: ["install", "exe", "apk", "release", "download"],
  },
  {
    id: "github",
    title: "Source on GitHub",
    summary: "Report bugs and browse releases on the project repository.",
    href: "https://github.com/Akintomiwa200/pos",
    external: true,
    section: "Support",
    keywords: ["github", "source", "bug", "repo"],
  },
];

export const HELP_SECTIONS = ["Basics", "Modules", "Settings", "Support"] as const;

/** Preset Q&A shown to staff. Matching is keyword-based (AI layer lives in AiHelpModal). */
export type HelpPreset = {
  id: string;
  question: string;
  answer: string;
  topicId?: string;
  keywords: string[];
};

export const HELP_PRESETS: HelpPreset[] = [
  {
    id: "get-started",
    question: "How do I get started?",
    answer:
      "Sign in with your HQ account, then use the sidebar. Menus you see follow your group privileges. Start on Dashboard for an overview, then open Products, Orders, or Workspace as needed.",
    topicId: "start",
    keywords: ["start", "begin", "getting started", "dashboard", "login"],
  },
  {
    id: "add-product",
    question: "Where do I manage products?",
    answer:
      "Go to Products in the Main Menu (or Setup → Items). There you can add items, categories, packs/cartons, brands, and barcodes.",
    topicId: "products",
    keywords: ["product", "item", "catalog", "barcode", "stock"],
  },
  {
    id: "purchase-order",
    question: "How do purchase orders work?",
    answer:
      "Under Analytics → Orders: draft an order, approve it, send it to the supplier, then receive stock when it arrives.",
    topicId: "orders",
    keywords: ["purchase", "order", "po", "receive", "supplier"],
  },
  {
    id: "customers",
    question: "Where are customers and loyalty?",
    answer:
      "Open Workspace → Customers. Manage the directory, groups, credits, loyalty cards, and gift cards there.",
    topicId: "customers",
    keywords: ["customer", "loyalty", "gift", "credit"],
  },
  {
    id: "support",
    question: "Where is the support workspace?",
    answer:
      "Open Support / CRM for contacts, deals, pipeline, tickets, activity, projects, and issues.",
    topicId: "crm",
    keywords: ["support", "crm", "ticket", "deal", "pipeline", "issue"],
  },
  {
    id: "chat",
    question: "How does live chat work?",
    answer:
      "Open Chat for the three-column inbox. Pick a conversation, reply in the center column, and see the customer profile on the right. Updates arrive in real time.",
    topicId: "chat",
    keywords: ["chat", "message", "inbox", "conversation"],
  },
  {
    id: "users",
    question: "How do user groups work?",
    answer:
      "Under Settings → Users, create accounts and assign each person to a group. That group’s privileges decide which sidebar pages they can open.",
    topicId: "users",
    keywords: ["user", "group", "access", "privilege", "permission", "role"],
  },
  {
    id: "till",
    question: "How do I set up a till?",
    answer:
      "Go to Point of Sales / Till under Settings. Issue till codes and manage store locations so POS stations can sign in.",
    topicId: "till",
    keywords: ["till", "pos", "store", "branch"],
  },
  {
    id: "reports",
    question: "Where are stock and balance reports?",
    answer:
      "Stock reports stay under Analytics → Stock. Party balances (customer, vendor, sales rep, staff) are under Account → Balances. Trial balance and financial statements are under Account → Books / Statements.",
    topicId: "reports",
    keywords: ["report", "sales", "stock", "movement", "balance", "bin", "expiry", "count", "trial"],
  },
  {
    id: "account",
    question: "Where is Account and audit?",
    answer:
      "Open Account → Audit for Today's Summary, Mid-day Check, End of Day, Payment Methods, Sales List, Staff Sales, Cash Count, and Problems to Check.",
    topicId: "account",
    keywords: [
      "account",
      "audit",
      "finance",
      "ledger",
      "trail",
      "tax",
      "billing",
      "expense",
      "trial balance",
      "profit",
      "balance sheet",
      "journal",
      "x-report",
      "z-report",
      "drawer",
    ],
  },
  {
    id: "payments",
    question: "Where do I see payments?",
    answer:
      "Open Transactions → Payments for the payments dashboard, spend analysis, and history tabs. Refunds and expenses are nearby in the same area.",
    topicId: "transactions",
    keywords: ["payment", "transaction", "refund", "expense"],
  },
];

export function presetsForPath(pathname: string): HelpPreset[] {
  const topic = topicForPath(pathname);
  const primary = topic
    ? HELP_PRESETS.filter((p) => p.topicId === topic.id)
    : [];
  const rest = HELP_PRESETS.filter((p) => !primary.includes(p));
  return [...primary, ...rest].slice(0, 5);
}

function scorePreset(preset: HelpPreset, query: string) {
  const q = query.toLowerCase();
  let score = 0;
  if (preset.question.toLowerCase().includes(q)) score += 10;
  if (preset.answer.toLowerCase().includes(q)) score += 3;
  for (const keyword of preset.keywords) {
    if (q.includes(keyword) || keyword.includes(q)) score += 6;
  }
  for (const word of q.split(/\s+/).filter(Boolean)) {
    if (word.length < 3) continue;
    if (preset.question.toLowerCase().includes(word)) score += 2;
    if (preset.keywords.some((k) => k.includes(word))) score += 3;
  }
  return score;
}

export function matchHelpPreset(query: string): HelpPreset | null {
  const ranked = HELP_PRESETS.map((preset) => ({
    preset,
    score: scorePreset(preset, query),
  }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.preset ?? null;
}

/** Map current console path to the most relevant help topic. */
export function topicForPath(pathname: string): HelpTopic | null {
  const path = pathname === "/crm" ? "/crm/overview" : pathname;
  if (path.startsWith("/dashboard")) return HELP_TOPICS.find((t) => t.id === "start") ?? null;
  if (path.startsWith("/setup/items") || path.startsWith("/catalog")) {
    return HELP_TOPICS.find((t) => t.id === "products") ?? null;
  }
  if (path.startsWith("/orders")) return HELP_TOPICS.find((t) => t.id === "orders") ?? null;
  if (path.startsWith("/setup/customers")) return HELP_TOPICS.find((t) => t.id === "customers") ?? null;
  if (path.startsWith("/crm")) return HELP_TOPICS.find((t) => t.id === "crm") ?? null;
  if (path.startsWith("/chat")) return HELP_TOPICS.find((t) => t.id === "chat") ?? null;
  if (path.startsWith("/transactions")) {
    return HELP_TOPICS.find((t) => t.id === "transactions") ?? null;
  }
  if (
    path.startsWith("/audit") ||
    path.startsWith("/finance") ||
    path.startsWith("/reports/accounting") ||
    path.startsWith("/reports/ledger") ||
    path.startsWith("/reports/trail") ||
    path.startsWith("/reports/tax") ||
    path.startsWith("/reports/balance") ||
    path.startsWith("/setup/expense-account") ||
    path.startsWith("/setup/billing")
  ) {
    return HELP_TOPICS.find((t) => t.id === "account") ?? null;
  }
  if (path.startsWith("/reports")) {
    return HELP_TOPICS.find((t) => t.id === "reports") ?? null;
  }
  if (
    path.startsWith("/setup/others/till") ||
    path.startsWith("/setup/others/store") ||
    path.startsWith("/setup/others/branch")
  ) {
    return HELP_TOPICS.find((t) => t.id === "till") ?? null;
  }
  if (path.startsWith("/setup/users")) return HELP_TOPICS.find((t) => t.id === "users") ?? null;
  if (path.startsWith("/setup") || path.startsWith("/help")) {
    return HELP_TOPICS.find((t) => t.id === "settings") ?? null;
  }
  return null;
}

function scoreTopic(topic: HelpTopic, query: string) {
  const q = query.toLowerCase();
  let score = 0;
  if (topic.title.toLowerCase().includes(q)) score += 8;
  if (topic.summary.toLowerCase().includes(q)) score += 4;
  for (const keyword of topic.keywords) {
    if (q.includes(keyword) || keyword.includes(q)) score += 5;
  }
  for (const word of q.split(/\s+/).filter(Boolean)) {
    if (word.length < 3) continue;
    if (topic.title.toLowerCase().includes(word)) score += 2;
    if (topic.keywords.some((k) => k.includes(word))) score += 3;
  }
  return score;
}

export function matchHelpTopics(query: string, limit = 3): HelpTopic[] {
  const q = query.trim();
  if (!q) return [];
  return HELP_TOPICS.map((topic) => ({ topic, score: scoreTopic(topic, q) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => row.topic);
}

/** Resolve a staff question to a preset answer (AI matching lives in AiHelpModal). */
export function buildAssistantReply(query: string, pathname: string): {
  text: string;
  topics: HelpTopic[];
} {
  const preset = matchHelpPreset(query);
  if (preset) {
    const topic = HELP_TOPICS.find((t) => t.id === preset.topicId);
    return {
      text: preset.answer,
      topics: topic ? [topic] : [],
    };
  }

  const matches = matchHelpTopics(query);
  const contextual = topicForPath(pathname);

  if (matches.length) {
    const primary = matches[0];
    let text = primary.summary;
    if (primary.href && !primary.external) {
      text += ` Open **${primary.title}** from the sidebar, or use the link below.`;
    } else if (primary.external) {
      text += ` You can open the external page from the link below.`;
    }
    return { text, topics: matches.slice(0, 2) };
  }

  if (contextual) {
    return {
      text: `No preset answer matched that question. On this page you’re looking at **${contextual.title}**: ${contextual.summary} Try one of the suggested questions, or open the Help center.`,
      topics: [contextual],
    };
  }

  return {
    text: "No preset answer matched that question. Try one of the suggested questions below, or open the Help center for the full guide.",
    topics: HELP_TOPICS.filter((t) => ["start", "products", "crm"].includes(t.id)),
  };
}
