import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Pool, type QueryResult, type QueryResultRow } from "pg";
import { newDb } from "pg-mem";
import { SEED_ACCOUNTS, SEED_GROUPS } from "../console/console.types";
import { hashPassword } from "../console/password.util";

@Injectable()
export class DbService implements OnModuleInit {
  private readonly logger = new Logger(DbService.name);
  private readonly pool: Pool;
  private readonly memoryMode: boolean;

  constructor() {
    const connectionString = process.env.DATABASE_URL?.trim();
    if (!connectionString) {
      // Local/dev fallback used when backend/.env has no DATABASE_URL (same as smoke/e2e).
      const mem = newDb({ autoCreateForeignKeyIndices: true });
      const { Pool: MemPool } = mem.adapters.createPg();
      this.pool = new MemPool() as unknown as Pool;
      this.memoryMode = true;
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
    await this.pool.query("select 1");
    this.logger.log(
      this.memoryMode
        ? "In-memory Postgres (pg-mem) — set DATABASE_URL in backend/.env for Supabase"
        : "Supabase Postgres connected",
    );
    await this.ensureSchema();
    await this.seed();
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
      created_at timestamptz not null default now()
    )`);
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
    await this.query(`create table if not exists hq_org_kv (
      key text primary key,
      data jsonb not null
    )`);
  }

  private async seed() {
    for (const group of SEED_GROUPS) {
      await this.query(
        `insert into hq_groups (id, name, departments, privileges)
         values ($1, $2, $3::jsonb, $4::jsonb)
         on conflict (id) do update
         set name = excluded.name,
             departments = excluded.departments,
             privileges = excluded.privileges`,
        [
          group.id,
          group.name,
          JSON.stringify(group.departments),
          JSON.stringify(group.privileges),
        ],
      );
    }
    this.logger.log("Ensured HQ groups seed");

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
