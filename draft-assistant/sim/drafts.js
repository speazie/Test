// Run full 10-team drafts: my slot uses the tool's recommend(); the other nine
// draft from the ESPN board with roster needs. Records every team's roster.
const fs=require('fs');
const path=require('path');
const {fresh, ROOT}=require('./harness');   // gated: never runs on a stale build
const TEAMS=10,ROUNDS=15;
const OMAX={QB:2,RB:6,WR:7,TE:2,K:1,DST:1}, OREQ={QB:1,RB:2,WR:2,TE:1,K:1,DST:1};
function gauss(){let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();
 return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
function runDraft(mySlot){
  // SSTLV_PLAN=0 drafts greedily, =1 (default) plans the route ahead.
  const A=fresh(undefined,undefined,process.env.SSTLV_PLAN!=='0');A.setSlot(mySlot);
  const mySet=new Set(A.myPicks());
  const rost={}; for(let t=1;t<=TEAMS;t++) rost[t]=[];
  const cnt={}; for(let t=1;t<=TEAMS;t++) cnt[t]={};
  for(let pick=1;pick<=TEAMS*ROUNDS;pick++){
    const rnd=Math.ceil(pick/TEAMS);
    const col= rnd%2 ? ((pick-1)%TEAMS)+1 : TEAMS-((pick-1)%TEAMS);
    if(col===mySlot){
      const r=A.recommend(); if(!r.length) continue;
      A.takeIt(r[0].p.n); rost[col].push(r[0].p); continue;
    }
    const have=cnt[col], left=ROUNDS-rost[col].length;
    let short=0; for(const k in OREQ) short+=Math.max(0,OREQ[k]-(have[k]||0));
    const g=A.getGone(), mine=new Set(A.getMine());
    let best=null,bk=-1e9;
    for(const p of A.PLAYERS){
      if(p.v<=-90||g.has(p.n)||mine.has(p.n)||rost[col].includes(p)) continue;
      if((have[p.p]||0)>=OMAX[p.p]) continue;
      const fills=(have[p.p]||0)<OREQ[p.p];
      let nb;
      if(left<=short) { if(!fills) continue; nb=900; }
      else if(p.p==='K') nb = rnd>=14?800:null;
      else if(p.p==='DST') nb = rnd>=13?800:null;
      else if(p.p==='QB'&&(have.QB||0)>=1) nb = left<=2?-40:null;
      else nb = fills?40:0;
      if(nb===null) continue;
      const board=p.y||p.espn||p.a;   // the league's own Yahoo board first
      const key=-board*1.6+nb*0.35-Math.max(0,board-pick)*0.25+gauss()*Math.max(3,board*0.06);
      if(key>bk){bk=key;best=p;}
    }
    if(!best) continue;
    A.markGone(best.n); rost[col].push(best); have[best.p]=(have[best.p]||0)+1;
  }
  return rost;
}
const N=parseInt(process.argv[2]||'120'), SLOT=parseInt(process.argv[3]||'6');
const out=[];
for(let i=0;i<N;i++){
  const r=runDraft(SLOT);
  const teams=[];
  for(let t=1;t<=TEAMS;t++) teams.push(r[t].map(p=>({n:p.n,p:p.p,e:p.e,b:p.b})));
  out.push({mine:SLOT,teams});
}
const OUTFILE=path.join(ROOT,'sim','drafts.json');
fs.writeFileSync(OUTFILE,JSON.stringify(out));
console.log('simulated '+N+' full drafts from slot '+SLOT+' -> '+OUTFILE);
const sizes=out[0].teams.map(t=>t.length);
console.log('roster sizes:',sizes.join(','));
