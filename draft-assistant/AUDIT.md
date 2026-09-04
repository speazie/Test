# Projection data audit

Full scrutiny of `data/players.json` and every correction layer feeding it,
prompted by the discovery that Stafford's #1 QB ranking was a missing
correction rather than an insight.

Reproduce with `python3 /tmp/…` equivalents committed as `sim/td_luck_audit.py`
and `sim/td_luck_impact.py`, plus `data/apply_corrections.js`.

---

## What was checked, and what came back clean

| Check | Method | Result |
|---|---|---|
| Duplicate players | name collision scan | **none** |
| Non-numeric / negative EV | type + range scan | **none** |
| Availability in (0,1] | range scan | **none** |
| Bye weeks | recomputed from the **real 2026 nflverse schedule**, all 32 teams | **235/235 correct** |
| Team assignments | 48 players cross-checked against Yahoo's league player list | **48/48 match** |
| VOR arithmetic | recomputed `e − replacement` at QB10/RB24/WR28/TE10/K10/DST10, K & DST ×0.2 | **0 mismatches of 205** |
| Non-QB TD-luck values | recomputed the documented rule from nflverse 2025 | **consistent** |

That is a genuinely clean bill of health on structure. The defects are all in
one place: **correction layers that failed to reach the player**.

---

## Defect 1 — four quarterbacks never received a TD-luck correction

`Matthew Stafford`, `Brock Purdy`, `Jared Goff` and `Joe Burrow` have **no entry
at all** in `td_luck.json`. Not a name mismatch — the keys are absent. 135 of
164 skill players have one.

Recomputing the rule README section 2 documents (TD rate repeats at r=0.17
passing / 0.13 rushing, regress the remainder to league rate) against nflverse
2025:

| | EV was | Implied correction | EV now |
|---|---|---|---|
| **Matthew Stafford** | 346 | **−78.5** | **268** |
| Brock Purdy | 250 | −39.9 | 210 |
| Jared Goff | 303 | −28.8 | 274 |
| Joe Burrow | 259 | −21.7 | 237 |

Stafford's would have been **the largest correction in the entire dataset** —
the current range is −54.5 to +26.5. He threw 46 TDs on 597 attempts, a 7.70%
rate against a league 4.88%, the most extreme outlier in the data.

**Validation:** the same reconstruction applied to quarterbacks that *did*
receive a correction returns Josh Allen **−54.9** against a shipped **−54.5**.
Error reaches ~30 points on heavy-rushing QBs (Lamar, Maye), so these four
values carry roughly **±20**. The direction is not in doubt.

## Defect 2 — six players lost corrections to a name-suffix mismatch

`td_luck.json` and `circumstance.json` disagree with `players.json` about
Jr./Sr./III. The values existed and were simply never read:

| `players.json` | correction file | TD-luck | eff | age | EV was → now |
|---|---|---|---|---|---|
| James Cook **III** | James Cook | −11.3 | −20.4 | — | 208 → **176** |
| Kenneth Walker | Kenneth Walker **III** | +19.6 | −6.0 | — | 179 → **193** |
| Aaron Jones **Sr.** | Aaron Jones | +16.8 | +11.4 | **×0.726** | 114 → **103** |
| Michael Pittman **Jr.** | Michael Pittman | −6.8 | +9.0 | ×0.867 | 127 → **112** |
| Kyle Pitts **Sr.** | Kyle Pitts | +5.0 | +2.8 | — | 168 → **176** |
| Travis Etienne **Jr.** | Travis Etienne | −10.2 | +10.5 | — | 154 → **154** |

Note Aaron Jones carried an **age multiplier of 0.726** — a 27% haircut for
being 30 — that never applied.

Two fuzzy near-misses were checked and **correctly rejected** as different
people: `Savion Williams`/`Javonte Williams` and `Kyle Williams`/`Kyren
Williams`.

The fuzzy matcher written for the live board reader handles suffixes exactly;
the data pipeline does not use it.

## Defect 3 (not fixed) — the TD-luck layer carries too much of the model

Standard deviation of the correction, against the standard deviation of the
whole VOR spread at that position:

| Position | VOR spread | TD-luck spread | Ratio |
|---|---|---|---|
| **QB** | 33.3 | 16.6 | **0.50** |
| TE | 31.8 | 10.6 | 0.33 |
| RB | 55.8 | 15.3 | 0.27 |
| WR | 46.0 | 11.2 | 0.24 |

**Half the differentiation between quarterbacks comes from one correction whose
own documented predictive power is r=0.13–0.17.** That is a deliberate
methodological choice and it is defensible — TD rate genuinely does not repeat —
but it means the layer must be applied with total consistency, and it wasn't.
It also means QB rankings should be treated as the least reliable part of the
board.

This is a design observation, not a bug, and nothing was changed for it.

---

## Effect of the fix

QB board before → after:

| | Before | After |
|---|---|---|
| QB1 | **Stafford, VOR +64** | Bo Nix, VOR +43 |
| QB2 | Bo Nix, +35 | Drake Maye, +29 |
| QB3 | Goff, +21 | Josh Allen, +28 |
| Stafford | **#1** | **≈#11, VOR −6** |

Replacement level fell from 282 to 274 because four QBs came down.

Draft plan from slot 6: rounds 1–5 essentially unchanged. **Pick 55 changes from
Stafford to Kyle Pitts Sr.**, and the quarterback moves to **pick 66 (Bo Nix)** —
a round later, and onto a player who did receive his correction.

Simulated title rate rose 40.4% → 43.4%. **Do not read that as proof.** The
simulation scores every team with the same projections it drafts on, so a
self-consistent set of numbers scores better almost by construction. The
justification for these corrections is not the title rate — it is that they were
the model's own documented policy, and they silently failed to apply.

## Reversibility

- `data/players.pre_audit.json` — the exact pre-audit state.
- `data/apply_corrections.js` — regenerates the change; `--write` applies it.
- Everything is in git; the fingerprint moved from `3531e72b…` to `c018b70b…`
  as expected for a data change.

## Residual risk

- The four reconstructed QB values are **±20**, not exact.
- Order of operations for the join fixes (EV + TD-luck + eff, then × age) is
  inferred from README section 4, not documented precisely. It shifts results by
  a few points, not by direction.
- Rookies (8 players) still carry draft-capital **bin means**, so five receivers
  share identical EVs. Unchanged by this audit; see `FINDINGS.md` section 2.
- Nothing here validates the underlying ridge model. It confirms the corrections
  on top of it are now applied consistently.


---

# Durability (added after the audit)

The availability layer shipped as a hand-written **news** list — 18 players with
a camp injury or an open disciplinary matter. It had no memory. A receiver who
tore a knee in October and had not played since carried the same `av: 1.0` as
one who has never missed a snap, and the model paid full price for both.

`data/apply_durability.js` adds the history, from nflverse games and PPG,
2020–2025 (committed as `data/games_played.json`, so it reproduces offline).

## The rule

> Discount a major injury **unless** the player has proven it did not reduce
> his production.

Operationally, in the order the questions get asked:

1. **Did he ever lose a season?** ≤ 11 of 17 games. Missing a couple of games is
   ordinary — week 18 rest, a one-week knock — and treating that as an injury
   put Mahomes and C.J. Stroud on the risk list at 94%, which is noise wearing
   the costume of a finding.
2. **Was the absence physical?** A served suspension reads exactly like a torn
   ACL in games-played data. `data/not_injury.json` excludes those by hand,
   because the injury report cannot tell them apart: a suspended player and a
   player on season-ending IR both simply stop appearing on it.
3. **Has he played a full season since?** ≥ 12 games. If so, **no discount at
   all** — we now have direct evidence of what he produces post-injury, and the
   projection is built on it.
4. Otherwise, discount on **points per game** (weight 0.7) and missed time
   (0.3), floored at 0.70.

## Why step 3 is a full season and not a PPG test

An earlier cut tested post-injury PPG against a pre-injury baseline *forever*.
It flagged **Mark Andrews** and **Cooper Kupp** — both of whom played a full 17
games and simply are not what they were in 2021. That is **decline, already
priced into their EV**, and nothing to do with being hurt. Charging them again
would be double-counting the same fact.

The discount now exists exactly where the evidence does not: a player hurt
recently, whose projection still leans on how good he was before.

## What it does and does not touch

**Cleared by the "unless" clause** — each lost a season, then played a whole one:

| | Injury season | Season back | Verdict |
|---|---|---|---|
| Breece Hall | 2022, 7 games (ACL) | 2023, 17 games at 17.1/g | no discount |
| Jonathan Taylor | 2023, 10 games | 2024, 14 → 2025, 17 at 21.3/g | no discount |
| Christian McCaffrey | 2024, 4 games | 2025, 17 games at 24.5/g | no discount |

**Discounted** — 33 players; the ones that matter on this board:

| | Availability | VOR | Evidence |
|---|---|---|---|
| Malik Nabers | 95% → **70%** | 14 → −32 | 4 games; PPG 18.2 → 14.3 |
| Jayden Daniels | 100% → **73%** | −14 → −84 | 7 games; PPG 20.9 → 16.3 |
| Joe Burrow | 100% → **79%** | −37 → −87 | 8 games; PPG 19.7 → 16.8 |
| Rashee Rice | 100% → **82%** | 56 → 18 | rate *rose* (13.3→16.2→18.8); availability only |
| Garrett Wilson | 100% → **89%** | 14 → −3 | 7 games, but PPG held (14.8 → 14.2) |
| Bucky Irving | 100% → **89%** | 50 → 37 | 10 games; PPG held (14.4 → 13.8) |

Note the shape of the last three: **PPG held, so only the missed-time term
applies** — a mild discount, not a burial. That is the rule doing what it was
asked to.

## The honest caveat

This is a **judgement change grounded in real data, not a measured
improvement**. The season simulation scores every team with the same
projections it drafts on, so any projection change trivially "improves" the
simulated title rate. That number would only tell us the simulation agrees with
itself. What *is* verified is the data (nflverse games and PPG), the rule's
behaviour on named cases, and that nothing else broke.
