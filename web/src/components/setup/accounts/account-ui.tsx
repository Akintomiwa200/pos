"use client";

import type { ReactNode } from "react";
import type { ConsoleAccount } from "@/lib/access";

export type AccountRow = Omit<ConsoleAccount, "password">;

export type AccountViewMode = "table" | "gallery" | "board";

export const AVATAR_COLORS = [
  "var(--pos-avatar-1)",
  "var(--pos-avatar-2)",
  "var(--pos-avatar-3)",
  "var(--pos-avatar-4)",
  "var(--pos-avatar-5)",
];

export function accountInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function avatarColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash + seed.charCodeAt(i) * (i + 1)) % 997;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function groupTone(name: string) {
  const key = name.toLowerCase();
  if (key.includes("admin")) return "bg-[#eee8ff] text-[#5b3fd4]";
  if (key.includes("account")) return "bg-[#fff1e8] text-[#c2410c]";
  if (key.includes("sales")) return "bg-[#e8f8ef] text-[#15803d]";
  return "bg-pos-surface-muted text-pos-ink-muted";
}

export function statusTone(active: boolean) {
  return active
    ? "bg-[#e8f8ef] text-[#15803d]"
    : "bg-[#fff1e8] text-[#c2410c]";
}

export function PersonAvatar({
  name,
  id,
  size = 40,
}: {
  name: string;
  id: string;
  size?: number;
}) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-semibold text-white shadow-pos-sm ring-2 ring-white"
      style={{
        width: size,
        height: size,
        fontSize: size > 72 ? 28 : size > 56 ? 22 : size > 40 ? 14 : 12,
        background: avatarColor(id || name),
      }}
      aria-hidden
    >
      {accountInitials(name)}
    </span>
  );
}

export function ProfileBanner({ children }: { children?: ReactNode }) {
  return (
    <div
      className="relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #7dd3fc 0%, #a5b4fc 42%, #c4b5fd 72%, #ddd6fe 100%)",
      }}
    >
      {children}
    </div>
  );
}
