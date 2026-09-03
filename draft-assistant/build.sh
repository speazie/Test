#!/usr/bin/env bash
# Assemble the shipped tool from its three sources and stamp it so nothing can
# ever test or ship a stale build again (README bug #7).
#
#   ./build.sh          build, stamp, verify
#   ./build.sh --check  verify only; non-zero exit if the build is stale
#
set -euo pipefail
cd "$(dirname "$0")"

SHELL_SRC="tool/shell_html.txt"
DATA_SRC="data/players.json"
ENGINE_SRC="tool/engine_js.txt"
OUT="tool/live-draft-assistant.html"

for f in "$SHELL_SRC" "$DATA_SRC" "$ENGINE_SRC"; do
  [ -f "$f" ] || { echo "BUILD FAILED: missing source $f"; exit 1; }
done

# Hash the SOURCES, never the output — the stamp must not hash itself.
HASH=$(cat "$SHELL_SRC" "$DATA_SRC" "$ENGINE_SRC" | sha256sum | cut -d' ' -f1)

if [ "${1:-}" = "--check" ]; then
  [ -f "$OUT" ] || { echo "STALE: $OUT does not exist. Run ./build.sh"; exit 1; }
  STAMPED=$(grep -o 'var BUILD_STAMP="sha256:[0-9a-f]\{64\}"' "$OUT" 2>/dev/null \
            | head -1 | sed 's/.*sha256://;s/"//' || true)
  if [ -z "$STAMPED" ]; then
    echo "STALE: $OUT carries no BUILD_STAMP (built by an old build.sh, or hand-edited)."
    exit 1
  fi
  if [ "$STAMPED" != "$HASH" ]; then
    echo "STALE: $OUT was built from different sources than are on disk now."
    echo "  built from  ${STAMPED:0:16}…"
    echo "  sources now ${HASH:0:16}…"
    echo "Run ./build.sh"
    exit 1
  fi
  echo "build is current (sha256:${HASH:0:16}…)"
  exit 0
fi

# ---- assemble ----
# shell_html.txt ends with "const PLAYERS =", so the data array lands as its
# initialiser. The explicit ';' after it removes a semicolon-insertion hazard
# that the original build relied on by luck.
{
  cat "$SHELL_SRC"
  cat "$DATA_SRC"
  printf ';\nvar BUILD_STAMP="sha256:%s";\n' "$HASH"
  cat "$ENGINE_SRC"
} > "$OUT"

# ---- checks that fail loudly ----
fail() { echo "BUILD FAILED: $1"; exit 1; }

grep -q "var CFG"           "$OUT" || fail "CFG missing from output"
grep -q "Matthew Stafford"  "$OUT" || fail "player data missing"
grep -q "var BUILD_STAMP"   "$OUT" || fail "build stamp missing"

# Exactly one <script> block: the sims extract the engine by splitting on it.
SCRIPTS=$(grep -c "<script>" "$OUT" || true)
[ "$SCRIPTS" = "1" ] || fail "expected 1 <script> tag, found $SCRIPTS (breaks every sim)"

# The engine must actually parse. This is a hard failure, not a skipped step —
# shipping a file with a syntax error means a blank tool at the draft table.
TMPJS=$(mktemp /tmp/ldabuild.XXXXXX.js)
trap 'rm -f "$TMPJS"' EXIT
sed -n '/<script>/,/<\/script>/p' "$OUT" | sed '1d;$d' > "$TMPJS"
node --check "$TMPJS" || fail "engine has a syntax error"

# Player pool sanity. Bug #8 was K/DST pools too small for mandatory-fill mode,
# which froze the tool mid-draft.
node -e '
  const fs=require("fs"), p=JSON.parse(fs.readFileSync("'"$DATA_SRC"'","utf8"));
  const c={}; p.forEach(x=>c[x.p]=(c[x.p]||0)+1);
  const need={QB:10,RB:24,WR:28,TE:10,K:16,DST:16};
  let bad=[];
  for(const k in need) if((c[k]||0)<need[k]) bad.push(k+" "+(c[k]||0)+"<"+need[k]);
  if(bad.length){console.error("pool too small: "+bad.join(", "));process.exit(1);}
  console.log("  pool: "+Object.entries(c).map(([k,v])=>k+" "+v).join(", ")+" ("+p.length+" players)");
' || fail "player pool too small — mandatory-fill mode can freeze (README bug #8)"

# ---- second target: the Yahoo bridge userscript ----
# Same sources, same hash. Both artifacts are stamped, so a stale one is caught.
node tool/make_userscript.js "$HASH" || fail "userscript generation failed"
node --check tool/yahoo-draft-bridge.user.js || fail "userscript has a syntax error"

# ---- third target: the no-install practice page ----
node tool/make_practice.js "$HASH" || fail "practice page generation failed"
grep -q "sstlv-PRACTICE-live" tool/practice.html || fail "practice page shares storage with the real tool"

echo "build ok -> $OUT ($(wc -c < "$OUT") bytes, sha256:${HASH:0:16}…)"
