# SSTLV fantasy football — project context

Built Sep 2026 for the SSTLV league draft. This is a handoff summary: what the
league is, what got built, what the model actually found, and what is still
unproven. Written to be pasted into a Claude Project as background.

---

## 1. The league

| | |
|---|---|
| Platform | Yahoo Fantasy, league **1388434** |
| Format | 10 teams, head-to-head, snake |
| My draft slot | **6** |
| Draft | Live Standard Draft, **Fri Sep 4 2026, 9:30pm EDT**, 1-minute pick clock |
| Starters | QB, WR, WR, RB, RB, TE, W/R/T, K, DEF |
| Bench | 6 BN + 2 IR (**15 draftable picks**) |
| Playoffs | 4 teams, weeks **16–17**, reseeded |
| Waivers | Continual rolling, Tuesday, **no acquisition limit** |

### Scoring (non-default lines in bold)

**6 points per passing TD** (Yahoo default is 4), full PPR, **−1 per sack**,
−2 per INT, **−3 pick-six**, **+2 for each 40+ yard TD**, −2 fumble lost.

Every line was checked against the model and is implemented correctly.

---

## 2. What was built

Repo `speazie/test`, branch `claude/new-session-rh782e`, directory
`draft-assistant/`. 41 commits.

| Artifact | What it is |
|---|---|
| `tool/live-draft-assistant.html` | Standalone offline assistant. One file, no network, no install. The fallback. |
| `tool/yahoo-draft-bridge.user.js` | Tampermonkey userscript. Mounts a panel in the live Yahoo draft room and **reads picks off the board automatically**. |
| `tool/practice.html` | No-install rehearsal: a fake draft room that drafts itself, driving the real engine. |
| `./verify.sh` | Build + 24 matcher tests + 111 real-browser tests (Playwright). Gated on build freshness — the sims refuse to run against a stale build. |

Docs in-repo: `README.md` (model), `FINDINGS.md` (measurements),
`AUDIT.md` (data audit + durability layer), `DRAFT_DAY.md` (runbook).

**Design constraint throughout: never type a player's name.** Entry is by
board-reading, one tap, or a 3–4 letter fuzzy match.

---

## 3. What the model found — the substantive results

### The 6-point passing TD "exploit" does not exist

The league pays 6 per passing TD instead of 4 — but it also pays **−1 per sack**
and −2 per INT. Those cancel. A QB throwing ~30 TDs gains ~60 and gives back
~50. Mean VOR shift by position under this ruleset vs standard:

| QB | RB | WR | TE |
|---|---|---|---|
| **−5.1** | −0.3 | −0.1 | 0.0 |

Quarterbacks are worth *less* here, not more. Any strategy built on "we get
6-point passing TDs" is built on nothing.

### Stafford's #1 ranking was a data bug, not an edge

He was the model's QB1 (+64 VOR) against a Yahoo rank of 113. Cause: **he had
no entry in `td_luck.json` at all** — 135 of 164 skill players did. He threw 46
TDs on 597 attempts (7.70% vs a league 4.88%), the most extreme outlier in the
dataset, and the regression every other QB received was never applied to him.
Correcting it: **−78.5 EV, QB1 → ~QB11**.

This is the single most important lesson: *a player ranked far above consensus
is more likely a broken join than an insight.*

### Data audit

**Clean:** duplicate players (none), non-numeric/negative EV (none), bye weeks
(235/235 correct against the real 2026 nflverse schedule), team assignments
(48/48 vs Yahoo), VOR arithmetic (0 mismatches of 205).

**Defects — all the same shape: correction layers failing to reach the player.**
- 4 QBs with no TD-luck entry (Stafford, Purdy, Goff, Burrow)
- 6 players losing corrections to Jr./Sr./III name mismatches, including
  Aaron Jones' **age multiplier of 0.726** — a 27% haircut — never applied

Both fixed via `data/apply_corrections.js`.

### Weight tuning found nothing worth shipping

16 configurations swept. **Six knobs are provably inert** (byte-identical
drafts). Only `reachRate` cleared 2 SE — and it **failed to replicate on
held-out seeds** (−1.1 ±0.9, sign flipped). **No weight change was shipped.**

### Durability / injuries (added late, at request)

Availability originally shipped as a hand-written news list of 18 players with
no memory of injury history. Replaced with a data layer built from nflverse
games played and points per game, 2020–2025 (`data/games_played.json`,
`data/apply_durability.js`).

The rule, in order:
1. Did he lose a season? (≤11 of 17 games)
2. Was the absence physical? (served suspensions excluded by hand —
   `data/not_injury.json`; the injury report can't distinguish them, because a
   suspended player and a player on season-ending IR both simply stop appearing)
3. **Has he played a full season since? (≥12 games) → no discount at all.**
4. Otherwise discount on PPG (weight 0.7) and missed time (0.3), floored at 0.70.

Step 3 is a full season, *not* a permanent PPG test, for a specific reason: an
earlier version compared post-injury PPG to a pre-injury baseline forever, and
flagged **Mark Andrews and Cooper Kupp** — who each played a full 17 games and
simply are not what they were in 2021. That is **decline, already priced into
their EV**; discounting again double-counts it.

**Cleared by the "unless" clause:** Breece Hall (ACL 2022, then 17 games at
17.1/g), Jonathan Taylor, Christian McCaffrey.
**Discounted (33 players):** Malik Nabers 70%, Jayden Daniels 73%,
Joe Burrow 79%, Rashee Rice 82%, Garrett Wilson 89%, Bucky Irving 89%.

---

## 4. Known weaknesses — read before trusting a recommendation

**Scarcity is saturated.** RB/WR raw scarcity runs 76–111 against a cap of 48,
so the clamp binds at *every* pick and "fills your open RB slot" is a flat +48
constant rather than a priced cliff. Flagged, deliberately not fixed: it
saturates symmetrically so relative order is intact, and moving the cap
measures as exactly zero effect.

**TD-luck carries ~50% of the QB VOR spread** (σ 16.6 against a spread of 33.3)
on a correction whose own predictive power is r=0.13–0.17. **Treat the QB board
as the least reliable part of the model.**

**Weeks 16–17 strength of schedule is unmeasurable in this harness.** The season
sim models each week as an i.i.d. draw with no opponent, so any SOS term scores
as exactly zero by construction. `model/playoff_schedule.py` prints an advisory
table only.

**Rookie projections are bin means, not players.** A rookie is priced at the
mean year-1 output of players drafted near his slot. This is the largest
unvalidated bet in the model. It surfaced concretely at pick 35 as **Jadarian
Price (our #16 overall) vs Bucky Irving (field ADP 45)** — measured tradeoff:
trusting the bins had the best ceiling (40.7% title) and the worst floor
(33.2%); discounting rookies flattened it to ~37–41%. That is 1.5–2 SE —
suggestive, not proven. Left as a human judgement call.

**Breece Hall is the largest single-player disagreement.** Ours RB3, field
RB15–16 (ADP 34.6). He carries **the largest upward TD-luck correction in the
entire dataset, +26.5** — on the r=0.13 layer. Strip that one layer and he is
RB6, VOR 96 → 72. The other ~9 ranks of the gap are the usage model genuinely
disagreeing with the market.

**The whole edge is disagreement, and disagreement only pays if we are right.**
Measured sensitivity to the field converging on our projections:

| Field agreement with us | Title odds |
|---|---|
| none (they draft the Yahoo board) | 39.5% |
| a quarter | 29.0% |
| **half** | **16.6%** |
| full | 4.2% |

A random team is 10%.

---

## 5. Forward planning (new, and UNPROVEN)

The recommendation engine was greedy: it priced one pick with a one-step glance
at what survives to the next. A route planner was added — it drafts the rest of
your draft at every remaining pick from the players expected to survive, then
judges candidates on the **finished team**, scored week-by-week across all 17
weeks so bye collisions and depth are priced by what they actually cost rather
than by hand-tuned bonuses.

**Status: shipped and on, but not proven.** One run (80 drafts/arm) had the
planner ahead on all four error levels (41.6% → 46.1% title at full model
error), but at that sample size the standard error is ~5.5 points, so a
4.5-point gap is under 1 SE. The larger replication was never completed. By the
project's own standard — *an improvement inside the noise band is not an
improvement* — this is **not yet evidence**.

---

## 6. Live-draft engineering notes (worth keeping for next season)

The board reader took two full days of real-draft bug reports. Every one of
these was a wrong assumption about Yahoo's actual markup:

- Pick numbers are **bare integers** (`37`), not `1.02`
- Team codes render **title case** (`Det`), not `DET`
- Names are **initial + surname** (`J. GIBBS`)
- The position/team/bye line lives in **its own element**, so it scans as a row
  with no player in it
- An **injury badge** (`Q`) hangs off the name and killed the match outright
- `•` separators blocked the badge from being stripped
- The `K` in `K. WALKER III` was read as the kicker position
- Manager names sit between picks and fuzzy-match real players (`jeff` →
  Justin Jefferson at 75%)
- **The manager label sits ABOVE the pick**, and a wrapper row swallows both —
  so the row reads `You 37 J. PRICE` and a pick-number pattern anchored to the
  start of the row finds nothing
- **Manager labels repeat**, so de-duplicating rows by text dropped every `You`
  after the first, and later picks inherited the previous pick's owner
- A pick log nests **six styled wrappers** below the list, so climbing 8 levels
  from a click never reached it
- The **queue** tab stays in the DOM with `display:none` right beside the pick
  log, and reading it marks players you were hoping to draft as gone

Resulting design principles: match on our own 237 names rather than Yahoo's
selectors; use pick numbers as the discriminator for finding the list; never
read rows nobody can see; a real pick log never repeats a pick number; **read
"You" as ownership** (direct evidence beats inferring from a pick counter);
stamp manual entries with the *board's* pick number, not our own count; and
read Yahoo's own rendered position colours off the page rather than guessing.

---

## 7. Open questions / what I don't know

- **How the draft actually went.** It ran Fri Sep 4 9:30pm EDT; I have no
  record of the result, the final roster, or whether the bridge held up live.
  That is the single most useful thing to feed back.
- Whether the forward planner beat greedy drafting (replication incomplete).
- Whether the Yahoo rankings are adjusted to custom scoring — a rigorous
  VOR-based test came back **inconclusive**.
- Suspension risk is deliberately *not* modelled as a durability trait; only
  open disciplinary matters are priced, in the hand-kept news list.

## 8. Useful things to do in-season

- Waivers are **continual rolling, Tuesday, with no acquisition limit** — the
  cheapest edge left, and nothing in the tool addresses it.
- The QB board is the least reliable part of the model; stream rather than
  commit if the drafted QB disappoints.
- Weeks 16–17 matchups were never modelled. Softest championship-week matchups
  on 2025 points allowed: **JAX, MIN, LV, NYG** — tiebreaker use only.
