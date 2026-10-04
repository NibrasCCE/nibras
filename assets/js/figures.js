/* نبراس · الرسومات التعليمية: أشكال أصلية مرسومة بالكود، بنفس أفكار نماذج الكتاب المدرسي */
/* ---------- teaching figures ----------
   Original drawings (SVG made by code, no image files) of the models the school
   textbooks use: factor tree, repeated division, rows of dots, multiples on the
   number line, area model, jumps on the number line, circles cut into parts, fraction wall.
   A figure is asked for by a short text, e.g. "tree:72" · "ladder:42" · "arrays:12" ·
   "common:12,18" · "multiples:4,6" · "area:3/4,2/3" · "jumps:6,1/3" · "pies:3,4" · "wall:3/4,1/2".
   FIG.make(spec) returns {svg, cap}: cap is a default caption in the canonical notation
   (app.js turns it into the school notation, like every other text). */
const FIG=(function(){
  const AR=typeof AR_MATH==="undefined"?true:AR_MATH;
  const N=n=>AR?arDigits(n):String(n);
  const FAM=AR?"Tajawal, Nunito, sans-serif":"Nunito, sans-serif";
  const primes=n=>{const out=[];n=Math.abs(Math.round(n));for(let d=2;n>1&&d*d<=n;d++)while(n%d===0){out.push(d);n/=d;}if(n>1)out.push(n);return out;};
  const gcd=(a,b)=>b?gcd(b,a%b):a;
  const r1=v=>Math.round(v*10)/10;
  /* one number or word, centred on (x,y) */
  const T=(x,y,s,o)=>{o=o||{};return `<text x="${r1(x)}" y="${r1(y)}" text-anchor="middle" dominant-baseline="central" font-family="${FAM}" font-weight="${o.w||800}" font-size="${o.size||15}" fill="${o.fill||"var(--ink)"}"${o.rtl?' style="direction:rtl;unicode-bidi:isolate"':""}>${s}</text>`;};
  /* a stacked fraction centred on (x,y) */
  const F=(x,y,a,b,o)=>{o=o||{};const z=o.size||12,c=o.fill||"var(--ink)",w=Math.max(String(a).length,String(b).length)*z*.62+4;
    return T(x,y-z*.62,N(a),{size:z,fill:c})+`<line x1="${r1(x-w/2)}" y1="${r1(y)}" x2="${r1(x+w/2)}" y2="${r1(y)}" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/>`+T(x,y+z*.72,N(b),{size:z,fill:c});};
  const svg=(W,H,body,label,maxW)=>`<svg class="figsvg" viewBox="0 0 ${r1(W)} ${r1(H)}" style="max-width:${Math.round(maxW||W*1.25)}px" role="img" aria-label="${label}">${body}</svg>`;
  const nums=s=>String(s||"").split(",").map(x=>parseInt(x,10)).filter(x=>x>0);
  /* the decimal mark is drawn (not typed), so it looks like the comma of the school book in every font */
  const CM=(x,y,col,k)=>{k=k||1;return AR?`<path d="M${r1(x+1.2*k)} ${r1(y-1*k)}q${r1(1.6*k)} ${r1(4.6*k)} ${r1(-3.4*k)} ${r1(7.4*k)}" fill="none" stroke="${col}" stroke-width="${r1(2.7*k)}" stroke-linecap="round"/>`:`<circle cx="${r1(x)}" cy="${r1(y+2*k)}" r="${r1(1.9*k)}" fill="${col}"/>`;};
  /* a decimal number as written in data.js ("9.63"): its digits, how many are before the mark, how many after */
  const dec=s=>{const m=String(s||"").match(/^(\d+)(?:\.(\d+))?$/);return m?{digits:(m[1]+(m[2]||"")).split("").map(Number),dp:m[1].length,places:(m[2]||"").length,val:parseFloat(s)}:null;};
  const frac=s=>{const m=String(s||"").match(/^(\d+)\/(\d+)$/);return m?[+m[1],+m[2]]:null;};

  /* --- factor tree: at every branch the prime goes to one side (in a lamp circle), the rest keeps going down --- */
  function treeG(n){
    const ps=primes(n),s=Math.max(ps.length-1,0),lx=30,rx=30,dy=44,pad=24,y0=20;
    const W=pad*2+s*lx+(s?rx:0),H=y0+s*dy+24;let g="",px=pad+s*lx,py=y0,rest=n;
    const leaf=(x,y,v)=>`<circle cx="${x}" cy="${y}" r="14" fill="var(--glow-soft)" stroke="var(--lamp)" stroke-width="2"/>`+T(x,y,N(v),{size:15});
    if(!s)return{g:leaf(px,py,n),W,H};
    g+=T(px,py,N(n),{size:17});
    for(let i=0;i<s;i++){
      const p=ps[i],cx=px-lx,cy=py+dy,qx=px+rx;rest=rest/p;
      g+=`<path d="M${px-5} ${py+12} ${cx+6} ${cy-14}M${px+5} ${py+12} ${qx-6} ${cy-14}" stroke="var(--brand-text)" stroke-width="2" stroke-linecap="round" fill="none"/>`;
      g+=leaf(qx,cy,p);
      g+=i===s-1?leaf(cx,cy,rest):T(cx,cy,N(rest),{size:17});
      px=cx;py=cy;
    }
    return{g,W,H};
  }
  /* --- repeated division: the number on one side of the bar, the prime it is divided by on the other --- */
  function ladderG(n){
    const ps=primes(n),rows=ps.length+1,rh=28,W=112,H=rows*rh+12,bx=W/2-4;let g="",v=n;
    g+=`<line x1="${bx}" y1="6" x2="${bx}" y2="${H-8}" stroke="var(--brand-text)" stroke-width="2.4" stroke-linecap="round"/>`;
    for(let i=0;i<rows;i++){
      const y=6+rh*i+rh/2;
      g+=T(bx+30,y,N(v),{size:16});
      if(i<ps.length){g+=`<circle cx="${bx-24}" cy="${y}" r="12" fill="var(--glow-soft)" stroke="var(--lamp)" stroke-width="2"/>`+T(bx-24,y,N(ps[i]),{size:14});v=v/ps[i];}
    }
    return{g,W,H};
  }
  const sideBySide=(parts,gap)=>{let x=0,H=0,g="";parts.forEach(p=>{H=Math.max(H,p.H);});parts.forEach(p=>{g+=`<g transform="translate(${r1(x)} 0)">${p.g}</g>`;x+=p.W+gap;});return{g,W:x-gap,H};};

  const KINDS={
    tree(arg){const ns=nums(arg);if(!ns.length)return null;const b=sideBySide((AR?ns.slice().reverse():ns).map(treeG),18);
      return{svg:svg(b.W,b.H,b.g,"شجرة العوامل الأولية للعدد "+ns.map(N).join(" و ")),cap:ns.map(n=>`${n} = ${primes(n).join(" × ")}`).join("  ،  ")};},
    ladder(arg){const ns=nums(arg);if(!ns.length)return null;const b=sideBySide((AR?ns.slice().reverse():ns).map(ladderG),26);
      return{svg:svg(b.W,b.H,b.g,"القسمة المتكررة للعدد "+ns.map(N).join(" و ")),cap:ns.map(n=>`${n} = ${primes(n).join(" × ")}`).join("  ،  ")};},
    /* every way of putting n things in equal rows = every pair of factors */
    arrays(arg){const n=nums(arg)[0];if(!n||n>36)return null;const pairs=[];for(let r=1;r*r<=n;r++)if(n%r===0)pairs.push([r,n/r]);
      const g=n>20?10:13,items=pairs.map(([r,c])=>{const W=Math.max(c*g,44)+8,H=r*g+26,x0=(W-c*g)/2+g/2;let d="";
        for(let i=0;i<r;i++)for(let j=0;j<c;j++)d+=`<circle cx="${r1(x0+j*g)}" cy="${r1(g/2+2+i*g)}" r="${g*.33}" fill="var(--brand-text)"/>`;
        return svg(W,H,d+T(W/2,r*g+15,`${N(r)} × ${N(c)}`,{size:13,rtl:AR}),`${N(r)} صف في كل صف ${N(c)}`,W*1.35);});
      const fs=[];for(let i=1;i<=n;i++)if(n%i===0)fs.push(i);
      return{svg:`<div class="figrow">${items.join("")}</div>`,cap:n===1?"للعدد 1 عامل واحد فقط (هو نفسه)، فهو ليس عدداً أولياً.":pairs.length===1?`للعدد ${n} طريقة واحدة فقط: صف واحد. عوامله: ${fs.join("، ")}، فهو عدد أولي.`:`العدد ${n} يُرتَّب في صفوف متساوية بأكثر من طريقة. عوامله: ${fs.join("، ")}.`};},
    /* the two factorisations under each other, the common prime factors framed together */
    common(arg){const [a,b]=nums(arg);if(!a||!b)return null;const pa=primes(a),pb=primes(b),com=[],ra=pa.slice();let rb=pb.slice();
      pa.forEach(p=>{const k=rb.indexOf(p);if(k>-1){com.push(p);rb.splice(k,1);ra.splice(ra.indexOf(p),1);}});
      const rowA=com.concat(ra),rowB=com.concat(rb),len=Math.max(rowA.length,rowB.length),cw=20,pad=14,W=pad*2+62+len*cw*2-cw,H=92,s=AR?-1:1,x0=AR?W-pad-16:pad+16;
      let g="";com.forEach((_,k)=>{const x=x0+s*(52+k*cw*2);g+=`<rect x="${x-13}" y="10" width="26" height="72" rx="13" fill="var(--glow-soft)" stroke="var(--lamp)" stroke-width="2"/>`;});
      [[a,rowA,28],[b,rowB,64]].forEach(([n,row,y])=>{g+=T(x0,y,N(n),{size:17})+T(x0+s*26,y,"=",{size:16,fill:"var(--ink-2)"});
        row.forEach((p,k)=>{const x=x0+s*(52+k*cw*2);g+=T(x,y,N(p),{size:16});if(k<row.length-1)g+=T(x+s*cw,y,"×",{size:13,fill:"var(--ink-2)"});});});
      return{svg:svg(W,H,g,`تحليل العددين ${N(a)} و ${N(b)} إلى العوامل الأولية، والعوامل المشتركة محاطة بإطار`),cap:"العوامل الأولية المشتركة داخل الإطار."};},
    /* jumps of a over the line and jumps of b under it: they meet for the first time on the least common multiple */
    multiples(arg){const p=String(arg||"").split(","),a=+p[0],b=+p[1],hide=p[2]==="?";if(!a||!b)return null;const l=a*b/gcd(a,b);if(l>24)return null;
      const u=Math.max(13,Math.min(26,300/l)),pad=22,W=l*u+pad*2,y=62,H=124,X=k=>pad+k*u;let g="";
      g+=`<line x1="${pad-10}" y1="${y}" x2="${W-pad+12}" y2="${y}" stroke="var(--ink-3)" stroke-width="2.4" stroke-linecap="round"/><path d="M${W-pad+6} ${y-5}l7 5-7 5" fill="none" stroke="var(--ink-3)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
      for(let k=0;k<=l;k++)g+=`<line x1="${r1(X(k))}" y1="${y-4}" x2="${r1(X(k))}" y2="${y+4}" stroke="var(--ink-3)" stroke-width="1.6"/>`;
      const arcs=(m,up,col)=>{const h=Math.min(34,14+m*u*.16);for(let k=0;k+m<=l;k+=m)g+=`<path d="M${r1(X(k))} ${y+(up?-11:11)}Q${r1(X(k+m/2))} ${y+(up?-11-h*1.6:11+h*1.6)} ${r1(X(k+m))} ${y+(up?-11:11)}" fill="none" stroke="${col}" stroke-width="2.4" stroke-linecap="round"/>`;};
      arcs(a,true,"var(--brand-text)");arcs(b,false,"var(--lamp)");
      for(let k=0;k<=l;k++)if(k%a===0||k%b===0){const top=k===l&&!hide;
        g+=`<circle cx="${r1(X(k))}" cy="${y}" r="10.5" fill="${top?"var(--lamp)":"var(--surface)"}" stroke="${top?"var(--lamp)":"var(--brand-text)"}" stroke-width="2"/>`+T(X(k),y,N(k),{size:String(k).length>1?11:12.5,fill:top?"var(--on-lamp)":"var(--ink)"});}
      g+=T(W/2,10,`مضاعفات ${N(a)}`,{size:12,fill:"var(--brand-text)",rtl:true})+T(W/2,H-9,`مضاعفات ${N(b)}`,{size:12,fill:"var(--ink-2)",rtl:true});
      return{svg:svg(W,H,g,`مضاعفات ${N(a)} ومضاعفات ${N(b)} على خط الأعداد`),cap:hide?"أين تلتقي القفزات لأول مرة بعد الصفر؟":`القفزات تلتقي لأول مرة عند ${l}.`};},
    /* area model for a/b × c/d: colour c of d rows, then a of b columns of that part */
    area(arg){const p=String(arg||"").split(","),f1=frac(p[0]),f2=frac(p[1]);if(!f1||!f2)return null;const [a,b]=f1,[c,d]=f2,pw=118,ph=90,gap=46,pad=8,W=pw*2+gap+pad*2,H=ph+48;
      const panel=(x0,over)=>{let g="";const cw=pw/b,rh=ph/d;
        g+=`<rect x="${x0}" y="${pad}" width="${pw}" height="${r1(rh*c)}" fill="var(--brand-text)" opacity=".2"/>`;
        if(over)g+=`<rect x="${r1(AR?x0+pw-cw*a:x0)}" y="${pad}" width="${r1(cw*a)}" height="${r1(rh*c)}" fill="var(--lamp)"/>`;
        for(let i=1;i<d;i++)g+=`<line x1="${x0}" y1="${r1(pad+rh*i)}" x2="${x0+pw}" y2="${r1(pad+rh*i)}" stroke="var(--brand-text)" stroke-width="1.4"/>`;
        if(over)for(let j=1;j<b;j++)g+=`<line x1="${r1(x0+cw*j)}" y1="${pad}" x2="${r1(x0+cw*j)}" y2="${pad+ph}" stroke="var(--brand-text)" stroke-width="1.4"/>`;
        return g+`<rect x="${x0}" y="${pad}" width="${pw}" height="${ph}" fill="none" stroke="var(--brand-text)" stroke-width="2.2" rx="3"/>`;};
      const xa=AR?pad+pw+gap:pad,xb=AR?pad:pad+pw+gap,mx=pad+pw+gap/2,my=pad+ph/2,s=AR?-1:1;
      const g=panel(xa,false)+panel(xb,true)+`<path d="M${mx-s*11} ${my}h${s*22}m${-s*7} -6l${s*7} 6l${-s*7} 6" fill="none" stroke="var(--ink-3)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`
        +F(xa+pw/2,pad+ph+20,c,d,{size:13})+F(xb+pw/2-s*26,pad+ph+20,a,b,{size:13})+T(xb+pw/2,pad+ph+20,AR?"الـ":"of",{size:12,fill:"var(--ink-2)",rtl:true})+F(xb+pw/2+s*26,pad+ph+20,c,d,{size:13});
      return{svg:svg(W,H,g,`نموذج مساحة لضرب ${N(a)}/${N(b)} في ${N(c)}/${N(d)}`),cap:`الجزء الذهبي: ${a*c} من ${b*d} جزءاً متساوياً، أي ${a}/${b} × ${c}/${d} = ${a*c}/${b*d}.`};},
    /* n jumps of a/b on the number line (a whole number times a fraction is a repeated addition) */
    jumps(arg){const p=String(arg||"").split(","),n=+p[0],f=frac(p[1]),hide=p[2]==="?";if(!n||!f)return null;const [a,b]=f,end=n*a,top=Math.ceil(end/b)*b;if(top>40)return null;
      const u=Math.max(14,Math.min(34,300/top)),pad=22,W=top*u+pad*2,y=64,H=102,X=k=>pad+k*u;let g="";
      g+=`<line x1="${pad-10}" y1="${y}" x2="${W-pad+12}" y2="${y}" stroke="var(--ink-3)" stroke-width="2.4" stroke-linecap="round"/><path d="M${W-pad+6} ${y-5}l7 5-7 5" fill="none" stroke="var(--ink-3)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
      for(let k=0;k<=top;k++){const whole=k%b===0;g+=`<line x1="${r1(X(k))}" y1="${y-(whole?8:4)}" x2="${r1(X(k))}" y2="${y+(whole?8:4)}" stroke="var(--ink-3)" stroke-width="${whole?2.4:1.6}"/>`;if(whole)g+=T(X(k),y+21,N(k/b),{size:14});}
      const h=Math.min(30,12+a*u*.3);
      for(let k=0;k<n;k++)g+=`<path d="M${r1(X(k*a))} ${y-9}Q${r1(X(k*a+a/2))} ${r1(y-9-h*1.5)} ${r1(X(k*a+a))} ${y-9}" fill="none" stroke="var(--brand-text)" stroke-width="2.4" stroke-linecap="round"/>`;
      g+=F(X(a/2),Math.max(15,y-9-h-13),a,b,{size:13,fill:"var(--brand-text)"});
      g+=`<circle cx="${r1(X(end))}" cy="${y}" r="6" fill="var(--lamp)" stroke="var(--surface)" stroke-width="2"/>`;
      return{svg:svg(W,H,g,`${N(n)} قفزات على خط الأعداد، طول كل قفزة ${N(a)}/${N(b)}`),cap:hide?`${n} قفزات، طول كل قفزة ${a}/${b}. أين تقف النقطة الذهبية؟`:`${n} قفزات، طول كل قفزة ${a}/${b}: ${n} × ${a}/${b} = ${end}/${b}${end%b===0?" = "+end/b:""}.`};},
    /* n whole circles, each cut into d equal parts: how many parts are there in n? */
    pies(arg){const [n,d]=nums(arg);if(!n||!d||n>6||d>12)return null;const r=25,step=60,pad=8,W=n*step-(step-r*2)+pad*2,H=r*2+pad*2;let g="";
      for(let i=0;i<n;i++){const cx=pad+r+i*step,cy=pad+r;
        for(let k=0;k<d;k++){const a0=-Math.PI/2+k*2*Math.PI/d,a1=a0+2*Math.PI/d;
          g+=`<path d="M${cx} ${cy}L${r1(cx+r*Math.cos(a0))} ${r1(cy+r*Math.sin(a0))}A${r} ${r} 0 ${d===1?1:0} 1 ${r1(cx+r*Math.cos(a1))} ${r1(cy+r*Math.sin(a1))}Z" fill="${k%2?"var(--surface)":"var(--glow-soft)"}" stroke="var(--brand-text)" stroke-width="1.8" stroke-linejoin="round"/>`;}}
      return{svg:svg(W,H,g,`${N(n)} دوائر، كل دائرة مقسومة إلى ${N(d)} أجزاء متساوية`),cap:`في كل دائرة ${d} أجزاء، كل جزء يساوي 1/${d}.`};},
    /* fraction wall; "wall:3/4,1/2" colours 3 quarters and 1 half */
    wall(arg){const hl=String(arg||"").split(",").map(frac).filter(Boolean),dens=[1,2,3,4,6,8],W=320,rh=31,pad=4,H=dens.length*rh+pad*2;let g="";
      dens.forEach((d,i)=>{const y=pad+i*rh,cw=(W-pad*2)/d;
        for(let k=0;k<d;k++){const x=AR?W-pad-(k+1)*cw:pad+k*cw,h=hl.findIndex(f=>f[1]===d&&k<f[0]);
          g+=`<rect x="${r1(x+1)}" y="${y+1}" width="${r1(cw-2)}" height="${rh-2}" rx="5" fill="${h===0?"var(--lamp)":h>0?"var(--brand-soft)":"var(--surface)"}" stroke="${h===0?"var(--lamp)":"var(--brand-text)"}" stroke-width="${h>=0?2.2:1.3}"/>`;
          if(d===1)g+=T(W/2,y+rh/2,"واحد صحيح",{size:13,rtl:true,fill:h===0?"var(--on-lamp)":"var(--ink)"});
          else if(k===0||h>=0)g+=F(x+cw/2,y+rh/2+.5,1,d,{size:10,fill:h===0?"var(--on-lamp)":"var(--ink)"});}});
      return{svg:svg(W,H,g,"لوحة الكسور: واحد صحيح، أنصاف، أثلاث، أرباع، أسداس، أثمان",380),cap:hl.length?"":"لوحة الكسور: كل صف هو الواحد الصحيح نفسه، مقسوماً إلى أجزاء متساوية."};}
    ,
    /* --- long division, laid out as in the school book: divisor on the left of the bracket,
           quotient above the dividend, the minus sign to the right of every subtracted number --- */
    ldiv(arg){const p=String(arg||"").split(","),A=dec(p[0]),d=parseInt(p[1],10);if(!A||!d||d<1)return null;
      const digs=A.digits.slice(),q=[],steps=[];let cur=0,started=false,extra=0;
      for(let i=0;;i++){
        if(i>=digs.length){if(cur===0||extra>=4)break;digs.push(0);extra++;}
        cur=cur*10+digs[i];const qd=Math.floor(cur/d);
        if(qd>0||started||i>=A.dp-1){q[i]=qd;started=true;}
        if(qd>0){steps.push({col:i,prod:qd*d,rem:cur-qd*d});cur-=qd*d;}
      }
      const cw=22,rh=25,ds=String(d),pad=12,x0=pad+ds.length*13+18,X=c=>x0+c*cw+cw/2,n=digs.length,yq=16,yl=30,yd=46;
      const W=x0+n*cw+30,H=yd+steps.length*2*rh+16;let g="";
      const comma=y=>CM(x0+A.dp*cw,y+5,"var(--ink-2)");
      const numAt=(str,col,y,o)=>{let h="";str.split("").forEach((ch,k)=>{h+=T(X(col-str.length+1+k),y,N(ch),o);});return h;};
      q.forEach((v,i)=>{if(v!==undefined)g+=T(X(i),yq,N(v),{size:17,fill:"var(--brand-text)"});});
      if(q.length>A.dp)g+=comma(yq);
      A.digits.forEach((v,i)=>{g+=T(X(i),yd,N(v),{size:17});});
      if(A.places)g+=comma(yd);
      g+=T(x0-10-ds.length*6.5,yd,N(ds),{size:17});
      g+=`<path d="M${pad-2} ${yd+13}H${x0-5}V${yl}H${r1(x0+Math.max(A.digits.length,q.length)*cw+4)}" fill="none" stroke="var(--brand-text)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
      let y=yd;
      steps.forEach((s,k)=>{const ps=String(s.prod),nx=steps[k+1];
        y+=rh;g+=numAt(ps,s.col,y,{size:17})+T(X(s.col)+cw*.95,y,"−",{size:16,fill:"var(--ink-2)"});
        const len=Math.max(ps.length,String(s.rem).length+(nx?nx.col-s.col:0));
        g+=`<line x1="${r1(X(s.col-ps.length+1)-cw/2)}" y1="${y+12}" x2="${r1(X(nx?nx.col:s.col)+cw/2)}" y2="${y+12}" stroke="var(--brand-text)" stroke-width="1.8" stroke-linecap="round"/>`;
        y+=rh;let rs=String(s.rem),end=s.col;
        if(nx){for(let c=s.col+1;c<=nx.col;c++)rs+=String(digs[c]);end=nx.col;}
        g+=numAt(rs,end,y,{size:17,fill:nx?"var(--ink)":"var(--ink-2)"});});
      const qs=q.filter(v=>v!==undefined),first=q.findIndex(v=>v!==undefined),ip=q.slice(first,A.dp).join("")||"0",dp=q.slice(A.dp).join("");
      return{svg:svg(W,H,g,`القسمة الطويلة: ${N(p[0])} على ${N(d)}`,W*1.45),cap:`${p[0]} ÷ ${d} = ${ip}${dp?"."+dp:""}`};},
    /* --- vertical multiplication as in the book: multiply as whole numbers (the sign on the right), then place the decimal mark --- */
    vmul(arg){const p=String(arg||"").split(","),A=dec(p[0]),B=dec(p[1]);if(!A||!B)return null;
      const a=parseInt(A.digits.join(""),10),bd=String(parseInt(B.digits.join(""),10)).split("").map(Number),b=parseInt(bd.join(""),10),tot=a*b,places=A.places+B.places;
      let ts=String(tot);while(ts.length<places+1)ts="0"+ts;const lead=ts.length-String(tot).length;
      const parts=bd.length>1?bd.slice().reverse().map((v,k)=>String(a*v)+"0".repeat(k)):[];
      const cols=Math.max(ts.length,String(a).length,bd.length),cw=22,rh=26,pad=10,W=pad*2+cols*cw+26,X=c=>pad+c*cw+cw/2;let g="",y=16;
      const row=(str,yy,o,gold)=>{let h="";str.split("").forEach((ch,k)=>{h+=T(X(cols-str.length+k),yy,N(ch),Object.assign({size:17},o,gold&&k<gold?{fill:"var(--ink-3)"}:{}));});return h;};
      const rule=yy=>`<line x1="${pad}" y1="${yy}" x2="${pad+cols*cw}" y2="${yy}" stroke="var(--brand-text)" stroke-width="2" stroke-linecap="round"/>`;
      g+=row(String(a),y);y+=rh;g+=row(bd.join(""),y)+T(pad+cols*cw+12,y,"×",{size:17,fill:"var(--ink-2)"})+rule(y+13);
      parts.forEach((ps,k)=>{y+=rh;g+=row(ps,y,{fill:"var(--ink-2)"});if(k===1)g+=T(pad+cols*cw+12,y,"+",{size:17,fill:"var(--ink-2)"});});
      if(parts.length)g+=rule(y+13);
      y+=rh+(parts.length?0:2);g+=row(ts,y,{fill:"var(--brand-text)"},lead);
      if(places)g+=CM(pad+(cols-places)*cw,y+5,"var(--lamp)",1.15);
      const res=String(parseFloat((A.val*B.val).toPrecision(12)));
      return{svg:svg(W,y+20,g,`ضرب عمودي: ${N(a)} في ${N(b)}`,W*1.45),cap:places?`أضرب كما في الأعداد الصحيحة: ${a} × ${b} = ${tot}. في العددين ${places===1?"منزلة عشرية واحدة":places===2?"منزلتان عشريتان":places+" منازل عشرية"}، فالناتج ${res}.`:`${a} × ${b} = ${tot}`};},
    /* --- how many parts of size P are there in T? whole bars cut into equal parts --- */
    bars(arg){const p=String(arg||"").split(","),T0=parseFloat(p[0]),P=parseFloat(p[1]),hide=p[2]==="?";if(!(T0>0)||!(P>0))return null;
      const k=Math.round(1/P),cells=Math.round(T0/P),whole=Math.ceil(T0-1e-9);if(Math.abs(k*P-1)>1e-9||whole>6||k>10)return null;
      const cwd=k<=2?22:k<=5?12:8,bh=40,gap=10,pad=8,bw=k*cwd,W=pad*2+whole*bw+(whole-1)*gap,H=bh+pad*2+18;let g="";
      for(let b=0;b<whole;b++)for(let c=0;c<k;c++){const on=b*k+c<cells,x=pad+b*(bw+gap)+c*cwd;
        g+=`<rect x="${x+1}" y="${pad}" width="${cwd-2}" height="${bh}" rx="3" fill="${on?"var(--lamp)":"none"}" stroke="${on?"var(--brand-text)":"var(--ink-3)"}" stroke-width="1.5"${on?"":' stroke-dasharray="3 3"'}/>`;}
      for(let b=0;b<whole;b++)g+=T(pad+b*(bw+gap)+bw/2,pad+bh+12,N(1),{size:12,fill:"var(--ink-2)"});
      return{svg:svg(W,H,g,`${N(p[0])} مقسومة إلى أجزاء، كل جزء ${N(p[1])}`),cap:hide?`كم ${p[1]} في ${p[0]}؟ أعدّ الأجزاء الذهبية.`:`كم ${p[1]} في ${p[0]}؟ ${p[0]} ÷ ${p[1]} = ${cells}`};},
    /* --- × or ÷ by 10, 100, 1000: the decimal mark hops one place for every zero --- */
    shift(arg){const p=String(arg||"").split(","),A=dec(p[0]),m=parseInt(p[1],10),div=p[2]==="div";if(!A||![10,100,1000].includes(m))return null;
      const k=String(m).length-1,D=A.digits.map(v=>({v,add:false}));let a=A.dp,b;
      if(div){b=a-k;while(b<1){D.unshift({v:0,add:true});a++;b++;}}else{b=a+k;while(D.length<b)D.push({v:0,add:true});}
      const cw=30,pad=16,W=pad*2+D.length*cw,H=76,yb=26,Bx=j=>pad+j*cw;let g="";
      D.forEach((d,i)=>{g+=T(Bx(i)+cw/2,yb,N(d.v),{size:22,fill:d.add?"var(--lamp)":"var(--ink)"});});
      if(A.places)g+=CM(Bx(a),yb+7,"var(--line)",1.2);
      const s=div?-1:1;
      for(let h=0;h<k;h++){const x1=Bx(a+s*h),x2=Bx(a+s*(h+1));g+=`<path d="M${x1} ${yb+20}Q${(x1+x2)/2} ${yb+42} ${x2} ${yb+20}" fill="none" stroke="var(--brand-text)" stroke-width="2.2" stroke-linecap="round"/>`;}
      const xe=Bx(b);g+=`<path d="M${xe-s*7} ${yb+21}L${xe} ${yb+19}L${xe-s*1} ${yb+27}" fill="none" stroke="var(--brand-text)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
      if(b<D.length)g+=CM(xe,yb+7,"var(--lamp)",1.3);
      const res=String(parseFloat((div?A.val/m:A.val*m).toPrecision(12)));
      return{svg:svg(W,H,g,`تحريك الفاصلة العشرية ${N(k)} منازل`,W*1.5),cap:`${p[0]} ${div?"÷":"×"} ${m} = ${res}: الفاصلة تتحرك ${k===1?"منزلة واحدة":k===2?"منزلتين":k+" منازل"} إلى ${div?"اليسار":"اليمين"}.`};}
  };
  function make(spec){
    const m=String(spec||"").match(/^([a-z]+)(?::(.*))?$/);if(!m||!KINDS[m[1]])return null;
    try{return KINDS[m[1]](m[2]||"");}catch(e){return null;}
  }
  return{make,primes};
})();
