// Olası eski (kayıp) dere yatakları: araziden akış birikimi hesaplanır; yukarıdan yeterli alan toplayan vadi
// tabanları doğal hâlinde dere olmalıdır. Bugün OSM'de dere (kapalı/yer altı dahil) olmayan bu yataklar "kayıp dere
// adayı" olarak işaretlenir; üzerinde adında "dere" geçen yol varsa isim de bunu destekler.
// Topoğrafyadan çıkarımdır: kentsel dolgu, SRTM hataları ve 30 m çözünürlük yanıltabilir.
// index.html'deki globallere (b, sea, N, S, REG, DERE, loadDere, drawDereOverlay, updDereStats, dereCanvas, dereTex,
// fmt, $) ve burn.js'teki BURN.vis'e dayanır.
(function(){
  if(typeof loadDere !== "function") return;
  const MIN_AREA = 0.25e6;   // m²: dere sayılacak en küçük toplanma alanı (İstanbul'da 1. derece dereler ~0,2–1 km²)
  const NEAR = 2;            // hücre: OSM deresine bu kadar yakın yataklar "zaten haritada" sayılır
  const COL = "#c084fc";     // mor kesikli çizgi
  const LC = window.LOSTCREEK = {on:true, down:null, acc:null, cand:null, named:null, km:0, namedKm:0, names:[], key:null};

  // priority-flood ile çukurları doldur, D8 akış yönü ve birikimi hesapla
  function analyse(){
    if(!b || !REG || !DERE) return;
    const n=N*N, h = (window.BURN && BURN.vis && BURN.vis.length===n) ? BURN.vis : b;   // özgün yüzey (köprü kesikleri etkilemesin)
    const F=new Float32Array(n), done=new Uint8Array(n), ord=new Int32Array(n), par=new Int32Array(n).fill(-1);
    const hk=new Float32Array(n), hi=new Int32Array(n); let hs=0, no=0;
    const push=(i,v)=>{ let c=hs++; while(c>0){ const p=(c-1)>>1; if(hk[p]<=v) break; hk[c]=hk[p]; hi[c]=hi[p]; c=p; } hk[c]=v; hi[c]=i; };
    const pop=()=>{ const top=hi[0], v=hk[--hs], ii=hi[hs]; let c=0;
      for(;;){ let l=2*c+1; if(l>=hs) break; if(l+1<hs&&hk[l+1]<hk[l]) l++; if(hk[l]>=v) break; hk[c]=hk[l]; hi[c]=hi[l]; c=l; }
      hk[c]=v; hi[c]=ii; return top; };
    for(let i=0;i<n;i++){ const x=i%N, y=(i-x)/N; if(sea[i]||!x||!y||x===N-1||y===N-1){ F[i]=sea[i]?Math.min(h[i],0):h[i]; done[i]=1; push(i,F[i]); } }
    const DX=[-1,1,0,0,-1,1,-1,1], DY=[0,0,-1,1,-1,-1,1,1];
    while(hs){
      const i=pop(), x=i%N, y=(i-x)/N; ord[no++]=i;
      for(let k=0;k<8;k++){ const xx=x+DX[k], yy=y+DY[k]; if(xx<0||yy<0||xx>=N||yy>=N) continue; const j=yy*N+xx; if(done[j]) continue;
        done[j]=1; F[j]=Math.max(h[j],F[i]); par[j]=i; push(j,F[j]); }
    }
    // D8: doldurulmuş yüzeyde en dik iniş; düzlükte dolgu ağacındaki ebeveyn
    const down=new Int32Array(n).fill(-1);
    for(let i=0;i<n;i++){
      if(sea[i]) continue; const x=i%N, y=(i-x)/N; let best=-1, bs=0;
      for(let k=0;k<8;k++){ const xx=x+DX[k], yy=y+DY[k]; if(xx<0||yy<0||xx>=N||yy>=N) continue; const j=yy*N+xx;
        const s=(F[i]-F[j])/((k<4)?1:Math.SQRT2); if(s>bs){ bs=s; best=j; } }
      down[i] = best>=0 ? best : par[i];
    }
    const acc=new Float32Array(n), cA=S.cell*S.cell;
    for(let i=0;i<n;i++) if(!sea[i]) acc[i]=cA;
    for(let q=no-1;q>=0;q--){ const i=ord[q], j=down[i]; if(j>=0 && !sea[j]) acc[j]+=acc[i]; }

    // OSM dereleri (kapalı olanlar dahil) ve "dere" adlı yollar: ızgaraya, NEAR hücre genişletilmiş
    const mapped=new Uint8Array(n), road=new Map();
    const stamp=(pts, cb)=>{ for(let k=1;k<pts.length;k++){ const [x0,y0]=pts[k-1].g,[x1,y1]=pts[k].g, m=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0)*2));
      for(let s=0;s<=m;s++){ const x=Math.round(x0+(x1-x0)*s/m), y=Math.round(y0+(y1-y0)*s/m); if(x>=0&&y>=0&&x<N&&y<N) cb(x,y); } } };
    for(const w of DERE.ways||[]) stamp(w.pts,(x,y)=>{ for(let dy=-NEAR;dy<=NEAR;dy++) for(let dx=-NEAR;dx<=NEAR;dx++){ const xx=x+dx, yy=y+dy; if(xx>=0&&yy>=0&&xx<N&&yy<N) mapped[yy*N+xx]=1; } });
    for(const r of DERE.roads||[]) stamp(r.pts,(x,y)=>{ for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){ const xx=x+dx, yy=y+dy; if(xx>=0&&yy>=0&&xx<N&&yy<N) road.set(yy*N+xx, r.name); } });

    const cand=new Uint8Array(n), named=new Map(); let len=0, namedLen=0;
    for(let i=0;i<n;i++){
      if(sea[i] || acc[i]<MIN_AREA || mapped[i]) continue;
      const j=down[i]; if(j<0) continue;
      cand[i]=1; const L = ((j%N)!==(i%N) && Math.abs(j-i)!==1) ? S.cell*Math.SQRT2 : S.cell; len+=L;
      const nm=road.get(i); if(nm){ namedLen+=L; named.set(nm,(named.get(nm)||0)+L); }
    }
    Object.assign(LC, {down, acc, cand, named, km:len/1000, namedKm:namedLen/1000,
      names:[...named.entries()].sort((a,c)=>c[1]-a[1]).map(e=>e[0]), key:DERE});
  }

  function draw(){
    if(!LC.on || !LC.cand || LC.key!==DERE || !dereCanvas) return;
    const g=dereCanvas.getContext("2d"), f=dereCanvas.width/(N-1), {down,acc,cand}=LC;
    g.save(); g.strokeStyle=COL; g.lineCap="round"; g.setLineDash([4,6]); g.globalAlpha=0.45;   // silik: çıkarım katmanı
    for(let i=0;i<N*N;i++){
      if(!cand[i]) continue; const j=down[i], x=i%N, y=(i-x)/N, xj=j%N, yj=(j-xj)/N;
      g.lineWidth = 1.2 + Math.min(1.8, Math.log10(acc[i]/MIN_AREA+1)*2);
      g.beginPath(); g.moveTo(x*f,y*f); g.lineTo(xj*f,yj*f); g.stroke();
    }
    g.restore(); dereTex.needsUpdate=true;
  }

  function stats(){
    const body=$("dereBody"); if(!body || !LC.cand || LC.key!==DERE) return;
    let box=document.getElementById("lostCreek");
    if(!box || !body.contains(box)){ box=document.createElement("div"); box.id="lostCreek"; body.appendChild(box); }
    const nm=LC.names;
    box.innerHTML = `
      <div style="margin-top:10px;font-weight:600"><span style="display:inline-block;width:16px;border-top:3px dashed ${COL};vertical-align:middle"></span> Olası eski dere yatakları</div>
      <div>Araziye göre dere olması gereken ama haritada dere görünmeyen <b>${fmt(LC.km,1)} km</b> vadi tabanı.</div>
      ${nm.length ? `<div style="margin-top:4px">Bunların <b>${fmt(LC.namedKm,1)} km</b>'sinde adında "dere" geçen yol var: <span class="muted">${nm.slice(0,10).join(" · ")}${nm.length>10?` · +${nm.length-10}`:""}</span></div>` : ""}
      <div class="muted" style="margin-top:4px">Topoğrafyadan çıkarım (≥${fmt(MIN_AREA/1e6,2)} km² toplanma alanı, OSM'de dere yok). Kentsel dolgu ve uydu verisi hataları yanıltabilir.</div>`;
  }

  // dere verisi yüklenince hesapla
  const origLoad=loadDere;
  loadDere=async function(){ const r=await origLoad.apply(this,arguments); try{ analyse(); drawDereOverlay(); updDereStats(); }catch(e){ console.warn("kayıp dere", e); } return r; };
  // çizim ve istatistik
  if(typeof drawDereOverlay==="function"){ const o=drawDereOverlay; drawDereOverlay=function(){ const r=o.apply(this,arguments); try{ draw(); }catch(e){} return r; }; }
  if(typeof updDereStats==="function"){ const o=updDereStats; updDereStats=function(){ const r=o.apply(this,arguments); try{ stats(); }catch(e){} return r; }; }

  // katman anahtarı ve lejant
  (function(){
    const w=document.getElementById("showWater"); const lab=w && w.closest("label");
    if(lab && !document.getElementById("showLost")){
      const l=document.createElement("label");
      l.innerHTML=`<input type="checkbox" id="showLost" checked> <span class="sw" style="background:none;border-top:3px dashed ${COL};height:0"></span> Olası eski dere yatakları`;
      lab.after(l);
      document.getElementById("showLost").onchange=e=>{ LC.on=e.target.checked; drawDereOverlay(); };
    }
    const legend=document.querySelector(".legend");
    if(legend && !document.getElementById("lgLost")){
      const row=document.createElement("div"); row.className="row"; row.id="lgLost";
      row.innerHTML=`<span class="sw" style="background:none;border-top:3px dashed ${COL};height:0"></span>Olası eski dere yatağı`;
      legend.appendChild(row);
    }
  })();
})();
