// Exact "did the draft engine change?" check.
//
// Title rate is a sampled statistic: it moves by a few points between runs even
// when nothing changed, so it cannot tell you whether a UI change leaked into
// the engine. This can. It seeds Math.random, runs N full mock drafts, and
// hashes every roster. Same hash = byte-identical draft behaviour.
//
//   node sim/engine_fingerprint.js                    fingerprint the current build
//   node sim/engine_fingerprint.js --html <file>      fingerprint some other build
//
// Compare against a baseline:
//   git show <rev>:draft-assistant/tool/live-draft-assistant.html > /tmp/base.html
//   node sim/engine_fingerprint.js --html /tmp/base.html
const fs = require('fs');
const crypto = require('crypto');
const H = require('./harness');

const argv = process.argv.slice(2);
const hi = argv.indexOf('--html');
const htmlPath = hi >= 0 ? argv[hi + 1] : null;
const N = parseInt(argv.find(a => /^\d+$/.test(a)) || '30', 10);

let source;
if (htmlPath) {
  // Explicit path: the freshness gate does not apply, because the whole point
  // is to load a build that is deliberately NOT the current sources.
  const html = fs.readFileSync(htmlPath, 'utf8');
  source = html.split('<script>')[1].split('</script>')[0];
  console.log('fingerprinting ' + htmlPath + ' (freshness gate bypassed by --html)');
} else {
  source = H.engineSource();   // gated: refuses to run against a stale build
  console.log('fingerprinting the current build');
}

// Deterministic replacement for Math.random, installed before each draft so
// every run sees the identical stream.
function seedRandom(seed) {
  let s = seed >>> 0;
  Math.random = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

const EXPORTS = 'runMock,fillRoster,getMine:()=>mine,setSlot:v=>{slot=v}';
const realRandom = Math.random;
const lines = [];
for (let i = 0; i < N; i++) {
  const slot = (i % 10) + 1;
  // Seed BEFORE constructing: module-level init reads no randomness today, but
  // if it ever does, it must fall inside the seeded stream.
  seedRandom(1000 + i);
  const A = H.freshFrom(source, undefined, EXPORTS);
  A.setSlot(slot);
  A.runMock();
  lines.push(slot + '|' + A.getMine().join(','));
}
Math.random = realRandom;

const digest = crypto.createHash('sha256').update(lines.join('\n')).digest('hex');
console.log('drafts: ' + N);
console.log('FINGERPRINT ' + digest);
if (argv.includes('--verbose')) lines.forEach(l => console.log('  ' + l));
