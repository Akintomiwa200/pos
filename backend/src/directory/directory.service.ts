import { Injectable, NotFoundException } from "@nestjs/common";
import { Subject } from "rxjs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  isDirectoryName,
  type DirectoryName,
  type DirectoryRecord,
} from "./directory.types";

type Store = Partial<Record<DirectoryName, DirectoryRecord[]>>;

export type DirectoryRowsEvent = {
  type: "rows";
  name: DirectoryName;
  rows: DirectoryRecord[];
  at: string;
};

@Injectable()
export class DirectoryService {
  private store: Store = {};
  private readonly dir = join(process.cwd(), "data", "directories");
  private readonly events = new Subject<DirectoryRowsEvent>();

  private fileFor(name: DirectoryName) {
    return join(this.dir, `${name}.json`);
  }

  private publish(name: DirectoryName) {
    const rows = this.store[name] ?? [];
    this.events.next({ type: "rows", name, rows, at: new Date().toISOString() });
  }

  stream() {
    return this.events.asObservable();
  }

  private async persist(name: DirectoryName) {
    await mkdir(this.dir, { recursive: true });
    await writeFile(this.fileFor(name), JSON.stringify(this.store[name] ?? [], null, 2), "utf8");
  }

  async list(name: DirectoryName): Promise<DirectoryRecord[]> {
    if (!isDirectoryName(name)) throw new NotFoundException("Unknown directory");
    if (!this.store[name]) {
      try {
        const raw = await readFile(this.fileFor(name), "utf8");
        const parsed = JSON.parse(raw) as DirectoryRecord[];
        this.store[name] = Array.isArray(parsed) ? parsed : [];
        await this.persist(name);
      } catch {
        this.store[name] = [];
      }
    }
    return this.store[name]!;
  }

  async save(name: DirectoryName, input: Partial<DirectoryRecord>): Promise<DirectoryRecord> {
    const rows = await this.list(name);
    const existing = input.id ? rows.find((row) => row.id === input.id) : undefined;
    if (!input.name?.trim()) throw new NotFoundException("Name is required");
    const next: DirectoryRecord = {
      id: existing?.id ?? `${name.slice(0, 3)}-${Date.now()}`,
      name: input.name.trim(),
      phone: input.phone ?? existing?.phone,
      email: input.email ?? existing?.email,
      address: input.address ?? existing?.address,
      note: input.note ?? existing?.note,
      active: input.active ?? existing?.active ?? true,
      extra: input.extra ?? existing?.extra,
    };
    this.store[name] = existing
      ? rows.map((row) => (row.id === existing.id ? next : row))
      : [next, ...rows];
    await this.persist(name);
    this.publish(name);
    return next;
  }

  async delete(name: DirectoryName, id: string) {
    const rows = await this.list(name);
    const next = rows.filter((row) => row.id !== id);
    if (next.length === rows.length) throw new NotFoundException("Record not found");
    this.store[name] = next;
    await this.persist(name);
    this.publish(name);
  }
}
