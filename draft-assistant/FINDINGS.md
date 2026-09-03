# Model scrutiny — findings

Everything here was measured, not reasoned about. Reproduce with `./verify.sh`
and the scripts named under each heading.

---

## 0. THE HEADLINE: the "6-point passing TD exploit" does not exist

This is the project's founding premise, and **the model's own data contradicts
it.** The scoring settings are exactly as documented — that part was verified —
but the *conclusion* drawn from them is wrong.

The league does pay **6 per passing TD** instead of 4. It also pays **−1 per
sack** (default 0) and **−2 per interception** (default −1). Those cancel.

`s` in `players.json` is the points our ruleset adds versus a 4-point-TD sheet.
For quarterbacks it is not the +60 the premise implies:

| QB | passing-TD gain | net `s` after sacks & INTs |
|---|---|---|
| Matthew Stafford | ~+60 | **+16** |
| Josh Allen | ~+60 | +25 |
| Dak Prescott | ~+60 | +30 |
| Lamar Jackson | ~+60 | +33 |

A quarterback throwing ~30 TDs gains ~60, then gives back ~35 to sacks and ~15
to the extra interception penalty. **Net: about +15.** And Stafford gains the
*least* of the top QBs, because he takes the most sacks.

### Recomputing every position's value under both rulesets

| Position | Mean VOR, our rules | Mean VOR, standard | Shift |
|---|---|---|---|
| **QB** | **−8.4** | **−3.3** | **−5.1** |
| RB | −6.8 | −6.6 | −0.3 |
| WR | −9.4 | −9.3 | −0.1 |
| TE | 0.6 | 0.6 | 0.0 |

**Quarterbacks are worth slightly LESS in this league than in a standard one,
not more.** And the QB pecking order barely moves:

| | Our rules | Standard |
|---|---|---|
| QB1 | Stafford, VOR 64 | Stafford, VOR **69** |
| QB2 | Bo Nix, 35 | Bo Nix, 40 |
| QB3 | Goff, 21 | Maye, 29 |

Stafford is our QB1 under **both** rulesets, and is worth *five more* points
under standard scoring.

### What follows

1. **There is no scoring arbitrage.** Whether Yahoo's board is league-adjusted
   is therefore close to moot: the adjustment is worth ~5 VOR at QB and ~0
   everywhere else. There is nothing to exploit.
2. **The Stafford bet is a projection bet, not an exploit.** We rate him 346 EV
   against Yahoo's 113th overall. That gap comes entirely from our *projection*
   of him — which is `method: model`, i.e. **model-only, with no consensus
   check** (see section 2). It would be just as large in a 4-point league.
3. **Section 2b must be re-read in this light.** The opponent sweep does not
   measure "has the field noticed the scoring setting". It measures "does the
   field share our player projections". At `adjust = 1` the field simply agrees
   with our numbers, and naturally we have no edge. That is a statement about
   projection disagreement, not about a rules exploit.
4. **Do not draft Stafford *because of the scoring*.** Draft him if you believe
   our projection of him. Those are different claims, and only the second one
   is actually supported.

The README's "Matthew Stafford threw 46 TDs in 2025 and scored 425 points under
these exact rules" is true and irrelevant: what matters is the *difference*
between rulesets, and for him it is +16, not +92.

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

**Every scoring line is correctly implemented** — the model computes this
league's rules faithfully. What section 0 shows is that the *conclusion* drawn
from those rules was wrong: the −1 sack and −2 INT lines cancel the 6-point TD
bonus, so there is no QB edge to be had from the scoring. The implementation is
right; the story about it was not.

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

## 2a. ANSWERED: the Yahoo rankings are NOT adjusted to this league

The open question from section 2b was whether opponents drafting off Yahoo's own
board are already partly corrected for 6-point passing TDs. The league's actual
player list (`football.fantasysports.yahoo.com/f1/1388434/players`, Pre-Season
rank, captured 9/3/26) settles it. **They are not.**

| | Yahoo rank | Our VOR rank | Gap |
|---|---|---|---|
| **Matthew Stafford** | **113** | **13** | **+100** |
| Bo Nix | 102 | 28 | +74 |
| Jared Goff | 118 | 45 | +73 |
| Jordan Love | 122 | 67 | +55 |

Four of the six largest disagreements in the entire pool are quarterbacks.
Supporting evidence:

- **Zero QBs in Yahoo's top 25.** The first is Josh Allen at 32, then Lamar
  Jackson at 50. Under 6-point passing TDs an elite QB belongs inside the top 20.
- Yahoo ranks Stafford **below Brock Purdy (97)** and below Dak Prescott (78).
  A quarterback who threw 46 TDs is 113th on a board that pays 6 per TD only if
  that board is not paying 6 per TD.
- Yahoo is *more* mispriced than the ESPN sheet the model assumed: Stafford at
  **113 vs ESPN's 86**.

**The edge is real, and it is larger than the model assumed.** This is the single
most important input received, and it resolves the main risk in section 2b in
your favour.

`data/yahoo_board.json` holds the captured board (ranks 1–125; 123 of 125 matched
into the pool). `boardRank()` now prefers it over the ESPN sheet, because it is
literally the list on screen in front of the other nine managers. Re-measured
with the real board: **40.4% title, 89.5% playoffs** — statistically unchanged
from the 41.4% measured on the ESPN board, so the swap corrects the inputs
without moving the answer.

*Caveat:* the list is "All Offense", so kickers and defences are absent and fall
back to ADP; that costs nothing, since K and DST VOR spans only ±3.

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

Re-run against the **real Yahoo board** (Stafford starts at his true rank of 113):

| adjust | Stafford's board rank | Playoffs | **Title** |
|---|---|---|---|
| **0 — the field drafts the Yahoo board** | 113 | 89.4% | **39.5%** |
| 0.25 | 88 | 76.9% | **29.0%** |
| **0.5 — the tool's own mock-draft default** | 63 | 55.4% | **16.6%** |
| 0.75 | 38 | 25.4% | 5.7% |
| 1.0 | 13 | 19.1% | 4.2% |

**Read this as projection agreement, not scoring.** Section 0 shows there is no
rules exploit to notice, so `adjust` is really "how far the field's player
opinions converge on ours". A quarter of the way costs 10 title points; halfway
takes it to 16.6%, close to the 10% random baseline.

That is still a real and useful sensitivity — it says the entire edge is
*disagreement*, and disagreement is only worth something if we are right. Given
section 2 (only 1.2 of 15 picks come from consensus-checked projections), that
is a large amount of weight resting on unvalidated numbers.

Note the middle row. The tool's own mock draft ships with `ADJUST = 0.5`,
described in its source as *"they have noticed and half-corrected"*. At exactly
that assumption the edge is gone. The repo's headline numbers and the repo's own
opponent model disagree with each other by 29 title points, and nobody noticed
because they live in different files.

### What this means practically

1. **Quote a much lower number.** Between this and the self-referential
   projections, a defensible expectation is meaningfully below the README's
   15–30%. The edge is real but it is entirely a bet that our projections beat
   the field's — there is no rules arbitrage underneath it.
2. **`HIDE` is now about tidiness, not secrecy.** It was justified as protecting
   a scoring exploit. There is no exploit to protect. Keep using it if someone
   is looking over your shoulder, but it is no longer load-bearing.
3. **Watch the QB pace indicator.** The engine already measures whether a
   position is going faster than its board implies and pulls players forward.
   If quarterbacks start going early it will react on its own.

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
