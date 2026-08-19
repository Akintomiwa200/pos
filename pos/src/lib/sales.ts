import { formatReceiptText, type SaleReceipt } from "./receipt";
import { apiUrl } from "./api-base";

const KEY = "pos.sales.v1";

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

export async function archiveSale(sale: SaleReceipt) {
  saveLocalSale(sale);
  try {
    await fetch(apiUrl("/api/sales"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...sale,
        receiptText: formatReceiptText(sale),
      }),
    });
  } catch {
    // till copy remains if the backend is offline
  }
}
