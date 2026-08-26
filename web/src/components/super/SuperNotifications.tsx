"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listNotifications, markNotificationRead, type HqNotice } from "@/lib/hq-api";
import { useAuth } from "@/components/AuthProvider";
import { ManagerSkeleton } from "@/components/Skeleton";
import { SetupHeader } from "@/components/setup/SetupChrome";

export function SuperNotifications() {
  const router = useRouter();
  const { session } = useAuth();
  const [items, setItems] = useState<HqNotice[]>([]);
  const [unread, setUnread] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!session?.token) return;
    listNotifications(session.token)
      .then((data) => {
        setItems(data.items);
        setUnread(data.unread);
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, [session?.token]);

  if (!ready) return <ManagerSkeleton variant="list" />;

  return (
    <div>
      <SetupHeader
        kicker="Producer · Main"
        title="Notifications"
        copy={`${unread} unread. These are platform notices — company HQ has its own feed.`}
      />
      <ul className="rounded-[18px] border border-pos-border bg-pos-surface">
        {items.length === 0 ? (
          <li className="px-5 py-8 text-sm text-pos-ink-muted">No notifications yet.</li>
        ) : (
          items.map((row) => (
            <li key={row.id} className="border-b border-pos-border/60 last:border-0">
              <button
                type="button"
                className="flex w-full flex-col items-start px-5 py-3 text-left hover:bg-pos-surface-muted"
                onClick={async () => {
                  if (session?.token && !row.readAt) {
                    await markNotificationRead(session.token, row.id).catch(() => undefined);
                  }
                  if (row.href) router.push(row.href.startsWith("/setup") ? "/admin/companies" : row.href);
                }}
              >
                <span className="font-medium">{row.title}</span>
                <span className="mt-1 text-[13px] text-pos-ink-muted">{row.body}</span>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
