"use client";

import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import type { ConsoleAccount, ConsoleGroup } from "../lib/access";
import { deleteAccount, listAccounts, listGroups, saveAccount } from "../lib/hq-api";
import { useAuth } from "./AuthProvider";
import { ManagerSkeleton } from "./Skeleton";

type AccountRow = Omit<ConsoleAccount, "password">;

const blank = {
  id: "",
  name: "",
  email: "",
  username: "",
  password: "",
  groupId: "",
  active: true,
};

export function AccountManager() {
  const { session, setSession } = useAuth();
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [groups, setGroups] = useState<ConsoleGroup[]>([]);
  const [draft, setDraft] = useState(blank);
  const [ready, setReady] = useState(false);

  async function load() {
    const [rows, groupRows] = await Promise.all([listAccounts(), listGroups()]);
    setAccounts(rows);
    setGroups(groupRows);
    if (!draft.groupId && groupRows[0]) {
      setDraft((current) => ({ ...current, groupId: current.groupId || groupRows[0].id }));
    }
    setReady(true);
  }

  useEffect(() => {
    load().catch((err) => {
      toast.error(err, "Could not load accounts");
      setReady(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function edit(row: AccountRow) {
    setDraft({ ...row, password: "" });
  }

  async function onSave() {
    try {
      const saved = await saveAccount({
        ...draft,
        password: draft.password.trim() || undefined,
      });
      if (session && saved.id === session.id) {
        const group = groups.find((row) => row.id === saved.groupId);
        if (group) {
          setSession({
            ...session,
            name: saved.name,
            email: saved.email,
            username: saved.username,
            groupId: saved.groupId,
            groupName: group.name,
            departments: group.departments,
            privileges: group.privileges,
          });
        }
      }
      await load();
      setDraft({ ...blank, groupId: groups[0]?.id ?? "" });
      toast.success("Account saved. They will see menus from their group at next sign-in.");
    } catch (err) {
      toast.error(err, "Could not save account");
    }
  }

  async function onDelete(id: string) {
    try {
      await deleteAccount(id);
      await load();
      if (draft.id === id) setDraft({ ...blank, groupId: groups[0]?.id ?? "" });
      toast.success("Account deleted.");
    } catch (err) {
      toast.error(err, "Could not delete account");
    }
  }

  if (!ready) return <ManagerSkeleton />;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <section className="overflow-hidden rounded-2xl bg-pos-surface shadow-pos-md">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-pos-border text-pos-ink-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Group</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {accounts.map((row) => (
              <tr key={row.id} className="border-b border-pos-border/60">
                <td className="px-4 py-3 font-medium">{row.name}</td>
                <td className="px-4 py-3 text-pos-ink-muted">{row.email}</td>
                <td className="px-4 py-3">
                  {groups.find((group) => group.id === row.groupId)?.name ?? row.groupId}
                </td>
                <td className="px-4 py-3">{row.active ? "Active" : "Disabled"}</td>
                <td className="px-4 py-3 text-right">
                  <button type="button" className="text-pos-primary" onClick={() => edit(row)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="ml-3 text-pos-ink-faint"
                    onClick={() => onDelete(row.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <form
        className="rounded-2xl bg-pos-surface p-5 shadow-pos-md"
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
      >
        <h2 className="font-semibold text-pos-ink">{draft.id ? "Edit account" : "New account"}</h2>
        <label className="mt-4 block text-sm font-medium text-pos-ink">Name</label>
        <input
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          className="mt-1 w-full rounded-xl border border-pos-border bg-pos-surface px-3 py-2 text-sm text-pos-ink outline-none focus:border-pos-primary"
          required
        />
        <label className="mt-3 block text-sm font-medium text-pos-ink">Email</label>
        <input
          type="email"
          value={draft.email}
          onChange={(event) => setDraft({ ...draft, email: event.target.value })}
          className="mt-1 w-full rounded-xl border border-pos-border bg-pos-surface px-3 py-2 text-sm text-pos-ink outline-none focus:border-pos-primary"
          required
        />
        <label className="mt-3 block text-sm font-medium text-pos-ink">Username</label>
        <input
          value={draft.username}
          onChange={(event) => setDraft({ ...draft, username: event.target.value })}
          className="mt-1 w-full rounded-xl border border-pos-border bg-pos-surface px-3 py-2 text-sm text-pos-ink outline-none focus:border-pos-primary"
          required
        />
        <label className="mt-3 block text-sm font-medium text-pos-ink">Group</label>
        <select
          value={draft.groupId}
          onChange={(event) => setDraft({ ...draft, groupId: event.target.value })}
          className="mt-1 w-full rounded-xl border border-pos-border bg-pos-surface px-3 py-2 text-sm text-pos-ink outline-none focus:border-pos-primary"
          required
        >
          <option value="">Select group</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
        <label className="mt-3 block text-sm font-medium text-pos-ink">
          Password {draft.id ? "(leave blank to keep)" : ""}
        </label>
        <input
          type="password"
          value={draft.password}
          onChange={(event) => setDraft({ ...draft, password: event.target.value })}
          className="mt-1 w-full rounded-xl border border-pos-border bg-pos-surface px-3 py-2 text-sm text-pos-ink outline-none focus:border-pos-primary"
          required={!draft.id}
        />
        <label className="mt-3 flex items-center gap-2 text-sm text-pos-ink">
          <input
            type="checkbox"
            className="accent-pos-primary"
            checked={draft.active}
            onChange={(event) => setDraft({ ...draft, active: event.target.checked })}
          />
          Active
        </label>
        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            className="rounded-xl bg-pos-primary px-4 py-2.5 text-sm font-semibold text-white"
          >
            Save account
          </button>
          {draft.id ? (
            <button
              type="button"
              className="rounded-xl border border-pos-border px-4 py-2.5 text-sm text-pos-ink hover:bg-pos-surface-muted"
              onClick={() => setDraft({ ...blank, groupId: groups[0]?.id ?? "" })}
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
