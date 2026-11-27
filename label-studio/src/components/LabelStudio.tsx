import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  ChevronDown,
  Download,
  Loader2,
  Minus,
  Plus,
  Printer,
  RefreshCw,
  ScanBarcode,
  Search,
  Settings as SettingsIcon,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api, getApiBase, setApiBase } from "../lib/api";
import {
  LABEL_PRESETS,
  detectBarcodeFormat,
  isValidEan13,
  makeValidBarcode,
  renderLabelDataUrl,
  type BarcodeFormat,
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

type PrintHistory = {
  date: string;
  item: HqCatalogItem;
  barcode: string;
  preset: string;
  orientation: string;
  copies: number;
};

const HISTORY_KEY = "label-studio:history";

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function formatBarcodeType(format: Exclude<BarcodeFormat, "auto">) {
  return format === "EAN13" ? "EAN-13" : "Code 128";
}

function barcodeError(value: string, format: BarcodeFormat) {
  const clean = value.trim();
  if (!clean) return "A barcode value is required.";
  if (format === "EAN13" && !isValidEan13(clean)) {
    return "EAN-13 needs exactly 13 digits with a valid check digit.";
  }
  if (!/^[\x20-\x7E]+$/.test(clean)) {
    return "Use plain letters, numbers, or symbols for the barcode.";
  }
  return "";
}

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
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<HqCatalogItem | null>(null);
  const [copies, setCopies] = useState(1);
  const [presetKey, setPresetKey] = useState<LabelPreset["key"]>("40x30");
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");
  const [customWidth, setCustomWidth] = useState(50);
  const [customHeight, setCustomHeight] = useState(25);
  const [barcodeType, setBarcodeType] = useState<BarcodeFormat>("auto");
  const [barcodeOverride, setBarcodeOverride] = useState("");
  const [showPrice, setShowPrice] = useState(true);

  const [printers, setPrinters] = useState<DetectedPrinter[]>([]);
  const [labelPrinter, setLabelPrinter] = useState("");
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiBaseDraft, setApiBaseDraft] = useState(getApiBase());
  const [savingSettings, setSavingSettings] = useState(false);
  const [history, setHistory] = useState<PrintHistory[]>(() => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(HISTORY_KEY) ?? "[]");
      return Array.isArray(parsed) ? (parsed as PrintHistory[]) : [];
    } catch {
      return [];
    }
  });

  const searchRef = useRef<HTMLDivElement>(null);

  const preset = LABEL_PRESETS.find((row) => row.key === presetKey) ?? LABEL_PRESETS[0];
  const widthMm =
    presetKey === "custom"
      ? clamp(customWidth, 20, 120)
      : orientation === "landscape"
        ? preset.widthMm
        : preset.heightMm;
  const heightMm =
    presetKey === "custom"
      ? clamp(customHeight, 20, 120)
      : orientation === "landscape"
        ? preset.heightMm
        : preset.widthMm;

  const loadData = useCallback(async () => {
    setLoading(true);
    setConnected(false);
    try {
      const [catalog, detected, saved] = await Promise.all([
        api<HqCatalogItem[]>("/api/catalog/items"),
        api<DetectedPrinter[]>("/api/hardware/printers").catch(() => []),
        api<{ labelPrinter: string | null }>("/api/hardware/label-printer").catch(() => ({
          labelPrinter: null,
        })),
      ]);
      setItems(catalog);
      setPrinters(detected);
      setLabelPrinter((current) => current || saved.labelPrinter || "");
      setConnected(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Backend offline");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      // History is best-effort only.
    }
  }, [history]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 10);
    return items
      .filter((item) => item.active !== false && matchesQuery(item, q))
      .slice(0, 10);
  }, [items, query]);

  const currentItemCode = selectedItem?.barcode?.trim() ?? "";
  const effectiveBarcode = barcodeOverride.trim() || currentItemCode;
  const barcodeProblem = barcodeError(effectiveBarcode, barcodeType);
  const effectiveFormat =
    barcodeType === "auto"
      ? detectBarcodeFormat(effectiveBarcode || "x")
      : barcodeType;

  const previewImage = useMemo(() => {
    if (!selectedItem || !effectiveBarcode || barcodeProblem) return null;
    try {
      return renderLabelDataUrl({
        barcode: effectiveBarcode,
        name: selectedItem.name,
        price: naira(selectedItem.priceMinor),
        showPrice,
        widthMm,
        heightMm,
        format: barcodeType,
      });
    } catch {
      return null;
    }
  }, [selectedItem, effectiveBarcode, barcodeProblem, showPrice, widthMm, heightMm, barcodeType]);

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

  async function handleGenerateOrPrint() {
    if (!selectedItem) {
      toast.error("Please select a product first.");
      return;
    }
    if (!labelPrinter) {
      toast.error("Pick a label printer first.");
      return;
    }

    setBusy(true);
    try {
      let targetItem = selectedItem;
      let barcode = barcodeOverride.trim() || targetItem.barcode?.trim() || "";

      if (!barcode) {
        const generated = makeValidBarcode(items.map((row) => row.barcode).filter(Boolean) as string[]);
        if (!generated) throw new Error("Could not allocate a free barcode.");

        await api("/api/console/setup/import/catalog", {
          method: "POST",
          body: JSON.stringify({
            rows: [{ id: targetItem.id, name: targetItem.name, barcode: generated }],
          }),
        });

        const updatedItem = { ...targetItem, barcode: generated };
        setItems((current) =>
          current.map((row) => (row.id === updatedItem.id ? updatedItem : row)),
        );
        setSelectedItem(updatedItem);
        setBarcodeOverride("");
        targetItem = updatedItem;
        barcode = generated;
        toast.success(`Barcode ${generated} created for ${updatedItem.name}.`);
      }

      const problem = barcodeError(barcode, barcodeType);
      if (problem) {
        toast.error(problem);
        return;
      }

      const { dataUrl } = renderLabelDataUrl({
        barcode,
        name: targetItem.name,
        price: naira(targetItem.priceMinor),
        showPrice,
        widthMm,
        heightMm,
        format: barcodeType,
      });

      await api<{ ok: true; printer: string; labels: number }>("/api/hardware/print-labels", {
        method: "POST",
        body: JSON.stringify({
          printerName: labelPrinter,
          labels: [{
            imageBase64: dataUrl.split(",")[1] ?? dataUrl,
            widthMm,
            heightMm,
            copies: clamp(copies, 1, 999),
          }],
        }),
      });

      toast.success(`Printed ${copies} label${copies === 1 ? "" : "s"} to ${labelPrinter}.`);
      setHistory((current) => [{
        date: new Date().toLocaleString(),
        item: targetItem,
        barcode,
        preset: preset.label,
        orientation: orientation === "landscape" ? "Landscape" : "Portrait",
        copies: clamp(copies, 1, 999),
      }, ...current].slice(0, 20));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not print the label.");
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings() {
    setSavingSettings(true);
    try {
      setApiBase(apiBaseDraft);
      setSettingsOpen(false);
      toast.success("POS server address saved.");
      await loadData();
    } finally {
      setSavingSettings(false);
    }
  }

  function downloadPNG() {
    if (!previewImage) return;
    const a = document.createElement("a");
    a.href = previewImage.dataUrl;
    a.download = `${selectedItem?.sku || effectiveBarcode || "label"}.png`;
    a.click();
  }

  if (loading) {
    return <div className="ls-full-center">Connecting to the POS backend…</div>;
  }

  return (
    <div className="ls-app">
      <header className="ls-topbar">
        <div className="ls-brand">
          <div className="ls-brand-icon"><ScanBarcode size={22} color="#fff" /></div>
          <h1>Label Studio</h1>
        </div>
        <div className="ls-topbar-right">
          <div className={`ls-status ${connected ? "connected" : "offline"}`}>
            <div className="ls-status-dot" />
            {connected ? "Connected" : "Offline"}
          </div>
          <button
            className="ls-icon-btn"
            onClick={() => void loadData()}
            disabled={loading}
            title="Reconnect to backend"
            aria-label="Reconnect to backend"
          >
            <RefreshCw size={18} className={loading ? "ls-spin" : ""} />
          </button>
          <div className="ls-printer-quick">
            <select
              value={labelPrinter}
              onChange={(e) => pickPrinter(e.target.value)}
              disabled={printers.length === 0}
              className="ls-select-minimal"
            >
              <option value="">{printers.length ? "Select Printer..." : "No printers"}</option>
              {printers.map((p) => (
                <option key={p.name} value={p.name} disabled={p.offline}>
                  {p.name}{p.offline ? " (offline)" : ""}
                </option>
              ))}
            </select>
          </div>
          <button
            className="ls-icon-btn"
            onClick={() => {
              setApiBaseDraft(getApiBase());
              setSettingsOpen(true);
            }}
            title="Settings"
            aria-label="Settings"
          >
            <SettingsIcon size={20} />
          </button>
        </div>
      </header>

      <main className="ls-main">
        <div className="ls-col ls-col-left">
          <div className="ls-panel">
            <h2>Barcode Details</h2>

            <div className="ls-form">
              <div className="ls-form-group full-width" ref={searchRef}>
                <label>Product / Item</label>
                <div className="ls-search-wrap">
                  <Search size={16} className="ls-search-icon" />
                  <input
                    className="ls-input"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setSearchOpen(true);
                    }}
                    onFocus={() => setSearchOpen(true)}
                    placeholder="Search product (name or SKU)..."
                  />
                </div>
                {searchOpen && (
                  <div className="ls-dropdown">
                    {results.length > 0 ? (
                      results.map((item) => (
                        <div
                          key={item.id}
                          className="ls-dropdown-item"
                          onClick={() => {
                            setSelectedItem(item);
                            setQuery(item.name);
                            setBarcodeOverride("");
                            setSearchOpen(false);
                          }}
                        >
                          <div className="ls-di-name">{item.name}</div>
                          <div className="ls-di-meta">{item.sku} {item.barcode && `· ${item.barcode}`}</div>
                        </div>
                      ))
                    ) : (
                      <div className="ls-dropdown-empty">No products found</div>
                    )}
                  </div>
                )}
              </div>

              <div className="ls-form-group full-width">
                <label>Barcode Value</label>
                <input
                  className="ls-input ls-input-plain"
                  value={barcodeOverride}
                  onChange={(e) => setBarcodeOverride(e.target.value)}
                  placeholder={selectedItem?.barcode || "No barcode — one will be generated on print"}
                  disabled={!selectedItem}
                />
                {barcodeProblem && effectiveBarcode ? (
                  <span className="ls-field-error">{barcodeProblem}</span>
                ) : null}
              </div>

              <div className="ls-form-group">
                <label>Barcode Type</label>
                <div className="ls-select-wrap">
                  <select
                    className="ls-select"
                    value={barcodeType}
                    onChange={(e) => setBarcodeType(e.target.value as BarcodeFormat)}
                  >
                    <option value="auto">Auto detect</option>
                    <option value="CODE128">Code 128</option>
                    <option value="EAN13">EAN-13</option>
                  </select>
                  <ChevronDown size={16} className="ls-select-icon" />
                </div>
              </div>

              <div className="ls-form-group">
                <label>Label Size</label>
                <div className="ls-select-wrap">
                  <select
                    className="ls-select"
                    value={presetKey}
                    onChange={(e) => setPresetKey(e.target.value as LabelPreset["key"])}
                  >
                    {LABEL_PRESETS.map((row) => (
                      <option key={row.key} value={row.key}>{row.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="ls-select-icon" />
                </div>
              </div>

              <div className="ls-form-group">
                <label>Orientation</label>
                <div className="ls-select-wrap">
                  <select
                    className="ls-select"
                    value={orientation}
                    disabled={presetKey === "custom"}
                    onChange={(e) => setOrientation(e.target.value as "landscape" | "portrait")}
                  >
                    <option value="landscape">Landscape</option>
                    <option value="portrait">Portrait</option>
                  </select>
                  <ChevronDown size={16} className="ls-select-icon" />
                </div>
              </div>

              {presetKey === "custom" ? (
                <div className="ls-form-group full-width ls-custom-size">
                  <label>Custom size (mm)</label>
                  <div className="ls-custom-size-row">
                    <input
                      type="number"
                      min={20}
                      max={120}
                      value={customWidth}
                      onChange={(e) => setCustomWidth(clamp(Number(e.target.value), 20, 120))}
                    />
                    <span>x</span>
                    <input
                      type="number"
                      min={20}
                      max={120}
                      value={customHeight}
                      onChange={(e) => setCustomHeight(clamp(Number(e.target.value), 20, 120))}
                    />
                  </div>
                </div>
              ) : null}

              <div className="ls-form-group">
                <label>Quantity</label>
                <div className="ls-stepper">
                  <button onClick={() => setCopies(clamp(copies - 1, 1, 999))}><Minus size={16}/></button>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={copies}
                    onChange={(e) => setCopies(clamp(Number(e.target.value), 1, 999))}
                  />
                  <button onClick={() => setCopies(clamp(copies + 1, 1, 999))}><Plus size={16}/></button>
                </div>
              </div>

              <div className="ls-form-group">
                <label>Printer</label>
                <div className="ls-select-wrap">
                  <select
                    className="ls-select"
                    value={labelPrinter}
                    onChange={(e) => pickPrinter(e.target.value)}
                  >
                    <option value="">Select Printer</option>
                    {printers.map((p) => (
                      <option key={p.name} value={p.name} disabled={p.offline}>
                        {p.name}{p.offline ? " (offline)" : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="ls-select-icon" />
                </div>
              </div>

              <div className="ls-form-group full-width">
                <label>Label content</label>
                <label className="ls-check">
                  <input
                    type="checkbox"
                    checked={showPrice}
                    onChange={(e) => setShowPrice(e.target.checked)}
                  />
                  <span>Print the selling price on the label</span>
                </label>
              </div>
            </div>

            <button
              className="ls-btn-primary ls-generate-btn"
              onClick={() => void handleGenerateOrPrint()}
              disabled={busy || !selectedItem || (Boolean(effectiveBarcode) && Boolean(barcodeProblem))}
            >
              {busy ? <Loader2 size={20} className="ls-spin" /> : <ScanBarcode size={20} />}
              {selectedItem && !effectiveBarcode ? "Generate & Print Barcode" : "Print Barcode"}
            </button>
          </div>
        </div>

        <div className="ls-col ls-col-right">
          <div className="ls-panel">
            <h2>Preview</h2>
            <div className="ls-preview-box">
              {previewImage ? (
                <div className="ls-preview-render">
                  <img src={previewImage.dataUrl} alt="Label Preview" />
                </div>
              ) : (
                <div className="ls-preview-empty">
                  {!selectedItem
                    ? "Select a product to preview"
                    : !effectiveBarcode
                      ? "Generate a barcode to preview the label"
                      : barcodeProblem || "Preview unavailable for this barcode"}
                </div>
              )}
            </div>

            <div className="ls-preview-meta">
              <div className="ls-pm-item">
                <div className="ls-pm-label">Type</div>
                <div className="ls-pm-value">{formatBarcodeType(effectiveFormat)}</div>
              </div>
              <div className="ls-pm-item">
                <div className="ls-pm-label">Size</div>
                <div className="ls-pm-value">
                  {presetKey === "custom" ? `${widthMm} x ${heightMm} mm` : preset.label}
                </div>
              </div>
              <div className="ls-pm-item">
                <div className="ls-pm-label">Orientation</div>
                <div className="ls-pm-value">
                  {presetKey === "custom" ? "Custom" : orientation === "landscape" ? "Landscape" : "Portrait"}
                </div>
              </div>
              <div className="ls-pm-item">
                <div className="ls-pm-label">Copies</div>
                <div className="ls-pm-value">{clamp(copies, 1, 999)}</div>
              </div>
            </div>

            <div className="ls-preview-actions">
              <button
                className="ls-btn-primary"
                onClick={() => void handleGenerateOrPrint()}
                disabled={busy || !selectedItem || (Boolean(effectiveBarcode) && Boolean(barcodeProblem))}
              >
                <Printer size={18} /> Print Label
              </button>
              <button
                className="ls-btn-secondary"
                onClick={downloadPNG}
                disabled={!previewImage}
              >
                <Download size={18} /> Download PNG
              </button>
            </div>
          </div>

          <div className="ls-panel">
            <div className="ls-panel-header">
              <h2>Recent Barcodes</h2>
              {history.length > 0 ? (
                <button
                  className="ls-link-btn"
                  onClick={() => setHistory([])}
                  title="Clear print history"
                >
                  <Trash2 size={14} /> Clear
                </button>
              ) : null}
            </div>
            {history.length > 0 ? (
              <div className="ls-table-wrap">
                <table className="ls-table">
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>Product / SKU</th>
                      <th>Barcode</th>
                      <th>Size</th>
                      <th>Copies</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h, i) => (
                      <tr key={`${h.date}-${h.barcode}-${i}`}>
                        <td>{h.date}</td>
                        <td>{h.item.name}</td>
                        <td>{h.barcode}</td>
                        <td>{h.preset}</td>
                        <td>{h.copies}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="ls-empty-text">No recent barcodes.</div>
            )}
          </div>
        </div>
      </main>

      {settingsOpen ? (
        <div
          className="ls-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSettingsOpen(false);
          }}
        >
          <div className="ls-modal" role="dialog" aria-modal="true" aria-labelledby="ls-settings-title">
            <div className="ls-modal-head">
              <h2 id="ls-settings-title">Settings</h2>
              <button className="ls-icon-btn" onClick={() => setSettingsOpen(false)} aria-label="Close settings">
                <X size={20} />
              </button>
            </div>
            <div className="ls-modal-body">
              <label htmlFor="ls-api-base">POS backend address</label>
              <input
                id="ls-api-base"
                className="ls-input ls-input-plain"
                value={apiBaseDraft}
                onChange={(e) => setApiBaseDraft(e.target.value)}
                placeholder="http://192.168.1.20:3001"
              />
              <p className="ls-field-hint">
                Use the address of the machine running the POS API. Leave blank to use the app default.
              </p>

              <div className="ls-modal-section">
                <div className="ls-modal-section-title">Detected printers</div>
                {printers.length > 0 ? (
                  <div className="ls-printer-list">
                    {printers.map((printer) => (
                      <button
                        key={printer.name}
                        className={`ls-printer-row ${labelPrinter === printer.name ? "selected" : ""}`}
                        disabled={printer.offline}
                        onClick={() => void pickPrinter(printer.name)}
                      >
                        <span>
                          <strong>{printer.name}</strong>
                          <small>{printer.driver || "Generic printer"}</small>
                        </span>
                        <span className={printer.offline ? "ls-offline" : "ls-online"}>
                          {printer.offline ? "Offline" : "Ready"}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="ls-field-hint">
                    No printers detected. Start the backend print service, then reconnect.
                  </p>
                )}
              </div>
            </div>
            <div className="ls-modal-actions">
              <button
                className="ls-btn-secondary"
                onClick={() => {
                  setApiBase("");
                  setApiBaseDraft(getApiBase());
                  toast.success("Backend address reset.");
                  void loadData();
                }}
              >
                Use default
              </button>
              <button
                className="ls-btn-primary"
                disabled={savingSettings || !apiBaseDraft.trim()}
                onClick={() => void saveSettings()}
              >
                {savingSettings ? <Loader2 size={16} className="ls-spin" /> : null}
                Save settings
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}