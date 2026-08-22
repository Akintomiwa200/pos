"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { canAccessPath, filterNav } from "../lib/access";
import { ConsoleHeader } from "./ConsoleHeader";
import { useAuth } from "./AuthProvider";
import { Sidebar } from "./Sidebar";
import { ConsoleChromeSkeleton } from "./Skeleton";

export function ConsoleShell({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (!loading && !session) router.replace("/login");
  }, [loading, session, router]);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!navOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setNavOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [navOpen]);

  if (loading || !session) {
    return <ConsoleChromeSkeleton />;
  }

  const nav = filterNav(session.departments, session.privileges);
  const allowed = canAccessPath(pathname, session.departments, session.privileges);

  return (
    <div className="flex h-svh overflow-hidden bg-pos-bg">
      <Sidebar session={session} nav={nav} open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <ConsoleHeader
          session={session}
          nav={nav}
          onOpenNav={() => setNavOpen(true)}
        />
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl p-4 sm:p-8">
            {allowed ? (
              children
            ) : (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-pos-primary">
                  Access
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight">No access</h1>
                <p className="mt-2 max-w-xl text-pos-ink-muted">
                  This page is not in the departments or privileges assigned to your group.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
