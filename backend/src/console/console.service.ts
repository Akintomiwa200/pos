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
  type HqNotice,
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
  normalizeTillProduct,
  tillProductLabel,
  type HqTill,
} from "./till-code";

@Injectable()
export class ConsoleService implements OnModuleInit {
  private groups: ConsoleGroup[] = [];
  private accounts: ConsoleAccount[] = [];
  private tills: HqTill[] = [];
  private sessions: { token: string; accountId: string }[] = [];
  private resets: { token: string; accountId: string; expiresAt: string }[] = [];
  private notices: HqNotice[] = [];
  private readonly dir = join(process.cwd(), "data");
  private readonly groupsFile = join(this.dir, "hq-groups.json");
  private readonly accountsFile = join(this.dir, "hq-accounts.json");
  private readonly tillsFile = join(this.dir, "hq-tills.json");
  private readonly sessionsFile = join(this.dir, "hq-sessions.json");
  private readonly resetsFile = join(this.dir, "hq-resets.json");
  private readonly noticesFile = join(this.dir, "hq-notices.json");

  async onModuleInit() {
    await mkdir(this.dir, { recursive: true });
    this.groups = await this.readJson(this.groupsFile, SEED_GROUPS);
    this.accounts = await this.readJson(this.accountsFile, SEED_ACCOUNTS);
    this.tills = (await this.readJson(this.tillsFile, SEED_TILLS)).map((row) => ({
      ...row,
      product: normalizeTillProduct(row.product),
      sessionToken: row.sessionToken ?? null,
      subscriptionExpiresAt: row.subscriptionExpiresAt ?? null,
    }));
    if (!this.tills.some((row) => row.id === DEMO_TILL.id || row.code === DEMO_TILL.code)) {
      this.tills.unshift({ ...DEMO_TILL });
    }
    this.sessions = await this.readJson(this.sessionsFile, []);
    this.resets = await this.readJson(this.resetsFile, []);
    this.notices = await this.readJson(this.noticesFile, []);
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
    await writeFile(this.sessionsFile, JSON.stringify(this.sessions, null, 2), "utf8");
    await writeFile(this.resetsFile, JSON.stringify(this.resets, null, 2), "utf8");
    await writeFile(this.noticesFile, JSON.stringify(this.notices, null, 2), "utf8");
  }

  private async pushNotice(
    input: Omit<HqNotice, "id" | "createdAt" | "readAt"> & { derived?: boolean },
  ) {
    if (this.notices.some((row) => row.key === input.key && !row.readAt)) return;
    this.notices.unshift({
      id: `n-${generateSessionToken().slice(0, 16)}`,
      createdAt: new Date().toISOString(),
      readAt: null,
      derived: Boolean(input.derived),
      ...input,
    });
    this.notices = this.notices.slice(0, 100);
    await this.persist();
  }

  private ensureDerived(
    key: string,
    input: Pick<HqNotice, "type" | "title" | "body" | "href">,
  ) {
    if (this.notices.some((row) => row.key === key)) return false;
    this.notices.unshift({
      id: `n-${generateSessionToken().slice(0, 16)}`,
      key,
      derived: true,
      createdAt: new Date().toISOString(),
      readAt: null,
      ...input,
    });
    this.notices = this.notices.slice(0, 100);
    return true;
  }

  private async syncDerivedNotices() {
    const live = new Set<string>();
    const fortnight = 14 * 24 * 60 * 60 * 1000;
    const offlineMs = 2 * 60 * 1000;
    let changed = false;

    for (const till of this.tills) {
      if (!till.active) continue;
      if (till.subscriptionExpiresAt && isSubscriptionExpired(till.subscriptionExpiresAt)) {
        const key = `till.expired:${till.id}:${till.subscriptionExpiresAt}`;
        live.add(key);
        changed =
          this.ensureDerived(key, {
            type: "till.expired",
            title: `${till.name} subscription ended`,
            body: `Renew ${till.name} at ${till.branchName || "HQ"} to keep the till licensed.`,
            href: "/setup/others/till",
          }) || changed;
      } else if (till.subscriptionExpiresAt) {
        const at = Date.parse(till.subscriptionExpiresAt);
        if (Number.isFinite(at) && at > Date.now() && at - Date.now() <= fortnight) {
          const key = `till.expiring:${till.id}:${till.subscriptionExpiresAt}`;
          live.add(key);
          const days = Math.max(1, Math.ceil((at - Date.now()) / (24 * 60 * 60 * 1000)));
          changed =
            this.ensureDerived(key, {
              type: "till.expiring",
              title: `${till.name} expires in ${days} day${days === 1 ? "" : "s"}`,
              body: `Renew the subscription in Setup → Till before it locks the device.`,
              href: "/setup/others/till",
            }) || changed;
        }
      }
      if (till.hardwareHex && till.lastSeenAt) {
        const last = Date.parse(till.lastSeenAt);
        if (Number.isFinite(last) && Date.now() - last >= offlineMs) {
          const key = `till.offline:${till.id}`;
          live.add(key);
          changed =
            this.ensureDerived(key, {
              type: "till.offline",
              title: `${till.name} is offline`,
              body: `No heartbeat from ${till.branchName || till.name} for over two minutes.`,
              href: "/setup/others/till",
            }) || changed;
        }
      }
    }

    const next = this.notices.filter((row) => {
      if (!row.derived || row.readAt) return true;
      return live.has(row.key);
    });
    if (next.length !== this.notices.length) {
      this.notices = next;
      changed = true;
    }
    if (changed) await this.persist();
  }

  async listNotifications() {
    await this.syncDerivedNotices();
    return {
      unread: this.notices.filter((row) => !row.readAt).length,
      items: this.notices,
    };
  }

  async markNoticeRead(id: string) {
    const row = this.notices.find((item) => item.id === id);
    if (!row) throw new NotFoundException("Notification not found");
    if (!row.readAt) {
      row.readAt = new Date().toISOString();
      await this.persist();
    }
    return row;
  }

  async markAllNoticesRead() {
    const now = new Date().toISOString();
    let changed = false;
    for (const row of this.notices) {
      if (!row.readAt) {
        row.readAt = now;
        changed = true;
      }
    }
    if (changed) await this.persist();
    return { ok: true as const };
  }

  async notifySale(sale: { ticketId: string; cashierName?: string; totalMinor?: number }) {
    const naira = ((sale.totalMinor ?? 0) / 100).toLocaleString("en-NG", {
      style: "currency",
      currency: "NGN",
    });
    await this.pushNotice({
      key: `sale:${sale.ticketId}`,
      type: "sale.recorded",
      title: "Sale recorded",
      body: `${sale.cashierName || "Till"} closed ticket ${sale.ticketId} for ${naira}.`,
      href: "/reports/sales/invoice/list",
    });
  }

  listGroups() {
    return this.groups;
  }

  listAccounts() {
    return this.accounts.map(publicAccount);
  }

  async login(emailOrUsername: string, password: string) {
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
    const token = generateSessionToken();
    this.sessions = this.sessions.filter((row) => row.accountId !== account.id);
    this.sessions.push({ token, accountId: account.id });
    await this.persist();
    return {
      token,
      user: {
        ...publicAccount(account),
        groupName: group.name,
        departments: group.departments,
        privileges: group.privileges,
      },
    };
  }

  private sessionPayload(token: string) {
    const row = this.sessions.find((item) => item.token === token);
    if (!row) throw new UnauthorizedException("Sign in again");
    const account = this.accounts.find((item) => item.id === row.accountId && item.active);
    if (!account) throw new UnauthorizedException("Sign in again");
    const group = this.groups.find((item) => item.id === account.groupId);
    if (!group) throw new UnauthorizedException("Account has no group");
    return {
      token,
      user: {
        ...publicAccount(account),
        groupName: group.name,
        departments: group.departments,
        privileges: group.privileges,
      },
    };
  }

  me(token: string) {
    return this.sessionPayload(token.trim());
  }

  async logout(token: string) {
    this.sessions = this.sessions.filter((row) => row.token !== token.trim());
    await this.persist();
    return { ok: true };
  }

  async register(input: {
    name?: string;
    email?: string;
    username?: string;
    password?: string;
  }) {
    const password = input.password?.trim() ?? "";
    if (password.length < 6) {
      throw new BadRequestException("Password must be at least 6 characters");
    }
    const group =
      this.groups.find((row) => row.id === "g-sales") ??
      this.groups.find((row) => !row.privileges.includes("*")) ??
      this.groups[0];
    if (!group) throw new BadRequestException("No group available for new accounts");
    await this.saveAccount({
      name: input.name,
      email: input.email,
      username: input.username,
      password,
      groupId: group.id,
      active: true,
    });
    return this.login(input.email ?? input.username ?? "", password);
  }

  async forgotPassword(emailOrUsername: string) {
    const key = emailOrUsername.trim().toLowerCase();
    const account = this.accounts.find(
      (row) =>
        row.active &&
        (row.email.toLowerCase() === key || row.username.toLowerCase() === key),
    );
    if (!account) return { ok: true as const };
    this.resets = this.resets.filter((row) => row.accountId !== account.id);
    const token = generateSessionToken();
    this.resets.push({
      token,
      accountId: account.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
    await this.persist();
    return { ok: true as const, resetToken: token };
  }

  async resetPassword(token: string, password: string) {
    const next = password.trim();
    if (next.length < 6) {
      throw new BadRequestException("Password must be at least 6 characters");
    }
    const row = this.resets.find(
      (item) => item.token === token.trim() && Date.parse(item.expiresAt) > Date.now(),
    );
    if (!row) throw new BadRequestException("Reset link is invalid or has expired");
    const account = this.accounts.find((item) => item.id === row.accountId);
    if (!account) throw new BadRequestException("Reset link is invalid or has expired");
    account.password = next;
    this.resets = this.resets.filter((item) => item.token !== row.token);
    this.sessions = this.sessions.filter((item) => item.accountId !== account.id);
    await this.persist();
    await this.pushNotice({
      key: `account.reset:${account.id}:${Date.now()}`,
      type: "account.reset",
      title: "Password reset",
      body: `${account.name} set a new HQ password. Existing sessions were signed out.`,
      href: "/setup/users/account",
    });
    return { ok: true as const };
  }

  async changePassword(token: string, current: string, nextPassword: string) {
    const { user } = this.sessionPayload(token);
    const account = this.accounts.find((row) => row.id === user.id);
    if (!account || account.password !== current) {
      throw new UnauthorizedException("Current password is wrong");
    }
    const next = nextPassword.trim();
    if (next.length < 6) {
      throw new BadRequestException("Password must be at least 6 characters");
    }
    account.password = next;
    await this.persist();
    return { ok: true as const };
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
    if (!existing) {
      await this.pushNotice({
        key: `account.created:${next.id}`,
        type: "account.created",
        title: "New HQ account",
        body: `${next.name} (${next.username}) joined. Review the group in Setup → Users.`,
        href: "/setup/users/account",
      });
    }
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
      product: normalizeTillProduct(row.product),
      online: Boolean(
        row.lastSeenAt && Date.now() - new Date(row.lastSeenAt).getTime() < 12_000,
      ),
      expired: isSubscriptionExpired(row.subscriptionExpiresAt),
    }));
  }

  async saveTill(input: {
    id?: string;
    name?: string;
    branchName?: string;
    product?: string;
    active?: boolean;
  }) {
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
      product: normalizeTillProduct(input.product ?? existing?.product),
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
    if (!existing) {
      await this.pushNotice({
        key: `till.issued:${next.id}`,
        type: "till.issued",
        title: `${next.name} issued`,
        body: `Enter the till code on that device at ${next.branchName || "the branch"} to activate ${tillProductLabel(next.product)} for one year.`,
        href: "/setup/others/till",
      });
    }
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
    await this.pushNotice({
      key: `till.regenerated:${till.id}:${till.code}`,
      type: "till.regenerated",
      title: `${till.name} code regenerated`,
      body: "The previous code no longer works. Enter the new code on that till.",
      href: "/setup/others/till",
    });
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
    await this.pushNotice({
      key: `till.activated:${till.id}:${till.pairedAt}`,
      type: "till.activated",
      title: `${till.name} activated`,
      body: `The till at ${till.branchName || "the branch"} is licensed until ${new Date(till.subscriptionExpiresAt!).toLocaleDateString("en-NG")}.`,
      href: "/setup/others/till",
    });
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
    await this.pushNotice({
      key: `till.renewed:${till.id}:${till.subscriptionExpiresAt}`,
      type: "till.renewed",
      title: `${till.name} renewed`,
      body: `Subscription now runs until ${new Date(till.subscriptionExpiresAt).toLocaleDateString("en-NG")}.`,
      href: "/setup/others/till",
    });
    return till;
  }
}
