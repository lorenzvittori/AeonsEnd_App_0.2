"""Converte le scansioni delle carte in Data/ (JPG e PNG) in WebP qualità 90 e aggiorna i percorsi in cards.json.

Le immagini originali restano dove sono, accanto ai WebP: sono escluse da git (.gitignore), quindi non vengono
pubblicate su GitHub Pages ma restano sul PC se serviranno di nuovo (per esempio per una conversione diversa).
La risoluzione (i pixel) non cambia; un PNG con trasparenza resta trasparente.

Uso (dalla cartella del repository, serve Pillow: pip install pillow):
    python tools/convert-webp.py            # converte solo le immagini che non hanno ancora il WebP
    python tools/convert-webp.py --force    # riconverte tutto
    python tools/convert-webp.py --quality 85
Dopo aver aggiunto o cambiato immagini: rieseguire questo e poi tools/build-thumbs.py.
"""

import argparse
import re
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]  # cartella del repository
DATA = ROOT / 'Data'
CARDS = ROOT / 'cards.json'
SOURCE_EXT = {'.jpg', '.jpeg', '.png'}


def convert(source: Path, quality: int, force: bool):
    target = source.with_suffix('.webp')
    if target.exists() and not force:
        return None
    with Image.open(source) as img:
        has_alpha = img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info)
        img = img.convert('RGBA' if has_alpha else 'RGB')
        img.save(target, 'WEBP', quality=quality, method=6)
    return source.stat().st_size, target.stat().st_size


def update_cards_json():
    # Sostituzione testuale per non toccare la formattazione del file.
    raw = CARDS.read_bytes()
    bom = raw.startswith(b'\xef\xbb\xbf')
    text = raw.decode('utf-8-sig')
    count = 0

    def repl(m):
        nonlocal count
        path = m.group(2)
        webp = re.sub(r'\.(jpe?g|png)$', '.webp', path, flags=re.I)
        if webp != path and (ROOT / webp).exists():
            count += 1
            return m.group(1) + webp + '"'
        return m.group(0)

    text = re.sub(r'("image"\s*:\s*")([^"]+)"', repl, text)
    CARDS.write_bytes((b'\xef\xbb\xbf' if bom else b'') + text.encode('utf-8'))
    return count


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--quality', type=int, default=90)
    parser.add_argument('--force', action='store_true')
    args = parser.parse_args()

    before = after = done = 0
    for source in sorted(DATA.rglob('*')):
        if source.suffix.lower() not in SOURCE_EXT:
            continue
        result = convert(source, args.quality, args.force)
        if result:
            done += 1
            before += result[0]
            after += result[1]
    if done:
        print(f'{done} immagini convertite: {before / 1e6:.1f} MB -> {after / 1e6:.1f} MB')
    else:
        print('Nessuna immagine da convertire (usa --force per riconvertire)')
    print(f'cards.json: {update_cards_json()} percorsi aggiornati a .webp')


if __name__ == '__main__':
    main()
