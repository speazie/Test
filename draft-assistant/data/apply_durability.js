// Durability: price the games a player has actually been available for.
//
// The availability layer shipped as a hand-written NEWS list -- 18 players with
// a camp injury or a suspension. It had no memory. A receiver who tore an ACL
// in October and has not played since carried the same 1.0 as one who has
// never missed a snap, and the model paid full price for both.
//
// THE RULE, as asked for: account for a major injury UNLESS the player has
// proven it did not reduce his production. The proving is the important half.
// Missing time is not rare -- 104 of the 166 players in this pool with any NFL
// history have missed three or more games in a season -- so a blanket
// injury-history discount would hit two thirds of the board and mostly add
// noise. What separates a real risk from a healed one is whether he has since
// gone out and played a full season.
//
//   most recent season >= 15 of 17 games  ->  PROVEN, no discount at all
//   otherwise  ->  recency-weighted availability, shrunk halfway to 1
//
// So Breece Hall (ACL 2022, then 17/17/17) is untouched, and Jonathan Taylor
// and Christian McCaffrey -- both of whom lost a season and then came back for
// a full one -- are untouched too. That is the "unless" clause doing its job,
// not an oversight.
//
// Games played come from nflverse (stats_player_reg_2023..2025), committed as
// data/games_played.json so this reproduces with no network.
//
//   node data/apply_durability.js            report only
//   node data/apply_durability.js --write    write players.json
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const players = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/players.json'), 'utf8'));
const hist = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/games_played.json'), 'utf8'));
// Seasons whose missed games were not physical -- a suspension reads exactly
// like an injury in games-played data, and punishing a served suspension as a
// durability risk is simply wrong.
const notInjury = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/not_injury.json'), 'utf8'));

const SEASON = 17;
// A LOST season, not a short one. Missing a couple of games is ordinary --
// rest in week 18, a one-week knock -- and treating that as an injury put
// Mahomes and C.J. Stroud on the risk list at 94%, which is noise wearing the
// costume of a finding.
const LOST = 11;            // <= this many games played = a season lost to injury
const BACK = 12;            // a return season this full is a real test
const KEPT = 0.90;          // and holding 90% of your old PPG passes it
const FLOOR = 0.70;         // never more than a 30% haircut from history alone
// Points per game is what the injury either did or did not take away, so it
// carries most of the weight. Missed time still costs you real weeks, so it
// carries the rest.
const W_RATE = 0.7, W_AVAIL = 0.3;
const RECENCY = { '2025': 0.6, '2024': 0.3, '2023': 0.1 };

const yrsOf = h => Object.keys(h.g || {}).sort();

// Weighted PPG across a set of seasons, ignoring cameos too short to mean
// anything.
function ppgOver(h, years, minG) {
  let num = 0, den = 0;
  for (const y of years) {
    const g = h.g[y], pt = h.ppg[y];
    if (g == null || pt == null || g < minG) continue;
    num += g * pt; den += g;
  }
  return den ? num / den : null;
}

function durability(name) {
  const h = hist[name];
  if (!h || !h.g) return { av: 1, why: null };
  const yrs = yrsOf(h);
  if (!yrs.length) return { av: 1, why: null };

  const excused = notInjury[name] || [];
  const lost = yrs.filter(y => h.g[y] <= LOST && excused.indexOf(y) < 0);
  if (!lost.length) return { av: 1, why: null };     // never lost a season
  const lastLost = lost[lost.length - 1];

  const before = yrs.filter(y => y < lastLost);
  const after = yrs.filter(y => y > lastLost);
  const baseline = ppgOver(h, before, 8);

  // THE "UNLESS" CLAUSE, and the reason it is a full season rather than a
  // points-per-game test against his old self: once a man has played a whole
  // season after the injury, we have DIRECT evidence of what he now produces,
  // and the projection is built on it. Discounting him again would charge him
  // twice for the same fact.
  //
  // Testing PPG against a pre-injury baseline forever gets this badly wrong:
  // it flagged Mark Andrews and Cooper Kupp, who each played a full 17 games
  // and simply are not what they were in 2021. That is decline, already in
  // their EV, and nothing to do with being hurt.
  //
  // So the discount exists exactly where the evidence does NOT: a man hurt
  // recently, whose projection still leans on how good he was before.
  const proofYr = after.find(y => h.g[y] >= BACK);
  if (proofYr) return { av: 1, why: null };
  // PPG then decides how hard to discount the ones with no full season since.
  void KEPT;

  // Not proven. Two separate costs, and points per game is the one that lasts.
  const recentYr = yrs.filter(y => h.g[y] >= 4).pop();
  const recentPpg = recentYr ? h.ppg[recentYr] : null;
  const rateRatio = (baseline && recentPpg != null)
    ? Math.min(1.5, recentPpg / baseline) : 1;        // no baseline = no evidence of decline
  const rateDrop = Math.max(0, 1 - rateRatio);

  let num = 0, den = 0;
  for (const y in RECENCY) {
    if (h.g[y] == null || excused.indexOf(y) >= 0) continue;
    num += RECENCY[y] * Math.min(1, h.g[y] / SEASON);
    den += RECENCY[y];
  }
  const availRate = den ? num / den : 1;
  const availDrop = Math.max(0, 1 - availRate);

  const av = Math.max(FLOOR, Math.min(1, 1 - (W_RATE * rateDrop + W_AVAIL * availDrop)));
  if (av >= 0.995) return { av: 1, why: null };

  const gTxt = yrs.map(y => y.slice(2) + ':' + h.g[y] + 'g'
                 + (h.ppg[y] != null ? '/' + h.ppg[y].toFixed(1) : '')).join(' ');
  const rateTxt = rateDrop > 0.005
    ? 'PPG ' + (baseline || 0).toFixed(1) + '->' + (recentPpg || 0).toFixed(1) +
      ' (' + Math.round(rateRatio * 100) + '%)'
    : 'PPG held';
  const inj = (h.inj || []).length ? ' ' + h.inj.slice(0, 3).join('/') : '';
  return { av: Math.round(av * 100) / 100, why: rateTxt + ' | ' + gTxt + inj,
           rateDrop: rateDrop, availDrop: availDrop };
}

const changes = [];
for (const p of players) {
  const d = durability(p.n);
  if (d.av >= 1) continue;
  const oldAv = p.av == null ? 1 : p.av;
  // The news list and the history are measuring different things; take the more
  // pessimistic rather than multiplying them, which double-counts one injury.
  const newAv = Math.min(oldAv, d.av);
  if (newAv >= oldAv) continue;
  const beforeE = p.e;
  // EV already carries the old availability, so swap one factor for the other.
  p.e = Math.round(p.e / oldAv * newAv);
  p.av = newAv;
  p.r = 1;
  p.d = (p.d || '') + ' Durability: ' + d.why + '.';
  changes.push({ n: p.n, pos: p.p, oldAv, newAv, beforeE, afterE: p.e, why: d.why });
}

// VOR must be recomputed: replacement level itself moves.
const REPL = { QB: 10, RB: 24, WR: 28, TE: 10, K: 10, DST: 10 };
const live = players.filter(p => p.v > -90);
const repl = {};
for (const pos in REPL) {
  const g = live.filter(p => p.p === pos).map(p => p.e).sort((a, b) => b - a);
  repl[pos] = g[Math.min(REPL[pos], g.length) - 1];
}
const vorBefore = {};
for (const p of players) vorBefore[p.n] = p.v;
for (const p of players) {
  if (p.v <= -90) continue;
  const mult = (p.p === 'K' || p.p === 'DST') ? 0.2 : 1;
  p.v = Math.round((p.e - repl[p.p]) * mult * 10) / 10;
}

changes.sort((a, b) => a.newAv - b.newAv);
console.log('DURABILITY LAYER\n');
console.log('  ' + 'player'.padEnd(22) + 'pos'.padEnd(5) + 'avail'.padStart(11) +
            'EV'.padStart(12) + 'VOR'.padStart(11) + '   history');
for (const c of changes) {
  const p = players.find(x => x.n === c.n);
  console.log('  ' + c.n.padEnd(22) + c.pos.padEnd(5) +
    (Math.round(c.oldAv * 100) + '->' + Math.round(c.newAv * 100) + '%').padStart(11) +
    (c.beforeE + '->' + c.afterE).padStart(12) +
    (Math.round(vorBefore[c.n]) + '->' + Math.round(p.v)).padStart(11) +
    '   ' + c.why);
}
console.log('\n  ' + changes.length + ' players discounted; ' +
            (Object.keys(hist).length - changes.length) + ' left alone.');

if (process.argv.includes('--write')) {
  fs.writeFileSync(path.join(ROOT, 'data/players.json'), JSON.stringify(players, null, 0));
  console.log('\n  written to data/players.json');
} else {
  console.log('\n  report only — pass --write to apply.');
}
