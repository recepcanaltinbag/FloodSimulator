// Uzun açıklamalar: ayarlardaki açıklama paragrafları (ör. havzadan gelen su, karst, kanalizasyon, notlar) iki satıra
// kısaltılır, yanına "▾ devamı" eklenir; tıklayınca açılır/kapanır. Kısa olanlara dokunulmaz. Metni sonradan değişen
// (canlı güncellenen) açıklamalar da izlenir.
(function(){
  const css = document.createElement("style");
  css.textContent = `
    .clampable{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;cursor:pointer}
    .clampable.open{display:block;-webkit-line-clamp:unset}
    .clampMore{display:inline-block;margin:1px 0 4px;color:var(--accent);font-size:11.5px;cursor:pointer;user-select:none}
    .clampMore[hidden]{display:none}`;
  document.head.appendChild(css);

  const SEL = "aside .sub, aside .note, aside p.muted, #upInfo, #karstInfo, #sewerInfo, #burnInfo, #satInfo, #expBox p";
  const seen = new WeakSet();

  function setup(el){
    if(seen.has(el) || el.closest("#picker") || el.closest(".top")) return;     // seçim penceresi ve üst başlık hariç
    seen.add(el);
    const more = document.createElement("span"); more.className = "clampMore"; more.hidden = true; more.textContent = "▾ devamı";
    el.after(more);
    const toggle = () => { const o = !el.classList.contains("open"); el.classList.toggle("open", o); more.textContent = o ? "▴ daha az" : "▾ devamı"; };
    more.addEventListener("click", toggle);
    el.addEventListener("click", e => { if(!e.target.closest("a,button,input,select")) toggle(); });
    const check = () => {
      if(el.classList.contains("open")){ more.hidden = false; return; }
      el.classList.add("clampable");
      // iki satırı aşmıyorsa kısaltmaya gerek yok
      const over = el.scrollHeight > el.clientHeight + 2;
      if(!over) el.classList.remove("clampable");
      more.hidden = !over;
    };
    new MutationObserver(() => requestAnimationFrame(check)).observe(el, {childList:true, characterData:true, subtree:true});
    requestAnimationFrame(check);
    el._clampCheck = check;
  }

  function scan(){ document.querySelectorAll(SEL).forEach(setup); }
  // ekran boyutu değişince yeniden ölç (çekmece açılınca, telefon/masaüstü)
  addEventListener("resize", () => document.querySelectorAll(".clampMore").forEach(m => { const el = m.previousElementSibling; el && el._clampCheck && el._clampCheck(); }));
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", scan); else scan();
  setTimeout(scan, 1500); setTimeout(scan, 4000);   // sonradan eklenen bölümler (dışa aktar, uydu, köprü…)
})();
