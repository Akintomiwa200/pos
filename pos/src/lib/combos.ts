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

function readStockMode(): StockMode {
  return loadStoreSettings().stockMode;
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
      setCombos([]);
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
        if (!cancelled && Array.isArray(data)) setCombos(data);
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
        }
        if (payload.type === "updated" && payload.combo) {
          setCombos((current) => {
            const index = current.findIndex((row) => row.id === payload.combo.id);
            if (index === -1) return [...current, payload.combo];
            const next = current.slice();
            next[index] = payload.combo;
            return next;
          });
        }
        if (payload.type === "removed" && payload.id) {
          setCombos((current) => current.filter((row) => row.id !== payload.id));
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
