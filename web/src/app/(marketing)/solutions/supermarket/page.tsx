import VerticalPage from "../_vertical";

export default function Page() {
  return (
    <VerticalPage
      kicker="Solutions · Supermarket"
      title="Barcode-first grocery."
      copy="Heavy SKU counts, receiving, and shrink. The till stays a counter, not a table map."
      points={[
        "Scan to sell; require barcodes in Settings when you want no open-price taps.",
        "Purchase invoices, stock transfer, and bin cards live in HQ reports.",
        "One till code per register. Activating on a new PC signs the old one out.",
      ]}
    />
  );
}
