// Turno nemesi e turno giocatori: risoluzione (potere, minion, attacco), pesca (anche col mazzo vuoto), vittoria,
// costo Æ (removalCost), statistiche, minion a vita variabile.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Regole, cards, cardByName } = require('./aiuto.js');

const byType = (type, pred = () => true) => cards.find(c => c.type === type && c.inNemesisDeck && pred(c));
const POWER2 = byType('Power', c => c.powerTokens === 2);
const POWER1 = byType('Power', c => c.powerTokens === 1);
const MINION = byType('Minion', c => !c.hpVariable && c.hp > 1);
const ATTACK = byType('Attack');
const VARIABLE = cards.find(c => c.type === 'Minion' && c.hpVariable === true);

// Parti della partita come le passa l'app (gameParts)
function game(extra = {}) {
  let uid = 1;
  const g = Object.assign({ queue: [], deck: [], discard: [], stats: Regole.emptyStats(0), turn: 1, currentIndex: 0,
    newIndex: -1, resolving: false, maxTierDrawn: 1 }, extra);
  g.newUid = () => uid++;
  g.add = data => { const e = Regole.makeEntry(data, g.newUid(), g.turn); g.queue.push(e); return e; };
  return g;
}

test('dati usati dai test', () => {
  [POWER2, POWER1, MINION, ATTACK, VARIABLE].forEach(c => assert.ok(c));
});

test('risoluzione: potere con 2 token, minion, attacco, poi passo Pesca', () => {
  const g = game({ deck: [ATTACK] });
  const p = g.add(POWER2);
  const m = g.add(MINION);
  g.add(ATTACK);
  Regole.nemesisTurn(g);
  assert.equal(g.turn, 2);
  assert.equal(g.resolving, true);
  assert.equal(g.currentIndex, 0);
  assert.equal(Regole.resolveCurrent(g), 'token');
  assert.equal(p.tokens, 1);
  assert.equal(g.currentIndex, 1);
  assert.equal(Regole.resolveCurrent(g), 'next', 'il minion resta');
  assert.equal(g.queue.includes(m), true);
  assert.equal(Regole.resolveCurrent(g), 'discard', 'l\'attacco va negli scarti');
  assert.deepEqual(g.discard, [ATTACK]);
  assert.equal(g.stats.attacksResolved, 1);
  assert.deepEqual(g.stats.cards.attacksResolved, [ATTACK.id]);
  assert.equal(Regole.isDrawStep(g), true, 'tutte risolte: si pesca');
  assert.equal(g.resolving, true);
  // Turno dopo: il potere all'ultimo token va negli scarti e conta come risolto
  Regole.endResolution(g);
  Regole.nemesisTurn(g);
  assert.equal(Regole.resolveCurrent(g), 'discard');
  assert.equal(g.stats.powersResolved, 1);
  assert.deepEqual(g.stats.cards.powersResolved, [POWER2.id]);
  assert.equal(g.queue.length, 1);
});

test('risoluzione: finita la coda senza carte da pescare il turno finisce', () => {
  const g = game();
  g.add(MINION);
  Regole.nemesisTurn(g);
  assert.equal(Regole.resolveCurrent(g), 'next');
  assert.equal(g.resolving, false);
  assert.equal(g.currentIndex, 0);
  // Coda vuota e mazzo vuoto: il turno nemesi finisce subito
  const e = game();
  Regole.nemesisTurn(e);
  assert.equal(e.resolving, false);
  // Coda vuota e mazzo pieno: si va subito al passo Pesca
  const d = game({ deck: [MINION] });
  Regole.nemesisTurn(d);
  assert.equal(Regole.isDrawStep(d), true);
});

test('pesca: carta in fondo alla coda come nuova, Tier nuovo, poi attacco negli scarti o carta in gioco', () => {
  const tier2 = cards.find(c => c.inNemesisDeck && c.tier === 2 && c.type === 'Attack');
  const tier2m = cards.find(c => c.inNemesisDeck && c.tier === 2 && c.type === 'Minion' && !c.hpVariable);
  const g = game({ deck: [tier2m, tier2] });
  Regole.nemesisTurn(g);
  let r = Regole.drawNewCard(g, g.newUid, () => 1234);
  assert.equal(r.entry.data, tier2);
  assert.equal(r.entry.isNew, true);
  assert.equal(r.newTier, 2);
  assert.equal(g.stats.tierAt[2], 1234);
  assert.equal(g.maxTierDrawn, 2);
  assert.equal(g.newIndex, 0);
  assert.equal(g.currentIndex, 0);
  assert.equal(Regole.resolveCurrent(g), 'discard', 'attacco pescato: negli scarti');
  assert.equal(g.resolving, false);
  assert.equal(g.stats.attacksResolved, 1);
  // Secondo Tier 2: nessuna scritta
  Regole.nemesisTurn(g);
  r = Regole.drawNewCard(g, g.newUid, () => 99);
  assert.equal(r.newTier, null);
  assert.equal(g.stats.tierAt[2], 1234);
  assert.equal(Regole.resolveCurrent(g), 'play');
  assert.equal(r.entry.isNew, false);
  assert.equal(g.queue.length, 1);
  assert.equal(g.resolving, false);
  assert.equal(r.entry.bornTurn, 3, 'pescata nel secondo turno nemesi della prova (turno 3)');
});

test('pesca col mazzo vuoto: il mazzo non si rimescola, niente pesca e fine del turno', () => {
  const g = game({ discard: [ATTACK, MINION] });
  g.add(POWER2);
  Regole.nemesisTurn(g);
  Regole.resolveCurrent(g);
  assert.equal(g.resolving, false, 'coda finita e niente da pescare');
  g.resolving = true;
  assert.equal(Regole.drawNewCard(g, g.newUid, () => 0), null);
  assert.equal(g.resolving, false);
  assert.equal(g.discard.length, 2, 'gli scarti non tornano nel mazzo');
  assert.equal(Regole.drawFromDeck(g), null);
  assert.equal(Regole.canDraw(g), false);
});

test('vittoria: dopo il primo turno nemesi, mazzo vuoto e nessun potere né minion in gioco', () => {
  const g = game({ turn: 0 });
  assert.equal(Regole.isVictory(g), false, 'turno 0');
  g.turn = 1;
  assert.equal(Regole.isVictory(g), true);
  g.add(ATTACK);
  assert.equal(Regole.isVictory(g), true, 'un attacco in coda non conta');
  g.add(MINION);
  assert.equal(Regole.isVictory(g), false);
  g.queue = [Regole.makeEntry(POWER1, 9, 1)];
  assert.equal(Regole.isVictory(g), false);
  g.queue = [];
  g.deck = [ATTACK];
  assert.equal(Regole.isVictory(g), false, 'mazzo non vuoto');
});

test('costo Æ: removalCost numerico, altrimenti 0; poteri pagati nelle statistiche', () => {
  const paid = cards.find(c => c.type === 'Power' && Number(c.removalCost) > 0);
  assert.ok(paid);
  assert.equal(Regole.aetherCost(paid), Number(paid.removalCost));
  assert.equal(Regole.aetherCost({ removalCost: null }), 0);
  assert.equal(Regole.aetherCost({ removalCost: 'X' }), 0);
  assert.equal(Regole.aetherCost({ removalCost: '6' }), 6);
  const g = game();
  const e = g.add(paid);
  e.paid = true;
  assert.equal(Regole.isGone(e), true);
  Regole.endPlayerTurnCards(g);
  assert.equal(g.stats.powersPaid, 1);
  assert.equal(g.stats.aetherSpent, Number(paid.removalCost));
  assert.deepEqual(g.discard, [paid]);
});

test('fine del turno giocatori: vita di riferimento azzerata, minion a 0 negli scarti con i turni in gioco', () => {
  const g = game({ turn: 4 });
  const m = Regole.makeEntry(MINION, 1, 1);
  const alive = Regole.makeEntry(MINION, 2, 3);
  g.queue.push(m, alive);
  m.hp = 0;
  alive.hp = 1;
  Regole.endPlayerTurnCards(g);
  assert.equal(alive.turnHp, 1);
  assert.deepEqual(g.queue, [alive]);
  assert.equal(g.stats.minionsKilled, 1);
  assert.deepEqual(g.stats.minions, [{ id: MINION.id, name: MINION.name, turns: 3 }]);
});

test('bozze salvate: danni e uccisioni del mago, poteri pagati, carte grigie negli scarti', () => {
  const g = game();
  const m = g.add(MINION);
  const p = g.add(POWER2);
  const drafts = new Map([[m.uid, { hp: 0 }], [p.uid, { paid: true }], [999, { hp: 3 }]]);
  const gone = Regole.applyDrafts(g, drafts, 'p2');
  assert.deepEqual(gone, [m, p]);
  assert.deepEqual(g.stats.mages.p2, { damage: MINION.hp, powers: 1, kills: 1 });
  assert.equal(g.queue.length, 0);
  assert.equal(g.stats.minionsKilled, 1);
  assert.equal(g.stats.powersPaid, 1);
  // Nessun giocatore (turno nemesi o carta da scegliere): nessuna statistica dei maghi
  const h = game();
  const m2 = h.add(MINION);
  Regole.applyDrafts(h, new Map([[m2.uid, { hp: MINION.hp - 1 }]]), null);
  assert.deepEqual(h.stats.mages, {});
  assert.equal(m2.hp, MINION.hp - 1);
});

test('minion a vita variabile: "?" finché non impostata, non muore a 0, +1 senza limite, poi vita massima', () => {
  const e = Regole.makeEntry(VARIABLE, 1, 2);
  assert.deepEqual([e.hp, e.turnHp, e.hpSet, e.bornTurn], [0, null, false, 2]);
  assert.equal(Regole.isVariableMinion(VARIABLE), true);
  assert.equal(Regole.hpUnset(e), true);
  assert.equal(Regole.isGone(e), false, 'a 0 non muore finché è "?"');
  assert.equal(Regole.hpCap(e, false), Infinity);
  assert.equal(Regole.hpCap(e, true), Infinity);
  // Prima impostazione (bozza salvata): non è danno, diventa vita di riferimento e vita massima
  const g = game();
  g.queue.push(e);
  Regole.applyDrafts(g, new Map([[e.uid, { hp: 7 }]]), 'p1');
  assert.deepEqual([e.hp, e.turnHp, e.hpSet, e.hpMax], [7, 7, true, 7]);
  assert.deepEqual(g.stats.mages.p1, { damage: 0, powers: 0, kills: 0 });
  assert.equal(Regole.hpUnset(e), false);
  assert.equal(Regole.hpMaxOf(e), 7);
  assert.equal(Regole.hpCap(e, true), 7);
  e.hp = 5;
  e.turnHp = 6;
  assert.equal(Regole.hpCap(e, false), 6, 'turno giocatori: anche la vita di inizio turno');
  // Da qui regole normali: a 0 muore
  e.hp = 0;
  assert.equal(Regole.isGone(e), true);
  // Impostata a 0 la prima volta: resta "?"
  const z = Regole.makeEntry(VARIABLE, 2, 1);
  const g2 = game();
  g2.queue.push(z);
  Regole.applyDrafts(g2, new Map([[z.uid, { hp: 0 }]]), null);
  assert.equal(Regole.hpUnset(z), true);
  assert.equal(g2.queue.length, 1);
  // Minion normale: tetto = vita della carta e, nel turno giocatori, vita di inizio turno
  const n = Regole.makeEntry(MINION, 3, 1);
  n.hp = 1;
  n.turnHp = 2;
  assert.equal(Regole.hpCap(n, true), MINION.hp);
  assert.equal(Regole.hpCap(n, false), Math.min(MINION.hp, 2));
  n.turnHp = null;
  assert.equal(Regole.hpCap(n, false), 1);
});

test('minion eliminato nel turno nemesi: indici della risoluzione che seguono la coda', () => {
  const g = game({ deck: [ATTACK] });
  const a = g.add(MINION);
  const b = g.add(MINION);
  g.add(POWER2);
  Regole.nemesisTurn(g);
  g.currentIndex = 2;
  Regole.removeWhileResolving(g, a);
  assert.equal(g.currentIndex, 1, 'la carta da risolvere resta la stessa');
  assert.equal(g.stats.minionsKilled, 1);
  // Minion appena pescato eliminato: fine della risoluzione
  Regole.drawNewCard(g, g.newUid, () => 0);
  const drawnEntry = g.queue[g.newIndex];
  Regole.removeWhileResolving(g, drawnEntry);
  assert.equal(g.resolving, false);
  assert.equal(g.queue.includes(b), true);
});

test('carte uscite dal gioco: statistiche per gruppo e statCard su statistiche vecchie', () => {
  const st = { minionsKilled: 0, minions: [] };
  Regole.statCard(st, 'powersPaid', { id: 'X' });
  assert.deepEqual(st.cards.powersPaid, ['X']);
  assert.deepEqual(Regole.emptyStats(12).deckSize, 12);
  const g = game();
  const e = g.add(cardByName(MINION.name));
  Regole.discardEntry(g, e);
  assert.deepEqual(g.discard, [MINION]);
  assert.equal(g.queue.length, 0);
});
