"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { canAccessPath, filterNav, firstAllowedPath, sessionScope } from "../lib/access";
import { useOrgLocale } from "../lib/org-locale";
import { ConsoleHeader } from "./ConsoleHeader";
import { useAuth } from "./AuthProvider";
import { AiHelpModal } from "./help/AiHelpModal";
import { Sidebar } from "./Sidebar";
import { ConsoleChromeSkeleton } from "./Skeleton";

export function ConsoleShell({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { currency } = useOrgLocale();
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

    const scope = sessionScope(session);
    const allowed = canAccessPath(pathname, session.departments, session.privileges, scope);
    if (allowed) {
      lastAllowedRef.current = pathname;
      return;
    }

    const previous = lastAllowedRef.current;
    const previousOk =
      previous &&
      previous !== pathname &&
      canAccessPath(previous, session.departments, session.privileges, scope);

    const fallback = previousOk
      ? previous
      : firstAllowedPath(session.departments, session.privileges, scope);

    if (fallback && fallback !== pathname) {
      router.replace(fallback);
    }
  }, [loading, session, pathname, router]);

  if (loading || !session) {
    return <ConsoleChromeSkeleton />;
  }

  const scope = sessionScope(session);
  const nav = filterNav(session.departments, session.privileges, scope);
  const allowed = canAccessPath(pathname, session.departments, session.privileges, scope);
  const homeHref = firstAllowedPath(session.departments, session.privileges, scope);

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
          <div
            key={currency}
            className="console-shell-main mx-auto w-full max-w-7xl p-4 sm:p-8"
            data-currency={currency}
          >
            {allowed ? children : null}
          </div>
        </main>
      </div>
      <AiHelpModal open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}
