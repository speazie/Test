// Apply the corrections the projection pipeline missed. Reproducible and
// reversible: writes data/players.corrected.json, and only overwrites
// players.json with --write. data/players.pre_audit.json is kept as the
// before state.
//
// TWO CLASSES OF FIX, with very different confidence:
//
//   EXACT  - six players whose correction already EXISTS in td_luck.json and
//            circumstance.json but never joined, because the two files disagree
//            about name suffixes ("James Cook" vs "James Cook III"). The values
//            are simply read across. No estimation.
//
//   RECONSTRUCTED - four quarterbacks with NO entry in td_luck.json at all.
//            Their correction is recomputed from nflverse 2025 using the rule
//            README section 2 documents (TD rate repeats at r=0.17 pass / 0.13
//            rush, so regress the rest to league rate). Validated against the
//            corrections that WERE applied: Josh Allen recomputes to -54.9
//            against a shipped -54.5. Individual error on heavy-rushing QBs can
//            reach ~30 points, so treat these as +-20, not exact.
//
// Order of operations follows README section 4 (context layers applied in
// sequence): EV + TD-luck + efficiency, then the age multiplier. That ordering
// is inferred, not documented precisely; it moves results by a few points, not
// by direction.
//
//   node data/apply_corrections.js            report only
//   node data/apply_corrections.js --write    write players.json
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const players = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/players.json'), 'utf8'));
const td = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/td_luck.json'), 'utf8'));
const circ = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/circumstance.json'), 'utf8'));

// --- EXACT: suffix join failures -------------------------------------------
const JOIN = {
  'James Cook III':      'James Cook',
  'Kenneth Walker':      'Kenneth Walker III',
  'Aaron Jones Sr.':     'Aaron Jones',
  'Michael Pittman Jr.': 'Michael Pittman',
  'Kyle Pitts Sr.':      'Kyle Pitts',
  'Travis Etienne Jr.':  'Travis Etienne',
};

// --- RECONSTRUCTED: QBs with no td_luck entry ------------------------------
// Computed by sim/td_luck_audit.py from nflverse 2025.
const RECON = {
  'Matthew Stafford': -78.5,
  'Brock Purdy':      -39.9,
  'Jared Goff':       -28.8,
  'Joe Burrow':       -21.7,
};

const BY = Object.fromEntries(players.map(p => [p.n, p]));
const changes = [];

for (const p of players) {
  const before = p.e;
  let e = p.e, notes = [];

  const key = JOIN[p.n];
  if (key) {
    if (td[key] != null && td[p.n] == null) { e += td[key]; notes.push('td ' + td[key].toFixed(1)); }
    const c = circ[key];
    if (c && !circ[p.n]) {
      if (c.eff) { e += c.eff; notes.push('eff ' + c.eff.toFixed(1)); }
      if (c.age && c.age !== 1) { e *= c.age; notes.push('age x' + c.age); }
    }
  }
  if (RECON[p.n] != null && td[p.n] == null) {
    e += RECON[p.n];
    notes.push('td(recon) ' + RECON[p.n].toFixed(1));
  }
  if (notes.length) {
    e = Math.round(e);
    changes.push({ n: p.n, pos: p.p, before, after: e, notes: notes.join(', '),
                   exact: !!JOIN[p.n] });
    p.e = e;
  }
}

// --- VOR must be recomputed: replacement level itself moves ----------------
const REPL = { QB: 10, RB: 24, WR: 28, TE: 10, K: 10, DST: 10 };
const live = players.filter(p => p.v > -90);
const replBefore = {}, replAfter = {};
for (const pos in REPL) {
  const g = live.filter(p => p.p === pos).map(p => p.e).sort((a, b) => b - a);
  replAfter[pos] = g[Math.min(REPL[pos], g.length) - 1];
}
for (const p of players) {
  if (p.v <= -90) continue;              // inert placeholders keep their sentinel
  const mult = (p.p === 'K' || p.p === 'DST') ? 0.2 : 1;
  p.v = Math.round((p.e - replAfter[p.p]) * mult * 10) / 10;
}

console.log('CORRECTIONS APPLIED\n');
console.log('EXACT (value existed, name did not join):');
console.log('  ' + 'player'.padEnd(22) + 'EV before'.padStart(10) + 'after'.padStart(8) + '   detail');
for (const c of changes.filter(c => c.exact))
  console.log('  ' + c.n.padEnd(22) + String(c.before).padStart(10) + String(c.after).padStart(8) + '   ' + c.notes);
console.log('\nRECONSTRUCTED (no entry existed; recomputed from nflverse 2025, +-20):');
console.log('  ' + 'player'.padEnd(22) + 'EV before'.padStart(10) + 'after'.padStart(8) + '   detail');
for (const c of changes.filter(c => !c.exact))
  console.log('  ' + c.n.padEnd(22) + String(c.before).padStart(10) + String(c.after).padStart(8) + '   ' + c.notes);

console.log('\nReplacement level after correction: ' +
  Object.entries(replAfter).map(([k, v]) => k + ' ' + v).join('  '));

const qbs = players.filter(p => p.p === 'QB' && p.v > -90).sort((a, b) => b.v - a.v);
console.log('\nQB board after correction:');
qbs.slice(0, 8).forEach((p, i) =>
  console.log('  ' + (i + 1) + '. ' + p.n.padEnd(22) + 'EV ' + String(p.e).padStart(4) +
    '  VOR ' + String(Math.round(p.v)).padStart(4) + '   yahoo ' + (p.y || '-')));

const dest = path.join(ROOT, 'data/players.corrected.json');
fs.writeFileSync(dest, JSON.stringify(players));
console.log('\nwrote ' + path.relative(ROOT, dest));
if (process.argv.includes('--write')) {
  const pre = path.join(ROOT, 'data/players.pre_audit.json');
  if (!fs.existsSync(pre)) fs.copyFileSync(path.join(ROOT, 'data/players.json'), pre);
  fs.writeFileSync(path.join(ROOT, 'data/players.json'), JSON.stringify(players));
  console.log('WROTE data/players.json (before state saved to data/players.pre_audit.json)');
  console.log('Run ./build.sh && ./verify.sh');
}
