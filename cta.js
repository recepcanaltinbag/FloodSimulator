// Duruma göre öne çıkan büyük düğmeler (üstteki küçük ⏸ / ↺ ikonları normal akışta yeterli):
//   yağmur bitince   → "↺ Yeniden yağdır"
//   ayar değişince   → "↻ Yeni ayarlarla baştan başlat" (değişiklik akan simülasyona yarıdan uygulanmasın)
//   duraklatılınca   → ortada büyük "▶ Devam"
// index.html'deki globallere (S, $, MM) ve #play / #reset düğmelerine dayanır.
(function(){
  const view = document.getElementById("view"); if(!view || typeof S === "undefined") return;
  const css = document.createElement("style");
  css.textContent = `
    #cta{position:absolute;left:50%;bottom:64px;transform:translateX(-50%);z-index:4;display:flex;gap:8px;pointer-events:none}
    #cta button{pointer-events:auto;border:0;border-radius:999px;padding:11px 20px;font:inherit;font-weight:700;font-size:15px;cursor:pointer;
      background:var(--accent);color:#04121f;box-shadow:0 8px 24px rgba(0,0,0,.45);white-space:nowrap;animation:ctaIn .25s ease}
    #cta button.ghost{background:rgba(11,15,21,.85);color:var(--ink);border:1px solid var(--line)}
    #ctaPause{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:4;width:76px;height:76px;border-radius:50%;border:0;
      background:rgba(11,15,21,.6);color:#fff;font-size:30px;cursor:pointer;backdrop-filter:blur(6px);box-shadow:0 8px 30px rgba(0,0,0,.5);animation:ctaIn .2s ease}
    #ctaPause[hidden],#cta[hidden]{display:none}
    @keyframes ctaIn{from{opacity:0;transform:translateX(-50%) translateY(8px)}}
    @media (max-width:900px){ #cta{bottom:112px} #cta button{padding:10px 16px;font-size:14px} }`;
  document.head.appendChild(css);

  const box = document.createElement("div"); box.id = "cta"; box.hidden = true; view.appendChild(box);
  const pauseBtn = document.createElement("button"); pauseBtn.id = "ctaPause"; pauseBtn.hidden = true; pauseBtn.title = "Devam et"; pauseBtn.textContent = "▶";
  pauseBtn.onclick = () => $("play").click();
  view.appendChild(pauseBtn);

  let dirty = false, lastKey = "";
  const restart = () => { dirty = false; $("reset").click(); };
  // senaryo/ayar değişiklikleri (simülasyon zaten ilerlemişse)
  const markDirty = () => { if(S.simT > 60) dirty = true; };
  ["rate","dur","soil","sewer","blk"].forEach(id => { const el = $(id); if(el){ el.addEventListener("input", markDirty); el.addEventListener("change", markDirty); } });
  const scen = $("scen"); if(scen) scen.addEventListener("click", e => { if(e.target.closest(".chip")) setTimeout(() => { if(S.simT > 60) dirty = true; }, 0); });
  $("reset").addEventListener("click", () => { dirty = false; });

  function tick(){
    const mapMode = typeof MM !== "undefined" && MM.on, picker = $("picker") && !$("picker").hidden;
    const active = S.loaded && !mapMode && !picker && S.simT > 0;
    const rainOver = S.simT >= S.durH*3600;
    let key = "";
    if(active && dirty) key = "dirty";
    else if(active && rainOver) key = "over";
    if(key !== lastKey){
      lastKey = key;
      box.innerHTML = "";
      if(key === "dirty"){
        const b = document.createElement("button"); b.textContent = "↻ Yeni ayarlarla baştan başlat"; b.onclick = restart; box.appendChild(b);
        const k = document.createElement("button"); k.className = "ghost"; k.textContent = "Böyle devam"; k.onclick = () => { dirty = false; }; box.appendChild(k);
      } else if(key === "over"){
        const b = document.createElement("button"); b.textContent = "↺ Yeniden yağdır"; b.onclick = restart; box.appendChild(b);
      }
      box.hidden = !key;
    }
    pauseBtn.hidden = !(active && !S.running && !dirty);
  }
  setInterval(tick, 300);
})();
