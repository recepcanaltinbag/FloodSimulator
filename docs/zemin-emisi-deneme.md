# Zemin emişi haritası: ilk deneme (15 Ekim 2026)

"Haritadan (arazi örtüsü + toprak)" seçeneğini eski tek-zemin seçenekleriyle karşılaştırdık. Yöntem ve kaynaklar için [README → Zemin emişi haritası](../README.md#zemin-emişi-haritası).

Bunlar model içi karşılaştırmalardır, ölçümle doğrulama değildir.

## Kağıthane

Ayarlar: Orta boy (hücre ≈ 29 m), 40 mm/sa · 3 sa, standart şebeke, havzadan gelen su açık. Değerler 3 saatin sonundadır.

Pencerenin %65'i yapı. Toprak killi tın; kent içindeki toprak çevreden tahmin edildi. Ortalama emiş kuruyken 21, doygunken 1,0 mm/sa.

| Zemin | Önceki günler | >10 cm su (km²) | >50 cm su (km²) | En derin (m) | Dışarıdan gelen su (milyon m³) |
|---|---|---|---|---|---|
| Beton / asfalt | Doygun | 2,86 | 2,34 | 5,84 | 19,7 |
| Karışık kentsel | Doygun | 2,85 | 2,32 | 5,83 | 19,6 |
| **Haritadan** | Doygun | 2,89 | 2,37 | 5,89 | 20,6 |
| Beton / asfalt | Kuru | 2,86 | 2,33 | 5,83 | 17,6 |
| Karışık kentsel | Kuru | 2,82 | 2,29 | 5,79 | 15,7 |
| **Haritadan** | Kuru | 2,86 | 2,33 | 5,84 | 16,0 |

**Ne gördük:**
- 40 mm/sa'lik 3 saatlik yağışta zemin seçimi su basan alanı %1–2'den fazla değiştirmiyor. Yağış her sınıfın emişini kısa sürede aşıyor.
- Taşkını belirleyen, dereden gelen su ve vadi biçimi.
- Harita, Kağıthane'yi "Beton / asfalt"a yakın görüyor (yoğun yapı, killi toprak).
- Yukarı havza doygunken "Karışık kentsel"den biraz daha az emiyor (+%5 su). Bunun nedeni killi toprağın doygun emişinin (~0,3–1 mm/sa) 3 mm/sa'ten düşük olması.

## Taşeli Platosu (karst)

Ayarlar: Geniş boy (hücre ≈ 62 m), 80 mm/sa · 1 sa, Nemli. Değerler yağış bitince alındı.

Pencerenin %84'ü çayır/mera, %10'u çıplak/seyrek. Toprak tın. GLiM'e göre karbonatlı kayaç. Ortalama emiş kuruyken 122, doygunken 9,6 mm/sa.

| Zemin | Karst modu | >10 cm su (km²) | >50 cm su (km²) | En derin (m) | Yeraltına (milyon m³) |
|---|---|---|---|---|---|
| Karstik kireçtaşı (karst modunun varsayılanı) | açık | 0 | 0 | 0,07 | 19,4 |
| **Haritadan** | açık (düdenler) | 3,67 | 2,38 | 5,38 | 9,7 |
| **Haritadan** | kapalı | 5,32 | 3,82 | 6,72 | — |
| Karışık kentsel | kapalı | 6,71 | 5,11 | 8,15 | — |

**Ne gördük:**
- Harita, karst platosunda "Karstik kireçtaşı"ndan çok daha az emiyor. Çayır/mera tınlı toprak sayılıyor (doygunken 3,4 mm/sa). Karst değeri (150 → 60) yalnızca çıplak/seyrek alanlara veriliyor.
- Gerçekte karst platolarında yüzey akışı çok azdır. Bu yüzden harita burada büyük olasılıkla emişi az gösteriyor. Ne SoilGrids dokusu ne de 0,5°'lik GLiM ızgarası epikarstı (kayanın üst, çatlaklı kuşağını) görüyor.
- Karst alanlarında asıl araç yine **Karst modu**. Harita seçiliyken karst modu açılırsa harita korunur, düdenler ayrıca su yutar.

## Veriyle ilgili gözlemler

- **SoilGrids, Türkiye'yi büyük ölçüde killi tın, tın ve kil olarak tahmin ediyor.** Kumlu sınıflar neredeyse hiç yok (Türkiye kutusundaki hücrelerin %0,2'sinden azı). SoilGrids bir regresyon modeli olduğu için uç değerleri ortalamaya çeker. Kıyı kumulları ve alüvyal kumlar bu yüzden temsil edilmiyor.
- **SoilGrids kentleri tahmin etmez.** Bu boşluklar en çok ~10 km uzaktaki tahminlerden dolduruldu ve ipucunda "çevreden tahmin" yazar. Kağıthane penceresinin ~%75'i bu şekilde dolduruldu.
- **GLiM'in 0,5°'lik ızgarası kaba.** Sitedeki 35 karst alanının (data/tr_karst.js) yalnızca 13'ü baskın sınıfı "karbonatlı tortul" olan hücreye düşüyor. 7'si "karışık tortul" hücresine düşüyor, ama bu sınıf karbonat sayılmıyor.
- **Karo boyutu:** z12 1539 karo (~21 MB), z10 1187 karo (~22 MB).
