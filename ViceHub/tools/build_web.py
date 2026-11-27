#!/usr/bin/env python3
"""Gera ViceHub/web/vicehub.html: pré-visualização do app num arquivo só.
O app Android usa os tiles (zoom até 3,2 px/m) e as fotos; esta versão usa uma imagem
única do mapa oficial (nível 3, 4 m por pixel) e não traz as fotos dos locais.
Uso: python3 ViceHub/tools/build_web.py   (rode antes o import_gtadb.py)"""
import base64, io, json, os
from PIL import Image

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
www = os.path.join(root, "app", "src", "main", "assets", "www")
read = lambda n: open(os.path.join(www, n), encoding="utf-8").read()
b64 = lambda raw: "data:image/jpeg;base64," + base64.b64encode(raw).decode()

# mapa oficial costurado a partir dos tiles do nível 3
T = json.loads(read("gtadb/tiles.js").split("window.VH_TILES = ", 1)[1].strip().rstrip(";"))
Z = 3; size = 256 * 2 ** (5 - Z); mpp = size / 256
X0, Y0 = T["x0"], T["y0"]
gt = read("gtadb/landmarks.js")
bbox = json.loads(gt.split('"bbox":', 1)[1].split("]", 1)[0] + "]")
W, H = bbox[2], bbox[3]
img = Image.new("RGB", (round(W / mpp), round(H / mpp)), (47, 144, 176))
for k in T["have"][str(Z)].split("|"):
    ty, tx = map(int, k.split(","))
    img.paste(Image.open(os.path.join(www, "tiles", str(Z), f"{Z},{ty},{tx}.jpg")).convert("RGB"),
              (round((tx * size - X0) / mpp), round((ty * size - Y0) / mpp)))
buf = io.BytesIO(); img.save(buf, "JPEG", quality=78, optimize=True, progressive=True)
mapimg = {"src": b64(buf.getvalue()), "x": 0, "y": 0, "w": W, "h": H}

photos = {}
vdir = os.path.join(www, "img", "veiculos")
for f in sorted(os.listdir(vdir)) if os.path.isdir(vdir) else []:
    if f.lower().endswith((".jpg", ".jpeg")):
        photos["img/veiculos/" + f] = b64(open(os.path.join(vdir, f), "rb").read())

html = read("index.html")
body = html.split("<!--VH:BODY-->")[1].split("<!--VH:SCRIPTS-->")[0]
head = ('<title>ViceHub</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n'
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Unbounded:wght@600;700;800'
        '&family=Manrope:wght@500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap">\n'
        "<style>" + read("style.css") + "</style>\n")
pre = ("<script>window.VH_PHOTOS=" + json.dumps(photos) + ";window.VH_NOPHOTOS=true;window.VH_MAPIMG="
       + json.dumps(mapimg) + ";</script>\n")
out = head + body + pre + "<script>" + read("config.js") + "</script>\n<script>" + gt + "</script>\n<script>" + read("data.js") + "</script>\n<script>" + read("guia.js") + "</script>\n<script>" + read("app.js") + "</script>\n"
cover = open(os.path.join(www, "img", "leonida.jpg"), "rb").read()
out = out.replace("img/leonida.jpg", b64(cover))
dst = os.path.join(root, "web"); os.makedirs(dst, exist_ok=True)
open(os.path.join(dst, "vicehub.html"), "w", encoding="utf-8").write(out)
print("ok", len(out) // 1024, "KB; mapa", img.size)
