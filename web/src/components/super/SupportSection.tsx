"use client";

import Link from "next/link";
import {
  BookOpen,
  ExternalLink,
  Headphones,
  Megaphone,
  Ticket,
  Wifi,
  WifiOff,
} from "lucide-react";
import { SetupHeader, SetupStat } from "@/components/setup/SetupChrome";
import { useLivePos } from "@/lib/live-pos";

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

function SupportDashboard() {
  const { live, ready } = useLivePos();
  return (
    <div>
      <SetupHeader
        kicker="Producer · Support"
        title="Support dashboard"
        copy="Customer support overview across all tenant companies."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Open tickets" value="0" hint="Awaiting response" />
        <SetupStat label="Resolved today" value="0" hint="Closed tickets" tone="accent" />
        <SetupStat label="Avg. response" value="—" hint="Time to first reply" />
        <SetupStat label="Satisfaction" value="—" hint="Customer rating" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/support/tickets"
          className="flex items-center gap-3 rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm text-pos-ink hover:bg-pos-surface-muted"
        >
          <Ticket size={18} className="text-pos-primary" />
          <div>
            <div className="font-medium">Tickets</div>
            <div className="text-pos-ink-muted">Manage support requests</div>
          </div>
          <ExternalLink size={14} className="ml-auto text-pos-ink-faint" />
        </Link>
        <Link
          href="/admin/support/requests"
          className="flex items-center gap-3 rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm text-pos-ink hover:bg-pos-surface-muted"
        >
          <Headphones size={18} className="text-pos-primary" />
          <div>
            <div className="font-medium">Customer requests</div>
            <div className="text-pos-ink-muted">Inbound enquiries</div>
          </div>
          <ExternalLink size={14} className="ml-auto text-pos-ink-faint" />
        </Link>
        <Link
          href="/admin/support/knowledge"
          className="flex items-center gap-3 rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm text-pos-ink hover:bg-pos-surface-muted"
        >
          <BookOpen size={18} className="text-pos-primary" />
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
          <Megaphone size={18} className="text-pos-primary" />
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
  return (
    <div>
      <SetupHeader
        kicker="Producer · Support"
        title="Tickets"
        copy="Support tickets submitted by tenant companies."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Open" value="0" hint="Awaiting response" />
        <SetupStat label="In progress" value="0" hint="Being handled" />
        <SetupStat label="Resolved" value="0" hint="Closed today" tone="accent" />
        <SetupStat label="Escalated" value="0" hint="Needs attention" />
      </div>
      <div className="rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm text-pos-ink-muted">
        <p>Tickets will appear here as companies submit support requests through their HQ dashboard.</p>
      </div>
    </div>
  );
}

function RequestsPage() {
  const { live } = useLivePos();
  return (
    <div>
      <SetupHeader
        kicker="Producer · Support"
        title="Customer requests"
        copy="Inbound support enquiries from company administrators and staff."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="New" value="0" hint="Unread requests" />
        <SetupStat label="Responded" value="0" hint="Answered today" tone="accent" />
        <SetupStat label="Pending" value="0" hint="Awaiting reply" />
        <SetupStat label="Avg. wait" value="—" hint="Response time" />
      </div>
      <div className="rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm text-pos-ink-muted">
        <p>Customer requests appear here from the support channels enabled on the platform.</p>
      </div>
    </div>
  );
}

function KnowledgePage() {
  const { live } = useLivePos();
  return (
    <div>
      <SetupHeader
        kicker="Producer · Support"
        title="Knowledge base"
        copy="Help articles, FAQs, and onboarding guides for tenants."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Articles" value="0" hint="Published" tone="accent" />
        <SetupStat label="Drafts" value="0" hint="In progress" />
        <SetupStat label="Views" value="0" hint="This month" />
        <SetupStat label="Helpful" value="—" hint="Rating" />
      </div>
      <div className="rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm text-pos-ink-muted">
        <p>Create help articles to reduce support volume and improve tenant onboarding.</p>
      </div>
    </div>
  );
}

function AnnouncementsPage() {
  const { live } = useLivePos();
  return (
    <div>
      <SetupHeader
        kicker="Producer · Support"
        title="Announcements"
        copy="Platform-wide messages and maintenance notices for all tenants."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Active" value="0" hint="Currently visible" />
        <SetupStat label="Scheduled" value="0" hint="Upcoming" />
        <SetupStat label="Past" value="0" hint="Expired" />
        <SetupStat label="Read rate" value="—" hint="Engagement" tone="accent" />
      </div>
      <div className="rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm text-pos-ink-muted">
        <p>Post announcements to inform all tenants about updates, maintenance, or new features.</p>
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
