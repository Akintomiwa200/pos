"use client";

import { useEffect, useState } from "react";
import { api } from "./hq-api";
import type { DayReport } from "./hq-ops";

export type AuditCashier = {
  name: string;
  tickets: number;
  totalMinor: number;
  lastAt: string;
};

export type AuditTicket = {
  ticketId: string;
  paidAt: string;
  tender: string;
  cashierName: string;
  totalMinor: number;
  lines: number;
  units: number;
};

export type AuditException = {
  id: string;
  at: string;
  kind: "zero" | "high" | "no-lines" | "refund-like";
  ticketId: string;
  detail: string;
  amountMinor: number;
};

export type AuditSnapshot = {
  day: string;
  updatedAt: string;
  x: DayReport;
  z: DayReport;
  tickets: AuditTicket[];
  cashiers: AuditCashier[];
  exceptions: AuditException[];
  avgTicketMinor: number;
  unitsSold: number;
};

type AuditEvent =
  | { type: "snapshot"; data: AuditSnapshot }
  | { type: "ping"; at: string };

const emptySnapshot = (): AuditSnapshot => ({
  day: new Date().toISOString().slice(0, 10),
  updatedAt: new Date().toISOString(),
  x: {
    kind: "X",
    day: new Date().toISOString().slice(0, 10),
    netMinor: 0,
    transactions: 0,
    cashExpectedMinor: 0,
    tenders: [],
  },
  z: {
    kind: "Z",
    day: new Date().toISOString().slice(0, 10),
    netMinor: 0,
    transactions: 0,
    cashExpectedMinor: 0,
    tenders: [],
    closed: false,
  },
  tickets: [],
  cashiers: [],
  exceptions: [],
  avgTicketMinor: 0,
  unitsSold: 0,
});

export async function fetchAuditSnapshot(day?: string) {
  return api<AuditSnapshot>(`/api/reports/audit${day ? `?day=${encodeURIComponent(day)}` : ""}`);
}

export function useLiveAudit() {
  const [data, setData] = useState<AuditSnapshot>(emptySnapshot);
  const [live, setLive] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const source = new EventSource("/api/reports/audit/stream");

    source.onopen = () => {
      if (!cancelled) setLive(true);
    };
    source.onerror = () => {
      if (!cancelled) setLive(false);
    };
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as AuditEvent;
        if (cancelled) return;
        if (payload.type === "snapshot" && payload.data) {
          setData(payload.data);
          setReady(true);
        }
      } catch {
        // ignore malformed frames
      }
    };

    fetchAuditSnapshot()
      .then((snapshot) => {
        if (!cancelled) {
          setData(snapshot);
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
      source.close();
    };
  }, []);

  return { data, live, ready, setData };
}
