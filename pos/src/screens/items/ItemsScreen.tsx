import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ChevronRight, Filter, Plus, ScanBarcode, Search } from "lucide-react";
import type { CatalogItem } from "../../lib/types";
import { formatMoney } from "../../lib/types";
import { CATEGORIES } from "../../lib/demo";
import { useStoreSettings } from "../../lib/use-store-settings";

type Props = {
  mode: "home" | "items";
  items: CatalogItem[];
  category: string;
  onCategory: (value: string) => void;
  onAdd: (item: CatalogItem) => void;
  query: string;
  onQuery: (value: string) => void;
  onCommitQuery: (value: string) => void;
  barcode: string;
  onBarcode: (value: string) => void;
  onCommitBarcode: (value: string) => void;
  notice?: string;
};

export function ItemsScreen({
  mode,
  items,
  category,
  onCategory,
  onAdd,
  query,
  onQuery,
  onCommitQuery,
  barcode,
  onBarcode,
  onCommitBarcode,
  notice,
}: Props) {
  const settings = useStoreSettings();
  const searchRef = useRef<HTMLInputElement>(null);
  const scanRef = useRef<HTMLInputElement>(null);
  const [scanOpen, setScanOpen] = useState(false);

  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      if (!settings.showOutOfStock && item.onHand <= 0) return false;
      if (!settings.allowUncategorized && !item.category.trim()) return false;
      if (settings.hiddenCategories.includes(item.category)) return false;
      return true;
    });
  }, [items, settings, mode]);

  const chips = useMemo(() => {
    const names = Array.from(
      new Set([...CATEGORIES, ...items.map((item) => item.category).filter(Boolean)]),
    ).filter((name) => !settings.hiddenCategories.includes(name));
    const counted = names.filter((name) => {
      if (!settings.hideEmptyCategories) return true;
      return items.some(
        (item) =>
          item.category === name &&
          (settings.showOutOfStock || item.onHand > 0),
      );
    });
    return settings.sortCategoriesAz
      ? [...counted].sort((a, b) => a.localeCompare(b))
      : counted;
  }, [items, settings]);

  useEffect(() => {
    setScanOpen(false);
  }, [mode]);

  useEffect(() => {
    if (mode === "items" && scanOpen) scanRef.current?.focus();
  }, [mode, scanOpen]);

  useEffect(() => {
    if (mode !== "items" || chips.length === 0) return;
    if (!chips.includes(category)) onCategory(chips[0]!);
  }, [mode, chips, category, onCategory]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    onCommitQuery(query);
  }

  function submitScan(event: FormEvent) {
    event.preventDefault();
    onCommitBarcode(barcode);
  }

  return (
    <section className="catalog">
      <div className="header">
        <nav className="crumb" aria-label="Breadcrumb">
          <span>{mode === "home" ? "Home" : "Items"}</span>
          <ChevronRight size={16} strokeWidth={2.2} />
          <strong>{mode === "home" ? "All items" : category}</strong>
        </nav>
        <form className="search" onSubmit={submitSearch}>
          <Search size={16} />
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Type name, SKU, or barcode"
          />
        </form>
        <button
          className="nav-btn"
          type="button"
          aria-label="Scan barcode"
          onClick={() => {
            if (mode === "home") {
              searchRef.current?.focus();
              return;
            }
            setScanOpen((value) => !value);
          }}
        >
          <ScanBarcode size={18} />
        </button>
        <button className="nav-btn" type="button" aria-label="filter">
          <Filter size={18} />
        </button>
      </div>
      {mode === "items" && scanOpen && (
        <form className="scan-bar" onSubmit={submitScan}>
          <ScanBarcode size={16} />
          <input
            ref={scanRef}
            value={barcode}
            onChange={(event) => onBarcode(event.target.value)}
            placeholder="Scan or type barcode / SKU, then Enter"
            autoComplete="off"
          />
        </form>
      )}
      {notice ? <p className="catalog-notice">{notice}</p> : null}
      {mode === "items" && (
        <div className="chips" role="tablist" aria-label="Categories">
          {chips.map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={category === name}
              className={`chip ${category === name ? "active" : ""}`}
              onClick={() => onCategory(name)}
            >
              {name}
            </button>
          ))}
        </div>
      )}
      {visibleItems.length === 0 ? (
        <div className="catalog-empty">
          <div className="catalog-empty-icon" aria-hidden="true">
            <Search size={26} strokeWidth={1.8} />
          </div>
          <h2>
            {query.trim()
              ? "No product matches"
              : mode === "items"
                ? `No items in ${category}`
                : "Catalogue is empty"}
          </h2>
          <p>
            {query.trim()
              ? `Nothing in the till matches “${query.trim()}”. Try the product name, SKU, or barcode.`
              : mode === "items"
                ? `There are no products in ${category} on this till. Pick another category or search above.`
                : "There are no products on this till yet. Add stock in Settings, or search by name, SKU, or barcode."}
          </p>
          {query.trim() ? (
            <button
              type="button"
              className="catalog-empty-btn"
              onClick={() => {
                onQuery("");
                searchRef.current?.focus();
              }}
            >
              Clear search
            </button>
          ) : null}
        </div>
      ) : (
        <div className="grid">
          {visibleItems.map((item) => (
            <article className="card" key={item.id}>
              <button
                type="button"
                className="card-hit"
                onClick={() => onAdd(item)}
              >
                <img
                  src={item.image}
                  alt=""
                  onError={(event) => {
                    const target = event.currentTarget;
                    target.onerror = null;
                    target.src = `https://picsum.photos/seed/${encodeURIComponent(item.id)}/600/450`;
                  }}
                />
              </button>
              <div className="card-foot">
                <div className="card-body">
                  <strong className="card-name">{item.name}</strong>
                  <div className="price">{formatMoney(item.priceMinor)}</div>
                </div>
                <button
                  className="add"
                  type="button"
                  onClick={() => onAdd(item)}
                  aria-label={`Add ${item.name}`}
                >
                  <Plus size={16} strokeWidth={2.4} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
