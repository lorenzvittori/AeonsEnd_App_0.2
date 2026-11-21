// Mazzo dei turni: carte per numero di giocatori, giro nuovo, wild, pesca dalla cima, memoria delle coppie 1/2 e 3/4,
// carte tolte dagli scarti (picks e storia), salvataggi vecchi.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Regole, seeded } = require('./aiuto.js');

const sorted = list => list.slice().sort();
// Mazzo dei turni a mano: left dalla cima, il resto vuoto
function orderWith(left, extra = {}) {
  return Object.assign({ left: left.slice(), drawn: [], round: 1, wild: null, picks: {}, known: left.map(() => false),
    waiting: false, pairNext: { p12: null, p34: null }, history: [] }, extra);
}
// Pesca senza giro nuovo possibile (le carte del giro nuovo non servono)
function draw(order, opts = {}) {
  return Regole.drawTurnCard(order, Object.assign({ players: 4, cards: [], random: seeded(1) }, opts));
}

test('carte del mazzo dei turni per 2, 3 e 4 giocatori', () => {
  assert.deepEqual(sorted(Regole.turnOrderCards(2, false)), sorted(['p1', 'p1', 'p2', 'p2', 'nemesis', 'nemesis']));
  assert.deepEqual(sorted(Regole.turnOrderCards(3, false)), sorted(['p1', 'p2', 'p3', 'wild', 'nemesis', 'nemesis']));
  assert.deepEqual(sorted(Regole.turnOrderCards(4, false)), sorted(['p1', 'p2', 'p3', 'p4', 'nemesis', 'nemesis']));
  assert.deepEqual(sorted(Regole.turnOrderCards(4, true)), sorted(['p12', 'p12', 'p34', 'p34', 'nemesis', 'nemesis']));
  // L'opzione 1/2 e 3/4 vale solo con 4 giocatori
  assert.deepEqual(sorted(Regole.turnOrderCards(3, true)), sorted(Regole.turnOrderCards(3, false)));
  assert.deepEqual(Regole.playerKinds(3), ['p1', 'p2', 'p3']);
});

test('giro nuovo: mazzo mescolato, giro +1, niente note, storia vuota, memoria delle coppie conservata', () => {
  const before = orderWith([], { round: 2, drawn: ['p1', 'nemesis'], picks: { 0: { player: 'p1', forced: false } },
    pairNext: { p12: 'p2', p34: null }, history: [{ kind: 'p1', player: null, forced: false, pos: 0 }] });
  const cards = Regole.turnOrderCards(4, true);
  const after = Regole.shuffleTurnOrder(before, 4, cards, seeded(3));
  assert.equal(after.round, 3);
  assert.deepEqual(sorted(after.left), sorted(cards));
  assert.deepEqual(after.known, after.left.map(() => false));
  assert.deepEqual(after.drawn, []);
  assert.deepEqual(after.picks, {});
  assert.deepEqual(after.history, []);
  assert.deepEqual(after.pairNext, { p12: 'p2', p34: null });
  assert.equal(after.wild, null);
  assert.notEqual(after.pairNext, before.pairNext, 'la memoria è una copia');
  // Stessa semente, stesso ordine
  assert.deepEqual(Regole.shuffleTurnOrder(before, 4, cards, seeded(3)).left, after.left);
});

test('wild con 3 giocatori: al primo giro a caso, poi passa al giocatore dopo (1→2→3→1)', () => {
  const cards = Regole.turnOrderCards(3, false);
  let order = Regole.newTurnOrder();
  order = Regole.shuffleTurnOrder(order, 3, cards, () => 0.5); // 1 + floor(0.5 * 3) = 2
  assert.equal(order.wild, 2);
  const seen = [];
  for (let i = 0; i < 4; i++) { order = Regole.shuffleTurnOrder(order, 3, cards, seeded(i)); seen.push(order.wild); }
  assert.deepEqual(seen, [3, 1, 2, 3]);
  // Il turno del wild vale per il giocatore che è wild
  assert.equal(Regole.turnCardPlayer('wild', 0, order, order.wild), 'p3');
  assert.equal(Regole.historyPlayer({ kind: 'wild' }, 3), 'p3');
  assert.equal(Regole.turnCardPlayer('wild', 0, order, null), null);
});

test('pesca dalla cima, carte note, storia; a mazzo vuoto un giro nuovo', () => {
  const order = orderWith(['p2', 'nemesis', 'p1'], { known: [true, false, true] });
  let r = draw(order);
  assert.equal(r.card, 'p2');
  assert.equal(r.order, order, 'stesso oggetto senza giro nuovo');
  assert.deepEqual(order.left, ['nemesis', 'p1']);
  assert.deepEqual(order.known, [false, true]);
  assert.deepEqual(order.drawn, ['p2']);
  assert.deepEqual(Regole.currentTurn(order), { kind: 'p2', player: null, forced: false, pos: 0 });
  draw(order);
  draw(order);
  assert.equal(Regole.turnRoundOver(order), true);
  // Mazzo vuoto: giro nuovo e poi pesca
  r = Regole.drawTurnCard(order, { players: 2, cards: Regole.turnOrderCards(2, false), random: seeded(5) });
  assert.notEqual(r.order, order);
  assert.equal(r.order.round, 2);
  assert.equal(r.order.left.length, 5);
  assert.equal(r.order.history.length, 1);
  // pick (salvataggi vecchi): la prima carta dall'alto che lo soddisfa
  const o2 = orderWith(['nemesis', 'p1', 'p2']);
  assert.equal(draw(o2, { pick: c => c !== 'nemesis' }).card, 'p1');
  assert.deepEqual(o2.left, ['nemesis', 'p2']);
});

test('attesa della carta turno e fine del giro', () => {
  const order = Regole.newTurnOrder();
  assert.equal(Regole.awaitingTurnCard(order, false), true);
  assert.equal(Regole.awaitingTurnCard(order, true), false, 'nel turno nemesi non si aspetta');
  assert.equal(Regole.currentTurn(order), null);
  assert.equal(Regole.turnRoundOver(order), false);
  const o = orderWith(['p1']);
  draw(o);
  assert.equal(Regole.awaitingTurnCard(o, false), false);
  assert.equal(Regole.turnRoundOver(o), true);
  // Salvataggi v211-v221: turno annullato (waiting) = attesa
  o.waiting = true;
  assert.equal(Regole.awaitingTurnCard(o, false), true);
  assert.equal(Regole.currentTurn(o), null);
});

test('memoria delle coppie: carta scelta, poi la prossima della coppia è obbligata', () => {
  const order = orderWith(['p12', 'p34', 'p12', 'p34']);
  draw(order);
  assert.equal(Regole.currentTurn(order).player, null, 'memoria vuota: si sceglie');
  assert.equal(Regole.turnCardPlayer('p12', undefined, order, null), null);
  assert.equal(Regole.choosePairPlayer(order, 'p1'), true);
  assert.deepEqual(order.picks[0], { player: 'p1', forced: false });
  assert.deepEqual(Regole.currentTurn(order), { kind: 'p12', player: 'p1', forced: false, pos: 0 });
  assert.deepEqual(order.pairNext, { p12: 'p2', p34: null });
  assert.equal(Regole.choosePairPlayer(order, 'p2'), false, 'già scelta');
  // Le due coppie sono separate
  draw(order);
  assert.equal(Regole.currentTurn(order).player, null);
  Regole.choosePairPlayer(order, 'p4');
  assert.deepEqual(order.pairNext, { p12: 'p2', p34: 'p3' });
  // Seconda 1/2: obbligata per il 2, memoria vuota
  draw(order);
  assert.deepEqual(Regole.currentTurn(order), { kind: 'p12', player: 'p2', forced: true, pos: 2 });
  assert.deepEqual(order.picks[2], { player: 'p2', forced: true });
  assert.equal(order.pairNext.p12, null);
  assert.equal(Regole.choosePairPlayer(order, 'p1'), false, 'obbligata: niente scelta');
  draw(order);
  assert.deepEqual(Regole.currentTurn(order), { kind: 'p34', player: 'p3', forced: true, pos: 3 });
  assert.deepEqual(order.pairNext, { p12: null, p34: null });
  assert.equal(Regole.turnCardPlayer('p34', 3, order, null), 'p3');
  assert.equal(Regole.turnCardPlayer('p34', -1, order, null), null, 'nel mazzo: nessun giocatore');
});

test('memoria delle coppie tra i giri: la scelta dell\'ultimo giro decide la prima carta del giro dopo', () => {
  let order = orderWith(['p12']);
  draw(order);
  Regole.choosePairPlayer(order, 'p2');
  assert.equal(Regole.turnRoundOver(order), true);
  order = Regole.shuffleTurnOrder(order, 4, ['p12', 'nemesis'], () => 0.99); // nessuno scambio: p12 in cima
  assert.deepEqual(order.left, ['p12', 'nemesis']);
  assert.deepEqual(order.pairNext, { p12: 'p1', p34: null });
  draw(order);
  assert.deepEqual(Regole.currentTurn(order), { kind: 'p12', player: 'p1', forced: true, pos: 0 });
});

test('tre carte della stessa coppia nello stesso giro: scelta, obbligata, di nuovo scelta', () => {
  const order = orderWith(['p12', 'p12', 'p12']);
  draw(order);
  Regole.choosePairPlayer(order, 'p1');
  draw(order);
  assert.deepEqual(Regole.currentTurn(order), { kind: 'p12', player: 'p2', forced: true, pos: 1 });
  draw(order);
  assert.equal(Regole.currentTurn(order).player, null, 'memoria vuota: la terza si sceglie');
  Regole.choosePairPlayer(order, 'p2');
  assert.deepEqual(order.pairNext.p12, 'p1');
});

test('giocatori dedotti per le carte 1/2 e 3/4 del mazzo', () => {
  const order = orderWith(['p12', 'p34', 'p12', 'nemesis', 'p34'], { pairNext: { p12: 'p2', p34: null } });
  assert.deepEqual(Regole.predictedPairPlayers(order), ['p2', null, null, null, null]);
});

test('carta tolta dagli scarti: i picks restano sulle carte rimaste, la storia segue le posizioni', () => {
  const order = orderWith([], {
    drawn: ['p12', 'nemesis', 'p12', 'p34'],
    picks: { 0: { player: 'p1', forced: false }, 2: { player: 'p2', forced: true }, 3: { player: 'p3', forced: false } },
    history: [{ kind: 'p12', player: 'p1', forced: false, pos: 0 }, { kind: 'nemesis', player: null, forced: false, pos: 1 },
      { kind: 'p12', player: 'p2', forced: true, pos: 2 }, { kind: 'p34', player: 'p3', forced: false, pos: 3 }]
  });
  const taken = Regole.takeFromTurnPile(order, [1, 9, -1]);
  assert.deepEqual(taken, ['nemesis']);
  assert.deepEqual(order.drawn, ['p12', 'p12', 'p34']);
  assert.deepEqual(order.picks, { 0: { player: 'p1', forced: false }, 1: { player: 'p2', forced: true }, 2: { player: 'p3', forced: false } });
  assert.deepEqual(order.history.map(e => e.pos), [0, null, 1, 2]);
  // Una carta 1/2 tolta perde il suo giocatore (la storia lo tiene)
  Regole.takeFromTurnPile(order, [0]);
  assert.deepEqual(order.picks, { 0: { player: 'p2', forced: true }, 1: { player: 'p3', forced: false } });
  assert.equal(Regole.turnCardPlayer('p12', 0, order, null), 'p2');
  assert.deepEqual(order.history[0], { kind: 'p12', player: 'p1', forced: false, pos: null });
});

test('turno in corso rimesso nel mazzo (scelto): il turno continua, la memoria non cambia, poi carta obbligata', () => {
  const order = orderWith(['p12', 'p1']);
  draw(order);
  Regole.choosePairPlayer(order, 'p1'); // memoria: tocca al 2
  // Dalla finestra del mazzo dei turni: carta del turno in corso in cima al mazzo
  const [kind] = Regole.takeFromTurnPile(order, [Regole.currentTurn(order).pos]);
  order.left.unshift(kind);
  order.known.unshift(true);
  assert.deepEqual(Regole.currentTurn(order), { kind: 'p12', player: 'p1', forced: false, pos: null }, 'il turno del 1 continua');
  assert.deepEqual(order.pairNext, { p12: 'p2', p34: null });
  assert.equal(Regole.turnCardPlayer('p12', undefined, order, null), 'p1');
  assert.deepEqual(Regole.predictedPairPlayers(order), ['p2', null]);
  draw(order);
  assert.deepEqual(Regole.currentTurn(order), { kind: 'p12', player: 'p2', forced: true, pos: 0 });
  assert.equal(order.history.length, 2, 'il turno giocato resta nella storia');
});

test('turno in corso rimesso nel mazzo (obbligato): la memoria resta vuota, poi si sceglie', () => {
  const order = orderWith(['p12', 'p1'], { pairNext: { p12: 'p2', p34: null } });
  draw(order);
  assert.deepEqual(Regole.currentTurn(order), { kind: 'p12', player: 'p2', forced: true, pos: 0 });
  const [kind] = Regole.takeFromTurnPile(order, [0]);
  order.left.unshift(kind);
  order.known.unshift(true);
  assert.deepEqual(order.pairNext, { p12: null, p34: null });
  assert.deepEqual(order.picks, {});
  draw(order);
  assert.equal(Regole.currentTurn(order).player, null, 'si sceglie');
});

test('salvataggi: mazzo dei turni completo letto com\'è, campi mancanti ricostruiti', () => {
  const saved = { left: ['p34', 'nemesis'], drawn: ['p12', 'p12', 'p34'], round: 3, wild: null,
    picks: { 0: { player: 'p1', forced: false }, 1: { player: 'p2', forced: true }, 2: { player: 'p4', forced: false } },
    known: [true, false], waiting: false, pairNext: { p12: null, p34: 'p3' },
    history: [{ kind: 'p12', player: 'p1', forced: false, pos: 0 }, { kind: 'p12', player: 'p2', forced: true, pos: 1 },
      { kind: 'p34', player: 'p4', forced: false, pos: 2 }] };
  const order = Regole.restoreTurnOrder(saved, { players: 4, resolving: false, turn: 5, cards: [], random: seeded(1) });
  assert.deepEqual(order, saved);
  assert.notEqual(order.left, saved.left, 'copie, non gli array del salvataggio');

  // Prima della v220/v222: picks a stringhe, senza pairNext né storia: la seconda carta della coppia diventa obbligata
  const old = { left: ['nemesis'], drawn: ['p12', 'p12', 'p34', 'nemesis'], round: 2, picks: { 0: 'p2', 2: 'p3' } };
  const o = Regole.restoreTurnOrder(old, { players: 4, resolving: false, turn: 4, cards: [], random: seeded(1) });
  assert.deepEqual(o.picks, { 0: { player: 'p2', forced: false }, 1: { player: 'p1', forced: true }, 2: { player: 'p3', forced: false } });
  assert.deepEqual(o.pairNext, { p12: null, p34: 'p4' });
  assert.deepEqual(o.history.map(e => [e.kind, e.player, e.forced, e.pos]),
    [['p12', 'p2', false, 0], ['p12', 'p1', true, 1], ['p34', 'p3', false, 2], ['nemesis', null, false, 3]]);
  assert.deepEqual(o.known, [false]);
  assert.equal(o.waiting, false);

  // v168 senza giro: si parte dai turni nemesi; 3 giocatori senza wild (prima della v179): wild a caso
  const v168 = Regole.restoreTurnOrder({ left: ['p1'], drawn: ['wild'] }, { players: 3, resolving: false, turn: 4, cards: [], random: () => 0 });
  assert.equal(v168.round, 4);
  assert.equal(v168.wild, 1);

  // Senza mazzo dei turni (prima della v168): giro nuovo con il turno in corso già estratto (giocatore o nemesi)
  const cards = Regole.turnOrderCards(2, false);
  const none = Regole.restoreTurnOrder(undefined, { players: 2, resolving: false, turn: 3, cards, random: seeded(2) });
  assert.equal(none.round, 3);
  assert.equal(none.drawn.length, 1);
  assert.notEqual(none.drawn[0], 'nemesis');
  const noneN = Regole.restoreTurnOrder(undefined, { players: 2, resolving: true, turn: 3, cards, random: seeded(2) });
  assert.equal(noneN.drawn[0], 'nemesis');
  // Turno nemesi con scarti dei turni vuoti e storia vuota: come senza mazzo dei turni
  const empty = Regole.restoreTurnOrder({ left: ['p1'], drawn: [] }, { players: 2, resolving: true, turn: 1, cards, random: seeded(2) });
  assert.equal(empty.drawn[0], 'nemesis');
  // Turno annullato (v211-v221) solo nel turno giocatori e con carte negli scarti
  const w = Regole.restoreTurnOrder({ left: [], drawn: ['p1'], waiting: true }, { players: 2, resolving: false, turn: 1, cards, random: seeded(2) });
  assert.equal(w.waiting, true);
  assert.equal(Regole.restoreTurnOrder({ left: [], drawn: ['p1'], waiting: true }, { players: 2, resolving: true, turn: 1, cards, random: seeded(2) }).waiting, false);
});
