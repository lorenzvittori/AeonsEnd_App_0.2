// 13-pesca-undo-passaggi.js: Passo Pesca, undo sospeso, "Pesca carta", conferma di uscita, dalla pagina iniziale alla partita. Caricato in ordine da script.js insieme agli altri file di js/ (script classici, variabili globali).
'use strict';

// Passo Pesca: una carta coperta parte dal mazzo in alto a sinistra e vola al centro, dove diventa la carta da pescare
// (che resta nascosta finché la copia non arriva). Poi tutto funziona come prima (tocco sul dorso o "Pesca").
const DRAW_IN_MS = 650;
// delay: attesa (ms) prima della partenza, per esempio finché la carta appena scartata non è atterrata
function animateDrawIn(delay = 0) {
  const stage = focusEl.querySelector('.ae-focus-slide--draw .ae-focus-stage');
  const from = dockDeck.getBoundingClientRect();
  if (!stage || !from.width || reducedMotion.matches || !document.body.animate) return;
  // La carta da pescare non deve avere l'animazione di entrata (la sposterebbe): si misura dove starà davvero
  const slide = stage.closest('.ae-focus-slide');
  if (slide) slide.classList.remove('is-entering');
  scrollFocusTo(DRAW_UID, false, true);
  const to = stage.getBoundingClientRect();
  if (!to.width) return;
  stage.style.visibility = 'hidden';
  const ghost = el('div', 'ae-fly-ghost ae-draw-ghost');
  const img = document.createElement('img');
  img.alt = '';
  img.src = CARD_BACK;
  ghost.appendChild(img);
  Object.assign(ghost.style, { left: to.left + 'px', top: to.top + 'px', width: to.width + 'px', height: to.height + 'px' });
  document.body.appendChild(ghost);
  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + to.height / 2);
  const s = from.width / to.width;
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    ghost.remove();
    stage.style.visibility = '';
  };
  const anim = ghost.animate([
    { transform: `translate(${dx}px, ${dy}px) rotate(0deg) scale(${s})`, offset: 0 },
    { transform: `translate(${dx * 0.45}px, ${dy * 0.55 - 40}px) rotate(10deg) scale(${(1 + s) / 2})`, offset: 0.45 },
    { transform: 'translate(0, 0) rotate(0deg) scale(1)', offset: 1 }
  ], { duration: DRAW_IN_MS, delay, easing: 'cubic-bezier(.3, 0, .2, 1)', fill: 'forwards' });
  // Durante l'attesa la copia resta nascosta (il mazzo in alto è già lì)
  ghost.style.visibility = 'hidden';
  setTimeout(() => { if (!done) ghost.style.visibility = ''; }, delay);
  anim.onfinish = finish;
  setTimeout(finish, delay + DRAW_IN_MS + 200);
  lockFor(delay + DRAW_IN_MS);
}

// "Annulla ultima azione" dal Menu: il menu si chiude e resta un pulsante sospeso che si può toccare più volte;
// un tocco fuori dal pulsante (o Esc) chiude e si torna all'app
let undoFloat = null;
function openUndoFloat() {
  closeUndoFloat();
  const layer = el('div', 'ae-undo-float');
  const b = button(I18N_IT.undoAction, 'primary', e => {
    e.stopPropagation();
    undo();
    sync();
  });
  b.classList.add('ae-undo-float-button');
  const sync = () => { b.disabled = undoStack.length === 0 && ui.drafts.size === 0; };
  layer.addEventListener('click', e => { if (e.target === layer) closeUndoFloat(); });
  layer.appendChild(b);
  document.body.appendChild(layer);
  undoFloat = layer;
  sync();
  b.focus({ preventScroll: true });
}
function closeUndoFloat() {
  if (!undoFloat) return;
  undoFloat.remove();
  undoFloat = null;
}

// Tocco sul mazzo in alto: sotto compare "Pesca carta" (un tocco fuori lo chiude). "Pesca carta" apre la carta in cima
// al mazzo in grande con "Rimetti nel mazzo" (resta in cima, nessun cambiamento) e "Scarta" (va negli scarti, un passo
// di undo). Se il mazzo è vuoto il pulsante è disattivato (gli scarti non si rimescolano qui).
let deckPopover = null;
function openDeckPopover() {
  closeDeckPopover();
  const layer = el('div', 'ae-deck-popover');
  const r = dockDeck.getBoundingClientRect();
  const b = button(I18N_IT.drawCard, 'primary', e => {
    e.stopPropagation();
    closeDeckPopover();
    openDeckDraw();
  });
  b.classList.add('ae-deck-popover-button');
  b.disabled = deck.length === 0;
  b.style.left = Math.max(8, r.left) + 'px';
  b.style.top = (r.bottom + 8) + 'px';
  layer.addEventListener('click', e => { if (e.target === layer) closeDeckPopover(); });
  layer.appendChild(b);
  document.body.appendChild(layer);
  deckPopover = layer;
  b.focus({ preventScroll: true });
}
function closeDeckPopover() {
  if (!deckPopover) return;
  deckPopover.remove();
  deckPopover = null;
}

// Conferma di "Esci dalla partita" (v193): Annulla torna al Menu, Esci va al menu iniziale (la partita resta salvata)
function openExitConfirm(onExit) {
  let close = () => {};
  const cancel = () => close();
  const dialog = dialogShell(I18N_IT.exitConfirmTitle, '', cancel, { displayTitle: false });
  dialog.classList.add('ae-exit-confirm');
  dialog.appendChild(el('p', 'ae-modal-text', I18N_IT.exitConfirmText));
  const footer = el('div', 'ae-modal-footer');
  const cancelBtn = button(I18N_IT.cancel, 'secondary', cancel);
  footer.append(cancelBtn, button(I18N_IT.exitConfirm, 'danger', () => { close(); onExit(); }));
  dialog.appendChild(footer);
  close = openModal(dialog, { onCancel: cancel, initialFocus: cancelBtn });
}

function openDeckDraw() {
  const data = deck[deck.length - 1];
  if (!data) return;
  let close = () => {};
  const putBack = () => { close(); showToast(I18N_IT.cardPutBack(data.name)); };
  const dialog = dialogShell(I18N_IT.deckCardTitle, data.name, putBack, { displayTitle: false });
  dialog.classList.add('ae-deck-draw');
  const art = cardArt(data);
  art.classList.add('ae-modal-art');
  const footer = el('div', 'ae-modal-footer');
  const discardBtnEl = button(I18N_IT.discardDrawn, 'danger', () => {
    const source = art.getBoundingClientRect().width ? art : null;
    act(() => { discard.push(deck.pop()); });
    // La carta vola dalla finestra alla pila degli scarti
    if (source) flyToDiscard([source]);
    close();
    render();
    showToast(I18N_IT.cardDiscarded(data.name));
  });
  footer.append(button(I18N_IT.putBack, 'secondary', putBack), discardBtnEl);
  dialog.append(art, footer);
  close = openModal(dialog, { onCancel: putBack });
}

// Dalla pagina iniziale alla partita: la pagina iniziale esce a sinistra e la partita entra da destra
const START_SLIDE_MS = 380;
function slideToGame(then) {
  if (reducedMotion.matches) {
    closeStart();
    if (then) then();
    return;
  }
  // Perché era a scatti: l'animazione partiva nello stesso istante in cui la pagina della partita veniva disegnata
  // e le immagini della creazione del mazzo (dorsi, Specifiche) e lo sfondo si stavano ancora scaricando e
  // decodificando; i primi fotogrammi andavano persi e la pagina "saltava". Ora: prima si aspettano le immagini
  // (al massimo 400 ms), le due pagine diventano livelli separati (will-change), e l'animazione parte un attimo dopo,
  // a disegno finito.
  const images = [CARD_BACK, currentBackground().src,
    ...[1, 2, 3].flatMap(t => specificCardsOf(t).map(c => c.thumb))];
  const ready = Promise.race([Promise.all(images.map(src => loadImage(src))), new Promise(r => setTimeout(r, 400))]);
  startLayer.style.willChange = 'transform';
  app.style.willChange = 'transform';
  ready.then(() => setTimeout(() => {
    void app.offsetWidth;
    startLayer.classList.add('is-sliding-out');
    app.classList.add('is-sliding-in');
    setTimeout(() => {
      startLayer.classList.remove('is-sliding-out');
      app.classList.remove('is-sliding-in');
      startLayer.style.willChange = '';
      app.style.willChange = '';
      closeStart();
      if (then) then();
    }, START_SLIDE_MS);
  }, 30));
}

