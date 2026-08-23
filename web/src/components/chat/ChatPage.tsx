"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Paperclip,
  Search,
  SendHorizontal,
  Smile,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { naira } from "@/lib/hq-ops";
import {
  getChatThread,
  listChatConversations,
  patchChatConversation,
  sendChatMessage,
  type ChatConversation,
  type ChatMessage,
} from "@/lib/hq-chat";
import { useLiveChat } from "@/lib/live-workspace";
import { ManagerSkeleton } from "../Skeleton";

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.round(diff / 60_000));
  if (mins < 1) return "Active";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString("en-NG", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function dayLabel(iso: string) {
  const day = new Date(iso);
  const today = new Date();
  if (day.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (day.toDateString() === yesterday.toDateString()) return "Yesterday";
  return day.toLocaleDateString("en-NG", { weekday: "long" });
}

function Avatar({
  name,
  src,
  size = 44,
}: {
  name: string;
  src?: string;
  size?: number;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full bg-pos-primary-soft text-pos-primary"
      style={{ width: size, height: size }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="grid h-full w-full place-items-center text-xs font-semibold">
          {initials}
        </span>
      )}
    </div>
  );
}

export function ChatPage() {
  const activeIdRef = useRef<string | null>(null);
  const onLiveMessage = useCallback((conversationId: string, message: ChatMessage) => {
    if (conversationId === activeIdRef.current) {
      setMessages((current) =>
        current.some((m) => m.id === message.id) ? current : [...current, message],
      );
    }
  }, []);

  const { conversations, setConversations, live } = useLiveChat(onLiveMessage);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [active, setActive] = useState<ChatConversation | null>(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState(false);
  const [openPurchased, setOpenPurchased] = useState(true);
  const [openOrders, setOpenOrders] = useState(false);
  const [openBuy, setOpenBuy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  async function loadList(preferId?: string) {
    let rows = conversations;
    if (!rows.length) {
      rows = await listChatConversations();
      setConversations(rows);
    }
    const nextId = preferId ?? activeId ?? rows[0]?.id ?? null;
    if (nextId) await openThread(nextId, rows);
    setReady(true);
  }

  async function openThread(id: string, list = conversations) {
    setActiveId(id);
    const thread = await getChatThread(id);
    setActive(thread.conversation);
    setMessages(thread.messages);
    const fromList = list.find((row) => row.id === id);
    if (fromList) {
      setConversations((current) =>
        current.map((row) => (row.id === id ? { ...row, ...thread.conversation } : row)),
      );
    }
  }

  useEffect(() => {
    loadList().catch((err) => {
      toast.error(err, "Could not load chat.");
      setReady(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((row) =>
      [row.name, row.preview].some((value) => value.toLowerCase().includes(query)),
    );
  }, [conversations, search]);

  const messageGroups = useMemo(() => {
    const groups: Array<{ label: string; items: ChatMessage[] }> = [];
    for (const message of messages) {
      const label = dayLabel(message.at);
      const last = groups[groups.length - 1];
      if (last?.label === label) last.items.push(message);
      else groups.push({ label, items: [message] });
    }
    return groups;
  }, [messages]);

  async function onSend() {
    if (!activeId || !draft.trim() || busy) return;
    setBusy(true);
    try {
      const message = await sendChatMessage(activeId, draft.trim());
      setMessages((current) => [...current, message]);
      setDraft("");
      setConversations((current) =>
        current
          .map((row) =>
            row.id === activeId
              ? { ...row, preview: message.body, updatedAt: message.at, active: true }
              : row,
          )
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      );
      setTyping(true);
      window.setTimeout(() => setTyping(false), 1800);
    } catch (err) {
      toast.error(err, "Could not send message.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <ManagerSkeleton variant="table" />;

  return (
    <div className="-mx-4 -mb-4 flex h-[calc(100svh-7.5rem)] min-h-[560px] overflow-hidden rounded-[28px] bg-pos-surface shadow-pos-md sm:-mx-0 lg:h-[calc(100svh-8.5rem)]">
      {/* Inbox */}
      <aside className="flex w-full max-w-[320px] shrink-0 flex-col border-r border-pos-border/70 bg-pos-surface">
        <div className="p-4">
          <div className="flex items-center gap-2 rounded-full bg-pos-surface-muted px-3.5 py-2.5">
            <Search size={16} className="shrink-0 text-pos-ink-faint" />
            <input
              className="w-full bg-transparent text-sm text-pos-ink outline-none placeholder:text-pos-ink-faint"
              placeholder="Search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {filtered.map((row) => {
            const selected = row.id === activeId;
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => void openThread(row.id).catch((err) => toast.error(err, "Could not open chat."))}
                className={`mb-1 flex w-full items-start gap-3 rounded-[18px] px-3 py-3 text-left transition ${
                  selected
                    ? "bg-pos-primary-soft"
                    : "hover:bg-pos-surface-muted"
                }`}
              >
                <Avatar name={row.name} src={row.avatar} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-pos-ink">{row.name}</p>
                    <span
                      className={`shrink-0 text-[11px] font-medium ${
                        row.active && relativeTime(row.updatedAt) === "Active"
                          ? "text-pos-success"
                          : "text-pos-ink-faint"
                      }`}
                    >
                      {relativeTime(row.updatedAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[12px] text-pos-ink-muted">{row.preview}</p>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Thread */}
      <section className="flex min-w-0 flex-1 flex-col bg-pos-bg/40">
        {active ? (
          <>
            <header className="flex items-center gap-3 border-b border-pos-border/70 bg-pos-surface px-5 py-4">
              <Avatar name={active.name} src={active.avatar} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-pos-ink">{active.name}</p>
                <p className="text-[12px] text-pos-ink-faint">
                  {typing ? "Typing…" : active.active ? "Active now" : relativeTime(active.updatedAt)}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-pos-ink-faint">
                <span
                  className={`h-2 w-2 rounded-full ${live ? "bg-pos-success animate-pulse" : "bg-pos-ink-faint/40"}`}
                />
                {live ? "Live" : "Offline"}
              </span>
            </header>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
              {messageGroups.map((group) => (
                <div key={group.label}>
                  <div className="mb-4 flex justify-center">
                    <span className="rounded-full bg-pos-surface-muted px-3 py-1 text-[11px] font-medium text-pos-ink-faint">
                      {group.label}
                    </span>
                  </div>
                  <div className="space-y-4">
                    {group.items.map((message) => {
                      const mine = message.sender === "staff";
                      return (
                        <div
                          key={message.id}
                          className={`flex ${mine ? "justify-end" : "justify-start"}`}
                        >
                          <div className={`max-w-[78%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                            <div
                              className={`mb-1.5 flex items-center gap-2 text-[11px] text-pos-ink-faint ${
                                mine ? "flex-row-reverse" : ""
                              }`}
                            >
                              <Avatar
                                name={message.senderName}
                                src={mine ? undefined : active.avatar}
                                size={22}
                              />
                              <span className="font-medium text-pos-ink-muted">
                                {mine ? "You" : message.senderName}
                              </span>
                              <span>{clock(message.at)}</span>
                            </div>
                            <div
                              className={`rounded-[18px] px-4 py-2.5 text-sm leading-relaxed ${
                                mine
                                  ? "rounded-br-md bg-pos-primary text-white"
                                  : "rounded-bl-md bg-pos-surface text-pos-ink shadow-pos-sm"
                              }`}
                            >
                              {message.body}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {typing ? (
                <p className="text-[12px] text-pos-ink-faint">{active.name} is typing…</p>
              ) : null}
              <div ref={bottomRef} />
            </div>

            <footer className="border-t border-pos-border/70 bg-pos-surface px-4 py-3">
              <div className="flex items-center gap-2 rounded-full bg-pos-surface-muted px-3 py-2">
                <button type="button" className="rounded-full p-1.5 text-pos-ink-faint hover:text-pos-ink">
                  <Smile size={18} />
                </button>
                <input
                  className="min-w-0 flex-1 bg-transparent text-sm text-pos-ink outline-none placeholder:text-pos-ink-faint"
                  placeholder="Type a Message"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void onSend();
                    }
                  }}
                />
                <button type="button" className="rounded-full p-1.5 text-pos-ink-faint hover:text-pos-ink">
                  <Paperclip size={18} />
                </button>
                <button
                  type="button"
                  disabled={busy || !draft.trim()}
                  onClick={() => void onSend()}
                  className="grid h-9 w-9 place-items-center rounded-full bg-pos-primary text-white shadow-pos-primary transition hover:opacity-90 disabled:opacity-50"
                >
                  <SendHorizontal size={16} />
                </button>
              </div>
            </footer>
          </>
        ) : (
          <div className="grid flex-1 place-items-center text-sm text-pos-ink-faint">
            Select a conversation
          </div>
        )}
      </section>

      {/* Profile */}
      <aside className="hidden w-[300px] shrink-0 flex-col border-l border-pos-border/70 bg-pos-surface xl:flex">
        {active ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5">
            <div className="flex flex-col items-center text-center">
              <Avatar name={active.name} src={active.avatar} size={88} />
              <h2 className="mt-3 text-lg font-semibold text-pos-ink">{active.name}</h2>
              <p className="mt-1 text-xs text-pos-ink-faint">
                {active.locationEnabled ? active.location || "Location on" : "Location hidden"}
              </p>
            </div>

            <div className="mt-8 divide-y divide-pos-border/60">
              <div className="flex items-center justify-between py-3.5">
                <span className="text-sm font-medium text-pos-ink">Location</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={active.locationEnabled}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    active.locationEnabled ? "bg-pos-primary" : "bg-pos-border"
                  }`}
                  onClick={async () => {
                    try {
                      const next = await patchChatConversation(active.id, {
                        locationEnabled: !active.locationEnabled,
                      });
                      setActive(next);
                      setConversations((current) =>
                        current.map((row) => (row.id === next.id ? { ...row, ...next } : row)),
                      );
                    } catch (err) {
                      toast.error(err, "Could not update location.");
                    }
                  }}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                      active.locationEnabled ? "right-0.5" : "left-0.5"
                    }`}
                  />
                </button>
              </div>

              <button
                type="button"
                className="flex w-full items-center justify-between py-3.5 text-left"
                onClick={() => setOpenOrders((value) => !value)}
              >
                <span className="text-sm font-medium text-pos-ink">Total Order</span>
                {openOrders ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {openOrders ? (
                <p className="pb-3 text-sm tabular-nums text-pos-ink-muted">
                  {active.totalOrders.toLocaleString()} orders
                </p>
              ) : null}

              <button
                type="button"
                className="flex w-full items-center justify-between py-3.5 text-left"
                onClick={() => setOpenBuy((value) => !value)}
              >
                <span className="text-sm font-medium text-pos-ink">Total Buy</span>
                {openBuy ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {openBuy ? (
                <p className="pb-3 text-sm tabular-nums text-pos-ink-muted">
                  {naira(active.totalBuyMinor)}
                </p>
              ) : null}

              <button
                type="button"
                className="flex w-full items-center justify-between py-3.5 text-left"
                onClick={() => setOpenPurchased((value) => !value)}
              >
                <span className="text-sm font-medium text-pos-ink">Purchased</span>
                {openPurchased ? (
                  <ChevronUp size={16} className="text-pos-primary" />
                ) : (
                  <ChevronDown size={16} />
                )}
              </button>
              {openPurchased ? (
                <div className="grid grid-cols-3 gap-2 pb-2">
                  {active.purchased.length === 0 ? (
                    <p className="col-span-3 text-sm text-pos-ink-faint">No purchases linked.</p>
                  ) : (
                    active.purchased.map((item) => (
                      <div
                        key={item.id}
                        className="aspect-square overflow-hidden rounded-2xl bg-pos-surface-muted"
                        title={item.name}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                      </div>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
