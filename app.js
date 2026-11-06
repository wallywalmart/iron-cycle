// Refuse to run inside someone else's frame (stands in for the X-Frame-Options header).
if(window.top!==window.self){try{window.top.location.replace(window.location.href)}catch(e){}throw new Error('framed')}

const LIFTS={squat:'Squat',bench:'Bench Press',ohp:'Overhead Press',deadlift:'Deadlift',latpd:'Lat Pulldown',dbrow:'Dumbbell Row',chin:'Chin-up',hlr:'Hanging Leg Raise',legcurl:'Leg Curl'};
const LOWER={squat:1,deadlift:1}, BARBELL={squat:1,bench:1,ohp:1,deadlift:1};
const GZ_DAYS=[{n:'A1',t1:'squat',t2:'bench',t3:'latpd'},{n:'B1',t1:'ohp',t2:'deadlift',t3:'dbrow'},{n:'A2',t1:'bench',t2:'squat',t3:'latpd'},{n:'B2',t1:'deadlift',t2:'ohp',t3:'dbrow'}];
const T1S=[{s:5,r:3},{s:6,r:2},{s:10,r:1}], T2S=[{s:3,r:10},{s:3,r:8},{s:3,r:6}];
const BBB_DAYS=['ohp','deadlift','bench','squat'];
const BBB_ACC={ohp:'chin',deadlift:'hlr',bench:'dbrow',squat:'legcurl'};
const WAVE=[[[.65,5],[.75,5],[.85,5,1]],[[.70,3],[.80,3],[.90,3,1]],[[.75,5],[.85,3],[.95,1,1]],[[.40,5],[.50,5],[.60,5]]];
const WEEKNAME=['5s week','3s week','5/3/1 week','Deload week'];
const LS='ironcycle.v1';
/* Backups are checked before use: only known fields, safe ids, no markup except the app's own highlight. */
const cleanId=v=>String(v==null?'':v).replace(/[^A-Za-z0-9]/g,'').slice(0,40);
const cleanTxt=v=>String(v==null?'':v).replace(/<(?!\/?span(?: class="up")?>)[^>]*>/g,'').replace(/<(?!\/?span)/g,'').slice(0,300);
const numOr=(v,d)=>{const n=Number(v);return isFinite(n)?n:d};
function deepClean(o){
  if(typeof o==='string') return cleanTxt(o);
  if(typeof o==='number') return isFinite(o)?o:0;
  if(typeof o==='boolean'||o==null) return o;
  if(Array.isArray(o)) return o.slice(0,1000).map(deepClean);
  if(typeof o==='object'){const r={};for(const k of Object.keys(o)){if(/^[A-Za-z0-9_]{1,40}$/.test(k))r[k]=deepClean(o[k])}return r}
  return null;
}
function cleanBackup(raw){
  const d=deepClean(raw); if(!d||typeof d!=='object'||!d.gz||!d.bbb) throw 0;
  const g=d.gz;
  if(Array.isArray(g.t3list)) g.t3list=g.t3list.filter(x=>x&&typeof x==='object').map(x=>({id:cleanId(x.id),name:String(x.name||'').replace(/[<>]/g,'').slice(0,40),w:numOr(x.w,0)})).filter(x=>x.id);
  const fixDays=a=>Array.isArray(a)?a.map(p=>Array.isArray(p)?p.map(cleanId):cleanId(p)):a;
  g.t3day=fixDays(g.t3day); d.bbb.accday=fixDays(d.bbb.accday);
  if(d.bbb.accw&&typeof d.bbb.accw==='object'){const w={};for(const k in d.bbb.accw)w[cleanId(k)]=numOr(d.bbb.accw[k],0);d.bbb.accw=w}
  d.units=d.units==='kg'?'kg':'lb'; d.program=d.program==='bbb'?'bbb':'gzclp';
  if(!Array.isArray(d.log)) d.log=[]; d.log=d.log.slice(0,220);
  d.current=null;
  return d;
}
document.addEventListener('focusin',ev=>{if(ev.target.id==='csvbox')ev.target.select()});


function defaults(){return{v:1,program:'gzclp',units:'lb',bar:45,example:true,
 gz:{day:0,t1:{squat:{w:185,s:0},bench:{w:135,s:0},ohp:{w:85,s:0},deadlift:{w:225,s:0}},
  t2:{squat:{w:135,s:0,base:135},bench:{w:95,s:0,base:95},ohp:{w:65,s:0,base:65},deadlift:{w:165,s:0,base:165}},
  t3list:[{id:'curl',name:'Curls',w:25},{id:'skull',name:'Skull Crushers',w:40},{id:'dbrow',name:'Dumbbell Row',w:40},{id:'pullup',name:'Pull-ups',w:0}],
  t3day:[['',''],['',''],['',''],['','']]},
 bbb:{cycle:1,week:0,day:0,pct:50,deload:true,tm:{ohp:95,deadlift:255,bench:150,squat:210},accday:[['',''],['',''],['',''],['','']],accw:{}},
 current:null,log:[],updatedAt:0}}
function migrate(s){const d=defaults();const old=s.gz&&s.gz.t3;const r=Object.assign(d,s,{gz:Object.assign(d.gz,s.gz||{}),bbb:Object.assign(d.bbb,s.bbb||{})});
  if(old&&old.dbrow){const it=r.gz.t3list.find(x=>x.id==='dbrow');if(it)it.w=old.dbrow.w}delete r.gz.t3;r.gz.t3day=[0,1,2,3].map(i=>{const x=r.gz.t3day[i];return Array.isArray(x)?[x[0]||'',x[1]||'']:[x||'','']});r.bbb.accday=[0,1,2,3].map(i=>{const x=(r.bbb.accday||[])[i];return Array.isArray(x)?[x[0]||'',x[1]||'']:['','']});r.bbb.accw=r.bbb.accw||{};delete r.bbb.acc;
  if(r.current&&!r.current.v2){try{r.current.ex.forEach(e=>{e.planned=e.sets.length;e.tgt=e.sets.length?e.sets[0].w:0;e.t0=e.sets.length?e.sets[0].t:10;e.sets.forEach(x=>{x.d=x.r!=null;if(x.r==null)x.r=x.t;if(x.tw==null)x.tw=x.w;if(x.rpe===undefined)x.rpe=null})});r.current.v2=1;r.current.started=r.current.started||Date.now()}catch(e){r.current=null}}
  return r}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const t3item=id=>st.gz.t3list.find(x=>x.id===id);
const accW=id=>{const v=st.bbb.accw[id];return v!=null?v:((t3item(id)||{}).w||0)};
const slotArr=k=>k[0]==='g'?st.gz.t3day:st.bbb.accday;
const nameOf=id=>LIFTS[id]||(t3item(id)||{}).name||id;
function loadLocal(){try{const r=localStorage.getItem(LS);return r?migrate(JSON.parse(r)):null}catch(e){return null}}
function saveLocal(){try{localStorage.setItem(LS,JSON.stringify(st))}catch(e){}}

let st=loadLocal()||defaults();
const ui={view:'today',edit:null,confirmReset:false,confirmDiscard:false};
let sync='device';

/* ---------- helpers ---------- */
const kg=()=>st.units==='kg';
const U=()=>st.units;
const stepW=()=>kg()?2.5:5;
const rnd=x=>Math.round(x/stepW())*stepW();
const fmtN=n=>(Math.round(n*100)/100).toString();
const incFor=l=>LOWER[l]?(kg()?5:10):(kg()?2.5:5);
function plates(w){
  const bar=st.bar, list=kg()?[25,20,15,10,5,2.5,1.25]:[45,35,25,10,5,2.5];
  if(w<=bar) return 'Empty bar';
  let side=(w-bar)/2, out=[];
  for(const p of list){while(side>=p-1e-9){out.push(p);side-=p}}
  return '<b>'+out.map(fmtN).join(' · ')+'</b> per side'+(side>0.01?' (+'+fmtN(side)+')':'');
}
function wLabel(w,lift){return(w===0&&!BARBELL[lift])?'BW':fmtN(w)}

/* ---------- workout builder ---------- */
function mk(n,r,w,amrapLast){return Array.from({length:n},(_,i)=>({w,tw:w,t:r,a:!!(amrapLast&&i===n-1),r:r,d:false,rpe:null}))}
function buildWorkout(){const w=buildRaw();w.v2=1;w.ex.forEach(e=>{e.planned=e.sets.length;e.tgt=e.sets.length?e.sets[0].tw:0;e.t0=e.sets.length?e.sets[0].t:10});return w}
function buildRaw(){
  if(st.program==='gzclp'){
    const d=GZ_DAYS[st.gz.day%4];
    const a=st.gz.t1[d.t1],sa=T1S[a.s],b=st.gz.t2[d.t2],sb=T2S[b.s],slots=st.gz.t3day[st.gz.day%4];
    const t3ex=[0,1].map(si=>{const c=t3item(slots[si]);return c?{lift:c.id,tier:'T3',c:3,rest:75,edit:'t3',note:'3×15+ · weight goes up when the last set hits 25',sets:mk(3,15,c.w,true)}
               :{lift:null,tier:'T3',c:3,pick:true,slot:si,note:'Choose accessory '+(si+1)+' of 2 for Day '+d.n,sets:[]}});
    return{program:'gzclp',label:'Day '+d.n,ex:[
      {lift:d.t1,tier:'T1',c:1,rest:180,edit:'t1',note:sa.s+'×'+sa.r+'+ · stage '+(a.s+1)+' of 3 · last set AMRAP',sets:mk(sa.s,sa.r,a.w,true)},
      {lift:d.t2,tier:'T2',c:2,rest:120,edit:'t2',note:sb.s+'×'+sb.r+' · stage '+(b.s+1)+' of 3',sets:mk(sb.s,sb.r,b.w,false)},
      ...t3ex]};
  }
  const b=st.bbb,lift=BBB_DAYS[b.day],tm=b.tm[lift],wk=b.week,slots=b.accday[b.day];
  const accEx=[0,1].map(si=>{const c=t3item(slots[si]);return c?{lift:c.id,tier:'ACC',c:3,rest:60,edit:'acc',note:'Assistance · 5×10',sets:mk(5,10,accW(c.id),false)}
               :{lift:null,tier:'ACC',c:3,pick:true,slot:si,note:'Choose assistance '+(si+1)+' of 2 for '+LIFTS[lift]+' day',sets:[]}});
  return{program:'bbb',label:'Cycle '+b.cycle+' · Week '+(wk+1)+' · '+LIFTS[lift],ex:[
    {lift,tier:'MAIN',c:1,rest:180,note:WEEKNAME[wk]+' · TM '+fmtN(tm)+(wk<3?' · last set AMRAP':''),sets:WAVE[wk].map(([p,r,a])=>{const w=rnd(tm*p);return{w,tw:w,t:r,a:!!a,r,d:false,rpe:null}})},
    {lift,tier:'BBB',c:2,rest:90,note:'5×10 at '+b.pct+'% of TM',sets:mk(5,10,rnd(tm*b.pct/100),false)},
    ...accEx]};
}
const cur=()=>st.current||buildWorkout();
const anyLogged=w=>w.ex.some(e=>e.sets.some(s=>s.d));

/* ---------- progression ---------- */
/* Rules: only sets you ticked count. Missed reps at the target weight follow the program (stage drop).
   Fewer sets than planned, or a lighter weight than the target, repeats the same target next time. */
function progress(S,w){
  const ch=[], arrow=(a,b)=>fmtN(a)+' → <span class="up">'+fmtN(b)+'</span> '+U(), g=S.gz;
  if(w.program==='gzclp'){
    for(const e of w.ex){
      if(!e.lift) continue;
      const done=e.sets.filter(x=>x.d); if(!done.length) continue;
      const n=esc(nameOf(e.lift)), planned=e.planned||e.sets.length;
      const short=done.length<planned, light=done.some(x=>x.w<x.tw);
      const missed=done.some(x=>x.w>=x.tw&&x.r<x.t);
      const why=short?'did '+done.length+' of '+planned+' sets':'lifted less than the target';
      if(e.tier==='T1'){const o=g.t1[e.lift];
        if(missed){
          if(o.s<2){o.s++;ch.push(n+' T1: missed reps, next time '+T1S[o.s].s+'×'+T1S[o.s].r+'+ at '+fmtN(o.w)+' '+U())}
          else{const nw=rnd(o.w*.85);o.s=0;ch.push(n+' T1: cycle reset, back to 5×3+ at '+fmtN(nw)+' '+U()+' (85%)');o.w=nw}
        }else if(short||light) ch.push(n+' T1: '+why+'. Stays at '+fmtN(o.w)+' '+U()+'.');
        else{const nw=o.w+incFor(e.lift);ch.push(n+' T1: '+arrow(o.w,nw));o.w=nw}
      }else if(e.tier==='T2'){const o=g.t2[e.lift];
        if(missed){
          if(o.s<2){if(o.s===0)o.base=o.w;o.s++;ch.push(n+' T2: missed reps, next time '+T2S[o.s].s+'×'+T2S[o.s].r+' at '+fmtN(o.w)+' '+U())}
          else{const nw=rnd((o.base||o.w)+(kg()?7.5:15));o.s=0;o.base=nw;ch.push(n+' T2: back to 3×10 at '+fmtN(nw)+' '+U());o.w=nw}
        }else if(short||light) ch.push(n+' T2: '+why+'. Stays at '+fmtN(o.w)+' '+U()+'.');
        else{const nw=o.w+incFor(e.lift);ch.push(n+' T2: '+arrow(o.w,nw));o.w=nw}
      }else{const o=g.t3list.find(x=>x.id===e.lift),last=done[done.length-1];
        if(!o) continue;
        if(short) ch.push(n+' T3: '+why+'. No change.');
        else if(last.r>=25&&last.w>=last.tw){const nw=o.w+(kg()?2.5:5);ch.push(n+' T3: hit '+last.r+' reps, '+arrow(o.w,nw));o.w=nw}
      }
    }
    g.day=(g.day+1)%4;
  }else{
    const b=S.bbb, m=w.ex[0], am=m.sets.find(x=>x.a&&x.d);
    if(am){const e1=Math.round(am.w*(1+am.r/30));ch.push(LIFTS[m.lift]+': '+am.r+' reps at '+fmtN(am.w)+' · est. 1RM '+e1+' '+U())}
    b.day++;
    if(b.day>3){b.day=0;b.week++;
      const last=b.deload?3:2;
      if(b.week>last){b.week=0;b.cycle++;
        for(const l of BBB_DAYS){const nw=b.tm[l]+incFor(l);ch.push(LIFTS[l]+' TM: '+arrow(b.tm[l],nw));b.tm[l]=nw}
        ch.push('Cycle '+b.cycle+' starts next workout.');
      }else ch.push('Week '+(b.week+1)+' ('+WEEKNAME[b.week]+') starts next workout.');
    }
  }
  return ch;
}
function workoutStats(w){let tot=0,done=0,planned=0;const rs=[];
  w.ex.forEach(e=>{if(!e.lift)return;planned+=e.planned||e.sets.length;e.sets.forEach(x=>{if(x.d){done++;tot+=x.w*x.r;if(x.rpe!=null)rs.push(x.rpe)}})});
  return{tot,done,planned,rated:rs.length,avg:rs.length?rs.reduce((a,b)=>a+b,0)/rs.length:null}}
function finish(){
  const w=st.current; if(!w||!workoutStats(w).done) return;
  const ch=progress(st,w), now=Date.now(), t0=w.started||now;
  st.log.unshift({d:now,st:t0,dur:now-t0,p:w.program,u:st.units,label:w.label,
    ex:w.ex.filter(e=>e.lift).map(e=>({n:nameOf(e.lift),t:e.tier,l:e.lift,s:e.sets.filter(x=>x.d).map(x=>[x.w,x.r,x.a?1:0,x.rpe==null?null:x.rpe])})).filter(e=>e.s.length),ch});
  if(st.log.length>220) st.log.length=220;
  st.current=null; ui.ending=false; ui.confirmDiscard=false; ui.edit=null; ui.view='history'; ui.report=false;
  stopTimer(); save(); render(); scrollTo(0,0);
}

/* ---------- rendering ---------- */
const $=id=>document.getElementById(id);
function render(){
  document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.v===ui.view));
  $('app').innerHTML=ui.view==='today'?viewToday():ui.view==='history'?viewHistory():viewSetup();
  $('sheet').innerHTML=st.current&&ui.rpe?rpeSheet():st.current&&ui.ending?endSheet():'';
}
function syncText(){return 'Saved on this phone'}
function header(sub){
  const prog=st.program==='gzclp'?'GZCLP':'Boring But Big';
  return '<div class="top"><div><div class="eyebrow">'+prog+'</div><h1>'+sub+'</h1></div><div class="sync" id="sync">'+syncText()+'</div></div>';
}
const pad2=n=>String(n).padStart(2,'0');
function fmtDur(ms){const t=Math.max(0,Math.floor(ms/1000)),h=Math.floor(t/3600),m=Math.floor(t%3600/60),x=t%60;return h?h+':'+pad2(m)+':'+pad2(x):m+':'+pad2(x)}
const CHECK='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const PLAY='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M7 4l13 8-13 8z" fill="currentColor"/></svg>';
function viewToday(){
  const live=!!st.current, w=cur();
  let h='';
  if(live) h+='<div class="runbar"><span class="dot"></span><div class="rt"><div class="rl">In progress</div><div class="rc" id="elapsed">'+fmtDur(Date.now()-(w.started||Date.now()))+'</div></div><button class="btn small light" data-act="end">End workout</button></div>';
  h+=header(w.label);
  if(st.example) h+='<div class="banner"><span>Starting weights are examples. Put in your own before you lift.</span><button class="btn small" data-act="view" data-v="setup">Set weights</button></div>';
  if(!live) h+='<button class="btn go" data-act="start">'+PLAY+'Start workout</button><p class="hint tight">Starts the clock. Your targets for today are below.</p>';
  w.ex.forEach((e,ei)=>{h+=e.pick?pickHTML(e):live?exHTML(e,ei):previewHTML(e,ei)});
  if(live) h+='<div class="row"><button class="btn" data-act="end">End workout</button></div>';
  return h;
}
function pickHTML(e){const g=e.tier==='T3',k=(g?'g'+(st.gz.day%4):'b'+st.bbb.day)+'_'+e.slot;
  return '<section class="card"><div class="exhead"><span class="tier c3">'+e.tier+'</span><div class="t"><div class="exname">'+(g?'Accessory ':'Assistance ')+(e.slot+1)+'</div><div class="note">'+e.note+'</div></div></div>'+
    '<div class="field"><label for="pk-'+k+'">Exercise</label><select id="pk-'+k+'" data-in="pk-'+k+'">'+t3Options('')+'</select></div>'+(ui.newFor===k?newExRow(k):'')+'</section>'}
function targetHTML(e,ei){
  const ws=e.sets.length?e.sets.map(x=>x.tw):[e.tgt],lo=Math.min(...ws),hi=Math.max(...ws);
  const txt=lo===hi?(wLabel(lo,e.lift)==='BW'?'BW':fmtN(lo)+'<small>'+U()+'</small>'):fmtN(lo)+'–'+fmtN(hi)+'<small>'+U()+'</small>';
  return '<div class="tgt"><div class="tl">Target</div><button class="wbtn'+(e.edit?'':' static')+'" '+(e.edit?'data-act="wedit" data-ei="'+ei+'" aria-label="Change target weight"':'tabindex="-1"')+'>'+txt+'</button></div>'}
function headHTML(e,ei){return '<div class="exhead"><span class="tier c'+e.c+'">'+e.tier+'</span><div class="t"><div class="exname">'+esc(nameOf(e.lift))+'</div><div class="note">'+e.note+'</div>'+lastTime(e)+'</div>'+targetHTML(e,ei)+'</div>'+
  (ui.edit===ei&&e.edit?'<div class="step"><span class="lbl">Target from now on</span><button class="pm" data-act="w-" data-ei="'+ei+'" aria-label="Lower target">−</button><span class="val">'+wLabel(e.sets.length?e.sets[0].tw:e.tgt,e.lift)+'</span><button class="pm" data-act="w+" data-ei="'+ei+'" aria-label="Raise target">+</button></div>':'')}
function previewHTML(e,ei){return '<section class="card">'+headHTML(e,ei)+'</section>'}
const diffTxt=x=>{const d=x.w-x.tw;return d===0?'':(d>0?'+':'−')+fmtN(Math.abs(d))};
function platesLine(e){const i=e.sets.findIndex(x=>!x.d);if(i<0||!BARBELL[e.lift])return '';return 'Set '+(i+1)+': '+plates(e.sets[i].w)}
function exHTML(e,ei){
  const next=e.sets.findIndex(x=>!x.d);
  let h='<section class="card">'+headHTML(e,ei);
  if(BARBELL[e.lift]) h+='<div class="plates" id="pl-'+ei+'">'+platesLine(e)+'</div>';
  if(e.sets.length) h+='<div class="sgrid sh" aria-hidden="true"><span>Set</span><span>Weight '+U()+'</span><span>Reps</span><span>RPE</span><span></span></div>';
  e.sets.forEach((x,si)=>{const id=ei+'-'+si,n=si+1;
    h+='<div class="sgrid srow'+(x.d?' done':'')+(si===next?' now':'')+'">'+
      '<span class="sn">'+n+(x.a?'<small>max</small>':'')+'</span>'+
      '<span class="swb"><input type="number" inputmode="decimal" step="any" min="0" id="sw-'+id+'" data-in="sw-'+id+'" value="'+fmtN(x.w)+'" aria-label="Set '+n+' weight"><span class="df" id="df-'+id+'">'+diffTxt(x)+'</span></span>'+
      '<input type="number" inputmode="numeric" step="1" min="0" class="srep" id="sr-'+id+'" data-in="sr-'+id+'" value="'+x.r+'" aria-label="Set '+n+' reps'+(x.a?', as many as possible':'')+'">'+
      '<button class="rpeb'+(x.rpe!=null?' on':'')+'" data-act="rpe" data-ei="'+ei+'" data-si="'+si+'" aria-label="RPE for set '+n+'">'+(x.rpe!=null?fmtN(x.rpe):'RPE')+'</button>'+
      '<button class="chk'+(x.d?' on':'')+'" data-act="done" data-ei="'+ei+'" data-si="'+si+'" aria-pressed="'+x.d+'" aria-label="Set '+n+' done">'+CHECK+'</button></div>'});
  if(!e.sets.length) h+='<div class="hint">No sets left. Add one if you want to log this exercise.</div>';
  h+='<div class="row"><button class="btn ghost small" data-act="addset" data-ei="'+ei+'">+ Add set</button><button class="btn ghost small" data-act="rmset" data-ei="'+ei+'"'+(e.sets.length?'':' disabled')+'>− Remove set</button></div>';
  return h+'</section>';
}
const RPES=[6,6.5,7,7.5,8,8.5,9,9.5,10];
const RPE_TXT={6:'About 4 reps left. Felt easy.',6.5:'3 to 4 reps left.',7:'3 reps left. The bar moved fast.',7.5:'2 to 3 reps left.',8:'2 reps left.',8.5:'1 to 2 reps left. Maybe one more.',9:'1 rep left.',9.5:'No reps left, but you could have added a little weight.',10:'Max effort. Nothing left.'};
function rpeSheet(){const R=ui.rpe,e=st.current.ex[R.ei],x=e&&e.sets[R.si];if(!x){ui.rpe=null;return ''}
  const wt=wLabel(x.w,e.lift)==='BW'?'BW':fmtN(x.w)+' '+U();
  return '<div class="sheet"><div class="card sheetcard" role="dialog" aria-label="Set RPE"><div class="grab"></div><div class="note">'+esc(nameOf(e.lift))+' · set '+(R.si+1)+' · '+wt+' × '+x.r+'</div><h2>How hard was that set?</h2>'+
    '<div class="chips">'+RPES.map(v=>'<button class="chip'+(R.v===v?' on':'')+'" data-act="rpechip" data-v="'+v+'" aria-pressed="'+(R.v===v)+'">'+fmtN(v)+'</button>').join('')+'</div>'+
    (R.v!=null?'<div class="rpedesc"><b>RPE '+fmtN(R.v)+'</b><span>'+RPE_TXT[R.v]+'</span></div>':'<div class="hint">RPE 10 is an all-out set. 7 means about 3 reps left.</div>')+
    '<div class="row"><button class="btn ghost" data-act="rpeskip">'+(x.rpe!=null?'Cancel':'Skip')+'</button><button class="btn" data-act="rpesave"'+(R.v==null?' disabled':'')+'>Save RPE</button></div>'+
    (x.rpe!=null?'<button class="linkbtn" data-act="rpeclear">Clear RPE</button>':'')+'</div></div>'}
function endSheet(){const w=st.current,S=workoutStats(w),t0=w.started||Date.now(),tf=new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit'});
  const ch=S.done?progress(JSON.parse(JSON.stringify(st)),w):[];
  let h='<div class="sheet"><div class="card sheetcard" role="dialog" aria-label="End workout"><div class="grab"></div><div class="eyebrow">End workout?</div><h2>'+esc(w.label)+' · '+Math.max(1,Math.round((Date.now()-t0)/60000))+' min</h2><div class="note">Started '+tf.format(new Date(t0))+'</div>'+
    '<div class="tiles"><div class="tile"><span>Total lifted</span><b>'+Math.round(S.tot).toLocaleString()+'</b><small>'+U()+'</small></div>'+
    '<div class="tile"><span>Sets</span><b>'+S.done+'</b><small>of '+S.planned+' planned</small></div>'+
    '<div class="tile"><span>Avg RPE</span><b>'+(S.avg==null?'—':fmtN(Math.round(S.avg*10)/10))+'</b><small>'+S.rated+' rated</small></div></div>';
  if(S.done) h+='<div><h3>Next time</h3>'+(ch.length?ch.map(c=>'<div class="chg">'+c+'</div>').join(''):'<div class="hint">No weight changes.</div>')+'</div>';
  else h+='<div class="hint">Nothing ticked yet. Tick at least one set to save this workout, or discard it.</div>';
  h+='<div class="row"><button class="btn ghost" data-act="end-cancel">Keep going</button><button class="btn go" data-act="finish"'+(S.done?'':' disabled')+'>Save &amp; end</button></div>';
  h+=ui.confirmDiscard?'<div class="confirm"><div>Throw away this workout? Nothing will be saved.</div><div class="row"><button class="btn danger small" data-act="discard-yes">Discard</button><button class="btn ghost small" data-act="discard-no">Keep it</button></div></div>'
                      :'<button class="linkbtn danger" data-act="discard">Discard this workout</button>';
  return h+'</div></div>'}
function newExRow(d){return '<div class="field"><input type="text" class="txt" id="newex-'+d+'" maxlength="40" placeholder="New exercise name" aria-label="New exercise name"><button class="btn small" data-act="addt3" data-d="'+d+'">Add</button></div>'}
function t3Options(sel){return '<option value="">Choose…</option>'+st.gz.t3list.map(x=>'<option value="'+esc(x.id)+'"'+(x.id===sel?' selected':'')+'>'+esc(x.name)+'</option>').join('')+'<option value="__new">+ New exercise…</option>'}
function lastTime(e){
  for(const L of st.log){const x=L.ex.find(q=>q.t===e.tier&&q.l===e.lift);if(x&&x.s.length){
    const f=unitF(L),rp=x.s.map(q=>q[3]).filter(v=>v!=null);
    return '<div class="last">Last time: '+esc(setsText({sets:x.s.map(q=>[rnd(q[0]*f),q[1],q[2]])}))+(rp.length?' · avg RPE '+fmtN(Math.round(rp.reduce((a,b)=>a+b,0)/rp.length*10)/10):'')+'</div>'}}
  return ''}
/* ---------- history stats, charts, report ---------- */
const TIER_ORDER=['T1','T2','T3','MAIN','BBB','ACC'], E1_TIERS={T1:1,MAIN:1};
const TIER_C={T1:1,T2:2,T3:3,MAIN:1,BBB:2,ACC:3};
const TIER_NAME={T1:'T1 · heavy',T2:'T2 · volume',T3:'T3 · accessories',MAIN:'Main 5/3/1',BBB:'BBB 5×10',ACC:'Assistance'};
const unitF=L=>{const u=L.u||st.units;return u===st.units?1:(st.units==='kg'?0.45359237:1/0.45359237)};
const e1=(w,r)=>r<=1?w:w*(1+r/30);
function exStats(e,f){
  let top=0,topR=0,vol=0,reps=0,best=0;
  e.s.forEach(([w,r])=>{w*=f;reps+=r;vol+=w*r;if(w>top||(w===top&&r>topR)){top=w;topR=r}if(r>0)best=Math.max(best,e1(w,r))});
  return{top,topR,vol,reps,e1:best};
}
function sessions(){ // oldest first, one row per exercise per workout
  const out=[];
  for(let i=st.log.length-1;i>=0;i--){const L=st.log[i],f=unitF(L);
    L.ex.forEach(e=>{const s=exStats(e,f),rp=e.s.map(q=>q[3]).filter(v=>v!=null);out.push(Object.assign({d:L.d,p:L.p,label:L.label,dur:L.dur,tier:e.t,lift:e.l,name:e.n,rpe:rp.length?rp.reduce((a,b)=>a+b,0)/rp.length:null,sets:e.s.map(([w,r,a,q])=>[w*f,r,a,q])},s))});
  }return out;
}
const fmtK=n=>n>=10000?(Math.round(n/100)/10)+'k':Math.round(n).toLocaleString();
function niceStep(x){const p=Math.pow(10,Math.floor(Math.log10(x)));const f=x/p;return(f<=1?1:f<=2?2:f<=5?5:10)*p}
function chartSVG(pts,title,c,fmt){
  const W=340,H=150,L=44,R=12,T=12,B=24,df=new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric'});
  let lo=Math.min(...pts.map(p=>p.y)),hi=Math.max(...pts.map(p=>p.y));
  if(lo===hi){lo=lo-Math.max(1,lo*.1);hi=hi+Math.max(1,hi*.1)}
  const step=niceStep((hi-lo)/3);lo=Math.floor(lo/step)*step;hi=Math.ceil(hi/step)*step;if(lo<0)lo=0;
  const x0=pts[0].x,x1=pts[pts.length-1].x;
  const X=x=>x1===x0?(L+W-R)/2:L+(x-x0)/(x1-x0)*(W-L-R), Y=y=>T+(1-(y-lo)/(hi-lo))*(H-T-B);
  let g='';
  for(let v=lo;v<=hi+1e-9;v+=step) g+='<line class="gl" x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v)+'" y2="'+Y(v)+'"/><text class="ax" x="'+(L-6)+'" y="'+(Y(v)+4)+'" text-anchor="end">'+fmt(v)+'</text>';
  g+='<text class="ax" x="'+L+'" y="'+(H-6)+'">'+df.format(new Date(x0))+'</text>';
  if(x1!==x0) g+='<text class="ax" x="'+(W-R)+'" y="'+(H-6)+'" text-anchor="end">'+df.format(new Date(x1))+'</text>';
  const line=pts.map((p,i)=>(i?'L':'M')+X(p.x).toFixed(1)+' '+Y(p.y).toFixed(1)).join(' ');
  const area=pts.length>1?line+' L'+X(x1).toFixed(1)+' '+Y(lo)+' L'+X(x0).toFixed(1)+' '+Y(lo)+' Z':'';
  const last=pts[pts.length-1];
  return '<figure class="chart"><figcaption><span>'+title+'</span><b>'+fmt(last.y)+'</b></figcaption><svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+title+' over time">'+g+
    (area?'<path class="ar c'+c+'" d="'+area+'"/>':'')+'<path class="ln c'+c+'" d="'+line+'"/>'+
    pts.map((p,i)=>'<circle class="dt c'+c+'" cx="'+X(p.x).toFixed(1)+'" cy="'+Y(p.y).toFixed(1)+'" r="'+(i===pts.length-1?4.5:2.5)+'"/>').join('')+'</svg></figure>';
}
function barSVG(bars,o){
  const W=340,H=150,L=40,R=8,T=10,B=22,max=Math.max(o.int?4:1,...bars.map(b=>b.y));
  let step=niceStep(max/3); if(o.int) step=Math.max(1,Math.round(step));
  const top=Math.ceil(max/step)*step, Y=v=>T+(1-v/top)*(H-T-B), n=bars.length, slot=(W-L-R)/n, bw=Math.max(3,Math.min(26,slot*.7));
  let g='';
  for(let v=0;v<=top+1e-9;v+=step) g+='<line class="gl" x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v)+'" y2="'+Y(v)+'"/><text class="ax" x="'+(L-6)+'" y="'+(Y(v)+4)+'" text-anchor="end">'+o.fmt(v)+'</text>';
  bars.forEach((b,i)=>{const x=L+i*slot+(slot-bw)/2,y=Y(b.y),hh=Math.max(0,Y(0)-y);
    g+='<rect class="vbar '+o.c+(b.cur?' cur':'')+(b.hi?' hi':'')+'" x="'+x.toFixed(1)+'" y="'+(b.cur?Math.min(y,Y(0)-1):y).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+(b.cur?Math.max(1,hh-1):hh).toFixed(1)+'" rx="2"/>'});
  g+='<text class="ax" x="'+L+'" y="'+(H-5)+'">'+o.left+'</text><text class="ax" x="'+(W-R)+'" y="'+(H-5)+'" text-anchor="end">'+o.right+'</text>';
  return '<section class="card"><figure class="chart"><figcaption><span>'+o.title+'</span><b>'+o.big+'</b></figcaption><svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+o.title+'">'+g+'</svg></figure>'+(o.note?'<div class="hint">'+o.note+'</div>':'')+'</section>';
}
const weekOf=d=>{const t=new Date(d);t.setHours(0,0,0,0);t.setDate(t.getDate()-((t.getDay()+6)%7));return t.getTime()};
function summaryCharts(){
  const L=st.log.slice().reverse(), df=new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric'});
  const tot=L.map(x=>{const f=unitF(x);let s=0;x.ex.forEach(e=>e.s.forEach(q=>{s+=q[0]*f*q[1]}));return{d:x.d,y:s}}).slice(-20);
  tot.forEach((b,i)=>{b.hi=i===tot.length-1});
  let h=barSVG(tot,{title:'Total lifted per session ('+U()+')',big:Math.round(tot[tot.length-1].y).toLocaleString(),c:'c2',fmt:fmtK,
    left:df.format(new Date(tot[0].d)),right:df.format(new Date(tot[tot.length-1].d)),note:'Every set’s weight × reps, added up for the whole workout.'});
  const cw=weekOf(Date.now()), weeks=[], d=new Date(weekOf(L[0].d));
  while(d.getTime()<=cw&&weeks.length<520){weeks.push({t:d.getTime(),y:0});d.setDate(d.getDate()+7);d.setHours(0,0,0,0)}
  L.forEach(x=>{const w=weeks.find(q=>q.t===weekOf(x.d));if(w)w.y++});
  const wk=weeks.slice(-12); if(wk.length) wk[wk.length-1].cur=true;
  const full=wk.filter(w=>!w.cur), avg=full.length?full.reduce((a,w)=>a+w.y,0)/full.length:wk[wk.length-1].y;
  h+=barSVG(wk,{title:'Workouts per week',big:fmtN(Math.round(avg*10)/10)+' <small>avg</small>',c:'good',int:true,fmt:v=>String(Math.round(v)),
    left:wk.length>1?'Wk of '+df.format(new Date(wk[0].t)):'This week',right:'This week',note:'Weeks run Monday to Sunday. This week is outlined because it isn’t over yet.'+(full.length?' The average leaves it out.':'')});
  return h;
}
function viewCharts(rows){
  const tiers=TIER_ORDER.filter(t=>rows.some(r=>r.tier===t));
  if(!tiers.length) return '';
  const tier=tiers.includes(ui.htier)?ui.htier:tiers[0];
  let h='<div class="seg">'+tiers.map(t=>'<button data-act="htier" data-t="'+t+'" class="'+(t===tier?'on':'')+'">'+t+'</button>').join('')+'</div>';
  const lifts=[...new Set(rows.filter(r=>r.tier===tier).map(r=>r.lift))];
  const u=U(), w=v=>fmtN(Math.round(v*10)/10);
  lifts.forEach(l=>{
    const rs=rows.filter(r=>r.tier===tier&&r.lift===l), bw=rs.every(r=>r.top===0), c=TIER_C[tier];
    h+='<section class="card"><div class="exhead"><span class="tier c'+c+'">'+tier+'</span><div class="t"><div class="exname">'+esc(rs[rs.length-1].name)+'</div><div class="note">'+rs.length+' workout'+(rs.length>1?'s':'')+' logged</div></div></div><div class="charts">';
    if(E1_TIERS[tier]&&!bw) h+=chartSVG(rs.map(r=>({x:r.d,y:r.e1})),'Estimated 1-rep max ('+u+')',c,v=>fmtN(Math.round(v)));
    if(!bw) h+=chartSVG(rs.map(r=>({x:r.d,y:r.top})),'Best set weight ('+u+')',c,w);
    h+=bw?chartSVG(rs.map(r=>({x:r.d,y:r.reps})),'Total reps',c,v=>Math.round(v)+'')
         :chartSVG(rs.map(r=>({x:r.d,y:r.vol})),'Total volume, weight × reps ('+u+')',c,fmtK);
    h+='</div></section>';
  });
  return h;
}
function setsText(r){if(!r.sets.length)return '';const same=r.sets.every(x=>x[0]===r.sets[0][0]),W=v=>v===0?'BW':fmtN(Math.round(v*10)/10),rp=x=>x[3]!=null?' @'+fmtN(x[3]):'';
  return same?W(r.sets[0][0])+' × '+r.sets.map(x=>x[1]+rp(x)).join(', '):r.sets.map(x=>W(x[0])+'×'+x[1]+rp(x)).join(', ')}
function reportRows(){const df=new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit'});
  return sessions().reverse().map(r=>({date:df.format(new Date(r.d)),prog:r.p==='gzclp'?'GZCLP':'BBB',day:r.label,tier:r.tier,name:r.name,sets:setsText(r),
    top:r.top?fmtN(Math.round(r.top*10)/10)+' × '+r.topR:'BW × '+r.topR,vol:r.top?Math.round(r.vol):r.reps+' reps',e1:E1_TIERS[r.tier]&&r.top?Math.round(r.e1):'',rpe:r.rpe!=null?fmtN(Math.round(r.rpe*10)/10):'',dur:r.dur?Math.max(1,Math.round(r.dur/60000)):''}))}
const REPORT_COLS=[['date','Date'],['prog','Program'],['day','Day'],['tier','Tier'],['name','Exercise'],['sets','Sets'],['top','Best set'],['vol','Volume'],['e1','Est. 1RM'],['rpe','Avg RPE'],['dur','Workout min']];
function reportCSV(){const q=v=>{v=String(v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
  return [REPORT_COLS.map(c=>q(c[1]+(c[0]==='vol'||c[0]==='e1'?' ('+U()+')':''))).join(',')].concat(reportRows().map(r=>REPORT_COLS.map(c=>q(r[c[0]])).join(','))).join('\n')}
function viewReport(){
  const rows=reportRows();
  let h=header('Report')+'<div class="row"><button class="btn ghost small" data-act="report-close">← Back to charts</button></div>';
  h+='<div class="tablewrap"><table><thead><tr>'+REPORT_COLS.map(c=>'<th'+(['vol','e1','rpe','dur'].includes(c[0])?' class="num"':'')+'>'+c[1]+'</th>').join('')+'</tr></thead><tbody>'+
    rows.map(r=>'<tr>'+REPORT_COLS.map(c=>'<td'+(['vol','e1','rpe','dur'].includes(c[0])?' class="num"':'')+'>'+(c[0]==='tier'?'<span class="tier c'+TIER_C[r.tier]+'">'+r.tier+'</span>':esc(c[0]==='vol'&&typeof r.vol==='number'?r.vol.toLocaleString():r[c[0]]))+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
  h+='<p class="hint">Volume is weight × reps summed over every set of that exercise. Est. 1RM uses the Epley formula on your best set. Weights are in '+U()+'.</p>';
  h+='<div class="row"><button class="btn small" data-act="copycsv">Copy as CSV</button>'+'<button class="btn small ghost" data-act="savecsv">Save CSV file</button>'+'</div><div class="hint" id="csvmsg"></div>';
  if(ui.showCsv) h+='<textarea class="txt csv" id="csvbox" readonly>'+esc(reportCSV())+'</textarea>';
  return h;
}
function viewHistory(){
  if(ui.report) return viewReport();
  let h=header('History');
  if(!st.log.length) return h+'<div class="card empty">Finished workouts show up here: total lifted per session, workouts per week, charts for every lift, and a full report.</div>';
  h+=summaryCharts()+viewCharts(sessions());
  h+='<h3 class="gap8">Workout log</h3>';
  const df=new Intl.DateTimeFormat(undefined,{weekday:'short',month:'short',day:'numeric'});
  st.log.slice(0,ui.logAll?undefined:5).forEach(L=>{
    const f=unitF(L);let tot=0;const rp=[];L.ex.forEach(e=>e.s.forEach(q=>{tot+=q[0]*f*q[1];if(q[3]!=null)rp.push(q[3])}));
    const meta=[df.format(new Date(L.d)),L.p==='gzclp'?'GZCLP':'BBB'];if(L.dur)meta.push(Math.max(1,Math.round(L.dur/60000))+' min');meta.push(Math.round(tot).toLocaleString()+' '+U());if(rp.length)meta.push('avg RPE '+fmtN(Math.round(rp.reduce((a,b)=>a+b,0)/rp.length*10)/10));
    h+='<section class="card"><div class="exhead"><div class="t"><div class="eyebrow">'+meta.join(' · ')+'</div><div class="exname">'+L.label+'</div></div></div><div class="hist">';
    L.ex.forEach(e=>{
      const v=esc(setsText({sets:e.s.map(q=>[q[0]*f,q[1],q[2],q[3]])}));
      h+='<div class="hline"><span class="n">'+esc(e.n)+' <span class="note">'+e.t+'</span></span><span class="v">'+v+'</span></div>';
    });
    h+='</div>'+(L.ch&&L.ch.length?'<div class="ch">'+L.ch.map(c=>'<div>'+c+'</div>').join('')+'</div>':'')+'</section>';
  });
  if(st.log.length>5&&!ui.logAll) h+='<div class="row"><button class="btn ghost small" data-act="logall">Show all '+st.log.length+' workouts</button></div>';
  h+='<div class="row"><button class="btn" data-act="report">Show tabular report</button></div>';
  return h;
}
function num(id,val,step){return '<input type="number" inputmode="decimal" step="'+step+'" id="'+id+'" data-in="'+id+'" value="'+fmtN(val)+'">'}
function stageSel(id,val,stages){return '<select id="'+id+'" data-in="'+id+'">'+stages.map((s,i)=>'<option value="'+i+'"'+(i===val?' selected':'')+'>'+s.s+'×'+s.r+'</option>').join('')+'</select>'}
const MAIN4=['squat','bench','ohp','deadlift'];
function calcFor(l){const b=st.best&&st.best[l];if(!b||!(b.w>0)||!(b.r>0))return null;
  const one=b.r<=1?b.w:b.w*(1+b.r/30),five=one/(1+5/30);
  return{one,t1:rnd(five*.85),t2:rnd(five*.65),tm:rnd(one*.9)}}
function calcCard(){
  let h='<section class="card"><h3>Starting weight calculator</h3><p class="hint">Enter a recent best set for each lift: any weight you did for 1 to 10 hard reps. The app estimates your 1-rep max and suggests starting weights for both programs.</p>';
  MAIN4.forEach(l=>{const b=(st.best||{})[l]||{},c=calcFor(l);
    h+='<div class="calc"><div class="calcrow"><span class="cn">'+LIFTS[l]+'</span><span class="inline"><input type="number" inputmode="decimal" id="bw-'+l+'" data-in="bw-'+l+'" value="'+(b.w||'')+'" placeholder="'+U()+'" aria-label="'+LIFTS[l]+' best set weight"><span class="x">×</span><input type="number" inputmode="numeric" class="reps" id="br-'+l+'" data-in="br-'+l+'" value="'+(b.r||'')+'" placeholder="reps" aria-label="'+LIFTS[l]+' best set reps"></span></div>'+
      (c?'<div class="calcout">≈ 1RM <b>'+Math.round(c.one)+'</b> · T1 5×3 <b>'+fmtN(c.t1)+'</b> · T2 3×10 <b>'+fmtN(c.t2)+'</b> · BBB TM <b>'+fmtN(c.tm)+'</b></div>':'')+
      (b.r>10?'<div class="calcout warn">Estimates get unreliable past 10 reps.</div>':'')+'</div>'});
  const any=MAIN4.some(calcFor);
  h+='<div class="row"><button class="btn small" data-act="applycalc"'+(any?'':' disabled')+'>Use these starting weights</button></div>';
  if(ui.calcMsg) h+='<div class="hint">'+ui.calcMsg+'</div>';
  return h+'<p class="hint">Fills GZCLP T1 and T2 (at the first stage) and Boring But Big training maxes. You can still edit any number below.</p></section>';
}
function slotSelects(p,i,lab){let h='';const arr=p==='g'?st.gz.t3day:st.bbb.accday;
  [0,1].forEach(si=>{const k=p+i+'_'+si;h+='<div class="field"><label for="pk-'+k+'">'+lab+' '+(si+1)+'</label><select id="pk-'+k+'" data-in="pk-'+k+'">'+t3Options(arr[i][si])+'</select></div>'+(ui.newFor===k?newExRow(k):'')});return h}
function viewSetup(){
  let h=header('Setup');
  h+='<section class="card"><h3>Program</h3><div class="seg"><button data-act="prog" data-p="gzclp" class="'+(st.program==='gzclp'?'on':'')+'">GZCLP</button><button data-act="prog" data-p="bbb" class="'+(st.program==='bbb'?'on':'')+'">Boring But Big</button></div>'+(ui.progMsg?'<div class="hint warn">'+ui.progMsg+'</div>':'')+
    '<div class="field"><label>Units<span class="sub">Switching converts every weight</span></label><div class="seg w130"><button data-act="units" data-u="lb" class="'+(st.units==='lb'?'on':'')+'">lb</button><button data-act="units" data-u="kg" class="'+(st.units==='kg'?'on':'')+'">kg</button></div></div>'+
    '<div class="field"><label for="bar">Bar weight</label>'+num('bar',st.bar,stepW())+'</div></section>';
  h+=calcCard();
  if(st.program==='gzclp'){
    const g=st.gz;
    h+='<section class="card"><h3>T1 · heavy · 5×3+</h3><p class="hint"><b>Enter the weight you lift for every set</b>, not a max. A good start is about 85% of your 5-rep max, so the triples feel like RPE 7–8 (2–3 reps left in the tank). The dropdown is the rep scheme you\'re on right now.</p>';
    for(const l of ['squat','bench','ohp','deadlift']) h+='<div class="field"><label for="t1-'+l+'">'+LIFTS[l]+'</label><div class="inline">'+stageSel('t1s-'+l,g.t1[l].s,T1S)+num('t1-'+l,g.t1[l].w,stepW())+'</div></div>';
    h+='</section><section class="card"><h3>T2 · volume · 3×10</h3><p class="hint"><b>Enter the weight for every set of 3×10.</b> A good start is about 65% of your 5-rep max, around RPE 7 on the first set. The dropdown is the rep scheme you\'re on right now.</p>';
    for(const l of ['squat','bench','ohp','deadlift']) h+='<div class="field"><label for="t2-'+l+'">'+LIFTS[l]+'</label><div class="inline">'+stageSel('t2s-'+l,g.t2[l].s,T2S)+num('t2-'+l,g.t2[l].w,stepW())+'</div></div>';
    h+='</section><section class="card"><h3>T3 · accessories · 3×15+</h3><p class="hint"><b>Enter the weight for every set of 3×15.</b> Pick something you could do for about 20 reps when fresh. Use 0 for bodyweight. Each day gets two accessories, chosen below.</p>';
    for(const x of g.t3list) h+='<div class="field"><label for="t3w-'+x.id+'">'+esc(x.name)+'</label><div class="inline">'+num('t3w-'+x.id,x.w,stepW())+'<button class="pm" data-act="rmt3" data-id="'+x.id+'" aria-label="Remove '+esc(x.name)+'">×</button></div></div>';
    h+=newExRow('all')+'<h3 class="gap6">T3 by day</h3>';
    GZ_DAYS.forEach((d,i)=>{h+='<div class="dayhead">Day '+d.n+' <span class="sub">'+LIFTS[d.t1]+' / '+LIFTS[d.t2]+'</span></div>';
      h+=slotSelects('g',i,'Accessory')});
    h+='</section><section class="card"><h3>Next workout</h3><div class="field"><label for="gzday">Day</label><select id="gzday" data-in="gzday">'+GZ_DAYS.map((d,i)=>'<option value="'+i+'"'+(i===g.day?' selected':'')+'>'+d.n+' · '+LIFTS[d.t1]+' / '+LIFTS[d.t2]+'</option>').join('')+'</select></div></section>';
    h+='<section class="card"><details><summary>How GZCLP progresses</summary><ul>'+
      '<li>T1: hit every rep and the weight goes up (+'+fmtN(incFor('squat'))+' '+U()+' squat/deadlift, +'+fmtN(incFor('bench'))+' '+U()+' bench/press). Miss reps and it drops to 6×2+, then 10×1+. Missing at 10×1+ resets you to 5×3+ at 85%.</li>'+
      '<li>T2: same increases. Misses step you from 3×10 to 3×8 to 3×6. Missing at 3×6 returns you to 3×10, '+(kg()?'7.5 kg':'15 lb')+' heavier than where you first stalled.</li>'+
      '<li>T3: when the last AMRAP set reaches 25 reps, add '+(kg()?'2.5 kg':'5 lb')+'.</li>'+
      '<li>Starting points: T1 about 85% of your 5-rep max, T2 about 65%.</li></ul></details></section>';
  }else{
    const b=st.bbb;
    h+='<section class="card"><h3>Training maxes</h3><p class="hint"><b>Enter 90% of your 1-rep max</b>, not the max itself and not a working weight. Every main and BBB set is a percentage of this number. No recent 1RM? Estimate it from a hard set: weight × (1 + reps ÷ 30).</p>';
    for(const l of BBB_DAYS) h+='<div class="field"><label for="tm-'+l+'">'+LIFTS[l]+'</label>'+num('tm-'+l,b.tm[l],stepW())+'</div>';
    h+='</section><section class="card"><h3>Boring But Big</h3>'+
      '<div class="field"><label for="pct">Supplemental 5×10<span class="sub">% of training max</span></label><select id="pct" data-in="pct">'+[40,50,60,70].map(p=>'<option'+(p===b.pct?' selected':'')+'>'+p+'</option>').join('')+'</select></div>'+
      '<div class="field"><label for="deload">Deload in week 4<span class="sub">Off runs a 3-week cycle</span></label><select id="deload" data-in="deload"><option value="1"'+(b.deload?' selected':'')+'>On</option><option value="0"'+(b.deload?'':' selected')+'>Off</option></select></div></section>';
    h+='<section class="card"><h3>Assistance · 5×10</h3><p class="hint"><b>Enter the weight for every set of 5×10.</b> Use 0 for bodyweight. This is the same exercise list as GZCLP T3 (adding or removing one changes both), but the weights here are separate. Each day gets two, chosen below.</p>';
    for(const x of st.gz.t3list) h+='<div class="field"><label for="aw-'+x.id+'">'+esc(x.name)+'</label><div class="inline">'+num('aw-'+x.id,accW(x.id),stepW())+'<button class="pm" data-act="rmt3" data-id="'+x.id+'" aria-label="Remove '+esc(x.name)+'">×</button></div></div>';
    h+=newExRow('all')+'<h3 class="gap6">Assistance by day</h3>';
    BBB_DAYS.forEach((l,i)=>{h+='<div class="dayhead">Day '+(i+1)+' <span class="sub">'+LIFTS[l]+'</span></div>'+slotSelects('b',i,'Assistance')});
    h+='</section><section class="card"><h3>Next workout</h3>'+
      '<div class="field"><label for="cyc">Cycle</label>'+num('cyc',b.cycle,1)+'</div>'+
      '<div class="field"><label for="wk">Week</label><select id="wk" data-in="wk">'+WEEKNAME.map((n,i)=>(i<3||b.deload)?'<option value="'+i+'"'+(i===b.week?' selected':'')+'>'+(i+1)+' · '+n+'</option>':'').join('')+'</select></div>'+
      '<div class="field"><label for="bday">Day</label><select id="bday" data-in="bday">'+BBB_DAYS.map((l,i)=>'<option value="'+i+'"'+(i===b.day?' selected':'')+'>'+(i+1)+' · '+LIFTS[l]+'</option>').join('')+'</select></div></section>';
    h+='<section class="card"><details><summary>How Boring But Big progresses</summary><ul>'+
      '<li>Main lift follows 5/3/1: week 1 is 65/75/85% × 5, week 2 is 70/80/90% × 3, week 3 is 75/85/95% × 5/3/1. The last set is AMRAP.</li>'+
      '<li>Then 5×10 of the same lift at your chosen % of training max, plus assistance.</li>'+
      '<li>After each cycle, training maxes rise '+fmtN(incFor('bench'))+' '+U()+' for bench/press and '+fmtN(incFor('squat'))+' '+U()+' for squat/deadlift.</li></ul></details></section>';
  }
  h+='<section class="card"><h3>Backup</h3><p class="hint">Your workouts live only on this phone. Save a backup now and then (it goes to Downloads), and use Restore to load one back, for example on a new phone.</p>'+
    '<div class="row"><button class="btn small" data-act="backup">Save backup</button><button class="btn small ghost" data-act="restore">Restore from backup</button></div>'+
    '<input type="file" id="restorefile" accept=".json,application/json" hidden>'+(ui.dataMsg?'<div class="hint">'+esc(ui.dataMsg)+'</div>':'')+'</section>';
  h+='<section class="card"><h3>Data</h3><p class="hint">'+syncText()+'. '+(st.current&&anyLogged(st.current)?'Weight changes here apply from your next workout.':'')+'</p>'+
    (ui.confirmReset?'<div>Erase all weights and history and start over?</div><div class="row"><button class="btn danger small" data-act="reset-yes">Erase everything</button><button class="btn ghost small" data-act="reset-no">Cancel</button></div>'
                    :'<div class="row"><button class="btn ghost small" data-act="reset">Start over</button></div>')+'</section>';
  return h;
}

/* ---------- input handling ---------- */
function fixPick(){const c=st.current;if(!c)return;const fresh=buildWorkout().ex;c.ex.forEach((e,i)=>{if(e.pick&&fresh[i]&&!fresh[i].pick)c.ex[i]=fresh[i]})}
function touched(){st.example=false; if(st.current&&!anyLogged(st.current)){const t0=st.current.started;st.current=buildWorkout();st.current.started=t0} save()}
document.addEventListener('change',ev=>{
  const id=ev.target.dataset.in; if(!id) return;
  if(id.startsWith('pk-')){const k=id.slice(3),[d,si]=k.slice(1).split('_').map(Number),val=ev.target.value;
    if(val==='__new'){ui.newFor=k;render();const el=$('newex-'+k);if(el)el.focus();return}
    slotArr(k)[d][si]=val;ui.newFor=null;fixPick();touched();render();return}
  const v=parseFloat(ev.target.value), g=st.gz, b=st.bbb;
  let [k,l]=id.split('-');
  if(k==='sw'||k==='sr'){const [,a1,a2]=id.split('-'),ei=+a1,si=+a2,e=st.current&&st.current.ex[ei],x=e&&e.sets[si];if(!x)return;
    if(isNaN(v)||v<0||v>5000){ev.target.value=k==='sw'?fmtN(x.w):x.r;return}
    if(k==='sw'){const old=x.w;x.w=v;e.sets.forEach((y,i)=>{if(i>si&&!y.d&&y.w===old){y.w=v;const el=$('sw-'+ei+'-'+i);if(el)el.value=fmtN(v)}});
      e.sets.forEach((y,i)=>{const el=$('df-'+ei+'-'+i);if(el)el.textContent=diffTxt(y)});const pl=$('pl-'+ei);if(pl)pl.innerHTML=platesLine(e)}
    else x.r=Math.round(v);
    save();return}
  if(k==='bw'||k==='br'){st.best=st.best||{};const o=st.best[l]=st.best[l]||{};o[k==='bw'?'w':'r']=isNaN(v)?0:v;ui.calcMsg='';save();render();return}
  if(isNaN(v)) return;
  if(k==='bar') st.bar=v;
  else if(k==='t1') g.t1[l].w=v; else if(k==='t1s') g.t1[l].s=v;
  else if(k==='t2'){g.t2[l].w=v;if(g.t2[l].s===0)g.t2[l].base=v} else if(k==='t2s') g.t2[l].s=v;
  else if(k==='t3w'){const x=t3item(l);if(x)x.w=v} else if(k==='gzday'){g.day=v;st.current=null}
  else if(k==='tm') b.tm[l]=v; else if(k==='aw') b.accw[l]=v;
  else if(k==='pct') b.pct=v; else if(k==='deload'){b.deload=!!v;if(!b.deload&&b.week===3)b.week=0}
  else if(k==='cyc') b.cycle=Math.max(1,Math.round(v)); else if(k==='wk'){b.week=v;st.current=null} else if(k==='bday'){b.day=v;st.current=null}
  touched(); render();
});
document.addEventListener('click',ev=>{
  const t=ev.target.closest('[data-act]'); if(!t) return;
  const a=t.dataset.act, ei=+t.dataset.ei, si=+t.dataset.si;
  ensureAudio();
  if(a==='view'){ui.view=t.dataset.v;ui.edit=null;ui.confirmReset=false;ui.report=false;ui.showCsv=false;render();scrollTo(0,0);return}
  if(a==='start'){st.current=buildWorkout();st.current.started=Date.now();ui.edit=null;wake();save();render();scrollTo(0,0);return}
  if(a==='done'){const e=st.current&&st.current.ex[ei],x=e&&e.sets[si];if(!x)return;
    x.d=!x.d;
    if(x.d){if(st.current.ex.some(y=>y.sets.some(z=>!z.d)))startTimer(e.rest||90,nameOf(e.lift));ui.rpe={ei,si,v:x.rpe}}
    save();render();return}
  if(a==='rpe'){const x=st.current&&st.current.ex[ei]&&st.current.ex[ei].sets[si];if(!x)return;ui.rpe={ei,si,v:x.rpe};render();return}
  if(a==='rpechip'){if(ui.rpe){ui.rpe.v=+t.dataset.v;render()}return}
  if(a==='rpesave'||a==='rpeclear'){const R=ui.rpe,x=R&&st.current&&st.current.ex[R.ei].sets[R.si];if(x)x.rpe=a==='rpeclear'?null:R.v;ui.rpe=null;save();render();return}
  if(a==='rpeskip'){ui.rpe=null;render();return}
  if(a==='addset'){const e=st.current&&st.current.ex[ei];if(!e)return;const L=e.sets[e.sets.length-1];
    e.sets.push(L?{w:L.w,tw:L.tw,t:L.t,a:false,r:L.t,d:false,rpe:null}:{w:e.tgt,tw:e.tgt,t:e.t0||10,a:false,r:e.t0||10,d:false,rpe:null});save();render();return}
  if(a==='rmset'){const e=st.current&&st.current.ex[ei];if(!e||!e.sets.length)return;let i=-1;for(let j=e.sets.length-1;j>=0;j--)if(!e.sets[j].d){i=j;break}
    e.sets.splice(i<0?e.sets.length-1:i,1);save();render();return}
  if(a==='end'){ui.ending=true;ui.confirmDiscard=false;render();return}
  if(a==='end-cancel'){ui.ending=false;ui.confirmDiscard=false;render();return}
  if(a==='wedit'){ui.edit=ui.edit===ei?null:ei;render();return}
  if(a==='w+'||a==='w-'){
    const live=!!st.current, w=live?st.current:buildWorkout(), e=w.ex[ei]; if(!e||!e.edit) return;
    const curT=e.sets.length?e.sets[0].tw:e.tgt, nw=Math.max(0,curT+(a==='w+'?1:-1)*stepW());
    if(e.edit==='acc') st.bbb.accw[e.lift]=nw;
    else if(e.edit==='t3'){const x=t3item(e.lift);if(x)x.w=nw}
    else{const o=st.gz[e.edit][e.lift];o.w=nw;if(e.edit==='t2'&&o.s===0)o.base=nw}
    if(live){e.tgt=nw;e.sets.forEach(x=>{if(!x.d&&x.w===x.tw)x.w=nw;x.tw=nw})}
    st.example=false;save();render();return;
  }
  if(a==='addt3'){const d=t.dataset.d,inp=$('newex-'+d),name=inp?inp.value.trim().slice(0,40):'';
    if(!name){if(inp)inp.focus();return}
    const id='x'+Date.now().toString(36);st.gz.t3list.push({id,name,w:0});
    if(d!=='all'){const [di,si]=d.slice(1).split('_').map(Number);slotArr(d)[di][si]=id}ui.newFor=null;fixPick();touched();render();return}
  if(a==='rmt3'){const id=t.dataset.id;st.gz.t3list=st.gz.t3list.filter(x=>x.id!==id);st.gz.t3day=st.gz.t3day.map(p=>p.map(x=>x===id?'':x));st.bbb.accday=st.bbb.accday.map(p=>p.map(x=>x===id?'':x));delete st.bbb.accw[id];touched();render();return}
  if(a==='htier'){ui.htier=t.dataset.t;render();return}
  if(a==='applycalc'){const done=[];MAIN4.forEach(l=>{const c=calcFor(l);if(!c)return;
      st.gz.t1[l].w=c.t1;st.gz.t1[l].s=0;st.gz.t2[l].w=c.t2;st.gz.t2[l].s=0;st.gz.t2[l].base=c.t2;st.bbb.tm[l]=c.tm;done.push(LIFTS[l])});
    ui.calcMsg='Updated '+done.join(', ')+'.';touched();render();return}
  if(a==='logall'){ui.logAll=true;render();return}
  if(a==='report'){ui.report=true;render();scrollTo(0,0);return}
  if(a==='report-close'){ui.report=false;render();return}
  if(a==='copycsv'){const csv=reportCSV();
    const done=m=>{const el=$('csvmsg');if(el)el.textContent=m};
    try{navigator.clipboard.writeText(csv).then(()=>done('Copied. Paste it into a spreadsheet.'),()=>{ui.showCsv=true;render()})}catch(e){ui.showCsv=true;render()}
    return}
  if(a==='savecsv'){downloadFile('iron-cycle-report.csv',reportCSV(),'text/csv');return}
  if(a==='backup'){downloadFile('iron-cycle-backup-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(st),'application/json');ui.dataMsg='Backup saved to your Downloads folder.';render();return}
  if(a==='restore'){$('restorefile').click();return}
  if(a==='finish'){finish();return}
  if(a==='discard'){ui.confirmDiscard=true;render();return}
  if(a==='discard-no'){ui.confirmDiscard=false;render();return}
  if(a==='discard-yes'){st.current=null;ui.confirmDiscard=false;ui.ending=false;ui.rpe=null;stopTimer();save();render();scrollTo(0,0);return}
  if(a==='prog'){if(st.program!==t.dataset.p){if(st.current&&anyLogged(st.current)){ui.dataMsg='';ui.progMsg='Finish or discard the workout in progress before switching programs.';render();return}st.program=t.dataset.p;st.current=null;ui.progMsg='';save();render()}return}
  if(a==='units'){setUnits(t.dataset.u);return}
  if(a==='reset'){ui.confirmReset=true;render();return}
  if(a==='reset-no'){ui.confirmReset=false;render();return}
  if(a==='reset-yes'){const p=st.program;st=defaults();st.program=p;ui.confirmReset=false;stopTimer();save();render();return}
  if(a==='t+30'){timer.end+=30000;timer.total+=30;tick();return}
  if(a==='t-30'){timer.end-=30000;tick();return}
  if(a==='tskip'){stopTimer();return}
});
function setUnits(u){
  if(st.units===u) return;
  const f=u==='kg'?0.45359237:1/0.45359237; st.units=u;
  const r=x=>x===0?0:rnd(x*f), g=st.gz, b=st.bbb;
  st.bar=u==='kg'?20:45;
  for(const l in g.t1) g.t1[l].w=r(g.t1[l].w);
  for(const l in g.t2){g.t2[l].w=r(g.t2[l].w);g.t2[l].base=r(g.t2[l].base||g.t2[l].w)}
  for(const x of g.t3list) x.w=r(x.w);
  for(const l in b.tm) b.tm[l]=r(b.tm[l]);
  for(const l in b.accw) b.accw[l]=r(b.accw[l]);
  st.current=null; save(); render();
}

/* ---------- rest timer ---------- */
const timer={end:0,total:0,label:'',iv:null,beeped:false};
function startTimer(sec,label){timer.end=Date.now()+sec*1000;timer.total=sec;timer.label=label;timer.beeped=false;$('timer').hidden=false;clearInterval(timer.iv);timer.iv=setInterval(tick,250);tick()}
function stopTimer(){clearInterval(timer.iv);timer.iv=null;$('timer').hidden=true}
function tick(){
  const left=Math.round((timer.end-Date.now())/1000), over=left<=0, s=Math.abs(left);
  $('clock').textContent=(over&&s>0?'+':'')+Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
  $('tlab').textContent=over?'Rest done. Next set.':'Rest · '+timer.label;
  $('timer').classList.toggle('over',over);
  $('tbar').style.width=Math.max(0,Math.min(100,100*(1-left/timer.total)))+'%';
  if(over&&!timer.beeped){timer.beeped=true;beep()}
  if(left<-300) stopTimer();
}
let actx=null;
function ensureAudio(){try{actx=actx||new(window.AudioContext||window.webkitAudioContext)();if(actx.state==='suspended')actx.resume()}catch(e){}}
function beep(){
  try{navigator.vibrate&&navigator.vibrate([200,100,200])}catch(e){}
  if(!actx) return;
  try{[0,.28,.56].forEach(t=>{const o=actx.createOscillator(),g=actx.createGain(),n=actx.currentTime+t;o.frequency.value=880;o.connect(g);g.connect(actx.destination);g.gain.setValueAtTime(.0001,n);g.gain.exponentialRampToValueAtTime(.3,n+.02);g.gain.exponentialRampToValueAtTime(.0001,n+.2);o.start(n);o.stop(n+.22)})}catch(e){}
}
let lock=null;
async function wake(){try{if(navigator.wakeLock&&!lock){lock=await navigator.wakeLock.request('screen');lock.addEventListener('release',()=>{lock=null})}}catch(e){}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){if(st.current)wake();if(timer.iv)tick()}});

/* ---------- saving: this phone ---------- */
function save(){st.updatedAt=Date.now();saveLocal()}
function downloadFile(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000)}
document.addEventListener('change',ev=>{if(ev.target.id!=='restorefile')return;const f=ev.target.files&&ev.target.files[0];if(!f)return;if(f.size>3e6){ui.dataMsg='That file is too large to be an Iron Cycle backup.';render();return}
  const rd=new FileReader();rd.onload=()=>{try{const d=cleanBackup(JSON.parse(rd.result));st=migrate(d);save();ui.dataMsg='Restored '+st.log.length+' workouts from '+f.name+'.'}catch(e){ui.dataMsg='That file isn\u2019t an Iron Cycle backup. Pick a file named iron-cycle-backup-….json.'}render()};rd.readAsText(f)});
setInterval(()=>{const el=$('elapsed');if(el&&st.current)el.textContent=fmtDur(Date.now()-(st.current.started||Date.now()))},1000);
render();
try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}
if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
