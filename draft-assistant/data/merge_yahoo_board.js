// Merge the captured Yahoo board into players.json as the `y` field.
//
// This is the board the OPPONENTS will draft from -- read off the league's own
// player list -- so it replaces the ESPN sheet as the opponent model wherever
// it has an opinion. It is a data correction, not a tuning change: better
// information about what other people will do.
//
//   node data/merge_yahoo_board.js [--write]
const fs = require('fs');
const path = require('path');
const H = require('../sim/harness');

const ROOT = path.resolve(__dirname, '..');
const players = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/players.json'), 'utf8'));
const yb = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/yahoo_board.json'), 'utf8'));

// Reuse the tool's own matcher so the merge normalises names exactly the way
// the live board reader will.
const A = H.fresh();

let matched = 0;
const unmatched = [];
const assigned = new Map();

for (const [name, rank] of yb.board) {
  const hit = A.searchPlayers(name, { limit: 1 })[0];
  const score = hit ? A.nameScore(name, hit.p) : 0;
  if (hit && score >= 600 && !assigned.has(hit.p.n)) {
    assigned.set(hit.p.n, rank);
    matched++;
  } else {
    unmatched.push(name + ' (rank ' + rank + ')' + (hit ? ' best=' + hit.p.n + ' s=' + Math.round(score) : ''));
  }
}

console.log('Yahoo board entries: ' + yb.board.length);
console.log('matched to pool:     ' + matched);
if (unmatched.length) {
  console.log('UNMATCHED (' + unmatched.length + '):');
  unmatched.forEach(u => console.log('   ' + u));
}

// Where our model and the field disagree most, among matched players.
const rows = [];
for (const p of players) {
  const r = assigned.get(p.n);
  if (r == null) continue;
  rows.push({ n: p.n, pos: p.p, v: p.v, yahoo: r, espn: p.espn || null });
}
const byV = players.filter(p => p.v > -90 && !['K', 'DST'].includes(p.p))
  .slice().sort((a, b) => b.v - a.v);
const ourRank = new Map(byV.map((p, i) => [p.n, i + 1]));
console.log('\nBiggest gaps (Yahoo rank minus our VOR rank):');
rows.filter(r => ourRank.has(r.n))
  .map(r => ({ ...r, ours: ourRank.get(r.n), gap: r.yahoo - ourRank.get(r.n) }))
  .sort((a, b) => b.gap - a.gap).slice(0, 10)
  .forEach(r => console.log('  ' + r.pos.padEnd(3) + r.n.padEnd(24) +
    'ours#' + String(r.ours).padStart(3) + '  yahoo#' + String(r.yahoo).padStart(4) +
    '  gap +' + String(r.gap).padStart(3) +
    (r.espn ? '   (espn was ' + r.espn + ')' : '')));

if (process.argv.includes('--write')) {
  let n = 0;
  for (const p of players) {
    const r = assigned.get(p.n);
    if (r != null) { p.y = r; n++; }
  }
  fs.writeFileSync(path.join(ROOT, 'data/players.json'), JSON.stringify(players));
  console.log('\nwrote y= on ' + n + ' players. Run ./build.sh.');
}
