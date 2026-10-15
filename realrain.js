// Gerçek yağış senaryosu: dün akşamın saatlik yağışı (Open-Meteo) simülasyona saat saat uygulanır.
// index.html'deki globalleri (S, simStep, loadRegion, uiUpd, $, fmt) kullanır; ana betikten SONRA yüklenmelidir.
(function(){
  // Yedek: 14 Ekim 2026, Kağıthane (41,08 K, 28,975 D), 15:00–24:00 saatlik toplamlar (mm), Open-Meteo
  const FALLBACK = {date:"2026-10-14", start:15, mm:[2.8,5.6,7.2,13.7,23.1,12.6,5.4,3.6,2.1], place:"Kağıthane"};
  const START = 15, HOURS = 9;           // 15:00–24:00 penceresi
  const RR = window.REALRAIN = {on:true, date:FALLBACK.date, start:START, mm:FALLBACK.mm.slice(), place:FALLBACK.place, live:false};
  const MONTHS = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
  const trDate = s => { const [y,m,d]=s.split("-").map(Number); return `${d} ${MONTHS[m-1]}`; };
  const total = () => RR.mm.reduce((a,v)=>a+v,0);
  const hourNow = () => Math.floor(S.simT/3600);

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

  // --- arayüz: senaryo çipi + saatlik grafik ---
  const scen = $("scen");
  const chip = document.createElement("button");
  chip.className = "chip on"; chip.id = "rrChip";
  scen.prepend(chip);
  scen.querySelectorAll(".chip").forEach(c=>{ if(c!==chip) c.classList.remove("on"); });

  const box = document.createElement("div");
  box.id = "rrBox";
  box.innerHTML = `<div class="rr-h"><b id="rrTitle"></b><span id="rrNow"></span></div>
    <div class="rr-bars" id="rrBars"></div>
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
    .rr-f{margin-top:18px;color:var(--muted);font-size:11px}`;
  document.head.appendChild(css);

  function render(){
    chip.textContent = `📡 ${RR.live?"Dün akşam":trDate(RR.date)+" akşamı"} · gerçek veri`;
    chip.classList.toggle("on", RR.on);
    box.hidden = !RR.on;
    $("rrTitle").textContent = `${trDate(RR.date)} · ${String(RR.start).padStart(2,"0")}:00–24:00 · ${fmt(total(),1)} mm`;
    const mx = Math.max(...RR.mm, 1), h = hourNow();
    $("rrBars").innerHTML = RR.mm.map((v,i)=>`<i class="${i<h?"past":i===h?"now":""}" style="height:${Math.max(3,v/mx*100)}%" title="${String(RR.start+i).padStart(2,"0")}:00 · ${fmt(v,1)} mm"><small>${(i%2===0)?String(RR.start+i).padStart(2,"0"):""}</small></i>`).join("");
    const cur = h < RR.mm.length ? `${String(RR.start+h).padStart(2,"0")}:00 · ${fmt(RR.mm[h],1)} mm/sa` : "yağmur bitti";
    $("rrNow").textContent = S.simT>0 ? cur : "";
    $("rrFoot").textContent = `${RR.place} için saatlik yağış · kaynak: Open-Meteo (model/analiz verisi, istasyon ölçümü değil)`;
  }

  function enable(on){
    RR.on = on;
    if(on){
      scen.querySelectorAll(".chip").forEach(c=>c.classList.toggle("on", c===chip));
      S.durH = RR.mm.length; $("dur").value = RR.mm.length;
    }
    render();
  }
  chip.onclick = () => { enable(true); resetWater(); S.running = S.loaded; updPlay(); };
  // başka bir senaryo ya da elle ayar → gerçek veri kapanır
  scen.addEventListener("click", e => { const c=e.target.closest(".chip"); if(c && c!==chip) enable(false); });
  ["rate","dur"].forEach(id => $(id).addEventListener("input", () => enable(false)));

  // --- seçilen bölge için dünkü saatlik yağışı çek ---
  async function fetchYesterday(lat, lon, place){
    try{
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}&hourly=precipitation&past_days=2&forecast_days=1&timezone=Europe%2FIstanbul`;
      const j = await (await fetch(url)).json();
      const t = j.hourly.time, p = j.hourly.precipitation;
      const today = t[t.length-1].slice(0,10);
      // bugünün tarihinden bir önceki gün
      const days = [...new Set(t.map(x=>x.slice(0,10)))].sort();
      const yday = days[days.indexOf(today)-1] || days[days.length-2];
      // saat değeri bir önceki saatin toplamı: 15–16 aralığı "16:00" satırında
      const mm = [];
      for(let k=0;k<HOURS;k++){
        const hh = START+1+k, key = hh<24 ? `${yday}T${String(hh).padStart(2,"0")}:00` : null;
        let idx = key ? t.indexOf(key) : t.indexOf(yday+"T23:00")+1; // 24:00 = ertesi gün 00:00
        mm.push(idx>=0 && p[idx]!=null ? +p[idx] : 0);
      }
      if(mm.reduce((a,v)=>a+v,0) >= 5){ Object.assign(RR,{date:yday, mm, place, live:true}); }
      else Object.assign(RR,{...FALLBACK, mm:FALLBACK.mm.slice(), live:false}); // dün kuru: bilinen sağanak
    }catch(e){ /* çevrimdışı: yedek veri kalır */ }
    render();
  }

  const origLoad = loadRegion;
  loadRegion = async function(){
    const r = await origLoad.apply(this, arguments);
    if(S.loaded) await fetchYesterday(S.lat, S.lon, S.name.replace(/ Deresi$/,""));
    if(RR.on){ S.durH = RR.mm.length; $("dur").value = RR.mm.length; }
    return r;
  };

  // ilk açılıştaki yükleme bu dosyadan önce başladı: bitince o bölge için de veriyi çek
  const first = setInterval(()=>{
    if(!S.loaded) return;
    clearInterval(first);
    fetchYesterday(S.lat, S.lon, S.name.replace(/ Deresi$/,""));
  }, 300);

  // grafiği canlı tut
  setInterval(()=>{ if(RR.on) render(); }, 500);
  enable(true);
})();
