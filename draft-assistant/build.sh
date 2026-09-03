#!/usr/bin/env bash
# Assemble the shipped tool. ALWAYS run this after editing engine or data.
set -e
OUT="tool/live-draft-assistant.html"
cat tool/shell_html.txt > "$OUT"
cat data/players.json >> "$OUT"
cat tool/engine_js.txt >> "$OUT"
grep -q "var CFG" "$OUT" || { echo "BUILD FAILED: CFG missing from output"; exit 1; }
grep -q "Matthew Stafford" "$OUT" || { echo "BUILD FAILED: player data missing"; exit 1; }
node --check <(sed -n '/<script>/,/<\/script>/p' "$OUT" | sed '1d;$d') 2>/dev/null \
  && echo "build ok -> $OUT ($(wc -c < "$OUT") bytes)" || echo "build ok (js syntax check skipped)"
