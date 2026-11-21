// Mazzo nemesi (Nemesis Deck Setup, opzioni del mazzo, blocco di "Unisci", mazzo corto) e nemesi giocabili.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Regole, db, cards, nemeses, deckSetup, seeded, allProducts, appWaves } = require('./aiuto.js');

const COMBOS = [
  { battleMode: true, mergeCollection: true },
  { battleMode: true, mergeCollection: false },
  { battleMode: false, mergeCollection: true },
  { battleMode: false, mergeCollection: false }
];

// Riga attesa di deck-setup.json, calcolata qui senza passare da Regole.deckSetupRow
function expectedRow(nemesis, players, battleMode) {
  const info = nemeses.find(n => n.name === nemesis);
  const battle = deckSetup.battles.find(b => b.battle === (battleMode ? info.battle : 1));
  const row = battle.players[String(players)];
  return { basic: row.basic, upgraded: battleMode ? row.upgradedBasic : { 1: 0, 2: 0, 3: 0 } };
}
// Carte disponibili per categoria e Tier, calcolate qui: collezione e, senza "Unisci" (e senza blocco), wave della nemesi
function expectedPool(collection, nemesis, category, tier, merge) {
  const wave = Regole.waveOfCode(nemeses.find(n => n.name === nemesis).boxCode);
  return cards.filter(c => c.category === category && c.inNemesisDeck === true && c.tier === tier
    && (!c.boxCode || collection.has(c.boxCode)) && (merge || Regole.waveOfCode(c.boxCode) === wave));
}

function checkDeck(collection, label) {
  const playable = nemeses.filter(n => Regole.isPlayable(db, collection, n));
  assert.ok(playable.length > 0, `${label}: nessuna nemesi giocabile`);
  let seed = 1;
  playable.forEach(info => {
    [2, 3, 4].forEach(players => {
      COMBOS.forEach(opts => {
        const s = { players, nemesis: info.name, ...opts };
        const where = `${label} · ${info.name} · ${players}G · battaglia ${opts.battleMode} · unisci ${opts.mergeCollection}`;
        const row = expectedRow(info.name, players, opts.battleMode);
        assert.deepEqual(Regole.deckSetupRow(db, s).basic, row.basic, where);
        // Blocco: con Modalità battaglia, Upgraded richieste e nessuna Upgraded nella wave della nemesi
        const wave = Regole.waveOfCode(info.boxCode);
        const wantsUp = [1, 2, 3].some(t => row.upgraded[t] > 0);
        const waveHasUp = cards.some(c => c.category === 'Upgraded' && c.inNemesisDeck === true && c.boxCode
          && Regole.waveOfCode(c.boxCode) === wave && collection.has(c.boxCode));
        const locked = opts.battleMode && wantsUp && !waveHasUp;
        assert.equal(Regole.mergeLockedWave(db, collection, s), locked ? wave : null, where + ' (blocco)');
        const merge = opts.mergeCollection || locked;
        assert.equal(Regole.mergeActive(db, collection, s), merge, where + ' (unisci attivo)');

        const { deck, plan } = Regole.buildDeck(db, collection, s, seeded(seed++));
        let want = 0;
        let have = 0;
        let total = 0;
        [1, 2, 3].forEach(t => {
          const nB = Math.min(row.basic[t], expectedPool(collection, info.name, 'Basic', t, merge).length);
          const nU = Math.min(row.upgraded[t], expectedPool(collection, info.name, 'Upgraded', t, merge).length);
          const nS = cards.filter(c => c.category === 'Specific' && c.nemesis === info.name && c.inNemesisDeck === true && c.tier === t).length;
          want += row.basic[t] + row.upgraded[t];
          have += nB + nU;
          total += nB + nU + nS;
          const count = kind => plan.find(p => p.tier === t && p.kind === kind).count;
          assert.equal(count('basic'), nB, `${where}: Basic Tier ${t}`);
          assert.equal(count('upgraded'), nU, `${where}: Upgraded Tier ${t}`);
          assert.equal(count('specific'), nS, `${where}: Specific Tier ${t}`);
          const inDeck = deck.filter(c => c.tier === t);
          assert.equal(inDeck.filter(c => c.category === 'Basic').length, nB, `${where}: Basic nel mazzo, Tier ${t}`);
          assert.equal(inDeck.filter(c => c.category === 'Upgraded').length, nU, `${where}: Upgraded nel mazzo, Tier ${t}`);
          assert.equal(inDeck.filter(c => c.category === 'Specific').length, nS, `${where}: Specific nel mazzo, Tier ${t}`);
        });
        assert.equal(deck.length, total, where + ' (carte totali)');
        // Solo carte del mazzo nemesi, della collezione (Basic/Upgraded) e, senza "Unisci", della wave della nemesi
        deck.forEach(c => {
          assert.equal(c.inNemesisDeck, true, where);
          if (c.category === 'Specific') assert.equal(c.nemesis, info.name, where);
          else {
            assert.ok(!c.boxCode || collection.has(c.boxCode), where + ' (fuori collezione)');
            if (!merge) assert.equal(Regole.waveOfCode(c.boxCode), wave, where + ' (fuori dalla wave)');
          }
        });
        // Nessuna carta due volte (le carte sono oggetti diversi in cards.json)
        assert.equal(new Set(deck).size, deck.length, where + ' (doppioni)');
        // Ordine: si pesca dalla fine, quindi in fondo all'array (cima del mazzo) il Tier 1, all'inizio il Tier 3
        const tiers = deck.map(c => c.tier);
        assert.deepEqual(tiers, tiers.slice().sort((a, b) => b - a), where + ' (ordine dei Tier)');
        // Avviso del mazzo corto
        const short = Regole.deckShortfall(db, collection, s);
        assert.deepEqual(short, have < want ? { want, have } : null, where + ' (avviso mazzo corto)');
      });
    });
  });
}

test('mazzo: tutte le nemesi giocabili × 2/3/4 giocatori × opzioni, collezione completa', () => {
  checkDeck(allProducts, 'tutta la collezione');
});

test('mazzo: wave 1 e 4 (quelle sceglibili oggi)', () => {
  checkDeck(appWaves, 'wave 1 e 4');
});

test('mazzo: solo la scatola base della wave 1 (mazzo corto e blocco di Unisci)', () => {
  checkDeck(new Set(['1']), 'solo wave 1 base');
});

test('blocco di Unisci: battaglia con Upgraded e wave della nemesi senza Upgraded', () => {
  const collection = new Set(['1', '4']);
  const wave1 = nemeses.find(n => n.boxCode === '1' && n.battle >= 2 && Regole.isPlayable(db, collection, n));
  assert.ok(wave1, 'serve una nemesi della wave 1 con battaglia ≥ 2');
  const s = { players: 2, nemesis: wave1.name, battleMode: true, mergeCollection: false };
  const waveHasUp = cards.some(c => c.category === 'Upgraded' && c.inNemesisDeck && c.boxCode === '1');
  assert.equal(waveHasUp, false, 'la scatola base della wave 1 non ha Upgraded (Core Set)');
  assert.equal(Regole.mergeLockedWave(db, collection, s), '1');
  assert.equal(Regole.mergeActive(db, collection, s), true, 'Unisci resta acceso anche se spento');
  // Senza Modalità battaglia niente blocco (nessuna Upgraded richiesta)
  assert.equal(Regole.mergeLockedWave(db, collection, { ...s, battleMode: false }), null);
  assert.equal(Regole.mergeActive(db, collection, { ...s, battleMode: false }), false);
  // Le Upgraded del mazzo arrivano dalla wave 4
  const { deck } = Regole.buildDeck(db, collection, s, seeded(7));
  const ups = deck.filter(c => c.category === 'Upgraded');
  assert.ok(ups.length > 0);
  ups.forEach(c => assert.equal(Regole.waveOfCode(c.boxCode), '4'));
});

test('mazzo ripetibile con la stessa semente; senza riga (nemesi senza battaglia) mazzo vuoto', () => {
  const s = { players: 3, nemesis: nemeses.find(n => Regole.isPlayable(db, allProducts, n)).name, battleMode: true, mergeCollection: true };
  const a = Regole.buildDeck(db, allProducts, s, seeded(42)).deck.map(c => c.id);
  const b = Regole.buildDeck(db, allProducts, s, seeded(42)).deck.map(c => c.id);
  assert.deepEqual(a, b);
  assert.deepEqual(Regole.buildDeck(db, allProducts, { ...s, nemesis: 'Nessuna' }, seeded(1)), { deck: [], plan: [] });
  assert.equal(Regole.deckShortfall(db, allProducts, { ...s, nemesis: 'Nessuna' }), null);
});

test('nemesi giocabili: prodotto, battaglia, carte Specific e collezione', () => {
  // Collezione vuota: nessuna
  assert.equal(nemeses.filter(n => Regole.isPlayable(db, new Set(), n)).length, 0);
  const playable = nemeses.filter(n => Regole.isPlayable(db, allProducts, n));
  playable.forEach(n => {
    assert.ok(n.boxCode, n.name);
    assert.notEqual(n.battle, null, n.name);
    assert.ok(cards.some(c => c.category === 'Specific' && c.nemesis === n.name), n.name);
  });
  // Le Promo (boxCode null) non sono mai giocabili
  nemeses.filter(n => !n.boxCode).forEach(n => assert.equal(Regole.isPlayable(db, allProducts, n), false, n.name));
  // Con collection null (tutto ammesso) le stesse della collezione completa
  assert.deepEqual(nemeses.filter(n => Regole.isPlayable(db, null, n)).map(n => n.name), playable.map(n => n.name));
  // Con la sola wave 4 solo nemesi della wave 4
  const w4 = new Set(['4', '4.1', '4.2', '4.3']);
  nemeses.filter(n => Regole.isPlayable(db, w4, n)).forEach(n => assert.ok(w4.has(n.boxCode), n.name));
  // Le 7 nemesi di The New Age e le 7 della wave 1 (CONTESTO sezione 7) sono giocabili con la collezione completa
  ['Maggoth', 'Arachnos', 'Ageless Walker', 'Fenrix', 'The Wailing', 'The Wanderer', 'Necroswarm', 'Rageborne',
    'Crooked Mask', 'Horde-Crone', 'Blight Lord', 'Wayward One', 'Carapace Queen', 'Prince of Gluttons']
    .forEach(name => assert.ok(playable.some(n => n.name === name), name));
});

test('codici prodotto: wave e mini espansioni', () => {
  assert.equal(Regole.waveOfCode('4.1'), '4');
  assert.equal(Regole.waveOfCode('4'), '4');
  assert.equal(Regole.waveOfCode(null), null);
  assert.equal(Regole.isMiniCode('4.1'), true);
  assert.equal(Regole.isMiniCode('4'), false);
  assert.equal(Regole.ownsProduct(null, '9'), true);
  assert.equal(Regole.cardAllowed(new Set(['4']), { boxCode: '1' }), false);
  assert.equal(Regole.cardAllowed(new Set(['4']), { boxCode: null }), true);
});
