export type SoldLine = {
  itemId?: string | null;
  quantity?: number;
};

export type StockLookupItem = {
  id: string;
  baseId?: string | null;
  packSize?: number;
  onHand?: number;
};

export type ComboComponentRef = { itemId: string; quantity: number };
export type ComboRef = { id: string; components: ComboComponentRef[] };

export type StockLedger = {
  findById(id: string): StockLookupItem | null | undefined;
  update(id: string, patch: { onHand: number }): unknown;
};

export type ComboCatalog = {
  list(): ComboRef[];
};

/**
 * Reduce stock exactly once per logical unit sold.
 *
 * - A pack (item with `baseId`, packSize >= 2) reduces its base (smallest-unit)
 *   product by quantity × packSize, then its own onHand is re-derived from the
 *   base so the shelf never double-counts a pack and its pieces.
 * - A combo reduces every attached component proportionally, recursing through
 *   pack components down to the smallest unit.
 * - Any other item reduces its own onHand.
 *
 * `chain` guards malformed cycles but is cleared per branch so the same item
 * sold through two different lines still deducts once for each line.
 */
export function deductSoldStock(
  lines: SoldLine[],
  catalog: StockLedger,
  combos: ComboCatalog,
): void {
  const chain = new Set<string>();

  const deduct = (itemId: string, quantity: number) => {
    const id = itemId.trim();
    const qty = Math.max(1, Math.round(quantity) || 1);
    if (!id || chain.has(id)) return;
    chain.add(id);

    const item = catalog.findById(id);
    if (item) {
      const packSize = Math.max(1, item.packSize ?? 1);
      if (item.baseId && packSize >= 2) {
        const base = catalog.findById(item.baseId);
        if (base) {
          deduct(base.id, qty * packSize);
          const updated = catalog.findById(base.id);
          if (updated) {
            catalog.update(item.id, {
              onHand: Math.floor(Math.max(0, updated.onHand ?? 0) / packSize),
            });
          }
        }
      } else {
        catalog.update(item.id, {
          onHand: Math.max(0, Math.round(item.onHand ?? 0) - qty),
        });
      }
      chain.delete(id);
      return;
    }

    const combo = combos.list().find((row) => row.id === id);
    if (combo && combo.components.length) {
      for (const component of combo.components) {
        deduct(component.itemId, qty * component.quantity);
      }
    }
    chain.delete(id);
  };

  for (const line of lines) {
    if (line.itemId) deduct(line.itemId, line.quantity ?? 1);
  }
}