import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Pool, type QueryResult, type QueryResultRow } from "pg";
import { hashPassword } from "../console/password.util";

@Injectable()
export class DbService implements OnModuleInit {
  private readonly logger = new Logger(DbService.name);
  private readonly pool: Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL?.trim();
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL is required — set it to the Supabase Postgres connection string (Project Settings → Database → Connection string → Session pooler).",
      );
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
  }

  async onModuleInit() {
    await this.pool.query("select 1");
    this.logger.log("Supabase Postgres connected");
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
    const groups = await this.query<{ count: string }>(
      `select count(*)::text as count from hq_groups`,
    );
    if (groups.rows[0]?.count === "0") {
      for (const group of SEED_GROUP_ROWS) {
        await this.query(
          `insert into hq_groups (id, name, departments, privileges)
           values ($1, $2, $3::jsonb, $4::jsonb)`,
          [
            group.id,
            group.name,
            JSON.stringify(group.departments),
            JSON.stringify(group.privileges),
          ],
        );
      }
      this.logger.log("Seeded HQ groups");
    }

    const accounts = await this.query<{ count: string }>(
      `select count(*)::text as count from hq_accounts`,
    );
    if (accounts.rows[0]?.count === "0") {
      for (const account of SEED_ACCOUNT_ROWS) {
        await this.query(
          `insert into hq_accounts (id, name, email, username, password_hash, group_id, active, auth_provider)
           values ($1, $2, $3, $4, $5, $6, true, 'password')`,
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
      this.logger.log("Seeded demo HQ accounts (password: demo)");
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

const SEED_GROUP_ROWS = [
  { id: "g-admin", name: "Administrator", departments: ["*"], privileges: ["*"] },
  {
    id: "g-accountant",
    name: "Accountant",
    departments: ["Report", "Transaction", "Setup"],
    privileges: [
      "sales",
      "stock-report",
      "balance",
      "ledger",
      "trail",
      "tax",
      "payments",
      "receipt",
      "expenses",
      "expense-account",
    ],
  },
  {
    id: "g-sales",
    name: "Sales",
    departments: ["Report", "Transaction", "Setup"],
    privileges: ["sales", "receipt", "customer", "sales-rep"],
  },
];

const SEED_ACCOUNT_ROWS = [
  {
    id: "a-emma",
    name: "Emma Wang",
    email: "emma.wang@example.com",
    username: "emma",
    password: "demo",
    groupId: "g-admin",
  },
  {
    id: "a-chika",
    name: "Chika Okonkwo",
    email: "chika.okonkwo@example.com",
    username: "chika",
    password: "demo",
    groupId: "g-accountant",
  },
  {
    id: "a-tosin",
    name: "Tosin Adeyemi",
    email: "tosin.adeyemi@example.com",
    username: "tosin",
    password: "demo",
    groupId: "g-sales",
  },
];

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
