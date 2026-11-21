// Controllo della sintassi di tutti i file JavaScript dell'app (CONTESTO_SVILUPPO.md, sezione 9). Uso:
//   node tools/check-syntax.mjs        (o npm run check, insieme a check-js-order.mjs)
// Lancia "node --check" su script.js e su ogni file di js/ (su Windows npm non espande js/*.js). Esce con codice 1 se un
// file ha errori di sintassi.

import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = ['script.js', ...readdirSync(join(ROOT, 'js')).filter(f => f.endsWith('.js')).sort().map(f => join('js', f))];
let bad = 0;
files.forEach(f => {
  const r = spawnSync(process.execPath, ['--check', join(ROOT, f)], { encoding: 'utf8' });
  if (r.status !== 0) { bad++; console.error(`${f}:\n${r.stderr}`); }
});
console.log(bad ? `Errori di sintassi in ${bad} file su ${files.length}` : `Sintassi corretta: ${files.length} file`);
process.exit(bad ? 1 : 0);
