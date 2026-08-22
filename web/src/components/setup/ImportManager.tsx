"use client";

import { useState } from "react";
import { toast } from "sonner";
import { importCatalogRows } from "../../lib/hq-setup";
import { SlideOver } from "../SlideOver";
import { Field, PrimaryButton, SetupHeader, fieldClass } from "./SetupChrome";

function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0]!.split(",").map((cell) => cell.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((cell) => cell.trim());
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] ?? "";
    });
    const naira = Number(row.price || row.pricenaira || "0");
    return {
      name: row.name,
      category: row.category,
      sku: row.sku,
      barcode: row.barcode,
      priceMinor: Math.round((Number.isFinite(naira) ? naira : 0) * 100),
      onHand: Number(row.onhand || row.stock || "0"),
    };
  });
}

export function ImportManager() {
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState("name,category,sku,barcode,price,onHand\n");
  const [busy, setBusy] = useState(false);

  return (
    <div>
      <SetupHeader
        title="Import"
        copy="Bring catalog rows into HQ. Columns: name, category, sku, barcode, price (naira), onHand."
        action={<PrimaryButton onClick={() => setOpen(true)}>Import catalog</PrimaryButton>}
      />
      <div className="rounded-2xl bg-pos-surface p-5 text-sm text-pos-ink-muted shadow-pos-md">
        <p>Paste CSV in the panel, or type a header row then your items. Duplicate SKU or barcode updates the existing item.</p>
      </div>
      <SlideOver
        open={open}
        title="Import catalog"
        onClose={() => setOpen(false)}
        footer={
          <PrimaryButton
            className="w-full"
            disabled={busy}
            onClick={async () => {
              const rows = parseCsv(csv);
              if (!rows.length) {
                toast.error("Add at least one data row.");
                return;
              }
              setBusy(true);
              try {
                const result = await importCatalogRows(rows);
                setOpen(false);
                toast.success(`Imported ${result.created} new, updated ${result.updated}.`);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Import failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            Import
          </PrimaryButton>
        }
      >
        <Field label="CSV">
          <textarea
            className={`${fieldClass} min-h-[280px] font-mono text-[12px]`}
            value={csv}
            onChange={(event) => setCsv(event.target.value)}
          />
        </Field>
      </SlideOver>
    </div>
  );
}
