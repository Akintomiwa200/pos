export type Privilege = "sell" | "settings" | "unlock" | "day";

export type StaffRole = "cashier" | "supervisor" | "admin";

export type StaffUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: StaffRole;
  /** HQ group name, e.g. Administrator, Super Admin, Store Manager, Cashier. */
  roleName?: string;
  /** Whether this row comes from company staff or an HQ account. */
  source?: "staff" | "account";
  /** True only for staff explicitly configured to sign in on a till. */
  posLogin?: boolean;
  /** HQ account this row is linked to, when set explicitly in Setup › Staff. */
  hqAccountId?: string;
  password: string;
  pin: string;
  /** Derived from whether a till PIN is stored. Never contains a PIN or hash. */
  hasPin: boolean;
  privileges: Privilege[];
  avatar: string;
};

export type ShiftRecord = {
  id: string;
  staffId: string;
  staffName: string;
  openedAt: string;
  closedAt: string | null;
  salesCount: number;
  salesMinor: number;
};

export function publicStaff(user: StaffUser) {
  const { pin: _pin, password: _password, ...rest } = user;
  return rest;
}

export function isSellOnly(user: { privileges: Privilege[] }) {
  return (
    user.privileges.includes("sell") &&
    !user.privileges.includes("settings") &&
    !user.privileges.includes("unlock")
  );
}

export function canAccessSettings(user: { privileges: Privilege[] }) {
  return user.privileges.includes("settings");
}

export function canUnlock(user: { privileges: Privilege[] }) {
  return user.privileges.includes("unlock");
}
