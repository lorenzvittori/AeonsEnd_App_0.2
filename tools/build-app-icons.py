# Icone dell'app installata (manifest.webmanifest e apple-touch-icon), dal dorso delle carte.
# Da lanciare dalla cartella del repo: python tools/build-app-icons.py
from PIL import Image, ImageFilter

SRC = 'Assets/ui/decor/card-back-logo.webp'
OUT = 'Assets/ui/app-icons/'

import os
os.makedirs(OUT, exist_ok=True)

src = Image.open(SRC).convert('RGB')
w, h = src.size
# Quadrato centrato sul logo (largo quanto la carta)
square = src.crop((0, (h - w) // 2, w, (h - w) // 2 + w))

def plain(size, name):
    square.resize((size, size), Image.LANCZOS).save(OUT + name, optimize=True)

def maskable(size, name):
    # Il logo sta nell'80% centrale (zona sicura delle icone "maskable"); intorno la stessa pietra, sfocata
    bg = square.resize((size, size), Image.LANCZOS).filter(ImageFilter.GaussianBlur(size // 40))
    inner = int(size * .8)
    fg = square.resize((inner, inner), Image.LANCZOS)
    off = (size - inner) // 2
    bg.paste(fg, (off, off))
    bg.save(OUT + name, optimize=True)

plain(192, 'icon-192.png')
plain(512, 'icon-512.png')
plain(180, 'apple-touch-icon.png')
maskable(512, 'icon-maskable-512.png')
print('ok')
