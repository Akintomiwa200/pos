import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type BackupMeta = {
  id: string;
  at: string;
  bytes: number;
  files: number;
};

export type RestoreResult = {
  restored: string[];
  skipped: string[];
  at: string;
};

function safeFileName(name: string) {
  return /^[A-Za-z0-9._-]+$/.test(name) && !name.includes("..") && name.endsWith(".json");
}

@Injectable()
export class SystemBackupService {
  private readonly dir = join(process.cwd(), "data");
  private readonly backupDir = join(this.dir, "backups");

  async list(): Promise<BackupMeta[]> {
    await mkdir(this.backupDir, { recursive: true });
    const names = (await readdir(this.backupDir)).filter((name) => name.endsWith(".json"));
    const rows = await Promise.all(
      names.map(async (name) => {
        const path = join(this.backupDir, name);
        const info = await stat(path);
        const id = name.replace(/\.json$/, "");
        let at = info.mtime.toISOString();
        let files = 0;
        try {
          const parsed = JSON.parse(await readFile(path, "utf8")) as {
            createdAt?: string;
            files?: number;
          };
          if (parsed.createdAt) at = parsed.createdAt;
          if (typeof parsed.files === "number") files = parsed.files;
        } catch {
          // Older or corrupt backups still show their file metadata.
        }
        return { id, at, bytes: info.size, files };
      }),
    );
    return rows.sort((a, b) => b.at.localeCompare(a.at));
  }

  async create(): Promise<BackupMeta> {
    await mkdir(this.backupDir, { recursive: true });
    const entries = await readdir(this.dir, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => entry.name);
    const collections: Record<string, unknown> = {};
    for (const name of files) {
      try {
        collections[name] = JSON.parse(await readFile(join(this.dir, name), "utf8"));
      } catch {
        collections[name] = null;
      }
    }
    const now = new Date();
    const id = `backup-${now.toISOString().replace(/[:.]/g, "-")}`;
    const body = JSON.stringify(
      { createdAt: now.toISOString(), files: files.length, collections },
      null,
      2,
    );
    await writeFile(join(this.backupDir, `${id}.json`), body, "utf8");
    return { id, at: now.toISOString(), bytes: Buffer.byteLength(body), files: files.length };
  }

  async restore(id?: string, payload?: unknown): Promise<RestoreResult> {
    let raw: string;
    if (id) {
      if (!/^[A-Za-z0-9_-]+$/.test(id) || id.includes("..")) {
        throw new BadRequestException("Invalid backup id");
      }
      const path = join(this.backupDir, `${id}.json`);
      try {
        raw = await readFile(path, "utf8");
      } catch {
        throw new NotFoundException(`Backup ${id} was not found`);
      }
    } else if (payload !== undefined && payload !== null) {
      raw = JSON.stringify(payload);
    } else {
      throw new BadRequestException("Provide a backup id or a backup JSON payload");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new BadRequestException("Backup file is not valid JSON");
    }
    const source =
      parsed && typeof parsed === "object" && "collections" in parsed
        ? (parsed as { collections?: unknown }).collections
        : parsed;
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      throw new BadRequestException("Backup must contain a collections object");
    }

    const restored: string[] = [];
    const skipped: string[] = [];
    for (const [name, value] of Object.entries(source)) {
      if (!safeFileName(name)) {
        skipped.push(name);
        continue;
      }
      await writeFile(join(this.dir, name), JSON.stringify(value, null, 2), "utf8");
      restored.push(name);
    }
    return { restored, skipped, at: new Date().toISOString() };
  }
}
