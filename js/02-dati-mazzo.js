// 02-dati-mazzo.js: Dati e mazzo: carte, collezione, opzioni del mazzo, nemesi, Nemesis Deck Setup, pesca e scarti, storia e mazzo dei turni, statistiche. Caricato in ordine da script.js insieme agli altri file di js/ (script classici, variabili globali).
'use strict';

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

