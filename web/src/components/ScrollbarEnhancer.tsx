"use client";

import { useEffect } from "react";

export function ScrollbarEnhancer() {
  useEffect(() => {
    const timers = new WeakMap<EventTarget, number>();

    function onScroll(event: Event) {
      const raw = event.target;
      if (!(raw instanceof Element)) return;

      const el =
        raw === document.documentElement || raw === document.body
          ? document.documentElement
          : raw instanceof HTMLElement
            ? raw
            : null;
      if (!el) return;

      el.classList.add("is-scrolling");

      const prev = timers.get(el);
      if (prev) window.clearTimeout(prev);

      timers.set(
        el,
        window.setTimeout(() => {
          el.classList.remove("is-scrolling");
          timers.delete(el);
        }, 900),
      );
    }

    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => document.removeEventListener("scroll", onScroll, { capture: true });
  }, []);

  return null;
}
