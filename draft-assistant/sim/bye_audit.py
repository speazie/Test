# Verify every bye week against the real 2026 schedule in data/nfl_schedule.csv.
import csv, json, collections
rows=[r for r in csv.DictReader(open('data/nfl_schedule.csv')) if r['season']=='2026' and r['game_type']=='REG']
weeks=sorted({int(r['week']) for r in rows})
playing=collections.defaultdict(set)
for r in rows:
    playing[r['home_team']].add(int(r['week'])); playing[r['away_team']].add(int(r['week']))
byes={}
for t,w in playing.items():
    miss=[x for x in weeks if x not in w]
    byes[t]=miss[0] if len(miss)==1 else miss
print("2026 regular season weeks:",weeks[0],"-",weeks[-1],"| teams:",len(byes))
odd={t:b for t,b in byes.items() if not isinstance(b,int)}
print("teams without exactly one bye:",odd if odd else "none")
P=json.load(open('data/players.json'))
ALIAS={'LAR':'LA'}   # nflverse abbreviation differences
bad=[];unknown=set()
for p in P:
    t=p['t']
    if t=='--': continue
    key=t if t in byes else ALIAS.get(t)
    if key not in byes: unknown.add(t); continue
    if p['b']!=byes[key]: bad.append((p['n'],p['p'],t,p['b'],byes[key]))
print("unknown team codes in players.json:",sorted(unknown) if unknown else "none")
print("\nBYE WEEK MISMATCHES:",len(bad),"of",len([p for p in P if p['t']!='--']))
for n,pos,t,ours,real in sorted(bad,key=lambda x:x[2])[:40]:
    print(f"  {pos:3} {n:24} {t:4} ours {ours:>3}  actual {real:>3}")
