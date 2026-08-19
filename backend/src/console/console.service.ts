import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from "@nestjs/common";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  SEED_ACCOUNTS,
  SEED_GROUPS,
  publicAccount,
  type ConsoleAccount,
  type ConsoleGroup,
} from "./console.types";
import {
  SEED_TILLS,
  DEMO_TILL,
  addOneYear,
  generateSessionToken,
  generateTillCode,
  isCompleteTillCode,
  isSubscriptionExpired,
  normalizeTillCode,
  type HqTill,
} from "./till-code";

@Injectable()
export class ConsoleService implements OnModuleInit {
  private groups: ConsoleGroup[] = [];
  private accounts: ConsoleAccount[] = [];
  private tills: HqTill[] = [];
  private readonly dir = join(process.cwd(), "data");
  private readonly groupsFile = join(this.dir, "hq-groups.json");
  private readonly accountsFile = join(this.dir, "hq-accounts.json");
  private readonly tillsFile = join(this.dir, "hq-tills.json");

  async onModuleInit() {
    await mkdir(this.dir, { recursive: true });
    this.groups = await this.readJson(this.groupsFile, SEED_GROUPS);
    this.accounts = await this.readJson(this.accountsFile, SEED_ACCOUNTS);
    this.tills = (await this.readJson(this.tillsFile, SEED_TILLS)).map((row) => ({
      ...row,
      sessionToken: row.sessionToken ?? null,
      subscriptionExpiresAt: row.subscriptionExpiresAt ?? null,
    }));
    if (!this.tills.some((row) => row.id === DEMO_TILL.id || row.code === DEMO_TILL.code)) {
      this.tills.unshift({ ...DEMO_TILL });
    }
    await this.persist();
  }

  private async readJson<T>(file: string, fallback: T): Promise<T> {
    try {
      const raw = await readFile(file, "utf8");
      const parsed = JSON.parse(raw) as T;
      return parsed ?? fallback;
    } catch {
      return structuredClone(fallback);
    }
  }

  private async persist() {
    await mkdir(this.dir, { recursive: true });
    await writeFile(this.groupsFile, JSON.stringify(this.groups, null, 2), "utf8");
    await writeFile(this.accountsFile, JSON.stringify(this.accounts, null, 2), "utf8");
    await writeFile(this.tillsFile, JSON.stringify(this.tills, null, 2), "utf8");
  }

  listGroups() {
    return this.groups;
  }

  listAccounts() {
    return this.accounts.map(publicAccount);
  }

  login(emailOrUsername: string, password: string) {
    const key = emailOrUsername.trim().toLowerCase();
    const account = this.accounts.find(
      (row) =>
        row.active &&
        (row.email.toLowerCase() === key || row.username.toLowerCase() === key) &&
        row.password === password,
    );
    if (!account) throw new UnauthorizedException("Invalid email or password");
    const group = this.groups.find((row) => row.id === account.groupId);
    if (!group) throw new UnauthorizedException("Account has no group");
    return {
      token: `hq-${account.id}`,
      user: {
        ...publicAccount(account),
        groupName: group.name,
        departments: group.departments,
        privileges: group.privileges,
      },
    };
  }

  async saveGroup(group: ConsoleGroup) {
    const name = group.name?.trim();
    if (!name) throw new BadRequestException("Group name is required");
    const next: ConsoleGroup = {
      id: group.id || `g-${Date.now()}`,
      name,
      departments: group.departments?.length ? group.departments : [],
      privileges: group.privileges ?? [],
    };
    const index = this.groups.findIndex((row) => row.id === next.id);
    if (index >= 0) this.groups[index] = next;
    else this.groups.push(next);
    await this.persist();
    return next;
  }

  async deleteGroup(id: string) {
    if (this.accounts.some((row) => row.groupId === id)) {
      throw new BadRequestException("Reassign accounts before deleting this group");
    }
    const exists = this.groups.some((row) => row.id === id);
    if (!exists) throw new NotFoundException("Group not found");
    this.groups = this.groups.filter((row) => row.id !== id);
    await this.persist();
    return { ok: true };
  }

  async saveAccount(input: Partial<ConsoleAccount> & { id?: string }) {
    const name = input.name?.trim();
    const email = input.email?.trim().toLowerCase();
    const username = input.username?.trim().toLowerCase();
    if (!name || !email || !username) {
      throw new BadRequestException("Name, email, and username are required");
    }
    if (!this.groups.some((row) => row.id === input.groupId)) {
      throw new BadRequestException("Select a group");
    }
    const existing = input.id ? this.accounts.find((row) => row.id === input.id) : undefined;
    const duplicate = this.accounts.find(
      (row) =>
        row.id !== existing?.id &&
        (row.email.toLowerCase() === email || row.username.toLowerCase() === username),
    );
    if (duplicate) throw new BadRequestException("Email or username already in use");
    const next: ConsoleAccount = {
      id: existing?.id ?? `a-${Date.now()}`,
      name,
      email,
      username,
      password: input.password?.trim() || existing?.password || "demo",
      groupId: input.groupId!,
      active: input.active ?? existing?.active ?? true,
    };
    if (existing) {
      this.accounts = this.accounts.map((row) => (row.id === existing.id ? next : row));
    } else {
      this.accounts.push(next);
    }
    await this.persist();
    return publicAccount(next);
  }

  async deleteAccount(id: string) {
    const account = this.accounts.find((row) => row.id === id);
    if (!account) throw new NotFoundException("Account not found");
    const group = this.groups.find((row) => row.id === account.groupId);
    const isAdmin =
      group?.privileges.includes("*") || group?.departments.includes("*");
    const adminCount = this.accounts.filter((row) => {
      const g = this.groups.find((item) => item.id === row.groupId);
      return g?.privileges.includes("*") || g?.departments.includes("*");
    }).length;
    if (isAdmin && adminCount <= 1) {
      throw new BadRequestException("Keep at least one administrator account");
    }
    this.accounts = this.accounts.filter((row) => row.id !== id);
    await this.persist();
    return { ok: true };
  }

  listTills() {
    return this.tills.map(({ sessionToken: _token, ...row }) => ({
      ...row,
      online: Boolean(
        row.lastSeenAt && Date.now() - new Date(row.lastSeenAt).getTime() < 12_000,
      ),
      expired: isSubscriptionExpired(row.subscriptionExpiresAt),
    }));
  }

  async saveTill(input: Partial<HqTill> & { id?: string }) {
    const name = input.name?.trim().toUpperCase();
    if (!name) throw new BadRequestException("Till name is required");
    const existing = input.id ? this.tills.find((row) => row.id === input.id) : undefined;
    const duplicate = this.tills.find(
      (row) => row.id !== existing?.id && row.name.toUpperCase() === name,
    );
    if (duplicate) throw new BadRequestException("That till name is already issued");
    const next: HqTill = {
      id: existing?.id ?? `till-${Date.now()}`,
      name,
      code: existing?.code ?? generateTillCode(),
      branchName: input.branchName?.trim() || existing?.branchName || "",
      active: input.active ?? existing?.active ?? true,
      hardwareHex: existing?.hardwareHex ?? null,
      sessionToken: existing?.sessionToken ?? null,
      pairedAt: existing?.pairedAt ?? null,
      lastSeenAt: existing?.lastSeenAt ?? null,
      subscriptionExpiresAt: existing?.subscriptionExpiresAt ?? null,
    };
    if (existing) {
      this.tills = this.tills.map((row) => (row.id === existing.id ? next : row));
    } else {
      this.tills.push(next);
    }
    await this.persist();
    return next;
  }

  async regenerateTillCode(id: string) {
    const till = this.tills.find((row) => row.id === id);
    if (!till) throw new NotFoundException("Till not found");
    till.code = generateTillCode();
    till.hardwareHex = null;
    till.sessionToken = null;
    till.pairedAt = null;
    till.lastSeenAt = null;
    await this.persist();
    return till;
  }

  async deleteTill(id: string) {
    if (!this.tills.some((row) => row.id === id)) {
      throw new NotFoundException("Till not found");
    }
    this.tills = this.tills.filter((row) => row.id !== id);
    await this.persist();
    return { ok: true };
  }

  async activateTill(code: string, hardwareHex: string) {
    const normalized = normalizeTillCode(code);
    if (!isCompleteTillCode(normalized)) {
      throw new BadRequestException("Enter the 16-character till code from HQ");
    }
    const hex = hardwareHex.trim().toUpperCase();
    if (!hex) throw new BadRequestException("This device has no hardware hex");
    const till = this.tills.find((row) => row.active && row.code === normalized);
    if (!till) throw new UnauthorizedException("Invalid till code");
    till.hardwareHex = hex;
    till.sessionToken = generateSessionToken();
    till.pairedAt = till.pairedAt ?? new Date().toISOString();
    till.lastSeenAt = new Date().toISOString();
    if (isSubscriptionExpired(till.subscriptionExpiresAt)) {
      till.subscriptionExpiresAt = addOneYear().toISOString();
    }
    await this.persist();
    return till;
  }

  async heartbeatTill(code: string, hardwareHex: string, sessionToken: string) {
    const till = this.tills.find(
      (row) => row.active && row.code === normalizeTillCode(code),
    );
    if (!till) {
      throw new ConflictException(
        "This till is no longer licensed on this device.",
      );
    }
    const hex = hardwareHex.trim().toUpperCase();
    const token = sessionToken.trim();
    if (!till.sessionToken && hex && (!till.hardwareHex || till.hardwareHex === hex)) {
      till.sessionToken = generateSessionToken();
      till.hardwareHex = hex;
      till.lastSeenAt = new Date().toISOString();
      if (!till.subscriptionExpiresAt) {
        till.subscriptionExpiresAt = addOneYear().toISOString();
      } else if (isSubscriptionExpired(till.subscriptionExpiresAt)) {
        await this.persist();
        throw new ForbiddenException(
          "Till subscription has ended. Enter the till code to renew for another year.",
        );
      }
      await this.persist();
      return till;
    }
    if (!token || till.sessionToken !== token || (till.hardwareHex && till.hardwareHex !== hex)) {
      throw new ConflictException(
        "This till is in use on another device. You have been signed out.",
      );
    }
    till.hardwareHex = hex || till.hardwareHex;
    till.lastSeenAt = new Date().toISOString();
    if (!till.subscriptionExpiresAt) {
      till.subscriptionExpiresAt = addOneYear().toISOString();
    } else if (isSubscriptionExpired(till.subscriptionExpiresAt)) {
      await this.persist();
      throw new ForbiddenException(
        "Till subscription has ended. Enter the till code to renew for another year.",
      );
    }
    await this.persist();
    return till;
  }

  async renewTill(id: string) {
    const till = this.tills.find((row) => row.id === id);
    if (!till) throw new NotFoundException("Till not found");
    const from =
      till.subscriptionExpiresAt && !isSubscriptionExpired(till.subscriptionExpiresAt)
        ? new Date(till.subscriptionExpiresAt)
        : new Date();
    till.subscriptionExpiresAt = addOneYear(from).toISOString();
    await this.persist();
    return till;
  }
}
