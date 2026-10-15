// "Dere" adlı yollarda akış istatistiği (hız gösterilmez: virtual-pipes modeli ince tabakada hızı abartır): adında dere geçen yollarda akan su (akış çizgisi çıkan hücre) bölgenin
// geneline göre ne kadar sık görülüyor? Hem anlık hem yağış boyunca (en az bir kez akış görülen) oran.
// index.html'deki globallere (DERE, d, sea, N, S, cellVel, updDereStats, fmt, $) dayanır; dere panelinin altına ekler.
(function(){
  if(typeof updDereStats !== "function" || typeof cellVel !== "function") return;
  const ST = window.DERESTAT = {key:null, seenRoad:null, seenLand:null, lastT:-1};

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
    return {tot, everKm: everLen/1000, now:now/tot, ever:ever/tot, spd: now ? spd/now : 0, lNow: land ? lNow/land : 0, lEver: land ? lEver/land : 0,
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
      ${r.top.length ? `<div style="margin-top:6px;font-weight:600">En çok akış görülen "dere" yolları</div><ol>${r.top.map(o=>`<li>${o.name} <span>· akış görülen kısım ${pct(o.ever/o.n)}${o.now?" · şu an akıyor":""}</span></li>`).join("")}</ol>` : ""}
      <div class="muted" style="margin-top:4px">"Akış" = en az 1 mm su ve akış yönü belirgin (akış çizgisi çıkan hücre). Model ince su tabakasında hızı abartabildiği için hız gösterilmez.</div>`;
  }

  const orig = updDereStats;
  updDereStats = function(){
    const r = orig.apply(this, arguments);
    try{ render(); }catch(e){ console.warn("dere akış istatistiği", e); }
    return r;
  };
})();
