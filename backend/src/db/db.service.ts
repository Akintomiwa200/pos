import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { Pool, type QueryResult, type QueryResultRow } from "pg";
import { newDb } from "pg-mem";
import { SEED_ACCOUNTS, SEED_GROUPS, SEED_PRODUCER_GROUPS } from "../console/console.types";
import { hashPassword } from "../console/password.util";

type TableDump = { columns: string[]; rows: unknown[][] };

@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DbService.name);
  private pool!: Pool;
  private memoryMode = true;
  private memDb?: ReturnType<typeof newDb>;
  private persistTimer?: ReturnType<typeof setTimeout>;
  private persistDirty = false;
  private readonly memBackupDir = join(process.cwd(), "data");
  private readonly memBackupFile = join(this.memBackupDir, "hq-memdb.json");

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
    await mkdir(this.memBackupDir, { recursive: true }).catch(() => undefined);
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
    if (this.memoryMode && (await this.restoreMemoryBackup())) {
      this.logger.log("Restored in-memory Postgres from data/hq-memdb.json");
    }
    await this.seed();
    if (this.memoryMode) await this.flushMemoryBackup();
  }

  async onModuleDestroy() {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = undefined;
    }
    await this.flushMemoryBackup();
  }

  private useMemoryPool() {
    const mem = newDb({ autoCreateForeignKeyIndices: true });
    this.memDb = mem;
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
    const result = await this.pool.query(sql, params as never[]);
    if (this.memoryMode && this.memDb && !this.isReadOnlyQuery(sql)) {
      this.schedulePersist();
    }
    return result;
  }

  private isReadOnlyQuery(sql: string) {
    const head = sql.trim().toLowerCase();
    return head.startsWith("select") || head.startsWith("show");
  }

  private schedulePersist() {
    this.persistDirty = true;
    if (this.persistTimer) return;
    this.persistTimer = setTimeout(() => {
      this.persistTimer = undefined;
      void this.flushMemoryBackup();
    }, 800);
  }

  private async flushMemoryBackup() {
    if (!this.persistDirty || !this.memDb) return;
    this.persistDirty = false;
    try {
      await mkdir(this.memBackupDir, { recursive: true });
      const dump: Record<string, TableDump> = {};
      for (const table of this.memDb.public.listTables()) {
        const result = await this.pool.query(`SELECT * FROM "${table.name}"`);
        if (result.rows.length === 0) continue;
        const columns = result.fields.map((f) => f.name);
        const rows = result.rows.map((row) =>
          columns.map((col) => (row as Record<string, unknown>)[col]),
        );
        dump[table.name] = { columns, rows };
      }
      await writeFile(this.memBackupFile, JSON.stringify(dump), "utf8");
    } catch (err) {
      this.persistDirty = true;
      this.logger.warn(
        `Could not persist in-memory DB to disk: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  private async restoreMemoryBackup(): Promise<boolean> {
    try {
      const raw = await readFile(this.memBackupFile, "utf8");
      const dump = JSON.parse(raw) as Record<string, TableDump>;
      for (const [tableName, { columns, rows }] of Object.entries(dump)) {
        if (!rows.length) continue;
        const colList = columns.map((c) => `"${c}"`).join(", ");
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
        for (const row of rows) {
          await this.pool
            .query(
              `INSERT INTO "${tableName}" (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
              row,
            )
            .catch(() => undefined);
        }
      }
      return true;
    } catch {
      return false;
    }
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
      email_verified boolean not null default false,
      created_at timestamptz not null default now()
    )`);
    try {
      await this.query(
        `alter table hq_accounts add column if not exists email_verified boolean not null default false`,
      );
    } catch {
      /* already present */
    }
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
    await this.query(`create table if not exists hq_email_verifications (
      token text primary key,
      account_id text not null references hq_accounts(id) on delete cascade,
      email text not null,
      expires_at timestamptz not null,
      created_at timestamptz not null default now()
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
      unpaired_at timestamptz,
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
    try {
      await this.query(`alter table hq_tills add column if not exists unpaired_at timestamptz`);
    } catch {
      /* already present or engine without IF NOT EXISTS */
    }
    await this.query(`create table if not exists hq_till_payments (
      id text primary key,
      till_id text not null,
      till_name text not null,
      reference text not null unique,
      provider text not null,
      amount_minor integer not null,
      currency text not null default 'NGN',
      status text not null default 'paid',
      expires_at timestamptz not null,
      paid_at timestamptz not null default now()
    )`);
    await this.query(`create table if not exists hq_org_kv (
      key text primary key,
      data jsonb not null
    )`);
    await this.query(`create table if not exists hq_login_events (
      id text primary key,
      account_id text,
      email text not null,
      success boolean not null default false,
      reason text,
      ip text,
      created_at timestamptz not null default now()
    )`);
    await this.query(`create table if not exists hq_audit_logs (
      id text primary key,
      actor_id text,
      actor_name text,
      action text not null,
      target text,
      detail text,
      ip text,
      created_at timestamptz not null default now()
    )`);
    await this.query(`create table if not exists hq_security_events (
      id text primary key,
      kind text not null,
      severity text not null default 'info',
      title text not null,
      body text,
      account_id text,
      resolved boolean not null default false,
      created_at timestamptz not null default now()
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
       where group_id = 'g-super-admin' and not (lower(email) = any($1::text[]))`,
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