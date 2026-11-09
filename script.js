// Aeon's End App 0.2: nuovo design (REPORT_IMPLEMENTAZIONE.md del kit di design) sopra la logica della versione 48.
// Repository autonomo: dati (cards.json, deck-setup.json, nemesis.json) e scansioni delle carte (Data/) sono in questa
// cartella, letti con DATA_ROOT; le miniature della coda sono in thumbs/ (fatte da tools/build-thumbs.py).
// La partita si salva con una chiave propria (il sito condivide il dominio, e quindi il localStorage, con AeonsEnd_APP);
// il formato del salvataggio è quello della v48.
//
// Regola: la logica del gioco (mazzo per tier, pesca, scarti e rimescolamento, poteri/minion/attacchi, turni, undo)
// è quella della v48; qui cambia solo l'interfaccia.
//
// Sezioni del file, in ordine:
//   1. Testi (dizionario italiano), elementi della pagina, costanti e stato
//   2. Dati e mazzo (carte, nemesi, Nemesis Deck Setup, pesca e scarti)
//   3. Componenti dell'interfaccia (immagine carta, badge, miniatura, dialoghi, toast)
//   4. VistaCoda: coda, ancoraggio dello scorrimento, carta della coda (punti vita in bozza, rimozione del potere)
//   5. Pila degli scarti
//   6. Pagina iniziale e nuova partita / riprendi
//   7. Stato della partita: fotografia, ripristino, salvataggio, undo
//   8. VistaRisoluzione (turno nemesi): carta da risolvere e anteprima, pesca con retro, slide
//   9. Eventi e avvio
// Non è diviso in più file JS perché i file importati non avrebbero il ?v=N di version.json e il browser
// potrebbe tenerne in cache versioni vecchie mescolate a quelle nuove.

'use strict';

// Browser vecchi (Safari prima di iOS 14, Chrome prima della 86) non hanno replaceChildren: lo si aggiunge
if (!Element.prototype.replaceChildren) {
  Element.prototype.replaceChildren = function (...nodes) {
    while (this.firstChild) this.removeChild(this.firstChild);
    this.append(...nodes);
  };
}

// --- 1. Testi, elementi, costanti e stato ---------------------------------------------------------------------------

// Tutte le stringhe dell'interfaccia scritte da JS (per una futura traduzione)
const I18N_IT = {
  phasePlayers: 'Turno dei giocatori',
  phaseNemesis: 'Turno nemesi',
  nemesisButton: 'Turno Nemesi',
  phaseNemesisN: n => `Turno nemesi ${n}`,
  turnN: n => `Turno ${n}`,
  stepResolve: 'Risoluzione',
  stepDraw: 'Pesca',
  infoDeck: n => `Mazzo ${n}`,
  infoDiscard: n => `Scarti ${n}`,
  ctaPowerNext: 'Vai avanti',
  ctaPowerLast: 'Effetto risolto e scarta',
  turnInfo: (turn, deck) => `Turno ${turn} · Mazzo ${deck}`,
  discardButton: n => `Scarti ${n}`,
  discardButtonLabel: n => `Apri gli scarti, ${n} ${n === 1 ? 'carta' : 'carte'}`,
  discardTitle: n => `Scarti · ${n}`,
  types: { Minion: 'Minion', Power: 'Potere', Attack: 'Attacco' },
  hp: (hp, max) => `${hp}/${max}`,
  hpLong: (hp, max) => `${hp} punti vita su ${max}`,
  railHp: hp => `HP ${hp}`,
  tokens: n => (n === 1 ? '1 token' : `${n} token`),
  railTokens: n => `${n} T`,
  tokensLeft: n => (n === 1 ? '1 token rimasto' : `${n} token rimasti`),
  cardOf: (i, n) => `carta ${i} di ${n}`,
  newTag: 'Nuova',
  activeFlag: 'Risolvi',
  nextCard: 'Prossima carta da pescare, coperta',
  eyebrowActive: (i, n) => `Da risolvere · carta ${i} di ${n}`,
  eyebrowPreview: (i, n) => `Anteprima · carta ${i} di ${n}`,
  eyebrowDrawn: (i, n) => `Carta pescata · carta ${i} di ${n}`,
  eyebrowDrawing: 'Pesca in corso',
  previewHint: 'Non modifica il turno',
  applyHint: "Applica prima l'effetto al tavolo",
  ctaTokenNext: 'Rimuovi 1 token · Avanti',
  ctaTokenDraw: 'Rimuovi 1 token · Pesca',
  ctaDiscardNext: 'Effetto risolto',
  ctaDiscardDraw: 'Effetto risolto',
  ctaMinionNext: 'Effetto risolto',
  ctaMinionDraw: 'Effetto risolto',
  ctaPutInPlay: 'Metti in gioco',
  ctaDraw: 'Pesca',
  backToDraw: 'Torna alla carta da pescare',
  backToActive: 'Torna alla carta da risolvere',
  loadingCard: 'Caricamento carta…',
  imageMissing: 'Immagine non disponibile',
  retryImage: 'Riprova immagine',
  cardInPlay: 'Carta in gioco',
  close: 'Chiudi',
  closeImage: 'Chiudi immagine',
  cancel: 'Annulla',
  confirmHp: 'Conferma modifiche',
  deleteMinion: 'Elimina minion',
  willBeDeleted: 'Il minion verrà eliminato',
  movedToDiscard: 'Verrà spostato negli scarti',
  hpDelta: d => `${d > 0 ? '+' : '−'}${Math.abs(d)} HP`,
  hpLeftToast: (name, hp) => `${name}: ${hp} ${hp === 1 ? 'punto vita rimasto' : 'punti vita rimasti'}`,
  minionDeleted: name => `${name}: minion eliminato, negli scarti`,
  removePower: 'Rimuovi carta · costo pagato',
  powerCostInfo: "L'app non paga il costo al posto dei giocatori",
  powerRemoved: name => `${name}: carta rimossa, negli scarti`,
  removePowerShort: 'Rimuovi · costo pagato',
  notRemovable: 'Non rimovibile',
  save: 'Salva',
  saveLabel: name => `Salva le modifiche a ${name}`,
  paidNote: 'Costo pagato',
  killedNote: 'Ucciso',
  undoAction: 'Annulla ultima azione',
  baseBox: 'Scatola base',
  myCollection: 'La mia collezione',
  collectionHint: 'Spunta quello che possiedi: nemesi e carte nemesi usciranno solo da questi prodotti.',
  collectionSave: 'Salva collezione',
  collectionSaved: 'Collezione salvata',
  collectionSummary: (w, p) => `${w} wave · ${p} ${p === 1 ? 'prodotto' : 'prodotti'}`,
  victoryTitle: 'Vittoria!',
  victoryText: 'Il mazzo nemesi è vuoto e non ci sono più poteri né minion della nemesi in gioco: i giocatori vincono.',
  drawCard: 'Pesca carta',
  putBack: 'Rimetti nel mazzo',
  discardDrawn: 'Scarta',
  deckCardTitle: 'Carta pescata dal mazzo',
  cardPutBack: name => `${name}: rimessa in cima al mazzo`,
  cardDiscarded: name => `${name}: negli scarti`,
  saveChanges: 'Salva modifiche',
  minionKilled: name => `${name}: ucciso, andrà negli scarti`,
  deckLabel: n => `Mazzo nemesi, ${n} ${n === 1 ? 'carta' : 'carte'}`,
  powerPaid: name => `${name}: costo pagato, andrà negli scarti`,
  cancelPay: 'Annulla',
  draftDiscarded: 'Modifiche non salvate annullate',
  hpTurnTag: d => `HP: ${d > 0 ? '+' : '−'}${Math.abs(d)}`,
  discardZoomTitle: 'Carta negli scarti',
  mostRecent: 'Più recente',
  leastRecent: 'Meno recente',
  onlyOne: 'Unica',
  cardDrawn: name => `Carta pescata: ${name}`,
  battle: n => `Battaglia ${n}`,
  battleMissing: 'Battaglia non indicata',
  startNew: 'Inizia partita',
  newGame: 'Nuova partita',
  savedGameTitle: 'Partita in corso',
  resumeGame: 'Riprendi partita',
  loadError: 'Impossibile caricare le carte. Riprova',
  resumeError: 'La partita salvata non si può riprendere',
  chooseNemesis: 'Scegli una nemesi disponibile per iniziare',
  nemesisCard: name => `Carta della nemesi ${name}`,
  showNemesisCard: name => `Mostra la carta di ${name}`,
  hideNemesisCard: 'Chiudi la carta della nemesi',
  queueRail: 'Coda in gioco, tocca una carta per mostrarla',
  nemesisCardBack: name => `Retro della carta della nemesi ${name} (setup)`,
  unavailableNemeses: 'Nemesi non disponibili',
  unavailableNemesis: name => `${name}, non disponibile`,
  players: n => (n === 1 ? '1 giocatore' : `${n} giocatori`),
  undone: 'Azione annullata',
  menu: 'Menu',
  menuTurn: 'Turno nemesi',
  menuDeck: 'Carte nel mazzo',
  exitGame: 'Esci dalla partita'
};

const app = document.getElementById('app');
// Testata trasparente (sopra lo sfondo della vista): Undo, nome della nemesi, Menu. Uguale nei due turni.
app.classList.add('clear-header');
const mainEl = document.getElementById('main');
const phaseLabel = document.getElementById('phase-label');
const undoBtn = document.getElementById('undo-btn');
const queueView = document.getElementById('queue-view');
const queueViewport = document.getElementById('queue');
const queueList = document.getElementById('queue-list');
const queueEmpty = document.getElementById('queue-empty');
const resolveView = document.getElementById('resolve-view');
const rail = document.getElementById('rail');
const focusEl = document.getElementById('focus');
const infoRow = document.getElementById('info-row');
const turnInfo = document.getElementById('turn-info');
const discardBtn = document.getElementById('discard-btn');
const menuBtn = document.getElementById('menu-btn');
const resolveHint = document.getElementById('resolve-hint');
const nemesisBtn = document.getElementById('nemesis-btn');
const resolveBtn = document.getElementById('resolve-btn');
const backBtn = document.getElementById('back-btn');
const startLayer = document.getElementById('start');
const startBtn = document.getElementById('start-btn');
const resumeBtn = document.getElementById('resume-btn');
const startError = document.getElementById('start-error');
const startErrorText = document.getElementById('start-error-text');
const retryBtn = document.getElementById('retry-btn');
const discardLayer = document.getElementById('discard');
const discardTitle = document.getElementById('discard-title');
const discardGrid = document.getElementById('discard-grid');
const discardEmpty = document.getElementById('discard-empty');
const discardClose = document.getElementById('discard-close');
const dialogRoot = document.getElementById('dialog-root');
const toastRoot = document.getElementById('toast-root');
const liveRegion = document.getElementById('live');

// Rapporto carta standard: 63 x 88 mm
const CARD_RATIO = 88 / 63;

// Distanza minima (px) di uno slide per cambiare carta in VistaRisoluzione
const SWIPE_MIN_DISTANCE = 50;
// Oltre questo spostamento (px) un tocco sulla coda è uno scorrimento, non un tocco sulla carta
const DRAG_THRESHOLD = 8;

// Valore in punti vita della goccia grande (la piccola vale 1)
const DROP_BIG_VALUE = 5;

// Durate (ms) delle animazioni dopo un'azione (come in design-tokens.css); con riduzione movimento al massimo 100ms.
// Durante queste animazioni il pulsante principale non accetta altri tocchi.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const DURATION = { token: 220, discard: 240, focus: 220, phase: 280 };
const DRAW_MS = 350;
function duration(name) {
  return reducedMotion.matches ? Math.min(100, DURATION[name]) : DURATION[name];
}

// Dove si allinea la carta appena pescata nella coda: centro della carta al 62% della larghezza visibile
const ANCHOR_RATIO = 0.5;

// Partita salvata nel browser (localStorage) e numero massimo di passi di undo conservati.
// lorenzvittori.github.io è lo stesso dominio per tutti i siti: la chiave è diversa da quella di AeonsEnd_APP
// (aeonsend-save-v1) e del suo prototipo new_design_0.2 (aeonsend-clone-save-v2), così le partite non si sovrascrivono.
const SAVE_KEY = 'aeonsend-app-0.2-save';
const UNDO_LIMIT = 300;

// Cartella da cui si leggono dati e scansioni delle carte ('' = questa)
const DATA_ROOT = '';
// Miniature WebP della coda (264 x 369, il doppio di 132 px), una per carta: thumbs/<id>.webp
const THUMB_DIR = 'thumbs/';
// Retro della carta pescata, mostrato prima che si giri (630 x 880 WebP)
// Dorso delle carte nemesi: retro con il logo Aeon's End (immagine dell'utente). I dorsi precedenti restano nel repo:
// Assets/ui/decor/card-back.webp e card-back.svg (kit di design)
const CARD_BACK = 'Assets/ui/decor/card-back-logo.webp';

// Tutte le carte (cards.json) e la tabella Nemesis Deck Setup (deck-setup.json), lette all'avvio
let allCards = [];
let cardsById = new Map();
let deckSetup = null;
// Nemesi con wave, mini espansione e battaglia (nemesis.json)
let nemeses = [];

// Scelte della pagina iniziale: giocatori, nemesi (da cui dipende la battaglia) e se usare le Upgraded Basic
let settings = { players: 2, nemesis: null, includeUpgraded: true };
// Immagini delle nemesi per il menu (Assets/nemesis/nemesis-art.json, fatto da tools/build-nemesis-art.py):
// { "Arachnos": { card, portrait, ratio } }. Facoltativo: se manca, i pulsanti restano senza illustrazione.
let nemesisArt = {};
let startOptions = null;

// Coda in gioco: dalla carta più vecchia alla più recente. Ogni carta in gioco ha un uid stabile
// (anche se la stessa carta compare due volte o cambia posizione) e il suo stato: token, vita, appena pescata.
let queue = [];
let nextUid = 1;

// Stato della VistaRisoluzione (false = VistaCoda)
let resolving = false;
// Posizione della carta da risolvere (cambia solo con il pulsante principale)
let currentIndex = 0;
// Posizione della carta appena pescata alla fine della risoluzione (-1 = nessuna)
let newIndex = -1;

// Mazzo nemesi (si pesca dalla fine), pila degli scarti e numero di turni nemesi giocati
let deck = [];
let discard = [];
let turn = 0;
// Tier più alto pescato finora: alla prima carta del Tier 2 e del Tier 3 compare la scritta "Tier N"
let maxTierDrawn = 0;

// Undo: uno stato della partita salvato prima di ogni azione
let undoStack = [];

// Stato solo dell'interfaccia (non entra nel salvataggio né nell'undo)
const ui = {
  viewedUid: null,        // carta mostrata grande in VistaRisoluzione (anteprima se diversa da quella da risolvere)
  holdUid: null,          // carta appena risolta ancora in primo piano mentre la sua animazione finisce
  isTransitioning: false, // dopo un'azione, fino alla fine dell'animazione: niente secondo tocco
  transitionTimer: null,
  reveal: null,           // carta pescata da girare: { uid, status: 'loading' | 'ready' | 'error' }
  queueAnchor: null,      // { uid, align } carta su cui allineare la coda al prossimo disegno
  lastDrawnUid: null,
  drafts: new Map(),      // turno giocatori: modifiche non ancora salvate per carta { uid -> { hp?, paid? } }
  flyingDiscards: 0,      // carte in volo verso la pila degli scarti (non ancora contate)
  tierWaitUntil: 0,       // fino a quando il banner Tier copre l'app (token e vita compaiono dopo)
  slide: 0,              // direzione dell'ultimo cambio di carta (per l'animazione)
  slidePx: null           // distanza da cui entra la carta dopo uno slide col dito (px, con segno)
};

// --- 2. Dati e mazzo ------------------------------------------------------------------------------------------------

async function loadJson(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error('Impossibile leggere ' + path + ' (' + res.status + ')');
  return res.json();
}

function shuffle(cards) {
  const result = cards.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// n carte a caso dalla lista
function pickRandom(cards, n) {
  return shuffle(cards).slice(0, n);
}

// La battaglia dipende dal boss scelto (colonna Expedition Battle di nemesis.json)
function battleOf(nemesisName) {
  const info = nemeses.find(n => n.name === nemesisName);
  return info ? info.battle : null;
}

// --- Collezione: wave possedute e, per ogni wave, scatola base e mini espansioni (scelte nella schermata "La mia
// collezione", salvate nel browser). Un prodotto ha id "<wave>|base" o "<wave>|<mini espansione>".
// Le nemesi e le carte Basic / Upgraded Basic si usano solo se il loro prodotto è nella collezione.
const COLLECTION_KEY = 'aeonsend-app-0.2-collection';
let collection = null; // Set di id prodotto

function productOfNemesis(info) {
  return info.wave + '|' + (info.miniExpansion ? info.miniExpansion : 'base');
}

// Prodotto di una carta Basic / Upgraded Basic dal prefisso del codice (cards.json non ha il campo): le carte
// NA- sono della scatola base di The New Age, TA- di The Ancients, SD- di Shattered Dreams, ITW- di Into The Wild.
// Un prefisso sconosciuto: la carta resta sempre ammessa.
const CARD_PRODUCT_PREFIX = [
  ['TA-', 'The Ancients'], ['SD-', 'Shattered Dreams'], ['ITW-', 'Into The Wild'], ['NA-', null]
];
const NEW_AGE_WAVE = '4 - The New Age';
function productOfCard(card) {
  const hit = CARD_PRODUCT_PREFIX.find(([prefix]) => String(card.id).startsWith(prefix));
  if (!hit) return null;
  return NEW_AGE_WAVE + '|' + (hit[1] || 'base');
}

// Tutti i prodotti per wave, nell'ordine delle wave: [{ wave, products: [{ id, name, isBase }] }]
function collectionCatalog() {
  const waves = [...new Set([...nemeses].sort((a, b) => a.waveOrder - b.waveOrder).map(n => n.wave))];
  return waves.map(wave => {
    const minis = [...new Set(nemeses.filter(n => n.wave === wave && n.miniExpansion).map(n => n.miniExpansion))];
    return {
      wave,
      products: [{ id: wave + '|base', name: I18N_IT.baseBox, isBase: true },
        ...minis.map(m => ({ id: wave + '|' + m, name: m, isBase: false }))]
    };
  });
}

function loadCollection() {
  try {
    const saved = JSON.parse(localStorage.getItem(COLLECTION_KEY));
    if (Array.isArray(saved)) { collection = new Set(saved); return; }
  } catch (err) { /* collezione illeggibile: si riparte da quella predefinita */ }
  // Predefinita: i prodotti delle nemesi segnate come possedute in nemesis.json
  collection = new Set(nemeses.filter(n => n.owned).map(productOfNemesis));
}

function saveCollection() {
  try { localStorage.setItem(COLLECTION_KEY, JSON.stringify([...collection])); } catch (err) { console.warn(err); }
}

function ownsProduct(id) {
  return !collection || collection.has(id);
}

// Carta Basic / Upgraded Basic ammessa: il suo prodotto è nella collezione (o non si sa di che prodotto è)
function cardAllowed(card) {
  const product = productOfCard(card);
  return !product || ownsProduct(product);
}

// Un boss si può scegliere solo se ha una battaglia, le sue carte sono nel progetto e il suo prodotto è nella collezione
function isPlayable(info) {
  return info.battle !== null && ownsProduct(productOfNemesis(info))
    && allCards.some(c => c.category === 'Specific' && c.nemesis === info.name);
}

// Mazzo per la battaglia del boss scelto (Nemesis Deck Setup): per ogni Tier si estraggono a caso le carte base e
// potenziate indicate nella tabella e si aggiungono le carte specifiche del nemico di quel Tier.
// Senza "Include Upgraded Basic" al posto delle potenziate si prendono altrettante carte base diverse, dello stesso
// Tier: il numero di carte resta uguale.
// Ogni Tier è mescolato a parte; si pesca dalla fine, quindi in cima c'è il Tier 1 e in fondo il Tier 3.
// Restano fuori le carte senza Tier (World Devourer, Rending Claw) e la maledizione dei giocatori.
function buildDeck() {
  const battle = deckSetup.battles.find(b => b.battle === battleOf(settings.nemesis));
  const setup = battle.players[String(settings.players)];
  const result = [];
  [3, 2, 1].forEach(tier => {
    const ofTier = c => c.tier === tier && c.type !== 'Curse';
    const basicCount = setup.basic[tier] + (settings.includeUpgraded ? 0 : setup.upgradedBasic[tier]);
    const upgradedCount = settings.includeUpgraded ? setup.upgradedBasic[tier] : 0;
    const group = [
      // solo le carte dei prodotti della collezione
      ...pickRandom(allCards.filter(c => c.category === 'Basic Nemesis' && ofTier(c) && cardAllowed(c)), basicCount),
      ...pickRandom(allCards.filter(c => c.category === 'Upgraded Basic Nemesis' && ofTier(c) && cardAllowed(c)), upgradedCount),
      ...allCards.filter(c => c.category === 'Specific' && c.nemesis === settings.nemesis && ofTier(c))
    ];
    result.push(...shuffle(group));
  });
  return result;
}

// Nuova partita: mazzo nuovo per le scelte correnti, scarti vuoti, turni a zero
function newGame() {
  deck = buildDeck();
  discard = [];
  turn = 0;
  maxTierDrawn = 0;
}

// Pesca la carta in cima al mazzo. Regole di Aeon's End: il mazzo nemesi non si rimescola; se è vuoto la nemesi non
// pesca (null). Con mazzo vuoto e nessun potere o minion in gioco i giocatori vincono (checkVictory).
function drawFromDeck() {
  return deck.pop() || null;
}

// Vittoria: mazzo nemesi vuoto e nessun potere né minion in gioco (dopo il primo turno nemesi)
function isVictory() {
  return turn > 0 && deck.length === 0 && !queue.some(e => e.data.type === 'Power' || e.data.type === 'Minion');
}

// Carta in gioco (nella coda) con il suo stato
function makeEntry(data) {
  // turnHp: vita del minion all'inizio del turno dei giocatori (per mostrare il danno o la cura del turno)
  // paid: potere con costo pagato (salvato nel turno giocatori), grigio fino al turno nemesi, poi negli scarti
  return { uid: nextUid++, data, tokens: data.tokens, hp: data.hp, turnHp: data.hp, isNew: false, paid: false };
}

// Toglie la carta dalla coda e la mette nella pila degli scarti
function discardEntry(entry) {
  const i = queue.indexOf(entry);
  if (i >= 0) queue.splice(i, 1);
  discard.push(entry.data);
}

function entryByUid(uid) {
  return queue.find(e => e.uid === uid) || null;
}

// --- 3. Componenti dell'interfaccia --------------------------------------------------------------------------------

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function icon(name) {
  const span = el('span', 'ae-icon ae-icon--' + name);
  span.setAttribute('aria-hidden', 'true');
  return span;
}

function typeName(data) {
  return I18N_IT.types[data.type] || data.type;
}

function hasHp(entry) {
  return entry.data.type === 'Minion' && entry.hp !== null && entry.hp !== undefined;
}

// Stato numerico della carta in parole (per i lettori di schermo)
function statusText(entry) {
  if (hasHp(entry)) return I18N_IT.hpLong(entry.hp, entry.data.hp);
  if (entry.data.type === 'Power') return I18N_IT.tokens(entry.tokens);
  return '';
}

// Riquadro segnaposto quando l'immagine non si carica: nome, tipo e avviso (mai un rettangolo vuoto)
function placeholderArt(data) {
  const box = el('span', 'ae-card-art ae-card-art--placeholder');
  box.append(el('strong', '', data.name), el('small', '', typeName(data)), el('em', '', I18N_IT.imageMissing));
  return box;
}

// Immagine di una carta. thumb = miniatura WebP (se non c'è si usa la scansione); se manca anche quella, segnaposto.
// sync: immagine già scaricata e decodificata (carte grandi del turno nemesi): si disegna subito, senza lampo vuoto
function cardArt(data, { thumb = false, lazy = false, sync = false } = {}) {
  const box = el('span', 'ae-card-art');
  const img = document.createElement('img');
  img.alt = '';
  img.decoding = sync ? 'sync' : 'async';
  img.width = 264;
  img.height = 369;
  if (lazy) img.loading = 'lazy';
  img.src = thumb ? data.thumb : encodeURI(data.image);
  img.addEventListener('error', () => {
    if (thumb && img.dataset.fallback !== '1') {
      img.dataset.fallback = '1';
      img.src = encodeURI(data.image);
      return;
    }
    box.replaceWith(Object.assign(placeholderArt(data), { className: box.className + ' ae-card-art--placeholder' }));
  });
  box.appendChild(img);
  return box;
}

// Token del potere come nella versione 1: un'immagine (Assets/power-token-2.webp) per ogni token rimasto
function tokenIcons(n) {
  const row = el('span', 'ae-tokens');
  row.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < Math.max(0, n); i++) row.appendChild(el('span', 'ae-token'));
  return row;
}

function hpChanged(entry) {
  return hasHp(entry) && entry.turnHp !== undefined && entry.turnHp !== null && entry.hp !== entry.turnHp;
}

// Badge fuori dalla scansione (box grigio scuro): goccia + vita attuale (minion), un token per ogni token (potere).
// Uguale nella coda e nella fascia della VistaRisoluzione.
// Carta che si attiverà nel prossimo turno nemesi: minion (ogni turno) e potere con 1 solo token rimasto
function activatesNextTurn(entry) {
  if (isGone(entry)) return false;
  return hasHp(entry) || (entry.data.type === 'Power' && entry.tokens === 1);
}

// Carta che va negli scarti all'inizio del prossimo turno nemesi: potere con costo pagato o minion ucciso (vita 0 salvata).
// Nel turno giocatori resta in coda, grigia.
function isGone(entry) {
  return !!entry.paid || (hasHp(entry) && entry.hp <= 0);
}

// Turno giocatori: modifiche non ancora salvate di una carta (vita in bozza, costo pagato in bozza)
function draftOf(entry) {
  return ui.drafts.get(entry.uid) || null;
}
function draftHp(entry) {
  const d = draftOf(entry);
  return d && d.hp !== undefined ? d.hp : entry.hp;
}
function setDraft(entry, patch) {
  const d = Object.assign({}, draftOf(entry), patch);
  if (d.hp === entry.hp) delete d.hp;
  if (!d.paid) delete d.paid;
  if (Object.keys(d).length) ui.drafts.set(entry.uid, d); else ui.drafts.delete(entry.uid);
}
// Copia della carta con la vita in bozza, per disegnare box e fascia
function displayEntry(entry) {
  const d = draftOf(entry);
  // isDraft: la vita è in bozza, il box mostra "x/tot" (dopo Salva solo "x")
  if (!d) return entry;
  const view = Object.assign({}, entry);
  if (d.hp !== undefined) Object.assign(view, { hp: d.hp, isDraft: true });
  if (d.paid) view.paid = true;
  return view;
}

function statusBadge(entry) {
  const badge = el('span', 'ae-status-badge');
  badge.setAttribute('aria-hidden', 'true');
  if (hasHp(entry)) {
    badge.classList.add('ae-status-badge--danger');
    // Vita + goccia; con una modifica non ancora salvata: vita / massimo
    const hpText = entry.isDraft ? I18N_IT.hp(entry.hp, entry.data.hp) : String(entry.hp);
    // Testo lungo (per esempio 13/17): nella fascia piccola il box si allarga e il testo si stringe
    if (hpText.length > 3) badge.classList.add('is-long');
    badge.append(icon('heart'), el('span', '', hpText));
  } else if (entry.data.type === 'Power') {
    badge.classList.add('ae-status-badge--tokens');
    badge.appendChild(tokenIcons(entry.tokens));
  } else {
    // Attacco: nessun badge, solo lo spazio per tenere allineate le carte
    badge.classList.add('ae-status-badge--empty');
    badge.textContent = '·';
  }
  return badge;
}

// Miniatura della coda (pulsante). opts: { compact, current, viewed, index, total, lazy }
function queueItem(entry, opts) {
  const { data } = entry;
  const button = el('button', 'ae-queue-item');
  button.type = 'button';
  button.dataset.uid = entry.uid;
  button.setAttribute('role', 'listitem');
  if (entry.isNew) button.classList.add('is-new');
  if (isGone(entry)) button.classList.add('is-paid');
  if (opts.current) button.setAttribute('aria-current', 'true');
  if (opts.viewed) button.dataset.viewed = 'true';

  const parts = [data.name, typeName(data), statusText(entry), I18N_IT.cardOf(opts.index + 1, opts.total)];
  if (entry.isNew) parts.push(I18N_IT.newTag.toLowerCase());
  if (entry.paid) parts.push(I18N_IT.paidNote.toLowerCase());
  else if (isGone(entry)) parts.push(I18N_IT.killedNote.toLowerCase());
  if (opts.current) parts.push('da risolvere');
  if (opts.viewed && !opts.current) parts.push('in anteprima');
  button.setAttribute('aria-label', parts.filter(Boolean).join(', '));

  const meta = el('span', 'ae-queue-meta');
  meta.setAttribute('aria-hidden', 'true');
  meta.append(el('strong', '', data.name), el('small', '', typeName(data)));

  // Le carte grandi della VistaCoda usano la scansione intera, le altre la miniatura
  const art = cardArt(data, { thumb: !opts.full, lazy: opts.lazy });
  // (non sulla carta appena pescata: ha già NUOVA e il glow dorato)
  // (niente pill RISOLVI sulla carta da risolvere)

  button.append(statusBadge(entry), meta, art);
  if (entry.isNew) {
    const tag = el('span', 'ae-new-tag', I18N_IT.newTag);
    tag.setAttribute('aria-hidden', 'true');
    button.appendChild(tag);
  }
  return button;
}

// Prossima carta da pescare nella fascia della VistaRisoluzione: solo il retro (non si vede quale carta è) e NUOVA.
// Non è cliccabile.
function nextCardItem({ current = false, viewed = false } = {}) {
  const item = el(current ? 'button' : 'div', 'ae-queue-item ae-next-card');
  if (current) {
    // Nel passo da pescare è la carta da "risolvere": si può toccare per tornarci
    item.type = 'button';
    item.dataset.uid = DRAW_UID;
    item.setAttribute('aria-current', 'true');
  }
  if (viewed) item.dataset.viewed = 'true';
  item.setAttribute('role', 'listitem');
  item.setAttribute('aria-label', I18N_IT.nextCard);
  const badge = el('span', 'ae-status-badge ae-status-badge--empty', '·');
  badge.setAttribute('aria-hidden', 'true');
  const art = el('span', 'ae-card-art');
  const img = document.createElement('img');
  img.alt = '';
  img.src = CARD_BACK;
  art.appendChild(img);
  const tag = el('span', 'ae-new-tag', I18N_IT.newTag);
  tag.setAttribute('aria-hidden', 'true');
  item.append(badge, art, tag);
  return item;
}

// Gocce di vita decorative (solo nel dialogo del minion): quante più possibile da 5 e il resto da 1;
// lost = punti vita tolti (grigie in fondo), gained = punti vita aggiunti (gocce da 1 con glow)
function dropsRow(hp, lost, gained) {
  const row = el('div', 'ae-drops');
  row.setAttribute('aria-hidden', 'true');
  const extra = Math.max(0, Math.min(gained, hp));
  const base = Math.max(0, hp) - extra;
  const classes = [
    ...Array(Math.floor(base / DROP_BIG_VALUE)).fill('drop5'),
    ...Array(base % DROP_BIG_VALUE).fill('drop'),
    ...Array(extra).fill('drop gained'),
    ...Array(Math.floor(Math.max(0, lost) / DROP_BIG_VALUE)).fill('drop5 lost'),
    ...Array(Math.max(0, lost) % DROP_BIG_VALUE).fill('drop lost')
  ];
  row.append(...classes.map(cls => el('span', cls)));
  return row;
}

// --- Dialoghi: un livello alla volta in primo piano, il resto è inerte; Tab resta nel dialogo, Esc annulla ---

const modals = [];

function topLayer() {
  if (modals.length) return modals[modals.length - 1].backdrop;
  if (!discardLayer.hidden) return discardLayer;
  if (!startLayer.hidden) return startLayer;
  return app;
}

function updateInert() {
  const top = topLayer();
  [app, startLayer, discardLayer, ...modals.map(m => m.backdrop)].forEach(layer => {
    layer.inert = layer !== top;
  });
}

// Apre un dialogo. onCancel = Esc, X o tocco fuori (closeOnScrim). Restituisce la funzione che lo chiude.
function openModal(node, { onCancel, initialFocus, closeOnScrim = true }) {
  const backdrop = el('div', 'ae-modal-backdrop');
  backdrop.appendChild(node);
  const record = { backdrop, onCancel, trigger: document.activeElement };
  backdrop.addEventListener('click', e => {
    if (e.target === backdrop && closeOnScrim) record.onCancel();
  });
  dialogRoot.appendChild(backdrop);
  modals.push(record);
  updateInert();
  (initialFocus || focusables(node)[0] || node).focus();
  return () => closeModal(record);
}

function closeModal(record) {
  const i = modals.indexOf(record);
  if (i < 0) return;
  modals.splice(i, 1);
  record.backdrop.remove();
  updateInert();
  restoreFocus(record.trigger);
}

function closeAllModals() {
  while (modals.length) closeModal(modals[modals.length - 1]);
}

function restoreFocus(trigger) {
  if (trigger && trigger.isConnected && !trigger.closest('[inert]')) trigger.focus({ preventScroll: true });
}

function focusables(root) {
  return Array.from(root.querySelectorAll('button, [href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])'))
    .filter(n => !n.disabled && !n.hidden && n.offsetParent !== null);
}

// Struttura comune: titolo, tipo, X per chiudere
let dialogCount = 0;
function dialogShell(titleText, kindText, onClose, { displayTitle = true } = {}) {
  const dialog = el('div', 'ae-modal');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  const titleId = 'dlg-title-' + (++dialogCount);
  dialog.setAttribute('aria-labelledby', titleId);
  const header = el('div', 'ae-modal-header');
  const titles = el('div');
  const title = el('h2', displayTitle ? 'ae-modal-title' : 'ae-modal-title ae-modal-title--ui', titleText);
  title.id = titleId;
  titles.appendChild(title);
  if (kindText) titles.appendChild(el('p', 'ae-modal-kind', kindText));
  const x = el('button', 'ae-icon-button');
  x.type = 'button';
  x.setAttribute('aria-label', I18N_IT.close);
  x.appendChild(icon('close'));
  x.addEventListener('click', onClose);
  header.append(titles, x);
  dialog.appendChild(header);
  return dialog;
}

function button(text, variant, handler) {
  const b = el('button', 'ae-button ae-button--' + variant, text);
  b.type = 'button';
  if (handler) b.addEventListener('click', handler);
  return b;
}

// Toast di conferma (visibile 3 secondi, si chiude anche toccandolo) e annunci per lettori di schermo
let toastTimer = null;
function showToast(text) {
  clearTimeout(toastTimer);
  const toast = el('div', 'ae-toast', text);
  toast.addEventListener('click', () => toast.remove());
  toastRoot.replaceChildren(toast);
  toastTimer = setTimeout(() => {
    toast.classList.add('is-leaving');
    setTimeout(() => toast.remove(), 160);
  }, 3000);
}

function announce(text) {
  liveRegion.textContent = '';
  setTimeout(() => { liveRegion.textContent = text; }, 30);
}

// Promessa che si risolve con true quando l'immagine è scaricata, false se non si carica (al massimo 8 secondi)
const decodedImages = new Map();
function keepDecoded(src, img) {
  decodedImages.delete(src);
  decodedImages.set(src, img);
  while (decodedImages.size > 12) decodedImages.delete(decodedImages.keys().next().value);
}

function loadImage(src) {
  return new Promise(resolve => {
    const img = new Image();
    let done = false;
    const finish = ok => { if (!done) { done = true; resolve(ok); } };
    // Scaricata e anche decodificata (pronta da disegnare): così la carta pescata si vede subito quando si gira.
    // L'immagine resta in memoria (decodedImages) finché serve, così il browser non butta la decodifica.
    img.onload = () => {
      keepDecoded(src, img);
      if (img.decode) img.decode().then(() => finish(true), () => finish(true));
      else finish(true);
    };
    img.onerror = () => finish(false);
    img.src = src;
    if (img.complete && img.naturalWidth) img.onload();
    setTimeout(() => finish(false), 8000);
  });
}

// --- 4. VistaCoda -------------------------------------------------------------------------------------------------

function updateInfo() {
  turnInfo.textContent = I18N_IT.turnInfo(turn, deck.length);
  discardBtn.textContent = I18N_IT.discardButton(discard.length);
  discardBtn.setAttribute('aria-label', I18N_IT.discardButtonLabel(discard.length));
}

// VistaCoda: in alto la fascia compatta con tutta la coda (come nel turno nemesi), sotto le carte grandi, una e mezza
// alla volta. Toccare una carta della fascia porta lì le carte grandi; la carta più al centro è quella evidenziata.
let queueRail = null;
function ensureQueueRail() {
  if (queueRail) return queueRail;
  queueRail = el('div', 'ae-compact-rail queue-rail');
  queueRail.id = 'queue-rail';
  queueRail.setAttribute('role', 'list');
  queueRail.setAttribute('aria-label', I18N_IT.queueRail);
  queueView.querySelector('.queue-col').prepend(queueRail);
  trackDrag(queueRail);
  queueRail.addEventListener('click', e => {
    const item = e.target.closest('.ae-queue-item');
    if (!item || queueRail.dataset.dragged === '1') return;
    const big = queueList.querySelector(`[data-uid="${item.dataset.uid}"]`);
    if (big) scrollQueueTo(big);
    markQueueRail(Number(item.dataset.uid));
  });
  queueViewport.addEventListener('scroll', () => {
    if (queueRailFrame) return;
    queueRailFrame = requestAnimationFrame(() => { queueRailFrame = 0; markQueueRail(centredQueueUid()); });
  }, { passive: true });
  return queueRail;
}
let queueRailFrame = 0;

function scrollQueueTo(item) {
  const cRect = queueViewport.getBoundingClientRect();
  const iRect = item.getBoundingClientRect();
  const left = iRect.left - cRect.left + queueViewport.scrollLeft + iRect.width / 2 - queueViewport.clientWidth / 2;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  queueViewport.scrollTo({ left, behavior: reduce ? 'auto' : 'smooth' });
}

function centredQueueUid() {
  const cRect = queueViewport.getBoundingClientRect();
  const middle = cRect.left + cRect.width / 2;
  let best = null;
  let bestDist = Infinity;
  queueList.querySelectorAll('.ae-queue-item').forEach(item => {
    const r = item.getBoundingClientRect();
    const d = Math.abs(r.left + r.width / 2 - middle);
    if (d < bestDist) { bestDist = d; best = Number(item.dataset.uid); }
  });
  return best;
}

function markQueueRail(uid) {
  if (!queueRail) return;
  queueRail.querySelectorAll('.ae-queue-item').forEach(item => {
    const on = Number(item.dataset.uid) === uid;
    if (on) item.dataset.viewed = 'true'; else delete item.dataset.viewed;
    if (on) scrollItemInto(queueRail, item, 'nearest');
  });
}

// Comandi sotto la carta grande della VistaCoda, legati a quella carta:
//   minion: −5 −1 +1 (ogni tocco cambia subito la vita, un passo di undo); a 0 compare "Elimina minion"
//   potere rimovibile (TO DISCARD): "Rimuovi · costo pagato"; gli altri poteri non hanno comandi
// La riga c'è sempre (anche vuota), così tutte le carte hanno la stessa dimensione.
function cardControls(entry) {
  const box = el('div', 'queue-controls');
  const uid = entry.uid;
  const ctl = (label, variant, key, aria, handler) => {
    const b = button(label, variant, e => {
      e.stopPropagation();
      if (resolving || ui.isTransitioning || queueViewport.dataset.dragged === '1') return;
      handler();
    });
    b.dataset.uid = uid;
    b.dataset.ctl = key;
    if (aria) b.setAttribute('aria-label', aria);
    return b;
  };
  const refocus = key => {
    const target = queueList.querySelector(`.queue-controls [data-uid="${uid}"][data-ctl="${key}"]`)
      || queueList.querySelector(`.queue-controls [data-uid="${uid}"]`);
    if (target) target.focus({ preventScroll: true });
  };
  if (hasHp(entry) && entry.hp <= 0) {
    // Minion ucciso (vita 0 salvata): grigio, va negli scarti al prossimo turno nemesi; si torna indietro con Undo
    box.appendChild(el('p', 'queue-note is-paid', I18N_IT.killedNote));
  } else if (hasHp(entry)) {
    // I tocchi cambiano una bozza, "Salva" sulla carta la conferma (un passo di undo); a 0 con Salva il minion è ucciso.
    // +1 si può usare solo per rimettere vita tolta in questo turno (fino alla vita di inizio turno): altrimenti è oscurato
    const shown = draftHp(entry);
    const cap = Math.min(entry.data.hp, entry.turnHp === undefined || entry.turnHp === null ? entry.hp : entry.turnHp);
    [-5, -1, 1].forEach(step => {
      const key = String(step);
      const b = ctl(step > 0 ? '+' + step : '−' + Math.abs(step), 'secondary', key,
        (step > 0 ? 'Rimetti ' : 'Togli ') + Math.abs(step) + ' punti vita a ' + entry.data.name, () => {
          const value = Math.min(cap, Math.max(0, draftHp(entry) + step));
          if (value === draftHp(entry)) return;
          setDraft(entry, { hp: value });
          render();
          refocus(key);
        });
      if ((step > 0 && shown >= cap) || (step < 0 && shown <= 0)) { b.disabled = true; b.classList.add('is-dimmed'); }
      box.appendChild(b);
    });
  } else if (entry.data.type === 'Power' && entry.paid) {
    box.appendChild(el('p', 'queue-note is-paid', I18N_IT.paidNote));
  } else if (entry.data.type === 'Power' && entry.data.removable !== false) {
    const d = draftOf(entry);
    if (d && d.paid) {
      box.appendChild(ctl(I18N_IT.cancelPay, 'secondary', 'cancel', null, () => { setDraft(entry, { paid: false }); render(); refocus('remove'); }));
    } else {
      box.appendChild(ctl(I18N_IT.removePowerShort, 'danger', 'remove', I18N_IT.removePower + ': ' + entry.data.name,
        () => { setDraft(entry, { paid: true }); render(); refocus('cancel'); }));
    }
  } else if (entry.data.type === 'Power') {
    // Potere senza "TO DISCARD": nota piccola al posto del pulsante
    box.appendChild(el('p', 'queue-note', I18N_IT.notRemovable));
  }
  return box;
}

// Carte grandi: alte quanto lo spazio disponibile, ma mai così larghe da nascondere del tutto la carta successiva
function sizeQueue() {
  if (queueView.hidden) return;
  const style = getComputedStyle(queueViewport);
  const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  const gap = parseFloat(getComputedStyle(queueList).columnGap) || 18;
  // Stessa regola del carosello del turno nemesi (sizeFocus): la carta riempie l'altezza, ai lati si vede un pezzo delle vicine
  const peekRoom = queue.length > 1 ? 2 * (PEEK_VISIBLE + PEEK_GAP) : 0; // come nel carosello: stessa larghezza della carta
  // Come sizeFocus: sopra la carta il box vita/token (41px) e 8px di spazio. I comandi stanno fuori dal flusso, sotto la
  // carta, così la carta ha la stessa posizione e dimensione del turno nemesi; solo su schermi bassi la si rimpicciolisce
  // quanto basta perché i comandi (52px) restino dentro l'area (il blocco è centrato in verticale).
  const width = Math.max(100, sharedCardWidth(queueViewport.clientWidth, queueViewport.clientHeight, padY, peekRoom));
  queueViewport.style.setProperty('--ae-queue-card', width + 'px');
  // Margini ai lati: la prima e l'ultima carta si centrano come le altre (non sulla vista a colonna del desktop)
  const side = window.innerWidth >= 900 ? '' : Math.max(0, (queueViewport.clientWidth - width) / 2) + 'px';
  queueViewport.style.paddingLeft = side;
  queueViewport.style.paddingRight = side;
  queueViewport.style.scrollPaddingInline = side;
}

function renderQueue() {
  const previous = queueViewport.scrollLeft;
  const previousTop = queueViewport.scrollTop;
  const railEl = ensureQueueRail();
  const railScroll = railEl.scrollLeft;
  railEl.replaceChildren(...queue.map((entry, i) => queueItem(displayEntry(entry), { compact: true, index: i, total: queue.length })));
  railEl.scrollLeft = railScroll;
  railEl.hidden = queue.length === 0;
  queueList.replaceChildren(...queue.map((entry, i) => {
    // Ogni carta grande con i suoi comandi subito sotto (vita del minion, rimozione del potere)
    const slot = el('div', 'queue-slot');
    slot.setAttribute('role', 'listitem');
    const card = queueItem(displayEntry(entry), { full: true, index: i, total: queue.length, lazy: i > 3 });
    card.removeAttribute('role');
    const d = draftOf(entry);
    if (d && d.hp !== undefined) {
      // Danno in bozza (non ancora salvato), in alto a destra sulla carta: sparisce con "Salva"
      const change = d.hp - entry.hp;
      const tag = el('span', 'queue-hp-tag ' + (change < 0 ? 'is-loss' : 'is-gain'), I18N_IT.hpTurnTag(change));
      tag.setAttribute('aria-hidden', 'true');
      card.querySelector('.ae-card-art').appendChild(tag);
    }
    slot.append(card, cardControls(entry));
    // Le modifiche si salvano tutte insieme con "Salva modifiche" (il pulsante principale)
    return slot;
  }));
  queueEmpty.hidden = queue.length > 0;
  // "Premi Turno Nemesi per pescare" solo prima del primo turno nemesi
  const emptyHint = queueEmpty.querySelector('p');
  if (emptyHint) emptyHint.hidden = turn > 0;
  sizeQueue();

  const anchor = ui.queueAnchor;
  ui.queueAnchor = null;
  if (queue.length === 0) {
    queueViewport.scrollLeft = 0;
    queueViewport.scrollTop = 0;
  } else if (anchor) {
    scrollToCard(anchor.uid, anchor.align);
  } else {
    queueViewport.scrollLeft = previous;
    queueViewport.scrollTop = previousTop;
  }
  markQueueRail(centredQueueUid());
}

// Allinea la coda su una carta: 'anchor' = centro della carta al 62% (si vede cosa la precede), 'center', 'nearest'
function scrollToCard(uid, align = 'nearest') {
  const item = queueList.querySelector(`[data-uid="${uid}"]`);
  if (!item) return;
  scrollItemInto(queueViewport, item, align);
}

function scrollItemInto(container, item, align) {
  const vertical = container.scrollHeight > container.clientHeight + 1 && container.scrollWidth <= container.clientWidth + 1;
  const cRect = container.getBoundingClientRect();
  const iRect = item.getBoundingClientRect();
  if (vertical) {
    const top = iRect.top - cRect.top + container.scrollTop;
    if (align === 'nearest') {
      if (iRect.top < cRect.top) container.scrollTop = top - 16;
      else if (iRect.bottom > cRect.bottom) container.scrollTop = top + iRect.height - container.clientHeight + 16;
    } else {
      container.scrollTop = top + iRect.height / 2 - container.clientHeight / 2;
    }
    return;
  }
  const left = iRect.left - cRect.left + container.scrollLeft;
  if (align === 'nearest') {
    if (iRect.left < cRect.left + 16) container.scrollLeft = left - 16;
    else if (iRect.right > cRect.right - 16) container.scrollLeft = left + iRect.width - container.clientWidth + 16;
    return;
  }
  const ratio = align === 'anchor' ? ANCHOR_RATIO : 0.5;
  container.scrollLeft = left + iRect.width / 2 - container.clientWidth * ratio;
}

// Dopo un dialogo la coda è ridisegnata: il focus va sulla carta indicata (o su Turno Nemesi se la coda è vuota)
function focusQueueItem(uid) {
  const item = uid !== null && queueList.querySelector(`[data-uid="${uid}"]`);
  (item || nemesisBtn).focus({ preventScroll: true });
}

// "Salva modifiche" (pulsante principale del turno giocatori): tutte le bozze diventano definitive in un solo passo di
// undo; le carte grigie (potere con costo pagato, minion a 0) vanno negli scarti volando verso la pila in alto
function saveAllDrafts() {
  if (resolving || ui.isTransitioning || !ui.drafts.size) return;
  const drafts = new Map(ui.drafts);
  ui.drafts.clear();
  const gone = [];
  act(() => {
    drafts.forEach((d, uid) => {
      const entry = entryByUid(uid);
      if (!entry) return;
      if (d.hp !== undefined) entry.hp = d.hp;
      if (d.paid) entry.paid = true;
    });
    gone.push(...queue.filter(isGone));
    gone.forEach(discardEntry);
  });
  // Le carte sono ancora nella pagina (non ridisegnata): partono da lì
  flyToDiscard(gone.map(e => queueList.querySelector(`.ae-queue-item[data-uid="${e.uid}"] .ae-card-art`)));
  render();
  nemesisBtn.focus({ preventScroll: true });
}

// Dopo un minion eliminato nel turno nemesi: gli indici della risoluzione seguono la coda
function removeWhileResolving(entry) {
  const index = queue.indexOf(entry);
  const wasNew = newIndex >= 0 && index === newIndex;
  discardEntry(entry);
  if (wasNew) { endResolution(); return; }
  if (index < currentIndex) currentIndex--;
  if (newIndex > index) newIndex--;
  if (currentIndex >= queue.length && newIndex < 0 && !canDraw()) endResolution();
}

// Carta su cui allineare la coda quando una carta sparisce: la successiva, altrimenti la precedente
function neighbourUid(index) {
  const next = queue[index] || queue[index - 1];
  return next ? next.uid : null;
}

// VistaCartaCoda: dialogo della carta toccata. Minion = punti vita in bozza; potere = rimozione esplicita.
// Niente intestazione (nome, tipo, X): si chiude con Chiudi/Annulla, Esc o tocco fuori; lo spazio va alla carta.
// Sotto la carta c'è sempre un pannello alto uguale per ogni tipo, così la carta ha la stessa dimensione per minion,
// poteri e attacchi.
function openCardDialog(entry) {
  // Nel turno nemesi si apre solo per i minion (−1 / +1 alla vita)
  if (ui.isTransitioning || (resolving && entry.data.type !== 'Minion')) return;
  const { data } = entry;
  let close = () => {};
  const cancel = () => close();
  const dialog = el('div', 'ae-modal ae-modal--card');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', [data.name || I18N_IT.cardInPlay, typeName(data)].join(', '));
  const art = cardArt(data);
  art.classList.add('ae-modal-art');
  const panel = el('div', 'ae-card-panel');
  dialog.append(art, panel);

  if (hasHp(entry)) {
    buildHpPanel(dialog, panel, entry, () => close());
  } else if (data.type === 'Power') {
    // Token rimasti come icone, un token per ogni token
    const tokens = el('p', 'ae-card-panel-tokens');
    tokens.setAttribute('aria-label', I18N_IT.tokensLeft(entry.tokens));
    tokens.appendChild(tokenIcons(entry.tokens));
    panel.appendChild(tokens);
    // Costo pagato: la carta diventa grigia (modifica non salvata); con "Salva modifiche" va negli scarti
    const remove = button(I18N_IT.removePower, 'danger', () => {
      close();
      setDraft(entry, { paid: true });
      render();
      focusQueueItem(entry.uid);
    });
    const footer = el('div', 'ae-modal-footer');
    footer.append(button(I18N_IT.close, 'secondary', cancel));
    // Solo i poteri con "TO DISCARD" si possono rimuovere pagando il costo (cards.json: removable)
    if (data.removable !== false && !entry.paid && !(draftOf(entry) && draftOf(entry).paid)) footer.appendChild(remove);
    dialog.appendChild(footer);
  } else {
    const footer = el('div', 'ae-modal-footer');
    footer.append(button(I18N_IT.close, 'secondary', cancel));
    dialog.appendChild(footer);
  }
  close = openModal(dialog, { onCancel: cancel });
}

// Punti vita in bozza: i pulsanti cambiano solo la bozza; Conferma applica una volta sola (un passo di undo);
// Annulla, X, Esc o tocco fuori lasciano la vita com'era
// Riga: "HP x / y" a sinistra, danno o cura della bozza a destra; sotto i pulsanti −5 −1 +1.
function buildHpPanel(dialog, panel, entry, close) {
  const max = entry.data.hp;
  // Turno giocatori: si parte dalla vita in bozza e la conferma scrive una bozza (si salva con "Salva modifiche")
  const original = resolving ? entry.hp : draftHp(entry);
  let draft = original;
  let committing = false;

  const row = el('div', 'ae-hp-row');
  const number = el('p', 'ae-hp-number');
  number.setAttribute('aria-live', 'polite');
  const delta = el('p', 'ae-hp-delta');
  row.append(number, delta);
  const controls = el('div', 'ae-hp-controls');
  // Turno giocatori: −5, −1 e +1 (solo fino alla vita di inizio turno); turno nemesi: −1 e +1
  const cap = resolving ? max : Math.min(max, entry.turnHp === undefined || entry.turnHp === null ? entry.hp : entry.turnHp);
  const stepButtons = [];
  (resolving ? [-1, 1] : [-5, -1, 1]).forEach(step => {
    const b = button(step > 0 ? '+' + step : '−' + Math.abs(step), 'secondary', () => {
      draft = Math.min(cap, Math.max(0, draft + step));
      update();
    });
    stepButtons.push([step, b]);
    b.setAttribute('aria-label', (step > 0 ? 'Aggiungi ' : 'Togli ') + Math.abs(step) + ' punti vita');
    controls.appendChild(b);
  });
  const footer = el('div', 'ae-modal-footer');
  const confirm = button(I18N_IT.confirmHp, 'primary', commit);
  footer.append(button(I18N_IT.cancel, 'secondary', close), confirm);
  panel.append(row, controls);
  dialog.appendChild(footer);

  function update() {
    number.textContent = `HP ${draft} / ${max}`;
    const change = draft - original;
    delta.className = 'ae-hp-delta' + (change < 0 ? ' is-loss' : change > 0 ? ' is-gain' : '');
    delta.replaceChildren();
    if (draft === 0) delta.append(icon('heart'), el('span', '', I18N_IT.willBeDeleted));
    else if (change !== 0) delta.append(icon('heart'), el('span', '', I18N_IT.hpDelta(change)));
    stepButtons.forEach(([step, b]) => {
      if (step > 0 && !resolving) { b.disabled = draft >= cap; b.classList.toggle('is-dimmed', draft >= cap); }
    });
    confirm.textContent = draft === 0 ? I18N_IT.deleteMinion : I18N_IT.confirmHp;
    confirm.className = 'ae-button ' + (draft === 0 ? 'ae-button--danger' : 'ae-button--primary');
  }

  function commit() {
    if (committing) return;
    committing = true;
    const index = queue.indexOf(entry);
    const name = entry.data.name;
    const value = draft;
    close();
    // Vita invariata: si chiude senza aggiungere un passo di undo
    if (value === original || index < 0) return;
    if (!resolving) {
      setDraft(entry, { hp: value });
      ui.queueAnchor = { uid: entry.uid, align: 'nearest' };
      render();
      focusQueueItem(entry.uid);
      return;
    }
    ui.drafts.delete(entry.uid);
    // Minion ucciso nel turno nemesi: vola negli scarti
    const killedArt = value <= 0 ? focusEl.querySelector(`.ae-focus-slide[data-uid="${entry.uid}"] .ae-focus-stage`) : null;
    const wasResolving = resolving;
    act(() => {
      entry.hp = value;
      if (value <= 0) {
        // turno nemesi: esce subito; turno giocatori: resta grigio fino al turno nemesi (isGone)
        if (resolving) removeWhileResolving(entry);
      }
    });
    if (wasResolving) {
      ui.viewedUid = null;
      if (killedArt) flyToDiscard([killedArt]);
      render();
      if (resolving) resolveBtn.focus(); else nemesisBtn.focus();
      showToast(value <= 0 ? I18N_IT.minionDeleted(name) : I18N_IT.hpLeftToast(name, value));
      return;
    }
    ui.queueAnchor = { uid: entry.uid, align: 'nearest' };
    render();
    focusQueueItem(entry.uid);
    showToast(value <= 0 ? I18N_IT.minionKilled(name) : I18N_IT.hpLeftToast(name, value));
  }

  update();
}

// --- 5. Pila degli scarti --------------------------------------------------------------------------------------------

let discardTrigger = null;

// Scarti dalla più recente alla più vecchia; un tocco apre la carta in sola lettura
function openDiscard() {
  discardTrigger = document.activeElement;
  discardTitle.textContent = I18N_IT.discardTitle(discard.length);
  discardGrid.replaceChildren();
  discardEmpty.hidden = discard.length > 0;
  discardGrid.hidden = discard.length === 0;
  for (let i = discard.length - 1; i >= 0; i--) {
    const data = discard[i];
    const item = el('button', 'ae-discard-item');
    item.type = 'button';
    const label = discard.length === 1 ? I18N_IT.onlyOne
      : i === discard.length - 1 ? I18N_IT.mostRecent : i === 0 ? I18N_IT.leastRecent : '';
    item.setAttribute('aria-label', [data.name, typeName(data), label].filter(Boolean).join(', '));
    item.append(cardArt(data, { thumb: true, lazy: discard.length - i > 12 }), el('span', 'ae-discard-label', label));
    item.addEventListener('click', () => openDiscardZoom(data));
    discardGrid.appendChild(item);
  }
  discardLayer.hidden = false;
  updateInert();
  discardClose.focus();
}

function closeDiscard() {
  if (discardLayer.hidden) return;
  discardLayer.hidden = true;
  discardGrid.replaceChildren();
  updateInert();
  restoreFocus(discardBtn);
}

// Carta degli scarti ingrandita: sola lettura, solo "Chiudi immagine"
function openDiscardZoom(data) {
  let close = () => {};
  const cancel = () => close();
  const dialog = dialogShell(I18N_IT.discardZoomTitle, data.name, cancel, { displayTitle: false });
  const art = cardArt(data);
  art.classList.add('ae-modal-art');
  const footer = el('div', 'ae-modal-footer');
  footer.appendChild(button(I18N_IT.closeImage, 'secondary', cancel));
  dialog.append(art, footer);
  close = openModal(dialog, { onCancel: cancel });
}

// --- 6. Pagina iniziale e nuova partita -----------------------------------------------------------------------------

function renderPlayers() {
  const container = document.getElementById('choices-players');
  container.replaceChildren(...startOptions.players.map(value => {
    const b = el('button', '', String(value));
    b.type = 'button';
    b.setAttribute('aria-pressed', String(value === settings.players));
    b.setAttribute('aria-label', I18N_IT.players(value));
    b.addEventListener('click', () => {
      settings.players = value;
      renderPlayers();
      container.querySelector('[aria-pressed="true"]').focus();
    });
    return b;
  }));
}

// Carta della nemesi scelta: chiusa di default. Sul pulsante della nemesi scelta c'è una freccia verso il basso che
// la apre subito sotto il pulsante; in cima alla carta una freccia verso l'alto la richiude.
let nemesisPreviewOpen = false;
const CHEVRON_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">'
  + '<path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function chevronButton(className, label, handler) {
  const b = el('button', 'nemesis-toggle ' + className);
  b.type = 'button';
  b.setAttribute('aria-label', label);
  b.setAttribute('aria-controls', 'nemesis-preview');
  b.innerHTML = CHEVRON_SVG;
  b.addEventListener('click', handler);
  return b;
}

function setNemesisPreview(open) {
  nemesisPreviewOpen = open;
  renderNemesisPreview();
  const target = open ? document.querySelector('#nemesis-preview .nemesis-collapse') : document.querySelector('.nemesis-item.is-selected .nemesis-expand');
  if (target) target.focus({ preventScroll: true });
  if (open) {
    const preview = document.getElementById('nemesis-preview');
    if (preview) preview.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function renderNemesisPreview() {
  const list = document.getElementById('nemesis-list');
  let preview = document.getElementById('nemesis-preview');
  if (!preview) {
    // index.html vecchio ancora in cache del browser: il riquadro si crea qui
    preview = el('figure', 'nemesis-preview');
    preview.id = 'nemesis-preview';
    const image = el('img');
    image.alt = '';
    image.decoding = 'async';
    preview.appendChild(image);
  }
  if (!preview.querySelector('.nemesis-collapse')) {
    preview.prepend(chevronButton('nemesis-collapse', I18N_IT.hideNemesisCard, () => setNemesisPreview(false)));
  }
  if (!preview.querySelector('.nemesis-flip')) buildNemesisFlip(preview);
  // La carta sta subito dopo il pulsante della nemesi scelta, su tutta la larghezza della lista
  const item = list.querySelector('.nemesis-item.is-selected');
  if (item) item.after(preview); else list.after(preview);

  const art = settings.nemesis && nemesisArt[settings.nemesis];
  const open = !!art && nemesisPreviewOpen;
  preview.hidden = !open;
  const expand = item && item.querySelector('.nemesis-expand');
  if (expand) {
    expand.hidden = open;
    expand.setAttribute('aria-expanded', String(open));
  }
  if (!open) {
    // Chiusa: la prossima volta si riapre dal fronte
    nemesisShowBack = false;
    nemesisFlipAngle = 0;
    const inner = preview.querySelector('.nemesis-flip-inner');
    inner.style.transition = 'none';
    inner.style.transform = '';
    preview.querySelector('.nemesis-flip').classList.remove('is-back');
    return;
  }
  const front = preview.querySelector('.nemesis-face--front');
  const back = preview.querySelector('.nemesis-face--back');
  front.alt = I18N_IT.nemesisCard(settings.nemesis);
  const src = encodeURI(art.card);
  if (front.getAttribute('src') !== src) front.src = src;
  // Retro (setup e storia), se c'è: si vede con uno slide sulla carta
  const flip = preview.querySelector('.nemesis-flip');
  flip.classList.toggle('has-back', !!art.back);
  if (art.back) {
    back.alt = I18N_IT.nemesisCardBack(settings.nemesis);
    const backSrc = encodeURI(art.back);
    if (back.getAttribute('src') !== backSrc) back.src = backSrc;
  } else {
    back.removeAttribute('src');
    nemesisShowBack = false;
    nemesisFlipAngle = 0;
    preview.querySelector('.nemesis-flip-inner').style.transform = '';
  }
  updateNemesisFlip(preview);
}

// Fronte e retro della carta nemesi aperta: uno slide orizzontale (destra o sinistra) la gira
let nemesisShowBack = false;
function buildNemesisFlip(preview) {
  const flip = el('div', 'nemesis-flip');
  const inner = el('div', 'nemesis-flip-inner');
  let front = preview.querySelector('img');
  if (!front) front = el('img');
  front.className = 'nemesis-face nemesis-face--front';
  front.decoding = 'async';
  const back = el('img', 'nemesis-face nemesis-face--back');
  back.alt = '';
  back.decoding = 'async';
  inner.append(front, back);
  flip.appendChild(inner);
  const dots = el('div', 'nemesis-flip-dots');
  dots.setAttribute('aria-hidden', 'true');
  dots.append(el('span'), el('span'));
  preview.append(flip, dots);

  // La carta ruota seguendo il dito (tutta la larghezza della carta = mezzo giro). Al rilascio: oltre
  // SWIPE_MIN_DISTANCE completa il mezzo giro nella direzione del dito, altrimenti torna com'era.
  let drag = null;
  const setAngle = (deg, animate) => {
    inner.style.transition = animate ? '' : 'none';
    inner.style.transform = `rotateY(${deg}deg)`;
  };
  flip.addEventListener('pointerdown', e => {
    if (!flip.classList.contains('has-back')) return;
    drag = { x: e.clientX, y: e.clientY, id: e.pointerId, dx: 0, active: false };
  });
  flip.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.active) {
      if (Math.abs(dx) < DRAG_THRESHOLD || Math.abs(dx) <= Math.abs(dy)) return;
      drag.active = true;
      try { flip.setPointerCapture(e.pointerId); } catch (_) {}
    }
    drag.dx = dx;
    const width = flip.offsetWidth || 300;
    setAngle(nemesisFlipAngle + Math.max(-180, Math.min(180, dx / width * 180)), false);
  });
  const endDrag = (e, cancelled) => {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    const { dx, active } = drag;
    drag = null;
    if (!active) {
      // Tocco senza trascinare: la carta ruota di mezzo giro
      if (cancelled) return;
      nemesisFlipAngle += 180;
      nemesisShowBack = !nemesisShowBack;
      setAngle(nemesisFlipAngle, true);
      updateNemesisFlip(preview);
      return;
    }
    if (!cancelled && Math.abs(dx) >= SWIPE_MIN_DISTANCE) {
      nemesisFlipAngle += dx > 0 ? 180 : -180;
      nemesisShowBack = !nemesisShowBack;
    }
    setAngle(nemesisFlipAngle, true);
    updateNemesisFlip(preview);
  };
  flip.addEventListener('pointerup', e => endDrag(e, false));
  flip.addEventListener('pointercancel', e => endDrag(e, true));
}
let nemesisFlipAngle = 0;

function updateNemesisFlip(preview) {
  const flip = preview.querySelector('.nemesis-flip');
  const showBack = nemesisShowBack && flip.classList.contains('has-back');
  flip.classList.toggle('is-back', showBack);
  preview.querySelector('.nemesis-face--front').setAttribute('aria-hidden', String(showBack));
  preview.querySelector('.nemesis-face--back').setAttribute('aria-hidden', String(!showBack));
  const dots = preview.querySelector('.nemesis-flip-dots');
  dots.hidden = !flip.classList.contains('has-back');
  dots.children[0].classList.toggle('is-on', !showBack);
  dots.children[1].classList.toggle('is-on', showBack);
}

// Nemesi della wave scelta: prima le disponibili (pulsanti), le altre in un elenco chiuso e non interattivo
function renderBosses(wave) {
  const list = document.getElementById('nemesis-list');
  // Prima le nemesi della scatola base della wave, poi quelle delle mini espansioni; in ognuno dei due gruppi per battaglia
  const byBattle = n => (n.battle === null || n.battle === undefined ? 99 : n.battle);
  const ofWave = nemeses.filter(n => n.wave === wave)
    .map((n, i) => ({ n, i }))
    .sort((a, b) => (!!a.n.miniExpansion - !!b.n.miniExpansion) || (byBattle(a.n) - byBattle(b.n)) || (a.i - b.i))
    .map(x => x.n);
  const playable = ofWave.filter(isPlayable);
  const others = ofWave.filter(n => !isPlayable(n));

  if (!playable.some(n => n.name === settings.nemesis)) settings.nemesis = playable.length ? playable[0].name : null;

  list.replaceChildren(...playable.map(info => {
    const b = el('button', 'nemesis-option');
    b.type = 'button';
    b.setAttribute('aria-pressed', String(info.name === settings.nemesis));
    const tags = el('span', 'nemesis-tags');
    tags.appendChild(el('span', '', info.battle ? I18N_IT.battle(info.battle) : I18N_IT.battleMissing));
    const art = nemesisArt[info.name];
    if (art) {
      // Parte dell'illustrazione a destra del pulsante (come nella wiki)
      b.classList.add('has-art');
      const portrait = el('span', 'nemesis-art');
      portrait.setAttribute('aria-hidden', 'true');
      portrait.style.backgroundImage = `url("${encodeURI(art.portrait)}")`;
      b.appendChild(portrait);
    }
    b.append(el('span', 'nemesis-name', info.name), tags);
    // Mini espansione: etichetta dorata piccola in basso a destra
    if (info.miniExpansion) b.appendChild(el('span', 'nemesis-expansion', info.miniExpansion));
    b.addEventListener('click', () => {
      // Toccare di nuovo la nemesi già scelta apre o chiude la sua carta (come le frecce)
      if (settings.nemesis === info.name) {
        if (art) {
          setNemesisPreview(!nemesisPreviewOpen);
          b.focus({ preventScroll: true });
        }
        return;
      }
      settings.nemesis = info.name;
      nemesisPreviewOpen = false;
      renderBosses(wave);
      const selected = list.querySelector('.nemesis-item.is-selected .nemesis-option');
      if (selected) selected.focus({ preventScroll: true });
    });
    const item = el('div', 'nemesis-item');
    item.appendChild(b);
    if (info.name === settings.nemesis) {
      item.classList.add('is-selected');
      // Freccia verso il basso al centro del pulsante scelto: apre la carta della nemesi
      if (art) item.appendChild(chevronButton('nemesis-expand', I18N_IT.showNemesisCard(info.name), () => setNemesisPreview(true)));
    }
    return item;
  }));
  renderNemesisPreview();
  document.getElementById('nemesis-empty').hidden = playable.length > 0;

  // Nemesi non disponibili: box piccoli con solo il nome, barrati da una X rossa sottile, non cliccabili.
  // Stanno subito sotto i pulsanti delle disponibili (il vecchio elenco a scomparsa non si usa più).
  const oldOther = document.getElementById('nemesis-other');
  if (oldOther) oldOther.hidden = true;
  let unavailable = document.getElementById('nemesis-unavailable');
  if (!unavailable) {
    unavailable = el('ul', 'nemesis-unavailable');
    unavailable.id = 'nemesis-unavailable';
    unavailable.setAttribute('aria-label', I18N_IT.unavailableNemeses);
    list.after(unavailable);
  }
  unavailable.hidden = others.length === 0;
  unavailable.replaceChildren(...others.map(info => {
    const li = el('li', 'nemesis-locked');
    li.setAttribute('aria-label', I18N_IT.unavailableNemesis(info.name));
    li.appendChild(el('span', '', info.name));
    return li;
  }));
  updateStartActions();
}

function renderStartChoices() {
  nemesisPreviewOpen = false;
  startOptions.waves = ownedWaves();
  ensureCollectionButton();
  renderPlayers();
  const waveSelect = document.getElementById('wave-select');
  const current = nemeses.find(n => n.name === settings.nemesis);
  waveSelect.replaceChildren(...startOptions.waves.map(wave => {
    const option = el('option', '', wave);
    option.value = wave;
    return option;
  }));
  waveSelect.value = current && startOptions.waves.includes(current.wave) ? current.wave : startOptions.waves[0];
  renderBosses(waveSelect.value);
  document.getElementById('upgraded-switch').checked = settings.includeUpgraded !== false;
}

// Pagina iniziale in due modi:
//   'choice': c'è una partita salvata, sotto il titolo c'è solo la finestra Riprendi partita / Nuova partita
//   'setup':  scelte della nuova partita (giocatori, nemesi, carte potenziate) e "Inizia partita"
let startMode = 'setup';

// Finestra sotto il titolo con la partita salvata (nemesi e giocatori) e le due scelte. Creata qui, così funziona
// anche con un index.html vecchio ancora in cache.
function startChoicePanel() {
  let panel = document.getElementById('start-choice');
  if (panel) return panel;
  panel = el('section', 'start-choice');
  panel.id = 'start-choice';
  panel.setAttribute('aria-labelledby', 'start-choice-title');
  const head = el('div', 'start-choice-head');
  const title = el('h2', 'start-choice-title', I18N_IT.savedGameTitle);
  title.id = 'start-choice-title';
  head.append(title, el('p', 'start-choice-info'));
  const resume = button(I18N_IT.resumeGame, 'primary', resumeGame);
  const fresh = button(I18N_IT.newGame, 'secondary', () => setStartMode('setup', true));
  resume.classList.add('ae-button--full', 'start-choice-resume');
  fresh.classList.add('ae-button--full');
  panel.append(head, resume, fresh);
  document.querySelector('.start-title').after(panel);
  return panel;
}

function setStartMode(mode, focus) {
  const saved = readSave();
  if (!saved) mode = 'setup';
  startMode = mode;
  const panel = startChoicePanel();
  panel.hidden = mode !== 'choice';
  panel.parentElement.classList.toggle('is-choosing', mode === 'choice');
  if (saved) {
    const head = panel.querySelector('.start-choice-head');
    head.querySelector('.start-choice-info').textContent =
      [saved.settings.nemesis, I18N_IT.players(saved.settings.players)].filter(Boolean).join(' · ');
    const old = head.querySelector('.nemesis-art');
    if (old) old.remove();
    const art = nemesisArt[saved.settings.nemesis];
    head.classList.toggle('has-art', !!art);
    if (art) {
      const portrait = el('span', 'nemesis-art');
      portrait.setAttribute('aria-hidden', 'true');
      portrait.style.backgroundImage = `url("${encodeURI(art.portrait)}")`;
      head.prepend(portrait);
    }
  }
  updateStartActions();
  if (focus) {
    const target = mode === 'choice' ? panel.querySelector('.start-choice-resume') : document.querySelector('#choices-players button');
    if (target) target.focus();
  }
}

// In 'setup' il pulsante principale è "Inizia partita"; se c'è una partita salvata, sotto resta "Riprendi partita"
function updateStartActions() {
  // Dopo "Nuova partita" non si offre più "Riprendi partita" (si riprende dalla finestra Partita in corso)
  resumeBtn.hidden = true;
  resumeBtn.className = 'ae-button ae-button--full ae-button--secondary start-resume-alt';
  startBtn.textContent = I18N_IT.startNew;
  startBtn.className = 'ae-button ae-button--full ae-button--primary';
  startBtn.disabled = !settings.nemesis || !battleOf(settings.nemesis);
  startBtn.title = startBtn.disabled ? I18N_IT.chooseNemesis : '';
}

// Wave nella scelta della nemesi: solo quelle della collezione (se nessuna, tutte)
function ownedWaves() {
  const all = [...new Set([...nemeses].sort((a, b) => a.waveOrder - b.waveOrder).map(n => n.wave))];
  const owned = all.filter(w => [...collection].some(id => id.startsWith(w + '|')));
  return owned.length ? owned : all;
}

function buildStartPage() {
  loadCollection();
  startOptions = { players: Object.keys(deckSetup.battles[0].players).map(Number), waves: ownedWaves() };
  const firstPlayable = nemeses.find(isPlayable);
  settings = { players: startOptions.players[0], nemesis: firstPlayable ? firstPlayable.name : null, includeUpgraded: true };
  renderStartChoices();
}

// Pulsante "La mia collezione" nella pagina iniziale (creato qui, così vale anche con un index.html vecchio)
function ensureCollectionButton() {
  let row = document.getElementById('collection-row');
  if (!row) {
    row = el('section', 'start-group start-collection');
    row.id = 'collection-row';
    const b = button(I18N_IT.myCollection, 'secondary', openCollection);
    b.classList.add('ae-button--full', 'collection-open');
    row.append(b, el('p', 'start-note collection-summary'));
    const players = document.getElementById('choices-players').closest('.start-group');
    players.before(row);
  }
  const waves = new Set([...collection].map(id => id.split('|')[0]));
  row.querySelector('.collection-summary').textContent = I18N_IT.collectionSummary(waves.size, collection.size);
}

// Schermata "La mia collezione": per ogni wave un interruttore (la wave, cioè la sua scatola base) e sotto le sue
// mini espansioni. Togliendo una wave si tolgono anche le sue mini espansioni. Le scelte valgono solo con
// "Salva collezione"; la X torna indietro senza salvare.
function openCollection() {
  const draft = new Set(collection);
  const layer = el('div', 'collection-screen');
  layer.setAttribute('role', 'dialog');
  layer.setAttribute('aria-modal', 'true');
  layer.setAttribute('aria-label', I18N_IT.myCollection);
  const head = el('div', 'collection-head');
  const close = () => { layer.remove(); updateInert(); document.querySelector('.collection-open').focus(); };
  const x = el('button', 'ae-icon-button');
  x.type = 'button';
  x.setAttribute('aria-label', I18N_IT.close);
  x.appendChild(icon('close'));
  x.addEventListener('click', close);
  head.append(el('h2', 'collection-title', I18N_IT.myCollection), x);
  const body = el('div', 'collection-body');
  body.appendChild(el('p', 'start-note', I18N_IT.collectionHint));

  const toggle = (label, id, extraClass) => {
    const row = el('label', 'ae-switch-row collection-item' + (extraClass ? ' ' + extraClass : ''));
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('role', 'switch');
    input.checked = draft.has(id);
    input.dataset.id = id;
    const sw = el('span', 'ae-switch');
    sw.setAttribute('aria-hidden', 'true');
    row.append(el('span', '', label), input, sw);
    return row;
  };
  collectionCatalog().forEach(({ wave, products }) => {
    const block = el('section', 'collection-wave');
    const base = products[0];
    const waveRow = toggle(wave, base.id, 'is-wave');
    const minis = products.slice(1).map(m => toggle(m.name, m.id, 'is-mini'));
    const sync = () => {
      const on = draft.has(base.id);
      minis.forEach(r => {
        const input = r.querySelector('input');
        input.disabled = !on;
        r.classList.toggle('is-disabled', !on);
      });
    };
    waveRow.querySelector('input').addEventListener('change', e => {
      if (e.target.checked) draft.add(base.id);
      else { draft.delete(base.id); products.slice(1).forEach(m => draft.delete(m.id)); minis.forEach(r => { r.querySelector('input').checked = false; }); }
      sync();
    });
    minis.forEach(r => r.querySelector('input').addEventListener('change', e => {
      if (e.target.checked) draft.add(e.target.dataset.id); else draft.delete(e.target.dataset.id);
    }));
    block.append(waveRow, ...minis);
    sync();
    body.appendChild(block);
  });
  const footer = el('div', 'collection-footer');
  const saveBtn = button(I18N_IT.collectionSave, 'primary', () => {
    collection = draft;
    saveCollection();
    close();
    renderStartChoices();
    showToast(I18N_IT.collectionSaved);
  });
  saveBtn.classList.add('ae-button--full');
  footer.appendChild(saveBtn);
  layer.append(head, body, footer);
  layer.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } });
  document.body.appendChild(layer);
  startLayer.inert = true;
  x.focus();
}

function showStartSkeleton() {
  document.getElementById('nemesis-list').replaceChildren(...[0, 1, 2, 3].map(() => el('div', 'nemesis-skeleton')));
}

function openStart() {
  closeAllModals();
  closeDiscard();
  renderStartChoices();
  startLayer.hidden = false;
  updateInert();
  setStartMode(readSave() ? 'choice' : 'setup', true);
}

function closeStart() {
  startLayer.hidden = true;
  updateInert();
}

// Inizia partita: la scelta "Nuova partita" nella finestra sotto il titolo vale già come conferma di sostituire
// la partita salvata, quindi qui non si chiede altro
function onStartClick() {
  startGame();
}

// Inizia: nuova partita con le scelte fatte (la partita salvata viene sostituita)
function startGame() {
  if (!battleOf(settings.nemesis)) return;
  clearTransition();
  closeAllModals();
  queue = [];
  resolving = false;
  currentIndex = 0;
  newIndex = -1;
  ui.viewedUid = null;
  ui.reveal = null;
  ui.lastDrawnUid = null;
  ui.drafts.clear();
  ui.flyingDiscards = 0;
  undoStack = [];
  newGame();
  render();
  save();
  slideToGame(() => nemesisBtn.focus());
}

// Riprendi partita: si ricarica lo stato salvato nel browser, compreso l'undo
function resumeGame() {
  const saved = readSave();
  if (!saved) return;
  try {
    const previousSettings = settings;
    settings = saved.settings;
    try {
      restore(saved.state);
    } catch (err) {
      settings = previousSettings;
      throw err;
    }
    undoStack = Array.isArray(saved.undo) ? saved.undo : [];
    startError.hidden = true;
    closeStart();
    render();
    (resolving ? resolveBtn : nemesisBtn).focus();
  } catch (err) {
    console.error(err);
    showStartError(I18N_IT.resumeError, false);
  }
}

function showStartError(text, withRetry) {
  startError.hidden = false;
  startErrorText.textContent = text;
  retryBtn.hidden = !withRetry;
}

// --- 7. Stato della partita: fotografia, ripristino, salvataggio, undo ---------------------------------------------

// Fotografia della partita (solo dati semplici, stesso formato della v48, così si può salvare nel browser)
function snapshot() {
  return {
    turn,
    deck: deck.map(c => c.id),
    discard: discard.map(c => c.id),
    queue: queue.map(e => ({ id: e.data.id, tokens: e.tokens, hp: e.hp, turnHp: e.turnHp, isNew: !!e.isNew, paid: !!e.paid })),
    resolving,
    currentIndex,
    newIndex,
    // In più rispetto alla v48 (i salvataggi senza questo campo restano validi)
    maxTierDrawn
  };
}

// Rimette la partita come nella fotografia (senza animazioni; quelle in corso si fermano)
function restore(s) {
  const get = id => {
    const card = cardsById.get(id);
    if (!card) throw new Error('Carta sconosciuta: ' + id);
    return card;
  };
  // Prima si leggono tutti i dati: se qualcosa non va, la partita in corso resta com'è
  const newDeck = s.deck.map(get);
  const newDiscard = s.discard.map(get);
  const newQueue = s.queue.map(q => Object.assign(makeEntry(get(q.id)), { tokens: q.tokens, hp: q.hp, turnHp: q.turnHp === undefined ? q.hp : q.turnHp, isNew: !!q.isNew, paid: !!q.paid }));

  clearTransition();
  ui.drafts.clear();
  ui.flyingDiscards = 0;
  closeAllModals();
  closeDiscard();
  ui.reveal = null;
  deck = newDeck;
  discard = newDiscard;
  turn = s.turn;
  queue = newQueue;
  // Salvataggi senza il campo: il tier più alto tra le carte già uscite (coda e scarti)
  maxTierDrawn = typeof s.maxTierDrawn === 'number' ? s.maxTierDrawn
    : Math.max(0, ...queue.map(e => e.data.tier || 0), ...discard.map(c => c.tier || 0));

  if (s.resolving && queue.length > 0) {
    resolving = true;
    currentIndex = Math.max(0, Math.min(s.currentIndex, queue.length - 1));
    newIndex = s.newIndex >= 0 ? Math.min(s.newIndex, queue.length - 1) : -1;
    // Dopo un undo le carte hanno uid nuovi: la carta appena pescata è quella in newIndex
    if (newIndex >= 0) ui.lastDrawnUid = queue[newIndex].uid;
    ui.viewedUid = queue[currentIndex].uid;
  } else {
    resolving = false;
    currentIndex = 0;
    newIndex = -1;
    ui.viewedUid = null;
    // Si mostra la carta più recente
    if (queue.length) ui.queueAnchor = { uid: queue[queue.length - 1].uid, align: queue.length === 1 ? 'center' : 'anchor' };
  }
}

function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ settings, state: snapshot(), undo: undoStack }));
  } catch (err) {
    console.warn('Salvataggio non riuscito', err);
  }
}

function readSave() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (saved && saved.state && saved.settings && Array.isArray(saved.state.queue)) return saved;
  } catch (err) {
    console.warn('Salvataggio illeggibile', err);
  }
  return null;
}

function updateUndoBtn() {
  undoBtn.disabled = undoStack.length === 0 && ui.drafts.size === 0;
}

// Aggiunge un passo di undo (lo stato prima di un'azione), tenendone al massimo UNDO_LIMIT
function pushUndo(state) {
  undoStack.push(state);
  if (undoStack.length > UNDO_LIMIT) undoStack.shift();
}

// Ogni azione che cambia la partita: prima si salva lo stato per l'undo, poi si fa l'azione, poi si salva la partita
function act(action) {
  pushUndo(snapshot());
  const result = action();
  save();
  return result;
}

// Undo: torna allo stato prima dell'ultima azione (si può ripetere fino all'inizio della partita)
function undo() {
  // Modifiche non salvate sulle carte (turno giocatori): il primo Annulla le scarta, poi si torna ai salvataggi precedenti
  if (ui.drafts.size) {
    ui.drafts.clear();
    render();
    showToast(I18N_IT.draftDiscarded);
    return;
  }
  const previous = undoStack.pop();
  if (!previous) return;
  restore(previous);
  render();
  save();
  showToast(I18N_IT.undone);
}

// Ferma le animazioni in corso dopo un'azione (undo, nuova partita, riprendi)
function clearTransition() {
  clearTimeout(ui.transitionTimer);
  ui.transitionTimer = null;
  ui.isTransitioning = false;
  ui.holdUid = null;
}

// Blocca il pulsante principale per ms millisecondi, poi esegue then
function lockFor(ms, then) {
  clearTimeout(ui.transitionTimer);
  ui.isTransitioning = true;
  ui.transitionTimer = setTimeout(() => {
    ui.transitionTimer = null;
    ui.isTransitioning = false;
    if (then) then();
    render();
  }, ms);
}

// --- 8. VistaRisoluzione (turno nemesi) ---------------------------------------------------------------------------

// Scritta "Tier N" al centro, marcata: entra ingrandendosi con un bagliore dorato, resta, poi svanisce (2,2 s). App oscurata
// e non si può toccare; dopo si continua normalmente.
const TIER_BANNER_MS = 1760;
function showTierBanner(tier) {
  const banner = el('div', 'ae-tier-banner');
  banner.setAttribute('role', 'status');
  banner.appendChild(el('span', 'ae-tier-banner-text', 'Tier ' + tier));
  document.body.appendChild(banner);
  setTimeout(() => banner.remove(), TIER_BANNER_MS);
}

// Disegna tutto in base allo stato
function render() {
  // Nel turno nemesi l'intestazione ha sempre il numero del turno
  // Tra Undo e Menu: il nome della nemesi della partita, in entrambi i turni
  // e sotto "Turno N" con il numero del turno nemesi (nascosto prima del primo turno nemesi)
  // A sinistra di "Turno N" l'icona del numero di giocatori (Assets/ui/icons/players-1..4.png, usata come maschera)
  const turnLine = el('span', 'ae-phase-turn');
  const players = Math.max(1, Math.min(4, Number(settings.players) || 1));
  const playersIcon = el('span', 'ae-players-icon');
  playersIcon.style.setProperty('--ae-players-icon', `url('Assets/ui/icons/players-${players}.png')`);
  playersIcon.setAttribute('role', 'img');
  playersIcon.setAttribute('aria-label', I18N_IT.players(players));
  const turnText = el('span', '', I18N_IT.turnN(turn));
  turnText.hidden = turn < 1;
  turnLine.append(playersIcon, turnText);
  phaseLabel.replaceChildren(el('span', 'ae-phase-name', settings.nemesis || ''), turnLine);
  queueView.hidden = resolving;
  // la classe si toglie solo a vista nascosta (toglierla a vista visibile farebbe ripartire la dissolvenza)
  if (resolving) queueView.classList.remove('is-from-nemesis');
  resolveView.hidden = !resolving;
  app.classList.toggle('is-nemesis-turn', resolving);
  if (!resolving) app.classList.remove('is-draw-phase');
  nemesisBtn.hidden = resolving;
  nemesisBtn.disabled = !deckSetup;
  // "Turno Nemesi" con l'illustrazione della nemesi della partita (come nel menu iniziale), velata per leggere la scritta
  const nemesisArtNow = settings.nemesis && nemesisArt[settings.nemesis];
  nemesisBtn.classList.toggle('has-nemesis-art', !!nemesisArtNow);
  if (nemesisArtNow) nemesisBtn.style.setProperty('--ae-nemesis-art', `url("${encodeURI(nemesisArtNow.portrait)}")`);
  else nemesisBtn.style.removeProperty('--ae-nemesis-art');
  nemesisBtn.setAttribute('aria-disabled', String(ui.isTransitioning));
  // Turno giocatori con modifiche non salvate: il pulsante principale le salva
  const saving = !resolving && ui.drafts.size > 0;
  nemesisBtn.textContent = saving ? I18N_IT.saveChanges : I18N_IT.nemesisButton;
  nemesisBtn.classList.toggle('is-save', saving);
  updateInfo();
  renderDockPiles();
  updateUndoBtn();
  if (ui.tierBanner) {
    ui.tierWaitUntil = performance.now() + TIER_BANNER_MS;
    showTierBanner(ui.tierBanner);
    ui.tierBanner = null;
  }
  if (resolving) renderResolve();
  else {
    resolveBtn.hidden = true;
    backBtn.hidden = true;
    resolveHint.hidden = true;
    renderQueue();
  }
  checkVictory();
}

function activeEntry() {
  return queue[currentIndex] || null;
}

// Passo "da pescare": tutte le carte in gioco sono state risolte; si vede la prossima carta del mazzo coperta e il
// pulsante "Pesca". Si pesca solo quando il giocatore lo tocca (la carta poi si gira).
const DRAW_UID = -1;
function isDrawStep() {
  return resolving && newIndex < 0 && currentIndex >= queue.length;
}
function canDraw() {
  return deck.length > 0;
}

// Testo del pulsante per la carta da risolvere (tabella §7.3). Anche sull'ultima carta si va solo avanti: la pesca è
// un passo a parte, con il pulsante "Pesca".
function actionText(entry, isNew) {
  const { data, tokens } = entry;
  if (isNew) return data.type === 'Attack' ? I18N_IT.ctaDiscardNext : I18N_IT.ctaPutInPlay;
  // Potere: il token se ne va da solo (dopo 1 secondo); il pulsante dice solo cosa succede dopo
  if (data.type === 'Power') return tokens > 1 ? I18N_IT.ctaPowerNext : I18N_IT.ctaPowerLast;
  if (data.type === 'Minion') return I18N_IT.ctaMinionNext;
  return I18N_IT.ctaDiscardNext;
}

// BannerInfoNemesi tolto (recuperabile dai tag v104-banner-info-nemesi e dal commit 38279cf).
function renderResolveInfo(drawStep) {
  const oldBar = document.getElementById('resolve-info');
  if (oldBar) oldBar.remove();
  // La fascia va in una riga con i due box ai lati (creata qui una volta sola)
  let row = rail.parentElement;
  if (!row.classList.contains('ae-rail-row')) {
    row = el('div', 'ae-rail-row');
    rail.before(row);
    row.appendChild(rail);
  }
  // Niente box mazzo e scarti in alto (restano nel Menu): si tolgono anche da una vecchia pagina
  row.querySelectorAll(':scope > .ae-pile').forEach(p => p.remove());
  resolveView.classList.toggle('is-draw-phase', drawStep);
  // Lo sfondo della vista è sull'app intera (anche dietro al pulsante principale)
  app.classList.toggle('is-draw-phase', drawStep);
}
function renderResolve() {
  const drawStep = isDrawStep();
  renderResolveInfo(drawStep);
  const active = activeEntry();
  if (!active && !drawStep) return;
  const isNewStep = newIndex >= 0;
  const viewedUid = ui.holdUid || ui.viewedUid;
  // Nel passo da pescare la carta "da risolvere" è la carta coperta (DRAW_UID)
  const viewed = (viewedUid === DRAW_UID && drawStep) ? null : (entryByUid(viewedUid) || active);
  const viewingDraw = drawStep && !viewed;
  if (!ui.holdUid) ui.viewedUid = viewingDraw ? DRAW_UID : viewed.uid;
  const previewing = !ui.holdUid && (drawStep ? !viewingDraw : viewed !== active);

  // Fascia compatta: rosso = da risolvere, avorio = mostrata
  const railScroll = rail.scrollLeft;
  const railScrollTop = rail.scrollTop;
  const railItems = queue.map((entry, i) => queueItem(entry, {
    compact: true, index: i, total: queue.length, current: entry === active, viewed: entry === viewed
  }));
  // Potere da risolvere: anche nella fascia il token lampeggia e diventa grigio insieme a quello della carta grande.
  // La fascia si ridisegna spesso: l'animazione riparte dal punto giusto (ritardo negativo) o il token resta nascosto.
  if (newIndex < 0 && active && active.data.type === 'Power') {
    const key = turn + ':' + currentIndex + ':' + active.uid + ':' + active.tokens;
    // Prima carta del turno: l'animazione parte quando lo sfondo ha finito di scorrere (ui.bgSlideUntil)
    if (ui.autoTokenKey !== key) { ui.autoTokenKey = key; ui.autoTokenAt = Math.max(performance.now(), ui.bgSlideUntil || 0); }
    const badge = railItems[currentIndex] && railItems[currentIndex].querySelector('.ae-status-badge');
    if (badge) {
      badge.classList.add('is-auto-token');
      badge.style.setProperty('--ae-token-delay', (ui.autoTokenAt - performance.now()) + 'ms');
    }
  }
  // In fondo alla fascia, finché non si pesca: la prossima carta del mazzo, coperta (retro) con NUOVA
  // Il dorso compare nella fascia solo al passo Pesca (non dall'inizio del turno nemesi)
  if (drawStep && canDraw()) railItems.push(nextCardItem({ current: drawStep, viewed: viewingDraw }));
  rail.replaceChildren(...railItems);
  rail.scrollLeft = railScroll;
  rail.scrollTop = railScrollTop;
  const viewedItem = rail.querySelector(`[data-uid="${ui.viewedUid}"]`);
  if (viewedItem) scrollItemInto(rail, viewedItem, 'nearest');

  renderFocus(viewingDraw ? { uid: DRAW_UID } : viewed);

  // Dock: in anteprima al posto dell'azione c'è "Torna alla carta da risolvere"
  const text = drawStep ? I18N_IT.ctaDraw : actionText(active, isNewStep);
  backBtn.textContent = drawStep ? I18N_IT.backToDraw : I18N_IT.backToActive;
  resolveBtn.hidden = previewing;
  backBtn.hidden = !previewing;
  resolveBtn.textContent = text;
  // Fase di pesca: pulsante dorato, diverso da quelli della risoluzione
  resolveBtn.classList.toggle('is-draw', drawStep);
  // Durante l'animazione il pulsante resta focalizzabile ma non accetta tocchi (aria-disabled, controllato in onResolveClick)
  resolveBtn.setAttribute('aria-disabled', String(ui.isTransitioning));
  // Niente suggerimento sopra il pulsante: lo spazio resta alla carta
  resolveHint.hidden = true;
  // Ridimensiona di nuovo ora che il pulsante in basso è visibile: alla prima carta del turno nemesi il pulsante
  // compariva solo dopo il primo calcolo, quindi la carta era misurata su uno spazio più alto e usciva in basso
  sizeFocus(!ui.fromScroll);
}

// Carta in primo piano: solo immagine (o retro durante la pesca) e stato numerico. Nessuna etichetta, nome o tipo
// (nemmeno in anteprima): tutto lo spazio va alla carta.
// Riga sopra la carta grande del turno nemesi: goccia + vita (minion) o un token per ogni token (potere); vuota per gli attacchi
function focusStatus(entry) {
  const status = el('p', 'ae-focus-status');
  if (hasHp(entry)) {
    status.classList.add('is-hp');
    // Minion appena pescato: solo il valore della vita (senza /totale)
    status.append(icon('heart'), el('span', '', entry.isNew ? String(entry.hp) : I18N_IT.hp(entry.hp, entry.data.hp)));
  } else if (entry.data.type === 'Power') {
    status.classList.add('is-token');
    status.appendChild(tokenIcons(entry.tokens));
  }
  status.setAttribute('aria-label', statusText(entry));
  return status;
}

// Carosello del turno nemesi: tutte le carte della coda in fila in un contenitore che scorre da solo (scroll-snap).
// La carta mostrata è quella al centro; ai lati si vede un pezzo della precedente e della successiva. Lo slide è lo
// scorrimento nativo del browser; quando si ferma su un'altra carta, quella diventa la carta mostrata.
// Le carte si ridisegnano solo quando cambia qualcosa (coda, vita, token, pesca); altrimenti il carosello scorre e basta.
const PEEK_VISIBLE = 14;   // px visibili di ogni carta vicina (erano 22: carte più grandi)
const PEEK_GAP = 12;       // spazio tra le carte
let focusTrack = null;
let focusSignature = '';
let focusProgrammaticUntil = 0;   // fino a quando lo scorrimento è quello avviato dallo script (non dal dito)

function focusSlide(entry) {
  const slide = el('div', 'ae-focus-slide');
  slide.dataset.uid = entry.uid;
  const reveal = ui.reveal && ui.reveal.uid === entry.uid ? ui.reveal : null;
  const stage = el('div', 'ae-focus-stage');
  if (reveal && reveal.status !== 'done') {
    stage.appendChild(flipCard(entry, reveal));
  } else {
    stage.appendChild(cardArt(entry.data, { sync: true }));
  }
  if (entry.isNew) {
    // Carta appena pescata: glow dorato attorno (come nella versione 1) ed etichetta NUOVA
    stage.classList.add('is-new');
    const tag = el('span', 'ae-new-tag', I18N_IT.newTag);
    tag.setAttribute('aria-hidden', 'true');
    stage.appendChild(tag);
  }
  // Stato sopra la carta: la riga c'è sempre, anche vuota (attacchi), così ogni carta ha la stessa dimensione
  const status = focusStatus(entry);
  if (ui.holdUid === entry.uid) status.classList.add('is-dropping', 'is-bumped');
  // Potere da risolvere: dopo 1 secondo un token sfuma da solo (il pulsante poi va solo avanti o scarta)
  if (newIndex < 0 && entry === queue[currentIndex] && entry.data.type === 'Power') {
    status.classList.add('is-auto-token');
    // stesso istante della fascia (dopo lo scorrimento dello sfondo, se è la prima carta del turno)
    status.style.setProperty('--ae-token-delay', ((ui.autoTokenAt || 0) - performance.now()) + 'ms');
  }
  // Carta appena pescata: durante il caricamento la riga è nascosta; mentre si gira, i token o la vita compaiono dopo
  // la rotazione. Un attacco pescato lampeggia di rosso.
  if (reveal && reveal.status === 'loading') slide.classList.add('is-draw-loading');
  if (reveal && (reveal.status === 'ready' || reveal.status === 'flipping')) slide.classList.add('is-drawing');
  if (entry.isNew && newIndex >= 0 && entry.data.type === 'Attack' && !(reveal && reveal.status === 'loading')) stage.classList.add('is-attack-drawn');
  slide.append(status, stage);
  return slide;
}

// Carta da pescare: il retro, con NUOVA; si gira dopo il tocco su "Pesca"
function drawSlide() {
  const slide = el('div', 'ae-focus-slide ae-focus-slide--draw');
  slide.dataset.uid = DRAW_UID;
  const stage = el('div', 'ae-focus-stage is-new');
  // Toccando il retro la carta si pesca (come il pulsante "Pesca")
  stage.setAttribute('role', 'button');
  stage.tabIndex = 0;
  stage.setAttribute('aria-label', I18N_IT.ctaDraw);
  const art = el('div', 'ae-card-art ae-card-back');
  const img = document.createElement('img');
  img.alt = I18N_IT.nextCard;
  img.src = CARD_BACK;
  art.appendChild(img);
  const tag = el('span', 'ae-new-tag', I18N_IT.newTag);
  tag.setAttribute('aria-hidden', 'true');
  stage.append(art, tag);
  slide.append(el('p', 'ae-focus-status'), stage);
  return slide;
}

function focusStateSignature() {
  return (isDrawStep() || newIndex >= 0 ? 'solo' + newIndex + ':' + ui.viewedUid + '|' : '') + 'c' + currentIndex + '|' + queue.map(e => [e.uid, e.hp, e.tokens, e.isNew ? 1 : 0].join(':')).join('|')
    + '#' + (ui.reveal ? ui.reveal.uid + ':' + ui.reveal.status : '') + '#' + (ui.holdUid || '');
}

function renderFocus(viewed) {
  if (!focusTrack || !focusTrack.isConnected) {
    focusTrack = el('div', 'ae-focus-track');
    focusEl.replaceChildren(focusTrack);
    focusSignature = '';
  }
  // Token e vita della carta pescata compaiono dopo il banner Tier (se c'è)
  focusEl.style.setProperty('--ae-tier-wait', Math.max(0, Math.round(ui.tierWaitUntil - performance.now())) + 'ms');
  const prevUid = focusEl.dataset.uid;
  const viewedChanged = prevUid !== String(viewed.uid);
  focusEl.dataset.uid = viewed.uid;
  if (focusStateSignature() !== focusSignature || !focusTrack.children.length) {
    // Passo Pesca: si vede solo la carta da girare (le carte già risolte a sinistra spariscono); se si guarda un'altra
    // carta dalla fascia, c'è solo quella accanto
    let slides;
    // Anche dopo la pesca si vede solo la carta pescata. La carta da pescare e quella pescata sono un po' più grandi.
    if (isDrawStep() || newIndex >= 0) {
      const drawn = newIndex >= 0 ? queue[newIndex] : null;
      const mainUid = drawn ? drawn.uid : DRAW_UID;
      const other = viewed.uid !== mainUid ? entryByUid(viewed.uid) : null;
      const main = drawn ? focusSlide(drawn) : drawSlide();
      main.classList.add('is-big');
      slides = [...(other ? [focusSlide(other)] : []), main];
    } else {
      slides = queue.map(focusSlide);
    }
    focusTrack.replaceChildren(...slides);
    // La firma si calcola dopo: disegnare la carta pescata può far avanzare il suo stato (pronta → si gira)
    focusSignature = focusStateSignature();
    sizeFocus(false);
    const prevStill = prevUid && focusTrack.querySelector(`.ae-focus-slide[data-uid="${prevUid}"]`);
    if (viewedChanged && prevStill) {
      // Si passa a una carta che c'era già (minion che resta, token tolto): il carosello scorre fino a lei
      scrollFocusTo(prevUid, false);
      scrollFocusTo(viewed.uid, true);
    } else {
      scrollFocusTo(viewed.uid, false);
      // La carta mostrata prima è sparita (risolta, negli scarti): la nuova entra con una breve animazione
      if (viewedChanged && prevUid) {
        const slide = focusTrack.querySelector(`.ae-focus-slide[data-uid="${viewed.uid}"]`);
        if (slide && !(ui.reveal && ui.reveal.uid === viewed.uid)) slide.classList.add('is-entering');
      }
    }
  } else if (!ui.fromScroll) {
    // Stesse carte: si porta al centro la carta mostrata (tocco sulla fascia, "Torna alla carta da risolvere", ...)
    scrollFocusTo(viewed.uid, viewedChanged);
  }
}

function scrollFocusTo(uid, smooth) {
  const slide = focusTrack && focusTrack.querySelector(`.ae-focus-slide[data-uid="${uid}"]`);
  if (!slide) return;
  const left = slide.offsetLeft + slide.offsetWidth / 2 - focusEl.clientWidth / 2;
  if (Math.abs(focusEl.scrollLeft - left) < 1) return;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (smooth && !reduce) {
    focusProgrammaticUntil = performance.now() + 600;
    focusEl.scrollTo({ left, behavior: 'smooth' });
  } else {
    focusEl.scrollLeft = left;
  }
}

function centredFocusUid() {
  if (!focusTrack) return null;
  const middle = focusEl.scrollLeft + focusEl.clientWidth / 2;
  let best = null;
  let bestDist = Infinity;
  for (const slide of focusTrack.children) {
    const d = Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - middle);
    if (d < bestDist) { bestDist = d; best = Number(slide.dataset.uid); }
  }
  return best;
}

// Il dito ha portato al centro un'altra carta: diventa la carta mostrata (fascia e pulsante si aggiornano)
let focusScrollFrame = 0;
focusEl.addEventListener('scroll', () => {
  if (focusScrollFrame) return;
  // circa un controllo per fotogramma (setTimeout invece di requestAnimationFrame: funziona anche a pagina in background)
  focusScrollFrame = setTimeout(() => {
    focusScrollFrame = 0;
    if (!resolving || ui.holdUid || ui.isTransitioning || performance.now() < focusProgrammaticUntil) return;
    const uid = centredFocusUid();
    if (uid === null || uid === ui.viewedUid) return;
    ui.viewedUid = uid;
    ui.fromScroll = true;
    renderResolve();
    ui.fromScroll = false;
  }, 16);
}, { passive: true });

// Larghezza della carta grande: UNA sola regola per turno giocatori e turno nemesi, così sono sempre uguali.
// Sopra la carta il box vita/token (41px + 8 di spazio); i comandi del turno giocatori (52px) stanno sotto, quindi si
// riserva lo spazio anche nel turno nemesi; il blocco è centrato in verticale.
function sharedCardWidth(boxW, boxH, padY, peekRoom) {
  const byWidth = boxW - 16 - peekRoom; // 8px di margine per lato (erano 16)
  const byHeight = (boxH - padY - 41 - 8) / CARD_RATIO;
  const byControls = (boxH - 2 * 52 - 41 - 8) / CARD_RATIO;
  return Math.floor(Math.min(byWidth, byHeight, byControls));
}

// Dimensiona le carte del carosello: alte quanto lo spazio, ma più strette dell'area quanto basta per vedere un pezzo
// delle vicine. Il margine ai lati permette di centrare anche la prima e l'ultima carta.
function sizeFocus(recentre = true) {
  if (resolveView.hidden || !focusTrack) return;
  const slide = focusTrack.querySelector('.ae-focus-slide');
  if (!slide) return;
  const style = getComputedStyle(focusEl);
  const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  const peekRoom = queue.length > 1 ? 2 * (PEEK_VISIBLE + PEEK_GAP) : 0;
  const width = Math.max(40, sharedCardWidth(focusEl.clientWidth, focusEl.clientHeight, padY, peekRoom));
  focusEl.style.setProperty('--ae-focus-w', width + 'px');
  focusEl.style.setProperty('--cw', width + 'px');
  focusTrack.style.paddingInline = Math.max(0, (focusEl.clientWidth - width) / 2) + 'px';
  // Carta da pescare e carta pescata: più grandi (fino al 15%) quanto lo spazio sotto la carta permette, senza
  // toccare il pulsante e senza uscire dallo schermo in larghezza (crescono verso il basso: transform-origin in alto)
  const cardH = width * CARD_RATIO;
  const freeBelow = (focusEl.clientHeight - padY - (41 + 8 + cardH)) / 2 + parseFloat(style.paddingBottom) - 4;
  const big = Math.max(1, Math.min(1.15, 1 + freeBelow / cardH, (focusEl.clientWidth - 8) / width));
  focusEl.style.setProperty('--ae-big-scale', big.toFixed(3));
  if (recentre && focusEl.dataset.uid) scrollFocusTo(focusEl.dataset.uid, false);
}

// Carta pescata: retro (con "Caricamento carta…") finché l'immagine non è pronta, poi si gira in 350ms.
// Se l'immagine non arriva: segnaposto con nome e tipo e "Riprova immagine"; il gioco può proseguire comunque.
function flipCard(entry, reveal) {
  const flip = el('div', 'ae-flip');
  const inner = el('div', 'ae-flip-inner');
  const back = el('div', 'ae-flip-face ae-flip-face--back');
  const backImg = document.createElement('img');
  backImg.alt = '';
  backImg.src = CARD_BACK;
  back.appendChild(backImg);
  const front = el('div', 'ae-flip-face ae-flip-face--front');
  inner.append(back, front);
  flip.appendChild(inner);

  if (reveal.status === 'error') {
    flip.classList.add('is-flipped');
    const holder = el('div', 'ae-flip-error');
    holder.appendChild(placeholderArt(entry.data));
    front.appendChild(holder.firstChild);
    const retry = button(I18N_IT.retryImage, 'secondary', () => {
      reveal.status = 'loading';
      startReveal(entry);
    });
    retry.classList.add('ae-flip-loading');
    retry.style.minHeight = '44px';
    flip.appendChild(retry);
    return flip;
  }

  front.appendChild(cardArt(entry.data, { sync: true }));
  if (reveal.status === 'loading') {
    flip.appendChild(el('p', 'ae-hint ae-flip-loading', I18N_IT.loadingCard));
  } else if (reveal.status === 'ready') {
    // Immagine pronta: si gira subito dopo essere stata disegnata; finita la rotazione resta la carta normale
    setTimeout(() => flip.classList.add('is-flipped'), 30);
    reveal.status = 'flipping';
    setTimeout(() => { if (reveal.status === 'flipping') reveal.status = 'done'; }, DRAW_MS + 50);
  } else if (reveal.status === 'flipping') {
    // Ridisegnata durante la rotazione: già girata, senza ripartire
    flip.classList.add('is-flipped');
  }
  return flip;
}

// Avvia il caricamento dell'immagine della carta pescata; alla fine la carta si gira (se è ancora quella mostrata)
function startReveal(entry) {
  ui.reveal = { uid: entry.uid, status: 'loading' };
  const reveal = ui.reveal;
  loadImage(encodeURI(entry.data.image)).then(ok => {
    if (ui.reveal !== reveal) return;
    reveal.status = ok ? 'ready' : 'error';
    if (resolving) renderResolve();
  });
}

// Scarica in anticipo le immagini che serviranno: prossima carta del mazzo e carta dopo quella da risolvere
function preloadNext() {
  const next = deck[deck.length - 1];
  if (next) loadImage(encodeURI(next.image));
  const after = queue[currentIndex + 1];
  if (after) loadImage(encodeURI(after.data.image));
}

function startResolution() {
  // Un nuovo turno: la carta pescata nel turno precedente non è più "nuova"
  queue.forEach(e => { e.isNew = false; });
  currentIndex = 0;
  newIndex = -1;
  resolving = true;
  // Coda vuota: si va subito alla carta da pescare (o, se non c'è niente da pescare, il turno finisce)
  if (queue.length === 0 && !canDraw()) endResolution();
}

// Pesca una carta in fondo alla coda e la mostra come nuova (NUOVA, entra girandosi dal retro)
function drawNewCard() {
  const data = drawFromDeck();
  // Niente da pescare (mazzo e scarti vuoti): si torna alla VistaCoda
  if (!data) {
    endResolution();
    return;
  }
  const entry = makeEntry(data);
  entry.isNew = true;
  queue.push(entry);
  newIndex = queue.length - 1;
  currentIndex = newIndex;
  ui.lastDrawnUid = entry.uid;
  // Prima carta del Tier 2 o del Tier 3: scritta "Tier N" al centro (mostrata da render)
  if (data.tier >= 2 && data.tier > maxTierDrawn) ui.tierBanner = data.tier;
  if (data.tier > maxTierDrawn) maxTierDrawn = data.tier;
}

// Ritorno alla VistaCoda
function endResolution() {
  newIndex = -1;
  resolving = false;
  currentIndex = 0;
}

function nemesisTurn() {
  turn++;
  // Finisce il turno dei giocatori: danno e cura del turno si azzerano (la vita attuale diventa il riferimento)
  queue.forEach(e => { e.turnHp = e.hp; });
  // Poteri con il costo pagato: vanno negli scarti; le modifiche non salvate si perdono
  ui.drafts.clear();
  queue.filter(isGone).forEach(discardEntry);
  startResolution();
}

// Logica del pulsante principale (come nella v48): agisce sulla carta da risolvere in base al suo tipo.
// Restituisce cosa è successo, per l'animazione: 'token', 'discard', 'next', 'play'.
function resolveCurrent() {
  const entry = queue[currentIndex];
  const { data, tokens } = entry;

  // Carta appena pescata: un attacco si risolve subito ed esce dalla coda, le altre restano e smettono di essere nuove.
  // Poi ritorno alla VistaCoda.
  if (newIndex >= 0) {
    let effect;
    if (data.type === 'Attack') {
      discardEntry(entry);
      effect = 'discard';
    } else {
      entry.isNew = false;
      effect = 'play';
    }
    endResolution();
    return effect;
  }

  let effect;
  if (data.type === 'Power' && tokens > 1) {
    // Potere: si toglie un token e si passa alla carta dopo
    entry.tokens--;
    currentIndex++;
    effect = 'token';
  } else if (data.type === 'Minion') {
    // Minion: resta in coda, si va avanti
    currentIndex++;
    effect = 'next';
  } else {
    // Potere all'ultimo token o attacco: risolto, va negli scarti (la carta dopo prende il suo posto)
    discardEntry(entry);
    effect = 'discard';
  }
  // Finita la coda: si passa alla carta da pescare (coperta); se non c'è niente da pescare il turno finisce
  if (currentIndex >= queue.length && !canDraw()) endResolution();
  return effect;
}

// Tocco sul pulsante principale: prima la partita cambia (un passo di undo, salvataggio), poi l'animazione.
// Fino alla fine dell'animazione il pulsante non accetta altri tocchi (un tocco = un solo evento di gioco).
function onResolveClick() {
  if (!resolving || ui.isTransitioning) return;
  if (isDrawStep()) {
    // "Pesca": la carta coperta diventa la carta pescata, che si gira
    if (ui.viewedUid !== DRAW_UID) return;
    act(drawNewCard);
    if (resolving) {
      showActive(activeEntry());
      lockFor(duration('focus'));
    }
    render();
    return;
  }
  const active = activeEntry();
  if (!active || ui.viewedUid !== active.uid) return;
  const ghostSource = focusEl.querySelector(`.ae-focus-slide[data-uid="${active.uid}"] .ae-focus-stage`);
  const wasNewStep = newIndex >= 0;
  const effect = act(resolveCurrent);

  if (!resolving) {
    // Fine del turno nemesi: si torna alla VistaCoda con la carta pescata in vista
    // Carta appena pescata e messa in gioco (si prende dalla carta risolta, non da ui.lastDrawnUid: dopo un undo gli uid cambiano)
    const kept = (wasNewStep && entryByUid(active.uid)) || entryByUid(ui.lastDrawnUid);
    const anchorUid = kept ? kept.uid : (queue.length ? queue[queue.length - 1].uid : null);
    ui.queueAnchor = anchorUid ? { uid: anchorUid, align: queue.length === 1 ? 'center' : 'anchor' } : null;
    ui.reveal = null;
    ui.viewedUid = null;
    if (effect === 'discard' && ghostSource) {
      // Attacco appena pescato: vola negli scarti restando nel turno nemesi; quando atterra si passa al turno giocatori
      flyToDiscard([ghostSource]);
      ghostSource.style.visibility = 'hidden';
      lockFor(reducedMotion.matches ? 150 : FLY_MS + 80, () => { toPlayersTurn(null); nemesisBtn.focus(); });
      return;
    }
    // Carta messa in gioco: passaggio morbido, la carta grande si trasforma nella carta del turno giocatori
    lockFor(reducedMotion.matches ? duration('phase') : MORPH_MS + 40);
    toPlayersTurn(kept && ghostSource ? kept.uid : null, ghostSource);
    if (wasNewStep) nemesisBtn.focus();
    return;
  }

  const next = activeEntry();
  // Carta risolta e scartata: vola verso la pila degli scarti in alto
  if (effect === 'discard' && ghostSource) flyToDiscard([ghostSource]);
  showActive(next);
  lockFor(duration(effect === 'discard' ? 'discard' : 'focus'));
  render();
  // Risolta l'ultima carta: la carta da pescare arriva volando dal mazzo, dopo che la carta scartata è atterrata
  if (isDrawStep()) animateDrawIn(effect === 'discard' && ghostSource ? FLY_MS + 60 : 0);
}

// Dopo un'azione si mostra la nuova carta da risolvere (o la carta appena pescata, che si gira)
function showActive(entry) {
  const current = activeEntry();
  ui.viewedUid = current ? current.uid : (isDrawStep() ? DRAW_UID : null);
  ui.slide = 1;
  if (current && newIndex >= 0 && current.isNew && (!ui.reveal || ui.reveal.uid !== current.uid)) {
    startReveal(current);
    announce(I18N_IT.cardDrawn(current.data.name));
  }
  preloadNext();
}

function onNemesisClick() {
  if (resolving || ui.isTransitioning || !deckSetup) return;
  // Con modifiche non salvate il pulsante è "Salva modifiche"
  if (ui.drafts.size) {
    saveAllDrafts();
    return;
  }
  act(nemesisTurn);
  // Lo sfondo scorre verso il lato della nemesi (0,8 s, style.css .ae-shell): il token della prima carta aspetta
  ui.bgSlideUntil = reducedMotion.matches ? 0 : performance.now() + BG_SLIDE_MS;
  ui.viewedUid = null;
  if (resolving) {
    showActive(activeEntry());
    resolveView.classList.remove('is-entering');
    void resolveView.offsetWidth;
    resolveView.classList.add('is-entering');
    lockFor(duration('phase'));
  }
  render();
  if (resolving) resolveBtn.focus();
  // Coda vuota: si va subito alla carta da pescare, che arriva dal mazzo
  if (isDrawStep()) animateDrawIn();
}

// Mostra un'altra carta senza risolvere nulla (anteprima): non cambia mazzo, vita, token, scarti, turno, undo
function viewCard(uid, slide = 0) {
  if (!resolving || ui.holdUid) return;
  if ((uid === DRAW_UID ? !isDrawStep() : !entryByUid(uid)) || ui.viewedUid === uid) return;
  ui.slide = slide;
  ui.viewedUid = uid;
  renderResolve();
}

function moveView(step) {
  const i = queue.findIndex(e => e.uid === ui.viewedUid);
  const next = queue[i + step];
  if (next) viewCard(next.uid, step);
}

function backToActive() {
  const active = activeEntry();
  if (active) viewCard(active.uid);
  else if (isDrawStep()) viewCard(DRAW_UID);
  resolveBtn.focus();
}

// --- 9. Eventi e avvio ---------------------------------------------------------------------------------------------

// Un tocco che diventa scorrimento (oltre DRAG_THRESHOLD px) non apre la carta
function trackDrag(container) {
  let start = null;
  container.addEventListener('pointerdown', e => { start = { x: e.clientX, y: e.clientY }; container.dataset.dragged = ''; });
  container.addEventListener('pointermove', e => {
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > DRAG_THRESHOLD) container.dataset.dragged = '1';
  });
  container.addEventListener('pointerup', () => { start = null; });
  container.addEventListener('scroll', () => { if (start) container.dataset.dragged = '1'; }, { passive: true });
}
trackDrag(queueViewport);
trackDrag(rail);

queueList.addEventListener('click', e => {
  const item = e.target.closest('.ae-queue-item');
  if (!item || queueViewport.dataset.dragged === '1') return;
  const entry = entryByUid(Number(item.dataset.uid));
  if (entry) openCardDialog(entry);
});

rail.addEventListener('click', e => {
  const item = e.target.closest('.ae-queue-item');
  if (!item || rail.dataset.dragged === '1') return;
  const uid = Number(item.dataset.uid);
  const from = queue.findIndex(x => x.uid === ui.viewedUid);
  const to = queue.findIndex(x => x.uid === uid);
  viewCard(uid, Math.sign(to - from));
});

// Carosello del turno nemesi: toccando il retro della carta da pescare si pesca; toccando un minion (quello al centro)
// si apre la stessa finestra del turno giocatori, con −1 e +1 alla vita
focusEl.addEventListener('click', e => {
  if (!resolving || ui.isTransitioning) return;
  const stage = e.target.closest('.ae-focus-stage');
  const slide = stage && stage.closest('.ae-focus-slide');
  if (!slide) return;
  const uid = Number(slide.dataset.uid);
  if (uid !== ui.viewedUid) return;
  if (uid === DRAW_UID) {
    onResolveClick();
    return;
  }
  const entry = entryByUid(uid);
  if (!entry || entry.data.type !== 'Minion') return;
  if (ui.reveal && ui.reveal.uid === uid && ui.reveal.status !== 'done') return;
  openCardDialog(entry);
});
focusEl.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.ae-focus-slide--draw .ae-focus-stage')) {
    e.preventDefault();
    e.target.click();
  }
});

// Frecce sinistra/destra sulla fascia: cambiano solo la carta mostrata
rail.addEventListener('keydown', e => {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
  e.preventDefault();
  moveView(e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1);
  const item = rail.querySelector(`[data-uid="${ui.viewedUid}"]`);
  if (item) item.focus();
});

// Esc chiude il livello in primo piano; Tab resta dentro dialoghi, scarti e pagina iniziale
document.addEventListener('keydown', e => {
  const top = topLayer();
  if (e.key === 'Escape') {
    if (undoFloat && !modals.length) { closeUndoFloat(); return; }
    if (deckPopover && !modals.length) { closeDeckPopover(); return; }
    if (modals.length) modals[modals.length - 1].onCancel();
    else if (top === discardLayer) closeDiscard();
    return;
  }
  if (e.key === 'Tab' && top !== app) {
    const items = focusables(top);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || !top.contains(document.activeElement))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (document.activeElement === last || !top.contains(document.activeElement))) {
      e.preventDefault();
      first.focus();
    }
  }
});

discardLayer.addEventListener('click', e => { if (e.target === discardLayer) closeDiscard(); });
discardBtn.addEventListener('click', openDiscard);
discardClose.addEventListener('click', closeDiscard);
menuBtn.addEventListener('click', openSideMenu);

// Menu in alto a destra (opposto all'undo): apre un pannello laterale largo il 70% dello schermo, il resto dell'app
// resta visibile ma oscurato. Contiene: Esci dalla partita, turno, carte nel mazzo, Scarti.
// La riga Turno/Mazzo/Scarti/Menu in basso non c'è più. Tutto è creato qui, così vale anche con un index.html vecchio.
(function setupMenuButton() {
  const spacer = document.querySelector('.ae-header .ae-header-spacer');
  menuBtn.className = 'ae-icon-button ae-menu-button';
  menuBtn.textContent = '';
  menuBtn.setAttribute('aria-label', I18N_IT.menu);
  menuBtn.setAttribute('aria-haspopup', 'dialog');
  menuBtn.append(el('span', 'ae-menu-lines'));
  if (spacer) spacer.replaceWith(menuBtn);
  infoRow.remove();
})();

// In alto a sinistra, al posto di Undo (che è nel Menu), uno accanto all'altro e uguali nei due turni: il mazzo nemesi
// (dorso con il numero di carte rimaste) e la pila degli scarti (ultima carta scartata con il numero; toccandola si apre).
// Creati qui, così valgono anche con un index.html vecchio.
const headerPiles = el('div', 'ae-header-piles');
const dockDeck = el('div', 'ae-pile ae-pile--deck');
const dockDiscard = el('button', 'ae-pile ae-pile--discard');
dockDiscard.type = 'button';
dockDiscard.addEventListener('click', () => { if (!ui.isTransitioning) openDiscard(); });
// Tocco sul mazzo: compare il pulsante "Pesca carta" (per gli effetti che fanno pescare o guardare la carta in cima)
dockDeck.setAttribute('role', 'button');
dockDeck.tabIndex = 0;
dockDeck.addEventListener('click', () => { if (!ui.isTransitioning && !modals.length) openDeckPopover(); });
dockDeck.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dockDeck.click(); } });
headerPiles.append(dockDeck, dockDiscard);
undoBtn.before(headerPiles);
undoBtn.hidden = true;

function pileContent(node, imgSrc, count) {
  node.classList.toggle('is-empty', !imgSrc);
  const img = node.querySelector('img');
  if (imgSrc) {
    const image = img || document.createElement('img');
    image.alt = '';
    if (image.getAttribute('src') !== imgSrc) image.src = imgSrc;
    if (!img) node.prepend(image);
  } else if (img) {
    img.remove();
  }
  let n = node.querySelector('.ae-pile-count');
  if (!n) {
    n = el('span', 'ae-pile-count');
    n.setAttribute('aria-hidden', 'true');
    node.appendChild(n);
  }
  n.textContent = String(count);
}

// Le carte ancora in volo verso gli scarti non si contano finché non atterrano (ui.flyingDiscards)
function renderDockPiles() {
  pileContent(dockDeck, deck.length ? CARD_BACK : null, deck.length);
  dockDeck.setAttribute('aria-label', I18N_IT.deckLabel(deck.length));
  dockDeck.setAttribute('aria-haspopup', 'true');
  const shown = Math.max(0, discard.length - ui.flyingDiscards);
  const last = discard[shown - 1];
  pileContent(dockDiscard, last ? encodeURI(last.thumb || last.image) : null, shown);
  dockDiscard.setAttribute('aria-label', I18N_IT.discardButtonLabel(discard.length));
}

// Animazione dello scarto: una copia della carta si stacca (si alza e si inclina), vola in arco verso la pila degli
// scarti in alto rimpicciolendosi, e atterra; la pila fa un piccolo rimbalzo con un lampo dorato e il numero sale.
// Più carte partono una dopo l'altra. Va chiamata prima di ridisegnare (le carte devono essere ancora nella pagina).
const FLY_MS = 720;
const FLY_STAGGER = 120;
function flyToDiscard(nodes) {
  const target = dockDiscard.getBoundingClientRect();
  nodes.filter(Boolean).forEach((node, i) => {
    const r = node.getBoundingClientRect();
    if (!r.width || !target.width) return;
    ui.flyingDiscards++;
    const ghost = node.cloneNode(true);
    ghost.classList.add('ae-fly-ghost');
    ghost.removeAttribute('id');
    Object.assign(ghost.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    document.body.appendChild(ghost);
    const dx = target.left + target.width / 2 - (r.left + r.width / 2);
    const dy = target.top + target.height / 2 - (r.top + r.height / 2);
    const s = target.width / r.width;
    let landed = false;
    const land = () => {
      if (landed) return;
      landed = true;
      ghost.remove();
      ui.flyingDiscards = Math.max(0, ui.flyingDiscards - 1);
      renderDockPiles();
      dockDiscard.classList.remove('is-bump');
      void dockDiscard.offsetWidth;
      dockDiscard.classList.add('is-bump');
    };
    const delay = i * FLY_STAGGER;
    if (ghost.animate && !reducedMotion.matches) {
      const anim = ghost.animate([
        { transform: 'translate(0, 0) rotate(0deg) scale(1)', opacity: 1, offset: 0 },
        { transform: `translate(${dx * 0.04}px, ${-28}px) rotate(-5deg) scale(1.05)`, opacity: 1, offset: 0.18 },
        { transform: `translate(${dx * 0.55}px, ${dy * 0.45 - 60}px) rotate(-16deg) scale(${(1 + s) / 2})`, opacity: 1, offset: 0.6 },
        { transform: `translate(${dx}px, ${dy}px) rotate(0deg) scale(${s})`, opacity: 0.9, offset: 1 }
      ], { duration: FLY_MS, delay, easing: 'cubic-bezier(.45, 0, .25, 1)', fill: 'both' });
      anim.onfinish = land;
      setTimeout(land, FLY_MS + delay + 200);
    } else {
      setTimeout(land, delay + 100);
    }
  });
}

// Dal turno nemesi al turno giocatori senza "sparisci e ricompari":
//   - la vista del turno giocatori non fa la dissolvenza (classe is-from-nemesis);
//   - la fascia piccola resta ferma (stesso scorrimento della fascia del turno nemesi);
//   - lo sfondo scorre di nuovo verso il lato sinistro (maga);
//   - la carta appena messa in gioco passa dalla sua misura grande a quella del turno giocatori (FLIP); il resto
//     (carte ai lati, box vita/token, comandi) compare con una breve dissolvenza.
// Va chiamata al posto di render(): misura prima e dopo il disegno.
const MORPH_MS = 380;
// Durata dello scorrimento dello sfondo tra i due turni (uguale alla transizione di .ae-shell in style.css)
const BG_SLIDE_MS = 800;
function toPlayersTurn(morphUid, fromNode) {
  const railScroll = rail.scrollLeft;
  const fromRect = fromNode && fromNode.getBoundingClientRect().width ? fromNode.getBoundingClientRect() : null;
  // Riga vita/token sopra la carta grande del turno nemesi: anche lei si sposta nel box del turno giocatori
  const fromStatusEl = fromNode && fromNode.closest('.ae-focus-slide') && fromNode.closest('.ae-focus-slide').querySelector('.ae-focus-status > *');
  const fromStatus = fromStatusEl ? fromStatusEl.parentElement.getBoundingClientRect() : null;
  const motion = !reducedMotion.matches && !!document.body.animate;
  // (lo sfondo non sfuma più: è un'immagine sola che scorre da destra a sinistra, vedi style.css .ae-shell)
  queueView.classList.add('is-from-nemesis');
  render();
  if (queueRail) queueRail.scrollLeft = railScroll;
  if (!motion) return;
  const art = morphUid !== null && queueList.querySelector(`.queue-slot .ae-queue-item[data-uid="${morphUid}"] .ae-card-art`);
  const toRect = art && art.getBoundingClientRect();
  if (fromRect && toRect && toRect.width) {
    const dx = fromRect.left + fromRect.width / 2 - (toRect.left + toRect.width / 2);
    const dy = fromRect.top + fromRect.height / 2 - (toRect.top + toRect.height / 2);
    const s = fromRect.width / toRect.width;
    art.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(${s})` },
      { transform: 'none' }
    ], { duration: MORPH_MS, easing: 'cubic-bezier(.3, 0, .2, 1)' });
  }
  // Box vita/token della stessa carta: scivola dalla posizione del turno nemesi a quella nuova (stessa misura)
  const badge = art && art.parentElement.querySelector('.ae-status-badge:not(.ae-status-badge--empty)');
  const badgeRect = badge && badge.getBoundingClientRect();
  if (fromStatus && badgeRect && badgeRect.width) {
    const bx = fromStatus.left + fromStatus.width / 2 - (badgeRect.left + badgeRect.width / 2);
    const by = fromStatus.top + fromStatus.height / 2 - (badgeRect.top + badgeRect.height / 2);
    badge.animate([{ transform: `translate(${bx}px, ${by}px)` }, { transform: 'none' }],
      { duration: MORPH_MS, easing: 'cubic-bezier(.3, 0, .2, 1)' });
  }
  // Tutto il resto del turno giocatori compare con una breve dissolvenza, a metà della trasformazione
  const others = [...queueList.querySelectorAll('.queue-slot')].flatMap(slot => {
    const isMorph = art && slot.contains(art);
    return isMorph ? [...slot.querySelectorAll('.queue-controls, .ae-new-tag')].concat(badge && fromStatus ? [] : [...slot.querySelectorAll('.ae-status-badge')]) : [slot];
  });
  others.forEach(node => node.animate([{ opacity: 0 }, { opacity: 1 }],
    { duration: 220, delay: art ? MORPH_MS / 2 : 0, easing: 'ease-out', fill: 'backwards' }));
}

// Finestra "Vittoria" quando la condizione si avvera nel turno giocatori. Chiusa una volta, non si ripropone finché lo
// stato non cambia (per esempio con Undo si torna indietro e la condizione non vale più).
let victoryKey = '';
function checkVictory() {
  if (resolving || !isVictory()) { victoryKey = ''; return; }
  const key = turn + ':' + discard.length + ':' + queue.length;
  if (victoryKey === key || modals.length || !startLayer.hidden) return;
  victoryKey = key;
  setTimeout(() => {
    if (resolving || !isVictory() || modals.length) return;
    let close = () => {};
    const cancel = () => close();
    const dialog = dialogShell(I18N_IT.victoryTitle, '', cancel);
    dialog.classList.add('ae-victory');
    dialog.appendChild(el('p', 'ae-victory-text', I18N_IT.victoryText));
    const footer = el('div', 'ae-modal-footer');
    footer.append(button(I18N_IT.close, 'secondary', cancel), button(I18N_IT.newGame, 'primary', () => { close(); openStart(); }));
    dialog.appendChild(footer);
    close = openModal(dialog, { onCancel: cancel });
  }, reducedMotion.matches ? 0 : MORPH_MS + 100);
}

// Passo Pesca: una carta coperta parte dal mazzo in alto a sinistra e vola al centro, dove diventa la carta da pescare
// (che resta nascosta finché la copia non arriva). Poi tutto funziona come prima (tocco sul dorso o "Pesca").
const DRAW_IN_MS = 650;
// delay: attesa (ms) prima della partenza, per esempio finché la carta appena scartata non è atterrata
function animateDrawIn(delay = 0) {
  const stage = focusEl.querySelector('.ae-focus-slide--draw .ae-focus-stage');
  const from = dockDeck.getBoundingClientRect();
  if (!stage || !from.width || reducedMotion.matches || !document.body.animate) return;
  // La carta da pescare non deve avere l'animazione di entrata (la sposterebbe): si misura dove starà davvero
  const slide = stage.closest('.ae-focus-slide');
  if (slide) slide.classList.remove('is-entering');
  scrollFocusTo(DRAW_UID, false);
  const to = stage.getBoundingClientRect();
  if (!to.width) return;
  stage.style.visibility = 'hidden';
  const ghost = el('div', 'ae-fly-ghost ae-draw-ghost');
  const img = document.createElement('img');
  img.alt = '';
  img.src = CARD_BACK;
  ghost.appendChild(img);
  Object.assign(ghost.style, { left: to.left + 'px', top: to.top + 'px', width: to.width + 'px', height: to.height + 'px' });
  document.body.appendChild(ghost);
  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + to.height / 2);
  const s = from.width / to.width;
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    ghost.remove();
    stage.style.visibility = '';
  };
  const anim = ghost.animate([
    { transform: `translate(${dx}px, ${dy}px) rotate(0deg) scale(${s})`, offset: 0 },
    { transform: `translate(${dx * 0.45}px, ${dy * 0.55 - 40}px) rotate(10deg) scale(${(1 + s) / 2})`, offset: 0.45 },
    { transform: 'translate(0, 0) rotate(0deg) scale(1)', offset: 1 }
  ], { duration: DRAW_IN_MS, delay, easing: 'cubic-bezier(.3, 0, .2, 1)', fill: 'forwards' });
  // Durante l'attesa la copia resta nascosta (il mazzo in alto è già lì)
  ghost.style.visibility = 'hidden';
  setTimeout(() => { if (!done) ghost.style.visibility = ''; }, delay);
  anim.onfinish = finish;
  setTimeout(finish, delay + DRAW_IN_MS + 200);
  lockFor(delay + DRAW_IN_MS);
}

// "Annulla ultima azione" dal Menu: il menu si chiude e resta un pulsante sospeso che si può toccare più volte;
// un tocco fuori dal pulsante (o Esc) chiude e si torna all'app
let undoFloat = null;
function openUndoFloat() {
  closeUndoFloat();
  const layer = el('div', 'ae-undo-float');
  const b = button(I18N_IT.undoAction, 'primary', e => {
    e.stopPropagation();
    undo();
    sync();
  });
  b.classList.add('ae-undo-float-button');
  const sync = () => { b.disabled = undoStack.length === 0 && ui.drafts.size === 0; };
  layer.addEventListener('click', e => { if (e.target === layer) closeUndoFloat(); });
  layer.appendChild(b);
  document.body.appendChild(layer);
  undoFloat = layer;
  sync();
  b.focus({ preventScroll: true });
}
function closeUndoFloat() {
  if (!undoFloat) return;
  undoFloat.remove();
  undoFloat = null;
}

// Tocco sul mazzo in alto: sotto compare "Pesca carta" (un tocco fuori lo chiude). "Pesca carta" apre la carta in cima
// al mazzo in grande con "Rimetti nel mazzo" (resta in cima, nessun cambiamento) e "Scarta" (va negli scarti, un passo
// di undo). Se il mazzo è vuoto il pulsante è disattivato (gli scarti non si rimescolano qui).
let deckPopover = null;
function openDeckPopover() {
  closeDeckPopover();
  const layer = el('div', 'ae-deck-popover');
  const r = dockDeck.getBoundingClientRect();
  const b = button(I18N_IT.drawCard, 'primary', e => {
    e.stopPropagation();
    closeDeckPopover();
    openDeckDraw();
  });
  b.classList.add('ae-deck-popover-button');
  b.disabled = deck.length === 0;
  b.style.left = Math.max(8, r.left) + 'px';
  b.style.top = (r.bottom + 8) + 'px';
  layer.addEventListener('click', e => { if (e.target === layer) closeDeckPopover(); });
  layer.appendChild(b);
  document.body.appendChild(layer);
  deckPopover = layer;
  b.focus({ preventScroll: true });
}
function closeDeckPopover() {
  if (!deckPopover) return;
  deckPopover.remove();
  deckPopover = null;
}

function openDeckDraw() {
  const data = deck[deck.length - 1];
  if (!data) return;
  let close = () => {};
  const putBack = () => { close(); showToast(I18N_IT.cardPutBack(data.name)); };
  const dialog = dialogShell(I18N_IT.deckCardTitle, data.name, putBack, { displayTitle: false });
  dialog.classList.add('ae-deck-draw');
  const art = cardArt(data);
  art.classList.add('ae-modal-art');
  const footer = el('div', 'ae-modal-footer');
  const discardBtnEl = button(I18N_IT.discardDrawn, 'danger', () => {
    const source = art.getBoundingClientRect().width ? art : null;
    act(() => { discard.push(deck.pop()); });
    // La carta vola dalla finestra alla pila degli scarti
    if (source) flyToDiscard([source]);
    close();
    render();
    showToast(I18N_IT.cardDiscarded(data.name));
  });
  footer.append(button(I18N_IT.putBack, 'secondary', putBack), discardBtnEl);
  dialog.append(art, footer);
  close = openModal(dialog, { onCancel: putBack });
}

// Dalla pagina iniziale alla partita: la pagina iniziale esce a sinistra e la partita entra da destra
const START_SLIDE_MS = 380;
function slideToGame(then) {
  if (reducedMotion.matches) {
    closeStart();
    if (then) then();
    return;
  }
  startLayer.classList.add('is-sliding-out');
  app.classList.add('is-sliding-in');
  setTimeout(() => {
    startLayer.classList.remove('is-sliding-out');
    app.classList.remove('is-sliding-in');
    closeStart();
    if (then) then();
  }, START_SLIDE_MS);
}

function openSideMenu() {
  if (ui.isTransitioning) return;
  let close = () => {};
  const cancel = () => close();
  const panel = dialogShell(I18N_IT.menu, '', cancel, { displayTitle: false });
  panel.classList.add('ae-side-menu');
  const stats = el('dl', 'ae-side-stats');
  stats.append(el('dt', '', I18N_IT.menuTurn), el('dd', '', String(turn)),
    el('dt', '', I18N_IT.menuDeck), el('dd', '', String(deck.length)));
  const discardOpen = button(I18N_IT.discardButton(discard.length), 'secondary', () => { close(); openDiscard(); });
  discardOpen.classList.add('ae-button--full');
  discardOpen.setAttribute('aria-label', I18N_IT.discardButtonLabel(discard.length));
  const exit = button(I18N_IT.exitGame, 'secondary', () => { close(); openStart(); });
  exit.classList.add('ae-button--full', 'ae-side-exit');
  // Undo: annulla l'ultima azione (prima le modifiche non salvate)
  const undoItem = button(I18N_IT.undoAction, 'secondary', () => { close(); undo(); openUndoFloat(); });
  undoItem.classList.add('ae-button--full');
  undoItem.disabled = undoStack.length === 0 && ui.drafts.size === 0;
  panel.append(stats, undoItem, discardOpen, exit);
  close = openModal(panel, { onCancel: cancel });
  panel.parentElement.classList.add('ae-modal-backdrop--side');
}
startBtn.addEventListener('click', onStartClick);
resumeBtn.addEventListener('click', resumeGame);
undoBtn.addEventListener('click', undo);
nemesisBtn.addEventListener('click', onNemesisClick);
resolveBtn.addEventListener('click', onResolveClick);
backBtn.addEventListener('click', backToActive);
retryBtn.addEventListener('click', init);
document.getElementById('wave-select').addEventListener('change', e => renderBosses(e.target.value));
document.getElementById('upgraded-switch').addEventListener('change', e => { settings.includeUpgraded = e.target.checked; });
window.addEventListener('resize', () => { sizeFocus(); sizeQueue(); });
// Se lo spazio della carta grande cambia per altri motivi (font caricato, pulsanti del dock), si ridimensiona subito
if (window.ResizeObserver) {
  new ResizeObserver(() => sizeFocus()).observe(focusEl);
  new ResizeObserver(() => sizeQueue()).observe(queueViewport);
}

// Avvio: legge cards.json, deck-setup.json e nemesis.json, mostra la pagina iniziale (con "Riprendi partita" se ce n'è una salvata)
let initRunning = false;
async function init() {
  if (initRunning) return;
  initRunning = true;
  startError.hidden = true;
  startBtn.disabled = true;
  showStartSkeleton();
  updateInert();
  try {
    const [cards, setup, nemesisList, art] = await Promise.all([
      loadJson(DATA_ROOT + 'cards.json'), loadJson(DATA_ROOT + 'deck-setup.json'), loadJson(DATA_ROOT + 'nemesis.json'),
      loadJson('Assets/nemesis/nemesis-art.json').catch(() => ({}))
    ]);
    nemesisArt = art || {};
    if (cards.length === 0) throw new Error('Nessuna carta trovata in cards.json');
    // Le scansioni delle carte stanno nella cartella Data/, le miniature in thumbs/
    cards.forEach(c => {
      c.image = DATA_ROOT + c.image;
      c.thumb = THUMB_DIR + encodeURIComponent(c.id) + '.webp';
    });
    allCards = cards;
    deckSetup = setup;
    nemeses = nemesisList;
    cardsById = new Map(allCards.map(c => [c.id, c]));
    buildStartPage();
    newGame();
    // Il retro si scarica subito, così alla prima pesca è già pronto
    loadImage(CARD_BACK);
    render();
    setStartMode(readSave() ? 'choice' : 'setup', true);
  } catch (err) {
    console.error(err);
    // Senza replaceChildren: se l'errore viene da un browser vecchio, qui non deve fallire di nuovo
    document.getElementById('nemesis-list').innerHTML = '';
    // Sotto il messaggio, il motivo tecnico (utile per capire il problema su un dispositivo che non si può ispezionare)
    showStartError(I18N_IT.loadError + '\n(' + (err && err.message ? err.message : String(err)) + ')', true);
  } finally {
    initRunning = false;
  }
}

init();
