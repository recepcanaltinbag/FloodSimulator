// Sonuçları dışa aktar: KML (Google My Maps / Google Earth), GeoJSON (QGIS / ArcGIS), CSV (nokta listesi).
// Katmanlar: taşkın izi (derinlik sınıflarına göre), su batabilecek yerler (gölü olmayan kapalı çukurlar, düdenler),
// olası eski dere yatakları, akış görülen "dere" adlı yollar. Dosya yalnızca tarayıcıda üretilir, hiçbir yere gönderilmez.
// index.html ve eklentilerdeki globallere (REG, N, S, d, sea, px2ll, DEPR, KARST, DERE, FLOODTRACE, LOSTCREEK, DERESTAT, fmt, $) dayanır.
(function(){
  if(typeof px2ll !== "function") return;
  const g = (typeof globalThis !== "undefined") ? globalThis : window;

  // ızgara (hücre merkezi x,y; kenar için ±0,5) → [boylam, enlem]
  const ll = (x, y) => { const p = px2ll(REG.x0 + 2*x + 1, REG.y0 + 2*y + 1, REG.n); return [+p.lon.toFixed(6), +p.lat.toFixed(6)]; };

  // satır satır kesintisiz hücre dizilerini dikdörtgen çokgenlere çevir (basit ve her araçta açılır)
  function runsToPolys(mask){
    const polys = [];
    for(let y=0;y<N;y++){
      let x=0;
      while(x<N){
        if(!mask[y*N+x]){ x++; continue; }
        const x0=x; while(x<N && mask[y*N+x]) x++;
        const a=ll(x0-0.5,y-0.5), b=ll(x-0.5,y-0.5), c=ll(x-0.5,y+0.5), e=ll(x0-0.5,y+0.5);
        polys.push([[a,b,c,e,a]]);
      }
    }
    return polys;
  }

  function collect(){
    if(!REG || !d) return null;
    const F = [];
    const meta = {
      bolge: S.name, merkez: `${S.lat.toFixed(5)}, ${S.lon.toFixed(5)}`,
      senaryo: `${S.rate} mm/sa · ${S.durH} sa`, simulasyon_suresi_dk: Math.round(S.simT/60),
      tarih: new Date().toISOString().slice(0,16).replace("T"," "),
      kaynak: "Yağış ve Sel Simülasyonu · recepcanaltinbag.github.io/FloodSimulator",
      uyari: "Gösterim amaçlıdır, resmî taşkın tahmini değildir. SRTM tabanlı ~30 m arazi; kanalizasyon ve binalar basitleştirilmiştir."
    };

    // 1) taşkın izi (en yüksek derinlik; FLOODTRACE yoksa şimdiki su)
    const FT = window.FLOODTRACE || null;
    const M = FT && FT.max && FT.max.length === d.length ? FT.max : d;
    const classes = [[0.1,0.5,"10–50 cm","#9cd2ff"],[0.5,1,"0,5–1 m","#4ea8ff"],[1,1e9,"1 m üstü","#1a5fd0"]];
    for(const [lo,hi,lab,col] of classes){
      const mask = new Uint8Array(N*N); let n=0;
      for(let i=0;i<N*N;i++) if(!sea[i] && M[i]>=lo && M[i]<hi){ mask[i]=1; n++; }
      if(!n) continue;
      F.push({type:"Feature", properties:{katman:"Taşkın izi", sinif:lab, renk:col, alan_km2:+(n*S.cell*S.cell/1e6).toFixed(3)},
        geometry:{type:"MultiPolygon", coordinates:runsToPolys(mask)}});
    }

    // 2) su batabilecek yerler: gölü olmayan kapalı çukurlar + düdenler
    const DP = typeof DEPR !== "undefined" ? DEPR : null;
    if(DP && DP.list){
      for(const dp of DP.list){
        if(dp.lake !== false || dp.art) continue;
        const x = dp.low % N, y = Math.floor(dp.low / N);
        F.push({type:"Feature", properties:{katman:"Su batabilecek yer", tur:"Kapalı çukur (haritada göl yok)", renk:"#c084fc",
          derinlik_m:+(dp.mx||0).toFixed(1), hacim_m3:Math.round((dp.vol||0)*S.cell*S.cell), alan_m2:dp.cnt?Math.round(dp.cnt*S.cell*S.cell):null},  // DEPR.vol = Σ derinlik (hücre başına)
          geometry:{type:"Point", coordinates:ll(x,y)}});
      }
    }
    const KS = typeof KARST !== "undefined" ? KARST : null;
    if(KS && KS.on && KS.ponors){
      for(const i of KS.ponors){ const x=i%N, y=Math.floor(i/N);
        F.push({type:"Feature", properties:{katman:"Su batabilecek yer", tur:"Düden (karst modu, varsayılan)", renk:"#3fd6d6"}, geometry:{type:"Point", coordinates:ll(x,y)}}); }
    }

    // 3) olası eski dere yatakları: aday hücreleri akış yönünde çizgilere birleştir
    const LC = window.LOSTCREEK || null;
    if(LC && LC.cand && LC.down){
      const {cand, down} = LC, start = new Uint8Array(N*N);
      // başlangıç: kendisine aday akmayan aday hücreler
      const inc = new Uint8Array(N*N); for(let i=0;i<N*N;i++) if(cand[i] && down[i]>=0 && cand[down[i]]) inc[down[i]]=1;
      const used = new Uint8Array(N*N), lines=[];
      for(let i=0;i<N*N;i++){
        if(!cand[i] || inc[i]) continue;
        const pts=[]; let j=i, guard=0;
        while(j>=0 && cand[j] && !used[j] && guard++<N*N){ used[j]=1; pts.push(ll(j%N, Math.floor(j/N))); j=down[j]; }
        if(j>=0) pts.push(ll(j%N, Math.floor(j/N)));
        if(pts.length>=2) lines.push(pts);
      }
      if(lines.length) F.push({type:"Feature", properties:{katman:"Olası eski dere yatağı", renk:"#c084fc",
        not:"Araziden akış birikimi ≥0,25 km², OSM'de dere yok (çıkarım)", uzunluk_km:+(LC.km||0).toFixed(2)},
        geometry:{type:"MultiLineString", coordinates:lines}});
    }

    // 4) akış görülen "dere" adlı yollar
    const ST = window.DERESTAT || null;
    if(DERE && DERE.roads && ST && ST.byName){
      const byName = {};
      for(const r of DERE.roads){ const o = ST.byName[r.name]; if(!o || !o.ever) continue;
        (byName[r.name] = byName[r.name] || {o, lines:[]}).lines.push(r.pts.map(p=>[+p.lon.toFixed(6), +p.lat.toFixed(6)])); }
      for(const [name, v] of Object.entries(byName))
        F.push({type:"Feature", properties:{katman:"Akış görülen \"dere\" adlı yol", ad:name, renk:"#3fe0a8",
          akis_gorulen_oran:+(v.o.ever/v.o.n).toFixed(2)},
          geometry:{type:"MultiLineString", coordinates:v.lines}});
    }
    return {meta, F};
  }

  // ---- biçimler ----
  const esc = s => String(s).replace(/[<>&"]/g, c => ({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;"}[c]));
  const kmlColor = (hex, a) => { const h=hex.replace("#",""); return a + h.slice(4,6) + h.slice(2,4) + h.slice(0,2); }; // aabbggrr
  function toKML({meta, F}){
    const styles = new Map(); const sid = (col,kind) => { const k=col+kind; if(!styles.has(k)) styles.set(k, {id:"s"+styles.size, col, kind}); return styles.get(k).id; };
    const coord = c => c.map(p=>`${p[0]},${p[1]},0`).join(" ");
    const geom = gm => {
      if(gm.type==="Point") return `<Point><coordinates>${gm.coordinates[0]},${gm.coordinates[1]},0</coordinates></Point>`;
      if(gm.type==="MultiLineString") return `<MultiGeometry>${gm.coordinates.map(l=>`<LineString><tessellate>1</tessellate><coordinates>${coord(l)}</coordinates></LineString>`).join("")}</MultiGeometry>`;
      if(gm.type==="MultiPolygon") return `<MultiGeometry>${gm.coordinates.map(p=>`<Polygon><outerBoundaryIs><LinearRing><coordinates>${coord(p[0])}</coordinates></LinearRing></outerBoundaryIs></Polygon>`).join("")}</MultiGeometry>`;
      return "";
    };
    const folders = {};
    for(const f of F){
      const p=f.properties, kind=f.geometry.type==="Point"?"pt":f.geometry.type==="MultiPolygon"?"poly":"line";
      const name = p.ad || p.sinif || p.tur || p.katman;
      const desc = Object.entries(p).filter(([k,v])=>v!==undefined && !["renk"].includes(k)).map(([k,v])=>`${esc(k)}: ${esc(v)}`).join("<br>");
      (folders[p.katman] = folders[p.katman] || []).push(`<Placemark><name>${esc(name)}</name><description><![CDATA[${desc}]]></description><styleUrl>#${sid(p.renk,kind)}</styleUrl>${geom(f.geometry)}</Placemark>`);
    }
    const st = [...styles.values()].map(s => s.kind==="pt"
      ? `<Style id="${s.id}"><IconStyle><color>${kmlColor(s.col,"ff")}</color><scale>1.1</scale><Icon><href>https://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href></Icon></IconStyle></Style>`
      : s.kind==="poly" ? `<Style id="${s.id}"><LineStyle><color>${kmlColor(s.col,"cc")}</color><width>0.5</width></LineStyle><PolyStyle><color>${kmlColor(s.col,"88")}</color></PolyStyle></Style>`
      : `<Style id="${s.id}"><LineStyle><color>${kmlColor(s.col,"ff")}</color><width>3</width></LineStyle></Style>`).join("");
    const info = Object.entries(meta).map(([k,v])=>`${esc(k)}: ${esc(v)}`).join("<br>");
    return `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${esc(`Sel simülasyonu · ${meta.bolge}`)}</name><description><![CDATA[${info}]]></description>${st}${
      Object.entries(folders).map(([k,v])=>`<Folder><name>${esc(k)}</name>${v.join("")}</Folder>`).join("")}</Document></kml>`;
  }
  const toGeoJSON = ({meta, F}) => JSON.stringify({type:"FeatureCollection", metadata:meta, features:F});
  function toCSV({meta, F}){
    const rows = [["katman","tur","enlem","boylam","derinlik_m","hacim_m3"]];
    for(const f of F){ if(f.geometry.type!=="Point") continue; const p=f.properties, c=f.geometry.coordinates;
      rows.push([p.katman, p.tur||"", c[1], c[0], p.derinlik_m??"", p.hacim_m3??""]); }
    // çokgen/çizgiler için ağırlık merkezi satırı (yalnızca özet)
    return `# ${meta.kaynak} · ${meta.bolge} · ${meta.senaryo} · ${meta.tarih}\n# ${meta.uyari}\n` + rows.map(r=>r.map(v=>/[",\n]/.test(String(v))?`"${String(v).replace(/"/g,'""')}"`:v).join(",")).join("\n");
  }

  function download(name, text, type){
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], {type})); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  const slug = s => (s||"bolge").toLocaleLowerCase("tr-TR").replace(/[çğıöşü]/g, c=>({ç:"c",ğ:"g",ı:"i",ö:"o",ş:"s",ü:"u"}[c])).replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  function run(kind){
    const r = collect(); if(!r || !r.F.length){ alert("Henüz dışa aktarılacak sonuç yok. Yağmuru biraz çalıştırıp tekrar dene."); return; }
    const base = `sel-${slug(S.name)}-${new Date().toISOString().slice(0,10)}`;
    if(kind==="kml") download(base+".kml", toKML(r), "application/vnd.google-earth.kml+xml");
    if(kind==="geojson") download(base+".geojson", toGeoJSON(r), "application/geo+json");
    if(kind==="csv") download(base+".csv", toCSV(r), "text/csv;charset=utf-8");
  }
  g.EXPORT = {collect, toKML, toGeoJSON, toCSV, run};

  // arayüz: ayarların sonuna "Sonuçları indir" bölümü
  function addUI(){
    if(document.getElementById("expBox")) return;
    const anchor = document.getElementById("tex"); const host = anchor && (anchor.closest(".settings") || anchor.closest("aside")); if(!host) return;
    const box = document.createElement("div"); box.id = "expBox"; box.className = "ctrl";
    box.innerHTML = `<h2 style="margin-top:18px">Sonuçları indir</h2>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn sm" data-k="kml">⬇ KML (Google)</button>
        <button class="btn ghost sm" data-k="geojson">⬇ GeoJSON (QGIS)</button>
        <button class="btn ghost sm" data-k="csv">⬇ CSV (noktalar)</button>
      </div>
      <p class="sub" style="margin-top:6px">Taşkın izi, su batabilecek yerler, olası eski dere yatakları ve akış görülen "dere" adlı yollar.
      Google'da açmak için <a href="https://www.google.com/maps/d/" target="_blank" rel="noopener" style="color:var(--accent)">Google My Maps</a> → Yeni harita → İçe aktar → KML dosyası,
      ya da Google Earth → Proje → İçe aktar. Dosya tarayıcında üretilir, hiçbir yere gönderilmez.</p>`;
    box.addEventListener("click", e => { const k = e.target.closest("button")?.dataset.k; if(k) run(k); });
    host.appendChild(box);
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", addUI); else addUI();
  setTimeout(addUI, 1500);
})();
