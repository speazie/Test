// How much does the draft depend on the rookie projections?
//
// The README calls rookie projections the weakest component, and the data shows
// why: rookies are assigned a DRAFT-CAPITAL BIN MEAN, so five different WRs
// carry byte-identical EVs. Yet those bin means put Jadarian Price at our #16
// overall while the field has him #62. That is the model's single largest
// unvalidated bet.
//
// Asking "does deflating rookies lower simulated title rate?" is worthless --
// the sim scores every team with our own numbers, so of course it does. The
// question that matters is a DECISION under uncertainty:
//
//   draft believing the rookie numbers  x  a world where they are inflated
//
// so we can see the regret either way and pick the choice that loses least when
// we are wrong. That is the only honest way to use a self-referential sim.
const { draft, season, setSeed } = require('./optimise.js');
const { fresh } = require('./harness');

const ROOKIE_METHODS = ['rookie-empirical', 'rookie-capital'];
// undefined, NOT null: the engine tests `typeof CFG_OVERRIDE!=='undefined'`,
// and typeof null is 'object', so null would be taken as a real config.
const BASE = undefined;   // shipped CFG

// Which players are running on rookie bins?
const probe = fresh();
const ROOKIES = new Set(probe.PLAYERS
  .filter(p => ROOKIE_METHODS.includes(p.method)).map(p => p.n));
const TRUE_E = Object.fromEntries(probe.PLAYERS.map(p => [p.n, p.e]));

const SEEDS = (process.env.STRESS_SEEDS || '11,22,33,44,55,66').split(',').map(Number);
const DRAFTS = +(process.env.STRESS_DRAFTS || 8);
const SEASONS = +(process.env.STRESS_SEASONS || 40);

// Run one (belief, truth) cell. `belief` is the haircut applied to rookie EVs
// while DRAFTING; `truth` is the haircut applied when the season is scored.
function cell(belief, truth) {
  let titles = 0, made = 0, n = 0;
  for (const seed of SEEDS) {
    setSeed(seed);
    for (let d = 0; d < DRAFTS; d++) {
      // draft() builds its own engine instance; patch rookie values inside it
      // by handing it a hook via global, since it reads PLAYERS internally.
      global.__ROOKIE_HAIRCUT = { names: ROOKIES, amount: belief };
      const teams = draft(BASE, 6);
      global.__ROOKIE_HAIRCUT = null;
      // Score the season in the world where rookies are `truth` inflated.
      const scored = teams.map(t => t.map(pl => ({
        ...pl,
        e: ROOKIES.has(pl.n) ? TRUE_E[pl.n] * (1 - truth) : pl.e,
      })));
      const r = season(scored, 5, SEASONS);
      titles += r.titles; made += r.made; n += r.n;
    }
  }
  return { title: titles / n, playoff: made / n, n };
}

const B = [0, 0.15, 0.30];       // how much we discount rookies when drafting
const T = [0, 0.15, 0.30];       // how wrong the rookie numbers actually are
console.log('rookie-bin players: ' + ROOKIES.size + '   seasons per cell: ' +
  (SEEDS.length * DRAFTS * SEASONS) + '\n');
console.log('              TRUTH: rookies overrated by');
console.log('belief   ' + T.map(t => (t * 100 + '%').padStart(9)).join('') + '     worst case');
const rows = [];
for (const b of B) {
  const out = T.map(t => cell(b, t));
  const worst = Math.min(...out.map(o => o.title));
  rows.push({ b, out, worst });
  console.log(('cut ' + (b * 100) + '%').padEnd(9) +
    out.map(o => ((100 * o.title).toFixed(1) + '%').padStart(9)).join('') +
    '     ' + (100 * worst).toFixed(1) + '%');
}
const best = rows.reduce((a, r) => r.worst > a.worst ? r : a);
console.log('\nmaximin choice (best worst case): discount rookies by ' + (best.b * 100) + '%');
