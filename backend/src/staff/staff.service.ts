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
  return {
    id: row.id,
    name: row.name,
    username: str(extra.tillUsername),
    email: str(row.email),
    role: roleFor(label),
    password: hash(str(extra.tillPassword)),
    pin: hash(str(extra.tillPin)),
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

  private async users(): Promise<StaffUser[]> {
    return (await this.roster())
      .filter((row) => row.active && str(row.extra?.tillUsername))
      .map(fromRecord);
  }

  async list() {
    return (await this.users()).map(publicStaff);
  }

  async login(username: string, password: string) {
    const name = username.trim().toLowerCase();
    const user = (await this.users()).find(
      (staff) =>
        staff.password === hash(password) &&
        (staff.username.toLowerCase() === name || staff.email.toLowerCase() === name),
    );
    if (!user) throw new UnauthorizedException("Wrong username or password.");
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
      throw new UnauthorizedException("Wrong PIN.");
    }
    return {
      token: `dev-${user.id}`,
      user: publicStaff(user),
      needsOpenShift: isSellOnly(user),
    };
  }

  async unlock(pin: string) {
    const user = (await this.users()).find((staff) => staff.pin === hash(pin.trim()));
    if (!user || !canUnlock(user)) {
      throw new UnauthorizedException("This PIN cannot unlock that action.");
    }
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

  private async saveRoster(roster: DirectoryRecord[]) {
    await mkdir(join(this.dataDir, "directories"), { recursive: true });
    await writeFile(
      join(this.dataDir, "directories", "staff.json"),
      JSON.stringify(roster, null, 2),
      "utf8",
    );
  }

  async managePin(
    staffId: string,
    pin: string | null | undefined,
    authorization: string | undefined,
  ) {
    let actor: { id?: string; username?: string; groupId?: string; name?: string } = {};
    try {
      actor = (await this.console.me(this.bearer(authorization)))?.user ?? {};
    } catch {
      actor = {};
    }
    const isAdmin = actor.groupId === "g-admin";
    const roster = await this.roster();
    const index = roster.findIndex((row) => row.id === staffId);
    if (index < 0) {
      throw new NotFoundException("That staff member is not on the till roster.");
    }
    const row = roster[index];
    const ownUsername = String(row.extra?.tillUsername || "").toLowerCase();
    const actorUsername = String(actor.username || "").toLowerCase();
    const isSelf = ownUsername !== "" && ownUsername === actorUsername;
    if (!isAdmin && !isSelf) {
      throw new UnauthorizedException("Only an admin or the staff member themselves can set this PIN.");
    }
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
    return { closedAt: at, shifts: await this.todayShifts() };
  }

  async dayStatus() {
    await this.loadShifts();
    return { closedAt: this.dayClosedAt, shifts: await this.todayShifts() };
  }
}