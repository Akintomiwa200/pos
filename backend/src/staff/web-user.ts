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
  groupId?: string | null;
  groupName?: string | null;
  privileges?: string[] | null;
};

/**
 * Console privileges that imply a till supervisor. Deliberately excludes the
 * transactional privileges every selling role holds (`pos-hub`, `payments`,
 * `sales-return-list`, `customer`) so a "Cashier" group is not upgraded to a
 * supervisor on the till.
 */
const SUPERVISOR_PRIVS = new Set([
  "audit",
  "staff",
  "setup",
  "settings",
  "manager",
  "supervisor",
]);

const ADMIN_GROUPS = new Set(["g-admin", "g-super-admin"]);
const SUPERVISOR_GROUPS = new Set(["g-store-manager", "g-supervisor"]);

export function fromConsoleUser(u: WebUserLike): StaffUser | null {
  if (!u || !u.id || !u.name) return null;
  const privs = new Set(u.privileges ?? []);
  const groupId = (u.groupId ?? "").trim().toLowerCase();
  let role: StaffRole;
  if (privs.has("*") || u.scope === "producer" || ADMIN_GROUPS.has(groupId)) {
    role = "admin";
  } else if (
    SUPERVISOR_GROUPS.has(groupId) ||
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