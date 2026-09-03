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

`sim/rookie_stress.js` prices this as a decision rather than an opinion: it
crosses what we believe when drafting against how wrong the rookie numbers
actually are, and reports the regret in each corner.

---

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
