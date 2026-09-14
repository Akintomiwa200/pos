"use client";

import { useEffect, useState } from "react";
import { api } from "./hq-api";
import { getCompany, type HqCompany } from "./hq-setup";

export type BillingPlan = {
  id: string;
  code: string;
  name: string;
  tagline: string;
  priceMinor: number;
  tillCap: number;
  period: string;
  popular: boolean;
  features: string[];
  active: boolean;
  sort: number;
};

export type BillingSubscription = {
  id: string;
  companyId: string;
  companyName: string;
  planId: string;
  planCode: string;
  planName: string;
  planTillCap: number;
  planPriceMinor: number;
  planPopular: boolean;
  status: string;
  autoRenew: boolean;
  startedAt: string;
  renewsAt: string | null;
};

export type BillingInvoice = {
  id: string;
  invoiceNo: string;
  companyId: string;
  companyName: string;
  planId: string | null;
  planName: string | null;
  tillId: string | null;
  tillName: string | null;
  kind: "subscription" | "till_licence";
  label: string;
  amountMinor: number;
  currency: string;
  status: "pending" | "paid" | "overdue" | "void";
  reference: string | null;
  provider: string | null;
  issuedAt: string;
  dueAt: string | null;
  paidAt: string | null;
};

export type BillingPayment = {
  id: string;
  tillId: string | null;
  tillName: string;
  reference: string;
  provider: string;
  amountMinor: number;
  currency: string;
  status: string;
  paidAt: string;
  expiresAt: string | null;
};

export type BillingSnapshot = {
  type: "billing";
  plans: BillingPlan[];
  subscriptions: BillingSubscription[];
  invoices: BillingInvoice[];
  payments: BillingPayment[];
  company: HqCompany;
  at: string;
};

export function planPrice(plan: BillingPlan): string {
  if (plan.tillCap === -1) return "Custom";
  if (plan.priceMinor <= 0) return "₦0";
  return `₦${(plan.priceMinor / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function planCapLabel(plan: BillingPlan): string {
  return plan.tillCap === -1 ? "Unlimited" : String(plan.tillCap);
}

export async function getBilling(): Promise<BillingSnapshot> {
  return api<BillingSnapshot>("/api/console/billing");
}

export async function listPlans(): Promise<BillingPlan[]> {
  return api<BillingPlan[]>("/api/console/billing/plans");
}

export async function savePlan(
  plan: Partial<BillingPlan>,
  token: string,
): Promise<BillingPlan> {
  return api<BillingPlan>("/api/console/billing/plans", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(plan),
  });
}

export async function deletePlan(id: string, token: string) {
  return api<{ ok: true }>(`/api/console/billing/plans/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function assignSubscription(
  planId: string,
  opts: { companyId?: string; status?: string; autoRenew?: boolean } = {},
  token: string,
): Promise<BillingSubscription> {
  return api<BillingSubscription>("/api/console/billing/subscriptions/assign", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ planId, ...opts }),
  });
}

export async function listInvoices(): Promise<BillingInvoice[]> {
  return api<BillingInvoice[]>("/api/console/billing/invoices");
}

export async function payInvoice(
  id: string,
  opts: { reference?: string; provider?: string; amountMinor?: number } = {},
): Promise<BillingInvoice> {
  return api<BillingInvoice>(`/api/console/billing/invoices/${encodeURIComponent(id)}/pay`, {
    method: "POST",
    body: JSON.stringify(opts),
  });
}

export async function listBillingPayments(): Promise<BillingPayment[]> {
  return api<BillingPayment[]>("/api/console/billing/payments");
}

export function useLiveBilling() {
  const [company, setCompany] = useState<HqCompany | null>(null);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<BillingSubscription[]>([]);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [payments, setPayments] = useState<BillingPayment[]>([]);
  const [live, setLive] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const source = new EventSource("/api/console/billing/stream");

    source.onopen = () => {
      if (!cancelled) setLive(true);
    };
    source.onerror = () => {
      if (!cancelled) setLive(false);
    };
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as BillingSnapshot;
        if (cancelled || payload.type !== "billing") return;
        setPlans(payload.plans ?? []);
        setSubscriptions(payload.subscriptions ?? []);
        setInvoices(payload.invoices ?? []);
        setPayments(payload.payments ?? []);
        if (payload.company) setCompany(payload.company);
        setReady(true);
      } catch {
        // ignore malformed frames
      }
    };

    void getBilling()
      .then((payload) => {
        if (cancelled) return;
        setPlans(payload.plans ?? []);
        setSubscriptions(payload.subscriptions ?? []);
        setInvoices(payload.invoices ?? []);
        setPayments(payload.payments ?? []);
        setCompany(payload.company);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
        void getCompany().then((next) => {
          if (!cancelled) setCompany(next);
        });
      });

    return () => {
      cancelled = true;
      source.close();
    };
  }, []);

  return {
    company,
    plans,
    subscriptions,
    invoices,
    payments,
    live,
    ready,
    setInvoices,
    setPayments,
    setSubscriptions,
  };
}