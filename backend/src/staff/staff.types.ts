export type Privilege = "sell" | "settings" | "unlock" | "day";

export type StaffRole = "cashier" | "supervisor" | "admin";

export type StaffUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: StaffRole;
  password: string;
  pin: string;
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
