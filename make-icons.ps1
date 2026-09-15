<#
    make-icons.ps1 - erzeugt die PWA-Icons aus logo.svg (MS-Monogramm).
    Muss nur laufen, wenn sich das Logo aendert.

    Rasterisiert wird mit dem headless Browser, weil logo.svg aus
    nachgezeichneten Pfaden mit Verlaeufen besteht - das laesst sich nicht
    sinnvoll mit System.Drawing nachbauen. favicon.svg bleibt unberuehrt,
    das ist dieselbe Zeichnung in einem quadratischen Rahmen.
#>
[CmdletBinding()] param()
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$root = $PSScriptRoot
$bg   = "#07080d"   # Seitenhintergrund

$browser = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $browser) { throw "Weder Chrome noch Edge gefunden - ohne Browser keine Rasterisierung." }

# Gross rendern und danach herunterrechnen, das gibt saubere Kanten.
$render = 2048
$svg    = [Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $root "logo.svg")))
$tmp    = Join-Path ([IO.Path]::GetTempPath()) ("icons-" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tmp | Out-Null

function New-Shot {
    param([string] $Name, [double] $Inset, [int] $Radius)

    $inner = [int]($render * (1 - 2 * $Inset))
    $html  = Join-Path $tmp "$Name.html"
    @"
<!doctype html><meta charset=utf-8>
<style>html,body{margin:0;padding:0;background:transparent}
.b{width:${render}px;height:${render}px;background:$bg;border-radius:${Radius}px;display:flex;align-items:center;justify-content:center}
img{width:${inner}px;height:${inner}px;object-fit:contain}</style>
<div class=b><img src="data:image/svg+xml;base64,$svg"></div>
"@ | Set-Content -Path $html -Encoding UTF8

    $out = Join-Path $tmp "$Name.png"
    $url = "file:///" + $html.Replace([char]92, "/")
    & $browser --headless=new --disable-gpu --hide-scrollbars `
        --default-background-color=00000000 --force-device-scale-factor=1 `
        "--window-size=$render,$render" "--screenshot=$out" $url | Out-Null
    if (-not (Test-Path $out)) { throw "Rasterisierung fehlgeschlagen: $Name" }
    return $out
}

function Save-Scaled {
    param([string] $Source, [int] $Size, [string] $Path)

    $src = [System.Drawing.Image]::FromFile($Source)
    $bmp = [System.Drawing.Bitmap]::new($Size, $Size)
    $g   = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = 'HighQualityBicubic'
    $g.PixelOffsetMode   = 'HighQuality'
    $g.SmoothingMode     = 'AntiAlias'
    $g.DrawImage($src, 0, 0, $Size, $Size)
    $g.Dispose()
    $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose(); $src.Dispose()
    Write-Host "  $([IO.Path]::GetFileName($Path)) ($Size x $Size)"
}

Write-Host "Icons werden erzeugt:" -ForegroundColor Cyan
try {
    # Abgerundetes Quadrat fuer die normalen Icons ...
    $any = New-Shot -Name "any" -Inset 0.12 -Radius ([int]($render * 0.22))
    Save-Scaled -Source $any -Size 512 -Path (Join-Path $root "icon-512.png")
    Save-Scaled -Source $any -Size 192 -Path (Join-Path $root "icon-192.png")
    Save-Scaled -Source $any -Size 180 -Path (Join-Path $root "icon-180.png")

    # ... randlos und mit mehr Luft fuer maskable, da schneidet Android selbst zu.
    $mask = New-Shot -Name "maskable" -Inset 0.22 -Radius 0
    Save-Scaled -Source $mask -Size 512 -Path (Join-Path $root "icon-maskable-512.png")
}
finally {
    Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
}
Write-Host "Fertig." -ForegroundColor Green
