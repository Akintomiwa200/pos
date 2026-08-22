"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "@/lib/toast";
import {
  deleteExpense,
  listExpenses,
  saveExpense,
  type HqExpense,
} from "@/lib/hq-ops";
import { naira, prettyDay } from "@/lib/hq-ops";
import { ManagerSkeleton } from "../Skeleton";
import { SlideOver } from "../SlideOver";
import { DataTable, Field, PrimaryButton, SetupHeader, fieldClass } from "../setup/SetupChrome";

type Draft = {
  id?: string;
  at: string;
  account: string;
  description: string;
  amount: string;
  method: string;
  staff: string;
};

const blank = (): Draft => ({
  at: new Date().toISOString().slice(0, 10),
  account: "",
  description: "",
  amount: "",
  method: "cash",
  staff: "",
});

export function ExpensesManager({ summaryOnly = false }: { summaryOnly?: boolean }) {
  const [rows, setRows] = useState<HqExpense[] | null>(null);
  const [draft, setDraft] = useState<Draft>(blank);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    setRows(await listExpenses());
  }

  useEffect(() => {
    load().catch((err) => {
      toast.error(err, "Could not load expenses");
      setRows([]);
    });
  }, []);

  const stats = useMemo(() => {
    if (!rows) return null;
    const totalMinor = rows.reduce((sum, row) => sum + row.amountMinor, 0);
    const byAccount = new Map<string, number>();
    const byMonth = new Map<string, number>();
    for (const row of rows) {
      byAccount.set(row.account, (byAccount.get(row.account) ?? 0) + row.amountMinor);
      byMonth.set(row.at.slice(0, 7), (byMonth.get(row.at.slice(0, 7)) ?? 0) + row.amountMinor);
    }
    return { totalMinor, accounts: [...byAccount.entries()].sort((a, b) => b[1] - a[1]), months: [...byMonth.entries()].sort((a, b) => b[0].localeCompare(a[0])) };
  }, [rows]);

  if (!rows || !stats) return <ManagerSkeleton variant="table" />;

  if (summaryOnly) {
    return (
      <div>
        <SetupHeader
          kicker="Transaction · Expenses"
          title="Summary"
          copy="Where the money went — grouped by expense account and month."
        />
        <div className="grid gap-6 xl:grid-cols-2">
          <DataTable columns={["Account", "Spend", "Share"]}>
            {stats.accounts.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-pos-ink-faint" colSpan={3}>
                  No expenses recorded yet.
                </td>
              </tr>
            ) : (
              stats.accounts.map(([account, amountMinor]) => (
                <tr key={account} className="border-b border-pos-border/60">
                  <td className="px-4 py-3 font-medium">{account}</td>
                  <td className="px-4 py-3">{naira(amountMinor)}</td>
                  <td className="px-4 py-3">
                    {stats.totalMinor ? `${Math.round((amountMinor / stats.totalMinor) * 100)}%` : "—"}
                  </td>
                </tr>
              ))
            )}
            {stats.accounts.length ? (
              <tr className="bg-pos-surface-muted font-semibold">
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3">{naira(stats.totalMinor)}</td>
                <td className="px-4 py-3">100%</td>
              </tr>
            ) : null}
          </DataTable>
          <DataTable columns={["Month", "Spend"]}>
            {stats.months.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-pos-ink-faint" colSpan={2}>
                  Nothing yet.
                </td>
              </tr>
            ) : (
              stats.months.map(([month, amountMinor]) => (
                <tr key={month} className="border-b border-pos-border/60">
                  <td className="px-4 py-3 font-medium">
                    {new Date(`${month}-01T00:00:00`).toLocaleDateString("en-NG", {
                      month: "long",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">{naira(amountMinor)}</td>
                </tr>
              ))
            )}
          </DataTable>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SetupHeader
        kicker="Transaction · Expenses"
        title="Expenses"
        copy={`Cash going out of the business. ${rows.length} entries · ${naira(stats.totalMinor)} total.`}
        action={
          <PrimaryButton
            onClick={() => {
              setDraft(blank());
              setOpen(true);
            }}
          >
            Record expense
          </PrimaryButton>
        }
      />
      <DataTable columns={["Date", "Description", "Account", "Method", "Amount", "By"]}>
        {rows.length === 0 ? (
          <tr>
            <td className="px-4 py-6 text-pos-ink-faint" colSpan={6}>
              No expenses recorded yet.
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr
              key={row.id}
              className="cursor-pointer border-b border-pos-border/60 hover:bg-pos-surface-muted"
              onClick={() => {
                setDraft({
                  id: row.id,
                  at: row.at.slice(0, 10),
                  account: row.account,
                  description: row.description,
                  amount: (row.amountMinor / 100).toString(),
                  method: row.method,
                  staff: row.staff ?? "",
                });
                setOpen(true);
              }}
            >
              <td className="whitespace-nowrap px-4 py-3">{prettyDay(row.at.slice(0, 10))}</td>
              <td className="px-4 py-3 font-medium">{row.description}</td>
              <td className="px-4 py-3">{row.account}</td>
              <td className="px-4 py-3 capitalize">{row.method}</td>
              <td className="px-4 py-3 font-semibold text-pos-danger">{naira(row.amountMinor)}</td>
              <td className="px-4 py-3">{row.staff || "—"}</td>
            </tr>
          ))
        )}
      </DataTable>

      <SlideOver
        open={open}
        title={draft.id ? "Edit expense" : "Record expense"}
        onClose={() => setOpen(false)}
        footer={
          <div className="flex gap-2">
            {draft.id ? (
              <button
                type="button"
                className="rounded-xl border border-pos-border px-4 py-2.5 text-sm text-pos-ink hover:bg-pos-surface-muted"
                onClick={async () => {
                  try {
                    await deleteExpense(draft.id!);
                    await load();
                    setOpen(false);
                    toast.success("Expense deleted.");
                  } catch (err) {
                    toast.error(err, "Could not delete");
                  }
                }}
              >
                Delete
              </button>
            ) : null}
            <PrimaryButton
              className="flex-1"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await saveExpense({
                    id: draft.id,
                    at: draft.at ? new Date(draft.at).toISOString() : undefined,
                    account: draft.account || "General",
                    description: draft.description,
                    amountMinor: Math.round((parseFloat(draft.amount) || 0) * 100),
                    method: draft.method,
                    staff: draft.staff || undefined,
                  });
                  await load();
                  setOpen(false);
                  toast.success("Expense saved.");
                } catch (err) {
                  toast.error(err, "Could not save expense");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Save expense
            </PrimaryButton>
          </div>
        }
      >
        <Field label="Date">
          <input
            type="date"
            className={fieldClass}
            value={draft.at}
            onChange={(event) => setDraft({ ...draft, at: event.target.value })}
          />
        </Field>
        <Field label="Description">
          <input
            className={fieldClass}
            value={draft.description}
            onChange={(event) => setDraft({ ...draft, description: event.target.value })}
          />
        </Field>
        <Field label="Expense account">
          <input
            className={fieldClass}
            placeholder="e.g. Diesel & Power"
            value={draft.account}
            onChange={(event) => setDraft({ ...draft, account: event.target.value })}
          />
        </Field>
        <Field label="Amount (₦)">
          <input
            type="number"
            min="0"
            step="0.01"
            className={fieldClass}
            value={draft.amount}
            onChange={(event) => setDraft({ ...draft, amount: event.target.value })}
          />
        </Field>
        <Field label="Method">
          <select
            className={fieldClass}
            value={draft.method}
            onChange={(event) => setDraft({ ...draft, method: event.target.value })}
          >
            {["cash", "transfer", "pos", "cheque"].map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Recorded by (optional)">
          <input
            className={fieldClass}
            value={draft.staff}
            onChange={(event) => setDraft({ ...draft, staff: event.target.value })}
          />
        </Field>
      </SlideOver>
    </div>
  );
}
