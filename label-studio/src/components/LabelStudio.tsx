import { useEffect, useMemo, useState, useRef } from "react";
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
  Download,
  Wifi,
  WifiOff,
  Settings as SettingsIcon,
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<HqCatalogItem | null>(null);
  const [copies, setCopies] = useState(1);
  const [presetKey, setPresetKey] = useState<LabelPreset["key"]>("40x30");
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");
  
  const [printers, setPrinters] = useState<DetectedPrinter[]>([]);
  const [labelPrinter, setLabelPrinter] = useState("");
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [history, setHistory] = useState<{ date: string; item: HqCatalogItem; preset: string; orientation: string }[]>([]);

  const searchRef = useRef<HTMLDivElement>(null);

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

  const currentItemCode = selectedItem?.barcode?.trim();

  const previewImage = useMemo(() => {
    if (!selectedItem) return null;
    try {
      const w = orientation === "landscape" ? preset.widthMm : preset.heightMm;
      const h = orientation === "landscape" ? preset.heightMm : preset.widthMm;
      
      return renderLabelDataUrl({
        barcode: currentItemCode || "1234567890", // placeholder if none
        name: selectedItem.name,
        price: naira(selectedItem.priceMinor),
        showPrice: true,
        widthMm: w,
        heightMm: h,
      });
    } catch {
      return null;
    }
  }, [selectedItem, currentItemCode, preset, orientation]);

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
    
    let targetItem = selectedItem;

    if (!currentItemCode) {
      // Generate barcode first
      try {
        setBusy(true);
        const used = items.map((row) => row.barcode).filter(Boolean) as string[];
        const barcode = makeValidBarcode(used);
        if (!barcode) throw new Error("Could not allocate a free barcode.");
        
        await api("/api/console/setup/import/catalog", {
          method: "POST",
          body: JSON.stringify({
            rows: [{ id: targetItem.id, name: targetItem.name, barcode }],
          }),
        });
        
        const updatedItem = { ...targetItem, barcode };
        setItems((current) =>
          current.map((row) => (row.id === updatedItem.id ? updatedItem : row)),
        );
        setSelectedItem(updatedItem);
        targetItem = updatedItem;
        toast.success(`Barcode ${barcode} created for ${updatedItem.name}.`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not generate the barcode.");
        setBusy(false);
        return;
      }
    }

    // Now Print
    if (!labelPrinter) {
      toast.error("Pick a label printer first.");
      setBusy(false);
      return;
    }

    try {
      setBusy(true);
      const w = orientation === "landscape" ? preset.widthMm : preset.heightMm;
      const h = orientation === "landscape" ? preset.heightMm : preset.widthMm;
      
      const { dataUrl } = renderLabelDataUrl({
        barcode: targetItem.barcode!.trim(),
        name: targetItem.name,
        price: naira(targetItem.priceMinor),
        showPrice: true,
        widthMm: w,
        heightMm: h,
      });

      await api<{ ok: true; printer: string; labels: number }>("/api/hardware/print-labels", {
        method: "POST",
        body: JSON.stringify({
          printerName: labelPrinter,
          labels: [{
            imageBase64: dataUrl.split(",")[1] ?? dataUrl,
            widthMm: w,
            heightMm: h,
            copies: Math.max(1, copies),
          }]
        }),
      });

      toast.success(`Printed ${copies} label${copies === 1 ? "" : "s"} to ${labelPrinter}.`);
      
      // Add to history
      setHistory(curr => [{
        date: new Date().toLocaleString(),
        item: targetItem,
        preset: preset.label,
        orientation: orientation === "landscape" ? "Landscape" : "Portrait",
      }, ...curr].slice(0, 10));

    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not print the label.");
    } finally {
      setBusy(false);
    }
  }

  function downloadPNG() {
    if (!previewImage) return;
    const a = document.createElement("a");
    a.href = previewImage.dataUrl;
    a.download = `${selectedItem?.sku || "label"}.png`;
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
          <div className="ls-printer-quick">
            <select
              value={labelPrinter}
              onChange={(e) => pickPrinter(e.target.value)}
              disabled={printers.length === 0}
              className="ls-select-minimal"
            >
              <option value="">{printers.length ? "Select Printer..." : "No printers"}</option>
              {printers.map((p) => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>
          <button className="ls-icon-btn"><SettingsIcon size={20} /></button>
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
                      results.map(item => (
                        <div
                          key={item.id}
                          className="ls-dropdown-item"
                          onClick={() => {
                            setSelectedItem(item);
                            setQuery(item.name);
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

              <div className="ls-form-group">
                <label>Barcode Type</label>
                <div className="ls-select-wrap">
                  <select className="ls-select" disabled>
                    <option>Code 128</option>
                    <option>EAN-13</option>
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
                    onChange={(e) => setOrientation(e.target.value as any)}
                  >
                    <option value="landscape">Landscape</option>
                    <option value="portrait">Portrait</option>
                  </select>
                  <ChevronDown size={16} className="ls-select-icon" />
                </div>
              </div>

              <div className="ls-form-group">
                <label>Quantity</label>
                <div className="ls-stepper">
                  <button onClick={() => setCopies(Math.max(1, copies - 1))}><Minus size={16}/></button>
                  <input type="number" value={copies} readOnly />
                  <button onClick={() => setCopies(Math.min(999, copies + 1))}><Plus size={16}/></button>
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
                      <option key={p.name} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="ls-select-icon" />
                </div>
              </div>

              <div className="ls-form-group full-width">
                <label>Label Template</label>
                <div className="ls-select-wrap">
                  <select className="ls-select" disabled>
                    <option>Standard Label ({preset.label})</option>
                  </select>
                  <ChevronDown size={16} className="ls-select-icon" />
                </div>
              </div>
            </div>

            <button 
              className="ls-btn-primary ls-generate-btn" 
              onClick={handleGenerateOrPrint}
              disabled={busy || !selectedItem}
            >
              {busy ? <Loader2 size={20} className="ls-spin" /> : <ScanBarcode size={20} />}
              {selectedItem && !currentItemCode ? "Generate & Print Barcode" : "Print Barcode"}
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
                  Select a product to preview
                </div>
              )}
            </div>

            <div className="ls-preview-meta">
              <div className="ls-pm-item">
                <div className="ls-pm-label">Type</div>
                <div className="ls-pm-value">Code 128</div>
              </div>
              <div className="ls-pm-item">
                <div className="ls-pm-label">Size</div>
                <div className="ls-pm-value">{preset.label}</div>
              </div>
              <div className="ls-pm-item">
                <div className="ls-pm-label">Orientation</div>
                <div className="ls-pm-value">{orientation === "landscape" ? "Landscape" : "Portrait"}</div>
              </div>
            </div>

            <div className="ls-preview-actions">
              <button 
                className="ls-btn-primary" 
                onClick={handleGenerateOrPrint}
                disabled={busy || !selectedItem}
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
            <h2>Recent Barcodes</h2>
            {history.length > 0 ? (
              <div className="ls-table-wrap">
                <table className="ls-table">
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>Product / SKU</th>
                      <th>Size</th>
                      <th>Orientation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h, i) => (
                      <tr key={i}>
                        <td>{h.date}</td>
                        <td>{h.item.name}</td>
                        <td>{h.preset}</td>
                        <td>{h.orientation}</td>
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
    </div>
  );
}