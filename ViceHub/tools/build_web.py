#!/usr/bin/env python3
"""Gera ViceHub/web/vicehub.html: o app inteiro num arquivo só (pré-visualização / site).
O mapa vai embutido; fotos de veículos em img/veiculos/ também são embutidas se existirem.
Uso: python3 ViceHub/tools/build_web.py"""
import base64, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
www = os.path.join(root, "app", "src", "main", "assets", "www")
read = lambda n: open(os.path.join(www, n), encoding="utf-8").read()

def data_uri(rel):
    with open(os.path.join(www, rel), "rb") as f:
        return "data:image/jpeg;base64," + base64.b64encode(f.read()).decode()

html = read("index.html")
body = html.split("<!--VH:BODY-->")[1].split("<!--VH:SCRIPTS-->")[0]
head = ('<title>ViceHub</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n'
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Unbounded:wght@600;700;800'
        '&family=Manrope:wght@500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap">\n'
        "<style>" + read("style.css") + "</style>\n")
app = read("app.js")
photos = {}
vdir = os.path.join(www, "img", "veiculos")
for f in sorted(os.listdir(vdir)) if os.path.isdir(vdir) else []:
    if f.lower().endswith((".jpg", ".jpeg")):
        photos["img/veiculos/" + f] = data_uri("img/veiculos/" + f)
import json
pre = "<script>window.VH_PHOTOS=" + json.dumps(photos) + ";</script>\n"
out = head + body + pre + "<script>" + read("data.js") + "</script>\n<script>" + app + "</script>\n"
out = out.replace("img/mapa-leonida.jpg", data_uri("img/mapa-leonida.jpg"))
dst = os.path.join(root, "web"); os.makedirs(dst, exist_ok=True)
open(os.path.join(dst, "vicehub.html"), "w", encoding="utf-8").write(out)
print("ok", len(out), "bytes,", len(photos), "fotos")
