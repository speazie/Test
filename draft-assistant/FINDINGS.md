# Model scrutiny — findings

Everything here was measured, not reasoned about. Reproduce with `./verify.sh`
and the scripts named under each heading.

---

## 1. The rules confirm the model. All of them.

Read from the league settings page (league 1388434), checked line by line
against what the projections assume:

| | League | Yahoo default | Model assumes |
|---|---|---|---|
| Passing TD | **6** | 4 | 6 ✓ |
| Reception | **1.0** | 0.5 | 1.0 ✓ |
| Interception | −2 | −1 | −2 ✓ |
| Sack taken | **−1** | 0 | −1 ✓ |
| Pick-six thrown | **−3** | 0 | −3 ✓ |
| 40+ yd pass/rush/rec TD | **+2** each | 0 | +2 ✓ |
| Fumble lost | −2 | — | −2 ✓ |
| Roster | QB/WR/WR/RB/RB/TE/W-R-T/K/DEF + 6 BN + 2 IR | | matches `SLOTS` ✓ |

**The quarterback edge is real and correctly specified.** Nothing in the
scoring needed changing.

Two documentation errors found: the draft is a **Live Standard Draft** (Fri Sep
4, 9:30pm EDT, 1-minute clock), not the Offline Draft the prompt and README
both claimed; and Stafford is **64 VOR at ADP 77**, not the 78 VOR quoted.

---

## 2. The roster is built almost entirely on unvalidated projections

Picks per draft by projection method, averaged over 25 drafts from slot 6:

| Method | Picks/draft | Has an external check? |
|---|---|---|
| `model` (ridge model alone) | 8.6 | no |
| `rookie-empirical` (draft-capital bin mean) | 2.2 | no |
| `flat` (kickers) | 2.0 | n/a |
| **`blend` (consensus + model)** | **1.2** | **yes** |
| `adp` (returning from lost seasons) | 1.0 | no |

Only **1.2 of 15 picks** come from projections that were ever sanity-checked
against analyst consensus. That does not make them wrong — the backtest in
README section 2 shows the model beating naive at every position — but it is
the honest shape of the risk behind the headline title rate.

### Where the disagreement actually lives

Median (opponent board rank − our VOR rank), by method:

| Method | n | Median disagreement |
|---|---|---|
| `blend` | 40 | −2 |
| `model` | 111 | −3 |
| `rookie-empirical` | 8 | **+50** |
| `adp` | 4 | **+38** |

Model-only players are **not** systematically optimistic — that was the obvious
worry and the data rejects it. The disagreement is concentrated in rookies,
which section 5 of the README already names as the weakest component.

### Why that matters concretely

Rookies get a **draft-capital bin mean**, not a player-specific projection.
Five different receivers carry byte-identical EVs:

```
Carnell Tate        EV 183      Makai Lemon         EV 169
Jordyn Tyson        EV 183      KC Concepcion       EV 169
                                De'Zhaun Stribling  EV 169
```

Yet those bins put **Jadarian Price at our #16 overall against a field rank of
#62** — and the draft plan takes him at pick 35 in **100% of simulated drafts**.
A fourth-round pick, every time, on the least-supported number in the model.

### Pricing that bet (`sim/rookie_stress.js`, 1,920 seasons per cell)

Rows = how much we discount rookies **when drafting**. Columns = how wrong the
rookie numbers **actually are**. The truth-side haircut applies to everyone's
rookies, so avoiding them helps *relatively* when they bust.

| belief \ truth | rookies right | 15% over | 30% over | **worst case** |
|---|---|---|---|---|
| **trust them fully (shipped)** | **40.7%** | 36.5% | 33.2% | **33.2%** |
| discount 15% | 37.4% | 39.7% | 40.1% | **37.4%** |
| discount 30% | 37.4% | 39.6% | 40.7% | **37.4%** |

Trusting the bins has the **highest ceiling and the lowest floor**. A modest
discount flattens the outcome to ~37–41% whatever the truth: it costs 3.3 points
of ceiling and buys 4.2 points of floor. The effect saturates immediately — 15%
and 30% give the same floor — so if you discount at all, a small one is enough.

**Precision caveat:** seasons within a draft are correlated, so the effective
standard error is nearer 2–3 points than the 1.1 the raw count implies. A
4.2-point floor improvement is roughly 1.5–2 SE. **Suggestive, not proven.**

**Not shipped as an engine change**, for the same reason as everything else
here: a marginal effect plus an unmeasured structural edit is how this codebase
got its bug list. Instead the decision is surfaced where it actually bites —
see below.

### The whole rookie exposure is one pick

Re-running the plan with a 30% rookie discount changes only one early pick:

| Round | As shipped | With rookie discount |
|---|---|---|
| R1–R3 | unchanged | unchanged |
| **R4 (pick 35)** | **Jadarian Price 100%** | **Bucky Irving 100%** |
| R6 (pick 55) | Stafford | Stafford |

| | EV | VOR | ADP | Field | Projection basis |
|---|---|---|---|---|---|
| Jadarian Price (SEA) | 229 | 59 | 79 | 62 | *mean year-1 output of rookie RBs drafted near pick 32* |
| Bucky Irving (TB) | 220 | 50 | 45 | 41 | ridge model, TD-luck corrected |

Nine VOR separates them. Price's number contains **no player-specific
information**; Irving's is a real projection the market agrees with. That is the
trade, and it is yours to make — you may know something about Price that a
draft-capital bin does not.

---

## 2b. The headline number assumes nine oblivious opponents

Every title-rate figure in this repository — 46% in the README, 41% here — is
computed with opponents drafting the **raw ESPN board**, priced for 4-point
passing TDs, never noticing the league setting. That is the most favourable
possible assumption about nine other people, and it was baked in silently.

It is also questionable: **Yahoo's draft room displays ranks adjusted to the
league's own scoring**, so a manager who drafts off the board in front of him is
already partly corrected without needing to understand why.

`sim/opponent_stress.js` sweeps it. `adjust` = how far the field has repriced
toward our valuations (0 = raw ESPN board, 1 = they value players as we do):

| adjust | Stafford's board rank | Playoffs | **Title** |
|---|---|---|---|
| **0 — every other sim here** | 86 | 88.9% | **40.7%** |
| 0.25 | 68 | 73.6% | **26.7%** |
| **0.5 — the tool's own mock-draft default** | 50 | 44.7% | **11.4%** |
| 0.75 | 31 | 23.2% | 4.4% |
| 1.0 | 13 | 19.5% | 3.9% |

**A quarter-correction costs 14 title points. A half-correction takes the edge
to 11.4% — a rounding error above the 10% random baseline.**

Note the middle row. The tool's own mock draft ships with `ADJUST = 0.5`,
described in its source as *"they have noticed and half-corrected"*. At exactly
that assumption the edge is gone. The repo's headline numbers and the repo's own
opponent model disagree with each other by 29 title points, and nobody noticed
because they live in different files.

### What this means practically

1. **Quote a much lower number.** Between this and the self-referential
   projections, a defensible expectation is meaningfully below the README's
   15–30%. The edge is real but conditional on the field staying asleep.
2. **The `HIDE` button is not paranoia.** It is the single cheapest way to
   protect the largest sensitivity in the model.
3. **Watch the QB pace indicator.** The engine already measures whether a
   position is going faster than its board implies, and pulls players forward
   when it is. If quarterbacks start going early, the field has adjusted — and
   the tool will react on its own. That mechanism is the hedge, and it already
   exists.

## 3. Six tuning knobs are dead

Swept 16 candidate configs, 3,200 seasons each, paired against baseline on
identical seeds (`sim/tune.js`). Six produced a paired difference of **exactly
0.0 ± 0.0** — not "no effect" but "never applied". Confirmed directly: 12
seeded drafts hash byte-identically across every value tried.

| Knob | Why it never fires |
|---|---|
| `qbEarly`, `qbMid` | A QB is never near the top of the list in rounds 1–4 anyway. QB timing is set by VOR and the reach penalty; these penalties are decoration. |
| `kRound`, `dstRound` | K and DST VOR spans ±3 before the 0.2 multiplier, so they never outrank a real player until mandatory-fill forces them — gate or no gate. |
| `flexTE` | Only sets the *nominal* flex in `fillRoster`; the season simulator computes its own optimal lineup. Unmeasurable by construction. |
| `scarMax` | See below. |

### The one apparent improvement did not replicate

`reachRate 0.6 → 0.3` was the single candidate to clear the 2-SE bar in the
probe: **+1.7 ± 0.7 title points (2.3 SE)**. One hit out of sixteen candidates
is exactly what multiple comparisons produce by chance, so it was re-tested on
**ten held-out seeds, 4,000 seasons per config**:

| reachRate | Title | Paired diff | |
|---|---|---|---|
| **0.6 (shipped)** | **41.5%** | — | baseline |
| 0.45 | 40.8% | −0.8 ± 1.3 | no effect |
| 0.3 | 40.4% | **−1.1 ± 0.9** | no effect, and the sign flipped |

It did not replicate. On fresh seeds the effect reverses. **No weight change is
justified; the shipped `CFG` stays exactly as it is.**

Note this is the *second* independent failure to tune `reachRate` — README
section 3 records the earlier move from 1.7 → 0.6 as "not statistically
significant" too. Two attempts, two non-replications, is decent evidence the
weight is simply fine and the configuration sits on a flat optimum.

## 4. Scarcity is saturated — the mechanism is a constant

The README's proudest mechanism: *"filling a slot early is worth exactly this
player's VOR minus the best at the position surviving 38+ picks later, clamped
6–48."*

Measured raw scarcity at my actual picks:

| Pick | QB | RB | WR | TE |
|---|---|---|---|---|
| 6 | 0 | **76** | **81** | 18 |
| 15 | 0 | **76** | **88** | 22 |
| 26 | 0 | **111** | **88** | 22 |
| 35 | 0 | **111** | **88** | 36 |
| 46 | 0 | **111** | **88** | 36 |
| 55 | 43 | **111** | **99** | 36 |

RB and WR exceed the cap of 48 at **every single pick**. The clamp binds
always, so "fills your open RB slot" is a **flat +48 constant**, not a priced
cliff. The self-calibration the README describes is not operating for the two
positions that matter most.

This is README bug #3 — the flat +55 TE bonus — reappearing in a different
place.

**It is flagged, not fixed.** It does not currently bite, because it saturates
symmetrically for RB and WR and so leaves their relative order intact; and
moving the cap in either direction measures as exactly zero effect. Shipping an
unmeasured structural change to the scoring the night before a draft is how
this codebase got its eight bugs.

---

## 5. Weeks 16–17 are unmeasurable in this harness

Item #1 on the improvement list. The 2026 schedule is available from nflverse,
so the *data* problem is solvable — but `season()` models each week as an
i.i.d. draw from a player's own distribution **with no opponent**, so a
strength-of-schedule term added to the engine would score as exactly zero
effect by construction. Measuring it properly needs opponent-defence effects in
the season sim, which needs 2026 defensive projections: a new modelling problem
with its own error.

`model/playoff_schedule.py` therefore prints an advisory table and changes no
engine behaviour. Softest championship-week matchups on 2025 points allowed:
**JAX, MIN, LV, NYG**. Use it only to break a tie between players already rated
equally.

---

## 6. What the model intends to do (slot 6)

From `sim/draft_plan.js`, 25 drafts:

| Round | Pick | Taken |
|---|---|---|
| 1 | 6 | WR — Smith-Njigba 56% / St. Brown 36% / Nacua 8% |
| 2 | 15 | **Breece Hall 100%** |
| 3 | 26 | **George Pickens 100%** |
| 4 | 35 | **Jadarian Price 100%** ← the rookie bet |
| 5 | 46 | Bucky Irving 48% / D'Andre Swift 32% / TE 20% |
| 6 | 55 | **Matthew Stafford 100%** ← the QB exploit |
| 7 | 66 | Wan'Dale Robinson 100% |

The two structural bets: **Breece Hall** (our #5 overall, field #23) and
**Stafford** at pick 55 (field #86). Both follow directly from the confirmed
scoring; neither is a modelling artefact.
