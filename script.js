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
  turnHint: 'Trascina una carta scoperta, oppure toccala e poi tocca dove metterla. Il mazzo si legge da sinistra: la prima carta è la cima.',
  turnSelected: name => `Selezionata: ${name}. Tocca dove metterla.`,
  turnShuffleDeck: 'Mescola',
  // new_turn: riga unica scarti | mazzo
  turnPileTitle: 'Scarti',
  turnDeckRowTitle: 'Mazzo turno',
  turnShuffleLabel: 'Mescola il mazzo dei turni',
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
function emptyStats(deckSize) {
  // cards: id delle carte di ogni gruppo (elenchi delle Statistiche); i salvataggi vecchi non li hanno (elenchi vuoti)
  // startedAt / tierAt[2|3] / endedAt: istanti (Date.now) di inizio partita, prima carta del Tier 2 e del Tier 3 pescata,
  // prima Vittoria. Salvataggi vecchi: null (il tempo non si mostra)
  // mages (v175): per ogni carta giocatore del mazzo dei turni ('p1'..'p4', 'wild') quello che è stato salvato nel suo
  // turno: { damage, powers, kills } (danni ai minion, poteri scartati pagando, minion uccisi)
  return { deckSize, minionsKilled: 0, powersPaid: 0, powersResolved: 0, aetherSpent: 0, attacksResolved: 0, minions: [], mages: {},
    cards: { minionsKilled: [], powersPaid: [], powersResolved: [], attacksResolved: [] },
    startedAt: null, tierAt: {}, endedAt: null };
}
// Aggiunge una carta all'elenco di un gruppo delle statistiche
function statCard(group, data) {
  if (!stats.cards) stats.cards = emptyStats(0).cards;
  if (!Array.isArray(stats.cards[group])) stats.cards[group] = [];
  stats.cards[group].push(data.id);
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
// collezione", salvate nel browser). Un prodotto ha per id il suo codice di products.json: "4" = scatola base della
// wave 4, "4.1" = Shattered Dreams... (v210; prima "<wave>|base" / "<wave>|<mini espansione>", convertiti all'avvio).
// Le nemesi e le carte Basic / Upgraded si usano solo se il loro prodotto (boxCode) è nella collezione.
const COLLECTION_KEY = 'aeonsend-app-0.2-collection';
let collection = null; // Set di codici prodotto

// Wave di un codice prodotto: la parte prima del punto ("4.1" -> "4")
function waveOfCode(code) {
  return code === null || code === undefined ? null : String(code).split('.')[0];
}
function isMiniCode(code) {
  return code !== null && code !== undefined && String(code).includes('.');
}
function productName(code) {
  return products[code] || String(code);
}
function waveOfNemesis(info) {
  return waveOfCode(info.boxCode);
}
function productOfNemesis(info) {
  return info.boxCode;
}

// Tutti i prodotti per wave, nell'ordine delle wave: [{ wave, products: [{ id, name, isBase }] }]
function collectionCatalog() {
  const codes = Object.keys(products);
  const waves = codes.filter(c => !isMiniCode(c)).sort((a, b) => Number(a) - Number(b));
  return waves.map(wave => ({
    wave,
    products: [{ id: wave, name: I18N_IT.baseBox, isBase: true },
      ...codes.filter(c => isMiniCode(c) && waveOfCode(c) === wave).sort((a, b) => Number(a.split('.')[1]) - Number(b.split('.')[1]))
        .map(c => ({ id: c, name: productName(c), isBase: false }))]
  }));
}

// Chiave della collezione salvata prima della v210 ("4 - The New Age|Shattered Dreams") -> codice ("4.1"); null se
// non si trova. Le chiavi già nuove restano come sono.
function convertCollectionKey(id) {
  id = String(id);
  if (!id.includes('|')) return Object.prototype.hasOwnProperty.call(products, id) ? id : null;
  const [wavePart, name] = id.split('|');
  const m = /^(\d+)/.exec(wavePart.trim());
  if (!m) return null;
  const wave = m[1];
  if (name === 'base') return Object.prototype.hasOwnProperty.call(products, wave) ? wave : null;
  return Object.keys(products).find(c => waveOfCode(c) === wave && products[c] === name) || null;
}

// Per ora (v199) nella collezione si possono scegliere solo la wave 1 e la wave 4, con le loro mini espansioni; le
// altre wave si vedono ma sono disattivate e non restano nella collezione
const COLLECTION_WAVES = [1, 4];
function collectionWaveEnabled(wave) {
  return COLLECTION_WAVES.includes(parseInt(String(wave), 10));
}
function loadCollection() {
  try {
    const saved = JSON.parse(localStorage.getItem(COLLECTION_KEY));
    if (Array.isArray(saved)) {
      // Chiavi di prima della v210 convertite nei codici prodotto e risalvate (la collezione non si perde)
      const converted = saved.map(convertCollectionKey).filter(Boolean);
      collection = new Set(converted.filter(id => collectionWaveEnabled(waveOfCode(id))));
      if (saved.some(id => String(id).includes('|'))) saveCollection();
      return;
    }
  } catch (err) { /* collezione illeggibile: si riparte da quella predefinita */ }
  // Nuovi utenti (v194): collezione vuota; nel menu iniziale compare "Inserisci collezione"
  collection = new Set();
}

function saveCollection() {
  try { localStorage.setItem(COLLECTION_KEY, JSON.stringify([...collection])); } catch (err) { console.warn(err); }
}

function ownsProduct(id) {
  return !collection || collection.has(id);
}

// Carta Basic / Upgraded ammessa: il suo prodotto (boxCode) è nella collezione (o non si sa di che prodotto è)
function cardAllowed(card) {
  return !card.boxCode || ownsProduct(card.boxCode);
}

// (v210-v213: le nemesi con un minion a vita variabile nel mazzo non si potevano giocare; dalla v214 sì: il minion entra
// in gioco con la vita "?" e la si imposta nella finestra della vita, vedi makeEntry / hpUnset)

// Un boss si può scegliere solo se ha un prodotto e una battaglia, le sue carte sono nel progetto e il suo prodotto è
// nella collezione
function isPlayable(info) {
  return !!info.boxCode && info.battle !== null && ownsProduct(productOfNemesis(info))
    && allCards.some(c => c.category === 'Specific' && c.nemesis === info.name);
}

// --- Opzioni del mazzo (v213), nella pagina Nuova partita sopra la wave ---
// battleMode ("Modalità battaglia"): attivo = numeri di deck-setup.json per la battaglia della nemesi (Basic +
//   Upgraded); spento = setup standard, sempre la riga della battaglia 1 (solo Basic), qualunque sia la battaglia.
// mergeCollection ("Unisci le carte della collezione"): attivo = Basic e Upgraded da tutti i prodotti della collezione;
//   spento = solo dai prodotti della collezione della stessa wave della nemesi (scatola base + mini espansioni).
// Preferenza del browser (DECK_OPTIONS_KEY), ricordata tra le partite e copiata in settings della partita (salvataggio,
// "Ricomincia la partita"). Salvataggi senza i campi: entrambe attive (come prima della v213); il vecchio
// settings.includeUpgraded non si usa più.
const DECK_OPTIONS_KEY = 'aeonsend-app-0.2-deck-options';
function loadDeckOptions() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(DECK_OPTIONS_KEY)); } catch (err) { /* predefinite */ }
  return { battleMode: !(saved && saved.battleMode === false), mergeCollection: !(saved && saved.mergeCollection === false) };
}
function saveDeckOptions() {
  try {
    localStorage.setItem(DECK_OPTIONS_KEY, JSON.stringify({ battleMode: settings.battleMode !== false, mergeCollection: settings.mergeCollection !== false }));
  } catch (err) { console.warn(err); }
}
// Riga di deck-setup.json usata dal mazzo: la battaglia della nemesi o, senza "Modalità battaglia", la battaglia 1
// (con le Upgraded a 0). null se la nemesi non ha battaglia
function deckSetupRow(s = settings) {
  const battleMode = s.battleMode !== false;
  const battle = deckSetup.battles.find(b => b.battle === (battleMode ? battleOf(s.nemesis) : 1));
  const row = battle && battle.players[String(s.players)];
  if (!row) return null;
  return battleMode ? row : { basic: row.basic, upgradedBasic: { 1: 0, 2: 0, 3: 0 } };
}
// Carte Upgraded del mazzo nemesi nei prodotti posseduti di una wave
function ownedUpgradedInWave(wave) {
  return allCards.some(c => c.category === 'Upgraded' && c.inNemesisDeck === true && c.boxCode
    && waveOfCode(c.boxCode) === wave && ownsProduct(c.boxCode));
}
// Conflitto (decisione dell'utente): con "Modalità battaglia" la battaglia chiede carte Upgraded ma la wave della
// nemesi, nella collezione, non ne ha: "Unisci" resta acceso e bloccato. Restituisce la wave (o null se non c'è blocco)
function mergeLockedWave(s = settings) {
  if (s.battleMode === false) return null;
  const info = nemeses.find(n => n.name === s.nemesis);
  const row = deckSetupRow(s);
  if (!info || !info.boxCode || !row) return null;
  const wantsUpgraded = [1, 2, 3].some(t => (row.upgradedBasic[t] || 0) > 0);
  const wave = waveOfNemesis(info);
  return wantsUpgraded && !ownedUpgradedInWave(wave) ? wave : null;
}
function mergeActive(s = settings) {
  return s.mergeCollection !== false || !!mergeLockedWave(s);
}
// Carte Basic / Upgraded che possono entrare nel mazzo per un Tier: della collezione e, senza "Unisci", della wave
// della nemesi
function deckPool(category, tier, s = settings) {
  const info = nemeses.find(n => n.name === s.nemesis);
  const wave = info ? waveOfNemesis(info) : null;
  const merge = mergeActive(s);
  return allCards.filter(c => c.category === category && c.inNemesisDeck === true && c.tier === tier && cardAllowed(c)
    && (merge || waveOfCode(c.boxCode) === wave));
}
// Carte che mancano rispetto a deck-setup.json (per la riga di avviso prima di "Inizia partita"): { want, have }
function deckShortfall(s = settings) {
  const row = deckSetupRow(s);
  if (!row) return null;
  let want = 0;
  let have = 0;
  [1, 2, 3].forEach(t => {
    const b = row.basic[t] || 0;
    const u = row.upgradedBasic[t] || 0;
    want += b + u;
    have += Math.min(b, deckPool('Basic', t, s).length) + Math.min(u, deckPool('Upgraded', t, s).length);
  });
  return have < want ? { want, have } : null;
}

// Mazzo per la battaglia del boss scelto (Nemesis Deck Setup): per ogni Tier si estraggono a caso le carte base e
// potenziate indicate nella tabella (deckSetupRow, con le opzioni del mazzo) e si aggiungono le carte specifiche del
// nemico di quel Tier. Se le carte della collezione non bastano, il Tier esce più corto.
// Ogni Tier è mescolato a parte; si pesca dalla fine, quindi in cima c'è il Tier 1 e in fondo il Tier 3.
// Restano fuori le carte che non sono del mazzo nemesi (inNemesisDeck false: World Devourer, maledizione...).
// Ultimo mazzo creato: carte prese da ogni mazzo (Tier × Base / Potenziate / Specifiche)
let deckPlan = [];
function buildDeck() {
  deckPlan = [];
  // Nessuna nemesi giocabile (per esempio collezione vuota, v194): mazzo vuoto, si sceglie dopo
  const setup = deckSetupRow();
  if (!setup) return [];
  const result = [];
  [3, 2, 1].forEach(tier => {
    // solo le carte del mazzo nemesi (inNemesisDeck) di quel Tier
    const ofTier = c => c.inNemesisDeck === true && c.tier === tier;
    const basic = pickRandom(deckPool('Basic', tier), setup.basic[tier] || 0);
    const upgraded = pickRandom(deckPool('Upgraded', tier), setup.upgradedBasic[tier] || 0);
    const specific = allCards.filter(c => c.category === 'Specific' && c.nemesis === settings.nemesis && ofTier(c));
    // Quante carte vengono da ognuno dei 9 mazzi (per la schermata "Crea mazzo")
    deckPlan.push({ tier, kind: 'basic', count: basic.length }, { tier, kind: 'upgraded', count: upgraded.length },
      { tier, kind: 'specific', count: specific.length });
    result.push(...shuffle([...basic, ...upgraded, ...specific]));
  });
  return result;
}

// Nuova partita: mazzo nuovo per le scelte correnti, scarti vuoti, turni a zero
function newGame() {
  deck = buildDeck();
  discard = [];
  turn = 0;
  maxTierDrawn = 0;
  stats = emptyStats(deck.length);
  stats.startedAt = Date.now();
  // Mazzo dei turni ancora da cominciare (v193): finito "Crea mazzo" si aspetta "Pesca carta turno" (drawFirstTurn)
  turnOrder = { left: [], drawn: [], round: 0, picks: {}, known: [], waiting: false, pairNext: emptyPairNext(), history: [] };
}
// Attesa della carta turno: nessun turno ancora cominciato nel giro (o, salvataggi v211-v221, waiting: turno annullato)
function awaitingTurnCard() {
  return !resolving && (!(turnOrder.history || []).length || !!turnOrder.waiting);
}
// "Pesca carta turno": estrae il primo turno; se è la nemesi parte subito il turno nemesi
function drawFirstTurn() {
  if (drawTurnCard() === 'nemesis') nemesisTurn();
}

// Carte del mazzo dei turni per il numero di giocatori (regole del gioco): 2 giocatori = due carte a testa,
// 3 giocatori = una a testa più il jolly, 4 giocatori = una a testa; sempre due carte nemesi
// Con 4 giocatori e l'opzione "Carte turno 1/2 e 3/4" (wave 4, v192, attiva di default): 1/2, 1/2, 3/4, 3/4
// ('p12', 'p34'); quando esce una carta x/y i giocatori scelgono chi gioca e l'altra carta x/y va all'altro giocatore
function turnOrderCards(players) {
  // Modalità test (v215): lo scenario può avere il suo mazzo dei turni
  if (testRun && testRun.turnCards) return testRun.turnCards.slice();
  const n = Math.max(1, Math.min(4, Number(players) || 2));
  const mine = n === 1 ? ['p1', 'p1', 'p1', 'p1'] : n === 2 ? ['p1', 'p1', 'p2', 'p2']
    : n === 3 ? ['p1', 'p2', 'p3', 'wild'] : turnPairsOn() ? ['p12', 'p12', 'p34', 'p34'] : ['p1', 'p2', 'p3', 'p4'];
  return mine.concat('nemesis', 'nemesis');
}
// Opzione del Menu (preferenza del browser, non della partita): vale dal prossimo giro del mazzo dei turni
const TURN_PAIRS_KEY = 'aeonsend-app-0.2-turn-pairs';
function turnPairsOn() {
  // Modalità test (v215): lo scenario può attivarle o spegnerle solo per sé, senza cambiare la preferenza
  if (testRun && typeof testRun.pairs === 'boolean') return testRun.pairs;
  try { return localStorage.getItem(TURN_PAIRS_KEY) !== 'off'; } catch (err) { return true; }
}
function setTurnPairs(on) {
  try { localStorage.setItem(TURN_PAIRS_KEY, on ? 'on' : 'off'); } catch (err) { console.warn(err); }
}
function isPairCard(kind) { return kind === 'p12' || kind === 'p34'; }
function pairOptions(kind) { return kind === 'p12' ? ['p1', 'p2'] : ['p3', 'p4']; }
// Giocatori della partita: 'p1'..'pN' (righe delle Statistiche maghi)
function playerKinds() {
  const n = Math.max(1, Math.min(4, Number(settings.players) || 2));
  return Array.from({ length: n }, (_, i) => 'p' + (i + 1));
}
// Estrae a caso una carta tra quelle rimaste (finite le 6 si rimescola). pick: solo le carte che lo soddisfano
// (serve per i salvataggi vecchi, senza mazzo dei turni)
// Giro nuovo: si rimescola e il contatore dei giri ("Turno N" nella testata) sale.
// Con 3 giocatori il jolly è uno dei giocatori (v179): al primo giro a caso, poi a ogni giro il successivo (1→2→3→1)
function shuffleTurnOrder() {
  const wild = Number(settings.players) === 3
    ? (turnOrder.wild ? (turnOrder.wild % 3) + 1 : 1 + Math.floor(Math.random() * 3)) : null;
  // v206: il mazzo è in ordine (left[0] = la carta in cima), mescolato qui; si pesca sempre dalla cima, così le carte
  // che guardano o riordinano il mazzo dei turni (Hissing Acid, Quartz Shard, Xaxos...) vedono le carte vere
  // known (v211): nessuna carta del mazzo è nota (scoperta) in un giro nuovo
  const left = shuffle(turnOrderCards(settings.players));
  // pairNext (v220): la memoria delle carte 1/2 e 3/4 NON si azzera a fine giro né quando si mescola
  // history (v222): la storia dei turni riparte vuota a ogni giro
  turnOrder = { left, drawn: [], round: (turnOrder.round || 0) + 1, wild, picks: {}, known: left.map(() => false), waiting: false,
    pairNext: emptyPairNext(turnOrder.pairNext), history: [] };
}
// Turno in corso = ultimo del giro (v194): mazzo dei turni vuoto; finendolo si mischia il mazzo e si aspetta "Pesca la
// prima carta turno"
function turnRoundOver() {
  return !!currentTurn() && !turnOrder.left.length;
}
// Fine di un turno: carta turno dopo, o a fine giro mazzo mischiato e attesa (null)
function nextTurnCard() {
  if (turnRoundOver()) { shuffleTurnOrder(); return null; }
  return drawTurnCard();
}
function drawTurnCard(pick) {
  if (!turnOrder.left.length) shuffleTurnOrder();
  // Dalla cima (v206); pick (salvataggi vecchi): la prima carta dall'alto che lo soddisfa
  let at = 0;
  if (pick) { const i = turnOrder.left.findIndex(pick); if (i >= 0) at = i; }
  const card = turnOrder.left.splice(at, 1)[0];
  if (Array.isArray(turnOrder.known)) turnOrder.known.splice(at, 1);
  turnOrder.drawn.push(card);
  turnOrder.waiting = false;
  const entry = { kind: card, player: null, forced: false, pos: turnOrder.drawn.length - 1 };
  // Carta 1/2 o 3/4 (v220): se la memoria della coppia dice a chi tocca, gioca lui senza scelta (OBBLIGATA) e la
  // memoria torna a "nessuno"; altrimenti si sceglie nella finestra "Chi gioca questo turno?" (chooseTurnPlayer)
  if (isPairCard(card)) {
    turnOrder.pairNext = emptyPairNext(turnOrder.pairNext);
    const next = turnOrder.pairNext[card];
    if (next) {
      turnOrder.picks = Object.assign({}, turnOrder.picks, { [turnOrder.drawn.length - 1]: { player: next, forced: true } });
      turnOrder.pairNext[card] = null;
      Object.assign(entry, { player: next, forced: true });
    }
  }
  // Storia dei turni del giro (v222): ogni carta pescata è un turno; l'ultimo è il turno in corso
  turnOrder.history = (turnOrder.history || []).concat(entry);
  return card;
}

// --- Storia dei turni del giro (v222) ---
// turnOrder.history = [{ kind, player, forced, pos }]: un elemento per ogni turno cominciato nel giro, nell'ordine;
// l'ultimo è il turno in corso. player: chi ha giocato una carta 1/2 o 3/4 (null finché non si sceglie; per le altre
// carte si ricava dal tipo, per il wild da turnOrder.wild). pos: posizione della carta negli scarti dei turni
// (turnOrder.drawn), null se la carta non è più negli scarti (rimessa nel mazzo dalla finestra del mazzo dei turni).
// La barra dei turni mostra la storia (turni passati e turno in corso) più le carte del mazzo: una carta rimessa nel
// mazzo resta come turno passato e compare anche come turno futuro; il turno in corso continua anche se la sua carta
// torna nel mazzo. Riparte vuota a ogni giro (shuffleTurnOrder).
function currentTurn(order = turnOrder) {
  if (order.waiting) return null;
  const h = order.history || [];
  return h.length ? h[h.length - 1] : null;
}
// Storia ricostruita dagli scarti dei turni (salvataggi di prima della v222): ogni carta negli scarti è un turno
function historyFromPile(order) {
  return (order.drawn || []).map((kind, i) => {
    const pick = isPairCard(kind) ? pickOf(order, i) : null;
    return { kind, player: pick ? pick.player : null, forced: !!(pick && pick.forced), pos: i };
  });
}
// Giocatore di un turno della storia: 'p1'..'p4' (wild: chi è wild nel giro), null per la nemesi o per una 1/2 o 3/4
// non ancora scelta
function historyPlayer(entry) {
  if (!entry) return null;
  if (entry.kind === 'wild') return turnOrder.wild ? 'p' + turnOrder.wild : null;
  if (isPairCard(entry.kind)) return entry.player || null;
  return entry.kind && entry.kind !== 'nemesis' ? entry.kind : null;
}
// Giocatori dedotti per le carte 1/2 e 3/4 del mazzo dei turni (dalla cima), seguendo la memoria delle coppie: una
// carta obbligata ha il suo giocatore; dopo una carta da scegliere quelle della stessa coppia non si sanno
function predictedPairPlayers(order) {
  const mem = emptyPairNext(order.pairNext);
  const unknown = { p12: false, p34: false };
  return (order.left || []).map(kind => {
    if (!isPairCard(kind) || unknown[kind]) return null;
    if (mem[kind]) { const p = mem[kind]; mem[kind] = null; return p; }
    unknown[kind] = true;
    return null;
  });
}

// --- Carte turno 1/2 e 3/4: memoria per coppia (v220) ---
// pairNext: { p12: null | 'p1' | 'p2', p34: null | 'p3' | 'p4' } = a chi tocca la prossima carta della coppia (null:
// si sceglie). Dura tra un giro e l'altro; riparte da "nessuno" con Nuova partita e "Ricomincia la partita" (newGame).
// picks[pos] = { player, forced } per ogni carta della coppia negli scarti dei turni: chi l'ha giocata e se era scelta
// (forced false) o obbligata dalla memoria (forced true). I picks di prima della v220 sono stringhe (scelte).
function emptyPairNext(old) {
  return { p12: old && old.p12 ? old.p12 : null, p34: old && old.p34 ? old.p34 : null };
}
function pickOf(order, i) {
  const p = order.picks && order.picks[i];
  if (!p) return null;
  return typeof p === 'string' ? { player: p, forced: false } : (p.player ? p : null);
}
function otherOfPair(kind, player) {
  return pairOptions(kind).find(p => p !== player) || null;
}

// --- Mazzo dei turni (v206, finestra unica dalla v211) ---
// Carte tolte dagli scarti dei turni (posizioni in order.drawn): i giocatori scelti per le carte 1/2 e 3/4 restano
// attaccati alle carte che restano negli scarti; la scelta delle carte tolte si perde. order: turnOrder o la bozza della
// finestra del mazzo dei turni. Restituisce le carte tolte, nell'ordine degli scarti.
function takeFromTurnPile(order, positions) {
  const take = new Set(positions.filter(i => i >= 0 && i < order.drawn.length));
  const keep = [];
  const picks = {};
  order.drawn.forEach((kind, i) => {
    if (take.has(i)) return;
    if (order.picks && order.picks[i]) picks[keep.length] = order.picks[i];
    keep.push(kind);
  });
  const taken = [...take].sort((a, b) => a - b).map(i => order.drawn[i]);
  // (v222) La storia dei turni segue le carte: posizione nuova negli scarti, o null per quelle tolte
  if (Array.isArray(order.history)) {
    const newPos = {};
    let k = 0;
    order.drawn.forEach((kind, i) => { if (!take.has(i)) newPos[i] = k++; });
    order.history = order.history.map(e => Object.assign({}, e, { pos: e.pos === null || e.pos === undefined || !(e.pos in newPos) ? null : newPos[e.pos] }));
  }
  order.drawn = keep;
  order.picks = picks;
  return taken;
}
// Carta del turno in corso (l'ultimo turno della storia del giro); null in attesa della carta turno
function currentTurnCard() {
  const cur = currentTurn();
  return cur ? cur.kind : null;
}
// Giocatore a cui va una carta del mazzo dei turni: 'p1'..'p4'; il jolly va al giocatore che è jolly in questo giro
// (null per la nemesi)
// Carta x/y (v192; v220): il giocatore che l'ha giocata, scelto o obbligato dalla memoria della coppia (picks, per
// posizione negli scarti dei turni); null se è ancora da scegliere o se la carta è nel mazzo (i = -1).
// i: posizione della carta in turnOrder.drawn (-1 = nel mazzo); senza i (v222): il turno in corso, dalla storia.
// order: turnOrder o la bozza della finestra del mazzo dei turni (v211)
function turnCardPlayer(kind, i, order = turnOrder) {
  if (kind === 'wild') return turnOrder.wild ? 'p' + turnOrder.wild : null;
  if (isPairCard(kind)) {
    if (i === undefined) { const cur = currentTurn(order); return cur && cur.kind === kind ? cur.player || null : null; }
    const pick = i >= 0 ? pickOf(order, i) : null;
    return pick ? pick.player : null;
  }
  return kind && kind !== 'nemesis' ? kind : null;
}
// Scelta del giocatore per la carta x/y del turno in corso (si può annullare con Undo)
function chooseTurnPlayer(player) {
  const cur = currentTurn();
  if (resolving || ui.isTransitioning || !cur || !isPairCard(cur.kind) || cur.player) return;
  // (v220) Carta SCELTA: la prossima carta della coppia tocca all'altro giocatore (memoria). Undo riporta tutto
  // (v222: il giocatore va nella storia del turno e, se la carta è ancora negli scarti, sulla carta)
  act(() => {
    const kind = cur.kind;
    const h = turnOrder.history.slice();
    h[h.length - 1] = Object.assign({}, cur, { player, forced: false });
    turnOrder.history = h;
    if (cur.pos !== null && cur.pos !== undefined) {
      turnOrder.picks = Object.assign({}, turnOrder.picks, { [cur.pos]: { player, forced: false } });
    }
    turnOrder.pairNext = Object.assign(emptyPairNext(turnOrder.pairNext), { [kind]: otherOfPair(kind, player) });
  });
  render();
  announce(turnTrack.getAttribute('aria-label'));
  nemesisBtn.focus({ preventScroll: true });
  turnTrack.classList.remove('is-changed');
  void turnTrack.offsetWidth;
  turnTrack.classList.add('is-changed');
}

// --- Statistiche: si aggiornano quando una carta esce dal gioco ---

// Costo in Æ per scartare un potere (removalCost di cards.json); 0 se il costo non è in Æ (carte in mano, varchi...)
function aetherCost(data) {
  return Number(data.removalCost) || 0;
}
// Minion ucciso (vita a 0, negli scarti)
function countMinionKilled(entry) {
  stats.minionsKilled++;
  statCard('minionsKilled', entry.data);
  stats.minions.push({ id: entry.data.id, name: entry.data.name, turns: Math.max(0, turn - (entry.bornTurn || 0)) });
}
// Potere scartato pagando il costo
function countPowerPaid(entry) {
  stats.powersPaid++;
  statCard('powersPaid', entry.data);
  stats.aetherSpent += aetherCost(entry.data);
}
// Carte grigie che escono dal gioco (minion a 0, poteri pagati): contate e messe negli scarti
function discardGone(entry) {
  if (entry.data.type === 'Minion') countMinionKilled(entry);
  else if (entry.data.type === 'Power') countPowerPaid(entry);
  discardEntry(entry);
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
  // bornTurn: turno nemesi in cui la carta è stata pescata (per i turni in gioco dei minion nelle statistiche)
  // hpSet (v214): minion con vita variabile (data.hpVariable, la decidono i giocatori): entra in gioco senza vita ("?",
  // hp 0, turnHp null) finché non la si imposta una volta; prima non muore a 0
  if (isVariableMinion(data)) {
    return { uid: nextUid++, data, tokens: data.powerTokens, hp: 0, turnHp: null, hpSet: false, isNew: false, paid: false, bornTurn: turn };
  }
  return { uid: nextUid++, data, tokens: data.powerTokens, hp: data.hp, turnHp: data.hp, isNew: false, paid: false, bornTurn: turn };
}
// Minion con vita variabile (v214) e minion la cui vita non è ancora stata impostata ("?")
function isVariableMinion(data) {
  return data.type === 'Minion' && data.hpVariable === true;
}
function hpUnset(entry) {
  return isVariableMinion(entry.data) && !entry.hpSet;
}
// Vita massima: quella della carta o, per un minion a vita variabile, quella impostata la prima volta (hpMax, v218)
function hpMaxOf(entry) {
  return isVariableMinion(entry.data) ? entry.hpMax : entry.data.hp;
}
// Tetto del +1: vita massima e vita di inizio turno (turno giocatori). Minion a vita variabile non ancora impostata:
// nessun tetto (si sceglie la vita); dopo, la vita impostata è la sua vita massima (v218)
function hpCap(entry, nemesisTurn) {
  if (hpUnset(entry)) return Infinity;
  const max = hpMaxOf(entry);
  if (nemesisTurn) return max;
  return Math.min(max, entry.turnHp === undefined || entry.turnHp === null ? entry.hp : entry.turnHp);
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
  if (hasHp(entry) && hpUnset(entry)) return I18N_IT.hpUnknown;
  if (hasHp(entry) && typeof hpMaxOf(entry) === 'number') return I18N_IT.hpLong(entry.hp, hpMaxOf(entry));
  if (hasHp(entry) && typeof entry.data.hp !== 'number') return I18N_IT.hpOnly(entry.hp);
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
  // Più di 5 token (v178): un token e il numero, come la vita dei minion (cuore e numero)
  if (n > 5) {
    row.classList.add('is-count');
    row.append(el('span', 'ae-token'), el('span', 'ae-token-count', String(n)));
    return row;
  }
  for (let i = 0; i < Math.max(0, n); i++) row.appendChild(el('span', 'ae-token'));
  // 4 o 5 token (v176): i token si rimpiccioliscono di 3/n, così la fila (e il box) resta larga come con 3.
  // v178: lo spazio libero si divide in parti uguali tra token e tra token e bordo (style.css .has-many-tokens)
  if (n > 3) {
    row.classList.add('is-many');
    row.style.setProperty('--ae-token-zoom', String(3 / n));
    row.style.setProperty('--ae-token-n', String(n));
  }
  return row;
}

// Carta che va negli scarti all'inizio del prossimo turno nemesi: potere con costo pagato o minion ucciso (vita 0 salvata).
// Nel turno giocatori resta in coda, grigia.
function isGone(entry) {
  // (v214: un minion a vita variabile non ancora impostata non muore a 0)
  return !!entry.paid || (hasHp(entry) && entry.hp <= 0 && !hpUnset(entry));
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
  if (needsPairChoice()) return;
  const d = Object.assign({}, draftOf(entry), patch);
  if (d.hp === entry.hp) delete d.hp;
  if (!d.paid) delete d.paid;
  if (Object.keys(d).length) ui.drafts.set(entry.uid, d); else ui.drafts.delete(entry.uid);
}
// Copia della carta con la vita in bozza, per disegnare box e fascia
function displayEntry(entry) {
  const d = draftOf(entry);
  // isDraft: la vita è in bozza, il box mostra "x/X" con X = vita prima del danno (dopo Salva solo "x")
  if (!d) return entry;
  const view = Object.assign({}, entry);
  if (d.hp !== undefined) Object.assign(view, { hp: d.hp, hpBefore: entry.hp, isDraft: true });
  if (d.paid) view.paid = true;
  return view;
}

// Box sopra la carta: goccia + vita attuale (minion), un token per ogni token (potere), vuoto per gli attacchi.
// Uguale nella coda e nelle due fasce piccole.
function statusBadge(entry) {
  const badge = el('span', 'ae-status-badge');
  badge.setAttribute('aria-hidden', 'true');
  if (hasHp(entry)) {
    badge.classList.add('ae-status-badge--danger');
    // Vita + goccia; con una modifica non ancora salvata: vita / vita prima del danno
    // (v214: vita variabile non ancora impostata: "?"; in bozza solo "x", senza "/X")
    const hpText = entry.isDraft ? (hpUnset(entry) ? String(entry.hp) : I18N_IT.hp(entry.hp, entry.hpBefore))
      : hpUnset(entry) ? '?' : String(entry.hp);
    // Box "?" toccabile: apre la scheda della carta per impostare la vita (v218, unsetHpClick)
    if (hpUnset(entry) && !entry.isDraft) { badge.classList.add('is-unset'); badge.dataset.uid = String(entry.uid); }
    // Testo lungo (per esempio 13/17): nella fascia piccola il box si allarga e il testo si stringe
    if (hpText.length > 3) badge.classList.add('is-long');
    badge.append(icon('heart'), el('span', '', hpText));
  } else if (entry.data.type === 'Power') {
    badge.classList.add('ae-status-badge--tokens');
    if (entry.tokens > 3 && entry.tokens <= 5) badge.classList.add('has-many-tokens');
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
  if (data.type === 'Power' && data.removable === false) parts.push(I18N_IT.notRemovable.toLowerCase());
  if (entry.paid) parts.push(I18N_IT.paidNote.toLowerCase());
  else if (isGone(entry)) parts.push(I18N_IT.killedNote.toLowerCase());
  if (opts.current) parts.push('da risolvere');
  if (opts.viewed && !opts.current) parts.push('in anteprima');
  button.setAttribute('aria-label', parts.filter(Boolean).join(', '));

  const meta = el('span', 'ae-queue-meta');
  meta.setAttribute('aria-hidden', 'true');
  meta.append(el('strong', '', data.name), el('small', '', typeName(data)));

  // Le carte grandi della VistaCoda usano la scansione intera, le altre la miniatura
  // Fascia piccola: miniatura disegnata subito (sync), così ridisegnando la fascia (per esempio con Turno Nemesi) le carte
  // non spariscono per un attimo
  const art = cardArt(data, { thumb: !opts.full, lazy: opts.lazy, sync: !!opts.compact });
  button.append(statusBadge(entry), meta, art);
  // Fascia piccola: potere che non si può scartare pagando (niente "TO DISCARD") = simbolo di divieto in un box uguale a
  // quello di token e vita, in basso al centro (simmetrico al box in alto). v169
  if (opts.compact && data.type === 'Power' && data.removable === false) {
    const ban = el('span', 'ae-status-badge ae-ban-badge');
    ban.setAttribute('aria-hidden', 'true');
    ban.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" '
      + 'stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/></svg>';
    button.appendChild(ban);
  }
  if (entry.isNew) {
    const tag = el('span', 'ae-new-tag', I18N_IT.newTag);
    tag.setAttribute('aria-hidden', 'true');
    button.appendChild(tag);
  }
  return button;
}

// Posto della carta che si pescherà, nella fascia durante la risoluzione: solo il bordo tratteggiato (v168).
// Non è cliccabile e i lettori di schermo lo saltano.
function nextSlotItem() {
  const item = el('div', 'ae-queue-item ae-next-slot');
  item.setAttribute('aria-hidden', 'true');
  const badge = el('span', 'ae-status-badge ae-status-badge--empty', '·');
  // v169: anche qui il box NUOVA, come sul dorso al passo Pesca
  const tag = el('span', 'ae-new-tag', I18N_IT.newTag);
  item.append(badge, el('span', 'ae-card-art'), tag);
  return item;
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
  fastScrollTo(queueViewport, left);
}

// Scorrimento orizzontale animato più veloce di quello del browser (circa il 50% in più: FAST_SCROLL_MS). Durante
// l'animazione lo scroll-snap è spento, altrimenti il browser riaggancerebbe la carta a ogni passo; un dito sul
// contenitore la interrompe. Con "riduci movimento" salta subito.
const FAST_SCROLL_MS = 260;
const scrollJobs = new WeakMap();
const scrollJobWatched = new WeakSet();
function cancelFastScroll(container) {
  const job = scrollJobs.get(container);
  if (!job) return;
  job.cancelled = true;
  scrollJobs.delete(container);
  container.style.scrollSnapType = '';
}
function fastScrollTo(container, left, ms = FAST_SCROLL_MS) {
  const to = Math.max(0, Math.min(container.scrollWidth - container.clientWidth, left));
  // Stessa meta di un'animazione già in corso (ridisegni, ridimensionamenti): la si lascia finire
  const running = scrollJobs.get(container);
  if (running && Math.abs(running.to - to) < 1) return;
  cancelFastScroll(container);
  const from = container.scrollLeft;
  if (Math.abs(to - from) < 1 || reducedMotion.matches) { container.scrollLeft = to; return; }
  if (!scrollJobWatched.has(container)) {
    scrollJobWatched.add(container);
    container.addEventListener('pointerdown', () => cancelFastScroll(container), { passive: true });
  }
  const job = { cancelled: false, to };
  scrollJobs.set(container, job);
  container.style.scrollSnapType = 'none';
  tween(from, to, ms, v => { if (!job.cancelled) container.scrollLeft = v; }, () => {
    if (job.cancelled) return;
    container.scrollLeft = to;
    cancelFastScroll(container);
  });
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
  // Comandi (vita del minion, rimozione del potere) solo sulla carta grande al centro (style.css .queue-slot.is-centred)
  queueList.querySelectorAll('.queue-slot').forEach(slot => {
    const item = slot.querySelector('.ae-queue-item');
    slot.classList.toggle('is-centred', !!item && Number(item.dataset.uid) === uid);
  });
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
      // (v200: anche con la scelta del giocatore x/y in sospeso non si toccano le carte)
      if (resolving || ui.isTransitioning || queueViewport.dataset.dragged === '1' || needsPairChoice()) return;
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
  if (hasHp(entry) && entry.hp <= 0 && !hpUnset(entry)) {
    // Minion ucciso (vita 0 salvata): grigio, va negli scarti al prossimo turno nemesi; si torna indietro con Undo
    box.appendChild(el('p', 'queue-note is-paid', I18N_IT.killedNote));
  } else if (hasHp(entry) && hpUnset(entry)) {
    // Minion con vita "?" (v218): al posto di −5 / −1 / +1 un pulsante che apre la scheda della carta (vita da impostare)
    box.appendChild(ctl(I18N_IT.ctaSetHp, 'primary', 'sethp', I18N_IT.setHpOf(entry.data.name), () => openCardDialog(entry)));
  } else if (hasHp(entry)) {
    // I tocchi cambiano una bozza, "Salva" sulla carta la conferma (un passo di undo); a 0 con Salva il minion è ucciso.
    // +1 si può usare solo per rimettere vita tolta in questo turno (fino alla vita di inizio turno): altrimenti è oscurato
    // (v214: minion a vita variabile, si parte da 0 e il +1 non ha tetto)
    const shown = draftHp(entry);
    const cap = hpCap(entry, false);
    [-5, -1, 1].forEach(step => {
      const key = String(step);
      // −5 con il contorno rosso, diverso da −1 e +1: è il tocco sbagliato più costoso
      const b = ctl(step > 0 ? '+' + step : '−' + Math.abs(step), step === -5 ? 'danger' : 'secondary', key,
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
    // (v205: con il simbolo di divieto al posto del punto esclamativo)
    box.appendChild(el('p', 'queue-note is-locked', I18N_IT.notRemovable));
  }
  return box;
}

// Carte grandi: alte quanto lo spazio disponibile, ma mai così larghe da nascondere del tutto la carta successiva
function sizeQueue() {
  if (queueView.hidden) return;
  sizeColumn(queueViewport);
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
  // Margini ai lati: la prima e l'ultima carta si centrano come le altre
  const side = Math.max(0, (queueViewport.clientWidth - width) / 2) + 'px';
  queueViewport.style.paddingLeft = side;
  queueViewport.style.paddingRight = side;
  queueViewport.style.scrollPaddingInline = side;
}

function renderQueue() {
  const previous = queueViewport.scrollLeft;
  const previousTop = queueViewport.scrollTop;
  const railEl = ensureQueueRail();
  const railScroll = railEl.scrollLeft;
  railEl.replaceChildren(...queue.map((entry, i) => {
    const item = queueItem(displayEntry(entry), { compact: true, index: i, total: queue.length });
    // Vita del minion in modifica: "HP: −x" anche sulla carta piccola, al centro
    const d = draftOf(entry);
    if (d && d.hp !== undefined) {
      const change = d.hp - entry.hp;
      const tag = el('span', 'queue-hp-tag rail-hp-tag ' + (change < 0 ? 'is-loss' : 'is-gain'), I18N_IT.hpTurnTag(change));
      tag.setAttribute('aria-hidden', 'true');
      item.querySelector('.ae-card-art').appendChild(tag);
    }
    return item;
  }));
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
  // Suggerimento solo prima del primo turno nemesi (v194: non più "Premi «Turno Nemesi» per pescare")
  const emptyHint = queueEmpty.querySelector('p');
  if (emptyHint) {
    emptyHint.hidden = turn > 0;
    emptyHint.textContent = awaitingTurnCard() ? I18N_IT.emptyHintStart : I18N_IT.emptyHintWait;
  }
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

// Allinea la coda su una carta: 'anchor' (ANCHOR_RATIO), 'center', 'nearest'
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
    // Statistiche maghi: tutto va al giocatore del turno in corso (mazzo dei turni)
    // (il jolly conta per il giocatore che è jolly in questo giro)
    const kind = turnCardPlayer(currentTurnCard());
    const mage = kind ? (stats.mages[kind] = stats.mages[kind] || { damage: 0, powers: 0, kills: 0 }) : null;
    drafts.forEach((d, uid) => {
      const entry = entryByUid(uid);
      if (!entry) return;
      if (d.hp !== undefined) {
        // (v214) Prima impostazione della vita di un minion a vita variabile: non è danno; diventa anche la vita di
        // riferimento del turno
        const firstSet = hpUnset(entry);
        if (mage && entry.data.type === 'Minion' && !firstSet) {
          mage.damage += Math.max(0, entry.hp - d.hp);
          if (d.hp <= 0 && entry.hp > 0) mage.kills++;
        }
        entry.hp = d.hp;
        // (v218: la vita impostata la prima volta è la vita massima del minion: il +1 non la supera)
        if (firstSet && d.hp > 0) { entry.hpSet = true; entry.turnHp = d.hp; entry.hpMax = d.hp; }
      }
      if (d.paid) {
        if (mage && !entry.paid) mage.powers++;
        entry.paid = true;
      }
    });
    gone.push(...queue.filter(isGone));
    gone.forEach(discardGone);
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
  countMinionKilled(entry);
  discardEntry(entry);
  if (wasNew) { endResolution(); return; }
  if (index < currentIndex) currentIndex--;
  if (newIndex > index) newIndex--;
  if (currentIndex >= queue.length && newIndex < 0 && !canDraw()) endResolution();
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
  // Scelta del giocatore x/y in sospeso (v200): la carta si guarda ma non si cambia (niente vita, niente rimuovi)
  const locked = needsPairChoice();

  if (hasHp(entry) && !locked) {
    buildHpPanel(dialog, panel, entry, () => close());
  } else if (data.type === 'Power' && !locked) {
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
  // (v214: minion a vita variabile non ancora impostata: si parte da 0, niente "/X", a 0 non muore)
  const unset = hpUnset(entry);
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
  // (v218: vita "?" da impostare: −5, −1, +1 e +5 nei due turni)
  const cap = hpCap(entry, resolving);
  const stepButtons = [];
  (unset ? [-5, -1, 1, 5] : resolving ? [-1, 1] : [-5, -1, 1]).forEach(step => {
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

  // "HP x / X": X è la vita prima del danno (la vita salvata), non la vita massima della carta
  const before = entry.hp;
  function update() {
    // Vita di riferimento non ancora impostata: solo "HP x" (v214)
    number.textContent = unset ? `HP ${draft}` : `HP ${draft} / ${before}`;
    const change = draft - original;
    const dies = draft === 0 && !unset;
    delta.className = 'ae-hp-delta' + (change < 0 ? ' is-loss' : change > 0 ? ' is-gain' : '');
    delta.replaceChildren();
    if (dies) delta.append(icon('heart'), el('span', '', I18N_IT.willBeDeleted));
    else if (change !== 0 && !unset) delta.append(icon('heart'), el('span', '', I18N_IT.hpDelta(change)));
    stepButtons.forEach(([step, b]) => {
      if (step > 0 && !resolving) { b.disabled = draft >= cap; b.classList.toggle('is-dimmed', draft >= cap); }
    });
    confirm.textContent = dies ? I18N_IT.deleteMinion : I18N_IT.confirmHp;
    confirm.className = 'ae-button ' + (dies ? 'ae-button--danger' : 'ae-button--primary');
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
      // Prima impostazione della vita di un minion a vita variabile (v214): da qui valgono le regole normali
      // (v218: è anche la sua vita massima)
      if (unset && value > 0) { entry.hpSet = true; entry.turnHp = value; entry.hpMax = value; }
      if (value <= 0 && !unset) {
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
      // (le opzioni del mazzo dipendono anche dai giocatori: blocco di "Unisci" e riga di avviso, v213)
      if (startOptions && document.getElementById('deck-options')) renderDeckOptions();
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
    // Chiusa: la prossima volta si riapre dal fronte e non ingrandita
    resetNemesisZoom();
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

  // Zoom con due dita sul lato che si vede: sopra la carta compare un livello con la stessa immagine, ingrandita dentro
  // il riquadro della carta (fino a NEMESIS_ZOOM_MAX); da ingrandita un dito la sposta e un doppio tocco torna normale.
  // Il livello evita di ingrandire la carta che si gira in 3D (le due facce).
  const zoom = { scale: 1, tx: 0, ty: 0, layer: null, img: null };
  const pointers = new Map();
  let pinch = null;
  let pan = null;
  let lastTap = null;
  const applyZoom = animate => {
    const w = flip.offsetWidth, h = flip.offsetHeight;
    const maxX = Math.max(0, (w * zoom.scale - w) / 2), maxY = Math.max(0, (h * zoom.scale - h) / 2);
    zoom.tx = Math.max(-maxX, Math.min(maxX, zoom.tx));
    zoom.ty = Math.max(-maxY, Math.min(maxY, zoom.ty));
    zoom.img.style.transition = animate ? 'transform .2s ease-out' : 'none';
    zoom.img.style.transform = `translate(${zoom.tx}px, ${zoom.ty}px) scale(${zoom.scale})`;
  };
  const openZoomLayer = () => {
    if (zoom.layer) return;
    const art = nemesisArt[settings.nemesis];
    if (!art) return;
    const showBack = nemesisShowBack && !!art.back;
    zoom.layer = el('div', 'nemesis-zoom-layer');
    zoom.layer.setAttribute('aria-hidden', 'true');
    zoom.img = el('img');
    zoom.img.alt = '';
    zoom.img.draggable = false;
    zoom.img.src = encodeURI(showBack ? art.back : art.card);
    zoom.layer.appendChild(zoom.img);
    flip.appendChild(zoom.layer);
    flip.classList.add('is-zoomed');
  };
  const resetZoom = () => {
    if (zoom.layer) zoom.layer.remove();
    zoom.layer = null;
    zoom.img = null;
    zoom.scale = 1;
    zoom.tx = 0;
    zoom.ty = 0;
    pinch = null;
    pan = null;
    flip.classList.remove('is-zoomed');
  };
  resetNemesisZoom = resetZoom;
  // Punto (relativo al centro della carta) che resta sotto le dita / sotto il tocco
  const local = (x, y) => { const r = flip.getBoundingClientRect(); return { x: x - r.left - r.width / 2, y: y - r.top - r.height / 2 }; };
  const zoomAt = (scale, p, animate) => {
    const ix = (p.x - zoom.tx) / zoom.scale, iy = (p.y - zoom.ty) / zoom.scale;
    zoom.scale = Math.max(1, Math.min(NEMESIS_ZOOM_MAX, scale));
    zoom.tx = p.x - ix * zoom.scale;
    zoom.ty = p.y - iy * zoom.scale;
    applyZoom(animate);
  };

  // La carta ruota seguendo il dito (tutta la larghezza della carta = mezzo giro). Al rilascio: oltre
  // SWIPE_MIN_DISTANCE completa il mezzo giro nella direzione del dito, altrimenti torna com'era. Il retro si vede solo
  // così (un tocco non gira la carta) e non mentre la carta è ingrandita.
  let drag = null;
  const setAngle = (deg, animate) => {
    inner.style.transition = animate ? '' : 'none';
    inner.style.transform = `rotateY(${deg}deg)`;
  };
  flip.addEventListener('pointerdown', e => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      // Secondo dito: niente giro, comincia lo zoom
      if (drag) { setAngle(nemesisFlipAngle, true); drag = null; }
      pointers.forEach((p, id) => { try { flip.setPointerCapture(id); } catch (_) {} });
      openZoomLayer();
      if (!zoom.layer) return;
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s: zoom.scale, m: local((a.x + b.x) / 2, (a.y + b.y) / 2), tx: zoom.tx, ty: zoom.ty };
      pan = null;
      return;
    }
    if (pointers.size !== 1) return;
    if (zoom.layer) {
      try { flip.setPointerCapture(e.pointerId); } catch (_) {}
      pan = { x: e.clientX, y: e.clientY, tx: zoom.tx, ty: zoom.ty, moved: false };
      return;
    }
    if (!flip.classList.contains('has-back')) return;
    drag = { x: e.clientX, y: e.clientY, id: e.pointerId, dx: 0, active: false };
  });
  flip.addEventListener('pointermove', e => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size >= 2 && zoom.layer) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const m = local((a.x + b.x) / 2, (a.y + b.y) / 2);
      // Il punto dell'immagine che era sotto le dita all'inizio resta sotto le dita
      const ix = (pinch.m.x - pinch.tx) / pinch.s, iy = (pinch.m.y - pinch.ty) / pinch.s;
      zoom.scale = Math.max(1, Math.min(NEMESIS_ZOOM_MAX, pinch.s * d / pinch.d));
      zoom.tx = m.x - ix * zoom.scale;
      zoom.ty = m.y - iy * zoom.scale;
      applyZoom(false);
      return;
    }
    if (pan) {
      const dx = e.clientX - pan.x, dy = e.clientY - pan.y;
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD) pan.moved = true;
      zoom.tx = pan.tx + dx;
      zoom.ty = pan.ty + dy;
      applyZoom(false);
      return;
    }
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
  const endZoomGesture = e => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (!zoom.layer) return;
    if (pointers.size === 1) {
      // Da due dita a una: si continua a spostare con quella rimasta
      const [p] = [...pointers.values()];
      pan = { x: p.x, y: p.y, tx: zoom.tx, ty: zoom.ty, moved: true };
      return;
    }
    if (pointers.size) return;
    // Doppio tocco sulla carta ingrandita: torna normale
    if (pan && !pan.moved && e.type === 'pointerup') {
      const now = performance.now();
      if (lastTap && now - lastTap < 320) { lastTap = null; zoomAt(1, { x: 0, y: 0 }, true); }
      else lastTap = now;
    }
    pan = null;
    if (zoom.scale < 1.05) resetZoom();
  };
  const endDrag = (e, cancelled) => {
    endZoomGesture(e);
    if (!drag || (e && e.pointerId !== drag.id)) return;
    const { dx, active } = drag;
    drag = null;
    // Un tocco senza trascinare non gira la carta: il retro si vede solo con lo swipe
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
const NEMESIS_ZOOM_MAX = 4;
// Toglie lo zoom della carta nemesi (carta chiusa o cambiata); la imposta buildNemesisFlip
let resetNemesisZoom = () => {};

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

// Wave scelte nella pagina Nuova partita (anche più di una): si vedono le nemesi di tutte
let selectedWaves = [];

// Numero della wave in cifre romane per mostrarla ("4 - The New Age" → "IV - The New Age"); il valore resta quello di
// nemesis.json
function toRoman(n) {
  const map = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  map.forEach(([v, s]) => { while (n >= v) { out += s; n -= v; } });
  return out;
}
// Nome della wave dal suo codice: "4" -> "IV - The New Age"
function waveLabel(wave) {
  return toRoman(Number(wave)) + ' - ' + productName(wave);
}

// Nemesi delle wave scelte: prima le disponibili (pulsanti), le altre in un elenco chiuso e non interattivo
function renderBosses() {
  const list = document.getElementById('nemesis-list');
  // Per wave (nell'ordine delle wave); in ogni wave prima le nemesi della scatola base, poi quelle delle mini espansioni,
  // in ognuno dei due gruppi per battaglia
  const byBattle = n => (n.battle === null || n.battle === undefined ? 99 : n.battle);
  const ofWave = nemeses.filter(n => n.boxCode && selectedWaves.includes(waveOfNemesis(n)))
    .map((n, i) => ({ n, i }))
    .sort((a, b) => (Number(waveOfNemesis(a.n)) - Number(waveOfNemesis(b.n))) || (isMiniCode(a.n.boxCode) - isMiniCode(b.n.boxCode))
      || (byBattle(a.n) - byBattle(b.n)) || (a.i - b.i))
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
    if (isMiniCode(info.boxCode)) b.appendChild(el('span', 'nemesis-expansion', productName(info.boxCode)));
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
      renderBosses();
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
    // Nemesi che l'app ha (battaglia e carte) ma il cui prodotto non è nella collezione: niente "!", la scritta
    // "Non in collezione" a destra. Le altre (senza battaglia o senza carte) restano con il "!" rosso.
    const notOwned = info.battle !== null && !ownsProduct(productOfNemesis(info))
      && allCards.some(c => c.category === 'Specific' && c.nemesis === info.name);
    const li = el('li', 'nemesis-locked' + (notOwned ? ' is-not-owned' : ''));
    li.setAttribute('aria-label', notOwned ? I18N_IT.notInCollectionNemesis(info.name) : I18N_IT.unavailableNemesis(info.name));
    li.appendChild(el('span', '', info.name));
    if (notOwned) li.appendChild(el('span', 'nemesis-locked-note', I18N_IT.notInCollection));
    return li;
  }));
  updateStartActions();
}

function renderStartChoices() {
  nemesisPreviewOpen = false;
  startOptions.waves = ownedWaves();
  ensureCollectionButton();
  renderPlayers();
  const current = nemeses.find(n => n.name === settings.nemesis);
  // Wave scelte: quelle di prima ancora nella collezione; se nessuna, la wave della nemesi scelta (o la prima)
  selectedWaves = selectedWaves.filter(w => startOptions.waves.includes(w));
  if (!selectedWaves.length) {
    selectedWaves = [current && startOptions.waves.includes(waveOfNemesis(current)) ? waveOfNemesis(current) : startOptions.waves[0]].filter(Boolean);
  }
  ensureWaveGroup();
  renderWavePills();
  renderBosses();
}

// Pagina iniziale in due modi:
//   'home':  menu iniziale. Se c'è una partita salvata, la finestra "Partita in corso" (nemesi, giocatori, Riprendi
//            partita); sotto, sempre, "Nuova partita" e "Opzioni" (La mia collezione).
//   'setup': scelte della nuova partita (giocatori, wave, nemesi) e "Inizia partita"; in alto a destra il Menu
//            (Esci → menu iniziale, La mia collezione).
let startMode = 'home';

// Finestra "Partita in corso" sotto il titolo e, sotto, i pulsanti del menu iniziale. Creati qui, così funzionano
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
  resume.classList.add('ae-button--full', 'start-choice-resume');
  panel.append(head, resume);
  document.querySelector('.start-title').after(panel);
  return panel;
}

function startHomeActions() {
  let box = document.getElementById('start-home');
  if (box) return box;
  box = el('div', 'start-home');
  box.id = 'start-home';
  const fresh = button(I18N_IT.newGame, 'primary', () => setStartMode('setup', true));
  fresh.classList.add('ae-button--full', 'start-home-new');
  // Collezione vuota (v194): "Inserisci collezione" apre La mia collezione; "Nuova partita" è oscurato
  const addCollection = button(I18N_IT.addCollection, 'primary', () => openCollection(addCollection, () => {
    const next = startHomeActions().querySelector('.start-home-new');
    if (next && !next.disabled) next.focus({ preventScroll: true });
  }));
  addCollection.classList.add('ae-button--full', 'start-home-collection');
  const options = button(I18N_IT.options, 'secondary', () => openOptions(options));
  options.classList.add('ae-button--full', 'start-home-options');
  // Modalità test (v215): scenari che partono in un momento preciso della partita
  const test = button(I18N_IT.testMenu, 'secondary', () => openTestScreen(test));
  test.classList.add('ae-button--full', 'start-home-test');
  box.append(addCollection, fresh, options, test);
  startChoicePanel().after(box);
  return box;
}
function updateHomeCollection() {
  const box = document.getElementById('start-home');
  if (!box) return;
  const empty = !collection || collection.size === 0;
  box.querySelector('.start-home-collection').hidden = !empty;
  const fresh = box.querySelector('.start-home-new');
  fresh.disabled = empty;
  fresh.title = empty ? I18N_IT.collectionEmptyHint : '';
  // Con la collezione vuota il pulsante principale è "Inserisci collezione"
  // (altrimenti principale solo senza partita salvata, come in setStartMode)
  const primary = !empty && !readSave();
  fresh.classList.toggle('ae-button--primary', primary);
  fresh.classList.toggle('ae-button--secondary', !primary);
}

// Testata della pagina "Nuova partita": titolo e X (torna al menu iniziale). Resta ferma in alto mentre la pagina scorre
// sotto, e sotto di lei il contenuto sfuma nel nero (style.css .start-setup-head)
function startSetupHead() {
  let head = document.getElementById('start-setup-head');
  if (head) return head;
  head = el('div', 'start-setup-head');
  head.id = 'start-setup-head';
  const x = el('button', 'ae-icon-button start-setup-close');
  x.type = 'button';
  x.setAttribute('aria-label', I18N_IT.backToMenu);
  x.appendChild(icon('close'));
  x.addEventListener('click', () => setStartMode('home', true));
  head.append(el('h1', 'start-setup-title', I18N_IT.newGameTitle), x);
  document.querySelector('.start-box').prepend(head);
  return head;
}

function setStartMode(mode, focus) {
  const saved = readSave();
  startMode = mode === 'setup' ? 'setup' : 'home';
  // Pagina Nuova partita: le opzioni del mazzo ripartono dalla preferenza del browser (v213)
  if (startMode === 'setup') Object.assign(settings, loadDeckOptions());
  const panel = startChoicePanel();
  const home = startHomeActions();
  const isHome = startMode === 'home';
  panel.hidden = !isHome || !saved;
  home.hidden = !isHome;
  startSetupHead().hidden = isHome;
  // Il vecchio Menu della pagina Nuova partita (sostituito dalla X) si toglie anche da una pagina già aperta
  const oldMenu = document.getElementById('start-menu-btn');
  if (oldMenu) oldMenu.remove();
  startLayer.classList.toggle('is-setup', !isHome);
  panel.parentElement.classList.toggle('is-choosing', isHome);
  // Con una partita in corso "Nuova partita" è secondario (il principale è Riprendi partita)
  const fresh = home.querySelector('.start-home-new');
  fresh.classList.toggle('ae-button--primary', !saved);
  fresh.classList.toggle('ae-button--secondary', !!saved);
  updateHomeCollection();
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
  startLayer.scrollTop = 0;
  updateStartActions();
  if (focus) {
    const target = isHome ? (saved ? panel.querySelector('.start-choice-resume')
      : fresh.disabled ? home.querySelector('.start-home-collection') : fresh) : document.querySelector('#choices-players button');
    if (target) target.focus({ preventScroll: true });
  }
}

// In 'setup' il pulsante principale è "Inizia partita"
function updateStartActions() {
  resumeBtn.hidden = true;
  resumeBtn.className = 'ae-button ae-button--full ae-button--secondary start-resume-alt';
  startBtn.textContent = I18N_IT.startNew;
  startBtn.className = 'ae-button ae-button--full ae-button--primary';
  startBtn.disabled = !settings.nemesis || !battleOf(settings.nemesis);
  startBtn.title = startBtn.disabled ? I18N_IT.chooseNemesis : '';
  renderDeckOptions();
}

// Opzioni del mazzo (v213): due interruttori sopra la wave ("Modalità battaglia", "Unisci le carte della collezione"),
// con il blocco di "Unisci" (mergeLockedWave) e, prima di "Inizia partita", una riga se il mazzo esce più corto
function deckOptionsGroup() {
  let group = document.getElementById('deck-options');
  if (group) return group;
  group = el('section', 'start-group start-deck-options');
  group.id = 'deck-options';
  group.setAttribute('aria-labelledby', 'deck-options-label');
  const label = el('h2', 'start-label', I18N_IT.deckOptions);
  label.id = 'deck-options-label';
  const row = (key, text, note) => {
    const r = el('label', 'ae-switch-row deck-option');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('role', 'switch');
    input.dataset.option = key;
    const sw = el('span', 'ae-switch');
    sw.setAttribute('aria-hidden', 'true');
    const texts = el('span', 'deck-option-text');
    texts.append(el('span', 'deck-option-label', text), el('span', 'deck-option-note', note));
    r.append(texts, input, sw);
    input.addEventListener('change', () => {
      if (input.disabled) return;
      settings[key] = input.checked;
      saveDeckOptions();
      renderDeckOptions();
    });
    return r;
  };
  const lockNote = el('p', 'start-note deck-option-lock');
  lockNote.id = 'deck-option-lock';
  group.append(label, row('battleMode', I18N_IT.battleMode, I18N_IT.battleModeNote),
    row('mergeCollection', I18N_IT.mergeCollection, I18N_IT.mergeCollectionNote), lockNote);
  ensureWaveGroup().before(group);
  return group;
}
function renderDeckOptions() {
  if (!deckSetup || !nemeses.length) return;
  const group = deckOptionsGroup();
  const battle = group.querySelector('[data-option="battleMode"]');
  const merge = group.querySelector('[data-option="mergeCollection"]');
  const lockNote = group.querySelector('.deck-option-lock');
  battle.checked = settings.battleMode !== false;
  const locked = mergeLockedWave();
  merge.checked = mergeActive();
  merge.disabled = !!locked;
  merge.closest('.ae-switch-row').classList.toggle('is-locked', !!locked);
  merge.setAttribute('aria-describedby', locked ? lockNote.id : '');
  lockNote.hidden = !locked;
  lockNote.textContent = locked ? I18N_IT.mergeLocked(waveLabel(locked).split(' - ')[0]) : '';
  // Riga di avviso prima di "Inizia partita": il mazzo esce più corto di deck-setup.json
  let warn = document.getElementById('deck-short');
  if (!warn) {
    warn = el('p', 'start-note deck-short');
    warn.id = 'deck-short';
    warn.setAttribute('role', 'status');
    startBtn.before(warn);
  }
  const short = settings.nemesis ? deckShortfall() : null;
  warn.hidden = !short;
  warn.textContent = short ? I18N_IT.deckShort(short.have, short.want) : '';
}

// Wave nella scelta della nemesi: solo quelle della collezione (se nessuna, tutte)
function ownedWaves() {
  const all = collectionCatalog().map(w => w.wave);
  const owned = all.filter(w => [...collection].some(id => waveOfCode(id) === w));
  return owned.length ? owned : all;
}

function buildStartPage() {
  loadCollection();
  startOptions = { players: Object.keys(deckSetup.battles[0].players).map(Number), waves: ownedWaves() };
  const firstPlayable = nemeses.find(isPlayable);
  settings = Object.assign({ players: startOptions.players[0], nemesis: firstPlayable ? firstPlayable.name : null }, loadDeckOptions());
  renderStartChoices();
}

// Wave: gruppo a sé ("Wave"), sopra la Nemesi, con un menu a tendina in cui si spuntano una o più wave (in cifre
// romane). Accanto al titolo "Nemesi" il dado sceglie una nemesi a caso. Creati qui, così valgono anche con un
// index.html vecchio (il vecchio <select> della wave resta nascosto e non si usa più).
function ensureWaveGroup() {
  let group = document.getElementById('wave-group');
  if (group) return group;
  const select = document.getElementById('wave-select');
  group = el('section', 'start-group start-wave');
  group.id = 'wave-group';
  group.setAttribute('aria-labelledby', 'wave-label');
  const label = el('h2', 'start-label', I18N_IT.wave);
  label.id = 'wave-label';
  const dropdown = el('div', 'wave-dropdown');
  dropdown.id = 'wave-pills';
  const toggle = el('button', 'wave-dropdown-toggle');
  toggle.type = 'button';
  toggle.setAttribute('aria-haspopup', 'true');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'wave-menu');
  toggle.append(el('span', 'wave-dropdown-text'));
  toggle.insertAdjacentHTML('beforeend', CHEVRON_SVG);
  const menu = el('div', 'wave-menu');
  menu.id = 'wave-menu';
  menu.setAttribute('role', 'group');
  menu.setAttribute('aria-label', I18N_IT.wavesLabel);
  menu.hidden = true;
  const setOpen = open => {
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    dropdown.classList.toggle('is-open', open);
  };
  toggle.addEventListener('click', () => setOpen(menu.hidden));
  // Un tocco fuori dal menu (o Esc) lo chiude
  document.addEventListener('pointerdown', e => { if (!menu.hidden && !dropdown.contains(e.target)) setOpen(false); });
  dropdown.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { e.stopPropagation(); setOpen(false); toggle.focus(); } });
  dropdown.append(toggle, menu);
  group.append(label, dropdown);
  const nemesisGroup = document.getElementById('nemesis-list').closest('.start-group');
  nemesisGroup.before(group);
  nemesisGroup.classList.add('start-nemesis');
  // Titolo "Nemesi" con a destra il dado (nemesi a caso tra tutte quelle della collezione)
  const nemesisLabel = document.getElementById('nemesis-label');
  if (nemesisLabel && !document.getElementById('nemesis-random')) {
    const row = el('div', 'start-label-row');
    nemesisLabel.before(row);
    row.appendChild(nemesisLabel);
    const dice = el('button', 'ae-icon-button nemesis-random');
    dice.id = 'nemesis-random';
    dice.type = 'button';
    dice.setAttribute('aria-label', I18N_IT.randomNemesis);
    dice.title = I18N_IT.randomNemesis;
    dice.innerHTML = DICE_SVG;
    dice.addEventListener('click', pickRandomNemesis);
    row.appendChild(dice);
  }
  if (select) {
    select.hidden = true;
    group.appendChild(select);
    const oldLabel = document.querySelector('label[for="wave-select"]');
    if (oldLabel) oldLabel.remove();
  }
  return group;
}

const DICE_SVG = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">'
  + '<rect x="3.5" y="3.5" width="17" height="17" rx="3.5" fill="none" stroke="currentColor" stroke-width="2"/>'
  + '<circle cx="8.5" cy="8.5" r="1.6" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.6" fill="currentColor"/>'
  + '<circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.6" fill="currentColor"/>'
  + '<circle cx="8.5" cy="15.5" r="1.6" fill="currentColor"/></svg>';

// Menu a tendina delle wave: testo con le wave scelte e, aperto, una casella per wave. Resta sempre almeno una wave.
function renderWavePills() {
  const dropdown = document.getElementById('wave-pills');
  const text = dropdown.querySelector('.wave-dropdown-text');
  const menu = dropdown.querySelector('.wave-menu');
  const chosen = startOptions.waves.filter(w => selectedWaves.includes(w));
  text.textContent = !chosen.length ? I18N_IT.wavesNone
    : chosen.length === 1 ? waveLabel(chosen[0]) : I18N_IT.wavesMore(waveLabel(chosen[0]), chosen.length - 1);
  menu.replaceChildren(...startOptions.waves.map(wave => {
    const row = el('label', 'wave-option');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = selectedWaves.includes(wave);
    input.addEventListener('change', () => {
      if (input.checked) selectedWaves.push(wave);
      else if (selectedWaves.length > 1) selectedWaves = selectedWaves.filter(w => w !== wave);
      else input.checked = true;
      nemesisPreviewOpen = false;
      renderWavePills();
      renderBosses();
    });
    row.append(input, el('span', 'wave-option-box'), el('span', 'wave-option-name', waveLabel(wave)));
    return row;
  }));
}

// Dado: una nemesi a caso tra tutte quelle giocabili della collezione (se possibile diversa da quella scelta); la sua
// wave si aggiunge alle wave scelte e la pagina scorre fino a lei
function pickRandomNemesis() {
  const all = nemeses.filter(isPlayable);
  if (!all.length) return;
  const pool = all.length > 1 ? all.filter(n => n.name !== settings.nemesis) : all;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  if (!selectedWaves.includes(waveOfNemesis(pick))) selectedWaves.push(waveOfNemesis(pick));
  settings.nemesis = pick.name;
  nemesisPreviewOpen = false;
  renderWavePills();
  renderBosses();
  const selected = document.querySelector('.nemesis-item.is-selected');
  if (selected) selected.scrollIntoView({ block: 'center', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  showToast(pick.name);
}

// Il pulsante "La mia collezione" non è più nella pagina "Nuova partita" (sta in Opzioni e nel Menu): si toglie anche
// da una versione vecchia
function ensureCollectionButton() {
  const row = document.getElementById('collection-row');
  if (row) row.remove();
}

function collectionSummaryText() {
  const waves = new Set([...collection].map(id => id.split('|')[0]));
  return I18N_IT.collectionSummary(waves.size, collection.size);
}

// Opzioni (dal menu iniziale): La mia collezione (con il riepilogo), Dorso delle carte e Sfondo
function openOptions(trigger) {
  const layer = el('div', 'collection-screen options-screen');
  layer.setAttribute('role', 'dialog');
  layer.setAttribute('aria-modal', 'true');
  layer.setAttribute('aria-label', I18N_IT.options);
  const head = el('div', 'collection-head');
  const close = () => {
    layer.remove();
    startLayer.inert = false;
    updateInert();
    if (trigger && trigger.isConnected) trigger.focus({ preventScroll: true });
  };
  const x = el('button', 'ae-icon-button');
  x.type = 'button';
  x.setAttribute('aria-label', I18N_IT.close);
  x.appendChild(icon('close'));
  x.addEventListener('click', close);
  head.append(el('h2', 'collection-title', I18N_IT.options), x);
  const body = el('div', 'collection-body');
  const item = el('button', 'options-item');
  item.type = 'button';
  const summary = el('span', 'options-item-note', collectionSummaryText());
  item.append(el('span', 'options-item-label', I18N_IT.myCollection), summary);
  item.addEventListener('click', () => openCollection(item, () => { summary.textContent = collectionSummaryText(); }));
  // Dorso delle carte: miniatura e nome del dorso scelto; si tocca per la griglia di tutti i dorsi. Chiusa la griglia,
  // la pagina iniziale resta coperta dalle Opzioni
  // (la miniatura sta piccola a destra della scritta)
  const backItem = el('div', 'options-item options-item--row');
  backItem.append(el('span', 'options-item-label', I18N_IT.cardBack),
    cardBackChoiceButton(() => { if (layer.isConnected) startLayer.inert = true; }, { compact: true }));
  // Sfondo: anteprima e nome dello sfondo scelto; si tocca per le anteprime di tutti gli sfondi
  const bgItem = el('div', 'options-item options-item--row');
  bgItem.append(el('span', 'options-item-label', I18N_IT.background),
    backgroundChoiceButton(() => { if (layer.isConnected) startLayer.inert = true; }, { compact: true }));
  // Carte turno 1/2 e 3/4 (wave 4, v192; dalla v193 qui e non nel Menu della partita): interruttore, attivo di default
  const pairsItem = el('label', 'options-item options-item--row ae-switch-row options-switch');
  const pairsInput = document.createElement('input');
  pairsInput.type = 'checkbox';
  pairsInput.setAttribute('role', 'switch');
  pairsInput.checked = turnPairsOn();
  pairsInput.addEventListener('change', () => setTurnPairs(pairsInput.checked));
  const pairsSw = el('span', 'ae-switch');
  pairsSw.setAttribute('aria-hidden', 'true');
  const pairsText = el('span', 'options-switch-text');
  pairsText.append(el('span', 'options-item-label', I18N_IT.turnPairsOption), el('span', 'options-item-note', I18N_IT.turnPairsHint));
  pairsItem.append(pairsText, pairsInput, pairsSw);
  body.append(item, backItem, bgItem, pairsItem);
  layer.append(head, body);
  layer.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } });
  document.body.appendChild(layer);
  startLayer.inert = true;
  item.focus();
}

// Schermata "La mia collezione": per ogni wave un interruttore (la wave, cioè la sua scatola base) e sotto le sue
// mini espansioni. Togliendo una wave si tolgono anche le sue mini espansioni. Le scelte valgono solo con
// "Salva collezione"; la X torna indietro senza salvare.
function openCollection(trigger, onSaved) {
  const draft = new Set(collection);
  const layer = el('div', 'collection-screen');
  layer.setAttribute('role', 'dialog');
  layer.setAttribute('aria-modal', 'true');
  layer.setAttribute('aria-label', I18N_IT.myCollection);
  const head = el('div', 'collection-head');
  const close = () => {
    layer.remove();
    updateInert();
    // Aperta da Opzioni: la pagina iniziale resta coperta dalle Opzioni
    if (document.querySelector('.options-screen')) startLayer.inert = true;
    if (trigger && trigger.isConnected) trigger.focus({ preventScroll: true });
  };
  const x = el('button', 'ae-icon-button');
  x.type = 'button';
  x.setAttribute('aria-label', I18N_IT.close);
  x.appendChild(icon('close'));
  x.addEventListener('click', close);
  head.append(el('h2', 'collection-title', I18N_IT.myCollection), x);
  const body = el('div', 'collection-body');
  body.appendChild(el('p', 'start-note', I18N_IT.collectionHint));
  // Seleziona tutto / Deseleziona tutto: spuntano o tolgono tutte le wave e le mini espansioni (valgono con "Salva")
  const bulk = el('div', 'collection-bulk');
  // (solo le wave che si possono scegliere, v199)
  const setAll = on => {
    collectionCatalog().filter(({ wave }) => collectionWaveEnabled(wave))
      .forEach(({ products }) => products.forEach(p => { if (on) draft.add(p.id); else draft.delete(p.id); }));
    body.querySelectorAll('.collection-wave:not(.is-locked) .collection-item input').forEach(input => {
      input.checked = on;
      if (input.closest('.is-mini')) input.disabled = !on;
    });
    body.querySelectorAll('.collection-wave:not(.is-locked) .collection-item.is-mini').forEach(r => r.classList.toggle('is-disabled', !on));
  };
  bulk.append(button(I18N_IT.selectAll, 'secondary', () => setAll(true)), button(I18N_IT.deselectAll, 'secondary', () => setAll(false)));
  body.appendChild(bulk);

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
    const waveRow = toggle(waveLabel(wave), base.id, 'is-wave');
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
    // Wave non ancora disponibili (v199): visibili ma spente e non si toccano
    if (!collectionWaveEnabled(wave)) {
      block.classList.add('is-locked');
      [waveRow, ...minis].forEach(r => {
        const input = r.querySelector('input');
        input.checked = false;
        input.disabled = true;
        r.classList.add('is-disabled');
      });
      waveRow.querySelector('span').append(el('span', 'collection-locked-note', I18N_IT.collectionLocked));
    }
    body.appendChild(block);
  });
  const footer = el('div', 'collection-footer');
  const saveBtn = button(I18N_IT.collectionSave, 'primary', () => {
    collection = draft;
    saveCollection();
    close();
    renderStartChoices();
    updateHomeCollection();
    if (onSaved) onSaved();
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
  // (v215: uscendo da un test, Esci dal test o Menu iniziale della Vittoria, tornano le scelte di prima)
  endTest();
  closeAllModals();
  closeDiscard();
  renderStartChoices();
  startLayer.hidden = false;
  updateInert();
  setStartMode('home', true);
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
  ui.gameSaved = false;
  newGame();
  // Prima del turno giocatori: i 9 mazzi da cui nasce il mazzo nemesi e il pulsante "Crea mazzo"
  ui.deckBuilding = true;
  ui.deckShown = 0;
  ui.deckDark = true;
  showDeckBuild();
  render();
  slideToGame(() => nemesisBtn.focus());
  prefetchDeckImages();
}

// Riprendi partita: si ricarica lo stato salvato nel browser, compreso l'undo.
// v194: se la nemesi della partita non è più nella collezione, una finestra lo dice; "Continua" rimette nella
// collezione il suo prodotto (e la scatola base della sua wave) e riprende la partita.
function resumeGame() {
  const saved = readSave();
  if (!saved) return;
  const info = nemeses.find(n => n.name === saved.settings.nemesis);
  // (nemesi di una wave non ancora disponibile nella collezione, v199: si riprende e basta)
  if (info && info.boxCode && collection && collectionWaveEnabled(waveOfNemesis(info)) && !collection.has(productOfNemesis(info))) {
    openMissingNemesis(info, () => {
      collection.add(waveOfNemesis(info));
      collection.add(productOfNemesis(info));
      saveCollection();
      renderStartChoices();
      updateHomeCollection();
      resumeSavedGame(saved);
    });
    return;
  }
  resumeSavedGame(saved);
}
function openMissingNemesis(info, onContinue) {
  let close = () => {};
  const cancel = () => close();
  const dialog = dialogShell(I18N_IT.nemesisMissingTitle, '', cancel, { displayTitle: false });
  dialog.classList.add('ae-exit-confirm');
  dialog.appendChild(el('p', 'ae-modal-text', I18N_IT.nemesisMissingText(info.name,
    isMiniCode(info.boxCode) ? productName(info.boxCode) : waveLabel(waveOfNemesis(info)))));
  const footer = el('div', 'ae-modal-footer');
  const go = button(I18N_IT.continueLabel, 'primary', () => { close(); onContinue(); });
  footer.append(button(I18N_IT.cancel, 'secondary', cancel), go);
  dialog.appendChild(footer);
  close = openModal(dialog, { onCancel: cancel, initialFocus: go });
}
function resumeSavedGame(saved) {
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
    ui.gameSaved = true;
    ui.deckDark = false;
    startError.hidden = true;
    closeStart();
    render();
    prefetchDeckImages();
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
    queue: queue.map(e => ({ id: e.data.id, tokens: e.tokens, hp: e.hp, turnHp: e.turnHp, isNew: !!e.isNew, paid: !!e.paid, bornTurn: e.bornTurn,
      // v214: vita impostata (solo i minion a vita variabile)
      // (v218: con la sua vita massima, quella impostata la prima volta)
      ...(isVariableMinion(e.data) ? { hpSet: !!e.hpSet, hpMax: typeof e.hpMax === 'number' ? e.hpMax : null } : {}) })),
    resolving,
    currentIndex,
    newIndex,
    // In più rispetto alla v48 (i salvataggi senza questi campi restano validi)
    maxTierDrawn,
    stats: JSON.parse(JSON.stringify(stats)),
    turnOrder: { left: turnOrder.left.slice(), drawn: turnOrder.drawn.slice(), round: turnOrder.round, wild: turnOrder.wild || null,
      picks: JSON.parse(JSON.stringify(turnOrder.picks || {})),
      // v220: memoria delle carte 1/2 e 3/4 (a chi tocca la prossima carta della coppia)
      pairNext: emptyPairNext(turnOrder.pairNext),
      // v222: storia dei turni del giro (barra dei turni)
      history: JSON.parse(JSON.stringify(turnOrder.history || [])),
      // v211: carte del mazzo note (parallelo a left) e turno annullato in attesa della carta turno
      known: turnOrder.left.map((k, i) => !!(turnOrder.known && turnOrder.known[i])), waiting: !!turnOrder.waiting }
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
  const newQueue = s.queue.map(q => Object.assign(makeEntry(get(q.id)), {
    tokens: q.tokens, hp: q.hp, turnHp: q.turnHp === undefined ? q.hp : q.turnHp, isNew: !!q.isNew, paid: !!q.paid,
    bornTurn: typeof q.bornTurn === 'number' ? q.bornTurn : s.turn
  }, isVariableMinion(get(q.id)) ? { hpSet: !!q.hpSet,
    // Vita massima (v218); salvataggi della v214-v217 senza il campo: la più alta tra vita e vita di inizio turno
    hpMax: typeof q.hpMax === 'number' ? q.hpMax : (q.hpSet ? Math.max(q.hp || 0, q.turnHp || 0) : undefined) } : {}));

  clearTransition();
  ui.drafts.clear();
  ui.flyingDiscards = 0;
  // Una creazione del mazzo interrotta (ripresa o undo): si va direttamente alla partita
  ui.deckBuilding = false;
  ui.deckShown = null;
  ui.deckDark = false;
  closeDeckBuild();
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
  // Salvataggi senza statistiche: si parte da zero (mazzo iniziale = tutte le carte della partita)
  stats = Object.assign(emptyStats(deck.length + queue.length + discard.length), s.stats ? JSON.parse(JSON.stringify(s.stats)) : {});
  stats.minions = Array.isArray(stats.minions) ? stats.minions : [];
  stats.cards = Object.assign(emptyStats(0).cards, stats.cards || {});
  stats.tierAt = Object.assign({}, stats.tierAt || {});
  stats.mages = stats.mages && typeof stats.mages === 'object' ? stats.mages : {};

  if (s.resolving && queue.length === 0 && deck.length > 0) {
    // Turno nemesi con la coda vuota (per esempio il primo turno, se il mazzo dei turni dà subito la nemesi):
    // si torna alla carta da pescare
    resolving = true;
    currentIndex = 0;
    newIndex = -1;
    ui.viewedUid = DRAW_UID;
  } else if (s.resolving && queue.length > 0) {
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
  // Mazzo dei turni. Salvataggi senza (prima della v168): giro nuovo con il turno in corso già estratto
  const savedOrder = s.turnOrder;
  // (drawn vuoto: attesa di "Pesca carta turno", v193, per esempio con l'undo)
  // (v222: nel turno nemesi basta un turno nella storia: la sua carta può essere tornata nel mazzo)
  if (savedOrder && Array.isArray(savedOrder.left) && Array.isArray(savedOrder.drawn)
    && (savedOrder.drawn.length || (Array.isArray(savedOrder.history) && savedOrder.history.length) || !resolving)) {
    // Salvataggi della v168 senza il contatore dei giri: si parte dai turni nemesi giocati
    turnOrder = { left: savedOrder.left.slice(), drawn: savedOrder.drawn.slice(),
      round: typeof savedOrder.round === 'number' ? savedOrder.round : Math.max(1, s.turn),
      // Salvataggi prima della v179 con 3 giocatori: il jolly si sceglie a caso
      wild: Number(settings.players) === 3
        ? (savedOrder.wild >= 1 && savedOrder.wild <= 3 ? savedOrder.wild : 1 + Math.floor(Math.random() * 3)) : null,
      // Giocatori scelti per le carte 1/2 e 3/4 (v192; prima non c'erano)
      picks: savedOrder.picks && typeof savedOrder.picks === 'object' ? Object.assign({}, savedOrder.picks) : {} };
    // Carte note e attesa (v211; senza il campo: nessuna carta nota, nessun turno annullato)
    const known = Array.isArray(savedOrder.known) && savedOrder.known.length === turnOrder.left.length ? savedOrder.known : [];
    turnOrder.known = turnOrder.left.map((k, i) => !!known[i]);
    // (v222: il turno non si annulla più; resta per i salvataggi v211-v221 con un turno annullato)
    turnOrder.waiting = !!savedOrder.waiting && !resolving && turnOrder.drawn.length > 0;
    // Carte 1/2 e 3/4 (v220): picks come { player, forced } e memoria per coppia. Salvataggi di prima (picks a stringhe,
    // senza pairNext): la seconda carta della coppia nel giro non aveva un pick (si deduceva dalla prima): si ricostruisce
    // come obbligata, e la memoria dalle carte del giro
    if (savedOrder.pairNext && typeof savedOrder.pairNext === 'object') {
      const picks = {};
      Object.keys(turnOrder.picks).forEach(i => { const p = pickOf(turnOrder, Number(i)); if (p) picks[i] = { player: p.player, forced: !!p.forced }; });
      turnOrder.picks = picks;
      turnOrder.pairNext = emptyPairNext(savedOrder.pairNext);
    } else {
      const picks = {};
      const next = { p12: null, p34: null };
      turnOrder.drawn.forEach((kind, i) => {
        if (!isPairCard(kind)) return;
        const p = pickOf(turnOrder, i);
        if (p) { picks[i] = { player: p.player, forced: false }; next[kind] = otherOfPair(kind, p.player); }
        else if (next[kind]) { picks[i] = { player: next[kind], forced: true }; next[kind] = null; }
      });
      turnOrder.picks = picks;
      turnOrder.pairNext = next;
    }
    // Storia dei turni del giro (v222); salvataggi di prima: un turno per ogni carta negli scarti dei turni
    turnOrder.history = Array.isArray(savedOrder.history)
      ? savedOrder.history.filter(e => e && e.kind).map(e => ({ kind: e.kind, player: e.player || null, forced: !!e.forced,
        pos: typeof e.pos === 'number' && e.pos >= 0 && e.pos < turnOrder.drawn.length ? e.pos : null }))
      : historyFromPile(turnOrder);
  } else {
    turnOrder = { left: [], drawn: [], round: Math.max(1, s.turn) - 1, known: [], waiting: false, pairNext: emptyPairNext(), history: [] };
    drawTurnCard(c => (resolving ? c === 'nemesis' : c !== 'nemesis'));
  }
}

// La partita si salva solo dal primo turno nemesi (prima, anche durante "Crea mazzo", non si scrive niente e resta
// l'eventuale partita salvata prima). Una partita già salvata (ripresa, o tornata al turno 0 con l'undo) si salva sempre.
function save() {
  // Modalità test (v215): niente salvataggio, la partita salvata vera resta com'è
  if (testRun) return;
  if (turn < 1 && !ui.gameSaved) return;
  ui.gameSaved = true;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, settings, state: snapshot(), undo: undoStack }));
  } catch (err) {
    console.warn('Salvataggio non riuscito', err);
  }
}

function readSave() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    // Salvataggio di un'altra versione (prima della v210: carte con gli id vecchi): si ignora e si cancella
    if (saved && saved.version !== SAVE_VERSION) {
      localStorage.removeItem(SAVE_KEY);
      return null;
    }
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

// Scritta al centro ("Tier 2", "Tier 3", "Partita iniziata"), marcata: entra ingrandendosi con un bagliore dorato,
// resta, poi svanisce (1,76 s). App oscurata e non si può toccare; dopo si continua normalmente.
// Un testo lungo ha un carattere più piccolo (is-long), così sta nello schermo del telefono.
const TIER_BANNER_MS = 1760;
// Perché a volte andava a scatti: l'animazione partiva nello stesso fotogramma in cui la scritta veniva creata (e il
// carattere Cinzel a 64px poteva non essere ancora pronto), insieme al ridisegno dell'app. Ora: il carattere si carica
// all'avvio (preloadBannerFont); la scritta entra ferma e invisibile (is-preparing), si aspetta che il carattere sia
// pronto (al massimo 300 ms) e due fotogrammi, poi parte l'animazione.
function showBanner(text) {
  const banner = el('div', 'ae-tier-banner is-preparing');
  banner.setAttribute('role', 'status');
  banner.appendChild(el('span', 'ae-tier-banner-text' + (text.length > 8 ? ' is-long' : ''), text));
  document.body.appendChild(banner);
  let started = false;
  const go = () => {
    if (started) return;
    started = true;
    void banner.offsetWidth;
    banner.classList.remove('is-preparing');
    buzz([40, 60, 120]);
    setTimeout(() => banner.remove(), TIER_BANNER_MS);
  };
  const fontReady = document.fonts && document.fonts.load ? document.fonts.load(BANNER_FONT, text).catch(() => {}) : Promise.resolve();
  Promise.race([fontReady, new Promise(r => setTimeout(r, 300))]).then(() => {
    if (window.requestAnimationFrame) requestAnimationFrame(() => requestAnimationFrame(go));
    // il browser di prova non esegue requestAnimationFrame
    setTimeout(go, 60);
  });
}
const BANNER_FONT = '600 64px Cinzel';
function preloadBannerFont() {
  if (document.fonts && document.fonts.load) document.fonts.load(BANNER_FONT, 'Tier 123 Partita iniziata Vittoria!').catch(() => {});
}

// Vibrazione breve (solo dove il telefono la supporta: Android; iOS la ignora)
function buzz(pattern) {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (err) { /* niente vibrazione */ }
}

// Disegna tutto in base allo stato
// Nome della nemesi in testata (v216): il blocco è largo al massimo quanto la sua colonna (style.css .ae-phase
// max-width) e, se a 18px il nome non ci sta, il carattere scende in proporzione finché ci sta tutto, senza limite
// inferiore. L'altezza della riga resta 24px (line-height in px) e il letter-spacing in em segue la dimensione.
// root: la testata della partita o la sua copia (finestra del mazzo dei turni). Vale anche per il nome toccabile di
// "Crea mazzo" (.ae-phase-name--button). Si ricalcola a ogni render, al ridimensionamento e dopo il caricamento dei
// caratteri (document.fonts.ready), così non si misura con il carattere di riserva.
function fitPhaseName(root = phaseLabel) {
  const name = root && root.querySelector('.ae-phase-name');
  if (!name || !name.isConnected) return;
  name.style.fontSize = '';
  const style = getComputedStyle(name);
  const pad = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
  const room = name.clientWidth - pad;
  const text = name.scrollWidth - pad;
  // Nome nascosto (pagina iniziale sopra, testata non disegnata) o che ci sta già: carattere di base
  if (room <= 0 || text <= room + 0.5) return;
  const base = parseFloat(style.fontSize) || 18;
  let size = Math.floor(base * room / text * 100) / 100;
  name.style.fontSize = size + 'px';
  // Arrotondamenti del testo: si scende ancora di poco finché non c'è più niente di nascosto
  for (let i = 0; i < 12 && name.scrollWidth > name.clientWidth; i++) {
    size = Math.floor(size * 98) / 100;
    name.style.fontSize = size + 'px';
  }
}
window.addEventListener('resize', () => fitPhaseName());
// (la larghezza della testata cambia anche senza l'evento resize: rotazione, colonna del desktop, barra di scorrimento)
if (window.ResizeObserver) {
  let lastHeaderWidth = 0;
  new ResizeObserver(entries => {
    const width = Math.round(entries[0].contentRect.width);
    if (width === lastHeaderWidth) return;
    lastHeaderWidth = width;
    fitPhaseName();
  }).observe(document.getElementById('topbar'));
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fitPhaseName());

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
  // "Turno N" = giri del mazzo dei turni (v169; prima erano i turni nemesi)
  const turnText = el('span', '', I18N_IT.turnN(turnOrder.round));
  turnText.hidden = !(turnOrder.round >= 1);
  // Battaglia della nemesi: numero dentro la fiamma (Assets/ui/icons/flame.png); le informazioni sono separate da |
  const battleNo = battleOf(settings.nemesis);
  const battle = el('span', 'ae-battle-flame', battleNo ? String(battleNo) : '?');
  battle.setAttribute('role', 'img');
  battle.setAttribute('aria-label', battleNo ? I18N_IT.battle(battleNo) : I18N_IT.battleMissing);
  const sep = () => { const s = el('span', 'ae-info-sep', '|'); s.setAttribute('aria-hidden', 'true'); return s; };
  const sep2 = sep();
  sep2.hidden = turn < 1;
  turnLine.append(battle, sep(), playersIcon, sep2, turnText);
  phaseLabel.replaceChildren(el('span', 'ae-phase-name', settings.nemesis || ''), turnLine);
  // Modalità test (v215): "TEST · <scenario>" sempre visibile, sotto il nome della nemesi (non copre i comandi)
  if (testRun) phaseLabel.appendChild(el('span', 'ae-phase-test', I18N_IT.testLabel(testRun.name)));
  queueView.hidden = resolving;
  // la classe si toglie solo a vista nascosta (toglierla a vista visibile farebbe ripartire la dissolvenza)
  if (resolving) queueView.classList.remove('is-from-nemesis');
  resolveView.hidden = !resolving;
  app.classList.toggle('is-nemesis-turn', resolving);
  if (!resolving) app.classList.remove('is-draw-phase');
  nemesisBtn.hidden = resolving;
  nemesisBtn.disabled = !deckSetup;
  // "Turno Nemesi" con l'illustrazione della nemesi della partita (come nel menu iniziale), velata per leggere la scritta
  // Turno di un giocatore (o del jolly): niente illustrazione, fondo tenue del colore del giocatore (v169)
  const turnCard = currentTurnCard();
  // (jolly: il colore del giocatore che è jolly in questo giro)
  // (carta 1/2 o 3/4 non ancora scelta: metà e metà dei due colori, v192)
  // (attesa di "Pesca carta turno", v193: fondo grigio chiaro tenue, come il jolly)
  const playerKind = turnCardPlayer(turnCard) || (turnCard === 'wild' || isPairCard(turnCard) ? turnCard : null)
    || (awaitingTurnCard() ? 'wild' : null);
  nemesisBtn.classList.toggle('has-player-color', !!playerKind);
  if (playerKind) nemesisBtn.dataset.kind = playerKind;
  else delete nemesisBtn.dataset.kind;
  const nemesisArtNow = !playerKind && settings.nemesis && nemesisArt[settings.nemesis];
  nemesisBtn.classList.toggle('has-nemesis-art', !!nemesisArtNow);
  if (nemesisArtNow) nemesisBtn.style.setProperty('--ae-nemesis-art', `url("${encodeURI(nemesisArtNow.portrait)}")`);
  else nemesisBtn.style.removeProperty('--ae-nemesis-art');
  nemesisBtn.setAttribute('aria-disabled', String(ui.isTransitioning));
  // Turno giocatori con modifiche non salvate: il pulsante principale le salva
  const saving = !resolving && ui.drafts.size > 0;
  // v194: a inizio giro (dopo il primo) "Pesca la prima carta turno"; all'ultimo turno del giro "Fine turno · Mischia mazzo"
  // (durante l'animazione del mazzo mischiato resta "Fine turno · Mischia mazzo")
  nemesisBtn.textContent = saving ? I18N_IT.saveChanges
    : ui.trackShuffle ? I18N_IT.endTurnShuffle
    : awaitingTurnCard() ? (turnOrder.round >= 1 && !(turnOrder.history || []).length ? I18N_IT.drawFirstTurnCard : I18N_IT.drawTurnCard)
    : turnRoundOver() ? I18N_IT.endTurnShuffle : I18N_IT.endTurn;
  nemesisBtn.classList.toggle('is-save', saving);
  // "Crea mazzo": al posto del pulsante lo slider; sfondo nero fino alla fine del banner "Partita iniziata"
  if (ui.deckBuilding) nemesisBtn.hidden = true;
  if (deckSlider) deckSlider.box.hidden = !ui.deckBuilding;
  app.classList.toggle('is-deck-dark', ui.deckDark);
  app.classList.toggle('is-deck-building', ui.deckBuilding);
  // Nome della nemesi: durante "Crea mazzo" si tocca e apre la finestra con nemesi e giocatori
  const phaseName = phaseLabel.querySelector('.ae-phase-name');
  if (ui.deckBuilding && phaseName) {
    const nameBtn = el('button', 'ae-phase-name ae-phase-name--button', settings.nemesis || '');
    nameBtn.type = 'button';
    nameBtn.setAttribute('aria-haspopup', 'dialog');
    nameBtn.addEventListener('click', openGameSetup);
    phaseName.replaceWith(nameBtn);
  }
  fitPhaseName();
  if (cancelDraftsBtn) {
    cancelDraftsBtn.hidden = !saving || ui.deckBuilding;
    cancelDraftsBtn.parentElement.hidden = resolving;
  }
  updateInfo();
  renderDockPiles();
  renderTurnTrack();
  updateUndoBtn();
  if (ui.tierBanner) {
    ui.tierWaitUntil = performance.now() + TIER_BANNER_MS;
    showBanner(I18N_IT.tierN(ui.tierBanner));
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
  // Minion con vita "?" (v218): non si mette in gioco finché non si imposta la vita; il pulsante apre la sua scheda
  if (hpUnset(entry)) return I18N_IT.ctaSetHp;
  // (ultima carta del giro dei turni: "Metti in gioco · Mischia mazzo", v194)
  if (isNew) return data.type === 'Attack' ? I18N_IT.ctaResolved
    : turnRoundOver() ? I18N_IT.ctaPutInPlayShuffle : I18N_IT.ctaPutInPlayEnd;
  // Potere: il token se ne va da solo; il pulsante dice solo cosa succede dopo
  if (data.type === 'Power') return tokens > 1 ? I18N_IT.ctaPowerNext : I18N_IT.ctaPowerLast;
  // Minion (resta in gioco) e attacco (va negli scarti)
  return I18N_IT.ctaResolved;
}

// Fascia del turno nemesi dentro .ae-rail-row (creata qui una volta sola) e classi della fase di pesca
function renderResolveInfo(drawStep) {
  if (!rail.parentElement.classList.contains('ae-rail-row')) {
    const row = el('div', 'ae-rail-row');
    rail.before(row);
    row.appendChild(rail);
  }
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
  // Fase di risoluzione: al posto della carta da pescare solo una cornice tratteggiata grigia (come mazzo e scarti vuoti)
  else if (!drawStep && newIndex < 0 && canDraw()) railItems.push(nextSlotItem());
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
    // Solo la vita attuale: "x/X" si vede solo mentre si fa danno (box del turno giocatori e finestra della vita)
    // (v214: "?" per un minion a vita variabile non ancora impostata)
    status.append(icon('heart'), el('span', '', hpUnset(entry) ? '?' : String(entry.hp)));
    // (v218: il box "?" si tocca e apre la scheda della carta, unsetHpClick)
    if (hpUnset(entry)) { status.classList.add('is-unset'); status.dataset.uid = String(entry.uid); }
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
const PEEK_VISIBLE = 14;   // px visibili di ogni carta vicina
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
  // Carta da risolvere: lampeggia di rosso come l'attacco pescato (non i poteri con più di un token)
  if (newIndex < 0 && entry === queue[currentIndex] && !(entry.data.type === 'Power' && entry.tokens > 1)) {
    stage.classList.add('is-to-resolve');
  }
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
      scrollFocusTo(prevUid, false, true);
      scrollFocusTo(viewed.uid, true);
    } else {
      scrollFocusTo(viewed.uid, false, true);
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

// smooth = scorrimento animato. Senza smooth la carta va al centro subito, tranne quando è in corso uno scorrimento
// animato avviato dallo script: allora si aggiorna solo la meta (altrimenti un ridisegno o un ridimensionamento
// interromperebbe l'animazione con un salto). jump = salto immediato comunque (carosello appena ridisegnato, misure).
function scrollFocusTo(uid, smooth, jump = false) {
  const slide = focusTrack && focusTrack.querySelector(`.ae-focus-slide[data-uid="${uid}"]`);
  if (!slide) return;
  const left = slide.offsetLeft + slide.offsetWidth / 2 - focusEl.clientWidth / 2;
  if (!smooth && !jump && performance.now() < focusProgrammaticUntil) smooth = true;
  if (Math.abs(focusEl.scrollLeft - left) < 1) return;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (smooth && !reduce) {
    focusProgrammaticUntil = performance.now() + FAST_SCROLL_MS + 200;
    fastScrollTo(focusEl, left);
  } else {
    cancelFastScroll(focusEl);
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
// Sopra la carta il box vita/token (STATUS_H + 8 di spazio); i comandi del turno giocatori (52px) stanno sotto, quindi
// si riserva lo spazio anche nel turno nemesi; il blocco è centrato in verticale.
// Altezza della riga vita/token sopra la carta: deve restare uguale a style.css .ae-focus-status e .queue-slot
const STATUS_H = 37;
function sharedCardWidth(boxW, boxH, padY, peekRoom) {
  const byWidth = boxW - 16 - peekRoom; // 8px di margine per lato
  const byHeight = (boxH - padY - STATUS_H - 8) / CARD_RATIO;
  const byControls = (boxH - 2 * 52 - STATUS_H - 8) / CARD_RATIO;
  return Math.floor(Math.min(byWidth, byHeight, byControls));
}

// Tablet e desktop (da 768px): la partita sta in una colonna al centro (--ae-col su .ae-shell, style.css). La colonna
// è larga quanto la carta grande (misurata solo dall'altezza: in larghezza c'è spazio) più un pezzo delle vicine
// (COLUMN_PEEK per lato), mai meno di COLUMN_MIN né più dello schermo. Sotto i 768px la colonna è lo schermo intero.
const COLUMN_MIN = 440;
const COLUMN_PEEK = 42;
function sizeColumn(box) {
  if (window.innerWidth < 768) { app.style.removeProperty('--ae-col'); return; }
  const style = getComputedStyle(box);
  const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  const card = sharedCardWidth(Infinity, box.clientHeight, padY, 0);
  if (!isFinite(card) || card <= 0) return;
  const col = Math.min(window.innerWidth, Math.max(COLUMN_MIN, card + 2 * (COLUMN_PEEK + PEEK_GAP) + 16));
  const current = parseFloat(app.style.getPropertyValue('--ae-col')) || 0;
  if (Math.abs(current - col) >= 1) app.style.setProperty('--ae-col', col + 'px');
}

// Dimensiona le carte del carosello: alte quanto lo spazio, ma più strette dell'area quanto basta per vedere un pezzo
// delle vicine. Il margine ai lati permette di centrare anche la prima e l'ultima carta.
const BIG_CARD_SCALE = 0.9;
function sizeFocus(recentre = true) {
  if (resolveView.hidden || !focusTrack) return;
  const slide = focusTrack.querySelector('.ae-focus-slide');
  if (!slide) return;
  sizeColumn(focusEl);
  const style = getComputedStyle(focusEl);
  const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  const peekRoom = queue.length > 1 ? 2 * (PEEK_VISIBLE + PEEK_GAP) : 0;
  const width = Math.max(40, sharedCardWidth(focusEl.clientWidth, focusEl.clientHeight, padY, peekRoom));
  focusEl.style.setProperty('--ae-focus-w', width + 'px');
  focusEl.style.setProperty('--cw', width + 'px');
  focusTrack.style.paddingInline = Math.max(0, (focusEl.clientWidth - width) / 2) + 'px';
  // Carta da pescare e carta pescata: più grandi (fino al 30%), stessa misura per dorso e fronte. Cresce solo la carta:
  // la riga vita/token resta grande come nelle altre carte. Il blocco (riga + carta) è centrato in verticale tra la
  // fascia piccola e il pulsante (style.css .ae-focus-slide.is-big), con 4px di margine sopra e sotto.
  const byHeight = (focusEl.clientHeight - 8 - STATUS_H - 8) / CARD_RATIO;
  // ... ridotta al 90% (BIG_CARD_SCALE) della misura massima: a tutta grandezza era troppo grande
  const bigW = Math.floor(Math.max(width, Math.min(width * 1.3, byHeight, focusEl.clientWidth - 16)) * BIG_CARD_SCALE);
  focusEl.style.setProperty('--ae-big-w', bigW + 'px');
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
  // Mazzo vuoto (non si rimescola): si torna alla VistaCoda
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
  // Carta pescata: vibrazione breve, doppia e più forte per un attacco (la scritta Tier, se c'è, ha la sua)
  buzz(data.type === 'Attack' ? [80, 60, 80] : 30);
  // Prima carta del Tier 2 o del Tier 3: scritta "Tier N" al centro (mostrata da render)
  if (data.tier >= 2 && data.tier > maxTierDrawn) {
    ui.tierBanner = data.tier;
    // Statistiche: da qui comincia il tempo del nuovo Tier
    if (!stats.tierAt) stats.tierAt = {};
    stats.tierAt[data.tier] = Date.now();
  }
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

// "Fine turno" nel turno di un giocatore: finisce il turno e si estrae il turno dopo dal mazzo dei turni.
// Nemesi: parte il turno nemesi; giocatore o jolly: resta il turno giocatori, con il colore nuovo nella barra.
function endPlayerTurn() {
  // Danno e cura del turno si azzerano (la vita attuale diventa il riferimento)
  queue.forEach(e => { e.turnHp = e.hp; });
  // Poteri con il costo pagato: vanno negli scarti; le modifiche non salvate si perdono
  ui.drafts.clear();
  queue.filter(isGone).forEach(discardGone);
  if (nextTurnCard() === 'nemesis') nemesisTurn();
}

// Fine del turno nemesi ("Metti in gioco · Fine turno nemesi"): si estrae il turno dopo; se è di nuovo la nemesi, il
// turno nemesi riparte subito. Ultima carta del giro: mazzo dei turni mischiato e attesa (v194)
function afterNemesisTurn() {
  if (nextTurnCard() === 'nemesis') nemesisTurn();
}

// Animazione "mazzo mischiato" della barra della fase (v194), a fine giro. Le scritte sotto la barra svaniscono e le
// caselle diventano grigie e tutte uguali (render con ui.trackShuffle, transizioni di style.css); poi, veloci, le 6
// caselle si uniscono in una sola al centro, si fermano un attimo e tornano al loro posto. fadeMs: attesa della
// dissolvenza (0 se è già avvenuta, per esempio durante il passaggio dal turno nemesi)
const SHUFFLE_FADE_MS = 320;
const SHUFFLE_MERGE_MS = 760;
function beginTrackShuffle() {
  ui.trackShuffle = true;
  turnTrack.classList.add('is-shuffling');
}
function playTurnShuffle(fadeMs) {
  beginTrackShuffle();
  const motion = !reducedMotion.matches && !!turnTrackBar.animate;
  const fade = motion ? fadeMs : 0;
  const merge = motion ? SHUFFLE_MERGE_MS : 0;
  lockFor(fade + merge + 40, () => {
    ui.trackShuffle = false;
    turnTrack.classList.remove('is-shuffling');
    nemesisBtn.focus({ preventScroll: true });
    announce(I18N_IT.drawFirstTurnCard);
  });
  render();
  if (!motion) return;
  setTimeout(() => {
    const bar = turnTrackBar.getBoundingClientRect();
    const cx = bar.left + bar.width / 2;
    [...turnTrackBar.children].forEach(seg => {
      const r = seg.getBoundingClientRect();
      const dx = cx - (r.left + r.width / 2);
      seg.animate([
        { transform: 'none' },
        { transform: `translateX(${dx}px)`, offset: 0.3 },
        { transform: `translateX(${dx}px)`, offset: 0.62 },
        { transform: 'none' }
      ], { duration: merge, easing: 'ease-in-out' });
    });
  }, fade);
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
      stats.attacksResolved++;
      statCard('attacksResolved', data);
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
    if (data.type === 'Power') { stats.powersResolved++; statCard('powersResolved', data); }
    else if (data.type === 'Attack') { stats.attacksResolved++; statCard('attacksResolved', data); }
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
    const roundAtDraw = turnOrder.round;
    act(() => {
      drawNewCard();
      // Mazzo vuoto: il turno nemesi finisce e si estrae il turno dopo
      if (!resolving) afterNemesisTurn();
    });
    if (resolving) {
      showActive(activeEntry());
      lockFor(duration('focus'));
    }
    render();
    // (mazzo vuoto all'ultimo turno del giro: mazzo dei turni mischiato, v194)
    if (!resolving && awaitingTurnCard() && turnOrder.round !== roundAtDraw) playTurnShuffle(SHUFFLE_FADE_MS);
    return;
  }
  const active = activeEntry();
  if (!active || ui.viewedUid !== active.uid) return;
  // Minion con vita "?" (v218): "Imposta la vita" apre la scheda della carta; si va avanti solo dopo averla impostata
  if (hpUnset(active)) {
    if (ui.reveal && ui.reveal.uid === active.uid && ui.reveal.status !== 'done') return;
    openCardDialog(active);
    return;
  }
  const ghostSource = focusEl.querySelector(`.ae-focus-slide[data-uid="${active.uid}"] .ae-focus-stage`);
  const wasNewStep = newIndex >= 0;
  const turnBefore = turn;
  const roundBefore = turnOrder.round;
  const effect = act(() => {
    const result = resolveCurrent();
    // Fine del turno nemesi: si estrae il turno dopo dal mazzo dei turni
    if (!resolving) afterNemesisTurn();
    return result;
  });
  // Dal mazzo dei turni è uscita di nuovo la nemesi: il turno nemesi riparte (scossa e annuncio)
  if (resolving && turn !== turnBefore) {
    shakeApp();
    announce(I18N_IT.trackNemesisResolve);
  }

  // Fine dell'ultimo turno del giro (v194): mazzo dei turni mischiato; scritte e colori della barra svaniscono durante
  // il passaggio al turno giocatori, poi le caselle si uniscono e si separano
  const roundShuffled = !resolving && awaitingTurnCard() && turnOrder.round !== roundBefore;
  const shuffleAfter = roundShuffled ? () => playTurnShuffle(0) : undefined;
  if (roundShuffled) beginTrackShuffle();
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
      // Il blocco dura anche per l'entrata delle carte da sinistra: lockFor alla fine ridisegna, e farlo prima
      // interromperebbe l'animazione
      const flyMs = reducedMotion.matches ? 150 : FLY_MS + 80;
      lockFor(flyMs + (reducedMotion.matches ? 0 : ENTER_MS + 40), shuffleAfter);
      setTimeout(() => { toPlayersTurn(null); nemesisBtn.focus(); }, flyMs);
      return;
    }
    // Carta messa in gioco: passaggio morbido, la carta grande si trasforma nella carta del turno giocatori e le altre
    // entrano da sinistra (vedi toPlayersTurn)
    lockFor(reducedMotion.matches ? duration('phase') : Math.max(MORPH_MS, MORPH_MS / 2 + ENTER_MS) + 40, shuffleAfter);
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
  if (current && newIndex >= 0 && current.isNew && (!ui.reveal || ui.reveal.uid !== current.uid)) {
    startReveal(current);
    announce(I18N_IT.cardDrawn(current.data.name));
  }
  preloadNext();
}

function onNemesisClick(e) {
  if (resolving || ui.isTransitioning || !deckSetup) return;
  // Durante "Crea mazzo" al posto del pulsante c'è lo slider (deckSlider)
  if (ui.deckBuilding) return;
  // Con modifiche non salvate il pulsante è "Salva modifiche"
  if (ui.drafts.size) {
    saveAllDrafts();
    return;
  }
  // Carta x/y senza giocatore: si sceglie nella finestra (v193)
  if (needsPairChoice()) return;
  // Fine dell'ultimo turno del giro: mazzo dei turni mischiato, animazione, poi "Pesca la prima carta turno" (v194)
  const roundEnding = !awaitingTurnCard() && turnRoundOver();
  act(awaitingTurnCard() ? drawFirstTurn : endPlayerTurn);
  if (roundEnding) {
    playTurnShuffle(SHUFFLE_FADE_MS);
    return;
  }
  if (!resolving) {
    // Dal mazzo dei turni è uscito un giocatore (o il jolly): si resta nel turno giocatori, cambia il colore della barra
    render();
    announce(turnTrack.getAttribute('aria-label'));
    turnTrack.classList.remove('is-changed');
    void turnTrack.offsetWidth;
    turnTrack.classList.add('is-changed');
    return;
  }
  enterNemesisTurnView();
}

// Inizio del turno nemesi a schermo (dopo che lo stato è già passato al turno nemesi)
function enterNemesisTurnView() {
  // Urgenza: una breve scossa dello schermo e una vibrazione
  shakeApp();
  // Lo sfondo scorre verso il lato della nemesi (0,8 s, style.css .ae-shell): il token della prima carta aspetta
  ui.bgSlideUntil = reducedMotion.matches ? 0 : performance.now() + BG_SLIDE_MS;
  ui.viewedUid = null;
  // Le carte non spariscono e non ricompaiono: niente dissolvenza della vista, la fascia piccola resta dove era
  // (stesso scorrimento); cambiano solo lo sfondo e i pulsanti
  const railScroll = queueRail ? queueRail.scrollLeft : 0;
  // Le carte grandi partono dalla carta che si stava guardando e scorrono fino alla prima da risolvere (renderFocus)
  const shownUid = queue.length ? centredQueueUid() : null;
  if (shownUid !== null && entryByUid(shownUid)) focusEl.dataset.uid = String(shownUid);
  else delete focusEl.dataset.uid;
  if (resolving) {
    showActive(activeEntry());
    resolveView.classList.remove('is-entering');
    lockFor(duration('phase'));
  }
  render();
  if (resolving) {
    rail.scrollLeft = railScroll;
    const current = rail.querySelector('[aria-current="true"]');
    if (current) scrollItemInto(rail, current, 'nearest');
  }
  if (resolving) resolveBtn.focus();
  // Coda vuota: si va subito alla carta da pescare, che arriva dal mazzo
  if (isDrawStep()) animateDrawIn();
}

// Scossa breve dell'app all'inizio del turno nemesi (niente con riduzione del movimento)
function shakeApp() {
  buzz([60, 40, 60]);
  if (reducedMotion.matches) return;
  app.classList.remove('is-shaking');
  void app.offsetWidth;
  app.classList.add('is-shaking');
  setTimeout(() => app.classList.remove('is-shaking'), 520);
}

// Mostra un'altra carta senza risolvere nulla (anteprima): non cambia mazzo, vita, token, scarti, turno, undo
function viewCard(uid) {
  if (!resolving || ui.holdUid) return;
  if ((uid === DRAW_UID ? !isDrawStep() : !entryByUid(uid)) || ui.viewedUid === uid) return;
  ui.viewedUid = uid;
  renderResolve();
}

function moveView(step) {
  const i = queue.findIndex(e => e.uid === ui.viewedUid);
  const next = queue[i + step];
  if (next) viewCard(next.uid);
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

// Carte grandi del turno giocatori: una carta non al centro si porta al centro; si apre solo quella al centro
queueList.addEventListener('click', e => {
  const item = e.target.closest('.ae-queue-item');
  if (!item || queueViewport.dataset.dragged === '1') return;
  const uid = Number(item.dataset.uid);
  if (uid !== centredQueueUid()) {
    scrollQueueTo(item.closest('.queue-slot') || item);
    markQueueRail(uid);
    return;
  }
  const entry = entryByUid(uid);
  if (entry) openCardDialog(entry);
});

rail.addEventListener('click', e => {
  const item = e.target.closest('.ae-queue-item');
  if (!item || rail.dataset.dragged === '1') return;
  viewCard(Number(item.dataset.uid));
});

// Box della vita "?" di un minion a vita variabile (v218), ovunque compaia (carta grande, fascia piccola, riga del
// turno nemesi): un tocco apre la scheda della carta per impostare la vita. In cattura, così la fascia o la coda non
// fanno anche il loro tocco (scorrere, portare la carta al centro)
function unsetHpClick(e) {
  const box = e.target.closest && e.target.closest('.ae-status-badge.is-unset, .ae-focus-status.is-unset');
  if (!box || ui.isTransitioning || modals.length) return;
  const entry = entryByUid(Number(box.dataset.uid));
  if (!entry || !hpUnset(entry)) return;
  if (ui.reveal && ui.reveal.uid === entry.uid && ui.reveal.status !== 'done') return;
  e.stopPropagation();
  e.preventDefault();
  openCardDialog(entry);
}
document.addEventListener('click', unsetHpClick, true);

// Carosello del turno nemesi: toccando il retro della carta da pescare si pesca; toccando un minion (quello al centro)
// si apre la stessa finestra del turno giocatori, con −1 e +1 alla vita
focusEl.addEventListener('click', e => {
  if (!resolving || ui.isTransitioning) return;
  const stage = e.target.closest('.ae-focus-stage');
  const slide = stage && stage.closest('.ae-focus-slide');
  if (!slide) return;
  const uid = Number(slide.dataset.uid);
  // Carta non al centro: si porta al centro (come un tocco sulla fascia), non si apre
  if (uid !== ui.viewedUid) { viewCard(uid); return; }
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

// Barra della fase sotto la testata (v168): 6 caselle, una per carta del mazzo dei turni (turnOrder), nell'ordine in
// cui sono state estratte. La casella del turno in corso è accesa (8px, colore pieno e bagliore), quelle dei turni già
// giocati in questo giro sono linee sottili colorate e velate, quelle ancora da estrarre linee grigie.
// Colori: giocatori 1-4 verde, giallo, blu, viola; jolly grigio chiaro; nemesi rosso scuro (style.css).
// Nel turno nemesi sotto la casella accesa c'è la scritta "Nemesi · Risolvi" o "Nemesi · Pesca"; nel turno di un
// giocatore niente scritta (basta il colore; il turno è detto nell'aria-label).
const turnTrack = el('div', 'ae-turn-track');
// v206: toccando la barra si apre il mazzo dei turni (rivela, rimescola dagli scarti, ordina)
turnTrack.setAttribute('role', 'button');
turnTrack.tabIndex = 0;
turnTrack.addEventListener('click', () => openTurnScreen());
turnTrack.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTurnScreen(); } });
const turnTrackBar = el('div', 'ae-turn-track-bar');
const turnTrackLabels = el('div', 'ae-turn-labels');
const turnTrackLabel = el('span', 'ae-turn-label');
turnTrackLabels.appendChild(turnTrackLabel);
turnTrack.append(turnTrackBar, turnTrackLabels);
mainEl.prepend(turnTrack);

function renderTurnTrack() {
  turnTrack.hidden = !!ui.deckBuilding;
  if (ui.deckBuilding) return;
  // v222: barra dei TURNI del giro, non delle carte: prima la storia (turni giocati e turno in corso, history), poi le
  // carte del mazzo dei turni (turni futuri, dalla cima). Una carta rimessa nel mazzo resta come turno passato e compare
  // anche come turno futuro, quindi le caselle possono essere più di 6 (si stringono: style.css --ae-seg-n)
  const history = turnOrder.history || [];
  const left = turnOrder.left || [];
  const total = Math.max(1, history.length + left.length);
  while (turnTrackBar.children.length < total) turnTrackBar.appendChild(el('span', 'ae-turn-seg'));
  while (turnTrackBar.children.length > total) turnTrackBar.lastChild.remove();
  turnTrackBar.style.setProperty('--ae-seg-n', String(Math.max(2, total)));
  // Turno in corso: l'ultimo della storia (salvataggi v211-v221 con un turno annullato: nessuna casella accesa)
  const cur = currentTurn() ? history.length - 1 : -1;
  const pastCount = cur >= 0 ? cur : history.length;
  // Carte del mazzo note (v212, turnOrder.known): colore tenue (is-known); per le 1/2 e 3/4 il giocatore dedotto dalla
  // memoria delle coppie (v222, predictedPairPlayers)
  const known = turnOrder.known || [];
  const predicted = predictedPairPlayers(turnOrder);
  const segInfo = i => {
    if (i < history.length) {
      const e = history[i];
      return { kind: e.kind, player: historyPlayer(e), past: i < pastCount, current: i === cur, known: false };
    }
    const j = i - history.length;
    if (!known[j]) return { kind: null };
    const kind = left[j];
    const player = kind === 'wild' ? (turnOrder.wild ? 'p' + turnOrder.wild : null)
      : isPairCard(kind) ? predicted[j] : (kind !== 'nemesis' ? kind : null);
    return { kind, player, past: false, current: false, known: true };
  };
  [...turnTrackBar.children].forEach((seg, i) => {
    const info = segInfo(i);
    const kind = info.kind;
    // Carta 1/2 o 3/4 (v192): con il giocatore deciso prende il suo colore, prima metà e metà dei due colori
    if (kind) seg.dataset.kind = isPairCard(kind) ? (info.player || kind) : kind;
    else delete seg.dataset.kind;
    // Jolly (v179): strisce bianche e del colore del giocatore che è jolly in questo giro
    const owner = kind === 'wild' ? info.player : null;
    if (owner) seg.dataset.owner = owner;
    else delete seg.dataset.owner;
    // Carta x/y (v194): sfumatura dai due colori (style.css ::after), che svanisce quando si sceglie il giocatore
    if (kind && isPairCard(kind)) seg.dataset.pair = kind;
    else delete seg.dataset.pair;
    seg.classList.toggle('is-current', !!info.current);
    seg.classList.toggle('is-past', !!info.past);
    seg.classList.toggle('is-known', !!info.known);
  });
  turnTrack.classList.toggle('is-nemesis', resolving);
  // Nessun turno in corso (attesa della carta turno): caselle tutte uguali (v194)
  turnTrackBar.classList.toggle('is-idle', cur < 0);
  // Mazzo dei turni appena mischiato (v194, playTurnShuffle): le scritte di prima restano e svaniscono (is-shuffling)
  if (ui.trackShuffle) {
    turnTrack.setAttribute('aria-label', I18N_IT.trackWaiting);
    renderPairChoice();
    return;
  }
  // Scritta sotto la casella accesa, centrata sotto di lei (v196, anche alle due estremità)
  const drawStep = resolving && (isDrawStep() || newIndex >= 0);
  const curKind = currentTurnCard();
  // Carta x/y senza giocatore: la scelta è nella finestra al centro (v193, renderPairChoice); sotto la casella "x / y"
  const choosing = !resolving && isPairCard(curKind) && !turnCardPlayer(curKind);
  turnTrackLabel.classList.toggle('is-choice', choosing);
  if (choosing) {
    turnTrackLabel.replaceChildren(pairOptions(curKind).map(p => p.slice(1)).join(' / '));
  } else if (resolving) {
    turnTrackLabel.replaceChildren(I18N_IT.trackNemesisName, el('span', 'ae-turn-label-dot'),
      drawStep ? I18N_IT.trackDraw : I18N_IT.trackResolve);
  } else {
    // Turno di un giocatore: "Giocatore N" nel colore del giocatore (v169); jolly: "Jolly · Giocatore N" (v179)
    const kind = currentTurnCard();
    const owner = turnCardPlayer(kind);
    if (kind === 'wild' && owner) {
      // "Jolly" bianco (v181) e solo il numero del giocatore, nel suo colore (v183: "Jolly · 2")
      turnTrackLabel.replaceChildren(el('span', 'ae-turn-label-wild', I18N_IT.trackWildName), el('span', 'ae-turn-label-dot'),
        owner.slice(1));
    } else {
      turnTrackLabel.replaceChildren(kind === 'wild' ? I18N_IT.trackWildName
        : owner ? I18N_IT.trackPlayerName(Number(owner.slice(1))) : '');
    }
  }
  const labelKind = resolving ? 'nemesis' : (turnCardPlayer(currentTurnCard()) || currentTurnCard());
  if (labelKind && !choosing) turnTrackLabel.dataset.kind = labelKind;
  else delete turnTrackLabel.dataset.kind;
  // Sotto le caselle dei turni già passati nel giro (v182): N = nemesi, 1-4 = giocatore, W = wild (v218, prima J =
  // jolly), nel loro colore
  turnTrackLabels.querySelectorAll('.ae-turn-mark').forEach(m => m.remove());
  // (v212: anche sotto le caselle future delle carte note del mazzo, più chiare)
  // Misure delle caselle (v222, n caselle): accesa 122px, le altre (100% - 122px - (n-1) × 6px) / (n-1); senza casella
  // accesa tutte (100% - (n-1) × 6px) / n
  const n = Math.max(2, total);
  const narrow = `((100% - 122px - ${(n - 1) * 6}px) / ${n - 1})`;
  const even = `((100% - ${(n - 1) * 6}px) / ${n})`;
  for (let i = 0; i < total; i++) {
    const info = segInfo(i);
    if (!info.kind || !(info.past || info.known)) continue;
    const kind = info.kind;
    // Carta x/y: il numero del giocatore che l'ha giocata (o "1/2" se non è stato scelto)
    const who = info.player;
    const mark = el('span', 'ae-turn-mark', kind === 'nemesis' ? 'N' : kind === 'wild' ? 'W'
      : isPairCard(kind) ? (who ? who.slice(1) : kind.slice(1).split('').join('/')) : kind.slice(1));
    mark.setAttribute('aria-hidden', 'true');
    mark.dataset.kind = who || kind;
    if (kind === 'wild') mark.classList.add('is-wild');
    if (info.known) mark.classList.add('is-known');
    // Centro della casella i: prima di quella accesa tutte strette; dopo, c'è davanti la casella accesa (122px)
    mark.style.left = cur < 0 ? `calc(${i} * (${even} + 6px) + ${even} / 2)`
      : i > cur ? `calc(${i - 1} * (${narrow} + 6px) + 128px + ${narrow} / 2)`
      : `calc(${i} * (${narrow} + 6px) + ${narrow} / 2)`;
    turnTrackLabels.appendChild(mark);
  }
  // v196: sempre centrata sotto la sua casella, anche alle due estremità (prima lì era allineata al bordo)
  turnTrackLabel.classList.remove('is-start', 'is-end');
  // Centro della casella accesa (v184, style.css .ae-turn-seg.is-current): accesa = 122px
  turnTrackLabel.style.left = cur >= 0 ? `calc(${cur} * (${narrow} + 6px) + 61px)` : '0%';
  const card = currentTurnCard();
  const name = awaitingTurnCard() ? I18N_IT.trackWaiting
    : resolving ? (drawStep ? I18N_IT.trackNemesisDraw : I18N_IT.trackNemesisResolve)
    : card === 'wild' ? (turnOrder.wild ? I18N_IT.trackWildOf(turnOrder.wild) : I18N_IT.trackWild)
    : isPairCard(card) ? (turnCardPlayer(card) ? I18N_IT.trackPlayer(Number(turnCardPlayer(card).slice(1)))
      : I18N_IT.trackPairChoose(...pairOptions(card).map(p => Number(p.slice(1)))))
    : card && card !== 'nemesis' ? I18N_IT.trackPlayer(Number(card.slice(1))) : '';
  turnTrack.setAttribute('aria-label', [name, cur >= 0 ? I18N_IT.trackPosition(cur + 1, total) : '', I18N_IT.turnDeckHint]
    .filter(Boolean).join(', '));
  // (v212: niente scelta x/y né riquadro mentre la finestra del mazzo dei turni disegna la sua copia della barra)
  if (ui.trackPreview) return;
  renderPairChoice();
}

// --- Mazzo dei turni: finestra unica (v211, al posto del menu e delle tre finestre della v206) ---
// Si apre toccando la barra della fase. È uno strumento libero: nessun vincolo per carta, le regole delle carte che
// agiscono sul mazzo dei turni (Hissing Acid, Sunder, Thunderous Tempest, Flare, Quartz Shard, Xaxos...) le applicano i
// giocatori. (v218: tolto il riquadro sopra il pulsante del turno nemesi per le carte nemesi che agiscono sul mazzo)
// Carta del mazzo dei turni disegnata come una piccola carta: colore del giocatore (scurito), numero nero al centro;
// N = nemesi, W = wild (v218, prima J = jolly), 1/2 e 3/4 finché non si sa il giocatore. i: posizione negli scarti (drawn), -1 = nel mazzo.
// order: turnOrder o la bozza della finestra
// v221: la faccia è l'immagine della carta vera (Assets/ui/turn-cards/<carta>.webp, style.css [data-card]); sulle carte
// 1/2, 3/4 e Wild con il giocatore già deciso, un tondino con il suo numero nel suo colore (.ae-turn-card-who)
function turnCardFace(kind, i, tag = 'span', order = turnOrder) {
  const who = turnCardPlayer(kind, i, order);
  const face = el(tag, 'ae-turn-card');
  face.dataset.kind = who || kind;
  face.dataset.card = kind;
  if (kind === 'wild') face.classList.add('is-wild');
  if (who && (isPairCard(kind) || kind === 'wild')) {
    const badge = el('span', 'ae-turn-card-who', who.slice(1));
    badge.dataset.kind = who;
    badge.setAttribute('aria-hidden', 'true');
    face.appendChild(badge);
  }
  face.setAttribute('aria-label', turnCardName(kind, i, order));
  return face;
}
function turnCardName(kind, i, order = turnOrder) {
  const who = turnCardPlayer(kind, i, order);
  if (kind === 'nemesis') return I18N_IT.trackNemesisName;
  if (kind === 'wild') return who ? I18N_IT.trackWildOf(Number(who.slice(1))) : I18N_IT.trackWildName;
  if (who) return I18N_IT.trackPlayerName(Number(who.slice(1)));
  return I18N_IT.turnPairName(...pairOptions(kind).map(p => Number(p.slice(1))));
}
function turnDeckBlocked() {
  return ui.isTransitioning || ui.deckBuilding || ui.trackShuffle || modals.length > 0;
}

// Bozza della finestra: copia di mazzo (left, left[0] = cima), carte note (known, parallelo a left), scarti (drawn),
// giocatori delle carte 1/2 e 3/4 (picks), memoria delle coppie (pairNext, v220), storia dei turni del giro (history,
// v222) e attesa (waiting). Niente act() finché non si salva.
function turnDraftFrom(order) {
  return { left: order.left.slice(), known: order.left.map((k, i) => !!(order.known && order.known[i])),
    drawn: order.drawn.slice(), picks: JSON.parse(JSON.stringify(order.picks || {})), waiting: !!order.waiting,
    pairNext: emptyPairNext(order.pairNext), history: JSON.parse(JSON.stringify(order.history || [])) };
}
function turnDraftKey(d) {
  return JSON.stringify([d.left, d.known, d.drawn, d.picks, d.waiting, d.pairNext, d.history]);
}
// Posizione negli scarti della carta del turno in corso (-1 = nessuna, anche se la sua carta è tornata nel mazzo)
function turnDraftCurrent(d) {
  const cur = currentTurn(d);
  return cur && cur.pos !== null && cur.pos !== undefined ? cur.pos : -1;
}
// (v211-v221 nel turno nemesi la carta in corso non si spostava, perché rimetterla nel mazzo annullava il turno; dalla
// v222 il turno continua, quindi nessuna carta è bloccata)
function turnPileLocked() {
  return false;
}
// Azioni sulla bozza
const turnDraftOps = {
  revealTop(d) { if (d.left.length) d.known[0] = true; },
  revealAll(d) { d.known = d.left.map(() => true); },
  // v222: "Copri tutto" (dopo "Rivela tutto"): tutto il mazzo torna coperto, senza mescolare
  coverAll(d) { d.known = d.left.map(() => false); if (d.old) d.old = d.left.map(() => false); },
  // Carta del mazzo (solo se nota) spostata nel mazzo: from e to sono posizioni dalla cima. v224: una carta già nota
  // all'apertura della finestra (d.old) si sposta solo se è in cima
  moveInDeck(d, from, to) {
    if (!turnDeckMovable(d, from) || from === to || to < 0 || to >= d.left.length) return false;
    const [kind] = d.left.splice(from, 1);
    const [known] = d.known.splice(from, 1);
    d.left.splice(to, 0, kind);
    d.known.splice(to, 0, known);
    if (d.old) { const [old] = d.old.splice(from, 1); d.old.splice(to, 0, old); }
    return true;
  },
  // Carta degli scarti nel mazzo: in cima ('top'), in fondo ('bottom') o, v212, in una posizione dalla cima (numero,
  // rilasciata sulla rosa). Resta nota (scoperta) e torna nel mazzo senza giocatore (takeFromTurnPile). v222: il turno
  // giocato con quella carta resta nella storia (barra dei turni) e, se è il turno in corso, continua; la memoria delle
  // coppie 1/2 e 3/4 non cambia (quel turno è stato giocato)
  pileToDeck(d, pos, where) {
    if (pos < 0 || pos >= d.drawn.length) return false;
    const [kind] = takeFromTurnPile(d, [pos]);
    const at = where === 'top' ? 0 : where === 'bottom' ? d.left.length : Math.max(0, Math.min(d.left.length, Number(where) || 0));
    d.left.splice(at, 0, kind);
    d.known.splice(at, 0, true);
    if (d.old) d.old.splice(at, 0, false);
    return true;
  },
  // Mescola: mazzo mischiato e tutto coperto
  shuffle(d) { d.left = shuffle(d.left); d.known = d.left.map(() => false); if (d.old) d.old = d.left.map(() => false); },
  // v240: carta rivelata del mazzo negli scarti, solo in fondo a destra. Non è un turno: la storia del giro non cambia
  // (il turno in corso resta quello), il turno di quella carta è perso; nessun giocatore per le carte 1/2 e 3/4
  deckToPile(d, from) {
    if (!turnDeckMovable(d, from)) return false;
    const [kind] = d.left.splice(from, 1);
    d.known.splice(from, 1);
    if (d.old) d.old.splice(from, 1);
    d.drawn.push(kind);
    return true;
  }
};
// v224: carta del mazzo che si può spostare: nota e, se era già nota all'apertura della finestra (d.old, scurita),
// solo quando è in cima
function turnDeckMovable(d, i) {
  return !!d.known[i] && (!(d.old && d.old[i]) || i === 0);
}

// Scrive la bozza nel mazzo dei turni: un solo passo di undo (v222: il turno in corso continua sempre)
// v238: senza passo di undo (prima un act per modifica): il passo di undo è uno solo per tutta la visita della
// finestra, aggiunto alla chiusura (openTurnScreen, shut)
function saveTurnDraft(d) {
  turnOrder.left = d.left.slice();
  turnOrder.known = d.known.slice();
  turnOrder.drawn = d.drawn.slice();
  turnOrder.picks = JSON.parse(JSON.stringify(d.picks));
  turnOrder.pairNext = emptyPairNext(d.pairNext);
  turnOrder.history = JSON.parse(JSON.stringify(d.history || []));
  save();
  render();
}

// v212: copia solo da guardare di un pezzo dell'app (testata, barra della fase): niente id, ruoli, tabindex, etichette
function viewOnlyCopy(node) {
  const copy = node.cloneNode(true);
  [copy, ...copy.querySelectorAll('*')].forEach(n => {
    ['id', 'role', 'tabindex', 'aria-label', 'aria-controls', 'aria-expanded', 'aria-live'].forEach(a => n.removeAttribute(a));
  });
  return copy;
}
// Copia della barra della fase con la bozza della finestra (carte note, turno annullato): per un attimo turnOrder è la
// bozza, si disegna la barra e la si copia, poi si rimette tutto. ui.trackPreview evita scelta x/y e riquadro.
function trackPreviewCopy(d) {
  const real = turnOrder;
  ui.trackPreview = true;
  try {
    turnOrder = Object.assign({}, real, { left: d.left, known: d.known, drawn: d.drawn, picks: d.picks, pairNext: d.pairNext,
      history: d.history, waiting: d.waiting });
    renderTurnTrack();
    return viewOnlyCopy(turnTrack);
  } finally {
    turnOrder = real;
    renderTurnTrack();
    ui.trackPreview = false;
  }
}

// v219: niente più "tieni premuto" (prima 300ms): la carta parte appena il dito si sposta di TURN_DRAG_PX; un tocco
// senza spostamento resta un tocco (seleziona la carta)
const TURN_DRAG_PX = 6;
let turnScreen = null; // finestra aperta (per le verifiche e per il ridisegno al cambio di misura)
// v224: le modifiche valgono subito (niente "Salva modifiche"): ogni modifica della bozza è un act (un passo di undo)
const TURN_SHEET_MS = 320;
// Fine di un gruppo di animazioni, con un tempo massimo (se il browser non le fa girare, si va avanti lo stesso)
function animDone(anims, ms) {
  return Promise.race([Promise.all(anims.map(a => a.finished.catch(() => {}))), new Promise(r => setTimeout(r, ms + 150))]);
}
function openTurnScreen() {
  if (turnDeckBlocked()) return;
  // d.old: carte già note all'apertura (scurite, si spostano solo dalla cima); parallelo a d.left, solo nella finestra
  const fresh = order => { const x = turnDraftFrom(order); x.old = x.known.slice(); return x; };
  const initial = fresh(turnOrder);
  let d = fresh(turnOrder);
  let savedKey = turnDraftKey(d);
  // v238: fotografia della partita all'apertura: alla chiusura, se il mazzo dei turni è cambiato, diventa l'unico
  // passo di undo della visita (Annulla porta da dopo tutte le modifiche a prima di tutte)
  const before = snapshot();
  let committed = false;
  let sel = null;   // carta selezionata senza trascinamento: { source: 'deck' | 'pile', index }
  let press = null; // dito o mouse premuto su una carta, prima che parta il trascinamento
  let drag = null;  // trascinamento in corso
  let shuffling = false; // animazione della mescola in corso
  let closing = false;
  let suppressClick = false;
  let close = () => {};
  const dirty = () => turnDraftKey(d) !== turnDraftKey(initial);

  // v212: il titolo è "Mazzo dei turni" ("Turno N" è nella copia della testata, sopra)
  const dialog = dialogShell(I18N_IT.turnDeckTitle, '', () => tryClose());
  dialog.classList.add('ae-turn-screen');
  // v224: tutto tranne la copia della testata sta in un foglio che scende da sotto la barra dei turni
  const sheet = el('div', 'ae-turn-sheet');
  sheet.appendChild(dialog.firstChild); // titolo e X
  // Desktop: dentro la colonna centrale della partita (--ae-col)
  const col = app.style.getPropertyValue('--ae-col');
  if (col) dialog.style.setProperty('--ae-turn-col', col);
  // v212: in cima una copia, solo da guardare, della testata (nome nemesi, Turno N, Mazzo, Scarti, Menu) e della barra
  // della fase. La testata è copiata all'apertura; la barra mostra la bozza e si rifà a ogni modifica (trackCopy)
  // (classi di #app da cui dipende lo stile della testata; non quelle di passaggio: scelta x/y, scossa, scorrimento)
  const copyShell = el('div', ['ae-shell', ...['clear-header', 'is-nemesis-turn'].filter(c => app.classList.contains(c)), 'ae-turn-copy'].join(' '));
  copyShell.appendChild(viewOnlyCopy(document.getElementById('topbar')));
  const trackHolder = el('div', 'ae-turn-copy-track');
  copyShell.appendChild(trackHolder);
  // v224: nella copia funziona solo il pulsante Menu (il menu si apre sopra la finestra); il resto è solo da guardare
  const copyMenu = copyShell.querySelector('.ae-menu-button');
  (function inertExcept(node) {
    [...node.children].forEach(c => {
      if (copyMenu && c === copyMenu) return;
      if (copyMenu && c.contains(copyMenu)) inertExcept(c);
      else { c.inert = true; c.setAttribute('aria-hidden', 'true'); }
    });
  })(copyShell);
  if (copyMenu) {
    copyMenu.setAttribute('aria-label', I18N_IT.menu);
    copyMenu.setAttribute('aria-haspopup', 'dialog');
    copyMenu.addEventListener('click', () => {
      if (drag || shuffling || closing) return;
      sel = null;
      draw();
      // Le voci che portano altrove (undo, scarti, vittoria, esci, ricomincia) chiudono prima la finestra; chiudendo
      // il menu si torna qui
      openSideMenu(() => shut());
    });
  }
  dialog.appendChild(copyShell);
  dialog.appendChild(sheet);

  // new_turn: scarti e mazzo sulla stessa riga, separati da un segmento verticale. Sopra, "Scarti" a sinistra e
  // "Mazzo turno" a destra (con il simbolo Mescola); si legge da sinistra a destra come la barra dei turni: nel mazzo
  // la carta in cima è la prima a sinistra. Sotto il mazzo "Rivela tutto"
  const row = el('div', 'ae-turn-row');
  const pileArea = el('div', 'ae-turn-area ae-turn-area--pile');
  const pileRow = el('div', 'ae-turn-pile-row');
  pileArea.append(pileRow);
  const divider = el('span', 'ae-turn-divider');
  divider.setAttribute('aria-hidden', 'true');
  const deckArea = el('div', 'ae-turn-area ae-turn-area--deck');
  const shuffleBtn = el('button', 'ae-icon-button ae-turn-shuffle');
  shuffleBtn.type = 'button';
  shuffleBtn.setAttribute('aria-label', I18N_IT.turnShuffleLabel);
  shuffleBtn.title = I18N_IT.turnShuffleDeck;
  shuffleBtn.appendChild(icon('shuffle'));
  shuffleBtn.addEventListener('click', runShuffle);
  // v236: le scritte "Scarti" e "Mazzo turno" stanno in una riga sopra le carte, ai due lati del segmento verticale
  // (--ae-split, da layoutFan), così non cambiano la larghezza delle carte né lo spazio; Mescola in fondo a destra
  const heads = el('div', 'ae-turn-heads');
  const pileHead = el('h3', 'ae-turn-subtitle ae-turn-head--pile', I18N_IT.turnPileTitle);
  heads.append(pileHead, el('h3', 'ae-turn-subtitle ae-turn-head--deck', I18N_IT.turnDeckRowTitle), shuffleBtn);
  const board = el('div', 'ae-turn-board');
  // Corsia del mazzo: carte in fila (posizioni assolute, così si spostano con una transizione)
  const lane = el('div', 'ae-turn-lane');
  // Carta degli scarti presa o selezionata: le carte del mazzo si stringono al centro e ai due lati compaiono i posti
  // "Cima" (a sinistra) e "Fondo" (a destra)
  const zoneTop = el('button', 'ae-turn-zone ae-turn-zone--top', I18N_IT.turnTopEnd);
  const zoneBottom = el('button', 'ae-turn-zone ae-turn-zone--bottom', I18N_IT.turnBottomEnd);
  zoneBottom.type = zoneTop.type = 'button';
  zoneBottom.dataset.zone = 'bottom';
  zoneTop.dataset.zone = 'top';
  zoneBottom.setAttribute('aria-label', I18N_IT.turnZoneBottom);
  zoneTop.setAttribute('aria-label', I18N_IT.turnZoneTop);
  [zoneTop, zoneBottom].forEach(z => z.addEventListener('click', () => {
    if (!sel || z.hidden) return;
    dropOn({ type: z.dataset.zone }, sel);
  }));
  const revealTop = el('button', 'ae-turn-eye ae-turn-eye--top');
  revealTop.type = 'button';
  revealTop.setAttribute('aria-label', I18N_IT.turnRevealTopLabel);
  revealTop.appendChild(icon('eye'));
  revealTop.addEventListener('click', () => flipChange(() => turnDraftOps.revealTop(d)));
  // v235: le carte rivelate si girano: la carta com'era ruota fino a mettersi di taglio, poi come è ora ruota da taglio
  // a dritta (rotateY, 140ms + 140ms); più carte una dopo l'altra da sinistra (70ms di distanza). v237: anche quando
  // si coprono (dalla faccia al dorso)
  const FLIP_HALF_MS = 140;
  function flipChange(op) {
    if (drag || shuffling || closing) return;
    const before = d.known.slice();
    const oldEls = fanEls.slice();
    op();
    sel = null;
    draw();
    if (reducedMotion.matches || !lane.animate) return;
    let k = 0;
    d.known.forEach((known, i) => {
      if (known === !!before[i] || !fanEls[i] || !oldEls[i]) return;
      flipCard(fanEls[i], oldEls[i], k++ * 70);
    });
  }
  function flipCard(card, oldCard, delay) {
    // copia della carta com'era (senza ascoltatori), sopra la nuova, finché non è di taglio
    const was = oldCard.cloneNode(true);
    was.classList.add('ae-turn-flip-old');
    was.classList.remove('is-selected', 'is-movable');
    ['data-index', 'data-source', 'aria-label', 'role', 'type'].forEach(a => was.removeAttribute(a));
    was.setAttribute('aria-hidden', 'true');
    was.tabIndex = -1;
    was.style.left = card.style.left;
    was.style.zIndex = card.style.zIndex;
    lane.appendChild(was);
    const p = 'perspective(500px) ';
    const out = was.animate([{ transform: p + 'rotateY(0deg)' }, { transform: p + 'rotateY(90deg)' }],
      { duration: FLIP_HALF_MS, delay, easing: 'ease-in', fill: 'forwards' });
    card.animate([{ transform: p + 'rotateY(-90deg)' }, { transform: p + 'rotateY(0deg)' }],
      { duration: FLIP_HALF_MS, delay: delay + FLIP_HALF_MS, easing: 'ease-out', fill: 'backwards' });
    animDone([out], delay + FLIP_HALF_MS).then(() => was.remove());
  }
  // Segmento verticale dove cadrà la carta degli scarti (come tra le slide di Canva)
  const insertBar = el('span', 'ae-turn-insert');
  insertBar.setAttribute('aria-hidden', 'true');
  insertBar.hidden = true;
  // v240: lo stesso segmento in fondo a destra degli scarti, per la carta rivelata del mazzo portata negli scarti
  const pileInsert = el('span', 'ae-turn-insert');
  pileInsert.setAttribute('aria-hidden', 'true');
  pileInsert.hidden = true;
  pileArea.appendChild(pileInsert);
  // Tocco sugli scarti con una carta del mazzo selezionata: la carta va in fondo agli scarti
  pileArea.addEventListener('click', () => {
    if (sel && sel.source === 'deck') dropOn({ type: 'pile' }, sel);
  });
  const revealAll = el('button', 'ae-turn-eye ae-turn-eye--all');
  revealAll.type = 'button';
  revealAll.setAttribute('aria-label', I18N_IT.turnRevealAllLabel);
  // v235: solo l'occhio, senza scritta (il nome resta per i lettori di schermo); con tutto scoperto diventa l'occhio
  // barrato ("Copri tutto", v222)
  const revealAllEye = icon('eye');
  revealAll.append(revealAllEye);
  const allKnown = () => d.left.length > 0 && d.known.every(Boolean);
  revealAll.addEventListener('click', () => {
    flipChange(() => { if (allKnown()) turnDraftOps.coverAll(d); else turnDraftOps.revealAll(d); });
  });
  // v237: il pulsante dell'occhio è un rettangolo lungo quanto le carte del mazzo (larghezza da layoutFan); niente più
  // fascio di luce (v235-v236)
  const revealRow = el('div', 'ae-turn-reveal-row');
  revealRow.appendChild(revealAll);
  deckArea.append(lane, revealRow);
  row.append(pileArea, divider, deckArea);
  board.append(heads, row);
  // Mazzo vuoto (v236): niente Cima e Fondo; con una carta degli scarti selezionata, un tocco sul mazzo la mette lì
  lane.addEventListener('click', e => {
    if (d.left.length || !sel || sel.source !== 'pile' || e.target.closest('.ae-turn-card')) return;
    dropOn({ type: 'top' }, sel);
  });

  const hint = el('p', 'ae-turn-hint', I18N_IT.turnHint);
  hint.setAttribute('aria-live', 'polite');
  const footer = el('div', 'ae-turn-screen-footer');
  const resetBtn = button(I18N_IT.turnResetAll, 'secondary', () => {
    if (drag || shuffling) return;
    d = fresh(initial);
    d.old = initial.old.slice();
    sel = null;
    draw();
  });
  footer.append(resetBtn);
  sheet.append(board, hint, footer);

  let fanEls = [];
  let pileEls = [];
  function draw() {
    const n = d.left.length;
    fanEls = d.left.map((kind, i) => {
      const known = d.known[i];
      const card = known ? turnCardFace(kind, -1, 'button', d) : el('span', 'ae-turn-card is-back');
      if (known) {
        card.type = 'button';
        // v224: nota già all'apertura = scurita (60%) e ferma, tranne in cima
        card.classList.toggle('is-old', !!d.old[i]);
        card.classList.toggle('is-movable', turnDeckMovable(d, i));
        card.setAttribute('aria-label', I18N_IT.turnDeckCardLabel(turnCardName(kind, -1, d), i + 1, n));
      } else {
        card.setAttribute('role', 'img');
        card.setAttribute('aria-label', I18N_IT.turnDeckCardLabel(I18N_IT.turnCovered, i + 1, n));
      }
      card.dataset.source = 'deck';
      card.dataset.index = String(i);
      card.classList.toggle('is-selected', !!sel && sel.source === 'deck' && sel.index === i);
      return card;
    });
    lane.replaceChildren(...fanEls);
    if (!n) lane.appendChild(el('span', 'ae-turn-fan-empty', I18N_IT.turnDeckEmpty));
    revealTop.hidden = !n || d.known[0];
    insertBar.hidden = true;
    lane.append(revealTop, zoneTop, zoneBottom, insertBar);
    revealAll.disabled = !n;
    // (v240: con una carta sola nel mazzo basta l'occhio sulla carta: niente Rivela tutto)
    revealAll.hidden = n < 2;
    revealAllEye.className = 'ae-icon ae-icon--' + (allKnown() ? 'eye-off' : 'eye');
    revealAll.title = allKnown() ? I18N_IT.turnCoverAll : I18N_IT.turnRevealAll;
    revealAll.setAttribute('aria-label', allKnown() ? I18N_IT.turnCoverAllLabel : I18N_IT.turnRevealAllLabel);
    revealAll.classList.toggle('is-cover', allKnown());
    const cur = turnDraftCurrent(d);
    pileEls = d.drawn.map((kind, i) => {
      const locked = turnPileLocked(d, i);
      const face = turnCardFace(kind, i, locked ? 'span' : 'button', d);
      const name = turnCardName(kind, i, d);
      if (!locked) {
        face.type = 'button';
        face.classList.add('is-movable');
      }
      face.setAttribute('aria-label', locked ? I18N_IT.turnLockedLabel(name) : I18N_IT.turnPileCardLabel(name, i === cur));
      face.dataset.source = 'pile';
      face.dataset.index = String(i);
      face.classList.toggle('is-selected', !!sel && sel.source === 'pile' && sel.index === i);
      const slot = el('div', 'ae-turn-pile-slot' + (i === cur ? ' is-current' : '') + (locked ? ' is-locked' : ''));
      slot.appendChild(face);
      if (i === cur) slot.appendChild(el('span', 'ae-turn-pile-note', I18N_IT.turnCurrent));
      return slot;
    });
    // Scarti vuoti: un posto tratteggiato largo una carta
    if (pileEls.length) pileRow.replaceChildren(...pileEls);
    else {
      const empty = el('span', 'ae-turn-pile-empty');
      empty.setAttribute('role', 'img');
      empty.setAttribute('aria-label', I18N_IT.turnPileEmpty);
      pileRow.replaceChildren(empty);
    }
    pileEls = pileEls.map(slot => slot.firstChild);
    [...fanEls, ...pileEls].forEach(c => {
      if (!c.classList.contains('is-movable')) return;
      c.addEventListener('pointerdown', onPointerDown);
      c.addEventListener('click', onCardClick);
    });
    fanEls.forEach(c => { if (!c.classList.contains('is-movable')) c.addEventListener('click', onCardClick); });
    shuffleBtn.disabled = n < 2 && !d.known.some(Boolean);
    // (v236: con meno di 2 carte nel mazzo non c'è niente da mescolare: il simbolo sparisce e lascia spazio alla scritta)
    shuffleBtn.hidden = n < 2;
    heads.classList.toggle('no-shuffle', n < 2);
    resetBtn.disabled = !dirty();
    markTargets(sel);
    hint.textContent = sel ? I18N_IT.turnSelected(selName(sel)) : I18N_IT.turnHint;
    layoutFan();
    // v224: ogni modifica vale subito (un act per modifica); la selezione da sola non cambia niente
    const key = turnDraftKey(d);
    if (key !== savedKey) { savedKey = key; saveTurnDraft(d); }
    trackHolder.replaceChildren(trackPreviewCopy(d));
  }
  function selName(s) {
    return s.source === 'deck' ? turnCardName(d.left[s.index], -1, d) : turnCardName(d.drawn[s.index], s.index, d);
  }
  // Misure della riga: una sola larghezza di carta per scarti e mazzo, tutte le carte in fila senza sovrapporsi.
  // La corsia del mazzo ha almeno 3 posti, così da stretta ha spazio per Cima, carte e Fondo
  const TURN_GAP = 6;
  function rowGeometry() {
    const k = Math.max(1, d.drawn.length);
    const n = d.left.length;
    // (v236: mazzo vuoto = un posto solo, niente Cima e Fondo da far stare)
    // (v240: un posto per carta, senza i 3 posti minimi del mazzo, che lasciavano spazio vuoto a destra: lo spazio per
    // Cima e Fondo lo fanno gli scarti, che si sovrappongono mentre si sposta una loro carta)
    const units = k + Math.max(n, 1);
    const avail = (row.clientWidth || 343) - 17; // segmento verticale con i suoi margini
    const w = Math.max(30, Math.min(64, Math.floor((avail - TURN_GAP * (units - 1)) / units)));
    return { k, n, w, h: w * 88 / 63, gap: TURN_GAP };
  }
  function laneWidth(g) {
    return lane.clientWidth || (Math.max(g.n, 1) * (g.w + g.gap) - g.gap);
  }
  // Carta presa (trascinata) o selezionata, degli scarti o (v237) del mazzo: il mazzo si stringe e compaiono Cima e
  // Fondo
  function squeezed() {
    return !!drag || !!sel;
  }
  // Carte del mazzo da mostrare: tutte, tranne quella del mazzo che si sta trascinando (v237: la sua copia segue il
  // dito e le altre si stringono senza di lei)
  function shownOrder() {
    const order = d.left.map((k, i) => i);
    if (drag && drag.source === 'deck') order.splice(drag.index, 1);
    return order;
  }
  // Ultima disposizione del mazzo stretto (per sapere tra quali carte sta la carta degli scarti trascinata)
  let tightGeo = null;
  // order: indici di d.left nell'ordine da mostrare (dalla cima, a sinistra). over: destinazione della carta
  // trascinata ({ type: 'top' | 'bottom' | 'pos', index }) o null
  function layoutFan(order = shownOrder(), lifted = -1, over = null) {
    const g = rowGeometry();
    // (v237: con la riga normale il pulsante dell'occhio è lungo quanto tutte le carte del mazzo)
    const fullW = g.n ? g.n * (g.w + g.gap) - g.gap : g.w;
    revealAll.style.width = Math.max(44, fullW) + 'px';
    // m: carte mostrate (senza quella del mazzo che si trascina)
    const m = order.length;
    row.style.setProperty('--ae-turn-w', g.w + 'px');
    row.style.setProperty('--ae-turn-h', g.h + 'px');
    const tight = squeezed();
    // v238: Cima e Fondo solo per una carta degli scarti; una carta del mazzo va in cima o in fondo mettendola prima
    // della prima carta o dopo l'ultima (il segmento dorato lo mostra)
    const fromPile = tight && (drag ? drag.source : sel ? sel.source : null) === 'pile';
    // Carta degli scarti: anche gli scarti si stringono (sovrapposti, 14px l'uno dall'altro), così il mazzo ha lo
    // spazio per Cima e Fondo grandi come una carta e per le sue carte poco sovrapposte
    const pileStep = fromPile ? Math.min(g.w + g.gap, 14) : g.w + g.gap;
    row.style.setProperty('--ae-pile-step', pileStep + 'px');
    row.classList.toggle('is-pile-tight', fromPile);
    pileArea.style.width = (g.w + (g.k - 1) * pileStep) + 'px';
    const lw = laneWidth(g);
    // Stretto: ai lati Cima e Fondo (solo carta degli scarti), grandi come una carta; in mezzo le carte del mazzo,
    // avvicinate (sovrapposte quanto serve) e centrate nello spazio che resta
    const inner = fromPile ? lw - 2 * (g.w + g.gap) : lw;
    const step = tight ? (m > 1 ? Math.min(g.w + g.gap, (inner - g.w) / (m - 1)) : 0) : g.w + g.gap;
    const stackW = m ? g.w + (m - 1) * step : 0;
    const start = tight ? (fromPile ? g.w + g.gap : 0) + (inner - stackW) / 2 : 0;
    tightGeo = tight ? { start, step, stackW, w: g.w, gap: g.gap, n: m } : null;
    fanEls.forEach((c, i) => c.classList.toggle('is-away', !order.includes(i)));
    order.forEach((idx, k) => {
      const card = fanEls[idx];
      if (!card) return;
      card.style.left = (start + k * step) + 'px';
      card.style.zIndex = String(tight ? 1 + m - k : 1 + k);
      card.classList.toggle('is-lifted', idx === lifted);
      if (idx === 0) {
        revealTop.style.left = (start + k * step + g.w / 2 - 22) + 'px';
        revealTop.style.top = (g.h / 2 - 22) + 'px';
        revealTop.style.zIndex = String(2 + g.n);
      }
    });
    lane.classList.toggle('is-squeezed', tight);
    // (con il mazzo stretto l'occhio della cima starebbe sopra la pila: sparisce finché non si rilascia)
    revealTop.hidden = !g.n || !!d.known[0] || tight;
    // (v236: con il mazzo vuoto niente Cima e Fondo: la carta degli scarti va nel mazzo vuoto)
    zoneTop.hidden = zoneBottom.hidden = !fromPile || !m;
    // (v240: "Cima" e "Fondo" in orizzontale, il carattere si adatta alla larghezza della carta: 5 lettere ≈ 3,6em)
    lane.style.setProperty('--ae-zone-fs', Math.max(7, Math.min(11, Math.floor((g.w - 6) / 3.6))) + 'px');
    // Carta del mazzo in mano: gli scarti sono una destinazione, solo in fondo a destra
    const toPile = !!over && over.type === 'pile';
    pileInsert.hidden = !toPile;
    if (toPile) {
      pileInsert.style.left = (pileArea.clientWidth + Math.min(g.gap / 2, 4) - 2) + 'px';
      pileInsert.style.top = '-8px';
      pileInsert.style.height = (g.h + 16) + 'px';
    }
    lane.classList.toggle('is-empty-target', tight && !m);
    // v237: scritte "Scarti" a sinistra e "Mazzo turno" a destra; "Scarti" non va oltre il segmento: se non ci sta
    // (pochi o nessuno scarto) il carattere scende
    const split = divider.offsetLeft + 0.5;
    board.style.setProperty('--ae-split', split + 'px');
    fitHead(pileHead, split - 9);
    if (fromPile) {
      Object.assign(zoneTop.style, { left: '0px', width: g.w + 'px' });
      Object.assign(zoneBottom.style, { left: (lw - g.w) + 'px', width: g.w + 'px' });
    }
    const type = over ? over.type : null;
    zoneTop.classList.toggle('is-over', type === 'top');
    zoneBottom.classList.toggle('is-over', type === 'bottom');
    insertBar.hidden = !tight || !over || toPile;
    if (tight && over && !toPile) {
      // Segmento: tra Cima e la prima carta, tra due carte (a metà dello spazio tra la fine di una e l'inizio
      // dell'altra) o tra l'ultima carta e Fondo
      const i = type === 'top' ? 0 : type === 'bottom' ? m : over.index;
      const x = !m ? lw / 2 : i <= 0 ? start - g.gap / 2 : i >= m ? start + stackW + g.gap / 2
        : start + (i - 1) * step + (g.w + step) / 2;
      insertBar.style.left = (x - 2) + 'px';
      insertBar.style.height = (g.h + 16) + 'px';
      insertBar.style.top = '-8px';
    }
  }
  // Scritta che non deve superare maxW: il carattere scende (fino a 8px) finché ci sta
  function fitHead(node, maxW) {
    node.style.fontSize = '';
    let size = parseFloat(getComputedStyle(node).fontSize) || 12;
    for (let i = 0; i < 12 && node.scrollWidth > maxW && size > 8; i++) {
      size = Math.max(8, size - 0.5);
      node.style.fontSize = size + 'px';
    }
  }
  // Posto d'inserimento (0 = in cima, n = in fondo) per la carta degli scarti che sta in x sul mazzo stretto: prima
  // della prima carta il cui centro è a destra di x
  function pileSlotAt(x) {
    const t = tightGeo;
    if (!t || !t.n) return 0;
    const rel = x - lane.getBoundingClientRect().left - t.start - t.w / 2;
    return Math.max(0, Math.min(t.n, Math.floor(rel / (t.step || 1)) + 1));
  }

  // Destinazioni permesse per la carta s (solo quelle si evidenziano): carta del mazzo = la corsia del mazzo; carta
  // degli scarti = Cima, Fondo e qualunque posto tra le carte del mazzo (come prima della new_turn)
  function markTargets(s) {
    const any = !!s;
    zoneTop.classList.toggle('is-target', any && s.source === 'pile');
    zoneBottom.classList.toggle('is-target', any && s.source === 'pile');
    lane.classList.toggle('is-target', any);
    dialog.classList.toggle('is-choosing', any);
  }
  function dropOn(target, s) {
    let ok = false;
    if (s.source === 'deck' && target.type === 'pile') {
      ok = turnDraftOps.deckToPile(d, s.index);
    } else if (s.source === 'deck') {
      const to = target.type === 'top' ? 0 : target.type === 'bottom' ? d.left.length - 1 : target.index;
      ok = turnDraftOps.moveInDeck(d, s.index, to);
    } else {
      ok = turnDraftOps.pileToDeck(d, s.index, target.type === 'pos' ? target.index : target.type);
    }
    sel = null;
    draw();
    return ok;
  }
  // Tocco / Invio: seleziona la carta; con una carta selezionata, toccare una carta del mazzo la mette lì (carta del
  // mazzo: al suo posto; carta degli scarti, v212: nella sua posizione, le altre scendono); toccare di nuovo la stessa
  // carta toglie la selezione
  function onCardClick(e) {
    if (suppressClick) { suppressClick = false; return; }
    if (shuffling || closing) return;
    const source = e.currentTarget.dataset.source;
    const index = Number(e.currentTarget.dataset.index);
    if (sel && sel.source === source && sel.index === index) { sel = null; draw(); return; }
    // (carta degli scarti selezionata: va al posto della carta toccata, che scende di uno; oppure su Cima o Fondo)
    if (sel && source === 'deck') { dropOn({ type: 'pos', index }, sel); return; }
    // (v240: carta del mazzo selezionata, poi una carta degli scarti: va in fondo agli scarti)
    if (sel && sel.source === 'deck' && source === 'pile') { dropOn({ type: 'pile' }, sel); return; }
    if (!e.currentTarget.classList.contains('is-movable')) return;
    sel = { source, index };
    draw();
    const again = dialog.querySelector(`.ae-turn-card[data-source="${source}"][data-index="${index}"]`);
    if (again) again.focus({ preventScroll: true });
  }

  // Trascinamento: la carta si solleva e segue il dito appena il dito si sposta (v219, senza tenere premuto)
  function onPointerDown(e) {
    if (e.button > 0 || drag || press || shuffling || closing) return;
    const card = e.currentTarget;
    press = { card, source: card.dataset.source, index: Number(card.dataset.index), x: e.clientX, y: e.clientY, id: e.pointerId };
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
  }
  function stopListening() {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerCancel);
  }
  function startDrag() {
    if (!press) return;
    const { card, source, index } = press;
    const r = card.getBoundingClientRect();
    const ghost = card.cloneNode(true);
    ghost.classList.add('ae-turn-ghost');
    ghost.classList.remove('is-old', 'is-away', 'is-lifted', 'is-selected');
    ghost.removeAttribute('id');
    // v239: la copia non deve portarsi dietro il livello (z-index) scritto sulla carta del mazzo dalla fila: con quello
    // (1-6 invece di 1000) restava sotto la finestra e la carta del mazzo trascinata non si vedeva
    ghost.style.zIndex = '';
    ghost.style.translate = '';
    ghost.setAttribute('aria-hidden', 'true');
    Object.assign(ghost.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    document.body.appendChild(ghost);
    // v222: la carta sale sopra il dito (centrata, con il bordo inferiore 16px sopra il dito), così il dito non la copre
    drag = { source, index, ghost, dx: r.width / 2, dy: r.height + 16, w: r.width, h: r.height, target: null };
    card.classList.add('is-dragging');
    sel = null;
    markTargets({ source, index });
    dialog.classList.add('is-dragging', 'is-dragging-' + source);
    press = null;
    // new_turn: presa una carta (degli scarti o, v237, del mazzo), il mazzo si stringe e compaiono Cima e Fondo
    layoutFan();
    // Piccola vibrazione quando la carta si solleva (solo dopo un tocco vero: altrimenti il browser la blocca)
    const touched = !navigator.userActivation || navigator.userActivation.hasBeenActive;
    if (navigator.vibrate && touched) { try { navigator.vibrate(10); } catch (err) { /* niente vibrazione */ } }
  }
  function hit(rect, x, y, pad = 12) {
    return x >= rect.left - pad && x <= rect.right + pad && y >= rect.top - pad && y <= rect.bottom + pad;
  }
  function onPointerMove(e) {
    if (press && !drag) {
      // Il dito si è spostato: parte il trascinamento (v219); finché è fermo resta un tocco
      if (Math.hypot(e.clientX - press.x, e.clientY - press.y) < TURN_DRAG_PX) return;
      startDrag();
    }
    if (!drag) return;
    e.preventDefault();
    // (v224: dritta, prima inclinata di 4° a sinistra)
    drag.ghost.style.transform = `translate(${e.clientX - drag.dx - parseFloat(drag.ghost.style.left)}px, ${e.clientY - drag.dy - parseFloat(drag.ghost.style.top)}px) scale(1.08)`;
    // La carta si porta ovunque nello schermo; il rilascio riesce solo su una destinazione valida. v222: conta dove
    // sta la carta (il suo centro, sopra il dito), non il dito. new_turn: carta degli scarti = solo Cima (a sinistra
    // del mazzo stretto) o Fondo (a destra); carta del mazzo = un posto della corsia del mazzo
    const x = e.clientX - drag.dx + drag.w / 2;
    const y = e.clientY - drag.dy + drag.h / 2;
    // v237: carta del mazzo e carta degli scarti si spostano allo stesso modo: su Cima o Fondo (grandi come una carta,
    // ai lati) o in mezzo alle altre carte del mazzo (strette), nel posto sotto la carta; il segmento dorato dice dove
    const order = shownOrder();
    let target = null;
    const laneRect = lane.getBoundingClientRect();
    // v240: carta del mazzo sugli scarti (a sinistra del segmento): va in fondo a destra degli scarti (il turno di
    // quella carta è perso)
    if (drag.source === 'deck' && x < laneRect.left - 8 && hit(pileArea.getBoundingClientRect(), x, y, 12)) target = { type: 'pile' };
    else if (hit(zoneTop.getBoundingClientRect(), x, y, 6) && !zoneTop.hidden) target = { type: 'top' };
    else if (hit(zoneBottom.getBoundingClientRect(), x, y, 6) && !zoneBottom.hidden) target = { type: 'bottom' };
    else if (hit(laneRect, x, y, 24)) target = order.length ? { type: 'pos', index: pileSlotAt(x) } : { type: 'top' };
    drag.target = target;
    lane.classList.toggle('is-over', !!target && target.type === 'pos');
    layoutFan(order, -1, target);
  }
  function endDrag(apply) {
    stopListening();
    if (press) press = null;
    if (!drag) return;
    const { source, index, target, ghost } = drag;
    ghost.remove();
    drag = null;
    dialog.classList.remove('is-dragging', 'is-dragging-deck', 'is-dragging-pile');
    lane.classList.remove('is-over');
    // Il click che segue il rilascio non deve selezionare la carta
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 0);
    if (apply && target) dropOn(target, { source, index });
    else draw(); // fuori zona: la carta torna al suo posto
  }
  function onPointerUp() { endDrag(true); }
  function onPointerCancel() { endDrag(false); }

  // v224: Mescola con animazione: le carte si raccolgono al centro, si mischiano due volte (metà a sinistra, metà a
  // destra) e si riaprono a ventaglio, coperte. Durante l'animazione la finestra non si tocca
  function runShuffle() {
    if (drag || shuffling || closing) return;
    const g = rowGeometry();
    const animate = !reducedMotion.matches && !!lane.animate && fanEls.length > 1;
    if (!animate) { turnDraftOps.shuffle(d); sel = null; draw(); return; }
    shuffling = true;
    dialog.classList.add('is-shuffling');
    // new_turn: le carte sono dritte in fila; si raccolgono al centro della fila
    const cx = (g.n - 1) * (g.w + g.gap) / 2;
    const toCenter = c => (cx - parseFloat(c.style.left)) + 'px';
    const gather = fanEls.map(c => c.animate([{ translate: '0 0' }, { translate: toCenter(c) + ' 0' }],
      { duration: 220, easing: 'ease-in', fill: 'forwards' }));
    animDone(gather, 220).then(() => {
      if (closing || !dialog.isConnected) { shuffling = false; return; }
      turnDraftOps.shuffle(d);
      sel = null;
      draw();
      const s = Math.max(14, g.w * 0.45);
      const riffle = fanEls.map((c, i) => {
        const dx = toCenter(c);
        const side = (i % 2 ? 1 : -1) * s;
        const off = `calc(${dx} + ${side}px) -6px`;
        return c.animate([
          { translate: dx + ' 0', offset: 0 }, { translate: off, offset: .16 }, { translate: dx + ' 0', offset: .32 },
          { translate: off, offset: .48 }, { translate: dx + ' 0', offset: .64 }, { translate: '0 0', offset: 1 }
        ], { duration: 820, easing: 'ease-in-out' });
      });
      return animDone(riffle, 820);
    }).then(() => {
      shuffling = false;
      dialog.classList.remove('is-shuffling');
    });
  }

  // Chiusura (v224: niente più "Uscire senza salvare?", le modifiche sono già valide). Con la X o Esc il foglio risale
  // sotto la barra dei turni; dal Menu (voci che portano altrove) si chiude subito
  function shut() {
    endDrag(false);
    window.removeEventListener('resize', onResize);
    commitUndo();
    turnScreen = null;
    close();
  }
  // Un solo passo di undo per la visita (v238): lo stato di prima, se alla fine il mazzo dei turni è diverso
  function commitUndo() {
    if (committed) return;
    committed = true;
    if (!dirty()) return;
    pushUndo(before);
    save();
  }
  function tryClose() {
    if (drag) { endDrag(false); return; }
    if (closing) return;
    closing = true;
    if (reducedMotion.matches || !sheet.animate) { shut(); return; }
    const a = sheet.animate([{ transform: 'none' }, { transform: 'translateY(-100%)' }],
      { duration: TURN_SHEET_MS * 0.7, easing: 'cubic-bezier(.4, 0, 1, 1)', fill: 'forwards' });
    dialog.parentNode.classList.add('is-closing');
    animDone([a], TURN_SHEET_MS * 0.7).then(shut);
  }
  // Esc / Indietro: prima si annulla il trascinamento o la selezione, poi si prova a chiudere
  function onCancel() {
    if (drag) { endDrag(false); return; }
    if (shuffling) return;
    if (sel) { sel = null; draw(); return; }
    tryClose();
  }
  // (v216: anche il nome della nemesi nella copia della testata si adatta alla colonna, fitPhaseName)
  function onResize() { if (!drag) layoutFan(); fitPhaseName(copyShell); }

  // Tenendo premuta una carta il telefono non deve aprire il menu del browser
  dialog.addEventListener('contextmenu', e => { if (e.target.closest('.ae-turn-card')) e.preventDefault(); });
  close = openModal(dialog, { onCancel, closeOnScrim: false });
  dialog.parentNode.classList.add('ae-turn-screen-backdrop');
  window.addEventListener('resize', onResize);
  draw();
  fitPhaseName(copyShell);
  // v224: il foglio scende dall'alto, da sotto la copia della testata e della barra dei turni (prima la finestra
  // compariva dal niente)
  if (!reducedMotion.matches && sheet.animate) {
    sheet.animate([{ transform: 'translateY(-100%)' }, { transform: 'none' }],
      { duration: TURN_SHEET_MS, easing: 'cubic-bezier(.2, 0, 0, 1)' });
  }
  turnScreen = { dialog, get draft() { return d; }, dirty, tryClose, onCancel, shuffle: runShuffle,
    get shuffling() { return shuffling; } };
}

// Finestra "Chi gioca questo turno?" (v193): esce una carta 1/2 o 3/4 senza giocatore. Al centro due carte grandi come
// quelle della fascia piccola (bordo nero, colore del giocatore scurito, numero nero al centro). Finché non si sceglie
// è tutto disattivato (inert) tranne la scelta e il pulsante Menu; la testata resta sopra l'oscuramento.
const pairChoice = el('div', 'ae-pair-choice');
pairChoice.hidden = true;
const pairChoicePanel = el('div', 'ae-pair-choice-panel');
pairChoicePanel.setAttribute('role', 'dialog');
pairChoicePanel.setAttribute('aria-labelledby', 'ae-pair-choice-title');
const pairChoiceTitle = el('h2', 'ae-pair-choice-title', I18N_IT.pairChoiceTitle);
pairChoiceTitle.id = 'ae-pair-choice-title';
const pairChoiceCards = el('div', 'ae-pair-choice-cards');
pairChoicePanel.append(pairChoiceTitle, pairChoiceCards);
pairChoice.appendChild(pairChoicePanel);
app.appendChild(pairChoice);
// v200: toccando fuori dalla finestra la scelta scende nel pulsante grande in basso, diviso in due
// ("Giocatore x | Giocatore y"); l'app si può usare, ma non si toccano le carte e non si pesca dal mazzo
pairChoice.addEventListener('click', e => {
  if (e.target !== pairChoice || !needsPairChoice() || ui.isTransitioning) return;
  const from = pairChoicePanel.getBoundingClientRect();
  ui.pairMinimized = pairChoiceKey();
  render();
  animatePairToDock(from);
  const first = pairDock.querySelector('button');
  if (first) first.focus({ preventScroll: true });
});
// v201: la finestra scende e si trasforma nel pulsante diviso in due. Una copia della finestra parte dalla sua
// posizione e si stringe/allunga fino al pulsante, sfumando; il pulsante compare mentre lei arriva
const PAIR_DOCK_MS = 420;
function animatePairToDock(from) {
  const to = pairDock.getBoundingClientRect();
  if (reducedMotion.matches || !document.body.animate || !from.width || !to.width) return;
  const ghost = pairChoicePanel.cloneNode(true);
  ghost.removeAttribute('id');
  ghost.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
  ghost.setAttribute('aria-hidden', 'true');
  ghost.classList.add('ae-pair-ghost');
  Object.assign(ghost.style, { left: from.left + 'px', top: from.top + 'px', width: from.width + 'px', height: from.height + 'px' });
  document.body.appendChild(ghost);
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const sx = to.width / from.width;
  const sy = to.height / from.height;
  const anim = ghost.animate([
    { transform: 'none', opacity: 1 },
    { transform: `translate(${dx * .7}px, ${dy * .7}px) scale(${1 + (sx - 1) * .7}, ${1 + (sy - 1) * .7})`, opacity: .9, offset: .7 },
    { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, opacity: 0 }
  ], { duration: PAIR_DOCK_MS, easing: 'cubic-bezier(.4, 0, .2, 1)' });
  anim.onfinish = () => ghost.remove();
  setTimeout(() => ghost.remove(), PAIR_DOCK_MS + 200);
  pairDock.animate([{ opacity: 0, transform: 'scale(.96)' }, { opacity: 0, transform: 'scale(.96)', offset: .55 },
    { opacity: 1, transform: 'none' }], { duration: PAIR_DOCK_MS, easing: 'ease-out' });
}
const pairDock = el('div', 'ae-pair-dock');
pairDock.setAttribute('role', 'group');
pairDock.setAttribute('aria-label', I18N_IT.pairChoiceTitle);
pairDock.hidden = true;
nemesisBtn.after(pairDock);

function needsPairChoice() {
  const cur = currentTurnCard();
  return !resolving && !ui.deckBuilding && isPairCard(cur) && !turnCardPlayer(cur);
}
// Carta x/y in attesa di scelta (giro e posizione): la finestra ridotta vale solo per questa carta
function pairChoiceKey() {
  return turnOrder.round + ':' + ((turnOrder.history || []).length - 1);
}
function pairButtons(kind, cls, label) {
  return pairOptions(kind).map(p => {
    const b = el('button', cls, label(p));
    b.type = 'button';
    b.dataset.kind = p;
    b.setAttribute('aria-label', I18N_IT.pairChoiceLabel(Number(p.slice(1))));
    b.addEventListener('click', () => chooseTurnPlayer(p));
    return b;
  });
}
function renderPairChoice() {
  const pending = needsPairChoice();
  const minimized = pending && ui.pairMinimized === pairChoiceKey();
  const show = pending && !minimized;
  const wasShown = !pairChoice.hidden;
  pairChoice.hidden = !show;
  app.classList.toggle('is-pair-choice', show);
  // Scelta ridotta nel pulsante in basso: niente carte e niente pesca dal mazzo (cardControls, openCardDialog, mazzo)
  app.classList.toggle('is-pair-pending', minimized);
  mainEl.inert = show;
  const dock = document.querySelector('.ae-dock');
  if (dock) dock.inert = show;
  headerPiles.inert = show;
  // Pulsante grande: sparisce con la finestra aperta; con la finestra ridotta lo sostituiscono i due giocatori
  // (con la finestra aperta resta il suo spazio, invisibile, così le carte sotto non cambiano misura)
  nemesisBtn.style.visibility = show ? 'hidden' : '';
  if (minimized) nemesisBtn.hidden = true;
  pairDock.hidden = !minimized;
  if (minimized && pairDock.dataset.kind !== currentTurnCard()) {
    pairDock.dataset.kind = currentTurnCard();
    pairDock.replaceChildren(...pairButtons(currentTurnCard(), 'ae-button ae-pair-half',
      p => I18N_IT.trackPlayerName(Number(p.slice(1)))));
  }
  if (!minimized) delete pairDock.dataset.kind;
  if (!show) return;
  // Misura delle carte della fascia piccola (52px sul telefono)
  const small = document.querySelector('.ae-compact-rail .ae-queue-item');
  const w = small && small.getBoundingClientRect().width ? small.getBoundingClientRect().width : 52;
  pairChoice.style.setProperty('--ae-pick-w', w + 'px');
  const kind = currentTurnCard();
  if (pairChoiceCards.dataset.kind !== kind) {
    pairChoiceCards.dataset.kind = kind;
    pairChoiceCards.replaceChildren(...pairButtons(kind, 'ae-pair-pick', p => p.slice(1)));
  }
  if (!wasShown) {
    announce(I18N_IT.pairChoiceTitle);
    pairChoiceCards.firstChild.focus({ preventScroll: true });
  }
}

// In alto a sinistra, al posto di Undo (che è nel Menu), uno accanto all'altro e uguali nei due turni: il mazzo nemesi
// (dorso con il numero di carte rimaste) e la pila degli scarti (ultima carta scartata con il numero; toccandola si apre).
// Creati qui, così valgono anche con un index.html vecchio.
const headerPiles = el('div', 'ae-header-piles');
const dockDeck = el('div', 'ae-pile ae-pile--deck');
const dockDiscard = el('button', 'ae-pile ae-pile--discard');
dockDiscard.type = 'button';
dockDiscard.addEventListener('click', () => { if (!ui.isTransitioning && !ui.deckBuilding) openDiscard(); });
// Tocco sul mazzo: compare il pulsante "Pesca carta" (per gli effetti che fanno pescare o guardare la carta in cima)
dockDeck.setAttribute('role', 'button');
dockDeck.tabIndex = 0;
// (v200: non con la scelta del giocatore x/y in sospeso)
dockDeck.addEventListener('click', () => {
  if (!ui.isTransitioning && !modals.length && !ui.deckBuilding && !needsPairChoice()) openDeckPopover();
});
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
  // Durante la creazione del mazzo il numero sale man mano che le carte arrivano (ui.deckShown)
  const deckCount = ui.deckShown !== null && ui.deckShown !== undefined ? ui.deckShown : deck.length;
  pileContent(dockDeck, deckCount ? CARD_BACK : null, deckCount);
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
//   - la carta appena messa in gioco passa dalla sua misura grande a quella del turno giocatori (FLIP);
//   - le altre carte della coda entrano da sinistra (ENTER_MS); box vita/token e comandi compaiono con una dissolvenza.
// Va chiamata al posto di render(): misura prima e dopo il disegno.
const MORPH_MS = 380;
// Entrata da sinistra delle altre carte della coda nel turno giocatori
const ENTER_MS = 320;
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
  // A metà della trasformazione: le altre carte della coda entrano da sinistra; comandi, NUOVA (e il box, se non
  // scivola) della carta che si trasforma compaiono con una breve dissolvenza
  const delay = art ? MORPH_MS / 2 : 0;
  queueList.querySelectorAll('.queue-slot').forEach(slot => {
    if (art && slot.contains(art)) {
      const parts = [...slot.querySelectorAll('.queue-controls, .ae-new-tag')]
        .concat(badge && fromStatus ? [] : [...slot.querySelectorAll('.ae-status-badge')]);
      parts.forEach(node => node.animate([{ opacity: 0 }, { opacity: 1 }],
        { duration: 220, delay, easing: 'ease-out', fill: 'backwards' }));
      return;
    }
    slot.animate([{ opacity: 0, transform: `translateX(${-slot.offsetWidth}px)` }, { opacity: 1, transform: 'none' }],
      { duration: ENTER_MS, delay, easing: 'cubic-bezier(.2, 0, .2, 1)', fill: 'backwards' });
  });
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
    showVictory();
  }, reducedMotion.matches ? 0 : MORPH_MS + 100);
}

// Schermata Vittoria: scritta "Vittoria" come il banner dei Tier, ma resta ferma sullo schermo; sotto Statistiche e
// Menu iniziale; un tocco su una parte vuota torna alla partita com'era. Si apre da sola (checkVictory) o dal Menu ("Nemesi uccisa").
function showVictory() {
  // Fine del tempo di partita (statistiche): l'ultima volta che si arriva alla Vittoria
  stats.endedAt = Date.now();
  save();
  let close = () => {};
  const cancel = () => close();
  const screen = el('div', 'ae-victory-screen');
  screen.setAttribute('role', 'dialog');
  screen.setAttribute('aria-modal', 'true');
  const text = I18N_IT.victoryTitle;
  const title = el('h2', 'ae-tier-banner-text' + (text.length > 8 ? ' is-long' : ''), text);
  title.id = 'victory-title';
  screen.setAttribute('aria-labelledby', title.id);
  const actions = el('div', 'ae-victory-actions');
  const statsBtn = button(I18N_IT.statsTitle, 'primary', openStats);
  const home = button(I18N_IT.mainMenu, 'secondary', () => { close(); openStart(); });
  [statsBtn, home].forEach(b => b.classList.add('ae-button--full'));
  actions.append(statsBtn, home);
  screen.append(title, actions);
  // Niente "Chiudi": un tocco in una parte vuota dello schermo torna alla partita
  close = openModal(screen, { onCancel: cancel, initialFocus: statsBtn });
  screen.addEventListener('click', e => { if (e.target === screen) cancel(); });
  screen.parentElement.classList.add('ae-victory-backdrop');
}

// Statistiche della partita, in sola lettura. Sotto alcune righe (carte giocate, carte rimanenti, minion uccisi, poteri
// scartati, poteri risolti, attacchi risolti) un box con le carte, in fila da scorrere; i minion hanno la loro vita.
// Toccando una carta la si vede grande.
function openStats() {
  let close = () => {};
  const cancel = () => close();
  const dialog = dialogShell(I18N_IT.statsTitle, settings.nemesis || '', cancel, { displayTitle: false });
  dialog.classList.add('ae-stats');
  const rows = I18N_IT.statsRows;
  const lists = I18N_IT.statsLists;
  const ids = (stats && stats.cards) || {};
  const byId = list => (Array.isArray(list) ? list : []).map(id => cardsById.get(id)).filter(Boolean);
  // Carte giocate: tutte quelle uscite dal mazzo (scarti, dalla più vecchia, e carte ancora in gioco)
  const played = discard.concat(queue.map(e => e.data));
  // Carte rimanenti: per Tier e nome (l'ordine del mazzo non si mostra)
  const left = deck.slice().sort((x, y) => (x.tier || 0) - (y.tier || 0) || x.name.localeCompare(y.name));
  const list = el('div', 'ae-stats-list');
  [
    [rows.turns, turn],
    [rows.played, Math.max(0, stats.deckSize - deck.length), played, lists.played],
    [rows.left, deck.length, left, lists.left],
    [rows.minionsKilled, stats.minionsKilled, byId(ids.minionsKilled), lists.minionsKilled],
    [rows.powersPaid, stats.powersPaid, byId(ids.powersPaid), lists.powersPaid],
    [rows.powersResolved, stats.powersResolved, byId(ids.powersResolved), lists.powersResolved],
    [rows.aetherSpent, stats.aetherSpent],
    [rows.attacksResolved, stats.attacksResolved, byId(ids.attacksResolved), lists.attacksResolved]
  ].forEach(([label, value, cards, listLabel]) => {
    const row = el('dl', 'ae-side-stats ae-stats-row');
    row.append(el('dt', '', label), el('dd', '', String(value)));
    list.appendChild(row);
    if (cards) list.appendChild(statsCardStrip(cards, listLabel));
  });
  // Tempi: partita intera e ogni Tier (dalla sua prima carta pescata alla prima del Tier dopo, o alla Vittoria)
  const timeTitle = el('h3', 'ae-stats-subtitle', I18N_IT.statsTimeTitle);
  const timeList = el('dl', 'ae-side-stats ae-stats-times');
  statsTimes().forEach(([label, ms]) => timeList.append(el('dt', '', label),
    el('dd', '', ms === null ? I18N_IT.statsTimeUnknown : formatDuration(ms))));
  // Turni in gioco di ogni minion: prima quelli uccisi, poi quelli ancora in gioco
  // Ogni minion con la sua carta (le partite vecchie non hanno l'id: si cerca per nome)
  const minionCard = m => (m.id && cardsById.get(m.id)) || allCards.find(c => c.type === 'Minion' && c.name === m.name) || null;
  const minions = [
    ...stats.minions.map(m => ({ name: m.name, data: minionCard(m), turns: m.turns, alive: false })),
    ...queue.filter(e => e.data.type === 'Minion').map(e => ({ name: e.data.name, data: e.data, turns: Math.max(0, turn - (e.bornTurn || 0)), alive: true }))
  ];
  const minionTitle = el('h3', 'ae-stats-subtitle', I18N_IT.statsMinionsTitle);
  let minionList;
  if (minions.length) {
    // Una riga per minion: miniatura (toccandola la carta si vede grande), nome e turni in gioco
    minionList = el('div', 'ae-stats-minions');
    minions.forEach(m => {
      const row = el('div', 'ae-stats-minion');
      if (m.data) {
        const pic = el('button', 'ae-stats-minion-pic');
        pic.type = 'button';
        pic.setAttribute('aria-label', m.name);
        pic.appendChild(cardArt(m.data, { thumb: true, lazy: true }));
        pic.addEventListener('click', () => openDiscardZoom(m.data));
        row.appendChild(pic);
      }
      const text = el('div', 'ae-stats-minion-text');
      text.append(el('span', 'ae-stats-minion-name', m.name),
        el('span', 'ae-stats-minion-note', m.alive ? I18N_IT.stillInPlay : ''));
      row.append(text, el('span', 'ae-stats-minion-turns', I18N_IT.minionTurns(m.turns)));
      minionList.appendChild(row);
    });
  } else {
    minionList = el('p', 'ae-stats-empty', I18N_IT.statsNoMinions);
  }
  // Statistiche maghi (v175): una riga per giocatore.
  // "Æ spesi" per ora è vuoto.
  const magesTitle = el('h3', 'ae-stats-subtitle', I18N_IT.statsMagesTitle);
  const magesTable = el('table', 'ae-stats-mages');
  const head = el('tr');
  I18N_IT.statsMagesHead.forEach(h => head.appendChild(el('th', '', h)));
  magesTable.appendChild(el('thead')).appendChild(head);
  const body = magesTable.appendChild(el('tbody'));
  // Una riga per giocatore (il jolly non ha una riga sua: i suoi turni contano per il giocatore che era jolly)
  playerKinds().forEach(kind => {
    const m = (stats.mages && stats.mages[kind]) || { damage: 0, powers: 0, kills: 0 };
    const tr = el('tr');
    const name = el('th', '');
    name.scope = 'row';
    const dot = el('span', 'ae-stats-mage-dot');
    dot.dataset.kind = kind;
    name.append(dot, kind === 'wild' ? I18N_IT.trackWildName : I18N_IT.trackPlayerName(Number(kind.slice(1))));
    tr.append(name, el('td', '', String(m.damage)), el('td', '', String(m.kills)), el('td', '', String(m.powers)),
      el('td', '', '—'));
    body.appendChild(tr);
  });
  const footer = el('div', 'ae-modal-footer');
  footer.appendChild(button(I18N_IT.close, 'secondary', cancel));
  dialog.append(timeTitle, timeList, list, magesTitle, magesTable, minionTitle, minionList, footer);
  close = openModal(dialog, { onCancel: cancel });
}

// Tempi delle statistiche: [etichetta, millisecondi o null]. La fine è la Vittoria (stats.endedAt) o adesso.
// Il tempo è quello dell'orologio: comprende anche le pause con l'app chiusa.
function statsTimes() {
  const start = stats.startedAt;
  const at = stats.tierAt || {};
  const end = stats.endedAt || Date.now();
  if (!start) return [[I18N_IT.statsTime, null], [I18N_IT.statsTierTime(1), null], [I18N_IT.statsTierTime(2), null], [I18N_IT.statsTierTime(3), null]];
  const t2 = at[2] || null;
  const t3 = at[3] || null;
  const span = (from, to) => (from ? Math.max(0, (to || end) - from) : null);
  return [
    [I18N_IT.statsTime, Math.max(0, end - start)],
    [I18N_IT.statsTierTime(1), span(start, t2 || t3)],
    [I18N_IT.statsTierTime(2), span(t2, t3)],
    [I18N_IT.statsTierTime(3), span(t3, null)]
  ];
}

// Durata leggibile: "45 s", "12 min 05 s", "1 h 07 min"
function formatDuration(ms) {
  const s = Math.round(ms / 1000);
  const pad = n => String(n).padStart(2, '0');
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${Math.floor(s / 60)} min ${pad(s % 60)} s`;
  return `${Math.floor(s / 3600)} h ${pad(Math.floor((s % 3600) / 60))} min`;
}

// Box delle statistiche: miniature in fila (scorrono in orizzontale); i minion con la vita stampata sulla carta
function statsCardStrip(cards, label) {
  const box = el('div', 'ae-stats-cards');
  box.setAttribute('role', 'list');
  box.setAttribute('aria-label', label);
  if (!cards.length) {
    box.classList.add('is-empty');
    box.appendChild(el('p', 'ae-stats-empty', I18N_IT.statsListEmpty));
    return box;
  }
  cards.forEach(data => {
    const item = el('button', 'ae-stats-card');
    item.type = 'button';
    item.setAttribute('role', 'listitem');
    // (v214: minion a vita variabile: "*", come sulla carta)
    const hp = isVariableMinion(data) ? '*' : data.type === 'Minion' && typeof data.hp === 'number' ? data.hp : null;
    item.setAttribute('aria-label', [data.name, typeName(data), hp !== null ? I18N_IT.statsHp(hp) : ''].filter(Boolean).join(', '));
    item.appendChild(cardArt(data, { thumb: true, lazy: true }));
    if (hp !== null) {
      const badge = el('span', 'ae-stats-hp');
      badge.append(icon('heart'), el('span', '', String(hp)));
      item.appendChild(badge);
    }
    item.addEventListener('click', () => openDiscardZoom(data));
    box.appendChild(item);
  });
  trackDrag(box);
  box.addEventListener('click', e => { if (box.dataset.dragged === '1') { e.stopPropagation(); e.preventDefault(); } }, true);
  return box;
}

// --- Creazione del mazzo nemesi (dopo "Inizia partita") ---
// Si vedono i 9 mazzi da cui nasce il mazzo nemesi: righe Tier 1-3, colonne Base / Potenziate / Specifiche. Base e
// Potenziate sono mazzi coperti con il numero di carte che ne verranno prese; le Specifiche (sempre tutte) sono a faccia
// in su, aperte a ventaglio; toccandole si vedono grandi, scorrendo a destra e sinistra.
// "Crea mazzo" (il pulsante principale) fa volare le carte una alla volta nel mazzo nemesi in alto a sinistra: prima il
// Tier 3 (in fondo al mazzo), poi il 2, poi l'1 (in cima), senza pause tra un Tier e l'altro; dentro ogni Tier
// le carte partono in ordine casuale dai tre mazzi. Il numero del mazzo sale a ogni carta. Alla fine la schermata
// sparisce e si è nel turno giocatori. Il mazzo vero è già fatto (newGame): l'animazione lo mostra soltanto.

// Carte Specifiche della nemesi della partita per un Tier (come in buildDeck)
function specificCardsOf(tier) {
  return allCards.filter(c => c.category === 'Specific' && c.nemesis === settings.nemesis && c.inNemesisDeck === true && c.tier === tier);
}

function showDeckBuild() {
  closeDeckBuild();
  const layer = el('div', 'deck-build');
  layer.id = 'deck-build';
  const grid = el('div', 'deck-build-grid');
  grid.appendChild(el('span', 'deck-build-corner'));
  ['basic', 'upgraded', 'specific'].forEach(kind => grid.appendChild(el('span', 'deck-build-head', I18N_IT.deckBuildKinds[kind])));
  [1, 2, 3].forEach(tier => {
    grid.appendChild(el('span', 'deck-build-tier', I18N_IT.tierN(tier)));
    ['basic', 'upgraded', 'specific'].forEach(kind => {
      const plan = deckPlan.find(p => p.tier === tier && p.kind === kind) || { count: 0 };
      const pile = el('div', 'deck-build-pile' + (plan.count ? '' : ' is-empty'));
      pile.dataset.tier = tier;
      pile.dataset.kind = kind;
      pile.dataset.left = plan.count;
      pile.dataset.count = plan.count;
      pile.setAttribute('aria-label', I18N_IT.deckBuildPile(plan.count, I18N_IT.deckBuildKinds[kind].toLowerCase(), tier));
      if (kind === 'specific') {
        // A faccia in su, a ventaglio (come le carte in mano); si toccano per vederle grandi
        pile.classList.add('is-fan');
        pile.setAttribute('role', 'button');
        pile.tabIndex = 0;
        const cards = specificCardsOf(tier);
        const mid = (cards.length - 1) / 2;
        cards.forEach((data, i) => {
          const card = el('span', 'deck-build-fan-card');
          card.style.setProperty('--fan', String(i - mid));
          // Due facce: fronte (la carta) e dorso; con "Crea mazzo" la carta si gira
          const inner = el('span', 'deck-build-fan-inner');
          const img = document.createElement('img');
          img.alt = '';
          img.className = 'deck-build-fan-front';
          img.src = data.thumb;
          img.addEventListener('error', () => { img.src = encodeURI(data.image); }, { once: true });
          const back = document.createElement('img');
          back.alt = '';
          back.className = 'deck-build-fan-back';
          back.src = CARD_BACK;
          inner.append(img, back);
          card.appendChild(inner);
          pile.appendChild(card);
        });
        pile.addEventListener('click', () => { if (!ui.isTransitioning) openSpecificViewer(tier); });
        pile.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pile.click(); } });
      } else {
        pile.setAttribute('role', 'img');
        const img = document.createElement('img');
        img.alt = '';
        img.src = CARD_BACK;
        pile.appendChild(img);
      }
      const count = el('span', 'ae-pile-count', String(plan.count));
      count.setAttribute('aria-hidden', 'true');
      pile.appendChild(count);
      grid.appendChild(pile);
    });
  });
  layer.append(el('h2', 'deck-build-title', I18N_IT.deckBuildTitle), grid);
  mainEl.appendChild(layer);
  mainEl.classList.add('is-deck-building');
}

// Carte Specifiche in grande: tutte quelle della nemesi (Tier 1, 2, 3), si scorrono a destra e sinistra; si parte dalla
// prima del Tier toccato. Sopra: "Tier 1 | Tier 2 | Tier 3" e sotto ogni Tier un pallino per carta (come i carosello):
// il pallino acceso è la carta mostrata. Toccando un Tier si va alla sua prima carta.
function openSpecificViewer(tier) {
  const cards = [1, 2, 3].flatMap(t => specificCardsOf(t).map(data => ({ data, t })));
  if (!cards.length) return;
  let close = () => {};
  const cancel = () => close();
  const dialog = dialogShell(I18N_IT.specificTitle, settings.nemesis, cancel, { displayTitle: false });
  dialog.classList.add('ae-spec-viewer');
  const nav = el('div', 'ae-spec-tiers');
  const dots = [];
  [1, 2, 3].forEach((t, ti) => {
    const ofTier = cards.filter(c => c.t === t);
    if (!ofTier.length) return;
    if (nav.children.length) {
      const sep = el('span', 'ae-spec-sep', '|');
      sep.setAttribute('aria-hidden', 'true');
      nav.appendChild(sep);
    }
    const group = el('button', 'ae-spec-tier');
    group.type = 'button';
    group.dataset.tier = t;
    const row = el('span', 'ae-spec-dots');
    row.setAttribute('aria-hidden', 'true');
    ofTier.forEach(() => { const d = el('span'); row.appendChild(d); dots.push({ d, group }); });
    group.append(el('span', 'ae-spec-tier-name', I18N_IT.tierN(t)), row);
    group.addEventListener('click', () => goTo(cards.findIndex(c => c.t === t), true));
    nav.appendChild(group);
  });
  const track = el('div', 'ae-spec-track');
  cards.forEach(({ data, t }) => {
    const slide = el('div', 'ae-spec-slide');
    slide.dataset.tier = t;
    slide.appendChild(cardArt(data));
    track.appendChild(slide);
  });
  let current = -1;
  const mark = i => {
    if (i === current || i < 0 || i >= cards.length) return;
    current = i;
    dots.forEach(({ d, group }, k) => {
      d.classList.toggle('is-on', k === i);
      if (k === i) [...nav.querySelectorAll('.ae-spec-tier')].forEach(g => {
        g.classList.toggle('is-current', g === group);
        g.setAttribute('aria-current', String(g === group));
      });
    });
  };
  const indexNow = () => Math.round(track.scrollLeft / Math.max(1, track.clientWidth + 12));
  const goTo = (i, smooth) => {
    const slide = track.children[i];
    if (!slide) return;
    track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: smooth && !reducedMotion.matches ? 'smooth' : 'auto' });
    mark(i);
  };
  track.addEventListener('scroll', () => mark(indexNow()), { passive: true });
  const footer = el('div', 'ae-modal-footer');
  footer.appendChild(button(I18N_IT.close, 'secondary', cancel));
  dialog.append(nav, track, footer);
  close = openModal(dialog, { onCancel: cancel });
  goTo(Math.max(0, cards.findIndex(c => c.t === tier)), false);
}

function closeDeckBuild() {
  mainEl.classList.remove('is-deck-building');
  const old = document.getElementById('deck-build');
  if (old) old.remove();
  deckFlight = null;
  if (deckSlider) { deckSlider.lock(false); deckSlider.setProgress(0, true); }
}

// Ricomincia (Menu, durante "Crea mazzo") o cambio dei giocatori: mazzo nuovo con le scelte correnti, di nuovo i 9 mazzi
function rebuildDeck() {
  clearTransition();
  closeAllModals();
  newGame();
  ui.deckBuilding = true;
  ui.deckShown = 0;
  ui.deckDark = true;
  showDeckBuild();
  render();
  prefetchDeckImages();
}

// Finestra della nemesi (tocco sul nome in alto, solo durante "Crea mazzo"): nome e illustrazione come nel menu, e il
// numero di giocatori, che si può cambiare (il mazzo si rifà subito)
function openGameSetup() {
  if (!ui.deckBuilding || ui.isTransitioning) return;
  let close = () => {};
  const cancel = () => close();
  const dialog = dialogShell(I18N_IT.gameSetupTitle, '', cancel, { displayTitle: false });
  dialog.classList.add('ae-game-setup');
  const head = el('div', 'start-choice-head ae-game-setup-head');
  head.appendChild(el('p', 'start-choice-info', settings.nemesis || ''));
  const battleNo = battleOf(settings.nemesis);
  head.appendChild(el('p', 'ae-game-setup-battle', battleNo ? I18N_IT.battle(battleNo) : I18N_IT.battleMissing));
  const art = nemesisArt[settings.nemesis];
  head.classList.toggle('has-art', !!art);
  if (art) {
    const portrait = el('span', 'nemesis-art');
    portrait.setAttribute('aria-hidden', 'true');
    portrait.style.backgroundImage = `url("${encodeURI(art.portrait)}")`;
    head.prepend(portrait);
  }
  const label = el('h3', 'start-label', 'Giocatori');
  label.id = 'game-setup-players';
  const choices = el('div', 'choices');
  choices.setAttribute('role', 'group');
  choices.setAttribute('aria-labelledby', label.id);
  const renderChoices = () => choices.replaceChildren(...startOptions.players.map(value => {
    const b = el('button', '', String(value));
    b.type = 'button';
    b.setAttribute('aria-pressed', String(value === settings.players));
    b.setAttribute('aria-label', I18N_IT.players(value));
    b.addEventListener('click', () => {
      if (settings.players === value) return;
      settings.players = value;
      // Il mazzo dipende dai giocatori: si rifà, con la finestra ancora aperta
      newGame();
      ui.deckShown = 0;
      showDeckBuild();
      render();
      renderChoices();
      choices.querySelector('[aria-pressed="true"]').focus();
    });
    return b;
  }));
  renderChoices();
  const footer = el('div', 'ae-modal-footer');
  footer.appendChild(button(I18N_IT.close, 'secondary', cancel));
  dialog.append(head, label, choices, footer);
  close = openModal(dialog, { onCancel: cancel });
}

// --- "Crea mazzo" con lo slider: il quadratino si trascina da sinistra a destra e le carte vanno nel mazzo in alto
// seguendo il dito. Avanzamento p (0..1): con p = 0 si vedono tutti i mazzi, a metà strada è nel mazzo circa metà delle
// carte, alla fine il mazzo è completo e la partita inizia. Lasciando prima della fine il quadratino torna indietro
// (e le carte tornano nei loro mazzi). Prima il Tier 3 (in fondo al mazzo), poi il 2, poi l'1; dentro ogni Tier le
// carte partono in ordine casuale dai tre mazzi.
// Ogni carta ha una copia (fantasma) che vola dal suo mazzo a quello in alto; DECK_FLY_WINDOW carte sono in volo
// insieme. Il mazzo vero è già fatto (newGame): l'animazione lo mostra soltanto.
const DECK_FLY_WINDOW = 3;
// Oltre questa frazione dello slider, al rilascio, il mazzo si completa
const DECK_SLIDE_DONE = 0.94;
let deckFlight = null;

// Prepara i voli (una volta per schermata): ordine delle carte, mazzo di partenza, copie da far volare
function prepareDeckFlight() {
  const layer = document.getElementById('deck-build');
  if (!layer) return null;
  if (deckFlight && deckFlight.layer === layer) return deckFlight;
  const order = [];
  [3, 2, 1].forEach(tier => {
    const ofTier = [];
    ['basic', 'upgraded', 'specific'].forEach(kind => {
      const pile = layer.querySelector(`.deck-build-pile[data-tier="${tier}"][data-kind="${kind}"]`);
      const fan = kind === 'specific' ? [...pile.querySelectorAll('.deck-build-fan-card')] : null;
      const total = kind === 'specific' ? fan.length : Number(pile.dataset.count);
      for (let i = 0; i < total; i++) ofTier.push({ pile, fanCard: fan ? fan[i] : null });
    });
    order.push(...shuffle(ofTier));
  });
  order.forEach((c, i) => { c.i = i; c.ghost = null; c.state = 0; });
  deckFlight = { layer, order, p: 0 };
  return deckFlight;
}

// Copia della carta in volo, creata al primo movimento (le misure si prendono allora)
function deckGhost(c) {
  if (c.ghost) return c.ghost;
  const source = c.fanCard || c.pile.querySelector(':scope > img');
  const from = source.getBoundingClientRect();
  const w = c.fanCard ? source.offsetWidth : from.width;
  const h = c.fanCard ? source.offsetHeight : from.height;
  const cx = from.left + from.width / 2;
  const cy = from.top + from.height / 2;
  const ghost = el('div', 'ae-fly-ghost ae-draw-ghost ae-deck-card');
  const img = document.createElement('img');
  img.alt = '';
  img.src = CARD_BACK;
  ghost.appendChild(img);
  Object.assign(ghost.style, { left: (cx - w / 2) + 'px', top: (cy - h / 2) + 'px', width: w + 'px', height: h + 'px', visibility: 'hidden' });
  document.body.appendChild(ghost);
  c.ghost = ghost;
  c.cx = cx; c.cy = cy; c.w = w;
  return ghost;
}

// Disegna i mazzi e le carte in volo per l'avanzamento p
function setDeckProgress(p) {
  const flight = prepareDeckFlight();
  if (!flight) return;
  flight.p = p;
  const n = flight.order.length;
  // Le Specifiche si girano (dorso in su) appena lo slider si muove; tornano a faccia in su a slider fermo all'inizio
  flight.layer.classList.toggle('is-flipping', p > 0);
  const to = dockDeck.getBoundingClientRect();
  const x = p * (n + DECK_FLY_WINDOW - 1);
  let landed = 0;
  const taken = new Map();
  flight.order.forEach(c => {
    const t = n ? Math.max(0, Math.min(1, (x - c.i) / DECK_FLY_WINDOW)) : 1;
    if (t >= 1) landed++;
    if (t > 0) taken.set(c.pile, (taken.get(c.pile) || 0) + 1);
    if (c.fanCard) c.fanCard.classList.toggle('is-gone', t > 0);
    if (t <= 0 || t >= 1) {
      if (c.ghost) c.ghost.style.visibility = 'hidden';
      return;
    }
    const ghost = deckGhost(c);
    const dx = to.left + to.width / 2 - c.cx;
    const dy = to.top + to.height / 2 - c.cy;
    const s = 1 + (to.width / c.w - 1) * t;
    const arc = Math.sin(Math.PI * t);
    ghost.style.visibility = '';
    ghost.style.transform = `translate(${dx * t}px, ${dy * t - 30 * arc}px) rotate(${(c.i % 2 ? 8 : -8) * arc}deg) scale(${s})`;
  });
  flight.layer.querySelectorAll('.deck-build-pile').forEach(pile => {
    const left = Math.max(0, Number(pile.dataset.count) - (taken.get(pile) || 0));
    pile.dataset.left = left;
    pile.querySelector('.ae-pile-count').textContent = String(left);
    pile.classList.toggle('is-empty', left <= 0);
  });
  const before = ui.deckShown || 0;
  ui.deckShown = Math.min(deck.length, landed);
  renderDockPiles();
  if (ui.deckShown > before) {
    dockDeck.classList.remove('is-bump');
    void dockDeck.offsetWidth;
    dockDeck.classList.add('is-bump');
  }
}

// Fine di "Crea mazzo": la schermata sparisce, banner "Partita iniziata", poi lo sfondo passa dal nero a quello del
// turno giocatori
const DECK_DARK_FADE_MS = 900;
function finishDeckBuild() {
  const layer = document.getElementById('deck-build');
  if (deckFlight) deckFlight.order.forEach(c => { if (c.ghost) c.ghost.remove(); });
  deckFlight = null;
  ui.deckBuilding = false;
  ui.deckShown = null;
  if (deckSlider) { deckSlider.lock(false); deckSlider.setProgress(0, true); }
  mainEl.classList.remove('is-deck-building');
  if (layer && layer.animate && !reducedMotion.matches) {
    const fade = layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' });
    fade.onfinish = () => layer.remove();
    setTimeout(() => layer.remove(), 400);
  } else if (layer) {
    layer.remove();
  }
  // v193: niente carta turno pescata da sola: il pulsante è "Pesca carta turno"
  render();
  nemesisBtn.focus({ preventScroll: true });
  // Banner "Partita iniziata", uguale a quello dei Tier; finito il banner lo sfondo si accende
  showBanner(I18N_IT.gameStarted);
  setTimeout(() => {
    ui.deckDark = false;
    app.classList.remove('is-deck-dark');
  }, reducedMotion.matches ? 0 : TIER_BANNER_MS);
}

// Completa il mazzo da dove è arrivato lo slider (rilascio vicino alla fine, tastiera), poi la partita inizia
function runDeckBuild() {
  if (!ui.deckBuilding || ui.isTransitioning) return;
  const flight = prepareDeckFlight();
  if (!flight || reducedMotion.matches) { finishDeckBuild(); return; }
  const from = flight.p;
  const ms = Math.max(250, (1 - from) * Math.min(2400, flight.order.length * 70));
  lockFor(ms + 120, finishDeckBuild);
  if (deckSlider) deckSlider.lock(true);
  tween(from, 1, ms, p => { setDeckProgress(p); if (deckSlider) deckSlider.setProgress(p); });
}

// Piccola animazione numerica (requestAnimationFrame, con riserva setTimeout per il browser di prova)
function tween(from, to, ms, step, done) {
  const t0 = performance.now();
  let finished = false;
  const tick = () => {
    if (finished) return;
    const k = Math.min(1, (performance.now() - t0) / ms);
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    step(from + (to - from) * e);
    if (k >= 1) { finished = true; if (done) done(); return; }
    if (window.requestAnimationFrame) requestAnimationFrame(tick); else setTimeout(tick, 16);
  };
  tick();
  setTimeout(() => { if (!finished) { finished = true; step(to); if (done) done(); } }, ms + 200);
}

// Slider di "Crea mazzo" nel dock, al posto del pulsante principale: box con il quadratino dorato che si trascina
// a destra. Pulsa finché non lo si tocca. Da tastiera: freccia destra / Invio completano.
let deckSlider = null;
function buildDeckSlider() {
  const box = el('div', 'ae-deck-slider');
  box.setAttribute('role', 'slider');
  box.setAttribute('aria-label', I18N_IT.slideToBuildLabel);
  box.setAttribute('aria-valuemin', '0');
  box.setAttribute('aria-valuemax', '100');
  box.setAttribute('aria-valuenow', '0');
  box.tabIndex = 0;
  box.hidden = true;
  const fill = el('span', 'ae-deck-slider-fill');
  const label = el('span', 'ae-deck-slider-label', I18N_IT.slideToBuild);
  const knob = el('span', 'ae-deck-slider-knob');
  knob.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">'
    + '<path d="M6 6l6 6-6 6M12 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  box.append(fill, label, knob);
  let p = 0;
  let locked = false;
  let drag = null;
  const range = () => Math.max(1, box.clientWidth - knob.offsetWidth - 8);
  const setProgress = (value, quiet) => {
    p = Math.max(0, Math.min(1, value));
    box.style.setProperty('--p', String(p));
    knob.style.transform = `translateX(${p * range()}px)`;
    fill.style.width = `calc(${p * range()}px + ${knob.offsetWidth || 48}px + 4px)`;
    box.setAttribute('aria-valuenow', String(Math.round(p * 100)));
    if (!quiet) box.classList.toggle('is-started', p > 0);
    if (quiet && p === 0) box.classList.remove('is-started', 'is-dragging');
  };
  const lock = on => { locked = on; if (on) box.classList.add('is-started'); };
  const release = () => {
    if (!drag) return;
    drag = null;
    box.classList.remove('is-dragging');
    if (p >= DECK_SLIDE_DONE) { runDeckBuild(); return; }
    // Prima della fine: il quadratino torna all'inizio e le carte ai loro mazzi
    lock(true);
    tween(p, 0, Math.max(160, p * 450), v => { setDeckProgress(v); setProgress(v); }, () => {
      lock(false);
      setProgress(0, true);
      setDeckProgress(0);
    });
  };
  box.addEventListener('pointerdown', e => {
    if (locked || !ui.deckBuilding || ui.isTransitioning || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const kr = knob.getBoundingClientRect();
    // Si prende il quadratino (o il box: il quadratino salta sotto il dito solo se il tocco è vicino all'inizio)
    if (e.clientX > kr.right + 24) return;
    e.preventDefault();
    drag = { x: e.clientX - p * range(), id: e.pointerId };
    try { box.setPointerCapture(e.pointerId); } catch (_) { /* niente cattura */ }
    box.classList.add('is-dragging', 'is-started');
    prepareDeckFlight();
  });
  box.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const v = (e.clientX - drag.x) / range();
    const before = p;
    setProgress(v);
    setDeckProgress(p);
    if (before < 1 && p >= 1) buzz(30);
  });
  box.addEventListener('pointerup', release);
  box.addEventListener('pointercancel', release);
  box.addEventListener('lostpointercapture', release);
  box.addEventListener('keydown', e => {
    if (locked) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight' || e.key === 'End') {
      e.preventDefault();
      runDeckBuild();
    }
  });
  box.addEventListener('contextmenu', e => e.preventDefault());
  return { box, setProgress, lock };
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
  scrollFocusTo(DRAW_UID, false, true);
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

// Conferma di "Esci dalla partita" (v193): Annulla torna al Menu, Esci va al menu iniziale (la partita resta salvata)
function openExitConfirm(onExit) {
  let close = () => {};
  const cancel = () => close();
  const dialog = dialogShell(I18N_IT.exitConfirmTitle, '', cancel, { displayTitle: false });
  dialog.classList.add('ae-exit-confirm');
  dialog.appendChild(el('p', 'ae-modal-text', I18N_IT.exitConfirmText));
  const footer = el('div', 'ae-modal-footer');
  const cancelBtn = button(I18N_IT.cancel, 'secondary', cancel);
  footer.append(cancelBtn, button(I18N_IT.exitConfirm, 'danger', () => { close(); onExit(); }));
  dialog.appendChild(footer);
  close = openModal(dialog, { onCancel: cancel, initialFocus: cancelBtn });
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
  // Perché era a scatti: l'animazione partiva nello stesso istante in cui la pagina della partita veniva disegnata
  // e le immagini della creazione del mazzo (dorsi, Specifiche) e lo sfondo si stavano ancora scaricando e
  // decodificando; i primi fotogrammi andavano persi e la pagina "saltava". Ora: prima si aspettano le immagini
  // (al massimo 400 ms), le due pagine diventano livelli separati (will-change), e l'animazione parte un attimo dopo,
  // a disegno finito.
  const images = [CARD_BACK, currentBackground().src,
    ...[1, 2, 3].flatMap(t => specificCardsOf(t).map(c => c.thumb))];
  const ready = Promise.race([Promise.all(images.map(src => loadImage(src))), new Promise(r => setTimeout(r, 400))]);
  startLayer.style.willChange = 'transform';
  app.style.willChange = 'transform';
  ready.then(() => setTimeout(() => {
    void app.offsetWidth;
    startLayer.classList.add('is-sliding-out');
    app.classList.add('is-sliding-in');
    setTimeout(() => {
      startLayer.classList.remove('is-sliding-out');
      app.classList.remove('is-sliding-in');
      startLayer.style.willChange = '';
      app.style.willChange = '';
      closeStart();
      if (then) then();
    }, START_SLIDE_MS);
  }, 30));
}

// Sfondo dell'app (maga a sinistra, nemesi a destra): si sceglie nel Menu, la scelta resta salvata nel browser.
// Non fa parte della partita (niente undo).
const BACKGROUND_KEY = 'aeonsend-app-0.2-background';
const BACKGROUNDS = [
  { id: 'masked', src: 'Assets/ui/decor/battle-bg.webp' },
  { id: 'horned', src: 'Assets/ui/decor/battle-bg-2.webp' },
  { id: 'maw', src: 'Assets/ui/decor/battle-bg-3.webp' }
];
function currentBackground() {
  let id = null;
  try { id = localStorage.getItem(BACKGROUND_KEY); } catch (err) { /* si usa quello predefinito */ }
  return BACKGROUNDS.find(b => b.id === id) || BACKGROUNDS[0];
}
function applyBackground() {
  app.style.setProperty('--ae-battle-bg', `url("${currentBackground().src}")`);
}
function setBackground(id) {
  try { localStorage.setItem(BACKGROUND_KEY, id); } catch (err) { console.warn(err); }
  applyBackground();
}
applyBackground();

// v224: leave (facoltativo) = cosa chiudere prima di una voce che porta altrove (Menu aperto dalla finestra del mazzo
// dei turni: la finestra si chiude prima di undo, scarti, vittoria, esci, ricomincia)
function openSideMenu(leave) {
  if (ui.isTransitioning) return;
  let close = () => {};
  const cancel = () => close();
  const go = () => { close(); if (typeof leave === 'function') leave(); };
  const panel = dialogShell(I18N_IT.menu, '', cancel, { displayTitle: false });
  panel.classList.add('ae-side-menu');
  const statsList = el('dl', 'ae-side-stats');
  statsList.append(el('dt', '', I18N_IT.menuTurn), el('dd', '', String(turn)),
    el('dt', '', I18N_IT.menuDeck), el('dd', '', String(deck.length)));
  // Sfondo: anteprima dello sfondo scelto con il nome; si tocca per scegliere tra le anteprime di tutti gli sfondi
  const bgRow = el('div', 'ae-side-field ae-side-field--row');
  bgRow.append(el('span', 'ae-side-field-label', I18N_IT.background), backgroundChoiceButton(null, { compact: true }));
  // Dorso delle carte: miniatura del dorso scelto con il nome; si tocca per scegliere tra tutti i dorsi
  const backRow = el('div', 'ae-side-field ae-side-field--row');
  backRow.append(el('span', 'ae-side-field-label', I18N_IT.cardBack), cardBackChoiceButton(null, { compact: true }));
  const discardOpen = button(I18N_IT.discardButton(discard.length), 'secondary', () => { go(); openDiscard(); });
  discardOpen.classList.add('ae-button--full');
  discardOpen.setAttribute('aria-label', I18N_IT.discardButtonLabel(discard.length));
  // Nemesi uccisa al tavolo (vita a 0): si va alla schermata Vittoria; la partita non cambia (Chiudi torna indietro)
  const killed = button(I18N_IT.nemesisKilled, 'secondary', () => { go(); showVictory(); });
  killed.classList.add('ae-button--full');
  // Esci dalla partita (rosso): finestra di conferma (v193, prima andava tenuto premuto), poi il menu iniziale
  // (Modalità test, v215: "Esci dal test")
  const exit = button(testRun ? I18N_IT.testExit : I18N_IT.exitGame, 'danger', () => openExitConfirm(() => { go(); openStart(); }));
  exit.classList.add('ae-button--full', 'ae-side-exit', 'ae-hold-exit');
  // Undo: annulla l'ultima azione (prima le modifiche non salvate)
  const undoItem = button(I18N_IT.undoAction, 'secondary', () => { go(); undo(); openUndoFloat(); });
  undoItem.classList.add('ae-button--full');
  undoItem.disabled = undoStack.length === 0 && ui.drafts.size === 0;
  const items = [statsList, undoItem, discardOpen, killed];
  // Durante "Crea mazzo": Ricomincia la partita (mazzo nuovo con la stessa nemesi e gli stessi giocatori)
  if (ui.deckBuilding) {
    const restart = button(I18N_IT.restartGame, 'secondary', () => { go(); rebuildDeck(); });
    restart.classList.add('ae-button--full');
    items.splice(1, 0, restart);
  }
  // Modalità test (v215): "Ricomincia lo scenario" (di nuovo dallo stato iniziale, undo vuoto)
  if (testRun) {
    const restartTest = button(I18N_IT.testRestart, 'secondary', () => { go(); restartScenario(); });
    restartTest.classList.add('ae-button--full', 'ae-side-test-restart');
    items.splice(1, 0, restartTest);
  }
  panel.append(...items, bgRow, backRow, exit);
  close = openModal(panel, { onCancel: cancel });
  panel.parentElement.classList.add('ae-modal-backdrop--side');
  swipeToClose(panel, cancel);
  menuCloseToggle(menuBtn, panel.parentElement, cancel);
}

// Scelta del dorso delle carte: griglia di miniature; un tocco sceglie il dorso, lo applica subito e chiude
// Pulsante con la miniatura e il nome del dorso scelto: apre la griglia dei dorsi (Menu della partita e Opzioni)
// compact: solo la miniatura, senza nome (il nome resta per i lettori di schermo)
function cardBackChoiceButton(onClosed, { compact = false } = {}) {
  const btn = el('button', 'ae-back-choice' + (compact ? ' ae-back-choice--compact' : ''));
  btn.type = 'button';
  const thumb = el('img', 'ae-back-choice-thumb');
  thumb.alt = '';
  const name = el('span', 'ae-back-choice-name');
  const sync = () => {
    const b = currentCardBack();
    thumb.src = b.thumb;
    name.textContent = I18N_IT.cardBacks[b.id];
    btn.setAttribute('aria-label', I18N_IT.cardBackChosen(I18N_IT.cardBacks[b.id]));
  };
  btn.append(thumb, name);
  btn.addEventListener('click', () => openCardBackPicker(sync, onClosed));
  sync();
  return btn;
}

// Pulsante con l'anteprima e il nome dello sfondo scelto: apre la scelta con le anteprime (Menu della partita e Opzioni)
// compact: solo l'anteprima, senza nome (il nome resta per i lettori di schermo)
function backgroundChoiceButton(onClosed, { compact = false } = {}) {
  const btn = el('button', 'ae-bg-choice' + (compact ? ' ae-bg-choice--compact' : ''));
  btn.type = 'button';
  const thumb = el('img', 'ae-bg-choice-thumb');
  thumb.alt = '';
  const name = el('span', 'ae-bg-choice-name');
  const sync = () => {
    const b = currentBackground();
    thumb.src = b.src;
    name.textContent = I18N_IT.backgrounds[b.id];
    btn.setAttribute('aria-label', I18N_IT.backgroundChosen(I18N_IT.backgrounds[b.id]));
  };
  btn.append(thumb, name);
  btn.addEventListener('click', () => openBackgroundPicker(sync, onClosed));
  sync();
  return btn;
}

// Scelta dello sfondo: le anteprime di tutti gli sfondi una sotto l'altra; un tocco lo applica subito e chiude
function openBackgroundPicker(onChosen, onClosed) {
  let closeModalFn = () => {};
  const close = () => { closeModalFn(); if (onClosed) onClosed(); };
  const dialog = dialogShell(I18N_IT.background, '', close, { displayTitle: false });
  dialog.classList.add('ae-bg-picker');
  const list = el('div', 'ae-bg-grid');
  const chosen = currentBackground().id;
  BACKGROUNDS.forEach(b => {
    const item = el('button', 'ae-bg-item');
    item.type = 'button';
    item.setAttribute('aria-pressed', String(b.id === chosen));
    const img = el('img');
    img.alt = '';
    img.src = b.src;
    item.append(img, el('span', 'ae-bg-item-name', I18N_IT.backgrounds[b.id]));
    item.addEventListener('click', () => {
      setBackground(b.id);
      close();
      if (onChosen) onChosen();
    });
    list.appendChild(item);
  });
  const footer = el('div', 'ae-modal-footer');
  footer.appendChild(button(I18N_IT.close, 'secondary', close));
  dialog.append(list, footer);
  closeModalFn = openModal(dialog, { onCancel: close, initialFocus: list.querySelector('[aria-pressed="true"]') });
}

// onClosed: dopo la chiusura, in ogni caso (le Opzioni lo usano per tenere la pagina iniziale coperta)
function openCardBackPicker(onChosen, onClosed) {
  let closeModalFn = () => {};
  const close = () => { closeModalFn(); if (onClosed) onClosed(); };
  const cancel = () => close();
  const dialog = dialogShell(I18N_IT.cardBack, '', cancel, { displayTitle: false });
  dialog.classList.add('ae-back-picker');
  const grid = el('div', 'ae-back-grid');
  const chosen = currentCardBack().id;
  CARD_BACKS.forEach(b => {
    const item = el('button', 'ae-back-item');
    item.type = 'button';
    item.setAttribute('aria-pressed', String(b.id === chosen));
    const img = el('img');
    img.alt = '';
    img.loading = 'lazy';
    img.src = b.thumb;
    item.append(img, el('span', 'ae-back-item-name', I18N_IT.cardBacks[b.id]));
    item.addEventListener('click', () => {
      setCardBack(b.id);
      close();
      if (onChosen) onChosen();
      // Il carosello si ridisegna anche se non è cambiato niente, così il dorso da pescare prende quello nuovo
      focusSignature = '';
      if (startLayer.hidden) render();
    });
    grid.appendChild(item);
  });
  const footer = el('div', 'ae-modal-footer');
  footer.appendChild(button(I18N_IT.close, 'secondary', cancel));
  dialog.append(grid, footer);
  closeModalFn = openModal(dialog, { onCancel: cancel, initialFocus: grid.querySelector('[aria-pressed="true"]') });
}

// Pulsante Menu aperto: sopra il menu, nello stesso punto del pulsante, le tre linee diventano una X (animazione
// classica "hamburger → X": la linea centrale sparisce, le altre due ruotano di 45°). Toccando la X le linee tornano e il
// menu si chiude. Il pulsante vero resta sotto l'oscuramento.
function menuCloseToggle(source, backdrop, close) {
  const r = source.getBoundingClientRect();
  if (!r.width) return;
  const x = el('button', 'ae-icon-button ae-menu-button ae-menu-toggle');
  x.type = 'button';
  x.setAttribute('aria-label', I18N_IT.close);
  x.appendChild(el('span', 'ae-menu-lines'));
  Object.assign(x.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  x.addEventListener('click', e => {
    e.stopPropagation();
    x.classList.remove('is-open');
    setTimeout(close, reducedMotion.matches ? 0 : 180);
  });
  backdrop.appendChild(x);
  void x.offsetWidth;
  setTimeout(() => x.classList.add('is-open'), 20);
}

// Pulsante da tenere premuto (ms): si riempie da sinistra (CSS .is-holding); lasciando prima si annulla e si chiama
// onShort (per esempio un avviso). Da tastiera (Invio, clic senza puntatore) vale subito.
const HOLD_EXIT_MS = 900;
function holdToConfirm(btn, ms, onDone, onShort) {
  let timer = null;
  let fired = false;
  btn.classList.add('is-hold-action');
  btn.style.setProperty('--ae-hold-ms', ms + 'ms');
  const cancel = () => {
    clearTimeout(timer);
    timer = null;
    btn.classList.remove('is-holding');
  };
  btn.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    fired = false;
    cancel();
    void btn.offsetWidth;
    btn.classList.add('is-holding');
    timer = setTimeout(() => {
      timer = null;
      fired = true;
      buzz(30);
      onDone();
    }, ms);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => btn.addEventListener(t, () => {
    if (!timer) return;
    cancel();
    if (t === 'pointerup' && onShort) onShort();
  }));
  btn.addEventListener('click', e => {
    if (e.detail === 0 && !fired) onDone();
  });
  btn.addEventListener('contextmenu', e => e.preventDefault());
}

// Menu laterale: trascinandolo verso destra segue il dito; oltre un terzo della larghezza (o con uno scatto) si chiude
function swipeToClose(panel, close) {
  let start = null;
  const reset = () => {
    panel.style.transition = 'transform .18s ease-out';
    panel.style.transform = '';
    start = null;
  };
  panel.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' || e.target.closest('select')) return;
    start = { x: e.clientX, y: e.clientY, t: Date.now(), dragging: false };
  });
  panel.addEventListener('pointermove', e => {
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (!start.dragging) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { start = null; return; }
      if (dx < 10) return;
      start.dragging = true;
      panel.style.transition = 'none';
      try { panel.setPointerCapture(e.pointerId); } catch (err) { /* niente cattura */ }
    }
    panel.style.transform = `translateX(${Math.max(0, dx)}px)`;
  });
  let dragged = false;
  const end = e => {
    if (!start) return;
    if (!start.dragging) { start = null; return; }
    dragged = true;
    setTimeout(() => { dragged = false; }, 0);
    const dx = e.clientX - start.x;
    const fast = dx > 40 && Date.now() - start.t < 250;
    if (dx > panel.offsetWidth / 3 || fast) {
      start = null;
      // Il pannello esce a destra, poi si chiude
      panel.style.transition = 'transform .15s ease-in';
      panel.style.transform = 'translateX(100%)';
      setTimeout(close, 150);
    } else reset();
  };
  panel.addEventListener('pointerup', end);
  panel.addEventListener('pointercancel', () => { if (start) reset(); });
  // Un trascinamento non deve diventare un tocco sui pulsanti del menu
  panel.addEventListener('click', e => { if (dragged) { e.stopPropagation(); e.preventDefault(); } }, true);
}
startBtn.addEventListener('click', onStartClick);
resumeBtn.addEventListener('click', resumeGame);
undoBtn.addEventListener('click', undo);
nemesisBtn.addEventListener('click', onNemesisClick);
// Turno giocatori con modifiche non salvate: "Annulla modifiche" accanto a "Salva modifiche" (stessa riga) toglie tutte
// le bozze (vita dei minion, costi pagati); non è un passo di undo, perché le bozze non sono ancora nella partita
cancelDraftsBtn = el('button', 'ae-button ae-button--secondary ae-cancel-drafts', I18N_IT.cancelChanges);
cancelDraftsBtn.type = 'button';
cancelDraftsBtn.hidden = true;
{
  const row = el('div', 'ae-main-row');
  nemesisBtn.before(row);
  deckSlider = buildDeckSlider();
  row.append(cancelDraftsBtn, nemesisBtn, deckSlider.box);
}
cancelDraftsBtn.addEventListener('click', () => {
  if (resolving || ui.isTransitioning || !ui.drafts.size) return;
  ui.drafts.clear();
  render();
  nemesisBtn.focus({ preventScroll: true });
});
resolveBtn.addEventListener('click', onResolveClick);
backBtn.addEventListener('click', backToActive);
retryBtn.addEventListener('click', init);
// Interruttore "Includi carte base potenziate" tolto: si toglie anche da un index.html vecchio in cache
{
  const upgradedRow = document.getElementById('upgraded-switch');
  if (upgradedRow && upgradedRow.closest('.ae-switch-row')) upgradedRow.closest('.ae-switch-row').remove();
}
window.addEventListener('resize', () => { sizeFocus(); sizeQueue(); });
// Desktop: la rotella del mouse (verticale) scorre le carte grandi e le fasce piccole, che vanno in orizzontale
[focusEl, queueViewport, rail].forEach(c => c.addEventListener('wheel', e => {
  if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || c.scrollWidth <= c.clientWidth + 1) return;
  e.preventDefault();
  c.scrollBy({ left: e.deltaY, behavior: 'auto' });
}, { passive: false }));
// Se lo spazio della carta grande cambia per altri motivi (font caricato, pulsanti del dock), si ridimensiona subito
if (window.ResizeObserver) {
  new ResizeObserver(() => sizeFocus()).observe(focusEl);
  new ResizeObserver(() => sizeQueue()).observe(queueViewport);
}

// Schermo sempre acceso finché l'app è aperta e visibile (Screen Wake Lock). Il browser lo toglie da solo quando la
// pagina va in secondo piano: si richiede di nuovo al ritorno e, se il browser lo vuole dopo un tocco, al primo tocco.
let wakeLock = null;
async function keepScreenOn() {
  if (!('wakeLock' in navigator) || wakeLock || document.visibilityState !== 'visible') return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch (err) { wakeLock = null; }
}
document.addEventListener('visibilitychange', keepScreenOn);
document.addEventListener('pointerdown', keepScreenOn, { passive: true });
keepScreenOn();

// Senza rete: il service worker (sw.js) salva codice, dati e immagini già viste. All'inizio della partita si scaricano
// anche le immagini di tutte le carte del mazzo, così le carte pescate più avanti si vedono anche se la rete cade
// (una volta sola: poi sono già salvate). Niente download in anticipo con "Risparmio dati" attivo.
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(err => console.warn(err));
}
async function prefetchDeckImages() {
  if (!('caches' in window) || !navigator.serviceWorker || !navigator.serviceWorker.controller) return;
  if (navigator.connection && navigator.connection.saveData) return;
  const urls = [...new Set(deck.concat(queue.map(e => e.data), discard).flatMap(d => [d.image, d.thumb]).filter(Boolean))];
  const todo = [];
  for (const u of urls) if (!(await caches.match(u))) todo.push(u);
  // Tre alla volta, per non rallentare le immagini che servono subito
  const next = async () => {
    while (todo.length) {
      try { await fetch(todo.shift()); } catch (err) { /* senza rete: si riprova alla prossima partita */ }
    }
  };
  await Promise.all([next(), next(), next()]);
}

// --- Modalità test (v215) ------------------------------------------------------------------------------------------
// Dal menu iniziale ("Test") si sceglie uno scenario: la partita parte già in un momento preciso, senza giocarla fino
// lì. Isolata dalla partita vera: niente salvataggio (save() non scrive con testRun), la partita salvata e "Riprendi
// partita" non cambiano; la collezione non conta (le carte le sceglie lo scenario); le preferenze (dorso, sfondo,
// opzioni del mazzo, carte 1/2 e 3/4) non si toccano: lo scenario può solo sostituirle finché dura (testRun.pairs,
// testRun.turnCards). L'undo funziona come in partita.
//
// SCENARI: i dati di ogni scenario, tutti qui. Campi:
//   id, name, desc            identificatore, nome e riga di descrizione (schermata Test)
//   players, nemesis          giocatori e nemesi (nome come in nemesis.json)
//   phase                     'players' (turno giocatori) o 'nemesis' (turno nemesi: con la coda vuota si parte pronti a
//                             pescare, altrimenti dalla prima carta della coda da risolvere)
//   deck                      mazzo nemesi DALLA CIMA (la prima è la prossima pescata)
//   queue                     carte già in gioco, dalla più vecchia: nome o { name, hp, tokens, hpSet, bornTurn }
//   discard                   pila degli scarti (dalla prima scartata)
//   (carte per NOME; { name, boxCode } quando il nome è di più carte, per esempio Sunder "1" e "4")
//   turnOrder                 { left: dalla cima, drawn: scarti dei turni (l'ultima è il turno in corso), round, wild,
//                             picks: { pos: { player, forced } }, pairNext: { p12, p34 } } con 'p1'..'p4', 'wild',
//                             'nemesis', 'p12', 'p34' (picks e pairNext: carte 1/2 e 3/4, v220)
//   turnCards                 (facoltativo) carte del mazzo dei turni per i giri nuovi, al posto di quelle normali
//   pairs                     (facoltativo) carte 1/2 e 3/4 attive o no solo per lo scenario
//   turn, maxTier             turni nemesi giocati e Tier più alto già uscito (per la scritta "Tier N")
//   stats                     (facoltativo) { startedMinAgo, tierMinAgo: { 2, 3 }, minionsKilled: [{ name, turns }],
//                             powersPaid, powersResolved, attacksResolved (nomi), mages: { p1: { damage, powers, kills } } }
// Per aggiungere uno scenario basta un oggetto in più qui sotto (CONTESTO_SVILUPPO.md, sezione 9).
const SCENARI = [
  {
    id: 'turn-deck', name: 'Carte sul mazzo dei turni',
    desc: 'Solo carte nemesi nel mazzo dei turni; in cima Hissing Acid, Sunder e Thunderous Tempest (riquadri e finestra)',
    players: 2, nemesis: 'Maggoth', phase: 'nemesis', turn: 1, maxTier: 1,
    deck: ['Hissing Acid', { name: 'Sunder', boxCode: '4' }, 'Thunderous Tempest', 'Drillbeak Wurm', 'Rend', 'Morbid Gyre'],
    turnCards: ['nemesis', 'nemesis', 'nemesis', 'nemesis', 'nemesis', 'nemesis'],
    turnOrder: { left: ['nemesis', 'nemesis', 'nemesis', 'nemesis', 'nemesis'], drawn: ['nemesis'], round: 1 }
  },
  {
    id: 'variable-hp', name: 'Minion a vita variabile',
    desc: 'Carapace Queen: in cima Maggot Engine e poi Mindguzzler, turno nemesi pronto a pescare',
    players: 2, nemesis: 'Carapace Queen', phase: 'nemesis', turn: 1, maxTier: 3,
    deck: ['Maggot Engine', 'Mindguzzler', 'Broodwomb', 'Hatch'],
    turnOrder: { left: ['p1', 'nemesis', 'p2', 'p1', 'p2'], drawn: ['nemesis'], round: 1 }
  },
  {
    id: 'tier', name: 'Cambio Tier',
    desc: 'La prossima carta è la prima di Tier 2, quella dopo la prima di Tier 3 (scritte "Tier 2" e "Tier 3")',
    players: 2, nemesis: 'Maggoth', phase: 'nemesis', turn: 3, maxTier: 1,
    queue: ['Drillbeak Wurm'],
    deck: ['Volcanic Zala', 'Crushing Storm', 'Eliminate', 'Gore'],
    turnOrder: { left: ['nemesis', 'p1', 'p2', 'p1', 'p2'], drawn: ['nemesis'], round: 1 }
  },
  {
    id: 'full-queue', name: 'Coda piena',
    desc: '10 carte in gioco: minion pieni e danneggiati, poteri da 1 a 4 segnalini, forzati a 5 e 7, non rimovibili',
    players: 2, nemesis: 'Arachnos', phase: 'players', turn: 4, maxTier: 3,
    queue: ['Volcanic Zala', { name: 'Carriode Colony', hp: 3 }, { name: 'Blind Enigma', hp: 2 },
      'Morbid Gyre', 'Eye of Nothing', 'Chaos Orb', 'The End', { name: 'Spirit Snare', tokens: 5 },
      { name: 'Woven Sky', tokens: 7 }, 'Bleed Static'],
    deck: ['Gore', 'Eliminate'],
    turnOrder: { left: ['nemesis', 'p2', 'p1', 'nemesis', 'p2'], drawn: ['p1'], round: 2 }
  },
  {
    id: 'victory', name: 'Vittoria',
    desc: 'Un minion con 1 di vita e una sola carta nel mazzo: uccidilo e finisci il mazzo per la Vittoria',
    players: 2, nemesis: 'Maggoth', phase: 'players', turn: 9, maxTier: 3,
    queue: [{ name: 'Drillbeak Wurm', hp: 1 }],
    deck: ['Morbid Gyre'],
    turnOrder: { left: ['nemesis', 'p2', 'p1', 'nemesis', 'p2'], drawn: ['p1'], round: 3 },
    stats: { startedMinAgo: 45, tierMinAgo: { 2: 28, 3: 10 } }
  },
  {
    id: 'pairs', name: 'Carte 1/2 e 3/4',
    desc: '4 giocatori con le carte 1/2 e 3/4: la prossima carta turno è 1/2, più avanti c\'è l\'altra 1/2',
    players: 4, nemesis: 'Maggoth', phase: 'players', turn: 1, maxTier: 1, pairs: true,
    queue: ['Carriode Colony'],
    deck: ['Drillbeak Wurm', 'Rend', 'Disorient', 'Blind Enigma'],
    // (v220: il 4 ha scelto la 3/4, quindi la prossima 3/4 tocca al 3; nessuno per la 1/2: si sceglie)
    turnOrder: { left: ['p12', 'nemesis', 'p34', 'p12', 'nemesis'], drawn: ['p34'], picks: { 0: { player: 'p4', forced: false } },
      pairNext: { p12: null, p34: 'p3' }, round: 1 }
  },
  {
    id: 'pair-memory', name: 'Memoria 1/2 tra i giri',
    desc: '4 giocatori: il giocatore 1 ha giocato una 1/2 nel giro prima; la prossima 1/2 è del 2, senza scelta',
    players: 4, nemesis: 'Maggoth', phase: 'players', turn: 3, maxTier: 1, pairs: true,
    queue: ['Carriode Colony'],
    deck: ['Drillbeak Wurm', 'Rend', 'Disorient', 'Blind Enigma'],
    turnOrder: { left: ['p12', 'nemesis', 'p34', 'p12', 'nemesis'], drawn: ['p34'], picks: { 0: { player: 'p3', forced: false } },
      pairNext: { p12: 'p2', p34: 'p4' }, round: 2 }
  },
  {
    id: 'wild-round', name: 'Wild e fine giro',
    desc: '3 giocatori, ultima carta del giro (il wild è il giocatore 2): "Fine turno · Mischia mazzo"',
    players: 3, nemesis: 'Maggoth', phase: 'players', turn: 4, maxTier: 2,
    queue: [{ name: 'Volcanic Zala', hp: 6 }],
    deck: ['Gore', 'Eliminate', 'Crushing Storm'],
    turnOrder: { left: [], drawn: ['p1', 'nemesis', 'p2', 'nemesis', 'p3', 'wild'], round: 2, wild: 2 }
  },
  {
    id: 'full-stats', name: 'Statistiche piene',
    desc: 'Partita avanzata (turno 8, giro 3) con minion uccisi, poteri, attacchi, Æ spesi e statistiche maghi',
    players: 2, nemesis: 'Maggoth', phase: 'players', turn: 8, maxTier: 3,
    queue: [{ name: 'Jagged One', hp: 9, bornTurn: 5 }, { name: 'Chaos Orb', tokens: 1, bornTurn: 7 }],
    discard: ['Drillbeak Wurm', 'Rend', 'Carriode Colony', 'Disorient', 'Morbid Gyre', 'Blind Enigma', 'Eye of Nothing',
      'Aether Shock', 'Woven Sky'],
    deck: ['Gore', 'Eliminate', 'Crushing Storm', 'Gnashing Maw'],
    turnOrder: { left: ['nemesis', 'p2', 'p1'], drawn: ['p2', 'nemesis', 'p1'], round: 3 },
    stats: {
      startedMinAgo: 52, tierMinAgo: { 2: 31, 3: 9 },
      minionsKilled: [{ name: 'Drillbeak Wurm', turns: 1 }, { name: 'Carriode Colony', turns: 3 }, { name: 'Blind Enigma', turns: 2 }],
      powersPaid: ['Morbid Gyre', 'Eye of Nothing'], powersResolved: ['Woven Sky'],
      attacksResolved: ['Rend', 'Disorient', 'Aether Shock'],
      mages: { p1: { damage: 14, powers: 1, kills: 2 }, p2: { damage: 9, powers: 1, kills: 1 } }
    }
  },
  {
    id: 'empty-deck', name: 'Mazzo nemesi vuoto',
    desc: 'Mazzo nemesi vuoto e un minion in gioco: niente pesca, niente vittoria finché vive',
    players: 2, nemesis: 'Maggoth', phase: 'players', turn: 11, maxTier: 3,
    queue: [{ name: 'Volcanic Zala', hp: 4 }],
    deck: [],
    turnOrder: { left: ['nemesis', 'p2', 'p1', 'nemesis'], drawn: ['p1', 'p2'], round: 4 }
  }
];


// Carta di uno scenario: nome (o { name, boxCode }); errore se non c'è o se il nome è di più carte
function scenarioCard(ref) {
  const name = typeof ref === 'string' ? ref : ref.name;
  const box = typeof ref === 'object' && ref.boxCode !== undefined ? String(ref.boxCode) : null;
  const found = allCards.filter(c => c.name === name && (box === null || c.boxCode === box));
  if (!found.length) throw new Error(I18N_IT.testCardMissing(box ? `${name} (${box})` : name));
  if (found.length > 1) throw new Error(I18N_IT.testCardAmbiguous(name));
  return found[0];
}
// Fotografia della partita (stesso formato di snapshot) costruita dai dati dello scenario; la applica restore()
function buildScenarioState(sc) {
  const now = Date.now();
  const ago = m => now - m * 60000;
  const turnNo = sc.turn || 0;
  const deckCards = (sc.deck || []).map(scenarioCard);
  const queueCards = (sc.queue || []).map(ref => ({ ref: typeof ref === 'string' ? { name: ref } : ref, data: scenarioCard(ref) }));
  const discardCards = (sc.discard || []).map(scenarioCard);
  const st = sc.stats || {};
  const ids = list => (list || []).map(n => scenarioCard(n).id);
  const killed = (st.minionsKilled || []).map(m => ({ id: scenarioCard(m.name).id, name: m.name, turns: m.turns || 0 }));
  const paid = ids(st.powersPaid);
  const stats = Object.assign(emptyStats(deckCards.length + queueCards.length + discardCards.length), {
    minionsKilled: killed.length, powersPaid: paid.length, powersResolved: (st.powersResolved || []).length,
    attacksResolved: (st.attacksResolved || []).length,
    aetherSpent: paid.reduce((sum, id) => sum + aetherCost(cardsById.get(id)), 0),
    minions: killed, mages: JSON.parse(JSON.stringify(st.mages || {})),
    cards: { minionsKilled: killed.map(m => m.id), powersPaid: paid, powersResolved: ids(st.powersResolved),
      attacksResolved: ids(st.attacksResolved) },
    startedAt: ago(st.startedMinAgo || 0), tierAt: {}, endedAt: null
  });
  Object.entries(st.tierMinAgo || {}).forEach(([tier, m]) => { stats.tierAt[tier] = ago(m); });
  const order = sc.turnOrder || { left: [], drawn: [] };
  return {
    turn: turnNo,
    deck: deckCards.slice().reverse().map(c => c.id), // si pesca dalla fine: la prima dell'elenco va in fondo all'array
    discard: discardCards.map(c => c.id),
    queue: queueCards.map(({ ref, data }) => {
      const base = makeEntry(data);
      const hp = ref.hp !== undefined ? ref.hp : base.hp;
      return { id: data.id, tokens: ref.tokens !== undefined ? ref.tokens : base.tokens, hp,
        turnHp: ref.hp !== undefined ? ref.hp : base.turnHp, isNew: false, paid: false,
        bornTurn: ref.bornTurn !== undefined ? ref.bornTurn : Math.max(0, turnNo - 1),
        ...(isVariableMinion(data) ? { hpSet: !!ref.hpSet } : {}) };
    }),
    resolving: sc.phase === 'nemesis',
    currentIndex: 0,
    newIndex: -1,
    maxTierDrawn: sc.maxTier || 0,
    stats,
    turnOrder: { left: (order.left || []).slice(), drawn: (order.drawn || []).slice(), round: order.round || 1,
      wild: order.wild || null, picks: JSON.parse(JSON.stringify(order.picks || {})), known: (order.left || []).map(() => false),
      waiting: false, pairNext: emptyPairNext(order.pairNext) }
  };
}
// Avvia (o riavvia) uno scenario. Restituisce null se è partito, altrimenti il motivo (per esempio una carta che manca)
function startScenario(sc) {
  if (!allCards.length || !sc) return I18N_IT.testNotReady;
  let state;
  try {
    state = buildScenarioState(sc);
  } catch (err) {
    return err.message;
  }
  if (!testRun) testRun = { prevSettings: JSON.parse(JSON.stringify(settings)) };
  Object.assign(testRun, { id: sc.id, name: sc.name, pairs: typeof sc.pairs === 'boolean' ? sc.pairs : null,
    turnCards: Array.isArray(sc.turnCards) ? sc.turnCards.slice() : null });
  clearTransition();
  closeAllModals();
  closeDiscard();
  closeTestScreen();
  settings = { players: sc.players, nemesis: sc.nemesis, battleMode: true, mergeCollection: true };
  undoStack = [];
  ui.drafts.clear();
  ui.deckBuilding = false;
  ui.deckShown = null;
  ui.deckDark = false;
  ui.pairMinimized = null;
  ui.trackShuffle = false;
  ui.lastDrawnUid = null;
  ui.tierBanner = null;
  victoryKey = '';
  restore(state);
  closeStart();
  render();
  prefetchDeckImages();
  (resolving ? resolveBtn : nemesisBtn).focus({ preventScroll: true });
  return null;
}
// Fine del test (menu iniziale): tornano le scelte di prima della pagina iniziale. La partita in memoria è quella di
// test, ma "Riprendi partita" ricarica quella salvata e "Nuova partita" ne fa una nuova
function endTest() {
  if (!testRun) return;
  settings = testRun.prevSettings;
  testRun = null;
}
function restartScenario() {
  const sc = testRun && SCENARI.find(s => s.id === testRun.id);
  const problem = startScenario(sc);
  if (problem) showToast(problem);
}

// Schermata Test (dal menu iniziale): elenco degli scenari, nome e una riga di descrizione
function closeTestScreen() {
  const layer = document.querySelector('.test-screen');
  if (layer) layer.querySelector('.collection-head .ae-icon-button').click();
}
function openTestScreen(trigger) {
  const layer = el('div', 'collection-screen options-screen test-screen');
  layer.setAttribute('role', 'dialog');
  layer.setAttribute('aria-modal', 'true');
  layer.setAttribute('aria-label', I18N_IT.testTitle);
  const head = el('div', 'collection-head');
  const close = () => {
    layer.remove();
    startLayer.inert = false;
    updateInert();
    if (trigger && trigger.isConnected && !startLayer.hidden) trigger.focus({ preventScroll: true });
  };
  const x = el('button', 'ae-icon-button');
  x.type = 'button';
  x.setAttribute('aria-label', I18N_IT.close);
  x.appendChild(icon('close'));
  x.addEventListener('click', close);
  head.append(el('h2', 'collection-title', I18N_IT.testTitle), x);
  const body = el('div', 'collection-body');
  body.appendChild(el('p', 'start-note', I18N_IT.testHint));
  SCENARI.forEach(sc => {
    const item = el('button', 'options-item test-scenario');
    item.type = 'button';
    item.dataset.scenario = sc.id;
    const error = el('span', 'test-scenario-error');
    error.hidden = true;
    item.append(el('span', 'options-item-label', sc.name), el('span', 'options-item-note', sc.desc), error);
    item.addEventListener('click', () => {
      const problem = startScenario(sc);
      if (problem) {
        error.textContent = I18N_IT.testFailed(problem);
        error.hidden = false;
      }
    });
    body.appendChild(item);
  });
  layer.append(head, body);
  layer.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } });
  document.body.appendChild(layer);
  startLayer.inert = true;
  const first = body.querySelector('.test-scenario');
  if (first) first.focus();
}

// Telefono in orizzontale: lo spazio in altezza non basta per le carte; si chiede di girarlo (CSS: .ae-rotate)
document.body.appendChild(el('div', 'ae-rotate', I18N_IT.rotatePhone));

// Tasto / gesto Indietro (Android, swipe di iOS): chiude il livello in primo piano invece di uscire dall'app.
// Nella cronologia c'è sempre una voce in più (stesso indirizzo): Indietro la consuma e qui la si rimette.
// Se non c'è niente da chiudere, il primo Indietro mostra "Premi di nuovo Indietro per uscire" e il secondo esce.
function closeTopForBack() {
  if (modals.length) { modals[modals.length - 1].onCancel(); return true; }
  if (undoFloat) { closeUndoFloat(); return true; }
  if (deckPopover) { closeDeckPopover(); return true; }
  // La mia collezione sopra le Opzioni: si chiude prima quella in cima
  const screens = document.querySelectorAll('.collection-screen');
  if (screens.length) { screens[screens.length - 1].querySelector('.collection-head .ae-icon-button').click(); return true; }
  if (!discardLayer.hidden) { closeDiscard(); return true; }
  // Pagina "Nuova partita": Indietro torna al menu iniziale
  if (!startLayer.hidden && startMode === 'setup') { setStartMode('home', true); return true; }
  return false;
}
function armBackGuard() { history.pushState({ aeBackGuard: true }, ''); }
window.addEventListener('popstate', () => {
  if (closeTopForBack()) armBackGuard();
  else {
    showToast(I18N_IT.backAgainToExit);
    // Passato il messaggio, Indietro torna a chiudere i livelli (e il prossimo "uscire" chiede di nuovo conferma)
    setTimeout(() => { if (!(history.state && history.state.aeBackGuard)) armBackGuard(); }, 2500);
  }
});
if (!(history.state && history.state.aeBackGuard)) armBackGuard();

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
    const [cards, setup, nemesisList, productList, art] = await Promise.all([
      loadJson(DATA_ROOT + 'cards.json'), loadJson(DATA_ROOT + 'deck-setup.json'), loadJson(DATA_ROOT + 'nemesis.json'),
      loadJson(DATA_ROOT + 'products.json'), loadJson('Assets/nemesis/nemesis-art.json').catch(() => ({}))
    ]);
    nemesisArt = art || {};
    products = productList || {};
    if (cards.length === 0) throw new Error('Nessuna carta trovata in cards.json');
    // Le scansioni delle carte stanno nella cartella Data/, le miniature in thumbs/ con lo stesso percorso
    cards.forEach(c => {
      c.thumb = DATA_ROOT + String(c.image).replace(/^Data\//, THUMB_DIR);
      c.image = DATA_ROOT + c.image;
    });
    allCards = cards;
    deckSetup = setup;
    nemeses = nemesisList;
    cardsById = new Map(allCards.map(c => [c.id, c]));
    buildStartPage();
    newGame();
    // Il retro si scarica subito, così alla prima pesca è già pronto
    loadImage(CARD_BACK);
    preloadBannerFont();
    render();
    setStartMode('home', true);
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
