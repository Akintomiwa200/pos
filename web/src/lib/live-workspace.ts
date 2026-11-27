import { useCallback, useEffect, useRef, useState } from "react";
import { SESSION_KEY } from "./access";
import type { CrmEvent, CrmSnapshot } from "./hq-crm";
import type { ChatConversation, ChatEvent, ChatMessage, ChatPresence, CallSignal } from "./hq-chat";

function chatSessionToken() {
  if (typeof window === "undefined") return "";
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as { token?: string }).token ?? "" : "";
  } catch {
    return "";
  }
}

function applyCrmEvent(current: CrmSnapshot, event: CrmEvent): CrmSnapshot {
  if (event.type === "snapshot") return event.data;

  const next = { ...current };
  const upsert = <T extends { id: string }>(list: T[], row: T, action: string) => {
    if (action === "deleted") return list.filter((item) => item.id !== row.id);
    const idx = list.findIndex((item) => item.id === row.id);
    if (idx === -1) return [...list, row];
    const copy = list.slice();
    copy[idx] = row;
    return copy;
  };

  switch (event.type) {
    case "contact":
      next.contacts = upsert(next.contacts, event.contact, event.action);
      break;
    case "deal":
      next.deals = upsert(next.deals, event.deal, event.action);
      break;
    case "ticket":
      next.tickets = upsert(next.tickets, event.ticket, event.action);
      break;
    case "activity":
      next.activities = upsert(next.activities, event.activity, event.action);
      break;
    case "project":
      next.projects = upsert(next.projects, event.project, event.action);
      break;
    case "issue":
      next.issues = upsert(next.issues, event.issue, event.action);
      break;
    case "comment":
      next.issueComments = [...next.issueComments, event.comment];
      break;
  }
  return next;
}

const emptySnapshot = (): CrmSnapshot => ({
  contacts: [],
  deals: [],
  tickets: [],
  activities: [],
  projects: [],
  issues: [],
  issueComments: [],
});

export function useLiveCrm() {
  const [data, setData] = useState<CrmSnapshot>(emptySnapshot);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const source = new EventSource("/api/crm/stream");

    source.onopen = () => {
      if (!cancelled) setLive(true);
    };
    source.onerror = () => {
      if (!cancelled) setLive(false);
    };
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as CrmEvent;
        if (!cancelled) {
          setData((current) => applyCrmEvent(current, payload));
        }
      } catch {
        // ignore malformed frames
      }
    };

    return () => {
      cancelled = true;
      source.close();
    };
  }, []);

  return { ...data, live, setData };
}

export type TypingState = {
  conversationId: string;
  name: string;
  state: "on" | "off";
  at: string;
};

export function useLiveChat(opts?: {
  viewerId?: string;
  viewerName?: string;
  onMessage?: (conversationId: string, message: ChatMessage) => void;
  onCall?: (conversationId: string, signal: CallSignal, at: string) => void;
}) {
  const viewerId = opts?.viewerId ?? "";
  const viewerName = opts?.viewerName ?? "";
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [live, setLive] = useState(false);
  const [typing, setTyping] = useState<Record<string, TypingState>>({});
  const [presenceMap, setPresenceMap] = useState<Record<string, ChatPresence>>({});
  const typingTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const onMessage = opts?.onMessage;
  const onCall = opts?.onCall;
  const onMessageRef = useRef(onMessage);
  const onCallRef = useRef(onCall);
  onMessageRef.current = onMessage;
  onCallRef.current = onCall;

  const clearTyping = useCallback((conversationId: string) => {
    const timer = typingTimersRef.current[conversationId];
    if (timer) clearTimeout(timer);
    delete typingTimersRef.current[conversationId];
    setTyping((prev) => {
      if (!(conversationId in prev)) return prev;
      const next = { ...prev };
      delete next[conversationId];
      return next;
    });
  }, []);

  useEffect(() => {
    if (!viewerId) return;
    let cancelled = false;
    Object.values(typingTimersRef.current).forEach(clearTimeout);
    typingTimersRef.current = {};
    setConversations([]);
    setTyping({});
    setPresenceMap({});
    const source = new EventSource(
      `/api/chat/stream?viewerId=${encodeURIComponent(viewerId)}&token=${encodeURIComponent(chatSessionToken())}`,
    );

    source.onopen = () => {
      if (!cancelled) setLive(true);
    };
    source.onerror = () => {
      if (!cancelled) setLive(false);
    };
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as ChatEvent;
        if (cancelled) return;

        if (payload.type === "snapshot") {
          Object.values(typingTimersRef.current).forEach(clearTimeout);
          typingTimersRef.current = {};
          setTyping({});
          setConversations(payload.conversations);
          setPresenceMap(
            Object.fromEntries(
              payload.presence.map((p) => [p.accountId, p] as const),
            ),
          );
          return;
        }

        if (payload.type === "message") {
          // A message replaces any "typing" state for the same conversation.
          clearTyping(payload.message.conversationId);
          setConversations((rows) => {
            const idx = rows.findIndex((r) => r.id === payload.conversation.id);
            if (idx === -1) return [payload.conversation, ...rows];
            const next = rows.slice();
            next[idx] = payload.conversation;
            return next.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
          });
          onMessageRef.current?.(payload.message.conversationId, payload.message);
          return;
        }

        if (payload.type === "conversation") {
          setConversations((rows) => {
            const exists = rows.some((r) => r.id === payload.conversation.id);
            if (payload.action === "created" && !exists) {
              return [payload.conversation, ...rows].sort(
                (a, b) => b.updatedAt.localeCompare(a.updatedAt),
              );
            }
            const idx = rows.findIndex((r) => r.id === payload.conversation.id);
            if (idx === -1) return rows;
            const next = rows.slice();
            next[idx] = payload.conversation;
            return next.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
          });
          return;
        }

        if (payload.type === "typing") {
          // Defensive: the server hides self-typing, but an older backend or a
          // replayed frame must never show "You are typing".
          const isSelf =
            (Boolean(payload.senderId) && payload.senderId === viewerId) ||
            (!payload.senderId && Boolean(viewerName) && payload.name === viewerName);
          if (isSelf) return;
          const { conversationId, name, state, at } = payload;
          if (state === "off") {
            clearTyping(conversationId);
            return;
          }
          const timer = typingTimersRef.current[conversationId];
          if (timer) clearTimeout(timer);
          delete typingTimersRef.current[conversationId];

          setTyping((prev) => ({ ...prev, [conversationId]: { conversationId, name, state, at } }));

          // Typing stops naturally if the peer closes the tab or loses the
          // stream before sending an explicit "off".
          if (state === "on") {
            typingTimersRef.current[conversationId] = setTimeout(() => {
              delete typingTimersRef.current[conversationId];
              setTyping((prev) => {
                if (prev[conversationId]?.at !== at) return prev;
                const next = { ...prev };
                delete next[conversationId];
                return next;
              });
            }, 4_000);
          }
          return;
        }

        if (payload.type === "call") {
          onCallRef.current?.(payload.conversationId, payload.signal, payload.at);
          return;
        }

        if (payload.type === "presence") {
          setPresenceMap(
            Object.fromEntries(
              payload.presence.map((p) => [p.accountId, p] as const),
            ),
          );
        }
      } catch {
        // ignore malformed frames
      }
    };

    return () => {
      cancelled = true;
      source.close();
      Object.values(typingTimersRef.current).forEach(clearTimeout);
      typingTimersRef.current = {};
    };
  }, [viewerId, viewerName, clearTyping]);

  return { conversations, setConversations, live, typing, presenceMap };
}