# Persistent POS print worker.
# Loads System.Drawing once, then loops draining one JSON job at a time so
# receipts print without paying PowerShell cold-start + Add-Type per job.
# Job files:    <dir>/job-<id>.json   (written by the Node backend)
# Result files: <dir>/done-<id>.json   (written by this worker)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$dir = $args[0]
$ownerPid = $args[1]
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
# Only one worker may own a job folder: if a worker from a live backend already
# owns it, exit so two workers never race for the same jobs.
$marker = Join-Path $dir 'owner.pid'
$other = $null
if (Test-Path $marker) {
  try { $other = (Get-Content $marker -Raw -Encoding Ascii).Trim() } catch { }
  if ($other -and $other -ne [string]$ownerPid) {
    $otherAlive = $false
    try { $otherAlive = (Get-Process -Id ([int]$other) -ErrorAction SilentlyContinue) -ne $null } catch { }
    if ($otherAlive) { exit 0 }
  }
}
Set-Content -Path $marker -Encoding Ascii -Value ([string]$ownerPid)
Get-ChildItem $dir -Filter 'job-*.json' -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
Get-ChildItem $dir -Filter 'done-*.json' -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue

function Receive-Job {
  Get-ChildItem $dir -Filter 'job-*.json' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime | Select-Object -First 1
}

function Write-Done {
  param($id, $ok, $message)
  $payload = @{ id = $id; ok = $ok; message = $message } | ConvertTo-Json -Compress
  Set-Content -Path (Join-Path $dir ('done-' + $id + '.json')) -Encoding UTF8 -Value $payload
}

function Print-Rich {
  param($job)
  $printer = [string]$job.printer
  $widthMm = [double]$job.widthMm
  $copies = [int]$job.copies
  $layout = @($job.layout)
  $widthPt = [math]::Round((($widthMm / 25.4) * 72) * 100) / 100
  $widthHundredths = [math]::Round($widthMm / 25.4 * 100)
  $padX = 6
  $padTop = 8
  $padBottom = 14

  $fontNormal = New-Object System.Drawing.Font('Consolas', 10, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Point)
  $fontBold = New-Object System.Drawing.Font('Consolas', 10, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Point)
  $fontTitle = New-Object System.Drawing.Font('Consolas', 13, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Point)
  try {
    $brush = [System.Drawing.Brushes]::Black
    $brushGray = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 112, 117, 128))
    $dashPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(160, 90, 95, 102), 1)
    $dashPen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash

    $measure = New-Object System.Drawing.Bitmap(1, 1)
    try {
      $g = [System.Drawing.Graphics]::FromImage($measure)
      $g.PageUnit = [System.Drawing.GraphicsUnit]::Point
      $lineNormal = $fontNormal.GetHeight($g)
      $lineBold = $fontBold.GetHeight($g)
      $lineTitle = $fontTitle.GetHeight($g)
      $yy = [double]$padTop
      foreach ($seg in $layout) {
        switch ([string]$seg.t) {
          'c' { $yy += $(if ([bool]$seg.bold) { $lineTitle } else { $lineNormal }) + 2 }
          'r' { $yy += $(if ([bool]$seg.bold) { $lineBold } else { $lineNormal }) + 1 }
          'd' { $yy += 9 }
          's' { $yy += [double]$seg.h }
          'img' { $yy += [double]$seg.hMm * 72.0 / 25.4 + 6 }
        }
      }
      $yy += [double]$padBottom
      $g.Dispose()
    } finally {
      $measure.Dispose()
    }
    $heightHundredths = [int][math]::Max(220, [int][math]::Round($yy * 100.0 / 72.0) + 12)

    $paper = New-Object System.Drawing.Printing.PaperSize('Receipt', $widthHundredths, $heightHundredths)
    $doc = New-Object System.Drawing.Printing.PrintDocument
    try {
      $doc.PrinterSettings.PrinterName = $printer
      $doc.DefaultPageSettings.PaperSize = $paper
      $doc.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0)
      $doc.OriginAtMargins = $false
      $null = $doc.add_PrintPage({
        param($sender, $e)
        $gg = $e.Graphics
        $gg.PageUnit = [System.Drawing.GraphicsUnit]::Point
        $vb = $gg.VisibleClipBounds
        $originX = [math]::Max(0, [double]$vb.X)
        $useWpt = [double]$vb.Width - $originX
        if ($useWpt -lt 60 -or $useWpt -gt ($widthPt + 80)) { $useWpt = $widthPt }
        if ($useWpt -gt $widthPt) { $useWpt = $widthPt }
        $rectX = $originX + $padX
        $rectW = [math]::Max(1.0, $useWpt - 2 * $padX)
        $xMax = $rectX + $rectW
        $yy = [double]$padTop
        foreach ($seg in $layout) {
          switch ([string]$seg.t) {
            'c' {
              $f = if ([bool]$seg.bold) { $fontTitle } else { $fontNormal }
              $b = if ([bool]$seg.bold) { $brush } else { $brushGray }
              $lh = if ([bool]$seg.bold) { $lineTitle } else { $lineNormal }
              $sf = New-Object System.Drawing.StringFormat
              $sf.Alignment = [System.Drawing.StringAlignment]::Center
              $sf.LineAlignment = [System.Drawing.StringAlignment]::Near
              $sf.FormatFlags = $sf.FormatFlags -bor [System.Drawing.StringFormatFlags]::NoWrap
              $rect = New-Object System.Drawing.RectangleF([single]$rectX, [single]$yy, [single]$rectW, [single]$lh)
              $gg.DrawString([string]$seg.text, $f, $b, $rect, $sf)
              $yy += $lh + 2
              $sf.Dispose()
            }
            'r' {
              $f = if ([bool]$seg.bold) { $fontBold } else { $fontNormal }
              $b = if ([bool]$seg.gray) { $brushGray } else { $brush }
              $lh = if ([bool]$seg.bold) { $lineBold } else { $lineNormal }
              $sfL = New-Object System.Drawing.StringFormat
              $sfL.Trimming = [System.Drawing.StringTrimming]::EllipsisCharacter
              $sfL.FormatFlags = $sfL.FormatFlags -bor [System.Drawing.StringFormatFlags]::NoWrap
              $sfR = New-Object System.Drawing.StringFormat
              $sfR.Alignment = [System.Drawing.StringAlignment]::Far
              $sfR.Trimming = [System.Drawing.StringTrimming]::EllipsisCharacter
              $sfR.FormatFlags = $sfR.FormatFlags -bor [System.Drawing.StringFormatFlags]::NoWrap
              $rect = New-Object System.Drawing.RectangleF([single]$rectX, [single]$yy, [single]$rectW, [single]$lh)
              $gg.DrawString([string]$seg.l, $f, $b, $rect, $sfL)
              $gg.DrawString([string]$seg.r, $f, $b, $rect, $sfR)
              $yy += $lh + 1
              $sfL.Dispose()
              $sfR.Dispose()
            }
            'd' {
              $gg.DrawLine($dashPen, [single]$rectX, [single]($yy + 3), [single]$xMax, [single]($yy + 3))
              $yy += 9
            }
            's' { $yy += [double]$seg.h }
            'img' {
              $bytes = [Convert]::FromBase64String([string]$seg.b64)
              $stream = New-Object System.IO.MemoryStream(,$bytes)
              $img = [System.Drawing.Bitmap]::FromStream($stream)
              $dpiX = $gg.DpiX
              $dpiY = $gg.DpiY
              $wPx = [int][math]::Round([double]$seg.wMm / 25.4 * $dpiX)
              $hPx = [int][math]::Round([double]$seg.hMm / 25.4 * $dpiY)
              $wPt = [double]$seg.wMm * 72.0 / 25.4
              if ($wPt -gt $rectW) { $wPt = $rectW }
              $oxPt = $rectX + [math]::Max(0, (($rectW - $wPt) / 2))
              $oxPx = [int][math]::Round([double]$oxPt / 72.0 * $dpiX)
              $oyPx = [int][math]::Round([double]$yy / 72.0 * $dpiY)
              $gg.PageUnit = [System.Drawing.GraphicsUnit]::Pixel
              $gg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
              $gg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
              $dest = New-Object System.Drawing.Rectangle($oxPx, $oyPx, $wPx, $hPx)
              $gg.DrawImage($img, $dest)
              $gg.PageUnit = [System.Drawing.GraphicsUnit]::Point
              $img.Dispose()
              $stream.Dispose()
              $yy += [double]$seg.hMm * 72.0 / 25.4 + 6
            }
          }
        }
      })
      for ($cp = 1; $cp -le $copies; $cp++) { $doc.Print() }
    } finally {
      $doc.Dispose()
    }
  } finally {
    $fontNormal.Dispose()
    $fontBold.Dispose()
    $fontTitle.Dispose()
  }
}

function Print-Text {
  param($job)
  $printer = [string]$job.printer
  $widthMm = [double]$job.widthMm
  $content = [string]$job.content
  $widthIn = [math]::Round(($widthMm / 25.4) * 100)
  $lines = @($content -split "`n" | Where-Object { $_.Length -gt 0 })
  $longest = 1
  foreach ($ln in $lines) { if ($ln.Length -gt $longest) { $longest = $ln.Length } }
  $availablePt = ($widthMm / 25.4) * 72
  $fontSize = [math]::Min(18, [math]::Max(6, [math]::Floor(($availablePt / ($longest * 0.6)) * 100) / 100))
  $charW = $fontSize * 0.6
  $widthChars = [math]::Max(1, [math]::Floor($availablePt / $charW))
  $wrappedLines = 0
  foreach ($ln in $lines) { $wrappedLines += [math]::Max(1, [math]::Ceiling(($ln.Length + 1) / $widthChars)) }
  $lineHeightPt = $fontSize * 1.3
  $heightPt = $wrappedLines * $lineHeightPt + $fontSize
  $heightIn = [math]::Max(450, [math]::Ceiling(($heightPt * 100) / 72))

  $font = New-Object System.Drawing.Font('Courier New', [single]$fontSize, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Point)
  try {
    $paper = New-Object System.Drawing.Printing.PaperSize('Receipt', $widthIn, $heightIn)
    $doc = New-Object System.Drawing.Printing.PrintDocument
    try {
      $doc.PrinterSettings.PrinterName = $printer
      $doc.DefaultPageSettings.PaperSize = $paper
      $doc.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0)
      $doc.OriginAtMargins = $false
      $null = $doc.add_PrintPage({
        param($sender, $e)
        $e.Graphics.PageUnit = [System.Drawing.GraphicsUnit]::Point
        $rect = New-Object System.Drawing.RectangleF(0, 0, [single]$availablePt, [single]$heightPt)
        $e.Graphics.DrawString($content, $font, [System.Drawing.Brushes]::Black, $rect)
      })
      $doc.Print()
    } finally {
      $doc.Dispose()
    }
  } finally {
    $font.Dispose()
  }
}

while ($true) {
  $jobFile = Receive-Job
  if ($jobFile) {
    $id = ($jobFile.BaseName -replace '^job-','')
    $ok = $false
    $message = ''
    try {
      $raw = Get-Content $jobFile.FullName -Raw -Encoding UTF8
      $job = $raw | ConvertFrom-Json
      if ($job.kind -eq 'rich') { Print-Rich $job } else { Print-Text $job }
      $ok = $true
    } catch {
      $message = $_.Exception.Message
    }
    try { Write-Done $id $ok $message } catch { }
    Remove-Item $jobFile.FullName -Force -ErrorAction SilentlyContinue
  } else {
    Start-Sleep -Milliseconds 60
  }
}