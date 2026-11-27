/**
 * Two distinct backup formats are produced here:
 *
 * 1. JSON snapshot: top-level `data/*.json` files only. Restoring it overwrites
 *    those files and never touches Postgres rows.
 * 2. Postgres SQL dump: a REAL data-only logical dump of schema `public`.
 *
 * Included in the SQL dump: rows of every `public` BASE TABLE (generated
 * columns excluded, identity ALWAYS columns inserted with OVERRIDING SYSTEM
 * VALUE), table order derived from FK dependencies, self-FK-aware row order,
 * and setval() for discoverable `public` sequences.
 *
 * NOT included: roles, users, grants, extensions, indexes, constraints,
 * views, materialized views, functions, triggers, schemas other than `public`,
 * cross-schema rows/large objects, WAL/PITR metadata, or DDL of any kind.
 * Restore therefore truncates existing target rows in one transaction; it
 * does not recreate or alter tables.
 */
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { mkdir, open, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Pool, PoolClient } from "pg";
import { DbService } from "../db/db.service";
import {
  MAX_SQL_BYTES,
  findExternalFks,
  findMissingTables,
  generatePostgresDump,
  parseBackupHeader,
  parseSqlBackup,
  quoteIdent,
} from "./postgres-backup";

export type BackupKind = "json" | "json+sql";

export type BackupMeta = {
  id: string;
  at: string;
  bytes: number;
  files: number;
  kind: BackupKind;
  sqlBytes: number;
  tables: number;
  rows: number;
  sequences: number;
};

export type RestoreResult = {
  restored: string[];
  skipped: string[];
  at: string;
};

export type SqlRestoreResult = {
  source: string;
  at: string;
  tables: string[];
  rows: number;
  sequences: number;
  durationMs: number;
};

export type SqlDownload = { path: string; filename: string; size: number };

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

function safeFileName(name: string) {
  return /^[A-Za-z0-9._-]+$/.test(name) && !name.includes("..") && name.endsWith(".json");
}

function validateBackupId(id: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(id) || id.includes("..")) {
    throw new BadRequestException("Invalid backup id");
  }
  return id;
}

function insertTarget(statement: string): string | null {
  const match = /^insert\s+into\s+"public"\."((?:[^"]|"")+)"\s*\(/i.exec(
    statement.trimStart(),
  );
  return match ? `public.${match[1]!.replace(/""/g, '"')}` : null;
}

async function readHeader(path: string) {
  const handle = await open(path, "r");
  try {
    const buffer = Buffer.alloc(128 * 1024);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    return buffer.subarray(0, bytesRead).toString("utf8");
  } finally {
    await handle.close();
  }
}

@Injectable()
export class SystemBackupService {
  constructor(private readonly db: DbService) {}

  private readonly dir = join(process.cwd(), "data");
  private readonly backupDir = join(this.dir, "backups");

  /**
   * DbService intentionally exposes only query(). Dump and restore need a
   * pinned connection so BEGIN/COMMIT and every statement use the same client;
   * this reaches the existing pg Pool instead of creating a second one.
   */
  private async withClient<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const pool = (this.db as unknown as { pool: Pool }).pool;
    const client = await pool.connect();
    try {
      await client.query("set standard_conforming_strings = on");
      return await work(client);
    } finally {
      client.release();
    }
  }

  async list(): Promise<BackupMeta[]> {
    await mkdir(this.backupDir, { recursive: true });
    const names = (await readdir(this.backupDir)).filter((name) => name.endsWith(".json"));
    const rows = await Promise.all(
      names.map(async (name) => {
        const path = join(this.backupDir, name);
        const info = await stat(path);
        const id = name.replace(/\.json$/, "");
        let at = info.mtime.toISOString();
        let files = 0;
        try {
          const parsed = JSON.parse(await readFile(path, "utf8")) as {
            createdAt?: string;
            files?: number;
          };
          if (parsed.createdAt) at = parsed.createdAt;
          if (typeof parsed.files === "number") files = parsed.files;
        } catch {
          // Older or corrupt backups still show their file metadata.
        }

        let sqlBytes = 0;
        let tables = 0;
        let rows = 0;
        let sequences = 0;
        try {
          const sqlPath = join(this.backupDir, `${id}.sql`);
          sqlBytes = (await stat(sqlPath)).size;
          const header = parseBackupHeader(await readHeader(sqlPath));
          tables = header.tables.length || header.tableCount;
          rows = header.rows;
          sequences = header.sequences;
        } catch {
          // Backups created before SQL dumps remain valid JSON-only backups.
        }
        return {
          id,
          at,
          bytes: info.size,
          files,
          kind: sqlBytes > 0 ? ("json+sql" as const) : ("json" as const),
          sqlBytes,
          tables,
          rows,
          sequences,
        };
      }),
    );
    return rows.sort((a, b) => b.at.localeCompare(a.at));
  }

  async create(): Promise<BackupMeta> {
    await mkdir(this.backupDir, { recursive: true });
    const entries = await readdir(this.dir, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => entry.name);
    const collections: Record<string, unknown> = {};
    for (const name of files) {
      try {
        collections[name] = JSON.parse(await readFile(join(this.dir, name), "utf8"));
      } catch {
        collections[name] = null;
      }
    }
    const now = new Date();
    const id = `backup-${now.toISOString().replace(/[:.]/g, "-")}`;
    const body = JSON.stringify(
      { createdAt: now.toISOString(), files: files.length, collections },
      null,
      2,
    );

    let dump;
    try {
      dump = await this.withClient((client) => generatePostgresDump(client, now.toISOString()));
    } catch (err) {
      throw new BadRequestException(`SQL backup failed: ${errorMessage(err)}`);
    }

    await writeFile(join(this.backupDir, `${id}.sql`), dump.sql, "utf8");
    await writeFile(join(this.backupDir, `${id}.json`), body, "utf8");
    return {
      id,
      at: now.toISOString(),
      bytes: Buffer.byteLength(body),
      files: files.length,
      kind: "json+sql",
      sqlBytes: dump.bytes,
      tables: dump.tables.length,
      rows: dump.rows,
      sequences: dump.sequences,
    };
  }

  async restore(id?: string, payload?: unknown): Promise<RestoreResult> {
    let raw: string;
    if (id) {
      const safe = validateBackupId(id);
      const path = join(this.backupDir, `${safe}.json`);
      try {
        raw = await readFile(path, "utf8");
      } catch {
        throw new NotFoundException(`Backup ${safe} was not found`);
      }
    } else if (payload !== undefined && payload !== null) {
      raw = JSON.stringify(payload);
    } else {
      throw new BadRequestException("Provide a backup id or a backup JSON payload");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new BadRequestException("Backup file is not valid JSON");
    }
    const source =
      parsed && typeof parsed === "object" && "collections" in parsed
        ? (parsed as { collections?: unknown }).collections
        : parsed;
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      throw new BadRequestException("Backup must contain a collections object");
    }

    const restored: string[] = [];
    const skipped: string[] = [];
    for (const [name, value] of Object.entries(source)) {
      if (!safeFileName(name)) {
        skipped.push(name);
        continue;
      }
      await writeFile(join(this.dir, name), JSON.stringify(value, null, 2), "utf8");
      restored.push(name);
    }
    return { restored, skipped, at: new Date().toISOString() };
  }

  async sqlDownload(id: string): Promise<SqlDownload> {
    const safe = validateBackupId(id);
    const path = join(this.backupDir, `${safe}.sql`);
    try {
      return { path, filename: `${safe}.sql`, size: (await stat(path)).size };
    } catch {
      throw new NotFoundException(`SQL backup ${safe} was not found`);
    }
  }

  async restoreSqlSaved(id: string): Promise<SqlRestoreResult> {
    const safe = validateBackupId(id);
    const path = join(this.backupDir, `${safe}.sql`);
    let info;
    try {
      info = await stat(path);
    } catch {
      throw new NotFoundException(`SQL backup ${safe} was not found`);
    }
    if (info.size > MAX_SQL_BYTES) {
      throw new BadRequestException("SQL backup exceeds the 100 MB restore limit");
    }
    let sql: string;
    try {
      sql = await readFile(path, "utf8");
    } catch {
      throw new NotFoundException(`SQL backup ${safe} was not found`);
    }
    return this.restoreSqlText(sql, safe);
  }

  async restoreSqlUpload(fileName: string, buffer: Buffer): Promise<SqlRestoreResult> {
    if (typeof fileName !== "string" || !fileName.toLowerCase().endsWith(".sql")) {
      throw new BadRequestException("SQL backup file must have a .sql extension");
    }
    if (buffer.length > MAX_SQL_BYTES) {
      throw new BadRequestException("SQL backup exceeds the 100 MB restore limit");
    }
    return this.restoreSqlText(buffer.toString("utf8").replace(/^\uFEFF/, ""), fileName);
  }

  private async restoreSqlText(sql: string, source: string): Promise<SqlRestoreResult> {
    let parsed;
    try {
      parsed = parseSqlBackup(sql);
    } catch (err) {
      throw new BadRequestException(`SQL restore failed: ${errorMessage(err)}`);
    }

    try {
      return await this.withClient(async (client) => {
        const missing = await findMissingTables(client, parsed.tables);
        if (missing.length) {
          throw new Error(
            `Cannot restore: table(s) missing from schema public: ${missing.join(", ")}`,
          );
        }
        const external = await findExternalFks(client, parsed.tables);
        if (external.length) {
          const details = external
            .map((fk) => `${fk.fromSchema}.${fk.fromTable} (${fk.constraint}) -> public.${fk.toTable}`)
            .join("; ");
          throw new Error(
            `Cannot restore: ${details}. These foreign keys were not dumped, so TRUNCATE would affect rows outside the backup.`,
          );
        }

        const started = Date.now();
        let committed = false;
        try {
          await client.query("begin");
          const targets = parsed.tables
            .map((name) => `public.${quoteIdent(name)}`)
            .join(", ");
          // One multi-table TRUNCATE (no CASCADE) is the permission-safe,
          // FK-safe strategy: all referencing public tables from the dump are
          // included in the same statement, and external references were
          // rejected above. RESTART IDENTITY makes the following setval values
          // authoritative.
          await client.query(`truncate table ${targets} restart identity`);

          let sequences = 0;
          for (const statement of parsed.statements) {
            const target = insertTarget(statement);
            try {
              await client.query(statement);
            } catch (err) {
              throw new Error(`${target ? `Restoring ${target} failed` : "Restoring sequences failed"}: ${errorMessage(err)}`);
            }
            if (!target) sequences += 1;
          }
          await client.query("commit");
          committed = true;
          return {
            source,
            at: new Date().toISOString(),
            tables: parsed.tables,
            rows: parsed.insertTables.length,
            sequences,
            durationMs: Date.now() - started,
          };
        } catch (err) {
          if (!committed) {
            try {
              await client.query("rollback");
            } catch {
              // Keep the original failure visible.
            }
          }
          throw err;
        }
      });
    } catch (err) {
      throw new BadRequestException(`Postgres restore failed: ${errorMessage(err)}`);
    }
  }
}
