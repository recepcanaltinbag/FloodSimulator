// Gömülü OpenStreetMap verisi: İstanbul için "dere" adlı yollar, dereler/kanallar ve yer etiketleri.
// Overpass sunucuları sık sık yoğun olduğundan, bölge İstanbul içindeyse veri önce data/istanbul_osm.json'dan gelir;
// dışında ya da dosya yoksa index.html'deki overpass() normal şekilde çalışır.
// Biçim: dere = [tip(0 yol, 1 dere), ad, waterway, kapalı(0/1), [lat,lon,lat,lon,...]]
//        labels = [etiket anahtarı, değeri, ad, lat, lon, wikidata(0/1)]
(function(){
  if(typeof overpass !== "function") return;
  let DATA = null;
  const load = () => DATA || (DATA = fetch("data/istanbul_osm.json").then(r => r.ok ? r.json() : null).catch(() => null));
  load();

  const inside = (box, lat, lon) => lat>=box[0] && lat<=box[2] && lon>=box[1] && lon<=box[3];
  const contains = (outer, inner) => inner[0]>=outer[0] && inner[1]>=outer[1] && inner[2]<=outer[2] && inner[3]<=outer[3];

  // Hazır bölgeler için göl/baraj + ana yol/demiryolu verisi (kapalı çukur analizi): data/osm_area/*.json.
  // İstenen alan kayıtlı bir alanın içinde kalıyorsa veri GitHub'dan gelir, Overpass'a gidilmez.
  let AREAS = null; const areaFiles = new Map();
  const loadAreas = () => AREAS || (AREAS = fetch("data/osm_area/index.json").then(r => r.ok ? r.json() : null).catch(() => null));
  async function areaFor(box){
    const ix = await loadAreas(); if(!ix || !ix.areas) return null;
    const a = ix.areas.find(x => contains(x.bbox, box)); if(!a) return null;
    if(!areaFiles.has(a.key)) areaFiles.set(a.key, fetch(`data/osm_area/${a.key}.json`).then(r => r.ok ? r.json() : null).catch(() => null));
    return areaFiles.get(a.key);
  }

  const orig = overpass;
  overpass = async function(q){
    const m = /\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/.exec(q);
    const isDere = /waterway/.test(q) && /dere/.test(q), isLabel = /"place"/.test(q), isWater = /"natural"="water"/.test(q);
    if(m && isWater){
      const js = await areaFor(m.slice(1,5).map(Number));
      if(js && js.elements) return {elements: js.elements, cached: true};
    }
    if(m && (isDere || isLabel)){
      const box = m.slice(1,5).map(Number);              // güney, batı, kuzey, doğu
      const js = await load();
      const cLat = (box[0]+box[2])/2, cLon = (box[1]+box[3])/2;
      if(js && inside(js.bbox, cLat, cLon)){
        if(isDere){
          const elements = [];
          for(const [t, name, ww, tun, g] of js.dere){
            let hit = false;
            for(let i=0;i<g.length;i+=2) if(inside(box, g[i], g[i+1])){ hit = true; break; }
            if(!hit) continue;
            const geometry = []; for(let i=0;i<g.length;i+=2) geometry.push({lat:g[i], lon:g[i+1]});
            const tags = t===0 ? {highway:"road"} : {waterway:ww||"stream"};
            if(name) tags.name = name;
            if(tun) tags.tunnel = "culvert";
            elements.push({type:"way", tags, geometry});
          }
          return {elements, cached:true};
        }
        const elements = [];
        for(const [k, v, name, lat, lon, wd] of js.labels){
          if(!inside(box, lat, lon)) continue;
          const tags = {[k]:v, name}; if(wd) tags.wikidata = "1";
          elements.push({type:"node", lat, lon, tags});
        }
        return {elements, cached:true};
      }
    }
    return orig.apply(this, arguments);
  };
})();
