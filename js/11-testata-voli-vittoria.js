// 11-testata-voli-vittoria.js: Testata (mazzo e scarti), volo verso gli scarti, passaggio tra i turni, vittoria e statistiche. Caricato in ordine da script.js insieme agli altri file di js/ (script classici, variabili globali).
'use strict';

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

