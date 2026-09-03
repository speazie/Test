# SSTLV Draft Assistant — model, data, and simulation bundle

Everything needed to rebuild, verify, or extend the draft tool. Built for one
specific league; the scoring is unusual and most of the edge comes from that.

---

## 1. The league

10 teams, head-to-head, **offline draft**, snake. Roster: QB, WR, WR, RB, RB, TE,
W/R/T, K, DEF + 6 bench + 2 IR. **You draft 15 players** (IR is an in-season slot).
Playoffs: 4 teams, weeks 16–17. Waivers: continual rolling, process Tuesday,
**unlimited acquisitions**. Draft slot: **6**.

### Scoring (this is the whole point)

| | |
|---|---|
| Passing yards | 1 per 25 |
| **Passing TD** | **6** (Yahoo default is 4) |
| Interception | −2 |
| **Sack taken** | **−1** |
| **Pick-six thrown** | **−3** |
| Rushing / receiving yards | 1 per 10 |
| Rushing / receiving TD | 6 |
| **Reception** | **1.0 (full PPR)** |
| 40+ yd pass/rush/rec TD | +2 each |
| Fumble lost | −2 |
| Return TD | 6 |

**The exploit:** 6-point passing TDs. Nearly every public cheat sheet — including
the ESPN sheet a known opponent is using (`data/espn_board.py`, dated Aug 19) —
is built for 4-point passing TDs. That mis-prices quarterbacks by roughly 50–60
points each. Matthew Stafford threw 46 TDs in 2025 and scored **425 points** under
these exact rules, the most of any player in football, while ESPN ranks him QB12
at pick 86.

---

## 2. Projection pipeline

Run order: `model/nflverse_core.py` → `model/usage_model.py` → context layers.

**Step 1 — historical panel.** Seven seasons of nflverse data (2019–2025), 4,191
player-seasons, scored under the exact league rules. nflverse is the only source
carrying `sacks_suffered`, `rushing_40` and `passing_40`, which this scoring needs
and no public projection publishes.

Source: `https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_reg_{YEAR}.csv`

**Step 2 — usage model.** Ridge regression per position predicting next-season
points/game from prior-season usage rates, efficiency, age and experience.

Backtest (train 2019–23 pairs, predict 2025 from 2024):

| Pos | n | Model MAE | Naive MAE | Model r | Naive r |
|---|---|---|---|---|---|
| QB | 51 | 4.67 | 5.21 | 0.720 | 0.658 |
| RB | 97 | 2.63 | 2.78 | 0.821 | 0.815 |
| WR | 162 | 2.15 | 2.57 | 0.846 | 0.815 |
| TE | 93 | 1.82 | 1.97 | 0.796 | 0.777 |

Absolute calibration on held-out 2025: ratios 0.95–1.02. **The model is
calibrated; analyst consensus is optimistic by ~20%** and is deflated before
blending (0.835 QB / 0.777 RB / 0.819 WR / 0.826 TE).

**Step 3 — blend.** 55% deflated consensus + 45% model where both exist (40
players); model alone elsewhere (122); empirical rookie bins for rookies (14);
ADP only for 5 players returning from lost seasons.

**Step 4 — context layers** (all measured, not assumed):

| Layer | Measurement | Effect |
|---|---|---|
| TD luck | TD rate repeats at r=0.17 (rec) / 0.13 (rush); volume at 0.70 / 0.63 | Regress TDs 83% to league rate. Jefferson +26, Allen −55 |
| Efficiency | yds/target r=0.285, yds/carry r=0.213 | Regress 71–79%. Jeanty +31, JSN −33 |
| Age | RB retains 88.5% (22–25), 82.7% (26–28), **66.0% (29–31)** | Henry −20, Aaron Jones −16 |
| Team change | movers retain vs stayers: RB .827 WR .806 TE .937 QB .915 | measured, position-specific |
| QB change | Sept 1 depth charts | ARI ×0.90 (Brissett), MIN ×1.06 (Kyler), PIT ×1.04 (Rodgers) |
| Rookies | draft pick vs year-1 pts/g, rank corr −0.575 | binned means capped at observed max |
| Availability | injury/discipline research | Nacua 0.89, Jacobs 0.76, Charbonnet 0.25 |
| Games played | starter-only baselines | QB 16.2, RB 15.7, WR 15.8, TE 15.7 |

**Step 5 — VOR.** Replacement = QB10, RB24, WR28, TE10, K10, DST10. K and DST
VOR is multiplied by 0.2 because both are streamable.

**Critical:** raw EV is *not* draft order. QBs score the most points in this
format (replacement QB ≈ 280) but that lifts every QB equally. Sort by VOR.

---

## 3. Draft engine (`tool/engine_js.txt`)

Additive scoring — **never multiplicative**. Late-draft VOR is negative, and
multiplying a negative by a small weight makes it *larger*, which once produced
rosters with four quarterbacks.

Terms: VOR + scarcity-based slot need + opportunity cost vs next pick + run
detection − reach penalty − bye conflict + handcuff + QB stack − offence
concentration.

**Scarcity is self-calibrating**: filling a slot early is worth exactly
`this player's VOR − best at the position surviving 38+ picks later`, clamped
6–48. QB computes ~45; TE computes ~20. Previously a flat +55 for TE, which
caused 29-pick reaches.

Hard constraints: max 2 QB / 1 K / 1 DST; mandatory-fill mode when remaining
picks equal empty starting slots; 15-pick cap.

Weights live in `CFG` at the top and were optimised against simulated title rate
(`sim/optimise.js`). Of 18 weights only `reachRate` moved (1.7 → 0.6), and that
change was **not statistically significant** on held-out seeds (+1.7 pts, ±5.4).

---

## 4. Simulation

`sim/drafts.js` runs full 10-team drafts (you = engine, opponents = ESPN board +
roster needs + gaussian noise). `sim/season_montecarlo.py` plays 15-week seasons
with real weekly variance (CV: QB .472 RB .518 WR .561 TE .623, measured
2022–24), byes, optimal lineups, 4-team playoff, weeks 16–17 final.

Latest, slot 6:

| Assumption | Playoffs | Title |
|---|---|---|
| baseline (random team) | 40% | 10% |
| full backtested model error | 90% | 46% |
| 1.5× that error | 83% | 33% |
| truth is 50/50 mine and ESPN's | 47% | **10.5%** |
| ESPN right, model wrong | 16% | 1% |

**Read the last three rows.** The entire edge is conditional on the projections
beating ESPN's. The simulation scores every team with my own numbers, so it is
structurally biased toward me. **A defensible expectation is 15–30%, not 46%.**

---

## 5. Known limitations

- 5 players run on ADP alone (returning from lost seasons — no data exists).
- Rookie projections are the weakest component.
- Sacks barely predict (r=0.301); QB ordering is directional, not precise.
- No model of teammate injuries inflating 2025 usage, o-line, or scheme.
- Opponent model assumes all nine use the ESPN sheet. Only one is confirmed.
- Win-rate figures are self-referential.

## 6. Bugs found in development — do not reintroduce

1. **Multiplicative weights** inverted on negative VOR → four-QB rosters.
2. **Bye penalty of −105** made the engine reject a 33-VOR upgrade to dodge a
   ~15-point bye conflict.
3. **Flat +55 TE need bonus** = 2.75× the real value of filling the slot early.
4. **QB branch returned early** and never received the "fills a starting slot"
   bonus — a silent 45-point handicap on the position that matters most here.
5. **Reach measured against a static board** while a run was underway.
6. **Rookie curve extrapolated** to draft picks with zero observations (predicted
   22.7 pts/g at pick 3; the two nearest real observations produced 14.4).
7. **Edited the source but shipped the old build**, so an optimisation run
   silently tested stale code and reported "no effect".
8. **K/DST pool too small** (12/15) → mandatory-fill mode had nothing legal to
   offer and the tool froze mid-draft.

Every one of these was found by a human noticing bad output, not by a test.
That is the single most important fact about this codebase.
