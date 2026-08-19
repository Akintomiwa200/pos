"use client";

import { useEffect, useState } from "react";
import type { ConsoleAccount, ConsoleGroup } from "../lib/access";
import { deleteAccount, listAccounts, listGroups, saveAccount } from "../lib/hq-api";
import { useAuth } from "./AuthProvider";

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
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  async function load() {
    const [rows, groupRows] = await Promise.all([listAccounts(), listGroups()]);
    setAccounts(rows);
    setGroups(groupRows);
    if (!draft.groupId && groupRows[0]) {
      setDraft((current) => ({ ...current, groupId: current.groupId || groupRows[0].id }));
    }
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Could not load accounts"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function edit(row: AccountRow) {
    setDraft({ ...row, password: "" });
    setError("");
    setStatus("");
  }

  async function onSave() {
    setError("");
    setStatus("");
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
      setStatus("Account saved. They will see menus from their group at next sign-in.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save account");
    }
  }

  async function onDelete(id: string) {
    setError("");
    try {
      await deleteAccount(id);
      await load();
      if (draft.id === id) setDraft({ ...blank, groupId: groups[0]?.id ?? "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete account");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <section className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgba(28,28,30,0.06)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-100 text-neutral-500">
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
              <tr key={row.id} className="border-b border-neutral-50">
                <td className="px-4 py-3 font-medium">{row.name}</td>
                <td className="px-4 py-3 text-neutral-600">{row.email}</td>
                <td className="px-4 py-3">
                  {groups.find((group) => group.id === row.groupId)?.name ?? row.groupId}
                </td>
                <td className="px-4 py-3">{row.active ? "Active" : "Disabled"}</td>
                <td className="px-4 py-3 text-right">
                  <button type="button" className="text-[#6d4aff]" onClick={() => edit(row)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="ml-3 text-neutral-400"
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
        className="rounded-2xl bg-white p-5 shadow-[0_8px_30px_rgba(28,28,30,0.06)]"
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
      >
        <h2 className="font-semibold">{draft.id ? "Edit account" : "New account"}</h2>
        <label className="mt-4 block text-sm font-medium">Name</label>
        <input
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 outline-none focus:border-[#7B61FF]"
          required
        />
        <label className="mt-3 block text-sm font-medium">Email</label>
        <input
          type="email"
          value={draft.email}
          onChange={(event) => setDraft({ ...draft, email: event.target.value })}
          className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 outline-none focus:border-[#7B61FF]"
          required
        />
        <label className="mt-3 block text-sm font-medium">Username</label>
        <input
          value={draft.username}
          onChange={(event) => setDraft({ ...draft, username: event.target.value })}
          className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 outline-none focus:border-[#7B61FF]"
          required
        />
        <label className="mt-3 block text-sm font-medium">Group</label>
        <select
          value={draft.groupId}
          onChange={(event) => setDraft({ ...draft, groupId: event.target.value })}
          className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 outline-none focus:border-[#7B61FF]"
          required
        >
          <option value="">Select group</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
        <label className="mt-3 block text-sm font-medium">
          Password {draft.id ? "(leave blank to keep)" : ""}
        </label>
        <input
          type="password"
          value={draft.password}
          onChange={(event) => setDraft({ ...draft, password: event.target.value })}
          className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 outline-none focus:border-[#7B61FF]"
          required={!draft.id}
        />
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="accent-[#6d4aff]"
            checked={draft.active}
            onChange={(event) => setDraft({ ...draft, active: event.target.checked })}
          />
          Active
        </label>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        {status ? <p className="mt-3 text-sm text-emerald-700">{status}</p> : null}
        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            className="rounded-xl bg-[#6d4aff] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Save account
          </button>
          {draft.id ? (
            <button
              type="button"
              className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm"
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
