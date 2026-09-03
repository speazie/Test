# Structural + coverage + join audit of players.json. Run from the project root.
import json, collections, difflib, re
P=json.load(open('data/players.json'))
issues=collections.defaultdict(list)

print("="*70); print("A1. STRUCTURAL INTEGRITY"); print("="*70)
names=[p['n'] for p in P]
dups=[n for n,c in collections.Counter(names).items() if c>1]
print("duplicate names:", dups if dups else "none")
bad=[p['n'] for p in P if not isinstance(p.get('e'),(int,float)) or not isinstance(p.get('v'),(int,float))]
print("non-numeric e/v:", bad if bad else "none")
neg=[p['n'] for p in P if p['e']<0]
print("negative EV:", neg if neg else "none")
byerange=[(p['n'],p['b']) for p in P if p['t']!='--' and not (1<=p['b']<=18)]
print("bye out of range:", byerange if byerange else "none")
av=[(p['n'],p['av']) for p in P if not (0<p['av']<=1)]
print("availability out of (0,1]:", av if av else "none")
pos=collections.Counter(p['p'] for p in P); print("positions:",dict(pos))

print(); print("="*70); print("A2. IS v ACTUALLY e MINUS REPLACEMENT?"); print("="*70)
REPL={'QB':10,'RB':24,'WR':28,'TE':10,'K':10,'DST':10}
live=[p for p in P if p['v']>-90]
worst=[]
for posn,rank in REPL.items():
    g=sorted([p for p in live if p['p']==posn], key=lambda x:-x['e'])
    if len(g)<rank: print(f"  {posn}: only {len(g)} players, replacement rank {rank} unreachable"); continue
    repl=g[rank-1]['e']
    mult=0.2 if posn in ('K','DST') else 1.0
    errs=[(p['n'],p['v'],(p['e']-repl)*mult) for p in g]
    off=[(n,a,b) for n,a,b in errs if abs(a-b)>1.5]
    print(f"  {posn:4} repl(e)={repl:>4}  mismatches>1.5pt: {len(off):>3}/{len(g)}")
    worst+= [(abs(a-b),n,posn,a,b) for n,a,b in off]
worst.sort(reverse=True)
if worst:
    print("  worst VOR inconsistencies:")
    for d,n,posn,a,b in worst[:10]:
        print(f"    {posn:3} {n:24} stored v={a:>7.1f}  recomputed={b:>7.1f}  diff {d:>6.1f}")

print(); print("="*70); print("A3. CORRECTION-LAYER COVERAGE"); print("="*70)
td=json.load(open('data/td_luck.json'))
circ=json.load(open('data/circumstance.json'))
skill=[p for p in P if p['p'] not in ('K','DST') and p['v']>-90]
for label,src in [('td_luck',td),('circumstance',circ)]:
    miss=[p for p in skill if p['n'] not in src]
    print(f"  {label:14} covers {len(skill)-len(miss):>3}/{len(skill)} skill players; MISSING {len(miss)}")
    veterans=[p for p in miss if not p.get('r') and p.get('method') not in ('rookie-empirical','rookie-capital')]
    if veterans:
        print(f"     of which non-rookies ({len(veterans)}), by EV:")
        for p in sorted(veterans,key=lambda x:-x['e'])[:12]:
            print(f"       {p['p']:3} {p['n']:24} EV {p['e']:>4}  VOR {round(p['v']):>4}  method {p.get('method')}")

print(); print("="*70); print("A4. NAME-JOIN FAILURES (near-miss keys)"); print("="*70)
pnames=set(names)
for label,src in [('td_luck',td),('circumstance',circ)]:
    orphan=[k for k in src if k not in pnames]
    near=[]
    for k in orphan:
        m=difflib.get_close_matches(k,pnames,n=1,cutoff=0.82)
        if m: near.append((k,m[0]))
    print(f"  {label}: {len(orphan)} keys not in players.json; {len(near)} are near-misses:")
    for k,m in near[:15]:
        val=src[k]
        print(f"     '{k}' ~ '{m}'   value={val if not isinstance(val,dict) else list(val.items())[:2]}")
