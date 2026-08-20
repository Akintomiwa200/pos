"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ConsoleSession } from "../lib/access";
import {
  changePassword,
  fetchConsoleSession,
  loginConsole,
  logoutConsole,
  NetworkError,
  readSession,
  registerConsole,
  writeSession,
} from "../lib/hq-api";

type AuthContextValue = {
  session: ConsoleSession | null;
  loading: boolean;
  live: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    name: string;
    email: string;
    username: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  updatePassword: (current: string, password: string) => Promise<void>;
  setSession: (session: ConsoleSession | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<ConsoleSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const tokenRef = useRef<string | null>(null);

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
          setSessionState(liveSession);
          setLive(true);
        }
      } catch (error) {
        if (!cancelled) {
          if (error instanceof NetworkError) {
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
          const same =
            current.token === next.token &&
            current.name === next.name &&
            current.groupName === next.groupName &&
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
      },
      async register(input) {
        const next = await registerConsole(input);
        setLive(true);
        setSessionState(next);
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
    }),
    [session, loading, live],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
