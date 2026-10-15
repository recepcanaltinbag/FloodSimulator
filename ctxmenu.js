// Sağ tık menüsü: 3B haritada sürüklemeden sağ tıklanan noktanın koordinatını kopyala / haritada aç.
// Sağ sürükleme döndürme için kullanıldığından yalnızca hareketsiz sağ tıkta açılır.
// index.html'deki globallere (renderer, camera, ray, mouse, terrainMesh, ringMeshes, REG, N, SIZE, sc, S, d, sea, px2ll, fmt) dayanır.
(function(){
  if(typeof renderer === "undefined" || typeof ray === "undefined") return;
  const cv = renderer.domElement, view = document.getElementById("view");
  const css = document.createElement("style");
  css.textContent = `
    #ctx{position:absolute;z-index:8;min-width:220px;background:rgba(17,22,30,.97);border:1px solid var(--line);border-radius:10px;padding:4px;
      box-shadow:0 12px 30px rgba(0,0,0,.5);font-size:13px}
    #ctx[hidden]{display:none}
    #ctx .hd{padding:6px 10px 4px;color:var(--muted);font-size:11.5px;font-variant-numeric:tabular-nums}
    #ctx button{display:block;width:100%;text-align:left;border:0;background:none;color:var(--ink);padding:7px 10px;border-radius:7px;cursor:pointer;font:inherit}
    #ctx button:hover{background:var(--accent-soft)}
    #ctxToast{position:absolute;left:50%;top:14px;transform:translateX(-50%);z-index:9;background:rgba(17,22,30,.95);border:1px solid var(--line);
      border-radius:999px;padding:6px 14px;font-size:12.5px;pointer-events:none;transition:opacity .3s}`;
  document.head.appendChild(css);
  const menu = document.createElement("div"); menu.id = "ctx"; menu.hidden = true; view.appendChild(menu);
  const toast = document.createElement("div"); toast.id = "ctxToast"; toast.style.opacity = 0; view.appendChild(toast);
  const say = t => { toast.textContent = t; toast.style.opacity = 1; clearTimeout(say.t); say.t = setTimeout(()=>toast.style.opacity = 0, 1600); };

  function pick(clientX, clientY){
    if(!terrainMesh || !REG) return null;
    const r = cv.getBoundingClientRect();
    mouse.set((clientX-r.left)/r.width*2-1, -(clientY-r.top)/r.height*2+1);
    ray.setFromCamera(mouse, camera);
    const objs = [terrainMesh].concat(typeof ringMeshes === "function" ? ringMeshes() : []);
    const hit = ray.intersectObjects(objs)[0]; if(!hit) return null;
    // sahne → etkin ızgara (çevre halkasında da doğrusal devam eder) → küresel piksel → enlem/boylam
    const gx = (hit.point.x/SIZE + .5)*(N-1), gy = (hit.point.z/SIZE + .5)*(N-1);
    const ll = px2ll(REG.x0 + 2*gx + 1, REG.y0 + 2*gy + 1, REG.n);
    const h = hit.point.y / (sc()*S.ex);
    const x = Math.round(gx), y = Math.round(gy), inside = x>=0 && y>=0 && x<N && y<N, i = y*N + x;
    const w = inside && d && !sea[i] ? d[i] : null;
    return {lat: ll.lat, lon: ll.lon, h, w, gx, gy};
  }

  const f5 = v => v.toFixed(5);
  async function copy(text, note){
    try{ await navigator.clipboard.writeText(text); say(note || "Kopyalandı"); }
    catch(e){ const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
      try{ document.execCommand("copy"); say(note || "Kopyalandı"); }catch(_){ say("Kopyalanamadı: " + text); } ta.remove(); }
  }

  function open(clientX, clientY){
    const p = pick(clientX, clientY); if(!p){ menu.hidden = true; return; }
    const ll = `${f5(p.lat)}, ${f5(p.lon)}`;
    const wtxt = p.w == null ? "" : p.w < 0.01 ? " · kuru" : ` · su ${p.w < 1 ? fmt(p.w*100) + " cm" : fmt(p.w,2) + " m"}`;
    menu.innerHTML = `<div class="hd">${ll} · ${fmt(p.h)} m${wtxt}</div>
      <button data-a="ll">📋 Koordinatı kopyala</button>
      <button data-a="full">📋 Koordinat + yükseklik${p.w!=null?" + su":""}</button>
      <button data-a="gm">🗺️ Google Haritalar'da aç</button>
      <button data-a="catch">💧 Buranın drenaj alanı ve olası su miktarı</button>`;
    menu.onclick = e => {
      const a = e.target.closest("button")?.dataset.a; if(!a) return;
      if(a === "ll") copy(ll, "Koordinat kopyalandı");
      if(a === "full") copy(`${ll}, ${p.h.toFixed(1)} m${p.w!=null?`, su ${p.w.toFixed(2)} m`:""}`, "Koordinat ve yükseklik kopyalandı");
      if(a === "catch" && window.CATCH) CATCH.show(p.gx, p.gy, {x:clientX, y:clientY});
      if(a === "gm") window.open(`https://www.google.com/maps?q=${f5(p.lat)},${f5(p.lon)}`, "_blank", "noopener");
      menu.hidden = true;
    };
    const r = view.getBoundingClientRect();
    menu.hidden = false;
    const mx = Math.min(clientX - r.left, r.width - menu.offsetWidth - 8), my = Math.min(clientY - r.top, r.height - menu.offsetHeight - 8);
    menu.style.left = Math.max(8, mx) + "px"; menu.style.top = Math.max(8, my) + "px";
  }

  // yalnızca hareketsiz sağ tık (sağ sürükleme = döndürme)
  let down = null;
  cv.addEventListener("pointerdown", e => { if(e.button === 2) down = {x:e.clientX, y:e.clientY}; else menu.hidden = true; }, true);
  cv.addEventListener("pointerup", e => {
    if(e.button !== 2 || !down) return;
    const moved = Math.hypot(e.clientX-down.x, e.clientY-down.y) > 4; down = null;
    if(!moved) open(e.clientX, e.clientY);
  }, true);
  cv.addEventListener("contextmenu", e => e.preventDefault());
  document.addEventListener("keydown", e => { if(e.key === "Escape") menu.hidden = true; });
  cv.addEventListener("wheel", () => { menu.hidden = true; }, {passive:true});
})();
