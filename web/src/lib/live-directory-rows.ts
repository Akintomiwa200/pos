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

export function useLiveDirectoryRows(name: DirectoryName) {
  const [rows, setRows] = useState<DirectoryRecord[]>([]);
  const [live, setLive] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const source = new EventSource("/api/directory/stream");

    source.onopen = () => {
      if (!cancelled) setLive(true);
    };
    source.onerror = () => {
      if (!cancelled) setLive(false);
    };
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as DirectoryRowsEvent;
        if (cancelled || payload.type !== "rows" || payload.name !== name) return;
        if (Array.isArray(payload.rows)) {
          setRows(payload.rows);
          setReady(true);
        }
      } catch {
        // ignore malformed frames
      }
    };

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
      source.close();
    };
  }, [name]);

  return { rows, live, ready, setRows };
}