// Türkiye'nin bilinen karst alanları — seçilmiş liste (plato, polye, düden, obruk, kaynak, mağara, travertin, kanyon).
// Konumlar 2026-10'da doğrulandı:
//   • OpenStreetMap / Nominatim (nominatim.openstreetmap.org/search): Taşeli Platosu (place=locality), Yedigöller Platosu,
//     Kızören ve Çıralı obrukları (natural), Suğla/Avlan/Kovada gölleri, Kestel Gölü (locality), Eynif Ovası, Düden Şelalesi,
//     Pamukkale, Dim Mağarası, Munzur Gözeleri, Cennet–Cehennem çöküğü (natural=sinkhole), Yerköprü Şelalesi, mağara girişleri
//     (Altınbeşik, Karain, Ballıca, İnsuyu, Dupnisa, Zeytintaşı, Pınargözü), Horma/Valla kanyonu, Ilgarini, Mencilis,
//     Bıyıklı (Kırkgöz), Mut, Elmalı, Yenişarbademli.
//   • Wikipedia koordinatları: Bey Dağları, Geyik Dağları, Tınaztepe Mağarası, Oymapınar Barajı, Munzur Dağları.
//   • Bolkar (Medetsiz) data/tr_daglar.js'ten (AWS DEM ile doğrulanmış zirve).
//   • Anamas: Yenişarbademli (OSM) ile Dedegöl (OSM natural=peak) arasındaki plato yüzeyi; kesin merkez değil.
//   • Karst açıklamaları: Kestel polye sistemi ve Antalya traverten platosu (Doğan, Koçyiğit & Yeşilyurt 2019, Geomorphology),
//     Kırkgöz'ün Kestel düdenlerinden beslenmesi (ASAT açıklaması, DHA haberi), Dumanlı kaynağı 25–100 m³/s ve baraj gölü altında
//     kalması (JMO Oymapınar raporu), Anamas'ta ~10 600 dolin (Uludağ Üniv. dolin kümelenme çalışması).
// Karst alanları seçicide "Geniş ~15 km" boyutla açılır ve Karst modu kendiliğinden açılır.
window.TR_KARST={"source":"Konumlar: OpenStreetMap/Nominatim ve Wikipedia (2026-10). Açıklamalar: yaygın jeomorfoloji kaynakları.","karst":[
{"n":"Taşeli Platosu","t":"plato","il":"Mersin · Karaman · Antalya","d":"Orta Toroslar'ın geniş kireçtaşı platosu; dolinler, yüzey akışı çok az","lat":36.3625,"lon":32.6434},
{"n":"Aladağlar · Yedigöller Platosu","t":"plato","il":"Kayseri · Niğde · Adana","d":"Yüksek dağ karstı; buzul-karst gölleri ve derin kuyular","lat":37.8007,"lon":35.1763},
{"n":"Beydağları","t":"plato","il":"Antalya","d":"Batı Toroslar'ın yüksek karst kütlesi; dolin ve uvala alanları","lat":36.6447,"lon":30.1764},
{"n":"Anamas Dağları","t":"plato","il":"Isparta · Konya","d":"On binden fazla dolinle kaplı karst platosu; Beyşehir Gölü'nü besler","lat":37.74,"lon":31.36},
{"n":"Pınargözü Mağarası (Anamas)","t":"mağara","il":"Isparta","d":"Türkiye'nin en uzun mağaralarından; Anamas karstının suyunu taşır","lat":37.6954,"lon":31.3093},
{"n":"Geyik Dağları","t":"plato","il":"Antalya · Konya · Karaman","d":"Akseki–Hadim arası yüksek karst; polyeler ve düdenler","lat":37.1058,"lon":31.9778},
{"n":"Bolkar Dağları","t":"plato","il":"Niğde · Mersin","d":"Orta Toroslar yüksek karstı; Karagöl ve dolinler","lat":37.3927,"lon":34.6305},
{"n":"Kızören Obruğu","t":"obruk","il":"Konya (Karatay)","d":"Göllü obruk; Konya Ovası obruk platosunun simgesi","lat":38.1749,"lon":33.1857},
{"n":"Çıralı Obruğu (Karapınar)","t":"obruk","il":"Konya (Karapınar)","d":"Yeraltı suyu düştükçe artan çökme obruklarından","lat":37.9321,"lon":33.4129},
{"n":"Suğla Polyesi","t":"polye","il":"Konya (Seydişehir)","d":"Mevsimlik göl; su düdenlerden yeraltına kaçar","lat":37.3291,"lon":32.0022},
{"n":"Elmalı Polyesi","t":"polye","il":"Antalya","d":"Geniş kapalı havza; düdenlerle drene olur","lat":36.7384,"lon":29.9184},
{"n":"Avlan Gölü (Elmalı)","t":"polye","il":"Antalya","d":"Elmalı polyesinin güney ucunda düdenli göl","lat":36.5813,"lon":29.9355},
{"n":"Kestel Polyesi","t":"polye","il":"Burdur (Bucak)","d":"Kurutulan Kestel Gölü; düdenleri Kırkgöz kaynaklarını besler","lat":37.4056,"lon":30.4745},
{"n":"Eynif Polyesi","t":"polye","il":"Antalya (İbradı)","d":"Toros'ların büyük polyelerinden; ponorlarla Manavgat'a akar","lat":37.1297,"lon":31.4583},
{"n":"Eğirdir–Kovada Karstı","t":"polye","il":"Isparta","d":"Kovada Gölü ve çevresi; tektonik-karstik çanak","lat":37.6339,"lon":30.8819},
{"n":"Manavgat · Dumanlı Kaynağı / Oymapınar","t":"kaynak","il":"Antalya","d":"25–100 m³/s debili dev karst kaynağı, baraj gölü altında","lat":36.9086,"lon":31.5317},
{"n":"Kırkgöz Kaynakları","t":"kaynak","il":"Antalya (Döşemealtı)","d":"Kestel düdenlerinden beslenen kaynaklar; Düden'i besler","lat":37.1172,"lon":30.5898},
{"n":"Düden Şelalesi (Antalya)","t":"düden","il":"Antalya","d":"Yeraltından çıkan Düden Çayı; traverten platosu","lat":36.9648,"lon":30.7267},
{"n":"Karain Mağarası","t":"mağara","il":"Antalya (Döşemealtı)","d":"Traverten platosu kenarında karst mağarası","lat":37.0778,"lon":30.5706},
{"n":"Pamukkale Travertenleri","t":"travertin","il":"Denizli","d":"Sıcak karbonatlı kaynakların çökelttiği traverten basamakları","lat":37.92,"lon":29.1218},
{"n":"Tınaztepe Mağarası","t":"mağara","il":"Konya (Seydişehir)","d":"Çok katlı karst mağarası ve düden sistemi","lat":37.2647,"lon":31.9267},
{"n":"Göksu Vadisi (Mut)","t":"kanyon","il":"Mersin","d":"Taşeli Platosu'nu yaran derin karst vadisi","lat":36.6434,"lon":33.4373},
{"n":"Dim Çayı · Dim Mağarası (Alanya)","t":"mağara","il":"Antalya","d":"Alanya karstı; mağara ve karst kaynaklı Dim Çayı","lat":36.5392,"lon":32.1098},
{"n":"Munzur Gözeleri","t":"kaynak","il":"Tunceli (Ovacık)","d":"Munzur karstının boşaldığı kaynaklar","lat":39.3314,"lon":39.0575},
{"n":"Munzur Dağları","t":"plato","il":"Tunceli · Erzincan","d":"Yüksek karst kütlesi; kar suyu yeraltına süzülür","lat":39.4325,"lon":39.0781},
{"n":"Cennet–Cehennem Obrukları","t":"obruk","il":"Mersin (Silifke)","d":"Kıyı karstında dev çöküntü obrukları","lat":36.4525,"lon":34.1057},
{"n":"Yerköprü Şelalesi (Hadim)","t":"kaynak","il":"Konya (Hadim)","d":"Göksu'ya dökülen karst kaynağı ve traverten köprü","lat":37.0287,"lon":32.6936},
{"n":"Altınbeşik Mağarası","t":"mağara","il":"Antalya (İbradı)","d":"Yeraltı gölü olan aktif karst mağarası","lat":37.0379,"lon":31.6334},
{"n":"Zeytintaşı Mağarası","t":"mağara","il":"Antalya (Serik)","d":"Damlataşlı fosil karst mağarası","lat":37.0471,"lon":31.1106},
{"n":"İnsuyu Mağarası","t":"mağara","il":"Burdur","d":"Mağara gölleri; yeraltı suyu seviyesine bağlı","lat":37.6597,"lon":30.3758},
{"n":"Ballıca Mağarası","t":"mağara","il":"Tokat (Pazar)","d":"Damlataş ve sarkıtlarıyla ünlü karst mağarası","lat":40.2273,"lon":36.3015},
{"n":"Horma–Valla Kanyonu (Küre Dağları)","t":"kanyon","il":"Kastamonu","d":"Kireçtaşına oyulmuş karst kanyonları","lat":41.6328,"lon":33.1419},
{"n":"Ilgarini Mağarası","t":"mağara","il":"Kastamonu","d":"Küre Dağları'nda dikey girişli karst mağarası","lat":41.7521,"lon":33.0031},
{"n":"Bulak Mencilis Mağarası","t":"mağara","il":"Karabük","d":"Yeraltı dereli aktif karst mağarası","lat":41.2738,"lon":32.6246},
{"n":"Dupnisa Mağarası","t":"mağara","il":"Kırklareli (Demirköy)","d":"Istranca karstında katlı mağara sistemi","lat":41.8406,"lon":27.5559}
]};
