"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deletePolicy,
  listPolicies,
  savePolicy,
  type PolicyKind,
  type PolicyRecord,
} from "./hq-policies";

/**
 * Live CRUD binding for a persisted producer collection. The backend stores
 * these records in data/policies.json, so edits survive refresh and navigation.
 */
export function usePolicyCollection(kind: PolicyKind) {
  const [rows, setRows] = useState<PolicyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await listPolicies(kind);
      setRows(next);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load records");
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(
    async (record: Partial<PolicyRecord>) => {
      const next = await savePolicy(kind, record);
      setRows((current) => {
        const index = current.findIndex((row) => row.id === next.id);
        if (index === -1) return [next, ...current];
        const copy = current.slice();
        copy[index] = next;
        return copy;
      });
      return next;
    },
    [kind],
  );

  const remove = useCallback(
    async (id: string) => {
      await deletePolicy(kind, id);
      setRows((current) => current.filter((row) => row.id !== id));
    },
    [kind],
  );

  return { rows, loading, error, refresh, save, remove };
}
