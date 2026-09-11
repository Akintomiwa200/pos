export type Privilege = "sell" | "settings" | "unlock" | "day";
export type StaffRole = "cashier" | "supervisor" | "admin";

export type StaffUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: StaffRole;
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
