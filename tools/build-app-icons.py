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

def maskable(size, name):
    # Android ritaglia l'icona nella forma del launcher: dalla v200 l'immagine intera, senza cornice (scelta
    # dell'utente; il ritaglio taglia un po' i bordi). Prima: immagine nel 72% centrale con la stessa immagine sfocata
    # intorno.
    square.resize((size, size), Image.LANCZOS).save(OUT + name, optimize=True)

plain(192, 'icon-192.png')
plain(512, 'icon-512.png')
plain(180, 'apple-touch-icon.png')
maskable(512, 'icon-maskable-512.png')
print('ok')
