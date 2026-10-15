// Dereleri araziye işleme (stream burning): SRTM bir yüzey modelidir; köprüler ve viyadükler arazide set gibi
// görünür ve simülasyonda suyu barajlar. OSM dere çizgileri boyunca yükseklik profili, akış yönünde hiç
// yükselmeyecek şekilde (kümülatif en küçük değer) düzeltilir. Yalnızca simülasyonun kullandığı b dizisi
// değişir; 3B görüntü özgün yükseklikleri kullanmaya devam eder, böylece köprü görünür kalır ve su altından geçer.
// index.html'deki globallere (b, sea, N, REG, DERE, loadDere, rebuildTerrainZ, karstPrep) dayanır.
(function(){
  if(typeof loadDere !== "function") return;
  const MAX_CUT = 30;     // m: bundan derin kesik gerekiyorsa veri uyumsuzluğu sayılır, kesilmez
  const BURN = window.BURN = {on:true, vis:null, reg:null, cells:0, maxCut:0, lines:0};

  // polyline (ızgara koordinatı) → 4-komşu bağlantılı hücre dizisi
  function rasterize(pts){
    const out=[];
    const add=(x,y)=>{
      if(x<0||y<0||x>=N||y>=N) return;
      const i=y*N+x, last=out[out.length-1];
      if(i===last) return;
      if(last!==undefined){
        const lx=last%N, ly=(last-lx)/N;
        if(Math.abs(lx-x)===1 && Math.abs(ly-y)===1){
          // çapraz adım: aradaki iki hücreden alçak olanı da ekle ki kanal kesintisiz olsun
          const a=ly*N+x, c=y*N+lx;
          out.push(BURN.vis[a] <= BURN.vis[c] ? a : c);
        }
      }
      out.push(i);
    };
    for(let k=1;k<pts.length;k++){
      const [x0,y0]=pts[k-1], [x1,y1]=pts[k];
      const n=Math.max(1, Math.ceil(Math.hypot(x1-x0,y1-y0)*2));
      for(let s=0;s<=n;s++){ const t=s/n; add(Math.round(x0+(x1-x0)*t), Math.round(y0+(y1-y0)*t)); }
    }
    return out;
  }

  function burnLine(cells){
    // akış yönü: yüksek uçtan alçak uca
    if(cells.length<3) return;
    const h0=BURN.vis[cells[0]], h1=BURN.vis[cells[cells.length-1]];
    const seq = h0 >= h1 ? cells : cells.slice().reverse();
    let m=Infinity;
    for(const i of seq){
      if(sea[i]){ m=Math.min(m,0); continue; }
      const h=b[i];
      if(h<=m){ m=h; continue; }
      const cut=h-m;
      if(cut>MAX_CUT){ m=h; continue; }   // uyumsuz veri: profili buradan yeniden başlat
      b[i]=m; BURN.cells++; if(cut>BURN.maxCut) BURN.maxCut=cut;
    }
    BURN.lines++;
  }

  function burn(){
    if(!BURN.on || !DERE || !DERE.ways || !b || !REG) return;
    // bölge her yüklendiğinde özgün yüksekliklerin kopyası (görüntü için)
    if(BURN.reg !== REG || !BURN.vis || BURN.vis.length !== b.length){ BURN.vis = Float32Array.from(b); BURN.reg = REG; }
    else b.set(BURN.vis);                  // aynı bölgede yeniden işlerken özgünden başla
    BURN.cells=0; BURN.maxCut=0; BURN.lines=0;
    for(const w of DERE.ways){
      if(!w.pts || w.pts.length<2) continue;
      burnLine(rasterize(w.pts.map(p=>p.g)));
    }
    if(typeof karstPrep==="function"){ try{ karstPrep(); }catch(e){ console.warn("karstPrep", e); } }
    if(typeof updateWaterMesh==="function") updateWaterMesh();
  }
  BURN.burn = burn;

  // dere verisi her yüklendiğinde işle
  const origLoadDere = loadDere;
  loadDere = async function(){
    const r = await origLoadDere.apply(this, arguments);
    try{ burn(); }catch(e){ console.warn("Dere işleme başarısız", e); }
    return r;
  };

  // 3B arazi görüntüsü özgün yükseklikleri kullansın (köprü görünür kalsın)
  if(typeof rebuildTerrainZ === "function"){
    const origRebuild = rebuildTerrainZ;
    rebuildTerrainZ = function(){
      if(BURN.vis && BURN.reg === REG && BURN.vis.length === b.length){
        const keep = b; b = BURN.vis;
        try{ return origRebuild.apply(this, arguments); } finally { b = keep; }
      }
      return origRebuild.apply(this, arguments);
    };
  }

  // ayar: Görünüm bölümüne "Dereleri araziye işle" anahtarı
  function addToggle(){
    const tex = document.getElementById("tex"); if(!tex) return;
    const host = tex.closest(".ctrl") || tex.parentElement;
    const box = document.createElement("div"); box.className = "ctrl";
    box.innerHTML = `<label style="justify-content:flex-start;gap:8px;cursor:pointer"><input type="checkbox" id="burnOn" checked> Dereleri araziye işle</label>
      <p class="sub" id="burnInfo" style="margin-top:4px">Uydu yükseklik verisinde köprü ve viyadükler set gibi görünür; açıkken OSM dereleri boyunca arazi düzeltilir, su köprünün altından geçer.</p>`;
    host.after(box);
    document.getElementById("burnOn").onchange = e => {
      BURN.on = e.target.checked;
      if(!BURN.vis || BURN.reg !== REG) return;
      if(BURN.on) burn(); else { b.set(BURN.vis); if(typeof karstPrep==="function") karstPrep(); }
    };
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", addToggle); else addToggle();
})();
