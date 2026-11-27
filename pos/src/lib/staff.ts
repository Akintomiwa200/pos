export type Privilege = "sell" | "settings" | "unlock" | "day";
export type StaffRole = "cashier" | "supervisor" | "admin";

export type StaffUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: StaffRole;
  /** HQ role name, e.g. Super Admin, Administrator, Store Manager, Cashier. */
  roleName?: string;
  source?: "staff" | "account";
  /** True only for staff explicitly set up to sign in on this till. */
  posLogin?: boolean;
  /** True when this staff member has a till PIN set. Never contains a PIN/hash. */
  hasPin?: boolean;
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
  refundCount?: number;
  refundMinor?: number;
};

export function isSellOnly(user: StaffUser) {
  return (
    user.privileges.includes("sell") &&
    !user.privileges.includes("settings") &&
    !user.privileges.includes("unlock")
  );
}

export function canAccessSettings(user: StaffUser) {
  return user.privileges.includes("settings");
}
