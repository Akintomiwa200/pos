"use client";

import { useEffect, useState } from "react";
import { api } from "./hq-api";

export type ComboComponentView = {
  itemId: string;
  name: string;
  quantity: number;
  unit: string;
  unitLabel?: string;
};

export type ComboView = {
  id: string;
  name: string;
  description?: string;
  components: ComboComponentView[];
  costMinorEach: number;
  availableSets: number;
  shortfall: Array<{
    itemId: string;
    name: string;
    missing: number;
    unit: string;
    unitLabel?: string;
  }>;
  priceMinor: number;
  margin: number;
  active: boolean;
  updatedAt: string;
};

export type ComboInput = {
  id?: string;
  name: string;
  description?: string;
  components: Array<{ itemId: string; quantity: number }>;
  priceMinor: number;
  active: boolean;
};

type ComboPayload =
  | { type: "snapshot"; combos: ComboView[] }
  | { type: "updated"; combo: ComboView }
  | { type: "removed"; id: string };

function applyPayload(current: ComboView[], payload: ComboPayload): ComboView[] {
  if (payload.type === "snapshot" && Array.isArray(payload.combos)) {
    return payload.combos;
  }
  if (payload.type === "updated" && payload.combo) {
    const index = current.findIndex((combo) => combo.id === payload.combo.id);
    if (index === -1) return [...current, payload.combo];
    const next = current.slice();
    next[index] = payload.combo;
    return next;
  }
  if (payload.type === "removed" && payload.id) {
    return current.filter((combo) => combo.id !== payload.id);
  }
  return current;
}

export async function listCombos(): Promise<ComboView[]> {
  try {
    return await api<ComboView[]>("/api/combos");
  } catch {
    return [];
  }
}

export function createCombo(input: ComboInput) {
  return api<ComboView>("/api/combos", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateCombo(id: string, input: ComboInput) {
  return api<ComboView>(`/api/combos/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteCombo(id: string) {
  return api<{ ok: true; id: string }>(
    `/api/combos/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}

export function useLiveCombos() {
  const [combos, setCombos] = useState<ComboView[]>([]);
  const [live, setLive] = useState(false);

  function removeCombo(id: string) {
    setCombos((current) => current.filter((combo) => combo.id !== id));
  }

  useEffect(() => {
    const source = new EventSource("/api/combos/stream");
    source.onopen = () => setLive(true);
    source.onerror = () => setLive(false);
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as ComboPayload;
        setCombos((current) => applyPayload(current, payload));
      } catch {
        // ignore malformed frames
      }
    };
    return () => source.close();
  }, []);

  return { combos, setCombos, live, removeCombo };
}