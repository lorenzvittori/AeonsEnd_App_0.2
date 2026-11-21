// 10-mazzo-turni.js: Mazzo dei turni: finestra unica e finestra "Chi gioca questo turno?". Caricato in ordine da script.js insieme agli altri file di js/ (script classici, variabili globali).
'use strict';

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
  shuffle(d) { d.left = shuffle(d.left); d.known = d.left.map(() => false); if (d.old) d.old = d.left.map(() => false); }
};
// v224: carta del mazzo che si può spostare: nota e, se era già nota all'apertura della finestra (d.old, scurita),
// solo quando è in cima
function turnDeckMovable(d, i) {
  return !!d.known[i] && (!(d.old && d.old[i]) || i === 0);
}

// Scrive la bozza nel mazzo dei turni: un solo passo di undo (v222: il turno in corso continua sempre)
function saveTurnDraft(d) {
  act(() => {
    turnOrder.left = d.left.slice();
    turnOrder.known = d.known.slice();
    turnOrder.drawn = d.drawn.slice();
    turnOrder.picks = JSON.parse(JSON.stringify(d.picks));
    turnOrder.pairNext = emptyPairNext(d.pairNext);
    turnOrder.history = JSON.parse(JSON.stringify(d.history || []));
  });
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

  // Parte alta: mazzo a ventaglio (a destra la cima, a sinistra il fondo)
  const deckHead = el('div', 'ae-turn-screen-head');
  const revealAll = el('button', 'ae-turn-eye ae-turn-eye--all');
  revealAll.type = 'button';
  revealAll.setAttribute('aria-label', I18N_IT.turnRevealAllLabel);
  const revealAllText = el('span', '', I18N_IT.turnRevealAll);
  revealAll.append(icon('eye'), revealAllText);
  // v222: con tutto il mazzo scoperto il pulsante diventa "Copri tutto"
  const allKnown = () => d.left.length > 0 && d.known.every(Boolean);
  revealAll.addEventListener('click', () => {
    if (allKnown()) turnDraftOps.coverAll(d); else turnDraftOps.revealAll(d);
    draw();
  });
  deckHead.append(el('h3', 'ae-turn-subtitle', I18N_IT.turnDeckLabel), revealAll);
  const fanRow = el('div', 'ae-turn-fan-row');
  const zoneBottom = el('button', 'ae-turn-zone ae-turn-zone--bottom', I18N_IT.turnBottomEnd);
  const zoneTop = el('button', 'ae-turn-zone ae-turn-zone--top', I18N_IT.turnTopEnd);
  zoneBottom.type = zoneTop.type = 'button';
  zoneBottom.dataset.zone = 'bottom';
  zoneTop.dataset.zone = 'top';
  zoneBottom.setAttribute('aria-label', I18N_IT.turnZoneBottom);
  zoneTop.setAttribute('aria-label', I18N_IT.turnZoneTop);
  const fan = el('div', 'ae-turn-fan');
  const revealTop = el('button', 'ae-turn-eye ae-turn-eye--top');
  revealTop.type = 'button';
  revealTop.setAttribute('aria-label', I18N_IT.turnRevealTopLabel);
  revealTop.appendChild(icon('eye'));
  revealTop.addEventListener('click', () => { turnDraftOps.revealTop(d); draw(); });
  // v224: segmento verticale dove cadrà la carta trascinata dagli scarti (come tra le slide di Canva), anche ai due capi
  const insertBar = el('span', 'ae-turn-insert');
  insertBar.setAttribute('aria-hidden', 'true');
  insertBar.hidden = true;
  fanRow.append(zoneBottom, fan, zoneTop);
  [zoneBottom, zoneTop].forEach(z => z.addEventListener('click', () => {
    if (!sel || z.disabled) return;
    dropOn({ type: z.dataset.zone }, sel);
  }));

  // Parte bassa: scarti dei turni, da sinistra a destra; l'ultima è il turno in corso
  const pileRow = el('div', 'ae-turn-pile-row');
  const hint = el('p', 'ae-turn-hint', I18N_IT.turnHint);
  hint.setAttribute('aria-live', 'polite');

  // v224: Mescola sotto il mazzo, al centro (prima in basso); "Salva modifiche" non c'è più
  const shuffleRow = el('div', 'ae-turn-shuffle-row');
  const shuffleBtn = el('button', 'ae-turn-eye ae-turn-shuffle', I18N_IT.turnShuffleDeck);
  shuffleBtn.type = 'button';
  shuffleBtn.addEventListener('click', runShuffle);
  shuffleRow.appendChild(shuffleBtn);
  const footer = el('div', 'ae-turn-screen-footer');
  const resetBtn = button(I18N_IT.turnResetAll, 'secondary', () => {
    if (drag || shuffling) return;
    d = fresh(initial);
    d.old = initial.old.slice();
    sel = null;
    draw();
  });
  footer.append(resetBtn);
  sheet.append(deckHead, fanRow, shuffleRow, el('h3', 'ae-turn-subtitle', I18N_IT.turnPileLabel), pileRow, hint, footer);

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
    fan.replaceChildren(...fanEls);
    if (!n) fan.appendChild(el('span', 'ae-turn-fan-empty', I18N_IT.turnDeckEmpty));
    revealTop.hidden = !n || d.known[0];
    fan.appendChild(revealTop);
    insertBar.hidden = true;
    fan.appendChild(insertBar);
    revealAll.disabled = !n;
    revealAllText.textContent = allKnown() ? I18N_IT.turnCoverAll : I18N_IT.turnRevealAll;
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
    pileRow.replaceChildren(...(pileEls.length ? pileEls : [el('span', 'ae-turn-pile-empty', I18N_IT.turnPileEmpty)]));
    pileEls = pileEls.map(slot => slot.firstChild);
    [...fanEls, ...pileEls].forEach(c => {
      if (!c.classList.contains('is-movable')) return;
      c.addEventListener('pointerdown', onPointerDown);
      c.addEventListener('click', onCardClick);
    });
    fanEls.forEach(c => { if (!c.classList.contains('is-movable')) c.addEventListener('click', onCardClick); });
    shuffleBtn.disabled = n < 2 && !d.known.some(Boolean);
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
  // Posizioni del ventaglio: order = indici di d.left nell'ordine da mostrare (dalla cima); la cima va a destra.
  // slots: posti nel ventaglio (uno in più, con un buco, mentre si trascina dentro una carta degli scarti).
  // v212: le carte restano sempre sovrapposte (passo al massimo il 62% della carta), anche quando sono poche
  function fanGeometry(slots = d.left.length) {
    const n = slots;
    const width = fan.clientWidth || 240;
    const w = Math.min(64, Math.max(40, Math.floor(width / 4.4)));
    const step = n > 1 ? Math.min(w * 0.62, (width - w) / (n - 1)) : 0;
    const offset = (width - (w + (n - 1) * step)) / 2;
    return { n, w, step, offset, h: w * 88 / 63 };
  }
  // order può contenere -1: il posto vuoto dove cadrà la carta trascinata dagli scarti
  function layoutFan(order = d.left.map((k, i) => i), lifted = -1) {
    const g = fanGeometry(order.length);
    fan.style.setProperty('--ae-turn-w', g.w + 'px');
    fan.style.setProperty('--ae-fan-h', g.h + 'px');
    const mid = (g.n - 1) / 2;
    insertBar.hidden = !order.includes(-1);
    order.forEach((idx, k) => {
      const v = g.n - 1 - k;
      if (idx === -1) {
        // al centro del posto vuoto, dritto, poco più alto della carta
        insertBar.style.left = (g.offset + v * g.step + g.w / 2 - 2) + 'px';
        insertBar.style.height = (g.h + 16) + 'px';
        insertBar.style.top = `calc(var(--ae-fan-top) - 8px + ${Math.pow(v - mid, 2) * 1.5}px)`;
        return;
      }
      const card = idx >= 0 ? fanEls[idx] : null;
      if (!card) return;
      card.style.left = (g.offset + v * g.step) + 'px';
      card.style.setProperty('--ae-fan-rot', ((v - mid) * 5) + 'deg');
      card.style.setProperty('--ae-fan-y', (Math.pow(v - mid, 2) * 1.5) + 'px');
      card.style.zIndex = String(1 + v);
      card.classList.toggle('is-lifted', idx === lifted);
      // v212: l'occhio sta sopra la carta in cima (al suo centro, con la stessa inclinazione)
      if (idx === 0) {
        // (44 x 44 con il centro al centro della carta; style.css ruota l'occhio attorno allo stesso punto della carta)
        revealTop.style.left = (g.offset + v * g.step + g.w / 2 - 22) + 'px';
        revealTop.style.top = `calc(var(--ae-fan-top) + ${g.h / 2 - 22}px)`;
        revealTop.style.setProperty('--ae-fan-rot', ((v - mid) * 5) + 'deg');
        revealTop.style.setProperty('--ae-fan-y', (Math.pow(v - mid, 2) * 1.5) + 'px');
        revealTop.style.zIndex = String(2 + g.n);
      }
    });
  }
  // Posto nel ventaglio sotto il dito (0 = cima) su slots posti
  function fanSlotAt(x, slots) {
    const g = fanGeometry(slots);
    const v = Math.max(0, Math.min(g.n - 1, Math.round((x - fan.getBoundingClientRect().left - g.offset - g.w / 2) / (g.step || 1))));
    return g.n - 1 - v;
  }

  // Destinazioni permesse per la carta s (solo quelle si evidenziano): zone Cima e Fondo e, v212, la rosa anche per le
  // carte degli scarti
  function markTargets(s) {
    const any = !!s;
    zoneTop.classList.toggle('is-target', any);
    zoneBottom.classList.toggle('is-target', any);
    zoneTop.disabled = zoneBottom.disabled = !any;
    fan.classList.toggle('is-target', any);
    dialog.classList.toggle('is-choosing', any);
  }
  function dropOn(target, s) {
    let ok = false;
    if (s.source === 'deck') {
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
    if (sel && source === 'deck') { dropOn({ type: 'pos', index }, sel); return; }
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
    ghost.classList.remove('is-old');
    ghost.removeAttribute('id');
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
    // La carta si porta ovunque nello schermo; il rilascio riesce solo su una destinazione valida: zone Cima e Fondo,
    // rosa delle carte (v212 anche per le carte degli scarti). v222: conta dove sta la carta (il suo centro, sopra il
    // dito), non il dito
    const x = e.clientX - drag.dx + drag.w / 2;
    const y = e.clientY - drag.dy + drag.h / 2;
    const fromPile = drag.source === 'pile';
    let target = null;
    if (hit(zoneTop.getBoundingClientRect(), x, y)) target = { type: 'top' };
    else if (hit(zoneBottom.getBoundingClientRect(), x, y)) target = { type: 'bottom' };
    else if (hit(fan.getBoundingClientRect(), x, y, 24)) {
      target = { type: 'pos', index: fanSlotAt(x, d.left.length + (fromPile ? 1 : 0)) };
    }
    drag.target = target;
    zoneTop.classList.toggle('is-over', !!target && target.type === 'top');
    zoneBottom.classList.toggle('is-over', !!target && target.type === 'bottom');
    fan.classList.toggle('is-over', !!target && target.type === 'pos');
    // Anteprima nel mazzo: le altre carte si spostano per fare posto (carta degli scarti: un posto vuoto, -1)
    const order = d.left.map((k, i) => i);
    if (!fromPile) {
      const to = !target ? drag.index : target.type === 'top' ? 0 : target.type === 'bottom' ? d.left.length - 1 : target.index;
      order.splice(order.indexOf(drag.index), 1);
      order.splice(to, 0, drag.index);
      layoutFan(order, drag.index);
    } else {
      if (target) order.splice(target.type === 'top' ? 0 : target.type === 'bottom' ? order.length : target.index, 0, -1);
      layoutFan(order);
    }
  }
  function endDrag(apply) {
    stopListening();
    if (press) press = null;
    if (!drag) return;
    const { source, index, target, ghost } = drag;
    ghost.remove();
    drag = null;
    dialog.classList.remove('is-dragging', 'is-dragging-deck', 'is-dragging-pile');
    zoneTop.classList.remove('is-over');
    zoneBottom.classList.remove('is-over');
    fan.classList.remove('is-over');
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
    const g = fanGeometry();
    const animate = !reducedMotion.matches && !!fan.animate && fanEls.length > 1;
    if (!animate) { turnDraftOps.shuffle(d); sel = null; draw(); return; }
    shuffling = true;
    dialog.classList.add('is-shuffling');
    const cx = g.offset + (g.n - 1) * g.step / 2;
    const toCenter = c => (cx - parseFloat(c.style.left)) + 'px';
    // v225: anche l'inclinazione e l'arco del ventaglio si animano: al centro le carte sono tutte dritte
    const fanT = c => `translateY(${c.style.getPropertyValue('--ae-fan-y') || '0px'}) rotate(${c.style.getPropertyValue('--ae-fan-rot') || '0deg'})`;
    const gather = fanEls.map(c => c.animate([{ translate: '0 0', transform: fanT(c) },
      { translate: toCenter(c) + ' 0', transform: 'translateY(0px) rotate(0deg)' }],
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
        const flat = 'translateY(0px) rotate(0deg)';
        return c.animate([
          { translate: dx + ' 0', transform: flat, offset: 0 }, { translate: off, transform: flat, offset: .16 },
          { translate: dx + ' 0', transform: flat, offset: .32 }, { translate: off, transform: flat, offset: .48 },
          { translate: dx + ' 0', transform: flat, offset: .64 }, { translate: '0 0', transform: fanT(c), offset: 1 }
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
    turnScreen = null;
    close();
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

