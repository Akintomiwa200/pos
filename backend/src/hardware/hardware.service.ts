import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Injectable } from "@nestjs/common";

const execFileAsync = promisify(execFile);

const PRINTER_CONFIG_FILE = join(process.cwd(), "data", "printer-config.json");

export type LabelPrintJob = {
  /** PNG raster of the label WITHOUT the data:image prefix (300 DPI recommended). */
  imageBase64: string;
  /** Physical label width in millimetres — must match the roll loaded in the printer. */
  widthMm: number;
  /** Physical label height in millimetres. */
  heightMm: number;
  copies?: number;
};

export type LabelPrinterConfig = {
  labelPrinter: string | null;
};

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

  async loadLabelPrinterConfig(): Promise<LabelPrinterConfig> {
    try {
      const raw = await readFile(PRINTER_CONFIG_FILE, "utf8");
      const parsed = JSON.parse(raw) as Partial<LabelPrinterConfig>;
      return { labelPrinter: typeof parsed.labelPrinter === "string" ? parsed.labelPrinter : null };
    } catch {
      return { labelPrinter: null };
    }
  }

  async saveLabelPrinterConfig(name: string | null) {
    const value: LabelPrinterConfig = { labelPrinter: name && name.trim() ? name.trim() : null };
    await mkdir(join(process.cwd(), "data"), { recursive: true });
    await writeFile(PRINTER_CONFIG_FILE, JSON.stringify(value, null, 2), "utf8");
    return value;
  }

  /**
   * Print raster labels to an installed Windows printer driver (XPrinter thermal
   * label printers etc.) without opening any browser dialog. Each label is sent as
   * its own page at the exact physical label size, which is how the Windows driver
   * maps the job onto the label roll loaded in the device.
   */
  async printLabels(printerName: string, labels: LabelPrintJob[]) {
    if (process.platform !== "win32") {
      throw new Error("Label printing is available on the Windows PC where the printer is installed.");
    }
    if (labels.length === 0) {
      throw new Error("No labels to print.");
    }
    const jobs = labels.map((label) => {
      const copies = Math.max(1, Math.min(999, Math.floor(label.copies ?? 1)));
      return {
        imageBase64: label.imageBase64,
        widthMm: label.widthMm,
        heightMm: label.heightMm,
        copies,
      };
    });

    const escapedPrinter = printerName.replace(/'/g, "''");
    const script = ["Add-Type -AssemblyName System.Drawing", `$printer = '${escapedPrinter}'`];
    script.push(
      `$jobsJson = @'`,
      JSON.stringify(jobs),
      `'@`,
      `$jobs = $jobsJson | ConvertFrom-Json`,
      `$count = 0`,
      `foreach ($job in $jobs) {`,
      `  for ($c = 1; $c -le [int]$job.copies; $c++) {`,
      `    $bytes = [Convert]::FromBase64String($job.imageBase64)`,
      `    $stream = New-Object System.IO.MemoryStream(,$bytes)`,
      `    $script:img = [System.Drawing.Bitmap]::FromStream($stream)`,
      `    $w = [int][math]::Round([double]$job.widthMm / 25.4 * 100)`,
      `    $h = [int][math]::Round([double]$job.heightMm / 25.4 * 100)`,
      `    $paper = New-Object System.Drawing.Printing.PaperSize('Label', $w, $h)`,
      `    $paper.RawKind = 9`,
      `    $doc = New-Object System.Drawing.Printing.PrintDocument`,
      `    $doc.PrinterSettings.PrinterName = $printer`,
      `    $doc.DefaultPageSettings.PaperSize = $paper`,
      `    $doc.DefaultPageSettings.PaperSize.RawKind = 9`,
      `    $doc.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0)`,
      `    $null = $doc.add_PrintPage({`,
      `      param($sender, $e)`,
      `      $e.Graphics.PageUnit = [System.Drawing.GraphicsUnit]::Display`,
      `      $e.Graphics.DrawImage($script:img, $e.PageBounds)`,
      `    })`,
      `    try {`,
      `      $doc.Print()`,
      `    } finally {`,
      `      $doc.Dispose()`,
      `      $script:img.Dispose()`,
      `      $stream.Dispose()`,
      `    }`,
      `    $count++`,
      `  }`,
      `}`,
      `Write-Output "printed=$count"`,
    );

    const file = join(tmpdir(), `pos-labels-${Date.now()}.ps1`);
    await writeFile(file, script.join("\r\n"), "utf8");
    try {
      const { stdout } = await execFileAsync(
        "powershell.exe",
        ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", file],
        { windowsHide: true, timeout: 120000 },
      );
      const printed = Number(/printed=(\d+)/.exec(stdout)?.[1] ?? 0);
      return {
        ok: true,
        printer: printerName,
        labels: printed || jobs.reduce((sum, job) => sum + job.copies, 0),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Print failed";
      throw new Error(`Label print failed on "${printerName}". ${message}`);
    } finally {
      await unlink(file).catch(() => undefined);
    }
  }
}
