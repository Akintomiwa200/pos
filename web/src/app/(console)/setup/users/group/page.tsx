"use client";

import { GroupManager } from "@/components/GroupManager";

export default function UsersGroupPage() {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6d4aff]">
        Setup · Users
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Group</h1>
      <p className="mt-2 mb-6 max-w-2xl text-neutral-500">
        Turn on departments first, then tick the privileges under each one. Unticked
        menus are hidden from everyone in the group.
      </p>
      <GroupManager />
    </div>
  );
}
