/* =====================================================================
   نبراس · فيديو شرح الدرس مع الأفاتار «نبراس» (سبورة مرسومة بالكود + صوت مسجّل من ElevenLabs)
   NibrasLesson.has(skillId) / NibrasLesson.mount(hostElement, skillId)
   الصوت: assets/lessons/<skill>/  ·  الصورة: assets/img/nibras-teacher.webp
   ===================================================================== */
(function(){
"use strict";
const LESSONS={
  s7a:{audio:{0:"assets/lessons/s7a/1.mp3",1:"assets/lessons/s7a/2.mp3",2:"assets/lessons/s7a/3.mp3",3:"assets/lessons/s7a/4.mp3",4:"assets/lessons/s7a/5.mp3",5:"assets/lessons/s7a/6.mp3",6:"assets/lessons/s7a/7.mp3",7:[["assets/lessons/s7a/8a.mp3",2],{pause:3200},["assets/lessons/s7a/8b.mp3",1]],8:"assets/lessons/s7a/9.mp3"}},
  s7b:{audio:{0:"assets/lessons/s7b/1.mp3",1:"assets/lessons/s7b/2.mp3",2:"assets/lessons/s7b/3.mp3",3:"assets/lessons/s7b/4.mp3",4:"assets/lessons/s7b/5.mp3",5:"assets/lessons/s7b/6.mp3",6:"assets/lessons/s7b/7.mp3",7:[["assets/lessons/s7b/8a.mp3",2],{pause:3200},["assets/lessons/s7b/8b.mp3",1]],8:"assets/lessons/s7b/9.mp3"}}
};
const PLAYER_HTML=`<div class="lsn-player" id="lsn-player">
      <div class="lsn-stage" id="lsn-stage" tabindex="0" aria-label="فيديو الدرس مع نبراس. المسافة للتشغيل أو الإيقاف.">
        <canvas id="lsn-cv" dir="rtl"></canvas>
        <div class="lsn-cap" id="lsn-cap" hidden><span id="lsn-capt"></span></div>
        <button class="lsn-big" id="lsn-big" type="button"><span class="lsn-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5v17l14-8.5z" fill="currentColor"/></svg></span><span>ابدأ الدرس</span></button>
      </div>
      <div class="lsn-ctl">
        <button id="lsn-pp" type="button" aria-label="تشغيل"></button>
        <button id="lsn-prev" type="button" aria-label="الجزء السابق"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button>
        <button id="lsn-next" type="button" aria-label="الجزء التالي"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button>
        <div class="lsn-segs" id="lsn-segs" aria-hidden="true"></div>
        <button class="lsn-cc" id="lsn-cc" type="button" aria-pressed="true" aria-label="النص المكتوب">نص</button>
        <button id="lsn-snd" type="button" aria-pressed="true" aria-label="الصوت"></button>
        <button id="lsn-fs" type="button" aria-label="ملء الشاشة"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button>
      </div>
    </div>`;
function mount(host,sid){
const lesson=LESSONS[sid];if(!host||!lesson)return;
host.innerHTML='<div class="lsn">'+PLAYER_HTML+'</div>';
const $=s=>host.querySelector(s);
const W=1280,H=720;
const AR="٠١٢٣٤٥٦٧٨٩",toAr=s=>String(s).replace(/[0-9]/g,d=>AR[d]);
const num=n=>(n<0?"-":"")+toAr(Math.abs(n));
const reduce=!!(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),seg=(p,a,b)=>clamp((p-a)/(b-a),0,1),ease=t=>1-Math.pow(1-t,3),easeIO=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,lerp=(a,b,t)=>a+(b-a)*t;
const cv=$("#lsn-cv"),ctx=cv.getContext("2d");
/* board ink */
const K={ink:"#14234F",ink2:"#4A5784",ink3:"#8A93B0",navy:"#1D3A8A",gold:"#F4A62A",goldDk:"#B86E00",goldSoft:"#FFE7A8",green:"#18794E",greenSoft:"#DDF3E8",red:"#C0392B",redSoft:"#FCE1DD",grid:"#E7EAF3"};

const font=(s,w)=>`${w} ${s}px 'Tajawal','Segoe UI',Tahoma,sans-serif`;
function txt(s,x,y,o){o=o||{};const a=o.alpha==null?1:o.alpha;if(a<=0)return;ctx.save();ctx.globalAlpha*=a;ctx.font=font(o.size||40,o.weight||700);ctx.fillStyle=o.color||K.ink;ctx.textAlign=o.align||"center";ctx.textBaseline="middle";ctx.direction="rtl";ctx.fillText(s,x,y);ctx.restore();}
function rrPath(x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}
function rr(x,y,w,h,r){rrPath(x,y,w,h,r);ctx.fill();}
function circle(x,y,r){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}

/* ---------- the classroom ---------- */
function room(t){
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,"#FBF4E6");g.addColorStop(1,"#F2E3C8");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  const lg=ctx.createRadialGradient(170,330,10,170,330,360);lg.addColorStop(0,"rgba(255,209,102,.30)");lg.addColorStop(1,"rgba(255,209,102,0)");ctx.fillStyle=lg;ctx.fillRect(0,0,W,H);
  /* Nibras poster */
  ctx.fillStyle="#1D3A8A";rr(48,58,150,170,14);
  ctx.fillStyle="rgba(255,209,102,.35)";circle(123,105,26);ctx.fillStyle="#F4A62A";circle(123,105,15);ctx.fillStyle="#C3CDEE";rr(116,122,14,8,2);
  txt("نبراس",123,180,{size:34,weight:800,color:"#FFF8EC"});
  /* shelf with books */
  ctx.fillStyle="#E2CFA8";rr(30,300,210,12,4);
  [["#1D3A8A",24,70],["#2C4CB0",20,62],["#F4A62A",22,74],["#14234F",18,58],["#FFD166",22,66]].forEach((b,i,arr)=>{const x=46+arr.slice(0,i).reduce((s,q)=>s+q[1]+4,0);ctx.fillStyle=b[0];rr(x,300-b[2],b[1],b[2],3);});
  /* whiteboard */
  ctx.fillStyle="rgba(20,35,79,.10)";rr(572,36,700,632,24);
  ctx.fillStyle="#24376F";rr(560,24,700,632,24);
  ctx.fillStyle="#FFFDF8";rr(574,38,672,604,16);
}
/* board space: 1000 x 870, drawn into the inner whiteboard */
const BX=574,BY=44,BS=.672;
function onBoard(fn){ctx.save();ctx.beginPath();rrPath(574,38,672,604,16);ctx.clip();ctx.translate(BX,BY);ctx.scale(BS,BS);fn();ctx.restore();}
function pill(s,o){o=o||{};const a=o.alpha==null?1:o.alpha;if(a<=0)return;ctx.save();ctx.globalAlpha*=a;ctx.font=font(52,800);ctx.direction="rtl";const w=ctx.measureText(s).width+70;
  ctx.fillStyle=o.fill||"#FFD58A";rr(950-w,40,w,92,26);ctx.restore();txt(s,950-w/2,88,{size:52,weight:800,color:o.color||K.ink,alpha:a});}
function chip(s,x,y,o){o=o||{};const a=o.alpha==null?1:o.alpha;if(a<=0)return;ctx.save();ctx.globalAlpha*=a;ctx.font=font(o.size||58,800);ctx.direction="rtl";
  const w=ctx.measureText(s).width+70,h=(o.size||58)+40;ctx.fillStyle=o.fill||"#F3F5FB";rr(x-w/2,y-h/2,w,h,22);if(o.stroke){ctx.strokeStyle=o.stroke;ctx.lineWidth=3;rrPath(x-w/2,y-h/2,w,h,22);ctx.stroke();}
  ctx.restore();txt(s,x,y+3,{size:o.size||58,weight:800,color:o.color||K.ink,alpha:a});}
/* number line on the board */
let NA=-6,NB=6;const NY=500,NX0=80,NX1=920;
const X=n=>lerp(NX0,NX1,(n-NA)/(NB-NA));
function numberLine(o){o=o||{};const a=o.alpha==null?1:o.alpha;if(a<=0)return;ctx.save();ctx.globalAlpha*=a;
  ctx.strokeStyle=K.ink;ctx.lineWidth=5;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(X(NA)-34,NY);ctx.lineTo(X(NB)+34,NY);ctx.stroke();
  ctx.fillStyle=K.ink;[[X(NB)+50,1],[X(NA)-50,-1]].forEach(([x,d])=>{ctx.beginPath();ctx.moveTo(x,NY);ctx.lineTo(x-20*d,NY-12);ctx.lineTo(x-20*d,NY+12);ctx.closePath();ctx.fill();});
  for(let n=NA;n<=NB;n++){const x=X(n);ctx.strokeStyle=n===0?K.gold:K.ink;ctx.lineWidth=n===0?6:4;ctx.beginPath();ctx.moveTo(x,NY-18);ctx.lineTo(x,NY+18);ctx.stroke();
    const hl=o.hl&&o.hl.includes(n);ctx.restore();ctx.save();ctx.globalAlpha*=a;
    if(hl){ctx.fillStyle=K.goldSoft;circle(x,NY+56,30);}
    txt(num(n),x,NY+58,{size:36,weight:800,color:hl?K.goldDk:(n===0?K.goldDk:(n<0?K.navy:K.ink))});}
  ctx.restore();}
function frog(x,y){ctx.fillStyle="#4FAF57";ctx.beginPath();ctx.ellipse(x,y,28,19,0,0,Math.PI*2);ctx.fill();circle(x-13,y-17,10);circle(x+13,y-17,10);
  ctx.fillStyle="#fff";circle(x-13,y-18,6);circle(x+13,y-18,6);ctx.fillStyle=K.ink;circle(x-12,y-18,3);circle(x+14,y-18,3);}
function jump(from,to,u,col){if(u<=0)return;const steps=Math.abs(to-from),dir=Math.sign(to-from),k=u*steps,i=Math.min(Math.floor(k),steps-1),f=k-i;
  ctx.save();ctx.strokeStyle=col;ctx.lineWidth=4.5;ctx.setLineDash([3,11]);ctx.lineCap="round";
  for(let s=0;s<=i&&s<steps;s++){const a=from+dir*s,b=a+dir,uu=s<i?1:f;ctx.beginPath();
    for(let q=0;q<=20*uu;q++){const v=q/20,x=lerp(X(a),X(b),v),y=NY-30-Math.sin(v*Math.PI)*80;q?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();}ctx.restore();}
function frogPos(from,to,u){const steps=Math.abs(to-from),dir=Math.sign(to-from);if(u<=0)return{x:X(from),y:NY-30};if(u>=1)return{x:X(to),y:NY-30};
  const k=u*steps,i=Math.floor(k),f=k-i,a=from+dir*i;return{x:lerp(X(a),X(a+dir),f),y:NY-30-Math.sin(f*Math.PI)*80};}
function arrow(x1,y,x2,col,w){ctx.strokeStyle=col;ctx.lineWidth=w||7;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(x1,y);ctx.lineTo(x2,y);ctx.stroke();const d=Math.sign(x2-x1)||1;
  ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(x2+22*d,y);ctx.lineTo(x2,y-15);ctx.lineTo(x2,y+15);ctx.closePath();ctx.fill();}

/* ---------- the avatar: نبراس ---------- */
const AV=new Image();AV.src="assets/img/nibras-teacher.webp";
let talking=false,mouthOpen=true,mouthT=0,blinkAt=2,blinkOn=false;
function avatar(t){if(!AV.complete||!AV.naturalWidth)return;const s=.62;
  const breathe=reduce?0:Math.sin(t*1.7)*3,talkBob=(talking&&!reduce)?Math.sin(t*6.5)*2.2:0,rot=(talking&&!reduce)?Math.sin(t*2.3)*.006:0;
  ctx.save();ctx.translate(-30+355,48+breathe+talkBob+850);ctx.rotate(rot);ctx.translate(-355,-850);ctx.scale(s,s);
  ctx.fillStyle="rgba(20,35,79,.10)";ctx.beginPath();ctx.ellipse(560,1360,420,40,0,0,Math.PI*2);ctx.fill();
  ctx.drawImage(AV,0,0,1145,1374);
  /* mouth: the image is open; draw it closed between syllables */
  if(!mouthOpen){ctx.fillStyle="#FBBB8D";ctx.beginPath();ctx.ellipse(577,340,46,17,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle="#6B3A33";ctx.lineWidth=5;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(545,334);ctx.quadraticCurveTo(578,354,612,331);ctx.stroke();}
  /* blink */
  if(blinkOn){ctx.fillStyle="#FCB689";ctx.beginPath();ctx.ellipse(530,265,15,20,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(625,259,14,20,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle="#14182A";ctx.lineWidth=5;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(517,268);ctx.quadraticCurveTo(530,275,543,268);ctx.moveTo(612,262);ctx.quadraticCurveTo(625,269,638,262);ctx.stroke();}
  ctx.restore();
}
function faceTick(t,dt){
  if(curAud&&an&&!reduce){an.getByteTimeDomainData(abuf);let e=0;for(let i=0;i<abuf.length;i++){const v=(abuf[i]-128)/128;e+=v*v;}level=Math.sqrt(e/abuf.length);
    mouthOpen=mouthOpen?level>.025:level>.045;}
  else if(talking&&!reduce){mouthT-=dt;if(mouthT<=0){mouthOpen=!mouthOpen;mouthT=mouthOpen?.07+Math.random()*.12:.05+Math.random()*.08;}}else mouthOpen=false;
  if(!reduce){if(t>blinkAt&&!blinkOn){blinkOn=true;blinkAt=t+.13;}else if(blinkOn&&t>blinkAt){blinkOn=false;blinkAt=t+2.5+Math.random()*3;}}}

/* ---------- the lesson ---------- */
const S7A=[
 {anim:8.4,say:["أهلًا! أنا نبراس، وسأكون معك في هذا الدرس.","سنتعلّم اليوم جمع الأعداد الصحيحة وطرحها باستخدام خط الأعداد."],
  board(p){pill("الأعداد الصحيحة",{alpha:ease(seg(p,0,.2))});txt("الجمع والطرح",500,300,{size:72,weight:800,alpha:ease(seg(p,.15,.4))});
   txt("على خط الأعداد",500,390,{size:56,weight:700,color:K.navy,alpha:ease(seg(p,.25,.5))});
   NA=-6;NB=6;numberLine({alpha:ease(seg(p,.4,.7))*.9});chip("مهارة ٧٫١",500,740,{size:40,fill:K.goldSoft,alpha:ease(seg(p,.55,.8))});}},
 {anim:11.8,say:["هذا خط الأعداد، وفي منتصفه الصفر.","الأعداد على يمين الصفر موجبة، والأعداد على يساره سالبة.","وكلما تحركنا إلى اليمين، يكبر العدد."],
  board(p){pill("خط الأعداد");NA=-6;NB=6;numberLine({alpha:ease(seg(p,0,.2))});const a1=ease(seg(p,.25,.45)),a2=ease(seg(p,.45,.65));
   txt("موجبة",X(3),NY-110,{size:46,weight:800,color:K.green,alpha:a1});txt("سالبة",X(-3),NY-110,{size:46,weight:800,color:K.navy,alpha:a1});
   if(a2>0){ctx.save();ctx.globalAlpha*=a2;arrow(X(-4),690,lerp(X(-4),X(4),ease(seg(p,.5,.85))),K.gold);ctx.restore();txt("كلما اتجهنا يمينًا، يكبر العدد",500,770,{size:42,weight:800,color:K.goldDk,alpha:a2});}}},
 {anim:6.6,say:["لذلك، سالب اثنين أكبر من سالب سبعة،","لأن سالب اثنين يقع على يمين سالب سبعة."],
  board(p){pill("أيهما أكبر؟");NA=-8;NB=4;chip("-٢ > -٧",500,250,{alpha:ease(seg(p,.3,.55))});numberLine({hl:[-2,-7]});
   const a=ease(seg(p,.1,.3));ctx.save();ctx.globalAlpha*=a;ctx.fillStyle=K.red;circle(X(-7),NY,16);ctx.fillStyle=K.gold;circle(X(-2),NY,16);ctx.restore();
   txt("الأبعد إلى اليمين هو الأكبر",500,720,{size:44,weight:800,color:K.goldDk,alpha:ease(seg(p,.6,.85))});}},
 {anim:10.6,say:["والآن القاعدة.","عندما نجمع عددًا موجبًا، نتحرك إلى اليمين.","وعندما نجمع عددًا سالبًا، أو نطرح عددًا موجبًا، نتحرك إلى اليسار."],
  board(p){pill("القاعدة");[["نجمع عددًا موجبًا","يمينًا",K.green,K.greenSoft,1],["نجمع عددًا سالبًا","يسارًا",K.red,K.redSoft,-1],["نطرح عددًا موجبًا","يسارًا",K.red,K.redSoft,-1]].forEach((r,i)=>{
    const a=ease(seg(p,.12+i*.22,.3+i*.22));if(a<=0)return;const y=270+i*170;ctx.save();ctx.globalAlpha*=a;ctx.translate(0,(1-a)*20);
    ctx.fillStyle=r[3];rr(60,y-62,880,124,28);txt(r[0],900,y,{size:50,weight:800,align:"right"});
    const ax=250,len=170;arrow(ax-len/2*r[4],y,ax+len/2*r[4],r[2]);txt(r[1],ax,y+46,{size:34,weight:800,color:r[2]});ctx.restore();});}},
 {anim:7.8,say:["مثال: سالب ثلاثة زائد خمسة.","نبدأ من سالب ثلاثة، ونتحرك خمس خطوات إلى اليمين،","فنصل إلى اثنين."],
  board(p){pill("مثال ١");NA=-6;NB=6;chip(p>.85?"-٣ + ٥ = ٢":"-٣ + ٥ = ؟",500,250,{alpha:ease(seg(p,0,.12)),fill:p>.85?K.greenSoft:"#F3F5FB"});numberLine({hl:p>.85?[-3,2]:[-3]});
   const u=easeIO(seg(p,.25,.85));jump(-3,2,u,K.green);const f=frogPos(-3,2,u);frog(f.x,f.y);
   txt("٥ خطوات إلى اليمين",500,720,{size:44,weight:800,color:K.green,alpha:ease(seg(p,.3,.45))});}},
 {anim:9.8,say:["مثال آخر: سالب أربعة ناقص ثلاثة.","نبدأ من سالب أربعة، والطرح هنا يعني أن نتحرك ثلاث خطوات إلى اليسار،","فنصل إلى سالب سبعة."],
  board(p){pill("مثال ٢");NA=-8;NB=4;chip(p>.85?"-٤ - ٣ = -٧":"-٤ - ٣ = ؟",500,250,{alpha:ease(seg(p,0,.12)),fill:p>.85?K.greenSoft:"#F3F5FB"});numberLine({hl:p>.85?[-4,-7]:[-4]});
   const u=easeIO(seg(p,.25,.85));jump(-4,-7,u,K.red);const f=frogPos(-4,-7,u);frog(f.x,f.y);
   txt("٣ خطوات إلى اليسار",500,720,{size:44,weight:800,color:K.red,alpha:ease(seg(p,.3,.45))});}},
 {anim:12,say:["انتبه لخطأ شائع:","بعض الطلاب يتجاهلون إشارة السالب، فيكتبون أن الناتج سالب واحد.","تذكّر: نحن نتحرك إلى اليسار، فالناتج سالب سبعة."],
  board(p){pill("انتبه!",{fill:K.redSoft,color:K.red});chip("-٤ - ٣ = -١",500,320,{alpha:ease(seg(p,.05,.2)),fill:K.redSoft,color:K.red});
   const x=ease(seg(p,.3,.45));if(x>0){ctx.save();ctx.strokeStyle=K.red;ctx.lineWidth=9;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(300,290);ctx.lineTo(lerp(300,700,x),lerp(290,350,x));ctx.stroke();ctx.restore();}
   chip("-٤ - ٣ = -٧",500,520,{alpha:ease(seg(p,.6,.75)),fill:K.greenSoft,color:K.green});
   txt("الطرح هنا = حركة إلى اليسار",500,680,{size:44,weight:800,color:K.goldDk,alpha:ease(seg(p,.7,.85))});}},
 {anim:14,say:["والآن جرّب أنت: سالب خمسة زائد ثمانية.","فكّر قليلًا…",{pause:3200},"الجواب: ثلاثة. بدأنا من سالب خمسة، وتحركنا ثماني خطوات إلى اليمين."],
  board(p){pill("جرّب أنت");NA=-6;NB=6;const reveal=p>.56;chip(p>.92?"-٥ + ٨ = ٣":"-٥ + ٨ = ؟",500,250,{alpha:ease(seg(p,0,.1)),fill:p>.92?K.greenSoft:"#F3F5FB"});numberLine({hl:p>.92?[-5,3]:[-5]});
   if(!reveal){if(p>.2&&p<.5){const k=Math.max(1,Math.ceil(3*(1-seg(p,.2,.5))));ctx.fillStyle=K.goldSoft;circle(500,720,56);txt(toAr(k),500,724,{size:60,weight:800,color:K.goldDk});}const f=frogPos(-5,3,0);frog(f.x,f.y);}
   else{const u=easeIO(seg(p,.55,.92));jump(-5,3,u,K.green);const f=frogPos(-5,3,u);frog(f.x,f.y);}}},
 {anim:12.4,say:["أحسنت!","تذكّر: نجمع عددًا موجبًا فنتحرك يمينًا، ونجمع سالبًا أو نطرح موجبًا فنتحرك يسارًا.","والآن جرّب التمارين، وأضئ فانوس هذه المهارة."],
  board(p){pill("أحسنت!");[["نجمع موجبًا","يمينًا",K.green,K.greenSoft,1],["نجمع سالبًا أو نطرح موجبًا","يسارًا",K.red,K.redSoft,-1]].forEach((r,i)=>{const a=ease(seg(p,.15+i*.2,.35+i*.2));if(a<=0)return;
    const y=290+i*170;ctx.save();ctx.globalAlpha*=a;ctx.fillStyle=r[3];rr(60,y-62,880,124,28);txt(r[0],900,y,{size:48,weight:800,align:"right"});arrow(250-85*r[4],y,250+85*r[4],r[2]);ctx.restore();});
   const b=ease(seg(p,.65,.8));if(b>0){ctx.save();ctx.globalAlpha*=b;ctx.fillStyle=K.gold;rr(300,640,400,100,50);ctx.restore();txt("إلى التمارين",500,692,{size:44,weight:800,color:K.ink,alpha:b});}}}
];
/* s7b helpers: notebooks, workers, day cells, tomatoes, vertical arrows */
function book(x,y,s,col){ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.fillStyle=col||K.navy;rr(-26,-34,52,68,7);ctx.fillStyle="rgba(255,255,255,.35)";rr(-22,-34,7,68,2);ctx.fillStyle="#fff";rr(-12,-20,28,10,3);ctx.restore();}
function books(n,cx,y,s,a){if(a<=0)return;s=s||1;const gap=66*s,x0=cx+(n-1)*gap/2;ctx.save();ctx.globalAlpha*=a;const cols=[K.navy,"#2C4CB0",K.gold,"#14234F","#FFB547"];for(let i=0;i<n;i++)book(x0-i*gap,y,s,cols[i%cols.length]);ctx.restore();}
function worker(x,y,s){ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.fillStyle="#2C4CB0";rr(-20,-6,40,52,14);ctx.fillStyle="#F2B48A";circle(0,-26,16);ctx.fillStyle=K.gold;ctx.beginPath();ctx.arc(0,-30,18,Math.PI,0);ctx.fill();rr(-22,-32,44,6,3);ctx.restore();}
function workers(n,cx,y,s,a){if(a<=0)return;const gap=54*s,x0=cx+(n-1)*gap/2;ctx.save();ctx.globalAlpha*=a;for(let i=0;i<n;i++)worker(x0-i*gap,y,s);ctx.restore();}
function cells(n,cx,y,a,col){if(a<=0)return;const gap=56,x0=cx+(n-1)*gap/2;ctx.save();ctx.globalAlpha*=a;for(let i=0;i<n;i++){const x=x0-i*gap;ctx.fillStyle=col||K.goldSoft;rr(x-22,y-22,44,44,9);ctx.strokeStyle=K.goldDk;ctx.lineWidth=2.5;rrPath(x-22,y-22,44,44,9);ctx.stroke();ctx.fillStyle=K.goldDk;rr(x-22,y-22,44,10,4);}ctx.restore();}
function tomato(x,y,s){ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.fillStyle="#E5533D";ctx.beginPath();ctx.ellipse(0,0,34,29,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="rgba(255,255,255,.35)";ctx.beginPath();ctx.ellipse(-12,-10,9,6,-.5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#3E9B4F";for(let k=0;k<5;k++){const r=k*Math.PI*2/5-Math.PI/2;ctx.beginPath();ctx.ellipse(Math.cos(r)*9,-26+Math.sin(r)*5,9,4,r,0,Math.PI*2);ctx.fill();}ctx.restore();}
function vArrow(x,y1,y2,col,label,a){if(a<=0)return;ctx.save();ctx.globalAlpha*=a;ctx.strokeStyle=col;ctx.lineWidth=6;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(x,y1);ctx.lineTo(x,y2);ctx.stroke();const d=Math.sign(y2-y1)||1;
  ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(x,y2+18*d);ctx.lineTo(x-13,y2);ctx.lineTo(x+13,y2);ctx.closePath();ctx.fill();ctx.restore();if(label)txt(label,x,(y1+y2)/2,{size:38,weight:800,color:col,alpha:a,align:"center"});}
function upDown(x,y,dir2,a,c1,c2){vArrow(x-26,y+40,y-30,c1||K.green,"",a);vArrow(x+26,dir2>0?y+40:y-40,dir2>0?y-30:y+30,c2||(dir2>0?K.green:K.red),"",a);}
const S7B=[
 {anim:6.4,say:["أهلًا من جديد! أنا نبراس.","في هذا الدرس سنتعلّم التناسب الطردي والتناسب العكسي."],
  board(p){pill("التناسب",{alpha:ease(seg(p,0,.2))});txt("الطردي والعكسي",500,270,{size:72,weight:800,alpha:ease(seg(p,.15,.4))});
   const a=ease(seg(p,.35,.6)),b=ease(seg(p,.5,.75));
   if(a>0){ctx.save();ctx.globalAlpha*=a;ctx.fillStyle=K.greenSoft;rr(560,390,340,240,30);ctx.restore();upDown(730,480,1,a);txt("طردي",730,585,{size:48,weight:800,color:K.green,alpha:a});}
   if(b>0){ctx.save();ctx.globalAlpha*=b;ctx.fillStyle=K.redSoft;rr(100,390,340,240,30);ctx.restore();upDown(270,480,-1,b);txt("عكسي",270,585,{size:48,weight:800,color:K.red,alpha:b});}
   chip("مهارة ٧٫٢",500,740,{size:40,fill:K.goldSoft,alpha:ease(seg(p,.65,.85))});}},
 {anim:9,say:["في التناسب الطردي، تكبر الكميتان معًا بالعدد نفسه من المرات.","إذا اشتريت ضعف عدد الدفاتر، تدفع ضعف المال."],
  board(p){pill("التناسب الطردي",{fill:K.greenSoft,color:K.green});const r1=ease(seg(p,.05,.2)),r2=ease(seg(p,.55,.72)),ar=ease(seg(p,.62,.8));
   books(1,720,290,1.2,r1);chip("٤ ₪",260,290,{alpha:r1});txt("←",470,290,{size:56,weight:800,color:K.ink3,alpha:r1});
   books(2,720,540,1.2,r2);chip("٨ ₪",260,540,{alpha:r2,fill:K.greenSoft,color:K.green});txt("←",470,540,{size:56,weight:800,color:K.ink3,alpha:r2});
   vArrow(920,350,470,K.green,"",ar);txt("×٢",960,410,{size:40,weight:800,color:K.green,alpha:ar});vArrow(80,350,470,K.green,"",ar);txt("×٢",40,410,{size:40,weight:800,color:K.green,alpha:ar});
   txt("تكبران معًا بالعدد نفسه من المرات",500,730,{size:44,weight:800,color:K.green,alpha:ease(seg(p,.25,.4))});}},
 {anim:9.5,say:["مثال: ثمن ثلاثة دفاتر اثنا عشر شيكلًا.","أولًا نجد ثمن الدفتر الواحد: اثنا عشر تقسيم ثلاثة يساوي أربعة شواكل."],
  board(p){pill("مثال");const r1=ease(seg(p,.03,.18)),st=ease(seg(p,.5,.65)),r2=ease(seg(p,.75,.9));
   books(3,720,270,1.1,r1);txt("←",470,270,{size:56,weight:800,color:K.ink3,alpha:r1});chip("١٢ ₪",260,270,{alpha:r1});
   txt("ثمن الدفتر الواحد",500,420,{size:42,weight:800,color:K.ink2,alpha:ease(seg(p,.4,.55))});chip("١٢ ÷ ٣ = ٤",500,520,{alpha:st,fill:K.goldSoft});
   books(1,720,690,1.1,r2);txt("←",470,690,{size:56,weight:800,color:K.ink3,alpha:r2});chip("٤ ₪",260,690,{alpha:r2,fill:K.greenSoft,color:K.green});}},
 {anim:4.8,say:["ثم نضرب: خمسة دفاتر في أربعة شواكل تساوي عشرين شيكلًا."],
  board(p){pill("ثم نضرب");const done=p>.62;
   ctx.fillStyle="#F3F5FB";rr(140,190,720,420,28);ctx.fillStyle=K.grid;rr(140,190,720,90,28);
   txt("الدفاتر",680,235,{size:44,weight:800,color:K.navy});txt("الثمن",320,235,{size:44,weight:800,color:K.navy});
   [["٣","١٢"],["١","٤"]].forEach((r,i)=>{const y=330+i*100;txt(r[0],680,y,{size:52,weight:800});txt(r[1]+" ₪",320,y,{size:52,weight:800});});
   const a=ease(seg(p,.05,.25));ctx.save();ctx.globalAlpha*=a;ctx.fillStyle=done?K.greenSoft:K.goldSoft;rr(160,490,680,100,22);ctx.restore();
   txt("٥",680,540,{size:56,weight:800,color:K.goldDk,alpha:a});txt(done?"٢٠ ₪":"؟",320,540,{size:56,weight:800,color:done?K.green:K.goldDk,alpha:a});
   chip("٥ × ٤ = ٢٠",500,720,{alpha:ease(seg(p,.4,.6)),fill:done?K.greenSoft:"#F3F5FB",color:done?K.green:K.ink});}},
 {anim:10.3,say:["انتبه لخطأ شائع: بعض الطلاب يجمعون بدل أن يضربوا، فيقولون أربعة عشر شيكلًا.","التناسب يعتمد على الضرب، لا على الجمع."],
  board(p){pill("انتبه!",{fill:K.redSoft,color:K.red});chip("٥ دفاتر = ١٤ ₪",500,290,{alpha:ease(seg(p,.25,.4)),fill:K.redSoft,color:K.red});
   txt("زاد دفتران، فزادوا شيكلين ✗",500,400,{size:38,weight:700,color:K.red,alpha:ease(seg(p,.35,.5))});
   const x=ease(seg(p,.55,.68));if(x>0){ctx.save();ctx.strokeStyle=K.red;ctx.lineWidth=9;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(250,260);ctx.lineTo(lerp(250,750,x),lerp(260,320,x));ctx.stroke();ctx.restore();}
   chip("٥ × ٤ = ٢٠ ₪",500,550,{alpha:ease(seg(p,.62,.76)),fill:K.greenSoft,color:K.green});
   txt("التناسب = ضرب، لا جمع",500,700,{size:46,weight:800,color:K.goldDk,alpha:ease(seg(p,.72,.86))});}},
 {anim:13.8,say:["أما في التناسب العكسي، فعندما تكبر كمية، تصغر الأخرى.","مثال: ينجز أربعة عمال عملًا في ستة أيام.","إذا أصبح العمال ثمانية، أي الضعف، تصبح الأيام النصف: ثلاثة أيام."],
  board(p){pill("التناسب العكسي",{fill:K.redSoft,color:K.red});const r1=ease(seg(p,.3,.45)),r2=ease(seg(p,.62,.75)),ar=ease(seg(p,.68,.82)),fin=p>.88;
   txt("عمال",720,190,{size:40,weight:800,color:K.navy,alpha:r1});txt("أيام",270,190,{size:40,weight:800,color:K.goldDk,alpha:r1});
   workers(4,720,300,.95,r1);txt("٤",720,385,{size:44,weight:800,alpha:r1});cells(6,270,300,r1);txt("٦",270,385,{size:44,weight:800,alpha:r1});
   workers(8,720,520,.8,r2);txt("٨",720,600,{size:44,weight:800,color:K.green,alpha:r2});cells(3,270,520,r2,fin?K.greenSoft:null);txt("٣",270,600,{size:44,weight:800,color:fin?K.green:K.ink,alpha:r2});
   vArrow(955,330,470,K.green,"",ar);txt("×٢",955,300,{size:36,weight:800,color:K.green,alpha:ar});vArrow(45,330,470,K.red,"",ar);txt("÷٢",45,300,{size:36,weight:800,color:K.red,alpha:ar});
   txt("كمية تكبر ← الأخرى تصغر",500,730,{size:44,weight:800,color:K.red,alpha:ease(seg(p,.05,.2))});}},
 {anim:11.2,say:["كيف تعرف نوع التناسب؟","اسأل نفسك: عندما تكبر الكمية الأولى، هل تكبر الثانية أم تصغر؟","إذا كبرت معها فهو طردي، وإذا صغرت فهو عكسي."],
  board(p){pill("كيف تعرف؟");txt("عندما تكبر الكمية الأولى…",500,230,{size:48,weight:800,alpha:ease(seg(p,.15,.3))});
   txt("هل تكبر الثانية أم تصغر؟",500,310,{size:44,weight:700,color:K.ink2,alpha:ease(seg(p,.35,.5))});
   [["تكبر الثانية","طردي",K.green,K.greenSoft,1,.62],["تصغر الثانية","عكسي",K.red,K.redSoft,-1,.82]].forEach((r,i)=>{const a=ease(seg(p,r[5],r[5]+.1));if(a<=0)return;const y=470+i*180;
    ctx.save();ctx.globalAlpha*=a;ctx.translate(0,(1-a)*20);ctx.fillStyle=r[3];rr(60,y-70,880,140,30);ctx.restore();
    upDown(860,y-5,r[4],a);txt(r[0],560,y,{size:48,weight:800,alpha:a});txt(r[1],250,y,{size:56,weight:800,color:r[2],alpha:a});});}},
 {anim:15.6,say:["والآن جرّب أنت: كيلو البندورة بثلاثة شواكل.","كم ثمن خمسة كيلوغرامات؟ فكّر قليلًا…",{pause:3200},"الجواب: خمسة عشر شيكلًا، لأن خمسة في ثلاثة يساوي خمسة عشر."],
  board(p){pill("جرّب أنت");const reveal=p>.66,done=p>.8;chip("١ كغ = ٣ ₪",500,250,{alpha:ease(seg(p,0,.12))});
   for(let i=0;i<5;i++){const a=ease(seg(p,.22+i*.03,.3+i*.03));if(a<=0)continue;const x=780-i*140;ctx.save();ctx.globalAlpha*=a;tomato(x,450,1.2);ctx.restore();
    txt("٣",x,375,{size:38,weight:800,color:K.goldDk,alpha:reveal?ease(seg(p,.68+i*.025,.72+i*.025)):0});}
   txt("٥ كغ",500,545,{size:40,weight:800,color:K.ink2,alpha:ease(seg(p,.32,.42))});
   chip(done?"٥ × ٣ = ١٥ ₪":"٥ كغ = ؟",500,680,{alpha:ease(seg(p,.3,.4)),fill:done?K.greenSoft:"#F3F5FB",color:done?K.green:K.ink});
   if(!reveal&&p>.46){const k=Math.max(1,Math.ceil(3*(1-seg(p,.46,.65))));ctx.fillStyle=K.goldSoft;circle(800,680,54);txt(toAr(k),800,684,{size:58,weight:800,color:K.goldDk});}}},
 {anim:10.3,say:["أحسنت! تذكّر: في الطردي تكبر الكميتان معًا، وفي العكسي تكبر واحدة وتصغر الأخرى.","والآن جرّب التمارين، وأضئ فانوس هذه المهارة."],
  board(p){pill("أحسنت!");[["الطردي: تكبران معًا",K.green,K.greenSoft,1],["العكسي: واحدة تكبر والأخرى تصغر",K.red,K.redSoft,-1]].forEach((r,i)=>{const a=ease(seg(p,.15+i*.25,.35+i*.25));if(a<=0)return;
    const y=290+i*180;ctx.save();ctx.globalAlpha*=a;ctx.fillStyle=r[2];rr(60,y-70,880,140,30);ctx.restore();txt(r[0],880,y,{size:44,weight:800,align:"right",alpha:a});upDown(150,y-5,r[3],a);});
   const b=ease(seg(p,.7,.85));if(b>0){ctx.save();ctx.globalAlpha*=b;ctx.fillStyle=K.gold;rr(300,640,400,100,50);ctx.restore();txt("إلى التمارين",500,692,{size:44,weight:800,color:K.ink,alpha:b});}}}
];
const SCENES=sid==="s7b"?S7B:S7A;

/* ---------- recorded narration (ElevenLabs). Parts without a file fall back to the device voice ---------- */
const AUD=lesson.audio;
let actx=null,an=null,abuf=null,curAud=null,level=0;
function ensureCtx(){if(actx)return;try{actx=new (window.AudioContext||window.webkitAudioContext)();an=actx.createAnalyser();an.fftSize=512;abuf=new Uint8Array(an.fftSize);an.connect(actx.destination);}catch(e){actx=null;an=null;}}
function narrate(i,done){const lines=SCENES[i].say,txt=lines.filter(l=>typeof l==="string");if(!(AUD[i]&&voiceOn)){speakScene(lines,done);return;}
  const v=AUD[i];if(!Array.isArray(v)){playClip(i,v,txt,done);return;}
  /* a list: [file, number of caption lines] and {pause} items, played in order */
  let k=0,li=0;const tok0=speakTok+1;const step=()=>{if(k>=v.length){done();return;}const it=v[k++];
    if(it.pause){talking=false;const t=speakTok;setTimeout(()=>{if(t===speakTok)step();},it.pause);return;}
    const sub=txt.slice(li,li+it[1]);li+=it[1];playClip(i,it[0],sub,step);};step();}
function playClip(i,src,lines,done){stopVoice();const tok=++speakTok;const a=new Audio(src);curAud=a;
  if(actx&&an){try{actx.createMediaElementSource(a).connect(an);if(actx.state==="suspended")actx.resume();}catch(e){}}
  const ch=lines.map(l=>l.length),tot=ch.reduce((x,c)=>x+c,0);
  a.ontimeupdate=()=>{if(tok!==speakTok||!a.duration)return;let f=a.currentTime/a.duration*tot,k=0;while(k<lines.length-1&&f>ch[k]){f-=ch[k];k++;}curLine=lines[k];};
  const fallback=()=>{if(tok!==speakTok)return;curAud=null;speakScene(SCENES[i].say,done);};
  a.onended=()=>{if(tok!==speakTok)return;curAud=null;level=0;talking=false;setTimeout(()=>{if(tok===speakTok)done();},250);};
  a.onerror=fallback;curLine=lines[0];talking=true;const pr=a.play();if(pr&&pr.catch)pr.catch(fallback);}

/* ---------- voice (device text-to-speech; a male Arabic voice when the device has one) ---------- */
let caps=true;const synth=window.speechSynthesis;let voice=null,voiceOn=true;
const MALE=/maged|majed|tarik|tariq|naayf|hamed|hamid|fahed|omar|shakir|hamdan|bassel|male|rami|saleh|zayd/i;
function pickVoice(){if(!synth)return;const vs=(synth.getVoices()||[]).filter(v=>/^ar/i.test(v.lang));voice=vs.find(v=>MALE.test(v.name))||vs[0]||null;}
if(synth){pickVoice();synth.onvoiceschanged=pickVoice;}
let speakTok=0,curLine="";
function speakScene(lines,done){const tok=++speakTok;let i=0;
  const nextLine=()=>{if(tok!==speakTok)return;if(i>=lines.length){done();return;}const l=lines[i++];
    if(typeof l==="object"){talking=false;setTimeout(nextLine,l.pause);return;}
    if(!voiceOn||!synth||!voice){curLine=l;talking=true;setTimeout(()=>{if(tok!==speakTok)return;talking=false;setTimeout(nextLine,250);},Math.max(1500,l.length*80));return;}
    curLine=l;
    const u=new SpeechSynthesisUtterance(l);u.voice=voice;u.lang=voice.lang;u.rate=.92;u.pitch=.95;
    let fired=false;const fin=()=>{if(fired)return;fired=true;talking=false;setTimeout(nextLine,280);};u.onend=fin;u.onerror=fin;u.onstart=()=>{talking=true;};talking=true;
    setTimeout(fin,Math.max(3500,l.length*130));synth.speak(u);};
  nextLine();}
function stopVoice(){speakTok++;talking=false;if(curAud){try{curAud.pause();}catch(e){}curAud=null;}level=0;if(synth)try{synth.cancel();}catch(e){}}

/* ---------- player ---------- */
const PLAY='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v16l13-8z" fill="currentColor"/></svg>',PAUSE='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h4v16H7zM13 4h4v16h-4z" fill="currentColor"/></svg>';
const SON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>',SOFF='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';
let cur=0,st=0,playing=false,started=false,spoken=false,last=performance.now(),finished=false;
$("#lsn-segs").innerHTML=SCENES.map(()=>"<i><b></b></i>").join("");
const segEls=[...host.querySelectorAll("#lsn-segs b")];
const capText=()=>curLine||SCENES[cur].say.find(l=>typeof l==="string");
function sync(){$("#lsn-pp").innerHTML=playing?PAUSE:PLAY;$("#lsn-pp").setAttribute("aria-label",playing?"إيقاف مؤقت":"تشغيل");
  $("#lsn-snd").innerHTML=voiceOn?SON:SOFF;$("#lsn-snd").setAttribute("aria-pressed",String(voiceOn));$("#lsn-cc").setAttribute("aria-pressed",String(caps));
  $("#lsn-cap").hidden=!(started&&caps);if(!$("#lsn-cap").hidden&&$("#lsn-capt").textContent!==capText())$("#lsn-capt").textContent=capText();
  segEls.forEach((b,i)=>b.style.width=(i<cur?100:i>cur?0:clamp(st/SCENES[cur].anim,0,1)*100)+"%");}
function render(t){const k=cv.width/W;ctx.setTransform(k,0,0,cv.height/H,0,0);room(t);
  const S=SCENES[started?cur:0],p=started?clamp(st/S.anim,0,1):1,fin=started?clamp(st/.4,0,1):1;
  onBoard(()=>{ctx.globalAlpha=fin;S.board(p);});avatar(t);}
function frame(now){if(!cv.isConnected){stopVoice();playing=false;return;}const dt=Math.min(.1,(now-last)/1000);last=now;const t=now/1000;faceTick(t,dt);
  if(playing){st+=dt;if(spoken&&st>=SCENES[cur].anim+.6){if(cur<SCENES.length-1)startScene(cur+1);else{playing=false;finished=true;}}sync();}
  if(cv.width)render(t);requestAnimationFrame(frame);}
function startScene(i){stopVoice();curLine="";cur=clamp(i,0,SCENES.length-1);st=0;spoken=false;finished=false;if(playing)narrate(cur,()=>{spoken=true;});sync();}
function play(){ensureCtx();if(finished){finished=false;cur=0;st=0;}started=true;$("#lsn-big").hidden=true;playing=true;narrate(cur,()=>{spoken=true;});sync();}
function pause(){playing=false;stopVoice();sync();}
$("#lsn-big").onclick=play;$("#lsn-pp").onclick=()=>playing?pause():play();
$("#lsn-next").onclick=()=>{started=true;$("#lsn-big").hidden=true;startScene(cur+1);};
$("#lsn-prev").onclick=()=>{started=true;$("#lsn-big").hidden=true;startScene(cur-1);};
$("#lsn-cc").onclick=()=>{caps=!caps;sync();};
$("#lsn-snd").onclick=()=>{voiceOn=!voiceOn;stopVoice();if(playing)narrate(cur,()=>{spoken=true;});sync();};
const pl=$("#lsn-player");if(!(pl.requestFullscreen||pl.webkitRequestFullscreen))$("#lsn-fs").hidden=true;
$("#lsn-fs").onclick=()=>{try{if(document.fullscreenElement)document.exitFullscreen();else if(pl.requestFullscreen)pl.requestFullscreen().catch(()=>{});else pl.webkitRequestFullscreen();}catch(e){}};
$("#lsn-stage").addEventListener("keydown",e=>{if(e.target!==$("#lsn-stage"))return;if(e.key===" "){e.preventDefault();playing?pause():play();}});
cv.addEventListener("click",()=>{if(started)playing?pause():play();});
const onVis=()=>{if(!cv.isConnected){document.removeEventListener("visibilitychange",onVis);return;}if(document.hidden&&playing)pause();};document.addEventListener("visibilitychange",onVis);
function fit(){const r=cv.getBoundingClientRect();if(!r.width)return;const d=Math.min(2,window.devicePixelRatio||1);cv.width=Math.round(r.width*d);cv.height=Math.round(r.width*9/16*d);}
if(window.ResizeObserver)new ResizeObserver(fit).observe(cv);else addEventListener("resize",fit);fit();sync();requestAnimationFrame(frame);

}
window.NibrasLesson={has:sid=>!!LESSONS[sid],mount};
})();
