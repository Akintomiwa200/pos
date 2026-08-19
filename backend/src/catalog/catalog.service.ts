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
}
