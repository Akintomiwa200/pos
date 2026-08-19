import { Injectable, UnauthorizedException } from "@nestjs/common";
import {
  STAFF_USERS,
  canUnlock,
  isSellOnly,
  publicStaff,
  type ShiftRecord,
  type StaffUser,
} from "./staff.types";

@Injectable()
export class StaffService {
  private readonly users = STAFF_USERS;
  private shifts: ShiftRecord[] = [];
  private dayClosedAt: string | null = null;

  list() {
    return this.users.map(publicStaff);
  }

  login(username: string, password: string) {
    const name = username.trim().toLowerCase();
    const user = this.users.find(
      (staff) =>
        staff.password === password &&
        (staff.username.toLowerCase() === name ||
          staff.email.toLowerCase() === name),
    );
    if (!user) throw new UnauthorizedException("Wrong username or password.");
    return {
      token: `dev-${user.id}`,
      user: publicStaff(user),
      needsOpenShift: isSellOnly(user),
    };
  }

  unlock(pin: string) {
    const user = this.users.find((staff) => staff.pin === pin.trim());
    if (!user || !canUnlock(user)) {
      throw new UnauthorizedException("This PIN cannot unlock that action.");
    }
    return publicStaff(user);
  }

  currentShift(staffId: string) {
    return (
      this.shifts.find(
        (shift) => shift.staffId === staffId && shift.closedAt === null,
      ) ?? null
    );
  }

  openShift(staffId: string) {
    const user = this.users.find((staff) => staff.id === staffId);
    if (!user) throw new UnauthorizedException("Unknown staff.");
    const open = this.currentShift(staffId);
    if (open) return open;
    const shift: ShiftRecord = {
      id: `SH-${Date.now().toString().slice(-8)}`,
      staffId: user.id,
      staffName: user.name,
      openedAt: new Date().toISOString(),
      closedAt: null,
      salesCount: 0,
      salesMinor: 0,
    };
    this.shifts.unshift(shift);
    this.dayClosedAt = null;
    return shift;
  }

  addSale(staffId: string, amountMinor: number) {
    const shift = this.currentShift(staffId);
    if (!shift) return null;
    shift.salesCount += 1;
    shift.salesMinor += amountMinor;
    return shift;
  }

  closeShift(staffId: string) {
    const shift = this.currentShift(staffId);
    if (!shift) return null;
    shift.closedAt = new Date().toISOString();
    return shift;
  }

  todayShifts() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return this.shifts.filter(
      (shift) => new Date(shift.openedAt).getTime() >= start.getTime(),
    );
  }

  closeDay() {
    const at = new Date().toISOString();
    for (const shift of this.shifts) {
      if (!shift.closedAt) shift.closedAt = at;
    }
    this.dayClosedAt = at;
    return { closedAt: at, shifts: this.todayShifts() };
  }

  dayStatus() {
    return { closedAt: this.dayClosedAt, shifts: this.todayShifts() };
  }

  findById(id: string): StaffUser | undefined {
    return this.users.find((staff) => staff.id === id);
  }
}
