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
import AdsScreen from "./AdsScreen";

// How long a matched product stays on screen before the kiosk falls back to
// the ad rotation. Any new scan resets this.
const RESULT_DISPLAY_MS = 15000;

export default function App() {
  const { items, live, error, reconnect } = useLiveCatalog();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  // Idle timeout: after a match is shown, fall back to the ad rotation on
  // its own so the kiosk never gets stuck sitting on one product.
  useEffect(() => {
    if (!selectedId) return;
    const timer = window.setTimeout(() => setSelectedId(null), RESULT_DISPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [selectedId]);

  function lookup(raw: string) {
    const value = raw.trim();
    if (!value) return;
    const match = findItem(items, value);
    if (match) {
      setSelectedId(match.id);
      setQuery("");
    } else {
      // No match: never leave the ad screen for a "not found" page. Just
      // toast the error and make sure we're back on (or still on) ads.
      setSelectedId(null);
      setQuery("");
      toast.error(`No match for "${value}"`);
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
    <div className="pc-fullscreen">
      <form
        className="pc-search-hidden"
        onSubmit={onSubmit}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
          inputMode="search"
          autoFocus
          onBlur={() => {
            setTimeout(() => inputRef.current?.focus(), 10);
          }}
        />
      </form>

      <div className="pc-settings-corner">
        <button
          className="pc-icon-btn pc-settings-btn"
          onClick={() => setSettingsOpen(true)}
          aria-label="Settings"
        >
          <Settings size={20} />
        </button>
        {error && <span className="pc-error-dot" title={`${error} Open Settings to set the POS server.`} />}
      </div>

      {item ? (
        <div className="pc-result-fullscreen">
          <div className="pc-result-layout">
            <div className="pc-result-left">
              <div className="pc-result-image-card">
                <img src={productImageSrc(item.id, item.image)} alt="" />
              </div>
            </div>
            <div className="pc-result-right">
              <div className="pc-result-header">
                <h1>Today&apos;s Price</h1>
                <p>Please scan the barcode</p>
              </div>

              <div className="pc-result-info-card">
                <h2>{item.name}</h2>
                <div className={`pc-result-price ${flash ? "flash" : ""}`}>
                  {formatMoney(item.priceMinor, item.currency)}
                </div>
                <div className="pc-result-meta">
                  Stock: {item.onHand} {item.unitLabel || "PCS"} | PVP IVA INCLUIDO {item.barcode}
                </div>
              </div>

              <div className="pc-result-footer">
                <div className="pc-result-scan-icon">
                  <ScanBarcode size={48} />
                </div>
                <div className="pc-result-footer-text">
                  PROVIDE YOU WITH THE MOST<br />FAVORABLE PRICE
                </div>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="pc-result-close"
            onClick={() => setSelectedId(null)}
            aria-label="Back to ads"
          >
            <X size={24} />
          </button>
        </div>
      ) : (
        <AdsScreen />
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
    let cancelled = false;
    startCameraScan(video, (code) => onCodeRef.current(code))
      .then((cleanup) => {
        if (cancelled) {
          cleanup();
          return;
        }
        stop = cleanup;
      })
      .catch((err: unknown) => {
        setCamError(
          err instanceof Error
            ? err.message
            : "Camera needs HTTPS, or type the barcode instead.",
        );
      });
    return () => {
      cancelled = true;
      stop?.();
    };
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
