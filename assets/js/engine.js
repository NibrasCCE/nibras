/* نبراس · محرك التصحيح: يتحقق من الأجوبة حسابياً ويطابقها مع مكتبة الأخطاء */
/* ---------- grading engine: maths decides right/wrong ---------- */
const AR_DIG={"٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9","٫":".","،":","};

/* ---------- Arabic school notation ----------
   The content (data.js) and the grading below stay in one canonical notation (x, y, 0-9).
   What the student SEES is converted to the notation of the school textbooks:
   variables س ص …, digits ٠–٩, decimal mark ٫, percent ٪, written right to left.
   What the student TYPES is converted back in norm() before grading, so both
   «٤ن» and «4n» are accepted.
   To switch the conversion off: MATH_NOTATION:"latin" in config.js. */
const AR_MATH=!(typeof window!=="undefined"&&window.NIBRAS_CONFIG&&window.NIBRAS_CONFIG.MATH_NOTATION==="latin");
const AR_VAR={a:"أ",b:"ب",c:"ج",d:"د",e:"ه",f:"ف",g:"غ",h:"ح",i:"ي",j:"ذ",k:"ك",l:"ط",m:"م",n:"ن",o:"خ",p:"ل",q:"ق",r:"ر",s:"ث",t:"ت",u:"ظ",v:"ض",w:"و",x:"س",y:"ص",z:"ع"};
const LAT_VAR=Object.assign(Object.fromEntries(Object.entries(AR_VAR).map(([l,a])=>[a,l])),{"ا":"a","إ":"a","آ":"a","ة":"e","ى":"i"});
const arDigits=s=>String(s).replace(/[0-9]/g,d=>"٠١٢٣٤٥٦٧٨٩"[+d]);
/* a maths fragment, where every Latin letter is a variable → Arabic notation (plain text) */
function arMath(s){
  s=String(s);if(!AR_MATH)return s;
  return arDigits(s.replace(/([0-9٠-٩])\.(?=[0-9٠-٩])/g,"$1٫").replace(/%/g,"٪").replace(/[a-z]/g,c=>AR_VAR[c]||c));
}
/* ordinary text: only the digits, the decimal mark and the percent sign change */
function arNum(s){
  s=String(s);if(!AR_MATH)return s;
  return arDigits(s.replace(/([0-9٠-٩])\.(?=[0-9٠-٩])/g,"$1٫").replace(/([0-9٠-٩])\s?%/g,"$1٪"));
}
function norm(s){
  return String(s).replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069\u0640]/g,"").replace(/٪/g,"%").replace(/[\u0621-\u064A]/g,c=>LAT_VAR[c]||c).replace(/[٠-٩٫]/g,c=>AR_DIG[c])
    /* the school book prints the decimal mark as a comma, so «3,21» and «3،21» mean 3.21 */
    .replace(/(\d)[,،](?=\d)/g,"$1.")
    /* a mixed number, whichever part was typed first: «2 1/2» or «1/2 2» → (2+1/2) */
    .replace(/(^|[^\/\d.])(\d+)\s+(\d+)\/(\d+)(?![\/\d.])/g,"$1($2+$3/$4)").replace(/(^|[^\/\d.(+])(\d+)\/(\d+)\s+(\d+)(?![\/\d.])/g,"$1($4+$2/$3)")
    .replace(/[−–—]/g,"-").replace(/×/g,"*").replace(/÷/g,"/")
    .replace(/²/g,"^2").replace(/³/g,"^3").replace(/⁴/g,"^4").replace(/\s+/g,"").toLowerCase();
}
function tokenize(s){
  const out=[];let i=0;
  while(i<s.length){
    const c=s[i];let t;
    if(/[0-9.]/.test(c)){let j=i;while(j<s.length&&/[0-9.]/.test(s[j]))j++;const v=s.slice(i,j);if(!/^\d*\.?\d+$|^\d+\.$/.test(v))return null;t={k:"n",v:parseFloat(v)};i=j;}
    else if(/[a-z]/.test(c)){t={k:"v",v:c};i++;}
    else if("+-*/^()".includes(c)){t={k:c};i++;}
    else return null;
    const p=out[out.length-1];
    if(p&&(p.k==="n"||p.k==="v"||p.k===")")&&(t.k==="v"||t.k==="("||(t.k==="n"&&p.k!=="n")))out.push({k:"*"});
    out.push(t);
  }
  return out.length?out:null;
}
function compile(str){
  const t=tokenize(str);if(!t)return null;
  let i=0;const vars=new Set();
  const peek=()=>t[i]&&t[i].k;
  function expr(){let f=term();while(peek()==="+"||peek()==="-"){const op=t[i++].k,a=f,b=term();f=op==="+"?e=>a(e)+b(e):e=>a(e)-b(e);}return f;}
  function term(){let f=unary();while(peek()==="*"||peek()==="/"){const op=t[i++].k,a=f,b=unary();f=op==="*"?e=>a(e)*b(e):e=>a(e)/b(e);}return f;}
  function unary(){if(peek()==="-"){i++;const a=unary();return e=>-a(e);}if(peek()==="+"){i++;return unary();}return power();}
  function power(){const a=prim();if(peek()==="^"){i++;const b=unary();return e=>Math.pow(a(e),b(e));}return a;}
  function prim(){const x=t[i++];if(!x)throw 0;
    if(x.k==="n")return()=>x.v;
    if(x.k==="v"){vars.add(x.v);return e=>e[x.v];}
    if(x.k==="("){const f=expr();if(!t[i]||t[i].k!==")")throw 0;i++;return f;}
    throw 0;}
  try{const f=expr();if(i!==t.length)return null;return{f,vars};}catch(e){return null;}
}
function parseAns(raw){
  const n=norm(raw);if(!n)return null;
  if(n.includes("=")){const p=n.split("=");if(p.length!==2)return null;
    if(/^[a-z]$/.test(p[0])){const c=compile(p[1]);return c&&!c.vars.size?{sol:c.f({})}:null;}
    if(/^[a-z]$/.test(p[1])){const c=compile(p[0]);return c&&!c.vars.size?{sol:c.f({})}:null;}
    return null;}
  const c=compile(n);return c?{expr:c}:null;
}
const close=(a,b)=>isFinite(a)&&isFinite(b)&&Math.abs(a-b)<=1e-9*Math.max(1,Math.abs(a),Math.abs(b));
function same(a,b){
  if(!a||!b)return false;
  const val=x=>x.sol!==undefined?x.sol:(x.expr.vars.size?null:x.expr.f({}));
  if(a.sol!==undefined||b.sol!==undefined){const va=val(a),vb=val(b);return va!==null&&vb!==null&&close(va,vb);}
  const vars=new Set([...a.expr.vars,...b.expr.vars]);
  const trials=[[1.37,2.91,0.53],[3.11,-1.7,2.2],[0.61,4.03,-2.47]];
  return trials.every(tr=>{const e={};[...vars].forEach((v,k)=>e[v]=tr[k%3]+k*0.173);return close(a.expr.f(e),b.expr.f(e));});
}
function isSimplified(raw){
  const n=norm(raw);if(n.includes("(")||n.includes("*")||n.includes("/"))return false;
  const terms=n.replace(/^[+-]/,"").replace(/([a-z0-9])[+-]/g,"$1|").split("|");
  const seen=new Set();
  for(const term of terms){
    const pow={};const re=/([a-z])(?:\^(\d+))?/g;let m;
    while((m=re.exec(term)))pow[m[1]]=(pow[m[1]]||0)+(+m[2]||1);
    const sig=Object.keys(pow).sort().map(k=>k+pow[k]).join("")||"1";
    if(seen.has(sig))return false;seen.add(sig);
  }
  return true;
}
const isNum=raw=>/^-?\d+(\.\d+)?(\/\d+)?$|^\(\d+\+\d+\/\d+\)$/.test(norm(raw).replace(/^[a-z]=/,""));
const ALG_SKILLS=["s6c","s7c"];
/* typed answers: returns {ok, mis, src, why} — src: math | match | form | ai */
function checkTyped(q,raw){
  const r=String(raw).trim();
  if(norm(r)===norm(q.answer))return{ok:true,mis:null,src:"math"};
  for(const w of q.wrong||[])if(norm(w.t)===norm(r))return{ok:false,mis:w.mis||null,src:w.mis?"match":"ai"};
  const pa=parseAns(r),pc=parseAns(q.answer);
  if(same(pa,pc)){
    if(/[a-z]\d/.test(norm(r)))return{ok:false,mis:null,src:"form",why:"القيمة صحيحة بس العدد لازم ينكتب قبل الحرف (مثل 4n)."};
    const needForm=ALG_SKILLS.includes(q.skill)&&!isSimplified(r);
    const needNum=pc&&pc.sol===undefined&&!pc.expr.vars.size&&!isNum(r);
    if(needForm||needNum)return{ok:false,mis:null,src:"form",why:"القيمة صحيحة بس الجواب مش بالشكل المبسّط."};
    return{ok:true,mis:null,src:"math"};
  }
  for(const w of q.wrong||[])if(w.mis&&same(pa,parseAns(w.t)))return{ok:false,mis:w.mis,src:"match"};
  return{ok:false,mis:null,src:"ai"};
}
const numOf=s=>parseFloat(norm(s));
const decLen=s=>{const m=norm(s).split(".");return m[1]?m[1].length:0;};
function isSortedBy(arr,key){for(let i=1;i<arr.length;i++)if(key(arr[i-1])>key(arr[i]))return false;return true;}
/* val: bubbles→option index · type→string · hop/shade→number · order→array of item strings */
function grade(q,val){
  if(q.type==="type")return checkTyped(q,val);
  if(q.type==="bubbles"){const o=q.options[val];return o.ok?{ok:true,mis:null,src:"math"}:{ok:false,mis:o.mis||null,src:o.mis?"match":"ai"};}
  if(q.type==="hop"||q.type==="shade"){
    if(val===q.answer)return{ok:true,mis:null,src:"math"};
    const m=(q.wrong||{})[String(val)];return{ok:false,mis:m||null,src:m?"match":"ai"};
  }
  if(q.type==="order"){
    if(isSortedBy(val,numOf))return{ok:true,mis:null,src:"math"};
    if(q.absMis&&isSortedBy(val,s=>Math.abs(numOf(s))))return{ok:false,mis:q.absMis,src:"match"};
    if(q.absMis){const neg=val.filter(s=>numOf(s)<0);if(neg.length>1&&isSortedBy(neg,s=>Math.abs(numOf(s))))return{ok:false,mis:q.absMis,src:"match"};}
    if(q.lenMis&&isSortedBy(val,decLen))return{ok:false,mis:q.lenMis,src:"match"};
    return{ok:false,mis:null,src:"ai"};
  }
  return{ok:false,mis:null,src:"none"};
}
function answerText(q,val){
  if(q.type==="bubbles")return q.options[val].t;
  if(q.type==="shade")return `ظلّل ${val} من ${q.n}`;
  if(q.type==="order")return val.join(" ، ");
  return String(val);
}
function correctText(q){
  if(q.type==="bubbles")return q.options.find(o=>o.ok).t;
  if(q.type==="shade")return `ظلّل ${q.answer} من ${q.n}`;
  if(q.type==="order")return q.items.slice().sort((a,b)=>numOf(a)-numOf(b)).join(" ، ");
  return String(q.answer);
}

