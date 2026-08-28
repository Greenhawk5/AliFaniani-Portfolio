# Generates PNG icons for Apple touch + web manifest, matching the favicon.svg
# design (dark rounded square, green AF monogram, green border).
#
# Usage: powershell -ExecutionPolicy Bypass -File scripts/generate-icons.ps1
# Output: public/apple-touch-icon.png (180), public/icon-192.png, public/icon-512.png

Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot

function New-Icon([int]$size, [string]$path) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

  # Background (favicon base color), full bleed for mask safety.
  $bg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 10, 13, 22))
  $g.FillRectangle($bg, 0, 0, $size, $size)

  # Rounded inner border (green, 45% opacity equivalent).
  $inset = [Math]::Max(2, [int]($size * 0.03))
  $r = [int]($size * 0.22)
  $path2 = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $inset * 2
  $path2.AddArc($inset, $inset, $r, $r, 180, 90)
  $path2.AddArc($size - $inset - $r, $inset, $r, $r, 270, 90)
  $path2.AddArc($size - $inset - $r, $size - $inset - $r, $r, $r, 0, 90)
  $path2.AddArc($inset, $size - $inset - $r, $r, $r, 90, 90)
  $path2.CloseFigure()
  $penColor = [System.Drawing.Color]::FromArgb(115, 57, 255, 139)
  $penWidth = [Math]::Max(2, [int]($size * 0.03))
  $pen = New-Object System.Drawing.Pen ($penColor), $penWidth
  $g.DrawPath($pen, $path2)

  # AF monogram, centered.
  $font = New-Object System.Drawing.Font('Consolas', ($size * 0.40), [System.Drawing.FontStyle]::Bold)
  $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 57, 255, 139))
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = [System.Drawing.StringAlignment]::Center
  $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
  $rect = New-Object System.Drawing.RectangleF -ArgumentList ([single]0), ([single]($size * 0.02)), ([single]$size), ([single]$size)
  $g.DrawString('AF', $font, $brush, $rect, $sf)

  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Host ("icon written: {0} ({1}x{1})" -f $path, $size)
  $g.Dispose(); $bmp.Dispose()
}

New-Icon 180 (Join-Path $root 'public/apple-touch-icon.png')
New-Icon 192 (Join-Path $root 'public/icon-192.png')
New-Icon 512 (Join-Path $root 'public/icon-512.png')
