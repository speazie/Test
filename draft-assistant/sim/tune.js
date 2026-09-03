// Weight tuning against simulated title rate, done as a PAIRED comparison.
//
// Why paired: title rate is noisy enough that comparing a candidate measured on
// one set of seeds against a baseline measured on another buries any real
// effect. Evaluating both configs on the SAME seeds means the same opponent
// draft behaviour and the same season shocks, so the per-seed DIFFERENCE
// isolates the config. That turns a +-5 point noise band into roughly +-1,
// which is the difference between being able to detect a real effect and not.
//
//   node sim/tune.js baseline              measure the shipped config
//   node sim/tune.js sweep <key> <v1,v2..> sweep one CFG key
//   node sim/tune.js probe                 run the built-in candidate list
//
// Every run reports the paired difference with a standard error. An effect
// smaller than ~2 standard errors is not an effect.
const { fork } = require('child_process');
const os = require('os');
const path = require('path');

const BASE = {
  bye2: 14, bye3: 26, bye4: 70, byeAll: 5, byeNoCover: 7, byeCover: 9,
  reachFree: 8, reachRate: 0.6, cuffMult: 0.45, cuffTop: 70, cuff: 40,
  conc: 10, stack: 7, dropMin: 10, dropMult: 0.55, dropCap: 30, runCap: 22,
  runRate: 45, coldPen: 8, scarMin: 6, scarMax: 48, benchWR: 12, benchRB: 6,
  rb5pen: 14,
  qbEarly: -30, qbMid: -12, kRound: 15, dstRound: 14,
  flexTE: -8, survThresh: 0.55, lateHorizon: 38,
};

const DRAFTS = +(process.env.TUNE_DRAFTS || 10);
const SEASONS = +(process.env.TUNE_SEASONS || 40);   // seasons are ~free; drafts are not
const SEEDS = (process.env.TUNE_SEEDS || '11,22,33,44,55,66,77,88')
  .split(',').map(Number);

// ---- worker pool ----
function runJobs(jobs, onProgress) {
  const workers = Math.min(os.cpus().length, 4, jobs.length);
  return new Promise((resolve, reject) => {
    const results = new Array(jobs.length);
    let next = 0, done = 0;
    const pool = [];
    for (let i = 0; i < workers; i++) {
      const w = fork(path.join(__dirname, 'tune_worker.js'), { stdio: 'inherit' });
      pool.push(w);
      const feed = () => {
        if (next >= jobs.length) { w.kill(); return; }
        const idx = next++;
        w.send({ idx, ...jobs[idx] });
      };
      w.on('message', m => {
        results[m.idx] = m;
        done++;
        if (onProgress) onProgress(done, jobs.length);
        feed();
      });
      w.on('error', reject);
      feed();
    }
    const check = setInterval(() => {
      if (done === jobs.length) { clearInterval(check); pool.forEach(w => { try { w.kill(); } catch (e) {} }); resolve(results); }
    }, 200);
  });
}

// ---- statistics ----
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
function pairedStats(candBySeed, baseBySeed) {
  const d = candBySeed.map((c, i) => c - baseBySeed[i]);
  const m = mean(d);
  const varr = d.length > 1
    ? d.reduce((a, x) => a + (x - m) * (x - m), 0) / (d.length - 1) : 0;
  return { diff: m, se: Math.sqrt(varr / d.length), n: d.length };
}
const pct = x => (100 * x).toFixed(1);
function verdict(s) {
  const t = s.se > 0 ? Math.abs(s.diff) / s.se : 0;
  if (t < 2) return 'NO EFFECT (inside noise)';
  return s.diff > 0 ? 'better (' + t.toFixed(1) + ' SE)' : 'WORSE (' + t.toFixed(1) + ' SE)';
}

// ---- config list ----
function candidates() {
  const mode = process.argv[2] || 'probe';
  if (mode === 'baseline') return [];
  if (mode === 'sweep') {
    const key = process.argv[3];
    const vals = (process.argv[4] || '').split(',').map(Number);
    if (!key || !vals.length) { console.error('usage: tune.js sweep <key> <v1,v2,...>'); process.exit(1); }
    return vals.map(v => ({ label: key + '=' + v, cfg: { ...BASE, [key]: v } }));
  }
  // Default probe: the constants that were hardcoded outside CFG and so have
  // never once been measured, plus the two CFG weights most likely to matter
  // in a league whose whole edge is quarterback mispricing.
  const c = [];
  const add = (k, v) => c.push({ label: k + ' ' + BASE[k] + ' -> ' + v, cfg: { ...BASE, [k]: v } });
  add('qbEarly', 0); add('qbEarly', -60);
  add('qbMid', 0); add('qbMid', -30);
  add('kRound', 14); add('dstRound', 15);
  add('flexTE', 0); add('flexTE', -20);
  add('lateHorizon', 25); add('lateHorizon', 50);
  add('survThresh', 0.4); add('survThresh', 0.7);
  add('scarMax', 36); add('scarMax', 60);
  add('reachRate', 0.3); add('reachRate', 1.0);
  return c;
}

(async () => {
  const cands = candidates();
  const configs = [{ label: 'BASELINE (shipped)', cfg: BASE }, ...cands];
  const jobs = [];
  configs.forEach((c, ci) => SEEDS.forEach(seed =>
    jobs.push({ cfg: c.cfg, seed, drafts: DRAFTS, seasons: SEASONS, ci })));

  console.log('configs: ' + configs.length + '   seeds: ' + SEEDS.length +
    '   drafts/seed: ' + DRAFTS + '   seasons/draft: ' + SEASONS);
  console.log('seasons per config: ' + (SEEDS.length * DRAFTS * SEASONS) +
    '   total jobs: ' + jobs.length + '\n');

  const t0 = Date.now();
  const res = await runJobs(jobs, (d, n) => {
    if (d % 8 === 0 || d === n) process.stdout.write('\r  ' + d + '/' + n + ' jobs  ' +
      ((Date.now() - t0) / 1000).toFixed(0) + 's   ');
  });
  console.log('\n');

  const bySeed = configs.map(() => []);
  const playoffBySeed = configs.map(() => []);
  res.forEach(r => { bySeed[r.ci].push(r.title); playoffBySeed[r.ci].push(r.playoff); });

  const base = bySeed[0];
  console.log('BASELINE  title ' + pct(mean(base)) + '%   playoffs ' +
    pct(mean(playoffBySeed[0])) + '%');
  console.log('  per-seed title: ' + base.map(x => pct(x)).join(', ') + '\n');

  if (!cands.length) return;
  const rows = [];
  configs.slice(1).forEach((c, i) => {
    const s = pairedStats(bySeed[i + 1], base);
    rows.push({ label: c.label, title: mean(bySeed[i + 1]), ...s });
  });
  rows.sort((a, b) => b.diff - a.diff);
  console.log('CHANGE'.padEnd(26) + 'TITLE'.padStart(8) + 'PAIRED DIFF'.padStart(14) +
    '  VERDICT');
  console.log('-'.repeat(76));
  for (const r of rows) {
    console.log(r.label.padEnd(26) + (pct(r.title) + '%').padStart(8) +
      ((r.diff >= 0 ? '+' : '') + pct(r.diff) + ' ±' + pct(r.se)).padStart(14) +
      '  ' + verdict(r));
  }
  console.log('\nA difference under 2 SE is noise. Do not ship it.');
})();
