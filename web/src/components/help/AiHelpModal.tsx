"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { ArrowUp, ExternalLink, HelpCircle, X } from "lucide-react";
import { resolvePageCrumbs } from "../../lib/page-meta";
import {
  buildAssistantReply,
  presetsForPath,
  topicForPath,
  type HelpTopic,
} from "./help-topics";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  topics?: HelpTopic[];
};

function TopicLinks({ topics }: { topics: HelpTopic[] }) {
  if (!topics.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {topics.map((topic) => {
        if (!topic.href) return null;
        const className =
          "inline-flex items-center gap-1 rounded-full bg-pos-primary-soft px-2.5 py-1 text-[12px] font-medium text-pos-primary transition hover:bg-pos-primary-muted";
        if (topic.external) {
          return (
            <a
              key={topic.id}
              href={topic.href}
              target="_blank"
              rel="noreferrer"
              className={className}
            >
              {topic.title}
              <ExternalLink size={11} />
            </a>
          );
        }
        return (
          <Link key={topic.id} href={topic.href} className={className}>
            {topic.title}
          </Link>
        );
      })}
    </div>
  );
}

function renderText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-pos-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

/**
 * In-app Help modal for console pages.
 * User-facing copy is plain Help + preset Q&A; matching/reply logic is the AI layer for maintainers.
 */
export function AiHelpModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const pageLabel = resolvePageCrumbs(pathname).join(" · ") || "Dashboard";
  const contextual = topicForPath(pathname);
  const presets = presetsForPath(pathname);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, open, busy]);

  useEffect(() => {
    if (!open) return;
    setMessages((current) => {
      if (current.length > 0) return current;
      const intro = contextual
        ? `You’re on **${pageLabel}**. ${contextual.summary} Pick a common question below, or type your own.`
        : `You’re on **${pageLabel}**. Pick a common question below for a ready answer, or type your own.`;
      return [
        {
          id: "welcome",
          role: "assistant",
          text: intro,
          topics: contextual ? [contextual] : undefined,
        },
      ];
    });
  }, [open, pageLabel, contextual]);

  function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed || busy) return;

    setMessages((current) => [
      ...current,
      { id: `u-${Date.now()}`, role: "user", text: trimmed },
    ]);
    setDraft("");
    setBusy(true);

    window.setTimeout(() => {
      const reply = buildAssistantReply(trimmed, pathname);
      setMessages((current) => [
        ...current,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: reply.text,
          topics: reply.topics,
        },
      ]);
      setBusy(false);
    }, 280);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    ask(draft);
  }

  return (
    <>
      <button
        type="button"
        className={`fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-pos-primary text-white shadow-pos-primary transition hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pos-primary sm:bottom-6 sm:right-6 ${
          open ? "pointer-events-none scale-90 opacity-0" : "scale-100 opacity-100"
        }`}
        aria-label="Open help"
        title="Help"
        onClick={() => onOpenChange(true)}
      >
        <HelpCircle size={22} strokeWidth={1.9} />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-3 sm:p-6">
          <button
            type="button"
            className="absolute inset-0 bg-pos-ink/25"
            aria-label="Close help"
            onClick={() => onOpenChange(false)}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative flex h-[min(34rem,calc(100svh-1.5rem))] w-full max-w-[24rem] flex-col overflow-hidden rounded-[24px] border border-pos-border bg-pos-surface text-pos-ink shadow-pos-md"
          >
            <header className="flex shrink-0 items-start gap-3 border-b border-pos-border bg-pos-primary-soft/70 px-4 py-3.5">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-pos-primary text-white shadow-pos-primary">
                <HelpCircle size={20} strokeWidth={1.9} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="text-[15px] font-semibold tracking-tight">
                  Help
                </h2>
                <p className="mt-0.5 truncate text-[12px] text-pos-ink-muted">
                  {pageLabel}
                </p>
              </div>
              <button
                type="button"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-pos-ink-muted hover:bg-pos-surface hover:text-pos-ink"
                aria-label="Close help"
                onClick={() => onOpenChange(false)}
              >
                <X size={16} />
              </button>
            </header>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                      message.role === "user"
                        ? "bg-pos-primary text-white"
                        : "bg-pos-surface-muted text-pos-ink"
                    }`}
                  >
                    {message.role === "assistant" ? renderText(message.text) : message.text}
                    {message.role === "assistant" && message.topics ? (
                      <TopicLinks topics={message.topics} />
                    ) : null}
                  </div>
                </div>
              ))}
              {busy ? (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-pos-surface-muted px-3.5 py-2.5 text-[12px] text-pos-ink-muted">
                    Finding answer…
                  </div>
                </div>
              ) : null}
              <div ref={bottomRef} />
            </div>

            {!busy ? (
              <div className="shrink-0 border-t border-pos-border px-4 py-2.5">
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-pos-ink-faint">
                  Common questions
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {presets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className="rounded-full border border-pos-border bg-pos-surface px-2.5 py-1 text-left text-[11px] text-pos-ink-muted transition hover:border-pos-primary hover:text-pos-primary"
                      onClick={() => ask(preset.question)}
                    >
                      {preset.question}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <form
              onSubmit={onSubmit}
              className="shrink-0 border-t border-pos-border px-3 py-3"
            >
              <div className="flex items-center gap-2 rounded-2xl border border-pos-border bg-pos-bg px-2.5 py-1.5 focus-within:border-pos-primary">
                <input
                  ref={inputRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Type a question…"
                  className="min-w-0 flex-1 bg-transparent px-1 py-1.5 text-sm text-pos-ink outline-none placeholder:text-pos-ink-faint"
                  disabled={busy}
                />
                <button
                  type="submit"
                  disabled={busy || !draft.trim()}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-pos-primary text-white transition enabled:hover:opacity-95 disabled:opacity-40"
                  aria-label="Send question"
                >
                  <ArrowUp size={16} strokeWidth={2.2} />
                </button>
              </div>
              <p className="mt-2 px-1 text-[11px] text-pos-ink-faint">
                Answers are ready-made help tips.{" "}
                <Link
                  href="/help"
                  className="text-pos-primary hover:underline"
                  onClick={() => onOpenChange(false)}
                >
                  Open Help center
                </Link>
              </p>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
