import { Injectable } from "@nestjs/common";
import { Observable, Subject } from "rxjs";
import { CATALOG_SEED, type CatalogItem } from "./catalog.seed";

export type { CatalogItem };
export type CatalogEvent =
  | { type: "snapshot"; items: CatalogItem[] }
  | { type: "updated"; item: CatalogItem };

const now = () => new Date().toISOString();

@Injectable()
export class CatalogService {
  private items: CatalogItem[] = CATALOG_SEED.map((item) => ({ ...item }));
  private readonly events = new Subject<CatalogEvent>();

  list() {
    return this.items;
  }

  lookup(query: string) {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return (
      this.items.find(
        (item) =>
          item.barcode.toLowerCase() === q ||
          item.sku.toLowerCase() === q ||
          item.id.toLowerCase() === q,
      ) ??
      this.items.find((item) => item.name.toLowerCase().includes(q)) ??
      null
    );
  }

  update(id: string, patch: { priceMinor?: number; onHand?: number }) {
    const index = this.items.findIndex((item) => item.id === id);
    if (index === -1) return null;
    const current = this.items[index]!;
    const next: CatalogItem = {
      ...current,
      priceMinor:
        typeof patch.priceMinor === "number" && Number.isFinite(patch.priceMinor)
          ? Math.max(0, Math.round(patch.priceMinor))
          : current.priceMinor,
      onHand:
        typeof patch.onHand === "number" && Number.isFinite(patch.onHand)
          ? Math.max(0, Math.round(patch.onHand))
          : current.onHand,
      updatedAt: now(),
    };
    this.items[index] = next;
    this.events.next({ type: "updated", item: next });
    return next;
  }

  stream(): Observable<CatalogEvent> {
    return new Observable((subscriber) => {
      subscriber.next({ type: "snapshot", items: this.items });
      const sub = this.events.subscribe((event) => subscriber.next(event));
      return () => sub.unsubscribe();
    });
  }

  upsertMany(
    rows: Array<{
      name?: string;
      category?: string;
      sku?: string;
      barcode?: string;
      priceMinor?: number;
      onHand?: number;
    }>,
  ) {
    let created = 0;
    let updated = 0;
    for (const row of rows) {
      const name = row.name?.trim();
      if (!name) continue;
      const sku = row.sku?.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24);
      const barcode = row.barcode?.trim() || sku;
      const existing = this.items.find(
        (item) =>
          item.sku.toLowerCase() === sku.toLowerCase() ||
          item.barcode.toLowerCase() === barcode.toLowerCase(),
      );
      const next: CatalogItem = {
        id: existing?.id ?? sku.toLowerCase(),
        name,
        category: row.category?.trim() || existing?.category || "General",
        sku,
        barcode,
        priceMinor:
          typeof row.priceMinor === "number" && Number.isFinite(row.priceMinor)
            ? Math.max(0, Math.round(row.priceMinor))
            : existing?.priceMinor ?? 0,
        currency: "NGN",
        image: existing?.image ?? "",
        onHand:
          typeof row.onHand === "number" && Number.isFinite(row.onHand)
            ? Math.max(0, Math.round(row.onHand))
            : existing?.onHand ?? 0,
        updatedAt: now(),
        expiresAt: existing?.expiresAt,
      };
      if (existing) {
        this.items = this.items.map((item) => (item.id === existing.id ? next : item));
        updated += 1;
      } else {
        this.items.push(next);
        created += 1;
      }
      this.events.next({ type: "updated", item: next });
    }
    return { created, updated, total: this.items.length };
  }

  resetToSeed() {
    this.items = CATALOG_SEED.map((item) => ({ ...item }));
    this.events.next({ type: "snapshot", items: this.items });
    return { ok: true, total: this.items.length };
  }
}
