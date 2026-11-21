// 07-salvataggio-undo.js: Stato della partita: fotografia, ripristino, salvataggio, undo. Caricato in ordine da script.js insieme agli altri file di js/ (script classici, variabili globali).
'use strict';

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
  // Mazzo dei turni (Regole.restoreTurnOrder). Salvataggi senza (prima della v168): giro nuovo con il turno in corso già
  // estratto. drawn vuoto: attesa di "Pesca carta turno" (v193, per esempio con l'undo); v222: nel turno nemesi basta un
  // turno nella storia (la sua carta può essere tornata nel mazzo). Campi mancanti dei salvataggi vecchi: giro dai turni
  // nemesi (v168), wild a caso (prima della v179), nessuna carta nota né turno annullato (v211), picks a stringhe e
  // memoria delle coppie ricostruita (prima della v220), storia dagli scarti dei turni (prima della v222)
  turnOrder = Regole.restoreTurnOrder(s.turnOrder, { players: settings.players, resolving, turn: s.turn, random: Math.random,
    get cards() { return turnOrderCards(settings.players); } });
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

