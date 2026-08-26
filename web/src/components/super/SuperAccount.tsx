"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { SetupHeader } from "@/components/setup/SetupChrome";

export function SuperAccount() {
  const { session } = useAuth();
  if (!session) return null;

  return (
    <div>
      <SetupHeader
        kicker="Producer · Super Admin"
        title="My account"
        copy="Your Super Admin identity. Password and session security stay on this desk — not in company HQ."
      />
      <div className="max-w-xl rounded-[18px] border border-pos-border bg-pos-surface p-5">
        <p className="text-[16px] font-semibold">{session.name}</p>
        <p className="mt-1 text-sm text-pos-ink-muted">
          {session.email} · {session.username}
        </p>
        <p className="mt-3 text-sm text-pos-ink-muted">{session.groupName}</p>
        <div className="mt-5 flex flex-wrap gap-4 text-[13px] font-medium">
          <Link href="/password" className="text-pos-primary hover:underline">
            Change password
          </Link>
          <Link href="/admin/security/sessions" className="text-pos-primary hover:underline">
            Sessions
          </Link>
          <Link href="/admin/administrators" className="text-pos-primary hover:underline">
            Administrators
          </Link>
        </div>
      </div>
    </div>
  );
}
