import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Pool, type QueryResult, type QueryResultRow } from "pg";
import { SEED_GROUPS, SEED_PRODUCER_GROUPS } from "../console/console.types";

@Injectable()
export class DbService implements OnModuleInit {
  private readonly logger = new Logger(DbService.name);
  private pool!: Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL?.trim();
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL is missing. Set the Supabase Postgres connection string in backend/.env to start the backend.",
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
    try {
      await this.pool.query("select 1");
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Supabase Postgres unreachable (${detail}). Use the Session pooler URL (IPv4) from Project Settings → Database in backend/.env.`,
      );
    }
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
    await this.query(`create table if not exists hq_plans (
      id text primary key,
      code text not null unique,
      name text not null,
      tagline text not null default '',
      price_minor integer not null default 0,
      till_cap integer not null default -1,
      period text not null default 'yearly',
      popular boolean not null default false,
      features jsonb not null default '[]'::jsonb,
      active boolean not null default true,
      sort integer not null default 0,
      created_at timestamptz not null default now()
    )`);
    await this.query(`create table if not exists hq_subscriptions (
      id text primary key,
      company_id text not null,
      company_name text not null,
      plan_id text not null references hq_plans(id),
      status text not null default 'active',
      auto_renew boolean not null default false,
      started_at timestamptz not null default now(),
      renews_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )`);
    await this.query(`create index if not exists hq_subscriptions_company_idx on hq_subscriptions (company_id)`);
    await this.query(`create table if not exists hq_invoices (
      id text primary key,
      invoice_no text not null,
      company_id text not null,
      company_name text not null,
      plan_id text,
      plan_name text,
      till_id text,
      till_name text,
      kind text not null default 'subscription',
      label text not null default '',
      amount_minor integer not null default 0,
      currency text not null default 'NGN',
      status text not null default 'pending',
      reference text,
      provider text,
      issued_at timestamptz not null default now(),
      due_at timestamptz,
      paid_at timestamptz,
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
    await this.seedPlans();
    this.logger.log("Ensured default HQ groups");
    await this.restrictProducerOwners();
  }

  private async seedPlans() {
    const plans: Array<{
      id: string;
      code: string;
      name: string;
      tagline: string;
      priceMinor: number;
      tillCap: number;
      popular: boolean;
      sort: number;
      features: string[];
    }> = [
      {
        id: "plan-free",
        code: "free",
        name: "Free",
        tagline: "Try the platform on one till",
        priceMinor: 0,
        tillCap: 1,
        popular: false,
        sort: 1,
        features: ["1 till licence", "1 store", "Catalogue + inventory", "Community support"],
      },
      {
        id: "plan-starter",
        code: "starter",
        name: "Starter",
        tagline: "For a single growing shop",
        priceMinor: 25_000_000,
        tillCap: 5,
        popular: false,
        sort: 2,
        features: ["5 till licences", "3 branches", "Sales & stock reports", "Email support"],
      },
      {
        id: "plan-growth",
        code: "growth",
        name: "Growth",
        tagline: "Multi-branch retail and hospitality",
        priceMinor: 120_000_000,
        tillCap: 25,
        popular: true,
        sort: 3,
        features: [
          "25 till licences",
          "Unlimited branches",
          "Full report suite",
          "Priority support",
        ],
      },
      {
        id: "plan-enterprise",
        code: "enterprise",
        name: "Enterprise",
        tagline: "Scale without the ceiling",
        priceMinor: 0,
        tillCap: -1,
        popular: false,
        sort: 4,
        features: [
          "Unlimited tills",
          "Dedicated manager",
          "Custom integrations",
          "SLA support",
        ],
      },
    ];
    for (const plan of plans) {
      await this.query(
        `insert into hq_plans
           (id, code, name, tagline, price_minor, till_cap, period, popular, features, active, sort)
         values ($1, $2, $3, $4, $5, $6, 'yearly', $7, $8::jsonb, true, $9)
         on conflict (id) do update set
           code = excluded.code,
           name = excluded.name,
           tagline = excluded.tagline,
           price_minor = excluded.price_minor,
           till_cap = excluded.till_cap,
           period = excluded.period,
           popular = excluded.popular,
           features = excluded.features,
           active = true,
           sort = excluded.sort`,
        [
          plan.id,
          plan.code,
          plan.name,
          plan.tagline,
          plan.priceMinor,
          plan.tillCap,
          plan.popular,
          JSON.stringify(plan.features),
          plan.sort,
        ],
      );
    }
    this.logger.log(`Seeded ${plans.length} default subscription plans`);
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