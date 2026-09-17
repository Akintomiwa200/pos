"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Plus, RefreshCw } from "lucide-react";
import { toast } from "@/lib/toast";
import { nairaInputFromMinor, parseNairaInput, suggestPackBarcode } from "@/lib/catalog";
import { listCatalog, type HqCatalogItem } from "@/lib/hq-api";
import { importCatalogRows } from "@/lib/hq-setup";
import { naira } from "@/lib/hq-ops";
import { formatStock, formatUnitLabel, inferUnitKind, unitKindLabel } from "@/lib/units";
import { unitCode, unitKindFromRecord, type TaxonomyRecord } from "@/lib/hq-taxonomy";
import { useLiveCatalog } from "@/lib/live-catalog";
import { useLiveDirectoryRows } from "@/lib/live-directory-rows";
import { productImageSrc } from "@/lib/product-image";
import { uploadProductImage } from "@/lib/hq-api";
import { ManagerSkeleton } from "../Skeleton";
import { SlideOver } from "../SlideOver";
import { ProductImageField } from "./ProductImageField";
import {
  DataTable,
  Field,
  LiveBadge,
  PrimaryButton,
  SetupHeader,
  SetupStat,
  ToggleField,
  fieldClass,
  secondaryButtonClass,
} from "./SetupChrome";

type PackDraft = {
  id?: string;
  baseId?: string;
  name: string;
  category: string;
  unit: string;
  packSize: string;
  barcode: string;
  sku: string;
  cost: string;
  price: string;
  onHand: string;
  active: boolean;
  auto?: boolean;
  autoHand?: boolean;
  image?: string;
  imageFile?: File | null;
};

const blank = (unit = "pack"): PackDraft => ({
  name: "",
  category: "",
  unit,
  packSize: "12",
  barcode: "",
  sku: "",
  cost: "",
  price: "",
  onHand: "0",
  active: true,
  baseId: "",
  image: "",
  imageFile: null,
});

function isCompositeUnit(row: TaxonomyRecord) {
  const code = unitCode(row);
  const kind = (unitKindFromRecord(row) as string | null) ?? inferUnitKind(code);
  return kind === "composite";
}

function isPackProduct(item: HqCatalogItem, compositeCodes: Set<string>) {
  if (compositeCodes.has((item.unit || "").toLowerCase())) return true;
  return inferUnitKind(item.unit) === "composite";
}

function packStockLabel(row: HqCatalogItem, base?: HqCatalogItem | undefined) {
  const size = Math.max(1, row.packSize || 1);
  const label = formatUnitLabel(row.unit, row.unitLabel);
  let packs: number;
  let pieces: number;
  let remainder: number;
  if (base) {
    pieces = Math.max(0, Math.round(base.onHand ?? 0));
    packs = Math.floor(pieces / size);
    remainder = pieces % size;
  } else {
    packs = Math.max(0, Math.round(row.onHand ?? 0));
    pieces = packs * size;
    remainder = 0;
  }
  const head = `${packs} ${label}${packs === 1 ? "" : "s"}`;
  return remainder > 0 ? `${head} (${pieces} pcs · ${remainder} loose)` : `${head} (${pieces} pcs)`;
}

export function PacksManager() {
  const { items, setItems, live } = useLiveCatalog();
  const { rows: units, ready: unitsReady } = useLiveDirectoryRows("units");
  const { rows: categories, ready: catsReady } = useLiveDirectoryRows("item-groups");
  const [draft, setDraft] = useState<PackDraft>(blank());
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const nameRef = useRef<HTMLDivElement | null>(null);

  const readyAll = ready && unitsReady && catsReady;

  useEffect(() => {
    listCatalog()
      .then(setItems)
      .catch((err) => toast.error(err, "Could not load packs."))
      .finally(() => setReady(true));
  }, [setItems]);

  const packUnits = useMemo(
    () => units.filter((row) => row.active !== false && isCompositeUnit(row)),
    [units],
  );

  const compositeCodes = useMemo(
    () => new Set(packUnits.map((row) => unitCode(row).toLowerCase())),
    [packUnits],
  );

  const packs = useMemo(
    () => items.filter((item) => isPackProduct(item, compositeCodes)),
    [items, compositeCodes],
  );

  const baseOptions = useMemo(
    () =>
      items
        .filter((item) => !isPackProduct(item, compositeCodes))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [items, compositeCodes],
  );

  const itemsById = useMemo(
    () => new Map(items.map((item) => [item.id, item] as const)),
    [items],
  );

  const suggestions = useMemo(() => {
    const query = draft.name.trim().toLowerCase();
    const matches = baseOptions.filter((item) =>
      [item.name, item.sku, item.productCode ?? "", item.barcode, item.category, item.brand ?? ""].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
    return matches.slice(0, 30);
  }, [baseOptions, draft.name]);

  const baseItem = useMemo(
    () => items.find((row) => row.id === draft.baseId) ?? null,
    [items, draft.baseId],
  );

  const packSizeNum = Math.max(2, Math.round(Number(draft.packSize) || 12));

  function derivedPricing() {
    if (!baseItem) return null;
    return {
      cost: nairaInputFromMinor((baseItem.costMinor ?? 0) * packSizeNum),
      price: nairaInputFromMinor((baseItem.priceMinor ?? 0) * packSizeNum),
    };
  }

  function derivedPacks() {
    if (!baseItem) return null;
    const pieces = Math.max(0, Math.round(baseItem.onHand ?? 0));
    return { packs: Math.floor(pieces / packSizeNum), remainder: pieces % packSizeNum, pieces };
  }

  const packsInfo = derivedPacks();

  useEffect(() => {
    if (!suggestionsOpen) return;
    function handle(event: MouseEvent) {
      if (nameRef.current && !nameRef.current.contains(event.target as Node)) {
        setSuggestionsOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [suggestionsOpen]);

  const missingBarcode = packs.filter((row) => !row.barcode?.trim());

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const sorted = [...packs].sort((a, b) => a.name.localeCompare(b.name));
    if (!query) return sorted;
    return sorted.filter((row) =>
      [row.name, row.sku, row.productCode ?? "", row.barcode, row.category, row.unit, row.brand ?? ""].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [packs, search]);

  function openNew() {
    const defaultUnit = packUnits[0] ? unitCode(packUnits[0]) : "pack";
    setDraft(blank(defaultUnit));
    setSuggestionsOpen(false);
    setOpen(true);
  }

  function openEdit(item: HqCatalogItem) {
    setDraft({
      id: item.id,
      baseId: item.baseId ?? "",
      name: item.name,
      category: item.category,
      unit: item.unit || "pack",
      packSize: String(Math.max(2, item.packSize || 12)),
      barcode: item.barcode || "",
      sku: item.sku || "",
      cost: nairaInputFromMinor(item.costMinor ?? 0),
      price: nairaInputFromMinor(item.priceMinor),
      onHand: String(item.onHand),
      active: item.active !== false,
      auto: Boolean(item.baseId),
      autoHand: Boolean(item.baseId),
      image: item.image ?? "",
      imageFile: null,
    });
    setSuggestionsOpen(false);
    setOpen(true);
  }

  async function save() {
    if (!draft.name.trim()) {
      toast.error("Enter the pack product name.");
      return;
    }
    if (!draft.category.trim()) {
      toast.error("Choose a category.");
      return;
    }
    const packSize = Math.max(2, Math.round(parseFloat(draft.packSize) || 12));
    const unitRow = packUnits.find((row) => unitCode(row) === draft.unit) ?? packUnits[0];
    const unit = unitRow ? unitCode(unitRow) : draft.unit || "pack";

    let barcode = draft.barcode.trim();
    if (!barcode) {
      barcode = suggestPackBarcode(items.map((row) => row.barcode));
    }

    const sku =
      draft.sku.trim().toLowerCase() ||
      draft.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24);
    const itemId = draft.id ?? sku;
    const image = draft.image || (baseItem ? baseItem.image : undefined) || undefined;

    setBusy(true);
    try {
      await importCatalogRows([
        {
          id: draft.id,
          name: draft.name.trim(),
          category: draft.category.trim(),
          sku: draft.sku.trim() || undefined,
          barcode,
          baseId: draft.baseId || undefined,
          costMinor: parseNairaInput(draft.cost),
          priceMinor: parseNairaInput(draft.price),
          onHand: Math.max(0, Math.round(parseFloat(draft.onHand) || 0)),
          unit,
          unitLabel: unitRow?.name || unit,
          packSize,
          active: draft.active,
          image,
        },
      ]);
      if (draft.imageFile) {
        const updated = await uploadProductImage(itemId, draft.imageFile);
        setDraft((current) => ({ ...current, image: updated.image ?? "" }));
      }
      setOpen(false);
      toast.success(
        draft.id
          ? "Pack updated."
          : `Pack created · barcode ${barcode} · ${packSize} pieces each.`,
      );
    } catch (err) {
      toast.error(err, "Could not save pack.");
    } finally {
      setBusy(false);
    }
  }

  async function generateMissingBarcodes() {
    if (!missingBarcode.length) {
      toast.success("Every pack already has a barcode.");
      return;
    }
    setBusy(true);
    try {
      const used = items.map((row) => row.barcode);
      const rows = missingBarcode.map((item) => {
        const code = suggestPackBarcode(used);
        used.push(code);
        return {
          id: item.id,
          name: item.name,
          category: item.category,
          barcode: code,
          packSize: Math.max(2, item.packSize || 12),
          unit: item.unit,
          unitLabel: item.unitLabel,
        };
      });
      await importCatalogRows(rows);
      toast.success(`Generated barcodes for ${rows.length} pack${rows.length === 1 ? "" : "s"}.`);
    } catch (err) {
      toast.error(err, "Could not generate barcodes.");
    } finally {
      setBusy(false);
    }
  }

  if (!readyAll) return <ManagerSkeleton variant="table" />;

  return (
    <div>
      <SetupHeader
        kicker="Main Menu · Products"
        title="Pack & Cartons"
        copy="Products sold as a pack, carton, bag or case — not as single pieces. Example: Chivita sold as a pack of 12. Each pack can have its own barcode; blank ones are auto-generated."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <LiveBadge live={live} />
            {missingBarcode.length ? (
              <button
                type="button"
                className={secondaryButtonClass}
                disabled={busy}
                onClick={() => void generateMissingBarcodes()}
              >
                <RefreshCw size={16} />
                Generate {missingBarcode.length} barcode
                {missingBarcode.length === 1 ? "" : "s"}
              </button>
            ) : null}
            <PrimaryButton onClick={openNew}>
              <span className="inline-flex items-center gap-2">
                <Plus size={16} />
                New pack product
              </span>
            </PrimaryButton>
          </div>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Pack products" value={String(packs.length)} hint="Composite sell units" />
        <SetupStat
          label="Pieces represented"
          value={String(
            packs.reduce((sum, row) => {
              const base = row.baseId ? itemsById.get(row.baseId) : undefined;
              if (base) return sum + Math.max(0, Math.round(base.onHand ?? 0));
              return sum + row.onHand * Math.max(1, row.packSize || 1);
            }, 0),
          )}
          tone="accent"
        />
        <SetupStat label="Missing barcodes" value={String(missingBarcode.length)} />
        <SetupStat label="Pack unit types" value={String(packUnits.length)} hint="Pack · carton · bag…" />
      </div>

      {!packUnits.length ? (
        <p className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No composite units yet. Add Pack / Carton under Units with type “Pack / carton / bag”, then
          create pack products here.
        </p>
      ) : null}

      <DataTable
        columns={["Product", "Sold as", "Pieces / pack", "Pack barcode", "Price / pack", "Stock", "Status"]}
        toolbar={
          <input
            className={`${fieldClass} max-w-sm`}
            placeholder="Search packs, barcodes, brands…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        }
      >
        {rows.length === 0 ? (
          <tr>
            <td className="px-4 py-8 text-pos-ink-faint" colSpan={7}>
              No pack products yet. Create one for items sold by the dozen, carton, or multi-pack —
              e.g. Chivita × 12.
            </td>
          </tr>
        ) : (
          rows.map((row) => {
            const size = Math.max(1, row.packSize || 1);
            const unitRow = packUnits.find((u) => unitCode(u) === row.unit);
            const label = row.unitLabel || unitRow?.name || row.unit;
            const base = row.baseId ? itemsById.get(row.baseId) : undefined;
            const imageSrc = productImageSrc(row.id, row.image || base?.image);
            return (
              <tr
                key={row.id}
                className="cursor-pointer border-b border-pos-border/60 hover:bg-pos-surface-muted"
                onClick={() => openEdit(row)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {imageSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageSrc}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-lg bg-pos-surface-muted object-cover"
                      />
                    ) : (
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-pos-surface-muted text-[10px] uppercase tracking-wide text-pos-ink-faint">
                        {row.name.slice(0, 2)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-medium">{row.name}</p>
                      <p className="text-[12px] text-pos-ink-faint">
                        {row.category}
                        {base ? ` · from ${base.name}` : ""}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 capitalize">{label}</td>
                <td className="px-4 py-3 tabular-nums font-semibold">{size}</td>
                <td className="px-4 py-3 font-mono text-[13px]">
                  {row.barcode?.trim() ? (
                    row.barcode
                  ) : (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                      Needs barcode
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 tabular-nums">{naira(row.priceMinor)}</td>
                <td className="px-4 py-3 text-pos-ink-muted">
                  {packStockLabel(row, base)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                      row.active !== false
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-pos-surface-muted text-pos-ink-muted"
                    }`}
                  >
                    {row.active !== false ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            );
          })
        )}
      </DataTable>

      <SlideOver
        open={open}
        title={draft.id ? "Edit pack product" : "New pack product"}
        subtitle="Sold as a composite unit (not single pieces). Set how many pieces are inside, and the barcode printed on the outer pack."
        onClose={() => setOpen(false)}
        footer={
          <PrimaryButton className="w-full" disabled={busy} onClick={() => void save()}>
            Save pack
          </PrimaryButton>
        }
      >
        {draft.id ? (
          <Field label="Product name">
            <input
              className={fieldClass}
              placeholder="e.g. Chivita Active 1L Pack"
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            />
          </Field>
        ) : (
          <Field label="Base product" hint="Pick an existing product — this pack becomes its composite (carton/case/bag) variant.">
            <div className="relative" ref={nameRef}>
              <input
                className={fieldClass}
                placeholder="Search existing products…"
                value={draft.name}
                onChange={(event) => {
                  setDraft({ ...draft, name: event.target.value, baseId: "" });
                  setSuggestionsOpen(true);
                }}
                onFocus={() => setSuggestionsOpen(true)}
              />
              <ChevronDown
                size={15}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-pos-ink-faint"
              />
              {suggestionsOpen ? (
                <div className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border border-pos-border bg-pos-surface py-1 shadow-pos-md">
                  {suggestions.length === 0 ? (
                    <p className="px-3.5 py-2.5 text-sm text-pos-ink-faint">
                      No matching products — type the pack name to create it fresh.
                    </p>
                  ) : (
                    suggestions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="block w-full px-3.5 py-2 text-left transition hover:bg-pos-surface-muted"
                        onClick={() => {
                          const derived = nairaInputFromMinor((item.costMinor ?? 0) * packSizeNum);
                          const derivedPrice = nairaInputFromMinor(
                            (item.priceMinor ?? 0) * packSizeNum,
                          );
                          const hand = Math.floor(Math.max(0, item.onHand ?? 0) / packSizeNum);
                          setDraft({
                            ...draft,
                            baseId: item.id,
                            name: item.name,
                            category: item.category || draft.category,
                            cost: derived,
                            price: derivedPrice,
                            onHand: String(hand),
                            auto: true,
                            autoHand: true,
                            image: item.image ?? "",
                          });
                          setSuggestionsOpen(false);
                        }}
                      >
                        <span className="block truncate text-sm text-pos-ink">{item.name}</span>
                        <span className="block text-[12px] text-pos-ink-faint">
                          {item.category}
                          {item.sku ? ` · ${item.sku}` : ""}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          </Field>
        )}
        <Field label="Category">
          <select
            className={fieldClass}
            value={draft.category}
            onChange={(event) => setDraft({ ...draft, category: event.target.value })}
          >
            <option value="">Select category…</option>
            {categories
              .filter((row) => row.active !== false)
              .map((row) => (
                <option key={row.id} value={row.name}>
                  {row.name}
                </option>
              ))}
          </select>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Sold as">
            <select
              className={fieldClass}
              value={draft.unit}
              onChange={(event) => setDraft({ ...draft, unit: event.target.value })}
            >
              {packUnits.length === 0 ? (
                <option value="pack">Pack</option>
              ) : (
                packUnits.map((row) => (
                  <option key={row.id} value={unitCode(row)}>
                    {row.name} · {unitKindLabel("composite")}
                  </option>
                ))
              )}
            </select>
          </Field>
          <Field label="Pieces in each pack">
            <input
              type="number"
              min={2}
              step={1}
              className={fieldClass}
              value={draft.packSize}
              onChange={(event) => {
                const size = Math.max(2, Math.round(Number(event.target.value) || 12));
                setDraft((current) => {
                  const hand = packsInfo ? Math.floor(packsInfo.pieces / size) : current.onHand;
                  return {
                    ...current,
                    packSize: event.target.value,
                    ...(current.auto && baseItem
                      ? {
                          cost: nairaInputFromMinor((baseItem.costMinor ?? 0) * size),
                          price: nairaInputFromMinor((baseItem.priceMinor ?? 0) * size),
                        }
                      : {}),
                    ...(current.autoHand && baseItem ? { onHand: String(hand) } : {}),
                  };
                });
              }}
            />
          </Field>
        </div>
        <ProductImageField
          itemId={draft.id ?? draft.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24)}
          imageUrl={draft.image}
          onChange={(file) => setDraft({ ...draft, imageFile: file })}
        />
        <p className="-mt-1 text-[12px] text-pos-ink-faint">
          {baseItem?.image
            ? `This pack mirrors the "${baseItem.name}" product photo. Upload your own to use a pack-specific photo.`
            : "Shown on tills and price check. Pick a base product to copy its photo onto this pack."}
        </p>
        <Field label="Pack barcode">
          <div className="flex gap-2">
            <input
              className={`${fieldClass} font-mono`}
              placeholder="Leave blank to auto-generate"
              value={draft.barcode}
              onChange={(event) => setDraft({ ...draft, barcode: event.target.value })}
            />
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() =>
                setDraft({
                  ...draft,
                  barcode: suggestPackBarcode(items.map((row) => row.barcode)),
                })
              }
            >
              Generate
            </button>
          </div>
          <p className="mt-1.5 text-[12px] text-pos-ink-faint">
            Outer pack/carton code scanned at the till. Single bottles keep a different product if you
            also sell them loose.
          </p>
        </Field>
        <Field label="SKU (optional)">
          <input
            className={fieldClass}
            placeholder="Auto if blank"
            value={draft.sku}
            onChange={(event) => setDraft({ ...draft, sku: event.target.value })}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Cost per pack (₦)">
            <input
              className={fieldClass}
              value={draft.cost}
              onChange={(event) =>
                setDraft({ ...draft, cost: event.target.value, auto: false })
              }
            />
          </Field>
          <Field label="Sell price per pack (₦)">
            <input
              className={fieldClass}
              value={draft.price}
              onChange={(event) =>
                setDraft({ ...draft, price: event.target.value, auto: false })
              }
            />
          </Field>
        </div>
        {baseItem ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-pos-border bg-pos-surface-muted px-3.5 py-2.5">
            <p className="text-[13px] text-pos-ink-muted">
              From <span className="font-medium text-pos-ink">{baseItem.name}</span> —{" "}
              {naira(baseItem.costMinor ?? 0)}/piece · sell {naira(baseItem.priceMinor ?? 0)}/piece.
            </p>
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => {
                const pricing = derivedPricing();
                if (!pricing) return;
                setDraft({ ...draft, ...pricing, auto: true });
              }}
            >
              Apply pricing from pieces
            </button>
          </div>
        ) : null}
        <Field
          label="Packs on hand"
          hint={
            baseItem && draft.autoHand
              ? "Auto-calculated from the base product's pieces — edit to override."
              : undefined
          }
        >
          <input
            type="number"
            min={0}
            className={fieldClass}
            value={baseItem && draft.autoHand && packsInfo ? String(packsInfo.packs) : draft.onHand}
            onChange={(event) =>
              setDraft({ ...draft, onHand: event.target.value, autoHand: false })
            }
          />
        </Field>
        {packsInfo ? (
          <p className="-mt-1 mb-1 text-[13px] text-pos-ink-muted">
            {packsInfo.pieces} single {packSizeNum === 1 ? "piece" : "pieces"} on hand ÷ {packSizeNum} per
            pack ={" "}
            <span className="font-semibold text-pos-ink">
              {packsInfo.packs} pack{packsInfo.packs === 1 ? "" : "s"}
            </span>
            {packsInfo.remainder > 0 ? (
              <>
                {" "}
                · <span className="font-semibold text-pos-ink">{packsInfo.remainder} pcs</span> left in
                singles
              </>
            ) : (
              ""
            )}
            .
          </p>
        ) : null}
        {baseItem && packsInfo ? (
          <p className="mb-3 text-sm text-pos-ink-muted">
            That is{" "}
            <span className="font-semibold text-pos-ink">
              {packsInfo.pieces} pieces
            </span>{" "}
            in the base product —{" "}
            <span className="font-semibold text-pos-ink">
              {packsInfo.packs} pack{packsInfo.packs === 1 ? "" : "s"}
            </span>{" "}
            {packsInfo.remainder > 0 ? `and ${packsInfo.remainder} loose` : ""}.
          </p>
        ) : Number(draft.packSize) >= 2 && Number(draft.onHand) >= 0 ? (
          <p className="mb-3 text-sm text-pos-ink-muted">
            That is{" "}
            <span className="font-semibold text-pos-ink">
              {Math.round(Number(draft.onHand) || 0) *
                Math.max(2, Math.round(Number(draft.packSize) || 12))}{" "}
              pieces
            </span>{" "}
            total.
          </p>
        ) : null}
        <ToggleField
          label="Active on tills"
          checked={draft.active}
          onChange={(active) => setDraft({ ...draft, active })}
        />
      </SlideOver>
    </div>
  );
}
