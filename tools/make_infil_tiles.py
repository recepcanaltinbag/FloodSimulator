#!/usr/bin/env python3
"""Zemin emişi (sızma) karoları: ESA WorldCover 2021 + SoilGrids 2.0 + GLiM (0,5°) → data/infil/{z}/{x}/{y}.png

Her karo 256×256 RGB PNG (Web Mercator, XYZ düzeni, dem/fabdem ile aynı):
  R = baskın arazi örtüsü (yapı dışı), 1..11 sırası: ağaç, çalı, çayır, tarım, yapı, çıplak/seyrek, kar, su, sulak alan,
      mangrov, yosun/liken (WorldCover 10..100). Pikselin tamamı yapıysa 5. 0 = veri yok (açık deniz).
  G = yapı (WorldCover 50 "Built-up") payı × 250 (0..250)
  B = USDA toprak dokusu sınıfı 1..12 (SoilGrids 0–30 cm kum/kil ortalaması; 0 = veri yok)
      + 16 (GLiM 0,5° hücresinde baskın kayaç karbonatlı tortul "sc" ise)
      + 32 (SoilGrids'in boş bıraktığı kent/su hücresi; doku çevredeki tahminlerden dolduruldu)
Sınıfların sızma parametrelerine çevrilmesi tarayıcıda yapılır (infil.js, INF_TEX / INF_LC tabloları), böylece tablo
karolar yeniden üretilmeden düzeltilebilir.

Kapsam: z12 → İstanbul ili kutusu + dem/fabdem/index.json karoları (karst alanları, dağlar, Kağıthane);
        z10 → Türkiye kutusu (25,6–44,9 D, 35,8–42,2 K), yalnızca karada en az bir pikseli olan karolar.

Kullanım (rasterio ≥1.3 gerekir; ağ erişimi ister, bir kerelik birkaç yüz MB okur):
  python3 tools/make_infil_tiles.py soil   --cache /tmp/infil      # SoilGrids'i Türkiye için indirir (WCS, ~10 dk)
  python3 tools/make_infil_tiles.py tiles  --cache /tmp/infil --glim glim_wgs84_0point5deg.txt.asc [--part 0/4]
  python3 tools/make_infil_tiles.py index  --cache /tmp/infil                                    # data/infil/index.json
GLiM 0,5° ızgarası: https://doi.org/10.1594/PANGAEA.788537 (CC BY 3.0) → hartmann-moosdorf_2012.zip içindeki .asc dosyası.
"""
import argparse, json, math, os, sys
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "infil")
TR = (25.6, 35.8, 44.9, 42.2)            # lon0, lat0, lon1, lat1
IST = (27.95, 40.80, 29.95, 41.60)       # İstanbul ili
SOIL_RES = 0.0025                        # ~250 m, SoilGrids yerel çözünürlüğü
WC_URL = "https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_{ns}{lat:02d}{ew}{lon:03d}_Map.tif"
SG_URL = "https://files.isric.org/soilgrids/latest/data/{v}/{v}_{d}_mean.vrt"
DEPTHS = [("0-5cm", 5), ("5-15cm", 10), ("15-30cm", 15)]
WC_IDX = {10: 1, 20: 2, 30: 3, 40: 4, 50: 5, 60: 6, 70: 7, 80: 8, 90: 9, 95: 10, 100: 11}

os.environ.setdefault("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")
os.environ.setdefault("CPL_VSIL_CURL_ALLOWED_EXTENSIONS", ".tif,.vrt")
os.environ.setdefault("GDAL_HTTP_MAX_RETRY", "5")
os.environ.setdefault("GDAL_HTTP_RETRY_DELAY", "3")


def soil_grid_shape():
    w = round((TR[2] - TR[0]) / SOIL_RES); h = round((TR[3] - TR[1]) / SOIL_RES)
    return w, h


def cmd_soil(a):
    """SoilGrids WCS'inden (sunucu EPSG:4326'ya yeniden örnekler) 2°×2° parçalar halinde Türkiye kutusu."""
    import rasterio, urllib.request
    from concurrent.futures import ThreadPoolExecutor
    from rasterio.transform import from_origin
    os.makedirs(a.cache, exist_ok=True)
    w, h = soil_grid_shape()
    tr = from_origin(TR[0], TR[3], SOIL_RES, SOIL_RES)
    for v in ("sand", "clay"):
        for d, _ in DEPTHS:
            out = os.path.join(a.cache, f"{v}_{d}.tif")
            if os.path.exists(out) or (a.layer and a.layer != f"{v}_{d}"): continue
            print("SoilGrids", v, d, flush=True)
            arr = np.full((h, w), -32768, np.int16)
            parts = [(lo, la) for lo in np.arange(TR[0], TR[2], 2.0) for la in np.arange(TR[1], TR[3], 2.0)]

            def get(p):
                lo, la = p; lo1 = min(lo + 2, TR[2]); la1 = min(la + 2, TR[3])
                url = (f"https://maps.isric.org/mapserv?map=/map/{v}.map&SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage"
                       f"&COVERAGEID={v}_{d}_mean&FORMAT=image/tiff&SUBSET=long({lo:.4f},{lo1:.4f})&SUBSET=lat({la:.4f},{la1:.4f})"
                       "&SUBSETTINGCRS=http://www.opengis.net/def/crs/EPSG/0/4326&OUTPUTCRS=http://www.opengis.net/def/crs/EPSG/0/4326"
                       f"&RESOLUTION=long({SOIL_RES})&RESOLUTION=lat({SOIL_RES})")
                for k in range(5):
                    try:
                        data = urllib.request.urlopen(url, timeout=120).read()
                        with rasterio.MemoryFile(data) as mf, mf.open() as s:
                            return s.read(1), s.transform
                    except Exception as e:
                        print("  yeniden", lo, la, e, flush=True)
                raise RuntimeError(url)
            with ThreadPoolExecutor(4) as ex:
                for x, t in ex.map(get, parts):
                    c0 = round((t.c - TR[0]) / SOIL_RES); r0 = round((TR[3] - t.f) / SOIL_RES)
                    hh = min(x.shape[0], h - r0); ww = min(x.shape[1], w - c0)
                    arr[r0:r0 + hh, c0:c0 + ww] = x[:hh, :ww]
            with rasterio.open(out + ".part", "w", driver="GTiff", width=w, height=h, count=1, dtype="int16",
                               crs="EPSG:4326", transform=tr, nodata=-32768, compress="deflate") as dst:
                dst.write(arr, 1)
            os.replace(out + ".part", out)


def usda_texture(sand, clay):
    """USDA doku üçgeni (sand, clay: %). 1 kil, 2 siltli kil, 3 kumlu kil, 4 killi tın, 5 siltli killi tın, 6 kumlu killi tın,
    7 tın, 8 siltli tın, 9 kumlu tın, 10 silt, 11 tınlı kum, 12 kum."""
    silt = 100 - sand - clay
    t = np.zeros(sand.shape, np.uint8)
    rules = [
        (12, silt + 1.5 * clay < 15),
        (11, (silt + 1.5 * clay >= 15) & (silt + 2 * clay < 30)),
        (9, ((clay >= 7) & (clay < 20) & (sand > 52) & (silt + 2 * clay >= 30)) | ((clay < 7) & (silt < 50) & (silt + 2 * clay >= 30))),
        (7, (clay >= 7) & (clay < 27) & (silt >= 28) & (silt < 50) & (sand <= 52)),
        (8, ((silt >= 50) & (clay >= 12) & (clay < 27)) | ((silt >= 50) & (silt < 80) & (clay < 12))),
        (10, (silt >= 80) & (clay < 12)),
        (6, (clay >= 20) & (clay < 35) & (silt < 28) & (sand > 45)),
        (4, (clay >= 27) & (clay < 40) & (sand > 20) & (sand <= 45)),
        (5, (clay >= 27) & (clay < 40) & (sand <= 20)),
        (3, (clay >= 35) & (sand > 45)),
        (2, (clay >= 40) & (silt >= 40)),
        (1, (clay >= 40) & (sand <= 45) & (silt < 40)),
    ]
    for code, m in rules:
        t[(t == 0) & m] = code
    return t


def load_soil(cache):
    """Doku sınıfı + doldurma işareti. SoilGrids kentleri ve su yüzeylerini tahmin etmez (veri yok); bu boşluklar en çok
    ~10 km uzaktaki tahminlerden ters mesafe ağırlıklı doldurulur (GDAL FillNodata) ve B kanalında +32 ile işaretlenir."""
    import rasterio
    from rasterio.fill import fillnodata
    num = {"sand": 0, "clay": 0}; valid = None
    for v in num:
        acc = None
        for d, wgt in DEPTHS:
            with rasterio.open(os.path.join(cache, f"{v}_{d}.tif")) as s:
                x = s.read(1).astype(np.float32)
            ok = x > 0 if v == "sand" else x >= 0
            valid = ok if valid is None else valid & ok
            acc = x * wgt if acc is None else acc + x * wgt
        num[v] = acc / sum(wg for _, wg in DEPTHS) / 10.0   # g/kg → %
    filled = {}
    for v in num:
        x = np.where(valid, num[v], 0).astype(np.float32)
        filled[v] = fillnodata(x, mask=valid.astype(np.uint8), max_search_distance=40, smoothing_iterations=0)
    got = (filled["sand"] > 0)
    tex = usda_texture(filled["sand"], filled["clay"])
    tex[~got] = 0
    tex[got & ~valid] += 32
    return tex


def load_glim(path):
    with open(path) as f:
        hdr = {}
        for _ in range(6):
            k, v = f.readline().split(); hdr[k.lower()] = float(v)
        g = np.loadtxt(f, dtype=np.int16)
    return g, hdr


def tile_bounds(z, x, y):
    n = 2 ** z
    lon0 = x / n * 360 - 180; lon1 = (x + 1) / n * 360 - 180
    lat = lambda yy: math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * yy / n))))
    return lon0, lat(y + 1), lon1, lat(y)


def tiles_in(z, b):
    n = 2 ** z
    x0 = int((b[0] + 180) / 360 * n); x1 = int((b[2] + 180) / 360 * n)
    ty = lambda la: int((1 - math.log(math.tan(math.radians(la)) + 1 / math.cos(math.radians(la))) / math.pi) / 2 * n)
    return [(x, y) for x in range(x0, x1 + 1) for y in range(ty(b[3]), ty(b[1]) + 1)]


def sample_grid(z, x, y, S):
    """Karo pikseli başına S×S örnek noktası (lon, lat), şekil (256*S, 256*S)."""
    n = 2 ** z; m = 256 * S
    px = (x * 256 + (np.arange(m) + 0.5) / S) / (n * 256)
    py = (y * 256 + (np.arange(m) + 0.5) / S) / (n * 256)
    lon = px * 360 - 180
    lat = np.degrees(np.arctan(np.sinh(np.pi * (1 - 2 * py))))
    return np.meshgrid(lon, lat)


class WorldCover:
    def __init__(self):
        self.ds = {}

    def open(self, la, lo):
        key = (la, lo)
        if key not in self.ds:
            import rasterio
            url = WC_URL.format(ns="N" if la >= 0 else "S", lat=abs(la), ew="E" if lo >= 0 else "W", lon=abs(lo))
            try: self.ds[key] = rasterio.open("/vsicurl/" + url)
            except Exception: self.ds[key] = None
        return self.ds[key]

    def sample(self, LON, LAT, dec):
        """Noktalardaki sınıf (0 = veri yok). dec: okuma seyreltmesi (1 = tam 10 m, 4 = genel görünüm ~40 m)."""
        import rasterio
        from rasterio.enums import Resampling
        out = np.zeros(LON.shape, np.uint8)
        fla = (np.floor(LAT / 3) * 3).astype(int); flo = (np.floor(LON / 3) * 3).astype(int)
        for la, lo in set(zip(fla.ravel().tolist(), flo.ravel().tolist())):
            s = self.open(la, lo)
            if s is None: continue
            m = (fla == la) & (flo == lo)
            lon = LON[m]; lat = LAT[m]
            c0 = max(0, int((lon.min() - s.transform.c) / s.transform.a) - 2)
            c1 = min(s.width, int((lon.max() - s.transform.c) / s.transform.a) + 3)
            r0 = max(0, int((lat.max() - s.transform.f) / s.transform.e) - 2)
            r1 = min(s.height, int((lat.min() - s.transform.f) / s.transform.e) + 3)
            win = rasterio.windows.Window(c0, r0, c1 - c0, r1 - r0)
            W = max(1, (c1 - c0) // dec); H = max(1, (r1 - r0) // dec)
            arr = s.read(1, window=win, out_shape=(H, W), resampling=Resampling.nearest)
            ci = np.clip(((lon - s.transform.c) / s.transform.a - c0) * W / (c1 - c0), 0, W - 1).astype(int)
            ri = np.clip(((lat - s.transform.f) / s.transform.e - r0) * H / (r1 - r0), 0, H - 1).astype(int)
            out[m] = arr[ri, ci]
        return out


def make_tile(z, x, y, wc, tex, glim, ghdr, S, dec):
    LON, LAT = sample_grid(z, x, y, S)
    cls = wc.sample(LON, LAT, dec)
    lut = np.zeros(256, np.uint8)
    for k, v in WC_IDX.items(): lut[k] = v
    ci = lut[cls].reshape(256, S, 256, S).transpose(0, 2, 1, 3).reshape(256, 256, S * S)
    if not ((ci > 0) & (ci != 8)).any(): return None   # kara yok: karo yazılmaz (tarayıcı varsayılan değeri kullanır)
    nval = (ci > 0).sum(2)
    built = (ci == 5).sum(2)
    cnt = np.stack([(ci == k).sum(2) for k in range(12)], 2); cnt[..., 0] = 0; cnt[..., 5] = 0
    dom = cnt.argmax(2).astype(np.uint8)
    dom[(cnt.max(2) == 0) & (built > 0)] = 5
    G = np.where(nval > 0, np.round(250 * built / np.maximum(nval, 1)), 0).astype(np.uint8)
    # pikselin merkezi: toprak (~250 m) ve kayaç (0,5°) en yakın komşu
    lon = LON[S // 2::S, S // 2::S]; lat = LAT[S // 2::S, S // 2::S]
    sc = np.clip(((lon - TR[0]) / SOIL_RES).astype(int), 0, tex.shape[1] - 1)
    sr = np.clip(((TR[3] - lat) / SOIL_RES).astype(int), 0, tex.shape[0] - 1)
    B = tex[sr, sc].copy()
    gc = ((lon - ghdr["xllcorner"]) / ghdr["cellsize"]).astype(int)
    gr = (int(ghdr["nrows"]) - 1 - ((lat - ghdr["yllcorner"]) / ghdr["cellsize"]).astype(int))
    B[glim[gr, gc] == 6] += 16                         # 6 = "sc" karbonatlı tortul kayaç (Classnames.txt)
    return np.dstack([dom, G, B])


def cmd_tiles(a):
    from PIL import Image
    tex = load_soil(a.cache)
    glim, ghdr = load_glim(a.glim)
    wc = WorldCover()
    jobs = []
    if "12" in a.zooms:
        fab = json.load(open(os.path.join(ROOT, "dem", "fabdem", "index.json")))["tiles"]
        t12 = set(tiles_in(12, IST)) | {tuple(map(int, t.split("/"))) for t in fab}
        jobs += [(12, x, y, 4, 1) for x, y in sorted(t12)]
    if "10" in a.zooms:
        jobs += [(10, x, y, 4, 4) for x, y in tiles_in(10, TR)]
    k0, kn = map(int, a.part.split("/"))           # paralel çalıştırma: --part 0/4 … 3/4
    jobs = jobs[k0::kn]
    for k, (z, x, y, S, dec) in enumerate(jobs):
        p = os.path.join(OUT, str(z), str(x), f"{y}.png")
        skip = p + ".none"                            # kara içermeyen karo: tekrar denenmesin
        if (os.path.exists(p) or os.path.exists(skip)) and not a.force: continue
        try: img = make_tile(z, x, y, wc, tex, glim, ghdr, S, dec)
        except Exception as e: print("HATA", z, x, y, e, flush=True); continue
        os.makedirs(os.path.dirname(p), exist_ok=True)
        if img is None: open(skip, "w").close()
        else: Image.fromarray(img, "RGB").save(p, optimize=True)
        if k % 20 == 0: print(f"{k}/{len(jobs)} z{z} {x}/{y}", flush=True)


def cmd_index(a):
    """data/infil altındaki karoları tarayıp index.json yazar (.none işaretleri silinir)."""
    lists = {}
    for z in ("10", "12"):
        L = []
        for root, _, files in os.walk(os.path.join(OUT, z)):
            for f in files:
                if f.endswith(".png.none"): os.remove(os.path.join(root, f))
                elif f.endswith(".png"): L.append((int(os.path.basename(root)), int(f[:-4])))
        lists[z] = [f"{x}/{y}" for x, y in sorted(L)]
    json.dump({"src": "ESA WorldCover 2021 v200 (CC BY 4.0) + SoilGrids 2.0 (CC BY 4.0) + GLiM 0.5° (CC BY 3.0)",
               "enc": "R=arazi örtüsü 1..11, G=yapı payı×250, B=USDA doku 1..12 (+16 karbonat, +32 doldurulmuş)", **lists},
              open(os.path.join(OUT, "index.json"), "w"), separators=(",", ":"), ensure_ascii=False)
    print({z: len(v) for z, v in lists.items()})


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["soil", "tiles", "index"])
    ap.add_argument("--cache", required=True)
    ap.add_argument("--glim")
    ap.add_argument("--zooms", default="12,10")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--part", default="0/1")
    ap.add_argument("--layer", help="soil: yalnızca bu katman (ör. clay_5-15cm), paralel indirme için")
    a = ap.parse_args()
    {"soil": cmd_soil, "tiles": cmd_tiles, "index": cmd_index}[a.cmd](a)
