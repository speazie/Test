"""SSTLV scoring, UPDATED RULESET (Aug 28 2026).
pass yds/25 | pass TD 6 | INT -2 | SACK -1 | pick-six -3
rush yds/10 | rush TD 6 | rec 0.5 | rec yds/10 | rec TD 6
return TD 6 | fumble lost -2 | 40+ yd pass/rush/rec TD all +2
"""
def rbwr(ry,rtd,rec,recy,rectd,fum,l40r=0.0,l40rec=0.0):
    return (ry/10 + rtd*6 + rec*1.0 + recy/10 + rectd*6 - fum*2
            + l40r*2 + l40rec*2)
def te(rec,recy,rectd,fum,l40rec=0.0):
    return rec*1.0 + recy/10 + rectd*6 - fum*2 + l40rec*2
def qb(py,ptd,i,ry,rtd,fum,sacks,pick6,l40p=0.0,l40r=0.0):
    return (py/25 + ptd*6 - i*2 + ry/10 + rtd*6 - fum*2
            - sacks*1 - pick6*3 + l40p*2 + l40r*2)

# what an experienced drafter's instincts are priced to: standard half-PPR,
# 4-pt passing TD, -1 INT, no sack/pick-six penalty, no long-TD bonuses.
def mkt_qb(py,ptd,i,ry,rtd,fum,*a):
    return py/25 + ptd*4 - i*1 + ry/10 + rtd*6 - fum*2
def mkt_rbwr(ry,rtd,rec,recy,rectd,fum,*a):
    return ry/10 + rtd*6 + rec*1.0 + recy/10 + rectd*6 - fum*2
def mkt_te(rec,recy,rectd,fum,*a):
    return rec*1.0 + recy/10 + rectd*6 - fum*2
