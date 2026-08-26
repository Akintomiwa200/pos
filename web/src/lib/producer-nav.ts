import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  Boxes,
  Building2,
  Code,
  CreditCard,
  Database,
  Flag,
  Headphones,
  HeartPulse,
  KeyRound,
  LayoutDashboard,
  Lock,
  Megaphone,
  Percent,
  Receipt,
  ScrollText,
  Settings,
  Shield,
  Ticket,
  UserRound,
  Users,
  Webhook,
  Wrench,
} from "lucide-react";
import {
  itemToAccess,
  type AccessNode,
  type NavItem,
  type NavSection,
  type ProducerDepartmentName,
} from "./nav";

function link(
  id: string,
  label: string,
  href: string,
  icon: NavItem["icon"],
): NavItem {
  return { id, label, href, icon };
}

export const PRODUCER_NAV: NavSection[] = [
  {
    heading: "Main Menu",
    department: "Main",
    items: [
      link("super-home", "Dashboard", "/admin", LayoutDashboard),
      link("super-activity", "Activity", "/admin/activity", Activity),
      link("super-notifications", "Notifications", "/admin/notifications", Bell),
    ],
  },
  {
    heading: "Business",
    department: "Business",
    items: [
      link("super-companies", "Companies", "/admin/companies", Building2),
    ],
  },
  {
    heading: "Billing",
    department: "Billing",
    items: [
      link("super-billing-plans", "Plans", "/admin/billing/plans", Receipt),
      link("super-billing-subscriptions", "Subscriptions", "/admin/billing/subscriptions", Receipt),
      link("super-billing-invoices", "Invoices", "/admin/billing/invoices", ScrollText),
      link("super-billing-payments", "Payments", "/admin/billing/payments", CreditCard),
      link("super-billing-discounts", "Discounts", "/admin/billing/discounts", Percent),
      link("super-billing-usage", "Usage", "/admin/billing/usage", BarChart3),
    ],
  },
  {
    heading: "Support",
    department: "Support",
    items: [
      link("super-support", "Support dashboard", "/admin/support", Headphones),
      link("super-support-tickets", "Tickets", "/admin/support/tickets", Ticket),
      link("super-support-requests", "Customer requests", "/admin/support/requests", Headphones),
      link("super-support-knowledge", "Knowledge base", "/admin/support/knowledge", BookOpen),
      link("super-support-announcements", "Announcements", "/admin/support/announcements", Megaphone),
    ],
  },
  {
    heading: "Security",
    department: "Security",
    items: [
      link("super-security", "Security dashboard", "/admin/security", Lock),
      link("super-security-logins", "Login activity", "/admin/security/logins", Activity),
      link("super-security-sessions", "Sessions", "/admin/security/sessions", Users),
      link("super-security-audit", "Audit logs", "/admin/security/audit", ScrollText),
      link("super-security-events", "Security events", "/admin/security/events", Shield),
    ],
  },
  {
    heading: "System",
    department: "System",
    items: [
      link("super-system", "System health", "/admin/system", HeartPulse),
      link("super-system-settings", "Settings", "/admin/system/settings", Settings),
      link("super-system-notifications", "Notifications", "/admin/system/notifications", Bell),
      link("super-system-flags", "Feature flags", "/admin/system/flags", Flag),
      link("super-system-backups", "Backups", "/admin/system/backups", Database),
      link("super-system-maintenance", "Maintenance", "/admin/system/maintenance", Wrench),
    ],
  },
  {
    heading: "Developer",
    department: "Developer",
    items: [
      link("super-developer", "API", "/admin/developer", Code),
      link("super-developer-keys", "API keys", "/admin/developer/keys", KeyRound),
      link("super-developer-webhooks", "Webhooks", "/admin/developer/webhooks", Webhook),
      link("super-developer-apps", "Applications", "/admin/developer/apps", Boxes),
      link("super-developer-logs", "API logs", "/admin/developer/logs", ScrollText),
    ],
  },
  {
    heading: "Super Admin",
    department: "Admin",
    items: [
      link("super-admins", "Administrators", "/admin/administrators", Users),
      link("super-admin-roles", "Roles & permissions", "/admin/administrators/roles", Shield),
      link("super-admin-activity", "Admin activity", "/admin/administrators/activity", Activity),
      link("super-account", "My account", "/admin/account", UserRound),
    ],
  },
];

export function producerAccessTree(): {
  heading: string;
  department: ProducerDepartmentName;
  items: AccessNode[];
}[] {
  return PRODUCER_NAV.map((section) => ({
    heading: section.heading,
    department: section.department as ProducerDepartmentName,
    items: section.items.map(itemToAccess),
  }));
}
