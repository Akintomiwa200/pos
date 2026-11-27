# Label Studio

Label printing utility for HQ and store staff (Vite + React). It searches the POS
catalog, validates/generates barcodes, renders a real label preview, and sends
the finished image to a detected Windows label printer through the POS backend.

```bash
pnpm install
pnpm dev
```

Open http://localhost:1431 and set the POS backend address in **Settings** if it
is not running on `http://127.0.0.1:3001`. The address is saved in this browser.

Windows executable: see **[docs/build](../docs/build/README.md)**.

```bash
pnpm tauri:build
```

## What it does

- Search products by name, SKU, barcode, or category.
- Generate a free EAN-13 barcode and save it to the catalog when a product has none.
- Enter or override a barcode, choose Auto/Code 128/EAN-13, and validate before printing.
- Choose preset or custom label sizes, orientation, copies, and whether to print the price.
- Preview the exact rendered PNG before sending it to the printer.
- Pick a detected printer, see offline printers, and keep a local print history.

The backend must be running for catalog search and printing. Printer detection
uses the POS backend on the machine that owns the printers.
