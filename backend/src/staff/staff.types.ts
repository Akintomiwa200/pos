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

export const STAFF_USERS: StaffUser[] = [
  {
    id: "s-tosin",
    name: "Tosin Adeyemi",
    username: "tosin",
    email: "tosin.adeyemi@example.com",
    role: "cashier",
    password: "demo",
    pin: "1234",
    privileges: ["sell"],
    avatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80",
  },
  {
    id: "s-chika",
    name: "Chika Okonkwo",
    username: "chika",
    email: "chika.okonkwo@example.com",
    role: "supervisor",
    password: "demo",
    pin: "2580",
    privileges: ["sell", "settings", "unlock", "day"],
    avatar:
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=120&q=80",
  },
  {
    id: "s-emma",
    name: "Emma Wang",
    username: "emma",
    email: "emma.wang@example.com",
    role: "admin",
    password: "demo",
    pin: "0000",
    privileges: ["sell", "settings", "unlock", "day"],
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80",
  },
];

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
