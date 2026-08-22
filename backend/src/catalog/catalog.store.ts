import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { CatalogItem } from "./catalog.seed";

const FILE = join(process.cwd(), "data", "catalog.json");

export async function loadCatalogFile(): Promise<CatalogItem[] | null> {
  try {
    const raw = await readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as CatalogItem[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveCatalogFile(items: CatalogItem[]) {
  await mkdir(join(process.cwd(), "data"), { recursive: true });
  await writeFile(FILE, JSON.stringify(items, null, 2), "utf8");
}
