"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Crosshair, Plus, Trash2, UserRound } from "lucide-react";
import { naira } from "@/lib/hq-ops";
import { listStores, type HqStore } from "@/lib/hq-setup";
import { listDirectory, type DirectoryRecord } from "@/lib/hq-directory";
import {
  deleteStaffTarget,
  deleteStoreTarget,
  listStaffTargets,
  listStoreTargets,
  saveStaffTarget,
  saveStoreTarget,
  type StaffTarget,
  type StoreTarget,
} from "@/lib/hq-ledger";
import { ManagerSkeleton } from "../Skeleton";
import { Card, EmptyRow, PageHeader, StatCard, TableShell } from "../console/Chrome";

type Tab = "store" | "staff";

const inputCls =
  "w-full rounded-xl border border-pos-border bg-pos-surface px-3 py-2 text-sm text-pos-ink outline-none focus:border-pos-primary";
const labelCls = "text-xs font-medium uppercase tracking-wide text-pos-ink-muted";

function defaultPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function OutletsManagement() {
  const [storeTargets, setStoreTargets] = useState<StoreTarget[] | null>(null);
  const [staffTargets, setStaffTargets] = useState<StaffTarget[] | null>(null);
  const [stores, setStores] = useState<HqStore[]>([]);
  const [staff, setStaff] = useState<DirectoryRecord[]>([]);
  const [tab, setTab] = useState<Tab>("store");
  const [saving, setSaving] = useState(false);
  const [period, setPeriod] = useState(defaultPeriod());

  const [storeTarget, setStoreTarget] = useState({ storeId: "", targetMinor: "0" });
  const [staffTarget, setStaffTarget] = useState({ staffName: "", targetMinor: "0" });

  useEffect(() => {
    listStoreTargets()
      .then(setStoreTargets)
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Could not load store targets");
        setStoreTargets([]);
      });
    listStaffTargets()
      .then(setStaffTargets)
      .catch(() => setStaffTargets([]));
    listStores()
      .then(setStores)
      .catch(() => setStores([]));
    listDirectory("staff")
      .then((rows) => setStaff(Array.isArray(rows) ? rows : []))
      .catch(() => setStaff([]));
  }, []);

  function accountsForPeriod() {
    const all = new Set([...staff.map((row) => row.name)]);
    return [...all].sort((a, b) => a.localeCompare(b));
  }

  async function remove(kind: Tab, id: string) {
    try {
      if (kind === "store") {
        await deleteStoreTarget(id);
        setStoreTargets((prev) => prev?.filter((row) => row.id !== id) ?? []);
      }
      if (kind === "staff") {
        await deleteStaffTarget(id);
        setStaffTargets((prev) => prev?.filter((row) => row.id !== id) ?? []);
      }
      toast.success("Removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Remove failed");
    }
  }

  async function handleSaveStoreTarget() {
    const store = stores.find((row) => row.id === storeTarget.storeId);
    if (!store) {
      toast.error("Choose a store");
      return;
    }
    setSaving(true);
    try {
      const saved = await saveStoreTarget({
        period,
        storeId: store.id,
        storeName: store.name,
        targetMinor: Math.round(Number(storeTarget.targetMinor) || 0),
      });
      setStoreTargets((prev) => [saved, ...(prev ?? []).filter((row) => row.id !== saved.id)]);
      setStoreTarget({ storeId: "", targetMinor: "0" });
      toast.success("Store target saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveStaffTarget() {
    if (!staffTarget.staffName.trim()) {
      toast.error("Choose a staff member");
      return;
    }
    setSaving(true);
    try {
      const member = staff.find((row) => row.name === staffTarget.staffName);
      const saved = await saveStaffTarget({
        period,
        staffId: member?.id,
        staffName: staffTarget.staffName,
        targetMinor: Math.round(Number(staffTarget.targetMinor) || 0),
      });
      setStaffTargets((prev) => [saved, ...(prev ?? []).filter((row) => row.id !== saved.id)]);
      setStaffTarget({ staffName: "", targetMinor: "0" });
      toast.success("Staff target saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const stats = useMemo(() => {
    const storeTotal = storeTargets?.reduce((sum, row) => sum + row.targetMinor, 0) ?? 0;
    const staffTotal = staffTargets?.reduce((sum, row) => sum + row.targetMinor, 0) ?? 0;
    return {
      storeTargets: storeTargets?.length ?? 0,
      staffTargets: staffTargets?.length ?? 0,
      storeTotal,
      staffTotal,
    };
  }, [storeTargets, staffTargets]);

  if (!storeTargets || !staffTargets) return <ManagerSkeleton variant="table" />;

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: "store", label: `Store targets (${storeTargets.length})` },
    { key: "staff", label: `Staff targets (${staffTargets.length})` },
  ];

  return (
    <div>
      <PageHeader
        kicker="Outlets & locations"
        title="Outlets desk"
        copy="Set sales targets per store and per staff member for a period — saved to the network so every screen, on every device, sees the same numbers. Branches and stores are managed under Setup."
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Store targets" value={String(stats.storeTargets)} hint="for the current period" />
        <StatCard label="Store target value" value={naira(stats.storeTotal)} hint="combined network target" />
        <StatCard label="Staff targets" value={String(stats.staffTargets)} hint="across the team" />
        <StatCard label="Staff target value" value={naira(stats.staffTotal)} hint="combined team target" />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              tab === item.key ? "bg-pos-primary text-white" : "border border-pos-border bg-pos-surface text-pos-ink-muted hover:text-pos-ink"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "store" && (
        <Card title="Store targets" subtitle="What each outlet should sell in a period — feeds Target vs actual.">
          <div className="mb-4 grid max-w-sm gap-3 sm:grid-cols-2">
            <label>
              <span className={labelCls}>Period (YYYY-MM)</span>
              <input className={inputCls} type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
            </label>
          </div>
          <div className="rounded-2xl border border-pos-border p-4">
            <p className="mb-3 text-sm font-semibold text-pos-ink">New store target</p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <label>
                <span className={labelCls}>Store</span>
                <select className={inputCls} value={storeTarget.storeId} onChange={(e) => setStoreTarget({ ...storeTarget, storeId: e.target.value })}>
                  <option value="">Choose…</option>
                  {stores.map((row) => (
                    <option key={row.id} value={row.id}>{row.name}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className={labelCls}>Target (₦)</span>
                <input className={inputCls} type="number" min="0" value={storeTarget.targetMinor} onChange={(e) => setStoreTarget({ ...storeTarget, targetMinor: e.target.value })} />
              </label>
            </div>
            <button
              onClick={handleSaveStoreTarget}
              disabled={saving}
              className="mt-3 flex items-center gap-2 rounded-xl bg-pos-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Plus size={14} /> {saving ? "Saving…" : "Save"}
            </button>
          </div>
          <TableShell columns={["Period", "Store", "Target", ""]} minWidth={560}>
            {storeTargets.length === 0 ? (
              <EmptyRow colSpan={4} message="No store targets yet — set one above." />
            ) : (
              storeTargets.map((row) => (
                <tr key={row.id} className="border-b border-pos-border/60">
                  <td className="px-4 py-3 font-mono text-xs text-pos-ink-muted">{row.period}</td>
                  <td className="px-4 py-3">
                    <Crosshair size={14} className="mr-1 inline text-pos-ink-faint" />
                    <span className="font-medium">{row.storeName}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums">{naira(row.targetMinor)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove("store", row.id)} className="text-pos-ink-faint hover:text-pos-danger" aria-label="Delete target">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </TableShell>
        </Card>
      )}

      {tab === "staff" && (
        <Card title="Staff targets" subtitle="What each team member should sell in a period — feeds Staff targets and team attainment.">
          <div className="mb-4 grid max-w-sm gap-3 sm:grid-cols-2">
            <label>
              <span className={labelCls}>Period (YYYY-MM)</span>
              <input className={inputCls} type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
            </label>
          </div>
          <div className="rounded-2xl border border-pos-border p-4">
            <p className="mb-3 text-sm font-semibold text-pos-ink">New staff target</p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <label>
                <span className={labelCls}>Staff</span>
                <select className={inputCls} value={staffTarget.staffName} onChange={(e) => setStaffTarget({ ...staffTarget, staffName: e.target.value })}>
                  <option value="">Choose…</option>
                  {accountsForPeriod().map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className={labelCls}>Target (₦)</span>
                <input className={inputCls} type="number" min="0" value={staffTarget.targetMinor} onChange={(e) => setStaffTarget({ ...staffTarget, targetMinor: e.target.value })} />
              </label>
            </div>
            <button
              onClick={handleSaveStaffTarget}
              disabled={saving}
              className="mt-3 flex items-center gap-2 rounded-xl bg-pos-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Plus size={14} /> {saving ? "Saving…" : "Save"}
            </button>
          </div>
          <TableShell columns={["Period", "Staff", "Target", ""]} minWidth={560}>
            {staffTargets.length === 0 ? (
              <EmptyRow colSpan={4} message="No staff targets yet — set one above." />
            ) : (
              staffTargets.map((row) => (
                <tr key={row.id} className="border-b border-pos-border/60">
                  <td className="px-4 py-3 font-mono text-xs text-pos-ink-muted">{row.period}</td>
                  <td className="px-4 py-3">
                    <UserRound size={14} className="mr-1 inline text-pos-ink-faint" />
                    <span className="font-medium">{row.staffName}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums">{naira(row.targetMinor)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove("staff", row.id)} className="text-pos-ink-faint hover:text-pos-danger" aria-label="Delete target">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </TableShell>
        </Card>
      )}
    </div>
  );
}