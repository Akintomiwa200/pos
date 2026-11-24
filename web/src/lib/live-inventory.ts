"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { readSession } from "./hq-api";
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
  companyId?: string | null;
  at: string;
};

type LiveInventoryState = {
  levels: StockLevel[];
  movements: StockMovement[];
  live: boolean;
  ready: boolean;
};

const EMPTY_STATE: LiveInventoryState = {
  levels: [],
  movements: [],
  live: false,
  ready: false,
};
const FALLBACK_DELAY_MS = 1500;
let nextConsumerId = 1;

/**
 * One authenticated inventory stream is shared by every component on the page.
 * REST snapshots only fill in when the stream is slow or fails, and version
 * checks stop a late REST response from overwriting newer live data.
 */
class LiveInventoryStore {
  private state: LiveInventoryState = EMPTY_STATE;
  private readonly listeners = new Set<() => void>();
  private readonly consumers = new Map<number, string>();
  private source: EventSource | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private token = "";
  private version = 0;
  private fallbackStarted = false;
  private refreshPromise: Promise<void> | null = null;

  getSnapshot = () => this.state;

  getServerSnapshot = () => EMPTY_STATE;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private emit(patch: Partial<LiveInventoryState>) {
    const next = { ...this.state, ...patch };
    if (
      next.levels === this.state.levels &&
      next.movements === this.state.movements &&
      next.live === this.state.live &&
      next.ready === this.state.ready
    ) {
      return;
    }
    this.state = next;
    for (const listener of this.listeners) listener();
  }

  private desiredToken() {
    return this.consumers.values().next().value ?? "";
  }

  acquire(id: number, token: string) {
    const before = this.desiredToken();
    this.consumers.set(id, token);
    if (this.desiredToken() !== before) this.reconnect(this.desiredToken());
  }

  release(id: number) {
    const before = this.desiredToken();
    this.consumers.delete(id);
    if (this.desiredToken() !== before) this.reconnect(this.desiredToken());
  }

  private close() {
    if (this.timer) clearTimeout(this.timer);
    this.source?.close();
    this.source = null;
    this.timer = null;
  }

  private reconnect(token: string) {
    this.close();
    this.token = token;
    this.version += 1;
    this.fallbackStarted = false;
    this.refreshPromise = null;
    this.emit({ levels: [], movements: [], live: false, ready: false });

    const fallbackNow = () => {
      void this.refresh();
    };

    if (!token) {
      this.timer = setTimeout(fallbackNow, 0);
      return;
    }

    try {
      this.source = new EventSource(`/api/inventory/stream?token=${encodeURIComponent(token)}`);
    } catch {
      this.timer = setTimeout(fallbackNow, 0);
      return;
    }

    this.timer = setTimeout(() => {
      if (!this.fallbackStarted && !this.state.ready) void this.refresh();
    }, FALLBACK_DELAY_MS);

    this.source.onopen = () => {
      if (this.desiredToken() === token) this.emit({ live: true });
    };
    this.source.onerror = () => {
      if (this.desiredToken() !== token) return;
      this.emit({ live: false });
      if (!this.state.ready) void this.refresh();
    };
    this.source.onmessage = (event) => {
      let payload: LiveInventoryEvent;
      try {
        payload = JSON.parse(event.data) as LiveInventoryEvent;
      } catch {
        return;
      }
      if (this.desiredToken() !== token || payload.type !== "snapshot") return;
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
      this.version += 1;
      this.emit({
        levels: payload.levels,
        movements: payload.movements,
        live: true,
        ready: true,
      });
    };
  }

  refresh = (): Promise<void> => {
    if (this.refreshPromise) return this.refreshPromise;
    const tokenAtStart = this.token;
    const versionAtStart = this.version;
    this.fallbackStarted = true;
    const promise = Promise.all([listStockLevels(), listMovements()])
      .then(([levels, movements]) => {
        if (this.token !== tokenAtStart || this.version !== versionAtStart) return;
        this.version += 1;
        this.emit({ levels, movements, ready: true });
      })
      .catch(() => undefined);
    this.refreshPromise = promise;
    void promise.finally(() => {
      if (this.refreshPromise === promise) this.refreshPromise = null;
    });
    return promise;
  };

  setLevels = (levels: StockLevel[]) => {
    this.fallbackStarted = true;
    this.version += 1;
    this.emit({ levels, ready: true });
  };

  setMovements = (movements: StockMovement[]) => {
    this.fallbackStarted = true;
    this.version += 1;
    this.emit({ movements, ready: true });
  };
}

const store = new LiveInventoryStore();

/** Shared authenticated inventory stream and REST fallback for stock screens. */
export function useLiveInventory() {
  const token = readSession()?.token ?? "";
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  const [consumerId] = useState(() => nextConsumerId++);

  useEffect(() => {
    store.acquire(consumerId, token);
    return () => store.release(consumerId);
  }, [consumerId, token]);

  return {
    ...state,
    refresh: store.refresh,
    setLevels: store.setLevels,
    setMovements: store.setMovements,
  };
}
