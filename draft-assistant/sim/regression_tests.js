const fs=require('fs');
const js=fs.readFileSync('/mnt/user-data/outputs/live-draft-assistant.html','utf8').split('<script>')[1].split('</script>')[0];
function fresh(){
  global.window={storage:{set:async()=>{},get:async()=>null},scrollTo:()=>{}};
  const mk=()=>({className:'',textContent:'',title:'',innerHTML:'',value:'',offsetTop:0,
    setAttribute(){},appendChild(){},append(){},addEventListener(){},set onclick(v){}});
  global.document={getElementById:mk,createElement:mk};global.alert=()=>{};global.confirm=()=>true;
  return new Function(js+"return {PLAYERS,runMock,fillRoster,setSlot:v=>{slot=v},getMine:()=>mine};")();
}
let fails=0, flexTE=0, bye3=0, hc=0, benchRB5=0, n=40;
const byeDist=[];
for(let i=0;i<n;i++){
  const A=fresh(); A.setSlot((i%10)+1); A.runMock();
  const B=Object.fromEntries(A.PLAYERS.map(p=>[p.n,p]));
  const R=A.fillRoster(), st=R.slice(0,9), skill=R.slice(0,7);
  if(st.filter(x=>!x.who).length||A.getMine().length!==15){fails++;continue;}
  // flex should not be a 2nd TE
  const flex=R[6].who; if(flex&&flex.p==="TE") flexTE++;
  // starter bye pileup
  const bl={}; skill.forEach(x=>{if(x.who)bl[x.who.b]=(bl[x.who.b]||0)+1;});
  const worst=Math.max(...Object.values(bl)); byeDist.push(worst);
  if(worst>=3) bye3++;
  // handcuff present?
  const mineP=A.getMine().map(x=>B[x]);
  const rbs=mineP.filter(p=>p.p==="RB");
  const elite=rbs.filter(p=>p.v>=40);
  if(elite.some(e=>rbs.some(r=>r!==e&&r.t===e.t))) hc++;
  if(rbs.length>=5&&mineP.filter(p=>p.p==="WR").length<5) benchRB5++;
}
console.log("runs:",n,"| broken rosters:",fails);
console.log("flex filled by a 2nd TE:",flexTE,"("+Math.round(100*flexTE/n)+"%)   [was the bug]");
console.log("3+ SKILL starters on one bye:",bye3,"("+Math.round(100*bye3/n)+"%)");
console.log("avg worst starter-bye stack:",(byeDist.reduce((a,b)=>a+b,0)/byeDist.length).toFixed(2));
console.log("rosters holding a handcuff to their own RB:",hc,"("+Math.round(100*hc/n)+"%)");
console.log("5+ RB with <5 WR (bench waste):",benchRB5,"("+Math.round(100*benchRB5/n)+"%)");
const A=fresh();A.setSlot(5);A.runMock();
console.log("\nSample slot 5:");
A.fillRoster().forEach(s=>console.log("   "+s.code.padEnd(6)+(s.who?s.who.n+" ("+s.who.p+", bye "+s.who.b+")":"—")));
