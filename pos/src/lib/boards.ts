import { apiUrl } from "./api-base";
import type { FloorTable } from "./tables";
import type { HotelRoom } from "./rooms";
import type { KitchenTicket } from "./tickets";

/**
 * Till floor state (tables / rooms / kitchen tickets) is persisted on HQ so a
 * refresh or second device sees the same board. Offline failures fall back to
 * the local seeds without breaking the till.
 */

export type BoardName = "tables" | "rooms" | "kitchen";

async function fetchBoard<T>(board: BoardName): Promise<T[] | null> {
  try {
    const response = await fetch(apiUrl(`/api/floor/${board}`));
    if (!response.ok) return null;
    const data = (await response.json()) as T[];
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

async function pushBoard(board: BoardName, rows: unknown[]): Promise<boolean> {
  try {
    const response = await fetch(apiUrl(`/api/floor/${board}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rows),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function loadTables(): Promise<FloorTable[] | null> {
  return fetchBoard<FloorTable>("tables");
}

export async function loadRooms(): Promise<HotelRoom[] | null> {
  return fetchBoard<HotelRoom>("rooms");
}

export async function loadKitchenTickets(): Promise<KitchenTicket[] | null> {
  return fetchBoard<KitchenTicket>("kitchen");
}

export function saveTables(rows: FloorTable[]) {
  return pushBoard("tables", rows);
}

export function saveRooms(rows: HotelRoom[]) {
  return pushBoard("rooms", rows);
}

export function saveKitchenTickets(rows: KitchenTicket[]) {
  return pushBoard("kitchen", rows);
}
