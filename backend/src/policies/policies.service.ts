import { Injectable, NotFoundException } from "@nestjs/common";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  emptyPolicies,
  isPolicyKind,
  type PoliciesStore,
  type PolicyKind,
  type PolicyRecord,
} from "./policies.types";

function gen(kind: PolicyKind) {
  return `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

@Injectable()
export class PoliciesService {
  private readonly dir = join(process.cwd(), "data");
  private readonly file = join(this.dir, "policies.json");
  private store: PoliciesStore = emptyPolicies();

  async onModuleInit() {
    try {
      const raw = await readFile(this.file, "utf8");
      const parsed = JSON.parse(raw) as Partial<PoliciesStore>;
      this.store = emptyPolicies();
      for (const kind of Object.keys(this.store) as PolicyKind[]) {
        this.store[kind] = Array.isArray(parsed[kind]) ? parsed[kind] ?? [] : [];
      }
    } catch {
      this.store = emptyPolicies();
    }
  }

  private async persist() {
    await mkdir(this.dir, { recursive: true });
    await writeFile(this.file, JSON.stringify(this.store, null, 2), "utf8");
  }

  snapshot(): PoliciesStore {
    return this.store;
  }

  list(kind: PolicyKind): PolicyRecord[] {
    return this.store[kind];
  }

  async save(kind: PolicyKind, input: Partial<PolicyRecord>): Promise<PolicyRecord> {
    const rows = this.store[kind];
    const existing = input.id ? rows.find((row) => row.id === input.id) : undefined;
    const base: PolicyRecord = existing ?? { id: gen(kind) };
    const next: PolicyRecord = { ...base, ...input, id: base.id };
    this.store[kind] = existing
      ? rows.map((row) => (row.id === existing.id ? next : row))
      : [next, ...rows];
    await this.persist();
    return next;
  }

  async remove(kind: PolicyKind, id: string) {
    const before = this.store[kind].length;
    this.store[kind] = this.store[kind].filter((row) => row.id !== id);
    if (this.store[kind].length === before) throw new NotFoundException("Record not found");
    await this.persist();
  }

  async reset(kind: PolicyKind) {
    if (!isPolicyKind(kind)) throw new NotFoundException("Unknown collection");
    this.store[kind] = [];
    await this.persist();
  }
}