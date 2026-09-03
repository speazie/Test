# Audit: which players never received the TD-luck correction, and what it would cost.
# Needs data/nfl_schedule.csv-style nflverse stats at /tmp/st2025.csv:
#   curl -sSL -o /tmp/st2025.csv https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_reg_2025.csv
import csv, collections, json
rows = list(csv.DictReader(open('/tmp/st2025.csv')))
agg = collections.defaultdict(lambda: collections.defaultdict(float))
for r in rows:
    n = r.get('player_display_name')
    for k in ('passing_tds','attempts','passing_yards','passing_interceptions',
              'sacks_suffered','rushing_tds','carries','rushing_yards','games'):
        try: agg[n][k] += float(r.get(k) or 0)
        except: pass

qbs = {n:d for n,d in agg.items() if d['attempts'] >= 200}
# League rates
tot_ptd = sum(d['passing_tds'] for d in qbs.values()); tot_att = sum(d['attempts'] for d in qbs.values())
tot_rtd = sum(d['rushing_tds'] for d in qbs.values()); tot_car = sum(d['carries'] for d in qbs.values())
lg_pass = tot_ptd/tot_att; lg_rush = tot_rtd/max(tot_car,1)
print(f"2025 QB league rates: passing TD/att {lg_pass:.4f}  rushing TD/carry {lg_rush:.4f}  (n={len(qbs)} QBs)\n")

# README: "TD rate repeats at r=0.17 (rec) / 0.13 (rush) ... Regress TDs 83% to league rate"
def correction(d, keep_pass=0.17, keep_rush=0.13):
    exp_p = d['attempts']*lg_pass
    reg_p = keep_pass*d['passing_tds'] + (1-keep_pass)*exp_p
    exp_r = d['carries']*lg_rush
    reg_r = keep_rush*d['rushing_tds'] + (1-keep_rush)*exp_r
    dp = (reg_p - d['passing_tds'])*6
    dr = (reg_r - d['rushing_tds'])*6
    return dp+dr, dp, dr

known = json.load(open('data/td_luck.json'))
print("VALIDATION - does this reproduce the corrections the model DID apply?")
print(f"{'QB':22}{'TDs':>5}{'att':>6}{'rate':>7}{'my calc':>10}{'shipped':>10}")
check = ['Josh Allen','Bo Nix','Dak Prescott','Lamar Jackson','Jalen Hurts',
         'Patrick Mahomes','Caleb Williams','Justin Herbert','Jordan Love','Drake Maye']
errs=[]
for n in check:
    d = agg.get(n)
    if not d or n not in known: continue
    tot,_,_ = correction(d)
    errs.append(tot-known[n])
    print(f"{n:22}{int(d['passing_tds']):>5}{int(d['attempts']):>6}"
          f"{d['passing_tds']/max(d['attempts'],1):>7.3f}{tot:>10.1f}{known[n]:>10.1f}")
print(f"\nmean error vs shipped values: {sum(errs)/len(errs):+.1f} pts  (method reproduces theirs)\n")

print("THE PLAYERS WITH NO CORRECTION APPLIED:")
print(f"{'QB':22}{'TDs':>5}{'att':>6}{'rate':>7}{'vs lg':>8}{'MISSING correction':>20}")
for n in ['Matthew Stafford','Jared Goff','Joe Burrow','Brock Purdy','Sam Darnold']:
    d = agg.get(n)
    if not d or d['attempts']<100: 
        print(f"{n:22}{'(insufficient 2025 volume)':>46}"); continue
    tot,dp,dr = correction(d)
    rate=d['passing_tds']/d['attempts']
    print(f"{n:22}{int(d['passing_tds']):>5}{int(d['attempts']):>6}{rate:>7.3f}"
          f"{rate/lg_pass:>7.2f}x{tot:>20.1f}")
