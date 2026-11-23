import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { DirectoryRecord } from "../directory/directory.types";
import { ConsoleService } from "../console/console.service";
import { avatarFor, fromConsoleUser } from "./web-user";
import {
  canAccessSettings,
  canUnlock,
  isSellOnly,
  publicStaff,
  type Privilege,
  type ShiftRecord,
  type StaffRole,
  type StaffUser,
} from "./staff.types";

const HASH_SALT = "pos.till.staff.v1";

function hash(value: string) {
  return createHash("sha256").update(`${value}::${HASH_SALT}`).digest("hex");
}

function str(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function roleLabel(extra: Record<string, string | number | boolean | null> | undefined) {
  return str(extra?.tillRole).toLowerCase();
}

function privilegesFor(label: string): Privilege[] {
  if (label === "manager" || label === "admin") return ["sell", "settings", "unlock", "day"];
  if (label === "supervisor") return ["sell", "unlock", "day"];
  return ["sell"];
}

function roleFor(label: string): StaffRole {
  if (label === "manager" || label === "admin") return "admin";
  if (label === "supervisor") return "supervisor";
  return "cashier";
}

function fromRecord(row: DirectoryRecord): StaffUser {
  const extra = row.extra ?? {};
  const label = roleLabel(extra);
  const tillPin = str(extra.tillPin);
  return {
    id: row.id,
    name: row.name,
    username: str(extra.tillUsername),
    email: str(row.email),
    role: roleFor(label),
    password: hash(str(extra.tillPassword)),
    pin: tillPin ? hash(tillPin) : "",
    hasPin: Boolean(tillPin),
    privileges: privilegesFor(label),
    avatar: avatarFor(row.name),
  };
}

@Injectable()
export class StaffService {
  private shifts: ShiftRecord[] = [];
  private dayClosedAt: string | null = null;
  private readonly dataDir = join(process.cwd(), "data");

  constructor(private readonly console: ConsoleService) {}

  private async roster(): Promise<DirectoryRecord[]> {
    try {
      const raw = await readFile(join(this.dataDir, "directories", "staff.json"), "utf8");
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as DirectoryRecord[]) : [];
    } catch {
      return [];
    }
  }

  /** Hashed PINs for company staff, keyed by staff id. */
  private async pinStore(): Promise<Record<string, string>> {
    try {
      const raw = await readFile(join(this.dataDir, "staff-pins.json"), "utf8");
      const parsed = JSON.parse(raw) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, string>)
        : {};
    } catch {
      return {};
    }
  }

  private async savePinStore(store: Record<string, string>) {
    await mkdir(this.dataDir, { recursive: true });
    await writeFile(join(this.dataDir, "staff-pins.json"), JSON.stringify(store, null, 2), "utf8");
  }

  /**
   * Company staff come from the Setup › Staff directory. Every active staff
   * member can be given a PIN, even before they have a till username — PIN
   * sign-in identifies the operator by staff id, not by username.
   */
  private async users(): Promise<StaffUser[]> {
    const [roster, pins] = await Promise.all([this.roster(), this.pinStore()]);
    return roster
      .filter((row) => row.active)
      .map((row) => {
        const base = fromRecord(row);
        const pin = pins[base.id] ?? base.pin;
        return { ...base, pin, hasPin: Boolean(pin) };
      });
  }

  async list() {
    return (await this.users()).map(publicStaff);
  }

  async login(username: string, password: string) {
    const name = username.trim().toLowerCase();
    if (!name || !password.trim()) {
      await this.audit(null, "staff.login.failed", name || "blank", "password");
      throw new UnauthorizedException("Wrong username or password.");
    }
    const user = (await this.users()).find(
      (staff) =>
        staff.password === hash(password) &&
        (staff.username.toLowerCase() === name || staff.email.toLowerCase() === name),
    );
    if (!user) {
      await this.audit(null, "staff.login.failed", name, "password");
      throw new UnauthorizedException("Wrong username or password.");
    }
    await this.audit(user, "staff.login.password", user.username, `Role: ${user.role}`);
    return {
      token: `dev-${user.id}`,
      user: publicStaff(user),
      needsOpenShift: isSellOnly(user),
    };
  }

  async loginWithPin(staffId: string, pin: string) {
    const trimmed = pin.trim();
    if (trimmed.length < 4) {
      throw new UnauthorizedException("Enter your 4-digit PIN.");
    }
    const user = (await this.users()).find((staff) => staff.id === staffId);
    if (!user || user.pin !== hash(trimmed)) {
      await this.audit(null, "staff.login.failed", staffId, "PIN");
      throw new UnauthorizedException("Wrong PIN.");
    }
    await this.audit(user, "staff.login.pin", user.username, `Role: ${user.role}`);
    return {
      token: `dev-${user.id}`,
      user: publicStaff(user),
      needsOpenShift: isSellOnly(user),
    };
  }

  async unlock(pin: string) {
    const user = (await this.users()).find((staff) => staff.pin === hash(pin.trim()));
    if (!user || !canUnlock(user)) {
      await this.audit(user ?? null, "staff.pin.authorize.failed", user?.username ?? "unknown", "PIN");
      throw new UnauthorizedException("This PIN cannot unlock that action.");
    }
    await this.audit(user, "staff.pin.authorize", user.username, `Role: ${user.role}`);
    return publicStaff(user);
  }

  /** PIN plus required privilege — enforced on the server, not only in the till UI. */
  async authorizePrivilege(pin: string, privilege: "settings" | "unlock") {
    const user = (await this.users()).find(
      (staff) => staff.pin !== "" && staff.pin === hash(pin.trim()),
    );
    const allowed = user
      ? privilege === "settings"
        ? canAccessSettings(user)
        : canUnlock(user)
      : false;
    if (!user || !allowed) {
      await this.audit(
        user ?? null,
        "staff.pin.authorize.failed",
        user?.username ?? "unknown",
        `Required privilege: ${privilege}`,
      );
      throw new UnauthorizedException(
        privilege === "settings"
          ? "An administrator PIN is required."
          : "This PIN does not have supervisor privileges.",
      );
    }
    await this.audit(user, "staff.pin.authorize", user.username, `Role: ${user.role}; required: ${privilege}`);
    return publicStaff(user);
  }

  async findById(id: string): Promise<StaffUser | undefined> {
    const rosterUser = (await this.users()).find((staff) => staff.id === id);
    if (rosterUser) return rosterUser;
    if (!id.startsWith("web:")) return undefined;
    const web = await this.console.webUser(id.slice(4));
    return web ? fromConsoleUser(web) ?? undefined : undefined;
  }

  async authorize(staffId: string, pin: string) {
    if (pin.trim()) return this.unlock(pin);
    if (!staffId) throw new UnauthorizedException("PIN required.");
    const user = await this.findById(staffId);
    if (!user) throw new UnauthorizedException("Unknown staff.");
    if (!canUnlock(user)) {
      throw new UnauthorizedException("This staff member cannot authorise that action.");
    }
    return publicStaff(user);
  }

  private bearer(authorization: string | undefined) {
    if (!authorization) return "";
    const match = /^Bearer\s+(.+)$/i.exec(authorization);
    return match ? match[1].trim() : "";
  }

  /** Every till operation is mirrored into HQ's audit log for Super Admin. */
  private async audit(
    actor: { id?: string; name?: string; role?: string } | null,
    action: string,
    target?: string,
    detail?: string,
  ) {
    await this.console.recordActivity({
      actorId: actor?.id,
      actorName: actor ? `${actor.name ?? "Staff"}${actor.role ? ` (${actor.role})` : ""}` : undefined,
      action,
      target,
      detail,
    });
  }

  private async saveRoster(roster: DirectoryRecord[]) {
    await mkdir(join(this.dataDir, "directories"), { recursive: true });
    await writeFile(
      join(this.dataDir, "directories", "staff.json"),
      JSON.stringify(roster, null, 2),
      "utf8",
    );
  }

  /** Shared set/clear logic for both the HQ endpoint and the credential-checked local endpoint. */
  private async writePin(
    roster: DirectoryRecord[],
    index: number,
    pin: string | null | undefined,
  ) {
    const row = roster[index]!;
    const value = pin === null || pin === undefined ? "" : String(pin).trim();
    const extras: Record<string, string | number | boolean | null> = {
      ...(row.extra ?? {}),
    };
    if (value === "") {
      delete extras.tillPin;
    } else {
      if (!/^\d{4,10}$/.test(value)) {
        throw new BadRequestException("PIN must be 4 to 10 digits.");
      }
      extras.tillPin = value;
    }
    const next: DirectoryRecord = { ...row, extra: extras };
    const updated = [...roster];
    updated[index] = next;
    await this.saveRoster(updated);
    return {
      id: row.id,
      name: row.name,
      hasPin: Boolean(extras.tillPin),
    };
  }

  /** Set or clear a PIN for a company staff member. */
  private async writePinFor(target: StaffUser, pin: string | null | undefined) {
    const value = pin === null || pin === undefined ? "" : String(pin).trim();
    if (value !== "" && !/^\d{4,10}$/.test(value)) {
      throw new BadRequestException("PIN must be 4 to 10 digits.");
    }
    const store = await this.pinStore();
    if (value === "") delete store[target.id];
    else store[target.id] = hash(value);
    await this.savePinStore(store);

    // Keep the legacy directory field in sync so Setup > Staff and older
    // sign-in paths agree with the Security panel.
    if (!target.id.startsWith("web:")) {
      const roster = await this.roster();
      const index = roster.findIndex((row) => row.id === target.id);
      if (index >= 0) await this.writePin(roster, index, value === "" ? null : value);
    }
    return { id: target.id, name: target.name, hasPin: value !== "" };
  }

  /**
   * Terminal-side PIN management. The caller proves it is the staff member (or
   * a supervisor) with the current password or current PIN instead of a token.
   */
  async managePinLocal(
    staffId: string,
    currentPassword: string | undefined,
    currentPin: string | undefined,
    pin: string | null | undefined,
  ) {
    const target = (await this.users()).find((user) => user.id === staffId);
    if (!target) {
      throw new NotFoundException("That staff member is not on the till roster.");
    }
    const password = str(currentPassword);
    const pinAttempt = str(currentPin);
    const row = (await this.roster()).find((entry) => entry.id === target.id);
    const passwordOk =
      password !== "" && Boolean(row && hash(str(row.extra?.tillPassword)) === hash(password));
    const pinOk = pinAttempt !== "" && target.pin !== "" && target.pin === hash(pinAttempt);
    if (!passwordOk && !pinOk) {
      await this.audit(null, "staff.pin.change.failed", target.name, "Credential check failed");
      throw new UnauthorizedException(
        "Enter the correct current password or current supervisor PIN.",
      );
    }
    const result = await this.writePinFor(target, pin);
    await this.audit(
      { id: target.id, name: target.name, role: target.role },
      result.hasPin ? "staff.pin.set" : "staff.pin.clear",
      result.name,
      `Role: ${target.role}; via: ${passwordOk ? "password" : "PIN"}`,
    );
    return result;
  }

  async managePin(
    staffId: string,
    pin: string | null | undefined,
    authorization: string | undefined,
  ) {
    let actor: {
      id?: string;
      username?: string;
      groupId?: string;
      name?: string;
      scope?: string;
      privileges?: string[];
    } = {};
    try {
      actor = (await this.console.me(this.bearer(authorization)))?.user ?? {};
    } catch {
      actor = {};
    }
    const isAdmin = Boolean(
      actor.privileges?.includes("*") ||
        actor.scope === "producer" ||
        actor.groupId === "g-admin" ||
        actor.groupId === "g-super-admin",
    );
    const target = (await this.users()).find((user) => user.id === staffId);
    if (!target) {
      throw new NotFoundException("That staff member is not on the till roster.");
    }
    const actorUsername = String(actor.username ?? "").toLowerCase();
    const isSelf = target.username !== "" && target.username.toLowerCase() === actorUsername;
    if (!isAdmin && !isSelf) {
      await this.audit(null, "staff.pin.change.failed", target.name, "Not admin or self");
      throw new UnauthorizedException("Only an admin or the staff member themselves can set this PIN.");
    }
    const result = await this.writePinFor(target, pin);
    await this.audit(
      { id: actor.id, name: actor.name ?? actor.username, role: isAdmin ? "HQ admin" : "self" },
      result.hasPin ? "staff.pin.set" : "staff.pin.clear",
      result.name,
      `Role: ${target.role}; via: ${isAdmin ? "HQ admin" : "self"}`,
    );
    return result;
  }

  private async loadShifts() {
    try {
      const raw = await readFile(join(this.dataDir, "staff-shifts.json"), "utf8");
      const parsed = JSON.parse(raw) as { dayClosedAt?: string | null; shifts?: ShiftRecord[] };
      this.dayClosedAt = parsed.dayClosedAt ?? null;
      this.shifts = Array.isArray(parsed.shifts) ? parsed.shifts : [];
    } catch {
      this.dayClosedAt = null;
      this.shifts = [];
    }
  }

  private async persistShifts() {
    await mkdir(this.dataDir, { recursive: true });
    await writeFile(
      join(this.dataDir, "staff-shifts.json"),
      JSON.stringify({ dayClosedAt: this.dayClosedAt, shifts: this.shifts }, null, 2),
      "utf8",
    );
  }

  async currentShift(staffId: string) {
    await this.loadShifts();
    return (
      this.shifts.find((shift) => shift.staffId === staffId && shift.closedAt === null) ?? null
    );
  }

  async openShift(staffId: string) {
    await this.loadShifts();
    const user = await this.findById(staffId);
    if (!user) throw new UnauthorizedException("Unknown staff.");
    const open = this.shifts.find((shift) => shift.staffId === staffId && shift.closedAt === null);
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
    await this.persistShifts();
    await this.audit(user, "staff.shift.open", shift.id, `Role: ${user.role}`);
    return shift;
  }

  async addSale(staffId: string, amountMinor: number) {
    await this.loadShifts();
    const shift = this.shifts.find(
      (record) => record.staffId === staffId && record.closedAt === null,
    );
    if (!shift) return null;
    shift.salesCount += 1;
    shift.salesMinor += amountMinor;
    await this.persistShifts();
    return shift;
  }

  async closeShift(staffId: string) {
    await this.loadShifts();
    const shift = this.shifts.find(
      (record) => record.staffId === staffId && record.closedAt === null,
    );
    if (!shift) return null;
    shift.closedAt = new Date().toISOString();
    await this.persistShifts();
    const user = await this.findById(staffId);
    await this.audit(user ?? { id: staffId, name: shift.staffName }, "staff.shift.close", shift.id, `Tickets: ${shift.salesCount}`);
    return shift;
  }

  async todayShifts() {
    await this.loadShifts();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return this.shifts.filter((shift) => new Date(shift.openedAt).getTime() >= start.getTime());
  }

  async closeDay() {
    await this.loadShifts();
    const at = new Date().toISOString();
    for (const shift of this.shifts) {
      if (!shift.closedAt) shift.closedAt = at;
    }
    this.dayClosedAt = at;
    await this.persistShifts();
    await this.audit(null, "staff.day.close", at, `Shifts closed: ${this.shifts.length}`);
    return { closedAt: at, shifts: await this.todayShifts() };
  }

  async dayStatus() {
    await this.loadShifts();
    return { closedAt: this.dayClosedAt, shifts: await this.todayShifts() };
  }
}