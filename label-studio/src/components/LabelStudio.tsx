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
import { toast } from "sonner";
import { api } from "../lib/api";
import {
  LABEL_PRESETS,
  LABEL_DPI,
  makeValidBarcode,
  renderLabelDataUrl,
  type LabelPreset,
} from "../lib/label-render";

type HqCatalogItem = {
  id: string;
  name: string;
  category: string;
  sku: string;
  barcode: string;
  costMinor: number;
  priceMinor: number;
  unit: string;
  active: boolean;
};

type DetectedPrinter = {
  name: string;
  driver: string;
  port: string;
  isDefault: boolean;
  offline: boolean;
};

function naira(minor: number) {
  return `\u20A6${(minor / 100).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function matchesQuery(item: HqCatalogItem, query: string) {
  return [item.name, item.sku, item.barcode, item.category]
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes(query));
}

export default function LabelStudio() {
  const [items, setItems] = useState<HqCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);
  const [queuedIds, setQueuedIds] = useState<string[]>([]);
  const [copies, setCopies] = useState<Record<string, number>>({});
  const [showPrice, setShowPrice] = useState(true);
  const [presetKey, setPresetKey] = useState<LabelPreset["key"]>("40x30");
  const [printers, setPrinters] = useState<DetectedPrinter[]>([]);
  const [labelPrinter, setLabelPrinter] = useState("");
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);

  const preset = LABEL_PRESETS.find((row) => row.key === presetKey)!;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [catalog, detected, saved] = await Promise.all([
          api<HqCatalogItem[]>("/api/catalog/items"),
          api<DetectedPrinter[]>("/api/hardware/printers").catch(() => []),
          api<{ labelPrinter: string | null }>("/api/hardware/label-printer").catch(() => ({
            labelPrinter: null,
          })),
        ]);
        if (cancelled) return;
        setItems(catalog);
        setPrinters(detected);
        if (saved.labelPrinter) setLabelPrinter(saved.labelPrinter);
        setConnected(true);
      } catch (err) {
        if (!cancelled) toast.error(err instanceof Error ? err.message : "Backend offline");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return items
      .filter((item) => {
        if (onlyActive && item.active === false) return false;
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
  const totalLabels = queuedItems.reduce(
    (sum, item) => sum + Math.max(1, copies[item.id] ?? 1),
    0,
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
    setCopies((current) => ({ ...current, [id]: 1 }));
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

  async function pickPrinter(name: string) {
    setLabelPrinter(name);
    try {
      const saved = await api<{ labelPrinter: string | null }>("/api/hardware/label-printer", {
        method: "POST",
        body: JSON.stringify({ name: name || null }),
      });
      if (saved.labelPrinter) setLabelPrinter(saved.labelPrinter);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the label printer.");
    }
  }

  async function generateFor(item: HqCatalogItem) {
    try {
      const used = items.map((row) => row.barcode).filter(Boolean) as string[];
      const barcode = makeValidBarcode(used);
      if (!barcode) {
        toast.error("Could not allocate a free barcode.");
        return;
      }
      await api("/api/console/setup/import/catalog", {
        method: "POST",
        body: JSON.stringify({
          rows: [{ id: item.id, name: item.name, barcode }],
        }),
      });
      setItems((current) =>
        current.map((row) => (row.id === item.id ? { ...row, barcode } : row)),
      );
      toast.success(`Barcode ${barcode} created for ${item.name}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate the barcode.");
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
      const result = await api<{ created: number; updated: number; total: number }>(
        "/api/console/setup/import/catalog",
        { method: "POST", body: JSON.stringify({ rows }) },
      );
      setTimeout(() => {
        void api<HqCatalogItem[]>("/api/catalog/items")
          .then(setItems)
          .catch(() => undefined);
      }, 400);
      toast.success(`Generated ${result.updated || rows.length} barcode${rows.length === 1 ? "" : "s"}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate barcodes.");
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
      toast.error("Nothing printable in the queue yet.");
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
      toast.success(`Sent ${result.labels} label${result.labels === 1 ? "" : "s"} to ${result.printer}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not print the labels.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <ScanBarcode size={18} />
            <span>Label Studio</span>
          </div>
          <span className={`status ${connected ? "ok" : "warn"}`}>
            {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
            {connected ? "Backend connected" : "Backend offline"}
          </span>
        </div>
      </header>

      <main className="main">
        {loading ? (
          <div className="empty">Connecting to the POS backend…</div>
        ) : (
          <>
            <div className="header">
              <div className="header-copy">
                <h1>Print labels</h1>
                <p>
                  Search for a product, add it to the queue, then print straight to the thermal
                  label printer. No browser print dialog — the labels are rasterized{" "}
                  {LABEL_DPI} DPI and sent to the printer driver at the exact label size.
                </p>
              </div>
              <button
                type="button"
                className="btn-primary"
                disabled={busy || !labelPrinter}
                onClick={() => void handlePrint()}
              >
                {busy ? <Loader2 size={15} className="spin" /> : <Printer size={15} />}
                {busy ? "Sending…" : `Print ${totalLabels} label${totalLabels === 1 ? "" : "s"}`}
              </button>
            </div>

            <div className="stats">
              <div className="stat">
                <span>In queue</span>
                <strong>{queuedItems.length}</strong>
                <small>Products to label</small>
              </div>
              <div className="stat">
                <span>Labels to print</span>
                <strong>{totalLabels}</strong>
                <small>
                  {preset.label} · {preset.hint.toLowerCase()}
                </small>
              </div>
              <div className="stat accent">
                <span>No barcode</span>
                <strong>{missingQueued.length}</strong>
                <small>{missingQueued.length ? "Generate before printing" : "Every label scans"}</small>
              </div>
              <div className="stat">
                <span>Label printer</span>
                <strong className="truncate" title={labelPrinter}>
                  {labelPrinter || "Not set"}
                </strong>
                <small>{labelPrinter ? "Ready to print" : "Pick one below"}</small>
              </div>
            </div>

            <section className="card">
              <div className="card-head">
                <div>
                  <h2>Add products</h2>
                  <p>Nothing is listed until you search, so you never print the whole store.</p>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={onlyActive}
                    onChange={(event) => setOnlyActive(event.target.checked)}
                  />
                  Active only
                </label>
              </div>
              <div className="search">
                <Search size={16} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  autoFocus
                  placeholder="Type a product name, SKU, or barcode…"
                />
              </div>
              {query.trim() ? (
                <ul className="results">
                  {results.length === 0 ? (
                    <li className="row empty-row">No products match “{query.trim()}”.</li>
                  ) : (
                    results.map((item) => {
                      const queued = queuedIds.includes(item.id);
                      const code = item.barcode?.trim() ?? "";
                      return (
                        <li key={item.id} className="row">
                          <div className="row-copy">
                            <strong>{item.name}</strong>
                            <span>
                              <code>{item.sku}</code>
                              {code ? <code>{code}</code> : <em className="missing">missing code</em>}
                              <b>{naira(item.priceMinor)}</b>
                            </span>
                          </div>
                          {!code ? (
                            <button
                              type="button"
                              className="btn-ghost"
                              disabled={busy}
                              onClick={() => void generateFor(item)}
                            >
                              <Sparkles size={13} />
                              Generate code
                            </button>
                          ) : queued ? (
                            <span className="queued">
                              <Check size={13} />
                              In queue
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="btn-primary"
                              onClick={() => addToQueue(item.id)}
                            >
                              <Plus size={14} />
                              Add label
                            </button>
                          )}
                        </li>
                      );
                    })
                  )}
                </ul>
              ) : (
                <div className="empty">
                  <ScanBarcode size={30} />
                  <p>Search above to add the products you actually need labels for.</p>
                </div>
              )}
            </section>

            <section className="card">
              <div className="card-head">
                <div>
                  <h2>Label queue</h2>
                  <p>
                    {queuedItems.length} product{queuedItems.length === 1 ? "" : "s"} · {totalLabels}{" "}
                    label{totalLabels === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="actions">
                  {missingQueued.length > 0 ? (
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={busy}
                      onClick={() => void generateMissing()}
                    >
                      <Sparkles size={14} />
                      {busy ? "Generating…" : `Generate ${missingQueued.length} missing`}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn-ghost"
                    disabled={queuedItems.length === 0}
                    onClick={() => {
                      setQueuedIds([]);
                      setCopies({});
                    }}
                  >
                    <Trash2 size={14} />
                    Clear
                  </button>
                </div>
              </div>

              {queuedItems.length === 0 ? (
                <div className="empty">Nothing in the queue yet.</div>
              ) : (
                <ul className="queue">
                  {queuedItems.map((item) => {
                    const code = item.barcode?.trim() ?? "";
                    const count = copies[item.id] ?? 1;
                    return (
                      <li key={item.id} className="row">
                        <div className="row-copy">
                          <strong>{item.name}</strong>
                          <span>
                            {code ? (
                              <code>{code}</code>
                            ) : (
                              <em className="missing">missing code — generate before printing</em>
                            )}
                            <b>{naira(item.priceMinor)}</b>
                          </span>
                        </div>
                        {!code ? (
                          <button
                            type="button"
                            className="btn-ghost"
                            disabled={busy}
                            onClick={() => void generateFor(item)}
                          >
                            <Sparkles size={13} />
                            Generate
                          </button>
                        ) : (
                          <div className="stepper">
                            <button
                              type="button"
                              disabled={count <= 1}
                              onClick={() => changeCopies(item.id, -1)}
                              aria-label="Fewer copies"
                            >
                              <Minus size={14} />
                            </button>
                            <span>{count}</span>
                            <button
                              type="button"
                              disabled={count >= 99}
                              onClick={() => changeCopies(item.id, 1)}
                              aria-label="More copies"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        )}
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => removeFromQueue(item.id)}
                          aria-label="Remove"
                        >
                          <Trash2 size={15} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="settings">
                <label className="field grow">
                  <span>Label printer</span>
                  <div className="select-wrap">
                    <select
                      value={labelPrinter}
                      onChange={(event) => void pickPrinter(event.target.value)}
                      disabled={printers.length === 0}
                    >
                      <option value="">
                        {printers.length ? "Choose the label printer…" : "No printers detected"}
                      </option>
                      {printers.map((printer) => (
                        <option key={printer.name} value={printer.name}>
                          {printer.name}
                          {printer.isDefault ? " · default" : ""}
                          {printer.offline ? " · offline" : ""}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} />
                  </div>
                </label>
                <label className="field">
                  <span>Label size</span>
                  <div className="select-wrap">
                    <select
                      value={presetKey}
                      onChange={(event) => setPresetKey(event.target.value as LabelPreset["key"])}
                    >
                      {LABEL_PRESETS.map((row) => (
                        <option key={row.key} value={row.key}>
                          {row.label} · {row.hint}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} />
                  </div>
                </label>
                <label className="toggle field">
                  <input
                    type="checkbox"
                    checked={showPrice}
                    onChange={(event) => setShowPrice(event.target.checked)}
                  />
                  Show price
                </label>
              </div>
            </section>

            <section className="card">
              <div className="card-head">
                <div>
                  <h2>Output preview</h2>
                  <p>
                    Exactly the {preset.label} raster that will be printed on the thermal printer.
                  </p>
                </div>
              </div>
              {previews.length === 0 ? (
                <div className="empty">Add a product above to preview the label.</div>
              ) : (
                <div className="preview-wall">
                  {previews.map(({ item, image }) => (
                    <div key={item.id} className="preview-tile">
                      {image ? (
                        <img
                          src={image.dataUrl}
                          alt={`Label preview for ${item.name}`}
                          style={{
                            width: `${Math.round((preset.widthMm / preset.heightMm) * 130)}px`,
                          }}
                        />
                      ) : (
                        <div className="preview-missing">
                          {item.barcode?.trim() ? "Barcode not renderable" : "Missing barcode"}
                        </div>
                      )}
                      <strong>{item.name}</strong>
                      <small>×{Math.max(1, copies[item.id] ?? 1)}</small>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <p className="footnote">
              <Check size={13} />
              Sends the raster straight to <b>{labelPrinter || "the chosen printer"}</b> on this PC —
              nothing opens in a browser.
            </p>
          </>
        )}
      </main>
    </div>
  );
}