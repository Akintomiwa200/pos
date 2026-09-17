"use client";

import { useEffect, useState } from "react";
import {
  listDirectory,
  type DirectoryName,
  type DirectoryRecord,
} from "./hq-directory";

type DirectoryRowsEvent = {
  type: "rows";
  name: DirectoryName;
  rows: DirectoryRecord[];
  at: string;
};

type PayloadListener = (payload: DirectoryRowsEvent) => void;
type LiveListener = (live: boolean) => void;

let source: EventSource | null = null;
let liveState = false;
const payloadListeners = new Set<PayloadListener>();
const liveListeners = new Set<LiveListener>();

function emitLive(next: boolean) {
  if (liveState === next) return;
  liveState = next;
  liveListeners.forEach((listener) => listener(next));
}

function ensureSource() {
  if (source || typeof window === "undefined") return;
  source = new EventSource("/api/directory/stream");
  source.onopen = () => emitLive(true);
  source.onerror = () => emitLive(false);
  source.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data) as DirectoryRowsEvent;
      payloadListeners.forEach((listener) => listener(payload));
    } catch {
      // ignore malformed frames
    }
  };
}

function releaseSource() {
  if (payloadListeners.size > 0) return;
  source?.close();
  source = null;
  emitLive(false);
}

function subscribePayload(listener: PayloadListener) {
  ensureSource();
  payloadListeners.add(listener);
  return () => {
    payloadListeners.delete(listener);
    releaseSource();
  };
}

function subscribeLive(listener: LiveListener) {
  liveListeners.add(listener);
  listener(liveState);
  return () => {
    liveListeners.delete(listener);
  };
}

export function useLiveDirectoryRows(name: DirectoryName) {
  const [rows, setRows] = useState<DirectoryRecord[]>([]);
  const [live, setLive] = useState(liveState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsubscribeLive = subscribeLive(setLive);
    const unsubscribe = subscribePayload((payload) => {
      if (payload.type !== "rows" || payload.name !== name) return;
      if (Array.isArray(payload.rows)) {
        setRows(payload.rows);
        setReady(true);
      }
    });

    let cancelled = false;
    void listDirectory(name)
      .then((next) => {
        if (cancelled) return;
        setRows(next);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
      unsubscribe();
      unsubscribeLive();
    };
  }, [name]);

  return { rows, live, ready, setRows };
}
