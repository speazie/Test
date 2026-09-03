# Recompute the documented TD-luck rule for every player; needs nflverse 2025 at
# /tmp/st2025.csv (see sim/td_luck_audit.py header for the URL).
import csv, json, collections
# 2025 actuals scored under THIS league's rules, then the TD-luck correction the
# model's own documented policy would produce, for EVERY player -- the general
# form of the Stafford check.
rows=list(csv.DictReader(open('/tmp/st2025.csv')))
A=collections.defaultdict(lambda: collections.defaultdict(float))
F=['games','attempts','passing_yards','passing_tds','passing_interceptions','sacks_suffered',
   'passing_2pt_conversions','passing_40','carries','rushing_yards','rushing_tds',
   'rushing_fumbles_lost','rushing_2pt_conversions','rushing_40','receptions','receiving_yards',
   'receiving_tds','receiving_fumbles_lost','receiving_2pt_conversions','receiving_40',
   'sack_fumbles_lost','special_teams_tds']
for r in rows:
    n=r.get('player_display_name')
    for k in F:
        try: A[n][k]+=float(r.get(k) or 0)
        except: pass

def pts(d):   # league scoring
    return (d['passing_yards']/25 + d['passing_tds']*6 - d['passing_interceptions']*2
            - d['sacks_suffered'] + d['passing_40']*2 + d['passing_2pt_conversions']*2
            + (d['rushing_yards']+d['receiving_yards'])/10
            + (d['rushing_tds']+d['receiving_tds'])*6 + d['receptions']
            + (d['rushing_40']+d['receiving_40'])*2 + d['special_teams_tds']*6
            + (d['rushing_2pt_conversions']+d['receiving_2pt_conversions'])*2
            - (d['rushing_fumbles_lost']+d['receiving_fumbles_lost']+d['sack_fumbles_lost'])*2)

# League rates for TD regression, computed on meaningful volume
qb=[d for d in A.values() if d['attempts']>=200]
rec=[d for d in A.values() if d['targets' ] if False]  # placeholder
lg_pass=sum(d['passing_tds'] for d in qb)/sum(d['attempts'] for d in qb)
rb=[d for d in A.values() if d['carries']>=50]
lg_rush=sum(d['rushing_tds'] for d in rb)/sum(d['carries'] for d in rb)
wr=[d for d in A.values() if d['receptions']>=25]
lg_rec=sum(d['receiving_tds'] for d in wr)/sum(d['receptions'] for d in wr)

def expected_corr(d):
    c=0.0
    if d['attempts']>=100:
        c+=((0.17*d['passing_tds']+0.83*d['attempts']*lg_pass)-d['passing_tds'])*6
    if d['carries']>=25:
        c+=((0.13*d['rushing_tds']+0.87*d['carries']*lg_rush)-d['rushing_tds'])*6
    if d['receptions']>=15:
        c+=((0.17*d['receiving_tds']+0.83*d['receptions']*lg_rec)-d['receiving_tds'])*6
    return c

P=json.load(open('data/players.json')); td=json.load(open('data/td_luck.json'))
ALIAS={'James Cook III':'James Cook','Kenneth Walker':'Kenneth Walker III',
       'Aaron Jones Sr.':'Aaron Jones','Michael Pittman Jr.':'Michael Pittman',
       'Kyle Pitts Sr.':'Kyle Pitts','Travis Etienne Jr.':'Travis Etienne'}
print(f"league rates: pass TD/att {lg_pass:.4f}  rush TD/carry {lg_rush:.4f}  rec TD/catch {lg_rec:.4f}\n")

rowsout=[]
for p in P:
    if p['p'] in ('K','DST') or p['v']<=-90: continue
    n=p['n']; d=A.get(n) or A.get(ALIAS.get(n,''))
    if not d: continue
    exp=expected_corr(d)
    stored=td.get(n, td.get(ALIAS.get(n,''), None))
    rowsout.append((n,p['p'],p['e'],round(p['v']),pts(d),d['games'],exp,stored))

print("="*94)
print("B1. PLAYERS WITH NO STORED CORRECTION BUT A LARGE ONE IMPLIED BY 2025")
print("="*94)
print(f"{'pos':4}{'player':24}{'EV':>5}{'VOR':>5}{'2025 pts':>9}{'g':>4}{'implied corr':>14}")
miss=[r for r in rowsout if r[7] is None and abs(r[6])>=8]
for n,pos,e,v,a,g,exp,_ in sorted(miss,key=lambda x:x[6]):
    print(f"{pos:4}{n:24}{e:>5}{v:>5}{a:>9.0f}{g:>4.0f}{exp:>14.1f}")
if not miss: print("  none")

print()
print("="*94)
print("B2. STORED CORRECTION DISAGREES MATERIALLY WITH THE DOCUMENTED RULE")
print("="*94)
print(f"{'pos':4}{'player':24}{'EV':>5}{'stored':>9}{'implied':>9}{'diff':>8}")
dis=[r for r in rowsout if r[7] is not None and abs(r[6]-r[7])>=20]
for n,pos,e,v,a,g,exp,st in sorted(dis,key=lambda x:-abs(x[6]-x[7]))[:15]:
    print(f"{pos:4}{n:24}{e:>5}{st:>9.1f}{exp:>9.1f}{exp-st:>8.1f}")
print(f"  ({len(dis)} players differ by 20+ pts; reconstruction is approximate for heavy-rush players)")
