# Generates public/og-image.jpg (1200x630) — the default Open Graph / Twitter
# share image. Pure System.Drawing (GDI+), no extra dependencies.
#
# Usage:  powershell -ExecutionPolicy Bypass -File scripts/generate-og-image.ps1
# Output: public/og-image.jpg  (JPEG, quality 88, target < 300 KB)

Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$outPath = Join-Path $root 'public/og-image.jpg'

$w = 1200
$h = 630

$bmp = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

function Color($r, $gr, $b, $a = 255) {
  return [System.Drawing.Color]::FromArgb($a, $r, $gr, $b)
}

# ---- Background -------------------------------------------------------------
$bgBrush = New-Object System.Drawing.SolidBrush (Color 5 6 10)
$g.FillRectangle($bgBrush, 0, 0, $w, $h)

# Soft accent glows (radial via PathGradientBrush on ellipses).
function Draw-Glow($cx, $cy, $rx, $ry, [System.Drawing.Color]$center) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddEllipse($cx - $rx, $cy - $ry, $rx * 2, $ry * 2)
  $brush = New-Object System.Drawing.Drawing2D.PathGradientBrush $path
  $brush.CenterColor = $center
  $transparent = Color ($center.R) ($center.G) ($center.B) 0
  $brush.SurroundColors = @($transparent)
  $g.FillEllipse($brush, $cx - $rx, $cy - $ry, $rx * 2, $ry * 2)
  $brush.Dispose(); $path.Dispose()
}
Draw-Glow 180 90 520 380 (Color 57 255 139 26)    # green, top-left
Draw-Glow 1080 560 520 360 (Color 55 213 255 22)  # cyan, bottom-right

# Faint grid.
$gridPen = New-Object System.Drawing.Pen (Color 30 36 54 60), 1
for ($x = 0; $x -le $w; $x += 60) { $g.DrawLine($gridPen, $x, 0, $x, $h) }
for ($y = 0; $y -le $h; $y += 60) { $g.DrawLine($gridPen, 0, $y, $w, $y) }
$gridPen.Dispose()

function RoundRectPath($x, $y, $wd, $ht, $r) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddArc($x, $y, $r * 2, $r * 2, 180, 90)
  $path.AddArc($x + $wd - $r * 2, $y, $r * 2, $r * 2, 270, 90)
  $path.AddArc($x + $wd - $r * 2, $y + $ht - $r * 2, $r * 2, $r * 2, 0, 90)
  $path.AddArc($x, $y + $ht - $r * 2, $r * 2, $r * 2, 90, 90)
  $path.CloseFigure()
  return $path
}
# ---- "Developer room" monitor reference (right side) ------------------------
$mx = 730; $my = 150; $mw = 400; $mh = 250
Draw-Glow ($mx + $mw / 2) ($my + $mh / 2) 320 220 (Color 57 255 139 34)

$screenPath = RoundRectPath $mx $my $mw $mh 18
$screenFill = New-Object System.Drawing.SolidBrush (Color 11 14 22)
$screenPen = New-Object System.Drawing.Pen (Color 42 49 73), 2
$g.FillPath($screenFill, $screenPath)
$g.DrawPath($screenPen, $screenPath)

# Code lines on the screen.
$barBrushGreen = New-Object System.Drawing.SolidBrush (Color 57 255 139 200)
$barBrushCyan = New-Object System.Drawing.SolidBrush (Color 55 213 255 170)
$barBrushGray = New-Object System.Drawing.SolidBrush (Color 139 147 167 140)
$bars = @(
  @{ x = 26; y = 34; wd = 90; b = $barBrushGreen },
  @{ x = 46; y = 66; wd = 170; b = $barBrushGray },
  @{ x = 46; y = 98; wd = 120; b = $barBrushCyan },
  @{ x = 66; y = 130; wd = 150; b = $barBrushGray },
  @{ x = 46; y = 162; wd = 100; b = $barBrushCyan },
  @{ x = 26; y = 194; wd = 60; b = $barBrushGreen }
)
foreach ($bar in $bars) {
  $path = RoundRectPath ($mx + $bar.x) ($my + $bar.y) $bar.wd 10 5
  $g.FillPath($bar.b, $path)
  $path.Dispose()
}

# Monitor stand.
$standBrush = New-Object System.Drawing.SolidBrush (Color 24 29 45)
$g.FillRectangle($standBrush, $mx + $mw / 2 - 14, $my + $mh, 28, 34)
$g.FillRectangle($standBrush, $mx + $mw / 2 - 60, $my + $mh + 34, 120, 8)

# ---- Identity block (left) --------------------------------------------------
# AF monogram badge.
$badgePath = RoundRectPath 80 64 76 76 18
$badgeFill = New-Object System.Drawing.SolidBrush (Color 57 255 139 26)
$badgePen = New-Object System.Drawing.Pen (Color 57 255 139 180), 2
$g.FillPath($badgeFill, $badgePath)
$g.DrawPath($badgePen, $badgePath)
$monoFont = New-Object System.Drawing.Font('Consolas', 26, [System.Drawing.FontStyle]::Bold)
$textBrush = New-Object System.Drawing.SolidBrush (Color 232 236 244)
$accentBrush = New-Object System.Drawing.SolidBrush (Color 57 255 139)
$mutedBrush = New-Object System.Drawing.SolidBrush (Color 139 147 167)
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center
$sf.LineAlignment = [System.Drawing.StringAlignment]::Center
$g.DrawString('AF', $monoFont, $accentBrush, (New-Object System.Drawing.RectangleF(80, 63, 76, 76)), $sf)

# Accent rule above the name (echoes the site's small accent rule).
$accentRule = New-Object System.Drawing.SolidBrush (Color 57 255 139)
$g.FillRectangle($accentRule, 82, 208, 56, 5)

# Name / role / specialties / domain.
$nameFont = New-Object System.Drawing.Font('Segoe UI', 58, [System.Drawing.FontStyle]::Bold)
$roleFont = New-Object System.Drawing.Font('Segoe UI', 33, [System.Drawing.FontStyle]::Regular)
$specFont = New-Object System.Drawing.Font('Segoe UI', 21, [System.Drawing.FontStyle]::Regular)
$domainFont = New-Object System.Drawing.Font('Consolas', 18, [System.Drawing.FontStyle]::Regular)
$g.DrawString('Ali Faniani', $nameFont, $textBrush, 78, 225)
$g.DrawString('Software Developer', $roleFont, $accentBrush, 82, 320)
$dot = [string][char]0xB7
$g.DrawString(('AI  {0}  Backend  {0}  Web  {0}  Automation' -f $dot), $specFont, $mutedBrush, 82, 382)
$g.DrawString('alifaniani.ir', $domainFont, $mutedBrush, 82, 545)

# ---- Save -------------------------------------------------------------------
$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
  Where-Object { $_.MimeType -eq 'image/jpeg' }
$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters 1
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter -ArgumentList ([System.Drawing.Imaging.Encoder]::Quality), 88L
$bmp.Save($outPath, $jpegCodec, $encoderParams)

$sizeKb = [math]::Round((Get-Item $outPath).Length / 1KB)
Write-Host ("og-image.jpg generated - 1200x630, {0} KB -> {1}" -f $sizeKb, $outPath)

$g.Dispose(); $bmp.Dispose()
