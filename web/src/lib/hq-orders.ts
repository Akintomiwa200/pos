import { api } from "./hq-api";
import type { DocLine, DocStatus, TradeDoc } from "./hq-ops";

export type { DocLine, DocStatus, TradeDoc };

export type OrderSummary = {
  count: number;
  totalMinor: number;
  pendingApproval: number;
  awaitingReceive: number;
  byStatus: Record<string, { count: number; totalMinor: number }>;
  topVendors: Array<{ party: string; count: number; totalMinor: number }>;
};

export const ORDER_STATUS_LABEL: Record<DocStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending approval",
  approved: "Approved",
  open: "Sent to vendor",
  partial: "Partially received",
  received: "Received",
  closed: "Closed",
  cancelled: "Cancelled",
  rejected: "Rejected",
};

export async function listPurchaseOrders() {
  return api<TradeDoc[]>("/api/orders?kind=purchase-order");
}

export async function getOrder(id: string) {
  return api<TradeDoc>(`/api/orders/${id}`);
}

export async function saveOrder(doc: Partial<TradeDoc>) {
  return api<TradeDoc>("/api/orders", {
    method: "POST",
    body: JSON.stringify({ ...doc, kind: "purchase-order" }),
  });
}

export async function deleteOrder(id: string) {
  await api(`/api/orders/${id}`, { method: "DELETE" });
}

export async function getOrderSummary() {
  return api<OrderSummary>("/api/orders/summary?kind=purchase-order");
}

export async function submitOrder(id: string) {
  return api<TradeDoc>(`/api/orders/${id}/submit`, { method: "POST", body: "{}" });
}

export async function approveOrder(id: string, approvedBy?: string) {
  return api<TradeDoc>(`/api/orders/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ approvedBy }),
  });
}

export async function rejectOrder(id: string, reason?: string, rejectedBy?: string) {
  return api<TradeDoc>(`/api/orders/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason, rejectedBy }),
  });
}

export async function sendOrder(id: string) {
  return api<TradeDoc>(`/api/orders/${id}/send`, { method: "POST", body: "{}" });
}

export async function receiveOrder(
  id: string,
  body?: { lines?: Array<{ index: number; receivedQty: number }>; full?: boolean },
) {
  return api<TradeDoc>(`/api/orders/${id}/receive`, {
    method: "POST",
    body: JSON.stringify(body ?? { full: true }),
  });
}

export async function cancelOrder(id: string) {
  return api<TradeDoc>(`/api/orders/${id}/cancel`, { method: "POST", body: "{}" });
}

export async function closeOrder(id: string) {
  return api<TradeDoc>(`/api/orders/${id}/close`, { method: "POST", body: "{}" });
}
