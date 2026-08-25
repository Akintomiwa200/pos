"use client";

import { useEffect, useId, useState } from "react";
import { Copy, Printer, X } from "lucide-react";
import type { HqCompany, HqOrgSettings } from "@/lib/hq-setup";
import { toast } from "@/lib/toast";
import { PrimaryButton, secondaryButtonClass } from "@/components/setup/SetupChrome";
import { ReceiptLivePreview } from "./DocumentPreviews";
import { buildReceiptPreviewText } from "./receipt-preview-text";

export function ReceiptPrintPreviewButton({
  draft,
  company,
}: {
  draft: HqOrgSettings;
  company: HqCompany | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={secondaryButtonClass}
        onClick={() => setOpen(true)}
      >
        <Printer size={16} strokeWidth={1.75} className="mr-1.5 inline-block" />
        Print preview
      </button>
      {open ? (
        <ReceiptPrintPreviewModal
          draft={draft}
          company={company}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function ReceiptPrintPreviewModal({
  draft,
  company,
  onClose,
}: {
  draft: HqOrgSettings;
  company: HqCompany | null;
  onClose: () => void;
}) {
  const titleId = useId();
  const [tab, setTab] = useState<"visual" | "text">("visual");
  const text = buildReceiptPreviewText(draft, company);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Receipt text copied.");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  }

  function printReceipt() {
    const win = window.open("", "_blank", "noopener,noreferrer,width=420,height=720");
    if (!win) {
      toast.error("Allow pop-ups to print the receipt preview.");
      return;
    }
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    win.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt preview</title>
  <style>
    @page { margin: 8mm; size: auto; }
    body {
      margin: 0;
      padding: 12px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      line-height: 1.45;
      color: #111;
      background: #fff;
    }
    pre {
      white-space: pre-wrap;
      word-break: break-word;
      margin: 0 auto;
      max-width: ${draft.receiptPaper === "58mm" ? "220px" : "300px"};
    }
  </style>
</head>
<body>
  <pre>${escaped}</pre>
  <script>
    window.onload = function () {
      window.focus();
      window.print();
    };
  </script>
</body>
</html>`);
    win.document.close();
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 p-3 sm:items-center sm:p-6"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[24px] bg-pos-surface shadow-pos-md"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-pos-border/60 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-[18px] font-semibold text-pos-ink">
              Print preview
            </h2>
            <p className="mt-1 text-[13px] text-pos-ink-muted">
              Sample sale using your current receipt settings — print or copy the till text.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            className="grid size-9 place-items-center rounded-full text-pos-ink-muted hover:bg-pos-surface-muted hover:text-pos-ink"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex gap-2 border-b border-pos-border/50 px-5 py-3 sm:px-6">
          {(
            [
              { id: "visual" as const, label: "Visual" },
              { id: "text" as const, label: "Till text" },
            ] as const
          ).map((option) => {
            const on = tab === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setTab(option.id)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                  on
                    ? "bg-pos-primary text-white"
                    : "bg-pos-surface-muted text-pos-ink-muted hover:text-pos-ink"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {tab === "visual" ? (
            <div className="mx-auto max-w-md">
              <ReceiptLivePreview draft={draft} company={company} />
            </div>
          ) : (
            <pre
              className="overflow-x-auto rounded-[18px] bg-[#f7f4ef] p-4 font-mono text-[12px] leading-relaxed text-[#111827] shadow-inner ring-1 ring-black/10 sm:p-5"
              style={{ colorScheme: "light" }}
            >
              {text}
            </pre>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-pos-border/60 px-5 py-4 sm:px-6">
          <button type="button" className={secondaryButtonClass} onClick={() => void copyText()}>
            <Copy size={16} strokeWidth={1.75} className="mr-1.5 inline-block" />
            Copy text
          </button>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={secondaryButtonClass} onClick={onClose}>
              Close
            </button>
            <PrimaryButton type="button" onClick={printReceipt}>
              <Printer size={16} strokeWidth={1.75} className="mr-1.5 inline-block" />
              Print
            </PrimaryButton>
          </div>
        </footer>
      </div>
    </div>
  );
}
