// 14-menu-sfondo-rete.js: Sfondo, menu laterale, dorso delle carte, pulsanti del menu, schermo acceso, immagini per l'uso senza rete. Caricato in ordine da script.js insieme agli altri file di js/ (script classici, variabili globali).
'use strict';

// Sfondo dell'app (maga a sinistra, nemesi a destra): si sceglie nel Menu, la scelta resta salvata nel browser.
// Non fa parte della partita (niente undo).
const BACKGROUND_KEY = 'aeonsend-app-0.2-background';
const BACKGROUNDS = [
  { id: 'masked', src: 'Assets/ui/decor/battle-bg.webp' },
  { id: 'horned', src: 'Assets/ui/decor/battle-bg-2.webp' },
  { id: 'maw', src: 'Assets/ui/decor/battle-bg-3.webp' }
];
function currentBackground() {
  let id = null;
  try { id = localStorage.getItem(BACKGROUND_KEY); } catch (err) { /* si usa quello predefinito */ }
  return BACKGROUNDS.find(b => b.id === id) || BACKGROUNDS[0];
}
function applyBackground() {
  app.style.setProperty('--ae-battle-bg', `url("${currentBackground().src}")`);
}
function setBackground(id) {
  try { localStorage.setItem(BACKGROUND_KEY, id); } catch (err) { console.warn(err); }
  applyBackground();
}
applyBackground();

// v224: leave (facoltativo) = cosa chiudere prima di una voce che porta altrove (Menu aperto dalla finestra del mazzo
// dei turni: la finestra si chiude prima di undo, scarti, vittoria, esci, ricomincia)
function openSideMenu(leave) {
  if (ui.isTransitioning) return;
  let close = () => {};
  const cancel = () => close();
  const go = () => { close(); if (typeof leave === 'function') leave(); };
  const panel = dialogShell(I18N_IT.menu, '', cancel, { displayTitle: false });
  panel.classList.add('ae-side-menu');
  const statsList = el('dl', 'ae-side-stats');
  statsList.append(el('dt', '', I18N_IT.menuTurn), el('dd', '', String(turn)),
    el('dt', '', I18N_IT.menuDeck), el('dd', '', String(deck.length)));
  // Sfondo: anteprima dello sfondo scelto con il nome; si tocca per scegliere tra le anteprime di tutti gli sfondi
  const bgRow = el('div', 'ae-side-field ae-side-field--row');
  bgRow.append(el('span', 'ae-side-field-label', I18N_IT.background), backgroundChoiceButton(null, { compact: true }));
  // Dorso delle carte: miniatura del dorso scelto con il nome; si tocca per scegliere tra tutti i dorsi
  const backRow = el('div', 'ae-side-field ae-side-field--row');
  backRow.append(el('span', 'ae-side-field-label', I18N_IT.cardBack), cardBackChoiceButton(null, { compact: true }));
  const discardOpen = button(I18N_IT.discardButton(discard.length), 'secondary', () => { go(); openDiscard(); });
  discardOpen.classList.add('ae-button--full');
  discardOpen.setAttribute('aria-label', I18N_IT.discardButtonLabel(discard.length));
  // Nemesi uccisa al tavolo (vita a 0): si va alla schermata Vittoria; la partita non cambia (Chiudi torna indietro)
  const killed = button(I18N_IT.nemesisKilled, 'secondary', () => { go(); showVictory(); });
  killed.classList.add('ae-button--full');
  // Esci dalla partita (rosso): finestra di conferma (v193, prima andava tenuto premuto), poi il menu iniziale
  // (Modalità test, v215: "Esci dal test")
  const exit = button(testRun ? I18N_IT.testExit : I18N_IT.exitGame, 'danger', () => openExitConfirm(() => { go(); openStart(); }));
  exit.classList.add('ae-button--full', 'ae-side-exit', 'ae-hold-exit');
  // Undo: annulla l'ultima azione (prima le modifiche non salvate)
  const undoItem = button(I18N_IT.undoAction, 'secondary', () => { go(); undo(); openUndoFloat(); });
  undoItem.classList.add('ae-button--full');
  undoItem.disabled = undoStack.length === 0 && ui.drafts.size === 0;
  const items = [statsList, undoItem, discardOpen, killed];
  // Durante "Crea mazzo": Ricomincia la partita (mazzo nuovo con la stessa nemesi e gli stessi giocatori)
  if (ui.deckBuilding) {
    const restart = button(I18N_IT.restartGame, 'secondary', () => { go(); rebuildDeck(); });
    restart.classList.add('ae-button--full');
    items.splice(1, 0, restart);
  }
  // Modalità test (v215): "Ricomincia lo scenario" (di nuovo dallo stato iniziale, undo vuoto)
  if (testRun) {
    const restartTest = button(I18N_IT.testRestart, 'secondary', () => { go(); restartScenario(); });
    restartTest.classList.add('ae-button--full', 'ae-side-test-restart');
    items.splice(1, 0, restartTest);
  }
  panel.append(...items, bgRow, backRow, exit);
  close = openModal(panel, { onCancel: cancel });
  panel.parentElement.classList.add('ae-modal-backdrop--side');
  swipeToClose(panel, cancel);
  menuCloseToggle(menuBtn, panel.parentElement, cancel);
}
// (riga spostata qui dalla sezione 9 "Eventi": usa una funzione dichiarata sopra in questo file; dal file
// precedente darebbe errore, perché tra file diversi le funzioni non sono sollevate)
menuBtn.addEventListener('click', openSideMenu);

// Scelta del dorso delle carte: griglia di miniature; un tocco sceglie il dorso, lo applica subito e chiude
// Pulsante con la miniatura e il nome del dorso scelto: apre la griglia dei dorsi (Menu della partita e Opzioni)
// compact: solo la miniatura, senza nome (il nome resta per i lettori di schermo)
function cardBackChoiceButton(onClosed, { compact = false } = {}) {
  const btn = el('button', 'ae-back-choice' + (compact ? ' ae-back-choice--compact' : ''));
  btn.type = 'button';
  const thumb = el('img', 'ae-back-choice-thumb');
  thumb.alt = '';
  const name = el('span', 'ae-back-choice-name');
  const sync = () => {
    const b = currentCardBack();
    thumb.src = b.thumb;
    name.textContent = I18N_IT.cardBacks[b.id];
    btn.setAttribute('aria-label', I18N_IT.cardBackChosen(I18N_IT.cardBacks[b.id]));
  };
  btn.append(thumb, name);
  btn.addEventListener('click', () => openCardBackPicker(sync, onClosed));
  sync();
  return btn;
}

// Pulsante con l'anteprima e il nome dello sfondo scelto: apre la scelta con le anteprime (Menu della partita e Opzioni)
// compact: solo l'anteprima, senza nome (il nome resta per i lettori di schermo)
function backgroundChoiceButton(onClosed, { compact = false } = {}) {
  const btn = el('button', 'ae-bg-choice' + (compact ? ' ae-bg-choice--compact' : ''));
  btn.type = 'button';
  const thumb = el('img', 'ae-bg-choice-thumb');
  thumb.alt = '';
  const name = el('span', 'ae-bg-choice-name');
  const sync = () => {
    const b = currentBackground();
    thumb.src = b.src;
    name.textContent = I18N_IT.backgrounds[b.id];
    btn.setAttribute('aria-label', I18N_IT.backgroundChosen(I18N_IT.backgrounds[b.id]));
  };
  btn.append(thumb, name);
  btn.addEventListener('click', () => openBackgroundPicker(sync, onClosed));
  sync();
  return btn;
}

// Scelta dello sfondo: le anteprime di tutti gli sfondi una sotto l'altra; un tocco lo applica subito e chiude
function openBackgroundPicker(onChosen, onClosed) {
  let closeModalFn = () => {};
  const close = () => { closeModalFn(); if (onClosed) onClosed(); };
  const dialog = dialogShell(I18N_IT.background, '', close, { displayTitle: false });
  dialog.classList.add('ae-bg-picker');
  const list = el('div', 'ae-bg-grid');
  const chosen = currentBackground().id;
  BACKGROUNDS.forEach(b => {
    const item = el('button', 'ae-bg-item');
    item.type = 'button';
    item.setAttribute('aria-pressed', String(b.id === chosen));
    const img = el('img');
    img.alt = '';
    img.src = b.src;
    item.append(img, el('span', 'ae-bg-item-name', I18N_IT.backgrounds[b.id]));
    item.addEventListener('click', () => {
      setBackground(b.id);
      close();
      if (onChosen) onChosen();
    });
    list.appendChild(item);
  });
  const footer = el('div', 'ae-modal-footer');
  footer.appendChild(button(I18N_IT.close, 'secondary', close));
  dialog.append(list, footer);
  closeModalFn = openModal(dialog, { onCancel: close, initialFocus: list.querySelector('[aria-pressed="true"]') });
}

// onClosed: dopo la chiusura, in ogni caso (le Opzioni lo usano per tenere la pagina iniziale coperta)
function openCardBackPicker(onChosen, onClosed) {
  let closeModalFn = () => {};
  const close = () => { closeModalFn(); if (onClosed) onClosed(); };
  const cancel = () => close();
  const dialog = dialogShell(I18N_IT.cardBack, '', cancel, { displayTitle: false });
  dialog.classList.add('ae-back-picker');
  const grid = el('div', 'ae-back-grid');
  const chosen = currentCardBack().id;
  CARD_BACKS.forEach(b => {
    const item = el('button', 'ae-back-item');
    item.type = 'button';
    item.setAttribute('aria-pressed', String(b.id === chosen));
    const img = el('img');
    img.alt = '';
    img.loading = 'lazy';
    img.src = b.thumb;
    item.append(img, el('span', 'ae-back-item-name', I18N_IT.cardBacks[b.id]));
    item.addEventListener('click', () => {
      setCardBack(b.id);
      close();
      if (onChosen) onChosen();
      // Il carosello si ridisegna anche se non è cambiato niente, così il dorso da pescare prende quello nuovo
      focusSignature = '';
      if (startLayer.hidden) render();
    });
    grid.appendChild(item);
  });
  const footer = el('div', 'ae-modal-footer');
  footer.appendChild(button(I18N_IT.close, 'secondary', cancel));
  dialog.append(grid, footer);
  closeModalFn = openModal(dialog, { onCancel: cancel, initialFocus: grid.querySelector('[aria-pressed="true"]') });
}

// Pulsante Menu aperto: sopra il menu, nello stesso punto del pulsante, le tre linee diventano una X (animazione
// classica "hamburger → X": la linea centrale sparisce, le altre due ruotano di 45°). Toccando la X le linee tornano e il
// menu si chiude. Il pulsante vero resta sotto l'oscuramento.
function menuCloseToggle(source, backdrop, close) {
  const r = source.getBoundingClientRect();
  if (!r.width) return;
  const x = el('button', 'ae-icon-button ae-menu-button ae-menu-toggle');
  x.type = 'button';
  x.setAttribute('aria-label', I18N_IT.close);
  x.appendChild(el('span', 'ae-menu-lines'));
  Object.assign(x.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  x.addEventListener('click', e => {
    e.stopPropagation();
    x.classList.remove('is-open');
    setTimeout(close, reducedMotion.matches ? 0 : 180);
  });
  backdrop.appendChild(x);
  void x.offsetWidth;
  setTimeout(() => x.classList.add('is-open'), 20);
}

// Pulsante da tenere premuto (ms): si riempie da sinistra (CSS .is-holding); lasciando prima si annulla e si chiama
// onShort (per esempio un avviso). Da tastiera (Invio, clic senza puntatore) vale subito.
const HOLD_EXIT_MS = 900;
function holdToConfirm(btn, ms, onDone, onShort) {
  let timer = null;
  let fired = false;
  btn.classList.add('is-hold-action');
  btn.style.setProperty('--ae-hold-ms', ms + 'ms');
  const cancel = () => {
    clearTimeout(timer);
    timer = null;
    btn.classList.remove('is-holding');
  };
  btn.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    fired = false;
    cancel();
    void btn.offsetWidth;
    btn.classList.add('is-holding');
    timer = setTimeout(() => {
      timer = null;
      fired = true;
      buzz(30);
      onDone();
    }, ms);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => btn.addEventListener(t, () => {
    if (!timer) return;
    cancel();
    if (t === 'pointerup' && onShort) onShort();
  }));
  btn.addEventListener('click', e => {
    if (e.detail === 0 && !fired) onDone();
  });
  btn.addEventListener('contextmenu', e => e.preventDefault());
}

// Menu laterale: trascinandolo verso destra segue il dito; oltre un terzo della larghezza (o con uno scatto) si chiude
function swipeToClose(panel, close) {
  let start = null;
  const reset = () => {
    panel.style.transition = 'transform .18s ease-out';
    panel.style.transform = '';
    start = null;
  };
  panel.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' || e.target.closest('select')) return;
    start = { x: e.clientX, y: e.clientY, t: Date.now(), dragging: false };
  });
  panel.addEventListener('pointermove', e => {
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (!start.dragging) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { start = null; return; }
      if (dx < 10) return;
      start.dragging = true;
      panel.style.transition = 'none';
      try { panel.setPointerCapture(e.pointerId); } catch (err) { /* niente cattura */ }
    }
    panel.style.transform = `translateX(${Math.max(0, dx)}px)`;
  });
  let dragged = false;
  const end = e => {
    if (!start) return;
    if (!start.dragging) { start = null; return; }
    dragged = true;
    setTimeout(() => { dragged = false; }, 0);
    const dx = e.clientX - start.x;
    const fast = dx > 40 && Date.now() - start.t < 250;
    if (dx > panel.offsetWidth / 3 || fast) {
      start = null;
      // Il pannello esce a destra, poi si chiude
      panel.style.transition = 'transform .15s ease-in';
      panel.style.transform = 'translateX(100%)';
      setTimeout(close, 150);
    } else reset();
  };
  panel.addEventListener('pointerup', end);
  panel.addEventListener('pointercancel', () => { if (start) reset(); });
  // Un trascinamento non deve diventare un tocco sui pulsanti del menu
  panel.addEventListener('click', e => { if (dragged) { e.stopPropagation(); e.preventDefault(); } }, true);
}
startBtn.addEventListener('click', onStartClick);
resumeBtn.addEventListener('click', resumeGame);
undoBtn.addEventListener('click', undo);
nemesisBtn.addEventListener('click', onNemesisClick);
// Turno giocatori con modifiche non salvate: "Annulla modifiche" accanto a "Salva modifiche" (stessa riga) toglie tutte
// le bozze (vita dei minion, costi pagati); non è un passo di undo, perché le bozze non sono ancora nella partita
cancelDraftsBtn = el('button', 'ae-button ae-button--secondary ae-cancel-drafts', I18N_IT.cancelChanges);
cancelDraftsBtn.type = 'button';
cancelDraftsBtn.hidden = true;
{
  const row = el('div', 'ae-main-row');
  nemesisBtn.before(row);
  deckSlider = buildDeckSlider();
  row.append(cancelDraftsBtn, nemesisBtn, deckSlider.box);
}
cancelDraftsBtn.addEventListener('click', () => {
  if (resolving || ui.isTransitioning || !ui.drafts.size) return;
  ui.drafts.clear();
  render();
  nemesisBtn.focus({ preventScroll: true });
});
resolveBtn.addEventListener('click', onResolveClick);
backBtn.addEventListener('click', backToActive);
// Interruttore "Includi carte base potenziate" tolto: si toglie anche da un index.html vecchio in cache
{
  const upgradedRow = document.getElementById('upgraded-switch');
  if (upgradedRow && upgradedRow.closest('.ae-switch-row')) upgradedRow.closest('.ae-switch-row').remove();
}
window.addEventListener('resize', () => { sizeFocus(); sizeQueue(); });
// Desktop: la rotella del mouse (verticale) scorre le carte grandi e le fasce piccole, che vanno in orizzontale
[focusEl, queueViewport, rail].forEach(c => c.addEventListener('wheel', e => {
  if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || c.scrollWidth <= c.clientWidth + 1) return;
  e.preventDefault();
  c.scrollBy({ left: e.deltaY, behavior: 'auto' });
}, { passive: false }));
// Se lo spazio della carta grande cambia per altri motivi (font caricato, pulsanti del dock), si ridimensiona subito
if (window.ResizeObserver) {
  new ResizeObserver(() => sizeFocus()).observe(focusEl);
  new ResizeObserver(() => sizeQueue()).observe(queueViewport);
}

// Schermo sempre acceso finché l'app è aperta e visibile (Screen Wake Lock). Il browser lo toglie da solo quando la
// pagina va in secondo piano: si richiede di nuovo al ritorno e, se il browser lo vuole dopo un tocco, al primo tocco.
let wakeLock = null;
async function keepScreenOn() {
  if (!('wakeLock' in navigator) || wakeLock || document.visibilityState !== 'visible') return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch (err) { wakeLock = null; }
}
document.addEventListener('visibilitychange', keepScreenOn);
document.addEventListener('pointerdown', keepScreenOn, { passive: true });
keepScreenOn();

// Senza rete: il service worker (sw.js) salva codice, dati e immagini già viste. All'inizio della partita si scaricano
// anche le immagini di tutte le carte del mazzo, così le carte pescate più avanti si vedono anche se la rete cade
// (una volta sola: poi sono già salvate). Niente download in anticipo con "Risparmio dati" attivo.
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(err => console.warn(err));
}
async function prefetchDeckImages() {
  if (!('caches' in window) || !navigator.serviceWorker || !navigator.serviceWorker.controller) return;
  if (navigator.connection && navigator.connection.saveData) return;
  const urls = [...new Set(deck.concat(queue.map(e => e.data), discard).flatMap(d => [d.image, d.thumb]).filter(Boolean))];
  const todo = [];
  for (const u of urls) if (!(await caches.match(u))) todo.push(u);
  // Tre alla volta, per non rallentare le immagini che servono subito
  const next = async () => {
    while (todo.length) {
      try { await fetch(todo.shift()); } catch (err) { /* senza rete: si riprova alla prossima partita */ }
    }
  };
  await Promise.all([next(), next(), next()]);
}

