import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Combo } from "./combo.types";

const FILE = join(process.cwd(), "data", "combos.json");

export async function loadCombosFile(): Promise<Combo[] | null> {
  try {
    const raw = await readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as Combo[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveCombosFile(combos: Combo[]) {
  await mkdir(join(process.cwd(), "data"), { recursive: true });
  await writeFile(FILE, JSON.stringify(combos, null, 2), "utf8");
}
