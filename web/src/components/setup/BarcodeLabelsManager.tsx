"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  Loader2,
  Minus,
  Plus,
  Printer,
  ScanBarcode,
  Search,
  Sparkles,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { makeValidBarcode } from "@/lib/catalog";
import { importCatalogRows } from "@/lib/hq-setup";
import { naira } from "@/lib/hq-ops";
import { toast } from "@/lib/toast";
import { LABEL_PRESETS, LABEL_DPI, renderLabelDataUrl, type LabelPreset } from "@/lib/label-render";
import { api, listCatalog, type HqCatalogItem } from "@/lib/hq-api";
import { useLiveCatalog } from "@/lib/live-catalog";
import { ManagerSkeleton } from "../Skeleton";
import { PrimaryButton, SetupStat } from "./SetupChrome";

type DetectedPrinter = {
  name: string;
  driver: string;
  port: string;
  isDefault: boolean;
  offline: boolean;
};

const outlineBtn =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-pos-border bg-pos-surface px-4 py-2.5 text-sm font-medium text-pos-ink transition hover:bg-pos-surface-muted disabled:opacity-50";

const selectCls =
  "appearance-none rounded-xl border border-pos-border bg-pos-surface py-2.5 pl-3.5 pr-9 text-sm text-pos-ink outline-none transition focus:border-pos-primary focus:ring-1 focus:ring-pos-primary/25 disabled:opacity-50";

function matchesQuery(item: HqCatalogItem, query: string) {
  return [item.name, item.sku, item.barcode, item.category, item.brand]
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes(query));
}

export function BarcodeLabelsManager() {
  const { items, live } = useLiveCatalog();
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);
  const [queuedIds, setQueuedIds] = useState<string[]>([]);
  const [copies, setCopies] = useState<Record<string, number>>({});
  const [showPrice, setShowPrice] = useState(true);
  const [presetKey, setPresetKey] = useState<LabelPreset["key"]>("40x30");
  const [printers, setPrinters] = useState<DetectedPrinter[]>([]);
  const [labelPrinter, setLabelPrinter] = useState("");
  const [busy, setBusy] = useState(false);

  const preset = LABEL_PRESETS.find((row) => row.key === presetKey)!;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [catalog, detected, saved] = await Promise.all([
          listCatalog(),
          api<DetectedPrinter[]>("/api/hardware/printers").catch(() => []),
          api<{ labelPrinter: string | null }>("/api/hardware/label-printer").catch(() => ({
            labelPrinter: null,
          })),
        ]);
        void catalog;
        if (!cancelled) {
          setPrinters(detected);
          if (saved.labelPrinter) setLabelPrinter(saved.labelPrinter);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setQueuedIds((current) => current.filter((id) => items.some((item) => item.id === id)));
  }, [items]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return items
      .filter((item) => {
        const active = item.active !== false;
        if (onlyActive && !active) return false;
        return matchesQuery(item, q);
      })
      .slice(0, 8);
  }, [items, query, onlyActive]);

  const queuedItems = useMemo(
    () =>
      queuedIds
        .map((id) => items.find((item) => item.id === id))
        .filter((item): item is HqCatalogItem => Boolean(item)),
    [queuedIds, items],
  );

  const missingQueued = queuedItems.filter((item) => !item.barcode?.trim());

  const totalLabels = useMemo(
    () =>
      queuedItems.reduce(
        (sum, item) => sum + Math.max(1, copies[item.id] ?? 1),
        0,
      ),
    [queuedItems, copies],
  );

  const previews = useMemo(
    () =>
      queuedItems.map((item) => {
        try {
          return {
            item,
            image: renderLabelDataUrl({
              barcode: item.barcode?.trim() ?? "",
              name: item.name,
              price: naira(item.priceMinor),
              showPrice,
              widthMm: preset.widthMm,
              heightMm: preset.heightMm,
            }),
          };
        } catch {
          return { item, image: null };
        }
      }),
    [queuedItems, preset, showPrice],
  );

  function addToQueue(id: string) {
    if (queuedIds.includes(id)) return;
    setQueuedIds((current) => [...current, id]);
    setCopies((current) => ({ ...current, [id]: Math.max(1, current[id] ?? 1) }));
  }

  function removeFromQueue(id: string) {
    setQueuedIds((current) => current.filter((queuedId) => queuedId !== id));
    setCopies((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  function changeCopies(id: string, delta: number) {
    setCopies((current) => ({
      ...current,
      [id]: Math.max(1, Math.min(99, (current[id] ?? 1) + delta)),
    }));
  }

  function pickPrinter(name: string) {
    setLabelPrinter(name);
    void api<{ labelPrinter: string | null }>("/api/hardware/label-printer", {
      method: "POST",
      body: JSON.stringify({ name: name || null }),
    })
      .then((saved) => {
        if (saved.labelPrinter) setLabelPrinter(saved.labelPrinter);
      })
      .catch((err) => toast.error(err, "Could not save the label printer."));
  }

  async function generateFor(item: HqCatalogItem) {
    try {
      const used = items.map((row) => row.barcode).filter(Boolean) as string[];
      const barcode = makeValidBarcode(used);
      if (!barcode) {
        toast.error("Could not allocate a free barcode.");
        return;
      }
      await importCatalogRows([{ id: item.id, name: item.name, barcode }]);
      toast.success(`Barcode ${barcode} created for ${item.name}.`);
    } catch (err) {
      toast.error(err, "Could not generate the barcode.");
    }
  }

  async function generateMissing() {
    const targets = missingQueued;
    if (targets.length === 0) return;
    setBusy(true);
    try {
      const used = new Set(items.map((row) => row.barcode).filter(Boolean));
      const rows = targets.map((item) => {
        const barcode = makeValidBarcode([...used]);
        if (barcode) used.add(barcode);
        return { id: item.id, name: item.name, barcode };
      });
      const result = await importCatalogRows(rows);
      toast.success(`Generated ${result.updated || rows.length} barcode${rows.length === 1 ? "" : "s"}.`);
    } catch (err) {
      toast.error(err, "Could not generate barcodes.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePrint() {
    if (!labelPrinter) {
      toast.error("Pick a label printer first, then print.");
      return;
    }
    const printable = queuedItems.filter((item) => item.barcode?.trim());
    if (printable.length === 0) {
      toast.error("Nothing printable in the queue — generate missing barcodes first.");
      return;
    }
    setBusy(true);
    try {
      const labels = printable.map((item) => {
        const { dataUrl } = renderLabelDataUrl({
          barcode: item.barcode!.trim(),
          name: item.name,
          price: naira(item.priceMinor),
          showPrice,
          widthMm: preset.widthMm,
          heightMm: preset.heightMm,
        });
        return {
          imageBase64: dataUrl.split(",")[1] ?? dataUrl,
          widthMm: preset.widthMm,
          heightMm: preset.heightMm,
          copies: Math.max(1, copies[item.id] ?? 1),
        };
      });
      const result = await api<{ ok: true; printer: string; labels: number }>(
        "/api/hardware/print-labels",
        { method: "POST", body: JSON.stringify({ printerName: labelPrinter, labels }) },
      );
      toast.success(
        `Sent ${result.labels} label${result.labels === 1 ? "" : "s"} to ${result.printer}.`,
      );
    } catch (err) {
      toast.error(err, "Could not print the labels.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <ManagerSkeleton variant="table" />;

  const defaultPrinter = printers.find((printer) => printer.isDefault)?.name ?? "";

  return (
    <div className="space-y-5 text-pos-ink">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pos-ink-faint">
            Main Menu · Products
          </p>
          <h1 className="mt-2 text-[clamp(1.5rem,3.5vw,2.25rem)] font-medium leading-none tracking-tight text-pos-ink-faint">
            Print Labels
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-pos-ink-muted">
            Start typing to find a product, add it to the queue, then print straight to your
            thermal label printer ({LABEL_DPI} DPI raster at the label size you set — no browser
            print dialog).
          </p>
        </div>
        <PrimaryButton onClick={() => void handlePrint()} disabled={busy || !labelPrinter}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} strokeWidth={2.2} />}
          {busy ? "Sending…" : `Print ${totalLabels} label${totalLabels === 1 ? "" : "s"}`}
        </PrimaryButton>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SetupStat label="In queue" value={String(queuedItems.length)} hint="Products to label" />
        <SetupStat
          label="Labels to print"
          value={String(totalLabels)}
          hint={`${preset.label} · ${preset.hint.toLowerCase()}`}
        />
        <SetupStat
          label="No barcode"
          value={String(missingQueued.length)}
          hint={missingQueued.length ? "Generate codes before printing" : "Every label will scan"}
          tone={missingQueued.length ? "accent" : "default"}
        />
        <SetupStat
          label="Label printer"
          value={labelPrinter ? "Ready" : "Not set"}
          hint={labelPrinter ? labelPrinter : "Pick one in the queue settings"}
          tone={labelPrinter ? "inverse" : "accent"}
        />
      </div>

      <section className="overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
        <div className="border-b border-pos-border/60 px-4 py-3.5 sm:px-5">
          <p className="text-[15px] font-semibold text-pos-ink">Add products</p>
          <p className="mt-0.5 text-[12px] text-pos-ink-muted">
            Nothing is listed until you search — no accidentally printing your whole store.
          </p>
        </div>
        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-3">
            <label className="relative min-w-[14rem] flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-pos-ink-faint"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                autoFocus
                placeholder="Type a product name, SKU, or barcode…"
                className="w-full rounded-xl border border-pos-border bg-pos-surface py-3 pl-10 pr-4 text-sm text-pos-ink outline-none placeholder:text-pos-ink-faint focus:border-pos-primary focus:ring-1 focus:ring-pos-primary/25"
              />
            </label>
            <label className="inline-flex items-center gap-2 rounded-xl border border-pos-border px-3 py-3 text-[13px] text-pos-ink-muted">
              <input
                type="checkbox"
                className="accent-pos-primary"
                checked={onlyActive}
                onChange={(event) => setOnlyActive(event.target.checked)}
              />
              Active only
            </label>
            <span
              className={`inline-flex items-center gap-1.5 rounded-xl border border-pos-border px-3 py-3 text-[12px] font-medium ${
                live ? "bg-pos-success/10 text-pos-success" : "bg-pos-surface-muted text-pos-ink-faint"
              }`}
              title={live ? "Catalog is live" : "Live sync offline"}
            >
              {live ? <Wifi size={13} /> : <WifiOff size={13} />}
              {live ? "Live" : "Offline"}
            </span>
          </div>

          {query.trim() ? (
            <ul className="mt-3 divide-y divide-pos-border/45 overflow-hidden rounded-xl border border-pos-border/60">
              {results.length === 0 ? (
                <li className="px-4 py-8 text-center text-sm text-pos-ink-faint">
                  No products match “{query.trim()}”.
                </li>
              ) : (
                results.map((item) => {
                  const queued = queuedIds.includes(item.id);
                  const code = item.barcode?.trim() ?? "";
                  return (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center gap-3 bg-pos-surface px-4 py-3 transition hover:bg-pos-surface-muted/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-pos-ink">{item.name}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-pos-ink-faint">
                          <span className="font-mono">{item.sku}</span>
                          {code ? (
                            <span className="font-mono text-pos-ink-muted">{code}</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-pos-warning/15 px-1.5 py-0.5 font-medium text-pos-warning">
                              <ScanBarcode size={12} />
                              Missing
                            </span>
                          )}
                        </p>
                      </div>
                      <span className="text-sm font-medium tabular-nums text-pos-ink">
                        {naira(item.priceMinor)}
                      </span>
                      {!code ? (
                        <button
                          type="button"
                          className={outlineBtn}
                          disabled={busy}
                          onClick={() => void generateFor(item)}
                        >
                          <Sparkles size={14} />
                          Generate code
                        </button>
                      ) : queued ? (
                        <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-pos-success">
                          <Check size={14} />
                          In queue
                        </span>
                      ) : (
                        <PrimaryButton
                          className="!rounded-xl !px-4 !py-2"
                          onClick={() => addToQueue(item.id)}
                        >
                          <Plus size={15} />
                          Add label
                        </PrimaryButton>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          ) : (
            <div className="mt-3 rounded-xl border border-dashed border-pos-border px-4 py-10 text-center text-sm text-pos-ink-faint">
              <ScanBarcode size={32} strokeWidth={1.25} className="mx-auto mb-3 opacity-50" />
              The queue starts empty. Search above, then add the products you actually need labels
              for.
            </div>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-pos-border/60 px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-pos-ink">Label queue</h2>
            <p className="mt-0.5 text-[12px] text-pos-ink-muted">
              {queuedItems.length} product{queuedItems.length === 1 ? "" : "s"} · {totalLabels}{" "}
              label{totalLabels === 1 ? "" : "s"} to print
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {missingQueued.length > 0 ? (
              <PrimaryButton disabled={busy} onClick={() => void generateMissing()}>
                <Sparkles size={15} />
                {busy ? "Generating…" : `Generate ${missingQueued.length} missing`}
              </PrimaryButton>
            ) : null}
            <button
              type="button"
              className={outlineBtn}
              onClick={() => {
                setQueuedIds([]);
                setCopies({});
              }}
              disabled={queuedItems.length === 0}
            >
              <Trash2 size={15} />
              Clear
            </button>
          </div>
        </div>

        {queuedItems.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-pos-ink-faint">
            Nothing in the queue yet — search and add a product above.
          </div>
        ) : (
          <ul className="divide-y divide-pos-border/45">
            {queuedItems.map((item) => {
              const code = item.barcode?.trim() ?? "";
              const count = copies[item.id] ?? 1;
              return (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-pos-ink">{item.name}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-pos-ink-faint">
                      <span className="font-mono">{item.sku}</span>
                      {code ? (
                        <span className="font-mono text-pos-ink-muted">{code}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-pos-warning/15 px-1.5 py-0.5 font-medium text-pos-warning">
                          <ScanBarcode size={12} />
                          Missing — generate before printing
                        </span>
                      )}
                      <span className="text-pos-ink-muted">{naira(item.priceMinor)}</span>
                    </p>
                  </div>
                  {!code ? (
                    <button
                      type="button"
                      className={outlineBtn}
                      disabled={busy}
                      onClick={() => void generateFor(item)}
                    >
                      <Sparkles size={14} />
                      Generate
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-1 rounded-xl border border-pos-border">
                      <button
                        type="button"
                        className="flex h-9 w-9 items-center justify-center text-pos-ink-muted transition hover:text-pos-ink disabled:opacity-40"
                        disabled={count <= 1}
                        onClick={() => changeCopies(item.id, -1)}
                        aria-label={`Fewer copies of ${item.name}`}
                      >
                        <Minus size={15} />
                      </button>
                      <span className="min-w-[3.5rem] text-center text-sm font-semibold tabular-nums">
                        {count}
                      </span>
                      <button
                        type="button"
                        className="flex h-9 w-9 items-center justify-center text-pos-ink-muted transition hover:text-pos-ink disabled:opacity-40"
                        disabled={count >= 99}
                        onClick={() => changeCopies(item.id, 1)}
                        aria-label={`More copies of ${item.name}`}
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-pos-ink-faint transition hover:bg-pos-surface-muted hover:text-pos-danger"
                    onClick={() => removeFromQueue(item.id)}
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-2.5 border-t border-pos-border/60 px-4 py-3.5 sm:px-5">
          <label className="relative min-w-[15rem] flex-1">
            <select
              value={labelPrinter}
              onChange={(event) => pickPrinter(event.target.value)}
              className={selectCls}
              aria-label="Label printer"
              disabled={printers.length === 0}
            >
              <option value="">
                {labelPrinter
                  ? "Current printer"
                  : printers.length
                    ? `Choose label printer (default: ${defaultPrinter || "default"})`
                    : "No printers detected"}
              </option>
              {printers
                .filter((printer) => printer.name !== labelPrinter)
                .map((printer) => (
                  <option key={printer.name} value={printer.name}>
                    {printer.name}
                    {printer.isDefault ? " · default" : ""}
                    {printer.offline ? " · offline" : ""}
                  </option>
                ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-pos-ink-faint"
            />
          </label>
          <label className="relative">
            <select
              value={presetKey}
              onChange={(event) => setPresetKey(event.target.value as LabelPreset["key"])}
              className={selectCls}
              aria-label="Label size"
            >
              {LABEL_PRESETS.map((row) => (
                <option key={row.key} value={row.key}>
                  {row.label} · {row.hint}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-pos-ink-faint"
            />
          </label>
          <label className="inline-flex items-center gap-2 rounded-xl border border-pos-border px-3 py-2.5 text-[13px] text-pos-ink-muted">
            <input
              type="checkbox"
              className="accent-pos-primary"
              checked={showPrice}
              onChange={(event) => setShowPrice(event.target.checked)}
            />
            Show price
          </label>
        </div>
      </section>

      <section className="overflow-hidden rounded-[20px] bg-pos-surface shadow-pos-md">
        <div className="border-b border-pos-border/60 px-4 py-3.5 sm:px-5">
          <h2 className="text-[15px] font-semibold text-pos-ink">Output preview</h2>
          <p className="mt-0.5 text-[12px] text-pos-ink-muted">
            Exactly the raster ({preset.label}, {LABEL_DPI} DPI) that will be printed one label at a
            time on the thermal printer.
          </p>
        </div>
        {previews.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-12 text-center text-pos-ink-faint">
            <ScanBarcode size={40} strokeWidth={1.25} />
            <p className="text-sm">Add a product above to see how the label will look.</p>
          </div>
        ) : (
          <div className="bg-pos-surface-muted/60 px-4 py-6 sm:px-6">
            <div className="flex flex-wrap justify-center gap-6">
              {previews.map(({ item, image }) => (
                <div key={item.id} className="min-w-0">
                  {image ? (
                    <img
                      src={image.dataUrl}
                      alt={`Label preview for ${item.name}`}
                      style={{ width: `${Math.round((preset.widthMm / preset.heightMm) * 130)}px` }}
                      className="mx-auto rounded-[4px] shadow-pos-md"
                    />
                  ) : (
                    <div className="flex h-[130px] w-[170px] items-center justify-center rounded-[4px] border border-dashed border-pos-border px-3 text-center text-[12px] text-pos-ink-faint">
                      {item.barcode?.trim() ? "Barcode not renderable" : "Missing barcode"}
                    </div>
                  )}
                  <p className="mt-2 text-center text-[12px] font-medium text-pos-ink">
                    {item.name}
                  </p>
                  <p className="text-center text-[11px] text-pos-ink-faint">
                    ×{Math.max(1, copies[item.id] ?? 1)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-pos-border/60 bg-pos-surface-muted/40 px-4 py-3 text-[12px] text-pos-ink-muted">
        <p>
          <Check size={13} className="mr-1.5 inline-block text-pos-success" />
          Print goes straight to{" "}
          <span className="font-medium text-pos-ink">{labelPrinter || "the chosen printer"}</span>
          {" "}— nothing opens in the browser.
        </p>
        <p className="font-mono hidden sm:block">
          {preset.label} · {LABEL_DPI} DPI · {totalLabels} label{totalLabels === 1 ? "" : "s"}
        </p>
      </div>
    </div>
  );
}