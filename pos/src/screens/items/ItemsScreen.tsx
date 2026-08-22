import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ChevronRight, Filter, Plus, Search, X } from "lucide-react";
import type { CatalogItem } from "../../lib/types";
import { formatMoney } from "../../lib/types";
import { formatPricePer, formatStock } from "../../lib/units";
import { CATEGORIES } from "../../lib/demo";
import { findCatalogByCode } from "../../lib/catalog";
import { normalizeBarcode } from "../../lib/store-settings";
import { useStoreSettings } from "../../lib/use-store-settings";

type StockFilter = "all" | "in" | "low" | "out";
type PriceFilter = "all" | "under2" | "mid" | "over5";
type SortFilter = "default" | "name" | "price-asc" | "price-desc" | "stock";

const STOCK_OPTIONS: { id: StockFilter; label: string }[] = [
  { id: "all", label: "All stock" },
  { id: "in", label: "In stock" },
  { id: "low", label: "Low stock" },
  { id: "out", label: "Out of stock" },
];

const PRICE_OPTIONS: { id: PriceFilter; label: string }[] = [
  { id: "all", label: "Any price" },
  { id: "under2", label: "Under ₦2,000" },
  { id: "mid", label: "₦2,000 – ₦5,000" },
  { id: "over5", label: "Over ₦5,000" },
];

const SORT_OPTIONS: { id: SortFilter; label: string }[] = [
  { id: "default", label: "Default" },
  { id: "name", label: "Name A–Z" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
  { id: "stock", label: "Stock on hand" },
];

type Props = {
  mode: "home" | "items";
  items: CatalogItem[];
  catalog: CatalogItem[];
  category: string;
  onCategory: (value: string) => void;
  onAdd: (item: CatalogItem) => void;
  query: string;
  onQuery: (value: string) => void;
  onCommitQuery: (value: string) => void;
  notice?: string;
};

function matchesPrice(item: CatalogItem, price: PriceFilter) {
  if (price === "under2") return item.priceMinor < 200_000;
  if (price === "mid") return item.priceMinor >= 200_000 && item.priceMinor <= 500_000;
  if (price === "over5") return item.priceMinor > 500_000;
  return true;
}

function matchesStock(
  item: CatalogItem,
  stock: StockFilter,
  lowQty: number,
) {
  if (stock === "in") return item.onHand > lowQty;
  if (stock === "low") return item.onHand > 0 && item.onHand <= lowQty;
  if (stock === "out") return item.onHand <= 0;
  return true;
}

export function ItemsScreen({
  mode,
  items,
  catalog,
  category,
  onCategory,
  onAdd,
  query,
  onQuery,
  onCommitQuery,
  notice,
}: Props) {
  const settings = useStoreSettings();
  const searchRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterCategories, setFilterCategories] = useState<string[] | null>(null);
  const [stock, setStock] = useState<StockFilter>("all");
  const [price, setPrice] = useState<PriceFilter>("all");
  const [sort, setSort] = useState<SortFilter>("default");

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

  const activeCategory =
    filterCategories === null
      ? mode === "items"
        ? [category]
        : []
      : filterCategories;

  const visibleItems = useMemo(() => {
    const lowQty = Math.max(0, settings.lowStockQty);
    const rows = items.filter((item) => {
      if (settings.hiddenCategories.includes(item.category)) return false;
      if (!settings.allowUncategorized && !item.category.trim()) return false;
      if (activeCategory.length > 0 && !activeCategory.includes(item.category)) {
        return false;
      }
      if (!matchesStock(item, stock, lowQty)) return false;
      if (!matchesPrice(item, price)) return false;
      if (stock !== "out" && !settings.showOutOfStock && item.onHand <= 0) {
        return false;
      }
      return true;
    });
    const ordered = [...rows];
    if (sort === "name") {
      ordered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "price-asc") {
      ordered.sort((a, b) => a.priceMinor - b.priceMinor);
    } else if (sort === "price-desc") {
      ordered.sort((a, b) => b.priceMinor - a.priceMinor);
    } else if (sort === "stock") {
      ordered.sort((a, b) => b.onHand - a.onHand);
    }
    return ordered;
  }, [items, settings, activeCategory, stock, price, sort]);

  const activeFilters = useMemo(() => {
    const rows: { key: string; label: string; clear: () => void }[] = [];
    if (filterCategories && filterCategories.length > 0) {
      for (const name of filterCategories) {
        rows.push({
          key: `cat-${name}`,
          label: name,
          clear: () =>
            setFilterCategories((current) => {
              const next = (current ?? []).filter((row) => row !== name);
              return next.length === 0 ? [] : next;
            }),
        });
      }
    } else if (filterCategories && filterCategories.length === 0 && mode === "items") {
      rows.push({
        key: "cats-all",
        label: "All categories",
        clear: () => setFilterCategories(null),
      });
    }
    if (stock !== "all") {
      rows.push({
        key: "stock",
        label: STOCK_OPTIONS.find((row) => row.id === stock)?.label ?? stock,
        clear: () => setStock("all"),
      });
    }
    if (price !== "all") {
      rows.push({
        key: "price",
        label: PRICE_OPTIONS.find((row) => row.id === price)?.label ?? price,
        clear: () => setPrice("all"),
      });
    }
    if (sort !== "default") {
      rows.push({
        key: "sort",
        label: SORT_OPTIONS.find((row) => row.id === sort)?.label ?? sort,
        clear: () => setSort("default"),
      });
    }
    return rows;
  }, [filterCategories, stock, price, sort, mode]);

  useEffect(() => {
    if (mode !== "items" || chips.length === 0) return;
    if (filterCategories !== null) return;
    if (!chips.includes(category)) onCategory(chips[0]!);
  }, [mode, chips, category, onCategory, filterCategories]);

  useEffect(() => {
    if (!filterOpen) return;
    function onPointer(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) setFilterOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setFilterOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [filterOpen]);

  function looksLikeCode(value: string) {
    const code = normalizeBarcode(value, settings);
    if (code.length < settings.barcodeMinLength) return false;
    if (/\s/.test(value.trim())) return false;
    return Boolean(findCatalogByCode(catalog, code)) || /^[0-9A-Za-z-]+$/.test(code);
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    if (looksLikeCode(query)) onCommitQuery(query);
  }

  function toggleCategory(name: string) {
    setFilterCategories((current) => {
      const base = current ?? (mode === "items" ? [category] : []);
      const next = base.includes(name)
        ? base.filter((row) => row !== name)
        : [...base, name];
      if (next.length === 1) onCategory(next[0]!);
      return next;
    });
  }

  function resetFilters() {
    setFilterCategories(null);
    setStock("all");
    setPrice("all");
    setSort("default");
  }

  function pickChip(name: string) {
    onCategory(name);
    setFilterCategories(null);
  }

  const filteredOut = items.length > 0 && visibleItems.length === 0;
  const crumbLabel =
    mode === "home"
      ? filterCategories && filterCategories.length === 1
        ? filterCategories[0]
        : filterCategories && filterCategories.length > 1
          ? `${filterCategories.length} categories`
          : "All items"
      : filterCategories && filterCategories.length === 0
        ? "All items"
        : filterCategories && filterCategories.length > 1
          ? `${filterCategories.length} categories`
          : filterCategories?.[0] ?? category;

  return (
    <section className="catalog">
      <div className="header">
        <nav className="crumb" aria-label="Breadcrumb">
          <span>{mode === "home" ? "Home" : "Items"}</span>
          <ChevronRight size={16} strokeWidth={2.2} />
          <strong>{crumbLabel}</strong>
        </nav>
        <form className="search" onSubmit={submitSearch}>
          <Search size={16} />
          <input
            ref={searchRef}
            value={query}
            autoComplete="off"
            onChange={(event) => {
              const value = event.target.value;
              onQuery(value);
              const code = normalizeBarcode(value, settings);
              if (findCatalogByCode(catalog, code)) onCommitQuery(value);
            }}
            onPaste={(event) => {
              const value = event.clipboardData.getData("text");
              if (!looksLikeCode(value)) return;
              event.preventDefault();
              onQuery(value);
              onCommitQuery(value);
            }}
            placeholder="Type name, SKU, or barcode"
          />
        </form>
        <div className="filter-wrap" ref={panelRef}>
          <button
            className={`nav-btn ${filterOpen || activeFilters.length ? "filter-on" : ""}`}
            type="button"
            aria-label="Filter catalogue"
            aria-pressed={filterOpen}
            aria-expanded={filterOpen}
            onClick={() => setFilterOpen((open) => !open)}
          >
            <Filter size={18} />
            {activeFilters.length > 0 ? (
              <span className="filter-count">{activeFilters.length}</span>
            ) : null}
          </button>
          {filterOpen ? (
            <div className="filter-panel" role="dialog" aria-label="Filter catalogue">
              <div className="filter-panel-head">
                <div>
                  <h2>Filter</h2>
                  <p>
                    {visibleItems.length} of {items.length} item
                    {items.length === 1 ? "" : "s"}
                  </p>
                </div>
                <button type="button" className="filter-text-btn" onClick={resetFilters}>
                  Reset
                </button>
              </div>

              <p className="filter-label">Stock</p>
              <div className="filter-chips">
                {STOCK_OPTIONS.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    className={`chip ${stock === row.id ? "active" : ""}`}
                    onClick={() => setStock(row.id)}
                  >
                    {row.label}
                  </button>
                ))}
              </div>

              <p className="filter-label">Price</p>
              <div className="filter-chips">
                {PRICE_OPTIONS.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    className={`chip ${price === row.id ? "active" : ""}`}
                    onClick={() => setPrice(row.id)}
                  >
                    {row.label}
                  </button>
                ))}
              </div>

              <p className="filter-label">Sort</p>
              <div className="filter-chips">
                {SORT_OPTIONS.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    className={`chip ${sort === row.id ? "active" : ""}`}
                    onClick={() => setSort(row.id)}
                  >
                    {row.label}
                  </button>
                ))}
              </div>

              {chips.length > 0 ? (
                <>
                  <p className="filter-label">Category</p>
                  <div className="filter-chips">
                    <button
                      type="button"
                      className={`chip ${activeCategory.length === 0 ? "active" : ""}`}
                      onClick={() => setFilterCategories([])}
                    >
                      All categories
                    </button>
                    {chips.map((name) => (
                      <button
                        key={name}
                        type="button"
                        className={`chip ${activeCategory.includes(name) ? "active" : ""}`}
                        onClick={() => toggleCategory(name)}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}

              <button
                type="button"
                className="continue filter-apply"
                onClick={() => setFilterOpen(false)}
              >
                Show {visibleItems.length} item{visibleItems.length === 1 ? "" : "s"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
      {notice ? <p className="catalog-notice">{notice}</p> : null}
      {activeFilters.length > 0 ? (
        <div className="filter-applied" aria-label="Active filters">
          {activeFilters.map((row) => (
            <button
              key={row.key}
              type="button"
              className="filter-tag"
              onClick={row.clear}
            >
              {row.label}
              <X size={12} strokeWidth={2.4} />
            </button>
          ))}
          <button type="button" className="filter-text-btn" onClick={resetFilters}>
            Clear all
          </button>
        </div>
      ) : null}
      {mode === "items" && (
        <div className="chips" role="tablist" aria-label="Categories">
          {chips.map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={activeCategory.includes(name) && activeCategory.length === 1}
              className={`chip ${activeCategory.includes(name) ? "active" : ""}`}
              onClick={() => pickChip(name)}
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
              : filteredOut
                ? "No items match these filters"
                : mode === "items"
                  ? `No items in ${category}`
                  : "Catalogue is empty"}
          </h2>
          <p>
            {query.trim()
              ? `Nothing in the till matches “${query.trim()}”. Try the product name, SKU, or barcode.`
              : filteredOut
                ? "Change stock, price, or category, or clear the filters to see the catalogue again."
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
          ) : filteredOut ? (
            <button type="button" className="catalog-empty-btn" onClick={resetFilters}>
              Clear filters
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
                  <div className="price">
                    {formatMoney(item.priceMinor)}
                    <span className="price-unit">
                      {" "}
                      {formatPricePer(item.unit ?? "each", item.unitLabel)}
                    </span>
                  </div>
                  {item.onHand <= settings.lowStockQty && item.onHand > 0 ? (
                    <div className="card-stock low">
                      {formatStock(
                        item.onHand,
                        item.unit ?? "each",
                        item.packSize ?? 1,
                        item.unitLabel,
                      )}
                    </div>
                  ) : null}
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
