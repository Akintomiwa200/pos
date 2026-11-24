"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type FormEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  ExternalLink,
  LifeBuoy,
  Search,
  X,
} from "lucide-react";
import { resolvePageCrumbs } from "../../lib/page-meta";
import {
  buildHelpReply,
  presetsForPath,
  topicForPath,
  type HelpPreset,
  type HelpTopic,
} from "./help-topics";

type HelpResult = {
  id: string;
  question: string;
  answer: string;
  topics: HelpTopic[];
  steps?: string[];
  followUps?: HelpPreset[];
};

function renderText(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${index}-${part}`} className="font-semibold text-pos-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={`${index}-${part}`}>{part}</span>;
  });
}

function TopicChip({
  topic,
  onNavigate,
}: {
  topic: HelpTopic;
  onNavigate: () => void;
}) {
  if (!topic.href) return null;

  const className =
    "inline-flex items-center gap-1 rounded-md border border-pos-border bg-pos-surface px-2 py-1 text-[11px] text-pos-ink-muted transition hover:border-pos-primary/50 hover:text-pos-primary";

  if (topic.external) {
    return (
      <a
        key={topic.id}
        href={topic.href}
        target="_blank"
        rel="noreferrer"
        className={className}
        onClick={onNavigate}
      >
        {topic.title}
        <ExternalLink size={11} />
      </a>
    );
  }

  return (
    <Link key={topic.id} href={topic.href} className={className} onClick={onNavigate}>
      {topic.title}
    </Link>
  );
}

function TopicRow({
  topic,
  onNavigate,
}: {
  topic: HelpTopic;
  onNavigate: () => void;
}) {
  if (!topic.href) return null;

  const content = (
    <>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-medium text-pos-ink">{topic.title}</span>
        <span className="mt-0.5 block text-[11px] leading-4 text-pos-ink-faint">{topic.summary}</span>
      </span>
      {topic.external ? (
        <ExternalLink size={14} className="shrink-0 text-pos-ink-faint" />
      ) : (
        <ChevronRight size={14} className="shrink-0 text-pos-ink-faint" />
      )}
    </>
  );

  const className =
    "flex w-full items-center justify-between gap-3 rounded-xl border border-pos-border bg-pos-surface px-3 py-2.5 text-left transition hover:border-pos-primary/50 hover:bg-pos-primary-soft/40";

  if (topic.external) {
    return (
      <a
        key={topic.id}
        href={topic.href}
        target="_blank"
        rel="noreferrer"
        className={className}
        onClick={onNavigate}
      >
        {content}
      </a>
    );
  }

  return (
    <Link key={topic.id} href={topic.href} className={className} onClick={onNavigate}>
      {content}
    </Link>
  );
}

function AnswerCard({
  result,
  onNavigate,
  onAsk,
}: {
  result: HelpResult;
  onNavigate: () => void;
  onAsk: (question: string) => void;
}) {
  return (
    <section className="rounded-xl border border-pos-border bg-pos-surface-muted/60 p-3.5">
      <div className="flex items-start gap-2.5">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-pos-border bg-pos-surface text-pos-ink-muted">
          <BookOpen size={14} />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-pos-ink-faint">
            Suggested answer
          </p>
          <p className="break-words text-[13px] font-medium text-pos-ink">{result.question}</p>
        </div>
      </div>

      <div className="mt-3 text-[13px] leading-6 text-pos-ink-muted">{renderText(result.answer)}</div>

      {result.steps?.length ? (
        <ol className="mt-3 space-y-2 border-t border-pos-border/70 pt-3">
          {result.steps.map((step, index) => (
            <li key={`${index}-${step}`} className="flex gap-2 text-[12px] leading-5 text-pos-ink-muted">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-pos-surface text-[10px] font-semibold text-pos-ink-muted">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      ) : null}

      {result.topics.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {result.topics.map((topic) => (
            <TopicChip key={topic.id} topic={topic} onNavigate={onNavigate} />
          ))}
        </div>
      ) : null}

      {result.followUps?.length ? (
        <div className="mt-3 border-t border-pos-border/70 pt-3">
          <p className="mb-1.5 text-[11px] font-semibold text-pos-ink-faint">Ask a follow-up</p>
          <div className="flex flex-wrap gap-1.5">
            {result.followUps.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className="rounded-md border border-pos-border bg-pos-surface px-2 py-1 text-left text-[11px] text-pos-ink-muted transition hover:border-pos-primary/50 hover:text-pos-primary"
                onClick={() => onAsk(preset.question)}
              >
                {preset.question}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <p className="mt-3 border-t border-pos-border/70 pt-2.5 text-[11px] text-pos-ink-faint">
        Saved app guides · matched to this page
      </p>
    </section>
  );
}

/**
 * Conventional help drawer for console pages.
 * Answers come from the local help guide; no external AI service is involved.
 */
export function HelpPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const titleId = useId();
  const descriptionId = useId();
  const searchId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const counterRef = useRef(0);

  const [query, setQuery] = useState("");
  const [result, setResult] = useState<HelpResult | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [error, setError] = useState("");

  const pageLabel = resolvePageCrumbs(pathname).join(" · ") || "Dashboard";
  const contextual = topicForPath(pathname);
  const presets = presetsForPath(pathname);

  const close = () => onOpenChange(false);

  useEffect(() => {
    if (open) {
      returnFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      return;
    }

    returnFocusRef.current?.focus();
    returnFocusRef.current = null;
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  function runSearch(question: string) {
    const trimmed = question.trim();
    if (!trimmed) {
      setError("Type a question or choose one from the list below.");
      inputRef.current?.focus();
      return;
    }

    const reply = buildHelpReply(trimmed, pathname);
    counterRef.current += 1;
    setResult({
      id: `help-result-${counterRef.current}`,
      question: trimmed,
      answer: reply.text,
      topics: reply.topics,
      steps: reply.steps,
      followUps: reply.followUps,
    });
    setHistory((current) => [trimmed, ...current.filter((item) => item !== trimmed)].slice(0, 4));
    setQuery("");
    setError("");
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    runSearch(query);
  }

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        className={`fixed bottom-5 right-5 z-40 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-pos-border bg-pos-surface px-3 text-[13px] font-medium text-pos-ink shadow-pos-sm transition hover:border-pos-primary/50 hover:text-pos-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pos-primary sm:bottom-6 sm:right-6 ${
          open ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
        aria-label="Open help and support"
        onClick={() => onOpenChange(true)}
      >
        <LifeBuoy size={17} strokeWidth={1.8} />
        <span className="hidden sm:inline">Help</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-pos-ink/30"
            aria-label="Close help and support"
            onClick={close}
          />

          <section
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className="relative flex h-full w-full max-w-[420px] flex-col border-l border-pos-border bg-pos-surface text-pos-ink shadow-pos-md"
          >
            <header className="flex shrink-0 items-start gap-3 border-b border-pos-border px-5 py-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-pos-border bg-pos-surface-muted text-pos-ink-muted">
                <LifeBuoy size={18} strokeWidth={1.8} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="text-[15px] font-semibold tracking-tight">
                  Help & support
                </h2>
                <p id={descriptionId} className="mt-0.5 truncate text-[12px] text-pos-ink-muted">
                  Guides for {pageLabel}
                </p>
              </div>
              <button
                type="button"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-pos-ink-muted transition hover:bg-pos-surface-muted hover:text-pos-ink"
                aria-label="Close help and support"
                onClick={close}
              >
                <X size={16} />
              </button>
            </header>

            <form onSubmit={onSubmit} className="shrink-0 border-b border-pos-border px-5 py-4">
              <label
                htmlFor={searchId}
                className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint"
              >
                Search help
              </label>
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <Search
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-pos-ink-faint"
                  />
                  <input
                    id={searchId}
                    ref={inputRef}
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setError("");
                    }}
                    placeholder="e.g. Where do I manage products?"
                    className="h-9 w-full rounded-lg border border-pos-border bg-pos-bg pl-9 pr-3 text-[13px] text-pos-ink outline-none transition placeholder:text-pos-ink-faint focus:border-pos-primary"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!query.trim()}
                  className="h-9 shrink-0 rounded-lg bg-pos-primary px-3 text-[13px] font-medium text-white transition enabled:hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Search
                </button>
              </div>
            </form>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
              {error ? (
                <p role="alert" className="text-[12px] text-pos-danger">
                  {error}
                </p>
              ) : null}

              {result ? (
                <AnswerCard result={result} onNavigate={close} onAsk={runSearch} />
              ) : (
                <section className="rounded-xl border border-pos-border bg-pos-surface p-3.5">
                  <p className="text-[13px] font-medium text-pos-ink">Ask for help</p>
                  <p className="mt-1 text-[12px] leading-5 text-pos-ink-muted">
                    Ask a question or choose a common one. Answers are matched from the saved guides for your app.
                  </p>
                </section>
              )}

              {contextual ? (
                <section>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">
                    On this page
                  </h3>
                  <TopicRow topic={contextual} onNavigate={close} />
                </section>
              ) : null}

              <section>
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">
                  Common questions
                </h3>
                <div className="divide-y divide-pos-border/70 overflow-hidden rounded-xl border border-pos-border bg-pos-surface">
                  {presets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-pos-surface-muted"
                      onClick={() => runSearch(preset.question)}
                    >
                      <span className="min-w-0 text-[13px] text-pos-ink">{preset.question}</span>
                      <ChevronRight size={14} className="shrink-0 text-pos-ink-faint" />
                    </button>
                  ))}
                </div>
              </section>

              {history.length ? (
                <section>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-pos-ink-faint">
                    Recent searches
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {history.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className="rounded-md border border-pos-border bg-pos-surface px-2 py-1 text-[11px] text-pos-ink-muted transition hover:border-pos-primary/50 hover:text-pos-primary"
                        onClick={() => runSearch(item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>

            <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-pos-border px-5 py-3">
              <Link
                href="/help"
                onClick={close}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-pos-primary hover:underline"
              >
                Open Help center
                <ArrowRight size={14} />
              </Link>
              <button
                type="button"
                className="rounded-lg border border-pos-border px-3 py-1.5 text-[12px] text-pos-ink-muted transition hover:text-pos-ink"
                onClick={close}
              >
                Close
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
