// Bulutlu uydu karoları: Esri World Imagery bazı yerlerde bulutlu çekimler içerir. "Otomatik" modda her karoda
// bulut oranı ölçülür; bulutluysa önce Esri Wayback arşivinden farklı yıllara ait çekimler, o da olmazsa
// Sentinel-2 bulutsuz mozaik (EOX, 10 m) denenir ve en az bulutlu olan kullanılır.
// Kaynaklar: Esri World Imagery / Wayback (© Esri ve sağlayıcıları), Sentinel-2 cloudless by EOX (Copernicus Sentinel verisi).
// index.html'deki globallere (compose, loadBitmap, SAT_URL) dayanır.
(function(){
  if(typeof compose !== "function" || typeof SAT_URL === "undefined") return;
  const S2 = (z,x,y) => `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2023_3857/default/g/${z}/${y}/${x}.jpg`;
  const CF = window.CLOUDFIX = {mode:"auto", releases:[], fixed:0, s2:0, ready:null};
  try{ CF.mode = localStorage.getItem("satMode") || "auto"; }catch(e){}

  // Wayback sürümleri: her yıldan en yenisi, yeniden eskiye (en güncel sürüm zaten ana Esri katmanı)
  CF.ready = fetch("https://s3-us-west-2.amazonaws.com/config.maptiles.arcgis.com/waybackconfig.json")
    .then(r => r.json()).then(j => {
      const byYear = {};
      for(const [id, v] of Object.entries(j)){
        const m = /(\d{4})-(\d{2})-(\d{2})/.exec(v.itemTitle || ""); if(!m) continue;
        const y = +m[1], date = m[0];
        if(!byYear[y] || byYear[y].date < date) byYear[y] = {id, date, url: v.itemURL};
      }
      CF.releases = Object.values(byYear).sort((a,b) => b.date.localeCompare(a.date)).slice(1, 7);  // son 6 yıl (güncel hariç)
    }).catch(() => { CF.releases = []; });

  // bulut oranı: 32×32 örnekte açık renkli (beyaz/gri) ve doygunluğu düşük piksellerin payı
  const probe = document.createElement("canvas"); probe.width = probe.height = 32;
  const pg = probe.getContext("2d", {willReadFrequently:true});
  function cloudiness(im){
    try{
      pg.clearRect(0,0,32,32); pg.drawImage(im, 0, 0, 32, 32);
      const p = pg.getImageData(0,0,32,32).data; let c = 0, n = 0;
      for(let i=0;i<p.length;i+=4){ const r=p[i], g=p[i+1], b=p[i+2]; if(p[i+3] < 10) continue; n++;
        const mn = Math.min(r,g,b), mx = Math.max(r,g,b); if(mn > 175 && mx - mn < 28) c++; }
      return n ? c/n : 0;
    }catch(e){ return 0; }
  }
  const tryLoad = (url, hi) => loadBitmap(url, hi).catch(() => null);

  async function bestTile(z, x, y, hi){
    const main = await tryLoad(SAT_URL(z,x,y), hi);
    if(!main) return tryLoad(S2(z,x,y), hi);
    const c0 = cloudiness(main);
    if(c0 < 0.2) return main;
    await CF.ready;
    let best = main, bc = c0;
    for(const r of CF.releases){
      const im = await tryLoad(r.url.replace("{level}", z).replace("{row}", y).replace("{col}", x), hi);
      if(!im) continue;
      const c = cloudiness(im);
      if(c < bc - 0.05){ best = im; bc = c; }
      if(bc < 0.08) break;
    }
    if(bc >= 0.2){ const im = await tryLoad(S2(z,x,y), hi); if(im){ const c = cloudiness(im); if(c < bc - 0.05){ best = im; bc = c; CF.s2++; } } }
    if(best !== main) CF.fixed++;
    return best;
  }

  const origCompose = compose;
  compose = async function(z, x0, y0, size, urlFn, hi, onProg, filter){
    if(urlFn !== SAT_URL || CF.mode === "esri") return origCompose.apply(this, arguments);
    if(CF.mode === "s2") return origCompose.call(this, z, x0, y0, size, S2, hi, onProg, filter);
    // otomatik: karo karo en az bulutlu kaynak
    const tx0=Math.floor(x0/256), ty0=Math.floor(y0/256), tx1=Math.floor((x0+size-1)/256), ty1=Math.floor((y0+size-1)/256);
    const cnv=document.createElement("canvas"); cnv.width=cnv.height=size;
    const g=cnv.getContext("2d"); if(filter) g.filter=filter;
    const total=(tx1-tx0+1)*(ty1-ty0+1), jobs=[]; let done=0;
    for(let ty=ty0;ty<=ty1;ty++) for(let tx=tx0;tx<=tx1;tx++)
      jobs.push(bestTile(z,tx,ty,hi).then(im=>{ if(im) g.drawImage(im,tx*256-x0,ty*256-y0); onProg&&onProg(++done/total); }));
    await Promise.all(jobs);
    return cnv;
  };

  // ayar: Görünüm bölümüne "Uydu görüntüsü" seçimi
  function addSelect(){
    const tex = document.getElementById("tex"); if(!tex || document.getElementById("satMode")) return;
    const host = tex.closest(".ctrl") || tex.parentElement;
    const box = document.createElement("div"); box.className = "ctrl";
    box.innerHTML = `<label>Uydu görüntüsü</label>
      <select id="satMode">
        <option value="auto">Otomatik: bulutlu yerlerde eski tarihli çekim</option>
        <option value="esri">Esri güncel (bulut olabilir)</option>
        <option value="s2">Sentinel-2 bulutsuz mozaik (10 m, bulanık)</option>
      </select>
      <p class="sub" id="satInfo" style="margin-top:4px"></p>`;
    host.after(box);
    const sel = document.getElementById("satMode"); sel.value = CF.mode;
    sel.onchange = () => { CF.mode = sel.value; try{ localStorage.setItem("satMode", CF.mode); }catch(e){}
      if(typeof S !== "undefined" && S.loaded && typeof loadRegion === "function"){ CF.fixed = 0; CF.s2 = 0; loadRegion(); } };
    setInterval(() => { const i = document.getElementById("satInfo"); if(i) i.textContent = CF.mode === "auto" && CF.fixed ? `☁️ ${CF.fixed} bulutlu karo değiştirildi${CF.s2?` (${CF.s2}'i Sentinel-2)`:""}.` : ""; }, 1000);
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", addSelect); else addSelect();
})();
