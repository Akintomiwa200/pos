"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

/** Real Code 128 barcode with human-readable value under the bars. */
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
    <div className="flex flex-col items-center gap-0.5">
      <svg ref={svgRef} className="max-w-full" role="img" aria-label={`Barcode ${code}`} />
    </div>
  );
}
