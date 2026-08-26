"use client";

import {
  Wifi,
  WifiOff,
} from "lucide-react";
import { SetupHeader, SetupStat } from "@/components/setup/SetupChrome";
import { ManagerSkeleton } from "@/components/Skeleton";
import { useLiveDirectory } from "@/lib/live-directory";
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

export function AdminActivityPage() {
  const { live, ready } = useLivePos();
  const { accounts, groups, ready: dirReady } = useLiveDirectory();
  if (!ready || !dirReady) return <ManagerSkeleton variant="table" />;

  const producerIds = new Set(
    groups.filter((g) => g.scope === "producer").map((g) => g.id),
  );
  const producerCount = accounts.filter((a) => producerIds.has(a.groupId)).length;

  return (
    <div>
      <SetupHeader
        kicker="Producer · Super Admin"
        title="Admin activity"
        copy="Recent actions by Super Admin staff across the platform."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Admins" value={String(producerCount)} hint="Super Admin accounts" tone="accent" />
        <SetupStat label="Today" value="0" hint="Actions logged" />
        <SetupStat label="This week" value="0" hint="All admin actions" />
        <SetupStat label="Roles" value={String(groups.filter((g) => g.scope === "producer").length)} hint="Admin roles defined" />
      </div>
      <div className="rounded-[18px] border border-pos-border bg-pos-surface p-5 text-sm text-pos-ink-muted">
        <p>Admin activity logs track actions performed by Super Admin staff for audit and compliance.</p>
      </div>
    </div>
  );
}
