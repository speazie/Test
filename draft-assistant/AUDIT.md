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
