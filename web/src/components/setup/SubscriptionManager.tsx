"use client";

import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import { listTills, renewTill, tillProductLabel, type HqTill } from "@/lib/hq-api";
import { ManagerSkeleton } from "../Skeleton";
import { DataTable, PrimaryButton, SetupHeader } from "./SetupChrome";

function licenceState(till: HqTill) {
  if (!till.subscriptionExpiresAt) return { label: "Not activated", tone: "text-pos-ink-faint" };
  const days = Math.ceil((new Date(till.subscriptionExpiresAt).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { label: `Expired ${-days}d ago`, tone: "text-pos-danger font-semibold" };
  if (days <= 30) return { label: `${days}d left`, tone: "text-pos-warning font-semibold" };
  return { label: `${days}d left`, tone: "text-pos-success" };
}

export function SubscriptionManager() {
  const [tills, setTills] = useState<HqTill[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setTills(await listTills());
  }

  useEffect(() => {
    load().catch((err) => {
      toast.error(err, "Could not load subscriptions");
      setTills([]);
    });
  }, []);

  if (!tills) return <ManagerSkeleton variant="list" />;

  const active = tills.filter((till) => !till.expired).length;

  async function renew(id: string) {
    setBusyId(id);
    try {
      await renewTill(id);
      await load();
      toast.success("Licence renewed for one year.");
    } catch (err) {
      toast.error(err, "Could not renew");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <SetupHeader
        kicker="Setup · Billing"
        title="Subscriptions"
        copy={`Each till carries a one-year licence from activation. ${active} of ${tills.length} tills are within their licence window.`}
        action={
          <a
            href="/setup/others/till"
            className="rounded-xl border border-pos-border px-4 py-2.5 text-sm text-pos-ink hover:bg-pos-surface-muted"
          >
            Manage tills
          </a>
        }
      />
      <DataTable columns={["Till", "Product", "Branch", "Status", "Renews / expires", ""]}>
        {tills.length === 0 ? (
          <tr>
            <td className="px-4 py-6 text-pos-ink-faint" colSpan={6}>
              No tills registered yet — issue one under Setup → Others → Till.
            </td>
          </tr>
        ) : (
          tills.map((till) => {
            const state = licenceState(till);
            return (
              <tr key={till.id} className="border-b border-pos-border/60">
                <td className="px-4 py-3">
                  <span className="font-medium">{till.name}</span>
                  <span className="ml-2 text-xs text-pos-ink-faint">{till.code}</span>
                </td>
                <td className="px-4 py-3">{tillProductLabel(till.product)}</td>
                <td className="px-4 py-3">{till.branchName}</td>
                <td className={`px-4 py-3 ${state.tone}`}>{state.label}</td>
                <td className="px-4 py-3 text-pos-ink-muted">
                  {till.subscriptionExpiresAt
                    ? new Date(till.subscriptionExpiresAt).toLocaleDateString("en-NG", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <PrimaryButton
                    disabled={busyId === till.id}
                    onClick={() => renew(till.id)}
                    className="!px-3 !py-1.5 text-xs"
                  >
                    Renew
                  </PrimaryButton>
                </td>
              </tr>
            );
          })
        )}
      </DataTable>
      <p className="mt-4 text-sm text-pos-ink-faint">
        Each licence runs one year from activation — renewals extend from the current expiry date.
      </p>
    </div>
  );
}
