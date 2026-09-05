import { Injectable, OnModuleInit } from "@nestjs/common";
import { Observable, Subject } from "rxjs";
import { CatalogService, type CatalogItem } from "../catalog/catalog.service";
import { slugFromName } from "../catalog/catalog.utils";
import { loadCombosFile, saveCombosFile } from "./combo.store";
import { type Combo, type ComboComponent } from "./combo.types";

export type ComboEvent =
  | { type: "snapshot"; combos: ComboView[] }
  | { type: "updated"; combo: ComboView }
  | { type: "removed"; id: string };

export type ComboView = Omit<Combo, "components"> & {
  components: Array<{
    itemId: string;
    name: string;
    quantity: number;
    unit: string;
    unitLabel?: string;
  }>;
  costMinorEach: number;
  availableSets: number;
  shortfall: Array<{ itemId: string; name: string; missing: number; unit: string; unitLabel?: string }>;
  margin: number;
};

const now = () => new Date().toISOString();

@Injectable()
export class ComboService implements OnModuleInit {
  private combos: Combo[] = [];
  private readonly events = new Subject<ComboEvent>();
  private catalogSubscription?: { unsubscribe: () => void };

  constructor(private readonly catalog: CatalogService) {}

  async onModuleInit() {
    const stored = await loadCombosFile();
    if (stored?.length) {
      this.combos = stored.map((combo) => this.normalize(combo));
      void this.persist();
    }
    this.subscribeToCatalog();
  }

  private subscribeToCatalog() {
    try {
      const sub = this.catalog.stream().subscribe({
        next: () => this.broadcastSnapshot(),
        error: () => undefined,
      });
      this.catalogSubscription = { unsubscribe: () => sub.unsubscribe() };
    } catch {
      // recompute lazily on read if the catalog stream is unavailable
    }
  }

  private normalize(raw: Partial<Combo> & { id?: string; name?: string }): Combo {
    const name = raw.name?.trim() || raw.id || "Combo";
    const id = raw.id?.trim() || slugFromName(name) || "combo";
    const components = (Array.isArray(raw.components) ? raw.components : []).filter(
      (line) => line && line.itemId,
    );
    return {
      id,
      name,
      description: raw.description?.trim() || undefined,
      components,
      priceMinor:
        typeof raw.priceMinor === "number" && Number.isFinite(raw.priceMinor)
          ? Math.max(0, Math.round(raw.priceMinor))
          : 0,
      active: raw.active !== false,
      updatedAt: raw.updatedAt || now(),
    };
  }

  list(): ComboView[] {
    return this.combos.map((combo) => this.toView(combo));
  }

  private itemById(): Map<string, CatalogItem> {
    return new Map(this.catalog.list().map((item) => [item.id, item] as const));
  }

  toView(combo: Combo): ComboView {
    const byId = this.itemById();
    const costMinorEach = combo.components.reduce((sum, line) => {
      const item = byId.get(line.itemId);
      return sum + (item?.costMinor ?? 0) * line.quantity;
    }, 0);

    let availableSets = Number.POSITIVE_INFINITY;
    const shortfall: ComboView["shortfall"] = [];
    for (const line of combo.components) {
      const item = byId.get(line.itemId);
      if (!item) continue;
      const sets = line.quantity > 0 ? Math.floor(item.onHand / line.quantity) : Number.POSITIVE_INFINITY;
      if (sets < availableSets) availableSets = sets;
      if (sets < 1) {
        const have = item.onHand;
        shortfall.push({
          itemId: item.id,
          name: item.name,
          missing: Math.max(0, line.quantity - have),
          unit: item.unit,
          unitLabel: item.unitLabel,
        });
      }
    }
    if (!Number.isFinite(availableSets)) availableSets = 0;
    if (combo.components.length === 0) availableSets = 0;

    const margin =
      combo.priceMinor > 0
        ? Math.round(((combo.priceMinor - costMinorEach) / combo.priceMinor) * 1000) / 10
        : 0;

    return {
      id: combo.id,
      name: combo.name,
      description: combo.description,
      components: combo.components.map((line) => {
        const item = byId.get(line.itemId);
        return {
          itemId: line.itemId,
          name: item?.name ?? line.itemId,
          quantity: line.quantity,
          unit: item?.unit ?? "each",
          unitLabel: item?.unitLabel,
        };
      }),
      costMinorEach,
      availableSets: Math.max(0, Math.floor(availableSets)),
      shortfall,
      priceMinor: combo.priceMinor,
      active: combo.active,
      updatedAt: combo.updatedAt,
      margin,
    };
  }

  create(input: Partial<Combo> & { name?: string }): ComboView {
    const combo = this.normalize(input);
    this.combos = [...this.combos, combo];
    void this.persist();
    const view = this.toView(combo);
    this.events.next({ type: "updated", combo: view });
    return view;
  }

  update(id: string, patch: Partial<Combo>): ComboView | null {
    const index = this.combos.findIndex((combo) => combo.id === id);
    if (index === -1) return null;
    const next = this.normalize({ ...this.combos[index], ...patch, id });
    this.combos = this.combos.map((combo) => (combo.id === id ? next : combo));
    void this.persist();
    const view = this.toView(next);
    this.events.next({ type: "updated", combo: view });
    return view;
  }

  remove(id: string): Combo | null {
    const index = this.combos.findIndex((combo) => combo.id === id);
    if (index === -1) return null;
    const [removed] = this.combos.splice(index, 1);
    void this.persist();
    this.events.next({ type: "removed", id });
    return removed;
  }

  stream(): Observable<ComboEvent> {
    return new Observable<ComboEvent>((subscriber) => {
      subscriber.next({ type: "snapshot", combos: this.list() });
      const subscription = this.events.subscribe((event) => subscriber.next(event));
      return () => subscription.unsubscribe();
    });
  }

  private broadcastSnapshot() {
    this.events.next({ type: "snapshot", combos: this.list() });
  }

  private async persist() {
    try {
      await saveCombosFile(this.combos);
    } catch {
      // keep in memory if the file write fails
    }
  }
}
