// Gerçek yağış senaryoları (Open-Meteo saatlik yağış), simülasyona saat saat uygulanır:
//   "past": dün akşamın yağışı, 18:00–24:00 (bilinen olaylarda ölçümle kalibre edilir)
//   "fc":   önümüzdeki 3 günün tahmininde en yağışlı 12 saat; hata payı ECMWF topluluk tahmininden (51 üye):
//           iyimser (%10) / olası (medyan) / kötümser (%90) senaryo üyeleri
// index.html'deki globalleri (S, simStep, loadRegion, resetWater, updPlay, $, fmt) kullanır; ana betikten SONRA yüklenmelidir.
(function(){
  // Yedek: 14 Ekim 2026, Kağıthane (41,08 K, 28,975 D), 18:00–24:00 saatlik toplamlar (mm), Open-Meteo
  const FALLBACK = {date:"2026-10-14", start:18, mm:[13.7,23.1,12.6,5.4,3.6,2.1], event:108.9, place:"Kağıthane", lat:41.080, lon:28.975};
  // Ölçüm kalibrasyonu: model konvektif sağanağı düşük tahmin edebiliyor. Bilinen olaylarda saatlik dağılım
  // modelden alınır, olay toplamı en yakın ölçüme göre ölçeklenir.
  // 14 Ekim 2026 sağanağı, ilçe toplamları (kg/m² = mm): İBB AKOM / meteoroloji verisi, basında aktarıldığı gibi
  // (Sözcü, Karar, CNN Türk). Aralık verilen yerlerde orta değer alındı.
  const OBS = {date:"2026-10-14", src:"AKOM ölçümleri", st:[
    {n:"Beykoz", lat:41.134, lon:29.092, mm:242},
    {n:"Eyüpsultan", lat:41.048, lon:28.934, mm:190.5},
    {n:"Sarıyer", lat:41.167, lon:29.057, mm:170.2},     // Boğaz çevresi 133–187
    {n:"Kemerburgaz", lat:41.155, lon:28.925, mm:123},   // 121–125
    {n:"Arnavutköy", lat:41.185, lon:28.740, mm:123},    // 121–125
  ]};
  const km = (a,b,c,d) => { const R=6371, t=Math.PI/180, x=(d-b)*t*Math.cos((a+c)/2*t), y=(c-a)*t; return R*Math.hypot(x,y); };
  // 15 km içindeki ölçümlerin mesafe ağırlıklı ortalaması (1/d²); hiç ölçüm yoksa model değeri kalır
  function calibrate(date, lat, lon, mm, eventTotal){
    if(date!==OBS.date || !(eventTotal>0)) return {mm, calib:null};
    const near = OBS.st.map(s=>({...s, dk:Math.max(1,km(lat,lon,s.lat,s.lon))})).filter(s=>s.dk<15).sort((a,b)=>a.dk-b.dk);
    if(!near.length) return {mm, calib:null};
    let sw=0, sv=0; for(const s of near){ const w=1/(s.dk*s.dk); sw+=w; sv+=w*s.mm; }
    const obs=sv/sw, f=obs/eventTotal;
    return {mm:mm.map(v=>+(v*f).toFixed(1)), calib:{n:near.slice(0,3).map(s=>s.n).join(", "), mm:obs, f}};
  }
  // dün akşam: 18:00–24:00 (öncesinde yağış kanalizasyon + zemin kapasitesinin altında kaldı, su birikmedi;
  // simülasyon doğrudan selin başladığı saatlerden başlar)
  const START = 18, HOURS = 6;
  const FC_HOURS = 12;             // tahmin: en yağışlı 12 saat
  const fb = () => { const c=calibrate(FALLBACK.date,FALLBACK.lat,FALLBACK.lon,FALLBACK.mm,FALLBACK.event);
    return {date:FALLBACK.date, start:START, mm:c.mm, calib:c.calib, place:FALLBACK.place, live:false}; };
  let PAST = fb(), FC = null;      // FC: {date,start,mm,place} ya da {none:true}
  const RR = window.REALRAIN = {on:false, mode:"past", ...PAST};  // varsayılan: kapalı (Aşırı sağanak); çipten seçilir

  const MONTHS = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
  const trDate = s => { const [y,m,d]=s.split("-").map(Number); return `${d} ${MONTHS[m-1]}`; };
  const hh = h => String(h%24).padStart(2,"0");
  const total = () => RR.mm.reduce((a,v)=>a+v,0);
  const hourNow = () => Math.floor(S.simT/3600);
  const nowKey = () => new Date().toLocaleString("sv-SE",{timeZone:"Europe/Istanbul"}).slice(0,13).replace(" ","T")+":00";
  const place = () => S.name.replace(/ Deresi$/,"");

  // --- simülasyona bağlan: her adımda o saatin yağışını uygula ---
  const origStep = simStep;
  simStep = function(dt){
    if(RR.on){
      const h = hourNow();
      S.durH = RR.mm.length;
      S.rate = h < RR.mm.length ? RR.mm[h] : 0;
    }
    return origStep(dt);
  };

  // --- arayüz: iki senaryo çipi + saatlik grafik ---
  const scen = $("scen");
  const chipP = document.createElement("button"); chipP.className = "chip"; chipP.id = "rrChip";
  const chipF = document.createElement("button"); chipF.className = "chip"; chipF.id = "fcChip";
  scen.prepend(chipP, chipF);

  const box = document.createElement("div");
  box.id = "rrBox";
  box.innerHTML = `<div class="rr-h"><b id="rrTitle"></b><span id="rrNow"></span></div>
    <div class="rr-bars" id="rrBars"></div>
    <div class="rr-var" id="rrVar"></div>
    <div class="rr-f" id="rrFoot"></div>`;
  scen.after(box);
  const css = document.createElement("style");
  css.textContent = `
    #rrBox{background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:8px 10px;margin:-2px 0 12px;font-size:12px}
    #rrBox[hidden]{display:none}
    .rr-h{display:flex;justify-content:space-between;gap:8px;margin-bottom:6px}
    .rr-h span{color:var(--accent);white-space:nowrap}
    .rr-bars{display:flex;align-items:flex-end;gap:3px;height:54px}
    .rr-bars i{flex:1;background:#2f5f93;border-radius:3px 3px 0 0;min-height:2px;position:relative;transition:background .2s}
    .rr-bars i.past{background:#4ea8ff}
    .rr-bars i.now{background:#ffb020}
    .rr-bars i small{position:absolute;bottom:-15px;left:50%;transform:translateX(-50%);font-size:9.5px;color:var(--muted);font-style:normal}
    .rr-f{margin-top:18px;color:var(--muted);font-size:11px}
    #fcChip:disabled{opacity:.5;cursor:default}
    .rr-bars i u{position:absolute;left:-1px;right:-1px;bottom:0;background:rgba(255,176,32,.18);border:1px dashed rgba(255,176,32,.45);border-bottom:0;border-radius:3px 3px 0 0;text-decoration:none;z-index:-1}
    .rr-bars{isolation:isolate}
    .rr-var{display:grid;grid-template-columns:repeat(3,1fr);gap:3px;margin-top:20px;background:var(--bg);padding:3px;border-radius:8px}
    .rr-var:empty{display:none}
    .rr-var button{border:0;background:transparent;color:var(--ink);padding:5px 2px;border-radius:6px;cursor:pointer;font-size:11px;line-height:1.2}
    .rr-var button small{display:block;color:var(--muted);font-size:10px}
    .rr-var button.on{background:var(--panel2);box-shadow:0 1px 3px rgba(0,0,0,.4);font-weight:600}
    .rr-var + .rr-f{margin-top:6px}`;
  document.head.appendChild(css);

  function render(){
    chipP.textContent = `📡 ${PAST.live?"Dün akşam":trDate(PAST.date)+" akşamı"} · gerçek veri`;
    if(!FC){ chipF.textContent = "🔮 Tahmin · yükleniyor…"; chipF.disabled = true; }
    else if(FC.none){ chipF.textContent = "🔮 Tahmin · 3 günde yağış yok"; chipF.disabled = true; chipF.title = "Önümüzdeki 3 günde kayda değer yağış beklenmiyor"; }
    else { chipF.textContent = `🔮 Tahmin · ${trDate(FC.date)} ${hh(FC.start)}:00${FC.totals?` · ${fmt(FC.totals.p10,0)}–${fmt(FC.totals.p90,0)} mm`:""}`; chipF.disabled = false; chipF.title = ""; }
    chipP.classList.toggle("on", RR.on && RR.mode==="past");
    chipF.classList.toggle("on", RR.on && RR.mode==="fc");
    box.hidden = !RR.on;
    if(!RR.on) return;
    const end = RR.start + RR.mm.length;
    $("rrTitle").textContent = `${RR.mode==="fc"?"Tahmin · ":""}${trDate(RR.date)} · ${hh(RR.start)}:00–${end>=24&&end%24===0?"24":hh(end)}:00 · ${fmt(total(),1)} mm`;
    const band = RR.mode==="fc" && RR.band, h = hourNow();
    const mx = Math.max(...RR.mm, ...(band?band.hi:[]), 1);
    $("rrBars").innerHTML = RR.mm.map((v,i)=>{
      const tip = `${hh(RR.start+i)}:00 · ${fmt(v,1)} mm` + (band?` (aralık ${fmt(band.lo[i],1)}–${fmt(band.hi[i],1)})`:"");
      const u = band ? `<u style="height:${Math.max(2,band.hi[i]/mx*100)/Math.max(3,v/mx*100)*100}%"></u>` : "";
      return `<i class="${i<h?"past":i===h?"now":""}" style="height:${Math.max(3,v/mx*100)}%" title="${tip}">${u}<small>${(i%2===0)?hh(RR.start+i):""}</small></i>`;
    }).join("");
    const V = RR.mode==="fc" && RR.variants ? RR.variants : null;
    $("rrVar").innerHTML = V ? [["p10","İyimser","%10"],["p50","Olası","medyan"],["p90","Kötümser","%90"]].map(([k,a,b])=>
      `<button data-v="${k}" class="${RR.sel===k?"on":""}">${a} · ${fmt(RR.totals[k],0)} mm<small>${b}</small></button>`).join("") : "";
    const cur = h < RR.mm.length ? `${hh(RR.start+h)}:00 · ${fmt(RR.mm[h],1)} mm/sa` : "yağmur bitti";
    $("rrNow").textContent = S.simT>0 ? cur : "";
    $("rrFoot").textContent = RR.mode==="fc"
      ? (V ? `${RR.place} · ECMWF topluluk tahmini (${RR.members} üye, Open-Meteo). Olası ${fmt(RR.totals.p50,0)} mm, %80 aralık ${fmt(RR.totals.p10,0)}–${fmt(RR.totals.p90,0)} mm. Kesikli bant: her saatin %10–%90 aralığı. Modeller sağanağı düşük tahmin edebilir.`
           : `${RR.place} · Open-Meteo saatlik yağış tahmini (hata payı alınamadı); tahminler, özellikle sağanakta, belirsizdir`)
      : RR.calib
        ? `${RR.place} · saatlik dağılım Open-Meteo; olay toplamı yakındaki AKOM ölçümlerine (${RR.calib.n}) göre ~${fmt(RR.calib.mm,0)} mm'ye ölçeklendi (×${fmt(RR.calib.f,2)})`
        : `${RR.place} için saatlik yağış · kaynak: Open-Meteo (model/analiz verisi, istasyon ölçümü değil)`;
  }

  function use(mode){
    const src = mode==="fc" ? FC : PAST;
    if(!src || src.none) return;
    Object.assign(RR, {on:true, mode, calib:null, band:null, variants:null, ...src});
    S.durH = RR.mm.length; $("dur").value = RR.mm.length;
    render();
  }
  function off(){ RR.on = false; render(); }

  $("rrVar").addEventListener("click", e => {
    const b = e.target.closest("button[data-v]"); if(!b || !FC || !FC.variants) return;
    FC.sel = b.dataset.v; FC.mm = FC.variants[FC.sel]; use("fc"); restart();
  });
  const restart = () => { resetWater(); S.running = S.loaded; updPlay(); };
  chipP.onclick = () => { use("past"); restart(); };
  chipF.onclick = () => { use("fc"); restart(); };
  // başka bir senaryo ya da elle ayar → gerçek veri kapanır
  scen.addEventListener("click", e => { const c=e.target.closest(".chip"); if(c && c!==chipP && c!==chipF) off(); });
  ["rate","dur"].forEach(id => $(id).addEventListener("input", off));

  // --- seçilen bölge için dünkü yağış + 3 günlük tahmin ---
  async function fetchRain(lat, lon, name){
    try{
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}&hourly=precipitation&past_days=2&forecast_days=4&timezone=Europe%2FIstanbul`;
      const j = await (await fetch(url)).json();
      const t = j.hourly.time, p = j.hourly.precipitation, now = nowKey();
      const today = now.slice(0,10);
      const days = [...new Set(t.map(x=>x.slice(0,10)))].sort();
      const yday = days[days.indexOf(today)-1];
      // Dün akşam. Saat değeri bir önceki saatin toplamı: 15–16 aralığı "16:00" satırında.
      const mm = [];
      for(let k=0;k<HOURS;k++){
        const h = START+1+k, idx = h<24 ? t.indexOf(`${yday}T${hh(h)}:00`) : t.indexOf(`${yday}T23:00`)+1; // 24:00 = ertesi gün 00:00
        mm.push(idx>=0 && p[idx]!=null ? +p[idx] : 0);
      }
      // olay toplamı (dün 00:00'dan şu ana): kalibrasyon için
      let ev=0; t.forEach((x,i)=>{ if(x>`${yday}T00:00` && x<=now && p[i]!=null) ev+=p[i]; });
      if(yday && mm.reduce((a,v)=>a+v,0) >= 5){ const c=calibrate(yday,lat,lon,mm,ev); PAST={date:yday, start:START, mm:c.mm, calib:c.calib, place:name, live:true}; }
      else PAST = fb(); // dün kuru: bilinen sağanak
      // Tahmin: şu andan sonraki saatlerde en yağışlı 12 saatlik pencere
      const i0 = t.findIndex(x=>x>now);
      let best=-1, bi=-1;
      for(let i=i0;i>=0 && i+FC_HOURS<=t.length;i++){
        let s=0; for(let k=0;k<FC_HOURS;k++) s+=p[i+k]||0;
        if(s>best){best=s;bi=i;}
      }
      if(bi>=0 && best>=2){
        // i satırı (i-1 → i) aralığının toplamı: pencere başlangıç saati = satır saatinin bir öncesi
        const startKey = t[bi-1] || t[bi];
        FC = {date:startKey.slice(0,10), start:+startKey.slice(11,13), mm:p.slice(bi,bi+FC_HOURS).map(v=>+(v||0).toFixed(1)), place:name};
      } else FC = {none:true};
      await fetchEnsemble(lat, lon, name, now);
    }catch(e){ if(!FC) FC = {none:true}; }
    if(RR.on) use(RR.mode==="fc" && FC && !FC.none ? "fc" : "past"); else render();
  }

  // Hata payı: ECMWF IFS 0,25° topluluk tahmini (51 üye). Pencere üyelerin ortancasına göre seçilir;
  // senaryolar, pencere toplamına göre sıralanmış üyelerin %10 / %50 / %90'ıdır (gerçek bir üyenin saatlik serisi).
  async function fetchEnsemble(lat, lon, name, now){
    try{
      const url = `https://ensemble-api.open-meteo.com/v1/ensemble?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}&hourly=precipitation&models=ecmwf_ifs025&forecast_days=4&timezone=Europe%2FIstanbul`;
      const j = await (await fetch(url)).json();
      const H = j.hourly, t = H.time, keys = Object.keys(H).filter(k=>k.startsWith("precipitation"));
      if(keys.length < 5) return;
      const M = keys.map(k=>H[k].map(v=>v||0)), n = M.length;
      const q = (arr,f) => { const a=[...arr].sort((x,y)=>x-y); return a[Math.min(a.length-1,Math.max(0,Math.round(f*(a.length-1))))]; };
      const med = t.map((_,i)=>q(M.map(m=>m[i]),0.5));
      const i0 = t.findIndex(x=>x>now);
      let best=-1, bi=-1;
      for(let i=i0;i>=1 && i+FC_HOURS<=t.length;i++){ let s=0; for(let k=0;k<FC_HOURS;k++) s+=med[i+k]; if(s>best){best=s;bi=i;} }
      // ortanca bile kuruysa üyelerin %90'ına bak (düşük olasılıklı yağış)
      const tots = M.map(m=>m.slice(bi,bi+FC_HOURS).reduce((a,v)=>a+v,0));
      if(bi<0 || q(tots,0.9) < 2){ if(!FC || FC.none) FC = {none:true}; return; }
      const order = tots.map((v,i)=>i).sort((a,b)=>tots[a]-tots[b]);
      const pick = f => order[Math.round(f*(n-1))];
      const ser = idx => M[idx].slice(bi,bi+FC_HOURS).map(v=>+v.toFixed(1));
      const variants = {p10:ser(pick(0.1)), p50:ser(pick(0.5)), p90:ser(pick(0.9))};
      const totals = {p10:tots[pick(0.1)], p50:tots[pick(0.5)], p90:tots[pick(0.9)]};
      const lo=[], hi=[];
      for(let k=0;k<FC_HOURS;k++){ const col=M.map(m=>m[bi+k]); lo.push(+q(col,0.1).toFixed(1)); hi.push(+q(col,0.9).toFixed(1)); }
      const startKey = t[bi-1];
      const sel = FC && FC.sel || "p50";
      FC = {date:startKey.slice(0,10), start:+startKey.slice(11,13), place:name, variants, totals, band:{lo,hi}, members:n, sel, mm:variants[sel]};
    }catch(e){ /* topluluk tahmini alınamadı: tek tahmin kalır */ }
  }

  const origLoad = loadRegion;
  loadRegion = async function(){
    const r = await origLoad.apply(this, arguments);
    if(S.loaded) await fetchRain(S.lat, S.lon, place());
    return r;
  };

  // ilk açılıştaki yükleme bu dosyadan önce başladı: bitince o bölge için de veriyi çek
  const first = setInterval(()=>{
    if(!S.loaded) return;
    clearInterval(first);
    fetchRain(S.lat, S.lon, place());
  }, 300);

  // grafiği canlı tut
  setInterval(()=>{ if(RR.on) render(); }, 500);
  render();
})();
