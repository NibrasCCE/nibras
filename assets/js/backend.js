/* =====================================================================
   Nibras backend layer
   - Supabase mode  (config.js filled): real accounts, data in the database,
                                        AI through the "nibras-ai" Edge Function.
   - Local demo mode (config.js empty): accounts and progress stay in this
                                        browser only; AI is switched off.
   The rest of the app only talks to window.Store and window.NibrasAI.
   ===================================================================== */
(function(){
"use strict";
const CFG=window.NIBRAS_CONFIG||{};
const HAS_SB=!!(CFG.SUPABASE_URL&&CFG.SUPABASE_KEY&&window.supabase&&typeof window.supabase.createClient==="function");
const freshProgress=()=>({diag:null,lit:{},streak:{},detected:{},chat:{turns:[],day:"",count:0},events:[]});
const normProgress=d=>Object.assign(freshProgress(),d&&typeof d==="object"?d:{});
function rid(n){const a="abcdefghijkmnpqrstuvwxyz23456789";let s="";const r=(window.crypto&&crypto.getRandomValues)?crypto.getRandomValues(new Uint8Array(n)):Array.from({length:n},()=>Math.random()*256|0);for(const x of r)s+=a[x%a.length];return s;}

/* phone numbers sign in through a hidden e-mail address (no SMS provider needed) */
function phoneEmail(digits){
  let host=CFG.PHONE_EMAIL_DOMAIN;
  if(!host){try{host=new URL(CFG.SUPABASE_URL).host;}catch(e){host="phone.nibras.app";}}
  return "p"+digits+"@"+host;
}

/* ---------------- Local demo store (same behaviour as the prototype) ---------------- */
function LocalStore(){
  const KEY="nibras.v2";
  let DB={users:{},session:null};
  try{const j=JSON.parse(localStorage.getItem(KEY)||"null");if(j&&j.users)DB=j;}catch(e){}
  const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(DB));}catch(e){}};
  const me=()=>DB.session?DB.users[DB.session]||null:null;
  async function hashPw(salt,pw){
    const data=new TextEncoder().encode(salt+"|"+pw);
    try{if(window.crypto&&crypto.subtle){const b=await crypto.subtle.digest("SHA-256",data);return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");}}catch(e){}
    let h=2166136261;for(const c of data){h^=c;h=Math.imul(h,16777619)>>>0;}return "f"+h.toString(16);
  }
  function newCode(){const a="ABCDEFGHJKMNPQRSTUVWXYZ23456789";let c;do{c="";for(let i=0;i<6;i++)c+=a[Math.floor(Math.random()*a.length)];}while(Object.values(DB.users).some(u=>u.code===c));return c;}
  const byCode=c=>Object.values(DB.users).find(u=>u.role==="student"&&u.code===String(c||"").trim().toUpperCase());
  function linkTo(par,code){
    const st=byCode(code);
    if(!st)return{ok:false,err:"رمز الربط مش صحيح. تأكد منه من صفحة «حسابي» عند الطالب."};
    par.children=par.children||[];par.linkedAt=par.linkedAt||{};
    if(par.children.includes(st.id))return{ok:false,err:"هاد الحساب مربوط من قبل."};
    par.children.push(st.id);par.linkedAt[st.id]=new Date().toISOString();persist();
    return{ok:true,nick:st.nick};
  }
  return{
    mode:"local",
    async init(){return me();},
    me,
    progress(){const u=me();return u&&u.role==="student"?u.progress:null;},
    save:persist,
    async signup(o){
      if(Object.values(DB.users).some(u=>u.ident===o.id.v))return{ok:false,err:"في حساب بهاد الإيميل/الرقم. اختار «عندي حساب»."};
      const salt=rid(16),uid=rid(12);
      const u={id:uid,role:o.role,ident:o.id.v,kind:o.id.kind,salt,hash:await hashPw(salt,o.password),created:new Date().toISOString()};
      if(o.role==="student")Object.assign(u,{nick:o.nick,avatar:o.avatar,code:newCode(),progress:freshProgress()});
      else Object.assign(u,{name:o.name||"",children:[],linkedAt:{},prefs:{channel:o.id.kind==="phone"?"sms":"email",email:o.id.kind==="email"?o.id.v:"",phone:o.id.kind==="phone"?o.id.v:"",diag:true,skill:true,level:true}});
      let warn="";
      if(o.role==="parent"&&o.code){const r=linkTo(u,o.code);if(!r.ok)warn=r.err;}
      DB.users[uid]=u;DB.session=uid;persist();
      return{ok:true,warn};
    },
    async login(o){
      const u=Object.values(DB.users).find(x=>x.ident===o.id.v);
      if(!u||(await hashPw(u.salt,o.password))!==u.hash)return{ok:false,err:"الإيميل/الرقم أو كلمة السر مش صحيحين."};
      if(u.role!==o.role)return{ok:false,err:u.role==="student"?"هاد حساب طالب. ادخل من «دخول الطلاب».":"هاد حساب ولي أمر. ادخل من «دخول الأهالي»."};
      DB.session=u.id;persist();return{ok:true};
    },
    async logout(){DB.session=null;persist();},
    async updateMe(p){const u=me();Object.assign(u,p);persist();return{ok:true};},
    async updatePrefs(p){const u=me();u.prefs=Object.assign({},u.prefs,p);persist();return{ok:true};},
    async deleteMe(){const u=me();if(!u)return;for(const p of Object.values(DB.users))if(p.children)p.children=p.children.filter(id=>id!==u.id);delete DB.users[u.id];DB.session=null;persist();},
    parentCount(){const u=me();return u?Object.values(DB.users).filter(p=>p.role==="parent"&&(p.children||[]).includes(u.id)).length:0;},
    async refreshParents(){return this.parentCount();},
    async notify(){return{ok:false,skipped:true};}, /* local demo: nothing is sent */
    /* the guest teacher only tries the AI chat, and AI needs Supabase */
    async guestTeacher(){return{ok:false,err:"تجربة المعلم الزائر بتحتاج الموقع موصول بـ Supabase، لأنه الذكاء الاصطناعي ما بيشتغل بالوضع التجريبي المحلي."};},
    async endGuest(){DB.session=null;persist();},
    async kids(){const u=me();return(u.children||[]).map(id=>DB.users[id]).filter(Boolean).map(s=>({id:s.id,nick:s.nick,avatar:s.avatar,progress:s.progress,linkedAt:(u.linkedAt||{})[s.id]||u.created}));},
    async link(code){return linkTo(me(),code);},
    async unlink(id){const u=me();u.children=(u.children||[]).filter(x=>x!==id);persist();return{ok:true};}
  };
}

/* ---------------- Supabase store (real accounts) ---------------- */
function SupabaseStore(){
  const sb=window.supabase.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
  let profile=null,prog=null,pcount=0,saveT=null,saving=Promise.resolve();
  const onErr=msg=>{try{window.dispatchEvent(new CustomEvent("nibras-error",{detail:msg}));}catch(e){}};
  async function loadMe(){
    const {data:{user}}=await sb.auth.getUser();
    if(!user){profile=null;prog=null;return null;}
    const {data:p,error}=await sb.from("profiles").select("*").eq("id",user.id).maybeSingle();
    if(error||!p){profile=null;onErr("ما قدرنا نجيب بيانات الحساب. تأكد إنه ملف قاعدة البيانات (migration) انشغّل.");return null;}
    profile=p;prog=null;pcount=0;
    if(p.role==="student"){
      const {data:r}=await sb.from("progress").select("data").eq("student_id",p.id).maybeSingle();
      prog=normProgress(r&&r.data);
      const {count}=await sb.from("links").select("parent_id",{count:"exact",head:true}).eq("student_id",p.id);
      pcount=count||0;
    }else{profile.prefs=Object.assign({channel:"email",email:"",phone:"",diag:true,skill:true,level:true},p.prefs||{});}
    return profile;
  }
  const authErr=e=>{
    const c=(e&&(e.code||e.error_code))||"",m=String(e&&e.message||"").toLowerCase();
    if(c==="user_already_exists"||m.includes("already registered"))return "في حساب بهاد الإيميل/الرقم. اختار «عندي حساب».";
    if(c==="invalid_credentials"||m.includes("invalid login"))return "الإيميل/الرقم أو كلمة السر مش صحيحين.";
    if(c==="weak_password")return "كلمة السر ضعيفة. جرّب وحدة أطول.";
    if(c==="email_not_confirmed")return "الإيميل لسا مش مأكّد. (لازم تطفّوا «Confirm email» بإعدادات Supabase، شوف الدليل.)";
    if(c==="email_address_invalid")return "الإيميل مش مقبول. جرّب إيميل ثاني.";
    if(c==="over_request_rate_limit"||c==="over_email_send_rate_limit")return "في محاولات كثير هلأ. استنى شوي وجرّب.";
    if(c==="email_address_not_authorized")return "Supabase بيحاول يبعت إيميل تأكيد. طفّوا «Confirm email» من الإعدادات (شوف الدليل).";
    return "صار خطأ: "+(e&&e.message||"غير معروف");
  };
  async function doLink(code){
    const {data,error}=await sb.rpc("link_child",{p_code:String(code||"").trim().toUpperCase()});
    if(error)return{ok:false,err:"ما زبط الربط: "+error.message};
    if(!data||!data.ok)return{ok:false,err:data&&data.error==="already"?"هاد الحساب مربوط من قبل.":"رمز الربط مش صحيح. تأكد منه من صفحة «حسابي» عند الطالب."};
    return{ok:true,nick:data.nick};
  }
  return{
    mode:"supabase",
    client:sb,
    async init(){const {data:{session}}=await sb.auth.getSession();if(!session)return null;return loadMe();},
    me:()=>profile,
    progress:()=>prog,
    save(){
      if(!profile||profile.role!=="student"||!prog)return;
      clearTimeout(saveT);
      saveT=setTimeout(()=>{
        const snapshot=JSON.parse(JSON.stringify(prog));
        saving=saving.then(()=>sb.from("progress").update({data:snapshot,updated_at:new Date().toISOString()}).eq("student_id",profile.id))
          .then(r=>{if(r&&r.error)onErr("ما انحفظ التقدّم: "+r.error.message);}).catch(e=>onErr("ما انحفظ التقدّم (مشكلة اتصال)."));
      },600);
    },
    async signup(o){
      const email=o.id.kind==="email"?o.id.v:phoneEmail(o.id.v);
      const {data,error}=await sb.auth.signUp({email,password:o.password,options:{data:{role:o.role,nick:o.nick||"",avatar:o.avatar||"cat",name:o.name||"",ident:o.id.v,ident_kind:o.id.kind}}});
      if(error)return{ok:false,err:authErr(error)};
      if(!data.session)return{ok:false,err:"الحساب انعمل بس بيستنى تأكيد الإيميل. طفّوا «Confirm email» من إعدادات Supabase وبعدين ادخلوا من «عندي حساب»."};
      const p=await loadMe();if(!p)return{ok:false,err:"الحساب انعمل بس ما انقرأ الملف الشخصي. تأكد من ملف قاعدة البيانات."};
      let warn="";
      if(o.role==="parent"&&o.code){const r=await doLink(o.code);if(!r.ok)warn=r.err;}
      return{ok:true,warn};
    },
    async login(o){
      const email=o.id.kind==="email"?o.id.v:phoneEmail(o.id.v);
      const {error}=await sb.auth.signInWithPassword({email,password:o.password});
      if(error)return{ok:false,err:authErr(error)};
      const p=await loadMe();
      if(!p){await sb.auth.signOut();return{ok:false,err:"ما لقينا ملف الحساب."};}
      if(p.role!==o.role){await sb.auth.signOut();profile=null;return{ok:false,err:p.role==="student"?"هاد حساب طالب. ادخل من «دخول الطلاب».":"هاد حساب ولي أمر. ادخل من «دخول الأهالي»."};}
      return{ok:true};
    },
    async logout(){clearTimeout(saveT);await saving;await sb.auth.signOut();profile=null;prog=null;},
    /* Guest teacher: an anonymous Supabase user with role "teacher" (no e-mail, no password).
       Needs «Allow anonymous sign-ins» in Supabase and migration 0002_teacher_guest.sql. */
    async guestTeacher(){
      /* the number of guest teachers is limited on the server (migration 0003_guest_limit.sql);
         ask first so a full house gets a clear message instead of a failed sign-in */
      let max=0;
      const full=()=>({ok:false,err:"عدد المعلمين الزوّار مكتمل هلأ"+(max?" (الحد "+max+")":"")+". جرّب بوقت ثاني، أو احكي مع فريق نبراس."});
      try{const {data}=await sb.rpc("guest_teacher_open");if(data&&typeof data==="object"){max=Number(data.max)||0;if(data.open===false)return full();}}catch(e){}
      const {error}=await sb.auth.signInAnonymously({options:{data:{role:"teacher",name:"معلم زائر"}}});
      if(error){
        const c=error.code||error.error_code||"",m=String(error.message||"").toLowerCase();
        if(c==="anonymous_provider_disabled"||m.includes("anonymous sign-ins are disabled"))return{ok:false,err:"دخول الزوّار مش مفعّل على الخادم. (للفريق: فعّلوا «Allow anonymous sign-ins» بإعدادات Supabase، شوف الدليل.)"};
        if(m.includes("database error"))return full(); /* the server refused: the last place was taken a moment ago */
        return{ok:false,err:authErr(error)};
      }
      const p=await loadMe();
      if(!p||p.role!=="teacher"){
        try{await sb.rpc("delete_me");}catch(e){}
        await sb.auth.signOut();profile=null;prog=null;
        return{ok:false,err:"حساب الزائر ما انعمل صح. (للفريق: شغّلوا ملف قاعدة البيانات 0002_teacher_guest.sql، شوف الدليل.)"};
      }
      return{ok:true};
    },
    /* leaving removes the temporary guest user so the database does not fill up with visitors */
    async endGuest(){
      try{if(profile&&profile.role==="teacher")await sb.rpc("delete_me");}catch(e){}
      await sb.auth.signOut();profile=null;prog=null;
    },
    async updateMe(p){const {error}=await sb.from("profiles").update(p).eq("id",profile.id);if(error)return{ok:false,err:error.message};Object.assign(profile,p);return{ok:true};},
    async updatePrefs(p){const prefs=Object.assign({},profile.prefs,p);const {error}=await sb.from("profiles").update({prefs}).eq("id",profile.id);if(error)return{ok:false,err:error.message};profile.prefs=prefs;return{ok:true};},
    async deleteMe(){const {error}=await sb.rpc("delete_me");await sb.auth.signOut();profile=null;prog=null;if(error)onErr("ما انحذف الحساب: "+error.message);},
    parentCount:()=>pcount,
    async refreshParents(){
      if(!profile||profile.role!=="student")return 0;
      const {count,error}=await sb.from("links").select("parent_id",{count:"exact",head:true}).eq("student_id",profile.id);
      if(!error)pcount=count||0;return pcount;
    },
    /* e-mail the linked parents through the "nibras-notify" Edge Function.
       Never throws: a failed notification must not interrupt the student. */
    async notify(kind,subject,body){
      if(CFG.NOTIFY_ENABLED===false||!profile||profile.role!=="student")return{ok:false,skipped:true};
      try{
        const {data:{session}}=await sb.auth.getSession();
        if(!session)return{ok:false};
        const res=await fetch(CFG.SUPABASE_URL.replace(/\/$/,"")+"/functions/v1/"+(CFG.NOTIFY_FUNCTION||"nibras-notify"),{method:"POST",
          headers:{"Content-Type":"application/json",apikey:CFG.SUPABASE_KEY,Authorization:"Bearer "+session.access_token},
          body:JSON.stringify({kind,subject,body})});
        let j={};try{j=await res.json();}catch(e){}
        if(!res.ok||j.failed)console.warn("[nibras-notify]",res.status,j.error||"",j.message||"",j.failed?("failed: "+j.failed):"");
        return{ok:res.ok,sent:j.sent||0,failed:j.failed||0};
      }catch(e){console.warn("[nibras-notify]",String(e));return{ok:false};}
    },
    async kids(){
      const {data:links,error}=await sb.from("links").select("student_id,created_at").eq("parent_id",profile.id);
      if(error){onErr("ما قدرنا نجيب الحسابات المربوطة: "+error.message);return[];}
      const ids=(links||[]).map(l=>l.student_id);if(!ids.length)return[];
      const [{data:ps},{data:pr}]=await Promise.all([sb.from("profiles").select("id,nick,avatar").in("id",ids),sb.from("progress").select("student_id,data").in("student_id",ids)]);
      return (links||[]).map(l=>{const p=(ps||[]).find(x=>x.id===l.student_id);const r=(pr||[]).find(x=>x.student_id===l.student_id);
        return p?{id:p.id,nick:p.nick,avatar:p.avatar,progress:normProgress(r&&r.data),linkedAt:l.created_at}:null;}).filter(Boolean);
    },
    link:doLink,
    async unlink(id){const {error}=await sb.from("links").delete().eq("parent_id",profile.id).eq("student_id",id);return error?{ok:false,err:error.message}:{ok:true};}
  };
}

/* ---------------- AI ---------------- */
function parseJsonLoose(t){
  t=String(t||"").trim();
  try{return JSON.parse(t);}catch(e){}
  const f=t.match(/```(?:json)?\s*([\s\S]*?)```/i);if(f){try{return JSON.parse(f[1]);}catch(e){}}
  const a=t.search(/[\[{]/),b=Math.max(t.lastIndexOf("}"),t.lastIndexOf("]"));
  if(a>=0&&b>a){try{return JSON.parse(t.slice(a,b+1));}catch(e){}}
  throw{code:"invalid_json",text:t};
}
function fileToJpegB64(file){
  return new Promise((res,rej)=>{
    const img=new Image(),url=URL.createObjectURL(file);
    img.onload=()=>{const max=1280,s=Math.min(1,max/Math.max(img.width,img.height));
      const c=document.createElement("canvas");c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);
      c.getContext("2d").drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);
      res({media_type:"image/jpeg",data:c.toDataURL("image/jpeg",.85).split(",")[1]});};
    img.onerror=()=>{URL.revokeObjectURL(url);rej({code:"image_rejected"});};
    img.src=url;
  });
}
function edgeAI(store){
  const fnName=CFG.AI_FUNCTION||"nibras-ai";
  async function call(input,opts,wantJson){
    opts=opts||{};
    const turns=typeof input==="string"?[{role:"user",content:input}]:input.map(t=>({role:t.role,content:String(t.content)}));
    let images=[];
    if(opts.images){const arr=opts.images instanceof Blob?[opts.images]:Array.from(opts.images);for(const f of arr.slice(0,2))images.push(await fileToJpegB64(f));}
    const {data:{session}}=await store.client.auth.getSession();
    if(!session)throw{code:"session_expired"};
    let res;
    try{
      res=await fetch(CFG.SUPABASE_URL.replace(/\/$/,"")+"/functions/v1/"+fnName,{method:"POST",signal:opts.signal,
        headers:{"Content-Type":"application/json",apikey:CFG.SUPABASE_KEY,Authorization:"Bearer "+session.access_token},
        body:JSON.stringify(Object.assign({messages:turns,tier:opts.modelTier==="quick"?"quick":"main",max_tokens:wantJson?400:1200,images},
          /* the chat: the tutor's instructions are added on the server; only codes are sent (level, skill, misconception ids) */
          opts.kind==="chat"?{kind:"chat",ctx:opts.ctx||{}}:{}))});
    }catch(e){if(e&&e.name==="AbortError")throw{code:"cancelled"};throw{code:"upstream_error",message:String(e)};}
    let j={};try{j=await res.json();}catch(e){}
    if(!res.ok){
      const code=j.error==="no_credit"?"no_credit":["missing_key","bad_api_key","usage_check_failed"].includes(j.error)?"not_configured":res.status===401?"session_expired":res.status===429?"rate_limited":"upstream_error";
      if(code==="not_configured"||code==="upstream_error")console.warn("[nibras-ai]",res.status,j.error,j.message||"");
      throw{code,message:j.message||j.error||("HTTP "+res.status)};
    }
    const text=String(j.text||"").trim();
    if(!text)throw{code:"empty_completion"};
    if(opts.onText){try{opts.onText({text,delta:text});}catch(e){}}
    return{text,truncated:j.stop_reason==="max_tokens"};
  }
  const fn=(input,opts)=>call(input,opts,false);
  fn.json=async(input,opts)=>parseJsonLoose((await call(input,opts,true)).text);
  fn.limits=async()=>({maxPromptBytes:262144,images:{maxCount:2,maxInputBytes:20000000,mediaTypes:["image/jpeg","image/png","image/webp","image/gif"]}});
  return fn;
}

const Store=HAS_SB?SupabaseStore():LocalStore();
window.Store=Store;
window.NibrasAI={
  /* resolves to a sample-like function, or null when AI is unavailable */
  get(){
    if(window.claude&&typeof window.claude.use==="function")return window.claude.use("sample").then(s=>s||null).catch(()=>null);
    if(Store.mode==="supabase"&&CFG.AI_ENABLED!==false)return Promise.resolve(edgeAI(Store));
    return Promise.resolve(null);
  }
};
})();
