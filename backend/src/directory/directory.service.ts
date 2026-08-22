import { Injectable, NotFoundException } from "@nestjs/common";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  isDirectoryName,
  type DirectoryName,
  type DirectoryRecord,
} from "./directory.types";

type Store = Partial<Record<DirectoryName, DirectoryRecord[]>>;

const SEEDS: Partial<Record<DirectoryName, DirectoryRecord[]>> = {
  customers: [
    { id: "cus-1", name: "Mama Nkechi Stores", phone: "08031234567", address: "12 Balogun Market, Lagos", active: true },
    { id: "cus-2", name: "Tunde Bakare", phone: "08127654321", email: "tunde@example.com", active: true },
    { id: "cus-3", name: "Greenfield Hotels Ltd", phone: "07099887766", email: "accounts@greenfield.example.com", address: "14 Ozumba Mbadiwe, VI", note: "Net 30 terms", active: true },
  ],
  vendors: [
    { id: "ven-1", name: "Dangote Distributors", phone: "09011223344", address: "Ikeja Industrial Hub", active: true },
    { id: "ven-2", name: "Nestle Nigeria Plc", phone: "08055443322", email: "orders@nestle.example.com", active: true },
  ],
  "sales-reps": [
    { id: "rep-1", name: "Tosin Adeyemi", phone: "08134567890", active: true },
    { id: "rep-2", name: "Ada Eze", phone: "08187654321", active: true },
  ],
  staff: [
    { id: "stf-1", name: "Chika Okonkwo", phone: "08022233344", note: "Shift supervisor", active: true },
    { id: "stf-2", name: "Musa Ibrahim", phone: "08033344455", active: true },
  ],
  manufacturers: [
    { id: "mfr-1", name: "Unilever Nigeria", active: true },
    { id: "mfr-2", name: "Cadbury Nigeria", active: true },
    { id: "mfr-3", name: "Honeywell Flour Mills", active: true },
  ],
  "payment-methods": [
    { id: "pm-cash", name: "Cash", note: "Till tender", active: true },
    { id: "pm-card", name: "Card (POS)", active: true },
    { id: "pm-transfer", name: "Bank Transfer", active: true },
    { id: "pm-ussd", name: "USSD", active: true },
  ],
  promotions: [
    { id: "promo-1", name: "Weekend -5% groceries", note: "Sat & Sun only", active: false },
  ],
  "expense-accounts": [
    { id: "exp-1", name: "Diesel & Power", active: true },
    { id: "exp-2", name: "Rent", active: true },
    { id: "exp-3", name: "Staff Welfare", active: true },
    { id: "exp-4", name: "Logistics", active: true },
  ],
  units: [
    { id: "unit-1", name: "Piece", note: "pcs", active: true },
    { id: "unit-2", name: "Carton", note: "ctn · 12 pcs", active: true },
    { id: "unit-3", name: "Kilogram", note: "kg", active: true },
    { id: "unit-4", name: "Litre", note: "L", active: true },
    { id: "unit-5", name: "Bag", note: "bag", active: true },
  ],
};

@Injectable()
export class DirectoryService {
  private store: Store = {};
  private readonly dir = join(process.cwd(), "data", "directories");

  private fileFor(name: DirectoryName) {
    return join(this.dir, `${name}.json`);
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
      } catch {
        this.store[name] = [...(SEEDS[name] ?? [])];
        await this.persist(name);
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
    return next;
  }

  async delete(name: DirectoryName, id: string) {
    const rows = await this.list(name);
    const next = rows.filter((row) => row.id !== id);
    if (next.length === rows.length) throw new NotFoundException("Record not found");
    this.store[name] = next;
    await this.persist(name);
  }
}
