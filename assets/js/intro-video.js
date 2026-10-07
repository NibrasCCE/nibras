/* =====================================================================
   نبراس · الفيديو التعريفي بالصفحة الرئيسية (٤٦ ثانية)
   الفيديو مرسوم بالكود على canvas: ما في ملف فيديو، فهو خفيف على النت الضعيف.
   الاستعمال (من app.js):  NibrasIntro.mount(document.getElementById("intro"))
   الصوت بيتبع زر الأصوات بالموقع (localStorage: nibras.sound).
   ===================================================================== */
(function(){
"use strict";
const W=1280,H=720,DUR=46;
const C={cream:"#FFF8EC",glow:"#FFD166",lamp:"#F4A62A",brand:"#1D3A8A",ink:"#14234F",night:"#0B1A44",coral:"#FF9C8F",soft:"#C3CDEE"};
const AR="٠١٢٣٤٥٦٧٨٩";
const toAr=s=>String(s).replace(/[0-9]/g,d=>AR[d]);
const reduceMotion=!!(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const seg=(p,a,b)=>clamp((p-a)/(b-a),0,1);
const ease=t=>1-Math.pow(1-t,3);
const easeIO=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const lerp=(a,b,t)=>a+(b-a)*t;
const fmt=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`;
function hex(c){c=c.replace("#","");return [0,2,4].map(i=>parseInt(c.slice(i,i+2),16));}
function mix(a,b,t){const A=hex(a),B=hex(b);return `rgb(${A.map((v,i)=>Math.round(lerp(v,B[i],t))).join(",")})`;}
const soundOn=()=>{try{return localStorage.getItem("nibras.sound")!=="off";}catch(e){return true;}};

/* stars (fixed positions) */
let seed=7;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const STARS=Array.from({length:90},()=>({x:rnd()*W,y:rnd()*H*.75,r:.6+rnd()*1.8,ph:rnd()*6.28,sp:.6+rnd()*1.6}));

const ICON_PLAY='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v16l13-8z" fill="currentColor"/></svg>';
const ICON_PAUSE='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h4v16H7zM13 4h4v16h-4z" fill="currentColor"/></svg>';
const ICON_FS='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';

let current=null;

function mount(host){
  if(current)current.destroy();
  if(!host)return null;
  host.innerHTML=`<div class="intro-player">
    <div class="intro-stage" tabindex="0" aria-label="فيديو تعريفي بنبراس، 46 ثانية. اضغط المسافة للتشغيل أو الإيقاف.">
      <canvas dir="rtl"></canvas>
      <button class="intro-play" type="button"><span class="ic">${ICON_PLAY}</span><span>شاهد مين نبراس · 46 ثانية</span></button>
      <div class="intro-end" hidden><div>
        <p class="t">جاهز تبلّش رحلتك؟</p>
        <div class="intro-end-row">
          <a class="btn btn-go btn-sm" href="#auth-student">دخول الطلاب</a>
          <a class="btn btn-sm intro-ghost" href="#auth-parent">دخول الأهالي</a>
          <button class="btn btn-sm intro-ghost" type="button" data-teacher>دخول المعلمين</button>
        </div>
        <button class="intro-replay" type="button">شاهد الفيديو كمان مرة</button>
      </div></div>
    </div>
    <div class="intro-ctl">
      <button type="button" class="pp" aria-label="تشغيل">${ICON_PLAY}</button>
      <input type="range" class="seek" min="0" max="${DUR*10}" step="1" value="0" aria-label="موضع الفيديو">
      <span class="time">0:00 / ${fmt(DUR)}</span>
      <button type="button" class="fs" aria-label="ملء الشاشة">${ICON_FS}</button>
    </div>
  </div>`;
  const q=s=>host.querySelector(s);
  const canvas=q("canvas"),ctx=canvas.getContext("2d");
  const stage=q(".intro-stage"),bigplay=q(".intro-play"),endcard=q(".intro-end"),seek=q(".seek"),timeEl=q(".time"),pp=q(".pp"),fsb=q(".fs");
  let T=0,playing=false,started=false,lastNow=0,dead=false,actx=null;

  /* ---------- drawing helpers ---------- */
  const font=(size,weight,fam)=>`${Math.min(weight,fam==="num"?900:800)} ${size}px ${fam==="num"?"'Nunito', sans-serif":"'Tajawal', 'Segoe UI', Tahoma, sans-serif"}`;
  function txt(s,x,y,o){o=o||{};const a=o.alpha==null?1:o.alpha;if(a<=0)return;
    ctx.save();ctx.globalAlpha*=a;ctx.font=font(o.size||40,o.weight||700,o.fam);ctx.fillStyle=o.color||C.cream;
    ctx.textAlign=o.align||"center";ctx.textBaseline=o.base||"middle";ctx.direction=o.dir||"rtl";ctx.fillText(s,x,y);ctx.restore();}
  function measure(s,size,weight){ctx.save();ctx.font=font(size,weight);ctx.direction="rtl";const w=ctx.measureText(s).width;ctx.restore();return w;}
  function rrPath(x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}
  function rr(x,y,w,h,r){rrPath(x,y,w,h,r);ctx.fill();}
  function circle(x,y,r){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
  function ell(x,y,rx,ry){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);}

  function sky(t){
    const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,"#081333");g.addColorStop(1,"#1B3680");
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    for(const s of STARS){ctx.fillStyle=`rgba(255,248,236,${reduceMotion?.6:.35+.45*(.5+.5*Math.sin(t*s.sp+s.ph))})`;circle(s.x,s.y,s.r);}
    ctx.fillStyle="rgba(8,19,51,.55)";ctx.beginPath();ctx.moveTo(0,H);ctx.lineTo(0,650);ctx.quadraticCurveTo(320,600,640,640);ctx.quadraticCurveTo(960,680,1280,630);ctx.lineTo(W,H);ctx.fill();
  }
  function lantern(x,y,s,lit,t){
    ctx.save();ctx.translate(x,y);ctx.scale(s,s);
    if(lit>0){const fl=reduceMotion?1:(.92+.08*Math.sin((t||0)*9));const r=ctx.createRadialGradient(0,0,0,0,0,90);
      r.addColorStop(0,`rgba(255,209,102,${.55*lit*fl})`);r.addColorStop(1,"rgba(255,209,102,0)");ctx.fillStyle=r;circle(0,0,90);}
    ctx.strokeStyle=C.lamp;ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-35,5,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle=C.lamp;ctx.beginPath();ctx.moveTo(-15,-22);ctx.lineTo(0,-31);ctx.lineTo(15,-22);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(-15,-22);ctx.lineTo(15,-22);ctx.lineTo(19,0);ctx.lineTo(13,20);ctx.lineTo(-13,20);ctx.lineTo(-19,0);ctx.closePath();
    ctx.fillStyle=mix("#2A3A70",C.glow,lit);ctx.fill();ctx.lineJoin="round";ctx.lineWidth=3.5;ctx.stroke();
    ctx.globalAlpha*=.55;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-22);ctx.lineTo(0,20);ctx.moveTo(-19,0);ctx.lineTo(19,0);ctx.stroke();ctx.globalAlpha/=.55;
    if(lit>0){ctx.fillStyle=`rgba(255,248,236,${lit})`;circle(0,2,5);}
    ctx.fillStyle=C.lamp;rr(-13,20,26,6,2);
    ctx.restore();
  }
  function kid(x,y,s,o){o=o||{};const look=o.look||1,a=o.alpha==null?1:o.alpha;if(a<=0)return;
    ctx.save();ctx.globalAlpha*=a;ctx.translate(x,y+(o.bob||0));ctx.scale(s*look,s);
    const sw=Math.sin(o.step||0)*4;
    ctx.fillStyle="#22306A";rr(-10+sw,-30,8,30,4);rr(2-sw,-30,8,30,4);
    ctx.fillStyle=C.lamp;rr(-15,-64,30,38,12);
    ctx.strokeStyle="#F2C79B";ctx.lineWidth=7;ctx.lineCap="round";
    ctx.beginPath();ctx.moveTo(-13,-56);ctx.lineTo(-19,-36);ctx.moveTo(13,-56);ctx.lineTo(19,-36);ctx.stroke();
    ctx.fillStyle="#F2C79B";circle(0,-80,16);
    ctx.fillStyle="#2B1A10";ctx.beginPath();ctx.arc(0,-82,16.8,Math.PI*1.02,Math.PI*1.98);ctx.closePath();ctx.fill();
    ctx.fillStyle=C.ink;circle(2,-79,2.2);circle(9,-79,2.2);
    ctx.strokeStyle=C.ink;ctx.lineWidth=2;ctx.beginPath();ctx.arc(6,-74,4,.2,Math.PI-.2);ctx.stroke();
    ctx.restore();}
  /* the team's logo (same shapes as markShapes in app.js; viewBox 150 92 560 296) */
  function siteLogo(x,y,s,o){o=o||{};const col=o.color||C.brand;
    ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.translate(-150,-92);
    ctx.fillStyle=`rgba(255,209,102,${o.glow==null?.45:o.glow})`;circle(348.5,121,24);
    ctx.fillStyle=col;
    rr(158,275,42,106,2);
    ctx.beginPath();[[196,272.6],[199,275],[291,347.4],[291,381],[289,381],[199,307.7],[196,305]].forEach(([a,b],i)=>i?ctx.lineTo(a,b):ctx.moveTo(a,b));ctx.closePath();ctx.fill();
    rr(291,208,42,173,2);circle(309.5,151.5,15.6);rr(298,174,24,21,3);rr(299,192,8.6,14,2.5);rr(312,192,8.6,14,2.5);rr(340.5,139.5,17,6.5,2);
    ctx.strokeStyle=col;ctx.lineWidth=9;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(319,175);ctx.lineTo(340,146);ctx.stroke();
    ctx.fillStyle=C.lamp;circle(348.5,121,16);
    if(o.word!==0){ctx.globalAlpha*=o.word==null?1:o.word;ctx.fillStyle=col;ctx.font=font(150,900,"num");ctx.direction="ltr";ctx.textAlign="left";ctx.textBaseline="alphabetic";
      const w=ctx.measureText("ibras").width||352;ctx.translate(350,381);ctx.scale(352/w,1);ctx.fillText("ibras",0,0);}
    ctx.restore();}

  /* ---------- scene 1: the gap ---------- */
  function island(x,y,a,gap,t,label){if(a<=0)return;ctx.save();ctx.globalAlpha*=a;
    ctx.fillStyle="#132A6B";ctx.beginPath();ctx.moveTo(x-132,y);ctx.quadraticCurveTo(x,y+150,x+132,y);ctx.closePath();ctx.fill();
    ctx.fillStyle="#2D58C2";ell(x,y,135,34);ctx.fill();
    ctx.fillStyle="#3F6CD8";ell(x,y-5,118,25);ctx.fill();
    if(gap){const pulse=reduceMotion?1:.5+.5*Math.sin(t*5);
      ctx.fillStyle="#07102C";ell(x+28,y-3,50,14);ctx.fill();
      ctx.strokeStyle=`rgba(255,156,143,${.45+.55*pulse})`;ctx.lineWidth=3;ctx.setLineDash([7,7]);ell(x+28,y-3,58,19);ctx.stroke();ctx.setLineDash([]);
      txt("الكسور",x+28,y-52,{size:30,weight:800,color:C.coral});}
    txt(label,x,y+72,{size:30,weight:800});
    ctx.restore();}
  function sGap(p,t){
    txt("صفّه السابع…",640,118,{size:60,weight:800,alpha:ease(seg(p,.03,.16))});
    txt("بس في محطة ناقصة من الصف الخامس",640,192,{size:38,weight:700,color:C.glow,alpha:ease(seg(p,.5,.64))});
    const xs=[1000,640,280],labels=["الصف الخامس","الصف السادس","الصف السابع"];
    xs.forEach((x,i)=>{const a=ease(seg(p,.06+i*.08,.28+i*.08));island(x,520+(1-a)*50,a,i===0&&p>.42,t,labels[i]);});
    const d=seg(p,.55,.86);
    if(d>0){ctx.save();ctx.setLineDash([10,14]);ctx.lineDashOffset=reduceMotion?0:-t*30;ctx.strokeStyle=C.glow;ctx.lineWidth=4;ctx.lineCap="round";
      const A=[330,430],M=[660,290],B=[1010,480];ctx.beginPath();ctx.moveTo(A[0],A[1]);
      for(let i=1;i<=40;i++){const u=d*i/40;ctx.lineTo((1-u)*(1-u)*A[0]+2*(1-u)*u*M[0]+u*u*B[0],(1-u)*(1-u)*A[1]+2*(1-u)*u*M[1]+u*u*B[1]);}
      ctx.stroke();ctx.restore();}
    kid(280,512,1.2,{alpha:ease(seg(p,.28,.42)),bob:reduceMotion?0:Math.sin(t*3)*2,look:p>.6?1:-1});
  }
  /* ---------- scene 2: the lantern ---------- */
  function sLantern(p,t){
    const lit=ease(seg(p,.08,.4));
    if(lit>0){ctx.save();ctx.translate(640,300);ctx.rotate(reduceMotion?0:t*.12);
      for(let i=0;i<14;i++){ctx.rotate(Math.PI*2/14);ctx.fillStyle=`rgba(255,209,102,${.07*lit})`;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-20,-380);ctx.lineTo(20,-380);ctx.closePath();ctx.fill();}
      ctx.restore();}
    lantern(640,300,3.1,lit,t);
    txt("نبراس",640,548,{size:108,weight:800,alpha:ease(seg(p,.35,.55))});
    txt("بيبلّش مع كل طالب من مستواه الحقيقي",640,632,{size:38,weight:500,color:C.glow,alpha:ease(seg(p,.5,.7))});
  }
  /* ---------- scene 3: the diagnosis games ---------- */
  function gBubbles(x,cy,p,t){
    txt("٣س + ٢س = ؟",x,232,{size:34,weight:800});
    const B=[{dx:-78,dy:20,s:"٥س",ok:1},{dx:78,dy:-4,s:"٦س"},{dx:0,dy:112,s:"٥س²"}];
    B.forEach((b,i)=>{const bx=x+b.dx,by=cy+b.dy+(reduceMotion?0:Math.sin(t*1.6+i*2)*8);
      let r=48,a=1;
      if(b.ok){const k=seg(p,.48,.58);r*=1+k*.45;a=1-k;
        const c=seg(p,.58,.66);if(c>0){ctx.save();ctx.globalAlpha*=c;ctx.fillStyle=C.lamp;circle(bx,by,30);ctx.strokeStyle=C.night;ctx.lineWidth=6;ctx.lineCap="round";ctx.lineJoin="round";ctx.beginPath();ctx.moveTo(bx-12,by);ctx.lineTo(bx-3,by+9);ctx.lineTo(bx+13,by-9);ctx.stroke();ctx.restore();}}
      if(a<=0)return;ctx.save();ctx.globalAlpha*=a;
      const g=ctx.createRadialGradient(bx-14,by-16,4,bx,by,r);g.addColorStop(0,"rgba(255,255,255,.35)");g.addColorStop(1,"rgba(150,190,255,.08)");
      ctx.fillStyle=g;circle(bx,by,r);ctx.strokeStyle=(b.ok&&p>.4)?C.glow:"rgba(255,255,255,.65)";ctx.lineWidth=(b.ok&&p>.4)?4:2;ctx.beginPath();ctx.arc(bx,by,r,0,Math.PI*2);ctx.stroke();
      txt(b.s,bx,by+2,{size:30,weight:800});ctx.restore();});
  }
  function gFrog(x,cy,p){
    txt("وين بيوقف الضفدع؟",x,232,{size:28,weight:700});
    txt("-٣ + ٥",x,282,{size:36,weight:800,color:C.glow});
    const y=cy+70,step=27,X=n=>x+n*step;
    ctx.strokeStyle=C.cream;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(X(-5.6),y);ctx.lineTo(X(5.6),y);ctx.stroke();
    for(let n=-5;n<=5;n++){ctx.beginPath();ctx.moveTo(X(n),y-8);ctx.lineTo(X(n),y+8);ctx.stroke();
      txt((n<0?"-":"")+toAr(Math.abs(n)),X(n),y+30,{size:18,weight:700,color:n===2&&p>.62?C.glow:C.soft});}
    const u=easeIO(seg(p,.36,.62)),fx=X(lerp(-3,2,u)),fy=y-12-Math.sin(u*Math.PI)*95;
    if(u>0){ctx.save();ctx.strokeStyle="rgba(255,209,102,.8)";ctx.setLineDash([3,8]);ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(X(-3),y-12);
      for(let i=1;i<=30;i++){const v=u*i/30;ctx.lineTo(X(lerp(-3,2,v)),y-12-Math.sin(v*Math.PI)*95);}ctx.stroke();ctx.restore();}
    ctx.fillStyle="#6CC36A";ell(fx,fy,20,14);ctx.fill();circle(fx-9,fy-12,7);circle(fx+9,fy-12,7);
    ctx.fillStyle="#fff";circle(fx-9,fy-13,4);circle(fx+9,fy-13,4);ctx.fillStyle=C.ink;circle(fx-8,fy-13,2);circle(fx+10,fy-13,2);
  }
  function gBalance(x,cy,p,t){
    const s=easeIO(seg(p,.48,.72));
    txt("شو قيمة س؟",x,232,{size:28,weight:700,alpha:1-seg(p,.7,.76)});
    txt("س = ٢",x,232,{size:36,weight:800,color:C.glow,alpha:seg(p,.74,.82)});
    const ang=-.2*(1-s)+(reduceMotion?0:Math.sin(t*6)*.035*(1-s)),px=x,py=cy+10;
    ctx.fillStyle="#5A6BA8";ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px-30,py+150);ctx.lineTo(px+30,py+150);ctx.closePath();ctx.fill();
    const ex=Math.cos(ang)*125,ey=Math.sin(ang)*125;
    ctx.strokeStyle=C.cream;ctx.lineWidth=7;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(px-ex,py-ey);ctx.lineTo(px+ex,py+ey);ctx.stroke();
    [[px+ex,py+ey,"٢س + ٣"],[px-ex,py-ey,"٧"]].forEach(([hx,hy,l])=>{
      ctx.strokeStyle="rgba(255,248,236,.7)";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(hx,hy);ctx.lineTo(hx-34,hy+52);ctx.moveTo(hx,hy);ctx.lineTo(hx+34,hy+52);ctx.stroke();
      ctx.fillStyle=C.lamp;ctx.beginPath();ctx.moveTo(hx-46,hy+52);ctx.lineTo(hx+46,hy+52);ctx.quadraticCurveTo(hx,hy+80,hx-46,hy+52);ctx.fill();
      ctx.fillStyle="rgba(255,248,236,.95)";rr(hx-42,hy+14,84,36,10);txt(l,hx,hy+33,{size:24,weight:800,color:C.ink});});
    ctx.fillStyle=C.glow;circle(px,py,7);
  }
  function sGames(p,t){
    txt("رحلة التشخيص: ألعاب وألغاز",640,108,{size:50,weight:800,alpha:ease(seg(p,0,.1))});
    [{x:1010,label:"فقاعات",f:gBubbles},{x:640,label:"ضفدع على خط الأعداد",f:gFrog},{x:270,label:"ميزان المعادلة",f:gBalance}].forEach((pn,i)=>{
      const a=ease(seg(p,.04+i*.07,.18+i*.07));if(a<=0)return;
      ctx.save();ctx.globalAlpha*=a;ctx.translate(0,(1-a)*30);
      ctx.fillStyle="rgba(255,255,255,.07)";rr(pn.x-172,180,344,380,26);ctx.strokeStyle="rgba(255,209,102,.35)";ctx.lineWidth=2;rrPath(pn.x-172,180,344,380,26);ctx.stroke();
      pn.f(pn.x,370,p,t);txt(pn.label,pn.x,602,{size:28,weight:700});ctx.restore();});
    txt("بلا وقت · بلا علامات · وفي زر «مش عارف»",640,668,{size:28,weight:500,color:C.glow,alpha:ease(seg(p,.78,.9))});
  }
  /* ---------- scene 4: the path ---------- */
  const PP=u=>({x:1170-u*1060,y:455+70*Math.sin(u*Math.PI*2)});
  function sPath(p,t){
    txt("مسار خاص فيك",640,98,{size:54,weight:800,alpha:ease(seg(p,0,.1))});
    txt("وكل مهارة بتتقنها بتضوي فانوس",640,160,{size:34,weight:500,color:C.glow,alpha:ease(seg(p,.05,.15))});
    ctx.save();ctx.strokeStyle="rgba(255,209,102,.4)";ctx.lineWidth=6;ctx.lineCap="round";ctx.setLineDash([2,14]);ctx.beginPath();
    for(let i=0;i<=80;i++){const k=PP(i/80);i?ctx.lineTo(k.x,k.y):ctx.moveTo(k.x,k.y);}ctx.stroke();ctx.restore();
    [["الخامس",.15],["السادس",.45],["السابع",.8]].forEach(([l,u])=>txt(l,PP(u).x,652,{size:28,weight:800,color:C.soft}));
    ctx.strokeStyle="rgba(195,205,238,.25)";ctx.lineWidth=2;[.3,.6].forEach(u=>{const x=PP(u).x;ctx.beginPath();ctx.moveTo(x,620);ctx.lineTo(x,680);ctx.stroke();});
    for(let i=0;i<10;i++){const k=PP((i+.5)/10),lit=ease(seg(p,.18+i*.06,.24+i*.06));
      ctx.strokeStyle="#5A6BA8";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(k.x,k.y);ctx.lineTo(k.x,k.y-24);ctx.stroke();
      ctx.fillStyle="#2D58C2";ell(k.x,k.y,16,6);ctx.fill();
      lantern(k.x,k.y-50,1,lit,t);}
    const ku=clamp(((p-.15)/.06+.5)/10,.03,.95),kq=PP(ku),moving=p>.15&&p<.8;
    kid(kq.x+34,kq.y+4,.7,{look:-1,step:moving&&!reduceMotion?t*10:0,alpha:ease(seg(p,.1,.18))});
  }
  /* ---------- scene 5: ask Nibras (same sides as the site's chat: Nibras on the right, the student on the left) ---------- */
  function bubble(lines,o){const size=o.size||24,lh=34,pad=16;
    let w=0;lines.forEach(l=>w=Math.max(w,measure(l,size,700)));const bw=w+pad*2,bh=lines.length*lh+pad*1.4;
    const x=o.side==="r"?o.right-bw:o.left;
    ctx.save();ctx.globalAlpha*=o.a;ctx.translate(0,(1-o.a)*16);
    ctx.fillStyle=o.fill;rr(x,o.y,bw,bh,18);if(o.stroke){ctx.strokeStyle=o.stroke;ctx.lineWidth=1.5;rrPath(x,o.y,bw,bh,18);ctx.stroke();}
    lines.forEach((l,i)=>txt(l,x+bw-pad,o.y+pad*.7+lh*i+lh/2,{size,weight:700,color:o.ink,align:"right"}));
    ctx.restore();return bh;}
  function typing(xRight,y,a,t){if(a<=0)return;ctx.save();ctx.globalAlpha*=a;ctx.fillStyle="#fff";rr(xRight-84,y,84,44,18);
    for(let i=0;i<3;i++){ctx.fillStyle=`rgba(29,58,138,${.35+.5*(.5+.5*Math.sin(t*8-i))})`;circle(xRight-22-i*20,y+22,5);}ctx.restore();}
  function sChat(p,t){
    const a0=ease(seg(p,0,.1));
    txt("اسأل نبراس",960,300,{size:68,weight:800,alpha:a0});
    txt("تلميحات خطوة خطوة",960,382,{size:36,weight:500,color:C.glow,alpha:ease(seg(p,.06,.16))});
    txt("بدل الحل الجاهز",960,432,{size:36,weight:500,color:C.glow,alpha:ease(seg(p,.1,.2))});
    const L=240,T0=60,PW=420,PH=610,R=L+PW;
    ctx.save();ctx.globalAlpha*=a0;ctx.translate(0,(1-a0)*30);
    ctx.fillStyle="#050B22";rr(L-10,T0-10,PW+20,PH+20,46);
    rrPath(L,T0,PW,PH,38);ctx.save();ctx.clip();ctx.fillStyle=C.cream;ctx.fillRect(L,T0,PW,PH);
    ctx.fillStyle=C.brand;ctx.fillRect(L,T0,PW,78);siteLogo(R-104,T0+14,.24,{color:"#FFFFFF",word:0,glow:.5});
    txt("اسأل نبراس",R-110,T0+42,{size:26,weight:800,align:"right"});
    const msgs=[{w:"s",l:["كيف بحل ٣س + ٤ = ١٩؟"],at:.1},{w:"n",l:["سؤال حلو! شو العدد اللي","لازم نشيله من الطرفين","حتى يضل ٣س لحاله؟"],at:.34},{w:"s",l:["نشيل ٤، بصير ٣س = ١٥"],at:.58},{w:"n",l:["شغلك مرتب! شلت نفس العدد","من الطرفين، فضل الميزان","متوازن."],at:.82}];
    let y=T0+100;
    msgs.forEach(m=>{const a=ease(seg(p,m.at,m.at+.06));
      if(m.w==="n"){const ty=seg(p,m.at-.12,m.at-.1)*(1-seg(p,m.at-.01,m.at));if(ty>0&&a<=0)typing(R-58,y,ty,t);if(a>0)lantern(R-30,y+30,.42,1,t);}
      if(a<=0)return;
      const h=bubble(m.l,m.w==="n"?{side:"r",right:R-58,y,a,fill:"#FFFFFF",stroke:"#EFE2C8",ink:C.ink}:{side:"l",left:L+18,y,a,fill:C.brand,ink:"#FFFFFF"});
      y+=h+18;});
    ctx.restore();ctx.restore();
  }
  /* ---------- scene 6: parents and teachers ---------- */
  function card(x,y,w,h){ctx.fillStyle="rgba(255,255,255,.07)";rr(x,y,w,h,26);ctx.strokeStyle="rgba(255,209,102,.3)";ctx.lineWidth=2;rrPath(x,y,w,h,26);ctx.stroke();}
  function notif(x,y,w,a,l1,l2,t){if(a<=0)return;ctx.save();ctx.globalAlpha*=a;ctx.translate(0,(1-a)*18);
    ctx.fillStyle=C.cream;rr(x,y,w,104,20);lantern(x+w-44,y+56,.62,1,t);
    txt(l1,x+w-86,y+34,{size:20,weight:700,color:"#4A5784",align:"right"});txt(l2,x+w-86,y+70,{size:25,weight:800,color:C.ink,align:"right"});ctx.restore();}
  function sAdults(p,t){
    txt("الأهل والمعلمين",640,98,{size:54,weight:800,alpha:ease(seg(p,0,.1))});
    ctx.save();ctx.globalAlpha*=ease(seg(p,.05,.16));card(680,170,490,450);txt("للأهل",925,218,{size:34,weight:800});ctx.restore();
    notif(710,262,430,ease(seg(p,.18,.28)),"نبراس · الآن","ضوّى فانوس: الأعداد الصحيحة",t);
    notif(710,388,430,ease(seg(p,.38,.48)),"نبراس · تقرير","خلّص محطات الصف السادس",t);
    txt("إشعار عند كل مرحلة",925,560,{size:24,weight:500,color:C.soft,alpha:ease(seg(p,.5,.6))});
    ctx.save();ctx.globalAlpha*=ease(seg(p,.1,.21));card(110,170,490,450);txt("للمعلمين",355,218,{size:34,weight:800});ctx.restore();
    bubble(["طالبة كتبت: ٣س + ٢ = ٥س","ليش؟"],{side:"l",left:138,y:262,a:ease(seg(p,.26,.36)),fill:C.brand,ink:"#FFFFFF"});
    bubble(["غالباً جمعت حدود مش متشابهة.","جرّبي معها: ٣ تفاحات + ٢ برتقال","بيصيروا ٥ تفاحات؟"],{side:"r",right:572,y:384,a:ease(seg(p,.5,.6)),fill:"#FFFFFF",stroke:"#EFE2C8",ink:C.ink});
  }
  /* ---------- scene 7: the logo (also the still frame before playing) ---------- */
  function sLogo(p,t,still){
    const d=still?1:ease(seg(p,0,.28));
    ctx.fillStyle=`rgba(255,248,236,${d})`;ctx.fillRect(0,0,W,H);
    const g=ctx.createRadialGradient(640,250,10,640,250,560);g.addColorStop(0,`rgba(255,239,194,${d})`);g.addColorStop(1,"rgba(255,239,194,0)");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    const m=still?1:ease(seg(p,.12,.36)),wd=still?1:ease(seg(p,.28,.48)),s=1.2*(.88+.12*m);
    ctx.save();ctx.globalAlpha*=m;siteLogo(640-280*s,(still?300:330)-148*s,s,{word:wd,glow:.45*(reduceMotion?1:.85+.15*Math.sin(t*3))});ctx.restore();
    txt("نبراس · تعلّم من مستواك",640,still?520:550,{size:46,weight:800,color:"#565D72",alpha:still?1:ease(seg(p,.42,.58))});
    if(!still){const b=ease(seg(p,.6,.74));if(b>0){ctx.save();ctx.globalAlpha*=b;ctx.fillStyle=C.lamp;rr(640-170,606,340,66,33);txt("ابدأ رحلتك من مستواك",640,640,{size:28,weight:800,color:C.ink});ctx.restore();}}
  }
  const SCENES=[{t0:0,t1:6,f:sGap},{t0:6,t1:12,f:sLantern},{t0:12,t1:20,f:sGames},{t0:20,t1:27,f:sPath},{t0:27,t1:34,f:sChat},{t0:34,t1:40,f:sAdults},{t0:40,t1:46,f:sLogo}];
  function render(t,still){
    if(!canvas.width)return;
    ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
    sky(t);
    if(still){lantern(640,190,2.3,1,t);txt("مين نبراس؟",640,395,{size:80,weight:800});return;}
    let i=SCENES.findIndex(s=>t>=s.t0&&t<s.t1);if(i<0)i=SCENES.length-1;
    const S=SCENES[i],p=clamp((t-S.t0)/(S.t1-S.t0),0,1);
    const fin=i===0?1:clamp((t-S.t0)/.45,0,1),fout=i===SCENES.length-1?1:clamp((S.t1-t)/.45,0,1);
    ctx.save();ctx.globalAlpha=Math.min(fin,fout);S.f(p,t,false);ctx.restore();
  }

  /* ---------- sound ---------- */
  function tone(f,dur,type,vol){if(!soundOn()||!actx)return;try{const n=actx.currentTime,o=actx.createOscillator(),g=actx.createGain();
    o.type=type||"sine";o.frequency.value=f;g.gain.setValueAtTime(0,n);g.gain.linearRampToValueAtTime(vol||.07,n+.02);g.gain.exponentialRampToValueAtTime(.0001,n+(dur||.5));
    o.connect(g);g.connect(actx.destination);o.start(n);o.stop(n+(dur||.5)+.05);}catch(e){}}
  const chord=fs=>fs.forEach((f,i)=>setTimeout(()=>tone(f,1.1,"sine",.05),i*70));
  const PENT=[392,440,523.25,587.33,659.25,783.99,880,1046.5,1174.66,1318.5];
  const EVENTS=[{t:7.2,f:()=>chord([523.25,659.25,783.99])},{t:16,f:()=>{tone(1500,.07,"triangle",.06);tone(760,.12,"sine",.05);}},{t:16.96,f:()=>tone(660,.25,"triangle",.06)},{t:17.84,f:()=>tone(784,.6,"sine",.05)}];
  for(let i=0;i<10;i++)EVENTS.push({t:20+7*(.2+i*.06),f:()=>tone(PENT[i],.7,"sine",.045)});
  [.1,.34,.58,.82].forEach(a=>EVENTS.push({t:27+7*a,f:()=>tone(1180,.09,"sine",.035)}));
  [.2,.4,.28,.52].forEach(a=>EVENTS.push({t:34+6*a,f:()=>tone(990,.12,"sine",.035)}));
  EVENTS.push({t:41.2,f:()=>chord([392,523.25,659.25,783.99])});

  /* ---------- player ---------- */
  function sync(){
    seek.value=Math.round(T*10);seek.style.setProperty("--pct",(T/DUR*100)+"%");
    timeEl.textContent=`${fmt(T)} / ${fmt(DUR)}`;
    pp.innerHTML=playing?ICON_PAUSE:ICON_PLAY;pp.setAttribute("aria-label",playing?"إيقاف مؤقت":"تشغيل");
  }
  const draw=()=>started?render(T):render(44,true);
  function loop(now){
    if(!playing||dead)return;
    if(!canvas.isConnected){destroy();return;}
    const dt=Math.min(.1,(now-lastNow)/1000);lastNow=now;
    const prev=T;T=Math.min(DUR,T+dt);EVENTS.forEach(e=>{if(e.t>prev&&e.t<=T)e.f();});
    render(T);
    if(T>=DUR){playing=false;endcard.hidden=false;}
    sync();if(playing)requestAnimationFrame(loop);
  }
  function play(){
    try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();if(actx.state==="suspended")actx.resume();}catch(e){actx=null;}
    if(T>=DUR-.05)T=0;started=true;playing=true;bigplay.hidden=true;endcard.hidden=true;lastNow=performance.now();sync();requestAnimationFrame(loop);
  }
  function pause(){playing=false;sync();}
  const toggle=()=>playing?pause():play();
  bigplay.onclick=play;pp.onclick=toggle;
  q(".intro-replay").onclick=()=>{T=0;play();};
  q("[data-teacher]").onclick=()=>{const b=document.getElementById("guest-teacher");if(b)b.click();};
  canvas.addEventListener("click",()=>{if(started)toggle();});
  stage.addEventListener("keydown",e=>{if(e.target!==stage)return;if(e.key===" "||e.key==="k"){e.preventDefault();toggle();}});
  seek.addEventListener("input",()=>{started=true;bigplay.hidden=true;T=clamp(seek.value/10,0,DUR);if(T<DUR)endcard.hidden=true;render(T);sync();});
  const root=host.querySelector(".intro-player");
  if(!(root.requestFullscreen||root.webkitRequestFullscreen))fsb.hidden=true;
  fsb.onclick=()=>{try{if(document.fullscreenElement)document.exitFullscreen();else if(root.requestFullscreen)root.requestFullscreen().catch(()=>{});else root.webkitRequestFullscreen();}catch(e){}};
  const onVis=()=>{if(document.hidden&&playing)pause();};
  document.addEventListener("visibilitychange",onVis);
  function fit(){const r=canvas.getBoundingClientRect();if(!r.width)return;const dpr=Math.min(2,window.devicePixelRatio||1);
    canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.width*9/16*dpr);draw();}
  let ro=null;if(window.ResizeObserver){ro=new ResizeObserver(fit);ro.observe(canvas);}else window.addEventListener("resize",fit);
  fit();sync();
  if(document.fonts&&document.fonts.load)Promise.all([document.fonts.load("800 40px Tajawal"),document.fonts.load("500 40px Tajawal"),document.fonts.load("900 64px Nunito")]).then(()=>{if(!dead)draw();}).catch(()=>{});
  function destroy(){dead=true;playing=false;if(ro)ro.disconnect();else window.removeEventListener("resize",fit);document.removeEventListener("visibilitychange",onVis);if(current&&current.destroy===destroy)current=null;}
  current={destroy};
  return current;
}
window.NibrasIntro={mount};
})();
