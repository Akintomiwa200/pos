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

/**
 * One primitive line of the receipt layout the till sends for GDI+ rendering.
 * Text is drawn natively (always crisp at the printer's resolution); only the
 * barcode is a raster image.
 */
export type ReceiptRichLine =
  | { t: "c"; text: string; bold?: boolean }
  | { t: "r"; l: string; r: string; gray?: boolean; bold?: boolean }
  | { t: "d" }
  | { t: "s"; h?: number }
  | { t: "img"; b64: string; wMm: number; hMm: number };

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
          "$cfg = @{}; Get-CimInstance Win32_PrinterConfiguration | ForEach-Object { $cfg[$_.Name] = New-Object PSObject -Property @{ H = $_.HorizontalResolution; V = $_.VerticalResolution } }; Get-CimInstance Win32_Printer | ForEach-Object { $c = $cfg[$_.Name]; [PSCustomObject]@{ Name = $_.Name; Default = $_.Default; DriverName = $_.DriverName; PortName = $_.PortName; WorkOffline = $_.WorkOffline; Dpi = if ($c) { [int][math]::Max([int]$c.H, [int]$c.V) } else { 0 } } } | ConvertTo-Json -Compress",
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
          // Native print resolution (dots per inch). Used by the till to rasterise
          // the receipt 1:1 so the driver never has to re-sample (the cause of
          // soft, blurry text). Falls back to 203 DPI, the thermal-receipt norm.
          dpi:
            typeof row.Dpi === "number" && row.Dpi > 0
              ? Math.round(row.Dpi)
              : 203,
        }));
    } catch {
      return [];
    }
  }

  async print(printerName: string, content: string, widthMm = 80) {
    if (process.platform !== "win32") {
      throw new Error("Printing is available on the Windows POS terminal.");
    }
    const widthIn = Math.round((widthMm / 25.4) * 100);
    const text = content.replace(/\r\n/g, "\n");
    const lines = text.split("\n").filter((line) => line.length > 0);
    const longest = Math.max(1, ...lines.map((line) => line.length));
    const availablePt = (widthMm / 25.4) * 72;
    const fontSize = Math.min(
      18,
      Math.max(6, Math.floor((availablePt / (longest * 0.6)) * 100) / 100),
    );
    const charW = fontSize * 0.6;
    const widthChars = Math.max(1, Math.floor(availablePt / charW));
    let wrappedLines = 0;
    for (const line of lines) {
      wrappedLines += Math.max(1, Math.ceil((line.length + 1) / widthChars));
    }
    const lineHeightPt = fontSize * 1.3;
    const heightPt = wrappedLines * lineHeightPt + fontSize;
    const heightIn = Math.max(450, Math.ceil((heightPt * 100) / 72));

    const escapedPrinter = printerName.replace(/'/g, "''");
    const script = [
      "Add-Type -AssemblyName System.Drawing",
      `$printer = '${escapedPrinter}'`,
      `$script:fontPt = ${fontSize}`,
      `$script:widthPt = ${Math.round(availablePt * 100) / 100}`,
      `$script:heightPt = ${Math.round(heightPt * 100) / 100}`,
      `$script:widthIn = ${widthIn}`,
      `$script:heightIn = ${heightIn}`,
      `$script:text = @'`,
      text,
      `'@`,
      `$font = New-Object System.Drawing.Font('Courier New', [single]$script:fontPt, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Point)`,
      `$script:font = $font`,
      `$paper = New-Object System.Drawing.Printing.PaperSize('Receipt', $script:widthIn, $script:heightIn)`,
      `$doc = New-Object System.Drawing.Printing.PrintDocument`,
      `$doc.PrinterSettings.PrinterName = $printer`,
      `$doc.DefaultPageSettings.PaperSize = $paper`,
      `$doc.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0)`,
      `$doc.OriginAtMargins = $false`,
      `$null = $doc.add_PrintPage({`,
      `  param($sender, $e)`,
      `  $e.Graphics.PageUnit = [System.Drawing.GraphicsUnit]::Point`,
      `  $rect = New-Object System.Drawing.RectangleF(0, 0, [single]$script:widthPt, [single]$script:heightPt)`,
      `  $e.Graphics.DrawString($script:text, $script:font, [System.Drawing.Brushes]::Black, $rect)`,
      `})`,
      `try {`,
      `  $doc.Print()`,
      `} finally {`,
      `  $doc.Dispose()`,
      `  $font.Dispose()`,
      `}`,
      `Write-Output "printed"`,
    ];

    const file = join(tmpdir(), `pos-receipt-${Date.now()}.ps1`);
    await writeFile(file, "\uFEFF" + script.join("\r\n"), "utf8");
    try {
      const { stdout } = await execFileAsync(
        "powershell.exe",
        ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", file],
        { windowsHide: true, timeout: 60000 },
      );
      if (!/printed/.test(stdout)) {
        throw new Error(`The printer did not confirm the job on "${printerName}".`);
      }
      return { ok: true, printer: printerName, paper: `${widthMm}mm` };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Print failed";
      throw new Error(`Receipt print failed on "${printerName}". ${message}`);
    } finally {
      await unlink(file).catch(() => undefined);
    }
  }

  /**
   * Print a receipt that mirrors the on-screen ReceiptVisual preview. Text rows are
   * drawn natively with GDI+ DrawString (Consolas, resolution-independent points),
   * so the driver prints them at its native DPI — pixel-crisp, never blurred by
   * raster re-sampling. Only the CODE128 barcode is a bitmap, drawn 1:1 per-pixel.
   */
  async printRichLayout(
    printerName: string,
    layout: Array<Record<string, unknown>>,
    widthMm = 80,
    copies = 1,
  ) {
    if (process.platform !== "win32") {
      throw new Error("Printing is available on the Windows POS terminal.");
    }
    if (layout.length === 0) {
      throw new Error("No receipt lines to print.");
    }
    const layoutJson = JSON.stringify(layout);
    // Base64 keeps non-ASCII receipt text (₦, accented names) safe inside the
    // PowerShell source, whose encoding PowerShell 5.1 may otherwise misread.
    const layoutB64 = Buffer.from(layoutJson, "utf8").toString("base64");
    const escapedPrinter = printerName.replace(/'/g, "''");
    const widthPt = Math.round(((widthMm / 25.4) * 72) * 100) / 100;
    const widthHundredths = Math.round((widthMm / 25.4) * 100);
    const loop = Math.max(1, Math.min(99, Math.floor(copies)));

    const script = [
      "Add-Type -AssemblyName System.Drawing",
      `$printer = '${escapedPrinter}'`,
      `$layoutB64 = '${layoutB64}'`,
      `$layoutBytes = [System.Convert]::FromBase64String($layoutB64)`,
      `$layoutJson = [System.Text.Encoding]::UTF8.GetString($layoutBytes)`,
      `$layout = $layoutJson | ConvertFrom-Json`,
      `$copies = ${loop}`,
      `$widthPt = ${widthPt}`,
      `$padX = 6`,
      `$padTop = 8`,
      `$padBottom = 8`,
      `$fontNormal = New-Object System.Drawing.Font('Consolas', 10, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Point)`,
      `$fontBold = New-Object System.Drawing.Font('Consolas', 10, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Point)`,
      `$fontTitle = New-Object System.Drawing.Font('Consolas', 13, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Point)`,
      `$brush = [System.Drawing.Brushes]::Black`,
      `$brushGray = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 112, 117, 128))`,
      `$dashPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(160, 90, 95, 102), 1)`,
      `$dashPen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash`,
      `$measure = New-Object System.Drawing.Bitmap(1, 1)`,
      `$g = [System.Drawing.Graphics]::FromImage($measure)`,
      `$g.PageUnit = [System.Drawing.GraphicsUnit]::Point`,
      `$lineNormal = $fontNormal.GetHeight($g)`,
      `$lineBold = $fontBold.GetHeight($g)`,
      `$lineTitle = $fontTitle.GetHeight($g)`,
      `$yy = [double]$padTop`,
      `foreach ($seg in $layout) {`,
      `  switch ([string]$seg.t) {`,
      `    'c' { $yy += $(if ([bool]$seg.bold) { $lineTitle } else { $lineNormal }) + 2 }`,
      `    'r' { $yy += $(if ([bool]$seg.bold) { $lineBold } else { $lineNormal }) + 1 }`,
      `    'd' { $yy += 9 }`,
      `    's' { $yy += [double]$seg.h }`,
      `    'img' { $yy += [double]$seg.hMm * 72.0 / 25.4 + 6 }`,
      `  }`,
      `}`,
      `$yy += [double]$padBottom`,
      `$g.Dispose()`,
      `$measure.Dispose()`,
      `$heightHundredths = [int][math]::Max(220, [int][math]::Round($yy * 100.0 / 72.0))`,
      `$paper = New-Object System.Drawing.Printing.PaperSize('Receipt', ${widthHundredths}, $heightHundredths)`,
      `$doc = New-Object System.Drawing.Printing.PrintDocument`,
      `$doc.PrinterSettings.PrinterName = $printer`,
      `$doc.DefaultPageSettings.PaperSize = $paper`,
      `$doc.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0)`,
      `$doc.OriginAtMargins = $false`,
      `$null = $doc.add_PrintPage({`,
      `  param($sender, $e)`,
      `  $gg = $e.Graphics`,
      `  $gg.PageUnit = [System.Drawing.GraphicsUnit]::Point`,
      `  $xMax = $widthPt - $padX`,
      `  $yy = [double]$padTop`,
      `  foreach ($seg in $layout) {`,
      `    switch ([string]$seg.t) {`,
      `      'c' {`,
      `        $f = if ([bool]$seg.bold) { $fontTitle } else { $fontNormal }`,
      `        $b = if ([bool]$seg.bold) { $brush } else { $brushGray }`,
      `        $lh = if ([bool]$seg.bold) { $lineTitle } else { $lineNormal }`,
      `        $sf = New-Object System.Drawing.StringFormat`,
      `        $sf.Alignment = [System.Drawing.StringAlignment]::Center`,
      `        $sf.LineAlignment = [System.Drawing.StringAlignment]::Near`,
      `        $sf.FormatFlags = $sf.FormatFlags -bor [System.Drawing.StringFormatFlags]::NoWrap`,
      `        $rect = New-Object System.Drawing.RectangleF([single]$padX, [single]$yy, [single]($widthPt - 2 * $padX), [single]$lh)`,
      `        $gg.DrawString([string]$seg.text, $f, $b, $rect, $sf)`,
      `        $yy += $lh + 2`,
      `        $sf.Dispose()`,
      `      }`,
      `      'r' {`,
      `        $f = if ([bool]$seg.bold) { $fontBold } else { $fontNormal }`,
      `        $b = if ([bool]$seg.gray) { $brushGray } else { $brush }`,
      `        $lh = if ([bool]$seg.bold) { $lineBold } else { $lineNormal }`,
      `        $sfL = New-Object System.Drawing.StringFormat`,
      `        $sfL.Trimming = [System.Drawing.StringTrimming]::EllipsisCharacter`,
      `        $sfL.FormatFlags = $sfL.FormatFlags -bor [System.Drawing.StringFormatFlags]::NoWrap`,
      `        $sfR = New-Object System.Drawing.StringFormat`,
      `        $sfR.Alignment = [System.Drawing.StringAlignment]::Far`,
      `        $sfR.Trimming = [System.Drawing.StringTrimming]::EllipsisCharacter`,
      `        $sfR.FormatFlags = $sfR.FormatFlags -bor [System.Drawing.StringFormatFlags]::NoWrap`,
      `        $rect = New-Object System.Drawing.RectangleF([single]$padX, [single]$yy, [single]($widthPt - 2 * $padX), [single]$lh)`,
      `        $gg.DrawString([string]$seg.l, $f, $b, $rect, $sfL)`,
      `        $gg.DrawString([string]$seg.r, $f, $b, $rect, $sfR)`,
      `        $yy += $lh + 1`,
      `        $sfL.Dispose()`,
      `        $sfR.Dispose()`,
      `      }`,
      `      'd' {`,
      `        $gg.DrawLine($dashPen, [single]$padX, [single]($yy + 3), [single]$xMax, [single]($yy + 3))`,
      `        $yy += 9`,
      `      }`,
      `      's' { $yy += [double]$seg.h }`,
      `      'img' {`,
      `        $bytes = [Convert]::FromBase64String([string]$seg.b64)`,
      `        $stream = New-Object System.IO.MemoryStream(, $bytes)`,
      `        $img = [System.Drawing.Bitmap]::FromStream($stream)`,
      `        $dpiX = $gg.DpiX`,
      `        $dpiY = $gg.DpiY`,
      `        $wPx = [int][math]::Round([double]$seg.wMm / 25.4 * $dpiX)`,
      `        $hPx = [int][math]::Round([double]$seg.hMm / 25.4 * $dpiY)`,
      `        $wPt = [double]$seg.wMm * 72.0 / 25.4`,
      `        $oxPt = [math]::Max(0, (($widthPt - $wPt) / 2))`,
      `        $oxPx = [int][math]::Round([double]$oxPt / 72.0 * $dpiX)`,
      `        $oyPx = [int][math]::Round([double]$yy / 72.0 * $dpiY)`,
      `        $gg.PageUnit = [System.Drawing.GraphicsUnit]::Pixel`,
      `        $gg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor`,
      `        $gg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None`,
      `        $dest = New-Object System.Drawing.Rectangle($oxPx, $oyPx, $wPx, $hPx)`,
      `        $gg.DrawImage($img, $dest)`,
      `        $gg.PageUnit = [System.Drawing.GraphicsUnit]::Point`,
      `        $img.Dispose()`,
      `        $stream.Dispose()`,
      `        $yy += [double]$seg.hMm * 72.0 / 25.4 + 6`,
      `      }`,
      `    }`,
      `  }`,
      `})`,
      `try {`,
      `  for ($cp = 1; $cp -le $copies; $cp++) { $doc.Print() }`,
      `} finally {`,
      `  $doc.Dispose()`,
      `  $fontNormal.Dispose()`,
      `  $fontBold.Dispose()`,
      `  $fontTitle.Dispose()`,
      `  $brushGray.Dispose()`,
      `  $dashPen.Dispose()`,
      `}`,
      `Write-Output "printed"`,
    ];

    const file = join(tmpdir(), `pos-receipt-rich-${Date.now()}.ps1`);
    await writeFile(file, "\uFEFF" + script.join("\r\n"), "utf8");
    try {
      const { stdout } = await execFileAsync(
        "powershell.exe",
        ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", file],
        { windowsHide: true, timeout: 60000 },
      );
      if (!/printed/.test(stdout)) {
        throw new Error(`The printer did not confirm the job on "${printerName}".`);
      }
      return { ok: true, printer: printerName, paper: `${widthMm}mm`, copies: loop };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Print failed";
      throw new Error(`Receipt print failed on "${printerName}". ${message}`);
    } finally {
      await unlink(file).catch(() => undefined);
    }
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
    `    $doc = New-Object System.Drawing.Printing.PrintDocument`,
    `    $doc.PrinterSettings.PrinterName = $printer`,
    `    $doc.DefaultPageSettings.PaperSize = $paper`,
    `    $doc.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0)`,
    `    $null = $doc.add_PrintPage({`,
    `      param($sender, $e)`,
    `      $dpiX = $e.Graphics.DpiX`,
    `      $dpiY = $e.Graphics.DpiY`,
    `      $wPx = [int][math]::Round([double]$job.widthMm / 25.4 * $dpiX)`,
    `      $hPx = [int][math]::Round([double]$job.heightMm / 25.4 * $dpiY)`,
    `      $ratio = 1.0`,
    `      if ($script:img.Width -gt $wPx) { $ratio = [math]::Min($ratio, $wPx / $script:img.Width) }`,
    `      if ($script:img.Height -gt $hPx) { $ratio = [math]::Min($ratio, $hPx / $script:img.Height) }`,
    `      $dw = [int][math]::Round($script:img.Width * $ratio)`,
    `      $dh = [int][math]::Round($script:img.Height * $ratio)`,
    `      $ox = [int][math]::Max(0, [math]::Round(($wPx - $dw) / 2))`,
    `      $oy = [int][math]::Max(0, [math]::Round(($hPx - $dh) / 2))`,
    `      $e.Graphics.PageUnit = [System.Drawing.GraphicsUnit]::Pixel`,
    `      $e.Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor`,
    `      $e.Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None`,
    `      $e.Graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality`,
    `      $dest = New-Object System.Drawing.Rectangle($ox, $oy, $dw, $dh)`,
    `      $e.Graphics.DrawImage($script:img, $dest)`,
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
    await writeFile(file, "\uFEFF" + script.join("\r\n"), "utf8");
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
