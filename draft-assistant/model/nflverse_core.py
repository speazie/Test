import pandas as pd, numpy as np

def load(y):
    d=pd.read_csv(f's{y}.csv')
    d['season']=y
    return d

def sstlv(d):
    """Exact SSTLV scoring, 2026 ruleset."""
    g=lambda c: d[c].fillna(0) if c in d else 0
    pts=( g('passing_yards')/25 + g('passing_tds')*6 - g('passing_interceptions')*2
        - g('sacks_suffered')*1
        + g('rushing_yards')/10 + g('rushing_tds')*6
        + g('receptions')*1.0 + g('receiving_yards')/10 + g('receiving_tds')*6
        - (g('rushing_fumbles_lost')+g('receiving_fumbles_lost')+g('sack_fumbles_lost'))*2
        + g('passing_2pt_conversions')*2 + g('rushing_2pt_conversions')*2
        + g('receiving_2pt_conversions')*2 )
    return pts

KEEP=['player_id','player_display_name','position','recent_team','season','games',
      'passing_yards','passing_tds','passing_interceptions','sacks_suffered','passing_40',
      'carries','rushing_yards','rushing_tds','rushing_40',
      'targets','receptions','receiving_yards','receiving_tds']

def panel():
    fr=[]
    for y in range(2019,2026):
        d=load(y)
        for c in KEEP:
            if c not in d: d[c]=0
        d['fp']=sstlv(d)
        fr.append(d[KEEP+['fp']])
    p=pd.concat(fr,ignore_index=True)
    p=p[p['position'].isin(['QB','RB','WR','TE'])]
    p=p[p['games']>0]
    return p
