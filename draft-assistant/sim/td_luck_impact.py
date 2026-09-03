import csv, collections, json
rows = list(csv.DictReader(open('/tmp/st2025.csv')))
agg = collections.defaultdict(lambda: collections.defaultdict(float))
for r in rows:
    n = r.get('player_display_name')
    for k in ('passing_tds','attempts','rushing_tds','carries'):
        try: agg[n][k] += float(r.get(k) or 0)
        except: pass
qbs = {n:d for n,d in agg.items() if d['attempts']>=200}
lg_pass = sum(d['passing_tds'] for d in qbs.values())/sum(d['attempts'] for d in qbs.values())
lg_rush = sum(d['rushing_tds'] for d in qbs.values())/max(sum(d['carries'] for d in qbs.values()),1)
def corr(d):
    p = (0.17*d['passing_tds'] + 0.83*d['attempts']*lg_pass) - d['passing_tds']
    r = (0.13*d['rushing_tds'] + 0.87*d['carries']*lg_rush) - d['rushing_tds']
    return (p+r)*6

P = json.load(open('data/players.json'))
td = json.load(open('data/td_luck.json'))
BY = {p['n']:p for p in P}

# 1. QBs with no correction at all
print("A. TD-luck correction never applied (no entry in td_luck.json)\n")
print(f"{'player':22}{'EV now':>8}{'est. corr':>11}{'EV after':>10}{'VOR now':>9}{'VOR after':>11}")
replQB = sorted([p['e'] for p in P if p['p']=='QB' and p['v']>-90], reverse=True)[9]
for n in ['Matthew Stafford','Jared Goff','Brock Purdy','Joe Burrow']:
    p = BY.get(n); d = agg.get(n)
    if not p or not d or d['attempts']<150: continue
    c = corr(d); after = p['e']+c
    print(f"{n:22}{p['e']:>8}{c:>11.0f}{after:>10.0f}{round(p['v']):>9}{after-replQB:>11.0f}")

# 2. Name-join failures: correction exists but was not matched
print("\nB. Correction EXISTS but the name did not join\n")
print(f"{'players.json':24}{'td_luck.json':24}{'correction':>11}{'EV now':>8}{'EV after':>10}")
for pj, tdk in [('James Cook III','James Cook'), ('Kenneth Walker','Kenneth Walker III')]:
    p = BY.get(pj)
    if p and tdk in td:
        print(f"{pj:24}{tdk:24}{td[tdk]:>11.1f}{p['e']:>8}{p['e']+td[tdk]:>10.0f}")

# 3. Where would Stafford actually rank?
st = BY['Matthew Stafford']; c = corr(agg['Matthew Stafford'])
after = st['e']+c
order = sorted([p for p in P if p['p']=='QB' and p['v']>-90], key=lambda x:-x['e'])
newrank = sum(1 for p in order if (p['e'] if p['n']!='Matthew Stafford' else after) > after)+1
print(f"\nC. Stafford's QB rank: now #1 (EV {st['e']}) -> #{newrank} (EV {after:.0f}) after correction")
print(f"   QB10 replacement level is {replQB}. Yahoo has him 113th overall, ESPN 86th.")
