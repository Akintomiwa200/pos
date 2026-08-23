"use client";

import { useEffect, useState } from "react";
import type { ChatConversation, ChatEvent, ChatMessage } from "./hq-chat";
import type { CrmEvent, CrmSnapshot } from "./hq-crm";

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

export function useLiveChat(onMessage?: (conversationId: string, message: ChatMessage) => void) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const source = new EventSource("/api/chat/stream");

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
          setConversations(payload.conversations);
          return;
        }
        if (payload.type === "message") {
          setConversations((rows) => {
            const idx = rows.findIndex((r) => r.id === payload.conversation.id);
            if (idx === -1) return [payload.conversation, ...rows];
            const next = rows.slice();
            next[idx] = payload.conversation;
            return next.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
          });
          onMessage?.(payload.message.conversationId, payload.message);
          return;
        }
        if (payload.type === "conversation") {
          setConversations((rows) => {
            const idx = rows.findIndex((r) => r.id === payload.conversation.id);
            if (idx === -1) return rows;
            const next = rows.slice();
            next[idx] = payload.conversation;
            return next;
          });
        }
      } catch {
        // ignore malformed frames
      }
    };

    return () => {
      cancelled = true;
      source.close();
    };
  }, [onMessage]);

  return { conversations, setConversations, live };
}
