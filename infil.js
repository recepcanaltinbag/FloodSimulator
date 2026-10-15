// Zemin emişi haritası ("Zemin: Haritadan"): her hücre için ayrı Horton eğrisi.
// Karolar: data/infil/{12,10}/x/y.png (tools/make_infil_tiles.py). R = arazi örtüsü (ESA WorldCover 2021, 1..11),
// G = yapı payı × 250, B = USDA toprak dokusu 1..12 (SoilGrids 2.0, 0–30 cm) + 16 karbonatlı kayaç (GLiM, 0,5°)
// + 32 SoilGrids'in boş bıraktığı (kent, su) ve çevreden doldurulan hücre.
// z12 (~30 m) İstanbul, karst alanları ve dağlar için; z10 (~120–150 m) Türkiye geneli için yedek.
// index.html globallerini kullanır (S, SOILS, REG, N, sea, UP, pngPixels, idle, applyTexture, $, fmt).
//
// Parametre tablosu (mm/sa):
//   fc (doygunken, en düşük kapasite) ≈ doygun hidrolik iletkenlik Ks: Rawls, Brakensiek & Miller (1983), J. Hydraul. Eng.
//     109(1):62–70 doku sınıfı ortalamaları (Chow, Maidment & Mays 1988, Applied Hydrology, Tablo 4.3.1'de de verilir).
//     Horton'un en düşük kapasitesinin Ks'ye yakın alınması SWMM'de önerilen yaklaşımdır (Rossman & Huber 2016,
//     SWMM Reference Manual Vol. I – Hydrology).
//   f0 (kuruyken, başlangıç kapasitesi): Akan (1993), Urban Stormwater Hydrology; SWMM Reference Manual Vol. I'de aktarılan
//     "kuru kumlu / tınlı / killi zemin, bitki örtüsü az ya da sık" değerleri (az: 127 / 76 / 25; sık: 254 / 152 / 51).
//   Ara bitki örtüsü (çalı, çayır) az ile sık arasının ortası alınır — bu bizim varsayımımız.
//   Yapı (WorldCover "Built-up") payı: sitedeki "Beton / asfalt" sınıfı (6 → 1 mm/sa) ile ağırlıklandırılır.
//   Karbonatlı kayaç üzerindeki çıplak/seyrek bitkili alan: sitedeki "Karstik kireçtaşı" (150 → 60 mm/sa). GLiM'in 0,5°'lik
//     (~50 km) ızgarasında baskın kayaç türüdür; tek tek kayalıkları ayırt etmez.
//   Su yüzeyi 0; sulak alan neredeyse doygun (f0 = fc). Verisi olmayan hücre "Karışık kentsel" (30 → 3) sayılır.
//   Bozunma katsayısı k = 2 /sa (sitedeki diğer sınıflarla aynı; SWMM'nin önerdiği 2–7 /sa aralığının alt ucu).
// Islaklık x hücre başınadır (INFM.wx, simStep içinde güncellenir): hücreye gelen su (yağış + üstten akan su) kapasiteyi
//   karşılıyorsa x tam hızla (k), az geliyorsa gelen/kapasite oranında ilerler (Horton'un zaman sıkıştırma yaklaşımı).
//   Başlangıç değeri "Önceki günler" (S.wetX). Pencere dışındaki yukarı havza kaba olduğundan orada x ortak kalır.
// Toprağın derinliği, sıkışma, makro gözenekler, eğim ve donmuş zemin hesaba katılmaz.
(function(){
  const LC=[null,
    {n:"Ağaçlık / orman",v:1},{n:"Çalılık",v:.5},{n:"Çayır / mera",v:.5},{n:"Tarım alanı",v:0},{n:"Yapı / yol",v:0},
    {n:"Çıplak / seyrek bitkili",v:0},{n:"Kar / buz",v:0},{n:"Su",w:1},{n:"Sulak alan",wet:1},{n:"Mangrov",v:1},{n:"Yosun / liken",v:0}];
  // USDA doku: ad, fc (Rawls vd. 1983 Ks, mm/sa), f0 grubu (0 kumlu, 1 tınlı, 2 killi)
  const TEX=[null,
    ["kil",0.3,2],["siltli kil",0.5,2],["kumlu kil",0.6,2],["killi tın",1.0,2],["siltli killi tın",1.0,2],["kumlu killi tın",1.5,1],
    ["tın",3.4,1],["siltli tın",6.5,1],["kumlu tın",10.9,0],["silt",6.5,1],["tınlı kum",29.9,0],["kum",117.8,0]];
  const F0=[[127,254],[76,152],[25,51]];               // [grup][az bitki, sık bitki], kuru zemin
  const BUILT=SOILS["2"], KARSTP=SOILS["80"], NODATA=SOILS["8"], K=2;

  function params(r,g,bv){
    if(!r) return {f0:NODATA.f0,fc:NODATA.fc,src:0};
    const lc=LC[r]||LC[3], t=bv&15, carb=(bv&16)>0, bf=Math.min(1,g/250), T=TEX[t]||TEX[7];
    let f0,fc;
    if(lc.w){ f0=0; fc=0; }
    else{
      fc=T[1]; const a=F0[T[2]]; f0=a[0]+(lc.v||0)*(a[1]-a[0]);
      if(lc.wet) f0=fc;
      if(carb&&r===6){ f0=Math.max(f0,KARSTP.f0); fc=Math.max(fc,KARSTP.fc); }
      if(f0<fc) f0=fc;
    }
    if(bf>0&&!lc.w){ f0=f0*(1-bf)+BUILT.f0*bf; fc=fc*(1-bf)+BUILT.fc*bf; }
    return {f0,fc,src:1,r,t,carb,bf};
  }

  const M=window.INFM={ok:false,built:0,fc:null,dd:null,cls:null,reg:null,gen:0,mean:{f0:NODATA.f0,fc:NODATA.fc,k:K},cov:0,z12:0,
                       up:null,upGeo:null,busy:false,wx:null,wxReg:null,acc:null,
                       expL:Float32Array.from({length:2049},(_,k)=>Math.exp(-k/256))}; // e^−x tablosu, x = 0…8
  const xAt=i=>M.wx&&M.wxReg===REG?M.wx[i]:S.wetX;           // hücrenin ıslaklığı (yoksa pencere ortak değeri)
  const capAt=i=>M.fc[i]+M.dd[i]*Math.exp(-xAt(i));
  function meanCap(){ let s=0,n=0; for(let i=0;i<N*N;i++){ if(sea[i]) continue; s+=capAt(i); n++; } return n?s/n:infCap(); }
  let IDX=null; const TC=new Map();
  const index=()=>IDX||(IDX=fetch("data/infil/index.json").then(r=>r.ok?r.json():{}).catch(()=>({})).then(j=>({
    10:new Set(j["10"]||[]),12:new Set(j["12"]||[])})));
  function tile(z,x,y){
    const key=z+"/"+x+"/"+y; let p=TC.get(key);
    if(p){ TC.delete(key); TC.set(key,p); return p; }
    p=fetch(`data/infil/${z}/${x}/${y}.png`).then(r=>r.ok?r.arrayBuffer():null).then(b=>b&&pngPixels(b)).catch(()=>null)
      .then(r=>r&&r.bpp===3?r.px:null);
    TC.set(key,p); while(TC.size>(MOBILE?60:200)) TC.delete(TC.keys().next().value);
    return p;
  }
  // noktalar: Web Mercator piksel koordinatları (z düzeyinde, pay olarak) → RGB; önce z12, yoksa z10
  async function sampleXY(z,X,Y){
    const ix=await index(), n=X.length, out=new Uint8Array(n*4); // r,g,b,kaynak zoom (12/10/0)
    const want=new Map();
    for(let q=0;q<n;q++){
      let zz=0, px=0, py=0;
      for(const tz of [12,10]){
        const s=2**(tz-z), x=X[q]*s, y=Y[q]*s, tx=Math.floor(x/256), ty=Math.floor(y/256);
        if(ix[tz].has(tx+"/"+ty)){ zz=tz; px=x; py=y; break; }
      }
      if(!zz) continue;
      const tx=Math.floor(px/256), ty=Math.floor(py/256), key=zz+"/"+tx+"/"+ty;
      let a=want.get(key); if(!a) want.set(key,a=[]);
      a.push(q,Math.min(255,Math.floor(px-tx*256)),Math.min(255,Math.floor(py-ty*256)));
    }
    await Promise.all([...want].map(async([key,a])=>{
      const [zz,tx,ty]=key.split("/").map(Number), px=await tile(zz,tx,ty); if(!px) return;
      for(let k=0;k<a.length;k+=3){ const q=a[k], o=(a[k+2]*256+a[k+1])*3;
        out[q*4]=px[o]; out[q*4+1]=px[o+1]; out[q*4+2]=px[o+2]; out[q*4+3]=zz; }
    }));
    return out;
  }
  const need=()=>S.soilV==="map"||$("tex").value==="inf";

  async function prep(){
    if(!REG||!need()){ return; }
    const reg=REG, gen=++M.gen, X=new Float64Array(N*N), Y=new Float64Array(N*N);
    // yeni pencere öncekinden kaydırılmışsa diziler hemen kaydırılır (su gibi), sonra karolar gelince doldurulur
    if(M.reg&&M.fc&&M.reg.zd===reg.zd&&M.reg!==reg){
      const sx=(reg.x0-M.reg.x0)/2, sy=(reg.y0-M.reg.y0)/2, fc=new Float32Array(N*N), dd=new Float32Array(N*N), cl=new Uint8Array(N*N*4);
      const wx=new Float32Array(N*N).fill(S.wetX), owx=M.wx&&M.wxReg===M.reg?M.wx:null;
      fc.fill(M.mean.fc); dd.fill(M.mean.f0-M.mean.fc);
      for(let y=0;y<N;y++) for(let x=0;x<N;x++){ const ox=x+sx, oy=y+sy; if(ox<0||oy<0||ox>=N||oy>=N) continue;
        const i=y*N+x, j=oy*N+ox; fc[i]=M.fc[j]; dd[i]=M.dd[j]; cl.set(M.cls.subarray(j*4,j*4+4),i*4); if(owx) wx[i]=owx[j]; }
      M.fc=fc; M.dd=dd; M.cls=cl; M.reg=reg; M.wx=wx; M.wxReg=reg;
    }
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){ const i=y*N+x; X[i]=reg.x0+2*x+1; Y[i]=reg.y0+2*y+1; }
    M.busy=true; ui();
    const c=await sampleXY(reg.zd,X,Y);
    if(gen!==M.gen||reg!==REG) return;
    const fc=new Float32Array(N*N), dd=new Float32Array(N*N);
    let s0=0, sc=0, nl=0, cov=0, z12=0, bs=0;
    for(let i=0;i<N*N;i++){
      const p=params(c[i*4],c[i*4+1],c[i*4+2]); fc[i]=p.fc; dd[i]=p.f0-p.fc;
      if(sea[i]) continue; nl++; s0+=p.f0; sc+=p.fc; bs+=c[i*4+1]/250; if(c[i*4+3]){ cov++; if(c[i*4+3]===12) z12++; }
    }
    if(!M.wx||M.wxReg!==reg){ M.wx=new Float32Array(N*N).fill(S.wetX); M.wxReg=reg; }
    M.fc=fc; M.dd=dd; M.cls=c; M.reg=reg; M.cov=nl?cov/nl:0; M.built=nl?bs/nl:0; M.z12=nl?z12/nl:0; M.busy=false;
    M.mean={f0:nl?s0/nl:NODATA.f0, fc:nl?sc/nl:NODATA.fc, k:K}; M.ok=true;
    M.up=null; if(M.upGeo&&M.upGeo.reg===reg) upPrep2();
    refresh(true);
  }
  // yukarı havza: pencereye akan dış hücrelerin parametreleri (kaba ızgara, ~115–230 m) → ağırlıklı sınıf listesi
  async function upPrep2(){
    const g=M.upGeo; if(!g||!need()) return;
    const {zc,X0,Y0,G,con}=g, X=[], Y=[];
    for(let v=0;v<G;v++) for(let u=0;u<G;u++) if(con[v*G+u]){ X.push(X0+u+.5); Y.push(Y0+v+.5); }
    if(!X.length){ M.up={f0:[],fc:[],w:[],tot:0,cov:0}; return; }
    const c=await sampleXY(zc,X,Y);
    if(M.upGeo!==g) return;
    const bins=new Map(); let cov=0;
    for(let q=0;q<X.length;q++){ const p=params(c[q*4],c[q*4+1],c[q*4+2]); if(c[q*4+3]) cov++;
      const key=Math.round(p.f0*2)+"|"+Math.round(p.fc*4), b=bins.get(key);
      if(b){ b[2]++; } else bins.set(key,[p.f0,p.fc,1]); }
    const L=[...bins.values()];
    M.up={f0:L.map(b=>b[0]),fc:L.map(b=>b[1]),w:L.map(b=>b[2]/X.length),tot:X.length,cov:cov/X.length};
    ui();
  }
  // dış alanın yağış fazlası (mm/sa): her parametre sınıfı için ayrı Horton kapasitesi, alanla ağırlıklı ortalama
  window.infUpExcess=r=>{
    const u=M.up, e=Math.exp(-S.wetX);
    if(!u||!u.w.length){ const p=M.mean; return Math.max(0,r-(p.fc+(p.f0-p.fc)*e)); }
    let a=0; for(let k=0;k<u.w.length;k++) a+=u.w[k]*Math.max(0,r-(u.fc[k]+(u.f0[k]-u.fc[k])*e));
    return a;
  };
  window.infUpPrep=g=>{ M.upGeo={...g,reg:REG}; M.up=null; if(M.ok&&M.reg===REG) upPrep2(); };
  window.infPrep=()=>prep().catch(e=>{ console.warn("Zemin haritası okunamadı",e); M.busy=false; ui(); });
  window.infMean=()=>M.mean;

  function ui(){
    if(S.soilV==="map"){ S.soil=M.mean; S.inf=M.ok&&M.reg===REG?meanCap():infCap(); if(typeof soilUI==="function") soilUI(); }
    $("lgInf").hidden=$("tex").value!=="inf";
  }
  window.infSoilText=()=>{
    if(M.busy&&!M.ok) return "Zemin haritası yükleniyor…";
    if(!M.ok) return "Bölge yüklenince arazi örtüsü ve toprak haritasından hücre hücre hesaplanır.";
    const p=M.mean, e=Math.exp(-S.wetX), cov=M.cov;
    let t=`Hücre hücre: arazi örtüsü (ESA WorldCover) + toprak dokusu (SoilGrids). Pencere ortalaması şu an ${fmt(S.inf,1)} mm/sa; kuruyken ${fmt(p.f0)} mm/sa, ıslandıkça ${fmt(p.fc,1)} mm/sa'e iner (Horton). Her hücre kendi aldığı suyla (yağış + yukarıdan akan su) ıslanır.`;
    t+= cov<0.05 ? " Bu alan için zemin haritası yok; her yer “Karışık kentsel” sayıldı." :
        ` Haritanın kapsadığı kara: %${fmt(cov*100)}`+(M.z12>0.5?" (~30 m)":" (~120 m, kaba)")+(cov<0.95?"; kalanı “Karışık kentsel” sayıldı.":".");
    if(M.up&&M.up.tot) t+=` Yukarı havzada şu anki ortalama emiş ${fmt(M.up.w.reduce((a,w,k)=>a+w*(M.up.fc[k]+(M.up.f0[k]-M.up.fc[k])*e),0),1)} mm/sa.`;
    if(KARST.on) t+=" Karst modu açık: zemin haritası korunur, düdenler ayrıca su yutar.";
    return t;
  };
  window.infTip=i=>{
    if(!M.ok||M.reg!==REG||!need()||sea[i]) return "";
    const c=M.cls, r=c[i*4], g=c[i*4+1], bv=c[i*4+2], now=capAt(i), nt=`şu an <b>${fmt(now,now<10?1:0)} mm/sa</b> emiyor`;
    if(!c[i*4+3]) return `<br>Zemin: <b>veri yok</b> (“Karışık kentsel” sayıldı) · ${nt}`;
    const p=params(r,g,bv), T=TEX[bv&15], lc=r===5||g>=125?"yapı / yol":(LC[r]||{n:"?"}).n.toLowerCase();
    return `<br>Zemin: <b>${lc}</b> · ${nt}<br><span class="muted">${g&&r!==5?`yapı %${fmt(g/2.5)} · `:""}toprak ${T?T[0]:"bilinmiyor"}${bv&32?" (çevreden tahmin)":""}${bv&16?" · karbonatlı kayaç bölgesi":""}`+
      ` · kuru ${fmt(p.f0)}, doygun ${fmt(p.fc,1)} mm/sa · ıslaklık %${fmt(100*(1-Math.exp(-xAt(i))))}</span>`+
      (S.soilV!=="map"?`<br><span class="muted">Simülasyon şu an tek zemin kullanıyor; haritayı kullanmak için Zemin → Haritadan.</span>`:"");
  };

  // harita katmanı: anlık kapasite, log ölçek 1–100 mm/sa; uydu görüntüsünün üstüne yarı saydam
  const STOPS=[[0,[90,30,30]],[.2,[200,86,42]],[.4,[233,196,106]],[.6,[124,196,127]],[.8,[42,157,143]],[1,[29,95,168]]];
  const col=f=>{ const t=Math.max(0,Math.min(1,Math.log10(Math.max(f,1))/2)); let k=1; while(k<STOPS.length-1&&STOPS[k][0]<t) k++;
    const [a,ca]=STOPS[k-1], [b2,cb]=STOPS[k], u=(t-a)/(b2-a); return ca.map((v,j)=>v+(cb[j]-v)*u); };
  let cnv=null, lastX=null, VIEW="now";
  window.infCanvas=()=>{
    if(!M.ok||M.reg!==REG) return null;
    const sm=document.createElement("canvas"); sm.width=sm.height=N; const g=sm.getContext("2d"), im=g.createImageData(N,N);
    for(let i=0;i<N*N;i++){ const o=i*4;
      if(sea[i]){ im.data[o]=20; im.data[o+1]=40; im.data[o+2]=70; im.data[o+3]=255; continue; }
      const c=col(VIEW==="dry"?M.fc[i]+M.dd[i]:capAt(i)); im.data[o]=c[0]; im.data[o+1]=c[1]; im.data[o+2]=c[2]; im.data[o+3]=255; }
    g.putImageData(im,0,0);
    const W=satCanvas?Math.min(1024,satCanvas.width):512;
    cnv=document.createElement("canvas"); cnv.width=cnv.height=W; const h=cnv.getContext("2d");
    if(satCanvas){ h.drawImage(satCanvas,0,0,W,W); h.globalAlpha=.78; }
    h.imageSmoothingEnabled=false; h.drawImage(sm,0,0,W,W); lastX=S.simT;
    return cnv;
  };
  function refresh(force){
    ui();
    if($("tex").value==="inf"&&M.ok&&(force||lastX===null||Math.abs(S.simT-lastX)>=60)) applyTexture();
  }
  setInterval(()=>{ if(S.loaded&&$("tex").value==="inf") refresh(false); },1500);
  const onSel=()=>{ if(need()&&S.loaded&&(!M.ok||M.reg!==REG)) prep(); if(M.ok&&!M.up&&M.upGeo) upPrep2(); ui(); };
  $("soil").addEventListener("change",onSel); $("tex").addEventListener("change",onSel);
  // ön yüzde kısa yol: sol panelde bölge kartının altında düğme ve Dere izleri panelinde katman kutusu (Görünüm seçimiyle eşli)
  let texPrev="sat";
  const setLayer=on=>{ const t=$("tex"), cur=t.value;
    if(on===(cur==="inf")) return;
    if(on){ texPrev=cur; t.value="inf"; } else t.value=texPrev!=="inf"?texPrev:(satCanvas?"sat":"elev");
    t.dispatchEvent(new Event("change")); };
  const css=document.createElement("style");
  css.textContent=`#infBtn{display:flex;align-items:center;gap:8px;width:100%;margin-top:8px;text-align:left;justify-content:flex-start}
    #infBtn .sw{width:28px;height:8px;border-radius:4px;background:linear-gradient(90deg,#5a1e1e,#c8562a,#e9c46a,#7cc47f,#2a9d8f,#1d5fa8);flex:none}
    #infBtn small{margin-left:auto;font-weight:500;opacity:.8}
    #infBtn[aria-pressed="true"]{background:var(--accent);color:#04121f}`;
  document.head.appendChild(css);
  css.textContent+=`#infView{display:flex;gap:6px;margin-top:6px}#infView[hidden]{display:none}#infView button{flex:1}
    #infView button[aria-pressed="true"]{background:var(--accent);color:#04121f}
    @media (max-width:900px){#infBtn{width:auto;margin:0;padding:6px 9px;flex:none}#infBtn .sw,#infBtn .lt{display:none}#infView,#infView:not([hidden]){display:none}}`;
  const btn=document.createElement("button"); btn.id="infBtn"; btn.className="btn ghost sm"; btn.type="button";
  btn.title="Her noktada zeminin şu an saatte kaç mm su emdiğini renklerle göster (uydu arazi örtüsü + toprak haritası)";
  btn.innerHTML=`<span class="sw"></span>🌱<span class="lt"> Zemin emişi haritası</span><small></small>`;
  const vw=document.createElement("div"); vw.id="infView"; vw.hidden=true;
  vw.innerHTML=`<button type="button" class="btn ghost sm" data-v="now" title="Simülasyondaki ıslaklıkla, şu anki emiş">Şu an</button>`+
    `<button type="button" class="btn ghost sm" data-v="dry" title="Zemin kuruyken emiş: arazi örtüsü ve toprak farkı en iyi böyle görünür">Kuruyken</button>`;
  const reg=document.querySelector("aside .region"); if(reg){ reg.after(btn); btn.after(vw); }
  vw.onclick=e=>{ const v=e.target.dataset&&e.target.dataset.v; if(!v||v===VIEW) return; VIEW=v; sync(); if($("tex").value==="inf") applyTexture(); };
  // telefonda yer dar: düğme kapalı → şu an → kuruyken → kapalı döner
  const NARROW=matchMedia("(max-width:900px)");
  btn.onclick=()=>{ const on=$("tex").value==="inf";
    if(NARROW.matches&&on&&VIEW==="now"){ VIEW="dry"; sync(); applyTexture(); return; }
    if(NARROW.matches&&!on) VIEW="now";
    setLayer(!on); };
  const lab=document.createElement("label");
  lab.innerHTML=`<input type="checkbox" id="showInf"> <span class="sw" style="background:linear-gradient(90deg,#c8562a,#7cc47f,#1d5fa8)"></span> Zemin emişi <span class="muted">(şu an, mm/sa)</span>`;
  const up=$("showUp"); if(up&&up.closest("label")) up.closest("label").after(lab);
  $("showInf").onchange=e=>setLayer(e.target.checked);
  const sync=()=>{ const on=$("tex").value==="inf"; btn.setAttribute("aria-pressed",on); $("showInf").checked=on;
    btn.querySelector("small").textContent=NARROW.matches ? (on?(VIEW==="dry"?" kuru":" şu an"):" zemin") : on?"açık":"göster"; vw.hidden=!on;
    vw.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.v===VIEW));
    const t=$("lgInf").firstElementChild; if(t) t.textContent=VIEW==="dry"?"Zemin emişi (kuruyken)":"Zemin emişi (şu an)"; };
  $("tex").addEventListener("change",sync); sync();
  if(need()) onSel();
})();
