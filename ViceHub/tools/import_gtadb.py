#!/usr/bin/env python3
"""Importa o mapa oficial, os landmarks e as fotos do GTADB (gtadb.org) para o ViceHub.

Licença dos dados: CC BY 4.0 — "GTA VI Landmarks Data / Map Tiles (CC BY 4.0) — https://map.gtadb.org".
O app mostra esse crédito. O GTADB pede para NÃO buscar dados ao vivo do site: baixe pelo git.

Uso:
  git clone --depth 1 --filter=blob:none --no-checkout https://github.com/rolux/gtadb.org
  cd gtadb.org && git sparse-checkout set --no-cone /LICENSE-DATA /map/data/6/ \
      "/map/photos/6/*,ig.jpg" /maps/tiles/6/day/0/ /maps/tiles/6/day/1/ /maps/tiles/6/day/2/ \
      /maps/tiles/6/day/3/ /maps/tiles/6/day/4/ /maps/tiles/6/day/5/ && git checkout
  python3 ViceHub/tools/import_gtadb.py /caminho/para/gtadb.org [--max-z 5] [--photo-width 480]

Gera em app/src/main/assets/www/:
  gtadb/landmarks.js   dados dos locais
  gtadb/tiles.js       lista dos tiles existentes
  gtadb/photos/L*.jpg  fotos do jogo (reduzidas)
  tiles/<z>/<z>,<y>,<x>.jpg
"""
import json, os, shutil, sys
from PIL import Image

args = sys.argv[1:]
if not args:
    sys.exit(__doc__)
SRC = args[0]
MAX_Z = int(args[args.index("--max-z") + 1]) if "--max-z" in args else 5
PHOTO_W = int(args[args.index("--photo-width") + 1]) if "--photo-width" in args else 480
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WWW = os.path.join(ROOT, "app", "src", "main", "assets", "www")

# Recorte do mapa (metros, origem no canto noroeste do mundo de 32768 m): cobre Leonida inteira.
X0, Y0, W, H = 5760, 5760, 15040, 19840
OFF = 16384

def to_map(wx, wy):
    return round(wx + OFF - X0, 1), round(OFF - wy - Y0, 1)

# ---------- categorias ----------
HASH = [  # ordem = prioridade
    ("#safehouse", "casa"), ("#garage", "garagem"), ("#modshop", "oficina"), ("#pay'n'spray", "oficina"), ("#carwash", "oficina"),
    ("#guns", "armas"), ("#nightclub", "boate"), ("#stripclub", "boate"), ("#bar", "bar"), ("#drinks", "bar"),
    ("#marina", "marina"), ("#airport", "aereo"), ("#airbase", "aereo"), ("#racetrack", "corrida"), ("#gas", "posto"),
    ("#food", "comida"), ("#fastfood", "comida"), ("#police", "seguranca"), ("#jail", "seguranca"), ("#hospital", "saude"),
    ("#bus", "transporte"), ("#train", "transporte"), ("#metro", "transporte"), ("#metromover", "transporte"),
    ("#supermarket", "mercado"), ("#clothes", "roupas"), ("#shoes", "roupas"), ("#hair", "barbearia"), ("#tattoos", "tatuagem"),
    ("#electronics", "loja"), ("#vendor", "loja"), ("#fence", "loja"), ("#golf", "marco"), ("#tennis", "marco"),
    ("#ferriswheel", "marco"), ("#landmark", "marco"), ("#curiosity", "marco"), ("#blimp", "marco"),
]
PLAIN = [
    ("restaurant", "comida"), ("hotel", "hotel"), ("supermarket", "mercado"), ("retail", "loja"), ("transportation", "transporte"),
    ("government", "servico"), ("public", "servico"), ("utilities", "servico"), ("office", "servico"), ("service", "servico"),
    ("landmark", "marco"), ("leisure", "marco"), ("events", "marco"), ("point-of-interest", "marco"),
    ("natural", "natureza"), ("residential", "residencial"), ("industrial", "industria"), ("agriculture", "industria"),
    ("construction", "industria"),
]

KEYWORDS = [  # palavras no nome (minúsculas, com espaços nas pontas quando é palavra inteira); a ordem importa
    ([" barber", " salon", " hair", " beauty"], "barbearia"),
    ([" tattoo", " ink "], "tatuagem"),
    ([" boutique", " apparel", " clothing", " fashion", " shoes", " sneaker", " threads", " wear"], "roupas"),
    ([" supermarket", " market", " mart", " grocery", " 24/7", " minimarket", " liquor", " bodega"], "mercado"),
    ([" hospital", " clinic", " medical", " pharmacy", " farmacia", " dental", " health"], "saude"),
    ([" police", " sheriff", " fire station", " fire dept", " prison", " jail", " penitentiary", " correctional"], "seguranca"),
    ([" nightclub", " strip club", " club "], "boate"),
    ([" bar ", " bar,", " pub ", " lounge", " tavern", " saloon", " brewery", " cantina", " cocktail"], "bar"),
    ([" bus stop", " station", " metro", " ferry", " terminal", " bridge", " parking"], "transporte"),
    ([" gas ", " gas station", " fuel", " xero "], "posto"),
    ([" motel", " hotel", " inn ", " resort", " suites", " hostel"], "hotel"),
    ([" restaurant", " cafe", " café", " diner", " grill", " pizza", " burger", " taco", " bakery", " kitchen", " bbq",
      " seafood", " sushi", " donut", " coffee", " food", " eatery", " steakhouse", " cuban", " ice cream", " deli "], "comida"),
    ([" customs", " auto ", " autos", " motors", " body shop", " tire", " car wash", " mechanic", " repair"], "oficina"),
    ([" marina", " boat", " yacht", " dock", " pier"], "marina"),
    ([" airport", " airfield", " air station", " hangar", " heliport", " helipad"], "aereo"),
    ([" turn ", " raceway", " speedway", " racetrack", " race track", " drag strip"], "corrida"),
    ([" school", " college", " university", " courthouse", " court", " city hall", " library", " post office", " bank",
      " church", " chapel", " cemetery", " campus", " hall", " center", " centre", " restroom", " office", " department"], "servico"),
    ([" store", " shop", " pawn", " mall", " outlet", " plaza", " records", " vinyl", " jewel", " gadgets", " electronics"], "loja"),
    ([" park", " beach", " lake", " river", " bay ", " swamp", " island", " key ", " forest", " trail", " canal", " marsh", " creek", " sound", " bayou", " pond", " springs", " point", " reef", " cove", " lagoon", " dunes"], "natureza"),
    ([" stadium", " arena", " museum", " theater", " theatre", " monument", " statue", " tower", " lighthouse", " sign",
      " mural", " gallery", " zoo", " golf", " casino", " carnival", " fair", " oceanarium", " aquarium", " castle", " fountain", " memorial"], "marco"),
    ([" apartments", " condo", " residences", " house", " estate", " villa", " homes", " tower apartments"], "residencial"),
    ([" factory", " plant", " refinery", " mill", " warehouse", " industrial", " yard", " port ", " depot", " silo"], "industria"),
]

def category(name, tags):
    for t, c in HASH:
        if any(x == t or x.endswith("." + t) for x in tags):
            return c
    low = name.lower()
    if "garage" in low and "parking" not in low:
        return "garagem"
    if "ammu-nation" in low or " gun" in low:
        return "armas"
    for words, c in KEYWORDS:
        if any(w in " " + low + " " for w in words):
            return c
    for t, c in PLAIN:
        if t in tags:
            return c
    return "predio"

# ---------- regiões ----------
REGION_OF = {
    "vice": ["Vice City", "Vice Beach", "Rialto Islands", "Vice-Dale County", "Gloriana Key", "Vice City International Airport",
             "Dalton Island", "Catalan Key", "Port Vice City", "La Perle", "Peacock Bay", "Starfish Island", "Catalan Bay",
             "Peregrine Bay", "Belville", "Bluegrass", "Tequesta", "Bayside", "Little Cuba", "Crosstown", "Rockridge", "Fisher Island"],
    "keys": ["Key Lento", "Southwind", "Abismo Key", "Maroon Key", "Goose Key", "Bobcat Key", "Key Largo", "Leonida Straits"],
    "gellhorn": ["Port Gellhorn", "Gellhorn International Raceway", "Capri", "Belpoint", "Kelly County", "Wild Hog Point"],
    "ambrosia": ["Ambrosia", "Leonard County", "Waning Sands", "Sundown", "Emerald Springs", "Buckskin"],
    "kalaga": ["Lummox County", "Moreau", "Grayson", "Redhill", "Buck Creek", "Frampton Islands", "Millport", "Mount Kalaga National Park"],
    "grass": ["Mariana County", "Grassrivers", "Watson Bay", "Hamlet", "Buckskin Swamp"],
}
LOC2REG = {loc: r for r, locs in REGION_OF.items() for loc in locs}
ANCHOR = {"vice": (-800, 300), "keys": (-3500, -6300), "gellhorn": (-6600, 2800), "ambrosia": (-2500, 3800), "kalaga": (-3400, 7300), "grass": (-4300, -3300)}

def region(parts, wx, wy):
    for p in reversed(parts):
        if p in LOC2REG:
            return LOC2REG[p]
    return min(ANCHOR, key=lambda r: (ANCHOR[r][0] - wx) ** 2 + (ANCHOR[r][1] - wy) ** 2)

def short_rl(addr):
    if not addr or addr.strip().startswith("?"):
        return ""
    p = [s.strip() for s in addr.split(",")]
    if len(p) >= 4:  # nome, rua, cidade, estado+cep, país
        return ", ".join([p[0], p[-3]])
    return ", ".join(p[:2])

# ---------- landmarks ----------
data = json.load(open(os.path.join(SRC, "map", "data", "6", "landmarks.json"), encoding="utf-8"))
photos_src = os.path.join(SRC, "map", "photos", "6")
photos_dst = os.path.join(WWW, "gtadb", "photos")
os.makedirs(photos_dst, exist_ok=True)
items, n_photo = [], 0
for lid, v in data.items():
    name_full, ig, ig_size, rl_addr, rl, rl_size, tags = v[0], v[1], v[2], v[3], v[4], v[5], v[6]
    if not ig:
        continue
    tags = [t for t in tags if not t.startswith("//") and not t.startswith("/")]
    parts = [p.strip() for p in name_full.split(",") if p.strip()]
    title = parts[0] if parts else "?"
    area = ", ".join(parts[1:])
    named = title not in ("?", "") and not title.startswith("?")
    if not named:
        continue  # prédios sem nome ficam de fora
    mx, my = to_map(ig[0], ig[1])
    cat = category(title, tags) if named else "anon"
    if cat == "predio":
        cat = "outros"
    reg = region(parts, ig[0], ig[1])
    flags = "".join([
        "e" if "enterable" in tags else "",
        "u" if "unconfirmed" in tags else "",
        "d" if "demolished" in tags else "",
        "c" if "closed" in tags else "",
    ])
    has_photo = 0
    src = os.path.join(photos_src, lid + ",ig.jpg")
    if os.path.exists(src):
        dst = os.path.join(photos_dst, lid + ".jpg")
        if not os.path.exists(dst):
            try:
                im = Image.open(src).convert("RGB")
                if im.width > PHOTO_W:
                    im = im.resize((PHOTO_W, round(im.height * PHOTO_W / im.width)), Image.LANCZOS)
                im.save(dst, quality=62, optimize=True, progressive=True)
            except Exception as e:
                print("foto com erro", lid, e)
        has_photo = 1 if os.path.exists(dst) else 0
        n_photo += has_photo
    items.append([lid, title, area, cat, reg, mx, my, short_rl(rl_addr), flags, has_photo])

items.sort(key=lambda it: int(it[0][1:]))
keep = {it[0] + ".jpg" for it in items if it[9]}
for fn in os.listdir(photos_dst):  # apaga fotos geradas antes para locais que saíram
    if fn.endswith(".jpg") and fn not in keep:
        os.remove(os.path.join(photos_dst, fn))
os.makedirs(os.path.join(WWW, "gtadb"), exist_ok=True)
with open(os.path.join(WWW, "gtadb", "landmarks.js"), "w", encoding="utf-8") as f:
    f.write("/* GTA VI Landmarks Data (CC BY 4.0) — https://map.gtadb.org — gtadb.org and all contributors.\n"
            "   Convertido para o ViceHub (coordenadas em metros a partir do recorte do mapa; categorias traduzidas). */\n")
    f.write("window.VH_GTADB = " + json.dumps({
        "fields": ["id", "nome", "area", "cat", "regiao", "x", "y", "real", "flags", "foto"],
        "bbox": [X0, Y0, W, H], "items": items}, ensure_ascii=False, separators=(",", ":")) + ";\n")

# ---------- tiles ----------
tsrc = os.path.join(SRC, "maps", "tiles", "6", "day")
tdst = os.path.join(WWW, "tiles")
have = {}
for z in range(0, MAX_Z + 1):
    zs = os.path.join(tsrc, str(z))
    if not os.path.isdir(zs):
        continue
    zd = os.path.join(tdst, str(z)); os.makedirs(zd, exist_ok=True)
    keys = []
    for fn in os.listdir(zs):
        if not fn.endswith(".jpg"):
            continue
        _, ty, tx = fn[:-4].split(",")
        keys.append(ty + "," + tx)
        d = os.path.join(zd, fn)
        if not os.path.exists(d):
            shutil.copyfile(os.path.join(zs, fn), d)
    have[str(z)] = "|".join(sorted(keys))
with open(os.path.join(WWW, "gtadb", "tiles.js"), "w", encoding="utf-8") as f:
    f.write("/* GTA VI Map Tiles (CC BY 4.0) — https://map.gtadb.org */\n")
    f.write("window.VH_TILES = " + json.dumps({"maxZ": max(int(z) for z in have), "off": OFF, "x0": X0, "y0": Y0, "have": have}) + ";\n")

cats = {}
for it in items:
    cats[it[3]] = cats.get(it[3], 0) + 1
print(len(items), "locais,", n_photo, "fotos,", sum(len(v.split("|")) for v in have.values()), "tiles")
print(sorted(cats.items(), key=lambda x: -x[1]))

# ---------- imagem única do mapa (capa do app e versão web) ----------
def stitch(z, out, quality=82):
    size = 256 * 2 ** (5 - z)          # metros por tile
    mpp = size / 256                   # metros por pixel
    img = Image.new("RGB", (round(W / mpp), round(H / mpp)), (47, 144, 176))
    for k in have.get(str(z), "").split("|"):
        if not k:
            continue
        ty, tx = map(int, k.split(","))
        px, py = round((tx * size - X0) / mpp), round((ty * size - Y0) / mpp)
        img.paste(Image.open(os.path.join(tdst, str(z), f"{z},{ty},{tx}.jpg")).convert("RGB"), (px, py))
    img.save(out, quality=quality, optimize=True, progressive=True)
    return img.size

os.makedirs(os.path.join(WWW, "img"), exist_ok=True)
print("capa", stitch(2, os.path.join(WWW, "img", "leonida.jpg")))

# ---------- fotos das regiões (imagens do repositório GTADB, CC BY 4.0) ----------
REG_IMG = {"vice": "ViceBeach.jpg", "keys": "bannerLeonidaKeys.jpg", "gellhorn": "bannerPortGellhorn.jpg",
           "ambrosia": "bannerAmbrosia2.jpg", "grass": "Grassrivers.jpg"}
rdst = os.path.join(WWW, "img", "regioes"); os.makedirs(rdst, exist_ok=True)
for rid, fn in REG_IMG.items():
    src = os.path.join(SRC, "images", fn)
    if os.path.exists(src):
        im = Image.open(src).convert("RGB")
        if im.width > 900:
            im = im.resize((900, round(im.height * 900 / im.width)), Image.LANCZOS)
        im.save(os.path.join(rdst, rid + ".jpg"), quality=72, optimize=True, progressive=True)
print("regiões", sorted(os.listdir(rdst)))
