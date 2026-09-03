// Optimise the draft weights against SIMULATED CHAMPIONSHIP RATE.
// Every candidate config drafts full 10-team leagues from slot 6, then plays
// 15-week seasons + a 2-week playoff with real weekly variance AND the model's
// own backtested projection error applied to "true" talent.
const {freshFrom, engineSource}=require('./harness');  // gated on build freshness
const js=engineSource();
const CV={QB:0.472,RB:0.518,WR:0.561,TE:0.623,K:0.45,DST:0.75};
const MAE={QB:4.67,RB:2.63,WR:2.15,TE:1.82,K:1.2,DST:2.0};
const TEAMS=10,ROUNDS=15;
let SEED=1; function rnd(){SEED=(SEED*1103515245+12345)&0x7fffffff;return SEED/0x7fffffff;}
function gauss(){let u=0,v=0;while(!u)u=rnd();while(!v)v=rnd();
  return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
function build(cfg){
  return freshFrom(js,cfg,
    'PLAYERS,recommend,markGone,takeIt,myPicks,setSlot:v=>{slot=v},getMine:()=>mine,getGone:()=>gone');
}
const OMAX={QB:2,RB:6,WR:7,TE:2,K:1,DST:1}, OREQ={QB:1,RB:2,WR:2,TE:1,K:1,DST:1};
function draft(cfg,slot){
  const A=build(cfg); A.setSlot(slot);
  const mySet=new Set(A.myPicks()); const rost={},cnt={};
  for(let t=1;t<=TEAMS;t++){rost[t]=[];cnt[t]={};}
  for(let pick=1;pick<=TEAMS*ROUNDS;pick++){
    const rd=Math.ceil(pick/TEAMS);
    const col= rd%2 ? ((pick-1)%TEAMS)+1 : TEAMS-((pick-1)%TEAMS);
    if(col===slot){ const r=A.recommend(); if(!r.length)continue;
      A.takeIt(r[0].p.n); rost[col].push(r[0].p); continue; }
    const have=cnt[col], left=ROUNDS-rost[col].length;
    let short=0; for(const k in OREQ) short+=Math.max(0,OREQ[k]-(have[k]||0));
    const g=A.getGone(), mine=new Set(A.getMine());
    let best=null,bk=-1e9;
    for(const p of A.PLAYERS){
      if(p.v<=-90||g.has(p.n)||mine.has(p.n))continue;
      if((have[p.p]||0)>=OMAX[p.p])continue;
      const fills=(have[p.p]||0)<OREQ[p.p]; let nb;
      if(left<=short){ if(!fills)continue; nb=900; }
      else if(p.p==='K') nb=rd>=14?800:null;
      else if(p.p==='DST') nb=rd>=13?800:null;
      else if(p.p==='QB'&&(have.QB||0)>=1) nb=left<=2?-40:null;
      else nb=fills?40:0;
      if(nb===null)continue;
      const b=p.espn||p.a;
      const key=-b*1.6+nb*0.35-Math.max(0,b-pick)*0.25+gauss()*Math.max(3,b*0.06);
      if(key>bk){bk=key;best=p;}
    }
    if(!best)continue;
    A.markGone(best.n); rost[col].push(best); have[best.p]=(have[best.p]||0)+1;
  }
  const out=[]; for(let t=1;t<=TEAMS;t++) out.push(rost[t].map(p=>({n:p.n,p:p.p,e:p.e,b:p.b})));
  return out;
}
function season(teams,me,sims){
  let titles=0,made=0;
  for(let s=0;s<sims;s++){
    const truth={};
    for(const T of teams) for(const pl of T){ if(truth[pl.n]==null)
      truth[pl.n]=Math.max(0,pl.e+gauss()*MAE[pl.p]*16); }
    const pts=[];
    for(let t=0;t<10;t++){ pts.push(new Array(18).fill(0));
      for(let w=1;w<=17;w++){
        const sc={};
        for(const pl of teams[t]){ if(pl.b===w)continue;
          const mu=truth[pl.n]/16; if(mu<=0)continue;
          (sc[pl.p]=sc[pl.p]||[]).push(Math.max(0,mu+gauss()*CV[pl.p]*mu)); }
        for(const k in sc) sc[k].sort((a,b)=>b-a);
        let tot=0,pool=[];
        const need={QB:1,RB:2,WR:2,TE:1,K:1,DST:1};
        for(const pos in need){ const got=sc[pos]||[];
          for(let i=0;i<need[pos];i++) tot+=got[i]||0;
          pool=pool.concat(got.slice(need[pos])); }
        pool.sort((a,b)=>b-a); tot+=pool[0]||0;
        pts[t][w]=tot;
      } }
    const wins=new Array(10).fill(0), tp=new Array(10).fill(0);
    for(let w=1;w<=15;w++){
      const order=[...Array(10).keys()]; let rot=order.slice(1);
      const k=(w-1)%9; rot=rot.slice(k).concat(rot.slice(0,k));
      const sched=[[order[0],rot[0]]];
      for(let i=1;i<5;i++) sched.push([rot[i],rot[rot.length-i]]);
      for(const [a,b] of sched){ if(pts[a][w]>pts[b][w])wins[a]++;else wins[b]++;
        tp[a]+=pts[a][w];tp[b]+=pts[b][w]; }
    }
    const seed=[...Array(10).keys()].sort((x,y)=>wins[y]-wins[x]||tp[y]-tp[x]).slice(0,4);
    if(seed.includes(me)){ made++;
      const po=t=>pts[t][16]+pts[t][17];
      const a=po(seed[0])>po(seed[3])?seed[0]:seed[3];
      const b=po(seed[1])>po(seed[2])?seed[1]:seed[2];
      if((po(a)>po(b)?a:b)===me) titles++; }
  }
  return {titles,made,n:sims};
}
function evaluate(cfg,nDrafts,nSeasons,seed){
  SEED=seed; let T=0,M=0,N=0;
  for(let d=0;d<nDrafts;d++){
    const teams=draft(cfg,6);
    const r=season(teams,5,nSeasons);
    T+=r.titles;M+=r.made;N+=r.n;
  }
  return {title:T/N, playoff:M/N};
}
module.exports={evaluate};
if(require.main===module){
  const base={bye2:14,bye3:26,bye4:70,byeAll:5,byeNoCover:7,byeCover:9,
    reachFree:8,reachRate:1.7,cuffMult:0.45,cuffTop:70,cuff:40,conc:10,stack:7,
    dropMin:10,dropMult:0.55,dropCap:30,runCap:22,runRate:45,coldPen:8,
    scarMin:6,scarMax:48,benchWR:12,benchRB:6,rb5pen:14};
  const r=evaluate(base,30,6,12345);
  console.log('BASELINE (my hand-picked weights)');
  console.log('  title '+(100*r.title).toFixed(1)+'%   playoffs '+(100*r.playoff).toFixed(1)+'%');
}
