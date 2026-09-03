#!/usr/bin/env bash
# Everything, in the order that fails fastest. Run before you ship anything.
#
#   ./verify.sh          build + all tests
#   ./verify.sh --full   also runs the season Monte Carlo (slow, needs numpy)
set -euo pipefail
cd "$(dirname "$0")"

hr() { printf '\n\033[1m%s\033[0m\n' "$1"; }

hr "1. build both artifacts (and refuse to continue if a source is broken)"
./build.sh

hr "2. name matching — the code path that replaces typing"
node sim/matcher_tests.js

hr "3. roster regressions — 40 mock drafts"
node sim/regression_tests.js

hr "4. engine fingerprint — proves the draft engine still behaves identically"
node sim/engine_fingerprint.js
echo "   Compare this against the baseline before your change:"
echo "     git show <rev>:draft-assistant/tool/live-draft-assistant.html > /tmp/base.html"
echo "     node sim/engine_fingerprint.js --html /tmp/base.html"

hr "5. real browser — fuzzy entry, persistence, and the Yahoo bridge"
if node -e "require('playwright')" 2>/dev/null; then
  node sim/browser_tests.js
else
  # Resolve playwright from the global install if it is not local.
  NODE_PATH="$(npm root -g)" node sim/browser_tests.js
fi

if [ "${1:-}" = "--full" ]; then
  hr "6. full-season Monte Carlo"
  node sim/drafts.js 120 6
  python3 sim/season_montecarlo.py
fi

printf '\n\033[32mall checks passed\033[0m\n'
