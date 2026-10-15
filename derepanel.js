// Dere izleri paneli düzeni: istatistik çubukları ve "X kat" oran kutuları önde kalır; yol/isim listeleri, kayıp dere
// yatakları ve notlar "Ayrıntılar" açılır bölümüne taşınır. Panel her güncellemede yeniden yazıldığı için açık/kapalı
// durumu hatırlanır. Diğer eklentilerden (derestat, lostcreeks, floodtrace) SONRA yüklenmelidir.
(function(){
  if(typeof updDereStats !== "function") return;
  let open = false;
  try{ open = localStorage.getItem("dereMoreOpen") === "1"; }catch(e){}

  const css = document.createElement("style");
  css.textContent = `
    #dereMore{margin-top:8px;border-top:1px solid var(--line);padding-top:6px}
    #dereMore>summary{cursor:pointer;color:var(--accent);font-weight:600;font-size:12px;list-style:none;padding:4px 0}
    #dereMore>summary::-webkit-details-marker{display:none}
    #dereMore>summary::before{content:"▸ ";display:inline-block;transition:transform .15s}
    #dereMore[open]>summary::before{transform:rotate(90deg)}
    #dereLayers{margin-top:6px;border-top:1px solid var(--line);padding-top:4px}
    #dereLayers>summary{cursor:pointer;color:var(--muted);font-weight:600;font-size:12px;list-style:none;padding:4px 0}
    #dereLayers>summary::-webkit-details-marker{display:none}
    #dereLayers>summary::before{content:"▸ ";display:inline-block;transition:transform .15s}
    #dereLayers[open]>summary::before{transform:rotate(90deg)}
    @media (max-width:900px){ .hud br, .hud span[style]{display:none} /* telefonda bilgi kutusu tek satır */
      body:has(#derePanel:not(.collapsed)) .hud{display:none} } /* dere paneli açıkken üstüne binmesin */`;
  document.head.appendChild(css);

  function arrange(){
    const body = $("dereBody"); if(!body || !body.querySelector(".compare")) return;
    let det = body.querySelector("#dereMore");
    if(!det){
      det = document.createElement("details"); det.id = "dereMore"; det.open = open;
      det.innerHTML = `<summary>Ayrıntılar: yollar, kayıp dereler, notlar</summary>`;
      det.addEventListener("toggle", () => { open = det.open; try{ localStorage.setItem("dereMoreOpen", open ? "1" : "0"); }catch(e){} });
    }
    const keep = el => el.classList.contains("compare") || el.classList.contains("big");
    for(const c of [...body.children]){ if(c !== det && !keep(c)) det.appendChild(c); }
    body.appendChild(det);
  }

  // katman anahtarlarını "Katmanlar" açılır bölümüne topla (panelin önünde istatistik kalsın)
  function groupLayers(){
    const body = $("dereBody"); if(!body || document.getElementById("dereLayers")) return;
    const host = body.parentElement;
    const labels = [...host.children].filter(el => el.tagName === "LABEL" && el.querySelector('input[type="checkbox"]'));
    if(!labels.length) return;
    let lopen = false; try{ lopen = localStorage.getItem("dereLayersOpen") === "1"; }catch(e){}
    const det = document.createElement("details"); det.id = "dereLayers"; det.open = lopen;
    det.innerHTML = `<summary>Katmanlar (${labels.length})</summary>`;
    labels.forEach(l => det.appendChild(l));
    det.addEventListener("toggle", () => { try{ localStorage.setItem("dereLayersOpen", det.open ? "1" : "0"); }catch(e){} });
    body.after(det);
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", groupLayers); else groupLayers();
  setTimeout(groupLayers, 1500);

  const o = updDereStats;
  updDereStats = function(){ const r = o.apply(this, arguments); try{ arrange(); }catch(e){ console.warn("dere paneli", e); } return r; };
})();
