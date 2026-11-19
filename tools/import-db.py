"""Ponte DataBase -> app: genera cards.json, products.json e le immagini delle carte nemesi dal DataBase.

Legge (SOLO LETTURA; gli Excel vengono prima copiati in una cartella temporanea e letta la copia):
    <DataBase>/Data/NEMESIS_CARDS.xlsx      una riga per carta nemesi
    <DataBase>/Data/DataBase_*.xlsx         foglio MAIN: Path_FRONT dell'immagine (PNG)
    <DataBase>/pipeline.py                  BOXES_NAMES: codice scatola -> nome del prodotto

Scrive nel repository dell'app:
    cards.json, products.json
    Data/Nemesis/<BoxCode>_<Prodotto>/<_Basics | _Upgraded | Nemesi>/Tier_<N>/<Nome>.webp   (WebP 90, max 1640 px)
    thumbs/Nemesis/...  (stesso albero, miniature ~264 x 369)

Le carte di The New Age che l'app aveva gia' (vecchio cards.json) NON vengono riconvertite: la scansione e la
miniatura esistenti vengono spostate con "git mv" nel nuovo percorso. Un file gia' presente non si sovrascrive
mai, salvo con --force. Rilanciato due volte, lo script dà lo stesso risultato.

Uso (dalla cartella del repository, servono openpyxl e Pillow):
    python tools/import-db.py                      # DataBase predefinito: ..\\DataBase
    python tools/import-db.py "C:\\percorso\\DataBase"
    python tools/import-db.py --no-images          # solo cards.json e products.json
    python tools/import-db.py --force              # rifa' anche le immagini e le miniature gia' presenti
"""

import argparse
import ast
import glob
import json
import re
import shutil
import subprocess
import sys
import tempfile
import unicodedata
from collections import defaultdict
from pathlib import Path

import openpyxl
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]  # cartella del repository
IMG_ROOT = Path('Data') / 'Nemesis'
THUMB_ROOT = Path('thumbs') / 'Nemesis'
MAX_WIDTH = 1640
WEBP_QUALITY = 90
THUMB_SIZE = (264, 369)
THUMB_QUALITY = 76

# Colonna Excel -> chiave JSON (iniziale minuscola); quelle che non servono calcoli
PLAIN_TEXT = {'ID': 'id', 'Name': 'name', 'BoxCode': 'boxCode', 'Type': 'type', 'SubType': 'subType'}
PLAIN_NUMBER = {'Shield': 'shield', 'PowerTokens': 'powerTokens', 'RemovalCost': 'removalCost', 'Quantity': 'quantity'}
FLAGS = {'Removable': 'removable', 'InNemesisDeck': 'inNemesisDeck'}
PREFIX = re.compile(r'^(TO DISCARD|IMMEDIATELY|PERSISTENT|POWER\s*\d+)\s*:\s*(.*)$')
PART_KEY = {'TO DISCARD': 'toDiscard', 'IMMEDIATELY': 'immediately', 'PERSISTENT': 'persistent'}


# ------------------------------------------------------------------------------------------------ utilita'
def slugify(text: str) -> str:
    """Nome sicuro per file e cartelle: copia di aeon_db/naming.py, in piu' senza parentesi (Aeon's End (Core Box)
    -> Aeons_End_Core_Box)."""
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode()
    text = re.sub(r'[^\w\s-]', '', text).strip()
    text = re.sub(r'\s+', '_', text)
    return text or 'senza_nome'


def box_key(name) -> str:
    """Rende confrontabili i nomi delle scatole (maiuscole, alias di naming.py)."""
    n = re.sub(r'\[\[(?:[^\]|]*\|)?([^\]]*)\]\]', r'\1', str(name or '')).strip().lower()
    aliases = {'core set': "aeon's end (core box)", "aeon's end": "aeon's end (core box)"}
    return aliases.get(n, n)


def text_or_none(v):
    """Cella -> testo, oppure None se vuota o '-'."""
    if v is None:
        return None
    s = str(v)
    return None if s.strip() in ('', '-') else s


def number_or_text(v):
    """Cella -> intero se e' un numero; None se vuota o '-'; altrimenti il testo."""
    s = text_or_none(v)
    if s is None:
        return None
    s = s.strip()
    return int(s) if re.fullmatch(r'\d+', s) else s


def tier_value(v):
    """Tier: intero, '9+' (testo) o None."""
    return number_or_text(v)


def natural_key(s):
    return [int(p) if p.isdigit() else p.lower() for p in re.split(r'(\d+)', str(s or ''))]


def code_key(code):
    return [int(p) for p in str(code).split('.')]


def read_sheet(path, sheet=None):
    wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
    ws = wb[sheet] if sheet else wb.worksheets[0]
    rows = list(ws.iter_rows(values_only=True))
    wb.close()
    head = list(rows[0])
    return [dict(zip(head, r)) for r in rows[1:] if any(c is not None for c in r)]


def read_boxes_names(pipeline_py: Path) -> dict:
    """BOXES_NAMES da pipeline.py, senza importarlo (importa config e altro)."""
    tree = ast.parse(pipeline_py.read_text(encoding='utf-8'))
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'BOXES_NAMES' for t in node.targets):
            return ast.literal_eval(node.value)
    raise SystemExit('BOXES_NAMES non trovato in pipeline.py')


def split_effect(effect, issues, label, ctype):
    """Effect -> (toDiscard, immediately, persistent, powerEffect). Segnala nei problemi i testi dubbi."""
    out = {'toDiscard': None, 'immediately': None, 'persistent': None, 'powerEffect': None}
    if not effect:
        return out
    parts = defaultdict(list)
    current = None
    pre = []
    power_labels = set()
    for line in str(effect).replace('\r', '').split('\n'):
        m = PREFIX.match(line.strip())
        if m:
            tag = re.sub(r'\s+', ' ', m.group(1))
            if tag.startswith('POWER'):
                power_labels.add(tag)
                tag = 'POWER'
            current = tag
            if parts[current]:
                issues.append(f'{label}: prefisso "{tag}" ripetuto, i testi sono stati uniti')
            parts[current].append(m.group(2))
        elif current is None:
            pre.append(line)
        else:
            parts[current].append(line)
    if not parts:
        if ctype == 'Power':
            issues.append(f'{label}: Power senza prefissi, Effect non diviso')
        return out
    if any(p.strip() for p in pre):
        issues.append(f'{label}: testo prima del primo prefisso non assegnato a nessun campo: "{" / ".join(p for p in pre if p.strip())}"')
    if len(power_labels) > 1:
        issues.append(f'{label}: piu\' prefissi POWER diversi {sorted(power_labels)}, testi uniti in powerEffect')
    for tag, lines in parts.items():
        text = '\n'.join(lines).strip() or None
        out['powerEffect' if tag == 'POWER' else PART_KEY[tag]] = text
    return out


def tier_folder(tier):
    return 'No_Tier' if tier is None else f'Tier_{tier}'


def tier_sort(tier):
    if tier is None:
        return 99
    if isinstance(tier, int):
        return tier
    return int(re.match(r'\d+', tier).group()) + 0.5  # "9+"


def git(*args):
    return subprocess.run(['git', '-C', str(ROOT), *args], capture_output=True, text=True)


def move_file(src: Path, dst: Path):
    """git mv se il file e' tracciato, altrimenti spostamento normale."""
    dst.parent.mkdir(parents=True, exist_ok=True)
    r = git('mv', str(src.relative_to(ROOT)), str(dst.relative_to(ROOT)))
    if r.returncode != 0:
        shutil.move(str(src), str(dst))


def write_image(src_png: Path, dst: Path):
    dst.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(src_png) as img:
        has_alpha = img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info)
        img = img.convert('RGBA' if has_alpha else 'RGB')
        if img.width > MAX_WIDTH:  # mai ingrandire
            img = img.resize((MAX_WIDTH, round(img.height * MAX_WIDTH / img.width)), Image.LANCZOS)
        img.save(dst, 'WEBP', quality=WEBP_QUALITY, method=6)


def write_thumb(src_webp: Path, dst: Path):
    dst.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(src_webp) as img:
        img = img.convert('RGB')
        img.thumbnail(THUMB_SIZE, Image.LANCZOS)
        img.save(dst, 'WEBP', quality=THUMB_QUALITY, method=6)


# ------------------------------------------------------------------------------------------------ programma
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('db', nargs='?', default=str(ROOT.parent / 'DataBase'), help='cartella del DataBase (default ..\\DataBase)')
    ap.add_argument('--force', action='store_true', help='rifa anche immagini e miniature gia presenti')
    ap.add_argument('--no-images', action='store_true', help='solo cards.json e products.json')
    args = ap.parse_args()

    db = Path(args.db).resolve()
    data = db / 'Data'
    issues = []

    # copia degli Excel in una cartella temporanea: si legge la copia
    with tempfile.TemporaryDirectory(prefix='import-db-') as tmp:
        tmp = Path(tmp)
        for f in [data / 'NEMESIS_CARDS.xlsx', *map(Path, glob.glob(str(data / 'DataBase_*.xlsx')))]:
            shutil.copy2(f, tmp / f.name)
        rows = read_sheet(tmp / 'NEMESIS_CARDS.xlsx')
        main_rows = []
        for f in sorted(tmp.glob('DataBase_*.xlsx')):
            main_rows += read_sheet(f, 'MAIN')
    boxes = read_boxes_names(db / 'pipeline.py')
    products = {k.replace('wave', '', 1): v[0] for k, v in boxes.items()}

    # ---- abbinamento NEMESIS_CARDS <-> MAIN (scatola vera + nome; omonimi anche per ID)
    index = defaultdict(list)
    for m in main_rows:
        if m.get('Type') == 'Nemesis' and m.get('Format') == 'card':
            index[(box_key(m['Box']), str(m['Name']).strip().lower())].append(m)

    def norm_id(v):
        return re.sub(r'[\s\[\]]', '', str(v or '')).lower()

    def find_main(r):
        cand = index.get((box_key(r.get('MiniExpansion') or r['Box']), str(r['Name']).strip().lower()), [])
        if len(cand) > 1:
            cand = [c for c in cand if norm_id(c['ID']) == norm_id(r['ID'])] or \
                   [c for c in cand if norm_id(r['ID']) and norm_id(r['ID']) in norm_id(c['ID'])] or cand
            if len(cand) > 1:
                issues.append(f'omonimo non risolto: {r["ID"]} {r["Name"]} ha {len(cand)} righe nel MAIN, presa la prima')
        return cand[0] if cand else None

    # ---- vecchio cards.json (per riusare le scansioni e le miniature di The New Age)
    old_cards = []
    cards_path = ROOT / 'cards.json'
    if cards_path.exists():
        old_cards = json.loads(cards_path.read_text(encoding='utf-8-sig'))
    old_by_id = {c['id']: c for c in old_cards}
    old_by_name = defaultdict(list)
    for c in old_cards:
        cat = {'Basic Nemesis': 'Basic', 'Upgraded Basic Nemesis': 'Upgraded'}.get(c.get('category'), c.get('nemesis'))
        old_by_name[(c['name'].strip().lower(), cat)].append(c)
    used_old = set()

    # ---- carte
    cards = []
    for r in rows:
        label = f'{r["ID"]} {r["Name"]}'
        card = {}
        for col, key in PLAIN_TEXT.items():
            card[key] = text_or_none(r.get(col)) if key not in ('id', 'name') else str(r[col])
        nem_cell = str(r['Nemesis']).strip() if r.get('Nemesis') else ''
        category = {'Basic': 'Basic', 'Upgraded Basic': 'Upgraded'}.get(nem_cell, 'Specific')
        card['category'] = category
        card['nemesis'] = nem_cell if category == 'Specific' else None
        card['tier'] = tier_value(r.get('Tier'))
        hp = text_or_none(r.get('Hp'))
        card['hp'] = int(hp) if hp and re.fullmatch(r'\d+', hp.strip()) else None
        card['hpVariable'] = hp is not None and hp.strip() == '*'
        if hp and card['hp'] is None and not card['hpVariable']:
            issues.append(f'{label}: Hp "{hp}" non riconosciuto')
        for col, key in PLAIN_NUMBER.items():
            card[key] = number_or_text(r.get(col))
        for col, key in FLAGS.items():
            card[key] = str(r.get(col) or '').strip().upper() == 'X'
        effect = r.get('Effect')
        card['effect'] = None if effect is None else str(effect)
        card.update(split_effect(effect, issues, label, card['type']))
        card['_box'] = r.get('MiniExpansion') or r['Box']
        card['_row'] = r
        cards.append(card)

    # ordine stabile: BoxCode, nemesi (Basic, Upgraded, poi per nome), Tier, ID
    cat_rank = {'Basic': 0, 'Upgraded': 1, 'Specific': 2}
    cards.sort(key=lambda c: (code_key(c['boxCode']), cat_rank[c['category']], (c['nemesis'] or '').lower(),
                              tier_sort(c['tier']), natural_key(c['id'])))

    # ---- percorsi, abbinamento con le immagini del DataBase e con le scansioni gia' nell'app
    used_paths = {}
    plan = []
    for c in cards:
        code = c['boxCode']
        product = products.get(code)
        if product is None:
            issues.append(f'{c["id"]} {c["name"]}: BoxCode "{code}" non e\' in BOXES_NAMES')
            product = c['_box']
        group = {'Basic': '_Basics', 'Upgraded': '_Upgraded'}.get(c['category']) or slugify(c['nemesis'])
        folder = Path(f'{code}_{slugify(product)}') / group / tier_folder(c['tier'])
        stem = slugify(c['name'])
        rel = folder / f'{stem}.webp'
        if rel in used_paths:  # nome uguale nella stessa cartella: aggiungo l'ID
            alt = folder / f'{stem}_{slugify(c["id"])}.webp'
            issues.append(f'{c["id"]} {c["name"]}: nome gia\' usato da {used_paths[rel]} nella stessa cartella, file chiamato {alt.name}')
            rel = alt
        used_paths[rel] = c['id']
        c['image'] = (IMG_ROOT / rel).as_posix()
        c['_thumb'] = (THUMB_ROOT / rel).as_posix()

        m = find_main(c['_row'])
        c['_png'] = None
        if m is None:
            issues.append(f'{c["id"]} {c["name"]}: nessuna riga abbinata nel MAIN')
        elif not m.get('Path_FRONT'):
            issues.append(f'{c["id"]} {c["name"]}: Path_FRONT vuoto nel MAIN')
        else:
            png = data / str(m['Path_FRONT']).replace('\\', '/')
            if png.exists():
                c['_png'] = png
            else:
                issues.append(f'{c["id"]} {c["name"]}: immagine non trovata ({m["Path_FRONT"]})')

        c['_old'] = None

    # scansione e miniatura gia' nell'app (vecchio cards.json, solo The New Age): prima per id, poi per nome + nemesi
    # (gli omonimi di altre scatole, per esempio Doom Aegis del Core Set, non vi rientrano)
    for c in cards:
        old = old_by_id.get(c['id'])
        if old is not None and old['id'] not in used_old:
            c['_old'] = old
            used_old.add(old['id'])
    for c in cards:
        if c['_old'] is None and c['boxCode'].split('.')[0] == '4':
            cands = [o for o in old_by_name.get((c['name'].strip().lower(), c['nemesis'] or c['category']), [])
                     if o['id'] not in used_old]
            if cands:
                c['_old'] = cands[0]
                used_old.add(cands[0]['id'])

    # ---- immagini e miniature
    stats = defaultdict(int)
    if not args.no_images:
        for c in cards:
            dst, thumb = ROOT / c['image'], ROOT / c['_thumb']
            old = c['_old']
            old_img = ROOT / old['image'] if old else None
            old_thumb = None
            if old:  # carte gia' nel nuovo albero: stessa posizione sotto thumbs/; le piu' vecchie: thumbs/<id>.webp
                old_thumb = (ROOT / 'thumbs' / Path(old['image']).relative_to('Data')) \
                    if old['image'].startswith('Data/Nemesis/') else ROOT / 'thumbs' / f'{old["id"]}.webp'
            if old_img is not None and old_img.resolve() == dst.resolve():
                old_img = None  # e' gia' al suo posto
            if dst.exists() and not args.force:
                stats['immagini gia presenti'] += 1
            elif old_img is not None and old_img.exists() and not args.force:
                move_file(old_img, dst)
                stats['immagini spostate (git mv)'] += 1
            elif c['_png'] is not None:
                write_image(c['_png'], dst)
                stats['immagini convertite dal DataBase'] += 1
            else:
                issues.append(f'{c["id"]} {c["name"]}: immagine mancante, nessuna copia fatta')
                stats['immagini mancanti'] += 1
            if thumb.exists() and not args.force:
                stats['miniature gia presenti'] += 1
            elif old_thumb is not None and old_thumb.exists() and not args.force:
                move_file(old_thumb, thumb)
                stats['miniature spostate (git mv)'] += 1
            elif dst.exists():
                write_thumb(dst, thumb)
                stats['miniature generate'] += 1
            else:
                issues.append(f'{c["id"]} {c["name"]}: miniatura non fatta (manca l\'immagine)')

        # cartelle vecchie rimaste vuote (i file non tracciati, per esempio i .jpg, restano dove sono)
        leftovers = []
        for base in (ROOT / 'Data', ROOT / 'thumbs'):
            for d in sorted((p for p in base.rglob('*') if p.is_dir()), key=lambda p: len(p.parts), reverse=True):
                rel = d.relative_to(ROOT).as_posix()
                if rel.startswith(('Data/Nemesis/', 'thumbs/Nemesis/')) or rel in ('Data/Nemesis', 'thumbs/Nemesis'):
                    continue
                if not any(d.iterdir()):
                    d.rmdir()
                else:
                    files = [f for f in d.iterdir() if f.is_file()]
                    if files and not any(s.is_dir() for s in d.iterdir()):
                        leftovers.append(rel)
        for d in ROOT.joinpath('Data').iterdir():
            if d.is_dir() and d.name != 'Nemesis' and not any(d.iterdir()):
                d.rmdir()
        if leftovers:
            issues.append('cartelle vecchie non vuote (restano dove sono): ' + ', '.join(sorted(leftovers)))

    # ---- cards.json e products.json
    out_cards = []
    for c in cards:
        out_cards.append({
            'id': c['id'], 'name': c['name'], 'boxCode': c['boxCode'], 'category': c['category'],
            'nemesis': c['nemesis'], 'tier': c['tier'], 'type': c['type'], 'subType': c['subType'],
            'hp': c['hp'], 'hpVariable': c['hpVariable'], 'shield': c['shield'], 'powerTokens': c['powerTokens'],
            'removalCost': c['removalCost'], 'removable': c['removable'], 'inNemesisDeck': c['inNemesisDeck'],
            'quantity': c['quantity'], 'effect': c['effect'], 'toDiscard': c['toDiscard'],
            'immediately': c['immediately'], 'persistent': c['persistent'], 'powerEffect': c['powerEffect'],
            'image': c['image'],
        })
    # 4 spazi e due spazi dopo i due punti, come il vecchio file (PowerShell)
    text = json.dumps(out_cards, indent=4, ensure_ascii=False, separators=(',', ':  '))
    cards_path.write_text(text + '\n', encoding='utf-8', newline='\n')

    # tutti i codici di BOXES_NAMES (l'app mostra anche le wave non ancora disponibili)
    prod_out = {k: products[k] for k in sorted(products, key=code_key)}
    (ROOT / 'products.json').write_text(json.dumps(prod_out, indent=4, ensure_ascii=False, separators=(',', ':  ')) + '\n',
                                        encoding='utf-8', newline='\n')

    # ---- riepilogo
    print(f'{len(rows)} righe in NEMESIS_CARDS -> {len(out_cards)} carte in cards.json, {len(prod_out)} prodotti in products.json')
    for k, v in sorted(stats.items()):
        print(f'  {k}: {v}')
    by = defaultdict(int)
    for c in cards:
        by[(c['boxCode'], c['category'])] += 1
    for (code, cat), n in sorted(by.items(), key=lambda kv: (code_key(kv[0][0]), kv[0][1])):
        print(f'  {code:>4} {cat:<9} {n}')
    print(f'{len(issues)} segnalazioni:')
    for i in issues:
        print('  -', i)


if __name__ == '__main__':
    sys.exit(main())
