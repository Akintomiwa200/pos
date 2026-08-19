import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Injectable } from "@nestjs/common";

const execFileAsync = promisify(execFile);

export type DetectedPrinter = {
  name: string;
  driver: string;
  port: string;
  isDefault: boolean;
  offline: boolean;
};

function formatHardwareHex(raw: string) {
  const hex = raw.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
  if (!hex) return "";
  return hex.match(/.{1,4}/g)?.join("-") ?? hex;
}

@Injectable()
export class HardwareService {
  async readDeviceHex(): Promise<{ hex: string; source: string }> {
    if (process.platform === "win32") {
      try {
        const { stdout } = await execFileAsync(
          "powershell.exe",
          [
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            "(Get-CimInstance Win32_ComputerSystemProduct).UUID",
          ],
          { windowsHide: true, timeout: 12000 },
        );
        const hex = formatHardwareHex(stdout);
        if (hex) return { hex, source: "Win32_ComputerSystemProduct.UUID" };
      } catch {
        /* fall through */
      }
    }
    try {
      const { hostname, networkInterfaces } = await import("node:os");
      const macs = Object.values(networkInterfaces())
        .flat()
        .filter((row) => row && !row.internal && row.mac && row.mac !== "00:00:00:00:00:00")
        .map((row) => row!.mac);
      const hex = formatHardwareHex(`${hostname()}|${macs.join("|")}`);
      if (hex) return { hex, source: "host-mac" };
    } catch {
      /* fall through */
    }
    return { hex: "", source: "unavailable" };
  }

  async listPrinters(): Promise<DetectedPrinter[]> {
    if (process.platform !== "win32") {
      return [];
    }
    try {
      const { stdout } = await execFileAsync(
        "powershell.exe",
        [
          "-NoProfile",
          "-NonInteractive",
          "-ExecutionPolicy",
          "Bypass",
          "-Command",
          "Get-CimInstance Win32_Printer | Select-Object Name,Default,DriverName,PortName,WorkOffline | ConvertTo-Json -Compress",
        ],
        { windowsHide: true, timeout: 15000 },
      );
      const parsed = JSON.parse(stdout || "[]") as
        | Record<string, unknown>
        | Record<string, unknown>[];
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      return rows
        .filter((row) => typeof row.Name === "string")
        .map((row) => ({
          name: String(row.Name),
          driver: String(row.DriverName ?? ""),
          port: String(row.PortName ?? ""),
          isDefault: Boolean(row.Default),
          offline: Boolean(row.WorkOffline),
        }));
    } catch {
      return [];
    }
  }

  async print(printerName: string, content: string) {
    if (process.platform !== "win32") {
      throw new Error("Printing is available on the Windows POS terminal.");
    }
    const file = join(tmpdir(), `pos-receipt-${Date.now()}.txt`);
    await writeFile(file, content.replace(/\n/g, "\r\n"), "utf8");
    const escapedPrinter = printerName.replace(/'/g, "''");
    const escapedFile = file.replace(/'/g, "''");
    try {
      await execFileAsync(
        "powershell.exe",
        [
          "-NoProfile",
          "-NonInteractive",
          "-ExecutionPolicy",
          "Bypass",
          "-Command",
          `Get-Content -LiteralPath '${escapedFile}' | Out-Printer -Name '${escapedPrinter}'`,
        ],
        { windowsHide: true, timeout: 20000 },
      );
    } finally {
      await unlink(file).catch(() => undefined);
    }
    return { ok: true, printer: printerName };
  }
}
