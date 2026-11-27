#!/usr/bin/env python3
"""Gera os ícones do ViceHub (APK + prévias dentro do app).
Uso: python3 ViceHub/tools/make_icons.py
Saída: app/src/main/res/mipmap-*/ic_<estilo>.png e app/src/main/assets/www/img/icons/<estilo>.png
Desenho: quadrado arredondado, sol listrado (pôr do sol de Vice City) e o monograma VH.
Fonte: Inter ExtraBold (SIL Open Font License)."""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RES = os.path.join(ROOT, "app", "src", "main", "res")
WWW = os.path.join(ROOT, "app", "src", "main", "assets", "www", "img", "icons")
FONT = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"

STYLES = {  # nome: (fundo topo, fundo base, sol topo, sol base, letras, brilho)
    "dark":  ("#1c1c22", "#050507", "#ffffff", "#8a8a96", "#ffffff", "#ffffff"),
    "vice":  ("#3a1257", "#120722", "#ffe066", "#ff2d7a", "#ffffff", "#ff3d8b"),
    "neon":  ("#14093a", "#03020c", "#ff2ec4", "#00f0ff", "#ffffff", "#00f0ff"),
    "gold":  ("#1a1408", "#050402", "#fff1a8", "#b9791a", "#f5c542", "#f5c542"),
    "white": ("#ffffff", "#e7e5f0", "#ff9a3c", "#ff3d8b", "#16131f", "#ff3d8b"),
    "ocean": ("#0b3352", "#030b16", "#7be3ff", "#2d8cff", "#ffffff", "#2de2e6"),
}
DENS = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}

def hexc(h, a=255):
    h = h.lstrip("#"); return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)

def vgrad(size, top, bot):
    g = Image.new("RGBA", (1, size))
    t, b = hexc(top), hexc(bot)
    for y in range(size):
        f = y / (size - 1)
        g.putpixel((0, y), tuple(round(t[i] + (b[i] - t[i]) * f) for i in range(4)))
    return g.resize((size, size))

def icon(style, S=1024):
    bg1, bg2, s1, s2, txt, glow = STYLES[style]
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    # fundo arredondado
    mask = Image.new("L", (S, S), 0); ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * .23), fill=255)
    img.paste(vgrad(S, bg1, bg2), (0, 0), mask)
    # brilho do sol
    halo = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(halo).ellipse([S * .18, S * .1, S * .82, S * .74], fill=hexc(glow, 90))
    halo = halo.filter(ImageFilter.GaussianBlur(S * .07))
    img = Image.alpha_composite(img, Image.composite(halo, Image.new("RGBA", (S, S)), mask))
    # sol listrado
    sun = vgrad(S, s1, s2)
    smask = Image.new("L", (S, S), 0); d = ImageDraw.Draw(smask)
    cx, cy, r = S / 2, S * .42, S * .27
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    y, h = cy + r * .12, S * .022
    while y < cy + r:
        d.rectangle([0, y, S, y + h], fill=0); y += h * 2.6; h *= 1.18
    img.paste(sun, (0, 0), Image.composite(smask, Image.new("L", (S, S), 0), mask))
    # monograma VH
    f = ImageFont.truetype(FONT, int(S * .3))
    t = "VH"; d2 = ImageDraw.Draw(img)
    w = d2.textlength(t, font=f)
    x, ty = (S - w) / 2, S * .6
    sh = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(sh).text((x, ty + S * .012), t, font=f, fill=(0, 0, 0, 120))
    img = Image.alpha_composite(img, sh.filter(ImageFilter.GaussianBlur(S * .01)))
    ImageDraw.Draw(img).text((x, ty), t, font=f, fill=hexc(txt))
    # aro de vidro
    rim = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(rim).rounded_rectangle([S * .006, S * .006, S * .994, S * .994], radius=int(S * .225), outline=(255, 255, 255, 46), width=int(S * .012))
    return Image.alpha_composite(img, rim)

os.makedirs(WWW, exist_ok=True)
for st in STYLES:
    big = icon(st)
    big.resize((256, 256), Image.LANCZOS).save(os.path.join(WWW, st + ".png"), optimize=True)
    for dn, px in DENS.items():
        out = os.path.join(RES, "mipmap-" + dn); os.makedirs(out, exist_ok=True)
        big.resize((px, px), Image.LANCZOS).save(os.path.join(out, "ic_" + st + ".png"), optimize=True)
# ícone padrão (dark) também em drawable, para versões antigas do Android
icon("dark").resize((192, 192), Image.LANCZOS).save(os.path.join(RES, "drawable", "ic_launcher.png"), optimize=True)
print("ícones:", ", ".join(STYLES))
