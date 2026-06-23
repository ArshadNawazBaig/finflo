#!/usr/bin/env bash
# Render every docs/*.html to a same-named PDF using headless Chrome.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

shopt -s nullglob
targets=("$DIR"/*.html "$DIR"/client/*.html)
if [ "$#" -gt 0 ]; then targets=("$@"); fi

for f in "${targets[@]}"; do
  base="$(basename "$f" .html)"
  outdir="$(cd "$(dirname "$f")" && pwd)"              # write the PDF next to its source
  abs="$outdir/$(basename "$f")"                        # absolute path for a valid file:// URL
  "$CHROME" --headless=new --disable-gpu --no-pdf-header-footer \
    --virtual-time-budget=10000 \
    --print-to-pdf="$outdir/$base.pdf" "file://$abs" >/dev/null 2>&1
  echo "→ ${outdir##*/}/$base.pdf"
done
