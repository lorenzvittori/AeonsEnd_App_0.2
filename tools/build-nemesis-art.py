"""Prepara le immagini delle nemesi per il menu a partire dalle scansioni delle carte nemesi.

Mettere la scansione della carta nemesi (fronte, come quella di Arachnos) in Assets/nemesis/src/ con il nome
esatto della nemesi come in nemesis.json, per esempio "Assets/nemesis/src/Arachnos.jpg" (JPG, PNG o WebP).
Gli originali in src/ sono esclusi da git (.gitignore). Per ogni scansione lo script crea:
  - Assets/nemesis/<slug>.webp           la carta intera (larga 1000 px, WebP 90), mostrata quando si sceglie la nemesi
  - Assets/nemesis/<slug>-portrait.webp  un ritaglio dell'illustrazione (480 x 212), a destra nel pulsante della nemesi
e scrive Assets/nemesis/nemesis-art.json, l'elenco che l'app legge per sapere quali nemesi hanno l'immagine.

Il retro della carta nemesi (setup e storia) va accanto, con " - back" nel nome: "Assets/nemesis/src/Arachnos - back.jpg".
Diventa Assets/nemesis/<slug>-back.webp (larga 1000 px): nella carta aperta si vede con uno slide.

Il ritaglio standard prende la parte alta dell'illustrazione, centrata; se per una nemesi il soggetto sta altrove,
aggiungere una riga in CROPS (frazioni della larghezza / altezza della carta: sinistra, alto, destra, basso).

Uso (dalla cartella del repository, serve Pillow: pip install pillow):
    python tools/build-nemesis-art.py
"""

import json
import re
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'Assets' / 'nemesis' / 'src'
BACK_SUFFIX = ' - back'
IMAGE_EXT = ('.jpg', '.jpeg', '.png', '.webp')
OUT = ROOT / 'Assets' / 'nemesis'
CARD_WIDTH = 1000
PORTRAIT = (480, 212)  # circa 2,26:1, la forma del riquadro nel pulsante (style.css: .nemesis-art)
QUALITY = 90

# Ritaglio standard: la parte alta dell'illustrazione, vicina al primo ritaglio (più stretto) ma un po' più larga.
# L'altezza si calcola dalla proporzione di PORTRAIT (None).
DEFAULT_CROP = (0.073, 0.06, 0.927, None)
CROPS = {
    # 'Arachnos': (0.073, 0.06, 0.927, None),
}


def slug(name):
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')


def portrait_box(img, crop):
    w, h = img.size
    left, top, right, bottom = crop
    box_w = (right - left) * w
    box_h = box_w * PORTRAIT[1] / PORTRAIT[0] if bottom is None else (bottom - top) * h
    return (round(left * w), round(top * h), round(left * w + box_w), round(top * h + box_h))


def main():
    names = {n['name'] for n in json.loads((ROOT / 'nemesis.json').read_text(encoding='utf-8-sig'))}
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {}
    for source in sorted(SRC.glob('*')):
        if source.suffix.lower() not in IMAGE_EXT or source.stem.endswith(BACK_SUFFIX):
            continue
        name = source.stem
        if name not in names:
            print(f'! {source.name}: "{name}" non è in nemesis.json, saltata')
            continue
        s = slug(name)
        with Image.open(source) as img:
            img = img.convert('RGB')
            card = img.copy()
            card.thumbnail((CARD_WIDTH, CARD_WIDTH * 2), Image.LANCZOS)
            card.save(OUT / f'{s}.webp', 'WEBP', quality=QUALITY, method=6)
            portrait = img.crop(portrait_box(img, CROPS.get(name, DEFAULT_CROP))).resize(PORTRAIT, Image.LANCZOS)
            portrait.save(OUT / f'{s}-portrait.webp', 'WEBP', quality=QUALITY, method=6)
            manifest[name] = {
                'card': f'Assets/nemesis/{s}.webp',
                'portrait': f'Assets/nemesis/{s}-portrait.webp',
                'ratio': round(card.height / card.width, 4)
            }
        back = next((p for p in (SRC / (name + BACK_SUFFIX + ext) for ext in IMAGE_EXT) if p.exists()), None)
        if back:
            with Image.open(back) as img:
                img = img.convert('RGB')
                img.thumbnail((CARD_WIDTH, CARD_WIDTH * 2), Image.LANCZOS)
                img.save(OUT / f'{s}-back.webp', 'WEBP', quality=QUALITY, method=6)
            manifest[name]['back'] = f'Assets/nemesis/{s}-back.webp'
        print(f'{name}: {s}.webp, {s}-portrait.webp' + (f', {s}-back.webp' if back else ''))
    (OUT / 'nemesis-art.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(f'{len(manifest)} nemesi in Assets/nemesis/nemesis-art.json')


if __name__ == '__main__':
    main()
