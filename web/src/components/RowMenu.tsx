"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

export function useRowMenu() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  function toggleMenu(id: string, element: HTMLElement) {
    setAnchor(element);
    setOpenId((current) => (current === id ? null : id));
  }

  function closeMenu() {
    setOpenId(null);
    setAnchor(null);
  }

  return { openId, anchor, toggleMenu, closeMenu };
}

export function RowMenu({
  anchor,
  onClose,
  children,
}: {
  anchor: HTMLElement;
  onClose: () => void;
  children: ReactNode;
}) {
  const [style, setStyle] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    window.addEventListener("click", onClose);
    return () => window.removeEventListener("click", onClose);
  }, [onClose]);

  useLayoutEffect(() => {
    const rect = anchor.getBoundingClientRect();
    const width = 170;
    const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
    setStyle({ top: rect.bottom + 8, left });
  }, [anchor]);

  return createPortal(
    <div
      className="fixed z-30 min-w-[160px] overflow-hidden rounded-xl border border-pos-border bg-pos-surface py-1 shadow-pos-md"
      style={style ? { top: `${style.top}px`, left: `${style.left}px` } : { visibility: "hidden" }}
    >
      {children}
    </div>,
    document.body,
  );
}