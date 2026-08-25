"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { canAccessPath, filterNav, firstAllowedPath } from "../lib/access";
import { ConsoleHeader } from "./ConsoleHeader";
import { useAuth } from "./AuthProvider";
import { AiHelpModal } from "./help/AiHelpModal";
import { Sidebar } from "./Sidebar";
import { ConsoleChromeSkeleton } from "./Skeleton";

export function ConsoleShell({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const lastAllowedRef = useRef<string | null>(null);

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

  useEffect(() => {
    if (loading || !session) return;

    const allowed = canAccessPath(pathname, session.departments, session.privileges);
    if (allowed) {
      lastAllowedRef.current = pathname;
      return;
    }

    const previous = lastAllowedRef.current;
    const previousOk =
      previous &&
      previous !== pathname &&
      canAccessPath(previous, session.departments, session.privileges);

    const fallback = previousOk
      ? previous
      : firstAllowedPath(session.departments, session.privileges);

    if (fallback && fallback !== pathname) {
      router.replace(fallback);
    }
  }, [loading, session, pathname, router]);

  if (loading || !session) {
    return <ConsoleChromeSkeleton />;
  }

  const nav = filterNav(session.departments, session.privileges);
  const allowed = canAccessPath(pathname, session.departments, session.privileges);
  const homeHref = firstAllowedPath(session.departments, session.privileges);

  return (
    <div className="flex h-svh overflow-hidden bg-pos-bg">
      <Sidebar
        session={session}
        nav={nav}
        homeHref={homeHref}
        open={navOpen}
        onClose={() => setNavOpen(false)}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <ConsoleHeader
          session={session}
          nav={nav}
          onOpenNav={() => setNavOpen(true)}
          onOpenHelp={() => setHelpOpen(true)}
        />
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <div className="console-shell-main mx-auto w-full max-w-7xl p-4 sm:p-8">
            {allowed ? children : null}
          </div>
        </main>
      </div>
      <AiHelpModal open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}
