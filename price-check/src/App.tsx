import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  Camera,
  ScanBarcode,
  Search,
  Settings,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { getApiBase, setApiBase } from "./lib/api";
import { findItem, useLiveCatalog } from "./lib/catalog";
import { canScanCamera, startCameraScan } from "./lib/scan";
import { formatMoney } from "./lib/types";
import { formatPricePer, formatStock } from "./lib/units";
import { productImageSrc } from "./lib/product-image";

export default function App() {
  const { items, live, error, reconnect } = useLiveCatalog();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [missing, setMissing] = useState("");
  const [flash, setFlash] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [serverDraft, setServerDraft] = useState(getApiBase);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastPrice = useRef<number | null>(null);

  const item = items.find((entry) => entry.id === selectedId) ?? null;

  useEffect(() => {
    inputRef.current?.focus();
  }, [cameraOpen, settingsOpen]);

  useEffect(() => {
    lastPrice.current = null;
  }, [selectedId]);

  useEffect(() => {
    if (!item) return;
    if (lastPrice.current != null && lastPrice.current !== item.priceMinor) {
      setFlash(true);
      const timer = window.setTimeout(() => setFlash(false), 900);
      lastPrice.current = item.priceMinor;
      return () => window.clearTimeout(timer);
    }
    lastPrice.current = item.priceMinor;
  }, [item]);

  useEffect(() => {
    if (error) toast.error(`${error} Open Settings to set the POS server.`);
  }, [error]);

  function lookup(raw: string) {
    const value = raw.trim();
    if (!value) return;
    const match = findItem(items, value);
    if (match) {
      setSelectedId(match.id);
      setMissing("");
      setQuery("");
    } else {
      setSelectedId(null);
      setMissing(value);
      toast.error(`No match for ${value}`);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    lookup(query);
  }

  function saveServer() {
    setApiBase(serverDraft);
    setSettingsOpen(false);
    toast.success("Server saved.");
    reconnect();
  }

  return (
    <div className="pc">
      <header className="pc-top">
        <div>
          <p className="pc-kicker">The Place — Victoria Island</p>
          <h1>Price Check</h1>
        </div>
        <div className="pc-top-actions">
          <span className={`pc-live ${live ? "on" : "off"}`}>
            {live ? <Wifi size={16} /> : <WifiOff size={16} />}
            {live ? "Live" : "Offline"}
          </span>
          <button
            className="pc-icon-btn"
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      <form className="pc-search" onSubmit={onSubmit}>
        <ScanBarcode size={22} />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Scan barcode or type name / SKU"
          autoComplete="off"
          inputMode="search"
          autoFocus
        />
        <button type="submit" className="pc-icon-btn" aria-label="Search">
          <Search size={20} />
        </button>
        {canScanCamera() && (
          <button
            type="button"
            className="pc-camera"
            onClick={() => setCameraOpen(true)}
          >
            <Camera size={18} /> Scan
          </button>
        )}
      </form>

      {error && <p className="pc-banner">{error} Open Settings to set the POS server.</p>}

      {item ? (
        <article className="pc-card">
          <img src={productImageSrc(item.id, item.image)} alt="" />
          <div className="pc-card-body">
            <p className="pc-cat">{item.category}</p>
            <h2>{item.name}</h2>
            <p className="pc-meta">
              {item.sku} · {item.barcode}
            </p>
            <p className={`pc-price ${flash ? "flash" : ""}`}>
              {formatMoney(item.priceMinor, item.currency)}
              <span className="pc-price-unit">
                {" "}
                {formatPricePer(item.unit ?? "each", item.unitLabel)}
              </span>
            </p>
            <p className={`pc-stock ${item.onHand > 0 ? "in" : "out"}`}>
              {item.onHand > 0
                ? `${formatStock(item.onHand, item.unit ?? "each", item.packSize ?? 1, item.unitLabel)} in stock`
                : "Out of stock"}
            </p>
          </div>
        </article>
      ) : missing ? (
        <div className="pc-empty">
          <h2>No item found</h2>
          <p>Nothing matches “{missing}”. Try the barcode, SKU, or name.</p>
        </div>
      ) : (
        <div className="pc-empty">
          <ScanBarcode size={48} />
          <h2>Ready to scan</h2>
          <p>
            USB scanners work on Windows. On a phone, tap Scan or type a SKU.
          </p>
          {items.length > 0 && (
            <div className="pc-samples">
              {items.slice(0, 4).map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => lookup(sample.barcode)}
                >
                  {sample.name}
                  <span>{sample.barcode}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {cameraOpen && (
        <CameraSheet
          onClose={() => setCameraOpen(false)}
          onCode={(code) => {
            setCameraOpen(false);
            lookup(code);
          }}
        />
      )}

      {settingsOpen && (
        <div className="pc-sheet" onClick={() => setSettingsOpen(false)}>
          <div className="pc-panel" onClick={(event) => event.stopPropagation()}>
            <header>
              <h2>Connect to POS</h2>
              <button className="pc-icon-btn" onClick={() => setSettingsOpen(false)}>
                <X size={20} />
              </button>
            </header>
            <p>
              Leave blank on this PC if the backend is on port 3001. On a phone,
              enter the till computer, for example http://192.168.1.20:3001
            </p>
            <label>
              Server URL
              <input
                value={serverDraft}
                onChange={(event) => setServerDraft(event.target.value)}
                placeholder="http://192.168.1.20:3001"
              />
            </label>
            <button className="pc-save" onClick={saveServer}>
              Save and reconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CameraSheet({
  onClose,
  onCode,
}: {
  onClose: () => void;
  onCode: (value: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onCodeRef = useRef(onCode);
  const [camError, setCamError] = useState("");
  onCodeRef.current = onCode;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let stop: (() => void) | undefined;
    startCameraScan(video, (code) => onCodeRef.current(code))
      .then((cleanup) => {
        stop = cleanup;
      })
      .catch((err: unknown) => {
        setCamError(
          err instanceof Error
            ? err.message
            : "Camera needs HTTPS, or type the barcode instead.",
        );
      });
    return () => stop?.();
  }, []);

  return (
    <div className="pc-sheet">
      <div className="pc-panel cam">
        <header>
          <h2>Scan barcode</h2>
          <button className="pc-icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        {camError ? <p>{camError}</p> : <video ref={videoRef} playsInline muted />}
      </div>
    </div>
  );
}
