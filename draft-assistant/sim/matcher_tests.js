// Name-matching tests. This is the code path that replaces typing, and a wrong
// match silently corrupts the board, so it gets asserted rather than eyeballed.
const { fresh } = require('./harness');
const A = fresh();

let pass = 0, fail = 0;
function eq(label, got, want) {
  if (got === want) { pass++; return; }
  fail++;
  console.log('  FAIL  ' + label + '\n          got  ' + got + '\n          want ' + want);
}
// The top-ranked search hit for a query.
const top = q => { const r = A.searchPlayers(q, { limit: 1 }); return r.length ? r[0].p.n : '(none)'; };

console.log('typed shorthand -> intended player');
// The two cases named in the brief.
eq('"stfd"', top('stfd'), 'Matthew Stafford');
eq('"jsn"', top('jsn'), 'Jaxon Smith-Njigba');
// Initials, the fastest possible entry.
eq('"br" (initials)', top('bijan'), 'Bijan Robinson');
eq('"jg"', top('jg'), 'Jahmyr Gibbs');
// Partial tokens.
eq('"ja ch"', top('ja ch'), "Ja'Marr Chase");
eq('"matt staff"', top('matt staff'), 'Matthew Stafford');
eq('"gibbs"', top('gibbs'), 'Jahmyr Gibbs');
// Punctuation must not have to be typed.
eq('"jamarr" (no apostrophe)', top('jamarr'), "Ja'Marr Chase");
eq('"smith njigba"', top('smith njigba'), 'Jaxon Smith-Njigba');
eq('"aj brown" (no dots)', top('aj brown'), 'A.J. Brown');
eq('"amonra"', top('amonra'), 'Amon-Ra St. Brown');
// Suffixes must be optional.
eq('"brian thomas"', top('brian thomas'), 'Brian Thomas Jr.');

console.log('\nboard reads -> match confidence');
// A full name off a draft board must be committable without asking.
const m1 = A.matchBoardName('Bijan Robinson', { pos: 'RB', team: 'ATL' });
eq('full name + pos + team is confident', m1.conf >= 0.9 && m1.p.n === 'Bijan Robinson', true);
// A bare ambiguous surname must NOT be. There are three Robinsons in the pool;
// auto-committing the wrong one is the failure mode that corrupts everything.
const m2 = A.matchBoardName('Robinson', {});
eq('bare "Robinson" is not confident', m2.conf < 0.85, true);
// Disambiguated by team, it becomes usable again.
const m3 = A.matchBoardName('Robinson', { pos: 'WR', team: 'NYG' });
eq('"Robinson" + NYG + WR resolves', m3.p.n, "Wan'Dale Robinson");
// A position that contradicts the name must drag confidence down.
const m4 = A.matchBoardName('Bijan Robinson', { pos: 'QB' });
eq('contradicting position still needs a tap', m4.conf < 0.85, true);
// A player who changed teams since the pool was built: the name is exact and
// unique, so it is our team field that is stale, not the match. It must still
// commit, and it must say so.
const m7 = A.matchBoardName('A.J. Brown', { pos: 'WR', team: 'PHI' });
eq('stale team on an exact name still commits', m7.conf >= 0.85, true);
eq('and it reports the discrepancy', /PHI/.test(m7.stale || ''), true);
// The same stale team on an AMBIGUOUS name must not commit.
const m8 = A.matchBoardName('Brown', { pos: 'WR', team: 'PHI' });
eq('stale team on an ambiguous name does not commit', m8.conf < 0.85, true);
// Yahoo abbreviates first names on narrow layouts.
const m5 = A.matchBoardName('M. Stafford', { pos: 'QB', team: 'LAR' });
eq('"M. Stafford" + QB + LAR resolves', m5.p.n, 'Matthew Stafford');
// Garbage must not match anything with confidence.
const m6 = A.matchBoardName('Zzzz Nobody', {});
eq('nonsense is not confident', m6.p === null || m6.conf < 0.6, true);

console.log('\nlikely-next panel');
const lk = A.likelyNext(20);
eq('returns 20', lk.length, 20);
eq('sorted by opponent board rank',
  lk.every((p, i) => i === 0 || (lk[i - 1].espn || lk[i - 1].a) <= (p.espn || p.a)), true);
// Once a player is gone he must drop off the panel.
A.markGone(lk[0].n);
eq('a gone player leaves the panel', A.likelyNext(20).some(p => p.n === lk[0].n), false);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
