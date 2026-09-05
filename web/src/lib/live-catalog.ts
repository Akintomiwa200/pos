"use client";

import { useEffect, useState } from "react";
import type { HqCatalogItem } from "./hq-api";

type CatalogPayload =
  | { type: "snapshot"; items: HqCatalogItem[] }
  | { type: "updated"; item: HqCatalogItem }
  | { type: "removed"; id: string };

function applyPayload(
  current: HqCatalogItem[],
  payload: CatalogPayload,
): HqCatalogItem[] {
  if (payload.type === "snapshot" && Array.isArray(payload.items)) {
    return payload.items;
  }
  if (payload.type === "updated" && payload.item) {
    const index = current.findIndex((item) => item.id === payload.item.id);
    if (index === -1) return [...current, payload.item];
    const next = current.slice();
    next[index] = payload.item;
    return next;
  }
  if (payload.type === "removed" && payload.id) {
    return current.filter((item) => item.id !== payload.id);
  }
  return current;
}

export function useLiveCatalog() {
  const [items, setItems] = useState<HqCatalogItem[]>([]);
  const [live, setLive] = useState(false);

  function removeItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  useEffect(() => {
    let cancelled = false;
    const source = new EventSource("/api/catalog/stream");

    source.onopen = () => {
      if (!cancelled) setLive(true);
    };
    source.onerror = () => {
      if (!cancelled) setLive(false);
    };
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as CatalogPayload;
        if (!cancelled) {
          setItems((current) => applyPayload(current, payload));
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

  return { items, setItems, live, removeItem };
}

export function syncStockLevelsFromCatalog<
  T extends {
    itemId: string;
    onHand: number;
    unit?: string;
    unitLabel?: string;
    packSize?: number;
  },
>(levels: T[], catalog: HqCatalogItem[]): T[] {
  const byId = new Map(catalog.map((item) => [item.id, item] as const));
  return levels.map((row) => {
    const item = byId.get(row.itemId);
    if (!item) return row;
    return {
      ...row,
      onHand: item.onHand,
      unit: item.unit,
      unitLabel: item.unitLabel,
      packSize: item.packSize ?? 1,
    };
  });
}
