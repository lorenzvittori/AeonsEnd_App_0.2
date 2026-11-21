// 12-crea-mazzo.js: Creazione del mazzo nemesi e "Crea mazzo" con lo slider. Caricato in ordine da script.js insieme agli altri file di js/ (script classici, variabili globali).
'use strict';

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

