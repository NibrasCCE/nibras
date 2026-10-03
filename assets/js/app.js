/* =====================================================================
   نبراس · منطق الواجهة (الصفحات، لعبة التشخيص، المسار، الشات، صفحة الأهالي)
   يعتمد على: data.js (المحتوى) · engine.js (التصحيح) · backend.js (الحسابات + AI)
   ===================================================================== */
(function(){
"use strict";
const $=(s,el=document)=>el.querySelector(s);
const app=$("#app");
const LV=Object.fromEntries(LEVELS.map(l=>[l.id,l]));
const skillById=Object.fromEntries(SKILLS.map(s=>[s.id,s]));
const misById=Object.fromEntries(MIS.map(m=>[m.id,m]));
const qById=Object.fromEntries(QS.map(q=>[q.id,q]));
const SK_LV=Object.fromEntries(LEVELS.map(l=>[l.id,SKILLS.filter(s=>s.lv===l.id).map(s=>s.id)]));
const DIAG_PICK={s5a:["q5a1","q5a2"],s5b:["q5b1","q5b2"],s5c:["q5c1","q5c2"],s6a:["q6a2","q6a1"],s6b:["q6b2","q6b1"],s6c:["q6c2","q6c1"],s7a:["q7a2","q7a1"],s7b:["q7b1","q7b2"],s7c:["q7c2","q7c1"],s7d:["q7d2","q7d5"]};
const LET=["أ","ب","ج","د"];
const DAILY_LIMIT=30, MASTER_STREAK=3;


/* Nibras mark, traced from the team's logo file: short-left N, child on the tall stem raising a lightbulb */
function markShapes(fill,bulb,glow){
  return `${glow?`<circle cx="348.5" cy="121" r="24" fill="${glow}" opacity=".45"/>`:""}
  <g fill="${fill}">
    <rect x="158" y="275" width="42" height="106" rx="2"/>
    <polygon points="196,272.6 199,275 291,347.4 291,381 289,381 199,307.7 196,305"/>
    <rect x="291" y="208" width="42" height="173" rx="2"/>
    <circle cx="309.5" cy="151.5" r="15.6"/>
    <rect x="298" y="174" width="24" height="21" rx="3"/>
    <rect x="299" y="192" width="8.6" height="14" rx="2.5"/><rect x="312" y="192" width="8.6" height="14" rx="2.5"/>
    <rect x="340.5" y="139.5" width="17" height="6.5" rx="2"/>
  </g>
  <path d="M319 175 340 146" stroke="${fill}" stroke-width="9" stroke-linecap="round"/>
  <circle cx="348.5" cy="121" r="16" fill="${bulb}"/>`;
}
const LOGO=`<svg class="logo" viewBox="150 92 560 296" role="img" aria-label="Nibras نبراس">${markShapes("var(--logo)","#F4A62A","#FFD166")}<text x="350" y="381" fill="var(--logo)" font-family="Nunito, ui-rounded, sans-serif" font-weight="900" font-size="150" textLength="352" lengthAdjust="spacingAndGlyphs" direction="ltr" style="direction:ltr">ibras</text></svg>`;
const ICON=`<svg viewBox="146 88 240 300" aria-hidden="true">${markShapes("#FFFFFF","#FFFFFF",null)}</svg>`;
const LANTERN=(cls)=>`<svg class="ln ${cls}" viewBox="0 0 26 34" aria-hidden="true"><rect x="9" y="1" width="8" height="3" rx="1.2" fill="var(--ink-3)"/><path class="b" d="M5 5h16l-2.5 22h-11z" stroke-width="1.5"/><circle cx="13" cy="15" r="4"/><rect x="7" y="28" width="12" height="4" rx="1.5" fill="var(--ink-3)"/></svg>`;
/* light/night switch — cream is the default; the choice stays on this device */
const MOON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>';
const SUN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
function setMode(night,keep){
  if(night)document.documentElement.setAttribute("data-nb","night");else document.documentElement.removeAttribute("data-nb");
  const b=document.getElementById("mode");
  b.innerHTML=night?SUN:MOON;
  b.setAttribute("aria-label",night?"رجّع الوضع النهاري":"شغّل الوضع الليلي");
  b.title=night?"الوضع النهاري":"الوضع الليلي";
  b.setAttribute("aria-pressed",String(night));
  if(keep){try{localStorage.setItem("nibras.mode",night?"night":"day");}catch(e){}}
}
let night0=false;try{night0=localStorage.getItem("nibras.mode")==="night";}catch(e){}
setMode(night0,false);
document.getElementById("mode").onclick=()=>setMode(!document.documentElement.hasAttribute("data-nb"),true);
$("#brandlink").innerHTML=LOGO.replace('class="logo"','');



const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const RUN=/[A-Za-z0-9▢(−\-|][A-Za-z0-9²³⁴⁵ ×÷=+\-−().\/▢|%]*(?:=\s*[؟▢]|[A-Za-z0-9²³⁴⁵)▢|%])|[A-Za-z▢]/g;
function mathify(raw){
  raw=String(raw); let out="",last=0,m; RUN.lastIndex=0;
  while((m=RUN.exec(raw))){
    const t=m[0]; out+=esc(raw.slice(last,m.index));
    out+=/[A-Za-z=+−×÷²³⁴⁵▢|%]|\d\s*[-−]\s*\d|\d\/\d|\d\.\d|^−\d/.test(t)?`<span class="m">${esc(t)}</span>`:esc(t);
    last=m.index+t.length;
  }
  return out+esc(raw.slice(last));
}
function tex(t){
  try{ if(window.katex) return `<span class="m">${katex.renderToString(t,{output:"mathml",throwOnError:false})}</span>`; }catch(e){}
  return `<span class="m">${esc(t)}</span>`;
}
function inline(s){
  return String(s).split(/(\$[^$\n]+\$)/g).map(p=>/^\$[^$]+\$$/.test(p)?tex(p.slice(1,-1)):mathify(p)).join("").replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>");
}
function md(text){
  const lines=String(text).split("\n"); let html="",list=null,para=[];
  const fp=()=>{if(para.length){html+=`<p>${para.map(inline).join("<br>")}</p>`;para=[];}};
  const fl=()=>{if(list){html+=`<${list.t}>${list.items.map(i=>`<li>${inline(i)}</li>`).join("")}</${list.t}>`;list=null;}};
  for(const ln of lines){
    const o=ln.match(/^\s*(\d+)[.)]\s+(.*)$/),u=ln.match(/^\s*[-•*]\s+(.*)$/);
    if(o){fp();if(!list||list.t!=="ol"){fl();list={t:"ol",items:[]};}list.items.push(o[2]);}
    else if(u){fp();if(!list||list.t!=="ul"){fl();list={t:"ul",items:[]};}list.items.push(u[1]);}
    else if(!ln.trim()){fp();fl();}
    else{fl();para.push(ln);}
  }
  fp();fl();return html;
}
const today=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");};
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
function toast(msg){const t=$("#toast");t.textContent=msg;t.hidden=false;clearTimeout(toast._t);toast._t=setTimeout(()=>t.hidden=true,2600);}
function spark(el,txt){
  if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  const r=el.getBoundingClientRect(),s=document.createElement("span");
  s.className="spark";s.textContent=txt||"✦";s.style.left=(r.left+r.width/2-8)+"px";s.style.top=(r.top-6)+"px";
  document.body.appendChild(s);setTimeout(()=>s.remove(),1000);
}



/* ---------- sound (tiny WebAudio blips; starts only after a tap) ---------- */
let soundOn=true;try{soundOn=localStorage.getItem("nibras.sound")!=="off";}catch(e){}
let actx=null;
function beep(kind){
  if(!soundOn)return;
  try{
    actx=actx||new (window.AudioContext||window.webkitAudioContext)();
    const notes={pop:[[620,.06],[880,.06]],ding:[[660,.09],[990,.14]],soft:[[300,.12]],win:[[523,.1],[659,.1],[784,.1],[1047,.18]]}[kind]||[[500,.08]];
    let t=actx.currentTime;
    for(const [f,d] of notes){
      const o=actx.createOscillator(),g=actx.createGain();o.type="sine";o.frequency.value=f;
      g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.14,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+d);
      o.connect(g).connect(actx.destination);o.start(t);o.stop(t+d+.02);t+=d*.9;
    }
  }catch(e){}
}
const SND_ON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
const SND_OFF='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="m17 9 5 6M22 9l-5 6"/></svg>';
function paintSnd(){const b=$("#snd");b.innerHTML=soundOn?SND_ON:SND_OFF;b.setAttribute("aria-label",soundOn?"اكتم الأصوات":"شغّل الأصوات");b.title=b.getAttribute("aria-label");b.setAttribute("aria-pressed",String(soundOn));}
paintSnd();
$("#snd").onclick=()=>{soundOn=!soundOn;try{localStorage.setItem("nibras.sound",soundOn?"on":"off");}catch(e){}paintSnd();if(soundOn)beep("pop");};

/* ---------- avatars (original simple characters) ---------- */
const AVATARS=[
  {id:"cat",name:"قطّة",bg:"#FFE3B3",face:"#F4A62A",ears:"tri"},
  {id:"bear",name:"دبدوب",bg:"#E7EDFC",face:"#B07A4F",ears:"round"},
  {id:"bunny",name:"أرنوب",bg:"#FCE4EC",face:"#FFFFFF",ears:"long"},
  {id:"owl",name:"بومة",bg:"#E0EED6",face:"#8D6E63",ears:"owl"},
  {id:"frog",name:"ضفدوع",bg:"#DDF3E8",face:"#4CAF50",ears:"frog"},
  {id:"lion",name:"أسد",bg:"#FFF4D6",face:"#F6C453",ears:"mane"},
  {id:"fox",name:"ثعلوب",bg:"#FFE0CC",face:"#F08A3C",ears:"tri"},
  {id:"star",name:"نجمة",bg:"#1D3A8A",face:"#FFD166",ears:"star"}
];
const avById=Object.fromEntries(AVATARS.map(a=>[a.id,a]));
function avatar(id){
  const a=avById[id]||AVATARS[0],k="#14234F";let ears="",face=`<circle cx="32" cy="36" r="17" fill="${a.face}"/>`;
  if(a.ears==="tri")ears=`<path d="M17 28 20 12 30 22z M47 28 44 12 34 22z" fill="${a.face}"/>`;
  if(a.ears==="round")ears=`<circle cx="18" cy="22" r="7" fill="${a.face}"/><circle cx="46" cy="22" r="7" fill="${a.face}"/>`;
  if(a.ears==="long")ears=`<ellipse cx="24" cy="14" rx="5" ry="12" fill="${a.face}" stroke="#F3B5C6" stroke-width="2"/><ellipse cx="40" cy="14" rx="5" ry="12" fill="${a.face}" stroke="#F3B5C6" stroke-width="2"/>`;
  if(a.ears==="owl")ears=`<path d="M16 24 19 14 27 21z M48 24 45 14 37 21z" fill="${a.face}"/>`;
  if(a.ears==="frog")ears=`<circle cx="22" cy="22" r="8" fill="${a.face}"/><circle cx="42" cy="22" r="8" fill="${a.face}"/>`;
  if(a.ears==="mane")ears=`<circle cx="32" cy="36" r="24" fill="#E08E2B"/>`;
  if(a.ears==="star"){face=`<path d="M32 12l6.5 13.2 14.5 2.1-10.5 10.2 2.5 14.5L32 45.2 19 52l2.5-14.5L11 27.3l14.5-2.1z" fill="${a.face}"/>`;}
  let eyes=`<circle cx="25" cy="34" r="2.6" fill="${k}"/><circle cx="39" cy="34" r="2.6" fill="${k}"/>`;
  if(a.ears==="owl")eyes=`<circle cx="25" cy="34" r="6.5" fill="#fff"/><circle cx="39" cy="34" r="6.5" fill="#fff"/><circle cx="25" cy="34" r="3" fill="${k}"/><circle cx="39" cy="34" r="3" fill="${k}"/><path d="M30 40h4l-2 4z" fill="#F4A62A"/>`;
  if(a.ears==="frog")eyes=`<circle cx="22" cy="22" r="4" fill="#fff"/><circle cx="42" cy="22" r="4" fill="#fff"/><circle cx="22" cy="22" r="2" fill="${k}"/><circle cx="42" cy="22" r="2" fill="${k}"/>`;
  const extra=a.id==="cat"||a.id==="fox"?`<path d="M14 38h8M14 42h8M42 38h8M42 42h8" stroke="${k}" stroke-width="1.4" stroke-linecap="round"/>`:"";
  const cheeks=a.id==="fox"?`<path d="M18 40c4 8 10 10 14 10s10-2 14-10c-6 3-10 3-14 3s-8 0-14-3z" fill="#fff"/>`:"";
  const smile=`<path d="M27 42q5 4 10 0" fill="none" stroke="${k}" stroke-width="2.2" stroke-linecap="round"/>`;
  return `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="32" fill="${a.bg}"/>${ears}${face}${cheeks}${eyes}${a.ears==="owl"?"":smile}${extra}</svg>`;
}
const FROG='<svg viewBox="0 0 52 52" aria-hidden="true"><ellipse cx="26" cy="36" rx="18" ry="12" fill="#4CAF50"/><circle cx="17" cy="22" r="8" fill="#4CAF50"/><circle cx="35" cy="22" r="8" fill="#4CAF50"/><circle cx="17" cy="22" r="4.5" fill="#fff"/><circle cx="35" cy="22" r="4.5" fill="#fff"/><circle cx="18" cy="22" r="2.2" fill="#14234F"/><circle cx="34" cy="22" r="2.2" fill="#14234F"/><path d="M19 38q7 5 14 0" fill="none" stroke="#14234F" stroke-width="2" stroke-linecap="round"/></svg>';

/* ---------- accounts: window.Store (backend.js) = local demo OR Supabase ---------- */
let S=null,READY=false,GUEST_S=null;
const ME=()=>Store.me();
/* guest teacher: tries the chat only; nothing is saved (the conversation lives in memory) */
const isGuest=()=>{const u=ME();return !!(u&&u.role==="teacher");};
const guestProgress=()=>({diag:null,lit:{},streak:{},detected:{},chat:{turns:[],day:"",count:0},events:[]});
function bindSession(){
  const u=ME();
  if(u&&u.role==="teacher"){S=GUEST_S||(GUEST_S=guestProgress());return;}
  GUEST_S=null;S=u&&u.role==="student"?Store.progress():null;
}
const save=()=>Store.save();
function parseIdent(raw){
  const s=String(raw||"").trim().replace(/[٠-٩]/g,d=>String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))return{kind:"email",v:s.toLowerCase()};
  const d=s.replace(/[\s\-()]/g,"");
  if(/^\+?\d{9,15}$/.test(d)){let v=d.replace(/^\+/,"").replace(/^00/,"").replace(/^(970|972)/,"0");if(!v.startsWith("0"))v="0"+v;return{kind:"phone",v};}
  return null;
}

/* ---------- learning state helpers ---------- */
function bump(mid){if(S&&misById[mid])S.detected[mid]=(S.detected[mid]||0)+1;}
const statusOf=(p,sid)=>p.diag?p.diag.skills[sid]:null;
const isLitP=(p,sid)=>!!p.lit[sid]||["mastered","assumed"].includes(statusOf(p,sid));
const isLit=sid=>isLitP(S,sid);
const currentSkillP=p=>SKILLS.find(s=>!isLitP(p,s.id))||null;
const currentSkill=()=>currentSkillP(S);
const litCount=(p,lv)=>(lv?SK_LV[lv]:SKILLS.map(s=>s.id)).filter(id=>isLitP(p,id)).length;
const STATUS={mastered:["متمكّن","lit"],assumed:["ثابتة","good"],partial:["بدها تقوية","calm"],gap:["رح نشتغل عليها","calm"],untested:["لسا ما وصلناها","plain"]};
const fmtDate=iso=>{try{return new Date(iso).toLocaleDateString("ar-PS-u-nu-latn",{day:"numeric",month:"long"});}catch(e){return String(iso).slice(0,10);}};
const fmtTime=iso=>{try{return new Date(iso).toLocaleString("ar-PS-u-nu-latn",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});}catch(e){return String(iso).slice(0,16);}};
const fmtN=k=>k<0?"−"+Math.abs(k):String(k);

/* ---------- parent notifications (simulated sending) ---------- */
function composeMsg(stu,kind,extra,ch){
  const p=stu.progress,nick=stu.nick,d=p.diag;
  const lines=[];let subject="";
  if(kind==="diag"&&d){
    const start=d.start?skillById[d.start]:null;
    const good=SKILLS.filter(s=>d.skills[s.id]==="mastered").map(s=>s.title);
    const weak=SKILLS.filter(s=>["partial","gap"].includes(d.skills[s.id])).map(s=>s.title);
    const ideas=Object.keys(d.mis||{}).map(id=>misById[id].title);
    subject=`نبراس · تقرير التشخيص الأولي لـ ${nick}`;
    if(ch==="sms")return{subject,body:`نبراس: ${nick} خلّص التشخيص الأولي. ${start?`البداية من «${start.title}» (${LV[start.lv].name}).`:"متمكّن من كل المهارات المختبرة."} التفاصيل بصفحة الأهالي.`};
    lines.push("مرحباً،",`${nick} خلّص لعبة التشخيص الأولي على نبراس بتاريخ ${fmtDate(d.at||new Date().toISOString())}.`,"");
    lines.push(`• المستوى الحالي: ${start?LV[start.lv].name:"فوق كل المستويات المختبرة"}`);
    if(start)lines.push(`• نقطة البداية: ${start.title}`);
    lines.push(`• متمكّن من: ${good.length?good.join("، "):"—"}`);
    if(weak.length)lines.push(`• بحاجة لتقوية: ${weak.join("، ")}`);
    if(ideas.length)lines.push(`• أفكار رح نشتغل عليها: ${ideas.join("، ")}`);
    lines.push("","التقرير الكامل بصفحة الأهالي على نبراس.");
  }else if(kind==="skill"){
    const s=skillById[extra.skill];
    subject=`نبراس · ${nick} أتقن مهارة جديدة`;
    if(ch==="sms")return{subject,body:`نبراس: مبروك! ${nick} أتقن «${s.title}». صار ضاوي ${litCount(p)} من ${SKILLS.length} فوانيس.`};
    lines.push("مبروك!",`${nick} أتقن مهارة «${s.title}» (${LV[s.lv].name}) بعد ${MASTER_STREAK} إجابات صحيحة متتالية من أول محاولة.`,`صار ضاوي ${litCount(p)} من ${SKILLS.length} فوانيس بمساره.`);
  }else if(kind==="level"){
    const l=LV[extra.level],nx=currentSkillP(p);
    subject=`نبراس · ${nick} أنهى ${l.name}`;
    if(ch==="sms")return{subject,body:`نبراس: إنجاز! ${nick} أنهى كل مهارات ${l.name}.`};
    lines.push("إنجاز كبير!",`${nick} أتقن كل مهارات ${l.name}: ${SK_LV[l.id].map(id=>skillById[id].title).join("، ")}.`,nx?`المحطة الجاية: ${nx.title}.`:"أنهى كل محطات المسار.");
  }else if(kind==="link"){
    subject=`نبراس · تم ربط حساب ${nick}`;
    const st=d?(d.start?`نقطة البداية حالياً: ${skillById[d.start].title}.`:"متمكّن من كل المهارات المختبرة."):"لسا ما لعب لعبة التشخيص.";
    if(ch==="sms")return{subject,body:`نبراس: تم ربط حساب ${nick} بحسابك. ${st}`};
    lines.push(`تم ربط حساب ${nick} بحسابك على نبراس.`,st,`الفوانيس المضاءة: ${litCount(p)} من ${SKILLS.length}.`);
  }
  lines.push("","(نموذج تجريبي، والمحتوى مسودة بانتظار مراجعة معلم رياضيات.)");
  return{subject,body:lines.join("\n")};
}
/* The parent's message list is built from the student's own progress events.
   With real accounts (Supabase) the same message is also sent by e-mail through the
   "nibras-notify" Edge Function (see notifyParents below). SMS is still simulated. */
function buildOutbox(par,kids){
  const pr=par.prefs||{},ch=pr.channel==="sms"?"sms":"email",to=ch==="sms"?(pr.phone||""):(pr.email||"");
  const out=[];
  for(const k of kids){
    const evs=(k.progress.events||[]).slice();
    const lastDiag=evs.map(e=>e.kind).lastIndexOf("diag");
    const list=[{at:k.linkedAt,kind:"link"}].concat(evs.filter((e,i)=>e.kind!=="diag"||i===lastDiag));
    for(const e of list){
      if(!e.at)continue;
      if(e.kind!=="link"&&!pr[e.kind])continue;
      if(e.kind==="diag"&&!k.progress.diag)continue;
      if(e.kind==="skill"&&!skillById[e.skill])continue;
      if(e.kind==="level"&&!LV[e.level])continue;
      const m=composeMsg(k,e.kind,e,ch);
      out.push({id:k.id+"|"+e.kind+"|"+e.at,at:e.at,kind:e.kind,channel:ch,to,subject:m.subject,body:m.body,stu:k.id});
    }
  }
  const t=x=>{const v=Date.parse(x);return isNaN(v)?0:v;};
  return out.sort((a,b)=>t(b.at)-t(a.at)).slice(0,30);
}
function logEvent(kind,extra){S.events=S.events||[];S.events.push(Object.assign({at:new Date().toISOString(),kind},extra||{}));S.events=S.events.slice(-80);}
/* Real e-mail to the linked parents. The server finds the parents and respects their
   settings; the student never sees a parent's address. Fails quietly (see the console). */
function notifyParents(kind,extra){
  try{
    if(typeof Store.notify!=="function")return;
    const u=ME();if(!u||u.role!=="student"||!S)return;
    const m=composeMsg({nick:u.nick,progress:S},kind,extra||{},"email");
    if(m&&m.subject&&m.body)Store.notify(kind,m.subject,m.body);
  }catch(e){console.warn("[nibras-notify]",e);}
}
function markLit(sid){
  if(S.lit[sid])return;
  S.lit[sid]=true;const s=skillById[sid];
  logEvent("skill",{skill:sid});
  toast("ضوّيت فانوس «"+s.title+"»!");beep("win");
  if(SK_LV[s.lv].every(id=>isLit(id))&&!S.events.some(e=>e.kind==="level"&&e.level===s.lv)){
    logEvent("level",{level:s.lv});
    setTimeout(()=>toast("أنهيت "+LV[s.lv].name+"!"),2700);
    notifyParents("level",{level:s.lv}); /* one e-mail for the level, not a second one for its last skill */
  }else notifyParents("skill",{skill:sid});
  save();
}

/* ---------- navigation ---------- */
const TAB_IC={
  path:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5"/></svg>',
  play:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6M10 3v3h4V3"/><path d="M7 6h10l-1.5 13h-7z"/><path d="M12 11v4"/></svg>',
  ask:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 5h16v11H10l-5 4v-4H4z"/><path d="M9 10.5h.01M12 10.5h.01M15 10.5h.01" stroke-linecap="round" stroke-width="2.6"/></svg>',
  me:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>'
};
const TABS=[["play","التشخيص","play"],["path","مساري","path"],["ask","اسأل نبراس","ask"],["me","حسابي","me"]];
const route=()=>location.hash.replace(/^#/,"")||"home";
function tabOf(r){if(r.startsWith("skill-"))return"path";if(r==="result")return"play";return r;}
function renderNav(){
  const u=ME(),t=tabOf(route());
  const tabs=u&&u.role==="student"?TABS:[];
  document.body.classList.toggle("has-tabs",tabs.length>0);
  $("#nav").innerHTML=tabs.filter(x=>x[0]!=="me").map(([id,l])=>`<a href="#${id}"${t===id?' aria-current="page"':""}>${l}</a>`).join("");
  $("#tabbar").style.gridTemplateColumns=`repeat(${tabs.length||1},1fr)`;
  $("#tabbar").innerHTML=tabs.map(([id,l,ic])=>`<a href="#${id}"${t===id?' aria-current="page"':""}><span class="ic">${TAB_IC[ic]}</span><span>${l}</span></a>`).join("");
  const me=$("#me");
  if(!u){me.hidden=true;return;}
  me.hidden=false;
  if(u.role==="student"){me.innerHTML=`<span class="avatar-sm">${avatar(u.avatar)}</span><span>${esc(u.nick)}</span>`;me.onclick=()=>{location.hash="#me";};}
  else{me.innerHTML=`<span class="dot">${esc((u.name||(u.role==="teacher"?"م":"و")).slice(0,1))}</span><span>خروج</span>`;me.onclick=logout;}
}
async function logout(){if(CHAT.ctl)CHAT.ctl.abort();if(isGuest()&&typeof Store.endGuest==="function")await Store.endGuest();else await Store.logout();S=null;GUEST_S=null;G=null;P=null;PV.kids=null;PV.err="";CHAT.err="";REP.fail=null;location.hash="#home";render();toast("سجّلت خروج");}
function render(){
  if(!READY)return;
  bindSession();renderNav();
  const u=ME(),r=route();
  if(!u){if(r==="auth-student")return vAuth("student");if(r==="auth-parent")return vAuth("parent");return vLanding();}
  if(u.role==="parent")return vParent();
  if(u.role==="teacher"){if(r!=="ask"){location.hash="#ask";return;}return vAsk();} /* guest teacher: chat only */
  if(r.startsWith("skill-")&&skillById[r.slice(6)])return vSkill(r.slice(6));
  ({home:vHome,play:vPlay,result:vResult,path:vPath,ask:vAsk,me:vMe}[r]||vHome)();
}
window.addEventListener("hashchange",()=>{if(G&&route()!=="play")G=null;if(P&&!route().startsWith("skill-"))P=null;render();window.scrollTo(0,0);});

/* ---------- landing ---------- */
const IC_KID='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="3.5"/><path d="M6 21v-3a6 6 0 0 1 12 0v3"/><path d="M9 14l3 3 3-3"/></svg>';
const IC_PAR='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="7" r="3"/><circle cx="17" cy="9" r="2.3"/><path d="M2.5 20c.6-3.4 2.7-5.5 5.5-5.5s4.9 2.1 5.5 5.5M14 20c.4-2.6 1.6-4.2 3.2-4.2s2.9 1.6 3.3 4.2"/></svg>';
const IC_INFO='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/></svg>';
const IC_TEACH='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M7 8.5h7M7 11.5h4M12 16v4M8 20h8"/></svg>';
function vLanding(){
  app.innerHTML=`<section class="view">
    <div class="hero">
      ${LOGO}
      <p class="tag">نبراس · تعلّم من مستواك</p>
      <p class="lead">لعبة قصيرة بتكشف من وين لازم يبلّش طالب الصف السابع بالرياضيات، حتى لو الفجوة من الخامس أو السادس. بعدها مسار إله لحاله، ونبراس جنبه يساعده يفكّر، والأهل بيتابعوا التقدّم.</p>
      <div class="roles">
        <a class="rolebtn primary" href="#auth-student">${IC_KID}<b>دخول الطلاب</b><span>العب واكتشف مستواك</span></a>
        <a class="rolebtn" href="#auth-parent">${IC_PAR}<b>دخول الأهالي</b><span>تابع تقارير ابنك أو بنتك</span></a>
        <button class="rolebtn" id="guest-teacher" type="button" style="grid-column:1/-1;font:inherit;cursor:pointer">${IC_TEACH}<b>دخول المعلمين (زائر)</b><span>جرّب المعلم الافتراضي «نبراس» بدون حساب</span></button>
      </div>
    </div>
    <div class="steps">
      <div class="step"><span class="n">1</span><div><h3>العب واكتشف مستواك</h3><p>ألغاز بشكل ألعاب على 3 جزر: الخامس والسادس والسابع.</p></div></div>
      <div class="step"><span class="n">2</span><div><h3>امشِ بمسارك</h3><p>بتبلّش من أول مهارة ناقصة، وكل مهارة بتتقنها بتضوّي فانوس.</p></div></div>
      <div class="step"><span class="n">3</span><div><h3>الأهل بيتابعوا</h3><p>تقرير التشخيص الأولي وإشعار عند كل مرحلة بتنجزها.</p></div></div>
    </div>
    <p class="draft">نموذج أولي · مهارات الأعداد والجبر من كتب الرياضيات للصفوف 5–7 (المنهاج الفلسطيني) · المحتوى مسودة بانتظار مراجعة معلم${Store.mode==="local"?" · وضع تجريبي محلي: الحسابات محفوظة على هذا الجهاز فقط":""}</p>
  </section>`;
  const gb=$("#guest-teacher");if(gb)gb.onclick=guestTeacher;
}
/* guest teacher: one click, no account form. Opens the chat only. */
let GUEST_BUSY=false;
async function guestTeacher(){
  if(GUEST_BUSY)return;GUEST_BUSY=true;
  const b=$("#guest-teacher");if(b)b.disabled=true;
  let r;
  try{r=typeof Store.guestTeacher==="function"?await Store.guestTeacher():{ok:false,err:"دخول الزوّار مش متاح بهذا العرض."};}
  catch(e){console.error(e);r={ok:false,err:"ما قدرنا نوصل للخادم. تأكد من الإنترنت وجرّب مرة ثانية."};}
  GUEST_BUSY=false;
  if(!r||!r.ok){toast(r&&r.err||"صار خطأ.");const b2=$("#guest-teacher");if(b2)b2.disabled=false;return;}
  beep("ding");CHAT.err="";
  if(location.hash==="#ask")render();else location.hash="#ask";
}

/* ---------- auth (demo accounts on this device) ---------- */
const AUTH={mode:"login",av:"cat",err:"",busy:false};
function vAuth(role){
  const isS=role==="student",signup=AUTH.mode==="signup";
  const picks=["نجمة","صقر","قمر","فارس","زيتونة","برق"];
  app.innerHTML=`<section class="view"><div class="card auth">
    <div class="row between"><div><p class="eyebrow">${isS?"للطلاب":"لأولياء الأمور"}</p><h2>${signup?(isS?"حساب طالب جديد":"حساب ولي أمر جديد"):"تسجيل الدخول"}</h2></div><span class="avatar-md">${isS?avatar(signup?AUTH.av:"star"):`<span style="color:var(--brand-text);display:block;width:48px">${IC_PAR}</span>`}</span></div>
    <div class="segtabs" role="group" aria-label="نوع العملية"><button type="button" data-m="login" aria-pressed="${!signup}">عندي حساب</button><button type="button" data-m="signup" aria-pressed="${signup}">حساب جديد</button></div>
    <form id="af" style="display:grid;gap:14px" novalidate>
      ${signup&&!isS?`<div class="field"><label for="pname">الاسم (اختياري)</label><input id="pname" maxlength="24" autocomplete="off" placeholder="مثلاً: أم سلمى"></div>`:""}
      <div class="field"><label for="ident">الإيميل أو رقم الجوال</label><input id="ident" dir="ltr" inputmode="email" autocomplete="username" placeholder="name@mail.com أو 059xxxxxxx"></div>
      <div class="field"><label for="pw">كلمة السر</label><div class="pw"><input id="pw" type="password" dir="ltr" autocomplete="${signup?"new-password":"current-password"}" minlength="6" placeholder="${signup?"6 أحرف أو أكثر":""}"><button type="button" id="pwshow">إظهار</button></div></div>
      ${signup&&isS?`<div class="field"><label for="nick">اسم مستعار</label><input id="nick" maxlength="16" autocomplete="off" placeholder="اختار اسم أو اكتب واحد"><div class="picks" aria-label="أسماء مقترحة">${picks.map(p=>`<button type="button" data-p="${p}">${p}</button>`).join("")}</div><span class="tiny">لا تكتب اسمك الحقيقي.</span></div>
        <div class="field"><span style="font-weight:800">اختار شخصيتك</span><div class="avs" role="radiogroup" aria-label="الشخصيات">${AVATARS.map(a=>`<button type="button" class="av" role="radio" aria-checked="${AUTH.av===a.id}" data-av="${a.id}">${avatar(a.id)}<span>${a.name}</span></button>`).join("")}</div></div>`:""}
      ${signup&&!isS?`<div class="field"><label for="code">رمز ربط ابنك/بنتك (اختياري)</label><input id="code" dir="ltr" maxlength="6" autocomplete="off" placeholder="مثلاً: K7M2QX" style="text-transform:uppercase"><span class="tiny">الرمز بيلاقيه الطالب بصفحة «حسابي». بتقدر تضيفه بعدين.</span></div>`:""}
      ${AUTH.err?`<div class="err" role="alert">${esc(AUTH.err)}</div>`:""}
      <button class="btn btn-go" type="submit" ${AUTH.busy?"disabled":""}>${signup?"أنشئ الحساب":"ادخل"}</button>
    </form>
    <div class="notice">${IC_INFO}<span>${Store.mode==="local"?"وضع تجريبي: الحساب محفوظ على هذا الجهاز بس، وما في إرسال لأي خادم.":"نسخة تجريبية: الحساب محفوظ على خادم المشروع. لا تكتب اسمك الحقيقي."} لا تستخدم كلمة سر بتستخدمها بمكان ثاني.</span></div>
    <p class="small center">${isS?`ولي أمر؟ <a href="#auth-parent">دخول الأهالي</a>`:`طالب؟ <a href="#auth-student">دخول الطلاب</a>`}</p>
  </div></section>`;
  app.querySelectorAll(".segtabs button").forEach(b=>b.onclick=()=>{AUTH.mode=b.dataset.m;AUTH.err="";vAuth(role);});
  app.querySelectorAll(".picks button").forEach(b=>b.onclick=()=>{$("#nick").value=b.dataset.p;});
  app.querySelectorAll(".av").forEach(b=>b.onclick=()=>{AUTH.av=b.dataset.av;app.querySelectorAll(".av").forEach(x=>x.setAttribute("aria-checked",String(x===b)));app.querySelector(".avatar-md").innerHTML=avatar(AUTH.av);beep("pop");});
  $("#pwshow").onclick=()=>{const p=$("#pw");p.type=p.type==="password"?"text":"password";$("#pwshow").textContent=p.type==="password"?"إظهار":"إخفاء";};
  $("#af").addEventListener("submit",async e=>{
    e.preventDefault();if(AUTH.busy)return;
    const keep={ident:$("#ident").value,nick:$("#nick")?$("#nick").value:"",pname:$("#pname")?$("#pname").value:"",code:$("#code")?$("#code").value:""};
    const fail=msg=>{AUTH.err=msg;AUTH.busy=false;vAuth(role);$("#ident").value=keep.ident;if($("#nick"))$("#nick").value=keep.nick;if($("#pname"))$("#pname").value=keep.pname;if($("#code"))$("#code").value=keep.code;};
    const id=parseIdent(keep.ident),pw=$("#pw").value;
    if(!id)return fail("اكتب إيميل صحيح أو رقم جوال (9 أرقام أو أكثر).");
    if(pw.length<6)return fail("كلمة السر لازم تكون 6 أحرف أو أكثر.");
    let nick="";
    if(signup&&isS){nick=keep.nick.trim();if(!nick)return fail("اختار اسم مستعار.");}
    AUTH.busy=true;
    const sb=app.querySelector('#af button[type="submit"]');if(sb){sb.disabled=true;sb.textContent="لحظة…";}
    let r;
    try{
      r=signup?await Store.signup({role,id,password:pw,nick:nick.slice(0,16),avatar:AUTH.av,name:keep.pname.trim().slice(0,24),code:keep.code.trim()})
              :await Store.login({role,id,password:pw});
    }catch(err){console.error(err);r={ok:false,err:"ما قدرنا نوصل للخادم. تأكد من الإنترنت وجرّب مرة ثانية."};}
    if(!r||!r.ok)return fail(r&&r.err||"صار خطأ.");
    AUTH.busy=false;AUTH.err="";PV.kids=null;PV.err="";
    if(signup){AUTH.mode="login";beep("win");const u=ME();toast(r.warn?r.warn:(role==="student"?"أهلاً "+u.nick+"! حسابك جاهز":"حسابك جاهز"));}
    else beep("ding");
    const target=role==="student"?"#home":"#parent";
    if(location.hash===target)render();else location.hash=target;
  });
}

/* ---------- student home ---------- */
function vHome(){
  const u=ME(),d=S.diag,cur=currentSkill();
  app.innerHTML=`<section class="view">
    <div class="hero">
      <span class="avatar-lg">${avatar(u.avatar)}</span>
      <h1>أهلاً ${esc(u.nick)}!</h1>
      <p class="lead">${d?(cur?`محطتك الجاية: <b style="color:var(--logo)">${esc(cur.title)}</b> (${LV[cur.lv].name}).`:"ضوّيت كل الفوانيس! جرّب تتحدّى حالك مع نبراس."):"خلينا نكتشف مستواك بلعبة قصيرة: 3 جزر، وألغاز بتتغيّر حسب جوابك."}</p>
      <div class="row" style="justify-content:center">
        <a class="btn btn-go" href="#${d?(cur?"skill-"+cur.id:"path"):"play"}">${d?"كمّل رحلتك":"ابدأ اللعبة"}</a>
        <a class="btn btn-line" href="#ask">اسأل نبراس</a>
      </div>
    </div>
    <div class="lvgrid">${LEVELS.map(l=>{const n=SK_LV[l.id].length,k=litCount(S,l.id);return `<div class="lvbox"><div class="row between"><h4>${l.name}</h4><span class="chip ${k===n?"lit":"plain"}">${k} من ${n}</span></div><div class="pbar" aria-hidden="true"><i style="width:${Math.round(k/n*100)}%"></i></div></div>`;}).join("")}</div>
    <p class="draft">المحتوى مسودة بانتظار مراجعة معلم رياضيات ومطابقته مع المنهاج.</p>
  </section>`;
}

/* ---------- me (student account) ---------- */
function vMe(){
  const u=ME(),pc=Store.parentCount();
  app.innerHTML=`<section class="view">
    <div class="card" style="display:grid;gap:16px">
      <div class="kidhead"><span class="avatar-lg">${avatar(u.avatar)}</span><div class="grow"><p class="eyebrow">حسابي</p><h2>${esc(u.nick)}</h2><p class="small muted">الصف السابع</p></div></div>
      <div class="field"><label for="nick2">اسم مستعار</label><input id="nick2" maxlength="16" value="${esc(u.nick)}"></div>
      <div class="field"><span style="font-weight:800">شخصيتي</span><div class="avs" role="radiogroup" aria-label="الشخصيات">${AVATARS.map(a=>`<button type="button" class="av" role="radio" aria-checked="${u.avatar===a.id}" data-av="${a.id}">${avatar(a.id)}<span>${a.name}</span></button>`).join("")}</div></div>
      <div><button class="btn btn-go btn-sm" id="saveme" type="button">احفظ</button></div>
    </div>
    <div class="card" style="display:grid;gap:10px">
      <h3>ربط حساب أهلي</h3>
      <p class="small muted">أعطِ هاد الرمز لولي أمرك، وهو بيدخله بصفحة الأهالي عشان يوصله تقرير التشخيص وإشعار كل ما تنجز مرحلة.</p>
      <div class="row"><span class="code" id="code">${esc(u.code)}</span><button class="btn btn-line btn-sm" id="cpy" type="button">انسخ الرمز</button></div>
      <p class="small" id="pcount">${pcText(pc)}</p>
    </div>
    <div class="card" style="display:grid;gap:10px">
      <div class="row"><button class="btn btn-line btn-sm" id="lo" type="button">تسجيل خروج</button><button class="btn btn-line btn-sm" id="del" type="button">${Store.mode==="local"?"احذف حسابي من هاد الجهاز":"احذف حسابي نهائياً"}</button></div>
    </div>
  </section>`;
  let av=u.avatar;
  app.querySelectorAll(".av").forEach(b=>b.onclick=()=>{av=b.dataset.av;app.querySelectorAll(".av").forEach(x=>x.setAttribute("aria-checked",String(x===b)));beep("pop");});
  $("#saveme").onclick=async()=>{const n=$("#nick2").value.trim();if(!n){toast("اكتب اسم مستعار");return;}const r=await Store.updateMe({nick:n.slice(0,16),avatar:av});if(!r.ok){toast("ما انحفظ: "+r.err);return;}renderNav();vMe();toast("انحفظ");};
  if(Store.refreshParents)Store.refreshParents().then(n=>{const el=$("#pcount");if(el)el.textContent=pcText(n);}).catch(()=>{});
  $("#cpy").onclick=()=>{const t=u.code;if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(()=>toast("انسخ الرمز"),()=>selectText($("#code")));else selectText($("#code"));};
  $("#lo").onclick=logout;
  $("#del").onclick=()=>{const b=$("#del");if(!b.dataset.sure){b.dataset.sure="1";b.textContent="متأكد؟ اضغط مرة ثانية";return;}
    b.disabled=true;Store.deleteMe().then(()=>{S=null;G=null;P=null;location.hash="#home";render();toast("انحذف الحساب");});};
}
function pcText(n){return n?`مربوط مع ${n===1?"ولي أمر واحد":n+" أولياء أمور"}.`:"لسا ما في ولي أمر مربوط.";}
function selectText(el){try{const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r);toast("الرمز محدد، انسخه");}catch(e){}}

/* ---------- question widgets (game-like) ---------- */
const TYPE_NAME={bubbles:"طقّ الفقاعة",type:"اكتب جوابك",hop:"نطّ مع الضفدع",shade:"لوّن الشريط",order:"رتّب البطاقات"};
const TYPE_IC={
  bubbles:'<circle cx="8" cy="14" r="5"/><circle cx="16.5" cy="8" r="3.5"/><circle cx="18" cy="17" r="2"/>',
  type:'<rect x="3" y="6" width="18" height="12" rx="3"/><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10"/>',
  hop:'<path d="M3 18h18M6 15v6M12 15v6M18 15v6"/><path d="M6 12c2-6 10-6 12 0"/><path d="m16 10 2 2 2-2"/>',
  shade:'<rect x="3" y="8" width="18" height="8" rx="2"/><path d="M9 8v8M15 8v8"/><path d="M3 8h6v8H3z" fill="currentColor"/>',
  order:'<rect x="3" y="5" width="5" height="14" rx="1.5"/><rect x="10" y="9" width="5" height="10" rx="1.5"/><rect x="17" y="13" width="4" height="6" rx="1.5"/>'
};
function keysFor(stem){
  const letters=[...new Set((String(stem).match(/[a-z]/g)||[]))].slice(0,3);
  return [...letters,"²","+","−","×","/",".","(",")","="];
}
/* o: {mode:"diag"|"practice", init, tried:[], locked, reveal, onChange(ready), onEnter()} */
function mountWidget(q,host,o){
  o=o||{};
  if(q.type==="bubbles"){
    const order=o.order||shuffle(q.options.map((_,i)=>i));let sel=o.init!=null?o.init:null;
    host.innerHTML=`<div class="pond" role="radiogroup" aria-label="الفقاعات">${order.map((i,k)=>{const op=q.options[i],tr=(o.tried||[]).includes(i),rt=o.reveal&&op.ok;
      return `<button type="button" class="bub ${tr?"tried":""} ${rt?"right":""} ${sel===i&&!rt?"sel":""}" role="radio" aria-checked="${sel===i}" data-i="${i}" style="--d:${(k*.45).toFixed(2)}s" ${tr||o.locked?"disabled":""}>${mathify(op.t)}</button>`;}).join("")}</div>`;
    host.querySelectorAll(".bub:not([disabled])").forEach(b=>b.onclick=()=>{sel=+b.dataset.i;host.querySelectorAll(".bub").forEach(x=>{x.classList.toggle("sel",x===b);x.setAttribute("aria-checked",String(x===b));});beep("pop");o.onChange&&o.onChange(true);});
    return{value:()=>sel,ready:()=>sel!==null,popSel:()=>{const b=host.querySelector(".bub.sel");if(b)b.classList.add("pop");},order};
  }
  if(q.type==="type"){
    host.innerHTML=`<div class="ansbox">
      <label for="ans" class="small" style="font-weight:800;color:var(--brand-text)">اكتب جوابك</label>
      <input id="ans" class="ans" type="text" dir="ltr" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="جوابك هون" ${o.locked?"disabled":""}>
      <div class="keys" aria-label="رموز">${keysFor(q.stem).map(k=>`<button type="button" data-k="${esc(k)}" ${o.locked?"disabled":""}>${esc(k)}</button>`).join("")}<button type="button" data-k="⌫" aria-label="امسح حرف" ${o.locked?"disabled":""}>⌫</button></div>
    </div>`;
    const inp=$("#ans",host);inp.value=o.init||"";
    const sync=()=>o.onChange&&o.onChange(!!inp.value.trim());
    inp.addEventListener("input",sync);
    inp.addEventListener("keydown",e=>{if(e.key==="Enter"&&inp.value.trim()){e.preventDefault();o.onEnter&&o.onEnter();}});
    host.querySelectorAll(".keys button").forEach(b=>b.onclick=()=>{
      const k=b.dataset.k,s=inp.selectionStart??inp.value.length,e=inp.selectionEnd??s;
      if(k==="⌫"){const a=s===e?Math.max(0,s-1):s;inp.value=inp.value.slice(0,a)+inp.value.slice(e);inp.setSelectionRange(a,a);}
      else{const ins=/[a-z²().]/.test(k)?k:` ${k} `;inp.value=inp.value.slice(0,s)+ins+inp.value.slice(e);const p=s+ins.length;inp.setSelectionRange(p,p);}
      inp.focus();sync();
    });
    if(!o.locked&&!matchMedia("(pointer: coarse)").matches)setTimeout(()=>inp.focus(),30);
    return{value:()=>inp.value.trim(),ready:()=>!!inp.value.trim()};
  }
  if(q.type==="hop"){
    const MIN=-10,MAX=10;let v=o.init!=null?o.init:q.start,moved=o.init!=null;
    const ticks=[];for(let k=MIN;k<=MAX;k++)ticks.push(`<button type="button" class="tick ${k===0?"zero":""}" data-v="${k}" aria-label="${fmtN(k)}" ${o.locked?"disabled":""}><span class="tk"></span><span>${fmtN(k)}</span></button>`);
    host.innerHTML=`<div class="nlwrap"><div class="nl">${ticks.join("")}<div class="startmark" style="--i:${q.start-MIN}">البداية</div><div class="frog" id="frog" style="--i:${v-MIN}">${FROG}</div></div></div>
      <div class="hopctl" dir="ltr"><button type="button" data-d="-1" ${o.locked?"disabled":""} aria-label="خطوة لليسار">⟵ −1</button><output id="hv" aria-live="polite">${fmtN(v)}</output><button type="button" data-d="1" ${o.locked?"disabled":""} aria-label="خطوة لليمين">+1 ⟶</button></div>`;
    const frog=$("#frog",host);
    const set=nv=>{nv=Math.max(MIN,Math.min(MAX,nv));if(nv===v&&moved)return;v=nv;moved=true;frog.style.setProperty("--i",v-MIN);frog.classList.remove("hop");void frog.offsetWidth;frog.classList.add("hop");$("#hv",host).textContent=fmtN(v);beep("pop");o.onChange&&o.onChange(true);};
    host.querySelectorAll(".hopctl button").forEach(b=>b.onclick=()=>set(v+ +b.dataset.d));
    host.querySelectorAll(".tick").forEach(b=>b.onclick=()=>set(+b.dataset.v));
    setTimeout(()=>{const w=$(".nlwrap",host);if(w){const f=frog.offsetLeft-w.clientWidth/2;w.scrollLeft=Math.max(0,f);}},30);
    return{value:()=>v,ready:()=>moved};
  }
  if(q.type==="shade"){
    const on=new Set();for(let i=0;i<(o.init||0);i++)on.add(i);
    host.innerHTML=`<div style="display:grid;gap:10px"><div class="bar" role="group" aria-label="الشريط">${Array.from({length:q.n},(_,i)=>`<button type="button" data-i="${i}" class="${on.has(i)?"on":""}" aria-pressed="${on.has(i)}" aria-label="قطعة ${i+1}" ${o.locked?"disabled":""}></button>`).join("")}</div>
      <p class="barcount" aria-live="polite">لوّنت <b id="bc">${on.size}</b> من ${q.n}</p></div>`;
    host.querySelectorAll(".bar button").forEach(b=>b.onclick=()=>{const i=+b.dataset.i;on.has(i)?on.delete(i):on.add(i);b.classList.toggle("on");b.setAttribute("aria-pressed",String(on.has(i)));$("#bc",host).textContent=on.size;beep("pop");o.onChange&&o.onChange(on.size>0);});
    return{value:()=>on.size,ready:()=>on.size>0};
  }
  if(q.type==="order"){
    const items=o.items||(()=>{let s;do{s=shuffle(q.items);}while(s.length>1&&s.every((x,i)=>x===q.items.slice().sort((a,b)=>numOf(a)-numOf(b))[i]));return s;})();
    let placed=(o.init||[]).slice();
    const draw=()=>{
      host.innerHTML=`<div style="display:grid;gap:12px">
        <div class="orderhint"><span>الأصغر</span><span>الأكبر</span></div>
        <div class="slots" style="--n:${items.length}">${items.map((_,k)=>`<div class="slot"><small>${k+1}</small>${placed[k]!=null?`<button type="button" data-k="${k}" ${o.locked?"disabled":""}>${esc(items[placed[k]])}</button>`:""}</div>`).join("")}</div>
        <div class="pool">${items.map((t,i)=>placed.includes(i)?"":`<button type="button" data-i="${i}" ${o.locked?"disabled":""}>${esc(t)}</button>`).join("")||`<span class="tiny">كل البطاقات بمكانها. اضغط على بطاقة لترجعها.</span>`}</div>
      </div>`;
      host.querySelectorAll(".pool button").forEach(b=>b.onclick=()=>{placed.push(+b.dataset.i);beep("pop");draw();o.onChange&&o.onChange(placed.length===items.length);});
      host.querySelectorAll(".slot button").forEach(b=>b.onclick=()=>{placed.splice(+b.dataset.k,1);draw();o.onChange&&o.onChange(false);});
    };
    draw();
    return{value:()=>placed.map(i=>items[i]),ready:()=>placed.length===items.length,items,placedIdx:()=>placed.slice()};
  }
  host.textContent="";return{value:()=>null,ready:()=>false};
}
function scaleSVG(stem,tilt){
  const m=String(stem).match(/([^:؟]*=[^:؟]*)$/);if(!m)return"";
  const [l,r]=m[1].split("=").map(s=>s.trim());if(!l||!r)return"";
  const a=tilt||0;
  return `<svg class="scale" viewBox="0 0 360 150" role="img" aria-label="ميزان: ${esc(l)} في كفة و ${esc(r)} في الكفة الثانية">
    <rect x="172" y="34" width="16" height="96" rx="6" fill="var(--brand)"/>
    <rect x="128" y="128" width="104" height="12" rx="6" fill="var(--brand)"/>
    <g class="beam" style="transform:rotate(${a}deg)">
      <rect x="40" y="28" width="280" height="9" rx="4.5" fill="var(--brand)"/>
      <path d="M70 37 50 86M70 37 90 86M290 37 270 86M290 37 310 86" stroke="var(--ink-3)" stroke-width="2"/>
      <path d="M30 86h80a40 18 0 0 1-80 0z" fill="var(--glow-soft)" stroke="var(--lamp)" stroke-width="2"/>
      <path d="M250 86h80a40 18 0 0 1-80 0z" fill="var(--glow-soft)" stroke="var(--lamp)" stroke-width="2"/>
      <text x="70" y="78" text-anchor="middle" font-family="Nunito, sans-serif" font-weight="900" font-size="22" fill="var(--ink)" style="direction:ltr;unicode-bidi:isolate">${esc(l)}</text>
      <text x="290" y="78" text-anchor="middle" font-family="Nunito, sans-serif" font-weight="900" font-size="22" fill="var(--ink)" style="direction:ltr;unicode-bidi:isolate">${esc(r)}</text>
    </g>
    <circle cx="180" cy="32" r="10" fill="var(--lamp)"/>
  </svg>`;
}
/* tilt the balance by substituting the student's value (practice feedback only) */
function tiltFor(q,val){
  try{
    const m=String(q.stem).match(/([^:؟]*=[^:؟]*)$/);const [l,r]=m[1].split("=");
    let x;if(q.type==="bubbles")x=numOf(q.options[val].t);else{const p=parseAns(val);x=p?(p.sol!==undefined?p.sol:(p.expr.vars.size?NaN:p.expr.f({}))):NaN;}
    if(!isFinite(x))return 8;
    const ev=s=>{const c=compile(norm(s).replace(/▢/g,"x"));return c?c.f({x}):NaN;};
    const L=ev(l),R=ev(r);if(!isFinite(L)||!isFinite(R)||close(L,R))return 0;
    return L>R?-9:9;
  }catch(e){return 8;}
}

/* ---------- diagnosis game (levels: start at grade 6, move up or down) ---------- */
let G=null;
function setQ(id){G.q=qById[id];G.w=null;}
function startGame(){
  G={lv:"L6",skills:SK_LV.L6,si:0,stage:"first",asked:[],res:{},lvPass:{},pending:[],trail:["L6"],inter:null};
  setQ(DIAG_PICK[G.skills[0]][0]);drawGame();
  if(window.claude&&claude.use)claude.use("permissions").then(p=>p&&p.request(["sample"])).catch(()=>{});
}
function followUp(sid){const asked=new Set(G.asked.map(a=>a.qid));return [DIAG_PICK[sid][1],...QS.filter(x=>x.skill===sid).sort((a,b)=>a.d-b.d).map(x=>x.id)].find(id=>id&&!asked.has(id))||null;}
function record(val,skipped){
  const q=G.q;let r,a;
  if(skipped){r={ok:false,mis:null,src:"skip"};a="(مش عارف)";}else{r=grade(q,val);a=answerText(q,val);}
  const entry={q,qid:q.id,a,ok:r.ok,mis:r.mis,src:r.src,why:r.why||""};
  G.asked.push(entry);
  if(!r.ok&&r.mis&&r.src==="match")bump(r.mis);
  if(!r.ok&&r.src==="ai"){if(sampleFn)G.pending.push(aiDiagnose(entry,q));else entry.src="none";}
  const sid=q.skill;
  if(G.stage==="first"){
    if(r.ok){G.res[sid]="mastered";return nextSkill();}
    const f=followUp(sid);if(!f){G.res[sid]="gap";return nextSkill();}
    G.stage="follow";setQ(f);return drawGame();
  }
  G.res[sid]=r.ok?"partial":"gap";return nextSkill();
}
function nextSkill(){
  G.si++;G.stage="first";
  if(G.si<G.skills.length){setQ(DIAG_PICK[G.skills[G.si]][0]);return drawGame();}
  const n=G.skills.filter(s=>G.res[s]==="mastered").length,pass=n>=LV[G.lv].need;G.lvPass[G.lv]=pass;
  if(G.lv==="L6"){const nx=pass?"L7":"L5";G.lv=nx;G.skills=SK_LV[nx];G.si=0;G.trail.push(nx);setQ(DIAG_PICK[G.skills[0]][0]);G.inter=pass?"up":"down";return drawInterlude();}
  return endGame();
}
function islandsHTML(){
  return `<div class="islands" aria-label="جزر المستويات">${LEVELS.map((l,i)=>{const now=G&&G.lv===l.id,done=G&&G.trail.includes(l.id)&&!now;
    return `${i?'<span class="isle-link" aria-hidden="true"></span>':""}<div class="isle ${now?"now":""} ${done?"done":""}"><span class="dot">${l.g}</span><small>${l.short}</small></div>`;}).join("")}</div>`;
}
function drawInterlude(){
  const l=LV[G.lv];beep("win");
  app.innerHTML=`<section class="game">${islandsHTML()}
    <div class="card interlude">${LANTERN("big on")}
      <h2>خلّصت جزيرة الصف السادس!</h2>
      <p class="muted">${G.inter==="up"?`يلا نطلع على <b>جزيرة ${l.short}</b> ونشوف قديش بتعرف.`:`هلأ رح نزور <b>جزيرة ${l.short}</b> نتأكد من الأساسيات، عشان نبني عليها صح.`}</p>
      <button class="btn btn-go" id="goon" type="button">يلا</button>
    </div></section>`;
  $("#goon").onclick=()=>{G.inter=null;drawGame();};
}
function drawGame(){
  if(G.inter)return drawInterlude();
  const q=G.q,sk=skillById[q.skill],n=G.asked.length+1;
  app.innerHTML=`<section class="game">
    ${islandsHTML()}
    <div class="station"><span class="badge">${LV[G.lv].name}</span><span>${esc(sk.title)}</span><span class="qn">· لغز ${n}</span></div>
    <div class="puzzle">
      <div class="ptype"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${TYPE_IC[q.type]}</svg>${TYPE_NAME[q.type]}</div>
      ${q.scale?scaleSVG(q.stem):""}
      <p class="stem">${mathify(q.stem)}</p>
      <div id="w"></div>
    </div>
    <div class="row between">
      <button class="btn btn-line btn-sm" id="skip" type="button">مش عارف</button>
      <button class="btn btn-go" id="next" type="button" disabled>${q.type==="bubbles"?"طقّها!":"ثبّت جوابي"}</button>
    </div>
    <p class="tiny center">ما في وقت ولا علامات${sampleFn?"، ونبراس (ذكاء اصطناعي) بيحلل طريقة تفكيرك":""}.</p>
  </section>`;
  const nx=$("#next");
  const submit=()=>{if(!G.w.ready())return;nx.disabled=true;const v=G.w.value();
    if(q.type==="bubbles"){G.w.popSel();beep("pop");setTimeout(()=>record(v),330);}else{beep("pop");record(v);}};
  G.w=mountWidget(q,$("#w"),{mode:"diag",onChange:ok=>{nx.disabled=!ok;},onEnter:submit});
  nx.onclick=submit;
  $("#skip").onclick=()=>record(null,true);
}
function vPlay(){
  if(G)return drawGame();
  app.innerHTML=`<section class="game"><div class="card" style="display:grid;gap:14px">
    <p class="eyebrow">أهلاً ${esc(ME().nick)}</p>
    <h2>رحلة الفوانيس</h2>
    <p class="muted">رحلتك فيها 3 جزر: جزيرة الخامس، والسادس، والسابع. بنبلّش من جزيرة السادس، وحسب أجوبتك بنطلع لجزيرة السابع أو بننزل لجزيرة الخامس.</p>
    <div class="islands" aria-hidden="true">${LEVELS.map((l,i)=>`${i?'<span class="isle-link"></span>':""}<div class="isle ${l.id==="L6"?"now":""}"><span class="dot">${l.g}</span><small>${l.short}</small></div>`).join("")}</div>
    <div class="row" style="justify-content:center;gap:8px">${Object.keys(TYPE_NAME).map(t=>`<span class="chip calm"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${TYPE_IC[t]}</svg>${TYPE_NAME[t]}</span>`).join("")}</div>
    <ul class="muted small" style="margin:0;padding-inline-start:1.2em">
      <li>تقريباً 8 لـ 12 لغز، وبتاخد حوالي 10 دقايق.</li>
      <li>ما في وقت ولا علامات. الهدف نعرف من وين نبلّش.</li>
      <li>نبراس (ذكاء اصطناعي) بيحلل أجوبتك الغلط عشان يعرف <b>ليش</b> صارت، وبيكتبلك تقرير بالآخر.</li>
    </ul>
    <div class="row"><button class="btn btn-go" id="go" type="button">${S.diag?"العب من جديد":"يلا نلعب"}</button>${S.diag?`<a class="btn btn-line" href="#result">نتيجتي السابقة</a>`:""}</div>
  </div></section>`;
  $("#go").onclick=startGame;
}
async function endGame(){
  const g=G;
  if(g.pending.length){
    app.innerHTML=`<section class="game"><div class="card interlude">${LANTERN("big on")}<h2>نبراس بيقرأ إجاباتك…</h2><p class="muted">ثواني وبيطلعلك مسارك.</p></div></section>`;
    await Promise.allSettled(g.pending);
  }
  const skills={};
  for(const s of SKILLS)skills[s.id]=g.res[s.id]||(s.lv==="L5"&&g.lvPass.L6?"assumed":"untested");
  const mis={};g.asked.forEach(a=>{if(!a.ok&&a.mis)mis[a.mis]=(mis[a.mis]||0)+1;});
  const start=SKILLS.find(s=>!["mastered","assumed"].includes(skills[s.id]));
  S.diag={at:new Date().toISOString(),skills,lvPass:g.lvPass,trail:g.trail,start:start?start.id:null,mis,count:g.asked.length,
    answers:g.asked.map(a=>({qid:a.qid,a:a.a,ok:a.ok,mis:a.mis,src:a.src,why:a.why||""})),report:""};
  logEvent("diag");
  notifyParents("diag");
  S.diag.sentTo=Store.parentCount();
  save();G=null;REP.busy=false;REP.fail=null;beep("win");
  if(route()==="result")vResult();else location.hash="#result";
}

/* ---------- AI: explain WHY an answer is wrong (picks from the library only) ---------- */
function aiDiagnose(entry,q){
  const lib=MIS.map(m=>`${m.id}: ${m.title} — ${m.description} مثال: ${m.example}`).join("\n");
  const prompt=`أنت مساعد تشخيص لمعلم رياضيات. طالب في الصف السابع أجاب إجابة خاطئة (تحققنا من خطئها حسابياً). حدّد الخطأ المفاهيمي الذي تدل عليه إجابته، من المكتبة أدناه فقط.

المهارة: ${skillById[q.skill].title} (${LV[skillById[q.skill].lv].name})
السؤال: ${q.stem}
نوع السؤال: ${TYPE_NAME[q.type]}
الإجابة الصحيحة: ${correctText(q)}
إجابة الطالب: ${entry.a}

مكتبة الأخطاء المفاهيمية:
${lib}

القواعد:
- اختر id واحداً من المكتبة فقط إذا كانت إجابة الطالب تدل عليه بوضوح. إذا لم يتطابق أي خطأ بوضوح، أو كانت الإجابة تخميناً، اجعل misconception = null.
- لا تخترع أخطاء خارج المكتبة.
- reason: جملة واحدة قصيرة بالعربية للمعلم تشرح كيف وصل الطالب على الأرجح لإجابته.

أجب بكائن JSON فقط بهذا الشكل:
{"misconception": "m05" أو null, "confidence": "high" أو "low", "reason": "..."}`;
  entry.src="ai";
  return sampleFn.json(prompt,{modelTier:"quick"}).then(r=>{
    const id=r&&typeof r.misconception==="string"?r.misconception.trim().toLowerCase():null;
    if(id&&misById[id]&&r.confidence==="high"){entry.mis=id;bump(id);}
    entry.why=r&&r.reason?String(r.reason).slice(0,220):"";
  }).catch(()=>{entry.src="none";});
}

/* ---------- result + AI report ---------- */
const SRC={math:"تحقق حسابي",match:"مطابقة مع مكتبة الأخطاء",form:"تحقق حسابي (الشكل غير مبسّط)",ai:"تحليل نبراس (AI)",none:"ما انحدد",skip:"تخطّى السؤال"};
const REP={busy:false,text:"",ctl:null,fail:null};
function reportPrompt(d,start,nick){
  const ans=(d.answers||[]).map(a=>{const q=qById[a.qid];return `- [${q?skillById[q.skill].title:""}] ${q?q.stem:a.qid} | جواب الطالب: ${a.a} | ${a.ok?"صحيح":"خطأ"}${a.mis?` | الخطأ المفاهيمي: ${misById[a.mis].title}`:""}${a.why?` | ملاحظة: ${a.why}`:""}`;}).join("\n");
  return `أنت «نبراس»، معلم رياضيات فلسطيني دافئ. اكتب لطالب في الصف السابع (اسمه المستعار: ${nick}) تقريراً قصيراً عن نتيجة لعبة التشخيص التي أنهاها الآن. اللعبة تختبر مهارات من الصف الخامس والسادس والسابع.

القواعد:
- لهجة فلسطينية بسيطة ومشجّعة، من 60 إلى 100 كلمة، فقرتان قصيرتان، بدون عناوين أو قوائم.
- امدح مجهوده وطريقته، لا ذكاءه. لا علامات ولا نسب مئوية ولا كلمات محبطة، ولا تقل إنه «متأخر» أو «ضعيف».
- اذكر فكرة أو فكرتين خاطئتين فقط مما ورد في البيانات أدناه، بلغة بسيطة، مع نصيحة قصيرة لكل واحدة. إذا لم ترد أخطاء مفاهيمية، امدح ثباته.
- اختم بجملة أننا سنبدأ معاً من مهارة «${start?start.title:"التحدي مع نبراس"}».
- لا تذكر أي معلومة غير موجودة في البيانات. اكتب أي تعبير رياضي بين علامتي $ مثل $3x + 6$.

حالة المهارات: ${SKILLS.map(s=>`${s.title} (${LV[s.lv].short}) = ${STATUS[d.skills[s.id]][0]}`).join("؛ ")}
إجابات الطالب:
${ans}`;
}
function genReport(d,start){
  if(REP.busy||!sampleFn||!d.answers)return;
  REP.busy=true;REP.text="";const ctl=new AbortController();REP.ctl=ctl;
  sampleFn(reportPrompt(d,start,ME().nick),{signal:ctl.signal,onText:({text})=>{REP.text=text;const el=$("#rep");if(el)el.innerHTML=md(text);}})
    .then(r=>{d.report=r.text;save();})
    .catch(e=>{if(e&&e.text){d.report=e.text;save();}else REP.fail=(e&&e.code)||"error";})
    .finally(()=>{REP.busy=false;if(route()==="result")vResult();});
}
const BULB='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>';
function levelTable(d){
  return `<div class="lvgrid">${LEVELS.map(l=>`<div class="lvbox"><h4>${l.name}</h4>${SK_LV[l.id].map(id=>{const st=d.skills[id],now=d.start===id;
    return `<div class="sk"><span>${esc(skillById[id].title)}</span><span class="chip ${now?"lit":STATUS[st][1]}">${now?"البداية من هون":STATUS[st][0]}</span></div>`;}).join("")}</div>`).join("")}</div>`;
}
function vResult(){
  if(!S.diag)return vPlay();
  const d=S.diag,start=d.start?skillById[d.start]:null,mis=Object.keys(d.mis||{}),pc=Store.parentCount();
  let rep="";
  if(d.report)rep=md(d.report);
  else if(REP.busy)rep=REP.text?md(REP.text):'<span class="thinking" aria-label="نبراس بيكتب"><i></i><i></i><i></i></span> <span class="small muted">نبراس بيكتب تقريرك…</span>';
  else if(REP.fail)rep=`<span class="small muted">${REP.fail==="no_credit"?"نبراس واقف مؤقتاً (رصيد الذكاء الاصطناعي خلص).":"ما قدر نبراس يكتب التقرير هلأ."}</span> <button class="btn btn-line btn-sm" id="retryrep" type="button">جرّب مرة ثانية</button>`;
  else if(sampleFn===undefined)rep='<span class="small muted">بنجهّز نبراس…</span>';
  const showRep=!!d.answers&&(d.report||REP.busy||sampleFn!==null);
  app.innerHTML=`<section class="view">
    <div class="card" style="display:grid;gap:16px">
      <p class="eyebrow">ضوّيت ${d.count} فوانيس. يعطيك العافية!</p>
      <h2>${start?`نقطة انطلاقك: ${esc(start.title)}`:"ضوّيت كل الجزر!"}</h2>
      ${start?`<p class="muted">مستواك الحالي: <b style="color:var(--logo)">${LV[start.lv].name}</b>. من هون رح نمشي سوا خطوة خطوة.</p>`:""}
      ${showRep?`<div class="report"><span class="aibadge">✦ تقرير نبراس · ذكاء اصطناعي</span><div id="rep" class="small" style="display:grid;gap:6px">${rep}</div></div>`:""}
      ${levelTable(d)}
      ${mis.length?`<div style="display:grid;gap:8px"><h3>أفكار رح نصلّحها سوا</h3><div class="ideas">${mis.map(id=>`<div class="idea">${BULB}<div><b>${esc(misById[id].title)}</b><p class="small muted">${mathify(HINT[id])}</p></div></div>`).join("")}</div></div>`:""}
      <div class="notice">${IC_PAR}<span>${pc?`تقرير التشخيص صار ظاهر لولي أمرك بصفحة الأهالي.`:`اربط حساب أهلك من صفحة <a href="#me">حسابي</a> عشان يوصلهم التقرير.`}</span></div>
      <div class="row"><a class="btn btn-go" href="#${start?"skill-"+start.id:"path"}">${start?"ابدأ أول محطة":"شوف مساري"}</a><a class="btn btn-line" href="#path">مساري</a></div>
      ${d.answers&&d.answers.length?`<details class="detail"><summary>تفاصيل التشخيص (للمعلم)</summary>
        <div class="dlist">${d.answers.map((a,i)=>{const q=qById[a.qid];return `<div class="drow">
          <p class="small"><b>${i+1}.</b> <span class="chip plain">${q?LV[skillById[q.skill].lv].short:""}</span> ${q?mathify(q.stem):""}</p>
          <p class="small">جواب الطالب: <span class="m">${esc(a.a)}</span> · <span class="chip ${a.ok?"good":"plain"}">${a.ok?"صحيح":"غير صحيح"}</span></p>
          <p class="tiny">${a.mis?`الخطأ المفاهيمي: <b>${esc(misById[a.mis].title)}</b> (${a.mis}) · `:""}الطريقة: ${SRC[a.src]||a.src}${a.why?` · ${esc(a.why)}`:""}</p>
        </div>`;}).join("")}</div></details>`:""}
    </div>
    <p class="draft">النتيجة تقدير أولي من ${d.count} ألغاز. الصح والغلط بيتحدد بالحساب، والذكاء الاصطناعي بيقترح سبب الغلط وممكن يخطئ. المهارات «الثابتة» ما انختبرت لأنك نجحت بمستوى أعلى منها.</p>
  </section>`;
  const rr=$("#retryrep");if(rr)rr.onclick=()=>{REP.fail=null;vResult();};
  if(!d.report&&!REP.busy&&!REP.fail&&d.answers&&sampleFn)genReport(d,start);
}

/* ---------- learning path ---------- */
function vPath(){
  if(!S.diag){app.innerHTML=`<section class="view"><div class="card" style="display:grid;gap:12px"><p class="eyebrow">أهلاً ${esc(ME().nick)}</p><h2>خلينا نعرف من وين نبلّش</h2><p class="muted">العب رحلة الفوانيس وبعدها بيطلعلك مسارك.</p><div><a class="btn btn-go" href="#play">ابدأ اللعبة</a></div></div></section>`;return;}
  const cur=currentSkill(),litN=litCount(S);
  const det=Object.entries(S.detected).sort((a,b)=>b[1]-a[1]).slice(0,3);
  let idx=0;
  app.innerHTML=`<section class="view">
    <div class="row between" style="align-items:flex-end">
      <div><p class="eyebrow">مسار ${esc(ME().nick)}</p><h2>${cur?`المحطة الجاية: ${esc(cur.title)}`:"ضوّيت كل الفوانيس!"}</h2></div>
      <span class="chip lit">${litN} من ${SKILLS.length} فوانيس</span>
    </div>
    ${LEVELS.map(l=>{const k=litCount(S,l.id),n=SK_LV[l.id].length;return `<div class="lvsec">
      <div class="lvhead"><h3><span class="lvnum">${l.g}</span>${l.name}</h3><span class="small muted">${k} من ${n}</span></div>
      <div class="pbar" aria-hidden="true"><i style="width:${Math.round(k/n*100)}%"></i></div>
      <div class="trail">${SK_LV[l.id].map(id=>{const s=skillById[id],lit=isLit(id),now=cur&&cur.id===id,st=S.diag.skills[id];idx++;
        const chip=lit?(st==="assumed"&&!S.lit[id]?["ثابتة ✦","good"]:["متقَنة ✦","lit"]):now?["أنت هنا","lit"]:(st==="partial"||st==="gap")?["بدها شغل","calm"]:["قريباً","plain"];
        return `<a class="stop ${lit?"lit":""} ${now?"now":""}" href="#skill-${id}"><span class="orb">${LANTERN(lit?"on":"off")}</span>
          <span class="info"><span class="row between" style="gap:8px"><b>${esc(s.title)}</b><span class="chip ${chip[1]}">${chip[0]}</span></span><span class="small muted">${esc(s.summary)}</span><span class="tiny">${esc(s.src)}</span></span></a>`;}).join("")}</div>
    </div>`;}).join("")}
    ${det.length?`<div class="card" style="display:grid;gap:10px"><h3>أفكار بنشتغل عليها</h3><div class="ideas">${det.map(([id])=>`<div class="idea">${BULB}<div><b>${esc(misById[id].title)}</b><p class="small muted">${mathify(HINT[id])}</p></div></div>`).join("")}</div></div>`:""}
    <p class="draft">محتوى تجريبي (مسودة) بانتظار مراجعة معلم رياضيات ومطابقته مع المنهاج.</p>
  </section>`;
}

/* ---------- skill lesson + practice ---------- */
let P=null;
function vSkill(sid){
  const sk=skillById[sid];
  if(!P||P.sid!==sid){const qs=QS.filter(q=>q.skill===sid).sort((a,b)=>a.d-b.d);P={sid,qs,i:0,first:true,state:"ask",fb:null,tried:[],val:null,order:null,items:null,tilt:0};}
  const streak=S.streak[sid]||0,lit=isLit(sid),q=P.qs[P.i],finished=P.i>=P.qs.length;
  let fb="";
  if(P.state==="right")fb=`<div class="fb good" role="status"><b>صح! ${P.first?"شغلك مرتّب.":"حلو إنك ما استسلمت."}</b>${P.first?"":`<p class="small">الجواب الأول ما بيعدّ بالسلسلة، بس المحاولة هي اللي بتعلّم.</p>`}</div>`;
  if(P.state==="hint"){const r=P.fb||{};const txt=r.mis&&HINT[r.mis]?HINT[r.mis]:r.src==="form"?r.why:sk.summary;
    fb=`<div class="fb hint" role="status"><b>${r.mis?"فكرة شائعة، خلينا نشوفها":"قرّبت! جرّب مرة ثانية"}</b><p>${mathify(txt)}</p></div>`;}
  app.innerHTML=`<section class="view">
    <div class="row between"><a class="btn btn-line btn-sm" href="#path">← مساري</a><span class="chip ${lit?"lit":"calm"}">${lit?"فانوس مضاء ✦":`سلسلة ${streak} من ${MASTER_STREAK}`}</span></div>
    <div class="card explain">
      <p class="eyebrow">${LV[sk.lv].name}</p>
      <h2>${esc(sk.title)}</h2>
      <p>${mathify(sk.explanation)}</p>
      <div class="example"><b>مثال من الحياة</b><p>${mathify(sk.example)}</p></div>
      <p class="tiny">${esc(sk.src)}</p>
    </div>
    ${finished?`<div class="card done">${LANTERN("big on")}<h2>${lit?"ضوّيت فانوس هالمحطة!":"خلّصت تمارين المحطة"}</h2><p class="muted">${lit?"يلا على المحطة الجاية.":`بدك تعيد التمارين؟ كل ${MASTER_STREAK} إجابات صح من أول محاولة ورا بعض بتضوّي الفانوس.`}</p>
      <div class="row" style="justify-content:center">${lit&&currentSkill()?`<a class="btn btn-go" href="#skill-${currentSkill().id}">المحطة الجاية</a>`:`<button class="btn btn-go" id="again" type="button">أعد التمارين</button>`}<a class="btn btn-line" href="#path">مساري</a></div></div>`:
    `<div class="puzzle">
      <div class="row between"><span class="ptype"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${TYPE_IC[q.type]}</svg>${TYPE_NAME[q.type]} · تمرين ${P.i+1} من ${P.qs.length}</span>
        <span class="meter" aria-label="السلسلة">${Array.from({length:MASTER_STREAK},(_,k)=>`<i class="${k<streak||lit?"on":""}"></i>`).join("")}</span></div>
      ${q.scale?scaleSVG(q.stem,P.tilt):""}
      <p class="stem">${mathify(q.stem)}</p>
      <div id="w"></div>
      ${fb}
      <div class="row between">
        <a class="btn btn-line btn-sm" href="#ask" id="askq">اسأل نبراس عن هالسؤال</a>
        ${P.state==="right"?`<button class="btn btn-go" id="nextq" type="button">التالي</button>`:`<button class="btn btn-go" id="chk" type="button" disabled>تحقّق</button>`}
      </div>
    </div>`}
  </section>`;
  if(finished){const a=$("#again");if(a)a.onclick=()=>{P=null;vSkill(sid);};return;}
  const locked=P.state==="right";
  const w=mountWidget(q,$("#w"),{mode:"practice",init:P.val,tried:P.tried,locked,reveal:locked,order:P.order,items:P.items,
    onChange:ok=>{const c=$("#chk");if(c)c.disabled=!ok;},onEnter:()=>{const c=$("#chk");if(c&&!c.disabled)c.click();}});
  if(q.type==="bubbles")P.order=w.order;if(q.type==="order")P.items=w.items;
  const chk=$("#chk");
  if(chk){chk.disabled=!w.ready()||(q.type==="bubbles"&&P.tried.includes(w.value()));chk.onclick=()=>pick(w.value(),chk,q.type==="order"?w.placedIdx():null);}
  const nq=$("#nextq");if(nq){nq.onclick=()=>{P.i++;Object.assign(P,{first:true,state:"ask",fb:null,tried:[],val:null,order:null,items:null,tilt:0});vSkill(sid);};nq.focus();}
  $("#askq").onclick=()=>{CHAT.prefill=`عندي هالسؤال: ${q.stem}\nممكن تساعدني أفكّر فيه بدون ما تعطيني الحل؟`;};
}
function pick(val,btn,placedIdx){
  const q=P.qs[P.i],sid=P.sid,r=grade(q,val);
  P.val=q.type==="order"?placedIdx:(q.type==="bubbles"&&!r.ok?null:val);
  if(q.scale)P.tilt=tiltFor(q,val);
  if(r.ok){
    P.state="right";P.tilt=0;
    if(P.first){S.streak[sid]=(S.streak[sid]||0)+1;spark(btn,"✦");beep("ding");}else{S.streak[sid]=0;beep("ding");}
    if(!S.lit[sid]&&S.streak[sid]>=MASTER_STREAK){save();vSkill(sid);markLit(sid);return;}
  }else{
    if(q.type==="bubbles")P.tried.push(val);
    P.first=false;P.state="hint";P.fb=r;if(r.mis)bump(r.mis);S.streak[sid]=0;beep("soft");
  }
  save();vSkill(sid);
}

/* ---------- parent dashboard ---------- */
const PV={err:"",kids:null,loading:false};
async function loadKids(){
  if(PV.loading)return;PV.loading=true;
  try{PV.kids=await Store.kids();}catch(e){console.error(e);PV.kids=[];toast("ما قدرنا نجيب البيانات. تأكد من الإنترنت.");}
  PV.loading=false;
  const u=ME();if(u&&u.role==="parent"&&READY)vParent();
}
function vParent(){
  const u=ME();
  if(PV.kids===null){
    app.innerHTML=`<section class="view"><div class="card interlude">${LANTERN("big on")}<p class="muted">بنجيب تقارير أولادك…</p></div></section>`;
    loadKids();return;
  }
  const kids=PV.kids,pr=u.prefs||{},outbox=buildOutbox(u,kids);
  app.innerHTML=`<section class="view">
    <div class="card" style="display:grid;gap:6px">
      <div class="row between"><p class="eyebrow">صفحة الأهالي</p><button class="btn btn-line btn-sm" id="refresh" type="button">حدّث</button></div>
      <h2>أهلاً${u.name?" "+esc(u.name):""}</h2>
      <p class="muted">هون بتتابع تقرير التشخيص الأولي وتقدّم أولادك بالمراحل، وبتختار شو بدك يظهرلك من رسائل.</p>
    </div>
    ${kids.map(k=>kidCard(k)).join("")}
    <div class="card" style="display:grid;gap:12px">
      <h3>${kids.length?"ربط حساب ثاني":"اربط حساب ابنك أو بنتك"}</h3>
      <p class="small muted">الرمز موجود عند الطالب بصفحة «حسابي» (6 أحرف وأرقام).</p>
      <form id="lf" class="row" style="align-items:flex-end">
        <div class="field" style="flex:1;min-width:180px"><label for="lcode">رمز الربط</label><input id="lcode" dir="ltr" maxlength="6" autocomplete="off" placeholder="K7M2QX" style="text-transform:uppercase"></div>
        <button class="btn btn-go" type="submit">اربط</button>
      </form>
      ${PV.err?`<div class="err" role="alert">${esc(PV.err)}</div>`:""}
    </div>
    <div class="card" style="display:grid;gap:14px">
      <h3>إعدادات الإشعارات</h3>
      <div class="radio-row" role="radiogroup" aria-label="طريقة الإرسال">
        <label><input type="radio" name="ch" value="email" ${pr.channel!=="sms"?"checked":""}> إيميل</label>
        <label><input type="radio" name="ch" value="sms" ${pr.channel==="sms"?"checked":""}> رسالة SMS</label>
      </div>
      <div class="field"><label for="pemail">الإيميل</label><input id="pemail" dir="ltr" value="${esc(pr.email||"")}" placeholder="name@mail.com"></div>
      <div class="field"><label for="pphone">رقم الجوال</label><input id="pphone" dir="ltr" value="${esc(pr.phone||"")}" placeholder="059xxxxxxx"></div>
      <div style="display:grid;gap:8px">
        <label class="chk"><input type="checkbox" id="n_diag" ${pr.diag!==false?"checked":""}> تقرير التشخيص الأولي</label>
        <label class="chk"><input type="checkbox" id="n_skill" ${pr.skill!==false?"checked":""}> كل مهارة بيتقنها (فانوس جديد)</label>
        <label class="chk"><input type="checkbox" id="n_level" ${pr.level!==false?"checked":""}> لما ينهي مستوى كامل</label>
      </div>
      <div><button class="btn btn-go btn-sm" id="savep" type="button">احفظ الإعدادات</button></div>
    </div>
    <div class="card" style="display:grid;gap:12px">
      <div class="row between"><h3>الرسائل</h3>${Store.mode==="local"?`<span class="chip plain">محاكاة</span>`:""}</div>
      <div class="notice">${IC_INFO}<span>${Store.mode==="local"?"بهاي النسخة الرسائل بتظهر هون بس، وما بتنبعت فعلياً بالإيميل أو SMS. الإرسال الحقيقي بيحتاج خدمة إرسال (مرحلة جاية).":"الرسائل بتظهر هون، وإشعارات الإيميل بتنبعت كمان على إيميلك إذا خدمة الإرسال مفعّلة على الخادم. رسائل SMS لسا محاكاة وما بتنبعت."}</span></div>
      ${outbox.length?outbox.slice(0,20).map(m=>`<div class="msgitem">
        <div class="msgmeta"><span class="chip ${m.channel==="sms"?"calm":"lit"}">${m.channel==="sms"?"SMS":"إيميل"}</span><span>إلى: <span dir="ltr">${esc(m.to||"(ما في عنوان، أضفه بالإعدادات)")}</span></span><span>${fmtTime(m.at)}</span></div>
        ${m.channel==="email"?`<b>${esc(m.subject)}</b>`:""}
        <pre>${esc(m.body)}</pre>
        <div><button class="btn btn-line btn-sm" type="button" data-copy="${esc(m.id)}">انسخ الرسالة</button></div>
      </div>`).join(""):`<p class="small muted">لسا ما في رسائل. أول رسالة بتظهر لما تربط حساب، أو لما يخلّص ابنك التشخيص.</p>`}
    </div>
    <p class="draft">${Store.mode==="local"?"وضع تجريبي محلي: كل الحسابات محفوظة على هذا الجهاز فقط.":"نسخة تجريبية: كل ولي أمر بيشوف بس الحسابات المربوطة معه."}</p>
  </section>`;
  const copyText=t=>{if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(()=>toast("انسخ"),()=>toast("ما زبط النسخ، حدد النص وانسخه"));else toast("حدد النص وانسخه");};
  $("#refresh").onclick=()=>{PV.kids=null;vParent();};
  $("#lf").addEventListener("submit",async e=>{
    e.preventDefault();const c=$("#lcode").value.trim();
    if(!c){PV.err="اكتب رمز الربط.";return vParent();}
    const btn=$("#lf button");btn.disabled=true;
    const r=await Store.link(c);
    if(!r.ok){PV.err=r.err;return vParent();}
    PV.err="";beep("win");toast("انربط حساب "+(r.nick||""));PV.kids=null;vParent();
  });
  $("#savep").onclick=async()=>{
    const ch=app.querySelector('input[name="ch"]:checked').value;
    const em=$("#pemail").value.trim(),ph=$("#pphone").value.trim();
    const pe=em?parseIdent(em):null,pp=ph?parseIdent(ph):null;
    if(em&&(!pe||pe.kind!=="email")){toast("الإيميل مش صحيح");return;}
    if(ph&&(!pp||pp.kind!=="phone")){toast("رقم الجوال مش صحيح");return;}
    if(ch==="email"&&!em){toast("أضف إيميل عشان توصلك الرسائل");return;}
    if(ch==="sms"&&!ph){toast("أضف رقم جوال عشان توصلك الرسائل");return;}
    const r=await Store.updatePrefs({channel:ch,email:pe?pe.v:"",phone:pp?pp.v:"",diag:$("#n_diag").checked,skill:$("#n_skill").checked,level:$("#n_level").checked});
    if(!r.ok){toast("ما انحفظ: "+r.err);return;}
    toast("انحفظت الإعدادات");vParent();
  };
  app.querySelectorAll("[data-copy]").forEach(b=>b.onclick=()=>{const m=outbox.find(x=>x.id===b.dataset.copy);if(m)copyText((m.channel==="email"?m.subject+"\n\n":"")+m.body);});
  app.querySelectorAll("[data-report]").forEach(b=>b.onclick=()=>{const k=kids.find(x=>x.id===b.dataset.report);if(!k||!k.progress.diag)return;const m=composeMsg(k,"diag",{},"email");copyText(m.subject+"\n\n"+m.body);});
  app.querySelectorAll("[data-unlink]").forEach(b=>b.onclick=async()=>{
    if(!b.dataset.sure){b.dataset.sure="1";b.textContent="متأكد؟ اضغط مرة ثانية";return;}
    b.disabled=true;const r=await Store.unlink(b.dataset.unlink);if(!r.ok)toast("ما زبط: "+r.err);PV.kids=null;vParent();
  });
}
function kidCard(k){
  const p=k.progress,d=p.diag,cur=currentSkillP(p);
  const evText=e=>e.kind==="diag"?"خلّص التشخيص الأولي":e.kind==="skill"&&skillById[e.skill]?`أتقن «${skillById[e.skill].title}»`:e.kind==="level"&&LV[e.level]?`أنهى ${LV[e.level].name}`:"";
  const evs=(p.events||[]).filter(e=>evText(e)).slice().reverse().slice(0,8);
  return `<div class="card kid">
    <div class="kidhead"><span class="avatar-md">${avatar(k.avatar)}</span><div class="grow"><h3>${esc(k.nick||"")}</h3><p class="small muted">${d?(cur?`المحطة الحالية: ${esc(cur.title)} · ${LV[cur.lv].name}`:"أنهى كل المحطات"):"لسا ما لعب لعبة التشخيص"}</p></div><span class="chip lit">${litCount(p)} من ${SKILLS.length}</span></div>
    ${d?`<div style="display:grid;gap:10px">
      <div class="row between"><h4 style="margin:0;color:var(--logo)">التشخيص الأولي · ${fmtDate(d.at)}</h4><button class="btn btn-line btn-sm" type="button" data-report="${esc(k.id)}">انسخ التقرير</button></div>
      <p class="small">${d.start&&skillById[d.start]?`بلّش من <b>${esc(skillById[d.start].title)}</b> (${LV[skillById[d.start].lv].name}).`:"متمكّن من كل المهارات اللي انختبرت."} جاوب على ${d.count} ألغاز.</p>
      ${levelTable(d)}
      ${Object.keys(d.mis||{}).filter(id=>misById[id]).length?`<div style="display:grid;gap:8px"><b class="small">أفكار بنشتغل عليها، وكيف بتساعدوه بالبيت:</b><div class="ideas">${Object.keys(d.mis).filter(id=>misById[id]).map(id=>`<div class="idea">${BULB}<div><b>${esc(misById[id].title)}</b><p class="small muted">${mathify(HINT[id])}</p></div></div>`).join("")}</div></div>`:""}
      ${d.report?`<details class="detail"><summary>تقرير نبراس للطالب (ذكاء اصطناعي)</summary><div class="small" style="display:grid;gap:6px;margin-top:8px">${md(d.report)}</div></details>`:""}
    </div>`:""}
    <div style="display:grid;gap:10px">
      <h4 style="margin:0;color:var(--logo)">التقدّم بالمراحل</h4>
      ${LEVELS.map(l=>{const n=SK_LV[l.id].length,c=litCount(p,l.id);return `<div style="display:grid;gap:4px"><div class="row between small"><span>${l.name}</span><span>${c} من ${n}</span></div><div class="pbar" aria-hidden="true"><i style="width:${Math.round(c/n*100)}%"></i></div></div>`;}).join("")}
      ${evs.length?`<ul class="timeline">${evs.map(e=>`<li><span class="when">${fmtTime(e.at)}</span><span>${esc(evText(e))}</span></li>`).join("")}</ul>`:""}
    </div>
    <div><button class="btn btn-line btn-sm" type="button" data-unlink="${esc(k.id)}">فك الربط</button></div>
  </div>`;
}


const PROMPT=`أنت «نبراس»، معلم رياضيات افتراضي فلسطيني صبور ودافئ على منصة «نبراس · تعلّم من مستواك» لتعويض الفاقد التعليمي. تساعد طلبة الصف السابع في المدارس الحكومية بالضفة الغربية في مهارات الأعداد والكسور والنسبة والجبر، من مستوى الصف الخامس حتى السابع. تتبع منهجية التعليم حسب المستوى الفعلي (Teaching at the Right Level): تبدأ من مستوى الطالب الحقيقي، لا من مستوى صفّه.

# شخصيتك ولغتك
- تحكي بلهجة فلسطينية بسيطة ومهذبة («يا بطل»، «يلا نجرب سوا»، «ولا يهمك»)، وتكتب المصطلحات الرياضية بالفصحى (متغير، معامل، حدود متشابهة، خاصية التوزيع، معادلة).
- إذا كتب الطالب بالفصحى ترد بالفصحى، وإذا كتب بالإنجليزية ترد بالإنجليزية.
- الطالب عمره تقريباً 12–13 سنة: جمل قصيرة وواضحة، سؤال واحد فقط في كل رد، والرد عادة من سطرين إلى خمسة أسطر.
- أمثلة من الحياة اليومية المحلية: السوق والخضرة، أجرة السرفيس، تقسيم الكعك على الإخوة، مصروف المدرسة.

# طريقة التعليم (إلزامية)
1. لا تعطِ الحل النهائي من أول مرة. اسأل سؤالاً موجّهاً أو قسّم المسألة إلى خطوة صغيرة أولى.
2. التلميحات متدرّجة: التلميح 1 عام، التلميح 2 أوضح، التلميح 3 يكاد يكشف الخطوة.
3. بعد 3 محاولات غير ناجحة على نفس المسألة، أو إذا طلب الحل صراحة بعدها، اشرح الحل خطوة بخطوة ثم أعطه سؤالاً مشابهاً بأرقام مختلفة.
4. شخّص قبل أن تصحّح: قارن خطأ الطالب بمكتبة الأخطاء المفاهيمية أدناه وعالج الفكرة الخاطئة نفسها، لا الإجابة فقط.
5. بعد كل شرح اسأل سؤال تحقق قصيراً.
6. امدح المجهود والطريقة («طريقتك مرتبة»، «حلو إنك جربت»)، وليس الذكاء. الخطأ فرصة للتعلم، فلا تُشعر الطالب بالإحراج.
7. ابدأ من مستوى الطالب في «سياق الطالب». إذا كانت مهارة سابقة ناقصة، ارجع لها بلطف.
8. إذا أرسل الطالب صورة لحلّه المكتوب، حدّد أول خطوة فيها خطأ واسأله عنها بدل أن تصحح كل شيء.

# الدقة والصدق
- احسب كل خطوة بعناية وتحقق بالتعويض قبل أن تحكم على إجابة.
- إذا لم تكن متأكداً قل ذلك بوضوح ولا تخترع.
- لا تذكر أرقام صفحات أو أسماء دروس من كتب المنهاج الفلسطيني. المحتوى أدناه مسودة لم يعتمدها معلم بعد.

# الحدود والأمان (الطلاب قاصرون)
- ابقَ في نطاق الرياضيات والدراسة. إذا سُئلت عن موضوع آخر، رد بلطف وأعد الطالب للدرس.
- لا تطلب أي معلومات شخصية (الاسم الكامل، العنوان، رقم الهاتف، اسم المدرسة، صور شخصية). إذا شاركها الطالب، لا تكررها وانصحه بعدم مشاركتها.
- لا تحلّ واجباً أو امتحاناً كاملاً بدل الطالب.
- إذا عبّر الطالب عن ضيق نفسي شديد أو خطر أو أذى: توقف عن الدرس، رد بتعاطف وهدوء، وشجعه يحكي الآن مع شخص كبير بثق فيه (أهله، المرشد بالمدرسة، معلم يحبه). لا تعطِ وعوداً بالسرية.
- لا تكتب أي محتوى غير مناسب لعمر الطالب.

# التنسيق
- اكتب كل تعبير رياضي بين علامتي دولار بصيغة LaTeX بسيطة، مثل $3x + 5 = 20$.
- قائمة مرقمة فقط عند شرح خطوات حل. لا عناوين ولا جداول.

# وسم خفي (للنظام فقط)
إذا لاحظت في كلام الطالب خطأً مفاهيمياً من المكتبة، أضف في آخر ردك وفي سطر منفصل: <<misconception:ID>> (مثل m03). لا تشرح الوسم ولا تذكره.`;
let sampleFn,imgOK=false;
const CHAT={busy:false,stream:"",ctl:null,err:"",file:null,prefill:""};
function refreshAI(){if(!READY)return;const r=route();if(!S)return;if(r==="ask")drawChat();else if(r==="result")vResult();else if(r==="play"&&G)drawGame();}
NibrasAI.get().then(s=>{sampleFn=s||null;if(s&&s.limits)s.limits().then(l=>{imgOK=!!(l&&l.images);if(READY&&route()==="ask"&&S)drawChat();}).catch(()=>{});refreshAI();}).catch(()=>{sampleFn=null;refreshAI();});
function context(){
  const g=isGuest();
  const d=S.diag,L=g?["# سياق الجلسة","- هذه جلسة تجريبية: الزائر معلم يختبر نبراس، وقد يكتب كأنه طالب. تصرّف تماماً كما تتصرف مع طالب في الصف السابع، بنفس طريقة التعليم والحدود.","- لا تقترح لعبة التشخيص ولا المسار، فالزائر ليس له حساب طالب.","- الصف المفترض: السابع"]
    :["# سياق الطالب",`- الاسم المستعار: ${ME().nick} (لا تطلب اسمه الحقيقي)`,"- الصف: السابع"];
  if(g){/* no diagnostic data for a guest */}
  else if(d){L.push("- نتيجة التشخيص: "+SKILLS.map(s=>`${s.title} (${LV[s.lv].short}) = ${STATUS[d.skills[s.id]][0]}`).join("؛ "));
    const c=currentSkill();L.push(`- المحطة الحالية في مساره: ${c?c.title+" ("+LV[c.lv].name+")":"أتقن كل المهارات"}`);}
  else L.push("- لم يلعب التشخيص بعد. إذا طلب مساعدة عامة اقترح عليه لعبة التشخيص بلطف.");
  const det=Object.entries(S.detected).sort((a,b)=>b[1]-a[1]).map(([id,n])=>`${id} (${n})`);
  if(det.length)L.push("- أخطاء مفاهيمية لوحظت سابقاً: "+det.join("، "));
  L.push("","# مكتبة الأخطاء المفاهيمية");
  MIS.forEach(m=>L.push(`- ${m.id}: ${m.title}. ${m.description} مثال: ${m.example} علاج مقترح: ${HINT[m.id]}`));
  L.push("","# مهارات المسار (مسودة، مرتبة من الصف الخامس للسابع)");
  SKILLS.forEach(s=>L.push(`- ${s.title} (${LV[s.lv].name}): ${s.explanation} مثال: ${s.example}`));
  return L.join("\n");
}
const vis=t=>String(t).replace(/<<[^>]*>>/g,"").replace(/<<[^>]*$/,"").replace(/<$/,"").trim();
async function send(text){
  text=String(text||"").trim();const file=CHAT.file;
  if((!text&&!file)||CHAT.busy||!sampleFn)return;
  const t=today();if(S.chat.day!==t){S.chat.day=t;S.chat.count=0;}
  if(S.chat.count>=DAILY_LIMIT){CHAT.err=`وصلت لحد اليوم (${DAILY_LIMIT} رسالة). بنكمل بكرة إن شاء الله!`;drawChat();return;}
  const content=(text||"هاي صورة حلّي، شو رأيك؟")+(file?"\n[أرفق الطالب صورة لحلّه المكتوب]":"");
  S.chat.turns.push({role:"user",content});S.chat.count++;
  CHAT.file=null;CHAT.busy=true;CHAT.stream="";CHAT.err="";save();drawChat();
  const hist=S.chat.turns.slice(-16).map(x=>({role:x.role,content:x.content}));
  while(hist.length&&hist[0].role!=="user")hist.shift();
  const input=[{role:"user",content:PROMPT+"\n\n"+context()},...hist];
  const ctl=new AbortController();CHAT.ctl=ctl;
  try{
    const opts={cache:false,signal:ctl.signal,onText:({text})=>{CHAT.stream=vis(text);paintStream();}};
    if(file)opts.images=file;
    const res=await sampleFn(input,opts);
    [...String(res.text).matchAll(/<<\s*misconception\s*:\s*(m\d{2})\s*>>/gi)].forEach(m=>bump(m[1].toLowerCase()));
    S.chat.turns.push({role:"assistant",content:vis(res.text)+(res.truncated?"\n\n(انقطع الرد، اطلب مني أكمّل)":"")});
  }catch(e){
    const c=e&&e.code;
    if(e&&e.text&&c!=="refused")S.chat.turns.push({role:"assistant",content:vis(e.text)+"\n\n(انقطع الرد)"});
    if(["not_granted","sampling_disabled","not_declared","capability_disabled","capability_removed"].includes(c))sampleFn=null;
    else if(c==="images_unavailable"){imgOK=false;CHAT.err="إرسال الصور مش متاح هون. اكتب خطوات حلّك كنص.";}
    else if(c==="image_rejected")CHAT.err="ما قدرت أقرأ الصورة. جرّب صورة أوضح (JPG أو PNG).";
    else if(c==="rate_limited")CHAT.err="في رسائل كثير هلأ. استنى شوي وجرّب مرة ثانية.";
    else if(c==="refused")CHAT.err="ما بقدر أساعد بهذا الطلب. خلينا نرجع للرياضيات.";
    else if(c==="session_expired")CHAT.err="لازم تسجّل دخول من جديد عشان نكمل.";
    else if(c==="no_credit")CHAT.err="نبراس واقف مؤقتاً لأنه رصيد الذكاء الاصطناعي خلص. احكي مع فريق نبراس.";
    else if(c==="not_configured")CHAT.err="نبراس لسا مش مجهّز على الخادم. (للفريق: راجعوا خطوة الـ Edge Function بالدليل.)";
    else if(c!=="cancelled")CHAT.err="انقطع الاتصال. جرّب ترسل رسالتك مرة ثانية.";
  }finally{CHAT.busy=false;CHAT.stream="";CHAT.ctl=null;save();drawChat();}
}
function paintStream(){const el=$("#live");if(el){el.innerHTML=CHAT.stream?md(CHAT.stream):'<span class="thinking" aria-label="نبراس بيفكّر"><i></i><i></i><i></i></span>';const box=$("#msgs");if(box)box.scrollTop=box.scrollHeight;}}
function vAsk(){drawChat();}
function drawChat(){
  if(route()!=="ask")return;
  const off=sampleFn===null,loading=sampleFn===undefined;
  const draft=$("#cin")?$("#cin").value:"";
  const turns=S.chat.turns;
  const guest=isGuest();
  const welcome=guest?`أهلاً! أنا نبراس، المعلم الافتراضي. اسألني سؤال رياضيات كأنك طالب بالصف السابع، وشوف كيف بفكّر معك خطوة خطوة بدل ما أعطيك الحل جاهز.`
    :`أهلاً ${ME().nick}! أنا نبراس. احكيلي شو السؤال اللي محيّرك، وبنفكّر فيه سوا خطوة خطوة. ما رح أعطيك الحل جاهز، بس رح أضل معك لحد ما توصل.`;
  app.innerHTML=`<section class="view">
    ${guest?`<div class="notice">${IC_INFO}<span><b>وضع المعلم الزائر.</b> بتجرّب المعلم الافتراضي كما بيشوفه الطالب. المحادثة ما بتنحفظ، وبتنمسح لما تطلع أو تحدّث الصفحة. للخروج اضغط «خروج» فوق.</span></div>`:""}
    <div class="chat">
      <div class="chat-head"><span class="appicon">${ICON}</span><div style="flex:1;min-width:0"><b style="color:var(--logo)">نبراس</b><div class="tiny">${loading?"بيجهّز…":off?"مش متاح بهذا العرض":CHAT.busy?"بيكتب…":guest?"المعلم الافتراضي":"معلمك الافتراضي"}</div></div>
        ${turns.length?`<button class="btn btn-line btn-sm" id="clr" type="button">محادثة جديدة</button>`:""}</div>
      <div class="msgs" id="msgs" aria-live="polite">
        <div class="msg bot">${md(welcome)}</div>
        ${turns.map(x=>`<div class="msg ${x.role==="user"?"me":"bot"}">${md(x.content.replace(/\n\[أرفق الطالب صورة لحلّه المكتوب\]$/,"\n(📷 صورة الحل)"))}</div>`).join("")}
        ${CHAT.busy?`<div class="msg bot" id="live"></div>`:""}
      </div>
      ${!turns.length&&!off?`<div class="suggest">${["ما فهمت قسمة الكسور","ليش −4 − 3 = −7؟","كيف بحل 2x − 3 = 11؟"].map(s=>`<button type="button" data-s="${esc(s)}">${mathify(s)}</button>`).join("")}</div>`:""}
      ${CHAT.err?`<div class="note" role="alert">${esc(CHAT.err)}</div>`:""}
      ${off?`<div class="note">${guest?"نبراس مطفي حالياً، فما في إشي تجرّبه هلأ. جرّب بوقت ثاني.":Store.mode==="local"?"نبراس (الذكاء الاصطناعي) بيشتغل بس لما الموقع يكون موصول بـ Supabase. بتقدر تكمل اللعبة والمسار عادي.":"نبراس مطفي حالياً. بتقدر تكمل اللعبة والمسار عادي."}</div>`:""}
      ${CHAT.file?`<div class="note">📷 مرفق: ${esc(CHAT.file.name||"صورة")} <button class="btn btn-line btn-sm" id="rmf" type="button">إزالة</button></div>`:""}
      <form class="composer" id="cf">
        ${imgOK&&!off?`<label class="iconbtn" title="صوّر حلّك وأرسله" aria-label="أرفق صورة لحلّك"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg><input id="cimg" type="file" accept="image/*" hidden></label>`:""}
        <textarea id="cin" rows="1" placeholder="اكتب سؤالك هون…" aria-label="رسالتك" ${off?"disabled":""}></textarea>
        ${CHAT.busy?`<button class="iconbtn" id="stop" type="button" aria-label="أوقف"><svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg></button>`:
        `<button class="iconbtn send" type="submit" aria-label="أرسل" ${off||loading?"disabled":""}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12H5M11 6l-6 6 6 6"/></svg></button>`}
      </form>
    </div>
    <p class="draft">نبراس نموذج ذكاء اصطناعي وممكن يغلط. ${guest?"المحادثة ما بتنحفظ. عدد الرسائل باليوم محدود.":(Store.mode==="local"?"المحادثة محفوظة على هذا الجهاز فقط.":"المحادثة محفوظة بحسابك.")+" "+DAILY_LIMIT+" رسالة باليوم."}</p>
  </section>`;
  const cin=$("#cin");
  cin.value=CHAT.prefill||draft;CHAT.prefill="";
  if(CHAT.busy)paintStream();
  const box=$("#msgs");box.scrollTop=box.scrollHeight;
  $("#cf").addEventListener("submit",e=>{e.preventDefault();const v=cin.value;cin.value="";send(v);});
  cin.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();$("#cf").requestSubmit();}});
  cin.addEventListener("input",()=>{cin.style.height="auto";cin.style.height=Math.min(140,cin.scrollHeight)+"px";});
  app.querySelectorAll(".suggest button").forEach(b=>b.onclick=()=>send(b.dataset.s));
  const st=$("#stop");if(st)st.onclick=()=>CHAT.ctl&&CHAT.ctl.abort();
  const cl=$("#clr");if(cl)cl.onclick=()=>{if(CHAT.busy&&CHAT.ctl)CHAT.ctl.abort();S.chat.turns=[];CHAT.err="";save();drawChat();};
  const ci=$("#cimg");if(ci)ci.onchange=()=>{CHAT.file=ci.files&&ci.files[0]||null;drawChat();};
  const rf=$("#rmf");if(rf)rf.onclick=()=>{CHAT.file=null;drawChat();};
  if(!CHAT.busy&&!off&&cin.value)cin.focus();
}


window.addEventListener("nibras-error",e=>toast(String(e.detail||"صار خطأ")));
app.innerHTML=`<section class="view"><div class="card interlude">${LANTERN("big on")}<p class="muted">لحظة…</p></div></section>`;
Promise.resolve().then(()=>Store.init()).catch(e=>{console.error(e);toast("ما قدرنا نوصل للخادم.");}).then(()=>{READY=true;render();});
})();
