#!/usr/bin/env bash
# SPEC §4.3 — pipeline bash do hero (Veo 3 → 72 frames WebP).
# Single-pass: ffmpeg + libwebp embutido, com autocrop de letterbox.

set -euo pipefail

INPUT="${1:-veo3_output.mp4}"
TARGET_FRAMES=72
WIDTH=1600
QUALITY=88
PREFIX="jordan1"
OUT_DIR="public/hero-sequence"
AUTOCROP="${AUTOCROP:-1}"

if [ ! -f "$INPUT" ]; then
  echo "error: input video not found: $INPUT" >&2
  exit 1
fi

for exe in ffmpeg ffprobe; do
  if ! command -v "$exe" >/dev/null 2>&1; then
    echo "error: $exe not found in PATH" >&2
    exit 1
  fi
done

DURATION=$(ffprobe -v error -select_streams v:0 \
  -show_entries stream=duration \
  -of default=noprint_wrappers=1:nokey=1 "$INPUT")
TARGET_FPS=$(awk -v n="$TARGET_FRAMES" -v d="$DURATION" 'BEGIN { printf "%.6f", n / d }')

CROP_FILTER=""
if [ "$AUTOCROP" = "1" ]; then
  CROP_SPEC=$(ffmpeg -hide_banner -nostats -i "$INPUT" \
    -vf "cropdetect=24:16:0" -frames:v 60 -f null /dev/null 2>&1 \
    | grep -oE 'crop=[0-9]+:[0-9]+:[0-9]+:[0-9]+' | tail -1 | sed 's/^crop=//')
  if [ -n "$CROP_SPEC" ]; then
    CROP_FILTER="crop=${CROP_SPEC},"
    echo "auto-crop    : crop=${CROP_SPEC}"
  else
    echo "auto-crop    : no letterbox detected"
  fi
fi

VIDEO_FILTER="${CROP_FILTER}fps=${TARGET_FPS},scale=${WIDTH}:-1:flags=lanczos"

echo "input        : $INPUT"
echo "duration     : ${DURATION}s"
echo "target frames: $TARGET_FRAMES"
echo "target fps   : $TARGET_FPS"
echo "width        : ${WIDTH}px"
echo "quality      : $QUALITY"
echo "filter       : $VIDEO_FILTER"

mkdir -p "$OUT_DIR"
rm -f "$OUT_DIR"/${PREFIX}-*.webp

ffmpeg -y -loglevel error -i "$INPUT" \
  -vf "$VIDEO_FILTER" \
  -c:v libwebp -compression_level 6 -quality "$QUALITY" -preset picture \
  -loop 0 -an \
  -frames:v "$TARGET_FRAMES" \
  "$OUT_DIR/${PREFIX}-%03d.webp"

ACTUAL=$(ls -1 "$OUT_DIR"/${PREFIX}-*.webp 2>/dev/null | wc -l | tr -d ' ')
BYTES=$(du -cb "$OUT_DIR"/${PREFIX}-*.webp 2>/dev/null | tail -1 | awk '{print $1}')
AVG_KB=$((BYTES / ACTUAL / 1024))
TOTAL_KB=$((BYTES / 1024))

echo
echo "produced     : $ACTUAL frames"
echo "avg size     : ${AVG_KB}KB"
echo "total size   : ${TOTAL_KB}KB"

if [ "$ACTUAL" != "$TARGET_FRAMES" ]; then
  echo "warning: expected $TARGET_FRAMES frames, got $ACTUAL" >&2
fi
if [ "$AVG_KB" -gt 110 ]; then
  echo "warning: avg frame > 110KB — considere QUALITY=82 ou WIDTH=1400" >&2
fi
