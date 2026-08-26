"use client";

import { useEffect, useState } from "react";
import type { ConsoleAccount, ConsoleGroup } from "./access";
import { listAccounts, listGroups } from "./hq-api";

export type DirectoryAccount = Omit<ConsoleAccount, "password">;

type DirectoryEvent = {
  type: "directory";
  accounts: DirectoryAccount[];
  groups: ConsoleGroup[];
  at: string;
};

const LEGACY_KEYS = ["hq.groups.v1", "hq.accounts.v1"] as const;

function purgeLegacyDirectoryCache() {
  if (typeof window === "undefined") return;
  for (const key of LEGACY_KEYS) window.localStorage.removeItem(key);
}

export function useLiveDirectory() {
  const [accounts, setAccounts] = useState<DirectoryAccount[]>([]);
  const [groups, setGroups] = useState<ConsoleGroup[]>([]);
  const [live, setLive] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    purgeLegacyDirectoryCache();

    const source = new EventSource("/api/console/directory/stream");

    source.onopen = () => {
      if (!cancelled) setLive(true);
    };
    source.onerror = () => {
      if (!cancelled) setLive(false);
    };
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as DirectoryEvent;
        if (cancelled || payload.type !== "directory") return;
        if (Array.isArray(payload.accounts)) setAccounts(payload.accounts);
        if (Array.isArray(payload.groups)) setGroups(payload.groups);
        setReady(true);
      } catch {
        // ignore malformed frames
      }
    };

    void Promise.all([listAccounts(), listGroups()])
      .then(([nextAccounts, nextGroups]) => {
        if (cancelled) return;
        setAccounts(nextAccounts);
        setGroups(nextGroups);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
      source.close();
    };
  }, []);

  return { accounts, groups, live, ready, setAccounts, setGroups };
}
