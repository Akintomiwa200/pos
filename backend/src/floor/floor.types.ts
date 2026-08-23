/** Generic persisted boards for till service state: floor tables, hotel rooms, kitchen tickets. */

export type BoardRecord = {
  id: string;
  [key: string]: unknown;
};

export const BOARDS = ["tables", "rooms", "kitchen"] as const;
export type BoardName = (typeof BOARDS)[number];

export function isBoardName(value: string): value is BoardName {
  return (BOARDS as readonly string[]).includes(value);
}

export function sanitizeRecords(input: unknown): BoardRecord[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const rows: BoardRecord[] = [];
  for (const raw of input.slice(0, 500)) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const record = { ...(raw as Record<string, unknown>) };
    const id = typeof record.id === "string" ? record.id.trim() : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    record.id = id;
    rows.push(record as BoardRecord);
  }
  return rows;
}
