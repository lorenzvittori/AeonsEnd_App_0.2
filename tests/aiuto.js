// Aiuti comuni ai test (node --test, CONTESTO_SVILUPPO.md sezione 9): le regole (js/00-regole.js), i dati veri della
// cartella del repo e un generatore di numeri casuali ripetibile.
'use strict';

const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.join(__dirname, '..');
const Regole = require(path.join(ROOT, 'js', '00-regole.js'));

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, name), 'utf8'));
}

const cards = readJson('cards.json');
const nemeses = readJson('nemesis.json');
const deckSetup = readJson('deck-setup.json');
const products = readJson('products.json');
const db = { cards, nemeses, deckSetup };

// Generatore ripetibile (mulberry32): stessa semente = stessa sequenza
function seeded(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Collezioni: tutti i prodotti; solo le wave sceglibili oggi nell'app (1 e 4, COLLECTION_WAVES)
const allProducts = new Set(Object.keys(products));
const appWaves = new Set(Object.keys(products).filter(c => ['1', '4'].includes(Regole.waveOfCode(c))));

function cardById(id) {
  const c = cards.find(x => x.id === id);
  if (!c) throw new Error('carta non trovata: ' + id);
  return c;
}
function cardByName(name) {
  const found = cards.filter(c => c.name === name);
  if (found.length !== 1) throw new Error(`nome ${name}: ${found.length} carte`);
  return found[0];
}

module.exports = { Regole, db, cards, nemeses, deckSetup, products, seeded, allProducts, appWaves, cardById, cardByName };
