"""Genera le miniature WebP della coda (thumbs/<id>.webp) dalle scansioni in Data/.

Ogni miniatura sta in 264 x 369 px (il doppio di 132 x 184, la miniatura della coda), mantenendo le proporzioni
della scansione; qualità WebP 76. Le scansioni originali non vengono toccate: la carta grande usa sempre quelle.

Uso (dalla cartella del repository, serve Pillow: pip install pillow):
    python tools/build-thumbs.py
Va rieseguito quando cambiano cards.json o le immagini in Data/.
"""

import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]  # cartella del repository
OUT = ROOT / 'thumbs'
SIZE = (264, 369)
QUALITY = 76


def main():
    cards = json.loads((ROOT / 'cards.json').read_text(encoding='utf-8'))
    OUT.mkdir(exist_ok=True)
    total = 0
    for card in cards:
        source = ROOT / card['image']
        target = OUT / (card['id'] + '.webp')
        with Image.open(source) as img:
            img = img.convert('RGB')
            img.thumbnail(SIZE, Image.LANCZOS)
            img.save(target, 'WEBP', quality=QUALITY, method=6)
        total += target.stat().st_size
    print(f'{len(cards)} miniature in {OUT} ({total / 1024:.0f} KB in tutto)')


if __name__ == '__main__':
    main()
