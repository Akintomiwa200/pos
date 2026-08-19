import { useEffect, useRef, useState } from "react";
import { apiUrl } from "./api";
import type { CatalogItem } from "./types";

type CatalogPayload =
  | { type: "snapshot"; items: CatalogItem[] }
  | { type: "updated"; item: CatalogItem };

export function useLiveCatalog() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [live, setLive] = useState(false);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let cancelled = false;
    const itemsUrl = apiUrl("/api/catalog/items");
    const streamUrl = apiUrl("/api/catalog/stream");

    fetch(itemsUrl)
      .then((response) => {
        if (!response.ok) throw new Error("Catalog request failed");
        return response.json();
      })
      .then((data: CatalogItem[]) => {
        if (!cancelled && Array.isArray(data)) setItems(data);
        if (!cancelled) setError("");
      })
      .catch(() => {
        if (!cancelled) setError("Cannot reach the POS server.");
      });

    const source = new EventSource(streamUrl);
    sourceRef.current = source;
    source.onopen = () => {
      if (!cancelled) {
        setLive(true);
        setError("");
      }
    };
    source.onerror = () => {
      if (!cancelled) setLive(false);
    };
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
        // ignore
      }
    };

    return () => {
      cancelled = true;
      source.close();
    };
  }, [tick]);

  function reconnect() {
    sourceRef.current?.close();
    setTick((value) => value + 1);
  }

  return { items, live, error, reconnect };
}

export function findItem(items: CatalogItem[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  return (
    items.find(
      (item) =>
        item.barcode.toLowerCase() === q ||
        item.sku.toLowerCase() === q ||
        item.id.toLowerCase() === q,
    ) ?? items.find((item) => item.name.toLowerCase().includes(q)) ?? null
  );
}
