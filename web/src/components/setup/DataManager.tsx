"use client";

import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import { getSetupData } from "../../lib/hq-setup";
import { ManagerSkeleton } from "../Skeleton";
import { DataTable, SetupHeader } from "./SetupChrome";

export function DataManager() {
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
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
      <SetupHeader title="Data" copy="What HQ currently holds." />
      <DataTable columns={["Store", "Count"]}>
        {Object.entries(counts).map(([key, value]) => (
          <tr key={key} className="border-b border-pos-border/60">
            <td className="px-4 py-3 capitalize">{key}</td>
            <td className="px-4 py-3 font-medium tabular-nums">{value}</td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}