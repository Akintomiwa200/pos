"use client";

import { useEffect, useState } from "react";
import { listDocs, type DocKind, type TradeDoc } from "./hq-ops";

export type LiveOrdersEvent = {
  type: "snapshot";
  docs: TradeDoc[];
  at: string;
};

/** Real-time purchase documents (orders, invoices, returns) via SSE `/api/orders/stream`. */
export function useLiveOrders(kind?: DocKind) {
  const [docs, setDocs] = useState<TradeDoc[]>([]);
  const [live, setLive] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const source = new EventSource("/api/orders/stream");

    source.onopen = () => {
      if (!cancelled) setLive(true);
    };
    source.onerror = () => {
      if (!cancelled) setLive(false);
    };
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as LiveOrdersEvent;
        if (cancelled || payload.type !== "snapshot") return;
        setDocs(kind ? payload.docs.filter((doc) => doc.kind === kind) : payload.docs);
        setReady(true);
      } catch {
        // ignore malformed frames
      }
    };

    void listDocs(kind ?? "purchase-order")
      .then((rows) => {
        if (cancelled) return;
        setDocs(rows);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
      source.close();
    };
  }, [kind]);

  return { docs, live, ready, setDocs };
}

/** Real-time single purchase document, matched from the SSE stream by id. */
export function useLiveOrder(orderId: string, kind?: DocKind) {
  const { docs, live, ready } = useLiveOrders(kind);
  const doc = docs.find((row) => row.id === orderId) ?? null;
  return { doc, live, ready };
}