"use client";

import { useMemo, useState } from "react";
import { Plus, Wifi, WifiOff } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  departmentsFromPrivileges,
  groupScope,
  type ConsoleGroup,
} from "@/lib/access";
import { refreshSessionFromGroup, saveGroup } from "@/lib/hq-api";
import { useLiveDirectory } from "@/lib/live-directory";
import { useAuth } from "@/components/AuthProvider";
import { ManagerSkeleton } from "@/components/Skeleton";
import { PrimaryButton, SetupHeader } from "@/components/setup/SetupChrome";
import { emptyGroup, GroupFormSheet } from "@/components/setup/groups/GroupFormSheet";
import { groupVisual, privilegeSummary } from "@/components/setup/groups/group-ui";

export function ProducerDepartments() {
  const { session, setSession } = useAuth();
  const { accounts, groups: allGroups, live, ready } = useLiveDirectory();
  const groups = useMemo(
    () => allGroups.filter((row) => groupScope(row) === "producer"),
    [allGroups],
  );
  const [draft, setDraft] = useState<ConsoleGroup>(emptyGroup("producer"));
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!ready) return <ManagerSkeleton variant="groups" />;

  async function onSave() {
    if (!draft.name.trim()) {
      toast.error("Department name is required.");
      return;
    }
    setBusy(true);
    try {
      const privileges = draft.privileges.includes("*") ? ["*"] : draft.privileges;
      const saved = await saveGroup({
        ...draft,
        scope: "producer",
        privileges,
        departments: privileges.includes("*")
          ? ["*"]
          : departmentsFromPrivileges(privileges, "producer"),
      });
      setOpen(false);
      if (session) setSession(refreshSessionFromGroup(session, saved));
      toast.success("Privileges saved. Sidebar access is live.");
    } catch (err) {
      toast.error(err, "Could not save department");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <SetupHeader
        kicker="Producer · People"
        title="Privileges"
        copy="Roles for producer staff. Tick the Super Admin menus each role can open — companies, billing, tills, and the rest. Changes stream to signed-in staff in real time."
        action={
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-xl border border-pos-border px-3 py-2.5 text-[12px] font-medium ${
                live ? "bg-pos-success/10 text-pos-success" : "bg-pos-surface-muted text-pos-ink-faint"
              }`}
            >
              {live ? <Wifi size={13} /> : <WifiOff size={13} />}
              {live ? "Live" : "Offline"}
            </span>
            <PrimaryButton
              onClick={() => {
                setDraft(emptyGroup("producer"));
                setOpen(true);
              }}
            >
              <span className="inline-flex items-center gap-2">
                <Plus size={16} />
                New role
              </span>
            </PrimaryButton>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {groups.map((group, index) => {
          const visual = groupVisual(group.name, index);
          const Icon = visual.Icon;
          const members = accounts.filter((row) => row.groupId === group.id).length;
          return (
            <button
              key={group.id}
              type="button"
              className="flex min-h-[148px] flex-col rounded-[18px] border border-pos-border bg-pos-surface p-5 text-left transition hover:border-pos-primary/25 hover:shadow-pos-md"
              onClick={() => {
                setDraft(group);
                setOpen(true);
              }}
            >
              <span
                className="grid size-10 place-items-center rounded-[12px]"
                style={{ background: visual.bg, color: visual.fg }}
              >
                <Icon size={18} />
              </span>
              <p className="mt-4 text-[16px] font-semibold tracking-tight text-pos-ink">{group.name}</p>
              <p className="mt-1 text-[13px] text-pos-ink-faint">
                {members} {members === 1 ? "member" : "members"} · {privilegeSummary(group)}
              </p>
            </button>
          );
        })}
      </div>

      <GroupFormSheet
        open={open}
        draft={draft}
        busy={busy}
        onClose={() => setOpen(false)}
        onChange={setDraft}
        onSubmit={() => void onSave()}
      />
    </div>
  );
}
