"use client";

import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import { getSetupData, purgeCatalogSeed } from "../../lib/hq-setup";
import { ManagerSkeleton } from "../Skeleton";
import { SlideOver } from "../SlideOver";
import { DataTable, PrimaryButton, SetupHeader } from "./SetupChrome";

export function DataManager() {
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  async function load() {
    setCounts(await getSetupData());
    setReady(true);
  }

  useEffect(() => {
    load().catch((err) => {
      toast.error(err, "Could not load data");
      setReady(true);
    });
  }, []);

  if (!ready) return <ManagerSkeleton variant="list" />;
  if (!counts) {
    return (
      <div>
        <SetupHeader title="Data" copy="HQ API is not reachable. Start the backend on port 3001." />
      </div>
    );
  }

  return (
    <div>
      <SetupHeader
        title="Data"
        copy="What HQ currently holds. Reset catalog to the seed list if you need a clean till demo."
        action={<PrimaryButton onClick={() => setOpen(true)}>Catalog reset</PrimaryButton>}
      />
      <DataTable columns={["Store", "Count"]}>
        {Object.entries(counts).map(([key, value]) => (
          <tr key={key} className="border-b border-pos-border/60">
            <td className="px-4 py-3 capitalize">{key}</td>
            <td className="px-4 py-3 font-medium tabular-nums">{value}</td>
          </tr>
        ))}
      </DataTable>
      <SlideOver
        open={open}
        title="Reset catalog"
        subtitle="Items go back to the demo seed. Sales and tills are not touched."
        onClose={() => setOpen(false)}
        footer={
          <PrimaryButton
            className="w-full"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const result = await purgeCatalogSeed();
                await load();
                setOpen(false);
                toast.success(`Catalog reset. ${result.total} items.`);
              } catch (err) {
                toast.error(err, "Could not reset catalog");
              } finally {
                setBusy(false);
              }
            }}
          >
            Reset catalog to seed
          </PrimaryButton>
        }
      >
        <p className="text-sm text-pos-ink-muted">
          Use this after a bad import. Live tills refresh from the catalog stream.
        </p>
      </SlideOver>
    </div>
  );
}
