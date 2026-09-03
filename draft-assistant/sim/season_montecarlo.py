import json, os, numpy as np
HERE=os.path.dirname(os.path.abspath(__file__))
D=json.load(open(os.path.join(HERE,'drafts.json')))
# Measured weekly coefficients of variation, 2022-24 (README section 4). These
# used to be read from a file outside the bundle, so this script could not run
# at all from a clean checkout.
CV={'QB':0.472,'RB':0.518,'WR':0.561,'TE':0.623,'K':0.45,'DST':0.75}
# Backtested MAE of the projection model, per game -> per season error
MAE={'QB':4.67,'RB':2.63,'WR':2.15,'TE':1.82,'K':1.2,'DST':2.0}
BYEW=list(range(1,16)); PO=[16,17]
def run(err_mult, label, seed=11):
    rng=np.random.default_rng(seed)
    made=titles=0
    SIMS=8
    for d in D:
        for _ in range(SIMS):
            # TRUE talent differs from my projection by the model's real error
            true={}
            for t in range(10):
                for pl in d['teams'][t]:
                    if pl['n'] in true: continue
                    e=MAE.get(pl['p'],2.5)*16*err_mult
                    true[pl['n']]=max(0.0, pl['e']+rng.normal(0,e))
            def lineup(roster,week):
                sc={}
                for pl in roster:
                    if pl['b']==week: continue
                    mu=true[pl['n']]/16.0
                    if mu<=0: continue
                    sc.setdefault(pl['p'],[]).append(max(0.0,rng.normal(mu,CV.get(pl['p'],.55)*mu)))
                for k in sc: sc[k].sort(reverse=True)
                tot=0.0; pool=[]
                for pos,n in {'QB':1,'RB':2,'WR':2,'TE':1,'K':1,'DST':1}.items():
                    got=sc.get(pos,[]); tot+=sum(got[:n]); pool+=got[n:]
                pool.sort(reverse=True)
                return tot+(pool[0] if pool else 0)
            pts=np.zeros((10,18))
            for t in range(10):
                for w in BYEW+PO: pts[t][w]=lineup(d['teams'][t],w)
            wins=np.zeros(10); tot=np.zeros(10)
            for w in BYEW:
                order=list(range(10)); rot=order[1:]; k=(w-1)%9; rot=rot[k:]+rot[:k]
                sched=[(order[0],rot[0])]+[(rot[i],rot[len(rot)-i]) for i in range(1,5)]
                for a,b in sched:
                    if pts[a][w]>pts[b][w]: wins[a]+=1
                    else: wins[b]+=1
                    tot[a]+=pts[a][w]; tot[b]+=pts[b][w]
            seed4=sorted(range(10),key=lambda t:(-wins[t],-tot[t]))[:4]
            me=d['mine']-1
            if me in seed4:
                made+=1
                s1,s2,s3,s4=seed4
                a=s1 if pts[s1][16]+pts[s1][17]>pts[s4][16]+pts[s4][17] else s4
                b=s2 if pts[s2][16]+pts[s2][17]>pts[s3][16]+pts[s3][17] else s3
                champ=a if pts[a][16]+pts[a][17]>pts[b][16]+pts[b][17] else b
                if champ==me: titles+=1
    n=len(D)*SIMS
    print(f"  {label:38s} playoffs {100*made/n:5.1f}%   title {100*titles/n:5.1f}%")
print("ROBUSTNESS: how much of the edge survives if my projections are wrong?")
print("  (baseline for a random team: 40.0% playoffs, 10.0% title)")
run(0.0,"projections perfect (the naive test)")
run(0.5,"half my backtested error")
run(1.0,"FULL backtested model error")
run(1.5,"1.5x my error (I am worse than measured)")
