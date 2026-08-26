"use client";

import {
  Wifi,
  WifiOff,
} from "lucide-react";
import { SetupHeader, SetupStat } from "@/components/setup/SetupChrome";
import { ManagerSkeleton } from "@/components/Skeleton";
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

function ApiDashboardPage() {
  const { live, ready } = useLivePos();
  if (!ready) return <ManagerSkeleton variant="table" />;

  return (
    <div>
      <SetupHeader
        kicker="Producer · Developer"
        title="API"
        copy="REST API overview and integration endpoints."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="API keys" value="0" hint="Active keys" tone="accent" />
        <SetupStat label="Calls today" value="0" hint="Total requests" />
        <SetupStat label="Webhooks" value="0" hint="Registered" />
        <SetupStat label="Apps" value="0" hint="Connected" />
      </div>
      <div className="space-y-4">
        <div className="rounded-[18px] border border-pos-border bg-pos-surface p-5">
          <div className="mb-3 text-[13px] font-semibold text-pos-ink">Base URL</div>
          <code className="block rounded-xl bg-pos-surface-muted px-3.5 py-2.5 text-[13px] text-pos-ink">
            {typeof window !== "undefined" ? window.location.origin : "https://pos-saas.com"}/api
          </code>
        </div>
        <div className="rounded-[18px] border border-pos-border bg-pos-surface p-5">
          <div className="mb-3 text-[13px] font-semibold text-pos-ink">Authentication</div>
          <p className="text-[13px] text-pos-ink-muted">
            All API requests require a Bearer token in the Authorization header. Generate API keys
            from the API keys page.
          </p>
        </div>
      </div>
    </div>
  );
}

function ApiKeysPage() {
  const { live } = useLivePos();
  return (
    <div>
      <SetupHeader
        kicker="Producer · Developer"
        title="API keys"
        copy="Manage API keys for external integrations."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Active" value="0" hint="Valid keys" tone="accent" />
        <SetupStat label="Revoked" value="0" hint="Inactive keys" />
        <SetupStat label="Expiring soon" value="0" hint="Within 30 days" />
        <SetupStat label="Total calls" value="0" hint="All keys combined" />
      </div>
      <div className="rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm text-pos-ink-muted">
        <p>Create API keys to allow external applications to access the platform API securely.</p>
      </div>
    </div>
  );
}

function WebhooksPage() {
  const { live } = useLivePos();
  return (
    <div>
      <SetupHeader
        kicker="Producer · Developer"
        title="Webhooks"
        copy="Event subscriptions for external service integration."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Active" value="0" hint="Registered webhooks" tone="accent" />
        <SetupStat label="Failed" value="0" hint="Delivery failures" />
        <SetupStat label="Events" value="0" hint="Total deliveries" />
        <SetupStat label="Avg. latency" value="—" hint="Response time" />
      </div>
      <div className="rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm text-pos-ink-muted">
        <p>Register webhook endpoints to receive real-time event notifications from the platform.</p>
      </div>
    </div>
  );
}

function ApplicationsPage() {
  const { live } = useLivePos();
  return (
    <div>
      <SetupHeader
        kicker="Producer · Developer"
        title="Applications"
        copy="Connected third-party applications and OAuth clients."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Connected" value="0" hint="Active apps" tone="accent" />
        <SetupStat label="Pending" value="0" hint="Awaiting approval" />
        <SetupStat label="Revoked" value="0" hint="Disconnected" />
        <SetupStat label="Scopes" value="—" hint="Total permissions" />
      </div>
      <div className="rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm text-pos-ink-muted">
        <p>Manage third-party applications that connect to the platform via OAuth.</p>
      </div>
    </div>
  );
}

function ApiLogsPage() {
  const { live } = useLivePos();
  return (
    <div>
      <SetupHeader
        kicker="Producer · Developer"
        title="API logs"
        copy="Request and response logs for API calls."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Today" value="0" hint="Total requests" tone="accent" />
        <SetupStat label="Errors" value="0" hint="4xx / 5xx responses" />
        <SetupStat label="Avg. latency" value="—" hint="Response time" />
        <SetupStat label="Bandwidth" value="0 KB" hint="Data transferred" />
      </div>
      <div className="rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm text-pos-ink-muted">
        <p>API logs capture request metadata for debugging and monitoring integrations.</p>
      </div>
    </div>
  );
}

export function DeveloperSection({ path }: { path: string }) {
  if (path === "/admin/developer/keys") return <ApiKeysPage />;
  if (path === "/admin/developer/webhooks") return <WebhooksPage />;
  if (path === "/admin/developer/apps") return <ApplicationsPage />;
  if (path === "/admin/developer/logs") return <ApiLogsPage />;
  return <ApiDashboardPage />;
}
