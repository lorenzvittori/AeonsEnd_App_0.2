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
  ctaDiscardNext: 'Effetto applicato · Scarta',
  ctaDiscardDraw: 'Effetto applicato · Scarta · Pesca',
  ctaMinionNext: 'Effetto applicato · Avanti',
  ctaMinionDraw: 'Effetto applicato · Pesca',
  ctaPutInPlay: 'Metti in gioco',
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
  undone: 'Azione annullata'
};

const app = document.getElementById('app');
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
const ANCHOR_RATIO = 0.62;

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
const CARD_BACK = 'Assets/ui/decor/card-back.webp';

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
  slide: 0,               // direzione dell'ultimo cambio di carta (per l'animazione)
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

// Un boss si può scegliere solo se ha una battaglia e le sue carte sono nel progetto
function isPlayable(info) {
  return info.battle !== null && allCards.some(c => c.category === 'Specific' && c.nemesis === info.name);
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
      ...pickRandom(allCards.filter(c => c.category === 'Basic Nemesis' && ofTier(c)), basicCount),
      ...pickRandom(allCards.filter(c => c.category === 'Upgraded Basic Nemesis' && ofTier(c)), upgradedCount),
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

// Pesca la carta in cima al mazzo; se il mazzo è finito si rimescolano gli scarti. Null se non c'è niente da pescare.
function drawFromDeck() {
  if (deck.length === 0 && discard.length > 0) {
    deck = shuffle(discard);
    discard = [];
  }
  return deck.pop() || null;
}

// Carta in gioco (nella coda) con il suo stato
function makeEntry(data) {
  return { uid: nextUid++, data, tokens: data.tokens, hp: data.hp, isNew: false };
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
function cardArt(data, { thumb = false, lazy = false } = {}) {
  const box = el('span', 'ae-card-art');
  const img = document.createElement('img');
  img.alt = '';
  img.decoding = 'async';
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

// Badge fuori dalla scansione (box grigio scuro): goccia + vita attuale (minion), un token per ogni token (potere).
// Uguale nella coda e nella fascia della VistaRisoluzione.
function statusBadge(entry) {
  const badge = el('span', 'ae-status-badge');
  badge.setAttribute('aria-hidden', 'true');
  if (hasHp(entry)) {
    badge.classList.add('ae-status-badge--danger');
    badge.append(icon('heart'), el('span', '', String(entry.hp)));
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
  if (opts.current) button.setAttribute('aria-current', 'true');
  if (opts.viewed) button.dataset.viewed = 'true';

  const parts = [data.name, typeName(data), statusText(entry), I18N_IT.cardOf(opts.index + 1, opts.total)];
  if (entry.isNew) parts.push(I18N_IT.newTag.toLowerCase());
  if (opts.current) parts.push('da risolvere');
  if (opts.viewed && !opts.current) parts.push('in anteprima');
  button.setAttribute('aria-label', parts.filter(Boolean).join(', '));

  const meta = el('span', 'ae-queue-meta');
  meta.setAttribute('aria-hidden', 'true');
  meta.append(el('strong', '', data.name), el('small', '', typeName(data)));

  // Le carte grandi della VistaCoda usano la scansione intera, le altre la miniatura
  const art = cardArt(data, { thumb: !opts.full, lazy: opts.lazy });
  // (non sulla carta appena pescata: ha già NUOVA e il glow dorato)
  if (opts.compact && opts.current && !opts.viewed && !entry.isNew) art.appendChild(el('span', 'ae-rail-flag', I18N_IT.activeFlag));

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
function nextCardItem() {
  const item = el('div', 'ae-queue-item ae-next-card');
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
function loadImage(src) {
  return new Promise(resolve => {
    const img = new Image();
    let done = false;
    const finish = ok => { if (!done) { done = true; resolve(ok); } };
    img.onload = () => finish(true);
    img.onerror = () => finish(false);
    img.src = src;
    if (img.complete && img.naturalWidth) finish(true);
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
  const removeEntry = message => {
    const index = queue.indexOf(entry);
    act(() => discardEntry(entry));
    render();
    focusQueueItem(neighbourUid(index));
    showToast(message);
  };

  if (hasHp(entry)) {
    const max = entry.data.hp;
    const steps = entry.hp > 0 ? [-5, -1, 1] : [1];
    steps.forEach(step => {
      const key = String(step);
      box.appendChild(ctl(step > 0 ? '+' + step : '−' + Math.abs(step), 'secondary', key,
        (step > 0 ? 'Aggiungi ' : 'Togli ') + Math.abs(step) + ' punti vita a ' + entry.data.name, () => {
          const value = Math.min(max, Math.max(0, entry.hp + step));
          if (value === entry.hp) return;
          act(() => { entry.hp = value; });
          render();
          refocus(key);
        }));
    });
    if (entry.hp <= 0) {
      box.appendChild(ctl(I18N_IT.deleteMinion, 'danger', 'delete', null, () => removeEntry(I18N_IT.minionDeleted(entry.data.name))));
    }
  } else if (entry.data.type === 'Power' && entry.data.removable !== false) {
    box.appendChild(ctl(I18N_IT.removePowerShort, 'danger', 'remove', I18N_IT.removePower + ': ' + entry.data.name,
      () => removeEntry(I18N_IT.powerRemoved(entry.data.name))));
  }
  return box;
}

// Carte grandi: una e mezza nella larghezza, ma mai più alte dello spazio disponibile
function sizeQueue() {
  if (queueView.hidden) return;
  const style = getComputedStyle(queueViewport);
  const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  const gap = parseFloat(getComputedStyle(queueList).columnGap) || 12;
  const byWidth = (queueViewport.clientWidth - padX - gap) / 1.5;
  const badge = 32 + 52; // badge sopra la carta + riga dei comandi sotto (44px + spazio)
  const byHeight = (queueViewport.clientHeight - padY - badge) / CARD_RATIO;
  const width = Math.max(100, Math.floor(Math.min(byWidth, byHeight)));
  queueViewport.style.setProperty('--ae-queue-card', width + 'px');
}

function renderQueue() {
  const previous = queueViewport.scrollLeft;
  const previousTop = queueViewport.scrollTop;
  const railEl = ensureQueueRail();
  const railScroll = railEl.scrollLeft;
  railEl.replaceChildren(...queue.map((entry, i) => queueItem(entry, { compact: true, index: i, total: queue.length })));
  railEl.scrollLeft = railScroll;
  railEl.hidden = queue.length === 0;
  queueList.replaceChildren(...queue.map((entry, i) => {
    // Ogni carta grande con i suoi comandi subito sotto (vita del minion, rimozione del potere)
    const slot = el('div', 'queue-slot');
    slot.setAttribute('role', 'listitem');
    const card = queueItem(entry, { full: true, index: i, total: queue.length, lazy: i > 3 });
    card.removeAttribute('role');
    slot.append(card, cardControls(entry));
    return slot;
  }));
  queueEmpty.hidden = queue.length > 0;
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
  if (resolving || ui.isTransitioning) return;
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
    const remove = button(I18N_IT.removePower, 'danger', () => {
      const index = queue.indexOf(entry);
      close();
      act(() => discardEntry(entry));
      ui.queueAnchor = { uid: neighbourUid(index), align: 'nearest' };
      render();
      focusQueueItem(neighbourUid(index));
      showToast(I18N_IT.powerRemoved(data.name));
    });
    const footer = el('div', 'ae-modal-footer');
    footer.append(button(I18N_IT.close, 'secondary', cancel));
    // Solo i poteri con "TO DISCARD" si possono rimuovere pagando il costo (cards.json: removable)
    if (data.removable !== false) footer.appendChild(remove);
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
  const original = entry.hp;
  let draft = original;
  let committing = false;

  const row = el('div', 'ae-hp-row');
  const number = el('p', 'ae-hp-number');
  number.setAttribute('aria-live', 'polite');
  const delta = el('p', 'ae-hp-delta');
  row.append(number, delta);
  const controls = el('div', 'ae-hp-controls');
  [-5, -1, 1].forEach(step => {
    const b = button(step > 0 ? '+' + step : '−' + Math.abs(step), 'secondary', () => {
      draft = Math.min(max, Math.max(0, draft + step));
      update();
    });
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
    act(() => {
      entry.hp = value;
      if (value <= 0) discardEntry(entry);
    });
    ui.queueAnchor = value <= 0 ? { uid: neighbourUid(index), align: 'nearest' } : { uid: entry.uid, align: 'nearest' };
    render();
    focusQueueItem(ui.queueAnchor ? ui.queueAnchor.uid : (value <= 0 ? neighbourUid(index) : entry.uid));
    showToast(value <= 0 ? I18N_IT.minionDeleted(name) : I18N_IT.hpLeftToast(name, value));
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
    if (!active) return;
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
  renderPlayers();
  const waveSelect = document.getElementById('wave-select');
  const current = nemeses.find(n => n.name === settings.nemesis);
  waveSelect.replaceChildren(...startOptions.waves.map(wave => {
    const option = el('option', '', wave);
    option.value = wave;
    return option;
  }));
  waveSelect.value = current ? current.wave : startOptions.waves[0];
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
  const hasSave = !!readSave();
  resumeBtn.hidden = !hasSave || startMode === 'choice';
  resumeBtn.className = 'ae-button ae-button--full ae-button--secondary start-resume-alt';
  startBtn.textContent = I18N_IT.startNew;
  startBtn.className = 'ae-button ae-button--full ae-button--primary';
  startBtn.disabled = !settings.nemesis || !battleOf(settings.nemesis);
  startBtn.title = startBtn.disabled ? I18N_IT.chooseNemesis : '';
}

function buildStartPage() {
  const waves = [...new Set([...nemeses].sort((a, b) => a.waveOrder - b.waveOrder).map(n => n.wave))];
  startOptions = { players: Object.keys(deckSetup.battles[0].players).map(Number), waves };
  const firstPlayable = nemeses.find(isPlayable);
  settings = { players: startOptions.players[0], nemesis: firstPlayable ? firstPlayable.name : null, includeUpgraded: true };
  renderStartChoices();
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
  undoStack = [];
  newGame();
  closeStart();
  render();
  save();
  nemesisBtn.focus();
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
    queue: queue.map(e => ({ id: e.data.id, tokens: e.tokens, hp: e.hp, isNew: !!e.isNew })),
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
  const newQueue = s.queue.map(q => Object.assign(makeEntry(get(q.id)), { tokens: q.tokens, hp: q.hp, isNew: !!q.isNew }));

  clearTransition();
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
  undoBtn.disabled = undoStack.length === 0;
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

// Scritta "Tier N" al centro: resta 1 secondo, poi svanisce in 0,5 secondi. Intanto l'app è oscurata del 60%
// e non si può toccare; dopo si continua normalmente.
const TIER_BANNER_MS = 1500;
function showTierBanner(tier) {
  const banner = el('div', 'ae-tier-banner');
  banner.setAttribute('role', 'status');
  banner.appendChild(el('span', 'ae-tier-banner-text', 'Tier ' + tier));
  document.body.appendChild(banner);
  setTimeout(() => banner.remove(), TIER_BANNER_MS);
}

// Disegna tutto in base allo stato
function render() {
  phaseLabel.textContent = resolving ? I18N_IT.phaseNemesis : I18N_IT.phasePlayers;
  queueView.hidden = resolving;
  resolveView.hidden = !resolving;
  infoRow.hidden = resolving;
  nemesisBtn.hidden = resolving;
  nemesisBtn.disabled = !deckSetup;
  nemesisBtn.setAttribute('aria-disabled', String(ui.isTransitioning));
  updateInfo();
  updateUndoBtn();
  if (ui.tierBanner) {
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
}

function activeEntry() {
  return queue[currentIndex] || null;
}

// Testo del pulsante per la carta da risolvere (tabella §7.3). Sull'ultima carta della coda si pesca la nuova.
function actionText(entry, isNew, isLast) {
  const { data, tokens } = entry;
  if (isNew) return data.type === 'Attack' ? I18N_IT.ctaDiscardNext : I18N_IT.ctaPutInPlay;
  if (data.type === 'Power' && tokens > 1) return isLast ? I18N_IT.ctaTokenDraw : I18N_IT.ctaTokenNext;
  if (data.type === 'Minion') return isLast ? I18N_IT.ctaMinionDraw : I18N_IT.ctaMinionNext;
  return isLast ? I18N_IT.ctaDiscardDraw : I18N_IT.ctaDiscardNext;
}

function renderResolve() {
  const active = activeEntry();
  if (!active) return;
  const isNewStep = newIndex >= 0;
  const viewedUid = ui.holdUid || ui.viewedUid;
  const viewed = entryByUid(viewedUid) || active;
  if (!ui.holdUid) ui.viewedUid = viewed.uid;
  const previewing = !ui.holdUid && viewed !== active;

  // Fascia compatta: rosso = da risolvere, avorio = mostrata
  const railScroll = rail.scrollLeft;
  const railScrollTop = rail.scrollTop;
  const railItems = queue.map((entry, i) => queueItem(entry, {
    compact: true, index: i, total: queue.length, current: entry === active, viewed: entry === viewed
  }));
  // In fondo alla fascia, finché non si pesca: la prossima carta del mazzo, coperta (retro) con NUOVA
  if (!isNewStep && (deck.length > 0 || discard.length > 0)) railItems.push(nextCardItem());
  rail.replaceChildren(...railItems);
  rail.scrollLeft = railScroll;
  rail.scrollTop = railScrollTop;
  const viewedItem = rail.querySelector(`[data-uid="${viewed.uid}"]`);
  if (viewedItem) scrollItemInto(rail, viewedItem, 'nearest');

  renderFocus(viewed, active, { isNewStep, previewing });

  // Dock: in anteprima al posto dell'azione c'è "Torna alla carta da risolvere"
  const text = actionText(active, isNewStep, currentIndex === queue.length - 1);
  resolveBtn.hidden = previewing;
  backBtn.hidden = !previewing;
  resolveBtn.textContent = text;
  // Durante l'animazione il pulsante resta focalizzabile ma non accetta tocchi (aria-disabled, controllato in onResolveClick)
  resolveBtn.setAttribute('aria-disabled', String(ui.isTransitioning));
  // Niente suggerimento sopra il pulsante: lo spazio resta alla carta
  resolveHint.hidden = true;
}

// Carta in primo piano: solo immagine (o retro durante la pesca) e stato numerico. Nessuna etichetta, nome o tipo
// (nemmeno in anteprima): tutto lo spazio va alla carta.
function renderFocus(viewed, active, { isNewStep, previewing }) {
  const index = queue.indexOf(viewed);
  const total = queue.length;
  const reveal = ui.reveal && ui.reveal.uid === viewed.uid ? ui.reveal : null;

  const stage = el('div', 'ae-focus-stage');
  if (reveal && reveal.status !== 'done') {
    stage.appendChild(flipCard(viewed, reveal));
  } else {
    stage.appendChild(cardArt(viewed.data));
  }
  if (viewed.isNew) {
    // Carta appena pescata: glow dorato attorno (come nella versione 1) ed etichetta NUOVA
    stage.classList.add('is-new');
    const tag = el('span', 'ae-new-tag', I18N_IT.newTag);
    tag.setAttribute('aria-hidden', 'true');
    stage.appendChild(tag);
  }

  // Stato sopra la carta: goccia + vita (minion) o un token per ogni token (potere). La riga c'è sempre, anche vuota
  // (attacchi), così la carta ha la stessa dimensione per ogni tipo.
  const status = el('p', 'ae-focus-status');
  if (hasHp(viewed)) {
    status.classList.add('is-hp');
    status.append(icon('heart'), el('span', '', I18N_IT.hp(viewed.hp, viewed.data.hp)));
  } else if (viewed.data.type === 'Power') {
    status.classList.add('is-token');
    status.appendChild(tokenIcons(viewed.tokens));
  }
  if (ui.holdUid === viewed.uid) status.classList.add('is-dropping', 'is-bumped');
  status.setAttribute('aria-label', statusText(viewed));

  const children = [status, stage];

  const changed = focusEl.dataset.uid !== String(viewed.uid);
  focusEl.dataset.uid = viewed.uid;
  focusEl.replaceChildren(...children);
  focusEl.classList.toggle('is-changing', changed && !reveal);
  // Dopo uno slide col dito la nuova carta entra da più lontano (ui.slidePx), altrimenti 24px
  focusEl.style.setProperty('--ae-slide', (ui.slidePx != null ? ui.slidePx : ui.slide * 24) + 'px');
  ui.slide = 0;
  ui.slidePx = null;
  sizeFocus();
}

// Dimensiona la carta in primo piano: occupa tutto lo spazio rimasto nell'area, in altezza e in larghezza
function sizeFocus() {
  const stage = focusEl.querySelector('.ae-focus-stage');
  if (!stage || resolveView.hidden) return;
  const style = getComputedStyle(focusEl);
  const gap = parseFloat(style.rowGap) || 8;
  const others = Array.from(focusEl.children).filter(c => c !== stage);
  const used = others.reduce((sum, c) => sum + c.offsetHeight, 0) + gap * others.length
    + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  const availH = Math.max(80, focusEl.clientHeight - used);
  const availW = focusEl.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const width = Math.max(40, Math.min(availW, availH / CARD_RATIO));
  stage.style.width = width + 'px';
  stage.style.height = (width * CARD_RATIO) + 'px';
  stage.style.setProperty('--cw', width + 'px');
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

  front.appendChild(cardArt(entry.data));
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
  // Coda vuota: non c'è niente da risolvere, si pesca direttamente la carta nuova
  if (queue.length === 0) drawNewCard();
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
  // Finita la coda si pesca la nuova carta
  if (currentIndex >= queue.length) drawNewCard();
  return effect;
}

// Tocco sul pulsante principale: prima la partita cambia (un passo di undo, salvataggio), poi l'animazione.
// Fino alla fine dell'animazione il pulsante non accetta altri tocchi (un tocco = un solo evento di gioco).
function onResolveClick() {
  if (!resolving || ui.isTransitioning) return;
  const active = activeEntry();
  if (!active || ui.viewedUid !== active.uid) return;
  const ghostSource = focusEl.querySelector('.ae-focus-stage');
  const ghost = ghostSource ? ghostOf(ghostSource) : null;
  const wasNewStep = newIndex >= 0;
  const effect = act(resolveCurrent);

  if (!resolving) {
    // Fine del turno nemesi: si torna alla VistaCoda con la carta pescata in vista
    if (effect === 'discard' && ghost) document.body.appendChild(ghost);
    const kept = entryByUid(ui.lastDrawnUid);
    const anchorUid = kept ? kept.uid : (queue.length ? queue[queue.length - 1].uid : null);
    ui.queueAnchor = anchorUid ? { uid: anchorUid, align: queue.length === 1 ? 'center' : 'anchor' } : null;
    ui.reveal = null;
    ui.viewedUid = null;
    lockFor(duration(effect === 'discard' ? 'discard' : 'phase'));
    render();
    if (wasNewStep) nemesisBtn.focus();
    return;
  }

  const next = activeEntry();
  if (effect === 'token') {
    // La carta resta in primo piano con il token in meno, poi si passa alla carta dopo
    ui.holdUid = active.uid;
    lockFor(duration('token'), () => {
      ui.holdUid = null;
      showActive(next);
    });
    render();
    return;
  }
  if (effect === 'discard' && ghost) document.body.appendChild(ghost);
  showActive(next);
  lockFor(duration(effect === 'discard' ? 'discard' : 'focus'));
  render();
}

// Dopo un'azione si mostra la nuova carta da risolvere (o la carta appena pescata, che si gira)
function showActive(entry) {
  const current = activeEntry();
  ui.viewedUid = current ? current.uid : null;
  ui.slide = 1;
  if (current && newIndex >= 0 && current.isNew && (!ui.reveal || ui.reveal.uid !== current.uid)) {
    startReveal(current);
    announce(I18N_IT.cardDrawn(current.data.name));
  }
  preloadNext();
}

// Copia ferma della carta in primo piano che sfuma (carta scartata)
function ghostOf(node) {
  const rect = node.getBoundingClientRect();
  if (!rect.width) return null;
  const ghost = node.cloneNode(true);
  ghost.classList.add('ae-discard-ghost');
  Object.assign(ghost.style, { left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px', height: rect.height + 'px' });
  ghost.addEventListener('animationend', () => ghost.remove());
  // Se l'animazione non parte (per esempio pagina in background), la copia sparisce comunque
  setTimeout(() => ghost.remove(), DURATION.discard + 200);
  return ghost;
}

function onNemesisClick() {
  if (resolving || ui.isTransitioning || !deckSetup) return;
  act(nemesisTurn);
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
}

// Mostra un'altra carta senza risolvere nulla (anteprima): non cambia mazzo, vita, token, scarti, turno, undo
function viewCard(uid, slide = 0) {
  if (!resolving || ui.holdUid) return;
  if (!entryByUid(uid) || ui.viewedUid === uid) return;
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
  resolveBtn.focus();
}

// Slide sulla carta in primo piano: verso sinistra = carta successiva, verso destra = precedente.
// La carta segue il dito mentre si trascina; se non c'è una carta in quella direzione si muove poco (resistenza).
// Al rilascio: oltre SWIPE_MIN_DISTANCE esce dal lato del gesto e la nuova entra dall'altro, altrimenti torna al centro.
const SWIPE_OUT_MS = 140;
let swipe = null;
function swipeStage() { return focusEl.querySelector('.ae-focus-stage'); }
// Carta e stato sopra (token del potere / vita del minion) si muovono insieme
function moveSwiped(transform, transition) {
  focusEl.querySelectorAll('.ae-focus-stage, .ae-focus-status').forEach(node => {
    node.style.transition = transition;
    node.style.transform = transform;
  });
}
function neighbourOf(step) {
  const i = queue.findIndex(e => e.uid === ui.viewedUid);
  return i >= 0 ? queue[i + step] : null;
}
focusEl.addEventListener('pointerdown', e => {
  if (!resolving || ui.holdUid || ui.isTransitioning || e.target.closest('button')) return;
  swipe = { x: e.clientX, y: e.clientY, id: e.pointerId, dx: 0, dragging: false };
});
focusEl.addEventListener('pointermove', e => {
  if (!swipe || e.pointerId !== swipe.id) return;
  const dx = e.clientX - swipe.x;
  const dy = e.clientY - swipe.y;
  if (!swipe.dragging) {
    if (Math.abs(dx) < DRAG_THRESHOLD || Math.abs(dx) <= Math.abs(dy)) return;
    swipe.dragging = true;
    try { focusEl.setPointerCapture(e.pointerId); } catch (_) {}
  }
  const stage = swipeStage();
  if (!stage) return;
  swipe.dx = neighbourOf(dx < 0 ? 1 : -1) ? dx : dx * 0.25;
  moveSwiped(`translateX(${swipe.dx}px)`, 'none');
});
function endSwipe(e, cancelled) {
  if (!swipe || (e && e.pointerId !== swipe.id)) return;
  const { dx, dragging } = swipe;
  swipe = null;
  const stage = swipeStage();
  if (!dragging || !stage) return;
  const step = dx < 0 ? 1 : -1;
  const next = neighbourOf(step);
  if (!cancelled && next && Math.abs(dx) >= SWIPE_MIN_DISTANCE) {
    // Esce dal lato del gesto, poi la carta vicina entra dal lato opposto
    const out = -step * (focusEl.clientWidth / 2 + stage.offsetWidth / 2);
    moveSwiped(`translateX(${out}px)`, `transform ${SWIPE_OUT_MS}ms ease-in`);
    ui.isTransitioning = true;
    setTimeout(() => {
      ui.isTransitioning = false;
      ui.slidePx = step * Math.round(stage.offsetWidth * 0.5);
      moveView(step);
    }, SWIPE_OUT_MS);
  } else {
    moveSwiped('', 'transform 180ms var(--ae-ease-decelerate)');
  }
}
focusEl.addEventListener('pointerup', e => endSwipe(e, false));
focusEl.addEventListener('pointercancel', e => endSwipe(e, true));

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
menuBtn.addEventListener('click', openStart);
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
