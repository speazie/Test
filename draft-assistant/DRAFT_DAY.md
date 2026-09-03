# Draft day runbook

Everything you need to do, in order. Ten minutes of setup now; nothing to
remember on the night.

## Confirmed from the league settings page (league 1388434)

| | |
|---|---|
| Draft type | **Live Standard Draft** (snake) — there *is* a live draft room |
| Draft time | **Fri Sep 4, 9:30pm EDT** |
| Pick clock | **1 minute** |
| Teams | 10, head-to-head, your slot **6** |
| Roster | QB, WR, WR, RB, RB, TE, W/R/T, K, DEF + 6 BN + 2 IR |
| Playoffs | 4 teams, weeks 16–17, reseeded |
| Waivers | Continual rolling, Tuesday, **no acquisition limit** |

Scoring was checked line by line against the model: 6-pt passing TD (Yahoo
default is 4), full PPR, −2 INT, **−1 per sack**, **−3 pick-six**, +2 for each
40+ yard TD, −2 fumble lost. **Every one matches what the projections assume.**
The edge is real and it is not a modelling artefact.

A minute per pick is far more slack than "picks move in seconds" implied. Even
with the bridge switched off entirely, tap entry finishes a pick in about a
second. You are not going to be rushed.

---

## The one thing to do before draft day

**Dry-run the bridge in a Yahoo mock draft.** Yahoo runs mock drafts 24/7 at
`football.fantasysports.yahoo.com/f1/mock_lobby`. Join one, run the setup below
against it, and watch picks land in the panel by themselves.

This is not optional politeness — it is the only way to find out whether the
reader binds correctly to *your* Yahoo layout. I could not open a live Yahoo
draft room while building this, so the reader was written to avoid depending on
Yahoo's markup (see "What is and is not verified"), and tested against a fixture
that reproduces the *shape* of a draft room rather than Yahoo's actual HTML.
Ten minutes in a mock draft converts that from an assumption into a fact.

---

## Setup — do this tonight, not at 9:25pm tomorrow

**1. Install Tampermonkey.** Chrome/Edge/Firefox from the extension store;
Safari from the App Store. Free.

**2. Install the userscript.** Tampermonkey → *Dashboard* → *Utilities* tab →
*Import from file* → choose `yahoo-draft-bridge.user.js` → *Install*. It should
then be listed as enabled. (Dragging the file onto the dashboard also works.)

**3. Confirm it loads.** Open any page on `football.fantasysports.yahoo.com`. A
yellow **SSTLV** button must appear in the top-right corner. If it does not,
nothing else in this document will work — check that Tampermonkey is enabled
for the site and that the script shows a green/enabled toggle.

**4. Save the fallback.** Put `live-draft-assistant.html` somewhere you can find
it in one click — Desktop is fine — and open it once to confirm it loads. It
needs no network at all. Bookmark the tab.

**5. Dry-run in a mock draft** (the step people skip; do not skip it). Go to
`football.fantasysports.yahoo.com/f1/mock_lobby`, join any 10-team mock, and run
the five steps under *On the night* against it. You are checking one thing:
**do picks appear in the panel by themselves?** If they do, you are done and the
real draft needs no thought. If they do not, you have found it a day early
instead of at pick 3, and the tap/type path still works — see *Troubleshooting*.

**6. Set your slot to 6 before the draft starts** and leave the tab open. The
board persists across a reload, so nothing is lost if the page refreshes.

## On the night

1. Open the Yahoo draft room. A yellow **SSTLV** tab appears top-right; the
   panel opens beside the board. Click the tab to collapse it.
2. **Set your draft slot** (the row of numbers 1–10). Pick **6**. Nothing
   detects which picks are yours until you do this.
3. Click **BIND THE PICK LIST**, then click anywhere on the part of the page
   that lists picks already made. A yellow outline shows what will be bound —
   it outlines the whole list, not the single word under your cursor.
4. If picks have already been made, the panel offers **IMPORT n**. Tap it. If
   the draft has not started, tap **ARM**.
5. That is it. Picks now land by themselves.

## Read this before you trust the QB plan

**The "6-point passing TD exploit" is not real.** The league does pay 6 per
passing TD instead of 4 — but it also pays **−1 per sack** and **−2 per
interception** (defaults: 0 and −1). Those cancel. A QB throwing ~30 TDs gains
~60 and gives back ~50. Net, this league's rules move quarterback value by about
**−5 VOR** and everything else by ~0. Stafford is the model's QB1 under standard
scoring too — worth *more* there (69 VOR) than here (64).

So the Stafford pick at 55 is a **bet on our projection of him**, not an
arbitrage. We say 346 points; Yahoo has him 113th overall, below Brock Purdy.
That is a real disagreement and it may well be right — the model beats naive
forecasting at every position in backtest — but it is a forecasting bet, and
his projection is one of the model-only ones with no consensus check.

Take him if you believe the projection. Don't take him because of the rules.

Measured sensitivity, now correctly labelled as *projection* disagreement rather
than scoring:

| If the field's player opinions converge on ours... | Your title odds |
|---|---|
| not at all (they draft the Yahoo board) | 39.5% |
| a quarter of the way | 29.0% |
| **halfway** | **16.6%** |
| fully | 4.2% |

A random team is 10%. The whole edge is disagreement, and disagreement only pays
if we are right.

**Watch when quarterbacks start going.** If they go earlier than their board
rank, the engine measures position pace and pulls players forward on its own.

## One judgement call the tool cannot make for you

**At pick 35 the tool will recommend Jadarian Price, every time.** He is a
rookie, and rookie projections are not player-specific — they are the *mean
year-1 output of running backs drafted near pick 32*. That bin mean rates him
our #16 overall while the field has him #62.

The alternative the model picks if rookies are discounted at all is **Bucky
Irving** (VOR 50 vs Price's 59 — nine points), whose projection comes from the
real ridge model and whom the market agrees with at ADP 45.

Measured tradeoff: trusting the bins has the best ceiling (40.7% title) and the
worst floor (33.2%). Discounting rookies flattens it to ~37–41% whatever
happens. That is roughly 1.5–2 SE — suggestive, not proven.

**Take Price if you have a real opinion about him. Take Irving if you do not.**
This is the single largest unvalidated bet in the model, and it is one pick.

Everything else in the plan is unaffected by this choice.

## While drafting

| What you see | What it means |
|---|---|
| Green dot, "Reading the Yahoo board" | Working. Do nothing. |
| Red dot, "Bridge went quiet" | No board read in 25s. Use tap entry below. |
| Orange **Board disagrees with the tool** | Pick counter is out of step — fix it now, turn detection is wrong until you do. |
| A row in **NEEDS ONE TAP** | The reader is not sure. One tap: GONE / MINE / NOT HIM. |
| ⚠ next to a feed row | Matched, but Yahoo lists a different team than our data. Usually a player who changed teams; harmless. |

**If the bridge stops working, you lose nothing.** The tool underneath is fully
usable by hand and the two entry paths cost about a second each:

- **Tap** any player in *Going next* — the 20 most likely to go next, by the
  opponents' board. Most picks come from this list.
- **Type** three or four letters in the box: `stfd` → Stafford, `jsn` → Jaxon
  Smith-Njigba, `ja ch` → Ja'Marr Chase. **Enter** = someone else took him,
  **Shift+Enter** = you took him. Punctuation, accents and Jr./Sr./III never
  need typing.

**Undo** is on every row of the pick feed, and the footer UNDO reverses the last
action.

## Troubleshooting

| Symptom | Fix |
|---|---|
| No yellow SSTLV button | Tampermonkey disabled, or the script is off. Check the dashboard toggle. Reload the page. |
| Panel appears, but BIND finds nothing | You clicked a heading or empty space. Click directly on a row that has a player's name in it. |
| It bound the wrong list (marks everyone gone) | **PAUSE**, then **REBIND REGION** onto the pick log. Undo the bad rows in the feed, or **RESET** and re-import. |
| Picks stop arriving | Red dot appears after 25s. Hit **RESCAN**. If still dead, just use tap entry — you lose nothing but the automation. |
| Panel covers the draft board | Click the yellow SSTLV tab to collapse it. |
| Someone is watching your screen | **HIDE** blanks the reasoning. |

If everything fails, the standalone HTML in your other tab is a complete,
working draft assistant. Tap the player in *Going next*, or type three letters.
At one minute a pick you have ample time.

## If the counter goes wrong

The pick counter is just `gone + mine + 1`, so it self-corrects the moment the
board is right. If the orange desync banner appears:

- **TRUST THE BOARD** inserts placeholder picks so the count matches Yahoo
  again. It does not guess *who* went — a right pick number with unknown names
  beats a wrong pick number, because turn detection depends only on the count.
- Then keep drafting. Placeholders are inert: they never appear as
  recommendations and never affect pace or scarcity.

## Keeping it off other people's screens

The **HIDE** button blanks the model's reasoning while leaving the
recommendations readable. The edge here is that the league is pricing
quarterbacks off a 4-point-passing-TD sheet; the reasoning text says so out
loud. If anyone can see your screen, or you are sharing it, hit HIDE.

---

## What is and is not verified

Being straight about this, because the failure mode that costs you the draft is
trusting something I could not test.

**Verified, in a real browser (`./verify.sh`):**
- Fuzzy entry, tap entry, per-row undo, the pick counter, and persistence
  across a page reload.
- The bridge mounting, binding, importing, and auto-committing new picks.
- It reads abbreviated (`M. Stafford`), punctuated (`A.J. Brown`,
  `Amon-Ra St. Brown`) and suffixed (`Brian Thomas Jr.`) names off a board.
- It refuses to consume an available-players list sitting next to the pick log,
  and pauses rather than committing a burst.
- Your own pick (1.06 from slot 6) lands on your roster, not the board.

**Not verified — this is the honest gap:**
- **Yahoo's actual draft-room HTML.** Never seen it. The reader was built not to
  care: it matches on our own 237 names and uses pick numbers to find the log.
  That should hold across layouts, but "should" is doing real work in that
  sentence. **The mock-draft dry run is what closes this gap.** Do it.
- **Yahoo's official API is not used.** It now requires manual approval from
  Yahoo before an app can read fantasy data, which is not a plan for a draft
  that is imminent. If you already hold approved API credentials, say so — an
  API read of `league/{key}/draftresults` would be strictly more reliable than
  DOM reading and is worth building.
- **Team fields may be stale.** Our pool has A.J. Brown on NE, for instance. Any
  player who has since changed teams will show a ⚠ in the feed. The match is
  still committed, because an exact unique name is decisive; only the team note
  is stale.

**Resolved:** the bundle's prompt and README both called this an *Offline
Draft*. The league settings page says **Live Standard Draft, Fri Sep 4 9:30pm
EDT**. The settings page wins — it is the system of record. The bridge is
therefore the right build, and the screenshot/OCR path described in the old
prompt is not needed and was not built.
