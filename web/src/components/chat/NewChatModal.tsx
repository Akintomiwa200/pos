"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Users, UserRound, X } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  createChatConversation,
  listChatTargets,
  type ChatConversation,
  type ChatTarget,
} from "@/lib/hq-chat";

export function NewChatModal({
  open,
  self,
  onClose,
  onCreated,
}: {
  open: boolean;
  self: { id: string; name: string } | null;
  onClose: () => void;
  onCreated: (conversation: ChatConversation) => void;
}) {
  const [mode, setMode] = useState<"direct" | "group">("direct");
  const [targets, setTargets] = useState<ChatTarget[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setTitle("");
    setSelected([]);
    setLoading(true);
    listChatTargets()
      .then((rows) => setTargets(rows))
      .catch(() => toast.error("Could not load chat contacts."))
      .finally(() => setLoading(false));
  }, [open]);

  const people = useMemo(() => {
    const q = query.trim().toLowerCase();
    const withoutSelf = targets.filter((t) => t.id !== self?.id);
    return q
      ? withoutSelf.filter(
          (t) => t.name.toLowerCase().includes(q) || t.username.toLowerCase().includes(q),
        )
      : withoutSelf;
  }, [targets, query, self?.id]);

  async function createDirect(target: ChatTarget) {
    if (busy) return;
    setBusy(true);
    try {
      const conversation = await createChatConversation({
        kind: "direct",
        memberIds: [target.id],
        name: target.name,
        createdBy: self ?? undefined,
      });
      onCreated(conversation);
    } catch (err) {
      toast.error(err, "Could not start a chat.");
    } finally {
      setBusy(false);
    }
  }

  async function createGroup() {
    if (busy || selected.length < 2) return;
    setBusy(true);
    try {
      const conversation = await createChatConversation({
        kind: "group",
        memberIds: selected,
        name: title.trim() || undefined,
        createdBy: self ?? undefined,
      });
      onCreated(conversation);
    } catch (err) {
      toast.error(err, "Could not create the group.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  const toggle = (id: string) =>
    setSelected((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-pos-surface shadow-pos-lg">
        <div className="flex items-center justify-between border-b border-pos-border/60 px-5 py-4">
          <h2 className="text-base font-semibold text-pos-ink">New chat</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-pos-ink-faint transition hover:bg-pos-surface-muted hover:text-pos-ink"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-5 pt-4">
          {(
            [
              { id: "direct", label: "Single chat", icon: UserRound },
              { id: "group", label: "Group chat", icon: Users },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMode(tab.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${
                mode === tab.id
                  ? "bg-pos-primary text-white"
                  : "bg-pos-surface-muted text-pos-ink-muted hover:text-pos-ink"
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-5 pt-3">
          <div className="flex items-center gap-2 rounded-full bg-pos-surface-muted px-3 py-2">
            <Search size={15} className="shrink-0 text-pos-ink-faint" />
            <input
              className="w-full bg-transparent text-sm text-pos-ink outline-none placeholder:text-pos-ink-faint"
              placeholder="Search people"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {/* List */}
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {loading ? (
            <p className="px-4 py-6 text-center text-sm text-pos-ink-faint">Loading contacts…</p>
          ) : people.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-pos-ink-faint">
              {targets.length ? "No one matches that search." : "No other staff accounts yet."}
            </p>
          ) : (
            people.map((target) => {
              const isSelected = selected.includes(target.id);
              const initials = target.name
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((p) => p[0])
                .join("")
                .toUpperCase();
              return (
                <button
                  key={target.id}
                  onClick={() => {
                    if (mode === "direct") void createDirect(target);
                    else toggle(target.id);
                  }}
                  className={`mb-1 flex w-full items-center gap-3 rounded-[16px] px-3 py-2.5 text-left transition ${
                    isSelected ? "bg-pos-primary-soft" : "hover:bg-pos-surface-muted"
                  }`}
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-pos-primary-soft text-pos-primary">
                    <span className="text-xs font-semibold">{initials}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-pos-ink">{target.name}</p>
                    <p className="truncate text-[12px] text-pos-ink-faint">@{target.username}</p>
                  </div>
                  {isSelected ? (
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-pos-primary text-[11px] font-semibold text-white">
                      ✓
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>

        {/* Group footer */}
        {mode === "group" ? (
          <div className="border-t border-pos-border/60 p-4">
            <input
              className="mb-3 w-full rounded-xl bg-pos-surface-muted px-3.5 py-2.5 text-sm text-pos-ink outline-none placeholder:text-pos-ink-faint"
              placeholder="Group name (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <button
              onClick={() => void createGroup()}
              disabled={busy || selected.length < 2}
              className="w-full rounded-xl bg-pos-primary py-2.5 text-sm font-medium text-white shadow-pos-primary transition hover:opacity-90 disabled:opacity-50"
            >
              {busy
                ? "Creating…"
                : selected.length < 2
                  ? `Pick at least 2 people (${selected.length} selected)`
                  : `Create group (${selected.length + 1} members)`}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}