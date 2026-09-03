// How much of the edge survives if the field does not disagree with us?
//
// NOTE ON WHAT THIS MEASURES. It was written believing it swept "how far the
// field has noticed the league's 6-point passing TDs". It does not, because
// there is nothing to notice: the -1 sack and -2 INT settings cancel the
// 6-point bonus almost exactly, so this league's scoring shifts QB value by
// about -5 VOR and everything else by ~0 (see FINDINGS.md section 0).
//
// What it actually sweeps is PROJECTION AGREEMENT. `adjust` interpolates the
// opponents' board from the real Yahoo list toward OUR OWN VOR ordering:
//   0 = they draft the Yahoo board (what they will really do)
//   1 = they value every player exactly as our model does
// So the decay below is the price of the field converging on our player
// opinions -- not of it discovering a rules exploit. Read it that way.
//
//   node sim/opponent_stress.js
const { fresh, freshFrom, engineSource } = require('./harness');
const path = require('path');

const CV = { QB: 0.472, RB: 0.518, WR: 0.561, TE: 0.623, K: 0.45, DST: 0.75 };
const MAE = { QB: 4.67, RB: 2.63, WR: 2.15, TE: 1.82, K: 1.2, DST: 2.0 };
const TEAMS = 10, ROUNDS = 15;
const OMAX = { QB: 2, RB: 6, WR: 7, TE: 2, K: 1, DST: 1 };
const OREQ = { QB: 1, RB: 2, WR: 2, TE: 1, K: 1, DST: 1 };

let SEED = 1;
function rnd() { SEED = (SEED * 1103515245 + 12345) & 0x7fffffff; return SEED / 0x7fffffff; }
function gauss() {
  let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const JS = engineSource();
const EXPORTS = 'PLAYERS,recommend,markGone,takeIt,myPicks,setSlot:v=>{slot=v},' +
  'getMine:()=>mine,getGone:()=>gone';

// Our own VOR ordering = the board an opponent would use if he had fully
// repriced to this league's scoring. Interpolating between his ESPN rank and
// that ordering is the cleanest one-knob model of "he has partly noticed".
function buildBoards(PLAYERS, adjust) {
  const live = PLAYERS.filter(p => p.v > -90);
  const ourRank = new Map();
  [...live].sort((a, b) => b.v - a.v).forEach((p, i) => ourRank.set(p.n, i + 1));
  const board = new Map();
  for (const p of PLAYERS) {
    const espn = p.y || p.espn || p.a;   // the board they will actually use
    const ours = ourRank.has(p.n) ? ourRank.get(p.n) : espn;
    board.set(p.n, (1 - adjust) * espn + adjust * ours);
  }
  return board;
}

function draftWith(adjust, slot) {
  const A = freshFrom(JS, undefined, EXPORTS);
  A.setSlot(slot);
  const board = buildBoards(A.PLAYERS, adjust);
  const rost = {}, cnt = {};
  for (let t = 1; t <= TEAMS; t++) { rost[t] = []; cnt[t] = {}; }
  for (let pick = 1; pick <= TEAMS * ROUNDS; pick++) {
    const rd = Math.ceil(pick / TEAMS);
    const col = rd % 2 ? ((pick - 1) % TEAMS) + 1 : TEAMS - ((pick - 1) % TEAMS);
    if (col === slot) {
      const r = A.recommend(); if (!r.length) continue;
      A.takeIt(r[0].p.n); rost[col].push(r[0].p); continue;
    }
    const have = cnt[col], left = ROUNDS - rost[col].length;
    let short = 0; for (const k in OREQ) short += Math.max(0, OREQ[k] - (have[k] || 0));
    const g = A.getGone(), mine = new Set(A.getMine());
    let best = null, bk = -1e9;
    for (const p of A.PLAYERS) {
      if (p.v <= -90 || g.has(p.n) || mine.has(p.n)) continue;
      if ((have[p.p] || 0) >= OMAX[p.p]) continue;
      const fills = (have[p.p] || 0) < OREQ[p.p];
      let nb;
      if (left <= short) { if (!fills) continue; nb = 900; }
      else if (p.p === 'K') nb = rd >= 14 ? 800 : null;
      else if (p.p === 'DST') nb = rd >= 13 ? 800 : null;
      else if (p.p === 'QB' && (have.QB || 0) >= 1) nb = left <= 2 ? -40 : null;
      else nb = fills ? 40 : 0;
      if (nb === null) continue;
      const b = board.get(p.n);
      const key = -b * 1.6 + nb * 0.35 - Math.max(0, b - pick) * 0.25 + gauss() * Math.max(3, b * 0.06);
      if (key > bk) { bk = key; best = p; }
    }
    if (!best) continue;
    A.markGone(best.n); rost[col].push(best); have[best.p] = (have[best.p] || 0) + 1;
  }
  const out = [];
  for (let t = 1; t <= TEAMS; t++) out.push(rost[t].map(p => ({ n: p.n, p: p.p, e: p.e, b: p.b })));
  return out;
}

// Identical to sim/optimise.js season(), reused verbatim in spirit.
function season(teams, me, sims) {
  let titles = 0, made = 0;
  for (let s = 0; s < sims; s++) {
    const truth = {};
    for (const T of teams) for (const pl of T) {
      if (truth[pl.n] == null) truth[pl.n] = Math.max(0, pl.e + gauss() * MAE[pl.p] * 16);
    }
    const pts = [];
    for (let t = 0; t < 10; t++) {
      pts.push(new Array(18).fill(0));
      for (let w = 1; w <= 17; w++) {
        const sc = {};
        for (const pl of teams[t]) {
          if (pl.b === w) continue;
          const mu = truth[pl.n] / 16; if (mu <= 0) continue;
          (sc[pl.p] = sc[pl.p] || []).push(Math.max(0, mu + gauss() * CV[pl.p] * mu));
        }
        for (const k in sc) sc[k].sort((a, b) => b - a);
        let tot = 0, pool = [];
        const need = { QB: 1, RB: 2, WR: 2, TE: 1, K: 1, DST: 1 };
        for (const pos in need) {
          const got = sc[pos] || [];
          for (let i = 0; i < need[pos]; i++) tot += got[i] || 0;
          pool = pool.concat(got.slice(need[pos]));
        }
        pool.sort((a, b) => b - a); tot += pool[0] || 0;
        pts[t][w] = tot;
      }
    }
    const wins = new Array(10).fill(0), tp = new Array(10).fill(0);
    for (let w = 1; w <= 15; w++) {
      const order = [...Array(10).keys()]; let rot = order.slice(1);
      const k = (w - 1) % 9; rot = rot.slice(k).concat(rot.slice(0, k));
      const sched = [[order[0], rot[0]]];
      for (let i = 1; i < 5; i++) sched.push([rot[i], rot[rot.length - i]]);
      for (const [a, b] of sched) {
        if (pts[a][w] > pts[b][w]) wins[a]++; else wins[b]++;
        tp[a] += pts[a][w]; tp[b] += pts[b][w];
      }
    }
    const seed = [...Array(10).keys()].sort((x, y) => wins[y] - wins[x] || tp[y] - tp[x]).slice(0, 4);
    if (seed.includes(me)) {
      made++;
      const po = t => pts[t][16] + pts[t][17];
      const a = po(seed[0]) > po(seed[3]) ? seed[0] : seed[3];
      const b = po(seed[1]) > po(seed[2]) ? seed[1] : seed[2];
      if ((po(a) > po(b) ? a : b) === me) titles++;
    }
  }
  return { titles, made, n: sims };
}

const SEEDS = (process.env.OPP_SEEDS || '11,22,33,44,55,66').split(',').map(Number);
const DRAFTS = +(process.env.OPP_DRAFTS || 8);
const SEASONS = +(process.env.OPP_SEASONS || 40);

// Where does our QB1 actually get taken as the field wises up?
function qbSignal(adjust) {
  const A = freshFrom(JS, undefined, EXPORTS);
  const board = buildBoards(A.PLAYERS, adjust);
  const st = A.PLAYERS.find(p => p.n === 'Matthew Stafford');
  return Math.round(board.get(st.n));
}

console.log('Opponent adjustment sweep — how much of the edge is real?');
console.log('adjust 0 = field drafts the real Yahoo board (what they will actually do)');
console.log('adjust 1 = field shares our player projections (no disagreement left)\n');
console.log('seasons per cell: ' + (SEEDS.length * DRAFTS * SEASONS) + '\n');
console.log('adjust   Stafford board rank    playoffs     title');
console.log('-'.repeat(58));
for (const adj of [0, 0.25, 0.5, 0.75, 1.0]) {
  let titles = 0, made = 0, n = 0;
  for (const sd of SEEDS) {
    SEED = sd;
    for (let d = 0; d < DRAFTS; d++) {
      const teams = draftWith(adj, 6);
      const r = season(teams, 5, SEASONS);
      titles += r.titles; made += r.made; n += r.n;
    }
  }
  console.log(String(adj).padEnd(9) + String(qbSignal(adj)).padStart(14) +
    (100 * made / n).toFixed(1).padStart(14) + '%' +
    (100 * titles / n).toFixed(1).padStart(9) + '%');
}
console.log('\nThe decay above is the price of the field agreeing with our PROJECTIONS.');
console.log('It is not a scoring exploit: this league\'s rules move QB value by about');
console.log('-5 VOR and everything else by ~0. See FINDINGS.md section 0.');
