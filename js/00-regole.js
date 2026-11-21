// 00-regole.js: regole di gioco, senza DOM e senza stato globale (refactoring fase 2). Caricato per primo da script.js.
// Nel browser definisce un solo oggetto globale, Regole; in Node si carica con require('../js/00-regole.js') (test in
// tests/, CONTESTO_SVILUPPO.md sezione 9). Nessuna libreria.
//
// Le funzioni ricevono come argomenti tutto quello che serve e non leggono variabili globali dell'app:
// - db = { cards, nemeses, deckSetup }: i dati (cards.json, nemesis.json, deck-setup.json);
// - collection: Set dei codici prodotto posseduti (null = tutto ammesso);
// - s = { players, nemesis, battleMode, mergeCollection }: le scelte della partita;
// - order: il mazzo dei turni { left, drawn, round, wild, picks, known, waiting, pairNext, history };
// - g: le parti della partita usate dalle regole del turno nemesi
//   { queue, deck, discard, stats, turn, currentIndex, newIndex, resolving, maxTierDrawn };
// - random: funzione che restituisce un numero in [0, 1) (Math.random nell'app, un generatore ripetibile nei test).
// Le funzioni che fanno un passo di gioco modificano gli oggetti ricevuti (order, g) e restituiscono il risultato; le
// altre non cambiano niente.

'use strict';

const Regole = (function () {
  // --- Caso ---------------------------------------------------------------------------------------------------------

  // Copia mescolata (Fisher-Yates)
  function shuffle(cards, random) {
    const result = cards.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  // n carte a caso dalla lista
  function pickRandom(cards, n, random) {
    return shuffle(cards, random).slice(0, n);
  }

  // --- Prodotti, collezione, nemesi ---------------------------------------------------------------------------------

  // Wave di un codice prodotto: la parte prima del punto ("4.1" -> "4")
  function waveOfCode(code) {
    return code === null || code === undefined ? null : String(code).split('.')[0];
  }
  function isMiniCode(code) {
    return code !== null && code !== undefined && String(code).includes('.');
  }
  function ownsProduct(collection, id) {
    return !collection || collection.has(id);
  }
  // Carta Basic / Upgraded ammessa: il suo prodotto (boxCode) è nella collezione (o non si sa di che prodotto è)
  function cardAllowed(collection, card) {
    return !card.boxCode || ownsProduct(collection, card.boxCode);
  }
  function nemesisInfo(db, name) {
    return db.nemeses.find(n => n.name === name);
  }
  // La battaglia dipende dal boss scelto (colonna Expedition Battle di nemesis.json)
  function battleOf(db, nemesisName) {
    const info = nemesisInfo(db, nemesisName);
    return info ? info.battle : null;
  }
  // Un boss si può scegliere solo se ha un prodotto e una battaglia, le sue carte sono nel progetto e il suo prodotto è
  // nella collezione
  function isPlayable(db, collection, info) {
    return !!info.boxCode && info.battle !== null && ownsProduct(collection, info.boxCode)
      && db.cards.some(c => c.category === 'Specific' && c.nemesis === info.name);
  }

  // --- Mazzo nemesi (Nemesis Deck Setup e opzioni del mazzo, v213) ----------------------------------------------------

  // Riga di deck-setup.json usata dal mazzo: la battaglia della nemesi o, senza "Modalità battaglia", la battaglia 1
  // (con le Upgraded a 0). null se la nemesi non ha battaglia
  function deckSetupRow(db, s) {
    const battleMode = s.battleMode !== false;
    const battle = db.deckSetup.battles.find(b => b.battle === (battleMode ? battleOf(db, s.nemesis) : 1));
    const row = battle && battle.players[String(s.players)];
    if (!row) return null;
    return battleMode ? row : { basic: row.basic, upgradedBasic: { 1: 0, 2: 0, 3: 0 } };
  }
  // Carte Upgraded del mazzo nemesi nei prodotti posseduti di una wave
  function ownedUpgradedInWave(db, collection, wave) {
    return db.cards.some(c => c.category === 'Upgraded' && c.inNemesisDeck === true && c.boxCode
      && waveOfCode(c.boxCode) === wave && ownsProduct(collection, c.boxCode));
  }
  // Blocco di "Unisci": con "Modalità battaglia" la battaglia chiede carte Upgraded ma la wave della nemesi, nella
  // collezione, non ne ha: "Unisci" resta acceso e bloccato. Restituisce la wave (o null se non c'è blocco)
  function mergeLockedWave(db, collection, s) {
    if (s.battleMode === false) return null;
    const info = nemesisInfo(db, s.nemesis);
    const row = deckSetupRow(db, s);
    if (!info || !info.boxCode || !row) return null;
    const wantsUpgraded = [1, 2, 3].some(t => (row.upgradedBasic[t] || 0) > 0);
    const wave = waveOfCode(info.boxCode);
    return wantsUpgraded && !ownedUpgradedInWave(db, collection, wave) ? wave : null;
  }
  function mergeActive(db, collection, s) {
    return s.mergeCollection !== false || !!mergeLockedWave(db, collection, s);
  }
  // Carte Basic / Upgraded che possono entrare nel mazzo per un Tier: della collezione e, senza "Unisci", della wave
  // della nemesi
  function deckPool(db, collection, category, tier, s) {
    const info = nemesisInfo(db, s.nemesis);
    const wave = info ? waveOfCode(info.boxCode) : null;
    const merge = mergeActive(db, collection, s);
    return db.cards.filter(c => c.category === category && c.inNemesisDeck === true && c.tier === tier
      && cardAllowed(collection, c) && (merge || waveOfCode(c.boxCode) === wave));
  }
  // Carte che mancano rispetto a deck-setup.json (riga di avviso prima di "Inizia partita"): { want, have } o null
  function deckShortfall(db, collection, s) {
    const row = deckSetupRow(db, s);
    if (!row) return null;
    let want = 0;
    let have = 0;
    [1, 2, 3].forEach(t => {
      const b = row.basic[t] || 0;
      const u = row.upgradedBasic[t] || 0;
      want += b + u;
      have += Math.min(b, deckPool(db, collection, 'Basic', t, s).length)
        + Math.min(u, deckPool(db, collection, 'Upgraded', t, s).length);
    });
    return have < want ? { want, have } : null;
  }
  // Mazzo per la battaglia del boss scelto: per ogni Tier si estraggono a caso le carte Basic e Upgraded indicate da
  // deckSetupRow e si aggiungono le carte Specific della nemesi di quel Tier (solo carte con inNemesisDeck). Se le carte
  // della collezione non bastano, il Tier esce più corto. Ogni Tier è mescolato a parte; si pesca dalla fine, quindi in
  // cima c'è il Tier 1 e in fondo il Tier 3.
  // Restituisce { deck, plan }: plan = quante carte vengono da ognuno dei 9 mazzi (Tier × basic / upgraded / specific),
  // per la schermata "Crea mazzo". Senza riga (nessuna nemesi giocabile): mazzo e plan vuoti.
  function buildDeck(db, collection, s, random) {
    const plan = [];
    const setup = deckSetupRow(db, s);
    if (!setup) return { deck: [], plan };
    const deck = [];
    [3, 2, 1].forEach(tier => {
      const ofTier = c => c.inNemesisDeck === true && c.tier === tier;
      const basic = pickRandom(deckPool(db, collection, 'Basic', tier, s), setup.basic[tier] || 0, random);
      const upgraded = pickRandom(deckPool(db, collection, 'Upgraded', tier, s), setup.upgradedBasic[tier] || 0, random);
      const specific = db.cards.filter(c => c.category === 'Specific' && c.nemesis === s.nemesis && ofTier(c));
      plan.push({ tier, kind: 'basic', count: basic.length }, { tier, kind: 'upgraded', count: upgraded.length },
        { tier, kind: 'specific', count: specific.length });
      deck.push(...shuffle([...basic, ...upgraded, ...specific], random));
    });
    return { deck, plan };
  }

  // --- Mazzo dei turni ----------------------------------------------------------------------------------------------
  // Carte: 'p1'..'p4' = giocatori, 'wild' (3 giocatori, sceglie il gruppo), 'nemesis', 'p12' / 'p34' (carte 1/2 e 3/4).
  // left: mazzo in ordine (left[0] = la carta in cima); known: carte note, parallelo a left; drawn: scarti dei turni in
  // ordine di uscita; round: giri cominciati ("Turno N"); wild: giocatore che è wild nel giro (1-3);
  // picks: { posizione in drawn: { player, forced } } per le carte 1/2 e 3/4; pairNext: memoria delle coppie
  // { p12: null | 'p1' | 'p2', p34: null | 'p3' | 'p4' }; history: turni del giro [{ kind, player, forced, pos }];
  // waiting: turno annullato (solo salvataggi v211-v221).

  // Carte per il numero di giocatori: 2 = due a testa, 3 = una a testa più il wild, 4 = una a testa (o, con le carte
  // 1/2 e 3/4, pairsOn: 1/2, 1/2, 3/4, 3/4); sempre due carte nemesi
  function turnOrderCards(players, pairsOn) {
    const n = Math.max(1, Math.min(4, Number(players) || 2));
    const mine = n === 1 ? ['p1', 'p1', 'p1', 'p1'] : n === 2 ? ['p1', 'p1', 'p2', 'p2']
      : n === 3 ? ['p1', 'p2', 'p3', 'wild'] : pairsOn ? ['p12', 'p12', 'p34', 'p34'] : ['p1', 'p2', 'p3', 'p4'];
    return mine.concat('nemesis', 'nemesis');
  }
  function isPairCard(kind) { return kind === 'p12' || kind === 'p34'; }
  function pairOptions(kind) { return kind === 'p12' ? ['p1', 'p2'] : ['p3', 'p4']; }
  function otherOfPair(kind, player) {
    return pairOptions(kind).find(p => p !== player) || null;
  }
  // Giocatori della partita: 'p1'..'pN'
  function playerKinds(players) {
    const n = Math.max(1, Math.min(4, Number(players) || 2));
    return Array.from({ length: n }, (_, i) => 'p' + (i + 1));
  }
  // Memoria delle coppie (copia, con null dove manca)
  function emptyPairNext(old) {
    return { p12: old && old.p12 ? old.p12 : null, p34: old && old.p34 ? old.p34 : null };
  }
  // Chi ha giocato la carta 1/2 o 3/4 in posizione i degli scarti dei turni (picks di prima della v220: stringhe = scelte)
  function pickOf(order, i) {
    const p = order.picks && order.picks[i];
    if (!p) return null;
    return typeof p === 'string' ? { player: p, forced: false } : (p.player ? p : null);
  }
  // Mazzo dei turni di una partita nuova: niente carte, si aspetta "Pesca carta turno"
  function newTurnOrder() {
    return { left: [], drawn: [], round: 0, picks: {}, known: [], waiting: false, pairNext: emptyPairNext(), history: [] };
  }
  // Giro nuovo: mazzo mescolato (cards: turnOrderCards), giro +1, nessuna carta nota, storia vuota. Con 3 giocatori il
  // wild al primo giro è a caso, poi passa al giocatore dopo (1→2→3→1). La memoria delle coppie NON si azzera.
  // Restituisce il nuovo mazzo dei turni.
  function shuffleTurnOrder(order, players, cards, random) {
    const wild = Number(players) === 3
      ? (order.wild ? (order.wild % 3) + 1 : 1 + Math.floor(random() * 3)) : null;
    const left = shuffle(cards, random);
    return { left, drawn: [], round: (order.round || 0) + 1, wild, picks: {}, known: left.map(() => false), waiting: false,
      pairNext: emptyPairNext(order.pairNext), history: [] };
  }
  // Turno in corso: l'ultimo della storia del giro (null in attesa della carta turno)
  function currentTurn(order) {
    if (order.waiting) return null;
    const h = order.history || [];
    return h.length ? h[h.length - 1] : null;
  }
  // Turno in corso = ultimo del giro: mazzo dei turni vuoto
  function turnRoundOver(order) {
    return !!currentTurn(order) && !order.left.length;
  }
  // Attesa della carta turno: nessun turno ancora cominciato nel giro (o, salvataggi v211-v221, turno annullato)
  function awaitingTurnCard(order, resolving) {
    return !resolving && (!(order.history || []).length || !!order.waiting);
  }
  // Pesca la carta in cima al mazzo dei turni (a mazzo vuoto prima un giro nuovo, con opts.players, opts.cards e
  // opts.random). opts.pick (salvataggi vecchi): la prima carta dall'alto che lo soddisfa.
  // Carta 1/2 o 3/4: se la memoria della coppia dice a chi tocca, gioca lui senza scelta (OBBLIGATA) e la memoria torna
  // a "nessuno"; altrimenti resta da scegliere (choosePairPlayer). Restituisce { order, card } (order è nuovo solo se è
  // cominciato un giro).
  function drawTurnCard(order, opts) {
    if (!order.left.length) order = shuffleTurnOrder(order, opts.players, opts.cards, opts.random);
    let at = 0;
    if (opts.pick) { const i = order.left.findIndex(opts.pick); if (i >= 0) at = i; }
    const card = order.left.splice(at, 1)[0];
    if (Array.isArray(order.known)) order.known.splice(at, 1);
    order.drawn.push(card);
    order.waiting = false;
    const entry = { kind: card, player: null, forced: false, pos: order.drawn.length - 1 };
    if (isPairCard(card)) {
      order.pairNext = emptyPairNext(order.pairNext);
      const next = order.pairNext[card];
      if (next) {
        order.picks = Object.assign({}, order.picks, { [order.drawn.length - 1]: { player: next, forced: true } });
        order.pairNext[card] = null;
        Object.assign(entry, { player: next, forced: true });
      }
    }
    order.history = (order.history || []).concat(entry);
    return { order, card };
  }
  // Carta x/y del turno in corso SCELTA dai giocatori: il giocatore va nella storia e, se la carta è negli scarti, sulla
  // carta; la prossima carta della coppia tocca all'altro giocatore. false se non c'è niente da scegliere
  function choosePairPlayer(order, player) {
    const cur = currentTurn(order);
    if (!cur || !isPairCard(cur.kind) || cur.player) return false;
    const kind = cur.kind;
    const h = order.history.slice();
    h[h.length - 1] = Object.assign({}, cur, { player, forced: false });
    order.history = h;
    if (cur.pos !== null && cur.pos !== undefined) {
      order.picks = Object.assign({}, order.picks, { [cur.pos]: { player, forced: false } });
    }
    order.pairNext = Object.assign(emptyPairNext(order.pairNext), { [kind]: otherOfPair(kind, player) });
    return true;
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
  function historyPlayer(entry, wild) {
    if (!entry) return null;
    if (entry.kind === 'wild') return wild ? 'p' + wild : null;
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
  // Giocatore a cui va una carta del mazzo dei turni: 'p1'..'p4'; il wild va al giocatore che è wild (wild); null per
  // la nemesi. Carta x/y: chi l'ha giocata (picks, per posizione negli scarti); null se è da scegliere o nel mazzo
  // (i = -1); senza i: il turno in corso, dalla storia
  function turnCardPlayer(kind, i, order, wild) {
    if (kind === 'wild') return wild ? 'p' + wild : null;
    if (isPairCard(kind)) {
      if (i === undefined) { const cur = currentTurn(order); return cur && cur.kind === kind ? cur.player || null : null; }
      const pick = i >= 0 ? pickOf(order, i) : null;
      return pick ? pick.player : null;
    }
    return kind && kind !== 'nemesis' ? kind : null;
  }
  // Carte tolte dagli scarti dei turni (posizioni in order.drawn): i giocatori delle carte 1/2 e 3/4 restano attaccati
  // alle carte che restano; la scelta delle carte tolte si perde; la storia segue le carte (pos nuova, o null per quelle
  // tolte). Restituisce le carte tolte, nell'ordine degli scarti.
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
  // Mazzo dei turni letto da un salvataggio (o da una fotografia dell'undo). saved: s.turnOrder; opts = { players,
  // resolving, turn, cards, random }. Campi mancanti dei salvataggi vecchi: giro dai turni nemesi (v168), wild a caso
  // (prima della v179), nessuna carta nota (v211), picks a stringhe e memoria delle coppie ricostruita (prima della v220:
  // la seconda carta della coppia nel giro diventa obbligata), storia dagli scarti (prima della v222). Senza mazzo dei
  // turni (prima della v168): giro nuovo con il turno in corso già estratto. Restituisce il mazzo dei turni.
  function restoreTurnOrder(saved, opts) {
    const resolving = opts.resolving;
    if (saved && Array.isArray(saved.left) && Array.isArray(saved.drawn)
      && (saved.drawn.length || (Array.isArray(saved.history) && saved.history.length) || !resolving)) {
      const order = { left: saved.left.slice(), drawn: saved.drawn.slice(),
        round: typeof saved.round === 'number' ? saved.round : Math.max(1, opts.turn),
        wild: Number(opts.players) === 3
          ? (saved.wild >= 1 && saved.wild <= 3 ? saved.wild : 1 + Math.floor(opts.random() * 3)) : null,
        picks: saved.picks && typeof saved.picks === 'object' ? Object.assign({}, saved.picks) : {} };
      const known = Array.isArray(saved.known) && saved.known.length === order.left.length ? saved.known : [];
      order.known = order.left.map((k, i) => !!known[i]);
      order.waiting = !!saved.waiting && !resolving && order.drawn.length > 0;
      if (saved.pairNext && typeof saved.pairNext === 'object') {
        const picks = {};
        Object.keys(order.picks).forEach(i => { const p = pickOf(order, Number(i)); if (p) picks[i] = { player: p.player, forced: !!p.forced }; });
        order.picks = picks;
        order.pairNext = emptyPairNext(saved.pairNext);
      } else {
        const picks = {};
        const next = { p12: null, p34: null };
        order.drawn.forEach((kind, i) => {
          if (!isPairCard(kind)) return;
          const p = pickOf(order, i);
          if (p) { picks[i] = { player: p.player, forced: false }; next[kind] = otherOfPair(kind, p.player); }
          else if (next[kind]) { picks[i] = { player: next[kind], forced: true }; next[kind] = null; }
        });
        order.picks = picks;
        order.pairNext = next;
      }
      order.history = Array.isArray(saved.history)
        ? saved.history.filter(e => e && e.kind).map(e => ({ kind: e.kind, player: e.player || null, forced: !!e.forced,
          pos: typeof e.pos === 'number' && e.pos >= 0 && e.pos < order.drawn.length ? e.pos : null }))
        : historyFromPile(order);
      return order;
    }
    const order = { left: [], drawn: [], round: Math.max(1, opts.turn) - 1, known: [], waiting: false, pairNext: emptyPairNext(), history: [] };
    return drawTurnCard(order, { players: opts.players, cards: opts.cards, random: opts.random,
      pick: c => (resolving ? c === 'nemesis' : c !== 'nemesis') }).order;
  }

  // --- Carte in gioco, minion a vita variabile ----------------------------------------------------------------------

  // Minion con vita variabile (v214, data.hpVariable: la vita la decidono i giocatori)
  function isVariableMinion(data) {
    return data.type === 'Minion' && data.hpVariable === true;
  }
  // Carta in gioco (voce della coda) con il suo stato. uid: numero stabile della carta in gioco; turn: turno nemesi in
  // cui è stata pescata (bornTurn). Minion a vita variabile: entra senza vita ("?": hp 0, turnHp null, hpSet false)
  function makeEntry(data, uid, turn) {
    if (isVariableMinion(data)) {
      return { uid, data, tokens: data.powerTokens, hp: 0, turnHp: null, hpSet: false, isNew: false, paid: false, bornTurn: turn };
    }
    return { uid, data, tokens: data.powerTokens, hp: data.hp, turnHp: data.hp, isNew: false, paid: false, bornTurn: turn };
  }
  // Minion la cui vita non è ancora stata impostata ("?"): non muore a 0
  function hpUnset(entry) {
    return isVariableMinion(entry.data) && !entry.hpSet;
  }
  function hasHp(entry) {
    return entry.data.type === 'Minion' && entry.hp !== null && entry.hp !== undefined;
  }
  // Vita massima: quella della carta o, per un minion a vita variabile, quella impostata la prima volta (hpMax, v218)
  function hpMaxOf(entry) {
    return isVariableMinion(entry.data) ? entry.hpMax : entry.data.hp;
  }
  // Tetto del +1: vita massima e (turno giocatori) vita di inizio turno. Minion a vita variabile non ancora impostata:
  // nessun tetto (Infinity)
  function hpCap(entry, nemesisTurn) {
    if (hpUnset(entry)) return Infinity;
    const max = hpMaxOf(entry);
    if (nemesisTurn) return max;
    return Math.min(max, entry.turnHp === undefined || entry.turnHp === null ? entry.hp : entry.turnHp);
  }
  // Carta che va negli scarti all'inizio del prossimo turno nemesi: potere con costo pagato o minion a 0 (salvato)
  function isGone(entry) {
    return !!entry.paid || (hasHp(entry) && entry.hp <= 0 && !hpUnset(entry));
  }

  // --- Statistiche --------------------------------------------------------------------------------------------------

  function emptyStats(deckSize) {
    return { deckSize, minionsKilled: 0, powersPaid: 0, powersResolved: 0, aetherSpent: 0, attacksResolved: 0, minions: [], mages: {},
      cards: { minionsKilled: [], powersPaid: [], powersResolved: [], attacksResolved: [] },
      startedAt: null, tierAt: {}, endedAt: null };
  }
  // Aggiunge una carta all'elenco di un gruppo delle statistiche
  function statCard(stats, group, data) {
    if (!stats.cards) stats.cards = emptyStats(0).cards;
    if (!Array.isArray(stats.cards[group])) stats.cards[group] = [];
    stats.cards[group].push(data.id);
  }
  // Costo in Æ per scartare un potere (removalCost); 0 se il costo non è in Æ
  function aetherCost(data) {
    return Number(data.removalCost) || 0;
  }
  function countMinionKilled(stats, entry, turn) {
    stats.minionsKilled++;
    statCard(stats, 'minionsKilled', entry.data);
    stats.minions.push({ id: entry.data.id, name: entry.data.name, turns: Math.max(0, turn - (entry.bornTurn || 0)) });
  }
  function countPowerPaid(stats, entry) {
    stats.powersPaid++;
    statCard(stats, 'powersPaid', entry.data);
    stats.aetherSpent += aetherCost(entry.data);
  }

  // --- Turno nemesi e turno giocatori -------------------------------------------------------------------------------

  // Toglie la carta dalla coda e la mette negli scarti
  function discardEntry(g, entry) {
    const i = g.queue.indexOf(entry);
    if (i >= 0) g.queue.splice(i, 1);
    g.discard.push(entry.data);
  }
  // Carte grigie che escono dal gioco (minion a 0, poteri pagati): contate e messe negli scarti
  function discardGone(g, entry) {
    if (entry.data.type === 'Minion') countMinionKilled(g.stats, entry, g.turn);
    else if (entry.data.type === 'Power') countPowerPaid(g.stats, entry);
    discardEntry(g, entry);
  }
  // Il mazzo nemesi non si rimescola: vuoto = niente pesca
  function canDraw(g) {
    return g.deck.length > 0;
  }
  function drawFromDeck(g) {
    return g.deck.pop() || null;
  }
  // Vittoria: mazzo nemesi vuoto e nessun potere né minion in gioco (dopo il primo turno nemesi)
  function isVictory(g) {
    return g.turn > 0 && g.deck.length === 0 && !g.queue.some(e => e.data.type === 'Power' || e.data.type === 'Minion');
  }
  // Passo Pesca: tutte le carte in gioco risolte
  function isDrawStep(g) {
    return g.resolving && g.newIndex < 0 && g.currentIndex >= g.queue.length;
  }
  function endResolution(g) {
    g.newIndex = -1;
    g.resolving = false;
    g.currentIndex = 0;
  }
  function startResolution(g) {
    g.queue.forEach(e => { e.isNew = false; });
    g.currentIndex = 0;
    g.newIndex = -1;
    g.resolving = true;
    if (g.queue.length === 0 && !canDraw(g)) endResolution(g);
  }
  function nemesisTurn(g) {
    g.turn++;
    startResolution(g);
  }
  // Fine del turno di un giocatore, parte delle carte: la vita attuale diventa quella di inizio turno e le carte grigie
  // vanno negli scarti
  function endPlayerTurnCards(g) {
    g.queue.forEach(e => { e.turnHp = e.hp; });
    g.queue.filter(isGone).forEach(e => discardGone(g, e));
  }
  // Pulsante principale del turno nemesi sulla carta da risolvere. Carta appena pescata: un attacco va negli scarti, le
  // altre restano in gioco; poi fine della risoluzione. Altrimenti: potere con più di 1 token = −1 token e avanti;
  // minion = resta e avanti; attacco o potere all'ultimo token = negli scarti. Finita la coda senza niente da pescare la
  // risoluzione finisce. Restituisce 'token', 'discard', 'next' o 'play'.
  function resolveCurrent(g) {
    const entry = g.queue[g.currentIndex];
    const { data, tokens } = entry;
    if (g.newIndex >= 0) {
      let effect;
      if (data.type === 'Attack') {
        g.stats.attacksResolved++;
        statCard(g.stats, 'attacksResolved', data);
        discardEntry(g, entry);
        effect = 'discard';
      } else {
        entry.isNew = false;
        effect = 'play';
      }
      endResolution(g);
      return effect;
    }
    let effect;
    if (data.type === 'Power' && tokens > 1) {
      entry.tokens--;
      g.currentIndex++;
      effect = 'token';
    } else if (data.type === 'Minion') {
      g.currentIndex++;
      effect = 'next';
    } else {
      if (data.type === 'Power') { g.stats.powersResolved++; statCard(g.stats, 'powersResolved', data); }
      else if (data.type === 'Attack') { g.stats.attacksResolved++; statCard(g.stats, 'attacksResolved', data); }
      discardEntry(g, entry);
      effect = 'discard';
    }
    if (g.currentIndex >= g.queue.length && !canDraw(g)) endResolution(g);
    return effect;
  }
  // Pesca del turno nemesi: la carta in cima va in fondo alla coda come nuova. Mazzo vuoto: fine della risoluzione e
  // null. newUid(): uid della nuova carta in gioco; now(): istante, letto solo alla prima carta di un Tier nuovo (inizio
  // del suo tempo nelle statistiche). Restituisce { entry, newTier } (newTier: 2 o 3 alla prima carta di quel Tier,
  // altrimenti null)
  function drawNewCard(g, newUid, now) {
    const data = drawFromDeck(g);
    if (!data) {
      endResolution(g);
      return null;
    }
    const entry = makeEntry(data, newUid(), g.turn);
    entry.isNew = true;
    g.queue.push(entry);
    g.newIndex = g.queue.length - 1;
    g.currentIndex = g.newIndex;
    let newTier = null;
    if (data.tier >= 2 && data.tier > g.maxTierDrawn) {
      newTier = data.tier;
      if (!g.stats.tierAt) g.stats.tierAt = {};
      g.stats.tierAt[data.tier] = now();
    }
    if (data.tier > g.maxTierDrawn) g.maxTierDrawn = data.tier;
    return { entry, newTier };
  }
  // Minion eliminato nel turno nemesi: contato, negli scarti, e gli indici della risoluzione seguono la coda
  function removeWhileResolving(g, entry) {
    const index = g.queue.indexOf(entry);
    const wasNew = g.newIndex >= 0 && index === g.newIndex;
    countMinionKilled(g.stats, entry, g.turn);
    discardEntry(g, entry);
    if (wasNew) { endResolution(g); return; }
    if (index < g.currentIndex) g.currentIndex--;
    if (g.newIndex > index) g.newIndex--;
    if (g.currentIndex >= g.queue.length && g.newIndex < 0 && !canDraw(g)) endResolution(g);
  }
  // "Salva modifiche" del turno giocatori: le bozze (Map uid -> { hp?, paid? }) diventano definitive; le Statistiche
  // maghi vanno al giocatore del turno (mage: 'p1'..'p4' o null). La prima impostazione della vita di un minion a vita
  // variabile non è danno e diventa la sua vita massima. Le carte grigie vanno negli scarti: restituisce quelle uscite.
  function applyDrafts(g, drafts, mage) {
    const m = mage ? (g.stats.mages[mage] = g.stats.mages[mage] || { damage: 0, powers: 0, kills: 0 }) : null;
    drafts.forEach((d, uid) => {
      const entry = g.queue.find(e => e.uid === uid) || null;
      if (!entry) return;
      if (d.hp !== undefined) {
        const firstSet = hpUnset(entry);
        if (m && entry.data.type === 'Minion' && !firstSet) {
          m.damage += Math.max(0, entry.hp - d.hp);
          if (d.hp <= 0 && entry.hp > 0) m.kills++;
        }
        entry.hp = d.hp;
        if (firstSet && d.hp > 0) { entry.hpSet = true; entry.turnHp = d.hp; entry.hpMax = d.hp; }
      }
      if (d.paid) {
        if (m && !entry.paid) m.powers++;
        entry.paid = true;
      }
    });
    const gone = g.queue.filter(isGone);
    gone.forEach(e => discardGone(g, e));
    return gone;
  }

  return {
    shuffle, pickRandom,
    waveOfCode, isMiniCode, ownsProduct, cardAllowed, battleOf, isPlayable,
    deckSetupRow, ownedUpgradedInWave, mergeLockedWave, mergeActive, deckPool, deckShortfall, buildDeck,
    turnOrderCards, isPairCard, pairOptions, otherOfPair, playerKinds, emptyPairNext, pickOf, newTurnOrder,
    shuffleTurnOrder, currentTurn, turnRoundOver, awaitingTurnCard, drawTurnCard, choosePairPlayer, historyFromPile,
    historyPlayer, predictedPairPlayers, turnCardPlayer, takeFromTurnPile, restoreTurnOrder,
    isVariableMinion, makeEntry, hpUnset, hasHp, hpMaxOf, hpCap, isGone,
    emptyStats, statCard, aetherCost, countMinionKilled, countPowerPaid,
    discardEntry, discardGone, canDraw, drawFromDeck, isVictory, isDrawStep, endResolution, startResolution, nemesisTurn,
    endPlayerTurnCards, resolveCurrent, drawNewCard, removeWhileResolving, applyDrafts
  };
})();

// In Node (test): module.exports; nel browser resta solo l'oggetto globale Regole
if (typeof module === 'object' && module && module.exports) module.exports = Regole;
