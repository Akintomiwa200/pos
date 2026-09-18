import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

export function ReceiptBarcode({
  value,
  width = 1.4,
  height = 42,
}: {
  value: string;
  width?: number;
  height?: number;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const code = value.trim() || "0000";

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    try {
      JsBarcode(el, code, {
        format: "CODE128",
        displayValue: true,
        fontSize: 11,
        textMargin: 2,
        margin: 0,
        width,
        height,
        background: "transparent",
        lineColor: "#111827",
      });
    } catch {
      el.replaceChildren();
    }
  }, [code, width, height]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg ref={svgRef} role="img" aria-label={`Barcode ${code}`} style={{ maxWidth: "100%" }} />
    </div>
  );
}
