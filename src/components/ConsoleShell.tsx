"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { canAccessPath, filterNav } from "../lib/access";
import { useAuth } from "./AuthProvider";
import { Sidebar } from "./Sidebar";

export function ConsoleShell({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) router.replace("/login");
  }, [loading, session, router]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-neutral-500">
        Loading…
      </div>
    );
  }

  const nav = filterNav(session.departments, session.privileges);
  const allowed = canAccessPath(pathname, nav);

  return (
    <div className="flex min-h-screen bg-[#f3f4f8]">
      <Sidebar nav={nav} session={session} />
      <main className="min-w-0 flex-1 overflow-auto p-8">
        {allowed ? (
          children
        ) : (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6d4aff]">
              Access
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">No access</h1>
            <p className="mt-2 max-w-xl text-neutral-500">
              This page is not in the departments or privileges assigned to your group.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
