// Kendi DEM'ini yükle: araştırmacı daha ayrıntılı ya da lisanslı bir yükseklik modelini (TanDEM-X 12 m, HGM 5–10 m,
// Pléiades/İHA DSM, FABDEM…) kendi çalışma alanı için kullanabilsin. Dosya hiçbir yere gönderilmez: tarayıcıda
// File/Blob olarak açılır ve geotiff.js yalnızca simülasyon penceresinin kapsadığı satırları okur (büyük dosyalar
// belleğe tümüyle alınmaz; varsa genel bakış/overview katmanı kullanılır).
// loadRegion, terrarium karolarından kurduğu 256×256 diziyi deniz maskesi, boşluk doldurma ve yumuşatmadan ÖNCE
// udemSample'a verir; DEM'in kapsadığı hücreler değiştirilir, gerisi (nodata, dışarısı) terrarium'da kalır.
// Böylece akış aşağısındaki her şey (dere işleme, karst/kapalı çukur, kayıp dereler, yukarı havza) aynen çalışır.
// index.html'deki globallere (S, P, N, SIZES, REG, pmap, pickSet, setSize, regionBounds, px2ll, loadRegion, $, fmt) dayanır.
(function(){
  if(typeof loadRegion !== "function" || typeof $ !== "function") return;
  const GEOTIFF_SRC = "https://cdn.jsdelivr.net/npm/geotiff@2.1.3/dist-browser/geotiff.js";
  const PROJ4_SRC = "https://cdnjs.cloudflare.com/ajax/libs/proj4js/2.11.0/proj4.js";
  const libs = {};
  function lib(src, glob){
    if(window[glob]) return Promise.resolve(window[glob]);
    return libs[src] || (libs[src] = new Promise((res, rej) => {
      const s = document.createElement("script"); s.src = src;
      s.onload = () => window[glob] ? res(window[glob]) : rej(new Error(glob));
      s.onerror = () => { delete libs[src]; rej(new Error("Okuma kütüphanesi indirilemedi (internet bağlantısını kontrol et).")); };
      document.head.appendChild(s);
    }));
  }

  let U = null;          // yüklü DEM
  let LAST = null;       // son yüklenen bölgede DEM'in katkısı {cov, res, cell, lvl}
  window.UDEM_TAG = "";
  Object.defineProperty(window, "UDEM", {get: () => U});

  // ---------- koordinat sistemi ----------
  const D2R = Math.PI/180, R = 6378137;
  const GEO_OK = [4326, 4258, 4269, 5252, 4979, 4937];
  function unsupported(code){
    return new Error(`Bu dosyanın koordinat sistemi (${code ? "EPSG:"+code : "tanımsız / özel"}) desteklenmiyor. ` +
      `Desteklenenler: EPSG:4326 (WGS84 enlem/boylam), UTM (EPSG:326xx/327xx), Web Mercator (EPSG:3857), ED50 UTM (EPSG:230xx), TUREF/TM (EPSG:5253–5259). ` +
      `Dönüştürmek için: gdalwarp -t_srs EPSG:4326 -r bilinear girdi.tif cikti.tif`);
  }
  async function crsOf(img){
    const k = img.getGeoKeys() || {};
    const pcs = k.ProjectedCSTypeGeoKey, gcs = k.GeographicTypeGeoKey, model = k.GTModelTypeGeoKey;
    if(model === 2 || (!pcs && gcs)){
      if(GEO_OK.includes(gcs) || (gcs === 32767 && [6326, 6258].includes(k.GeogGeodeticDatumGeoKey)))
        return {code: gcs === 32767 ? 4326 : gcs, geo: true, label: "WGS84 enlem/boylam", fwd: (lon, lat) => [lon, lat], inv: (x, y) => [x, y]};
      throw unsupported(gcs);
    }
    if(GEO_OK.includes(pcs)) return {code: pcs, geo: true, label: "WGS84 enlem/boylam", fwd: (lon, lat) => [lon, lat], inv: (x, y) => [x, y]};
    if([3857, 900913, 3785, 102100].includes(pcs))
      return {code: 3857, label: "Web Mercator", merc: true,
        fwd: (lon, lat) => [R*lon*D2R, R*Math.log(Math.tan(Math.PI/4 + lat*D2R/2))],
        inv: (x, y) => [x/R/D2R, (2*Math.atan(Math.exp(y/R)) - Math.PI/2)/D2R]};
    let def = null, label = "";
    if(pcs >= 32601 && pcs <= 32660){ const z = pcs - 32600; def = `+proj=utm +zone=${z} +datum=WGS84 +units=m +no_defs`; label = `UTM ${z}K`; }
    else if(pcs >= 32701 && pcs <= 32760){ const z = pcs - 32700; def = `+proj=utm +zone=${z} +south +datum=WGS84 +units=m +no_defs`; label = `UTM ${z}G`; }
    else if(pcs >= 23028 && pcs <= 23038){ const z = pcs - 23000; def = `+proj=utm +zone=${z} +ellps=intl +towgs84=-87,-98,-121,0,0,0,0 +units=m +no_defs`; label = `ED50 UTM ${z}K`; }
    else if(pcs >= 5253 && pcs <= 5259){ const l0 = 27 + 3*(pcs - 5253); def = `+proj=tmerc +lat_0=0 +lon_0=${l0} +k=1 +x_0=500000 +y_0=0 +ellps=GRS80 +units=m +no_defs`; label = `TUREF/TM${l0}`; }
    if(!def) throw unsupported(pcs);
    const proj4 = await lib(PROJ4_SRC, "proj4"), pr = proj4("EPSG:4326", def);
    return {code: pcs, label, fwd: (lon, lat) => pr.forward([lon, lat]), inv: (x, y) => pr.inverse([x, y])};
  }

  // ---------- dosyayı aç (yalnızca başlıklar) ----------
  async function openDEM(file){
    const GT = await lib(GEOTIFF_SRC, "GeoTIFF");
    let tiff, img;
    try{ tiff = await GT.fromBlob(file); img = await tiff.getImage(0); }
    catch(e){ throw new Error("GeoTIFF okunamadı. Dosya .tif/.tiff biçiminde bir yükseklik modeli mi? (" + (e.message || e) + ")"); }
    const spp = img.getSamplesPerPixel();
    if(spp > 1) throw new Error(`Bu dosyada ${spp} bant var (renkli görüntü olabilir). Tek bantlı yükseklik (DEM) GeoTIFF'i gerekli.`);
    const fmtc = (img.fileDirectory.SampleFormat || [1])[0];
    if(fmtc > 3) throw new Error("Karmaşık sayı veri tipi desteklenmiyor; Float32 ya da Int16 DEM gerekli.");
    let ox, oy, rx, ry;
    try{ [ox, oy] = img.getOrigin(); [rx, ry] = img.getResolution(); }
    catch(e){ throw new Error("Dosyada coğrafi konum bilgisi (GeoTIFF etiketleri) yok. Konumlu bir GeoTIFF gerekli."); }
    const crs = await crsOf(img);
    if((img.getGeoKeys() || {}).GTRasterTypeGeoKey === 2){ ox -= rx/2; oy -= ry/2; } // PixelIsPoint: köşeye çek
    const W = img.getWidth(), H = img.getHeight();
    // genel bakış katmanları (aynı dosyada sonraki IFD'ler; maskeler atlanır)
    const lv = [{img, f: 1, W, H}];
    const cnt = await tiff.getImageCount();
    for(let i = 1; i < cnt; i++){
      const im = await tiff.getImage(i);
      if((im.fileDirectory.NewSubfileType || 0) & 4) continue;
      if(im.getSamplesPerPixel() !== 1) continue;
      lv.push({img: im, f: W/im.getWidth(), W: im.getWidth(), H: im.getHeight()});
    }
    lv.sort((a, b) => a.f - b.f);
    // kapsam (enlem/boylam) ve metre cinsinden çözünürlük
    let s = 90, n = -90, w = 180, e = -180;
    for(let a = 0; a <= 8; a++) for(let b2 = 0; b2 <= 8; b2++){
      if(a && a < 8 && b2 && b2 < 8) continue;
      const [lon, lat] = crs.inv(ox + rx*W*a/8, oy + ry*H*b2/8);
      if(!isFinite(lon) || !isFinite(lat)) continue;
      s = Math.min(s, lat); n = Math.max(n, lat); w = Math.min(w, lon); e = Math.max(e, lon);
    }
    if(!(n > s && e > w) || n > 85 || s < -85) throw new Error("Dosyanın kapsamı enlem/boylama çevrilemedi; koordinat sistemi bilgisi hatalı olabilir.");
    const clat = (s + n)/2, clon = (w + e)/2;
    const resM = crs.geo ? Math.abs(rx)*111320*Math.cos(clat*D2R) : crs.merc ? Math.abs(rx)*Math.cos(clat*D2R) : Math.abs(rx);
    let nodata = img.getGDALNoData(); if(nodata !== null && !isFinite(nodata)) nodata = null;
    return {file, name: file.name, mb: file.size/1048576, tiff, lv, crs, W, H, ox, oy, rx, ry, nodata, resM,
      bbox: {s, n, w, e}, clat, clon, bits: img.getBitsPerSample(), fmtc, smooth: resM >= 25, cache: null};
  }

  const cellOf = (size, lat) => 156543.03*Math.cos(lat*D2R)/2**SIZES[size].z*2;
  function suggestSize(u){ for(const k of ["s", "m", "l"]) if(cellOf(k, u.clat) >= u.resM*0.9) return k; return "l"; }
  function overlaps(u, lat, lon, size){
    const [[s, w], [n, e]] = regionBounds(lat, lon, size);
    return !(n < u.bbox.s || s > u.bbox.n || e < u.bbox.w || w > u.bbox.e);
  }

  // ---------- örnekleme: loadRegion çağırır ----------
  // g: {n, x0, y0, lat} — pencere 512×512 Mercator pikseli, her hücre 2×2 piksel. nb yerinde değiştirilir.
  async function sample(nb, g, prog){
    if(!U){ LAST = null; return null; }
    const u = U, cellM = 156543.03*Math.cos(g.lat*D2R)/g.n*2;
    // seyrek kafes üzerinde tam dönüşüm, aradaki noktalar doğrusal (15 km'de UTM eğriliği ihmal edilir)
    const LT = 32, st = 512/LT, CC = new Float64Array((LT+1)*(LT+1)), RR = new Float64Array((LT+1)*(LT+1));
    let cmin = 1e18, cmax = -1e18, rmin = 1e18, rmax = -1e18;
    for(let j = 0; j <= LT; j++) for(let i = 0; i <= LT; i++){
      const ll = px2ll(g.x0 + i*st, g.y0 + j*st, g.n), [X, Y] = u.crs.fwd(ll.lon, ll.lat);
      const c = (X - u.ox)/u.rx, r = (Y - u.oy)/u.ry, k = j*(LT+1) + i;
      CC[k] = c; RR[k] = r;
      cmin = Math.min(cmin, c); cmax = Math.max(cmax, c); rmin = Math.min(rmin, r); rmax = Math.max(rmax, r);
    }
    if(cmax < 0 || rmax < 0 || cmin > u.W || rmin > u.H){ LAST = {cov: 0, cell: cellM}; return LAST; }
    // katman: hücre başına ≥2 örnek verecek en kaba overview; o da çok inceyse satır satır blok ortalaması (dec)
    const target = cellM/2;
    let lvl = u.lv[0]; for(const l of u.lv) if(u.resM*l.f <= target*1.05) lvl = l;
    const dec = Math.max(1, Math.floor(target/(u.resM*lvl.f))), eff = u.resM*lvl.f*dec;
    const ss = Math.max(1, Math.min(4, Math.round(cellM/eff)));
    const c0 = Math.max(0, Math.floor(cmin/lvl.f) - 2*dec), c1 = Math.min(lvl.W, Math.ceil(cmax/lvl.f) + 2*dec);
    const r0 = Math.max(0, Math.floor(rmin/lvl.f) - 2*dec), r1 = Math.min(lvl.H, Math.ceil(rmax/lvl.f) + 2*dec);
    const w = Math.ceil((c1 - c0)/dec), h = Math.ceil((r1 - r0)/dec);
    const key = [u.lv.indexOf(lvl), dec, c0, c1, r0, r1].join(",");
    let grid = u.cache && u.cache.key === key ? u.cache.grid : null;
    if(!grid){
      const msg = `Kendi DEM'in okunuyor… (${u.name})`;
      prog(msg, 0);
      const sum = new Float64Array(w*h), cnt = new Uint32Array(w*h), nd = u.nodata;
      const rowsPer = dec*Math.max(1, Math.floor(4e6/((c1 - c0)*dec)));   // parça başına ~4 M piksel
      for(let ra = r0; ra < r1; ra += rowsPer){
        const rb = Math.min(r1, ra + rowsPer);
        const [band] = await lvl.img.readRasters({window: [c0, ra, c1, rb], samples: [0]});
        const ww = c1 - c0;
        for(let y = ra; y < rb; y++){
          const oy = ((y - r0)/dec | 0)*w, base = (y - ra)*ww;
          for(let x = 0; x < ww; x++){
            const v = band[base + x];
            if(v !== v || v === nd || v < -1000 || v > 9000) continue;
            const o = oy + (x/dec | 0); sum[o] += v; cnt[o]++;
          }
        }
        prog(msg, (rb - r0)/(r1 - r0));
        if(U !== u) return null; // bu sırada vazgeçildi
      }
      grid = new Float32Array(w*h);
      for(let i = 0; i < w*h; i++) grid[i] = cnt[i] ? sum[i]/cnt[i] : NaN;
      u.cache = {key, grid};
    }
    // azaltılmış ızgarada çift doğrusal örnek (nodata komşular ağırlıktan düşer)
    const bil = (c, r) => {
      const fx = (c/lvl.f - c0)/dec - 0.5, fy = (r/lvl.f - r0)/dec - 0.5;
      if(fx < -0.5 || fy < -0.5 || fx > w - 0.5 || fy > h - 0.5) return NaN;
      const x0 = Math.max(0, Math.min(w - 1, Math.floor(fx))), y0 = Math.max(0, Math.min(h - 1, Math.floor(fy)));
      const x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1);
      const tx = Math.max(0, Math.min(1, fx - x0)), ty = Math.max(0, Math.min(1, fy - y0));
      let s = 0, ws = 0;
      const add = (i, wt) => { const v = grid[i]; if(v === v && wt > 0){ s += v*wt; ws += wt; } };
      add(y0*w + x0, (1-tx)*(1-ty)); add(y0*w + x1, tx*(1-ty)); add(y1*w + x0, (1-tx)*ty); add(y1*w + x1, tx*ty);
      return ws >= 0.25 ? s/ws : NaN;
    };
    let rep = 0;
    for(let y = 0; y < N; y++) for(let x = 0; x < N; x++){
      let s = 0, c = 0;
      for(let b2 = 0; b2 < ss; b2++) for(let a = 0; a < ss; a++){
        const gx = (2*x + (a + 0.5)*2/ss)/st, gy = (2*y + (b2 + 0.5)*2/ss)/st;
        const i0 = Math.min(LT - 1, gx | 0), j0 = Math.min(LT - 1, gy | 0), tx = gx - i0, ty = gy - j0, k = j0*(LT+1) + i0;
        const cc = (CC[k]*(1-tx) + CC[k+1]*tx)*(1-ty) + (CC[k+LT+1]*(1-tx) + CC[k+LT+2]*tx)*ty;
        const rr = (RR[k]*(1-tx) + RR[k+1]*tx)*(1-ty) + (RR[k+LT+1]*(1-tx) + RR[k+LT+2]*tx)*ty;
        const v = bil(cc, rr); if(v === v){ s += v; c++; }
      }
      if(c*2 >= ss*ss){ nb[y*N + x] = s/c; rep++; }
    }
    LAST = {cov: rep/(N*N), res: eff, cell: cellM, lvl: u.lv.indexOf(lvl), dec, smooth: u.smooth};
    return LAST;
  }
  window.udemSample = sample;

  // ---------- arayüz ----------
  let foot = null; // seçim haritasında DEM kapsamı
  const esc = s => String(s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"})[c]);
  const m1 = v => fmt(v, v < 10 ? 1 : 0);
  function mount(el, where){
    el.innerHTML = `<label class="udem-drop"><input type="file" accept=".tif,.tiff,image/tiff" hidden>
      <b>⛰️ Kendi DEM'ini yükle (GeoTIFF)</b>
      <small>Dosya bilgisayarından çıkmaz, sadece tarayıcıda okunur. Tek bantlı; EPSG:4326, UTM, 3857, TUREF/TM.</small></label>
      <div class="udem-info" hidden></div>`;
    const drop = el.querySelector(".udem-drop"), inp = el.querySelector("input");
    inp.onchange = () => { if(inp.files[0]) use(inp.files[0], where); inp.value = ""; };
    drop.addEventListener("dragover", e => { e.preventDefault(); drop.classList.add("over"); });
    drop.addEventListener("dragleave", () => drop.classList.remove("over"));
    drop.addEventListener("drop", e => { e.preventDefault(); drop.classList.remove("over"); const f = e.dataTransfer.files[0]; if(f) use(f, where); });
  }
  const boxes = () => [$("udemPk"), $("udemSet")].filter(Boolean);
  function info(html){ for(const b of boxes()){ const i = b.querySelector(".udem-info"); i.hidden = !html; i.innerHTML = html || ""; wire(i); } }
  function wire(i){
    const bt = i.querySelector("[data-a=reset]"); if(bt) bt.onclick = reset;
    const sm = i.querySelector("[data-a=smooth]"); if(sm) sm.onchange = () => { if(!U) return; U.smooth = sm.checked; render(); if(LAST && LAST.cov > 0 && S.loaded) loadRegion(); };
    const sz = i.querySelector("[data-a=size]"); if(sz) sz.onclick = () => { setSize(sz.dataset.k); pickSet(P.lat, P.lon, P.name, true); render(); };
  }
  function render(){
    if(!U){ info(""); badge(); return; }
    const u = U, sug = suggestSize(u), pkCell = cellOf(P.size, u.clat);
    const ov = u.lv.length > 1 ? ` · ${u.lv.length - 1} genel bakış katmanı` : "";
    const typ = (u.fmtc === 3 ? "Float" : u.fmtc === 2 ? "Int" : "UInt") + u.bits;
    let h = `<b>✅ ${esc(u.name)}</b><br><span class="muted">${m1(u.mb)} MB · ${u.crs.label} (EPSG:${u.crs.code}) · ${typ} · ${fmt(u.W)}×${fmt(u.H)} px${ov}<br>` +
      `Çözünürlük ≈ <b>${m1(u.resM)} m</b> · nodata: ${u.nodata === null ? "yok" : u.nodata}</span>`;
    h += `<br>Önerilen alan: <b>${SIZES[sug].t}</b> (hücre ≈ ${fmt(cellOf(sug, u.clat))} m)` +
      (P.size !== sug ? ` <button class="btn ghost sm" data-a="size" data-k="${sug}">${SIZES[sug].t}'e geç</button>` : "") +
      `<br><span class="muted">Seçili alan: hücre ≈ ${fmt(pkCell)} m${u.resM > pkCell*1.2 ? " — DEM'den kaba; hücreler DEM'den çift doğrusal enterpolasyonla doldurulur" : ""}</span>`;
    if(LAST && LAST.cell) h += `<br><span class="muted">Yüklü bölge: ${LAST.cov > 0 ? `%${fmt(LAST.cov*100)} kapsama · okunan ${m1(LAST.res)} m${LAST.lvl ? ` (genel bakış ${LAST.lvl})` : ""}` : "bu pencerede DEM verisi yok (varsayılan yükseklik kullanıldı)"}</span>`;
    h += `<label class="udem-sm"><input type="checkbox" data-a="smooth"${u.smooth ? " checked" : ""}> 3×3 yumuşatma <span class="muted">(SRTM gürültüsü için; ayrıntılı DEM'de kapalı önerilir)</span></label>` +
      `<span class="muted" style="font-size:10.5px">TanDEM-X gibi elipsoit yükseklikli DEM'lerde deniz ≈ +35–40 m görünür; önce geoide çevir. DEM'in kapsamadığı ve nodata hücreler varsayılan yükseklikten gelir.</span>` +
      `<br><button class="btn ghost sm" data-a="reset" style="margin-top:6px">↩︎ Varsayılan DEM'e dön</button>`;
    info(h); badge();
  }
  function badge(){
    const on = U && LAST && LAST.cov > 0;
    const txt = on ? `Yükseklik: kendi DEM'in (${m1(U.resM)} m)${LAST.cov < 0.995 ? ` · %${fmt(LAST.cov*100)} kapsama` : ""}` : "";
    window.UDEM_TAG = on ? `<br><span style="color:var(--amber)">⛰️ ${txt}</span>` : "";
    const b = $("demBadge"); if(!b) return;
    b.hidden = !U;
    b.innerHTML = !U ? "" : (on ? `⛰️ ${txt}` : `⛰️ Kendi DEM'in yüklü, bu alanda verisi yok`) + ` · <a href="#" id="demReset">varsayılana dön</a>`;
    const a = $("demReset"); if(a) a.onclick = e => { e.preventDefault(); reset(); };
    if(typeof updStats === "function" && S.loaded) try{ updStats(); }catch(e){}
  }
  function drawFoot(){
    if(foot){ foot.remove(); foot = null; }
    if(!U || typeof pmap === "undefined") return;
    foot = L.rectangle([[U.bbox.s, U.bbox.w], [U.bbox.n, U.bbox.e]], {color: "#ffb020", weight: 2, fillOpacity: .06, interactive: false}).addTo(pmap);
  }
  function reset(){
    const used = LAST && LAST.cov > 0;
    U = null; LAST = null; drawFoot(); render();
    if(used && S.loaded) loadRegion();
  }
  async function use(file, where){
    info(`<span class="muted">⏳ ${esc(file.name)} açılıyor…</span>`);
    let u;
    try{ u = await openDEM(file); }
    catch(e){ console.warn(e); info(`<span style="color:var(--warn)">⚠️ ${esc(e.message || e)}</span>`); return; }
    U = u; LAST = null; drawFoot();
    const sug = suggestSize(u);
    if(where === "picker"){
      setSize(sug);
      if(!overlaps(u, P.lat, P.lon, P.size)) pickSet(u.clat, u.clon, "Kendi DEM'im: " + u.name.replace(/\.tiff?$/i, ""), true);
      else pickSet(P.lat, P.lon, P.name, true);
      render();
    } else {
      S.size = sug; setSize(sug);
      if(!overlaps(u, S.lat, S.lon, S.size)){ S.lat = u.clat; S.lon = u.clon; S.name = "Kendi DEM'im: " + u.name.replace(/\.tiff?$/i, ""); }
      P.lat = S.lat; P.lon = S.lon; P.name = S.name;
      render();
      if(typeof setDrawer === "function") setDrawer(false);
      if(typeof MM !== "undefined" && MM.on && typeof mmHide === "function") mmHide();
      await loadRegion();
    }
  }
  window.udemLoaded = () => render(); // loadRegion sonunda: kapsama bilgisini güncelle
  for(const b of boxes()) mount(b, b.id === "udemPk" ? "picker" : "settings");
})();
