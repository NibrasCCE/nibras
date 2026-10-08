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
/* skill numbers inside each level (5.1 … 7.4) and the skills each one builds on (`pre` in data.js) */
const SK_NUM=Object.fromEntries(LEVELS.flatMap(l=>SK_LV[l.id].map((id,i)=>[id,l.g+"."+(i+1)])));
const skNum=id=>arNum(SK_NUM[id]||"");
const preOf=id=>(skillById[id].pre||[]).filter(x=>skillById[x]);
const nextOf=id=>SKILLS.filter(s=>(s.pre||[]).includes(id)).map(s=>s.id);
/* the skill quiz: up to QUIZ_MAX of the skill's questions, one try each, the correction at the end.
   The skill's grade is the best quiz so far: 3 stars = all right, 2 = one mistake, 1 = half right or more.
   Two stars or more also light the skill's lantern. */
const QUIZ_MAX=5;
const GRADES=[["لسا بدها تدريب","plain"],["بداية حلوة","calm"],["متقدّم","good"],["متمكّن","lit"]];
const starsFor=(c,n)=>!n?0:c===n?3:c===n-1?2:c*2>=n?1:0;
const quizOf=(p,sid)=>(p.quiz||{})[sid]||null;
const STAR=on=>`<svg class="star${on?" on":""}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z"/></svg>`;
const starsHTML=k=>`<span class="stars" role="img" aria-label="${k} من 3 نجوم">${[1,2,3].map(i=>STAR(i<=k)).join("")}</span>`;
const gradeChip=k=>`<span class="chip ${GRADES[k][1]}">${GRADES[k][0]}</span>`;
const DIAG_PICK={s1a:["q1a5","q1a2"],s1b:["q1b2","q1b3"],s1c:["q1c1","q1c2"],s2a:["q2a2","q2a5"],s2b:["q2b1","q2b2"],s2c:["q2c3","q2c1"],s2d:["q2d2","q2d3"],s3a:["q3a2","q3a4"],s3b:["q3b1","q3b2"],s3c:["q3c3","q3c1"],s3d:["q3d4","q3d2"],s4a:["q4a2","q4a1"],s4b:["q4b2","q4b1"],s4c:["q4c1","q4c3"],s4d:["q4d2","q4d1"],s5a:["q5a2","q5a1"],s5b:["q5b1","q5b2"],s5c:["q5c1","q5c2"],s6a:["q6a2","q6a1"],s6b:["q6b1","q6b2"],s6c:["q6c2","q6c1"],s7a:["q7a2","q7a1"],s7b:["q7b2","q7b1"],s7c:["q7c2","q7c1"],s7d:["q7d2","q7d5"]};
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
/* ---- Arabic school notation on screen (see engine.js) ----
   fractions are stacked (numerator over denominator) and powers are raised,
   so nothing depends on which side of a slash the reader starts from. */
document.documentElement.setAttribute("data-math",AR_MATH?"ar":"latin");
if(!AR_MATH){const k=document.createElement("script");k.src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js";document.head.appendChild(k);} /* LaTeX is only drawn in the Latin notation */
const SUPS={"²":"2","³":"3","⁴":"4","⁵":"5"};
/* a ratio is read from the right in the school books: in «٢ : ٣» the first term is on the right.
   Left alone, the browser would join the two numbers and the colon into one left-to-right group,
   so an invisible right-to-left mark goes on each side of the colon. Clock times are left as they are. */
function ratioRTL(t){
  if(!AR_MATH)return t;
  /* only «٢:٣» or «٢ : ٣»; a colon that ends a phrase («من 100: 20 …») is not a ratio */
  return t.replace(/([٠-٩])( ?):\2(?=[٠-٩])/g,(m,d,sp,off,str)=>{
    const nxt=(str.slice(off+m.length).match(/^[٠-٩]+/)||[""])[0];
    if(/^٠[٠-٩]$/.test(nxt)||/الساعة/.test(str.slice(Math.max(0,off-14),off)))return m;
    return d+" \u200F:\u200F ";
  });
}
function decorate(h){               /* h: already-escaped text in Arabic notation */
  /* the unknown result is the empty box of the school books, not a question mark */
  h=h.replace(/(=\s*)؟/g,'$1<span class="abox" aria-label="الجواب"></span>').replace(/▢/g,'<span class="abox" aria-label="فراغ"></span>');
  if(!AR_MATH)return h;
  const fr=(a,b)=>`<span class="frac"><span>${a}</span><span>${b}</span></span>`;
  /* a mixed number is drawn as in the school books: the whole number, then its fraction beside it */
  return h.replace(/(^|[^\/٠-٩٫])([٠-٩]+) ([٠-٩]+)\/([٠-٩]+)(?![\/٠-٩٫])/g,(_,pre,w,a,b)=>`${pre}<span class="mix"><span>${w}</span>${fr(a,b)}</span>`)
    .replace(/(^|[^\/٠-٩٫])([٠-٩]+)\/([٠-٩]+)(?![\/٠-٩٫])/g,(_,pre,a,b)=>pre+fr(a,b))
    .replace(/\^([٠-٩]+)/g,"<sup>$1</sup>")
    .replace(/[²³⁴⁵]/g,c=>`<sup>${arDigits(SUPS[c])}</sup>`);
}
const mathHTML=t=>decorate(esc(arMath(t)));          /* one maths fragment */
const mx=t=>`<span class="m">${mathHTML(t)}</span>`;
const plainHTML=t=>decorate(esc(arNum(t)));          /* ordinary text around the maths */
const IS_MATH=/[A-Za-z=+−×÷²³⁴⁵▢|%]|\d\s*[-−]\s*\d|\d\/\d|\d\.\d|^−\d/;
function mathify(raw){
  raw=String(raw); let out="",last=0,m; RUN.lastIndex=0;
  while((m=RUN.exec(raw))){
    const t=m[0]; out+=plainHTML(raw.slice(last,m.index));
    out+=IS_MATH.test(t)?mx(t):plainHTML(t);
    last=m.index+t.length;
  }
  return ratioRTL(out+plainHTML(raw.slice(last)));
}
/* teaching figures (figures.js): spec like "tree:72"; cap overrides the figure's own caption */
function figHTML(spec,cap){
  const f=typeof FIG!=="undefined"?FIG.make(spec):null;if(!f)return"";
  const c=cap!=null?cap:f.cap;
  return `<figure class="fig">${f.svg}${c?`<figcaption>${mathify(c)}</figcaption>`:""}</figure>`;
}
const figsHTML=(list,cap)=>{const h=(list||[]).map((x,i,a)=>typeof x==="string"?figHTML(x,i===a.length-1?cap:undefined):figHTML(x.f,x.cap)).join("");return h?`<div class="figs">${h}</div>`:"";};
/* the same conversion as plain text: for the AI prompts, the chat box and the parents' e-mails */
function arProse(raw){
  raw=String(raw);if(!AR_MATH)return raw;
  let out="",last=0,m; RUN.lastIndex=0;
  while((m=RUN.exec(raw))){
    const t=m[0]; out+=arNum(raw.slice(last,m.index));
    out+=IS_MATH.test(t)?arMath(t).replace(/[²³⁴⁵]/g,c=>"^"+arDigits(SUPS[c])):arNum(t);
    last=m.index+t.length;
  }
  return ratioRTL(out+arNum(raw.slice(last)));
}
/* LaTeX from the tutor ($…$) drawn in the school notation: stacked fractions, raised powers,
   Arabic digits and letters. Only the simple commands the tutor is told to use are understood. */
const TEX_SYM={times:"×",cdot:"×",div:"÷",le:"≤",leq:"≤",ge:"≥",geq:"≥",ne:"≠",neq:"≠",pm:"±",sum:"∑",approx:"≈",pi:"π",lt:"<",gt:">",cdots:"…",ldots:"…",dots:"…",left:"",right:"",quad:" ",qquad:" ",",":" ",";":" "," ":" ","!":""};
/* teacher mode only (MD_RICH): more commands, so nothing is left raw. Arrows point the way the line is read. */
let MD_RICH=false;
const TEX_RICH=Object.assign({square:"▢",Box:"▢",checkmark:"✓",ast:"×",colon:":",infty:"∞",circ:"°",degree:"°",angle:"∠",triangle:"△",therefore:"∴",because:"∵",mid:"|",vert:"|",lvert:"|",rvert:"|",displaystyle:"",textstyle:"",limits:"",Leftrightarrow:"⇔",leftrightarrow:"↔",iff:"⇔","\\":" ","$":"","&":""},
  AR_MATH?{Rightarrow:"⇐",Longrightarrow:"⇐",implies:"⇐",rightarrow:"←",longrightarrow:"←",to:"←",Leftarrow:"⇒",leftarrow:"→"}:{Rightarrow:"⇒",Longrightarrow:"⇒",implies:"⇒",rightarrow:"→",longrightarrow:"→",to:"→",Leftarrow:"⇐",leftarrow:"←"});
function texHTML(t,depth){
  t=String(t);depth=depth||0;if(depth>6)return esc(t);
  const grp=i=>{let d=0;for(let j=i;j<t.length;j++){if(t[j]==="{")d++;else if(t[j]==="}"){d--;if(!d)return[t.slice(i+1,j),j+1];}}return[t.slice(i+1),t.length];};
  const arg=i=>{while(t[i]===" ")i++;if(t[i]==="{")return grp(i);return[t[i]||"",i+1];};
  let out="",i=0;
  while(i<t.length){
    const c=t[i];
    if(c==="\\"){
      const m=t.slice(i).match(/^\\([a-zA-Z]+|.)/)||["\\",""];const name=m[1];i+=m[0].length;
      if(/^[dt]?frac$/.test(name)){const [x,j]=arg(i),[y,k]=arg(j);i=k;out+=`<span class="frac"><span>${texHTML(x,depth+1)}</span><span>${texHTML(y,depth+1)}</span></span>`;}
      else if(name==="sqrt"){const [x,j]=arg(i);i=j;out+=`<span class="sqrt"><i>√</i><span>${texHTML(x,depth+1)}</span></span>`;}
      else if(name==="overline"||name==="bar"){const [x,j]=arg(i);i=j;out+=`<span class="oline">${texHTML(x,depth+1)}</span>`;}
      else if(name==="text"||name==="mathrm"||name==="textbf"){const [x,j]=arg(i);i=j;out+=esc(arNum(x));}
      else if(name==="%")out+=AR_MATH?"٪":"%";
      else if(MD_RICH&&(name==="begin"||name==="end")){const [,j]=arg(i);i=j;}
      else if(MD_RICH&&/^(boxed|underline|cancel|mathbf|mathit|mathbb|boldsymbol|operatorname)$/.test(name)){const [x,j]=arg(i);i=j;out+=texHTML(x,depth+1);}
      else if(MD_RICH&&/^(textit|textrm|mbox)$/.test(name)){const [x,j]=arg(i);i=j;out+=esc(arNum(x));}
      else if(MD_RICH&&name==="\\")out+=depth?" ":"<br>";
      else if(MD_RICH&&TEX_RICH[name]!==undefined)out+=esc(TEX_RICH[name]);
      else out+=esc(TEX_SYM[name]!==undefined?TEX_SYM[name]:name.length===1?name:"");
    }
    else if(c==="^"||c==="_"){const [x,j]=arg(i+1);i=j;out+=c==="^"?`<sup>${texHTML(x,depth+1)}</sup>`:`<sub>${texHTML(x,depth+1)}</sub>`;}
    else if(c==="{"||c==="}")i++;
    else{let j=i;while(j<t.length&&!"\\^_{}".includes(t[j]))j++;out+=esc(arMath((MD_RICH?t.slice(i,j).replace(/&/g,""):t.slice(i,j)).replace(/-/g,"−").replace(/\*/g,"×")));i=j;}
  }
  return out;
}
function tex(t){
  if(AR_MATH)return `<span class="m">${ratioRTL(texHTML(String(t).trim()))}</span>`;
  try{ if(window.katex) return `<span class="m">${katex.renderToString(t,{output:"mathml",throwOnError:false})}</span>`; }catch(e){}
  return `<span class="m">${esc(t)}</span>`;
}
/* teacher mode: the teacher doesn't know the library codes (m62), so each code becomes the misconception's name.
   If the model already wrote the name after the code, the code and its separator are dropped; otherwise the code is replaced by «name». */
const arNorm=s=>String(s).replace(/[\u064B-\u0652\u0640]/g,"").replace(/[أإآ]/g,"ا");
function plainCodes(s){
  return String(s).replace(/(الخطأ\s+|خطأ\s+)?(\*\*)?\b(m\d{2})\b(\*\*)?(\s*[|:\u2013\u2014-]\s*)?/g,(all,pre,b1,id,b2,sep,off,str)=>{
    const m=misById[id];if(!m)return all;
    const first=arNorm(m.title).split(/\s+/)[0];
    const rest=arNorm(str.slice(off+all.length).replace(/^[\s*«"(]+/,""));
    if(first.length>=3&&rest.startsWith(first))return b1&&!b2?b1:"";
    return (pre||"")+(b1||"")+"«"+m.title+"»"+(b2||"")+(sep||"");
  });
}
function inline(s){
  /* teacher mode: misconception codes (m62) and Latin words (SVG, cm) stay as written; only single letters are variables */
  if(MD_RICH)return String(s).split(/(\$\$[^$\n]+\$\$|\$[^$\n]+\$|\bm\d{2}\b|#[0-9a-fA-F]{6}\b|[A-Za-z]{2,}(?:[-_][A-Za-z]+)*)/g).map(p=>/^\$\$[^$]+\$\$$/.test(p)?tex(p.slice(2,-2)):/^\$[^$]+\$$/.test(p)?tex(p.slice(1,-1))
      :/^m\d{2}$/.test(p)?`<bdi class="mcode" data-latin${misById[p]?` title="${esc(misById[p].title)}"`:""}>${p}</bdi>`
      :/^(#[0-9a-fA-F]{6}|[A-Za-z]{2,}(?:[-_][A-Za-z]+)*)$/.test(p)?`<bdi data-latin>${esc(p)}</bdi>`:mathify(p.replace(/`+/g,"").replace(/\$/g,""))).join("")
    .replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/(^|[^*])\*([^*\s](?:[^*]*[^*\s])?)\*(?!\*)/g,"$1<em>$2</em>");
  return String(s).split(/(\$\$[^$\n]+\$\$|\$[^$\n]+\$)/g).map(p=>/^\$\$[^$]+\$\$$/.test(p)?tex(p.slice(2,-2)):/^\$[^$]+\$$/.test(p)?tex(p.slice(1,-1)):mathify(p)).join("").replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>");
}
/* a drawing written by the model (teacher mode): rebuilt element by element from a short allow-list, so no script,
   style, link, image or event handler can get through. Text is shown in the school notation. */
const SVG_OK=new Set(["svg","g","rect","circle","ellipse","line","polyline","polygon","path","text","tspan","title","desc"]);
const SVG_AT=new Set(["viewbox","x","y","x1","y1","x2","y2","cx","cy","r","rx","ry","width","height","d","points","fill","stroke","stroke-width","stroke-dasharray","stroke-linecap","stroke-linejoin","opacity","fill-opacity","stroke-opacity","transform","font-size","font-weight","text-anchor","dominant-baseline","dx","dy"]);
function svgHTML(src){
  src=String(src);if(src.length>20000)return"";
  let root=null;try{root=new DOMParser().parseFromString(src,"text/html").querySelector("svg");}catch(e){}
  if(!root)return"";
  const NS="http://www.w3.org/2000/svg";let n=0;
  const copy=(el,top)=>{
    const tag=String(el.localName||"").toLowerCase();if(!SVG_OK.has(tag)||++n>300)return null;
    const out=document.createElementNS(NS,tag);
    for(const a of Array.from(el.attributes)){
      const k=a.name.toLowerCase(),v=String(a.value).trim();
      if(!SVG_AT.has(k))continue;
      if(v.length>(k==="d"||k==="points"?6000:120)||/[<>]|url\s*\(|javascript:|expression|&#/i.test(v)){if(k==="fill")out.setAttribute("fill","#e5e7eb");continue;}
      if(top&&k!=="viewbox")continue;
      out.setAttribute(k==="viewbox"?"viewBox":k,v);
    }
    if(tag==="text"&&AR_MATH){const a=out.getAttribute("text-anchor");out.setAttribute("direction","rtl");out.setAttribute("text-anchor",a==="middle"?"middle":a==="end"?"start":"end");}
    for(const c of Array.from(el.childNodes)){
      if(c.nodeType===3){if(/^(text|tspan|title|desc)$/.test(tag)){
        let t=c.nodeValue.replace(/\s+/g," ");if(!t.trim())continue;
        if(AR_MATH)t=arProse(t.replace(/\$/g,"").replace(/-(?=\s?[0-9٠-٩])/g,"−"));
        /* a power (3² or 3^2) is raised, as in the book */
        const parts=t.replace(/[²³⁴⁵]/g,x=>"^"+(AR_MATH?arDigits(SUPS[x]):SUPS[x])).split(/\^([0-9٠-٩]+)/);
        parts.forEach((x,i)=>{if(!x)return;
          const mk=AR_MATH?"\u200F":""; /* keeps the power on the left of its base, as in the book */
          if(i%2){const sp=document.createElementNS(NS,"tspan");sp.setAttribute("dy","-0.55em");sp.setAttribute("font-size","70%");sp.textContent=mk+x+mk;out.appendChild(sp);}
          else if(i){const sp=document.createElementNS(NS,"tspan");sp.setAttribute("dy","0.385em");sp.textContent=x;out.appendChild(sp);}
          else out.appendChild(document.createTextNode(x));});
      }}
      else if(c.nodeType===1){const k=copy(c,false);if(k)out.appendChild(k);}
    }
    return out;
  };
  const out=copy(root,true);if(!out||!out.childNodes.length)return"";
  const num=v=>{const x=parseFloat(v);return isFinite(x)&&x>0?x:0;};
  let vb=String(out.getAttribute("viewBox")||"").trim().split(/[\s,]+/).map(Number);
  if(vb.length!==4||vb.some(x=>!isFinite(x))||vb[2]<=0||vb[3]<=0)vb=[0,0,num(root.getAttribute("width"))||320,num(root.getAttribute("height"))||200];
  out.setAttribute("viewBox",vb.join(" "));out.setAttribute("class","figsvg usvg");out.setAttribute("role","img");out.setAttribute("direction","ltr");
  out.setAttribute("style","max-width:"+Math.round(Math.min(520,Math.max(240,vb[2]*1.4)))+"px");
  return `<figure class="fig chatfig">${out.outerHTML}</figure>`;
}
/* a drawing the tutor asked for: <draw>{…}</draw> (figures.js checks the numbers and draws it) */
function drawHTML(json){
  let d=null;try{d=JSON.parse(json);}catch(e){}
  const g=d&&typeof FIG!=="undefined"&&FIG.draw?FIG.draw(d):"";
  return g?`<figure class="fig chatfig">${g}</figure>`:"";
}
/* o.game(json): how a <game>{…}</game> tag is shown (only the chat passes it) */
function md(text,o){
  o=o||{};
  if(o.rich){MD_RICH=true;try{return md(richPrep(text,o.svgs=[]),Object.assign({},o,{rich:false,rich2:true}));}finally{MD_RICH=false;}}
  const src=String(text).replace(/\s*(<game>[\s\S]*?<\/game>|<draw>[\s\S]*?<\/draw>|<image\b[^>]*\/?>)\s*/g,(_,t)=>"\n"+t.replace(/\s*\n\s*/g," ")+"\n")
    .replace(/<(game|draw)>[^\n]*$/,"");                                   /* a tag still being written is not shown */
  const lines=src.split("\n"); let html="",list=null,para=[],tbl=null;
  const fp=()=>{if(para.length){html+=`<p>${para.map(inline).join("<br>")}</p>`;para=[];}};
  const fl=()=>{if(list){html+=`<${list.t}${list.start>1?` start="${list.start}"`:""}>${list.items.map(i=>`<li>${inline(i)}</li>`).join("")}</${list.t}>`;list=null;}};
  const ft=()=>{if(tbl){const rows=tbl.rows.slice(0,9).map(r=>r.slice(0,4)),head=tbl.head&&rows.length>1?rows.shift():null;
    html+=`<div class="tblwrap"><table class="mtbl">${head?`<thead><tr>${head.map(c=>`<th>${inline(c)}</th>`).join("")}</tr></thead>`:""}<tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;tbl=null;}};
  const all=()=>{fp();fl();ft();};
  for(const ln of lines){
    const t=ln.trim(),gm=t.match(/^<game>(.*)<\/game>$/),dr=t.match(/^<draw>(.*)<\/draw>$/),dm=t.match(/^\$\$([^$]+)\$\$$/);
    if(gm){all();html+=o.game?o.game(gm[1]):"";continue;}
    if(dr){all();html+=drawHTML(dr[1]);continue;}
    if(/^<image\b[^>]*\/?>$/.test(t)){all();continue;}                    /* no approved pictures yet */
    if(dm){all();html+=`<div class="dmath">${tex(dm[1])}</div>`;continue;}
    if(o.rich2){
      const sv=t.match(/^\u0001(\d+)\u0001$/),hd=t.match(/^#{1,6}\s+(.*)$/);
      if(sv){all();html+=svgHTML(o.svgs[+sv[1]]);continue;}
      if(hd){all();html+=`<h4 class="mh">${inline(hd[1].replace(/\s*#+$/,""))}</h4>`;continue;}
      if(/^([-*_])(\s*\1){2,}$/.test(t)){all();html+='<hr class="mhr">';continue;}
    }
    if(/^\|.*\|$/.test(t)){fp();fl();
      if(/^\|[\s:|-]+\|$/.test(t)){if(tbl)tbl.head=true;}
      else{if(!tbl)tbl={rows:[],head:false};tbl.rows.push(t.slice(1,-1).split("|").map(c=>c.trim()));}
      continue;}
    ft();
    const ol=ln.match(/^\s*([0-9٠-٩]+)[.)]\s+(.*)$/),u=ln.match(/^\s*[-•*]\s+(.*)$/);
    if(ol){fp();if(!list||list.t!=="ol"){fl();list={t:"ol",items:[]};if(o.rich2)list.start=parseInt(ol[1].replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d)),10)||1;}list.items.push(ol[2]);}
    else if(u){fp();if(!list||list.t!=="ul"){fl();list={t:"ul",items:[]};}list.items.push(u[1]);}
    else if(!t){fp();fl();}
    else{fl();para.push(ln.replace(/^#{1,4}\s+/,""));}
  }
  all();return html;
}
/* teacher mode: tidy the model's Markdown before it is drawn. Drawings are taken out (and put back by number),
   LaTeX brackets become $…$, code fences and quote marks are dropped, a drawing still being written is hidden. */
function richPrep(text,svgs){
  return String(text)
    .replace(/```(?:svg|xml|html)?[ \t]*\n?\s*(<svg[\s\S]*?<\/svg>)\s*\n?```/gi,(_,g)=>"\n\u0001"+(svgs.push(g)-1)+"\u0001\n")
    .replace(/<svg[\s\S]*?<\/svg>/gi,g=>"\n\u0001"+(svgs.push(g)-1)+"\u0001\n")
    .replace(/```(?:svg|xml|html)?[ \t]*\n?\s*<svg[\s\S]*$/i,"").replace(/<svg[\s\S]*$/i,"")
    .replace(/^[ \t]*```[\w-]*[ \t]*$/gm,"")
    .replace(/\$\$([\s\S]+?)\$\$/g,(a,m)=>m.includes("\n")?"\n$$"+m.trim().replace(/\s*\n\s*/g," ")+"$$\n":a)
    .replace(/\\\[([\s\S]+?)\\\]/g,(_,m)=>"\n$$"+m.trim().replace(/\s*\n\s*/g," ")+"$$\n").replace(/\\\(([\s\S]+?)\\\)/g,(_,m)=>"$"+m.trim().replace(/\s*\n\s*/g," ")+"$")
    .replace(/^[ \t]*>[ \t]?/gm,"");
}
/* a reply that stopped at the length limit and its continuation are shown as one message */
function joinCut(a,b){
  a=String(a).replace(/```(?:svg|xml|html)?[ \t]*\n?\s*<svg(?:(?!<\/svg>)[\s\S])*$/i,"").replace(/<svg(?:(?!<\/svg>)[\s\S])*$/i,"").trimEnd();b=String(b).trim();
  return a+(/[.:،؛؟!]$/.test(a)||/^([-•*#>|]|[0-9٠-٩]+[.)]|```|<svg|\$\$)/.test(b)?"\n":" ")+b;
}
const CONT_MSG="أكمل ردّك السابق من النقطة التي انقطع عندها مباشرةً، بلا مقدمة وبلا تكرار لما كتبته. إذا انقطع الرد داخل رسم فأعد كتابة الرسم كاملاً.";
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
  /* a diagnosis from before the grade-based one (no v:2) is dropped: the student plays the new one */
  if(S&&S.diag&&S.diag.v!==2)S.diag=null;
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
/* the student's grade (1–7), chosen at sign-up; the path holds the skills up to that grade */
/* every student is treated as a grade-7 student (the project's audience), so the path holds grades 1–7 */
const STUDENT_GRADE=7;
const gradeOf=p=>p?STUDENT_GRADE:0;
const gradeLv=g=>LEVELS.find(l=>l.g===g);
const inPathP=(p,sid)=>{const g=gradeOf(p);return !g||LV[skillById[sid].lv].g<=g;};
const pathOf=p=>SKILLS.filter(s=>inPathP(p,s.id));
const diagOf=p=>p&&p.diag&&p.diag.v===2?p.diag:null;
/* old diagnoses (before v:2) also had lvPass; kept so an old record still reads */
const assumedBy=(lvPass,lv)=>Object.entries(lvPass||{}).some(([l,ok])=>ok&&LV[l]&&LV[l].g>LV[lv].g);
const stOf=(d,sid)=>d.skills[sid]||(assumedBy(d.lvPass,skillById[sid].lv)?"assumed":"untested");
const statusOf=(p,sid)=>diagOf(p)?stOf(p.diag,sid):null;
const isLitP=(p,sid)=>!!p.lit[sid]||["mastered","assumed"].includes(statusOf(p,sid));
const isLit=sid=>isLitP(S,sid);
const currentSkillP=p=>pathOf(p).find(s=>!isLitP(p,s.id))||null;
const currentSkill=()=>currentSkillP(S);
/* prerequisite lock: after the diagnosis a skill opens when every skill it builds on is lit.
   Skills above the student's grade open only when the whole path is lit. */
const preLitP=(p,sid)=>preOf(sid).every(x=>isLitP(p,x));
const canOpenP=(p,id)=>{if(!diagOf(p))return false;if(isLitP(p,id))return true;if(!inPathP(p,id))return !currentSkillP(p)&&preLitP(p,id);return preLitP(p,id);};
const canOpen=id=>canOpenP(S,id);
function vLocked(sid){
  const c=currentSkill(),sk=skillById[sid];
  app.innerHTML=`<section class="view"><div class="card locked" style="display:grid;gap:12px">
    <div class="row between"><a class="btn btn-line btn-sm" href="#path">← مساري</a><span class="chip plain">مقفلة</span></div>
    <p class="eyebrow">${LV[sk.lv].name} · مهارة ${skNum(sid)}</p>
    <h2><span class="sknum">${skNum(sid)}</span>${esc(sk.title)}</h2>
    <p class="muted">${!S.diag?"هالمهارة لسا مقفلة. العب رحلة الفوانيس أول عشان نعرف من وين تبلّش."
      :!inPathP(S,sid)?"هاي مهارة من مستوى أعلى من صفك. بتنفتح لما تخلّص مسارك."
      :`هالمهارة بتنفتح لما تخلّص المهارات اللي بتعتمد عليها: ${preOf(sid).filter(x=>!isLit(x)).map(x=>`<b>${skNum(x)} ${esc(skillById[x].title)}</b>`).join("، ")}.`}</p>
    <div>${!S.diag?`<a class="btn btn-go" href="#play">ابدأ اللعبة</a>`:c?`<a class="btn btn-go" href="#skill-${c.id}">روح لمحطتك</a>`:`<a class="btn btn-go" href="#path">مساري</a>`}</div>
  </div></section>`;
}
const litCount=(p,lv)=>(lv?SK_LV[lv]:pathOf(p).map(s=>s.id)).filter(id=>isLitP(p,id)).length;
/* how a skill came out of the diagnosis: [words for the student, chip class, words for parents and the AI] */
const STATUS={mastered:["جاوبتها صح","lit","جاوب عليها صح"],assumed:["مفهومة من جوابك","good","مفهومة من جواب صح على مهارة مبنية عليها (ما انسأل عنها)"],partial:["بدها تقوية","calm","بدها تقوية"],gap:["رح نشتغل عليها","calm","غلط فيها"],untested:["رح نتأكد منها","plain","ما انسأل عنها، ورح يتأكد منها بالمسار"]};
const fmtDate=iso=>{try{return new Date(iso).toLocaleDateString("ar-PS-u-nu-latn",{day:"numeric",month:"long"});}catch(e){return String(iso).slice(0,10);}};
const fmtTime=iso=>{try{return new Date(iso).toLocaleString("ar-PS-u-nu-latn",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});}catch(e){return String(iso).slice(0,16);}};
const fmtN=k=>arNum(k<0?"−"+Math.abs(k):String(k));

/* ---------- parent notifications (simulated sending) ---------- */
function composeMsg(stu,kind,extra,ch){const m=composeMsg0(stu,kind,extra,ch);return m?{subject:arNum(m.subject),body:arNum(m.body)}:m;}
function composeMsg0(stu,kind,extra,ch){
  const p=stu.progress,nick=stu.nick,d=diagOf(p);
  const lines=[];let subject="";
  if(kind==="diag"&&d){
    const start=d.start?skillById[d.start]:null;
    const good=pathOf(p).filter(s=>stOf(d,s.id)==="mastered").map(s=>s.title);
    const weak=pathOf(p).filter(s=>["partial","gap"].includes(stOf(d,s.id))).map(s=>s.title);
    const ideas=Object.keys(d.mis||{}).map(id=>misById[id].title);
    subject=`نبراس · تقرير التشخيص الأولي لـ ${nick}`;
    if(ch==="sms")return{subject,body:`نبراس: ${nick} خلّص التشخيص الأولي. ${start?`البداية من «${start.title}» (${LV[start.lv].name}).`:"متمكّن من كل المهارات المختبرة."} التفاصيل بصفحة الأهالي.`};
    lines.push("مرحباً،",`${nick} خلّص لعبة التشخيص الأولي على نبراس بتاريخ ${fmtDate(d.at||new Date().toISOString())}.`,"");
    if(gradeOf(p))lines.push(`• الصف: ${gradeLv(gradeOf(p)).short}`);
    lines.push(`• أقدم فجوة: ${start?LV[start.lv].name:"ما في فجوات بالمهارات المختبرة"}`);
    if(start)lines.push(`• نقطة البداية: ${start.title}`);
    lines.push(`• جاوب صح على: ${good.length?good.join("، "):"—"}`);
    if(weak.length)lines.push(`• بحاجة لتقوية: ${weak.join("، ")}`);
    if(ideas.length)lines.push(`• أفكار رح نشتغل عليها: ${ideas.join("، ")}`);
    lines.push("","التقرير الكامل بصفحة الأهالي على نبراس.");
  }else if(kind==="skill"){
    const s=skillById[extra.skill];
    subject=`نبراس · ${nick} أتقن مهارة جديدة`;
    if(ch==="sms")return{subject,body:`نبراس: مبروك! ${nick} أتقن «${s.title}». صار ضاوي ${litCount(p)} من ${pathOf(p).length} فوانيس.`};
    lines.push("مبروك!",`${nick} أتقن مهارة «${s.title}» (${LV[s.lv].name}) بعد ${MASTER_STREAK} إجابات صحيحة متتالية من أول محاولة.`,`صار ضاوي ${litCount(p)} من ${pathOf(p).length} فوانيس بمساره.`);
  }else if(kind==="level"){
    const l=LV[extra.level],nx=currentSkillP(p);
    subject=`نبراس · ${nick} أنهى ${l.name}`;
    if(ch==="sms")return{subject,body:`نبراس: إنجاز! ${nick} أنهى كل مهارات ${l.name}.`};
    lines.push("إنجاز كبير!",`${nick} أتقن كل مهارات ${l.name}: ${SK_LV[l.id].map(id=>skillById[id].title).join("، ")}.`,nx?`المحطة الجاية: ${nx.title}.`:"أنهى كل محطات المسار.");
  }else if(kind==="link"){
    subject=`نبراس · تم ربط حساب ${nick}`;
    const st=d?(d.start?`نقطة البداية حالياً: ${skillById[d.start].title}.`:"متمكّن من كل المهارات المختبرة."):"لسا ما لعب لعبة التشخيص.";
    if(ch==="sms")return{subject,body:`نبراس: تم ربط حساب ${nick} بحسابك. ${st}`};
    lines.push(`تم ربط حساب ${nick} بحسابك على نبراس.`,st,`الفوانيس المضاءة: ${litCount(p)} من ${pathOf(p).length}.`);
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
function tabOf(r){if(r.startsWith("skill-")||r.startsWith("quiz-"))return"path";if(r==="result")return"play";return r;}
function renderNav(){
  const u=ME(),t=tabOf(route());
  const tabs=u&&u.role==="student"?TABS:[];
  document.body.classList.toggle("has-tabs",tabs.length>0);
  if(!u&&route()==="home"){
    $("#nav").innerHTML=[["ls-who","من هو نبراس؟"],["ls-for","لمن نبراس؟"],["nb-plans-h","الاشتراكات"],["ls-why","لماذا من المستوى؟"]].map(([id,l])=>`<a href="#home" data-sec="${id}">${l}</a>`).join("");
    $("#nav").querySelectorAll("[data-sec]").forEach(a=>a.onclick=e=>{e.preventDefault();const t=document.getElementById(a.dataset.sec);if(t)t.closest("section").scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});});
  } else $("#nav").innerHTML=tabs.filter(x=>x[0]!=="me").map(([id,l])=>`<a href="#${id}"${t===id?' aria-current="page"':""}>${l}</a>`).join("");
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
  document.body.classList.remove("wide");
  bindSession();renderNav();
  const u=ME(),r=route();
  if(!u){if(r==="auth-student")return vAuth("student");if(r==="auth-parent")return vAuth("parent");return vLanding();}
  if(u.role==="parent")return vParent();
  if(u.role==="teacher"){if(r!=="ask"){location.hash="#ask";return;}return vAsk();} /* guest teacher: chat only */
  if(r.startsWith("skill-")&&skillById[r.slice(6)])return canOpen(r.slice(6))?vSkill(r.slice(6)):vLocked(r.slice(6));
  if(r.startsWith("quiz-")&&skillById[r.slice(5)])return canOpen(r.slice(5))?vQuiz(r.slice(5)):vLocked(r.slice(5));
  ({home:vHome,play:vPlay,result:vResult,path:vPath,ask:vAsk,me:vMe}[r]||vHome)();
}
window.addEventListener("hashchange",()=>{if(G&&route()!=="play")G=null;if(P&&!route().startsWith("skill-"))P=null;if(QZ&&!route().startsWith("quiz-"))QZ=null;render();window.scrollTo(0,0);});

/* ---------- landing ---------- */
const IC_KID='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="3.5"/><path d="M6 21v-3a6 6 0 0 1 12 0v3"/><path d="M9 14l3 3 3-3"/></svg>';
const IC_PAR='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="7" r="3"/><circle cx="17" cy="9" r="2.3"/><path d="M2.5 20c.6-3.4 2.7-5.5 5.5-5.5s4.9 2.1 5.5 5.5M14 20c.4-2.6 1.6-4.2 3.2-4.2s2.9 1.6 3.3 4.2"/></svg>';
const IC_INFO='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/></svg>';
const IC_TEACH='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M7 8.5h7M7 11.5h4M12 16v4M8 20h8"/></svg>';
/* ---------- landing (home page) ----------
   the story while scrolling: a student stuck on a lesson → Nibras finds the gap → picks the start → learn → practise → progress */
const NB_GAMES=[
  {n:"فرقعة الفقاعات",d:"اختر الفقاعة الصحيحة قبل ما تطير.",svg:'<circle class="g-surf" cx="30" cy="40" r="17"/><circle class="g-fill" cx="62" cy="30" r="20"/><circle class="g-surf" cx="94" cy="44" r="14"/><circle class="g-soft" cx="56" cy="23" r="4"/>'},
  {n:"ضفدع خط الأعداد",d:"اقفز على خط الأعداد وشوف وين بتوقف.",svg:'<path class="g-line" d="M8 54h104" stroke-width="3"/><path class="g-line" d="M20 49v10M40 49v10M60 49v10M80 49v10M100 49v10" stroke-width="2"/><path class="g-dash" d="M30 46C40 12 74 12 86 46" stroke-width="2.5"/><circle class="g-fill" cx="86" cy="42" r="7"/>'},
  {n:"ميزان المعادلة",d:"وازن الطرفين حتى تلاقي قيمة المجهول.",svg:'<path class="g-line" d="M20 30h80" stroke-width="4"/><path class="g-soft2" d="M60 30l-12 32h24z"/><path class="g-fill" d="M10 44h28a14 8 0 0 1-28 0zM82 44h28a14 8 0 0 1-28 0z"/><path class="g-line" d="M24 30v14M96 30v14" stroke-width="2"/>'},
  {n:"تلوين الشريط",d:"لوّن أجزاء الشريط لتمثّل الكسر أو النسبة.",svg:'<rect class="g-surf" x="12" y="24" width="96" height="26" rx="6"/><rect class="g-fill" x="12" y="24" width="72" height="26" rx="6"/><path class="g-line" d="M36 24v26M60 24v26M84 24v26" stroke-width="2"/>'},
  {n:"ترتيب البطاقات",d:"رتّب الأعداد من الأصغر إلى الأكبر.",svg:'<rect class="g-surf" x="84" y="36" width="24" height="26" rx="5"/><rect class="g-surf" x="48" y="24" width="24" height="38" rx="5"/><rect class="g-fill" x="12" y="12" width="24" height="50" rx="5"/>'},
  {n:"لوحة الرموز",d:"اكتب جوابك بلوحة فيها كسور وأسس ورموز.",svg:'<rect class="g-surf" x="14" y="14" width="26" height="20" rx="5"/><rect class="g-surf" x="47" y="14" width="26" height="20" rx="5"/><rect class="g-fill" x="80" y="14" width="26" height="20" rx="5"/><rect class="g-surf" x="14" y="40" width="26" height="20" rx="5"/><rect class="g-surf" x="47" y="40" width="26" height="20" rx="5"/><rect class="g-surf" x="80" y="40" width="26" height="20" rx="5"/>'}
];
const NB_BULB='<svg class="nb-bulb" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="22" r="20" fill="var(--glow)" opacity=".28"/><circle cx="24" cy="22" r="11" fill="var(--lamp)"/><circle cx="20" cy="18" r="3.2" fill="#FFF3D1"/><rect x="18" y="35" width="12" height="5" rx="2" fill="var(--logo)"/></svg>';
function vLanding(){
  document.body.classList.add("wide");
  const L=(on,cls)=>LANTERN((on?"on":"off")+(cls?" "+cls:""));
  app.innerHTML=`<section class="view nb-home">

    <header class="nb-hero" aria-labelledby="nb-h1">
      <svg class="nb-path" viewBox="0 0 1200 520" preserveAspectRatio="none" aria-hidden="true"><path d="M1180 60 C 960 40, 900 300, 700 260 S 360 420, 40 470"/></svg>
      <div class="nb-hero-text">
        <p class="nb-kicker">${NB_BULB}<span>نبراس · تعلّم من مستواك</span></p>
        <h1 id="nb-h1">مش فاهم درس؟<br><span class="hl">خلّينا نرجع خطوة… ونكمّل مع بعض.</span></h1>
        <p class="nb-lead">نبراس منصة ذكية تساعدك تكتشف الفجوة اللي وقفت عندها في الرياضيات، وتبني طريقك من مستواك أنت.</p>
        <div class="nb-cta">
          <a class="btn btn-go" href="#auth-student">ابدأ رحلة التعلّم</a>
          <button class="btn btn-line" type="button" id="nb-watch"><svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18"><path d="M7 4v16l13-8z" fill="currentColor"/></svg>شاهد كيف يعمل نبراس</button>
        </div>
        <div class="nb-login">
          <span class="nb-login-l">الدخول</span>
          <nav class="rolei-row" aria-label="الدخول">
            <a class="rolei primary" href="#auth-student" aria-label="دخول الطلاب">${IC_KID}<span class="tip">دخول الطلاب</span></a>
            <a class="rolei" href="#auth-parent" aria-label="دخول الأهالي">${IC_PAR}<span class="tip">دخول الأهالي</span></a>
            <button class="rolei" id="guest-teacher" type="button" aria-label="دخول المعلمين (زائر)">${IC_TEACH}<span class="tip">دخول المعلمين</span></button>
          </nav>
        </div>
      </div>
      <div class="nb-video">
        <p class="nb-video-l"><i></i>شاهد نبراس في 46 ثانية</p>
        <div class="intro" id="intro"></div>
      </div>
    </header>

    <section class="nb-late" aria-labelledby="nb-late-h" data-rv>
      <div class="nb-symbols" aria-hidden="true"><span>÷</span><span>×</span><span>%</span><span>=</span><span>√</span><span>س</span><span>+</span><span>½</span></div>
      <div class="nb-late-lamp" aria-hidden="true">${L(true)}</div>
      <h2 id="nb-late-h">أنت مش متأخر.<br><span>أنت بس عندك محطة ناقصة.</span></h2>
      <p>أحيانًا ما تكون المشكلة في الدرس الحالي، بل في مهارة سابقة لم تكتمل بعد.</p>
    </section>

    <section class="nb-sec" id="ls-who-sec" aria-labelledby="ls-who">
      <div class="lsec-head" data-rv><span class="kick">من هو نبراس؟</span><h2 id="ls-who">رحلتك مع نبراس تبدأ من مكانك</h2></div>
      <div class="nb-steps" data-rv>
        <span class="line" aria-hidden="true"></span>
        <article class="nb-step"><span class="num">01</span><span class="ic"><svg class="step-ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" class="f"/><path d="M15.5 15.5L21 21"/><path d="M8 10.5h5M10.5 8v5"/></svg></span><h3>اكتشف</h3><b>نبراس يفهم مستواك</b><p>لعبة قصيرة، والذكاء الاصطناعي يقرأ إجاباتك ويكتشف المهارات التي تحتاج إلى تقوية.</p></article>
        <article class="nb-step"><span class="num">02</span><span class="ic"><svg class="step-ic" viewBox="0 0 24 24" aria-hidden="true"><path class="f" d="M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z"/><path d="M9.5 19h5M10.5 21.5h3"/></svg></span><h3>افهم</h3><b>تعلّم من النقطة التي توقّفت عندها</b><p>شرح مبسّط ومثال من الحياة اليومية، مناسب لمستواك.</p></article>
        <article class="nb-step"><span class="num">03</span><span class="ic"><svg class="step-ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9.5" r="6.5" class="f"/><path d="M12 6.4l1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.3z"/><path d="M8.5 15l-1.5 6.5 5-2.5 5 2.5-1.5-6.5"/></svg></span><h3>أتقن</h3><b>تدرّب حتى تثبت الفكرة</b><p>تمارين تفاعلية، والفانوس يضيء بعد ثلاث إجابات صحيحة متتالية.</p></article>      </div>
    </section>

    <section class="nb-sec" aria-labelledby="nb-games-h">
      <div class="lsec-head" data-rv><span class="kick">ستة أنواع من الألعاب</span><h2 id="nb-games-h">التعلّم مش لازم يكون ممل.</h2><p>تعلّم، جرّب، وتحدّى نفسك.</p></div>
      <div class="nb-games" id="nb-games">
        ${NB_GAMES.map((g,i)=>`<article class="nb-game"${i>2?" hidden":""}><svg viewBox="0 0 120 72" aria-hidden="true">${g.svg}</svg><h3>${g.n}</h3><p>${g.d}</p><a class="nb-game-cta" href="#auth-student">جرّبها في رحلة الفوانيس</a></article>`).join("")}
      </div>
      <div class="nb-more"><button class="btn btn-line btn-sm" type="button" id="nb-more" aria-expanded="false" aria-controls="nb-games">اعرض الألعاب الثلاث الباقية</button></div>
    </section>

    <section class="nb-sec" aria-labelledby="ls-for">
      <div class="lsec-head" id="ls-for" data-rv><span class="kick">لمن نبراس؟</span></div>
      <div class="lgrid" data-rv>
        <div class="lcard"><span class="ico">${IC_KID}</span><h3>الطالب</h3><p>يلعب ويكتشف أين توقّف، ويضيء فوانيسه واحدًا تلو الآخر. يدخل باسم مستعار وشخصية كرتونية، دون اسمه الحقيقي.</p><a class="btn btn-go btn-sm" href="#auth-student">دخول الطلاب</a></div>
        <div class="lcard"><span class="ico">${IC_PAR}</span><h3>وليّ الأمر</h3><p>يربط حساب ابنه أو ابنته برمز الربط، ويتابع تقرير التشخيص والفوانيس التي أضاءها، ويصله إشعار عند كل مرحلة.</p><a class="btn btn-line btn-sm" href="#auth-parent">دخول الأهالي</a></div>
        <div class="lcard"><span class="ico">${IC_TEACH}</span><h3>المعلّم</h3><p>مساعد للمعلّمة يفسّر سبب خطأ الطالبة ويقترح طريقة العلاج. هو أداة للمعلّمة، لا لتقييم الطالبة.</p><button class="btn btn-line btn-sm" type="button" data-guest>دخول المعلمين</button></div>
      </div>
    </section>

    <section class="nb-sec" id="nb-plans" aria-labelledby="nb-plans-h">
      <div class="lsec-head" data-rv><span class="kick">الاشتراكات</span><h2 id="nb-plans-h">اشتراك بسيط وواضح لكل طالب</h2><p>اشتراك شهري لكل طالب، يدفعه وليّ الأمر.</p></div>
      <div class="nb-plans" data-rv>
        <article class="nb-plan main">
          <span class="nb-plan-badge">لأولياء الأمور</span>
          <h3>اشتراك الطالب</h3>
          <p class="nb-price"><b>21</b><span>₪</span><small>شهريًا لكل طالب<br>(حوالي 6.89 دولار)</small></p>
          <ul>
            <li>رحلة التشخيص كاملة على الجزر الثلاث</li>
            <li>مسار التعلّم بمهارات من الصف ${LEVELS[0].short} إلى ${LEVELS[LEVELS.length-1].short}، محطة ورا محطة</li>
            <li>«اسأل نبراس» حتى ${DAILY_LIMIT} رسالة يوميًا</li>
            <li>صفحة الأهالي مع تقرير التشخيص وإشعار عند كل مرحلة</li>
          </ul>
          <a class="btn btn-go" href="#auth-parent">أنشئ حساب وليّ أمر</a>
        </article>
        <article class="nb-plan">
          <span class="nb-plan-badge alt">للمدارس والمديريات</span>
          <h3>اشتراك المدرسة</h3>
          <p class="nb-price ask"><b>بالاتفاق</b><small>يُحدَّد السعر بعد الحديث مع المدرسة أو المديرية</small></p>
          <ul>
            <li>حسابات لطلبة الصف السابع في المدرسة</li>
            <li>مساعد المعلّم لفهم سبب خطأ الطالب وطريقة العلاج</li>
          </ul>
          <button class="btn btn-line" type="button" data-guest>جرّب مساعد المعلّم</button>
        </article>
      </div>
    </section>
    <section class="nb-sec" aria-labelledby="ls-why">
      <div class="lsec-head" data-rv><span class="kick">لماذا من المستوى؟</span><h2 id="ls-why">قائم على منهجية «التعليم حسب المستوى الفعلي»</h2></div>
      <div class="lwhy" data-rv>
        <p>طوّرت منظمة براثام (<bdi dir="ltr">Pratham</bdi>) في الهند منهجية <bdi dir="ltr">Teaching at the Right Level (TaRL)</bdi>، وفكرتها أن يتعلّم الطلاب حسب مستواهم الحقيقي، لا حسب منهاج صفّهم.</p>
        <p>قيّم مختبر <bdi dir="ltr">J-PAL</bdi> هذه المنهجية بتقييمات عشوائية في أكثر من سياق، ووصلت في زامبيا إلى معظم مدارس الدولة بحلول عام 2019 بالشراكة مع وزارة التربية.</p>
        <p>يطبّق نبراس الفكرة نفسها على طلبة الصف السابع في الرياضيات: تشخيص فردي، ومكتبة أخطاء مفاهيمية تشرح سبب خطأ الطالب، ومسار يبدأ من أول مهارة ناقصة.</p>
      </div>
    </section>

    <section class="nb-final" aria-labelledby="nb-final-h">
      <div class="nb-final-lamp" aria-hidden="true">${NB_BULB}</div>
      <h2 id="nb-final-h">مستعد تبدأ رحلتك؟</h2>
      <p>رحلتك في الرياضيات ما لازم تبدأ من أول الكتاب.<br>ابدأ من المكان اللي تحتاجه أنت.</p>
      <a class="btn btn-go" href="#auth-student">ابدأ رحلتك مع نبراس</a>
      <p class="nb-final-tags">بسيط · ذكي · مصمّم لمستواك</p>
    </section>

  </section>`;
  const gb=$("#guest-teacher");if(gb)gb.onclick=guestTeacher;
  app.querySelectorAll("[data-guest]").forEach(x=>x.onclick=guestTeacher);
  if(window.NibrasIntro)NibrasIntro.mount($("#intro"));
  const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  $("#nb-watch").onclick=()=>{const v=$(".nb-video");if(v)v.scrollIntoView({behavior:reduce?"auto":"smooth",block:"center"});const p=$("#intro .intro-play");if(p&&!p.hidden)p.click();};
  $("#nb-more").onclick=e=>{const b=e.currentTarget,open=b.getAttribute("aria-expanded")==="true";app.querySelectorAll(".nb-game").forEach((g,i)=>{if(i>2)g.hidden=open;});b.setAttribute("aria-expanded",String(!open));b.textContent=open?"اعرض الألعاب الثلاث الباقية":"اعرض أقل";};
  const els=app.querySelectorAll("[data-rv]");
  if(!reduce&&"IntersectionObserver" in window){
    const io=new IntersectionObserver(es=>es.forEach(en=>{if(en.isIntersecting){en.target.classList.remove("rv-wait");en.target.classList.add("rv-in");io.unobserve(en.target);}}),{threshold:.12,rootMargin:"0px 0px -40px 0px"});
    els.forEach(el=>{if(el.getBoundingClientRect().top>innerHeight){el.classList.add("rv-wait");io.observe(el);}else el.classList.add("rv-in");});
  }else els.forEach(el=>el.classList.add("rv-in"));
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
      <p class="lead">${d?(cur?`محطتك الجاية: <b style="color:var(--logo)">${esc(cur.title)}</b> (${LV[cur.lv].name}).`:"ضوّيت كل الفوانيس! جرّب تتحدّى حالك مع نبراس."):"خلينا نكتشف من وين تبلّش بلعبة قصيرة، ألغازها بتتغيّر حسب جوابك."}</p>
      <div class="row" style="justify-content:center">
        <a class="btn btn-go" href="#${d?(cur?"skill-"+cur.id:"path"):"play"}">${d?"كمّل رحلتك":"ابدأ اللعبة"}</a>
        <a class="btn btn-line" href="#ask">اسأل نبراس</a>
      </div>
    </div>
    <div class="lvgrid">${LEVELS.filter(l=>!gradeOf(S)||l.g<=gradeOf(S)).map(l=>{const n=SK_LV[l.id].length,k=litCount(S,l.id);return `<div class="lvbox"><div class="row between"><h4>${l.name}</h4><span class="chip ${k===n?"lit":"plain"}">${k} من ${n}</span></div><div class="pbar" aria-hidden="true"><i style="width:${Math.round(k/n*100)}%"></i></div></div>`;}).join("")}</div>
    <p class="draft">المحتوى مسودة بانتظار مراجعة معلم رياضيات ومطابقته مع المنهاج.</p>
  </section>`;
}

/* ---------- me (student account) ---------- */
function vMe(){
  const u=ME(),pc=Store.parentCount();
  app.innerHTML=`<section class="view">
    <div class="card" style="display:grid;gap:16px">
      <div class="kidhead"><span class="avatar-lg">${avatar(u.avatar)}</span><div class="grow"><p class="eyebrow">حسابي</p><h2>${esc(u.nick)}</h2><p class="small muted">${gradeOf(S)?"الصف "+gradeLv(gradeOf(S)).short:"لسا ما اخترت صفك"}</p></div></div>
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
  $("#saveme").onclick=async()=>{const n=$("#nick2").value.trim();if(!n){toast("اكتب اسم مستعار");return;}const r=await Store.updateMe({nick:n.slice(0,16),avatar:av});if(!r.ok){toast("ما انحفظ: "+r.err);return;}
    renderNav();vMe();toast("انحفظ");};
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
/* ---------- maths keyboard: digits, operations and symbols in the school notation ----------
   Used by the chat («١٢٣» opens it) and by the «اكتب جوابك» box of the questions (always there).
   While it is in use the phone keyboard stays closed (inputmode="none"); «أ ب ج» gives it back.
   On a computer both work together.
   Each key: t = text put at the cursor · lab/html = what the key shows · cap = small caption.
   letters: the variables offered in the top row (the question's own letters, otherwise x y z). */
const PAD_KEY="nibras.pad";
function padDefault(){try{const v=localStorage.getItem(PAD_KEY);if(v==="1")return true;if(v==="0")return false;}catch(e){}return matchMedia("(pointer: fine)").matches&&innerWidth>=700;}
function padRows(letters){
  const d=n=>({t:arMath(String(n)),cls:"dig"}),v=c=>({t:arMath(c),cls:"sym"}),R=AR_MATH;
  const L=(letters&&letters.length?letters.slice(0,3):[]).concat(["x","y","z"].filter(c=>!(letters||[]).includes(c))).slice(0,3).map(v);
  const open={t:"(",html:`<span dir="${R?"rtl":"ltr"}">(</span>`,cls:"sym"},close={t:")",html:`<span dir="${R?"rtl":"ltr"}">)</span>`,cls:"sym"};
  const lt={t:" < ",html:`<span dir="${R?"rtl":"ltr"}">&lt;</span>`,cap:"أصغر من",cls:"sym"},gt={t:" > ",html:`<span dir="${R?"rtl":"ltr"}">&gt;</span>`,cap:"أكبر من",cls:"sym"};
  return [
    [...(R?[close,open,...L.slice().reverse()]:[...L,open,close]),{act:"del",html:"⌫",cap:"امسح",cls:"del"}],
    [{t:"²",html:`<span dir="${R?"rtl":"ltr"}">▢<sup>${arMath("2")}</sup></span>`,cap:"تربيع",cls:"sym"},{t:"/",html:'<span class="frac"><span>▢</span><span>▢</span></span>',cap:"كسر",cls:"sym"},d(7),d(8),d(9),{t:" ÷ ",lab:"÷",cap:"قسمة",cls:"op"}],
    [{t:"³",html:`<span dir="${R?"rtl":"ltr"}">▢<sup>${arMath("3")}</sup></span>`,cap:"تكعيب",cls:"sym"},{t:R?"٪":"%",cap:"بالمئة",cls:"sym"},d(4),d(5),d(6),{t:" × ",lab:"×",cap:"ضرب",cls:"op"}],
    [{t:"√",cap:"جذر",cls:"sym"},{t:" : ",lab:":",cap:"نسبة",cls:"sym"},d(1),d(2),d(3),{t:"−",cap:"طرح",cls:"op"}],
    [R?lt:gt,R?gt:lt,d(0),{t:R?"٫":".",cap:"فاصلة",cls:"dig"},{t:" = ",lab:"=",cap:"يساوي",cls:"op"},{t:" + ",lab:"+",cap:"جمع",cls:"op"}],
    [{t:"|",cap:"قيمة مطلقة",cls:"sym"},{t:" ",lab:"مسافة",cls:"wide"},{act:"abc",lab:"أ ب ج",cls:"abc",cap:""}]
  ];
}
/* o: {letters, small, locked} */
function padHTML(o){
  o=o||{};
  return `<div class="mpadbox"><div class="mpad ${o.small?"sm":""}" role="group" aria-label="لوحة الأرقام والرموز">${padRows(o.letters).map(r=>r.map(k=>
    `<button type="button" class="${k.cls||""}" ${k.act?`data-act="${k.act}"`:`data-t="${esc(k.t)}"`} aria-label="${esc(k.cap||k.lab||k.t)}" ${o.locked?"disabled":""}>${k.html||esc(k.lab||k.t)}${k.cap?`<small>${k.cap}</small>`:""}</button>`).join("")).join("")}</div></div>`;
}
/* the keys write into `box` (an input or a textarea) at the cursor; onAbc(button) is the «أ ب ج» key */
function bindPad(mp,box,onAbc){
  const fire=()=>box.dispatchEvent(new Event("input",{bubbles:true}));
  const put=t=>{const s=box.selectionStart??box.value.length,e=box.selectionEnd??s,v=box.value;
    if(t[0]===" "&&(s===0||/\s/.test(v[s-1])))t=t.slice(1);          /* no double spaces around an operation */
    if(t.length>1&&t[t.length-1]===" "&&/\s/.test(v[e]||""))t=t.slice(0,-1);
    box.value=v.slice(0,s)+t+v.slice(e);const p=s+t.length;box.focus();try{box.setSelectionRange(p,p);}catch(_){}fire();};
  const del=()=>{const s=box.selectionStart??box.value.length,e=box.selectionEnd??s,a=s===e?Math.max(0,s-1):s;box.value=box.value.slice(0,a)+box.value.slice(e);box.focus();try{box.setSelectionRange(a,a);}catch(_){}fire();};
  mp.addEventListener("mousedown",e=>e.preventDefault());             /* the text box keeps the cursor */
  mp.querySelectorAll("button").forEach(b=>b.onclick=()=>{
    if(b.dataset.act==="del")del();else if(b.dataset.act==="abc"){if(onAbc)onAbc(b);}else put(b.dataset.t);beep("pop");});
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
      <input id="ans" class="ans" type="text" aria-label="اكتب جوابك" inputmode="none" dir="${AR_MATH?"rtl":"ltr"}" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="اكتب جوابك من اللوحة تحت" ${o.locked?"disabled":""}>
      <p class="anspv" hidden><span class="tiny">جوابك بشكل الكتاب:</span> <span class="m" id="anspv"></span></p>
      ${padHTML({letters:[...new Set(String(q.stem).match(/[a-z]/g)||[])],small:true,locked:o.locked})}
    </div>`;
    const inp=$("#ans",host);inp.value=arMath(o.init||"");
    /* a fraction, power or root typed as text («٤/٥») is shown again under the box the way the book writes it */
    const pv=host.querySelector(".anspv"),showPv=()=>{const v=inp.value.trim();const on=/[\/²³√]/.test(v);pv.hidden=!on;
      if(on)$("#anspv",host).innerHTML=mathify(v.replace(/[\u0621-\u064A]/g,c=>LAT_VAR[c]||c).replace(/[٠-٩٫]/g,c=>AR_DIG[c]));};
    const sync=()=>{showPv();o.onChange&&o.onChange(!!inp.value.trim());};
    showPv();
    /* what the student types turns into school notation as they type (1 → ١, x → س);
       skipped while a phone keyboard is still composing a word */
    const local=()=>{const v=inp.value,nv=arMath(v);if(nv!==v){const s=inp.selectionStart,e=inp.selectionEnd;inp.value=nv;try{inp.setSelectionRange(s,e);}catch(_){}}};
    inp.addEventListener("input",ev=>{if(!ev.isComposing)local();sync();});
    inp.addEventListener("compositionend",()=>{local();sync();});
    inp.addEventListener("blur",local);
    inp.addEventListener("keydown",e=>{if(e.key==="Enter"&&inp.value.trim()){e.preventDefault();o.onEnter&&o.onEnter();}});
    /* «أ ب ج»: give the phone keyboard back (and take it away again) */
    bindPad($(".mpad",host),inp,b=>{const dev=inp.getAttribute("inputmode")==="none";inp.blur();if(dev)inp.removeAttribute("inputmode");else inp.setAttribute("inputmode","none");b.textContent=dev?arMath("123"):"أ ب ج";setTimeout(()=>inp.focus(),30);});
    if(!o.locked&&!matchMedia("(pointer: coarse)").matches)setTimeout(()=>inp.focus(),30);
    return{value:()=>inp.value.trim(),ready:()=>!!inp.value.trim()};
  }
  if(q.type==="hop"){
    const MIN=-10,MAX=10;let v=o.init!=null?o.init:q.start,moved=o.init!=null;
    const ticks=[];for(let k=MIN;k<=MAX;k++)ticks.push(`<button type="button" class="tick ${k===0?"zero":""}" data-v="${k}" aria-label="${fmtN(k)}" ${o.locked?"disabled":""}><span class="tk"></span><span dir="${AR_MATH?"rtl":"ltr"}">${fmtN(k)}</span></button>`);
    host.innerHTML=`<div class="nlwrap"><div class="nl">${ticks.join("")}<div class="startmark" style="--i:${q.start-MIN}">البداية</div><div class="frog" id="frog" style="--i:${v-MIN}">${FROG}</div></div></div>
      <div class="hopctl" dir="ltr"><button type="button" data-d="-1" ${o.locked?"disabled":""} aria-label="خطوة لليسار">⟵ <span dir="${AR_MATH?"rtl":"ltr"}">${fmtN(-1)}</span></button><output id="hv" aria-live="polite" dir="${AR_MATH?"rtl":"ltr"}">${fmtN(v)}</output><button type="button" data-d="1" ${o.locked?"disabled":""} aria-label="خطوة لليمين"><span dir="${AR_MATH?"rtl":"ltr"}">+${fmtN(1)}</span> ⟶</button></div>`;
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
        <div class="slots" style="--n:${items.length}">${items.map((_,k)=>`<div class="slot"><small>${k+1}</small>${placed[k]!=null?`<button type="button" data-k="${k}" ${o.locked?"disabled":""}>${mx(items[placed[k]])}</button>`:""}</div>`).join("")}</div>
        <div class="pool">${items.map((t,i)=>placed.includes(i)?"":`<button type="button" data-i="${i}" ${o.locked?"disabled":""}>${mx(t)}</button>`).join("")||`<span class="tiny">كل البطاقات بمكانها. اضغط على بطاقة لترجعها.</span>`}</div>
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
  const a=(AR_MATH?-1:1)*(tilt||0),xl=AR_MATH?290:70,xr=AR_MATH?70:290,dir=AR_MATH?"rtl":"ltr",fam=AR_MATH?"Tajawal, Nunito, sans-serif":"Nunito, sans-serif";
  return `<svg class="scale" viewBox="0 0 360 150" role="img" aria-label="ميزان: ${esc(arMath(l))} في كفة و ${esc(arMath(r))} في الكفة الثانية">
    <rect x="172" y="34" width="16" height="96" rx="6" fill="var(--brand)"/>
    <rect x="128" y="128" width="104" height="12" rx="6" fill="var(--brand)"/>
    <g class="beam" style="transform:rotate(${a}deg)">
      <rect x="40" y="28" width="280" height="9" rx="4.5" fill="var(--brand)"/>
      <path d="M70 37 50 86M70 37 90 86M290 37 270 86M290 37 310 86" stroke="var(--ink-3)" stroke-width="2"/>
      <path d="M30 86h80a40 18 0 0 1-80 0z" fill="var(--glow-soft)" stroke="var(--lamp)" stroke-width="2"/>
      <path d="M250 86h80a40 18 0 0 1-80 0z" fill="var(--glow-soft)" stroke="var(--lamp)" stroke-width="2"/>
      <text x="${xl}" y="78" text-anchor="middle" font-family="${fam}" font-weight="900" font-size="22" fill="var(--ink)" style="direction:${dir};unicode-bidi:isolate">${esc(arMath(l))}</text>
      <text x="${xr}" y="78" text-anchor="middle" font-family="${fam}" font-weight="900" font-size="22" fill="var(--ink)" style="direction:${dir};unicode-bidi:isolate">${esc(arMath(r))}</text>
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

/* ---------- diagnosis game ----------
   18 fixed puzzles, from grade 1 up to grade 7, one question per skill:
   grades 1–3 → the four grade-3 skills (they build on grades 1 and 2) · grades 4–6 → every skill (10) · grade 7 → every skill (4).
   Right = «mastered»; wrong or «مش عارف» = «gap». A grade 1–2 skill that was not asked counts as «assumed» when a
   grade-3 skill built on it was right (not through a skill that was wrong); otherwise it stays «untested» and is in the path. */
const DIAG_PLAN=SKILLS.filter(s=>LV[s.lv].g>=3).map(s=>s.id);
let G=null;
function setQ(id){G.q=qById[id];G.w=null;}
function startGame(){
  G={plan:DIAG_PLAN.slice(),i:-1,res:{},asked:[],pending:[],trail:[],inter:null,lv:null,prev:null,grade:gradeOf(S)};
  goNext(true);
  if(window.claude&&claude.use)claude.use("permissions").then(p=>p&&p.request(["sample"])).catch(()=>{});
}
function goNext(first){
  G.i++;const sid=G.plan[G.i];if(!sid)return endGame();
  const lv=skillById[sid].lv,prev=G.lv;
  setQ(DIAG_PICK[sid][0]);
  /* the first island covers grades 1–3 */
  if(first)LEVELS.filter(l=>l.g<LV[lv].g).forEach(l=>G.trail.push(l.id));
  if(!G.trail.includes(lv))G.trail.push(lv);
  G.lv=lv;
  if(!first&&prev!==lv){G.prev=prev;G.inter="up";return drawInterlude();}
  drawGame();
}
/* what the right answers vouch for: every skill below a right one, but not through a skill that was wrong */
function vouched(res){
  const out=new Set();
  Object.keys(res).filter(id=>res[id]==="mastered").forEach(id=>{const seen=new Set(),stack=[...preOf(id)];
    while(stack.length){const x=stack.pop();if(seen.has(x))continue;seen.add(x);if(res[x]&&res[x]!=="mastered")continue;if(!res[x])out.add(x);stack.push(...preOf(x));}});
  return out;
}
function record(val,skipped){
  const q=G.q;let r,a;
  if(skipped){r={ok:false,mis:null,src:"skip"};a="(مش عارف)";}else{r=grade(q,val);a=answerText(q,val);}
  const entry={q,qid:q.id,a,ok:r.ok,mis:r.mis,src:r.src,why:r.why||""};
  G.asked.push(entry);
  if(!r.ok&&r.mis&&r.src==="match")bump(r.mis);
  if(!r.ok&&r.src==="ai"){if(sampleFn)G.pending.push(aiDiagnose(entry,q));else entry.src="none";}
  G.res[q.skill]=r.ok?"mastered":"gap";
  return goNext();
}
function islandsHTML(){
  const g=G?G.grade:gradeOf(S);
  return `<div class="islands" aria-label="جزر المستويات">${LEVELS.filter(l=>!g||l.g<=g).map((l,i)=>{const now=G&&G.lv===l.id,done=G&&G.trail.includes(l.id)&&!now;
    return `${i?'<span class="isle-link" aria-hidden="true"></span>':""}<div class="isle ${now?"now":""} ${done?"done":""}"><span class="dot">${l.g}</span><small>${l.short}</small></div>`;}).join("")}</div>`;
}
function drawInterlude(){
  const l=LV[G.lv];beep("win");
  app.innerHTML=`<section class="game">${islandsHTML()}
    <div class="card interlude">${LANTERN("big on")}
      <h2>خلّصنا من جزيرة الصف ${LV[G.prev].short}</h2>
      <p class="muted">${G.inter==="up"?`يلا نطلع على <b>جزيرة ${l.short}</b>.`:`في مهارة بدها أساس من <b>جزيرة ${l.short}</b>. خلينا نتأكد منه عشان نبني عليه صح.`}</p>
      <button class="btn btn-go" id="goon" type="button">يلا</button>
    </div></section>`;
  $("#goon").onclick=()=>{G.inter=null;drawGame();};
}
function drawGame(){
  if(G.inter)return drawInterlude();
  const q=G.q,sk=skillById[q.skill],n=G.asked.length+1;
  app.innerHTML=`<section class="game">
    ${islandsHTML()}
    <div class="station"><span class="badge">${LV[G.lv].name}</span><span>${skNum(sk.id)} ${esc(sk.title)}</span><span class="qn">· لغز ${n}</span></div>
    <div class="puzzle" data-q="${q.id}">
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
  const n=DIAG_PLAN.length,low=DIAG_PLAN.filter(id=>LV[skillById[id].lv].g<=3).length,mid=DIAG_PLAN.filter(id=>{const g=LV[skillById[id].lv].g;return g>=4&&g<=6;}).length;
  app.innerHTML=`<section class="game"><div class="card" style="display:grid;gap:14px">
    <p class="eyebrow">أهلاً ${esc(ME().nick)}</p>
    <h2>رحلة الفوانيس</h2>
    <p class="muted">رحلتك بتطلع من جزيرة الأول لجزيرة السابع: ${arNum(low)} ألغاز من الصفوف الأولى، و${arNum(mid)} ألغاز من الرابع للسادس، و${arNum(n-low-mid)} ألغاز من السابع. ومن أجوبتك بنعرف الفجوات وبنبني مسارك.</p>
    ${islandsHTML()}
    <div class="row" style="justify-content:center;gap:8px">${Object.keys(TYPE_NAME).map(t=>`<span class="chip calm"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${TYPE_IC[t]}</svg>${TYPE_NAME[t]}</span>`).join("")}</div>
    <ul class="muted small" style="margin:0;padding-inline-start:1.2em">
      <li>${arNum(n)} لغز، لغز واحد لكل مهارة.</li>
      <li>ما في وقت ولا علامات. إذا ما بتعرف الجواب اكبس «مش عارف»، ورح نتعلّمها سوا بالمسار.</li>
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
  const skills={},ok=vouched(g.res);
  for(const s of pathOf(S))skills[s.id]=g.res[s.id]||(ok.has(s.id)?"assumed":"untested");
  const mis={};g.asked.forEach(a=>{if(!a.ok&&a.mis)mis[a.mis]=(mis[a.mis]||0)+1;});
  const start=pathOf(S).find(s=>!["mastered","assumed"].includes(skills[s.id]));
  S.diag={v:2,grade:g.grade,at:new Date().toISOString(),skills,lvPass:{},trail:g.trail,start:start?start.id:null,mis,count:g.asked.length,
    answers:g.asked.map(a=>({qid:a.qid,a:a.a,ok:a.ok,mis:a.mis,src:a.src,why:a.why||""})),report:""};
  logEvent("diag");
  notifyParents("diag");
  S.diag.sentTo=Store.parentCount();
  save();G=null;REP.busy=false;REP.fail=null;beep("win");
  if(route()==="result")vResult();else location.hash="#result";
}

/* ---------- AI: explain WHY an answer is wrong (picks from the library only) ---------- */
function aiDiagnose(entry,q){
  const lib=MIS.map(m=>`${m.id}: ${m.title} — ${arProse(m.description)} مثال: ${arProse(m.example)}`).join("\n");
  const prompt=`أنت مساعد تشخيص لمعلم رياضيات. طالب في الصف السابع أجاب إجابة خاطئة (تحققنا من خطئها حسابياً). حدّد الخطأ المفاهيمي الذي تدل عليه إجابته، من المكتبة أدناه فقط.

المهارة: ${skillById[q.skill].title} (${LV[skillById[q.skill].lv].name})
السؤال: ${arProse(q.stem)}
نوع السؤال: ${TYPE_NAME[q.type]}
الإجابة الصحيحة: ${arProse(correctText(q))}
إجابة الطالب: ${arProse(entry.a)}

مكتبة الأخطاء المفاهيمية:
${lib}

القواعد:
- اختر id واحداً من المكتبة فقط إذا كانت إجابة الطالب تدل عليه بوضوح. إذا لم يتطابق أي خطأ بوضوح، أو كانت الإجابة تخميناً، اجعل misconception = null.
- لا تخترع أخطاء خارج المكتبة.
- reason: جملة واحدة قصيرة بالعربية للمعلم تشرح كيف وصل الطالب على الأرجح لإجابته.${AR_MATH?" اكتب الأرقام والرموز فيها كما في بيانات السؤال (٠١٢٣٤٥٦٧٨٩ وحروف عربية للمتغيرات).":""}

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
  const ans=(d.answers||[]).map(a=>{const q=qById[a.qid];return `- [${q?skillById[q.skill].title:""}] ${q?arProse(q.stem):a.qid} | جواب الطالب: ${arProse(a.a)} | ${a.ok?"صحيح":"خطأ"}${a.mis?` | الخطأ المفاهيمي: ${misById[a.mis].title}`:""}${a.why?` | ملاحظة: ${a.why}`:""}`;}).join("\n");
  const gl=LV.L7;
  return `أنت «نبراس»، معلم رياضيات فلسطيني دافئ. اكتب لطالب في الصف ${gl.short} (اسمه المستعار: ${nick}) تقريراً قصيراً عن نتيجة لعبة التشخيص التي أنهاها الآن. اللعبة تسأل سؤالاً واحداً لكل مهارة، من الصف الأول حتى السابع، لتحديد الفجوات.

القواعد:
- لهجة فلسطينية بسيطة ومشجّعة، من 60 إلى 100 كلمة، فقرتان قصيرتان، بدون عناوين أو قوائم.
- امدح مجهوده وطريقته، لا ذكاءه. لا علامات ولا نسب مئوية ولا كلمات محبطة، ولا تقل إنه «متأخر» أو «ضعيف».
- اذكر فكرة أو فكرتين خاطئتين فقط مما ورد في البيانات أدناه، بلغة بسيطة، مع نصيحة قصيرة لكل واحدة. إذا لم ترد أخطاء مفاهيمية، امدح ثباته.
- اختم بجملة أننا سنبدأ معاً من مهارة «${start?start.title:"التحدي مع نبراس"}».
- لا تذكر أي معلومة غير موجودة في البيانات. ${AR_MATH?"اكتب أي تعبير رياضي كنص عادي بترميز الكتاب المدرسي كما في البيانات: الأرقام ٠١٢٣٤٥٦٧٨٩ والمتغيرات بحروف عربية، مثل ٣س + ٦، بدون LaTeX وبدون علامة الدولار.":"اكتب أي تعبير رياضي بين علامتي $ مثل $3x + 6$."}

حالة المهارات: ${SKILLS.filter(s=>d.skills[s.id]).map(s=>`${s.title} (${LV[s.lv].short}) = ${STATUS[stOf(d,s.id)][2]}`).join("؛ ")}
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
const LOCK='<svg class="lk" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
const BULB='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>';
function levelTable(d,parent){
  return `<div class="lvgrid">${LEVELS.filter(l=>!d.grade||l.g<=d.grade).map(l=>`<div class="lvbox"><h4>${l.name}</h4>${SK_LV[l.id].map(id=>{const st=stOf(d,id),now=d.start===id;
    return `<div class="sk"><span>${esc(skillById[id].title)}</span><span class="chip ${now?"lit":STATUS[st][1]}">${now?"البداية من هون":parent?(st==="mastered"?"جاوب صح":st==="assumed"?"مفهومة من جوابه":st==="gap"?"غلط فيها":STATUS[st][0]):STATUS[st][0]}</span></div>`;}).join("")}</div>`).join("")}</div>`;
}
function vResult(){
  if(!S.diag)return vPlay();
  const d=S.diag,gaps=pathOf(S).filter(s=>["gap","partial"].includes(stOf(d,s.id))),start=d.start?skillById[d.start]:null,mis=Object.keys(d.mis||{}),pc=Store.parentCount();
  let rep="";
  if(d.report)rep=md(d.report);
  else if(REP.busy)rep=REP.text?md(REP.text):'<span class="thinking" aria-label="نبراس بيكتب"><i></i><i></i><i></i></span> <span class="small muted">نبراس بيكتب تقريرك…</span>';
  else if(REP.fail)rep=`<span class="small muted">${REP.fail==="no_credit"?"نبراس واقف مؤقتاً (رصيد الذكاء الاصطناعي خلص).":"ما قدر نبراس يكتب التقرير هلأ."}</span> <button class="btn btn-line btn-sm" id="retryrep" type="button">جرّب مرة ثانية</button>`;
  else if(sampleFn===undefined)rep='<span class="small muted">بنجهّز نبراس…</span>';
  const showRep=!!d.answers&&(d.report||REP.busy||sampleFn!==null);
  app.innerHTML=`<section class="view">
    <div class="card" style="display:grid;gap:16px">
      <p class="eyebrow">حلّيت ${arNum(d.count)} ${d.count>2&&d.count<11?"ألغاز":"لغز"}. يعطيك العافية!</p>
      <h2>${start?`نقطة انطلاقك: ${esc(start.title)}`:"ضوّيت كل الجزر!"}</h2>
      ${start?`<p class="muted">${gaps.length?`لقينا ${arNum(gaps.length)} ${gaps.length>2&&gaps.length<11?"مهارات":"مهارة"} بدها شغل، أقدمها من <b style="color:var(--logo)">${LV[start.lv].name}</b>.`:`أول محطة بمسارك من <b style="color:var(--logo)">${LV[start.lv].name}</b>.`} من هون رح نمشي سوا خطوة خطوة.</p>`:""}
      ${showRep?`<div class="report"><span class="aibadge">✦ تقرير نبراس · ذكاء اصطناعي</span><div id="rep" class="small" style="display:grid;gap:6px">${rep}</div></div>`:""}
      ${levelTable(d)}
      ${mis.length?`<div style="display:grid;gap:8px"><h3>أفكار رح نصلّحها سوا</h3><div class="ideas">${mis.map(id=>`<div class="idea">${BULB}<div><b>${esc(misById[id].title)}</b><p class="small muted">${mathify(HINT[id])}</p></div></div>`).join("")}</div></div>`:""}
      <div class="notice">${IC_PAR}<span>${pc?`تقرير التشخيص صار ظاهر لولي أمرك بصفحة الأهالي.`:`اربط حساب أهلك من صفحة <a href="#me">حسابي</a> عشان يوصلهم التقرير.`}</span></div>
      <div class="row"><a class="btn btn-go" href="#${start?"skill-"+start.id:"path"}">${start?"ابدأ أول محطة":"شوف مساري"}</a><a class="btn btn-line" href="#path">مساري</a></div>
      ${d.answers&&d.answers.length?`<details class="detail"><summary>تفاصيل التشخيص (للمعلم)</summary>
        <div class="dlist">${d.answers.map((a,i)=>{const q=qById[a.qid];return `<div class="drow">
          <p class="small"><b>${i+1}.</b> <span class="chip plain">${q?LV[skillById[q.skill].lv].short:""}</span> ${q?mathify(q.stem):""}</p>
          <p class="small">جواب الطالب: ${mx(a.a)} · <span class="chip ${a.ok?"good":"plain"}">${a.ok?"صحيح":"غير صحيح"}</span></p>
          <p class="tiny">${a.mis?`الخطأ المفاهيمي: <b>${esc(misById[a.mis].title)}</b> (${a.mis}) · `:""}الطريقة: ${SRC[a.src]||a.src}${a.why?` · ${mathify(a.why)}`:""}</p>
        </div>`;}).join("")}</div></details>`:""}
    </div>
    <p class="draft">النتيجة تقدير أولي من ${d.count} ألغاز. الصح والغلط بيتحدد بالحساب، والذكاء الاصطناعي بيقترح سبب الغلط وممكن يخطئ. المهارات «المفهومة من جوابك» ما انسألت عنها، لأنك جاوبت صح على مهارة مبنية عليها.</p>
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
      <span class="chip lit">${litN} من ${pathOf(S).length} فوانيس</span>
    </div>
    <details class="legend"><summary>شو معنى الكلمات؟</summary><ul class="small muted">
      <li><b>جاوبتها صح ✦</b>: انسألت عنها بالتشخيص وجاوبت صح.</li>
      <li><b>مفهومة من جوابك</b>: ما سألناك عنها، بس جاوبت صح على مهارة مبنية عليها.</li>
      <li><b>متقَنة ✦</b>: ضوّيتها بالتمارين أو بالكويز.</li>
      <li><b>أنت هنا · مفتوحة</b>: محطات بتقدر تشتغل عليها هلأ.</li>
      <li><b>بتنفتح بعد…</b>: بتنفتح لما تخلّص المهارة المكتوب رقمها.</li>
    </ul></details>
    ${LEVELS.map(l=>{const k=litCount(S,l.id),n=SK_LV[l.id].length,later=gradeOf(S)&&l.g>gradeOf(S);return `<div class="lvsec ${later?"later":""}">
      <div class="lvhead"><h3><span class="lvnum">${l.g}</span>${l.name}</h3><span class="small muted">${later?"مستوى جاي":`${k} من ${n}`}</span></div>
      <div class="pbar" aria-hidden="true"><i style="width:${Math.round(k/n*100)}%"></i></div>
      <div class="trail">${SK_LV[l.id].map(id=>{const s=skillById[id],lit=isLit(id),now=cur&&cur.id===id,st=statusOf(S,id);idx++;
        const open=canOpen(id),tag=open?"a":"div";
        const waitFor=preOf(id).filter(x=>!isLit(x));
        const chip=lit?(S.lit[id]?["متقَنة ✦","lit"]:st==="mastered"?["جاوبتها صح ✦","lit"]:["مفهومة من جوابك","good"])
          :now?["أنت هنا","lit"]:!inPathP(S,id)?["مستوى جاي","plain"]:open?["مفتوحة","calm"]
          :["بتنفتح بعد "+waitFor.map(x=>skNum(x)).join(" و "),"plain"];
        return `<${tag} class="stop ${lit?"lit":""} ${now?"now":""} ${open?"":"locked"}"${open?` href="#skill-${id}"`:` aria-disabled="true"`}><span class="orb">${LANTERN(lit?"on":"off")}${open?"":LOCK}</span>
          <span class="info"><span class="row between" style="gap:8px"><b><span class="sknum">${skNum(id)}</span>${esc(s.title)}</b><span class="chip ${chip[1]}">${chip[0]}</span></span><span class="small muted">${esc(s.summary)}</span>
          <span class="tiny">${preOf(id).length?"بتعتمد على: "+preOf(id).map(x=>skNum(x)+" "+esc(skillById[x].title)).join("، "):"مهارة أساس، ما بتعتمد على مهارة قبلها"}</span>
          ${quizOf(S,id)?`<span class="skgrade">${starsHTML(quizOf(S,id).best)}${gradeChip(quizOf(S,id).best)}</span>`:""}<span class="tiny">${esc(s.src)}</span></span></${tag}>`;}).join("")}</div>
    </div>`;}).join("")}
    ${det.length?`<div class="card" style="display:grid;gap:10px"><h3>أفكار بنشتغل عليها</h3><div class="ideas">${det.map(([id])=>`<div class="idea">${BULB}<div><b>${esc(misById[id].title)}</b><p class="small muted">${mathify(HINT[id])}</p></div></div>`).join("")}</div></div>`:""}
    <p class="draft">محتوى تجريبي (مسودة) بانتظار مراجعة معلم رياضيات ومطابقته مع المنهاج.</p>
  </section>`;
}

/* ---------- skill lesson + practice ---------- */
let P=null;
/* the lesson in three levels: 0 = the book's explanation, 1 = simpler (one short step at a time),
   2 = simplest (a story with one idea). The student always starts with the book's explanation and asks
   for a simpler one only when needed; on a new visit to the skill it starts again from the first level.
   Only skills that have `simple` and `simplest` in data.js get the buttons. */
const XL_BACK=`<button type="button" class="xback" data-xl="0">ارجع للشرح الأصلي</button>`;
function xlBody(sk,xl){
  if(xl===1)return `<p class="xbadge">شرح أبسط</p><div class="xsteps">${sk.simple.map((x,i)=>`<div class="xstep"${i?" hidden":""}><p>${mathify(x.t)}</p>${x.f?figHTML(x.f,x.cap):""}</div>`).join("")}
      <div class="fignav"><button type="button" class="btn btn-line btn-sm" id="xprev">→ السابق</button><span id="xpos" class="small" aria-live="polite"></span><button type="button" class="btn btn-go btn-sm" id="xnext">التالي ←</button></div></div>
    <div class="xmore"><span>لسا صعب؟</span><button type="button" class="btn btn-go btn-sm" data-xl="2">بسّطلي أكثر</button>${XL_BACK}</div>
    <p class="tiny">شرح مبسّط · مسودة بانتظار مراجعة معلم</p>`;
  const z=sk.simplest;
  return `<p class="xbadge">شرح أبسط كمان</p><div class="xstory">${z.t.map(t=>`<p>${mathify(t)}</p>`).join("")}${z.f?figHTML(z.f,z.cap):""}
      ${z.tryQ?`<div class="xtry"><p>${mathify(z.tryQ)}</p><details><summary>شوف الجواب</summary><p>${mathify(z.tryA)}</p></details></div>`:""}</div>
    <div class="xmore"><span>لسا مش واضح؟</span><a class="btn btn-go btn-sm" href="#ask" id="xask">اسأل نبراس</a>${XL_BACK}</div>
    <p class="tiny">شرح مبسّط · مسودة بانتظار مراجعة معلم</p>`;
}
function vSkill(sid){
  const sk=skillById[sid];
  const LSN=!!(window.NibrasLesson&&NibrasLesson.has(sid));
  if(!P||P.sid!==sid){const qs=QS.filter(q=>q.skill===sid).sort((a,b)=>a.d-b.d);P={sid,qs,i:0,first:true,state:"ask",fb:null,tried:[],val:null,order:null,items:null,tilt:0};}
  const streak=S.streak[sid]||0,lit=isLit(sid),q=P.qs[P.i],finished=P.i>=P.qs.length;
  const xl=sk.simple&&sk.simplest?Math.max(0,Math.min(2,P.xl|0)):-1;
  let fb="";
  if(P.state==="right")fb=`<div class="fb good" role="status"><b>صح! ${P.first?"شغلك مرتّب.":"حلو إنك ما استسلمت."}</b>${P.first?"":`<p class="small">الجواب الأول ما بيعدّ بالسلسلة، بس المحاولة هي اللي بتعلّم.</p>`}</div>`;
  if(P.state==="hint"){const r=P.fb||{};const txt=r.mis&&HINT[r.mis]?HINT[r.mis]:r.src==="form"?r.why:sk.summary;
    const hf=Array.isArray(q.hfig)?q.hfig:q.hfig?(q.hfig[r.mis]||q.hfig._):null;
    fb=`<div class="fb hint" role="status"><b>${r.mis?"فكرة شائعة، خلينا نشوفها":"قرّبت! جرّب مرة ثانية"}</b><p>${mathify(txt)}</p>${r.src==="form"?"":figsHTML(hf,q.hcap)}</div>`;}
  app.innerHTML=`<section class="view">
    <div class="row between"><a class="btn btn-line btn-sm" href="#path">← مساري</a><span class="chip ${lit?"lit":"calm"}">${lit?"فانوس مضاء ✦":`سلسلة ${streak} من ${MASTER_STREAK}`}</span></div>
    <div class="card explain">
      <p class="eyebrow">${LV[sk.lv].name} · مهارة ${skNum(sid)}</p>
      <h2><span class="sknum">${skNum(sid)}</span>${esc(sk.title)}</h2>
      <div class="skpre"><span class="small muted">${preOf(sid).length?"قبل هالمهارة:":"مهارة أساس، ما بتعتمد على مهارة قبلها."}</span>${preOf(sid).map(x=>`<a class="chip ${isLit(x)?"lit":"plain"}" href="#skill-${x}">${skNum(x)} ${esc(skillById[x].title)}${isLit(x)?" ✦":""}</a>`).join("")}
        ${nextOf(sid).length?`<span class="small muted">بتفتحلك:</span>${nextOf(sid).map(x=>canOpen(x)?`<a class="chip plain" href="#skill-${x}">${skNum(x)} ${esc(skillById[x].title)}</a>`:`<span class="chip plain" title="مقفلة">${skNum(x)} ${esc(skillById[x].title)} · مقفلة</span>`).join("")}`:""}</div>
      ${LSN?`<div class="lsn-tabs" role="tablist" aria-label="طريقة الشرح"><button type="button" role="tab" data-lsn="watch" aria-selected="${P.read?"false":"true"}">شاهد الشرح مع نبراس</button><button type="button" role="tab" data-lsn="read" aria-selected="${P.read?"true":"false"}">اقرأ الشرح</button></div><div id="lsnhost"${P.read?" hidden":""}></div>`:""}
      <div id="xread"${LSN&&!P.read?" hidden":""}>
      ${xl>0?xlBody(sk,xl):`<p>${mathify(sk.explanation)}</p>
      ${sk.learn?`<div class="learn"><b>${BULB}أتعلّم</b><ul>${sk.learn.map(t=>`<li>${mathify(t)}</li>`).join("")}</ul></div>`:""}
      ${sk.figs?`<div class="figbox"><b>أتأمّل الرسومات</b><div class="figs swipe" id="lfigs" tabindex="0" aria-label="رسومات الدرس">${sk.figs.map(x=>figHTML(x.f,x.cap)).join("")}</div>
        <div class="fignav"><button type="button" class="btn btn-line btn-sm" id="fprev">→ السابق</button><span id="fpos" class="small" aria-live="polite"></span><button type="button" class="btn btn-line btn-sm" id="fnext">التالي ←</button></div></div>`:""}
      <div class="example"><b>مثال من الحياة</b><p>${mathify(sk.example)}</p></div>
      ${xl===0?`<div class="xmore"><span>مش فاهم؟</span><button type="button" class="btn btn-go btn-sm" data-xl="1">بسّطلي الشرح</button></div>`:""}`}
      </div>
      <p class="tiny">${esc(sk.src)}</p>
    </div>
    ${finished?`<div class="card done">${LANTERN("big on")}<h2>${lit?"ضوّيت فانوس هالمحطة!":"خلّصت تمارين المحطة"}</h2><p class="muted">${lit?"يلا على المحطة الجاية.":`بدك تعيد التمارين؟ كل ${MASTER_STREAK} إجابات صح من أول محاولة ورا بعض بتضوّي الفانوس.`}</p>
      <div class="row" style="justify-content:center"><a class="btn btn-go" href="#quiz-${sid}">${quizOf(S,sid)?"أعد كويز المهارة":"كويز المهارة"}</a>${lit&&currentSkill()?`<a class="btn btn-line" href="#skill-${currentSkill().id}">المحطة الجاية</a>`:`<button class="btn btn-line" id="again" type="button">أعد التمارين</button>`}<a class="btn btn-line" href="#path">مساري</a></div></div>`:
    `<div class="puzzle">
      <div class="row between"><span class="ptype"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${TYPE_IC[q.type]}</svg>${TYPE_NAME[q.type]} · تمرين ${P.i+1} من ${P.qs.length}</span>
        <span class="meter" aria-label="السلسلة">${Array.from({length:MASTER_STREAK},(_,k)=>`<i class="${k<streak||lit?"on":""}"></i>`).join("")}</span></div>
      ${q.scale?scaleSVG(q.stem,P.tilt):""}
      ${q.fig?figsHTML(q.fig,q.fcap):""}
      <p class="stem">${mathify(q.stem)}</p>
      <div id="w"></div>
      ${fb}
      <div class="row between">
        <a class="btn btn-line btn-sm" href="#ask" id="askq">اسأل نبراس عن هالسؤال</a>
        ${P.state==="right"?`<button class="btn btn-go" id="nextq" type="button">التالي</button>`:`<button class="btn btn-go" id="chk" type="button" disabled>تحقّق</button>`}
      </div>
    </div>`}
    ${quizBar(sid,finished)}
  </section>`;
  /* lesson video: «شاهد» mounts the Nibras player, «اقرأ» shows the written explanation */
  if(LSN){app.querySelectorAll("[data-lsn]").forEach(b=>b.onclick=()=>{P.read=b.dataset.lsn==="read";vSkill(sid);});
    if(!P.read)NibrasLesson.mount($("#lsnhost"),sid);}
  /* explanation levels: the «بسّطلي» buttons, the simpler level's steps (place kept between checks), and «اسأل نبراس» */
  app.querySelectorAll("[data-xl]").forEach(b=>b.onclick=()=>{P.xl=+b.dataset.xl;P.xs=0;vSkill(sid);
    const c=app.querySelector(".card.explain");if(c)c.scrollIntoView({block:"start",behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});});
  const xs=app.querySelector(".xsteps");
  if(xs){const it=[...xs.querySelectorAll(".xstep")],n=it.length;P.xs=Math.max(0,Math.min(P.xs||0,n-1));
    const paint=()=>{it.forEach((e,i)=>{e.hidden=i!==P.xs;});$("#xpos").textContent=arNum(`${P.xs+1} / ${n}`);$("#xprev").disabled=P.xs<=0;$("#xnext").disabled=P.xs>=n-1;};
    paint();$("#xprev").onclick=()=>{P.xs--;paint();};$("#xnext").onclick=()=>{P.xs++;paint();};}
  const xa=$("#xask");if(xa)xa.onclick=()=>{CHAT.prefill=`ما فهمت درس «${sk.title}». ممكن تشرحلي بطريقة أبسط، بمثال من حياتي؟`;};
  /* the lesson's figures: one at a time, swipe or use the two buttons; the place is kept between checks */
  const lf=$("#lfigs");
  if(lf){const it=[...lf.children],n=it.length,st=P;
    const paint=()=>{$("#fpos").textContent=arNum(`${st.fig+1} / ${n}`);$("#fprev").disabled=st.fig<=0;$("#fnext").disabled=st.fig>=n-1;};
    const go=(i,smooth)=>{st.fig=Math.max(0,Math.min(n-1,i));lf.scrollTo({left:it[st.fig].offsetLeft,behavior:smooth?"smooth":"auto"});paint();};
    st.fig=Math.min(st.fig||0,n-1);go(st.fig,false);
    $("#fprev").onclick=()=>go(st.fig-1,true);$("#fnext").onclick=()=>go(st.fig+1,true);
    lf.addEventListener("scroll",()=>{const i=Math.round(Math.abs(lf.scrollLeft)/Math.max(1,lf.clientWidth));if(i!==st.fig&&i>=0&&i<n){st.fig=i;paint();}},{passive:true});
  }
  if(finished){const a=$("#again");if(a)a.onclick=()=>{P=null;vSkill(sid);};return;}
  const locked=P.state==="right";
  const w=mountWidget(q,$("#w"),{mode:"practice",init:P.val,tried:P.tried,locked,reveal:locked,order:P.order,items:P.items,
    onChange:ok=>{const c=$("#chk");if(c)c.disabled=!ok;},onEnter:()=>{const c=$("#chk");if(c&&!c.disabled)c.click();}});
  if(q.type==="bubbles")P.order=w.order;if(q.type==="order")P.items=w.items;
  const chk=$("#chk");
  if(chk){chk.disabled=!w.ready()||(q.type==="bubbles"&&P.tried.includes(w.value()));chk.onclick=()=>pick(w.value(),chk,q.type==="order"?w.placedIdx():null);}
  const nq=$("#nextq");if(nq){nq.onclick=()=>{P.i++;Object.assign(P,{first:true,state:"ask",fb:null,tried:[],val:null,order:null,items:null,tilt:0});vSkill(sid);};nq.focus();}
  $("#askq").onclick=()=>{CHAT.prefill=`عندي هالسؤال: ${arProse(q.stem)}\nممكن تساعدني أفكّر فيه بدون ما تعطيني الحل؟`;};
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

/* ---------- skill quiz + grade ---------- */
function quizBar(sid,finished){
  const qz=quizOf(S,sid),n=Math.min(QUIZ_MAX,QS.filter(q=>q.skill===sid).length);
  return `<div class="card quizbar"><div class="grow" style="display:grid;gap:4px"><b>كويز المهارة ${skNum(sid)}</b>
    <p class="small muted">${arNum(n)} أسئلة، محاولة وحدة لكل سؤال، والتصحيح بالآخر.${isLit(sid)?"":" نجمتين أو أكثر بيضوّوا الفانوس."}</p>
    ${qz?`<span class="skgrade">${starsHTML(qz.best)}${gradeChip(qz.best)}<span class="tiny">أحسن نتيجة: ${arNum(qz.bestScore!=null?qz.bestScore:qz.score)} من ${arNum(qz.n)}</span></span>`:""}</div>
    <a class="btn ${finished?"btn-go":"btn-line"}" href="#quiz-${sid}">${qz?"أعد الكويز":"ابدأ الكويز"}</a></div>`;
}
let QZ=null;
function vQuiz(sid){
  const sk=skillById[sid];
  if(!QZ||QZ.sid!==sid){const qs=shuffle(QS.filter(q=>q.skill===sid)).slice(0,QUIZ_MAX).sort((a,b)=>a.d-b.d);QZ={sid,qs,i:0,ans:[],done:false,w:null};}
  if(QZ.done)return quizResult(sid);
  const q=QZ.qs[QZ.i],last=QZ.i===QZ.qs.length-1;
  app.innerHTML=`<section class="view">
    <div class="row between"><a class="btn btn-line btn-sm" href="#skill-${sid}">← رجوع للمهارة</a><span class="chip calm">سؤال ${arNum(QZ.i+1)} من ${arNum(QZ.qs.length)}</span></div>
    <div class="card quizhead"><p class="eyebrow">كويز المهارة ${skNum(sid)}</p><h2>${esc(sk.title)}</h2>
      <div class="qdots" aria-hidden="true">${QZ.qs.map((_,k)=>`<i class="${k<QZ.i?"done":k===QZ.i?"now":""}"></i>`).join("")}</div>
      <p class="small muted">محاولة وحدة لكل سؤال. التصحيح والتلميحات بآخر الكويز.</p></div>
    <div class="puzzle">
      <div class="ptype"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${TYPE_IC[q.type]}</svg>${TYPE_NAME[q.type]}</div>
      ${q.scale?scaleSVG(q.stem):""}
      ${q.fig?figsHTML(q.fig,q.fcap):""}
      <p class="stem">${mathify(q.stem)}</p>
      <div id="w"></div>
    </div>
    <div class="row between">
      <button class="btn btn-line btn-sm" id="qskip" type="button">مش عارف</button>
      <button class="btn btn-go" id="qnext" type="button" disabled>${last?"خلّصت، صحّحلي":"ثبّت جوابي"}</button>
    </div>
  </section>`;
  const nx=$("#qnext");
  const go=(val,skip)=>{if(QZ.busy)return;QZ.busy=true;
    const r=skip?{ok:false,mis:null}:grade(q,val);
    QZ.ans.push({ok:r.ok,mis:r.mis||null,a:skip?null:answerText(q,val)});
    if(!r.ok&&r.mis)bump(r.mis);
    beep("pop");QZ.i++;QZ.busy=false;
    if(QZ.i>=QZ.qs.length)finishQuiz();else{vQuiz(sid);window.scrollTo(0,0);}};
  QZ.w=mountWidget(q,$("#w"),{mode:"diag",onChange:ok=>{nx.disabled=!ok;},onEnter:()=>{if(QZ.w.ready())go(QZ.w.value());}});
  nx.onclick=()=>{if(QZ.w.ready())go(QZ.w.value());};
  $("#qskip").onclick=()=>go(null,true);
}
function finishQuiz(){
  const sid=QZ.sid,n=QZ.qs.length,c=QZ.ans.filter(a=>a.ok).length,k=starsFor(c,n);
  S.quiz=S.quiz||{};const old=S.quiz[sid];
  const better=!old||k>old.best||(k===old.best&&c>(old.bestScore!=null?old.bestScore:old.score));
  S.quiz[sid]={best:better?k:old.best,bestScore:better?c:(old.bestScore!=null?old.bestScore:old.score),last:k,score:c,n,tries:(old?old.tries:0)+1,at:new Date().toISOString()};
  Object.assign(QZ,{done:true,stars:k,c,first:!old,up:!!old&&k>old.best});
  logEvent("quiz",{skill:sid,score:c,n,stars:k});
  beep(k>=2?"win":"soft");
  if(k>=2&&!isLit(sid))markLit(sid);else save();
  vQuiz(sid);window.scrollTo(0,0);
}
function quizResult(sid){
  const k=QZ.stars,c=QZ.c,n=QZ.qs.length,rec=quizOf(S,sid),nx=currentSkill();
  const wrong=QZ.ans.map((a,i)=>[a,QZ.qs[i]]).filter(([a])=>!a.ok);
  const msg=k===3?"ولا غلطة! أنت متمكّن من هالمهارة.":k===2?"شغل ممتاز، ضايلك خطوة صغيرة للعلامة الكاملة.":k===1?"قرّبت. راجع الأسئلة تحت وجرّب كمان مرة.":"ولا يهمك. ارجع للشرح والتمارين، وبعدين جرّب الكويز مرة ثانية.";
  app.innerHTML=`<section class="view">
    <div class="row between"><a class="btn btn-line btn-sm" href="#skill-${sid}">← رجوع للمهارة</a><a class="btn btn-line btn-sm" href="#path">مساري</a></div>
    <div class="card done quizres">${starsHTML(k)}
      <h2>${arNum(c)} من ${arNum(n)} صح</h2>
      <p>${gradeChip(k)}</p>
      <p class="muted">${msg}${QZ.up?" وهاي أحسن من نتيجتك السابقة!":""}</p>
      ${rec&&rec.tries>1&&rec.best>k?`<p class="small muted">درجتك بالمهارة بتضل أحسن نتيجة إلك: ${starsHTML(rec.best)}</p>`:""}
      <div class="row" style="justify-content:center"><button class="btn btn-go" id="qagain" type="button">أعد الكويز</button>
        ${k>=2&&nx&&nx.id!==sid?`<a class="btn btn-line" href="#skill-${nx.id}">المحطة الجاية</a>`:`<a class="btn btn-line" href="#skill-${sid}">ارجع للشرح والتمارين</a>`}</div>
    </div>
    ${wrong.length?`<div class="card" style="display:grid;gap:12px"><h3>خلينا نراجع اللي ما زبط</h3>
      ${wrong.map(([a,q])=>`<div class="qrev"><p class="stem">${mathify(q.stem)}</p>
        <p class="small">${a.a==null?"ضغطت «مش عارف»":`جوابك: ${mathify(a.a)}`} · <b>الجواب الصح: ${mathify(correctText(q))}</b></p>
        ${a.mis&&HINT[a.mis]?`<div class="idea">${BULB}<p class="small">${mathify(HINT[a.mis])}</p></div>`:""}</div>`).join("")}</div>`:""}
  </section>`;
  $("#qagain").onclick=()=>{QZ=null;vQuiz(sid);};
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
  const p=k.progress,d=diagOf(p),cur=currentSkillP(p);
  const evText=e=>e.kind==="diag"?"خلّص التشخيص الأولي":e.kind==="skill"&&skillById[e.skill]?`أتقن «${skillById[e.skill].title}»`:e.kind==="level"&&LV[e.level]?`أنهى ${LV[e.level].name}`:e.kind==="quiz"&&skillById[e.skill]?`كويز «${skillById[e.skill].title}»: ${arNum(e.score)} من ${arNum(e.n)}`:"";
  const evs=(p.events||[]).filter(e=>evText(e)).slice().reverse().slice(0,8);
  return `<div class="card kid">
    <div class="kidhead"><span class="avatar-md">${avatar(k.avatar)}</span><div class="grow"><h3>${esc(k.nick||"")}</h3><p class="small muted">${gradeOf(p)?"الصف "+gradeLv(gradeOf(p)).short+" · ":""}${d?(cur?`المحطة الحالية: ${esc(cur.title)} · ${LV[cur.lv].name}`:"أنهى كل المحطات"):"لسا ما لعب لعبة التشخيص"}</p></div><span class="chip lit">${litCount(p)} من ${SKILLS.length}</span></div>
    ${d?`<div style="display:grid;gap:10px">
      <div class="row between"><h4 style="margin:0;color:var(--logo)">التشخيص الأولي · ${fmtDate(d.at)}</h4><button class="btn btn-line btn-sm" type="button" data-report="${esc(k.id)}">انسخ التقرير</button></div>
      <p class="small">${d.start&&skillById[d.start]?`بلّش من <b>${esc(skillById[d.start].title)}</b> (${LV[skillById[d.start].lv].name}).`:"متمكّن من كل المهارات اللي انختبرت."} جاوب على ${d.count} ألغاز.</p>
      ${levelTable(d,true)}
      ${Object.keys(d.mis||{}).filter(id=>misById[id]).length?`<div style="display:grid;gap:8px"><b class="small">أفكار بنشتغل عليها، وكيف بتساعدوه بالبيت:</b><div class="ideas">${Object.keys(d.mis).filter(id=>misById[id]).map(id=>`<div class="idea">${BULB}<div><b>${esc(misById[id].title)}</b><p class="small muted">${mathify(HINT[id])}</p></div></div>`).join("")}</div></div>`:""}
      ${d.report?`<details class="detail"><summary>تقرير نبراس للطالب (ذكاء اصطناعي)</summary><div class="small" style="display:grid;gap:6px;margin-top:8px">${md(d.report)}</div></details>`:""}
    </div>`:""}
    <div style="display:grid;gap:10px">
      <h4 style="margin:0;color:var(--logo)">التقدّم بالمراحل</h4>
      ${LEVELS.filter(l=>!gradeOf(p)||l.g<=gradeOf(p)).map(l=>{const n=SK_LV[l.id].length,c=litCount(p,l.id);return `<div style="display:grid;gap:4px"><div class="row between small"><span>${l.name}</span><span>${c} من ${n}</span></div><div class="pbar" aria-hidden="true"><i style="width:${Math.round(c/n*100)}%"></i></div></div>`;}).join("")}
      ${SKILLS.some(sk=>quizOf(p,sk.id))?`<div style="display:grid;gap:6px"><b class="small">درجات كويزات المهارات</b>${SKILLS.filter(sk=>quizOf(p,sk.id)).map(sk=>{const r=quizOf(p,sk.id);return `<div class="row between small skgrade-row"><span><span class="sknum">${skNum(sk.id)}</span>${esc(sk.title)}</span><span class="skgrade">${starsHTML(r.best)}${gradeChip(r.best)}</span></div>`;}).join("")}</div>`:""}
      ${evs.length?`<ul class="timeline">${evs.map(e=>`<li><span class="when">${fmtTime(e.at)}</span><span>${esc(evText(e))}</span></li>`).join("")}</ul>`:""}
    </div>
    <div><button class="btn btn-line btn-sm" type="button" data-unlink="${esc(k.id)}">فك الربط</button></div>
  </div>`;
}


const PROMPT=`أنت «نبراس»، معلم رياضيات افتراضي فلسطيني صبور ودافئ على منصة «نبراس · تعلّم من مستواك» لتعويض الفاقد التعليمي. تساعد طلبة الصف السابع في المدارس الحكومية بالضفة الغربية في مهارات الأعداد والكسور والنسبة والجبر، من مستوى الصف الأول حتى السابع. تتبع منهجية التعليم حسب المستوى الفعلي (Teaching at the Right Level): تبدأ من مستوى الطالب الحقيقي، لا من مستوى صفّه.

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
${AR_MATH?`- اكتب الرياضيات بترميز الكتاب المدرسي الفلسطيني دائماً: الأرقام ٠١٢٣٤٥٦٧٨٩، والمتغيرات بحروف عربية (س، ص، ع، ن)، والفاصلة العشرية ٫ مثل ٤٫٥، والنسبة المئوية ٪ مثل ٢٥٪.
- اكتب التعبير الرياضي كنص عادي داخل الجملة، مثل: ٣س + ٥ = ٢٠. لا تستخدم LaTeX ولا علامة الدولار، ولا أرقاماً أو حروفاً لاتينية حتى لو كتب الطالب بها.
- الكسر: البسط ثم شرطة مائلة ثم المقام، مثل ٣/٤. والأس بالرمز ^ مثل س^٢.`:"- اكتب كل تعبير رياضي بين علامتي دولار بصيغة LaTeX بسيطة، مثل $3x + 5 = 20$."}
- قائمة مرقمة فقط عند شرح خطوات حل. لا عناوين ولا جداول.

# وسم خفي (للنظام فقط)
إذا لاحظت في كلام الطالب خطأً مفاهيمياً من المكتبة، أضف في آخر ردك وفي سطر منفصل: <<misconception:ID>> (مثل m03). لا تشرح الوسم ولا تذكره.`;
let sampleFn,imgOK=false;
const CHAT={busy:false,stream:"",ctl:null,err:"",file:null,prefill:"",pad:null,gsave:null};
function refreshAI(){if(!READY)return;const r=route();if(!S)return;if(r==="ask")drawChat();else if(r==="result")vResult();else if(r==="play"&&G)drawGame();}
NibrasAI.get().then(s=>{sampleFn=s||null;if(s&&s.limits)s.limits().then(l=>{imgOK=!!(l&&l.images);if(READY&&route()==="ask"&&S)drawChat();}).catch(()=>{});refreshAI();}).catch(()=>{sampleFn=null;refreshAI();});
function context(){
  const g=isGuest();
  const d=S.diag,L=g?["# سياق الجلسة","- هذه جلسة تجريبية: الزائر معلم يختبر نبراس، وقد يكتب كأنه طالب. تصرّف تماماً كما تتصرف مع طالب في الصف السابع، بنفس طريقة التعليم والحدود.","- لا تقترح لعبة التشخيص ولا المسار، فالزائر ليس له حساب طالب.","- الصف المفترض: السابع"]
    :["# سياق الطالب",`- الاسم المستعار: ${ME().nick} (لا تطلب اسمه الحقيقي)`,`- الصف: ${gradeOf(S)?gradeLv(gradeOf(S)).short:"غير محدد"}`];
  if(g){/* no diagnostic data for a guest */}
  else if(d){L.push("- نتيجة التشخيص: "+pathOf(S).map(s=>`${s.title} (${LV[s.lv].short}) = ${STATUS[stOf(d,s.id)][2]}`).join("؛ "));
    const c=currentSkill();L.push(`- المحطة الحالية في مساره: ${c?c.title+" ("+LV[c.lv].name+")":"أتقن كل المهارات"}`);}
  else L.push("- لم يلعب التشخيص بعد. إذا طلب مساعدة عامة اقترح عليه لعبة التشخيص بلطف.");
  const det=Object.entries(S.detected).sort((a,b)=>b[1]-a[1]).map(([id,n])=>`${id} (${n})`);
  if(det.length)L.push("- أخطاء مفاهيمية لوحظت سابقاً: "+det.join("، "));
  L.push("","# مكتبة الأخطاء المفاهيمية");
  MIS.forEach(m=>L.push(`- ${m.id}: ${m.title}. ${arProse(m.description)} مثال: ${arProse(m.example)} علاج مقترح: ${arProse(HINT[m.id])}`));
  L.push("","# مهارات المسار (مسودة، مرتبة من الصف الأول للسابع)");
  SKILLS.forEach(s=>L.push(`- ${s.title} (${LV[s.lv].name}): ${arProse(s.explanation)} مثال: ${arProse(s.example)}${s.learn?" قواعد الكتاب المدرسي لهذه المهارة (التزم بطريقتها ومصطلحاتها عند الشرح): "+s.learn.map(arProse).join(" "):""}`));
  return L.join("\n");
}
/* ---------- games inside the chat ----------
   The tutor writes <game>{"type":…}</game>. The site builds the game from one of its own widgets,
   works out the right answer itself, and sends the result back as a «[نتيجة لعبة] …» message.
   A tag that breaks a rule (see the tutor's instructions) is simply not shown. */
const GAME_NAME={balance:"ميزان المعادلة",numberline:"الضفدع على خط الأعداد",bar:"تلوين الشريط",order:"ترتيب البطاقات",bubbles:"فرقعة الفقاعة"};
const GAME_WIDGET={balance:"type",numberline:"hop",bar:"shade",order:"order",bubbles:"bubbles"};
/* what the tutor wrote («2س+3=7», «5س^2», «-3+5») → the notation of data.js («2x + 3 = 7») */
function canonExpr(raw){
  const t=String(raw).replace(/[‎‏ـ]/g,"").replace(/٪/g,"%").replace(/[٠-٩٫]/g,c=>AR_DIG[c]).replace(/[ء-ي]/g,c=>LAT_VAR[c]||c)
    .replace(/[−–—]/g,"-").replace(/\*/g,"×").replace(/\^2/g,"²").replace(/\^3/g,"³").replace(/\^4/g,"⁴").replace(/\^5/g,"⁵").replace(/\s+/g,"").toLowerCase();
  return t.replace(/([+×÷=])/g," $1 ").replace(/([0-9a-z)²³⁴⁵%])-/g,"$1 − ").replace(/-/g,"−");
}
const gval=x=>{const n=norm(x);if(/%$/.test(n)){const v=parseFloat(n);return isFinite(v)?v/100:NaN;}const c=compile(n);return c&&!c.vars.size?c.f({}):NaN;};
function buildGame(json){
  let g;try{g=JSON.parse(json);}catch(e){return null;}
  if(!g||typeof g!=="object"||!GAME_NAME[g.type])return null;
  const fnum=v=>{const r=Math.round(v*1e6)/1e6;return(r<0?"−":"")+String(Math.abs(r));},type=g.type;
  try{
    if(type==="balance"){
      const eq=norm(g.equation||""),sides=eq.split("=");if(sides.length!==2)return null;
      const L=compile(sides[0]),R=compile(sides[1]);if(!L||!R)return null;
      const vs=[...new Set([...L.vars,...R.vars])];if(vs.length!==1)return null;
      const v=vs[0],f=x=>L.f({[v]:x})-R.f({[v]:x}),b=f(0),a=f(1)-b;
      if(!isFinite(a)||!isFinite(b)||Math.abs(a)<1e-9||!close(f(2),2*a+b)||!close(f(-3),-3*a+b))return null;   /* linear, one solution */
      const sol=-b/a;let den=0;for(let d=1;d<=12;d++)if(close(sol*d,Math.round(sol*d))){den=d;break;}
      if(!den||Math.abs(sol)>1000)return null;
      const num=Math.round(sol*den),ans=den===1?fnum(num):`${num<0?"−":""}${Math.abs(num)}/${den}`;
      return{type,key:"balance:"+eq,label:"المعادلة",detail:String(g.equation),correct:ans,
        q:{type:"type",scale:true,skill:"s7d",stem:"أحلّ المعادلة: "+canonExpr(g.equation),answer:`${v} = ${ans}`},
        ok:val=>same(parseAns(val),parseAns(`${v}=${ans}`)),text:val=>String(val)};
    }
    if(type==="numberline"){
      const ex=norm(g.expression||""),c=compile(ex);if(!c||c.vars.size)return null;
      const v=c.f({}),st=parseInt((ex.match(/^\(?(-?\d+)/)||[])[1],10);
      if(!Number.isInteger(v)||Math.abs(v)>10||!Number.isInteger(st)||Math.abs(st)>10||st===v)return null;
      return{type,key:"numberline:"+ex,label:"المقدار",detail:String(g.expression),correct:fnum(v),
        q:{type:"hop",start:st,answer:v,stem:"أجد الناتج على خط الأعداد: "+canonExpr(g.expression)},ok:val=>val===v,text:val=>fnum(val)};
    }
    if(type==="bar"){
      const v=gval(String(g.value||"")),n=g.parts;if(!Number.isInteger(n)||n<2||n>20||!(v>0)||v>1+1e-9)return null;
      const k=v*n;if(!close(k,Math.round(k)))return null;const ans=Math.round(k);
      return{type,key:`bar:${norm(g.value)}:${n}`,label:"المطلوب",detail:`تلوين ${g.value} من شريط فيه ${n} أجزاء`,correct:`${ans} من ${n}`,
        q:{type:"shade",n,answer:ans,stem:`أظلّل ${canonExpr(g.value)} من الشريط.`},ok:val=>val===ans,text:val=>`لوّن ${val} من ${n}`};
    }
    if(type==="order"){
      const items=Array.isArray(g.items)?g.items.map(String):[];if(items.length<3||items.length>6)return null;
      const vals=items.map(gval);if(vals.some(x=>!isFinite(x)))return null;
      for(let i=0;i<vals.length;i++)for(let j=i+1;j<vals.length;j++)if(close(vals[i],vals[j]))return null;
      const disp=items.map(canonExpr),sorted=disp.slice().sort((a,b)=>gval(a)-gval(b));
      return{type,key:"order:"+items.map(norm).join(","),label:"الأعداد",detail:items.join(" ، "),correct:sorted.join(" ، "),
        q:{type:"order",items:disp,stem:"أرتّب الأعداد من الأصغر إلى الأكبر:"},ok:val=>val.every((x,i)=>i===0||gval(val[i-1])<gval(x)),text:val=>val.join(" ، ")};
    }
    if(type==="bubbles"){
      const qs=String(g.question||""),opts=Array.isArray(g.options)?g.options.map(String):[];if(opts.length<2||opts.length>4)return null;
      const pq=parseAns(qs);if(!pq)return null;
      const oks=opts.map(o=>{const po=parseAns(o);return!!po&&same(po,pq);});if(oks.filter(Boolean).length!==1)return null;
      return{type,key:"bubbles:"+norm(qs)+":"+opts.map(norm).join(","),label:"السؤال",detail:qs,correct:opts[oks.indexOf(true)],
        q:{type:"bubbles",stem:"أختار ما يساوي: "+canonExpr(qs),options:opts.map((o,i)=>({t:canonExpr(o),ok:oks[i]}))},ok:val=>!!oks[val],text:val=>opts[val]};
    }
  }catch(e){}
  return null;
}
let GAME_LIVE=null;
function gameHTML(json,live){
  const sp=buildGame(json);if(!sp)return"";
  const head=`<div class="ghead"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${TYPE_IC[GAME_WIDGET[sp.type]]}</svg>${GAME_NAME[sp.type]}</div>`;
  if(!live||GAME_LIVE)return `<div class="gamecard done">${head}<p class="small">${mathify(sp.q.stem)}</p></div>`;
  GAME_LIVE=sp;
  return `<div class="gamecard" id="glive">${head}${sp.q.scale?scaleSVG(sp.q.stem):""}<p class="stem">${mathify(sp.q.stem)}</p><div id="gw"></div>
    <div class="row between"><button class="btn btn-line btn-sm" id="gskip" type="button">مش عارف</button><button class="btn btn-go" id="ggo" type="button" disabled>تحقّق</button></div></div>`;
}
/* the student's own game result in the chat: the answer and right/wrong, never the correct answer */
function gresHTML(c){
  const p=String(c).split("|").map(x=>x.trim()),name=p[0].replace("[نتيجة لعبة]","").trim(),get=k=>{const f=p.find(x=>x.startsWith(k));return f?f.slice(k.length).trim():"";};
  const ans=get("جواب الطالب:"),skip=/مش عارف/.test(ans),ok=/^صح/.test(get("النتيجة:"));
  return `<div class="gres"><b>${esc(name)}</b><span>${skip?"ضغطت «مش عارف»":"جوابي: "+mathify(ans)}</span>${skip?"":`<span class="tag ${ok?"ok":"no"}">${ok?"صح ✓":"مش مزبوط ✗"}</span>`}</div>`;
}
/* what the page tells the tutor with every message when the instructions live on the server (Supabase) */
function chatCtx(){
  if(isGuest())return{level:"L7"};
  const d=S.diag,c=d?currentSkill():null;
  return{level:d&&d.start&&skillById[d.start]?skillById[d.start].lv:undefined,skill:c?c.id:undefined,mis:Object.entries(S.detected).sort((a,b)=>b[1]-a[1]).map(x=>x[0]).filter(id=>misById[id]).slice(0,5)};
}
function siteContext(){
  const L=["[سياق من الموقع، وليس من كلام الطالب]"];
  if(isGuest())L.push("- هذه جلسة تجريبية: الزائر معلم يختبر نبراس، وقد يكتب كأنه طالب. تصرّف تماماً كما تتصرف مع طالب في الصف السابع.","- لا تقترح لعبة التشخيص ولا المسار، فالزائر ليس له حساب طالب.");
  else{
    L.push(`- الاسم المستعار للطالب: ${ME().nick}`);
    if(!S.diag)L.push("- لم يلعب لعبة التشخيص بعد. إذا طلب مساعدة عامة اقترح عليه لعبة التشخيص بلطف.");
    const c=S.diag?currentSkill():null;
    if(c)L.push(`- المحطة الحالية في مساره: ${c.title} (${LV[c.lv].name}). ${arProse(c.explanation)}${c.learn?" طريقة الكتاب المدرسي لهذه المهارة (التزم بها وبمصطلحاتها): "+c.learn.map(arProse).join(" "):""}`);
  }
  L.push("","# مكتبة الأخطاء المفاهيمية");
  MIS.forEach(m=>L.push(`- ${m.id}: ${m.title}. مثال: ${arProse(m.example)}`));
  L.push("","# وسم خفي (للموقع فقط)","إذا دلّ كلام الطالب بوضوح على خطأ مفاهيمي من المكتبة، أضف سطراً منفصلاً فيه: <<misconception:ID>> (مثل <<misconception:m03>>)، قبل أي وسم لعبة. الطالب لا يرى هذا السطر، فلا تشرحه ولا تذكره.");
  return L.join("\n");
}
const vis=t=>String(t).replace(/<<[^>]*>>/g,"").replace(/<<[^>]*$/,"").replace(/<$/,"").trim();
async function send(text,o){
  o=o||{};
  text=String(text||"").trim();const file=CHAT.file;const teacher=isGuest();
  if((!text&&!file)||CHAT.busy||!sampleFn)return;
  const t=today();if(S.chat.day!==t){S.chat.day=t;S.chat.count=0;}
  if(S.chat.count>=DAILY_LIMIT){CHAT.err=`وصلت لحد اليوم (${DAILY_LIMIT} رسالة). بنكمل بكرة إن شاء الله!`;drawChat();return;}
  const content=(text||"هاي صورة حلّي، شو رأيك؟")+(file?"\n[أرفق الطالب صورة لحلّه المكتوب]":"");
  S.chat.turns.push(o.cont?{role:"user",content,cont:true}:{role:"user",content});S.chat.count++;
  CHAT.file=null;CHAT.busy=true;CHAT.stream="";CHAT.err="";save();drawChat();
  const hist=S.chat.turns.slice(-16).map(x=>({role:x.role,content:x.content}));
  while(hist.length&&hist[0].role!=="user")hist.shift();
  /* on Supabase the tutor's instructions are added by the Edge Function; the page sends its context and a few codes.
     Without a server (local demo) the older instructions in this file are used. */
  const edge=Store.mode==="supabase"&&!(window.claude&&typeof window.claude.use==="function");
  /* teacher mode: a separate assistant whose instructions (and the misconception library) are on the server; only the conversation is sent */
  const input=teacher?hist:edge?[{role:"user",content:siteContext()},...hist]:[{role:"user",content:PROMPT+"\n\n"+context()},...hist];
  const ctl=new AbortController();CHAT.ctl=ctl;
  try{
    const opts={cache:false,signal:ctl.signal,onText:({text})=>{CHAT.stream=vis(text);paintStream();}};
    if(file)opts.images=file;
    if(edge&&teacher)opts.kind="teacher";
    else if(edge){opts.kind="chat";opts.ctx=chatCtx();}
    const res=await sampleFn(input,opts);
    [...String(res.text).matchAll(/<<\s*misconception\s*:\s*(m\d{2})\s*>>/gi)].forEach(m=>bump(m[1].toLowerCase()));
    if(teacher)S.chat.turns.push({role:"assistant",content:vis(res.text),cut:!!res.truncated}); /* a cut reply gets an «أكمل» button */
    else S.chat.turns.push({role:"assistant",content:vis(res.text)+(res.truncated?"\n\n(انقطع الرد، اطلب مني أكمّل)":"")});
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
function paintStream(){const el=$("#live");if(el){el.innerHTML=CHAT.stream?(isGuest()?md(plainCodes(CHAT.stream),{rich:true}):md(CHAT.stream)):'<span class="thinking" aria-label="نبراس بيفكّر"><i></i><i></i><i></i></span>';const box=$("#msgs");if(box)box.scrollTop=box.scrollHeight;}}
function vAsk(){drawChat();}
function drawChat(){
  if(route()!=="ask")return;
  const off=sampleFn===null,loading=sampleFn===undefined;
  const draft=$("#cin")?$("#cin").value:"";
  const turns=S.chat.turns;
  const guest=isGuest();
  if(CHAT.pad===null)CHAT.pad=padDefault();
  GAME_LIVE=null;
  const pad=CHAT.pad&&!off;
  /* teacher mode: a reply and its continuation («أكمل») are one message; the hidden request in between is not shown */
  const view=[];turns.forEach((x,i)=>{
    if(x.role==="user"&&x.cont)return;
    const pv=view[view.length-1];
    if(x.role==="assistant"&&i>0&&turns[i-1].cont&&pv&&pv.role==="assistant"){pv.content=joinCut(pv.content,x.content);pv.i=i;return;}
    view.push({role:x.role,content:x.content,i});
  });
  const lastT=turns[turns.length-1],cut=guest&&!off&&!CHAT.busy&&!!lastT&&lastT.role==="assistant"&&!!lastT.cut;
  const welcome=guest?`أهلاً بكِ! أنا نبراس للمعلمة. اكتبي خطأً أو إجابة خاطئة لاحظتِها عند طالبة، وسأقترح سببه المفاهيمي المحتمل، وسؤالاً تشخيصياً، وخطوة علاجية، وتمارين متابعة. القرار النهائي دائماً لكِ.`
    :`أهلاً ${ME().nick}! أنا نبراس. احكيلي شو السؤال اللي محيّرك، وبنفكّر فيه سوا خطوة خطوة. ما رح أعطيك الحل جاهز، بس رح أضل معك لحد ما توصل.`;
  app.innerHTML=`<section class="view">
    ${guest?`<div class="notice">${IC_INFO}<span><b>وضع المعلمة:</b> اكتبي خطأً لاحظتِه عند طالبة، وسيقترح نبراس سببه وطريقة علاجه. لا تكتبي أسماء الطالبات.</span></div>`:""}
    <div class="chat ${pad?"pad-open":""}${guest?" tmode":""}">
      <div class="chat-head"><span class="appicon">${ICON}</span><div style="flex:1;min-width:0"><b style="color:var(--logo)">${guest?"نبراس للمعلمة":"نبراس"}</b><div class="tiny">${loading?"بيجهّز…":off?"مش متاح بهذا العرض":CHAT.busy?"بيكتب…":guest?"مساعد المعلمة":"معلمك الافتراضي"}</div></div>
        ${turns.length?`<button class="btn btn-line btn-sm" id="clr" type="button">محادثة جديدة</button>`:""}</div>
      <div class="msgs" id="msgs" aria-live="polite">
        <div class="msg bot">${md(welcome)}</div>
        ${view.map(({role,content,i})=>role==="user"
          ?`<div class="msg me">${/^\[نتيجة لعبة\]/.test(content)?gresHTML(content):md(content.replace(/\n\[أرفق الطالب صورة لحلّه المكتوب\]$/,"\n(📷 صورة الحل)"))}</div>`
          :`<div class="msg bot">${(guest?md(plainCodes(content),{rich:true}):md(content,{game:j=>gameHTML(j,i===turns.length-1&&!CHAT.busy&&!off)}))}</div>`).join("")}
        ${cut?`<div class="controw"><span>الرد طويل وتوقّف قبل نهايته.</span><button class="btn btn-go btn-sm" id="cont" type="button">أكمل</button></div>`:""}
        ${CHAT.busy?`<div class="msg bot" id="live"></div>`:""}
      </div>
      ${!turns.length&&!off?`<div class="suggest">${(guest?["طالبة كتبت 1/2 + 1/3 = 2/5","طالبة كتبت 3x + 2x = 6x","طالبة كتبت 3² = 6"]:["ما فهمت قسمة الكسور","ليش −4 − 3 = −7؟","كيف بحل 2x − 3 = 11؟"]).map(s=>`<button type="button" data-s="${esc(arProse(s))}">${mathify(s)}</button>`).join("")}</div>`:""}
      ${CHAT.err?`<div class="note" role="alert">${esc(CHAT.err)}</div>`:""}
      ${off?`<div class="note">${guest?"نبراس مطفي حالياً، فما في إشي تجرّبه هلأ. جرّب بوقت ثاني.":Store.mode==="local"?"نبراس (الذكاء الاصطناعي) بيشتغل بس لما الموقع يكون موصول بـ Supabase. بتقدر تكمل اللعبة والمسار عادي.":"نبراس مطفي حالياً. بتقدر تكمل اللعبة والمسار عادي."}</div>`:""}
      ${CHAT.file?`<div class="note">📷 مرفق: ${esc(CHAT.file.name||"صورة")} <button class="btn btn-line btn-sm" id="rmf" type="button">إزالة</button></div>`:""}
      <form class="composer" id="cf">
        ${imgOK&&!off&&!guest?`<label class="iconbtn" title="صوّر حلّك وأرسله" aria-label="أرفق صورة لحلّك"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg><input id="cimg" type="file" accept="image/*" hidden></label>`:""}
        ${off?"":`<button class="iconbtn padt" id="padt" type="button" aria-pressed="${pad}" aria-label="${pad?"ارجع لكيبورد الجهاز":"افتح لوحة الأرقام والرموز"}" title="${pad?"كيبورد الجهاز":"لوحة الأرقام والرموز"}">${pad?"أ ب<small>حروف</small>":`${arMath("123")}<small>رموز</small>`}</button>`}
        <textarea id="cin" rows="1" ${pad?'inputmode="none"':""} placeholder="${guest?(pad?"اكتبي من اللوحة تحت…":"اكتبي خطأ الطالبة هنا…"):pad?"اكتب من اللوحة تحت…":"اكتب سؤالك هون…"}" aria-label="رسالتك" ${off?"disabled":""}></textarea>
        ${CHAT.busy?`<button class="iconbtn" id="stop" type="button" aria-label="أوقف"><svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg></button>`:
        `<button class="iconbtn send" type="submit" aria-label="أرسل" ${off||loading?"disabled":""}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12H5M11 6l-6 6 6 6"/></svg></button>`}
      </form>
      <div class="mprev" id="mprev" hidden><span>هيك رح تظهر:</span><span id="mpv"></span></div>
      ${pad?`<div id="cpad">${padHTML()}</div>`:""}
    </div>
    <p class="draft">نبراس نموذج ذكاء اصطناعي وممكن يغلط. ${guest?"المحادثة ما بتنحفظ. عدد الرسائل باليوم محدود.":(Store.mode==="local"?"المحادثة محفوظة على هذا الجهاز فقط.":"المحادثة محفوظة بحسابك.")+" "+DAILY_LIMIT+" رسالة باليوم."}</p>
  </section>`;
  const cin=$("#cin");
  cin.value=CHAT.prefill||draft;CHAT.prefill="";
  if(CHAT.busy)paintStream();
  /* wide messages (game, drawing, table) use the full width; then the live game is mounted */
  app.querySelectorAll("#msgs .msg").forEach(m=>{if(m.querySelector(".gamecard:not(.done),.chatfig,.tblwrap"))m.classList.add("wide");});
  if(GAME_LIVE&&$("#gw")){
    const sp=GAME_LIVE,go=$("#ggo"),sk=$("#gskip"),keep=["type","hop","shade"].includes(sp.q.type);
    const w=mountWidget(sp.q,$("#gw"),{mode:"practice",init:keep&&CHAT.gsave&&CHAT.gsave.key===sp.key?CHAT.gsave.val:undefined,
      onChange:ok=>{go.disabled=!ok;if(keep)CHAT.gsave=ok?{key:sp.key,val:w.value()}:null;},onEnter:()=>{if(!go.disabled)go.click();}});
    go.disabled=!w.ready();
    const tries=()=>1+turns.filter(t=>t.role==="user"&&t.content.startsWith("[نتيجة لعبة]")&&t.content.includes(`| ${sp.label}: ${sp.detail} |`)).length;
    const finish=(val,skip)=>{go.disabled=true;sk.disabled=true;CHAT.gsave=null;const ok=!skip&&sp.ok(val);if(!skip)beep(ok?"ding":"soft");
      send(`[نتيجة لعبة] ${GAME_NAME[sp.type]} | ${sp.label}: ${sp.detail} | جواب الطالب: ${skip?"ضغط «مش عارف»":sp.text(val)}${skip?"":` | النتيجة: ${ok?"صح":"غلط"} (المحاولة ${tries()})`} | الجواب الصح: ${sp.correct}`);};
    go.onclick=()=>{if(w.ready())finish(w.value(),false);};
    sk.onclick=()=>finish(null,true);
  }
  const box=$("#msgs");box.scrollTop=box.scrollHeight;
  $("#cf").addEventListener("submit",e=>{e.preventDefault();const v=cin.value;cin.value="";send(v);});
  cin.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();$("#cf").requestSubmit();}});
  /* a fraction or a power looks different once sent, so the student sees it first */
  const prev=()=>{const pv=$("#mprev");if(!pv)return;const v=cin.value.trim(),show=/[0-9٠-٩a-zء-ي)]\s*\/\s*[0-9٠-٩a-zء-ي(]|[²³⁴⁵]/.test(v);pv.hidden=!show;if(show)$("#mpv").innerHTML=mathify(v.replace(/\n/g," "));};
  cin.addEventListener("input",()=>{cin.style.height="auto";cin.style.height=Math.min(140,cin.scrollHeight)+"px";prev();});
  prev();
  const pt=$("#padt");
  if(pt)pt.onclick=()=>{CHAT.pad=!CHAT.pad;try{localStorage.setItem(PAD_KEY,CHAT.pad?"1":"0");}catch(e){}const keep=cin.value;drawChat();const c2=$("#cin");c2.value=keep;c2.dispatchEvent(new Event("input"));c2.focus();c2.setSelectionRange(keep.length,keep.length);
    const m2=$("#cpad .mpad");if(m2&&m2.getBoundingClientRect().bottom>innerHeight-70)m2.scrollIntoView({block:"end",behavior:"smooth"});};
  const mp=$("#cpad .mpad");
  if(mp)bindPad(mp,cin,()=>pt.click());
  app.querySelectorAll(".suggest button").forEach(b=>b.onclick=()=>send(b.dataset.s));
  if($("#cont"))$("#cont").onclick=()=>send(CONT_MSG,{cont:true});
  const st=$("#stop");if(st)st.onclick=()=>CHAT.ctl&&CHAT.ctl.abort();
  const cl=$("#clr");if(cl)cl.onclick=()=>{if(CHAT.busy&&CHAT.ctl)CHAT.ctl.abort();S.chat.turns=[];CHAT.err="";save();drawChat();};
  const ci=$("#cimg");if(ci)ci.onchange=()=>{CHAT.file=ci.files&&ci.files[0]||null;drawChat();};
  const rf=$("#rmf");if(rf)rf.onclick=()=>{CHAT.file=null;drawChat();};
  if(!CHAT.busy&&!off&&cin.value)cin.focus();
}


/* Every Western digit left anywhere on the page becomes ٠–٩, so counters, dates and
   numbers in ordinary sentences match the maths. Left alone: typed fields, the link
   code, e-mail addresses and phone numbers (anything marked dir="ltr" or .code). */
if(AR_MATH&&typeof MutationObserver==="function"){
  const SKIP='input,textarea,script,style,noscript,.code,[dir="ltr"],[data-latin]';
  const fixText=n=>{if(/[0-9]/.test(n.nodeValue)&&n.parentElement&&!n.parentElement.closest(SKIP))n.nodeValue=arNum(n.nodeValue);};
  const fix=n=>{
    if(n.nodeType===3)return fixText(n);
    if(n.nodeType!==1||n.closest(SKIP))return;
    const w=document.createTreeWalker(n,NodeFilter.SHOW_TEXT),list=[];let t;
    while((t=w.nextNode()))list.push(t);
    list.forEach(fixText);
  };
  new MutationObserver(ms=>{for(const m of ms){if(m.type==="characterData")fix(m.target);else m.addedNodes.forEach(fix);}})
    .observe(document.body,{childList:true,subtree:true,characterData:true});
  fix(document.body);
}

window.addEventListener("nibras-error",e=>toast(String(e.detail||"صار خطأ")));
app.innerHTML=`<section class="view"><div class="card interlude">${LANTERN("big on")}<p class="muted">لحظة…</p></div></section>`;
Promise.resolve().then(()=>Store.init()).catch(e=>{console.error(e);toast("ما قدرنا نوصل للخادم.");}).then(()=>{READY=true;render();});
})();
