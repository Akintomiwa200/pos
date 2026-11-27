import { useEffect, useState, type CSSProperties } from "react";
import { ScanBarcode } from "lucide-react";
import { ads, AD_DURATION_MS } from "./lib/ads";

export default function AdsScreen() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (ads.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % ads.length);
    }, AD_DURATION_MS);
    return () => window.clearInterval(timer);
  }, []);

  const ad = ads[index];
  if (!ad) return null;

  return (
    <div className="pc-ads" style={{ "--ad-accent": ad.accent } as CSSProperties}>
      {/* key={ad.id} forces a remount so the fade-in animation replays each slide */}
      <div className="pc-ads-slide" key={ad.id}>
        <p className="pc-ads-eyebrow">{ad.eyebrow}</p>
        <h2>{ad.title}</h2>
        <p className="pc-ads-sub">{ad.subtitle}</p>
        {ad.sample ? (
          <span
            className="pc-ads-eyebrow"
            style={{
              display: "inline-block",
              margin: "18px 0 0",
              padding: "5px 14px",
              border: "1px solid rgba(255, 255, 255, 0.45)",
              borderRadius: 999,
              fontSize: 12,
              letterSpacing: "0.1em",
            }}
          >
            Sample promotion · illustrative only
          </span>
        ) : null}
      </div>

      {ads.length > 1 && (
        <div className="pc-ads-dots" role="tablist" aria-label="Ad slide">
          {ads.map((entry, i) => (
            <span key={entry.id} className={i === index ? "on" : ""} />
          ))}
        </div>
      )}

      <div className="pc-ads-hint">
        <ScanBarcode size={18} />
        Scan any item to check its price
      </div>
    </div>
  );
}
