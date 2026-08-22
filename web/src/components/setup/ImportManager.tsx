"use client";

import { useState } from "react";
import { toast } from "@/lib/toast";
import { parseNairaInput } from "@/lib/catalog";
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
    const sell = Number(row.price || row.selling || row.sell || row.pricenaira || "0");
    const cost = Number(row.cost || row.costprice || row.costnaira || "0");
    return {
      name: row.name,
      category: row.category,
      sku: row.sku,
      barcode: row.barcode,
      batchNumber: row.batch || row.batchnumber || row.lot,
      subcategory: row.subcategory || row.sub || row.subgroup,
      costMinor: Math.round((Number.isFinite(cost) ? cost : 0) * 100),
      priceMinor: Math.round((Number.isFinite(sell) ? sell : 0) * 100),
      onHand: Number(row.onhand || row.stock || row.qty || "0"),
      reorderLevel: Number(row.reorder || row.reorderlevel || "5"),
      unit: row.unit || "each",
      unitLabel: row.unitlabel || row.unitLabel,
      packSize: Number(row.packsize || row.packSize || "1"),
      description: row.description || row.notes,
      expiresAt: row.expires || row.expiry || row.expiresat,
    };
  });
}

export function ImportManager() {
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState(
    "name,category,subcategory,sku,barcode,batch,cost,price,onHand,reorderLevel,unit,unitLabel,packSize,expiresAt\n",
  );
  const [busy, setBusy] = useState(false);

  return (
    <div>
      <SetupHeader
        title="Import"
        copy="Import catalog rows. Blank SKU/barcode are auto-generated. Columns: name, category, sku, barcode, batch, cost, price, onHand, reorderLevel, unit, expiresAt."
        action={<PrimaryButton onClick={() => setOpen(true)}>Import catalog</PrimaryButton>}
      />
      <div className="rounded-2xl bg-pos-surface p-5 text-sm text-pos-ink-muted shadow-pos-md">
        <p>
          Paste CSV in the panel. Duplicate SKU or barcode updates the existing item. Cost and selling
          prices are in naira. Barcodes auto-generate when left blank.
        </p>
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
                toast.error(err, "Import failed");
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
