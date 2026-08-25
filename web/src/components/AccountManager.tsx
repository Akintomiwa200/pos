"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Check,
  ChevronDown,
  Columns3,
  Eye,
  Filter,
  LayoutGrid,
  Mail,
  Pencil,
  Plus,
  Settings2,
  Shield,
  ArrowUpDown,
  Table2,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "@/lib/toast";
import type { ConsoleGroup } from "../lib/access";
import { deleteAccount, listAccounts, listGroups, saveAccount } from "../lib/hq-api";
import { useAuth } from "./AuthProvider";
import { ManagerSkeleton } from "./Skeleton";
import { PrimaryButton, SetupHeader } from "./setup/SetupChrome";
import { AccountFormSheet } from "./setup/accounts/AccountFormSheet";
import {
  PersonAvatar,
  ProfileBanner,
  groupTone,
  statusTone,
  type AccountRow,
  type AccountViewMode,
} from "./setup/accounts/account-ui";
import {
  firstAccountError,
  validateAccountDraft,
} from "@/lib/account-validation";

type SortKey = "name" | "group" | "status" | "email";
type StatusFilter = "all" | "active" | "disabled";

const VIEW_OPTIONS: Array<{
  id: AccountViewMode;
  label: string;
  icon: typeof Table2;
}> = [
  { id: "table", label: "Table view", icon: Table2 },
  { id: "gallery", label: "Gallery view", icon: LayoutGrid },
  { id: "board", label: "Board view", icon: Columns3 },
];

const blank = (groupId = "") => ({
  id: "",
  name: "",
  email: "",
  username: "",
  password: "",
  groupId,
  active: true,
});

function ToolbarButton({
  icon,
  label,
  active,
  onClick,
  menu,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  menu?: ReactNode;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${
          active
            ? "border-pos-primary/30 bg-pos-primary-soft text-pos-primary"
            : "border-pos-border bg-pos-surface text-pos-ink hover:bg-pos-surface-muted"
        }`}
      >
        {icon}
        {label}
        {menu ? <ChevronDown size={14} className="text-pos-ink-faint" /> : null}
      </button>
      {menu}
    </div>
  );
}

function MenuPanel({
  open,
  children,
  align = "left",
}: {
  open: boolean;
  children: ReactNode;
  align?: "left" | "right";
}) {
  if (!open) return null;
  return (
    <div
      className={`absolute top-[calc(100%+6px)] z-30 min-w-[200px] rounded-2xl border border-pos-border bg-pos-surface p-1.5 shadow-pos-md ${
        align === "right" ? "right-0" : "left-0"
      }`}
    >
      {children}
    </div>
  );
}

function MenuItem({
  label,
  active,
  onClick,
  icon,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-pos-surface-muted ${
        active ? "font-semibold text-pos-ink" : "text-pos-ink-muted"
      }`}
    >
      <span className="inline-flex items-center gap-2">
        {icon}
        {label}
      </span>
      {active ? <Check size={14} className="text-pos-primary" /> : null}
    </button>
  );
}

export function AccountManager() {
  const router = useRouter();
  const { session, setSession } = useAuth();
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [groups, setGroups] = useState<ConsoleGroup[]>([]);
  const [draft, setDraft] = useState(blank());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewAnchor, setPreviewAnchor] = useState<{ top: number; left: number } | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [viewMode, setViewMode] = useState<AccountViewMode>("table");
  const [menu, setMenu] = useState<"view" | "filter" | "sort" | "settings" | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const previewCardRef = useRef<HTMLDivElement>(null);
  const previewTriggersRef = useRef<Map<string, HTMLButtonElement>>(new Map());

  function closePreview() {
    setPreviewId(null);
    setPreviewAnchor(null);
  }

  function openPreview(id: string, trigger: HTMLButtonElement) {
    const rect = trigger.getBoundingClientRect();
    const cardWidth = 320;
    const gap = 8;
    const left = Math.min(
      Math.max(12, rect.left),
      window.innerWidth - cardWidth - 12,
    );
    const top = Math.min(rect.bottom + gap, window.innerHeight - 24);
    setMenu(null);
    setPreviewId(id);
    setPreviewAnchor({ top, left });
  }

  async function load() {
    const [rows, groupRows] = await Promise.all([listAccounts(), listGroups()]);
    setAccounts(rows);
    setGroups(groupRows);
    setReady(true);
  }

  useEffect(() => {
    load().catch((err) => {
      toast.error(err, "Could not load accounts");
      setReady(true);
    });
  }, []);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (previewCardRef.current?.contains(target)) return;

      const trigger = previewId
        ? previewTriggersRef.current.get(previewId)
        : null;
      if (trigger?.contains(target)) return;

      closePreview();

      if (!rootRef.current?.contains(target)) setMenu(null);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [previewId]);

  useLayoutEffect(() => {
    if (!previewId) return;

    function syncAnchor() {
      const trigger = previewTriggersRef.current.get(previewId!);
      if (!trigger) {
        closePreview();
        return;
      }
      const rect = trigger.getBoundingClientRect();
      const cardWidth = 320;
      const gap = 8;
      const estimatedHeight = previewCardRef.current?.offsetHeight ?? 360;
      let top = rect.bottom + gap;
      if (top + estimatedHeight > window.innerHeight - 12) {
        top = Math.max(12, rect.top - estimatedHeight - gap);
      }
      const left = Math.min(
        Math.max(12, rect.left),
        window.innerWidth - cardWidth - 12,
      );
      setPreviewAnchor({ top, left });
    }

    syncAnchor();
    window.addEventListener("resize", syncAnchor);
    window.addEventListener("scroll", syncAnchor, true);
    return () => {
      window.removeEventListener("resize", syncAnchor);
      window.removeEventListener("scroll", syncAnchor, true);
    };
  }, [previewId]);

  const defaultGroupId = groups[0]?.id ?? "";

  const rows = useMemo(() => {
    let next = [...accounts];
    if (statusFilter === "active") next = next.filter((row) => row.active);
    if (statusFilter === "disabled") next = next.filter((row) => !row.active);

    next.sort((a, b) => {
      const groupName = (id: string) => groups.find((g) => g.id === id)?.name ?? id;
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      if (sortKey === "email") cmp = a.email.localeCompare(b.email);
      if (sortKey === "group") cmp = groupName(a.groupId).localeCompare(groupName(b.groupId));
      if (sortKey === "status") cmp = Number(b.active) - Number(a.active);
      return sortAsc ? cmp : -cmp;
    });
    return next;
  }, [accounts, groups, sortAsc, sortKey, statusFilter]);

  const preview = previewId ? accounts.find((row) => row.id === previewId) : null;
  const previewGroup = preview
    ? groups.find((group) => group.id === preview.groupId)
    : null;

  const allVisibleSelected =
    rows.length > 0 && rows.every((row) => selected.has(row.id));

  const activeView = VIEW_OPTIONS.find((option) => option.id === viewMode) ?? VIEW_OPTIONS[0];
  const ActiveViewIcon = activeView.icon;

  const boardColumns = useMemo(() => {
    const byGroup = new Map<string, AccountRow[]>();
    for (const group of groups) byGroup.set(group.id, []);
    for (const row of rows) {
      const list = byGroup.get(row.groupId) ?? [];
      list.push(row);
      byGroup.set(row.groupId, list);
    }
    return groups
      .map((group) => ({
        group,
        accounts: byGroup.get(group.id) ?? [],
      }))
      .concat(
        [...byGroup.entries()]
          .filter(([id]) => !groups.some((group) => group.id === id))
          .map(([id, list]) => ({
            group: { id, name: id, departments: [], privileges: [] } as ConsoleGroup,
            accounts: list,
          })),
      );
  }, [groups, rows]);

  function openProfile(id: string) {
    closePreview();
    router.push(`/setup/users/account/${encodeURIComponent(id)}`);
  }

  function toggleAllVisible() {
    setSelected((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        rows.forEach((row) => next.delete(row.id));
      } else {
        rows.forEach((row) => next.add(row.id));
      }
      return next;
    });
  }

  function toggleOne(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openNew() {
    closePreview();
    setDraft(blank(defaultGroupId));
    setSheetOpen(true);
  }

  function openEdit(row: AccountRow) {
    closePreview();
    setDraft({ ...row, password: "" });
    setSheetOpen(true);
  }

  async function onSave() {
    const nextErrors = validateAccountDraft(draft);
    const message = firstAccountError(nextErrors);
    if (message) {
      toast.error(message);
      return;
    }

    setBusy(true);
    try {
      const saved = await saveAccount({
        ...draft,
        id: draft.id || undefined,
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
      setSheetOpen(false);
      setDraft(blank(defaultGroupId));
      toast.success(
        draft.id
          ? "Account saved."
          : "Account created. A welcome email was sent when mail is configured.",
      );
    } catch (err) {
      toast.error(err, "Could not save account");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!draft.id) return;
    setBusy(true);
    try {
      await deleteAccount(draft.id);
      await load();
      setSheetOpen(false);
      setSelected((current) => {
        const next = new Set(current);
        next.delete(draft.id);
        return next;
      });
      setDraft(blank(defaultGroupId));
      toast.success("Account deleted.");
    } catch (err) {
      toast.error(err, "Could not delete account");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <ManagerSkeleton variant="table" />;

  return (
    <div ref={rootRef}>
      <SetupHeader
        kicker="Setup · Users"
        title="Accounts"
        copy="Assign each person to a group. The sidebar they see comes from that group's departments and privileges."
        action={
          <PrimaryButton onClick={openNew}>
            <span className="inline-flex items-center gap-2">
              <Plus size={16} />
              New account
            </span>
          </PrimaryButton>
        }
      />

      <section className="overflow-hidden rounded-[24px] bg-pos-surface shadow-pos-md">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-pos-border/70 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <ToolbarButton
              icon={<ActiveViewIcon size={15} />}
              label={activeView.label}
              active={menu === "view"}
              onClick={() => setMenu(menu === "view" ? null : "view")}
              menu={
                <MenuPanel open={menu === "view"}>
                  {VIEW_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    return (
                      <MenuItem
                        key={option.id}
                        label={option.label}
                        icon={<Icon size={14} />}
                        active={viewMode === option.id}
                        onClick={() => {
                          setViewMode(option.id);
                          closePreview();
                          setMenu(null);
                        }}
                      />
                    );
                  })}
                </MenuPanel>
              }
            />
            <ToolbarButton
              icon={<Filter size={15} />}
              label={statusFilter === "all" ? "Filter" : statusFilter === "active" ? "Active" : "Disabled"}
              active={menu === "filter" || statusFilter !== "all"}
              onClick={() => setMenu(menu === "filter" ? null : "filter")}
              menu={
                <MenuPanel open={menu === "filter"}>
                  <MenuItem
                    label="All accounts"
                    active={statusFilter === "all"}
                    onClick={() => {
                      setStatusFilter("all");
                      setMenu(null);
                    }}
                  />
                  <MenuItem
                    label="Active only"
                    active={statusFilter === "active"}
                    onClick={() => {
                      setStatusFilter("active");
                      setMenu(null);
                    }}
                  />
                  <MenuItem
                    label="Disabled only"
                    active={statusFilter === "disabled"}
                    onClick={() => {
                      setStatusFilter("disabled");
                      setMenu(null);
                    }}
                  />
                </MenuPanel>
              }
            />
            <ToolbarButton
              icon={<ArrowUpDown size={15} />}
              label="Sort"
              active={menu === "sort"}
              onClick={() => setMenu(menu === "sort" ? null : "sort")}
              menu={
                <MenuPanel open={menu === "sort"}>
                  {(
                    [
                      ["name", "Name"],
                      ["group", "Group"],
                      ["status", "Status"],
                      ["email", "Email"],
                    ] as const
                  ).map(([key, label]) => (
                    <MenuItem
                      key={key}
                      label={`${label}${sortKey === key ? (sortAsc ? " ↑" : " ↓") : ""}`}
                      active={sortKey === key}
                      onClick={() => {
                        if (sortKey === key) setSortAsc((value) => !value);
                        else {
                          setSortKey(key);
                          setSortAsc(true);
                        }
                        setMenu(null);
                      }}
                    />
                  ))}
                </MenuPanel>
              }
            />
          </div>

          <ToolbarButton
            icon={<Settings2 size={15} />}
            label="View settings"
            active={menu === "settings"}
            onClick={() => setMenu(menu === "settings" ? null : "settings")}
            menu={
              <MenuPanel open={menu === "settings"} align="right">
                <MenuItem
                  label="Reset filters"
                  onClick={() => {
                    setStatusFilter("all");
                    setSortKey("name");
                    setSortAsc(true);
                    setSelected(new Set());
                    setMenu(null);
                  }}
                />
              </MenuPanel>
            }
          />
        </div>

        {viewMode === "table" ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead>
                <tr className="border-b border-pos-border/70 text-[12px] font-medium text-pos-ink-muted">
                  <th className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-pos-border accent-pos-primary"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisible}
                      aria-label="Select all accounts"
                    />
                  </th>
                  <th className="px-3 py-3 font-medium">Person</th>
                  <th className="px-3 py-3 font-medium">Group</th>
                  <th className="px-3 py-3 font-medium">Username</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Email</th>
                  <th className="px-3 py-3 font-medium">Access</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-pos-ink-faint">
                      No accounts match this view.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const groupName =
                      groups.find((group) => group.id === row.groupId)?.name ?? row.groupId;
                    const isPreview = previewId === row.id;

                    return (
                      <tr
                        key={row.id}
                        className={`border-b border-pos-border/50 transition last:border-b-0 ${
                          isPreview || selected.has(row.id)
                            ? "bg-pos-surface-muted/70"
                            : "hover:bg-pos-surface-muted/40"
                        }`}
                      >
                        <td className="px-4 py-4 align-middle">
                          <input
                            type="checkbox"
                            className="size-4 rounded border-pos-border accent-pos-primary"
                            checked={selected.has(row.id)}
                            onChange={() => toggleOne(row.id)}
                            aria-label={`Select ${row.name}`}
                          />
                        </td>
                        <td className="px-3 py-4 align-middle">
                          <button
                            type="button"
                            ref={(el) => {
                              if (el) previewTriggersRef.current.set(row.id, el);
                              else previewTriggersRef.current.delete(row.id);
                            }}
                            className="flex max-w-[240px] items-center gap-3 text-left"
                            onClick={(event) => {
                              if (isPreview) closePreview();
                              else openPreview(row.id, event.currentTarget);
                            }}
                          >
                            <PersonAvatar name={row.name} id={row.id} />
                            <span className="min-w-0">
                              <span className="block truncate font-semibold text-pos-ink">
                                {row.name}
                              </span>
                              <span className="mt-0.5 block truncate text-[12px] text-pos-ink-faint">
                                @{row.username}
                              </span>
                            </span>
                          </button>
                        </td>
                        <td className="px-3 py-4 align-middle text-pos-ink">{groupName}</td>
                        <td className="px-3 py-4 align-middle">
                          <span className="inline-flex rounded-lg border border-pos-border bg-pos-surface px-2.5 py-1 text-[12px] text-pos-ink-muted">
                            @{row.username}
                          </span>
                        </td>
                        <td className="px-3 py-4 align-middle">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-medium ${statusTone(row.active)}`}
                          >
                            {row.active ? "Active" : "Disabled"}
                          </span>
                        </td>
                        <td className="px-3 py-4 align-middle">
                          <a
                            href={`mailto:${row.email}`}
                            className="text-pos-ink-muted hover:text-pos-primary"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {row.email}
                          </a>
                        </td>
                        <td className="px-3 py-4 align-middle">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-medium ${groupTone(groupName)}`}
                          >
                            {groupName}
                            <ChevronDown size={12} className="opacity-60" />
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : null}

        {viewMode === "gallery" ? (
          <div className="p-4">
            {rows.length === 0 ? (
              <p className="py-10 text-center text-sm text-pos-ink-faint">
                No accounts match this view.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {rows.map((row) => {
                  const groupName =
                    groups.find((group) => group.id === row.groupId)?.name ?? row.groupId;
                  return (
                    <article
                      key={row.id}
                      className="overflow-hidden rounded-[22px] border border-pos-border/70 bg-pos-surface shadow-pos-sm transition hover:shadow-pos-md"
                    >
                      <ProfileBanner>
                        <div className="h-20" />
                      </ProfileBanner>
                      <div className="relative px-4 pb-4 pt-0">
                        <div className="-mt-8 mb-3 flex items-end justify-between gap-2">
                          <PersonAvatar name={row.name} id={row.id} size={64} />
                          <span
                            className={`mb-1 inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${statusTone(row.active)}`}
                          >
                            {row.active ? "Active" : "Disabled"}
                          </span>
                        </div>
                        <h3 className="truncate text-[15px] font-semibold text-pos-ink">
                          {row.name}
                        </h3>
                        <p className="mt-0.5 truncate text-[12px] text-pos-ink-muted">
                          {groupName} · @{row.username}
                        </p>
                        <p className="mt-2 truncate text-[12px] text-pos-ink-faint">{row.email}</p>
                        <div className="mt-4 flex gap-2">
                          <button
                            type="button"
                            className="flex-1 rounded-full bg-pos-primary px-3 py-2 text-[12px] font-semibold text-white"
                            onClick={() => openProfile(row.id)}
                          >
                            Open profile
                          </button>
                          <button
                            type="button"
                            className="rounded-full border border-pos-border px-3 py-2 text-[12px] font-medium text-pos-ink hover:bg-pos-surface-muted"
                            onClick={() => openEdit(row)}
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        {viewMode === "board" ? (
          <div className="overflow-x-auto p-4">
            {rows.length === 0 ? (
              <p className="py-10 text-center text-sm text-pos-ink-faint">
                No accounts match this view.
              </p>
            ) : (
              <div className="flex min-w-max gap-4">
                {boardColumns.map(({ group, accounts: columnRows }) => (
                  <div
                    key={group.id}
                    className="flex w-[280px] shrink-0 flex-col rounded-[20px] bg-pos-surface-muted/60 p-3"
                  >
                    <div className="mb-3 flex items-center justify-between gap-2 px-1">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-pos-ink">{group.name}</p>
                        <p className="text-[11px] text-pos-ink-faint">
                          {columnRows.length} {columnRows.length === 1 ? "person" : "people"}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-lg px-2 py-1 text-[11px] font-medium ${groupTone(group.name)}`}
                      >
                        {group.name}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      {columnRows.length === 0 ? (
                        <p className="rounded-2xl border border-dashed border-pos-border px-3 py-6 text-center text-[12px] text-pos-ink-faint">
                          No one in this group
                        </p>
                      ) : (
                        columnRows.map((row) => (
                          <button
                            key={row.id}
                            type="button"
                            onClick={() => openProfile(row.id)}
                            className="rounded-2xl border border-pos-border/70 bg-pos-surface p-3 text-left shadow-pos-sm transition hover:border-pos-primary/30 hover:shadow-pos-md"
                          >
                            <div className="flex items-center gap-3">
                              <PersonAvatar name={row.name} id={row.id} size={36} />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-pos-ink">
                                  {row.name}
                                </p>
                                <p className="truncate text-[11px] text-pos-ink-faint">
                                  @{row.username}
                                </p>
                              </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between gap-2">
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${statusTone(row.active)}`}
                              >
                                {row.active ? "Active" : "Disabled"}
                              </span>
                              <span className="truncate text-[11px] text-pos-ink-muted">
                                {row.email}
                              </span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </section>

      <AccountFormSheet
        open={sheetOpen}
        draft={draft}
        groups={groups}
        busy={busy}
        onClose={() => setSheetOpen(false)}
        onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
        onSubmit={onSave}
        onDelete={draft.id ? onDelete : undefined}
      />

      {preview && previewAnchor
        ? createPortal(
            <AccountPreviewCard
              cardRef={previewCardRef}
              account={preview}
              groupName={previewGroup?.name ?? preview.groupId}
              top={previewAnchor.top}
              left={previewAnchor.left}
              onClose={closePreview}
              onEdit={() => openEdit(preview)}
              onOpenProfile={() => openProfile(preview.id)}
            />,
            document.body,
          )
        : null}
    </div>
  );
}

function AccountPreviewCard({
  account,
  groupName,
  top,
  left,
  onClose,
  onEdit,
  onOpenProfile,
  cardRef,
}: {
  account: AccountRow;
  groupName: string;
  top: number;
  left: number;
  onClose: () => void;
  onEdit: () => void;
  onOpenProfile: () => void;
  cardRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={cardRef}
      className="fixed z-[80] w-[320px] overflow-hidden rounded-[22px] border border-pos-border bg-pos-surface shadow-pos-md"
      style={{ top, left }}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <ProfileBanner>
        <div className="relative h-[88px]">
          <button
            type="button"
            className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-white/70 text-pos-ink hover:bg-white"
            onClick={onClose}
            aria-label="Close preview"
          >
            <X size={14} />
          </button>
        </div>
      </ProfileBanner>

      <div className="relative px-5 pb-5 pt-0">
        <div className="-mt-10 mb-3 flex items-end justify-between gap-3">
          <PersonAvatar name={account.name} id={account.id} size={72} />
          <div className="mb-1 flex items-center gap-2">
            <a
              href={`mailto:${account.email}`}
              className="grid size-9 place-items-center rounded-full border border-pos-border bg-pos-surface text-pos-ink hover:bg-pos-surface-muted"
              aria-label={`Email ${account.name}`}
            >
              <Mail size={15} />
            </a>
            <button
              type="button"
              onClick={onEdit}
              className="grid size-9 place-items-center rounded-full border border-pos-border bg-pos-surface text-pos-ink hover:bg-pos-surface-muted"
              aria-label="Edit account"
            >
              <Pencil size={15} />
            </button>
          </div>
        </div>

        <p className="text-[18px] font-semibold tracking-tight text-pos-ink">{account.name}</p>
        <p className="mt-0.5 text-[13px] text-pos-ink-muted">
          {groupName} · @{account.username}
        </p>

        <ul className="mt-4 space-y-3 text-sm">
          <PreviewRow icon={<Briefcase size={15} />} label={groupName} />
          <PreviewRow icon={<UserRound size={15} />} label={`@${account.username}`} />
          <PreviewRow icon={<Mail size={15} />} label={account.email} />
          <PreviewRow
            icon={<Shield size={15} />}
            label={
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-medium ${statusTone(account.active)}`}
              >
                {account.active ? "Active" : "Disabled"}
              </span>
            }
          />
          <PreviewRow
            icon={<Eye size={15} />}
            label={
              <span
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-medium ${groupTone(groupName)}`}
              >
                {groupName}
                <ChevronDown size={12} className="opacity-60" />
              </span>
            }
          />
        </ul>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onOpenProfile}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-pos-primary px-3 py-2.5 text-[13px] font-semibold text-white shadow-pos-primary transition hover:opacity-90"
          >
            Open full profile
          </button>
          <a
            href={`mailto:${account.email}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-pos-border bg-pos-surface px-3 py-2.5 text-[13px] font-medium text-pos-ink transition hover:bg-pos-surface-muted"
          >
            <Mail size={14} />
            Email
          </a>
        </div>
      </div>
    </div>
  );
}

function PreviewRow({ icon, label }: { icon: ReactNode; label: ReactNode }) {
  return (
    <li className="flex items-center gap-3 text-pos-ink">
      <span className="grid size-7 shrink-0 place-items-center text-pos-ink-faint">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </li>
  );
}
