import pandas as pd, numpy as np, core
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
from scipy.stats import spearmanr

p=core.panel().copy()
pl=pd.read_csv('players.csv',low_memory=False)[['gsis_id','birth_date','rookie_season','draft_round']]
p=p.merge(pl,left_on='player_id',right_on='gsis_id',how='left')
p['byear']=pd.to_datetime(p['birth_date'],errors='coerce').dt.year
p['age']=p['season']-p['byear']
p['exp']=p['season']-p['rookie_season']

# per-game rates: usage is far stickier than points, TDs regress hard
for c in ['passing_yards','passing_tds','passing_interceptions','sacks_suffered','carries',
          'rushing_yards','rushing_tds','targets','receptions','receiving_yards','receiving_tds','fp']:
    p[c+'_g']=p[c]/p['games']
p['ypt']=p['receiving_yards']/p['targets'].replace(0,np.nan)
p['ypc']=p['rushing_yards']/p['carries'].replace(0,np.nan)
p['catch']=p['receptions']/p['targets'].replace(0,np.nan)
p['tdrate_rec']=p['receiving_tds']/p['targets'].replace(0,np.nan)
p['tdrate_rush']=p['rushing_tds']/p['carries'].replace(0,np.nan)

# build year N -> year N+1 pairs
nxt=p[['player_id','season','fp_g','games']].copy()
nxt['season']=nxt['season']-1
nxt=nxt.rename(columns={'fp_g':'y_fpg','games':'y_games'})
d=p.merge(nxt,on=['player_id','season'],how='inner')
d=d[d['games']>=4]                      # need a real sample to project from

FEATS=['games','fp_g','targets_g','receptions_g','receiving_yards_g','receiving_tds_g',
       'carries_g','rushing_yards_g','rushing_tds_g','passing_yards_g','passing_tds_g',
       'passing_interceptions_g','sacks_suffered_g','ypt','ypc','catch','age','exp']

def prep(df):
    X=df[FEATS].copy()
    for c in FEATS: X[c]=X[c].fillna(X[c].median())
    return X

results={}
MODELS={}
for pos in ['QB','RB','WR','TE']:
    sub=d[d['position']==pos]
    tr=sub[sub['season']<=2023]; te=sub[sub['season']==2024]
    if len(te)<20: continue
    Xtr,Xte=prep(tr),prep(te)
    sc=StandardScaler().fit(Xtr)
    m=Ridge(alpha=8.0).fit(sc.transform(Xtr),tr['y_fpg'])
    pred=m.predict(sc.transform(Xte))
    naive=te['fp_g'].values                       # baseline: repeat last year
    mean=np.full(len(te),tr['y_fpg'].mean())      # baseline: positional mean
    act=te['y_fpg'].values
    mae=lambda a:np.mean(np.abs(a-act))
    results[pos]=dict(n=len(te),
        model_mae=mae(pred), naive_mae=mae(naive), mean_mae=mae(mean),
        model_r=spearmanr(pred,act).statistic, naive_r=spearmanr(naive,act).statistic)
    MODELS[pos]=(sc,m)

print("BACKTEST — train 2019-2023 pairs, predict 2025 points/game from 2024 season")
print(f"{'pos':4s}{'n':>5s}{'model MAE':>11s}{'naive MAE':>11s}{'mean MAE':>10s}{'model r':>9s}{'naive r':>9s}")
for pos,r in results.items():
    print(f"{pos:4s}{r['n']:5d}{r['model_mae']:11.2f}{r['naive_mae']:11.2f}{r['mean_mae']:10.2f}{r['model_r']:9.3f}{r['naive_r']:9.3f}")

# ---------- project 2026 from 2025 ----------
cur=p[p['season']==2025].copy()
cur=cur[cur['games']>=3]
out=[]
for pos,(sc,m) in MODELS.items():
    sub=cur[cur['position']==pos]
    if not len(sub): continue
    X=prep(sub)
    fpg=m.predict(sc.transform(X))
    t=sub[['player_display_name','position','recent_team','games','fp_g','age']].copy()
    t['proj_fpg']=fpg
    out.append(t)
P26=pd.concat(out,ignore_index=True)
P26['proj_fpg']=P26['proj_fpg'].clip(lower=0)
P26.to_csv('proj2026_raw.csv',index=False)
print("\nprojected players:",len(P26))
print("\nTop 15 projected points/game for 2026 (pre-context adjustment):")
print(P26.nlargest(15,'proj_fpg')[['player_display_name','position','recent_team','fp_g','proj_fpg']]
      .round(2).to_string(index=False))
