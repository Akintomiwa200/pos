"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

export function SlideOver({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-pos-ink/40"
        aria-label="Close"
        onClick={onClose}
      />
      <aside className="absolute inset-y-0 right-0 flex h-full w-full max-w-lg flex-col bg-pos-surface text-pos-ink shadow-pos-md">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-pos-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold tracking-tight text-pos-ink">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-pos-ink-muted">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-pos-ink hover:bg-pos-surface-muted"
            onClick={onClose}
            aria-label="Close panel"
          >
            <X size={18} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <footer className="shrink-0 border-t border-pos-border px-5 py-4">{footer}</footer>
        ) : null}
      </aside>
    </div>
  );
}
