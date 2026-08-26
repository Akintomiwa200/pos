"use client";

import { useEffect, useState } from "react";
import { listTills, type HqTill } from "./hq-api";
import {
  getCompany,
  listBranches,
  listStores,
  type HqBranch,
  type HqCompany,
  type HqStore,
} from "./hq-setup";

type PosEvent = {
  type: "pos";
  company?: HqCompany;
  tills: HqTill[];
  stores: HqStore[];
  branches: HqBranch[];
  at: string;
};

export function useLivePos() {
  const [company, setCompany] = useState<HqCompany | null>(null);
  const [tills, setTills] = useState<HqTill[]>([]);
  const [stores, setStores] = useState<HqStore[]>([]);
  const [branches, setBranches] = useState<HqBranch[]>([]);
  const [live, setLive] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const source = new EventSource("/api/console/pos/stream");

    source.onopen = () => {
      if (!cancelled) setLive(true);
    };
    source.onerror = () => {
      if (!cancelled) setLive(false);
    };
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as PosEvent;
        if (cancelled || payload.type !== "pos") return;
        if (payload.company) setCompany(payload.company);
        if (Array.isArray(payload.tills)) setTills(payload.tills);
        if (Array.isArray(payload.stores)) setStores(payload.stores);
        if (Array.isArray(payload.branches)) setBranches(payload.branches);
        setReady(true);
      } catch {
        // ignore malformed frames
      }
    };

    void Promise.all([getCompany(), listTills(), listStores(), listBranches()])
      .then(([nextCompany, nextTills, nextStores, nextBranches]) => {
        if (cancelled) return;
        setCompany(nextCompany);
        setTills(nextTills);
        setStores(nextStores);
        setBranches(nextBranches);
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

  return {
    company,
    tills,
    stores,
    branches,
    live,
    ready,
    setTills,
    setStores,
    setBranches,
  };
}
