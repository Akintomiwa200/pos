"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ConsoleSession } from "../lib/access";
import { loginConsole, readSession, writeSession } from "../lib/hq-api";

type AuthContextValue = {
  session: ConsoleSession | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setSession: (session: ConsoleSession | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<ConsoleSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSessionState(readSession());
    setLoading(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      setSession(next) {
        writeSession(next);
        setSessionState(next);
      },
      async login(email, password) {
        const next = await loginConsole(email, password);
        setSessionState(next);
      },
      logout() {
        writeSession(null);
        setSessionState(null);
      },
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
