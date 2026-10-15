# 14 Ekim 2026 seli: model ne kadar tuttu?

*15 Ekim 2026 · Site sürümü `bedabf8` · Nokta listesi: [`dogrulama-14ekim-noktalar.csv`](dogrulama-14ekim-noktalar.csv)*

14 Ekim'de su bastığı haberlere yansıyan yerleri topladık. Sonra aynı bölgelerde simülasyonu 14 Ekim yağışıyla çalıştırıp modelin bu yerlerde su biriktirip biriktirmediğine baktık.

## Kısaca

- **74 nokta** topladık. **39'u** simülasyonu çalıştırdığımız 8 bölgenin içinde.
- Model bu 39 noktanın **29'unda (%74)** yakınında en az 10 cm su biriktirdi. Rastgele seçilen noktalarda bu oran %56. Yani model şanstan iyi ama çok değil.
- Noktanın tam üstüne bakınca isabet **%18**'e düşüyor. Model suyun **hangi vadide** toplanacağını kabaca biliyor, **hangi sokakta** toplanacağını bilmiyor.
- Kaçırılan 10 noktanın **6'sı alt geçit, tünel ya da metro**. 30 m'lik arazi verisi bunları görmüyor.
- Modelin su gösterdiği yerlerin çoğu için haber yok. Bu yanlış alarm da olabilir, kimsenin haber yapmadığı bir yer de olabilir. 8.500'ü aşkın ihbara karşı elimizde 74 nokta var.

## Gözlemler

Kaynaklar: Hürriyet, Milliyet ve CNN Türk canlı yayınları, DHA ve İHA haberleri, Euronews, İstanbul Valiliği ve İBB/AKOM açıklamaları. Her noktanın linki CSV'de.

- 41 noktanın yeri net, 33'ününki yaklaşık.
- En çok nokta Sarıyer (10), Eyüpsultan (8), Kağıthane (6) ve Beykoz'da (6).
- Su baskını olmayan 3 kayıt (yol çökmesi, çamur, kazı çukuru) çıkarıldı.

Yerin ne kadar kesin bilindiğine göre noktanın çevresinde farklı genişlikte bir alana baktık: belirli bir yer için 150 m, bir cadde için 300 m, bir mahalle için 750 m.

Haberlerdeki saatler çoğunlukla yayın saati olduğu için zamanı kullanmadık. Her yerde olay boyunca ulaşılan en yüksek su derinliğine baktık.

## Nasıl yapıldı

- **Bölgeler:** Kağıthane, Eyüpsultan, Ayazağa, Sarıyer, Kemerburgaz–Göktürk, Beykoz, Riva, Beşiktaş. Her biri yaklaşık 7,4 × 7,4 km, hücre boyu ~29 m.
- **Yağış:** "14 Ekim 2026 · 12 saat, saat saat" senaryosu. Saatlik dağılım Open-Meteo'dan, toplam en yakın AKOM ölçümlerinden geliyor. Bölgeye göre 12 saatte 106–196 mm.
- **Ayarlar:** sitenin açılış ayarları. Zemin beton/asfalt ve doygun (sabahtan beri yağıyordu), kanalizasyon standart, yukarı havzadan gelen su açık.
- Simülasyon 12 saat yağış ve 1 saat çekilme boyunca koştu.

**İsabet:** Noktanın çevresinde model en az 10 cm (ya da 30 cm) su gösterdiyse isabet saydık.

**Şans düzeyi:** Aynı testi her bölgede rastgele seçilmiş kara noktalarında da yaptık. Çevre genişledikçe her yerde biraz su çıkacağı için asıl ölçü, modelin bu rastgele orandan ne kadar iyi olduğu.

**Kareler:** Bölgeleri 500 m'lik karelere bölüp kare bazında da saydık:

- **POD:** Su basan karelerin kaçını model yakaladı?
- **FAR:** Modelin su gösterdiği karelerin kaçında haber yok?
- **CSI:** İkisinin birleşik skoru.

## Sonuçlar

| | 10 cm | 30 cm |
|---|---|---|
| Nokta isabeti (39 nokta) | 29 (%74) | 29 (%74) |
| Rastgele noktalarda | %56 | %49 |
| Noktanın tam üstünde | 7 (%18) | – |
| 500 m kare: POD / FAR / CSI | 0,62 / 0,94 / 0,05 | 0,57 / 0,94 / 0,06 |
| Modelin su gösterdiği karelerin oranı | %31 | %26 |

Model karelerin üçte birinde su gösterip su basan karelerin üçte ikisini yakaladı. Rastgele bir harita aynı sayıda kare seçseydi su basan karelerin ancak üçte birini yakalardı.

**Bölgelere göre 10 cm'yi geçen alan:**

| Bölge | 12 saatte yağış | En sert saat | Su basan alan |
|---|---|---|---|
| Kağıthane | 152 mm | 40 mm | 2,7 km² |
| Eyüpsultan | 163 mm | 35 mm | 1,9 km² |
| Ayazağa | 143 mm | 38 mm | 1,7 km² |
| Sarıyer | 144 mm | 36 mm | 0,5 km² |
| Beykoz | 196 mm | 55 mm | 0,8 km² |
| Kemerburgaz | 107 mm | 20 mm | 3,6 km² |
| Beşiktaş | 158 mm | 39 mm | 0,4 km² |
| Riva | 160 mm | 27 mm | 1,9 km² |

**İyi tuttuğu yerler:** Kağıthane, Ayazağa, Beykoz ve Kemerburgaz. Bunlar dere vadisinde ya da vadi tabanında kalan yerler: Sadabad, Kağıthane Meydanı, Dereboyu Caddesi, Şahinkaya Caddesi, Çamlıbahçe, Selanik Bulvarı. Ayazağa Kemerburgaz Caddesi için haberlerde 2–3 m su konuşuluyor, model 300 m içinde 1,6 m veriyor.

**Kaçırdıkları (10 nokta):**

- **Alt geçit, tünel, metro (6):** Nispetiye ve Aytar caddesi alt geçitleri, Zincirlikuyu ve Esenler metroları, Kağıthane–Piyalepaşa ve Çayırbaşı tünelleri.
- **Düz şehir içi ya da sahil (4):** Büyükdere Caddesi (Ayazağa), Hamidiye Etfal bahçesi, Bebek sahili, Lütfi Aykaç Bulvarı.

## İlk sürümden bu yana ne değişti

İlk denemede modelin zemini hiç doymuyordu ve yukarı havzadan gelen suya da kanalizasyon kaybı uygulanıyordu. Bu yüzden saatte 25 mm civarını geçmeyen yağışın hepsi yutuluyordu. Kemerburgaz ve Riva'da hiç su birikmedi, oysa ikisi de olayın en kötü yerlerindendi.

| | İlk sürüm | Şimdi |
|---|---|---|
| Nokta isabeti (10 cm) | 22 (%56) | 29 (%74) |
| Rastgele noktalarda | %45 | %56 |
| Kemerburgaz (5 nokta) | 0 | 5 |
| Riva (1 nokta) | 0 | 1 |
| Toplam su basan alan | 5,0 km² | 13,5 km² |

Farkı yaratan iki şey var. Birincisi zeminin doygun başlaması. İkincisi pencere dışındaki havzadan gelen suya kanalizasyon kaybı uygulanmaması; o suyun boru olsa da olmasa da dereye ulaştığını varsaydık. Yalnızca zeminin ıslandıkça daha az su emmesi (Horton) yetmedi: isabet %62'de kaldı, Kemerburgaz yine kuruydu. Kemerburgaz'daki suyun çoğu bölgeye düşen yağmurdan değil, yukarıdan gelen dereden.

İsabet arttı ama modelin su gösterdiği alan da neredeyse üç katına çıktı. Bu yüzden şansa göre üstünlük çok az değişti (1,24 kattan 1,33 kata). Asıl kazanç, eskiden hiç göremediği dere taşkınlarını artık görmesi.

## Sınırlamalar

- **Arazi verisi kaba.** 30 m'lik hücrelerde alt geçit, tünel, duvar ve bordür yok. Tek bir sokağı doğru tutturmak bu çözünürlükte mümkün değil.
- **Kanalizasyon tek bir sayı.** Her yerde aynı kapasitede çekiyor. Rögarların geri tepmesi (Alibeyköy, İzzetpaşa gibi) ve dere ıslahının kapasitesi yok.
- **Yağış her yere eşit ve saatlik.** Sağanağın birkaç km'lik hücreleri ve 10–15 dakikalık zirveleri kayboluyor. Saatlik dağılım da ölçüm değil, ölçüme uydurulmuş model verisi; AKOM saatlik veri yayımlamadı.
- **Haberler yanlı bir örnek.** Ölüm, kurtarma ve trafik olan yerler öne çıkıyor; noktalar yollara ve alt geçitlere yığılıyor. Ölçülmüş derinlik yok, bu yüzden 10 cm ile 30 cm aynı sonucu veriyor.
- **Dere yatağı etkisi.** Bakılan alan dere yatağına değince dere içindeki su da isabet sayılabiliyor. Bu, Kağıthane ve Beykoz'da isabeti biraz şişiriyor olabilir.
- **Değişiklikler birlikte ölçüldü.** Zemin türü, doygun başlangıç ve yukarı havza değişikliğinin etkileri ayrı ayrı ölçülmedi.

## Sonuç

Model, şehirde suyun hangi vadilerde toplandığını şanstan iyi gösteriyor ve uzun süren yağışta derelerin taşmasını artık yakalıyor. Sokak ölçeğinde ve alt geçit, tünel, metro gibi yapılarda güvenilir değil. Eğitim ve "su nereye gider" sorusu için uygun; belirli bir adreste su derinliği tahmini için değil.

**Sıradaki adımlar:**

1. **Alt geçitler:** OSM'deki tünel ve alt geçit yolları araziye çukur olarak eklensin.
2. **Daha iyi yağış verisi:** AKOM'un saatlik ya da 10 dakikalık ölçümleri veya radar verisi kullanılsın; yağış bölge içinde değişsin.
3. **Daha iyi gözlem:** İBB'den mahalle bazında ihbar sayıları alınsın, uydudan (Sentinel-1/2) taşkın izi çıkarılsın. Böylece yanlış alarm oranı gerçekten ölçülebilir.
