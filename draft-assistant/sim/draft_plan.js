// What the model actually intends to do from slot 6, as a probability, not a
// single mock. Runs N full drafts and reports, for each of your 15 picks, which
// players the engine took and how often -- plus who it expects to still be on
// the board.
//
// A single mock draft is one sample of a noisy process and reads like a plan.
// This is the plan.
//
//   node sim/draft_plan.js [runs] [slot]
const { fresh } = require('./harness');

const RUNS = parseInt(process.argv[2] || '60', 10);
const SLOT = parseInt(process.argv[3] || '6', 10);

const meta = fresh();
const BY = Object.fromEntries(meta.PLAYERS.map(p => [p.n, p]));
const MY_PICKS = (() => { const a = fresh(); a.setSlot(SLOT); return a.myPicks(); })();

// pickIndex -> name -> count
const tally = MY_PICKS.map(() => ({}));
const posTally = MY_PICKS.map(() => ({}));

for (let r = 0; r < RUNS; r++) {
  const A = fresh();
  A.setSlot(SLOT);
  A.runMock();
  A.getMine().forEach((n, i) => {
    if (i >= tally.length) return;
    tally[i][n] = (tally[i][n] || 0) + 1;
    const p = BY[n];
    if (p) posTally[i][p.p] = (posTally[i][p.p] || 0) + 1;
  });
}

console.log('Draft plan from slot ' + SLOT + ', over ' + RUNS + ' simulated drafts');
console.log('(opponents drafting the ESPN board with noise, half-corrected to our scoring)\n');

tally.forEach((t, i) => {
  const overall = MY_PICKS[i];
  const rnd = Math.ceil(overall / 10);
  const names = Object.entries(t).sort((a, b) => b[1] - a[1]);
  const poss = Object.entries(posTally[i]).sort((a, b) => b[1] - a[1])
    .map(([k, v]) => k + ' ' + Math.round(100 * v / RUNS) + '%').join('  ');
  console.log('R' + String(rnd).padStart(2) + '  pick ' + String(overall).padStart(3) +
    '   ' + poss);
  names.slice(0, 4).forEach(([n, c]) => {
    const p = BY[n];
    const share = Math.round(100 * c / RUNS);
    console.log('        ' + (share + '%').padStart(4) + '  ' +
      (p ? p.p : '??').padEnd(3) + ' ' + n.padEnd(24) +
      (p ? 'VOR ' + String(Math.round(p.v)).padStart(4) +
           '  ADP ' + String(Math.round(p.a)).padStart(3) +
           '  board ' + String(Math.round(p.espn || p.a)).padStart(3) : ''));
  });
  console.log('');
});

// Which players does the engine take most often overall? Those are the targets.
const all = {};
tally.forEach(t => Object.entries(t).forEach(([n, c]) => all[n] = (all[n] || 0) + c));
console.log('=== most-drafted targets across all rounds ===');
Object.entries(all).sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([n, c]) => {
  const p = BY[n];
  console.log('  ' + (Math.round(100 * c / RUNS) + '%').padStart(5) + '  ' +
    (p ? p.p : '??').padEnd(3) + ' ' + n.padEnd(24) +
    (p ? 'VOR ' + String(Math.round(p.v)).padStart(4) +
         '  ADP ' + String(Math.round(p.a)).padStart(3) +
         '  board ' + String(Math.round(p.espn || p.a)).padStart(3) : ''));
});
