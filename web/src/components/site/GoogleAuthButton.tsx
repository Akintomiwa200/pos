"use client";

import { useEffect, useId, useRef, useState } from "react";
import { toast } from "@/lib/toast";
import { fetchGoogleAuthConfig } from "@/lib/hq-api";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: string;
              size?: string;
              width?: number;
              text?: string;
              shape?: string;
            },
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

type Props = {
  intent: "login" | "signup";
  label: string;
  disabled?: boolean;
  /** Required for company Google signup — read when Google returns. */
  getCompany?: () => { name: string; email?: string; phone?: string; state?: string };
  onCredential: (credential: string) => Promise<void>;
};

let gisPromise: Promise<void> | null = null;

function loadGis(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-gis="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Google script failed")));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.gis = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google script failed"));
    document.head.appendChild(script);
  });
  return gisPromise;
}

export function GoogleAuthButton({
  intent,
  label,
  disabled,
  getCompany,
  onCredential,
}: Props) {
  const slotId = useId();
  const slotRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const handlers = useRef({ getCompany, onCredential, intent });
  handlers.current = { getCompany, onCredential, intent };

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      try {
        const config = await fetchGoogleAuthConfig();
        if (cancelled) return;
        if (!config.enabled || !config.clientId) {
          setEnabled(false);
          setReady(true);
          return;
        }
        await loadGis();
        if (cancelled || !window.google?.accounts?.id || !slotRef.current) return;

        window.google.accounts.id.initialize({
          client_id: config.clientId,
          cancel_on_tap_outside: true,
          callback: (response) => {
            void (async () => {
              if (handlers.current.intent === "signup") {
                const company = handlers.current.getCompany?.();
                if (!company?.name?.trim()) {
                  toast.error("Enter your company name before continuing with Google.");
                  return;
                }
              }
              setBusy(true);
              try {
                await handlers.current.onCredential(response.credential);
              } catch (err) {
                toast.error(err, "Google sign-in failed");
              } finally {
                setBusy(false);
              }
            })();
          },
        });

        slotRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(slotRef.current, {
          theme: "outline",
          size: "large",
          width: 380,
          text: intent === "signup" ? "signup_with" : "signin_with",
          shape: "rectangular",
        });
        setEnabled(true);
        setReady(true);
      } catch {
        if (!cancelled) {
          setEnabled(false);
          setReady(true);
        }
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, [intent]);

  if (!ready) {
    return (
      <div className="mt-7 h-[44px] w-full animate-pulse rounded-[10px] bg-pos-surface-muted" />
    );
  }

  if (!enabled) {
    return (
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() =>
          toast.error(
            "Set GOOGLE_CLIENT_ID on the API and NEXT_PUBLIC_GOOGLE_CLIENT_ID on web to enable Google.",
          )
        }
        className="mt-7 flex w-full items-center justify-center gap-3 rounded-[10px] border border-pos-border bg-pos-surface px-4 py-3 text-[14px] font-medium text-pos-ink transition hover:bg-pos-surface-muted disabled:opacity-60"
      >
        <GoogleGlyph />
        {label}
      </button>
    );
  }

  return (
    <div className="relative mt-7">
      <div
        id={slotId}
        ref={slotRef}
        className={`flex w-full justify-center overflow-hidden rounded-[10px] ${
          disabled || busy ? "pointer-events-none opacity-60" : ""
        }`}
      />
      {busy ? (
        <p className="mt-2 text-center text-[12px] text-pos-ink-faint">Syncing with Google…</p>
      ) : null}
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16.2 19 14 24 14c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.6 39.6 16.3 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l.1.1 6.2 5.2C40.6 35.8 44 30.5 44 24c0-1.3-.1-2.5-.4-3.5z"
      />
    </svg>
  );
}
