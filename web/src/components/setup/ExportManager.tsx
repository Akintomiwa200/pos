"use client";

import { useState } from "react";
import { toast } from "sonner";
import { exportSetup } from "../../lib/hq-setup";
import { SlideOver } from "../SlideOver";
import { Field, PrimaryButton, SetupHeader, fieldClass } from "./SetupChrome";

function download(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ExportManager() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"org" | "catalog" | "sales" | "all">("org");
  const [busy, setBusy] = useState(false);

  return (
    <div>
      <SetupHeader
        title="Export"
        copy="Download HQ JSON for backup or another site. Sales are tickets posted from tills."
        action={<PrimaryButton onClick={() => setOpen(true)}>Export</PrimaryButton>}
      />
      <div className="rounded-2xl bg-pos-surface p-5 text-sm text-pos-ink-muted shadow-pos-md">
        <p>Company, branches, stores, tax, settings, catalog, and sales can leave as a JSON file.</p>
      </div>
      <SlideOver
        open={open}
        title="Export"
        onClose={() => setOpen(false)}
        footer={
          <PrimaryButton
            className="w-full"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const data = await exportSetup(kind);
                download(`pos-${kind}.json`, data);
                setOpen(false);
                toast.success("Export downloaded.");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Export failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            Download JSON
          </PrimaryButton>
        }
      >
        <Field label="What to export">
          <select
            className={fieldClass}
            value={kind}
            onChange={(event) => setKind(event.target.value as typeof kind)}
          >
            <option value="org">Company, branches, stores, tax, settings</option>
            <option value="catalog">Catalog</option>
            <option value="sales">Sales</option>
            <option value="all">Everything</option>
          </select>
        </Field>
      </SlideOver>
    </div>
  );
}
