"use client";

import { useCallback, useEffect, useRef } from "react";

/** Load once, then refresh on focus and on a short interval for live HQ data. */
export function useOrgLive(load: () => Promise<void>, intervalMs = 8000) {
  const loadRef = useRef(load);
  loadRef.current = load;

  const run = useCallback(async () => {
    await loadRef.current();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void run().catch(() => undefined);
    }, intervalMs);
    const onFocus = () => void run().catch(() => undefined);
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [intervalMs, run]);
}
