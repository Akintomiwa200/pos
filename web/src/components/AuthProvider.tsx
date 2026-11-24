"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ConsoleSession,
  SessionLockReason,
  SessionStreamEvent,
  SessionLockState,
} from "../lib/access";
import {
  changePassword,
  fetchConsoleSession,
  googleAuthConsole,
  loginConsole,
  logoutConsole,
  NetworkError,
  readSession,
  registerCompanyConsole,
  unlockHqSession,
  type CompanySignupInput,
  writeSession,
} from "../lib/hq-api";
import { getOrgSettings } from "../lib/hq-setup";

type AuthContextValue = {
  session: ConsoleSession | null;
  loading: boolean;
  live: boolean;
  /** Any HQ account (admin, sales, accountant, …). */
  login: (email: string, password: string) => Promise<ConsoleSession>;
  /** Company onboarding — creates org + administrator. */
  registerCompany: (input: CompanySignupInput) => Promise<ConsoleSession>;
  /** Google: login for existing accounts, or company signup when intent is signup. */
  loginWithGoogle: (credential: string) => Promise<ConsoleSession>;
  signupCompanyWithGoogle: (
    credential: string,
    company: CompanySignupInput["company"],
  ) => Promise<ConsoleSession>;
  logout: () => Promise<void>;
  updatePassword: (current: string, password: string) => Promise<void>;
  lockSession: (reason?: "manual_lock" | "idle_lock") => void;
  unlockSession: (password: string) => Promise<void>;
  setSession: (session: ConsoleSession | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<ConsoleSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const tokenRef = useRef<string | null>(null);
  const sessionRef = useRef<ConsoleSession | null>(null);
  const lockedRef = useRef<SessionLockState | null>(null);

  sessionRef.current = session;
  lockedRef.current = session?.locked ?? null;

  const applyLock = useCallback((reason: SessionLockReason, message: string) => {
    const current = sessionRef.current;
    if (!current || current.locked) return;
    const next = { ...current, locked: { reason, message } };
    writeSession(next);
    setSessionState(next);
  }, []);

  useEffect(() => {
    tokenRef.current = session?.token ?? null;
  }, [session?.token]);

  useEffect(() => {
    const stored = readSession();
    let cancelled = false;

    async function boot() {
      if (!stored?.token) {
        setSessionState(null);
        setLive(false);
        setLoading(false);
        return;
      }
      try {
        const liveSession = await fetchConsoleSession(stored.token);
        if (!cancelled) {
          // Local locks are browser-only. Keep one across a refresh instead of
          // replacing it with the server session (which has no knowledge of it).
          const localLock = stored.locked;
          const preserveLocalLock =
            localLock?.reason === "manual_lock" || localLock?.reason === "idle_lock";
          setSessionState(
            preserveLocalLock && localLock ? { ...liveSession, locked: localLock } : liveSession,
          );
          setLive(true);
        }
      } catch (error) {
        if (!cancelled) {
          if (error instanceof NetworkError) {
            setSessionState(stored);
            setLive(false);
          } else if (stored?.locked) {
            setSessionState(stored);
            setLive(false);
          } else {
            writeSession(null);
            setSessionState(null);
            setLive(false);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!session?.token) return;
    let stopped = false;
    async function tick() {
      const token = tokenRef.current;
      if (stopped || !token) return;
      try {
        const next = await fetchConsoleSession(token);
        if (stopped) return;
        setLive(true);
        setSessionState((current) => {
          if (!current) return next;
          // Manual/idle locks live only in this browser. Keep them across
          // server polls; unlockSession is the only way to clear them.
          if (
            current.locked?.reason === "manual_lock" ||
            current.locked?.reason === "idle_lock"
          ) {
            return current;
          }
          const same =
            current.token === next.token &&
            current.name === next.name &&
            current.username === next.username &&
            current.email === next.email &&
            (current.avatarUrl ?? null) === (next.avatarUrl ?? null) &&
            current.groupName === next.groupName &&
            current.scope === next.scope &&
            (current.locked?.reason ?? null) === (next.locked?.reason ?? null) &&
            (current.locked?.message ?? null) === (next.locked?.message ?? null) &&
            JSON.stringify(current.departments) === JSON.stringify(next.departments) &&
            JSON.stringify(current.privileges) === JSON.stringify(next.privileges);
          return same ? current : next;
        });
      } catch (error) {
        if (stopped) return;
        if (error instanceof NetworkError) {
          setLive(false);
          return;
        }
        if (lockedRef.current) return;
        writeSession(null);
        setSessionState(null);
        setLive(false);
      }
    }
    const timer = window.setInterval(() => void tick(), 5000);
    const onFocus = () => void tick();
    window.addEventListener("focus", onFocus);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [session?.token]);

  useEffect(() => {
    if (!session?.token) return;
    const source = new EventSource(
      `/api/console/session/stream?token=${encodeURIComponent(session.token)}`,
    );
    source.onmessage = (event) => {
      let payload: SessionStreamEvent | null = null;
      try {
        payload = JSON.parse(event.data) as SessionStreamEvent;
      } catch {
        return;
      }
      const current = sessionRef.current;
      if (!current) return;

      if (payload.type === "privileges") {
        void fetchConsoleSession(current.token)
          .then((next) => {
            setSessionState((latest) => {
              if (!latest) return next;
              if (
                latest.locked?.reason === "manual_lock" ||
                latest.locked?.reason === "idle_lock"
              ) {
                return { ...latest, ...next, locked: latest.locked };
              }
              return next;
            });
          })
          .catch(() => undefined);
        return;
      }

      if (payload.type === "lock") {
        const affectsMe =
          payload.reason === "subscription_expired"
            ? current.scope !== "producer"
            : (payload.reason === "account_deactivated" ||
                payload.reason === "account_deleted") &&
              payload.accountId === current.id;
        if (!affectsMe) return;
        const next = { ...current, locked: { reason: payload.reason, message: payload.message } };
        writeSession(next);
        setSessionState(next);
        return;
      }

      if (payload.type === "unlock") {
        const affectsMe =
          payload.reason === "subscription_renewed"
            ? current.scope !== "producer"
            : payload.reason === "account_reactivated" && payload.accountId === current.id;
        if (!affectsMe || !current.locked) return;
        const next = { ...current, locked: null };
        writeSession(next);
        setSessionState(next);
      }
    };
    source.onerror = () => undefined;
    return () => source.close();
  }, [session?.token]);

  // HQ idle lock. The org setting is fetched once per sign-in; activity resets
  // the countdown. Manual locks use the same LockedScreen and password unlock.
  useEffect(() => {
    if (!session?.token) return;
    let cancelled = false;
    let timer: number | undefined;
    let minutes = 0;
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;

    function arm() {
      if (timer !== undefined) window.clearTimeout(timer);
      if (minutes <= 0) return;
      timer = window.setTimeout(() => {
        applyLock("idle_lock", "HQ locked after a period of inactivity. Enter your password to continue.");
      }, minutes * 60_000);
    }

    function onActivity() {
      if (!lockedRef.current) arm();
    }

    void getOrgSettings()
      .then((raw) => {
        if (cancelled) return;
        const configured = Number(raw?.sessionTimeoutMinutes ?? 0);
        minutes = Number.isFinite(configured) && configured > 0 ? configured : 0;
        if (minutes <= 0) return;
        arm();
        for (const event of events) {
          window.addEventListener(event, onActivity, { passive: true });
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
      for (const event of events) window.removeEventListener(event, onActivity);
    };
  }, [session?.token, applyLock]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      live,
      setSession(next) {
        writeSession(next);
        setSessionState(next);
      },
      async login(email, password) {
        const next = await loginConsole(email, password);
        setLive(true);
        setSessionState(next);
        return next;
      },
      async registerCompany(input) {
        const next = await registerCompanyConsole(input);
        setLive(true);
        setSessionState(next);
        return next;
      },
      async loginWithGoogle(credential) {
        const next = await googleAuthConsole({ credential, intent: "login" });
        setLive(true);
        setSessionState(next);
        return next;
      },
      async signupCompanyWithGoogle(credential, company) {
        const next = await googleAuthConsole({
          credential,
          intent: "signup",
          company,
        });
        setLive(true);
        setSessionState(next);
        return next;
      },
      async logout() {
        await logoutConsole(session?.token);
        setLive(false);
        setSessionState(null);
      },
      async updatePassword(current, password) {
        if (!session?.token) throw new Error("Sign in again");
        await changePassword(session.token, current, password);
      },
      lockSession(reason = "manual_lock") {
        applyLock(
          reason,
          reason === "idle_lock"
            ? "HQ locked after a period of inactivity. Enter your password to continue."
            : "HQ locked. Enter your password to continue.",
        );
      },
      async unlockSession(password) {
        if (!session?.token) throw new Error("Sign in again");
        await unlockHqSession(session.token, password);
        const current = sessionRef.current;
        if (!current) return;
        const next = { ...current, locked: null };
        writeSession(next);
        setSessionState(next);
      },
    }),
    [session, loading, live, applyLock],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
