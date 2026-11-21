// 15-modalita-test.js: Modalità test (v215): scenari e schermata Test. Caricato in ordine da script.js insieme agli altri file di js/ (script classici, variabili globali).
'use strict';

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

