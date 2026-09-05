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
    {
      id: "rep-1",
      name: "Tosin Adeyemi",
      phone: "08134567890",
      email: "tosin.rep@theplace.ng",
      extra: { territory: "Lagos Island", commissionPct: "2.5", monthlyTarget: "850000" },
      note: "Corporate cake orders across VI and Lekki.",
      active: true,
    },
    {
      id: "rep-2",
      name: "Ada Eze",
      phone: "08187654321",
      email: "ada.rep@theplace.ng",
      extra: { territory: "Lagos Mainland", commissionPct: "3", monthlyTarget: "700000" },
      note: "Hotels, restaurants and event accounts.",
      active: true,
    },
    {
      id: "rep-3",
      name: "Yusuf Danladi",
      phone: "08123459876",
      email: "yusuf.rep@theplace.ng",
      extra: { territory: "Abuja", commissionPct: "2.5", monthlyTarget: "600000" },
      note: "Opens retail and KYC accounts.",
      active: true,
    },
    {
      id: "rep-4",
      name: "Mary Okafor",
      phone: "08156781234",
      email: "mary.rep@theplace.ng",
      extra: { territory: "Lagos Island", commissionPct: "3", monthlyTarget: "900000" },
      note: "Flagship wedding-cake pipelines.",
      active: true,
    },
  ],
  staff: [
    {
      id: "stf-1",
      name: "Chika Okonkwo",
      phone: "08022233344",
      email: "chika@theplace.ng",
      extra: { role: "Store Manager", department: "Office", staffCode: "ST-001", joined: "2021-06-14" },
      note: "Oversees stock, tills and the morning briefing.",
      active: true,
    },
    {
      id: "stf-2",
      name: "Musa Ibrahim",
      phone: "08033344455",
      email: "musa@theplace.ng",
      extra: { role: "Baker", department: "Bakery", staffCode: "ST-002", joined: "2022-02-01" },
      note: "Night baker, dough and oven rotation.",
      active: true,
    },
    {
      id: "stf-3",
      name: "Funke Oyelaran",
      phone: "08044455566",
      email: "funke@theplace.ng",
      extra: { role: "Barista", department: "Counter", staffCode: "ST-003", joined: "2022-09-19" },
      note: "Coffee bar and cake slicing at the counter.",
      active: true,
    },
    {
      id: "stf-4",
      name: "Dala Ibrahim",
      phone: "08066677788",
      email: "dala@theplace.ng",
      extra: { role: "Cashier", department: "Counter", staffCode: "ST-004", joined: "2023-01-10" },
      note: "Till 2, weekday mornings.",
      active: true,
    },
    {
      id: "stf-5",
      name: "Ngozi Umeh",
      phone: "08077788899",
      email: "ngozi@theplace.ng",
      extra: { role: "Stock Controller", department: "Store", staffCode: "ST-005", joined: "2023-04-22" },
      note: "BOM checks and supplier deliveries.",
      active: true,
    },
    {
      id: "stf-6",
      name: "Samuel Ayodele",
      phone: "08088899900",
      email: "sam@theplace.ng",
      extra: { role: "Rider", department: "Dispatch", staffCode: "ST-006", joined: "2024-03-05" },
      note: "Same-day delivery within VI.",
      active: true,
    },
    {
      id: "stf-7",
      name: "Aisha Bello",
      phone: "08099900011",
      email: "aisha@theplace.ng",
      extra: { role: "Supervisor", department: "Kitchen", staffCode: "ST-007", joined: "2020-11-30" },
      note: "Kitchen shift planner and closing checks.",
      active: true,
    },
    {
      id: "stf-8",
      name: "Kelechi Nwosu",
      phone: "08011122233",
      email: "kelechi@theplace.ng",
      extra: { role: "Rider", department: "Dispatch", staffCode: "ST-008", joined: "2024-08-18" },
      note: "Second rider — on leave this month.",
      active: false,
    },
  ],
  manufacturers: [
    { id: "mfr-1", name: "Unilever Nigeria", active: true },
    { id: "mfr-2", name: "Cadbury Nigeria", active: true },
    { id: "mfr-3", name: "Honeywell Flour Mills", active: true },
  ],
  "payment-methods": [
    {
      id: "pm-cash",
      name: "Cash",
      extra: { kind: "cash" },
      note: "Till tender; count the float at open and close.",
      active: true,
    },
    {
      id: "pm-card",
      name: "Card (POS)",
      extra: { kind: "card" },
      note: "Insert or tap at the terminal; same-day settlement.",
      active: true,
    },
    {
      id: "pm-transfer",
      name: "Bank Transfer",
      extra: { kind: "transfer" },
      note: "Instant and regular transfers to the store account.",
      active: true,
    },
    {
      id: "pm-ussd",
      name: "USSD",
      extra: { kind: "ussd" },
      note: "Pay via *737#; the shortcode is shown at the till.",
      active: true,
    },
    {
      id: "pm-momo",
      name: "Mobile Money",
      extra: { kind: "mobile" },
      note: "MoMo / wallet tender; confirm before packing.",
      active: true,
    },
    {
      id: "pm-cheque",
      name: "Cheque",
      extra: { kind: "cheque" },
      note: "Corporate accounts only; needs manager approval.",
      active: false,
    },
  ],
  promotions: [
    {
      id: "promo-1",
      name: "Weekend 5% off groceries",
      extra: {
        type: "percent",
        value: "5",
        appliesTo: "all",
        validFrom: "2026-09-05",
        validTo: "2026-12-31",
        minOrder: "0",
        maxDiscount: "10000",
      },
      note: "Saturday and Sunday only, auto-applied at the till.",
      active: true,
    },
    {
      id: "promo-2",
      name: "Cake Week 10% off whole cakes",
      extra: {
        type: "percent",
        value: "10",
        appliesTo: "select-items",
        validFrom: "2026-09-07",
        validTo: "2026-09-13",
        minOrder: "0",
      },
      note: "Applies to whole cakes and tarts.",
      active: true,
    },
    {
      id: "promo-3",
      name: "Happy Hour 20% pastry",
      extra: {
        type: "percent",
        value: "20",
        appliesTo: "select-items",
        validFrom: "2026-09-05",
        validTo: "2026-12-31",
        minOrder: "0",
        maxDiscount: "2500",
      },
      note: "16:00–18:00 daily on pastry shelves.",
      active: true,
    },
    {
      id: "promo-4",
      name: "₦1,000 off orders above ₦15,000",
      extra: {
        type: "fixed",
        value: "1000",
        appliesTo: "all",
        validFrom: "2026-10-01",
        validTo: "2026-10-31",
        minOrder: "15000",
      },
      note: "Walk-in and phone orders only.",
      active: true,
    },
    {
      id: "promo-5",
      name: "Team 15% staff discount",
      extra: {
        type: "percent",
        value: "15",
        appliesTo: "all",
        validFrom: "2026-01-01",
        validTo: "2026-12-31",
        minOrder: "0",
      },
      note: "Staff ID required at the till.",
      active: true,
    },
  ],
  "expense-accounts": [
    { id: "exp-1", name: "Diesel & Power", active: true },
    { id: "exp-2", name: "Rent", active: true },
    { id: "exp-3", name: "Staff Welfare", active: true },
    { id: "exp-4", name: "Logistics", active: true },
  ],
  "item-groups": [
    { id: "cat-cakes", name: "Cakes", note: "Baked cakes and tarts", active: true },
    { id: "cat-pastry", name: "Pastry", note: "Pastries and viennoiserie", active: true },
    { id: "cat-ice-cream", name: "Ice Cream", active: true },
    { id: "cat-pancakes", name: "Pancakes", active: true },
    { id: "cat-vegan", name: "Vegan", active: true },
    { id: "cat-general", name: "General", active: true },
  ],
  "item-subgroups": [
    { id: "sub-tarts", name: "Tarts", extra: { categoryId: "cat-cakes", categoryName: "Cakes" }, active: true },
    { id: "sub-whole-cakes", name: "Whole cakes", extra: { categoryId: "cat-cakes", categoryName: "Cakes" }, active: true },
    { id: "sub-croissants", name: "Croissants", extra: { categoryId: "cat-pastry", categoryName: "Pastry" }, active: true },
    { id: "sub-rolls", name: "Rolls", extra: { categoryId: "cat-pastry", categoryName: "Pastry" }, active: true },
    { id: "sub-scoops", name: "Scoops", extra: { categoryId: "cat-ice-cream", categoryName: "Ice Cream" }, active: true },
    { id: "sub-stacks", name: "Stacks", extra: { categoryId: "cat-pancakes", categoryName: "Pancakes" }, active: true },
    { id: "sub-brownies", name: "Brownies", extra: { categoryId: "cat-vegan", categoryName: "Vegan" }, active: true },
  ],
  units: [
    { id: "unit-each", name: "Each", note: "each", extra: { kind: "count" }, active: true },
    { id: "unit-pcs", name: "Piece", note: "pcs", extra: { kind: "count" }, active: true },
    { id: "unit-carton", name: "Carton", note: "ctn", extra: { kind: "composite" }, active: true },
    { id: "unit-kg", name: "Kilogram", note: "kg", extra: { kind: "weight" }, active: true },
    { id: "unit-g", name: "Gram", note: "g", extra: { kind: "weight" }, active: true },
    { id: "unit-l", name: "Litre", note: "L", extra: { kind: "volume" }, active: true },
    { id: "unit-ml", name: "Millilitre", note: "ml", extra: { kind: "volume" }, active: true },
    { id: "unit-pack", name: "Pack", note: "pack", extra: { kind: "composite" }, active: true },
    { id: "unit-packet", name: "Packet", note: "pkt", extra: { kind: "composite" }, active: true },
    { id: "unit-dozen", name: "Dozen", note: "dozen", extra: { kind: "composite" }, active: true },
    { id: "unit-bag", name: "Bag", note: "bag", extra: { kind: "composite" }, active: true },
    { id: "unit-case", name: "Case", note: "case", extra: { kind: "composite" }, active: true },
    { id: "unit-sachet", name: "Sachet", note: "sachet", extra: { kind: "composite" }, active: true },
  ],
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
