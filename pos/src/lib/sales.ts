import { formatReceiptText, type SaleReceipt } from "./receipt";
import { apiUrl } from "./api-base";

const KEY = "pos.sales.v1";
const OUTBOX_KEY = "pos.sales.outbox.v1";

export function loadLocalSales(): SaleReceipt[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SaleReceipt[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalSale(sale: SaleReceipt) {
  const next = [sale, ...loadLocalSales().filter((row) => row.ticketId !== sale.ticketId)].slice(
    0,
    500,
  );
  localStorage.setItem(KEY, JSON.stringify(next));
}

function readOutbox(): SaleReceipt[] {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    const parsed = raw ? (JSON.parse(raw) as SaleReceipt[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeOutbox(rows: SaleReceipt[]) {
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(rows.slice(0, 200)));
  } catch {
    /* storage full — drop oldest silently */
  }
}

export function pendingSaleCount() {
  return readOutbox().length;
}

async function postSale(sale: SaleReceipt): Promise<boolean> {
  const response = await fetch(apiUrl("/api/sales"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...sale,
      receiptText: formatReceiptText(sale),
    }),
  });
  return response.ok;
}

/** Queue a sale that failed to reach HQ; flushed automatically later. */
function queueForRetry(sale: SaleReceipt) {
  const rows = readOutbox().filter((row) => row.ticketId !== sale.ticketId);
  rows.push(sale);
  writeOutbox(rows);
}

/** Try to deliver every queued sale. Returns how many are still pending. */
export async function flushSalesOutbox(): Promise<number> {
  const rows = readOutbox();
  if (!rows.length) return 0;
  const remaining: SaleReceipt[] = [];
  for (const sale of rows) {
    try {
      if (await postSale(sale)) continue;
    } catch {
      /* network down — keep queued */
    }
    remaining.push(sale);
  }
  writeOutbox(remaining);
  return remaining.length;
}

/**
 * Persist the receipt locally, then push it to HQ.
 * Resolves to true only when the backend accepted the sale;
 * failures stay queued in the outbox for automatic retry.
 */
export async function archiveSale(sale: SaleReceipt): Promise<boolean> {
  saveLocalSale(sale);
  try {
    if (await postSale(sale)) {
      // If this ticket was previously queued, flush clears it on next pass.
      void flushSalesOutbox();
      return true;
    }
  } catch {
    /* fall through to outbox */
  }
  queueForRetry(sale);
  return false;
}
