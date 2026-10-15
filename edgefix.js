// Havza girişlerinde kenar "duvarı" düzeltmesi: dışarıdan gelen su hemen geri çıkmasın diye giriş hücrelerinde pencere
// kenarı kapatılır (UP.R.W). Kaba (~115 m) havza hesabı dağlık arazide bazen suyun pencereden ÇIKTIĞI vadi ağızlarını
// da giriş sanar; orada duvar çıkışı kapatır, su kenarda onlarca metre birikir ve kenar boyunca yapay akış şeridi oluşur.
// Burada duvar yalnızca arazinin pencere içine doğru eğimli olduğu kenar hücrelerinde bırakılır; kenar hücresi içerideki
// komşusundan alçaksa (çıkış ağzı) duvar kaldırılır.
// index.html'deki globallere (upBuild, UP, b, N) dayanır.
(function(){
  if(typeof upBuild !== "function") return;
  window.EDGEFIX = {removed:0, kept:0};
  function fix(){
    const R = UP && UP.R, W = R && R.W; if(!W || !b) return;
    let rem = 0, kept = 0;
    for(let i=0;i<W.length;i++){
      if(!W[i]) continue;
      const x = i % N, y = (i - x) / N, inw = [];
      if(x === 0) inw.push(i+1); if(x === N-1) inw.push(i-1);
      if(y === 0) inw.push(i+N); if(y === N-1) inw.push(i-N);
      if(!inw.length){ kept++; continue; }
      const lowestInside = Math.min(...inw.map(j => b[j]));
      if(lowestInside > b[i] + 0.05){ W[i] = 0; rem++; } else kept++;   // içerisi daha yüksek: su buradan çıkar
    }
    EDGEFIX.removed = rem; EDGEFIX.kept = kept;
  }
  const orig = upBuild;
  upBuild = function(){ const r = orig.apply(this, arguments); try{ fix(); }catch(e){ console.warn("kenar düzeltmesi", e); } return r; };
})();
