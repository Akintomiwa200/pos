import type { Privilege, StaffRole, StaffUser } from "./staff.types";

export function avatarFor(name: string) {
  const initial = (name.trim().charAt(0) || "?").toUpperCase();
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48'>` +
    `<rect width='48' height='48' rx='24' fill='%236d5ef2'/>` +
    `<text x='24' y='31' font-family='Arial,sans-serif' font-size='20' font-weight='600' fill='white' text-anchor='middle'>${initial}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export type WebUserLike = {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  scope?: string;
  privileges?: string[] | null;
};

const SUPERVISOR_PRIVS = new Set([
  "audit",
  "staff",
  "payments",
  "pos-hub",
  "setup",
  "settings",
  "manager",
  "supervisor",
]);

export function fromConsoleUser(u: WebUserLike): StaffUser | null {
  if (!u || !u.id || !u.name) return null;
  const privs = new Set(u.privileges ?? []);
  let role: StaffRole;
  if (privs.has("*") || u.scope === "producer") {
    role = "admin";
  } else if (
    [...SUPERVISOR_PRIVS].some((p) => privs.has(p))
  ) {
    role = "supervisor";
  } else {
    role = "cashier";
  }
  const privileges: Privilege[] =
    role === "admin"
      ? ["sell", "settings", "unlock", "day"]
      : role === "supervisor"
        ? ["sell", "unlock", "day"]
        : ["sell"];
  return {
    id: `web:${u.id}`,
    name: u.name,
    username: (u.username ?? "").trim() || (u.email || ""),
    email: u.email || "",
    role,
    privileges,
    password: "",
    pin: "",
    avatar: avatarFor(u.name),
  };
}