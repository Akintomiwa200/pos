import { useCallback, useEffect, useRef, useState } from "react";
import { ITEMS } from "./demo";
import {
  SETTINGS_EVENT,
  loadStoreSettings,
  type StockMode,
} from "./store-settings";
import type { CatalogItem } from "./types";
import { apiUrl } from "./api-base";

type CatalogPayload =
  | { type: "snapshot"; items: CatalogItem[] }
  | { type: "updated"; item: CatalogItem };

function readStockMode(): StockMode {
  return loadStoreSettings().stockMode;
}

export function useCatalog() {
  const [items, setItems] = useState<CatalogItem[]>(() =>
    readStockMode() === "online" ? [] : ITEMS,
  );
  const [live, setLive] = useState(false);
  const [mode, setMode] = useState<StockMode>(readStockMode);

  useEffect(() => {
    function syncMode() {
      setMode(readStockMode());
    }
    window.addEventListener(SETTINGS_EVENT, syncMode);
    window.addEventListener("storage", syncMode);
    return () => {
      window.removeEventListener(SETTINGS_EVENT, syncMode);
      window.removeEventListener("storage", syncMode);
    };
  }, []);

  useEffect(() => {
    let source: EventSource | null = null;
    let cancelled = false;

    if (mode === "offline") {
      setItems(ITEMS);
      setLive(false);
      return () => {
        cancelled = true;
      };
    }

    if (mode === "both") setItems(ITEMS);

    fetch(apiUrl("/api/catalog/items"))
      .then((response) => {
        if (!response.ok) throw new Error(`Catalog request failed (${response.status})`);
        return response.json() as Promise<CatalogItem[]>;
      })
      .then((data) => {
        if (!cancelled && Array.isArray(data) && data.length) setItems(data);
        else if (!cancelled && mode === "online") setItems([]);
      })
      .catch(() => {
        if (!cancelled && mode === "online") setItems([]);
      });

    source = new EventSource(apiUrl("/api/catalog/stream"));
    source.onopen = () => setLive(true);
    source.onerror = () => setLive(false);
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as CatalogPayload;
        if (payload.type === "snapshot" && Array.isArray(payload.items)) {
          setItems(payload.items);
        }
        if (payload.type === "updated" && payload.item) {
          setItems((current) => {
            const index = current.findIndex((item) => item.id === payload.item.id);
            if (index === -1) return [...current, payload.item];
            const next = current.slice();
            next[index] = payload.item;
            return next;
          });
        }
      } catch {
        // ignore malformed frames
      }
    };

    return () => {
      cancelled = true;
      source?.close();
    };
  }, [mode]);

  const updateItem = useCallback(
    async (id: string, patch: { priceMinor?: number; onHand?: number }) => {
      setItems((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, ...patch, updatedAt: new Date().toISOString() }
            : item,
        ),
      );
      if (readStockMode() === "offline") return;
      const response = await fetch(apiUrl(`/api/catalog/items/${id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!response.ok) {
        throw new Error("Could not save item");
      }
    },
    [],
  );

  const updatePrice = useCallback(
    (id: string, priceMinor: number) => updateItem(id, { priceMinor }),
    [updateItem],
  );

  const itemsRef = useRef(items);
  itemsRef.current = items;

  const adjustOnHand = useCallback((id: string, delta: number) => {
    if (!delta) return;
    const item = itemsRef.current.find((row) => row.id === id);
    if (!item) return;
    const onHand = Math.max(0, item.onHand + delta);
    setItems((current) =>
      current.map((row) =>
        row.id === id ? { ...row, onHand, updatedAt: new Date().toISOString() } : row,
      ),
    );
    if (readStockMode() === "offline") return;
    void fetch(apiUrl(`/api/catalog/items/${id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onHand }),
    }).catch(() => {
      /* SSE stream or next snapshot reconciles the true level */
    });
  }, []);

  /**
   * Apply every stock decrement from one sale in a single optimistic update,
   * then sync HQ with one bulk request (sequential PATCH fallback).
   */
  const applySaleDeltas = useCallback(
    (deltas: Array<{ itemId: string; delta: number }>) => {
      const usable = deltas.filter(({ delta }) => delta !== 0);
      if (!usable.length) return;
      setItems((current) => {
        const byId = new Map(usable.map(({ itemId, delta }) => [itemId, delta]));
        return current.map((row) => {
          const delta = byId.get(row.id);
          if (delta === undefined) return row;
          return {
            ...row,
            onHand: Math.max(0, row.onHand + delta),
            updatedAt: new Date().toISOString(),
          };
        });
      });
      if (readStockMode() === "offline") return;
      const payload = usable.map(({ itemId, delta }) => ({
        itemId,
        delta: -Math.abs(delta),
      }));
      void fetch(apiUrl("/api/catalog/stock/bulk"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deltas: payload }),
      }).catch(async () => {
        for (const { itemId, delta } of payload) {
          const item = itemsRef.current.find((row) => row.id === itemId);
          if (!item) continue;
          try {
            await fetch(apiUrl(`/api/catalog/items/${itemId}`), {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                onHand: Math.max(0, item.onHand + delta),
              }),
            });
          } catch {
            /* reconciled by the next snapshot */
          }
        }
      });
    },
    [],
  );

  return { items, live, updatePrice, updateItem, adjustOnHand, applySaleDeltas };
}

export function findCatalogItem(items: CatalogItem[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  return (
    items.find(
      (item) =>
        item.barcode.toLowerCase() === q ||
        item.sku.toLowerCase() === q ||
        item.id.toLowerCase() === q,
    ) ??
    items.find((item) => item.name.toLowerCase().includes(q)) ??
    null
  );
}

export function findCatalogByCode(items: CatalogItem[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  return (
    items.find(
      (item) =>
        item.barcode.toLowerCase() === q ||
        item.sku.toLowerCase() === q ||
        item.id.toLowerCase() === q,
    ) ?? null
  );
}

export async function lookupCatalog(query: string) {
  if (readStockMode() === "offline") return null;
  const response = await fetch(
    apiUrl(`/api/catalog/lookup?q=${encodeURIComponent(query.trim())}`),
  );
  if (!response.ok) return null;
  const body = (await response.json()) as { item?: CatalogItem | null };
  return body.item ?? null;
}
