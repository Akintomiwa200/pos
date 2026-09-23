"use client";

import { useEffect, useState } from "react";
import { listBranches } from "./hq-setup";

/** Active branches as { id, name }, for per-branch price pickers. */
export function useBranches() {
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    let cancelled = false;
    void listBranches()
      .then((rows) => {
        if (cancelled) return;
        setBranches(
          rows
            .filter((row) => row.id && row.name)
            .map((row) => ({ id: row.id, name: row.name })),
        );
      })
      .catch(() => {
        if (!cancelled) setBranches([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return branches;
}