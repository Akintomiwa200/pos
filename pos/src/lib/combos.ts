import { useEffect, useState } from "react";
import {
  SETTINGS_EVENT,
  loadStoreSettings,
  type StockMode,
} from "./store-settings";
import { apiUrl } from "./api-base";

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
  priceMinor: number;
  active: boolean;
  updatedAt: string;
  costMinorEach: number;
  /** How many complete sets can still be built from current stock. */
  availableSets: number;
  shortfall: Array<{
    itemId: string;
    name: string;
    missing: number;
    unit: string;
    unitLabel?: string;
  }>;
  margin: number;
};

type ComboPayload =
  | { type: "snapshot"; combos: ComboView[] }
  | { type: "updated"; combo: ComboView }
  | { type: "removed"; id: string };

const OFFLINE_KEY = "pos-offline-combos";
const OFFLINE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function readStockMode(): StockMode {
  return loadStoreSettings().stockMode;
}

function cacheOfflineCombos(combos: ComboView[]) {
  try {
    localStorage.setItem(OFFLINE_KEY, JSON.stringify({ at: Date.now(), combos }));
  } catch {
    // Storage can be full or blocked; offline simply has no snapshot.
  }
}

function readOfflineCombos(): ComboView[] {
  try {
    const raw = localStorage.getItem(OFFLINE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { at?: number; combos?: ComboView[] };
    if (!Array.isArray(parsed.combos) || typeof parsed.at !== "number") return [];
    if (Date.now() - parsed.at > OFFLINE_TTL_MS) return [];
    return parsed.combos;
  } catch {
    return [];
  }
}

/** Live combo (bundle) list from HQ, kept in sync over the combo SSE stream. */
export function useCombos() {
  const [combos, setCombos] = useState<ComboView[]>([]);
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
      setCombos(readOfflineCombos());
      setLive(false);
      return () => {
        cancelled = true;
      };
    }

    fetch(apiUrl("/api/combos"))
      .then((response) => {
        if (!response.ok) throw new Error(`Combo request failed (${response.status})`);
        return response.json() as Promise<ComboView[]>;
      })
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          setCombos(data);
          cacheOfflineCombos(data);
        }
      })
      .catch(() => {
        /* the stream snapshot reconciles once connected */
      });

    source = new EventSource(apiUrl("/api/combos/stream"));
    source.onopen = () => setLive(true);
    source.onerror = () => setLive(false);
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as ComboPayload;
        if (payload.type === "snapshot" && Array.isArray(payload.combos)) {
          setCombos(payload.combos);
          cacheOfflineCombos(payload.combos);
        }
        if (payload.type === "updated" && payload.combo) {
          setCombos((current) => {
            const index = current.findIndex((row) => row.id === payload.combo.id);
            const next =
              index === -1
                ? [...current, payload.combo]
                : [
                    ...current.slice(0, index),
                    payload.combo,
                    ...current.slice(index + 1),
                  ];
            cacheOfflineCombos(next);
            return next;
          });
        }
        if (payload.type === "removed" && payload.id) {
          setCombos((current) => {
            const next = current.filter((row) => row.id !== payload.id);
            cacheOfflineCombos(next);
            return next;
          });
        }
      } catch {
        /* ignore malformed frames */
      }
    };

    return () => {
      cancelled = true;
      source?.close();
    };
  }, [mode]);

  return { combos, live };
}
