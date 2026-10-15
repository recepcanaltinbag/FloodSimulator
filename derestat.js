// "Dere" adlı yollarda akış istatistiği (hız gösterilmez: virtual-pipes modeli ince tabakada hızı abartır): adında dere geçen yollarda akan su (akış çizgisi çıkan hücre) bölgenin
// geneline göre ne kadar sık görülüyor? Hem anlık hem yağış boyunca (en az bir kez akış görülen) oran.
// index.html'deki globallere (DERE, d, sea, N, S, cellVel, updDereStats, fmt, $) dayanır; dere panelinin altına ekler.
(function(){
  if(typeof updDereStats !== "function" || typeof cellVel !== "function") return;
  const ST = window.DERESTAT = {key:null, seenRoad:null, seenLand:null, lastT:-1};
  // adında "dere" geçse de dereyle ilgisi olmayan adlar: dereotu (bitki), derebeyi, kişi adları
  // (Adnan Menderes, Gülderen, Deren, Derem). "Küçük Menderes" gibi nehir adları kalır.
  const EXCL = /dereotu|derebey|adnan menderes|gülderen|\bderen\b|\bderem\b/i;
  const FLOW_COL = "#3fe0a8";   // yağış boyunca akış görülen "dere" adlı yol

  function reset(){
    ST.key = DERE; ST.lastT = S.simT;
    ST.seenRoad = new Map();           // hücre → akış görüldü mü
    ST.seenLand = new Uint8Array(N*N);
  }

  function compute(){
    if(!DERE || !DERE.roads || !DERE.roads.length || !d) return null;
    if(ST.key !== DERE || S.simT < ST.lastT - 1) reset();   // yeni bölge ya da baştan başlatma
    ST.lastT = S.simT;
    let tot=0, now=0, ever=0, spd=0, everLen=0;
    const byName = {};
    for(const r of DERE.roads){
      const o = byName[r.name] || (byName[r.name] = {name:r.name, n:0, now:0, ever:0, v:0});
      const segLen = r.cells.length ? r.len / r.cells.length : 0;
      for(const c of r.cells){
        tot++; o.n++;
        const v = cellVel(c, c % N);
        if(v){ const s = Math.hypot(v[0], v[1]); now++; o.now++; o.v += s; spd += s; ST.seenRoad.set(c, 1); }
        if(ST.seenRoad.get(c)){ ever++; o.ever++; everLen += segLen; }
      }
    }
    // bölge geneli (her 3. kara hücresi örneklenir)
    let land=0, lNow=0, lEver=0;
    for(let i=0;i<N*N;i+=3){
      if(sea[i]) continue; land++;
      if(cellVel(i, i % N)){ lNow++; ST.seenLand[i] = 1; }
      if(ST.seenLand[i]) lEver++;
    }
    const names = Object.values(byName);
    const flowNames = names.filter(o=>o.ever>0).sort((a,b)=>(b.ever/b.n)-(a.ever/a.n)).map(o=>o.name);
    return {nNames:names.length, flowNames, tot, everKm: everLen/1000, now:now/tot, ever:ever/tot, spd: now ? spd/now : 0, lNow: land ? lNow/land : 0, lEver: land ? lEver/land : 0,
            top: Object.values(byName).filter(o=>o.ever>0).sort((a,b)=>(b.ever/b.n)-(a.ever/a.n) || b.now-a.now).slice(0,5)};
  }

  const pct = x => "%" + fmt(x*100, x<0.1 ? 1 : 0);
  function render(){
    const body = $("dereBody"); if(!body) return;
    let box = document.getElementById("dereFlow");
    const r = compute();
    if(!r){ if(box) box.remove(); return; }
    if(!box || !body.contains(box)){ box = document.createElement("div"); box.id = "dereFlow"; body.appendChild(box); }
    const ratio = r.lEver > 0.002 ? r.ever / r.lEver : 0;
    box.innerHTML = `
      <div style="margin-top:10px;font-weight:600">💧 "Dere" adlı yollarda akış</div>
      <div class="compare">
        <div class="cmp"><div class="t"><span>Yağış boyunca akış görülen</span><b style="color:#7cc4ff">${pct(r.ever)}</b></div><div class="g"><i style="width:${r.ever*100}%;background:#7cc4ff"></i></div></div>
        <div class="cmp"><div class="t"><span>Bölgenin geneli</span><b>${pct(r.lEver)}</b></div><div class="g"><i style="width:${r.lEver*100}%;background:var(--accent)"></i></div></div>
      </div>
      <div class="muted">Şu an akan: ${pct(r.now)} (bölge geneli ${pct(r.lNow)}) · akış görülen yol ≈ ${fmt(r.everKm,1)} km</div>
      ${ratio>1.2 ? `<div class="big">Adında "dere" geçen yollarda akış, bölgenin geneline göre <b>${fmt(ratio,1)} kat</b> daha sık görülüyor.</div>`
        : S.simT>0 ? "" : `<div class="muted">Yağmur yağdıkça bu yollarda akış görülüp görülmediği burada karşılaştırılacak.</div>`}
      <div style="margin-top:6px"><span class="sw" style="background:${FLOW_COL};display:inline-block;width:16px;height:3px;border-radius:2px;vertical-align:middle"></span>
        <b> Akış görülen "dere" adlı yollar: ${r.flowNames.length} / ${r.nNames}</b></div>
      ${r.flowNames.length ? `<div class="muted" style="margin-top:2px;line-height:1.5">${r.flowNames.slice(0,14).join(" · ")}${r.flowNames.length>14?` · +${r.flowNames.length-14} yol daha`:""}</div>` : ""}
      ${r.top.length ? `<div style="margin-top:6px;font-weight:600">En çok akış görülen</div><ol>${r.top.map(o=>`<li>${o.name} <span>· akış görülen kısım ${pct(o.ever/o.n)}${o.now?" · şu an akıyor":""}</span></li>`).join("")}</ol>` : ""}
      <div class="muted" style="margin-top:4px">"Akış" = en az 1 mm su ve akış yönü belirgin (akış çizgisi çıkan hücre). Model ince su tabakasında hızı abartabildiği için hız gösterilmez.</div>`;
  }

  // yanlış eşleşmeleri ayıkla (dere verisi her yüklendiğinde)
  if(typeof loadDere === "function"){
    const origLoad = loadDere;
    loadDere = async function(){
      const r = await origLoad.apply(this, arguments);
      try{
        if(DERE && DERE.roads){
          DERE.roads = DERE.roads.filter(x => !EXCL.test(x.name||""));
          if(typeof dereLayer !== "undefined") dereLayer.eachLayer(l => { const t=l.getTooltip&&l.getTooltip(); if(t && EXCL.test(String(t.getContent()))) dereLayer.removeLayer(l); });
          drawDereOverlay(); updDereStats();
        }
      }catch(e){ console.warn("dere ad süzgeci", e); }
      return r;
    };
  }

  // haritada: yağış boyunca akış görülen kuru "dere" yolları ayrı renkte (su altındakiler kırmızı kalır)
  if(typeof drawDereOverlay === "function"){
    const origDraw = drawDereOverlay;
    drawDereOverlay = function(){
      const r = origDraw.apply(this, arguments);
      try{
        if(!DERE || !DERE.roads || !ST.seenRoad || !ST.seenRoad.size || !$("showRoads").checked || !dereCanvas) return r;
        const g = dereCanvas.getContext("2d"), f = dereCanvas.width/(N-1);
        g.lineCap = g.lineJoin = "round"; g.strokeStyle = FLOW_COL; g.lineWidth = 3.5;
        const seenNear = (x,y) => { for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){ const xx=x+dx, yy=y+dy; if(xx>=0&&yy>=0&&xx<N&&yy<N&&ST.seenRoad.get(yy*N+xx)) return true; } return false; };
        for(const rd of DERE.roads){
          for(let i=1;i<rd.pts.length;i++){
            const a=rd.pts[i-1].g, c=rd.pts[i].g, mx=Math.round((a[0]+c[0])/2), my=Math.round((a[1]+c[1])/2);
            if(mx<0||my<0||mx>=N||my>=N) continue;
            const j=my*N+mx; if(sea[j] || (d && d[j]>0.1)) continue;      // su altındaysa kırmızı kalsın
            if(!seenNear(mx,my)) continue;
            g.beginPath(); g.moveTo(a[0]*f,a[1]*f); g.lineTo(c[0]*f,c[1]*f); g.stroke();
          }
        }
        dereTex.needsUpdate = true;
      }catch(e){ console.warn("dere akış rengi", e); }
      return r;
    };
  }

  // lejanta satır ekle
  (function(){
    const rows = document.querySelectorAll(".legend .row");
    const red = [...rows].find(x => /su altında/.test(x.textContent));
    if(red && !document.getElementById("lgFlow")){
      const row = document.createElement("div"); row.className = "row"; row.id = "lgFlow";
      row.innerHTML = `<span class="sw" style="background:${FLOW_COL}"></span>"Dere" adlı yol (akış görüldü)`;
      red.after(row);
    }
  })();

  const orig = updDereStats;
  updDereStats = function(){
    const r = orig.apply(this, arguments);
    try{ render(); }catch(e){ console.warn("dere akış istatistiği", e); }
    return r;
  };
})();
