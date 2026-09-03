"""Weeks 16-17 matchup reference for the fantasy championship.

DELIBERATELY NOT WIRED INTO THE DRAFT ENGINE. The season simulator models each
week as an i.i.d. draw from a player's own distribution with no opponent, so it
cannot measure a strength-of-schedule term at all -- such a change would score
as exactly zero effect by construction. Shipping an unmeasurable model change is
the exact pattern that produced the eight bugs in README section 6.

So this prints a table for a human to use as a TIEBREAKER between otherwise
equal late-round players, and nothing more.

Proxy for defensive quality: 2025 regular-season points allowed per game. That
is a weak proxy -- it ignores personnel turnover, and one season of team defence
is noisy -- which is another reason this stays advisory.

    python3 model/playoff_schedule.py
"""
import csv, os, collections

HERE = os.path.dirname(os.path.abspath(__file__))
CSV = os.path.join(HERE, '..', 'data', 'nfl_schedule.csv')

rows = list(csv.DictReader(open(CSV)))

# 2025 points allowed per game, per team.
allowed = collections.defaultdict(list)
for r in rows:
    if r.get('season') != '2025' or r.get('game_type') != 'REG':
        continue
    if not r.get('home_score'):
        continue
    allowed[r['home_team']].append(float(r['away_score']))
    allowed[r['away_team']].append(float(r['home_score']))
papg = {t: sum(v) / len(v) for t, v in allowed.items() if v}
rank = {t: i + 1 for i, (t, _) in enumerate(sorted(papg.items(), key=lambda kv: kv[1]))}
# rank 1 = stingiest defence (hardest matchup), 32 = softest (best to face)

# 2026 weeks 16-17 opponents.
opp = collections.defaultdict(dict)
for r in rows:
    if r.get('season') != '2026' or r.get('week') not in ('16', '17'):
        continue
    w = int(r['week'])
    opp[r['home_team']][w] = (r['away_team'], 'vs')
    opp[r['away_team']][w] = (r['home_team'], '@')

out = []
for team in sorted(opp):
    games = opp[team]
    if 16 not in games or 17 not in games:
        continue
    o16, h16 = games[16]
    o17, h17 = games[17]
    # Higher score = softer championship-week schedule.
    soft = (rank.get(o16, 16) + rank.get(o17, 16)) / 2
    out.append((soft, team, h16, o16, rank.get(o16, '?'), h17, o17, rank.get(o17, '?')))

out.sort(reverse=True)
print("Fantasy championship weeks (NFL 16 & 17) — 2026 schedule")
print("Opponent rank by 2025 points allowed: 1 = stingiest, 32 = softest\n")
print(f"{'TEAM':5} {'WK16':>12} {'rk':>4} {'WK17':>12} {'rk':>4}   softness")
print('-' * 52)
for soft, team, h16, o16, r16, h17, o17, r17 in out:
    print(f"{team:5} {h16+' '+o16:>12} {r16:>4} {h17+' '+o17:>12} {r17:>4}   {soft:>6.1f}")
print("\nTop of this list = easiest championship-week matchups on 2025 defence.")
print("Use only to break a tie between players you already rate equally.")
