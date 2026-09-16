"use client";

import { useEffect, useState } from "react";
import {
  listMovements,
  listStockLevels,
  type StockLevel,
  type StockMovement,
} from "./hq-ops";

export type LiveInventoryEvent = {
  type: "snapshot";
  levels: StockLevel[];
  movements: StockMovement[];
  at: string;
};

/** Real-time stock levels + movements via SSE `/api/inventory/stream`. */
export function useLiveInventory() {
  const [levels, setLevels] = useState<StockLevel[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [live, setLive] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const source = new EventSource("/api/inventory/stream");

    source.onopen = () => {
      if (!cancelled) setLive(true);
    };
    source.onerror = () => {
      if (!cancelled) setLive(false);
    };
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as LiveInventoryEvent;
        if (cancelled || payload.type !== "snapshot") return;
        if (Array.isArray(payload.levels)) setLevels(payload.levels);
        if (Array.isArray(payload.movements)) setMovements(payload.movements);
        setReady(true);
      } catch {
        // ignore malformed frames
      }
    };

    void Promise.all([listStockLevels(), listMovements()])
      .then(([nextLevels, nextMovements]) => {
        if (cancelled) return;
        setLevels(nextLevels);
        setMovements(nextMovements);
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

  return { levels, movements, live, ready, setLevels, setMovements };
}