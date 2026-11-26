#!/usr/bin/env python3
"""Gera ViceHub/web/vicehub.html: o app inteiro num arquivo só (pré-visualização / site).
Uso: python3 ViceHub/tools/build_web.py [--cdn]
  --cdn  carrega o three.js do cdnjs em vez de embutir (arquivo bem menor)."""
import os, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
www = os.path.join(root, "app", "src", "main", "assets", "www")
read = lambda n: open(os.path.join(www, n), encoding="utf-8").read()
html = read("index.html")
body = html.split("<!--VH:BODY-->")[1].split("<!--VH:SCRIPTS-->")[0]
cdn = "--cdn" in sys.argv
three = ('<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>'
         if cdn else "<script>" + read("three.min.js") + "</script>")
head = ('<title>ViceHub</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n'
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Unbounded:wght@600;700;800'
        '&family=Manrope:wght@500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap">\n'
        "<style>" + read("style.css") + "</style>\n")
out = head + body + three + "\n<script>" + read("data.js") + "</script>\n<script>" + read("app.js") + "</script>\n"
dst = os.path.join(root, "web"); os.makedirs(dst, exist_ok=True)
open(os.path.join(dst, "vicehub.html"), "w", encoding="utf-8").write(out)
print("ok", len(out), "bytes")
