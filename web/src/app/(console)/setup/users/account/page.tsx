"use client";

import { AccountManager } from "@/components/AccountManager";

export default function UsersAccountPage() {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6d4aff]">
        Setup · Users
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Account</h1>
      <p className="mt-2 mb-6 max-w-2xl text-neutral-500">
        Assign each person to a group. The sidebar they see comes from that group&apos;s
        departments and privileges.
      </p>
      <AccountManager />
    </div>
  );
}
