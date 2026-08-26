import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Pool, type QueryResult, type QueryResultRow } from "pg";
import { newDb } from "pg-mem";
import { SEED_ACCOUNTS, SEED_GROUPS, SEED_PRODUCER_GROUPS } from "../console/console.types";
import { hashPassword } from "../console/password.util";

@Injectable()
export class DbService implements OnModuleInit {
  private readonly logger = new Logger(DbService.name);
  private pool!: Pool;
  private memoryMode = true;

  constructor() {
    const connectionString = process.env.DATABASE_URL?.trim();
    if (!connectionString) {
      this.useMemoryPool();
      return;
    }
    const isLocal =
      /@(localhost|127\.0\.0\.1|\[::1\]|::1)[:/]/.test(connectionString) ||
      /sslmode=disable/.test(connectionString);
    this.pool = new Pool({
      connectionString,
      max: Number(process.env.PG_POOL_MAX?.trim() || "5"),
      ssl: isLocal ? undefined : { rejectUnauthorized: false },
      application_name: "pos-backend",
    });
    this.memoryMode = false;
  }

  async onModuleInit() {
    try {
      await this.pool.query("select 1");
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Supabase Postgres unreachable (${detail}). Falling back to in-memory DB so Google and HQ still work. Use the Session pooler URL (IPv4) from Project Settings → Database.`,
      );
      await this.pool.end().catch(() => undefined);
      this.useMemoryPool();
    }
    this.logger.log(
      this.memoryMode
        ? "In-memory Postgres (pg-mem) — set DATABASE_URL in backend/.env for Supabase"
        : "Supabase Postgres connected",
    );
    await this.ensureSchema();
    await this.seed();
  }

  private useMemoryPool() {
    const mem = newDb({ autoCreateForeignKeyIndices: true });
    const { Pool: MemPool } = mem.adapters.createPg();
    this.pool = new MemPool() as unknown as Pool;
    this.memoryMode = true;
  }

  get isMemoryMode() {
    return this.memoryMode;
  }

  async query<R extends QueryResultRow = QueryResultRow>(
    sql: string,
    params?: unknown[],
  ): Promise<QueryResult<R>> {
    return this.pool.query(sql, params as never[]);
  }

  private async ensureSchema() {
    await this.query(`create table if not exists hq_groups (
      id text primary key,
      name text not null,
      departments jsonb not null default '[]'::jsonb,
      privileges jsonb not null default '[]'::jsonb,
      scope text not null default 'tenant',
      created_at timestamptz not null default now()
    )`);
    try {
      await this.query(
        `alter table hq_groups add column if not exists scope text not null default 'tenant'`,
      );
    } catch {
      /* already present */
    }
    await this.query(`create table if not exists hq_accounts (
      id text primary key,
      name text not null,
      email text not null unique,
      username text not null unique,
      password_hash text not null,
      group_id text not null references hq_groups(id),
      active boolean not null default true,
      google_id text unique,
      auth_provider text not null default 'password',
      created_at timestamptz not null default now()
    )`);
    await this.query(`create table if not exists hq_sessions (
      token text primary key,
      account_id text not null references hq_accounts(id) on delete cascade,
      created_at timestamptz not null default now()
    )`);
    await this.query(`create table if not exists hq_password_resets (
      token text primary key,
      account_id text not null references hq_accounts(id) on delete cascade,
      expires_at timestamptz not null
    )`);
    await this.query(`create table if not exists hq_notices (
      id text primary key,
      key text,
      type text not null,
      title text not null,
      body text not null,
      href text not null,
      derived boolean not null default false,
      read_at timestamptz,
      created_at timestamptz not null default now()
    )`);
    await this.query(`create table if not exists hq_tills (
      id text primary key,
      name text not null,
      code text not null,
      branch_name text not null default '',
      store_id text,
      branch_id text,
      product text not null default 'supermarket',
      active boolean not null default true,
      hardware_hex text,
      session_token text,
      paired_at timestamptz,
      last_seen_at timestamptz,
      subscription_expires_at timestamptz,
      created_at timestamptz not null default now()
    )`);
    await this.query(
      `create unique index if not exists hq_tills_code_key on hq_tills (code)`,
    );
    try {
      await this.query(`alter table hq_tills add column if not exists store_id text`);
    } catch {
      /* already present or engine without IF NOT EXISTS */
    }
    try {
      await this.query(`alter table hq_tills add column if not exists branch_id text`);
    } catch {
      /* already present or engine without IF NOT EXISTS */
    }
    await this.query(`create table if not exists hq_org_kv (
      key text primary key,
      data jsonb not null
    )`);
  }

  private async seed() {
    for (const group of SEED_GROUPS) {
      await this.query(
        `insert into hq_groups (id, name, departments, privileges, scope)
         values ($1, $2, $3::jsonb, $4::jsonb, $5)
         on conflict (id) do update set scope = excluded.scope`,
        [
          group.id,
          group.name,
          JSON.stringify(group.departments),
          JSON.stringify(group.privileges),
          group.scope ?? "tenant",
        ],
      );
    }
    for (const group of SEED_PRODUCER_GROUPS) {
      await this.query(
        `insert into hq_groups (id, name, departments, privileges, scope)
         values ($1, $2, $3::jsonb, $4::jsonb, $5)
         on conflict (id) do update
         set name = excluded.name,
             departments = excluded.departments,
             privileges = excluded.privileges,
             scope = excluded.scope`,
        [
          group.id,
          group.name,
          JSON.stringify(group.departments),
          JSON.stringify(group.privileges),
          group.scope ?? "producer",
        ],
      );
    }
    this.logger.log("Ensured default HQ groups");
    await this.restrictProducerOwners();

    if (this.memoryMode) {
      for (const account of SEED_ACCOUNTS) {
        await this.query(
          `insert into hq_accounts (id, name, email, username, password_hash, group_id, active, auth_provider)
           values ($1, $2, $3, $4, $5, $6, true, 'password')
           on conflict (id) do nothing`,
          [
            account.id,
            account.name,
            account.email,
            account.username,
            hashPassword(account.password),
            account.groupId,
          ],
        );
      }
      this.logger.log("Seeded in-memory demo HQ accounts");
    } else {
      const demoIds = SEED_ACCOUNTS.map((row) => row.id);
      await this.query(
        `delete from hq_sessions
         where account_id in (
           select id from hq_accounts
           where id = any($1::text[]) and email like '%@example.com'
         )`,
        [demoIds],
      );
      const removed = await this.query(
        `delete from hq_accounts
         where id = any($1::text[]) and email like '%@example.com'`,
        [demoIds],
      );
      if (removed.rowCount) {
        this.logger.log(`Removed ${removed.rowCount} demo HQ accounts`);
      }
    }

    if (this.memoryMode) {
      const tills = await this.query<{ count: string }>(
        `select count(*)::text as count from hq_tills`,
      );
      if (tills.rows[0]?.count === "0") {
        for (const till of SEED_TILL_ROWS) {
          await this.query(
            `insert into hq_tills (id, name, code, branch_name, product, active)
             values ($1, $2, $3, $4, $5, true)
             on conflict do nothing`,
            [till.id, till.name, till.code, till.branchName, till.product],
          );
        }
        this.logger.log("Seeded in-memory demo HQ tills");
      }
    } else {
      const demoIds = SEED_TILL_ROWS.map((row) => row.id);
      const removed = await this.query(
        `delete from hq_tills
         where id = any($1::text[])
           and code in ('1111-2222-3333-4444', 'A7F3-19C0-B4E2-8D61')`,
        [demoIds],
      );
      if (removed.rowCount) {
        this.logger.log(`Removed ${removed.rowCount} demo HQ tills`);
      }
    }
  }

  private producerOwnerEmails(): string[] {
    const raw =
      process.env.SUPER_ADMIN_EMAILS?.trim() ||
      process.env.PRODUCER_OWNER_EMAIL?.trim() ||
      "";
    return raw
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
  }

  private async restrictProducerOwners() {
    const emails = this.producerOwnerEmails();
    if (!emails.length) return;
    const demoted = await this.query(
      `update hq_accounts set group_id = 'g-admin'
       where group_id = 'g-super-admin' and lower(email) <> all($1::text[])`,
      [emails],
    );
    if (demoted.rowCount) {
      this.logger.log(`Moved ${demoted.rowCount} account(s) off Super Admin`);
    }
  }
}

const SEED_TILL_ROWS = [
  {
    id: "till-demo-01",
    name: "TILL-DEMO-01",
    code: "1111-2222-3333-4444",
    branchName: "Victoria Island",
    product: "supermarket",
  },
  {
    id: "till-vi-01",
    name: "TILL-VI-01",
    code: "A7F3-19C0-B4E2-8D61",
    branchName: "Victoria Island",
    product: "supermarket",
  },
];
