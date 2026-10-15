// Yükleme sırası yarışı düzeltmesi: sayfa açılınca bölge hemen yüklenmeye başlar; yardımcı betikler (osm-cache, burn,
// derestat, lostcreeks…) ise realrain.js üzerinden biraz sonra gelir. Arazi önbellekten hızlı gelirse loadDere bu
// sarmalayıcılar takılmadan çalışır: gömülü dere verisi yerine Overpass'e gidilir, köprü düzeltmesi ve akış yönleri
// oluşmaz. Bu betik en son yüklenir; bölge yüklendiğinde dere verisi eksik ya da sarmalayıcısız işlendiyse yeniden yükler.
(function(){
  if(typeof loadDere !== "function") return;
  let tries = 0;
  function kick(){
    if(typeof S === "undefined") return;
    if(!S.loaded){ if(tries++ < 120) setTimeout(kick, 500); return; }
    const lc = window.LOSTCREEK;
    const ok = typeof DERE !== "undefined" && DERE && lc && lc.key === DERE && lc.down;
    if(!ok) loadDere();
  }
  // bölge yüklenince bir kez kontrol et (dere isteği sürüyorsa bitmesine fırsat ver)
  setTimeout(kick, 1500);
})();
