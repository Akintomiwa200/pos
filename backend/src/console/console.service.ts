import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { DbService } from "../db/db.service";
import {
  isDefaultGroupId,
  publicAccount,
  type ConsoleAccount,
  type ConsoleGroup,
  type DepartmentName,
  type HqNotice,
} from "./console.types";
import { hashPassword, isHashedPassword, verifyPassword } from "./password.util";
import { SetupService } from "./setup.service";
import { EmailService } from "../email/email.service";
import type { HqCompany } from "./setup.types";
import {
  addOneYear,
  generateSessionToken,
  generateTillCode,
  isCompleteTillCode,
  isSubscriptionExpired,
  normalizeTillCode,
  normalizeTillProduct,
  tillProductLabel,
  type HqTill,
  type TillProduct,
} from "./till-code";

type GoogleProfile = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture?: string;
};

type GroupRow = {
  id: string;
  name: string;
  departments: Array<DepartmentName | "*">;
  privileges: string[];
};

type AccountRow = {
  id: string;
  name: string;
  email: string;
  username: string;
  password_hash: string;
  group_id: string;
  active: boolean;
  google_id: string | null;
  auth_provider: string;
};

function isoOrNull(value: Date | string | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

type NoticeRow = {
  id: string;
  key: string | null;
  type: string;
  title: string;
  body: string;
  href: string;
  derived: boolean;
  read_at: Date | null;
  created_at: Date;
};

type TillRow = {
  id: string;
  name: string;
  code: string;
  branch_name: string;
  product: string;
  active: boolean;
  hardware_hex: string | null;
  session_token: string | null;
  paired_at: Date | null;
  last_seen_at: Date | null;
  subscription_expires_at: Date | null;
};

@Injectable()
export class ConsoleService {
  constructor(
    private readonly db: DbService,
    private readonly setup: SetupService,
    private readonly email: EmailService,
  ) {}

  private mapGroup(row: {
    id: string;
    name: string;
    departments: unknown;
    privileges: unknown;
  }): ConsoleGroup {
    return {
      id: row.id,
      name: row.name,
      departments: (row.departments ?? []) as Array<DepartmentName | "*">,
      privileges: (row.privileges ?? []) as string[],
    };
  }

  private mapAccount(row: AccountRow): ConsoleAccount {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      username: row.username,
      password: row.password_hash,
      groupId: row.group_id,
      active: row.active,
      googleId: row.google_id,
      authProvider:
        row.auth_provider === "google" || row.auth_provider === "both"
          ? row.auth_provider
          : "password",
    };
  }

  private mapNotice(row: NoticeRow): HqNotice {
    return {
      id: row.id,
      key: row.key ?? "",
      type: row.type,
      title: row.title,
      body: row.body,
      href: row.href,
      derived: row.derived,
      createdAt: isoOrNull(row.created_at)!,
      readAt: isoOrNull(row.read_at),
    };
  }

  private mapTill(row: TillRow): HqTill {
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      branchName: row.branch_name,
      product: normalizeTillProduct(row.product),
      active: row.active,
      hardwareHex: row.hardware_hex,
      sessionToken: row.session_token,
      pairedAt: isoOrNull(row.paired_at),
      lastSeenAt: isoOrNull(row.last_seen_at),
      subscriptionExpiresAt: isoOrNull(row.subscription_expires_at),
    };
  }

  // ---------- groups ----------

  async listGroups(): Promise<ConsoleGroup[]> {
    const result = await this.db.query<GroupRow>(
      `select id, name, departments, privileges from hq_groups order by created_at, id`,
    );
    return result.rows.map((row) => this.mapGroup(row));
  }

  private async findGroup(id: string): Promise<ConsoleGroup | undefined> {
    const result = await this.db.query<GroupRow>(
      `select id, name, departments, privileges from hq_groups where id = $1`,
      [id],
    );
    return result.rows[0] ? this.mapGroup(result.rows[0]) : undefined;
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
    await this.db.query(
      `insert into hq_groups (id, name, departments, privileges)
       values ($1, $2, $3::jsonb, $4::jsonb)
       on conflict (id) do update
       set name = excluded.name,
           departments = excluded.departments,
           privileges = excluded.privileges`,
      [
        next.id,
        next.name,
        JSON.stringify(next.departments),
        JSON.stringify(next.privileges),
      ],
    );
    return next;
  }

  async deleteGroup(id: string) {
    if (isDefaultGroupId(id)) {
      throw new BadRequestException("Default groups cannot be deleted");
    }
    const inUse = await this.db.query(
      `select 1 from hq_accounts where group_id = $1 limit 1`,
      [id],
    );
    if (inUse.rowCount) {
      throw new BadRequestException("Reassign accounts before deleting this group");
    }
    const result = await this.db.query(`delete from hq_groups where id = $1`, [id]);
    if (!result.rowCount) throw new NotFoundException("Group not found");
    return { ok: true };
  }

  // ---------- accounts ----------

  private static ACCOUNT_COLUMNS =
    "id, name, email, username, password_hash, group_id, active, google_id, auth_provider";

  private async findAccount(where: string, params: unknown[]): Promise<ConsoleAccount | undefined> {
    const result = await this.db.query<AccountRow>(
      `select ${ConsoleService.ACCOUNT_COLUMNS} from hq_accounts where ${where} limit 1`,
      params,
    );
    return result.rows[0] ? this.mapAccount(result.rows[0]) : undefined;
  }

  async listAccounts() {
    const result = await this.db.query<AccountRow>(
      `select ${ConsoleService.ACCOUNT_COLUMNS} from hq_accounts order by created_at, id`,
    );
    return result.rows.map((row) => publicAccount(this.mapAccount(row)));
  }

  async login(emailOrUsername: string, password: string) {
    const key = emailOrUsername.trim().toLowerCase();
    const account = await this.findAccount(
      "active and (lower(email) = $1 or lower(username) = $1)",
      [key],
    );
    if (!account || !verifyPassword(password, account.password)) {
      throw new UnauthorizedException("Invalid email or password");
    }
    if (!isHashedPassword(account.password)) {
      await this.setPassword(account.id, password);
    }
    return this.issueSession(account);
  }

  private async setPassword(accountId: string, password: string) {
    await this.db.query(`update hq_accounts set password_hash = $2 where id = $1`, [
      accountId,
      hashPassword(password),
    ]);
  }

  private async sessionPayload(token: string) {
    const result = await this.db.query<
      AccountRow & { group_name: string; departments: unknown; privileges: unknown }
    >(
      `select a.id, a.name, a.email, a.username, a.password_hash, a.group_id, a.active,
              a.google_id, a.auth_provider,
              g.name as group_name, g.departments, g.privileges
       from hq_sessions s
       join hq_accounts a on a.id = s.account_id and a.active
       join hq_groups g on g.id = a.group_id
       where s.token = $1
       limit 1`,
      [token],
    );
    const row = result.rows[0];
    if (!row) throw new UnauthorizedException("Sign in again");
    return {
      token,
      user: {
        ...publicAccount(this.mapAccount(row)),
        groupName: row.group_name,
        departments: row.departments as Array<DepartmentName | "*">,
        privileges: row.privileges as string[],
      },
    };
  }

  me(token: string) {
    return this.sessionPayload(token.trim());
  }

  async logout(token: string) {
    await this.db.query(`delete from hq_sessions where token = $1`, [token.trim()]);
    return { ok: true };
  }

  async issueSession(account: ConsoleAccount) {
    const group = await this.findGroup(account.groupId);
    if (!group) throw new UnauthorizedException("Account has no group");
    const token = generateSessionToken();
    await this.db.query(`delete from hq_sessions where account_id = $1`, [account.id]);
    await this.db.query(`insert into hq_sessions (token, account_id) values ($1, $2)`, [
      token,
      account.id,
    ]);
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

  async register(input: {
    name?: string;
    email?: string;
    username?: string;
    password?: string;
  }) {
    // Legacy personal register → sales staff. Prefer registerCompany for new tenants.
    const password = input.password?.trim() ?? "";
    if (password.length < 6) {
      throw new BadRequestException("Password must be at least 6 characters");
    }
    const groups = await this.listGroups();
    const group =
      groups.find((row) => row.id === "g-sales") ??
      groups.find((row) => !row.privileges.includes("*")) ??
      groups[0];
    if (!group) throw new BadRequestException("No group available for new accounts");
    await this.saveAccount(
      {
        name: input.name,
        email: input.email,
        username: input.username,
        password,
        groupId: group.id,
        active: true,
        authProvider: "password",
      },
      { welcomePassword: password },
    );
    return this.login(input.email ?? input.username ?? "", password);
  }

  googleConfig() {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || "";
    return {
      enabled: Boolean(clientId),
      clientId: clientId || null,
    };
  }

  /** Company onboarding — creates Administrator account + company profile in real time. */
  async registerCompany(input: {
    company?: Partial<HqCompany>;
    account?: {
      name?: string;
      email?: string;
      username?: string;
      password?: string;
    };
  }) {
    const companyName = input.company?.name?.trim();
    if (!companyName) throw new BadRequestException("Company name is required");

    const name = input.account?.name?.trim();
    const email = input.account?.email?.trim().toLowerCase();
    const username = input.account?.username?.trim().toLowerCase();
    const password = input.account?.password?.trim() ?? "";
    if (!name || !email || !username) {
      throw new BadRequestException("Owner name, email, and username are required");
    }
    if (password.length < 6) {
      throw new BadRequestException("Password must be at least 6 characters");
    }

    const groups = await this.listGroups();
    const adminGroup =
      groups.find((row) => row.id === "g-admin") ??
      groups.find((row) => row.privileges.includes("*")) ??
      groups[0];
    if (!adminGroup) throw new BadRequestException("Administrator group is missing");

    await this.saveAccount(
      {
        name,
        email,
        username,
        password,
        groupId: adminGroup.id,
        active: true,
        authProvider: "password",
      },
      { skipWelcomeEmail: true },
    );

    const company = await this.setup.saveCompany({
      name: companyName,
      legalName: input.company?.legalName?.trim() || companyName,
      email: input.company?.email?.trim() || email,
      phone: input.company?.phone?.trim() || "",
      address: input.company?.address?.trim() || "",
      state: input.company?.state?.trim() || "",
      country: input.company?.country?.trim() || "Nigeria",
      currency: input.company?.currency?.trim() || "NGN",
      rc: input.company?.rc?.trim() || "",
      tin: input.company?.tin?.trim() || "",
    });

    await this.pushNotice({
      key: `company.onboarded:${company.id}:${Date.now()}`,
      type: "company.onboarded",
      title: "Company onboarded",
      body: `${company.name} was created with owner ${name}.`,
      href: "/setup/others/company",
    });

    const owner = await this.findAccount(
      "lower(email) = $1 and lower(username) = $2",
      [email.toLowerCase(), username.toLowerCase()],
    );
    if (owner) {
      await this.sendCompanyOwnerEmail(owner, company.name);
    }

    const session = await this.login(email, password);
    return { ...session, company, onboarding: "company" as const };
  }

  async googleAuth(input: {
    credential?: string;
    intent?: "login" | "signup";
    company?: Partial<HqCompany>;
  }) {
    const intent = input.intent === "signup" ? "signup" : "login";
    const profile = await this.verifyGoogleCredential(input.credential ?? "");

    if (intent === "login") {
      let account =
        (await this.findAccount("active and google_id = $1", [profile.sub])) ??
        (await this.findAccount("active and lower(email) = $1", [profile.email]));
      if (!account) {
        throw new UnauthorizedException(
          "No HQ account for this Google email. Ask an admin for access, or Sign up as a company.",
        );
      }
      if (!account.googleId) {
        account.googleId = profile.sub;
        account.authProvider =
          account.authProvider === "password" || !account.authProvider
            ? "both"
            : account.authProvider;
        await this.db.query(
          `update hq_accounts set google_id = $2, auth_provider = $3 where id = $1`,
          [account.id, profile.sub, account.authProvider],
        );
      }
      return { ...(await this.issueSession(account)), linked: true as const };
    }

    const companyName = input.company?.name?.trim();
    if (!companyName) {
      throw new BadRequestException("Company name is required for Google signup");
    }

    const existing =
      (await this.findAccount("lower(email) = $1", [profile.email])) ??
      (await this.findAccount("google_id = $1", [profile.sub]));
    if (existing) {
      throw new ConflictException(
        "This Google account already has HQ access. Use Login instead.",
      );
    }

    const groups = await this.listGroups();
    const adminGroup =
      groups.find((row) => row.id === "g-admin") ??
      groups.find((row) => row.privileges.includes("*")) ??
      groups[0];
    if (!adminGroup) throw new BadRequestException("Administrator group is missing");

    const usernameBase =
      profile.email.split("@")[0].replace(/[^a-z0-9]+/gi, "").toLowerCase() || "owner";
    let username = usernameBase.slice(0, 24);
    let suffix = 0;
    while (await this.findAccount("lower(username) = $1", [username])) {
      suffix += 1;
      username = `${usernameBase.slice(0, 20)}${suffix}`;
    }

    await this.saveAccount(
      {
        name: profile.name || companyName,
        email: profile.email,
        username,
        password: generateSessionToken().slice(0, 24),
        groupId: adminGroup.id,
        active: true,
        googleId: profile.sub,
        authProvider: "google",
      },
      { skipWelcomeEmail: true },
    );

    const company = await this.setup.saveCompany({
      name: companyName,
      legalName: input.company?.legalName?.trim() || companyName,
      email: input.company?.email?.trim() || profile.email,
      phone: input.company?.phone?.trim() || "",
      address: input.company?.address?.trim() || "",
      state: input.company?.state?.trim() || "",
      country: input.company?.country?.trim() || "Nigeria",
      currency: input.company?.currency?.trim() || "NGN",
      rc: input.company?.rc?.trim() || "",
      tin: input.company?.tin?.trim() || "",
    });

    await this.pushNotice({
      key: `company.onboarded.google:${company.id}:${Date.now()}`,
      type: "company.onboarded",
      title: "Company onboarded with Google",
      body: `${company.name} was created via Google by ${profile.email}.`,
      href: "/setup/others/company",
    });

    const account = await this.findAccount("google_id = $1", [profile.sub]);
    if (!account) throw new BadRequestException("Could not finish Google signup");
    await this.sendCompanyOwnerEmail(account, company.name);
    return {
      ...(await this.issueSession(account)),
      company,
      onboarding: "company" as const,
    };
  }

  private async verifyGoogleCredential(credential: string): Promise<GoogleProfile> {
    const token = credential.trim();
    if (!token) throw new BadRequestException("Google credential is required");

    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    if (!clientId) {
      throw new BadRequestException(
        "Google sign-in is not configured. Set GOOGLE_CLIENT_ID on the API.",
      );
    }

    let response: Response;
    try {
      response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`,
      );
    } catch {
      throw new BadRequestException("Could not reach Google to verify the sign-in");
    }
    if (!response.ok) {
      throw new UnauthorizedException("Google credential is invalid or expired");
    }
    const data = (await response.json()) as {
      aud?: string;
      sub?: string;
      email?: string;
      email_verified?: string | boolean;
      name?: string;
      picture?: string;
    };
    if (data.aud !== clientId) {
      throw new UnauthorizedException("Google client mismatch");
    }
    const email = data.email?.trim().toLowerCase();
    const sub = data.sub?.trim();
    if (!email || !sub) {
      throw new UnauthorizedException("Google profile is incomplete");
    }
    const verified =
      data.email_verified === true || data.email_verified === "true";
    if (!verified) {
      throw new UnauthorizedException("Google email is not verified");
    }
    return {
      sub,
      email,
      emailVerified: true,
      name: data.name?.trim() || email.split("@")[0],
      picture: data.picture,
    };
  }

  async forgotPassword(emailOrUsername: string) {
    const key = emailOrUsername.trim().toLowerCase();
    const account = await this.findAccount(
      "active and (lower(email) = $1 or lower(username) = $1)",
      [key],
    );
    if (!account) return { ok: true as const };
    await this.db.query(`delete from hq_password_resets where account_id = $1`, [
      account.id,
    ]);
    const token = generateSessionToken();
    await this.db.query(
      `insert into hq_password_resets (token, account_id, expires_at)
       values ($1, $2, now() + interval '1 hour')`,
      [token, account.id],
    );
    const resetUrl = `${this.email.hqAppUrl()}/reset-password?token=${encodeURIComponent(token)}`;
    const mail = await this.email.sendPasswordReset({
      to: account.email,
      name: account.name,
      resetUrl,
    });
    if (mail.sent) {
      return { ok: true as const, emailSent: true as const };
    }
    return { ok: true as const, resetToken: token };
  }

  async resetPassword(token: string, password: string) {
    const next = password.trim();
    if (next.length < 6) {
      throw new BadRequestException("Password must be at least 6 characters");
    }
    const result = await this.db.query<{ id: string; name: string; email: string }>(
      `select a.id, a.name, a.email
       from hq_password_resets r
       join hq_accounts a on a.id = r.account_id
       where r.token = $1 and r.expires_at > now()`,
      [token.trim()],
    );
    const account = result.rows[0];
    if (!account) throw new BadRequestException("Reset link is invalid or has expired");
    await this.setPassword(account.id, next);
    await this.db.query(`delete from hq_password_resets where token = $1`, [token.trim()]);
    await this.db.query(`delete from hq_sessions where account_id = $1`, [account.id]);
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
    const { user } = await this.sessionPayload(token);
    const account = await this.findAccount("id = $1", [user.id]);
    if (!account || !verifyPassword(current, account.password)) {
      throw new UnauthorizedException("Current password is wrong");
    }
    const next = nextPassword.trim();
    if (next.length < 6) {
      throw new BadRequestException("Password must be at least 6 characters");
    }
    await this.setPassword(account.id, next);
    return { ok: true as const };
  }

  async saveAccount(
    input: Partial<ConsoleAccount> & { id?: string },
    options?: {
      invitedBy?: string;
      welcomePassword?: string;
      skipWelcomeEmail?: boolean;
    },
  ) {
    const name = input.name?.trim();
    const email = input.email?.trim().toLowerCase();
    const username = input.username?.trim().toLowerCase();
    const groupId = input.groupId?.trim();
    if (!name || !email || !username) {
      throw new BadRequestException("Name, email, and username are required");
    }
    if (!groupId) {
      throw new BadRequestException("Group is required");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException("Enter a valid email address");
    }
    if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
      throw new BadRequestException(
        "Username must be 3–32 characters: letters, numbers, dots, underscores, or hyphens",
      );
    }
    if (!(await this.findGroup(groupId))) {
      throw new BadRequestException("Select a group");
    }
    const existing = input.id
      ? await this.findAccount("id = $1", [input.id])
      : undefined;
    const duplicate = await this.findAccount(
      "($1::text is null or id <> $1) and (lower(email) = $2 or lower(username) = $3)",
      [existing?.id ?? null, email, username],
    );
    if (duplicate) throw new BadRequestException("Email or username already in use");

    const plainPassword = input.password?.trim() ?? "";
    const authProvider =
      input.authProvider ??
      existing?.authProvider ??
      (input.googleId ? "google" : "password");
    const isGoogleOnly = authProvider === "google";

    if (!existing && !plainPassword && !isGoogleOnly) {
      throw new BadRequestException("Password is required for new accounts");
    }
    if (plainPassword && plainPassword.length < 6) {
      throw new BadRequestException("Password must be at least 6 characters");
    }

    const passwordHash = existing
      ? plainPassword
        ? hashPassword(plainPassword)
        : existing.password
      : hashPassword(plainPassword || generateSessionToken().slice(0, 24));
    const id = existing?.id ?? `a-${Date.now()}`;
    const googleId =
      input.googleId !== undefined ? input.googleId : existing?.googleId ?? null;

    await this.db.query(
      `insert into hq_accounts (id, name, email, username, password_hash, group_id, active, google_id, auth_provider)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       on conflict (id) do update
       set name = excluded.name,
           email = excluded.email,
           username = excluded.username,
           password_hash = excluded.password_hash,
           group_id = excluded.group_id,
           active = excluded.active,
           google_id = excluded.google_id,
           auth_provider = excluded.auth_provider`,
      [
        id,
        name,
        email,
        username,
        passwordHash,
        groupId,
        input.active ?? existing?.active ?? true,
        googleId,
        authProvider,
      ],
    );

    const next: ConsoleAccount = {
      id,
      name,
      email,
      username,
      password: passwordHash,
      groupId,
      active: input.active ?? existing?.active ?? true,
      googleId,
      authProvider:
        authProvider === "google" || authProvider === "both" ? authProvider : "password",
    };

    if (!existing) {
      await this.pushNotice({
        key: `account.created:${next.id}`,
        type: "account.created",
        title: "New HQ account",
        body: `${next.name} (${next.username}) joined. Review the group in Setup → Users.`,
        href: "/setup/users/account",
      });
      if (!options?.skipWelcomeEmail) {
        await this.sendNewAccountEmail(next, {
          invitedBy: options?.invitedBy,
          password: options?.welcomePassword ?? plainPassword,
        });
      }
    }
    return publicAccount(next);
  }

  async deleteAccount(id: string) {
    const admins = await this.db.query<{ count: string }>(
      `select count(*)::text as count
       from hq_accounts a
       join hq_groups g on g.id = a.group_id
       where g.privileges @> '["*"]'::jsonb or g.departments @> '["*"]'::jsonb`,
    );
    const target = await this.findAccount("id = $1", [id]);
    if (!target) throw new NotFoundException("Account not found");
    const group = await this.findGroup(target.groupId);
    const isAdmin =
      group?.privileges.includes("*") || group?.departments.includes("*");
    if (isAdmin && Number(admins.rows[0]?.count ?? 0) <= 1) {
      throw new BadRequestException("Keep at least one administrator account");
    }
    await this.db.query(`delete from hq_accounts where id = $1`, [id]);
    return { ok: true };
  }

  // ---------- notices ----------

  private async pushNotice(
    input: Omit<HqNotice, "id" | "createdAt" | "readAt"> & { derived?: boolean },
  ) {
    if (
      input.key &&
      (
        await this.db.query(
          `select 1 from hq_notices where key = $1 and read_at is null limit 1`,
          [input.key],
        )
      ).rowCount
    ) {
      return;
    }
    await this.db.query(
      `insert into hq_notices (id, key, type, title, body, href, derived)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [
        `n-${generateSessionToken().slice(0, 16)}`,
        input.key ?? null,
        input.type,
        input.title,
        input.body,
        input.href,
        Boolean(input.derived),
      ],
    );
    await this.db.query(
      `delete from hq_notices where id in (
         select id from hq_notices order by created_at desc offset 100
       )`,
    );
  }

  private async ensureDerived(
    key: string,
    input: Pick<HqNotice, "type" | "title" | "body" | "href">,
  ): Promise<boolean> {
    const exists = await this.db.query(
      `select 1 from hq_notices where key = $1 limit 1`,
      [key],
    );
    if (exists.rowCount) return false;
    await this.db.query(
      `insert into hq_notices (id, key, type, title, body, href, derived)
       values ($1, $2, $3, $4, $5, $6, true)`,
      [
        `n-${generateSessionToken().slice(0, 16)}`,
        key,
        input.type,
        input.title,
        input.body,
        input.href,
      ],
    );
    return true;
  }

  private async syncDerivedNotices() {
    const tills = await this.listRawTills();
    const live = new Set<string>();
    const fortnight = 14 * 24 * 60 * 60 * 1000;
    const offlineMs = 2 * 60 * 1000;

    for (const till of tills) {
      if (!till.active) continue;
      if (till.subscriptionExpiresAt && isSubscriptionExpired(till.subscriptionExpiresAt)) {
        const key = `till.expired:${till.id}:${till.subscriptionExpiresAt}`;
        live.add(key);
        await this.ensureDerived(key, {
          type: "till.expired",
          title: `${till.name} subscription ended`,
          body: `Renew ${till.name} at ${till.branchName || "HQ"} to keep the till licensed.`,
          href: "/setup/others/till",
        });
      } else if (till.subscriptionExpiresAt) {
        const at = Date.parse(till.subscriptionExpiresAt);
        if (Number.isFinite(at) && at > Date.now() && at - Date.now() <= fortnight) {
          const key = `till.expiring:${till.id}:${till.subscriptionExpiresAt}`;
          live.add(key);
          const days = Math.max(1, Math.ceil((at - Date.now()) / (24 * 60 * 60 * 1000)));
          await this.ensureDerived(key, {
            type: "till.expiring",
            title: `${till.name} expires in ${days} day${days === 1 ? "" : "s"}`,
            body: `Renew the subscription in Setup → Till before it locks the device.`,
            href: "/setup/others/till",
          });
        }
      }
      if (till.hardwareHex && till.lastSeenAt) {
        const last = Date.parse(till.lastSeenAt);
        if (Number.isFinite(last) && Date.now() - last >= offlineMs) {
          const key = `till.offline:${till.id}`;
          live.add(key);
          await this.ensureDerived(key, {
            type: "till.offline",
            title: `${till.name} is offline`,
            body: `No heartbeat from ${till.branchName || till.name} for over two minutes.`,
            href: "/setup/others/till",
          });
        }
      }
    }

    const stale = await this.db.query<{ id: string; key: string | null }>(
      `select id, key from hq_notices where derived and read_at is null`,
    );
    for (const row of stale.rows) {
      if (!live.has(row.key ?? "")) {
        await this.db.query(`delete from hq_notices where id = $1`, [row.id]);
      }
    }
  }

  async listNotifications() {
    await this.syncDerivedNotices();
    const result = await this.db.query<NoticeRow>(
      `select id, key, type, title, body, href, derived, read_at, created_at
       from hq_notices order by created_at desc`,
    );
    const items = result.rows.map((row) => this.mapNotice(row));
    return {
      unread: items.filter((row) => !row.readAt).length,
      items,
    };
  }

  async markNoticeRead(id: string) {
    const existing = await this.db.query<NoticeRow>(
      `select id, key, type, title, body, href, derived, read_at, created_at from hq_notices where id = $1`,
      [id],
    );
    const row = existing.rows[0];
    if (!row) throw new NotFoundException("Notification not found");
    if (!row.read_at) {
      await this.db.query(`update hq_notices set read_at = now() where id = $1`, [id]);
      row.read_at = new Date();
    }
    return this.mapNotice(row);
  }

  async markAllNoticesRead() {
    await this.db.query(`update hq_notices set read_at = now() where read_at is null`);
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

  // ---------- emails ----------

  private groupName(groupId: string, groups: ConsoleGroup[]) {
    return groups.find((row) => row.id === groupId)?.name ?? "HQ User";
  }

  private async sendNewAccountEmail(
    account: ConsoleAccount,
    input: {
      invitedBy?: string;
      password?: string;
    } = {},
  ) {
    const groupName = this.groupName(account.groupId, await this.listGroups());
    const company = this.setup.getCompany();
    await this.email.sendAccountWelcome({
      to: account.email,
      name: account.name,
      username: account.username,
      groupName,
      companyName: company.name,
      loginUrl: this.email.loginUrl(),
      password: input.password,
      invitedBy: input.invitedBy,
      authProvider: account.authProvider,
    });
  }

  private async sendCompanyOwnerEmail(
    account: ConsoleAccount,
    companyName: string,
  ) {
    await this.email.sendCompanyWelcome({
      to: account.email,
      name: account.name,
      username: account.username,
      companyName,
      loginUrl: this.email.loginUrl(),
      authProvider: account.authProvider,
    });
  }

  // ---------- tills ----------

  private async listRawTills(): Promise<HqTill[]> {
    const result = await this.db.query(
      `select id, name, code, branch_name, product, active, hardware_hex, session_token,
              paired_at, last_seen_at, subscription_expires_at
       from hq_tills order by created_at, id`,
    );
    return result.rows.map((row) =>
      this.mapTill(row as TillRow),
    );
  }

  listTills() {
    return (async () => {
      const tills = await this.listRawTills();
      return tills.map(({ sessionToken: _token, ...row }) => ({
        ...row,
        online: Boolean(
          row.lastSeenAt && Date.now() - new Date(row.lastSeenAt).getTime() < 12_000,
        ),
        expired: isSubscriptionExpired(row.subscriptionExpiresAt),
      }));
    })();
  }

  private async getRawTill(id: string): Promise<HqTill | undefined> {
    const result = await this.db.query(
      `select id, name, code, branch_name, product, active, hardware_hex, session_token,
              paired_at, last_seen_at, subscription_expires_at
       from hq_tills where id = $1 limit 1`,
      [id],
    );
    return result.rows[0]
      ? this.mapTill(result.rows[0] as TillRow)
      : undefined;
  }

  private async getTillByName(name: string): Promise<HqTill | undefined> {
    const result = await this.db.query(
      `select id, name, code, branch_name, product, active, hardware_hex, session_token,
              paired_at, last_seen_at, subscription_expires_at
       from hq_tills where upper(name) = $1 limit 1`,
      [name.toUpperCase()],
    );
    return result.rows[0]
      ? this.mapTill(result.rows[0] as TillRow)
      : undefined;
  }

  private async getTillByCode(code: string): Promise<HqTill | undefined> {
    const result = await this.db.query(
      `select id, name, code, branch_name, product, active, hardware_hex, session_token,
              paired_at, last_seen_at, subscription_expires_at
       from hq_tills where code = $1 limit 1`,
      [code],
    );
    return result.rows[0]
      ? this.mapTill(result.rows[0] as TillRow)
      : undefined;
  }

  private async updateTillFields(
    id: string,
    fields: Partial<{
      code: string;
      branch_name: string;
      product: string;
      active: boolean;
      hardware_hex: string | null;
      session_token: string | null;
      paired_at: string | null;
      last_seen_at: string | null;
      subscription_expires_at: string | null;
    }>,
  ) {
    const keys = Object.keys(fields);
    if (!keys.length) return;
    const sets = keys.map((key, index) => `${key} = $${index + 2}`);
    const values = keys.map((key) => (fields as Record<string, unknown>)[key]);
    await this.db.query(`update hq_tills set ${sets.join(", ")} where id = $1`, [
      id,
      ...values,
    ]);
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
    const existing = input.id ? await this.getRawTill(input.id) : undefined;
    const duplicate = await this.getTillByName(name);
    if (duplicate && duplicate.id !== existing?.id) {
      throw new BadRequestException("That till name is already issued");
    }
    const id = existing?.id ?? `till-${Date.now()}`;
    const code = existing?.code ?? generateTillCode();
    const product = normalizeTillProduct(input.product ?? existing?.product);
    await this.db.query(
      `insert into hq_tills (id, name, code, branch_name, product, active)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (id) do update
       set name = excluded.name,
           branch_name = excluded.branch_name,
           product = excluded.product,
           active = excluded.active`,
      [
        id,
        name,
        code,
        input.branchName?.trim() || existing?.branchName || "",
        product,
        input.active ?? existing?.active ?? true,
      ],
    );
    if (!existing) {
      await this.pushNotice({
        key: `till.issued:${id}`,
        type: "till.issued",
        title: `${name} issued`,
        body: `Enter the till code on that device at ${input.branchName?.trim() || "the branch"} to activate ${tillProductLabel(product)} for one year.`,
        href: "/setup/others/till",
      });
    }
    return (await this.getRawTill(id))!;
  }

  async regenerateTillCode(id: string) {
    const till = await this.getRawTill(id);
    if (!till) throw new NotFoundException("Till not found");
    const code = generateTillCode();
    await this.updateTillFields(id, {
      code,
      hardware_hex: null,
      session_token: null,
      paired_at: null,
      last_seen_at: null,
    });
    await this.pushNotice({
      key: `till.regenerated:${till.id}:${code}`,
      type: "till.regenerated",
      title: `${till.name} code regenerated`,
      body: "The previous code no longer works. Enter the new code on that till.",
      href: "/setup/others/till",
    });
    return (await this.getRawTill(id))!;
  }

  async deleteTill(id: string) {
    const result = await this.db.query(`delete from hq_tills where id = $1`, [id]);
    if (!result.rowCount) throw new NotFoundException("Till not found");
    return { ok: true };
  }

  async activateTill(code: string, hardwareHex: string) {
    const normalized = normalizeTillCode(code);
    if (!isCompleteTillCode(normalized)) {
      throw new BadRequestException("Enter the 16-character till code from HQ");
    }
    const hex = hardwareHex.trim().toUpperCase();
    if (!hex) throw new BadRequestException("This device has no hardware hex");
    const till = await this.getTillByCode(normalized);
    if (!till || !till.active) throw new UnauthorizedException("Invalid till code");
    const pairedAt = till.pairedAt ?? new Date().toISOString();
    const subscriptionExpiresAt = isSubscriptionExpired(till.subscriptionExpiresAt)
      ? addOneYear().toISOString()
      : till.subscriptionExpiresAt;
    await this.updateTillFields(till.id, {
      hardware_hex: hex,
      session_token: generateSessionToken(),
      paired_at: pairedAt,
      last_seen_at: new Date().toISOString(),
      subscription_expires_at: subscriptionExpiresAt ?? null,
    });
    await this.pushNotice({
      key: `till.activated:${till.id}:${pairedAt}`,
      type: "till.activated",
      title: `${till.name} activated`,
      body: `The till at ${till.branchName || "the branch"} is licensed until ${new Date(subscriptionExpiresAt!).toLocaleDateString("en-NG")}.`,
      href: "/setup/others/till",
    });
    return (await this.getRawTill(till.id))!;
  }

  async heartbeatTill(code: string, hardwareHex: string, sessionToken: string) {
    const till = await this.getTillByCode(normalizeTillCode(code));
    if (!till || !till.active) {
      throw new ConflictException(
        "This till is no longer licensed on this device.",
      );
    }
    const hex = hardwareHex.trim().toUpperCase();
    const token = sessionToken.trim();
    const nowIso = new Date().toISOString();

    if (!till.sessionToken && hex && (!till.hardwareHex || till.hardwareHex === hex)) {
      if (till.subscriptionExpiresAt && isSubscriptionExpired(till.subscriptionExpiresAt)) {
        await this.updateTillFields(till.id, {
          session_token: generateSessionToken(),
          hardware_hex: hex,
          last_seen_at: nowIso,
        });
        throw new ForbiddenException(
          "Till subscription has ended. Enter the till code to renew for another year.",
        );
      }
      await this.updateTillFields(till.id, {
        session_token: generateSessionToken(),
        hardware_hex: hex,
        last_seen_at: nowIso,
        subscription_expires_at:
          till.subscriptionExpiresAt ?? addOneYear().toISOString(),
      });
      return (await this.getRawTill(till.id))!;
    }

    if (!token || till.sessionToken !== token || (till.hardwareHex && till.hardwareHex !== hex)) {
      throw new ConflictException(
        "This till is in use on another device. You have been signed out.",
      );
    }

    if (till.subscriptionExpiresAt && isSubscriptionExpired(till.subscriptionExpiresAt)) {
      await this.updateTillFields(till.id, {
        hardware_hex: hex || till.hardwareHex,
        last_seen_at: nowIso,
      });
      throw new ForbiddenException(
        "Till subscription has ended. Enter the till code to renew for another year.",
      );
    }
    await this.updateTillFields(till.id, {
      hardware_hex: hex || till.hardwareHex,
      last_seen_at: nowIso,
      subscription_expires_at:
        till.subscriptionExpiresAt ?? addOneYear().toISOString(),
    });
    return (await this.getRawTill(till.id))!;
  }

  async renewTill(id: string) {
    const till = await this.getRawTill(id);
    if (!till) throw new NotFoundException("Till not found");
    const from =
      till.subscriptionExpiresAt && !isSubscriptionExpired(till.subscriptionExpiresAt)
        ? new Date(till.subscriptionExpiresAt)
        : new Date();
    const subscriptionExpiresAt = addOneYear(from).toISOString();
    await this.updateTillFields(id, { subscription_expires_at: subscriptionExpiresAt });
    await this.pushNotice({
      key: `till.renewed:${till.id}:${subscriptionExpiresAt}`,
      type: "till.renewed",
      title: `${till.name} renewed`,
      body: `Subscription now runs until ${new Date(subscriptionExpiresAt).toLocaleDateString("en-NG")}.`,
      href: "/setup/others/till",
    });
    return (await this.getRawTill(id))!;
  }
}
