// 01-testi-stato.js: Testi (dizionario italiano), elementi della pagina, costanti e stato. Caricato in ordine da script.js insieme agli altri file di js/ (script classici, variabili globali).
// Aeon's End – Nemesis Companion (App 0.2). Documentazione completa: CONTESTO_SVILUPPO.md.
// Repository autonomo: dati (cards.json, products.json, deck-setup.json, nemesis.json) e scansioni delle carte (Data/)
// sono in questa cartella, letti con DATA_ROOT; le miniature sono in thumbs/ con lo stesso percorso (cards.json,
// products.json, Data/ e thumbs/ li genera dal DataBase tools/import-db.py).
// La partita si salva con una chiave propria (il sito condivide il dominio, e quindi il localStorage, con AeonsEnd_APP);
// dalla v210 il salvataggio ha un numero di versione (SAVE_VERSION): quelli senza si ignorano e si cancellano.
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
//   9. Eventi, testata (mazzo e scarti), animazioni di volo, passaggio tra i turni, vittoria, creazione del mazzo,
//      undo sospeso, "Pesca carta", menu laterale e avvio
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
  nemesisButton: 'Turno Nemesi',
  turnN: n => `Turno ${n}`,
  ctaPowerNext: 'Vai avanti',
  ctaPowerLast: 'Effetto risolto e scarta',
  turnInfo: (turn, deck) => `Turno ${turn} · Mazzo ${deck}`,
  discardButton: n => `Scarti ${n}`,
  discardButtonLabel: n => `Apri gli scarti, ${n} ${n === 1 ? 'carta' : 'carte'}`,
  discardTitle: n => `Scarti · ${n}`,
  types: { Minion: 'Minion', Power: 'Potere', Attack: 'Attacco' },
  hp: (hp, max) => `${hp}/${max}`,
  hpLong: (hp, max) => `${hp} punti vita su ${max}`,
  hpOnly: hp => `${hp} punti vita`,
  hpUnknown: 'Vita da impostare: tocca la carta',
  tokens: n => (n === 1 ? '1 token' : `${n} token`),
  tokensLeft: n => (n === 1 ? '1 token rimasto' : `${n} token rimasti`),
  cardOf: (i, n) => `carta ${i} di ${n}`,
  newTag: 'Nuova',
  nextCard: 'Prossima carta da pescare, coperta',
  ctaResolved: 'Effetto risolto',
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
  hpDelta: d => `${d > 0 ? '+' : '−'}${Math.abs(d)} HP`,
  hpLeftToast: (name, hp) => `${name}: ${hp} ${hp === 1 ? 'punto vita rimasto' : 'punti vita rimasti'}`,
  minionDeleted: name => `${name}: minion eliminato, negli scarti`,
  removePower: 'Rimuovi carta · costo pagato',
  removePowerShort: 'Rimuovi · costo pagato',
  notRemovable: 'Non rimovibile',
  paidNote: 'Costo pagato',
  killedNote: 'Ucciso',
  undoAction: 'Annulla ultima azione',
  buildDeck: 'Crea mazzo',
  gameStarted: 'Partita iniziata',
  tierN: n => 'Tier ' + n,
  deckBuildTitle: 'Mazzo nemesi',
  deckBuildKinds: { basic: 'Base', upgraded: 'Potenziate', specific: 'Specifiche' },
  deckBuildPile: (n, kind, tier) => n + ' carte ' + kind + ' Tier ' + tier,
  baseBox: 'Scatola base',
  myCollection: 'La mia collezione',
  collectionHint: 'Spunta quello che possiedi: nemesi e carte nemesi usciranno solo da questi prodotti.',
  collectionSave: 'Salva collezione',
  collectionLocked: 'Non ancora disponibile',
  collectionSaved: 'Collezione salvata',
  collectionSummary: (w, p) => `${w} wave · ${p} ${p === 1 ? 'prodotto' : 'prodotti'}`,
  victoryTitle: 'Vittoria',
  nemesisKilled: 'Nemesi uccisa',
  statsTitle: 'Statistiche',
  statsRows: {
    turns: 'Turni nemesi',
    played: 'Carte giocate del mazzo nemesi',
    left: 'Carte rimanenti nel mazzo',
    minionsKilled: 'Minion uccisi',
    powersPaid: 'Poteri scartati pagando il costo',
    powersResolved: 'Poteri risolti',
    aetherSpent: 'Æ spesi per i poteri',
    attacksResolved: 'Attacchi risolti'
  },
  statsLists: {
    played: 'Carte giocate',
    left: 'Carte rimanenti',
    minionsKilled: 'Minion uccisi',
    powersPaid: 'Poteri scartati',
    powersResolved: 'Poteri risolti',
    attacksResolved: 'Attacchi risolti'
  },
  statsTimeTitle: 'Tempi',
  statsMinionsTitle: 'Turni in gioco dei minion',
  statsMagesTitle: 'Statistiche maghi',
  statsMagesHead: ['Mago', 'Danni minion', 'Minion uccisi', 'Poteri scartati', 'Æ spesi'],
  statsNoMinions: 'Nessun minion in gioco in questa partita',
  minionTurns: n => (n === 1 ? '1 turno' : `${n} turni`),
  stillInPlay: 'ancora in gioco',
  drawCard: 'Pesca carta',
  putBack: 'Rimetti nel mazzo',
  discardDrawn: 'Scarta',
  deckCardTitle: 'Carta pescata dal mazzo',
  cardPutBack: name => `${name}: rimessa in cima al mazzo`,
  cardDiscarded: name => `${name}: negli scarti`,
  backAgainToExit: 'Premi di nuovo Indietro per uscire',
  rotatePhone: 'Gira il telefono in verticale',
  saveChanges: 'Salva modifiche',
  cancelChanges: 'Annulla modifiche',
  minionKilled: name => `${name}: ucciso, andrà negli scarti`,
  deckLabel: n => `Mazzo nemesi, ${n} ${n === 1 ? 'carta' : 'carte'}`,
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
  addCollection: 'Inserisci collezione',
  collectionEmptyHint: 'Prima inserisci la tua collezione',
  nemesisMissingTitle: 'Nemesi non più presente in collezione',
  nemesisMissingText: (name, product) => `${name} (${product}) non è più nella tua collezione. Con Continua la rimetto nella collezione e riprendi la partita.`,
  continueLabel: 'Continua',
  drawFirstTurnCard: 'Pesca la prima carta turno',
  endTurnShuffle: 'Fine turno · Mischia mazzo',
  ctaPutInPlayShuffle: 'Metti in gioco · Mischia mazzo',
  emptyHintStart: 'Premi «Pesca carta turno» per iniziare',
  emptyHintWait: 'Le carte arrivano nel turno della nemesi',
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
  notInCollection: 'Non in collezione',
  notInCollectionNemesis: name => `${name}, non presente nella collezione`,
  slideToBuild: 'Scorri per creare il mazzo',
  slideToBuildLabel: 'Crea mazzo: trascina a destra',
  specificTitle: 'Carte Nemesi Specifiche',
  restartGame: 'Ricomincia la partita',
  // Opzioni del mazzo nella pagina Nuova partita (v213)
  deckOptions: 'Mazzo nemesi',
  battleMode: 'Modalità battaglia',
  battleModeNote: 'Carte della battaglia della nemesi. Spenta: setup standard (battaglia 1, solo Basic)',
  mergeCollection: 'Unisci le carte della collezione',
  mergeCollectionNote: 'Basic e Upgraded di tutta la collezione. Spenta: solo della wave della nemesi',
  mergeLocked: wave => `La wave ${wave} non ha carte Upgraded: si usano quelle della collezione`,
  deckShort: (have, want) => `Il mazzo avrà ${have} carte Basic e Upgraded invece di ${want}: nella collezione non ce ne sono abbastanza`,
  gameSetupTitle: 'Impostazioni della partita',
  options: 'Opzioni',
  mainMenu: 'Menu iniziale',
  exit: 'Esci',
  wave: 'Wave',
  holdToExit: 'Tieni premuto per uscire',
  exitGameLabel: 'Esci dalla partita: tieni premuto',
  exitConfirmTitle: 'Uscire dalla partita?',
  exitConfirmText: 'Torni al menu iniziale.',
  exitConfirm: 'Esci',
  statsListEmpty: 'Nessuna carta',
  statsHp: hp => `HP ${hp}`,
  players: n => (n === 1 ? '1 giocatore' : `${n} giocatori`),
  undone: 'Azione annullata',
  menu: 'Menu',
  menuTurn: 'Turno nemesi',
  menuDeck: 'Carte nel mazzo',
  background: 'Sfondo',
  backgroundChosen: name => `Sfondo: ${name}`,
  backgrounds: { masked: 'Nemesi mascherata', horned: 'Demone cornuto', maw: 'Bocca con tentacoli' },
  cardBack: 'Dorso delle carte',
  cardBackChosen: name => `Dorso: ${name}`,
  cardBacks: {
    logo: "Logo Aeon's End", owlRed: 'Gufo rosso', lily: 'Giglio', plaid: 'Tartan', owlGold: 'Gufo oro',
    crystals: 'Cristalli viola', veins: 'Venature', mask: 'Maschera spezzata', demon: 'Demone', tentacles: 'Tentacoli',
    ruins: 'Rovine', runeCircle: 'Cerchio di rune', runesRed: 'Rune rosse',
    blueFlame: 'Fiamma blu', glassCrystal: 'Cristallo in vetrata', popCrystal: 'Cristallo pop', violetPortal: 'Portale viola',
    blueCrystals: 'Cristalli azzurri', fireVortex: 'Vortice di fuoco', crackedStone: 'Pietra fessurata',
    gothicGlass: 'Vetrata gotica', watercolor: 'Acquerello', popArt: 'Pop art', minimal: 'Minimalista',
    impressionist: 'Impressionista', geometric: 'Geometrico', ink: 'Inchiostro', organic: 'Organico', arcane: 'Diagramma arcano'
  },
  selectAll: 'Seleziona tutto',
  deselectAll: 'Deseleziona tutto',
  trackPlayer: n => `Turno del giocatore ${n}`,
  trackWild: 'Turno wild: sceglie il gruppo',
  trackWildOf: n => `Turno wild del giocatore ${n}`,
  trackNemesisName: 'Nemesi',
  trackResolve: 'Risolvi',
  trackDraw: 'Pesca',
  trackNemesisResolve: 'Turno nemesi, fase di risoluzione',
  trackNemesisDraw: 'Turno nemesi, fase di pesca',
  trackPosition: (i, n) => `turno ${i} di ${n} del mazzo dei turni`,
  endTurn: 'Fine turno · Pesca ordine turno',
  trackPlayerName: n => `Giocatore ${n}`,
  trackWildName: 'Wild',
  trackPairChoose: (a, b) => `Turno del giocatore ${a} o ${b}: scegliete chi gioca`,
  turnPairsOption: 'Carte turno 1/2 e 3/4',
  turnPairsHint: 'Ordine turno della wave 4, con 4 giocatori',
  drawTurnCard: 'Pesca carta turno',
  trackWaiting: 'Carta turno da pescare',
  pairChoiceTitle: 'Chi gioca questo turno?',
  // Mazzo dei turni (v206)
  turnDeckHint: 'tocca per il mazzo dei turni',
  turnPairName: (a, b) => `Giocatore ${a} o ${b}`,
  turnDeckTitle: 'Mazzo dei turni',
  turnPileLabel: 'Scarti dei turni',
  turnPileEmpty: 'Nessuna carta',
  // Finestra del mazzo dei turni (v211)
  turnDeckEmpty: 'Mazzo vuoto',
  turnDeckLabel: 'Mazzo',
  turnRevealAll: 'Rivela tutto',
  turnRevealAllLabel: 'Rivela tutto il mazzo dei turni',
  turnCoverAll: 'Copri tutto',
  turnCoverAllLabel: 'Copri tutto il mazzo dei turni',
  turnRevealTopLabel: 'Rivela la carta in cima',
  turnTopEnd: 'Cima',
  turnBottomEnd: 'Fondo',
  turnZoneTop: 'Metti in cima al mazzo',
  turnZoneBottom: 'Metti in fondo al mazzo',
  turnCurrent: 'in corso',
  turnCovered: 'Carta coperta',
  turnDeckCardLabel: (name, n, total) => `${name}, carta ${n} di ${total} dalla cima`,
  turnPileCardLabel: (name, current) => current ? `${name}, turno in corso` : name,
  turnLockedLabel: name => `${name}, turno nemesi in corso: resta negli scarti`,
  turnHint: 'Trascina una carta scoperta, oppure toccala e poi tocca dove metterla.',
  turnSelected: name => `Selezionata: ${name}. Tocca dove metterla.`,
  turnShuffleDeck: 'Mescola',
  turnResetAll: 'Annulla tutte le modifiche',
  turnExitTitle: 'Uscire senza salvare?',
  turnExitText: 'Le modifiche al mazzo dei turni si perdono.',
  turnExitGo: 'Esci',
  turnSaved: 'Mazzo dei turni aggiornato',
  pairChoiceLabel: n => `Giocatore ${n}`,
  ctaPutInPlayEnd: 'Metti in gioco · Fine turno nemesi',
  // Minion con vita "?" (v218)
  ctaSetHp: 'Imposta la vita',
  setHpOf: name => `Imposta la vita di ${name}`,
  statsTime: 'Tempo di partita',
  statsTierTime: n => `Tempo nel Tier ${n}`,
  statsTimeUnknown: '—',
  newGameTitle: 'Nuova partita',
  backToMenu: 'Torna al menu iniziale',
  wavesNone: 'Nessuna wave',
  wavesMore: (first, n) => `${first} + ${n}`,
  wavesLabel: 'Scegli le wave',
  randomNemesis: 'Nemesi a caso tra quelle della collezione',
  exitGame: 'Esci dalla partita',
  // Modalità test (v215)
  testMenu: 'Test',
  testTitle: 'Test',
  testHint: 'Scegli uno scenario: la partita di test parte già in quel momento. Non si salva e non cambia la partita salvata né la collezione.',
  testLabel: name => `TEST · ${name}`,
  testExit: 'Esci dal test',
  testRestart: 'Ricomincia lo scenario',
  testFailed: why => `Lo scenario non parte: ${why}`,
  testCardMissing: name => `la carta «${name}» non è in cards.json`,
  testCardAmbiguous: name => `il nome «${name}» è di più carte: serve il boxCode`,
  testNotReady: 'dati non ancora caricati'
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
let cancelDraftsBtn = null; // "Annulla modifiche", creato in fondo (vicino agli altri pulsanti)
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

// Durate (ms) delle animazioni dopo un'azione (come in design-tokens.css); con riduzione movimento al massimo 100ms.
// Durante queste animazioni il pulsante principale non accetta altri tocchi.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const DURATION = { token: 220, discard: 240, focus: 220, phase: 280 };
const DRAW_MS = 350;
function duration(name) {
  return reducedMotion.matches ? Math.min(100, DURATION[name]) : DURATION[name];
}

// Dove si allinea la carta appena pescata nella coda: centro della carta a questa frazione della larghezza visibile
// (0.5 = al centro, come 'center')
const ANCHOR_RATIO = 0.5;

// Partita salvata nel browser (localStorage) e numero massimo di passi di undo conservati.
// lorenzvittori.github.io è lo stesso dominio per tutti i siti: la chiave è diversa da quella di AeonsEnd_APP
// (aeonsend-save-v1) e del suo prototipo new_design_0.2 (aeonsend-clone-save-v2), così le partite non si sovrascrivono.
const SAVE_KEY = 'aeonsend-app-0.2-save';
// v210: carte del DataBase (id e campi nuovi): i salvataggi con un'altra versione (o senza) si ignorano e si cancellano
const SAVE_VERSION = 2;
// Partita di test in corso (Modalità test, v215; SCENARI più in basso): { id, name, pairs, turnCards, prevSettings }.
// Con un test in corso save() non scrive niente: la partita salvata vera non cambia
let testRun = null;
const UNDO_LIMIT = 300;

// Cartella da cui si leggono dati e scansioni delle carte ('' = questa)
const DATA_ROOT = '';
// Miniature WebP della coda (264 x 369, il doppio di 132 px): stesso percorso dell'immagine con thumbs/ al posto di Data/
const THUMB_DIR = 'thumbs/';
// Dorso delle carte nemesi: mazzo, carta da pescare, creazione del mazzo. Si sceglie nel Menu ("Dorso delle carte"); la
// scelta resta salvata nel browser e non fa parte della partita. Predefinito: il logo Aeon's End.
// Ogni dorso è 630 x 880 WebP con una miniatura 150 x 210 per la scelta (Assets/ui/backs/).
const CARD_BACK_KEY = 'aeonsend-app-0.2-card-back';
const CARD_BACKS = [
  { id: 'logo', src: 'Assets/ui/decor/card-back-logo.webp', thumb: 'Assets/ui/backs/logo-thumb.webp' },
  ...['owlRed:owl-red', 'owlGold:owl-gold', 'lily:lily', 'plaid:plaid', 'crystals:crystals', 'veins:veins', 'mask:mask',
    'demon:demon', 'tentacles:tentacles', 'ruins:ruins', 'runeCircle:rune-circle', 'runesRed:runes-red',
    'blueFlame:blue-flame', 'glassCrystal:glass-crystal', 'popCrystal:pop-crystal', 'violetPortal:violet-portal',
    'blueCrystals:blue-crystals', 'fireVortex:fire-vortex', 'crackedStone:cracked-stone', 'gothicGlass:gothic-glass',
    'watercolor:watercolor', 'popArt:pop-art', 'minimal:minimal', 'impressionist:impressionist', 'geometric:geometric',
    'ink:ink', 'organic:organic', 'arcane:arcane']
    .map(s => { const [id, file] = s.split(':'); return { id, src: `Assets/ui/backs/${file}.webp`, thumb: `Assets/ui/backs/${file}-thumb.webp` }; })
];
function currentCardBack() {
  let id = null;
  try { id = localStorage.getItem(CARD_BACK_KEY); } catch (err) { /* si usa quello predefinito */ }
  return CARD_BACKS.find(b => b.id === id) || CARD_BACKS[0];
}
let CARD_BACK = currentCardBack().src;
// Il dorso dietro la carta che si gira (style.css .ae-flip-face--front) segue la stessa scelta
document.documentElement.style.setProperty('--ae-card-back', `url("${CARD_BACK}")`);
function setCardBack(id) {
  try { localStorage.setItem(CARD_BACK_KEY, id); } catch (err) { console.warn(err); }
  CARD_BACK = currentCardBack().src;
  document.documentElement.style.setProperty('--ae-card-back', `url("${CARD_BACK}")`);
  loadImage(CARD_BACK);
}

// Tutte le carte (cards.json) e la tabella Nemesis Deck Setup (deck-setup.json), lette all'avvio
let allCards = [];
let cardsById = new Map();
let deckSetup = null;
// Nemesi con prodotto (boxCode) e battaglia (nemesis.json)
let nemeses = [];
// Prodotti (products.json): { "4": "The New Age", "4.1": "Shattered Dreams", ... }; la wave è la parte prima del punto
let products = {};

// Scelte della pagina iniziale: giocatori, nemesi (da cui dipende la battaglia) e se usare le Upgraded Basic
let settings = { players: 2, nemesis: null, includeUpgraded: true };
// Immagini delle nemesi per il menu (Assets/nemesis/nemesis-art.json, fatto da tools/import-db.py):
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
// Mazzo dei turni (v168): 6 carte come nel gioco, estratte a caso alla fine di ogni turno; finite le 6 si rimescola.
// 'p1'..'p4' = giocatori, 'wild' = jolly (con 3 giocatori, sceglie il gruppo), 'nemesis' = nemesi.
// left: carte ancora da estrarre in questo giro; drawn: carte estratte in ordine (l'ultima è il turno in corso).
// round: giri del mazzo dei turni cominciati (v169: è il "Turno N" della testata)
let turnOrder = { left: [], drawn: [], round: 0 };
// Tier più alto pescato finora: alla prima carta del Tier 2 e del Tier 3 compare la scritta "Tier N"
let maxTierDrawn = 0;
// Statistiche della partita (finestra Statistiche della Vittoria). Fanno parte della partita: entrano nel salvataggio e
// nell'undo. minions: minion usciti dal gioco uccisi, con i turni nemesi passati da quando erano stati pescati.
let stats = emptyStats(0);
// cards: id delle carte di ogni gruppo (elenchi delle Statistiche); i salvataggi vecchi non li hanno (elenchi vuoti)
// startedAt / tierAt[2|3] / endedAt: istanti (Date.now) di inizio partita, prima carta del Tier 2 e del Tier 3 pescata,
// prima Vittoria. Salvataggi vecchi: null (il tempo non si mostra)
// mages (v175): per ogni carta giocatore del mazzo dei turni ('p1'..'p4', 'wild') quello che è stato salvato nel suo
// turno: { damage, powers, kills } (danni ai minion, poteri scartati pagando, minion uccisi)
function emptyStats(deckSize) {
  return Regole.emptyStats(deckSize);
}
// Aggiunge una carta all'elenco di un gruppo delle statistiche
function statCard(group, data) {
  Regole.statCard(stats, group, data);
}

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
  tierBanner: null,       // Tier da annunciare al prossimo render ("Tier 2" / "Tier 3")
  fromScroll: false,      // render causato dallo scorrimento del carosello col dito (non va ricentrato)
  bgSlideUntil: 0,        // fine dello scorrimento dello sfondo verso il lato della nemesi
  autoTokenKey: null,     // potere da risolvere su cui è partita l'animazione del token ...
  autoTokenAt: 0,         // ... e quando è partita (la fascia e la carta grande restano allineate)
  deckBuilding: false,    // schermata "Crea mazzo" prima del primo turno giocatori
  deckShown: null,        // durante "Crea mazzo": carte già arrivate nel mazzo in alto (null = mazzo vero)
  gameSaved: false,       // la partita in corso è già stata scritta nel browser (save)
  deckDark: false         // sfondo nero da "Crea mazzo" fino alla fine del banner "Partita iniziata"
};

