// Roster-shape regressions. Run after EVERY change:  node sim/regression_tests.js
// Exits non-zero on a real failure so it can gate a commit.
const { fresh } = require('./harness');

const n = parseInt(process.argv[2] || '40', 10);
let fails = 0, flexTE = 0, bye3 = 0, hc = 0, benchRB5 = 0, emptyStart = 0;
const byeDist = [];

for (let i = 0; i < n; i++) {
  const A = fresh();
  A.setSlot((i % 10) + 1);
  A.runMock();
  const B = Object.fromEntries(A.PLAYERS.map(p => [p.n, p]));
  const R = A.fillRoster(), st = R.slice(0, 9), skill = R.slice(0, 7);
  if (st.filter(x => !x.who).length) emptyStart++;
  if (st.filter(x => !x.who).length || A.getMine().length !== 15) { fails++; continue; }
  // flex should not be a 2nd TE
  const flex = R[6].who; if (flex && flex.p === "TE") flexTE++;
  // starter bye pileup
  const bl = {}; skill.forEach(x => { if (x.who) bl[x.who.b] = (bl[x.who.b] || 0) + 1; });
  const worst = Math.max(...Object.values(bl)); byeDist.push(worst);
  if (worst >= 3) bye3++;
  // handcuff present?
  const mineP = A.getMine().map(x => B[x]);
  const rbs = mineP.filter(p => p.p === "RB");
  const elite = rbs.filter(p => p.v >= 40);
  if (elite.some(e => rbs.some(r => r !== e && r.t === e.t))) hc++;
  if (rbs.length >= 5 && mineP.filter(p => p.p === "WR").length < 5) benchRB5++;
}

const pct = x => Math.round(100 * x / n) + "%";
console.log("runs:", n, "| broken rosters:", fails, "| empty starting slots:", emptyStart);
console.log("flex filled by a 2nd TE:", flexTE, "(" + pct(flexTE) + ")   [was the bug]");
console.log("3+ SKILL starters on one bye:", bye3, "(" + pct(bye3) + ")");
console.log("avg worst starter-bye stack:",
  (byeDist.reduce((a, b) => a + b, 0) / (byeDist.length || 1)).toFixed(2));
console.log("rosters holding a handcuff to their own RB:", hc, "(" + pct(hc) + ")");
console.log("5+ RB with <5 WR (bench waste):", benchRB5, "(" + pct(benchRB5) + ")");

const A = fresh(); A.setSlot(5); A.runMock();
console.log("\nSample slot 5:");
A.fillRoster().forEach(s =>
  console.log("   " + s.code.padEnd(6) + (s.who ? s.who.n + " (" + s.who.p + ", bye " + s.who.b + ")" : "—")));

// ---- hard assertions ----
const problems = [];
if (fails) problems.push(fails + " broken roster(s) out of " + n);
if (flexTE / n > 0.25) problems.push("flex filled by a 2nd TE in " + pct(flexTE) + " of drafts");
if (problems.length) {
  console.error("\nFAIL: " + problems.join("; "));
  process.exit(1);
}
console.log("\nOK");
