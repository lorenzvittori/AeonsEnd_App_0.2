# Icone dell'app installata (manifest.webmanifest e apple-touch-icon).
# Dall'immagine quadrata dell'utente (logo e ragno sotto la luna; v197, dalla v198 la versione app-icon.png da
# 400×400); prima dal dorso delle carte.
# Da lanciare dalla cartella del repo: python tools/build-app-icons.py
from PIL import Image, ImageFilter

SRC = 'Assets/ui/decor/app-icon.png'
OUT = 'Assets/ui/app-icons/'

import os
os.makedirs(OUT, exist_ok=True)

src = Image.open(SRC).convert('RGB')
w, h = src.size
# Quadrato centrato (l'immagine è già quadrata: si usa tutta)
side = min(w, h)
square = src.crop(((w - side) // 2, (h - side) // 2, (w - side) // 2 + side, (h - side) // 2 + side))

def plain(size, name):
    square.resize((size, size), Image.LANCZOS).save(OUT + name, optimize=True)

def maskable(size, name, ratio=.72):
    # Android ritaglia l'icona (cerchio di diametro 80%): l'immagine sta nel 72% centrale, così la scritta in alto
    # non viene tagliata; intorno la stessa immagine sfocata, con il bordo sfumato (niente stacco netto)
    bg = square.resize((size, size), Image.LANCZOS).filter(ImageFilter.GaussianBlur(size // 25))
    inner = int(size * ratio)
    fg = square.resize((inner, inner), Image.LANCZOS)
    feather = max(2, inner // 16)
    mask = Image.new('L', (inner, inner), 0)
    mask.paste(255, (feather, feather, inner - feather, inner - feather))
    mask = mask.filter(ImageFilter.GaussianBlur(feather / 2))
    off = (size - inner) // 2
    bg.paste(fg, (off, off), mask)
    bg.save(OUT + name, optimize=True)

plain(192, 'icon-192.png')
plain(512, 'icon-512.png')
plain(180, 'apple-touch-icon.png')
maskable(512, 'icon-maskable-512.png')
print('ok')
