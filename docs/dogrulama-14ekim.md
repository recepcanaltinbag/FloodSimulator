# 14 Ekim 2026 İstanbul seli: simülasyonun gözlemlerle karşılaştırılması

*Hazırlanma: 15 Ekim 2026 · Model sürümleri: ilk koşum `0dde05f` (sabit sızma), yeniden koşum `b692cff` (Horton sızması) ve `bedabf8` (güncel site) · Veri: [`dogrulama-14ekim-noktalar.csv`](dogrulama-14ekim-noktalar.csv)*

## Özet

Rakamlar güncel siteye (`bedabf8`) aittir: "14 Ekim 2026 · 12 saat" senaryosu, zemin "Beton / asfalt", önceki günler "Doygun". İlk koşumun sonuçları [3.1–3.4](#3-sonuçlar) bölümlerinde, sürümlerin karşılaştırması [3.5](#35-horton-sızmasıyla-yeniden-koşum) bölümünde.

- Haber ve resmî açıklamalardan **74 su baskını noktası** topladık. Bunların **39'u** koşturduğumuz 8 model penceresinin içinde kalıyor.
- Model, bu noktaların **%74'ünde** (29/39) çevrede (150–750 m) en az 10 cm su biriktirdi. Rastgele seçilen noktalarda bu oran **%56**. 30 cm eşiğinde isabet yine %74, rastgele beklenti %49. İlk koşumda isabet %56'ydı.
- Noktanın tam kendi hücresine bakınca isabet **%18** (7/39). Model, suyun *hangi vadide ve çukurda* toplanacağını kabaca biliyor, *hangi sokakta* toplanacağını bilmiyor.
- 500 m'lik kareler üzerinden hesaplanan skorlar:

  | Eşik | POD | FAR | CSI |
  |---|---|---|---|
  | 10 cm | 0,62 | 0,94 | 0,05 |
  | 30 cm | 0,57 | 0,94 | 0,06 |

  Model karelerin %31'ini (30 cm'de %26'sını) ıslak gösterdi ve gözlenen karelerin %62'sini (%57'sini) yakaladı. Bu, rastgele beklentinin yaklaşık **2 katı**.
- **Kemerburgaz ve Riva artık ıslak.** İlk koşumda sabit kayıp (sızma ve kanalizasyon) saatte 23–28 mm'ye kadar yağışı tamamen yuttuğu için iki bölge de "kuru" kalmıştı. Güncel sürümde Kemerburgaz'daki 5 noktanın 5'i, Riva Deresi taşkını da isabet. Bunu sağlayan, doymuş zemin ve yukarı havzadan gelen suyun kanalizasyon kaybı olmadan girmesi. Horton sızması tek başına (kuru ya da nemli başlangıç) Kemerburgaz'ı ıslatmaya yetmedi.
- **Kalan 10 kaçırmanın 6'sı alt geçit, tünel ve metro.** Arazi modeli bu yapıları göremiyor.
- **İsabetlerin artışının bir kısmı modelin daha geniş alanı ıslatmasından geliyor.** Islak alan toplamı 8 pencerede 5,0'dan 13,5 km²'ye çıktı. Şansa göre üstünlük (isabet / rastgele beklenti) 1,24'ten 1,33'e çıktı. Asıl kazanç, önceden yapısal olarak kaçırılan dere taşkınları.
- Yanlış alarm oranı (FAR) çok yüksek görünüyor, ama bu büyük ölçüde gözlemlerin eksikliğinden. İBB'ye 8.500'ü aşkın ihbar geldi, bizim listemizde 74 nokta var. FAR burada bir üst sınır olarak okunmalı.

## 1. Gözlem verisi

**Kaynaklar:** Hürriyet, Milliyet ve CNN Türk canlı yayın akışları; Haberler.com (DHA/İHA); Euronews; Sondakika; İstanbul Valiliği ve İBB/AKOM açıklamaları. Tam liste ve her noktanın linki CSV'de.

**Kapsam:**

- 74 nokta toplandı.
- Güven düzeyi: 41'i "yüksek" (yeri net, en az bir güvenilir haber), 33'ü "orta".
- İlçelere dağılım: Sarıyer 10, Eyüpsultan 8, Kağıthane 6, Beykoz 6, Fatih 5, Beşiktaş 4, diğer ilçeler 35.

**Konum hassasiyeti:** her noktaya üç sınıftan biri verildi ve model bu yarıçap içinde arandı.

| Sınıf | Tanım | Arama yarıçapı |
|---|---|---|
| nokta | belirli bir yer | 150 m |
| cadde | etkilenen cadde parçasının ortası | 300 m |
| mahalle | mahalle merkezi | 750 m |

**Değerlendirme dışı:** 3 nokta su baskını değil, hasar olduğu için çıkarıldı (Eyüpsultan Belediyesi önündeki yol çökmesi, GOP'ta çamur, Sütlüce'de kazı çukuru).

**Toplu istatistikler (karşılaştırmada doğrudan kullanılmadı):**

- Valilik (14 Ekim 06:00–20:00): 1.277 su baskını ihbarı.
- İBB/AKOM (15 Ekim sabahı): 8.515 ihbar. Günlük yağış toplamları (kg/m²):

  | İlçe | Yağış |
  |---|---|
  | Beykoz | 242–273 |
  | Sarıyer | 188–208 |
  | Eyüpsultan | 190–203 |

- Yayımlanmayan veriler: ilçe bazında ihbar sayıları ve saatlik yağış.

**Zaman:** Yağış 14 Ekim sabahı başladı, akşam şiddetlendi ve 14'ü 15'e bağlayan gece de sürdü. Haber saatlerinin çoğu olay saati değil, yayın saati. Bu yüzden karşılaştırma zaman bilgisi kullanmıyor: olay boyunca ulaşılan en yüksek derinliğe bakıyor.

## 2. Yöntem

**Model koşuları:** Site yerelde açıldı (`python3 -m http.server`). Her bölge için ayarlar şöyleydi:

- Bölge boyutu "Orta": 256×256 hücre, hücre ~28,8 m, pencere ~7,4 km.
- Yağış: "14 Ekim 2026 · 12 saat, saat saat" senaryosu.
- Diğer ayarlar varsayılan:
  - kanalizasyon "standart": ızgara 25 mm/sa, depolama 10 mm, boşaltım 15 mm/sa;
  - sızma 8 mm/sa;
  - yukarı havza girişi açık.

Simülasyon arayüz döngüsü olmadan `simStep` ile 13 saat (12 saat yağış + 1 saat çekilme) koşturuldu. Her adımda hücre bazında en yüksek derinlik tutuldu (`FLOODTRACE.max` ile aynı tanım, ama yalnızca istatistik güncellemelerinde değil, her adımda).

**Pencereler:** Kağıthane, Eyüpsultan (Alibeyköy–Bayrampaşa), Ayazağa, Sarıyer (Boğaz kıyısı), Kemerburgaz–Göktürk, Beykoz merkez, Riva, Beşiktaş–Etiler. Bir nokta birden çok pencereye düşüyorsa kenara en uzak olduğu pencere kullanıldı.

**Nokta bazında isabet:** Noktanın hassasiyet yarıçapındaki kara hücrelerinde modelin en yüksek derinliği eşiği geçiyorsa (10 cm ya da 30 cm) nokta "isabet" sayıldı.

**Şans düzeyi:** Aynı penceredeki rastgele kara noktalarında (her nokta için 600 örnek) aynı yarıçapla aynı test yapıldı. Böylece "yarıçap büyüdükçe her yer ıslak çıkar" etkisi ölçülmüş oldu.

**Kare bazında POD, FAR ve CSI:** Pencereler 500 m'lik (ve 1 km'lik) karelere bölündü.

- Gözlenen ıslak kare: içinde en az bir nokta bulunan kare.
- Model ıslak kare: eşiği geçen alanı en az 2.500 m² (1 km'de 5.000 m²) olan kare.
- Yarısından fazlası deniz olan kareler ve başka pencereye ait kareler sayılmadı.
- İsabet (H), kaçırma (M) ve yanlış alarm (F) sayıldı:
  - POD = H/(H+M)
  - FAR = F/(H+F)
  - CSI = H/(H+M+F)

## 3. Sonuçlar

### 3.1 Pencerelere uygulanan yağış ve model taşkın alanı

12 saatlik yağış, Open-Meteo'nun saatlik dağılımının en yakın AKOM ölçümlerine ölçeklenmesiyle elde edildi.

| Pencere | 12 sa yağış (mm) | En yağışlı saat (mm) | ≥10 cm alan (km²) | ≥30 cm alan (km²) | Kara alanı (km²) |
|---|---|---|---|---|---|
| Kağıthane | 151,9 | 39,8 | 1,61 | 1,27 | 53,8 |
| Eyüpsultan | 163,0 | 35,3 | 1,34 | 1,09 | 52,7 |
| Ayazağa | 143,2 | 37,5 | 0,87 | 0,43 | 54,3 |
| Sarıyer | 144,1 | 35,7 | 0,35 | 0,23 | 40,8 |
| Beykoz | 195,5 | 55,2 | 0,57 | 0,42 | 39,9 |
| Beşiktaş | 158,1 | 39,2 | 0,28 | 0,17 | 44,7 |
| **Kemerburgaz** | 106,5 | **19,5** | **0** | **0** | 54,3 |
| **Riva** | 160,0 | **26,5** | **0** | **0** | 44,1 |

### 3.2 Nokta bazında isabet (yarıçap içinde en yüksek derinlik)

| Pencere | Nokta | İsabet ≥10 cm | Şans beklentisi ≥10 cm | İsabet ≥30 cm | Şans beklentisi ≥30 cm |
|---|---|---|---|---|---|
| Kağıthane | 10 | **9** | 5,6 | **9** | 5,0 |
| Ayazağa | 6 | **5** | 3,4 | **5** | 2,7 |
| Beykoz | 4 | **4** | 2,7 | **4** | 2,4 |
| Eyüpsultan | 5 | 2 | 2,5 | 2 | 2,2 |
| Sarıyer | 3 | 1 | 1,3 | 1 | 1,1 |
| Beşiktaş | 5 | 1 | 1,9 | 1 | 1,5 |
| Kemerburgaz | 5 | 0 | 0 | 0 | 0 |
| Riva | 1 | 0 | 0 | 0 | 0 |
| **Toplam** | **39** | **22 (%56)** | %45 | **22 (%56)** | %38 |
| Kemerburgaz ve Riva hariç | 33 | 22 (%67) | %53 | 22 (%67) | %45 |

Yalnızca noktanın kendi hücresine bakıldığında isabet 2/39 (%5). Bu iki nokta, Kağıthane geneli ve Alibeyköy, ikisi de "mahalle" düzeyinde.

**Sayılara göre öne çıkanlar:**

- Kağıthane, Ayazağa ve Beykoz'da model şansın açıkça üzerinde. Bunlar dere vadisinde ya da vadi tabanında kalan noktalar: Sadabad ve Kağıthane Meydanı, Dereboyu Caddesi, Şahinkaya Caddesi, Çamlıbahçe.
- Ayazağa Kemerburgaz Caddesi'nde haberlerde 2–3 m su konuşuluyor. Model 300 m içinde 1,6 m veriyor.
- Eyüpsultan, Sarıyer ve Beşiktaş'ta model şans düzeyinde ya da altında.

**Kaçırılan 17 noktanın dağılımı:**

| Neden | Sayı | Noktalar |
|---|---|---|
| Model bu pencerede hiç su üretmedi | 6 | Kemerburgaz İstanbul Cd., Göktürk, Kemerburgaz merkez, Uzunkemer, Selanik Bulvarı, Riva Deresi |
| Zemin altı yapı (alt geçit, tünel, metro) | 6 | Nispetiye ve Aytar Cd. alt geçitleri, Zincirlikuyu metro, Kağıthane–Piyalepaşa ve Çayırbaşı tünelleri, Esenler metro |
| Düz kentsel alan ya da kıyı yolu | 5 | Büyükdere Cd. (Ayazağa), Hamidiye Etfal bahçesi (yeri yaklaşık), Bebek sahili, Lütfi Aykaç Bulvarı, Hal Yolu |

### 3.3 Kare bazında POD, FAR ve CSI (8 pencere)

| Kare | Eşik | H | M | F | POD | FAR | CSI | Modelin ıslak gösterdiği kare oranı |
|---|---|---|---|---|---|---|---|---|
| 500 m | 10 cm | 16 | 21 | 231 | 0,43 | 0,94 | 0,06 | 0,18 |
| 500 m | 30 cm | 13 | 24 | 159 | 0,35 | 0,92 | 0,07 | 0,13 |
| 1 km | 10 cm | 18 | 14 | 95 | 0,56 | 0,84 | 0,14 | 0,38 |
| 1 km | 30 cm | 15 | 17 | 74 | 0,47 | 0,83 | 0,14 | 0,30 |

Kemerburgaz ve Riva hariç tutulunca skorlar şöyle değişiyor:

| Kare | Eşik | POD | FAR | CSI |
|---|---|---|---|---|
| 500 m | 10 cm | 0,52 | 0,94 | 0,06 |
| 500 m | 30 cm | 0,42 | 0,92 | 0,07 |
| 1 km | 10 cm | 0,67 | 0,84 | 0,15 |

**Okuma:**

- POD'u modelin ıslak gösterdiği kare oranıyla kıyaslamak gerekir. Rastgele bir harita, karelerin %18'ini ıslak gösterseydi gözlenen karelerin de ancak %18'ini yakalardı. Model %43'ünü yakaladı.
- 1 km'lik karelerde bu avantaj küçülüyor: POD/oran yaklaşık 1,5. Kareler büyüyünce hemen her kare ıslak sayılmaya başlıyor.
- FAR'ın 0,9 civarında çıkması, modelin ıslak gösterdiği yerlerin çoğu için *haber bulunmamasından* kaynaklanıyor. 74 nokta 8.500 ihbarın küçük ve yollara, ölümlere, kurtarmalara kaymış bir örneği. Bu yüzden FAR ve CSI'ın gerçek değerden kötü çıktığını varsaymak gerekir.

### 3.4 Duyarlılık: kanalizasyon kapalıyken Kemerburgaz

"Kemerburgaz kuru kaldı" sonucunun gerçekten kayıp eşiğinden kaynaklandığını sınamak için aynı pencereyi iki koşulla tekrar koşturduk: kanalizasyon "yok", sızma 8 mm/sa. Yağış aynı (106,5 mm, en çok 19,5 mm/sa).

| | Varsayılan kanalizasyon | Kanalizasyon yok |
|---|---|---|
| ≥10 cm alan | 0 km² | **3,86 km²** |
| ≥30 cm alan | 0 km² | **3,23 km²** |
| İsabet (5 nokta) | 0/5 | **5/5** |
| Şans beklentisi ≥10 cm / ≥30 cm | – | 3,8 / 3,4 |

Kanalizasyon kapalıyken Selanik Bulvarı 3,75 m, Kemerburgaz merkez 3,5 m ve Göktürk 1,8 m su gösteriyor.

Bu sonuç, kanalizasyonun 14 Ekim'de devre dışı olduğu anlamına gelmiyor. Gösterdiği şu: model, fazla yağışın sıfır mı yoksa birkaç mm/sa mı olduğuna çok duyarlı. 14 Ekim gibi uzun olaylarda sabit kayıp eşiği, taşkının ana sürücüsünü tamamen siliyor.

### 3.5 Horton sızmasıyla yeniden koşum

İlk koşumdan sonra sabit sızma (8 mm/sa) yerine Horton sızması eklendi: f = fc + (f0 − fc)·e^(−x), zemin ıslandıkça x büyüyor ve sızma azalıyor. Aynı 8 pencere, aynı 74 nokta ve aynı yöntemle (bölüm 2) dört koşumu karşılaştırdık:

| Koşum | Sürüm | Zemin (f0 → fc) | Önceki günler | Yukarı havzada kanalizasyon kaybı |
|---|---|---|---|---|
| **Eski** | `0dde05f` | sabit 8 mm/sa | – | var |
| **Horton · kuru** | `b692cff` | Karışık kentsel, 30 → 3 mm/sa | Kuru (x₀ = 0) | var |
| **Horton · nemli** | `b692cff` | Karışık kentsel, 30 → 3 mm/sa | Nemli (x₀ = 1) | var |
| **Güncel site** | `bedabf8` | Beton / asfalt, 6 → 1 mm/sa (yukarı havzada en az Karışık kentsel) | Doygun (x₀ = 3), 14 Ekim düğmesi kendisi seçer | yok |

Tüm koşumlarda kanalizasyon "standart" (%20 tıkanıklık) ve yukarı havza açık.

**Sonuçlar:**

| | Eski | Horton · kuru | Horton · nemli | Güncel site |
|---|---|---|---|---|
| Nokta isabeti ≥10 cm (n = 39) | 22 (%56) | 24 (%62) | 24 (%62) | **29 (%74)** |
| Rastgele beklenti ≥10 cm | %45 | %47 | %48 | %56 |
| Nokta isabeti ≥30 cm | 22 (%56) | 24 (%62) | 24 (%62) | **29 (%74)** |
| Rastgele beklenti ≥30 cm | %38 | %41 | %42 | %49 |
| Hücre bazında isabet ≥10 cm | 2 (%5) | 4 (%10) | 5 (%13) | 7 (%18) |
| 500 m POD / FAR / CSI, 10 cm | 0,43 / 0,94 / 0,06 | 0,46 / 0,95 / 0,05 | 0,49 / 0,94 / 0,05 | **0,62** / 0,94 / 0,05 |
| 500 m POD / FAR / CSI, 30 cm | 0,35 / 0,92 / 0,07 | 0,41 / 0,93 / 0,06 | 0,41 / 0,94 / 0,06 | **0,57** / 0,94 / 0,06 |
| Modelin ıslak gösterdiği kare oranı (10 / 30 cm) | 0,18 / 0,13 | 0,24 / 0,17 | 0,24 / 0,18 | 0,31 / 0,26 |
| Kemerburgaz isabeti (5 nokta) | 0 | 0 | 0 | **5** |
| Riva Deresi isabeti (1 nokta) | 0 | 1 | 1 | 1 |

**Pencere başına ≥10 cm alan (km²):**

| Pencere | Eski | Horton · kuru | Horton · nemli | Güncel site |
|---|---|---|---|---|
| Kağıthane | 1,61 | 1,97 | 2,28 | 2,71 |
| Eyüpsultan | 1,34 | 1,67 | 1,66 | 1,90 |
| Ayazağa | 0,87 | 1,01 | 1,18 | 1,73 |
| Sarıyer | 0,35 | 0,41 | 0,41 | 0,49 |
| Beykoz | 0,57 | 0,65 | 0,65 | 0,77 |
| Kemerburgaz | **0** | **0** | **0** | **3,60** |
| Beşiktaş | 0,28 | 0,35 | 0,35 | 0,44 |
| Riva | **0** | 0,81 | 0,91 | 1,90 |
| **Toplam** | 5,02 | 6,87 | 7,44 | 13,54 |

Kemerburgaz ve Riva hariç tutulunca (33 nokta) isabet şöyle:

| | Eski | Horton (kuru ve nemli) | Güncel site |
|---|---|---|---|
| İsabet | %67 | %70 | %70 |
| Rastgele beklenti | %53 | – | %54 |

**Yorum:**

- **Kuru ile nemli başlangıç neredeyse aynı sonucu veriyor.**
  - "Karışık kentsel" zeminde kuru başlangıçta bile sızma 2–3 saatte taban değerine (3 mm/sa) iniyor. En yağışlı saatler de 12 saatlik pencerenin 3.–6. saatlerine denk geliyor.
  - Kuru ile nemli arasında alan yalnızca Kağıthane, Ayazağa ve Riva'da biraz farklı (2,0 → 2,3; 1,0 → 1,2; 0,8 → 0,9 km²). İsabet sayısı aynı.
- **Horton tek başına Kemerburgaz'ı kurtarmıyor.**
  - Kemerburgaz'ın en yağışlı saati 19,5 mm. Izgaralar (25 mm/sa × %80 = 20 mm/sa) ve taban sızma (3 mm/sa) birlikte bunu hâlâ tamamen yutuyor.
  - Yukarı havza da aynı kaybı düştüğü için Kemerburgaz–Cendere vadisine dışarıdan su gelmiyor.
  - Riva ise en çok 26,5 mm/sa ile eşiği az da olsa aşıyor ve Horton ile ıslanıyor.
- **Güncel sitede Kemerburgaz 5/5.**
  - Yukarı havzada kanalizasyon kaybı düşülmüyor (dışarıdaki yağış derelere boşalıyor); zemin de doygun.
  - Selanik Bulvarı 3,8 m, Kemerburgaz merkez 3,5 m, Göktürk 1,8 m su gösteriyor. Bu değerler bölüm 3.4'teki "kanalizasyon yok" duyarlılık koşusuyla çok benzer.
  - Kemerburgaz'ı ıslatan esas olarak yukarı havzadan gelen su. Pencere içindeki fazla yağış hâlâ küçük.
- **Şansa göre üstünlük pek değişmedi.**
  - İsabet / rastgele beklenti 10 cm'de 1,24 → 1,32 (kuru) → 1,29 (nemli) → 1,33 (güncel).
  - 500 m karelerde POD / ıslak kare oranı 2,4 → 1,9 → 2,0 → 2,0.
  - Yani modelin vadileri ayırt etme gücü aynı kaldı. Değişen, önceden hiç su üretmediği uzun-orta şiddetli yağış bölgelerinde artık taşkın üretebilmesi.
- **Güncel sitede kaçırılan 10 nokta:**
  - 6'sı zemin altı yapı: Nispetiye ve Aytar Cd. alt geçitleri, Zincirlikuyu ve Esenler metroları, Kağıthane–Piyalepaşa ve Çayırbaşı tünelleri.
  - 4'ü düz kentsel alan ya da kıyı: Büyükdere Cd. (Ayazağa), Hamidiye Etfal bahçesi, Bebek sahili, Lütfi Aykaç Bulvarı.
  - Hal Yolu artık isabet (73 cm).
- **FAR değişmedi (0,94).** Model ıslak alanı neredeyse üç katına çıkardı. Gözlem listesi eksik olduğu için bunların ne kadarının gerçek yanlış alarm olduğu bilinmiyor.

**Bu karşılaştırmanın sınırları:**

- "Güncel site" sütunu üç değişikliği birlikte içeriyor: zemin türü, doygun başlangıç ve yukarı havzada kanalizasyon kaybının kaldırılması. Etkileri ayrı ayrı ölçülmedi.
- Koşumlar arasında yağış, DEM ve nokta listesi aynı.

## 4. Sınırlamalar

- **30 m arazi modeli (terrarium/FABDEM).**
  - Alt geçitler, tüneller, metro girişleri, istinat duvarları ve bordürler görünmüyor. Kaçırılan noktaların üçte biri bu türden.
  - 7,4 km'lik pencerede tek bir sokağın ıslak ya da kuru olması model çözünürlüğünün altında. İsabet ancak 150–750 m tolerans ile anlamlı.
- **Toplu kanalizasyon.**
  - Kanalizasyon her hücrede aynı kapasiteyle (ızgara 25 mm/sa, %20 tıkanma) çalışan bir "çekme" terimi olarak modellendi.
  - Gerçekte İstanbul'da şunlar oldu: rögarların geri tepmesi (Alibeyköy, İzzetpaşa), dere ıslahı ve menfez kapasitesi, toplu sistemin denize ya da dereye boşaltım kısıtları.
- **Sabit kayıp eşiği (ilk koşum; Horton ve güncel site için bkz. 3.5).**
  - Sızma (8 mm/sa) ve kanalizasyon birlikte saatlik yağışın ilk 23–28 mm/sa'ini yutuyor.
  - Zemin doygunluğu modellenmiyor. Uzun ve orta şiddetli yağışlar (Kemerburgaz: 12 saatte 106 mm, en çok 19,5 mm/sa) hiç taşkın üretmiyor.
  - 14 Ekim'de taşkının büyük kısmı tam da bu tür yağıştan, havza ölçeğinde doyan zeminden ve taşan derelerden geldi.
  - Yukarı havza girişi de aynı fazla-yağış hesabını kullandığı için dere taşkını da üretilmiyor.
- **Düzgün ve saatlik yağış.**
  - Pencere içinde yağış her yerde aynı.
  - Saatlik toplamlar 10–15 dakikalık zirveleri yumuşatıyor. Kentsel taşkını çoğu zaman bu kısa zirveler başlatır.
  - Saatlik dağılım bir model ürünü (Open-Meteo). Olay toplamı yalnızca 3–5 AKOM istasyonuna ölçekli. AKOM'un saatlik verisi yayımlanmadı.
- **Gözlem yanlılığı.**
  - Haberler can kaybı, kurtarma ve trafik olan yerleri öne çıkarıyor; noktalar yollara ve alt geçitlere yığılıyor.
  - Koordinatların bir kısmı mahalle merkezi düzeyinde.
  - Saatler yayın saati, olay saati değil.
  - Ölçülmüş derinlik yok ("diz boyu", "2–3 m" gibi ifadeler var). Bu yüzden 10/30 cm eşikleri gözlem tarafında doğrulanamıyor; iki eşikte nokta isabetinin aynı çıkması da bundan.
- **Dere yatağı etkisi.** Tolerans yarıçapı dere yatağına değdiğinde modelin dere içindeki suyu da "isabet" sayılabiliyor (ör. Şahinkaya Cd. 3,9 m). Bu, özellikle Beykoz ve Kağıthane'de isabeti bir miktar şişiriyor olabilir.

## 5. Sonuç ve öneriler

Model kentsel vadilerde (Kağıthane, Ayazağa, Beykoz merkez) suyun toplandığı yerleri şanstan belirgin biçimde iyi işaret ediyor. Ama sokak ölçeğinde ve zemin altı yapılarda (alt geçit, tünel, metro) güvenilir değil. İlk sürüm uzun süreli, orta şiddetli yağışın yarattığı dere taşkınlarını (Kemerburgaz, Riva) hiç göremiyordu. Güncel sürüm doymuş zemin ve kayıpsız yukarı havza girişiyle bunları yakalıyor (3.5).

Bir sonraki adımlar, etki sırasına göre:

1. **Doygunluğa bağlı sızma** (ör. Horton ya da SCS-CN). Toplam yağış arttıkça sızma azalsın; yukarı havza girişine de uygulansın. *Yapıldı (`b692cff`, `f3afbcc`); sonuçlar 3.5'te. Kemerburgaz ve Riva artık ıslak.*
2. **Alt geçit katmanı.** OSM'deki `tunnel=yes` ve `layer<0` yolları için DEM'e yapay çukur eklensin.
3. **Daha iyi yağış verisi.** AKOM'dan saatlik ya da 10 dakikalık istasyon verisi, ya da radar tahmini alınsın; yağış pencere içinde mekânsal olarak değişsin.
4. **Daha güvenilir doğrulama.** İBB'den mahalle düzeyinde ihbar sayıları istensin; bu, FAR ve CSI'ı anlamlı kılar. Sentinel-1 ya da Sentinel-2'den taşkın izi çıkarılsın.
