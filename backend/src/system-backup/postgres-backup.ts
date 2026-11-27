import type { PoolClient } from "pg";

/**
 * Pure helpers for the real, data-only logical Postgres backup format.
 *
 * The dump contains INSERT statements for rows in schema `public` and,
 * where discoverable, setval() calls for public sequences. It deliberately
 * does not contain DDL, roles, grants, extensions, indexes, constraints,
 * views, functions, triggers, large objects, WAL/PITR metadata, or rows from
 * any other schema.
 */

export const SQL_BACKUP_MARKER = "-- pos-logical-backup: 1";
export const SQL_BACKUP_VERSION = 1;

/**
 * Hard cap for one generated or uploaded SQL backup (100 MB). The cap is
 * enforced while emitting statements, so an oversized dump fails with the
 * table that pushed it over the limit instead of producing a partial file.
 */
export const MAX_SQL_BYTES = 100 * 1024 * 1024;

/**
 * Fail early on a single table with more than one million rows. This keeps
 * batching predictable and gives a named error rather than silently streaming
 * an unbounded table. The 100 MB byte cap still applies independently.
 */
export const MAX_ROWS_PER_TABLE = 1_000_000;

/** Rows are fetched in bounded batches inside one repeatable-read snapshot. */
export const DUMP_BATCH_SIZE = 500;

export type BackupColumn = {
  name: string;
  dataType: string;
  udtSchema: string;
  udtName: string;
  characterMaxLength: number | null;
  isGenerated: boolean;
  identityAlways: boolean;
};

export type SelfFk = { from: string[]; to: string[] };

export type BackupTable = {
  name: string;
  columns: BackupColumn[];
  primaryKey: string[];
  selfFks: SelfFk[];
};

export type DependencyEdge = { table: string; references: string };

export type BackupSequence = {
  schema: string;
  name: string;
  table: string;
  column: string;
};

export type DumpSummary = {
  sql: string;
  tables: string[];
  rows: number;
  sequences: number;
  bytes: number;
};

export type BackupHeader = {
  version: number;
  tables: string[];
  rows: number;
  sequences: number;
  tableCount: number;
};

export type ParsedBackup = BackupHeader & {
  statements: string[];
  insertTables: string[];
};

export type ExternalFk = {
  constraint: string;
  fromSchema: string;
  fromTable: string;
  toTable: string;
};

type ColumnRow = {
  table_name: string;
  column_name: string;
  data_type: string;
  udt_schema: string;
  udt_name: string;
  character_maximum_length: number | null;
  is_generated: string;
  identity_generation: string | null;
  ordinal_position: number;
};

type PkRow = { table_name: string; column_name: string; ordinal_position: number };

type SelfFkRow = {
  table_name: string;
  constraint_name: string;
  from_column: string;
  to_column: string;
  ref_position: number | null;
};

type FkRow = { table_name: string; references_table: string };

type TypeRow = { schema_name: string; type_name: string; typtype: string };

type SequenceRow = {
  sequence_schema: string;
  sequence_name: string;
  table_name: string;
  column_name: string;
};

export function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

export function qualifyPublic(name: string): string {
  return `public.${quoteIdent(name)}`;
}

/** Standard-conforming strings are enabled by the caller; quotes are doubled. */
function quoteLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function unquoteIdent(name: string): string {
  return name.replace(/""/g, '"');
}

function builtinTypeSupported(dataType: string): boolean {
  return [
    "smallint",
    "integer",
    "bigint",
    "decimal",
    "numeric",
    "real",
    "double precision",
    "smallserial",
    "serial",
    "bigserial",
    "character varying",
    "character",
    "text",
    "name",
    "oid",
    "boolean",
    "date",
    "time without time zone",
    "time with time zone",
    "timestamp without time zone",
    "timestamp with time zone",
    "interval",
    "json",
    "jsonb",
    "uuid",
    "bytea",
    "inet",
    "cidr",
    "macaddr",
    "macaddr8",
    "xml",
    "money",
    "bit",
    "bit varying",
    "tsvector",
  ].includes(dataType);
}

function isSupportedColumn(column: BackupColumn, types: Map<string, string>): boolean {
  if (builtinTypeSupported(column.dataType)) return true;
  const typeKey = `${column.udtSchema}.${column.udtName}`;
  const typtype = types.get(typeKey);
  if (column.dataType === "ARRAY") return typtype === "b";
  // Enums, domains and extension base types (e.g. citext, PostGIS geometry)
  // all come back as strings and can be restored with a qualified cast.
  if (column.dataType === "USER-DEFINED") {
    return typtype === "e" || typtype === "d" || typtype === "b";
  }
  return false;
}

function columnCast(column: BackupColumn): string {
  if (column.dataType === "ARRAY" || column.dataType === "USER-DEFINED") {
    return `::${quoteIdent(column.udtSchema)}.${quoteIdent(column.udtName)}`;
  }
  // Fixed-width types default to length 1 when cast without a modifier.
  const length = column.characterMaxLength;
  if ((column.dataType === "character" || column.dataType === "bit") && length) {
    return `::${column.dataType}(${length})`;
  }
  return `::${column.dataType}`;
}

function arrayLiteral(values: unknown[], context: string, utcDates = false): string {
  const item = (value: unknown): string => {
    if (value === null || value === undefined) return "NULL";
    if (Array.isArray(value)) return arrayLiteral(value, context, utcDates);
    if (Buffer.isBuffer(value)) return `"\\\\x${value.toString("hex")}"`;
    if (value instanceof Date) return `"${utcDates ? value.toISOString() : localDateTime(value)}"`;
    if (typeof value === "object") {
      throw new Error(`${context} contains an unsupported array element`);
    }
    return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  };
  return `{${values.map(item).join(",")}}`;
}

function pad(value: number, width = 2) {
  return String(value).padStart(width, "0");
}

function localDate(value: Date): string {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

function localDateTime(value: Date): string {
  return `${localDate(value)} ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}.${pad(value.getMilliseconds(), 3)}`;
}

function sqlLiteral(value: unknown, column: BackupColumn, table: string): string {
  const cast = columnCast(column);
  if (value === null || value === undefined) return "NULL";
  if (Buffer.isBuffer(value)) return `${quoteLiteral(`\\x${value.toString("hex")}`)}${cast}`;
  if (Array.isArray(value)) {
    if (column.dataType !== "ARRAY") {
      throw new Error(
        `Table public.${table} column ${column.name} returned an array for a non-array type`,
      );
    }
    return `${quoteLiteral(
      arrayLiteral(
        value,
        `Table public.${table} column ${column.name}`,
        column.udtName === "_timestamptz",
      ),
    )}${cast}`;
  }
  if (value instanceof Date) {
    // pg parses timestamp/date without time zone into a local Date; emitting
    // UTC here would shift the stored wall-clock value.
    const literal =
      column.dataType === "date"
        ? localDate(value)
        : column.dataType === "timestamp with time zone"
          ? value.toISOString()
          : localDateTime(value);
    return `${quoteLiteral(literal)}${cast}`;
  }
  if (typeof value === "boolean") return `${value ? "true" : "false"}${cast}`;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(
        `Table public.${table} column ${column.name} has a non-finite numeric value`,
      );
    }
    return `${value}${cast}`;
  }
  if (typeof value === "string") return `${quoteLiteral(value)}${cast}`;
  if (typeof value === "object") {
    if (column.dataType === "json" || column.dataType === "jsonb") {
      let json: string;
      try {
        json = JSON.stringify(value);
      } catch (err) {
        throw new Error(
          `Table public.${table} column ${column.name} cannot be dumped as JSON: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      return `${quoteLiteral(json)}${cast}`;
    }
    throw new Error(
      `Table public.${table} column ${column.name} has an unsupported object value (${column.dataType})`,
    );
  }
  throw new Error(
    `Table public.${table} column ${column.name} has an unsupported value type (${typeof value})`,
  );
}

function normalizeKey(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return value.toString("hex");
  if (typeof value === "object" && value !== null) return JSON.stringify(value);
  return value;
}

function keyOf(row: Record<string, unknown>, columns: string[]): string | null {
  const parts = columns.map((name) => {
    const value = normalizeKey(row[name]);
    return value === null || value === undefined ? null : value;
  });
  if (parts.some((part) => part === null)) return null;
  return JSON.stringify(parts);
}

/** Order self-referencing rows parent-first so non-deferrable FKs stay valid. */
function orderRows(table: BackupTable, rows: Record<string, unknown>[]): Record<string, unknown>[] {
  if (!table.selfFks.length) return rows;

  const keysByFk = table.selfFks.map((fk) => {
    const byKey = new Map<string, number>();
    rows.forEach((row, index) => {
      const key = keyOf(row, fk.to);
      if (key !== null && !byKey.has(key)) byKey.set(key, index);
    });
    return byKey;
  });

  const dependencies = rows.map(() => new Set<number>());
  const dependents = rows.map(() => new Set<number>());
  rows.forEach((row, index) => {
    for (let fkIndex = 0; fkIndex < table.selfFks.length; fkIndex += 1) {
      const fk = table.selfFks[fkIndex]!;
      const parentKey = keyOf(row, fk.from);
      if (parentKey === null) continue;
      const parent = keysByFk[fkIndex]!.get(parentKey);
      if (parent === undefined || parent === index) continue;
      dependencies[index]!.add(parent);
      dependents[parent]!.add(index);
    }
  });

  const indegree = dependencies.map((deps) => deps.size);
  const ready = rows.map((_, index) => index).filter((index) => indegree[index] === 0);
  const ordered: Record<string, unknown>[] = [];
  while (ready.length) {
    const index = ready.shift()!;
    ordered.push(rows[index]!);
    for (const child of [...dependents[index]!].sort((a, b) => a - b)) {
      indegree[child]!--;
      if (indegree[child] === 0) ready.push(child);
    }
  }
  if (ordered.length !== rows.length) {
    throw new Error(
      `Table public.${table.name} cannot be dumped: a self-referencing FK cycle prevents ordered inserts`,
    );
  }
  return ordered;
}

async function loadTypeInfo(client: PoolClient): Promise<Map<string, string>> {
  const result = await client.query<TypeRow>(`
    select n.nspname as schema_name, t.typname as type_name, t.typtype::text as typtype
    from pg_catalog.pg_type t
    join pg_catalog.pg_namespace n on n.oid = t.typnamespace
  `);
  return new Map(result.rows.map((row) => [`${row.schema_name}.${row.type_name}`, row.typtype]));
}

async function loadTables(
  client: PoolClient,
): Promise<{ tables: BackupTable[]; dependencies: DependencyEdge[] }> {
  const tablesResult = await client.query<{ table_name: string }>(`
    select table_name
    from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
    order by table_name
  `);
  const columnsResult = await client.query<ColumnRow>(`
    select table_name, column_name, data_type, udt_schema, udt_name,
           character_maximum_length,
           is_generated::text as is_generated, identity_generation::text as identity_generation,
           ordinal_position
    from information_schema.columns
    where table_schema = 'public'
    order by table_name, ordinal_position
  `);
  const pkResult = await client.query<PkRow>(`
    select tc.table_name, kcu.column_name, kcu.ordinal_position
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on kcu.constraint_catalog = tc.constraint_catalog
     and kcu.constraint_schema = tc.constraint_schema
     and kcu.constraint_name = tc.constraint_name
    where tc.constraint_type = 'PRIMARY KEY' and tc.table_schema = 'public'
    order by tc.table_name, kcu.ordinal_position
  `);
  const selfFkResult = await client.query<SelfFkRow>(`
    select tc.table_name, tc.constraint_name, kcu.column_name as from_column,
           ccu.column_name as to_column, kcu.position_in_unique_constraint as ref_position
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on kcu.constraint_catalog = tc.constraint_catalog
     and kcu.constraint_schema = tc.constraint_schema
     and kcu.constraint_name = tc.constraint_name
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_catalog = tc.constraint_catalog
     and ccu.constraint_schema = tc.constraint_schema
     and ccu.constraint_name = tc.constraint_name
    where tc.constraint_type = 'FOREIGN KEY'
      and tc.table_schema = 'public'
      and ccu.table_schema = 'public'
      and ccu.table_name = tc.table_name
  `);
  const fkResult = await client.query<FkRow>(`
    select distinct kcu.table_name, ccu.table_name as references_table
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on kcu.constraint_catalog = tc.constraint_catalog
     and kcu.constraint_schema = tc.constraint_schema
     and kcu.constraint_name = tc.constraint_name
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_catalog = tc.constraint_catalog
     and ccu.constraint_schema = tc.constraint_schema
     and ccu.constraint_name = tc.constraint_name
    where tc.constraint_type = 'FOREIGN KEY'
      and tc.table_schema = 'public'
      and ccu.table_schema = 'public'
      and ccu.table_name <> kcu.table_name
  `);

  const types = await loadTypeInfo(client);
  const tables = new Map<string, BackupTable>();
  for (const row of tablesResult.rows) {
    tables.set(row.table_name, {
      name: row.table_name,
      columns: [],
      primaryKey: [],
      selfFks: [],
    });
  }
  for (const row of columnsResult.rows) {
    const table = tables.get(row.table_name);
    if (!table) continue;
    table.columns.push({
      name: row.column_name,
      dataType: row.data_type,
      udtSchema: row.udt_schema,
      udtName: row.udt_name,
      characterMaxLength: row.character_maximum_length,
      isGenerated: row.is_generated === "ALWAYS",
      identityAlways: row.identity_generation === "ALWAYS",
    });
  }
  for (const row of pkResult.rows) {
    tables.get(row.table_name)?.primaryKey.push(row.column_name);
  }

  const selfFkGroups = new Map<string, Map<string, SelfFk>>();
  for (const row of selfFkResult.rows) {
    let byConstraint = selfFkGroups.get(row.table_name);
    if (!byConstraint) {
      byConstraint = new Map();
      selfFkGroups.set(row.table_name, byConstraint);
    }
    let fk = byConstraint.get(row.constraint_name);
    if (!fk) {
      fk = { from: [], to: [] };
      byConstraint.set(row.constraint_name, fk);
    }
    const position = row.ref_position ?? 0;
    fk.from[position] = row.from_column;
    fk.to[position] = row.to_column;
  }
  for (const [tableName, byConstraint] of selfFkGroups) {
    const table = tables.get(tableName);
    if (table) table.selfFks = [...byConstraint.values()];
  }

  for (const table of tables.values()) {
    if (!table.selfFks.length) continue;
    for (const fk of table.selfFks) {
      if (fk.from.some((name) => !name) || fk.to.some((name) => !name)) {
        throw new Error(
          `Table public.${table.name} cannot be dumped: a self-referencing FK could not be mapped`,
        );
      }
    }
    for (const column of table.columns) {
      if (!isSupportedColumn(column, types)) {
        throw new Error(
          `Table public.${table.name} cannot be dumped: unsupported column ${column.name} (${column.dataType})`,
        );
      }
    }
  }
  // Validate every non-generated column, even on tables without self FKs.
  for (const table of tables.values()) {
    for (const column of table.columns) {
      if (column.isGenerated) continue;
      if (!isSupportedColumn(column, types)) {
        throw new Error(
          `Table public.${table.name} cannot be dumped: unsupported column ${column.name} (${column.dataType})`,
        );
      }
    }
  }

  return {
    tables: [...tables.values()],
    dependencies: fkResult.rows.map((row) => ({
      table: row.table_name,
      references: row.references_table,
    })),
  };
}

function orderTables(tables: BackupTable[], edges: DependencyEdge[]): string[] {
  const names = tables.map((table) => table.name);
  const remaining = new Map<string, number>();
  const dependents = new Map<string, string[]>();
  for (const name of names) {
    remaining.set(name, 0);
    dependents.set(name, []);
  }
  const seen = new Set<string>();
  for (const edge of edges) {
    const key = `${edge.references}->${edge.table}`;
    if (seen.has(key) || edge.references === edge.table) continue;
    seen.add(key);
    if (!remaining.has(edge.references) || !remaining.has(edge.table)) continue;
    remaining.set(edge.table, (remaining.get(edge.table) ?? 0) + 1);
    dependents.get(edge.references)!.push(edge.table);
  }
  const ready = names.filter((name) => remaining.get(name) === 0).sort();
  const order: string[] = [];
  while (ready.length) {
    const name = ready.shift()!;
    order.push(name);
    for (const child of dependents.get(name) ?? []) {
      remaining.set(child, (remaining.get(child) ?? 0) - 1);
      if (remaining.get(child) === 0) ready.push(child);
    }
    ready.sort();
  }
  if (order.length !== names.length) {
    const cyclic = names.filter((name) => !order.includes(name));
    throw new Error(
      `Postgres backup cannot be ordered across FK cycles involving: ${cyclic.join(", ")}`,
    );
  }
  return order;
}

async function loadSequences(client: PoolClient): Promise<BackupSequence[]> {
  const result = await client.query<SequenceRow>(`
    select seq_ns.nspname as sequence_schema, seq.relname as sequence_name,
           tbl.relname as table_name, att.attname as column_name
    from pg_catalog.pg_class seq
    join pg_catalog.pg_namespace seq_ns on seq_ns.oid = seq.relnamespace
    join pg_catalog.pg_depend dep
      on dep.objid = seq.oid and dep.classid = 'pg_catalog.pg_class'::regclass
    join pg_catalog.pg_class tbl on tbl.oid = dep.refobjid
    join pg_catalog.pg_namespace tbl_ns on tbl_ns.oid = tbl.relnamespace
    join pg_catalog.pg_attribute att
      on att.attrelid = tbl.oid and att.attnum = dep.refobjsubid
    where seq.relkind = 'S'
      and dep.deptype = 'a'
      and dep.refobjsubid <> 0
      and seq_ns.nspname = 'public'
      and tbl_ns.nspname = 'public'
    order by seq_ns.nspname, seq.relname
  `);
  return result.rows.map((row) => ({
    schema: row.sequence_schema,
    name: row.sequence_name,
    table: row.table_name,
    column: row.column_name,
  }));
}

export async function generatePostgresDump(
  client: PoolClient,
  createdAt: string,
): Promise<DumpSummary> {
  // One repeatable-read snapshot keeps every batched SELECT consistent.
  await client.query("begin transaction isolation level repeatable read read only");
  try {
  const { tables, dependencies } = await loadTables(client);
  const orderedNames = orderTables(tables, dependencies);
  const byName = new Map(tables.map((table) => [table.name, table]));
  const lines: string[] = [];
  let bytes = 0;
  let context = "backup header";

  const append = (line: string) => {
    bytes += Buffer.byteLength(`${line}\n`, "utf8");
    if (bytes > MAX_SQL_BYTES) {
      throw new Error(
        `Postgres dump exceeded the ${Math.round(MAX_SQL_BYTES / (1024 * 1024))} MB cap while ${context}`,
      );
    }
    lines.push(line);
  };

  append(SQL_BACKUP_MARKER);
  append(`-- created-at: ${createdAt}`);
  append("-- schema: public");
  append(`-- table-count: ${orderedNames.length}`);
  for (const name of orderedNames) {
    append(`-- table: public.${name}`);
    append(`-- table-json: ${JSON.stringify({ schema: "public", name })}`);
  }
  for (const edge of dependencies) {
    append(`-- dependency: public.${edge.table} -> public.${edge.references}`);
  }

  let totalRows = 0;
  for (const name of orderedNames) {
    const table = byName.get(name)!;
    context = `dumping table public.${name}`;
    const dumpedColumns = table.columns.filter((column) => !column.isGenerated);
    let countResult;
    try {
      countResult = await client.query<{ n: string }>(
        `select count(*)::text as n from ${qualifyPublic(name)}`,
      );
    } catch (err) {
      throw new Error(
        `Table public.${name} cannot be dumped: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    const rowCount = Number(countResult.rows[0]?.n ?? 0);
    if (!Number.isFinite(rowCount) || rowCount > MAX_ROWS_PER_TABLE) {
      throw new Error(
        `Table public.${name} cannot be dumped: row count (${countResult.rows[0]?.n ?? "unknown"}) exceeds the ${MAX_ROWS_PER_TABLE.toLocaleString()} row cap`,
      );
    }
    if (rowCount > 0 && dumpedColumns.length === 0) {
      throw new Error(
        `Table public.${name} cannot be dumped: it has rows but no insertable columns`,
      );
    }
    append(`-- table-rows: ${JSON.stringify({ name, rows: rowCount })}`);

    const rows: Record<string, unknown>[] = [];
    const orderBy = table.primaryKey.length
      ? table.primaryKey.map(quoteIdent).join(", ")
      : dumpedColumns.length
        ? dumpedColumns.map((column) => quoteIdent(column.name)).join(", ")
        : "1";
    const columnList = dumpedColumns.map((column) => quoteIdent(column.name)).join(", ");
    // Select every value as its canonical PostgreSQL text representation and
    // cast it back on restore. This preserves timestamp precision, numeric
    // scale, bytea/array escaping and enum labels without JS type coercion.
    const selectList = dumpedColumns
      .map((column) => `${quoteIdent(column.name)}::text as ${quoteIdent(column.name)}`)
      .join(", ");
    // OFFSET batching is used deliberately: it keeps the query simple while
    // the repeatable-read snapshot guarantees a consistent view of the table.
    for (let offset = 0; offset < rowCount; offset += DUMP_BATCH_SIZE) {
      let result;
      try {
        result = await client.query<Record<string, unknown>>(
          `select ${selectList} from ${qualifyPublic(name)} order by ${orderBy} limit $1 offset $2`,
          [DUMP_BATCH_SIZE, offset],
        );
      } catch (err) {
        throw new Error(
          `Table public.${name} cannot be dumped: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      rows.push(...result.rows);
    }
    if (rows.length !== rowCount) {
      throw new Error(
        `Table public.${name} cannot be dumped: expected ${rowCount} rows but read ${rows.length}`,
      );
    }

    const override = dumpedColumns.some((column) => column.identityAlways)
      ? " overriding system value"
      : "";
    for (const row of orderRows(table, rows)) {
      const values = dumpedColumns
        .map((column) => sqlLiteral(row[column.name], column, name))
        .join(", ");
      append(
        `insert into ${qualifyPublic(name)} (${columnList})${override} values (${values});`,
      );
    }
    totalRows += rowCount;
  }

  const sequences = await loadSequences(client);
  let restoredSequences = 0;
  for (const sequence of sequences) {
    context = `dumping sequence public.${sequence.name}`;
    const qualified = `${quoteIdent(sequence.schema)}.${quoteIdent(sequence.name)}`;
    try {
      const result = await client.query<{ last_value: string; is_called: boolean }>(
        `select last_value::text as last_value, is_called from ${qualified}`,
      );
      const last = result.rows[0]?.last_value;
      if (!last || !/^-?\d+$/.test(last)) continue;
      append(
        `select pg_catalog.setval(${quoteLiteral(`${sequence.schema}.${sequence.name}`)}::regclass, ${last}, ${result.rows[0]!.is_called ? "true" : "false"});`,
      );
      restoredSequences += 1;
    } catch {
      append(`-- sequence public.${sequence.name} skipped: not readable`);
    }
  }
  append(`-- row-count: ${totalRows}`);
  append(`-- sequence-count: ${restoredSequences}`);
  append(`-- max-bytes: ${MAX_SQL_BYTES}`);

  return {
    sql: `${lines.join("\n")}\n`,
    tables: orderedNames,
    rows: totalRows,
    sequences: restoredSequences,
    bytes: Buffer.byteLength(`${lines.join("\n")}\n`, "utf8"),
  };
  } finally {
    await client.query("rollback");
  }
}

export function parseBackupHeader(text: string): BackupHeader {
  const tables: string[] = [];
  const seen = new Set<string>();
  let rows = 0;
  let sequences = 0;
  let tableCount = 0;
  let version = 0;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith("--")) continue;
    const body = line.replace(/^--\s*/, "").trim();
    if (body === SQL_BACKUP_MARKER.replace(/^--\s*/, "")) {
      version = SQL_BACKUP_VERSION;
      continue;
    }
    if (body.startsWith("table-json:")) {
      try {
        const parsed = JSON.parse(body.slice("table-json:".length).trim()) as {
          schema?: unknown;
          name?: unknown;
        };
        if (parsed.schema === "public" && typeof parsed.name === "string" && !seen.has(parsed.name)) {
          seen.add(parsed.name);
          tables.push(parsed.name);
        }
      } catch {
        // A truncated header line is ignored; a missing table list is fatal below.
      }
    } else if (body.startsWith("row-count:")) {
      const parsed = Number(body.slice("row-count:".length).trim());
      if (Number.isFinite(parsed)) rows = parsed;
    } else if (body.startsWith("sequence-count:")) {
      const parsed = Number(body.slice("sequence-count:".length).trim());
      if (Number.isFinite(parsed)) sequences = parsed;
    } else if (body.startsWith("table-count:")) {
      const parsed = Number(body.slice("table-count:".length).trim());
      if (Number.isFinite(parsed)) tableCount = parsed;
    }
  }
  return { version, tables, rows, sequences, tableCount };
}

/** Split semicolon-delimited statements without breaking quoted strings. */
export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inQuote = false;
  let inLineComment = false;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index]!;
    const next = sql[index + 1];
    if (inLineComment) {
      if (char === "\n" || char === "\r") {
        inLineComment = false;
        current += char;
      }
      continue;
    }
    if (inQuote) {
      current += char;
      if (char === "'") {
        if (next === "'") {
          current += next;
          index += 1;
        } else {
          inQuote = false;
        }
      }
      continue;
    }
    if (char === "-" && next === "-") {
      inLineComment = true;
      index += 1;
      continue;
    }
    if (char === "'") {
      inQuote = true;
      current += char;
      continue;
    }
    if (char === ";") {
      if (current.trim()) statements.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim()) statements.push(current.trim());
  return statements;
}

export function parseSqlBackup(sql: string): ParsedBackup {
  const header = parseBackupHeader(sql);
  if (header.version !== SQL_BACKUP_VERSION) {
    throw new Error("SQL file is not a PosHQ logical backup (missing version header)");
  }
  if (!header.tables.length) {
    throw new Error("SQL backup header does not list any tables");
  }
  if (Buffer.byteLength(sql, "utf8") > MAX_SQL_BYTES) {
    throw new Error(
      `SQL backup exceeds the ${Math.round(MAX_SQL_BYTES / (1024 * 1024))} MB limit`,
    );
  }

  const allowed = new Set(header.tables);
  const statements = splitSqlStatements(sql);
  if (!statements.length) throw new Error("SQL backup contains no executable statements");

  const insertTables: string[] = [];
  for (const statement of statements) {
    const normalized = statement.trimStart().toLowerCase();
    const insert = /^insert\s+into\s+"public"\."((?:[^"]|"")+)"\s*\(/i.exec(statement.trimStart());
    const setval = /^select\s+pg_catalog\.setval\(/.test(normalized);
    if (insert) {
      const table = unquoteIdent(insert[1]!);
      if (!allowed.has(table)) {
        throw new Error(`SQL backup writes to table public.${table} which is not in its header`);
      }
      insertTables.push(table);
    } else if (!setval) {
      throw new Error(
        `SQL backup contains an unsupported statement: ${statement.slice(0, 80)}`,
      );
    }
  }
  return { ...header, statements, insertTables };
}

export async function findExternalFks(
  client: PoolClient,
  tables: string[],
): Promise<ExternalFk[]> {
  const result = await client.query<{
    constraint_name: string;
    from_schema: string;
    from_table: string;
    to_table: string;
  }>(
    `
      select tc.constraint_name, kcu.table_schema as from_schema,
             kcu.table_name as from_table, ccu.table_name as to_table
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on kcu.constraint_catalog = tc.constraint_catalog
       and kcu.constraint_schema = tc.constraint_schema
       and kcu.constraint_name = tc.constraint_name
      join information_schema.constraint_column_usage ccu
        on ccu.constraint_catalog = tc.constraint_catalog
       and ccu.constraint_schema = tc.constraint_schema
       and ccu.constraint_name = tc.constraint_name
      where tc.constraint_type = 'FOREIGN KEY'
        and ccu.table_schema = 'public'
        and ccu.table_name = any($1::text[])
        and (
          kcu.table_schema <> 'public'
          or kcu.table_name <> all($1::text[])
        )
    `,
    [tables],
  );
  return result.rows.map((row) => ({
    constraint: row.constraint_name,
    fromSchema: row.from_schema,
    fromTable: row.from_table,
    toTable: row.to_table,
  }));
}

export async function findMissingTables(
  client: PoolClient,
  tables: string[],
): Promise<string[]> {
  const result = await client.query<{ table_name: string }>(
    `
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_type = 'BASE TABLE'
        and table_name = any($1::text[])
    `,
    [tables],
  );
  const found = new Set(result.rows.map((row) => row.table_name));
  return tables.filter((name) => !found.has(name));
}
