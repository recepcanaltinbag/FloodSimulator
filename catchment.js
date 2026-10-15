// Nokta drenaj alanı: tıklanan noktaya su toplayan alanı (havza) bulur, haritada boyar; alan, en uzun akış yolu,
// eğim, toplanma süresi (Kirpich) ve yağış şiddetine göre tepe debi (Rasyonel Yöntem: Q = C·i·A/3,6) ile 1 saatte
// toplanan hacmi gösterir. Akış yönleri lostcreeks.js'in D8 analizinden (LOSTCREEK.down, .acc) gelir.
// Not: yalnızca simülasyon penceresi içindeki alan sayılır; Rasyonel Yöntem küçük havzalar (≲5 km²) içindir.
// index.html'deki globallere (N, S, b, sea, REG, KARST, dereCanvas, dereTex, drawDereOverlay, fmt) dayanır.
(function(){
  const CA = window.CATCH = {cells:null, pour:-1, key:null, info:null, open:false};
  const css = document.createElement("style");
  css.textContent = `
    #catchBox{position:absolute;left:50%;top:12px;transform:translateX(-50%);z-index:6;width:min(360px,calc(100% - 24px));max-height:70%;overflow:auto;
      background:rgba(17,22,30,.96);border:1px solid var(--line);border-radius:12px;padding:10px 12px;font-size:12.5px;box-shadow:0 12px 30px rgba(0,0,0,.5)}
    #catchBox[hidden]{display:none}
    #catchBox .x{float:right;border:0;background:none;color:var(--muted);font-size:16px;cursor:pointer}
    #catchBox table{width:100%;border-collapse:collapse;margin-top:6px;font-variant-numeric:tabular-nums}
    #catchBox td,#catchBox th{padding:3px 4px;border-bottom:1px solid var(--line);text-align:right}
    #catchBox td:first-child,#catchBox th:first-child{text-align:left}
    #catchBox tr.cur td{color:var(--accent);font-weight:600}
    #catchBox .kv{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;margin-top:6px}
    #catchBox .kv b{text-align:right}
    #catchBox .sum{cursor:pointer;font-weight:700;font-size:13.5px;padding-right:22px}
    #catchBox .sum small{font-weight:500;color:var(--muted)}
    #catchBox .more[hidden]{display:none}
    #catchBox.compact{padding:8px 12px}
    #catchBox.at{transform:none}`;
  document.head.appendChild(css);
  const box = document.createElement("div"); box.id = "catchBox"; box.hidden = true;
  (document.getElementById("view") || document.body).appendChild(box);

  // akış katsayısı (C): zemin seçimine göre; karst modunda çok düşük
  function runoffC(){
    if(typeof KARST !== "undefined" && KARST.on) return {c:0.15, t:"karstik kireçtaşı"};
    const inf = S.inf;
    if(inf <= 0) return {c:0.95, t:"hiç emmeyen zemin"};
    if(inf <= 2) return {c:0.85, t:"beton / asfalt"};
    if(inf <= 8) return {c:0.6, t:"karışık kentsel"};
    return {c:0.35, t:"toprak / orman"};
  }

  function upstream(pour){
    const LC = window.LOSTCREEK, down = LC.down, n = N*N;
    // ters komşuluk (bağlı liste)
    const head = new Int32Array(n).fill(-1), next = new Int32Array(n).fill(-1);
    for(let i=0;i<n;i++){ const j = down[i]; if(j >= 0){ next[i] = head[j]; head[j] = i; } }
    const inC = new Uint8Array(n), dist = new Float32Array(n), q = [pour]; inC[pour] = 1;
    let far = pour;
    for(let h=0; h<q.length; h++){
      const j = q[h];
      for(let i=head[j]; i>=0; i=next[i]){
        if(inC[i]) continue; inC[i] = 1; q.push(i);
        const dx = Math.abs((i%N)-(j%N)), dy = Math.abs(Math.floor(i/N)-Math.floor(j/N));
        dist[i] = dist[j] + S.cell*((dx&&dy)?Math.SQRT2:1);
        if(dist[i] > dist[far]) far = i;
      }
    }
    return {inC, count:q.length, far, L:dist[far], list:q};
  }

  function show(gx, gy, pos){
    const LC = window.LOSTCREEK;
    if(!LC || !LC.down || !LC.acc){ alert("Akış yönleri henüz hesaplanmadı; bölge yüklendikten birkaç saniye sonra tekrar dene."); return; }
    let x = Math.round(gx), y = Math.round(gy);
    if(x<0||y<0||x>=N||y>=N){ alert("Bu nokta simülasyon alanının dışında. Önce alanı oraya kaydır."); return; }
    // en yakın akış hattına yapış (~4 hücre yarıçapta en büyük birikim)
    let pour = y*N+x;
    for(let dy=-4;dy<=4;dy++) for(let dx=-4;dx<=4;dx++){ if(dx*dx+dy*dy>16) continue; const xx=x+dx, yy=y+dy; if(xx<0||yy<0||xx>=N||yy>=N) continue; const j=yy*N+xx; if(!sea[j] && LC.acc[j] > LC.acc[pour]) pour = j; }
    if(sea[pour]){ alert("Deniz üzerinde drenaj alanı hesaplanmaz."); return; }
    const U = upstream(pour), H = (window.BURN && BURN.vis && BURN.vis.length===b.length) ? BURN.vis : b;
    const Ain = U.count*S.cell*S.cell;
    // pencere dışındaki yukarı havza: kenardan bu havzaya giren girişlerin alanı (havza girişi analizi, ~115 m)
    let Aext = 0, nIn = 0; const inflows = [];
    if(typeof UP !== "undefined" && UP.on && UP.R && UP.R.cls)
      for(const q of UP.R.cls){ if(q && q.cells && q.cells.some(c => U.inC[c])){ Aext += q.area; nIn++; inflows.push({i:q.i, side:q.side, area:q.area}); } }
    const A = Ain + Aext, Akm2 = A/1e6;
    const fmtA = a => a<1e6 ? fmt(a/1e4,1)+" ha" : fmt(a/1e6,2)+" km²";
    const drop = Math.max(0.5, H[U.far] - H[pour]), slope = Math.max(0.002, drop/Math.max(U.L, S.cell));
    const tc = 0.0195 * Math.pow(Math.max(U.L, S.cell), 0.77) * Math.pow(slope, -0.385);   // dk (Kirpich)
    let edge = false; for(const i of U.list){ const ix=i%N, iy=Math.floor(i/N); if(!ix||!iy||ix===N-1||iy===N-1){ edge = true; break; } }
    const C = runoffC();
    const rates = [20, 50, 80, 100]; if(!rates.includes(S.rate)) rates.push(S.rate); rates.sort((a,c)=>a-c);
    const rows = rates.map(i => { const Q = C.c*i*Akm2/3.6, V = C.c*i/1000*A; return `<tr class="${i===S.rate?"cur":""}"><td>${i} mm/sa${i===S.rate?" (şimdiki)":""}</td><td>${fmt(Q, Q<10?2:0)} m³/sn</td><td>${V>1e6?fmt(V/1e6,2)+" milyon":fmt(V)} m³</td></tr>`; }).join("");
    const p = (typeof px2ll==="function") ? px2ll(REG.x0+2*(pour%N)+1, REG.y0+2*Math.floor(pour/N)+1, REG.n) : null;
    CA.cells = U.inC; CA.pour = pour; CA.key = LC.down; CA.inflows = inflows;
    // dış havza büyükse "Yukarı havza" katmanını aç (çevrede dış havza sınırları ve dereler görünsün)
    const su = document.getElementById("showUp");
    if(Aext > 0 && su && !su.checked){ su.checked = true; su.dispatchEvent(new Event("change")); }
    const Qnow = C.c*S.rate*Akm2/3.6;
    box.className = CA.open ? "" : "compact";
    box.innerHTML = `<button class="x" title="Kapat">✕</button>
      <div class="sum">💧 ${fmtA(A)}${Aext>0?` <small>(dışarıdan +${fmtA(Aext)})</small>`:""} · ~${fmt(tc)} dk · <span style="color:var(--accent)">${S.rate} mm/sa'te ${fmt(Qnow, Qnow<10?2:0)} m³/sn</span>
        <small>${CA.open?"▴ gizle":"▾ ayrıntı"}</small></div>
      <div class="more" ${CA.open?"":"hidden"}>
      <div style="font-weight:700;font-size:14px;margin-top:6px">Drenaj alanı</div>
      <div class="muted">${p?`${p.lat.toFixed(5)}, ${p.lon.toFixed(5)} · `:""}çıkış noktası ${fmt(H[pour])} m</div>
      <div class="kv">
        <span>Drenaj alanı</span><b>${fmtA(A)}</b>
        ${Aext>0?`<span class="muted">· pencere içi / dışarıdan</span><b class="muted" style="font-weight:500">${fmtA(Ain)} + ${fmtA(Aext)}</b>`:""}
        <span>En uzun akış yolu</span><b>${fmt(U.L/1000,2)} km</b>
        <span>Ortalama eğim</span><b>%${fmt(slope*100,1)}</b>
        <span>Toplanma süresi (Kirpich)</span><b>~${fmt(tc)} dk</b>
        <span>Akış katsayısı (C)</span><b>${C.c} · ${C.t}</b>
      </div>
      <table><tr><th>Yağış</th><th>Tepe debi</th><th>1 saatte gelen su</th></tr>${rows}</table>
      <div class="muted" style="margin-top:6px;font-size:11px">Rasyonel Yöntem (Q = C·i·A/3,6): yağış, toplanma süresinden (~${fmt(tc)} dk) uzun sürerse tepe debiye ulaşılır.
        ${Akm2>5?"<b>Bu havza büyük; Rasyonel Yöntem debiyi abartabilir.</b> ":""}${Aext>0?`Pencere dışındaki ${nIn} girişten gelen ${fmtA(Aext)} yukarı havza alana eklendi (kaba ~115 m analiz); toplanma süresi yalnızca pencere içinden hesaplandı, gerçekte daha uzun olabilir. `:
          edge?"<b>Havza simülasyon alanının dışına taşıyor; dışarıdaki kısım sayılmadı</b> (Havzadan gelen su kapalı ya da henüz hesaplanmadı). ":""}
        Kanalizasyon ve zemin emmesi C katsayısıyla kabaca temsil edilir. Gösterim amaçlıdır.</div>
      </div>`;
    box.querySelector(".x").onclick = hide;
    box.querySelector(".sum").onclick = () => { CA.open = !CA.open; box.classList.toggle("compact", !CA.open);
      box.querySelector(".more").hidden = !CA.open; box.querySelector(".sum small").textContent = CA.open ? "▴ gizle" : "▾ ayrıntı"; if(CA.pos) place(CA.pos); };
    box.hidden = false;
    place(pos);
    drawDereOverlay();
  }
  // kutuyu sağ tıklanan yerin yanına koy (ekrandan taşmasın); konum yoksa üst ortada
  function place(pos){
    const view = box.parentElement, vr = view.getBoundingClientRect();
    if(!pos){ box.classList.remove("at"); box.style.left = ""; box.style.top = ""; return; }
    box.classList.add("at");
    const w = box.offsetWidth || 340, h = box.offsetHeight || 80;
    let x = pos.x - vr.left + 14, y = pos.y - vr.top + 14;
    if(x + w > vr.width - 8) x = pos.x - vr.left - w - 14;
    if(y + h > vr.height - 8) y = Math.max(8, vr.height - h - 8);
    box.style.left = Math.max(8, x) + "px"; box.style.top = Math.max(8, y) + "px";
    CA.pos = pos;
  }

  function hide(){ box.hidden = true; CA.cells = null; CA.pour = -1; drawDereOverlay(); }
  CA.show = show; CA.hide = hide;

  // haritada havzayı boya
  if(typeof drawDereOverlay === "function"){
    const o = drawDereOverlay;
    drawDereOverlay = function(){
      const r = o.apply(this, arguments);
      try{
        if(!CA.cells || !window.LOSTCREEK || CA.key !== LOSTCREEK.down || !dereCanvas) return r;
        const g = dereCanvas.getContext("2d"), f = dereCanvas.width/(N-1);
        g.save(); g.fillStyle = "rgba(255,196,60,0.16)";
        const C = CA.cells, edge = [];
        for(let i=0;i<N*N;i++){ if(!C[i]) continue; const x=i%N, y=(i-x)/N; g.fillRect(x*f-f/2, y*f-f/2, f, f);
          if(x===0||!C[i-1]) edge.push([x-.5,y-.5,x-.5,y+.5]); if(x===N-1||!C[i+1]) edge.push([x+.5,y-.5,x+.5,y+.5]);
          if(y===0||!C[i-N]) edge.push([x-.5,y-.5,x+.5,y-.5]); if(y===N-1||!C[i+N]) edge.push([x-.5,y+.5,x+.5,y+.5]); }
        // havza sınırı: koyu gölge + turuncu çizgi
        for(const [w,col] of [[5,"rgba(0,0,0,.55)"],[2.5,"#ffb020"]]){ g.lineWidth=w; g.strokeStyle=col; g.lineCap="round"; g.beginPath();
          for(const [a,b2,c,e] of edge){ g.moveTo(a*f,b2*f); g.lineTo(c*f,e*f); } g.stroke(); }
        // pencere dışından gelen yukarı havza: kenarda içeri bakan ok + alan etiketi
        for(const q of (CA.inflows||[])){
          if(q.area < 0.05e6) continue;              // çok küçük girişler kalabalık yapmasın
          const x = q.i % N, y = Math.floor(q.i / N), dv = [[1,0],[-1,0],[0,1],[0,-1]][q.side];
          const bx = x*f, by = y*f, L = f*(10 + 4*Math.log10(1 + q.area/1e6)), w = f*3.5;
          const tx = bx + dv[0]*L, ty = by + dv[1]*L, px2 = -dv[1]*w, py2 = dv[0]*w;
          g.beginPath(); g.moveTo(tx,ty); g.lineTo(bx+px2,by+py2); g.lineTo(bx+dv[0]*L*0.35,by+dv[1]*L*0.35); g.lineTo(bx-px2,by-py2); g.closePath();
          g.lineWidth = 4; g.strokeStyle = "rgba(0,0,0,.6)"; g.stroke(); g.fillStyle = "#ffb020"; g.fill();
          if(q.area < 0.5e6) continue;               // etiket yalnız büyük girişlerde
          const lab = `+${q.area>=1e6 ? fmt(q.area/1e6,1)+" km²" : fmt(q.area/1e4,0)+" ha"} yukarı havzadan`;
          g.font = "bold 22px system-ui"; g.textAlign = dv[0]>0 ? "left" : dv[0]<0 ? "right" : "center"; g.textBaseline = dv[1]>0 ? "top" : dv[1]<0 ? "bottom" : "middle";
          const lx = tx + dv[0]*8 + (dv[0]===0 ? 0 : 0), ly = ty + dv[1]*8;
          g.lineWidth = 5; g.strokeStyle = "rgba(0,0,0,.75)"; g.strokeText(lab, lx, ly); g.fillStyle = "#ffd27a"; g.fillText(lab, lx, ly);
        }
        const px = (CA.pour%N)*f, py = Math.floor(CA.pour/N)*f;
        g.fillStyle = "#ffb020"; g.strokeStyle = "#000"; g.lineWidth = 2; g.beginPath(); g.arc(px, py, 7, 0, 7); g.fill(); g.stroke();
        g.restore(); dereTex.needsUpdate = true;
      }catch(e){}
      return r;
    };
  }
  document.addEventListener("keydown", e => { if(e.key === "Escape" && !box.hidden) hide(); });
})();
