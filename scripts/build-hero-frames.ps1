# SPEC 4.3 - pipeline PowerShell do hero (Veo 3 -> 72 frames WebP).
# Single-pass: ffmpeg + libwebp embutido, sem cwebp separado.
# Auto-crop: roda cropdetect primeiro pra remover letterbox do render Veo.
# Requer ffmpeg e ffprobe no PATH (winget install Gyan.FFmpeg).

param(
  [string]$InputVideo = "veo3_output.mp4",
  [int]$TargetFrames = 72,
  [int]$Width = 1600,
  [int]$Quality = 88,
  [string]$Prefix = "jordan1",
  [switch]$NoAutoCrop
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $InputVideo)) {
  Write-Error "input video not found: $InputVideo"
}

foreach ($exe in @("ffmpeg", "ffprobe")) {
  if (-not (Get-Command $exe -ErrorAction SilentlyContinue)) {
    Write-Error "$exe not found in PATH. Install with: winget install Gyan.FFmpeg"
  }
}

$OutDir = "public/hero-sequence"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
Get-ChildItem -Path $OutDir -Filter "$Prefix-*.webp" -ErrorAction SilentlyContinue |
  Remove-Item -Force

# Probe duration so we re-derive the fps instead of hard-coding 9.
$duration = & ffprobe -v error -select_streams v:0 `
  -show_entries stream=duration `
  -of default=noprint_wrappers=1:nokey=1 $InputVideo
$duration = [double]$duration
$targetFps = [math]::Round($TargetFrames / $duration, 6)

# Detect letterbox via cropdetect. ffmpeg writes to stderr; ErrorActionPreference
# must be relaxed so stderr-as-error-records doesn't trip $ErrorActionPreference=Stop.
$cropFilter = ""
if (-not $NoAutoCrop) {
  $prevEAP = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $cropProbe = & ffmpeg -hide_banner -nostats `
    -i $InputVideo `
    -vf "cropdetect=24:16:0" `
    -frames:v 60 `
    -f null NUL 2>&1 | Out-String
  $ErrorActionPreference = $prevEAP

  $cropMatches = [regex]::Matches($cropProbe, 'crop=(\d+:\d+:\d+:\d+)')
  if ($cropMatches.Count -gt 0) {
    $cropSpec = $cropMatches[$cropMatches.Count - 1].Groups[1].Value
    $cropFilter = "crop=${cropSpec},"
    Write-Host "auto-crop    : crop=$cropSpec"
  } else {
    Write-Host "auto-crop    : no letterbox detected"
  }
}

$videoFilter = "${cropFilter}fps=${targetFps},scale=${Width}:-1:flags=lanczos"

Write-Host "input        : $InputVideo"
Write-Host "duration     : ${duration}s"
Write-Host "target frames: $TargetFrames"
Write-Host "target fps   : $targetFps"
Write-Host "width        : ${Width}px"
Write-Host "quality      : $Quality"
Write-Host "filter       : $videoFilter"
Write-Host "output       : $OutDir/"
Write-Host ""

$pattern = Join-Path $OutDir "$Prefix-%03d.webp"

& ffmpeg -y -loglevel error -i $InputVideo `
  -vf $videoFilter `
  -c:v libwebp -compression_level 6 -quality $Quality -preset picture `
  -loop 0 -an `
  -frames:v $TargetFrames `
  $pattern

if ($LASTEXITCODE -ne 0) {
  Write-Error "ffmpeg failed with exit code $LASTEXITCODE"
}

$produced = Get-ChildItem -Path $OutDir -Filter "$Prefix-*.webp"
if ($produced.Count -ne $TargetFrames) {
  Write-Warning "expected $TargetFrames frames, got $($produced.Count)"
}

$totalBytes = ($produced | Measure-Object -Property Length -Sum).Sum
$avgKB = [math]::Round($totalBytes / $produced.Count / 1024, 1)
$totalKB = [math]::Round($totalBytes / 1024, 1)

Write-Host ""
Write-Host "produced     : $($produced.Count) frames"
Write-Host "avg size     : ${avgKB}KB"
Write-Host "total size   : ${totalKB}KB (budget: ~6MB pra width 1600/q88)"

if ($avgKB -gt 110) {
  Write-Warning "avg frame > 110KB - considere -Quality 82 ou -Width 1400"
}
