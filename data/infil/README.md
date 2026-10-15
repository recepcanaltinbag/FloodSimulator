# Zemin emişi karoları (RGB PNG, Web Mercator XYZ)

`12/x/y.png` (~30 m): İstanbul ili + `dem/fabdem` yamaları (karst alanları, dağlar). `10/x/y.png` (~120 m): Türkiye kutusu
(25,6–44,9 D, 35,8–42,2 K), yalnızca karada en az bir pikseli olan karolar. Liste: `index.json`. Üretim: `tools/make_infil_tiles.py`.

Kodlama: R = baskın arazi örtüsü (yapı dışı; 1 ağaç, 2 çalı, 3 çayır, 4 tarım, 5 yapı, 6 çıplak/seyrek, 7 kar, 8 su, 9 sulak alan,
10 mangrov, 11 yosun/liken; 0 veri yok) · G = yapı payı × 250 · B = USDA doku sınıfı 1..12 (1 kil … 7 tın … 12 kum)
+16 GLiM'de karbonatlı tortul kayaç +32 SoilGrids'in boş bıraktığı ve çevreden doldurulan hücre.
Sızma parametreleri tarayıcıda `infil.js` tablolarıyla hesaplanır.

Kaynaklar ve lisans (bu karolar türetilmiş veridir; atıfla serbestçe kullanılabilir):
- © ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021) processed by ESA WorldCover consortium.
  Zanaga vd. (2022), ESA WorldCover 10 m 2021 v200, doi:10.5281/zenodo.7254221 — CC BY 4.0
- SoilGrids 2.0, ISRIC – World Soil Information. Poggio vd. (2021), SOIL 7, 217–240, doi:10.5194/soil-7-217-2021 — CC BY 4.0
  (0–5, 5–15, 15–30 cm kum ve kil ortalamaları, WCS ile EPSG:4326'ya 0,0025° çözünürlükte)
- GLiM v1.0 0,5° ızgara. Hartmann & Moosdorf (2012), G-cubed 13, Q12004, doi:10.1029/2012GC004370;
  doi:10.1594/PANGAEA.788537 — CC BY 3.0
