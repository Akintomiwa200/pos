import { useCallback, useEffect, useState } from "react";
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
      .then((response) => response.json())
      .then((data: CatalogItem[]) => {
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

  const adjustOnHand = useCallback(
    (id: string, delta: number) => {
      setItems((current) => {
        const item = current.find((row) => row.id === id);
        if (!item) return current;
        const onHand = Math.max(0, item.onHand + delta);
        if (readStockMode() !== "offline") {
          void fetch(apiUrl(`/api/catalog/items/${id}`), {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ onHand }),
          });
        }
        return current.map((row) =>
          row.id === id
            ? { ...row, onHand, updatedAt: new Date().toISOString() }
            : row,
        );
      });
    },
    [],
  );

  return { items, live, updatePrice, updateItem, adjustOnHand };
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

export async function lookupCatalog(query: string) {
  if (readStockMode() === "offline") return null;
  const response = await fetch(
    apiUrl(`/api/catalog/lookup?q=${encodeURIComponent(query.trim())}`),
  );
  if (!response.ok) return null;
  const body = (await response.json()) as { item?: CatalogItem | null };
  return body.item ?? null;
}
