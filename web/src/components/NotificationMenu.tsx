"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type HqNotice,
} from "../lib/hq-api";
import { NoticeSkeleton } from "./Skeleton";

function relativeTime(iso: string) {
  const delta = Date.now() - Date.parse(iso);
  if (!Number.isFinite(delta) || delta < 0) return "Just now";
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

export function NotificationMenu({ token }: { token: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<HqNotice[]>([]);
  const [ready, setReady] = useState(false);

  async function load() {
    const data = await listNotifications(token);
    setUnread(data.unread);
    setItems(data.items);
    setReady(true);
  }

  useEffect(() => {
    void load()
      .catch(() => undefined)
      .finally(() => setReady(true));
    const timer = window.setInterval(() => {
      void load().catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [token]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function openNotice(row: HqNotice) {
    if (!row.readAt) {
      await markNotificationRead(token, row.id).catch(() => undefined);
    }
    setOpen(false);
    router.push(row.href);
  }

  const badge = unread > 99 ? "99+" : String(unread);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="relative grid h-10 w-10 place-items-center rounded-xl bg-pos-surface text-pos-ink-muted shadow-pos-sm"
        aria-label={unread ? `${unread} unread notifications` : "Notifications"}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
          void load().catch(() => undefined);
        }}
      >
        <Bell size={18} strokeWidth={1.8} />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 grid min-w-[1.15rem] place-items-center rounded-full bg-pos-primary px-1 text-[10px] font-semibold leading-4 text-white">
            {badge}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 w-80 overflow-hidden rounded-2xl border border-pos-border bg-pos-surface py-1 shadow-pos-md"
        >
          <div className="flex items-center justify-between px-3 py-2">
            <p className="text-sm font-semibold text-pos-ink">Notifications</p>
            {unread > 0 ? (
              <button
                type="button"
                className="text-xs font-medium text-pos-primary"
                onClick={() => {
                  void markAllNotificationsRead(token)
                    .then(() => load())
                    .catch(() => undefined);
                }}
              >
                Mark all read
              </button>
            ) : null}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {!ready ? (
              <NoticeSkeleton />
            ) : items.length === 0 ? (
              <p className="px-3 py-4 text-sm text-pos-ink-muted">No notifications yet.</p>
            ) : (
              items.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  role="menuitem"
                  className="flex w-full gap-3 px-3 py-2.5 text-left hover:bg-pos-surface-muted"
                  onClick={() => void openNotice(row)}
                >
                  <span
                    className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                      row.readAt ? "bg-pos-border" : "bg-pos-primary"
                    }`}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-pos-ink">{row.title}</span>
                    <span className="mt-0.5 block text-xs text-pos-ink-muted">{row.body}</span>
                    <span className="mt-1 block text-[11px] text-pos-ink-faint">
                      {relativeTime(row.createdAt)}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
