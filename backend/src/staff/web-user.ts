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
  avatarUrl?: string | null;
};

export type Rank = "super" | "admin" | "staff";

/**
 * Super Admin is an explicit HQ-only identity. Producer scope or a wildcard is
 * not enough on its own — otherwise every producer role collapses into the
 * top rank and can reach the platform desk.
 */
export function isSuperAdmin(user: {
  groupId?: string | null;
  groupName?: string | null;
  roleName?: string | null;
  scope?: string | null;
  privileges?: string[] | null;
}) {
  const groupId = (user.groupId ?? "").trim().toLowerCase();
  const role = (user.groupName ?? user.roleName ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return groupId === "g-super-admin" || role === "superadmin";
}

/** Tenant Admin manages one company team; a wildcard tenant role is the same rank. */
export function isTenantAdmin(user: {
  groupId?: string | null;
  groupName?: string | null;
  roleName?: string | null;
  scope?: string | null;
  privileges?: string[] | null;
}) {
  if (user.scope === "producer" || isSuperAdmin(user)) return false;
  const groupId = (user.groupId ?? "").trim().toLowerCase();
  return groupId === "g-admin" || Boolean(user.privileges?.includes("*"));
}

export function rankFor(user: {
  groupId?: string | null;
  groupName?: string | null;
  roleName?: string | null;
  scope?: string | null;
  privileges?: string[] | null;
}): Rank {
  if (isSuperAdmin(user)) return "super";
  if (isTenantAdmin(user)) return "admin";
  return "staff";
}

/**
 * Console privileges that imply a till supervisor. Deliberately excludes the
 * transactional privileges every selling role holds (`pos-hub`, `payments`,
 * `sales-return-list`, `customer`) so a "Cashier" group is not upgraded to a
 * supervisor on the till.
 */
/** HQ privileges that should be able to open till Settings with a PIN. */
const ADMIN_PRIVS = new Set([
  "settings",
  "super-admins",
  "super-admin-roles",
  "super-people-access",
  "super-people-roles",
]);

const SUPERVISOR_PRIVS = new Set([
  "audit",
  "staff",
  "setup",
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
  if (
    privs.has("*") ||
    u.scope === "producer" ||
    ADMIN_GROUPS.has(groupId) ||
    [...ADMIN_PRIVS].some((p) => privs.has(p))
  ) {
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
    roleName:
      (u.groupName || "").trim() ||
      (u.scope === "producer"
        ? "Super Admin"
        : role === "admin"
          ? "Administrator"
          : role === "supervisor"
            ? "Supervisor"
            : "Cashier"),
    source: "account",
    posLogin: false,
    hqAccountId: u.id,
    privileges,
    password: "",
    pin: "",
    hasPin: false,
    avatar: u.avatarUrl || avatarFor(u.name),
  };
}