import { Injectable } from "@nestjs/common";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  sanitizeRecords,
  type BoardName,
  type BoardRecord,
} from "./floor.types";

@Injectable()
export class FloorService {
  private readonly dir = join(process.cwd(), "data", "boards");
  private readonly cache = new Map<BoardName, BoardRecord[]>();

  private file(board: BoardName) {
    return join(this.dir, `${board}.json`);
  }

  async list(board: BoardName): Promise<BoardRecord[]> {
    const cached = this.cache.get(board);
    if (cached) return cached;
    try {
      const raw = await readFile(this.file(board), "utf8");
      const rows = sanitizeRecords(JSON.parse(raw));
      this.cache.set(board, rows);
      return rows;
    } catch {
      this.cache.set(board, []);
      return [];
    }
  }

  async replace(board: BoardName, input: unknown): Promise<BoardRecord[]> {
    const rows = sanitizeRecords(input);
    await mkdir(this.dir, { recursive: true });
    await writeFile(this.file(board), JSON.stringify(rows, null, 2), "utf8");
    this.cache.set(board, rows);
    return rows;
  }
}
