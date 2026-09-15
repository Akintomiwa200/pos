"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Archive, BookOpen, CalendarClock, HandCoins, Plus, Trash2 } from "lucide-react";
import { naira } from "@/lib/hq-ops";
import {
  deleteFixedAsset,
  deleteJournalEntry,
  deleteLedgerAccount,
  deletePrepaid,
  deleteAdvance,
  listAdvances,
  listFixedAssets,
  listJournalEntries,
  listLedgerAccounts,
  listPrepaids,
  saveAdvance,
  saveFixedAsset,
  saveJournalEntry,
  saveLedgerAccount,
  savePrepaid,
  type LedgerAccount,
  type LedgerAdvance,
  type LedgerFixedAsset,
  type LedgerJournalEntry,
  type LedgerPrepaid,
} from "@/lib/hq-ledger";
import { ManagerSkeleton } from "../Skeleton";
import { Card, EmptyRow, PageHeader, StatCard, TableShell } from "../console/Chrome";

type Tab = "accounts" | "journal" | "assets" | "prepaids" | "advances";

const inputCls =
  "w-full rounded-xl border border-pos-border bg-pos-surface px-3 py-2 text-sm text-pos-ink outline-none focus:border-pos-primary";
const labelCls = "text-xs font-medium uppercase tracking-wide text-pos-ink-muted";

function SectionForm({
  title,
  children,
  onSave,
  saving,
}: {
  title: string;
  children: React.ReactNode[];
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="rounded-2xl border border-pos-border p-4">
      <p className="mb-3 text-sm font-semibold text-pos-ink">{title}</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
      <button
        onClick={onSave}
        disabled={saving}
        className="mt-3 flex items-center gap-2 rounded-xl bg-pos-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        <Plus size={14} /> {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

const accountKinds: LedgerAccount["kind"][] = ["asset", "liability", "equity", "income", "expense"];

export function MoneyManagement() {
  const [accounts, setAccounts] = useState<LedgerAccount[] | null>(null);
  const [journal, setJournal] = useState<LedgerJournalEntry[] | null>(null);
  const [assets, setAssets] = useState<LedgerFixedAsset[] | null>(null);
  const [prepaids, setPrepaids] = useState<LedgerPrepaid[] | null>(null);
  const [advances, setAdvances] = useState<LedgerAdvance[] | null>(null);
  const [tab, setTab] = useState<Tab>("accounts");
  const [saving, setSaving] = useState(false);

  const [account, setAccount] = useState({ code: "", name: "", kind: "asset" as LedgerAccount["kind"], group: "General", openingMinor: "0" });
  const [entry, setEntry] = useState({ date: new Date().toISOString().slice(0, 10), memo: "", debitAccountId: "", creditAccountId: "", amountMinor: "0" });
  const [asset, setAsset] = useState({ name: "", category: "Equipment", costMinor: "0", salvageMinor: "0", lifeYears: "5", acquiredAt: new Date().toISOString().slice(0, 10), note: "" });
  const [prepaid, setPrepaid] = useState({ name: "", amountMinor: "0", months: "12", startedAt: new Date().toISOString().slice(0, 10), consumedMinor: "0", note: "" });
  const [advance, setAdvance] = useState({ customerName: "", amountMinor: "0", appliedMinor: "0", note: "" });

  useEffect(() => {
    listLedgerAccounts()
      .then(setAccounts)
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Could not load accounts");
        setAccounts([]);
      });
    listJournalEntries()
      .then(setJournal)
      .catch(() => setJournal([]));
    listFixedAssets()
      .then(setAssets)
      .catch(() => setAssets([]));
    listPrepaids()
      .then(setPrepaids)
      .catch(() => setPrepaids([]));
    listAdvances()
      .then(setAdvances)
      .catch(() => setAdvances([]));
  }, []);

  function removeAccounts(values: LedgerAccount[]) {
    setAccounts(values);
  }
  function removeJournal(values: LedgerJournalEntry[]) {
    setJournal(values);
  }
  function removeAssets(values: LedgerFixedAsset[]) {
    setAssets(values);
  }
  function removePrepaids(values: LedgerPrepaid[]) {
    setPrepaids(values);
  }
  function removeAdvances(values: LedgerAdvance[]) {
    setAdvances(values);
  }

  async function remove(kind: Tab, id: string) {
    try {
      if (kind === "accounts") {
        await deleteLedgerAccount(id);
        removeAccounts(accounts?.filter((row) => row.id !== id) ?? []);
      }
      if (kind === "journal") {
        await deleteJournalEntry(id);
        removeJournal(journal?.filter((row) => row.id !== id) ?? []);
      }
      if (kind === "assets") {
        await deleteFixedAsset(id);
        removeAssets(assets?.filter((row) => row.id !== id) ?? []);
      }
      if (kind === "prepaids") {
        await deletePrepaid(id);
        removePrepaids(prepaids?.filter((row) => row.id !== id) ?? []);
      }
      if (kind === "advances") {
        await deleteAdvance(id);
        removeAdvances(advances?.filter((row) => row.id !== id) ?? []);
      }
      toast.success("Removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Remove failed");
    }
  }

  async function handleSaveAccount() {
    if (!account.name.trim()) {
      toast.error("Account name is required");
      return;
    }
    setSaving(true);
    try {
      const saved = await saveLedgerAccount({
        code: account.code,
        name: account.name,
        kind: account.kind,
        group: account.group,
        openingMinor: Math.round(Number(account.openingMinor) || 0),
      });
      setAccounts((prev) => [saved, ...(prev ?? []).filter((row) => row.id !== saved.id)]);
      setAccount({ code: "", name: "", kind: "asset", group: "General", openingMinor: "0" });
      toast.success("Account saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEntry() {
    const amount = Math.round(Number(entry.amountMinor) || 0);
    if (!entry.memo.trim() || !entry.debitAccountId || !entry.creditAccountId || amount <= 0) {
      toast.error("Memo, debit account, credit account and amount are required");
      return;
    }
    const debit = accounts?.find((row) => row.id === entry.debitAccountId);
    const credit = accounts?.find((row) => row.id === entry.creditAccountId);
    if (!debit || !credit) {
      toast.error("Choose valid accounts");
      return;
    }
    setSaving(true);
    try {
      const saved = await saveJournalEntry({
        date: entry.date,
        memo: entry.memo,
        lines: [
          { accountId: debit.id, accountName: debit.name, debitMinor: amount, creditMinor: 0 },
          { accountId: credit.id, accountName: credit.name, debitMinor: 0, creditMinor: amount },
        ],
      });
      setJournal((prev) => [saved, ...(prev ?? []).filter((row) => row.id !== saved.id)]);
      setEntry({ date: new Date().toISOString().slice(0, 10), memo: "", debitAccountId: "", creditAccountId: "", amountMinor: "0" });
      toast.success("Journal entry posted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Post failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAsset() {
    if (!asset.name.trim()) {
      toast.error("Asset name is required");
      return;
    }
    setSaving(true);
    try {
      const saved = await saveFixedAsset({
        name: asset.name,
        category: asset.category,
        costMinor: Math.round(Number(asset.costMinor) || 0),
        salvageMinor: Math.round(Number(asset.salvageMinor) || 0),
        lifeYears: Math.max(1, Number(asset.lifeYears) || 5),
        acquiredAt: asset.acquiredAt,
        note: asset.note,
      });
      setAssets((prev) => [saved, ...(prev ?? []).filter((row) => row.id !== saved.id)]);
      setAsset({ name: "", category: "Equipment", costMinor: "0", salvageMinor: "0", lifeYears: "5", acquiredAt: new Date().toISOString().slice(0, 10), note: "" });
      toast.success("Fixed asset added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePrepaid() {
    if (!prepaid.name.trim()) {
      toast.error("Prepaid name is required");
      return;
    }
    setSaving(true);
    try {
      const saved = await savePrepaid({
        name: prepaid.name,
        amountMinor: Math.round(Number(prepaid.amountMinor) || 0),
        months: Math.max(1, Number(prepaid.months) || 12),
        startedAt: prepaid.startedAt,
        consumedMinor: Math.round(Number(prepaid.consumedMinor) || 0),
        note: prepaid.note,
      });
      setPrepaids((prev) => [saved, ...(prev ?? []).filter((row) => row.id !== saved.id)]);
      setPrepaid({ name: "", amountMinor: "0", months: "12", startedAt: new Date().toISOString().slice(0, 10), consumedMinor: "0", note: "" });
      toast.success("Prepaid schedule saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAdvance() {
    if (!advance.customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }
    setSaving(true);
    try {
      const saved = await saveAdvance({
        customerName: advance.customerName,
        amountMinor: Math.round(Number(advance.amountMinor) || 0),
        appliedMinor: Math.round(Number(advance.appliedMinor) || 0),
        note: advance.note,
      });
      setAdvances((prev) => [saved, ...(prev ?? []).filter((row) => row.id !== saved.id)]);
      setAdvance({ customerName: "", amountMinor: "0", appliedMinor: "0", note: "" });
      toast.success("Advance recorded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const stats = useMemo(() => {
    const totalAssets = assets?.reduce((sum, row) => sum + row.costMinor, 0) ?? 0;
    const totalPrepaid = prepaids?.reduce((sum, row) => sum + Math.max(0, row.amountMinor - row.consumedMinor), 0) ?? 0;
    const totalAdvance = advances?.reduce((sum, row) => sum + Math.max(0, row.amountMinor - row.appliedMinor), 0) ?? 0;
    return {
      accounts: accounts?.length ?? 0,
      entries: journal?.length ?? 0,
      totalAssets,
      totalPrepaid,
      totalAdvance,
    };
  }, [accounts, journal, assets, prepaids, advances]);

  if (!accounts || !journal || !assets || !prepaids || !advances) return <ManagerSkeleton variant="table" />;

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: "accounts", label: `Chart of accounts (${accounts.length})` },
    { key: "journal", label: `Journal (${journal.length})` },
    { key: "assets", label: `Fixed assets (${assets.length})` },
    { key: "prepaids", label: `Prepaids (${prepaids.length})` },
    { key: "advances", label: `Advances (${advances.length})` },
  ];

  return (
    <div>
      <PageHeader
        kicker="Money & accounting"
        title="Accounting desk"
        copy="Keep the books beyond the till — chart of accounts, manual journal entries, fixed asset and prepaid schedules and customer advances. Every record feeds the money report suite."
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Accounts" value={String(stats.accounts)} hint={`${accountKinds.length} kinds supported`} />
        <StatCard label="Journal entries" value={String(stats.entries)} hint="manual postings" />
        <StatCard label="Fixed assets" value={naira(stats.totalAssets)} hint="at cost" />
        <StatCard label="Still prepaid" value={naira(stats.totalPrepaid)} hint="not yet consumed" />
        <StatCard label="Advances held" value={naira(stats.totalAdvance)} hint="customer money on account" />
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

      {tab === "accounts" && (
        <Card title="Chart of accounts" subtitle="Accounts you can post journal entries against — beyond the ones auto-derived from sales, expenses and purchases.">
          <SectionForm title="New account" onSave={handleSaveAccount} saving={saving}>
            <label>
              <span className={labelCls}>Code</span>
              <input className={inputCls} value={account.code} onChange={(e) => setAccount({ ...account, code: e.target.value })} placeholder="e.g. 1001" />
            </label>
            <label>
              <span className={labelCls}>Name</span>
              <input className={inputCls} value={account.name} onChange={(e) => setAccount({ ...account, name: e.target.value })} placeholder="e.g. Office equipment" />
            </label>
            <label>
              <span className={labelCls}>Kind</span>
              <select className={inputCls} value={account.kind} onChange={(e) => setAccount({ ...account, kind: e.target.value as LedgerAccount["kind"] })}>
                {accountKinds.map((kind) => (
                  <option key={kind} value={kind}>{kind}</option>
                ))}
              </select>
            </label>
            <label>
              <span className={labelCls}>Group</span>
              <input className={inputCls} value={account.group} onChange={(e) => setAccount({ ...account, group: e.target.value })} placeholder="e.g. Current assets" />
            </label>
            <label>
              <span className={labelCls}>Opening balance (₦)</span>
              <input className={inputCls} type="number" min="0" value={account.openingMinor} onChange={(e) => setAccount({ ...account, openingMinor: e.target.value })} />
            </label>
          </SectionForm>
          <TableShell columns={["Code", "Account", "Kind", "Group", "Opening", ""]} minWidth={680}>
            {accounts.length === 0 ? (
              <EmptyRow colSpan={6} message="No custom accounts yet — add one above to post journal entries." />
            ) : (
              accounts.map((row) => (
                <tr key={row.id} className="border-b border-pos-border/60">
                  <td className="px-4 py-3 font-mono text-xs text-pos-ink-muted">{row.code || "—"}</td>
                  <td className="px-4 py-3">
                    <BookOpen size={14} className="mr-1 inline text-pos-ink-faint" />
                    <span className="font-medium">{row.name}</span>
                  </td>
                  <td className="px-4 py-3 text-pos-ink-muted">{row.kind}</td>
                  <td className="px-4 py-3 text-pos-ink-muted">{row.group}</td>
                  <td className="px-4 py-3 tabular-nums">{naira(row.openingMinor)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove("accounts", row.id)} className="text-pos-ink-faint hover:text-pos-danger" aria-label="Delete account">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </TableShell>
        </Card>
      )}

      {tab === "journal" && (
        <Card title="Journal" subtitle="Simple double-entry — pick a debit account, a credit account and the amount. Lines feed the journal report.">
          <SectionForm title="Post entry" onSave={handleSaveEntry} saving={saving}>
            <label>
              <span className={labelCls}>Date</span>
              <input className={inputCls} type="date" value={entry.date} onChange={(e) => setEntry({ ...entry, date: e.target.value })} />
            </label>
            <label className="sm:col-span-2">
              <span className={labelCls}>Memo</span>
              <input className={inputCls} value={entry.memo} onChange={(e) => setEntry({ ...entry, memo: e.target.value })} placeholder="e.g. Annual insurance prepayment" />
            </label>
            <label>
              <span className={labelCls}>Debit account</span>
              <select className={inputCls} value={entry.debitAccountId} onChange={(e) => setEntry({ ...entry, debitAccountId: e.target.value })}>
                <option value="">Choose…</option>
                {accounts.map((row) => (
                  <option key={row.id} value={row.id}>{row.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span className={labelCls}>Credit account</span>
              <select className={inputCls} value={entry.creditAccountId} onChange={(e) => setEntry({ ...entry, creditAccountId: e.target.value })}>
                <option value="">Choose…</option>
                {accounts.map((row) => (
                  <option key={row.id} value={row.id}>{row.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span className={labelCls}>Amount (₦)</span>
              <input className={inputCls} type="number" min="0" value={entry.amountMinor} onChange={(e) => setEntry({ ...entry, amountMinor: e.target.value })} />
            </label>
          </SectionForm>
          <TableShell columns={["#", "Date", "Memo", "Debit", "Credit", "Amount", ""]} minWidth={800}>
            {journal.length === 0 ? (
              <EmptyRow colSpan={7} message="No manual entries yet — post one above." />
            ) : (
              journal.map((row) => {
                const debit = row.lines.find((line) => line.debitMinor > 0);
                const credit = row.lines.find((line) => line.creditMinor > 0);
                return (
                  <tr key={row.id} className="border-b border-pos-border/60 align-top">
                    <td className="px-4 py-3 font-mono text-xs text-pos-ink-muted">{row.number}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-pos-ink-muted">{new Date(row.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{row.memo}</div>
                    </td>
                    <td className="px-4 py-3 text-pos-ink-muted">{debit?.accountName ?? "—"}</td>
                    <td className="px-4 py-3 text-pos-ink-muted">{credit?.accountName ?? "—"}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums">{naira(debit?.debitMinor ?? credit?.creditMinor ?? 0)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => remove("journal", row.id)} className="text-pos-ink-faint hover:text-pos-danger" aria-label="Delete entry">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </TableShell>
        </Card>
      )}

      {tab === "assets" && (
        <Card title="Fixed asset register" subtitle="Big-ticket items with cost, salvage value and useful life — prepares the fixed assets report.">
          <SectionForm title="Register asset" onSave={handleSaveAsset} saving={saving}>
            <label>
              <span className={labelCls}>Name</span>
              <input className={inputCls} value={asset.name} onChange={(e) => setAsset({ ...asset, name: e.target.value })} placeholder="e.g. Delivery van" />
            </label>
            <label>
              <span className={labelCls}>Category</span>
              <select className={inputCls} value={asset.category} onChange={(e) => setAsset({ ...asset, category: e.target.value })}>
                {["Equipment", "Furniture", "Machinery", "Vehicle", "Computer", "Fittings"].map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label>
              <span className={labelCls}>Cost (₦)</span>
              <input className={inputCls} type="number" min="0" value={asset.costMinor} onChange={(e) => setAsset({ ...asset, costMinor: e.target.value })} />
            </label>
            <label>
              <span className={labelCls}>Salvage value (₦)</span>
              <input className={inputCls} type="number" min="0" value={asset.salvageMinor} onChange={(e) => setAsset({ ...asset, salvageMinor: e.target.value })} />
            </label>
            <label>
              <span className={labelCls}>Useful life (years)</span>
              <input className={inputCls} type="number" min="1" value={asset.lifeYears} onChange={(e) => setAsset({ ...asset, lifeYears: e.target.value })} />
            </label>
            <label>
              <span className={labelCls}>Acquired</span>
              <input className={inputCls} type="date" value={asset.acquiredAt} onChange={(e) => setAsset({ ...asset, acquiredAt: e.target.value })} />
            </label>
            <label className="sm:col-span-2 xl:col-span-3">
              <span className={labelCls}>Note</span>
              <input className={inputCls} value={asset.note} onChange={(e) => setAsset({ ...asset, note: e.target.value })} placeholder="Serial, vendor, receipt…" />
            </label>
          </SectionForm>
          <TableShell columns={["Asset", "Category", "Acquired", "Life", "Salvage", "Cost", ""]} minWidth={760}>
            {assets.length === 0 ? (
              <EmptyRow colSpan={7} message="No assets registered yet — add one above." />
            ) : (
              assets.map((row) => {
                const annual = Math.round((row.costMinor - row.salvageMinor) / row.lifeYears);
                return (
                  <tr key={row.id} className="border-b border-pos-border/60">
                    <td className="px-4 py-3">
                      <Archive size={14} className="mr-1 inline text-pos-ink-faint" />
                      <span className="font-medium">{row.name}</span>
                    </td>
                    <td className="px-4 py-3 text-pos-ink-muted">{row.category}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-pos-ink-muted">{new Date(row.acquiredAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-pos-ink-muted">{row.lifeYears} yr</td>
                    <td className="px-4 py-3 text-pos-ink-muted">{naira(row.salvageMinor)}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums">{naira(row.costMinor)} <span className="text-[11px] font-normal text-pos-ink-faint">({naira(annual)}/yr)</span></td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => remove("assets", row.id)} className="text-pos-ink-faint hover:text-pos-danger" aria-label="Delete asset">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </TableShell>
        </Card>
      )}

      {tab === "prepaids" && (
        <Card title="Prepaid schedules" subtitle="Payments made ahead of consumption — straight-line recognition straight into the prepaids report.">
          <SectionForm title="New prepaid" onSave={handleSavePrepaid} saving={saving}>
            <label>
              <span className={labelCls}>Name</span>
              <input className={inputCls} value={prepaid.name} onChange={(e) => setPrepaid({ ...prepaid, name: e.target.value })} placeholder="e.g. Office insurance" />
            </label>
            <label>
              <span className={labelCls}>Paid up front (₦)</span>
              <input className={inputCls} type="number" min="0" value={prepaid.amountMinor} onChange={(e) => setPrepaid({ ...prepaid, amountMinor: e.target.value })} />
            </label>
            <label>
              <span className={labelCls}>Months</span>
              <input className={inputCls} type="number" min="1" value={prepaid.months} onChange={(e) => setPrepaid({ ...prepaid, months: e.target.value })} />
            </label>
            <label>
              <span className={labelCls}>Started</span>
              <input className={inputCls} type="date" value={prepaid.startedAt} onChange={(e) => setPrepaid({ ...prepaid, startedAt: e.target.value })} />
            </label>
            <label>
              <span className={labelCls}>Already consumed (₦)</span>
              <input className={inputCls} type="number" min="0" value={prepaid.consumedMinor} onChange={(e) => setPrepaid({ ...prepaid, consumedMinor: e.target.value })} />
            </label>
          </SectionForm>
          <TableShell columns={["Item", "Started", "Months", "Original", "Consumed", "Remaining", ""]} minWidth={720}>
            {prepaids.length === 0 ? (
              <EmptyRow colSpan={7} message="No prepaid schedules yet — add one above." />
            ) : (
              prepaids.map((row) => {
                const remaining = Math.max(0, row.amountMinor - row.consumedMinor);
                return (
                  <tr key={row.id} className="border-b border-pos-border/60">
                    <td className="px-4 py-3">
                      <CalendarClock size={14} className="mr-1 inline text-pos-ink-faint" />
                      <span className="font-medium">{row.name}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-pos-ink-muted">{new Date(row.startedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-pos-ink-muted">{row.months} mo</td>
                    <td className="px-4 py-3 tabular-nums">{naira(row.amountMinor)}</td>
                    <td className="px-4 py-3 text-pos-ink-muted tabular-nums">{naira(row.consumedMinor)}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-pos-primary">{naira(remaining)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => remove("prepaids", row.id)} className="text-pos-ink-faint hover:text-pos-danger" aria-label="Delete prepaid">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </TableShell>
        </Card>
      )}

      {tab === "advances" && (
        <Card title="Customer advances" subtitle="Money customers hold on account — deposits and advance payments reconciled against what they spend.">
          <SectionForm title="Record advance" onSave={handleSaveAdvance} saving={saving}>
            <label>
              <span className={labelCls}>Customer</span>
              <input className={inputCls} value={advance.customerName} onChange={(e) => setAdvance({ ...advance, customerName: e.target.value })} placeholder="e.g. Ada's Bakery" />
            </label>
            <label>
              <span className={labelCls}>Deposited (₦)</span>
              <input className={inputCls} type="number" min="0" value={advance.amountMinor} onChange={(e) => setAdvance({ ...advance, amountMinor: e.target.value })} />
            </label>
            <label>
              <span className={labelCls}>Applied / spent (₦)</span>
              <input className={inputCls} type="number" min="0" value={advance.appliedMinor} onChange={(e) => setAdvance({ ...advance, appliedMinor: e.target.value })} />
            </label>
            <label className="sm:col-span-2 xl:col-span-3">
              <span className={labelCls}>Note</span>
              <input className={inputCls} value={advance.note} onChange={(e) => setAdvance({ ...advance, note: e.target.value })} placeholder="Reference, agreed terms…" />
            </label>
          </SectionForm>
          <TableShell columns={["Customer", "Deposited", "Applied", "Net on account", "Note", ""]} minWidth={680}>
            {advances.length === 0 ? (
              <EmptyRow colSpan={6} message="No advances recorded yet — add one above." />
            ) : (
              advances.map((row) => {
                const net = row.amountMinor - row.appliedMinor;
                return (
                  <tr key={row.id} className="border-b border-pos-border/60">
                    <td className="px-4 py-3">
                      <HandCoins size={14} className="mr-1 inline text-pos-ink-faint" />
                      <span className="font-medium">{row.customerName}</span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{naira(row.amountMinor)}</td>
                    <td className="px-4 py-3 text-pos-ink-muted tabular-nums">{naira(row.appliedMinor)}</td>
                    <td className={`px-4 py-3 font-semibold tabular-nums ${net > 0 ? "text-pos-primary" : net < 0 ? "text-pos-danger" : ""}`}>{naira(net)}</td>
                    <td className="px-4 py-3 text-xs text-pos-ink-faint">{row.note ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => remove("advances", row.id)} className="text-pos-ink-faint hover:text-pos-danger" aria-label="Delete advance">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </TableShell>
        </Card>
      )}
    </div>
  );
}