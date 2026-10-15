// Taşkın izi: her hücrenin olay boyunca ulaştığı en yüksek su derinliği tutulur. Yağmur dinip su çekilince
// "su altında" sayıları hızla düşer; oysa taşkın haritalarında önemli olan suyun en çok nereye ulaştığıdır.
// Haritada: bir zamanlar >10 cm su basmış ama şimdi çekilmiş yerler soluk mavi iz olarak kalır.
// İstatistikte: şimdiki değerlerin yanında olay boyunca herhangi bir anda su basmış oranlar ("olay boyunca", "iz") gösterilir.
// index.html'deki globallere (d, sea, N, S, DERE, updStats, updDereStats, drawDereOverlay, dereCanvas, dereTex, fmt, $) dayanır.
(function(){
  if(typeof updStats !== "function") return;
  const WET = 0.1;                                   // m: "su altında" eşiği (panelle aynı)
  const FILL = "rgba(120,190,255,0.20)";
  const FT = window.FLOODTRACE = {on:true, max:null, key:null, peakKm2:0, peakRoad:0, peakLand:0, peakRatio:0};
  const pct = x => "%" + fmt(x*100, x<0.1 ? 1 : 0);

  // yeni bölge ya da baştan başlatma: d dizisi yenilenir → iz sıfırlanır
  function ensure(){
    if(!d) return false;
    if(FT.key !== d || !FT.max || FT.max.length !== d.length){ FT.key = d; FT.max = new Float32Array(d.length); FT.peakKm2 = FT.peakRoad = FT.peakLand = FT.peakRatio = 0; }
    if(S.simT === 0) FT.max.fill(0), FT.peakKm2 = FT.peakRoad = FT.peakLand = FT.peakRatio = 0;
    return true;
  }

  function update(){
    if(!ensure()) return;
    const M = FT.max; let a = 0, land = 0;
    for(let i=0;i<M.length;i++){ if(sea[i]) continue; land++; if(d[i] > M[i]) M[i] = d[i]; if(M[i] > WET) a++; }
    FT.peakKm2 = Math.max(FT.peakKm2, a*S.cell*S.cell/1e6);
    // o ana kadar herhangi bir anda su basmış oranlar
    FT.peakLand = land ? a/land : 0;
    if(DERE && DERE.roads){
      let t=0, w=0; for(const r of DERE.roads) for(const c of r.cells){ t++; if(M[c] > WET) w++; }
      FT.peakRoad = t ? w/t : 0;
    }
    FT.peakRatio = FT.peakLand > 0.0005 ? FT.peakRoad/FT.peakLand : 0;
  }

  function decorateStats(){
    // alt şerit: "Su basan alan" yanında en çok değeri
    const sA = $("sA");
    if(sA && FT.peakKm2 > 0){
      const now = parseFloat(sA.textContent.replace(/\./g,"").replace(",", ".")) || 0;
      if(FT.peakKm2 - now > 0.01 && !/iz /.test(sA.textContent)) sA.innerHTML = `${sA.textContent} <small class="muted" style="font-weight:500;font-size:.7em" title="Olay boyunca herhangi bir anda >10 cm su basmış toplam alan">· iz ${fmt(FT.peakKm2,2)}</small>`;
    }
    // dere panelindeki "su altında" çubukları
    const body = $("dereBody"); if(!body) return;
    for(const row of body.querySelectorAll(".cmp")){
      const lab = row.querySelector(".t span"), val = row.querySelector(".t b"); if(!lab || !val || row.querySelector(".ft-peak")) continue;
      const txt = lab.textContent;
      const pk = /"Dere" adlı yollar su altında/.test(txt) ? FT.peakRoad : /Bölgenin geneli su altında/.test(txt) ? FT.peakLand : null;
      if(pk === null || pk <= 0) continue;
      // en yüksek değeri çubukta açık renkle göster, etiketi çubuğun altına ince satır olarak yaz
      const g = row.querySelector(".g"); const bar = g && g.querySelector("i");
      if(g && bar){ g.style.position = "relative"; const ghost = document.createElement("i");
        ghost.style.cssText = `position:absolute;left:0;top:0;height:100%;width:${Math.min(100,pk*100)}%;background:${getComputedStyle(bar).backgroundColor};opacity:.3`;
        g.appendChild(ghost); }
      const s = document.createElement("div"); s.className = "ft-peak"; s.style.cssText = "font-size:10.5px;color:var(--muted);margin-top:2px";
      s.textContent = `olay boyunca ${pct(pk)}`; s.title = "Olay boyunca herhangi bir anda >10 cm su basmış"; row.appendChild(s);
    }
    // yağmur dinince oran düşer; "fark belirgin değil" yerine en yoğun andaki farkı söyle
    const muted = [...body.querySelectorAll(".muted")].find(x => /Fark henüz belirgin değil/.test(x.textContent));
    if(muted && FT.peakRatio > 1.2) { muted.className = "big"; muted.innerHTML = `Olay boyunca adında "dere" geçen yollar, bölgenin geneline göre <b>${fmt(FT.peakRatio,1)} kat</b> daha sık su altında kaldı.`; }
  }

  function draw(){
    if(!FT.on || !FT.max || !dereCanvas || FT.key !== d) return;
    const g = dereCanvas.getContext("2d"), f = dereCanvas.width/(N-1), M = FT.max;
    g.save(); g.fillStyle = FILL;
    for(let i=0;i<M.length;i++){
      if(M[i] <= WET || d[i] > WET || sea[i]) continue;   // şu an hâlâ su altındaysa su zaten görünüyor
      const x = i % N, y = (i - x) / N; g.fillRect(x*f - f/2, y*f - f/2, f, f);
    }
    g.restore(); dereTex.needsUpdate = true;
  }

  const oStats = updStats;
  updStats = function(){ const r = oStats.apply(this, arguments); try{ update(); decorateStats(); }catch(e){ console.warn("taşkın izi", e); } return r; };
  if(typeof updDereStats === "function"){ const o = updDereStats; updDereStats = function(){ const r = o.apply(this, arguments); try{ decorateStats(); }catch(e){} return r; }; }
  if(typeof drawDereOverlay === "function"){ const o = drawDereOverlay; drawDereOverlay = function(){ const r = o.apply(this, arguments); try{ draw(); }catch(e){} return r; }; }

  // katman anahtarı ve lejant
  (function(){
    const w = document.getElementById("showWater"); const lab = w && w.closest("label");
    if(lab && !document.getElementById("showTrace")){
      const l = document.createElement("label");
      l.innerHTML = `<input type="checkbox" id="showTrace" checked> <span class="sw" style="background:rgba(120,190,255,.55);height:8px"></span> Taşkın izi (suyun ulaştığı en geniş alan)`;
      lab.after(l);
      document.getElementById("showTrace").onchange = e => { FT.on = e.target.checked; drawDereOverlay(); };
    }
    const legend = document.querySelector(".legend");
    if(legend && !document.getElementById("lgTrace")){
      const row = document.createElement("div"); row.className = "row"; row.id = "lgTrace";
      row.innerHTML = `<span class="sw" style="background:rgba(120,190,255,.55);height:8px"></span>Taşkın izi (çekilmiş su)`;
      legend.appendChild(row);
    }
  })();
})();
