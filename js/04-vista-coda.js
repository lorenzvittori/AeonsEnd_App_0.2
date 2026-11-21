// 04-vista-coda.js: VistaCoda: coda, ancoraggio dello scorrimento, carta della coda (punti vita in bozza, rimozione del potere). Caricato in ordine da script.js insieme agli altri file di js/ (script classici, variabili globali).
'use strict';

// --- 4. VistaCoda -------------------------------------------------------------------------------------------------

function updateInfo() {
  turnInfo.textContent = I18N_IT.turnInfo(turn, deck.length);
  discardBtn.textContent = I18N_IT.discardButton(discard.length);
  discardBtn.setAttribute('aria-label', I18N_IT.discardButtonLabel(discard.length));
}

// VistaCoda: in alto la fascia compatta con tutta la coda (come nel turno nemesi), sotto le carte grandi, una e mezza
// alla volta. Toccare una carta della fascia porta lì le carte grandi; la carta più al centro è quella evidenziata.
let queueRail = null;
function ensureQueueRail() {
  if (queueRail) return queueRail;
  queueRail = el('div', 'ae-compact-rail queue-rail');
  queueRail.id = 'queue-rail';
  queueRail.setAttribute('role', 'list');
  queueRail.setAttribute('aria-label', I18N_IT.queueRail);
  queueView.querySelector('.queue-col').prepend(queueRail);
  trackDrag(queueRail);
  queueRail.addEventListener('click', e => {
    const item = e.target.closest('.ae-queue-item');
    if (!item || queueRail.dataset.dragged === '1') return;
    const big = queueList.querySelector(`[data-uid="${item.dataset.uid}"]`);
    if (big) scrollQueueTo(big);
    markQueueRail(Number(item.dataset.uid));
  });
  queueViewport.addEventListener('scroll', () => {
    if (queueRailFrame) return;
    queueRailFrame = requestAnimationFrame(() => { queueRailFrame = 0; markQueueRail(centredQueueUid()); });
  }, { passive: true });
  return queueRail;
}
let queueRailFrame = 0;

function scrollQueueTo(item) {
  const cRect = queueViewport.getBoundingClientRect();
  const iRect = item.getBoundingClientRect();
  const left = iRect.left - cRect.left + queueViewport.scrollLeft + iRect.width / 2 - queueViewport.clientWidth / 2;
  fastScrollTo(queueViewport, left);
}

// Scorrimento orizzontale animato più veloce di quello del browser (circa il 50% in più: FAST_SCROLL_MS). Durante
// l'animazione lo scroll-snap è spento, altrimenti il browser riaggancerebbe la carta a ogni passo; un dito sul
// contenitore la interrompe. Con "riduci movimento" salta subito.
const FAST_SCROLL_MS = 260;
const scrollJobs = new WeakMap();
const scrollJobWatched = new WeakSet();
function cancelFastScroll(container) {
  const job = scrollJobs.get(container);
  if (!job) return;
  job.cancelled = true;
  scrollJobs.delete(container);
  container.style.scrollSnapType = '';
}
function fastScrollTo(container, left, ms = FAST_SCROLL_MS) {
  const to = Math.max(0, Math.min(container.scrollWidth - container.clientWidth, left));
  // Stessa meta di un'animazione già in corso (ridisegni, ridimensionamenti): la si lascia finire
  const running = scrollJobs.get(container);
  if (running && Math.abs(running.to - to) < 1) return;
  cancelFastScroll(container);
  const from = container.scrollLeft;
  if (Math.abs(to - from) < 1 || reducedMotion.matches) { container.scrollLeft = to; return; }
  if (!scrollJobWatched.has(container)) {
    scrollJobWatched.add(container);
    container.addEventListener('pointerdown', () => cancelFastScroll(container), { passive: true });
  }
  const job = { cancelled: false, to };
  scrollJobs.set(container, job);
  container.style.scrollSnapType = 'none';
  tween(from, to, ms, v => { if (!job.cancelled) container.scrollLeft = v; }, () => {
    if (job.cancelled) return;
    container.scrollLeft = to;
    cancelFastScroll(container);
  });
}

function centredQueueUid() {
  const cRect = queueViewport.getBoundingClientRect();
  const middle = cRect.left + cRect.width / 2;
  let best = null;
  let bestDist = Infinity;
  queueList.querySelectorAll('.ae-queue-item').forEach(item => {
    const r = item.getBoundingClientRect();
    const d = Math.abs(r.left + r.width / 2 - middle);
    if (d < bestDist) { bestDist = d; best = Number(item.dataset.uid); }
  });
  return best;
}

function markQueueRail(uid) {
  // Comandi (vita del minion, rimozione del potere) solo sulla carta grande al centro (style.css .queue-slot.is-centred)
  queueList.querySelectorAll('.queue-slot').forEach(slot => {
    const item = slot.querySelector('.ae-queue-item');
    slot.classList.toggle('is-centred', !!item && Number(item.dataset.uid) === uid);
  });
  if (!queueRail) return;
  queueRail.querySelectorAll('.ae-queue-item').forEach(item => {
    const on = Number(item.dataset.uid) === uid;
    if (on) item.dataset.viewed = 'true'; else delete item.dataset.viewed;
    if (on) scrollItemInto(queueRail, item, 'nearest');
  });
}

// Comandi sotto la carta grande della VistaCoda, legati a quella carta:
//   minion: −5 −1 +1 (ogni tocco cambia subito la vita, un passo di undo); a 0 compare "Elimina minion"
//   potere rimovibile (TO DISCARD): "Rimuovi · costo pagato"; gli altri poteri non hanno comandi
// La riga c'è sempre (anche vuota), così tutte le carte hanno la stessa dimensione.
function cardControls(entry) {
  const box = el('div', 'queue-controls');
  const uid = entry.uid;
  const ctl = (label, variant, key, aria, handler) => {
    const b = button(label, variant, e => {
      e.stopPropagation();
      // (v200: anche con la scelta del giocatore x/y in sospeso non si toccano le carte)
      if (resolving || ui.isTransitioning || queueViewport.dataset.dragged === '1' || needsPairChoice()) return;
      handler();
    });
    b.dataset.uid = uid;
    b.dataset.ctl = key;
    if (aria) b.setAttribute('aria-label', aria);
    return b;
  };
  const refocus = key => {
    const target = queueList.querySelector(`.queue-controls [data-uid="${uid}"][data-ctl="${key}"]`)
      || queueList.querySelector(`.queue-controls [data-uid="${uid}"]`);
    if (target) target.focus({ preventScroll: true });
  };
  if (hasHp(entry) && entry.hp <= 0 && !hpUnset(entry)) {
    // Minion ucciso (vita 0 salvata): grigio, va negli scarti al prossimo turno nemesi; si torna indietro con Undo
    box.appendChild(el('p', 'queue-note is-paid', I18N_IT.killedNote));
  } else if (hasHp(entry) && hpUnset(entry)) {
    // Minion con vita "?" (v218): al posto di −5 / −1 / +1 un pulsante che apre la scheda della carta (vita da impostare)
    box.appendChild(ctl(I18N_IT.ctaSetHp, 'primary', 'sethp', I18N_IT.setHpOf(entry.data.name), () => openCardDialog(entry)));
  } else if (hasHp(entry)) {
    // I tocchi cambiano una bozza, "Salva" sulla carta la conferma (un passo di undo); a 0 con Salva il minion è ucciso.
    // +1 si può usare solo per rimettere vita tolta in questo turno (fino alla vita di inizio turno): altrimenti è oscurato
    // (v214: minion a vita variabile, si parte da 0 e il +1 non ha tetto)
    const shown = draftHp(entry);
    const cap = hpCap(entry, false);
    [-5, -1, 1].forEach(step => {
      const key = String(step);
      // −5 con il contorno rosso, diverso da −1 e +1: è il tocco sbagliato più costoso
      const b = ctl(step > 0 ? '+' + step : '−' + Math.abs(step), step === -5 ? 'danger' : 'secondary', key,
        (step > 0 ? 'Rimetti ' : 'Togli ') + Math.abs(step) + ' punti vita a ' + entry.data.name, () => {
          const value = Math.min(cap, Math.max(0, draftHp(entry) + step));
          if (value === draftHp(entry)) return;
          setDraft(entry, { hp: value });
          render();
          refocus(key);
        });
      if ((step > 0 && shown >= cap) || (step < 0 && shown <= 0)) { b.disabled = true; b.classList.add('is-dimmed'); }
      box.appendChild(b);
    });
  } else if (entry.data.type === 'Power' && entry.paid) {
    box.appendChild(el('p', 'queue-note is-paid', I18N_IT.paidNote));
  } else if (entry.data.type === 'Power' && entry.data.removable !== false) {
    const d = draftOf(entry);
    if (d && d.paid) {
      box.appendChild(ctl(I18N_IT.cancelPay, 'secondary', 'cancel', null, () => { setDraft(entry, { paid: false }); render(); refocus('remove'); }));
    } else {
      box.appendChild(ctl(I18N_IT.removePowerShort, 'danger', 'remove', I18N_IT.removePower + ': ' + entry.data.name,
        () => { setDraft(entry, { paid: true }); render(); refocus('cancel'); }));
    }
  } else if (entry.data.type === 'Power') {
    // Potere senza "TO DISCARD": nota piccola al posto del pulsante
    // (v205: con il simbolo di divieto al posto del punto esclamativo)
    box.appendChild(el('p', 'queue-note is-locked', I18N_IT.notRemovable));
  }
  return box;
}

// Carte grandi: alte quanto lo spazio disponibile, ma mai così larghe da nascondere del tutto la carta successiva
function sizeQueue() {
  if (queueView.hidden) return;
  sizeColumn(queueViewport);
  const style = getComputedStyle(queueViewport);
  const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  const gap = parseFloat(getComputedStyle(queueList).columnGap) || 18;
  // Stessa regola del carosello del turno nemesi (sizeFocus): la carta riempie l'altezza, ai lati si vede un pezzo delle vicine
  const peekRoom = queue.length > 1 ? 2 * (PEEK_VISIBLE + PEEK_GAP) : 0; // come nel carosello: stessa larghezza della carta
  // Come sizeFocus: sopra la carta il box vita/token (41px) e 8px di spazio. I comandi stanno fuori dal flusso, sotto la
  // carta, così la carta ha la stessa posizione e dimensione del turno nemesi; solo su schermi bassi la si rimpicciolisce
  // quanto basta perché i comandi (52px) restino dentro l'area (il blocco è centrato in verticale).
  const width = Math.max(100, sharedCardWidth(queueViewport.clientWidth, queueViewport.clientHeight, padY, peekRoom));
  queueViewport.style.setProperty('--ae-queue-card', width + 'px');
  // Margini ai lati: la prima e l'ultima carta si centrano come le altre
  const side = Math.max(0, (queueViewport.clientWidth - width) / 2) + 'px';
  queueViewport.style.paddingLeft = side;
  queueViewport.style.paddingRight = side;
  queueViewport.style.scrollPaddingInline = side;
}

function renderQueue() {
  const previous = queueViewport.scrollLeft;
  const previousTop = queueViewport.scrollTop;
  const railEl = ensureQueueRail();
  const railScroll = railEl.scrollLeft;
  railEl.replaceChildren(...queue.map((entry, i) => {
    const item = queueItem(displayEntry(entry), { compact: true, index: i, total: queue.length });
    // Vita del minion in modifica: "HP: −x" anche sulla carta piccola, al centro
    const d = draftOf(entry);
    if (d && d.hp !== undefined) {
      const change = d.hp - entry.hp;
      const tag = el('span', 'queue-hp-tag rail-hp-tag ' + (change < 0 ? 'is-loss' : 'is-gain'), I18N_IT.hpTurnTag(change));
      tag.setAttribute('aria-hidden', 'true');
      item.querySelector('.ae-card-art').appendChild(tag);
    }
    return item;
  }));
  railEl.scrollLeft = railScroll;
  railEl.hidden = queue.length === 0;
  queueList.replaceChildren(...queue.map((entry, i) => {
    // Ogni carta grande con i suoi comandi subito sotto (vita del minion, rimozione del potere)
    const slot = el('div', 'queue-slot');
    slot.setAttribute('role', 'listitem');
    const card = queueItem(displayEntry(entry), { full: true, index: i, total: queue.length, lazy: i > 3 });
    card.removeAttribute('role');
    const d = draftOf(entry);
    if (d && d.hp !== undefined) {
      // Danno in bozza (non ancora salvato), in alto a destra sulla carta: sparisce con "Salva"
      const change = d.hp - entry.hp;
      const tag = el('span', 'queue-hp-tag ' + (change < 0 ? 'is-loss' : 'is-gain'), I18N_IT.hpTurnTag(change));
      tag.setAttribute('aria-hidden', 'true');
      card.querySelector('.ae-card-art').appendChild(tag);
    }
    slot.append(card, cardControls(entry));
    // Le modifiche si salvano tutte insieme con "Salva modifiche" (il pulsante principale)
    return slot;
  }));
  queueEmpty.hidden = queue.length > 0;
  // Suggerimento solo prima del primo turno nemesi (v194: non più "Premi «Turno Nemesi» per pescare")
  const emptyHint = queueEmpty.querySelector('p');
  if (emptyHint) {
    emptyHint.hidden = turn > 0;
    emptyHint.textContent = awaitingTurnCard() ? I18N_IT.emptyHintStart : I18N_IT.emptyHintWait;
  }
  sizeQueue();

  const anchor = ui.queueAnchor;
  ui.queueAnchor = null;
  if (queue.length === 0) {
    queueViewport.scrollLeft = 0;
    queueViewport.scrollTop = 0;
  } else if (anchor) {
    scrollToCard(anchor.uid, anchor.align);
  } else {
    queueViewport.scrollLeft = previous;
    queueViewport.scrollTop = previousTop;
  }
  markQueueRail(centredQueueUid());
}

// Allinea la coda su una carta: 'anchor' (ANCHOR_RATIO), 'center', 'nearest'
function scrollToCard(uid, align = 'nearest') {
  const item = queueList.querySelector(`[data-uid="${uid}"]`);
  if (!item) return;
  scrollItemInto(queueViewport, item, align);
}

function scrollItemInto(container, item, align) {
  const vertical = container.scrollHeight > container.clientHeight + 1 && container.scrollWidth <= container.clientWidth + 1;
  const cRect = container.getBoundingClientRect();
  const iRect = item.getBoundingClientRect();
  if (vertical) {
    const top = iRect.top - cRect.top + container.scrollTop;
    if (align === 'nearest') {
      if (iRect.top < cRect.top) container.scrollTop = top - 16;
      else if (iRect.bottom > cRect.bottom) container.scrollTop = top + iRect.height - container.clientHeight + 16;
    } else {
      container.scrollTop = top + iRect.height / 2 - container.clientHeight / 2;
    }
    return;
  }
  const left = iRect.left - cRect.left + container.scrollLeft;
  if (align === 'nearest') {
    if (iRect.left < cRect.left + 16) container.scrollLeft = left - 16;
    else if (iRect.right > cRect.right - 16) container.scrollLeft = left + iRect.width - container.clientWidth + 16;
    return;
  }
  const ratio = align === 'anchor' ? ANCHOR_RATIO : 0.5;
  container.scrollLeft = left + iRect.width / 2 - container.clientWidth * ratio;
}

// Dopo un dialogo la coda è ridisegnata: il focus va sulla carta indicata (o su Turno Nemesi se la coda è vuota)
function focusQueueItem(uid) {
  const item = uid !== null && queueList.querySelector(`[data-uid="${uid}"]`);
  (item || nemesisBtn).focus({ preventScroll: true });
}

// "Salva modifiche" (pulsante principale del turno giocatori): tutte le bozze diventano definitive in un solo passo di
// undo; le carte grigie (potere con costo pagato, minion a 0) vanno negli scarti volando verso la pila in alto
function saveAllDrafts() {
  if (resolving || ui.isTransitioning || !ui.drafts.size) return;
  const drafts = new Map(ui.drafts);
  ui.drafts.clear();
  const gone = [];
  act(() => {
    // Statistiche maghi: tutto va al giocatore del turno in corso (mazzo dei turni)
    // (il jolly conta per il giocatore che è jolly in questo giro)
    // (v214) La prima impostazione della vita di un minion a vita variabile non è danno e diventa la vita di riferimento
    // del turno; (v218) è anche la sua vita massima: il +1 non la supera (Regole.applyDrafts)
    const kind = turnCardPlayer(currentTurnCard());
    gone.push(...withGame(g => Regole.applyDrafts(g, drafts, kind)));
  });
  // Le carte sono ancora nella pagina (non ridisegnata): partono da lì
  flyToDiscard(gone.map(e => queueList.querySelector(`.ae-queue-item[data-uid="${e.uid}"] .ae-card-art`)));
  render();
  nemesisBtn.focus({ preventScroll: true });
}

// Dopo un minion eliminato nel turno nemesi: gli indici della risoluzione seguono la coda
function removeWhileResolving(entry) {
  withGame(g => Regole.removeWhileResolving(g, entry));
}

// VistaCartaCoda: dialogo della carta toccata. Minion = punti vita in bozza; potere = rimozione esplicita.
// Niente intestazione (nome, tipo, X): si chiude con Chiudi/Annulla, Esc o tocco fuori; lo spazio va alla carta.
// Sotto la carta c'è sempre un pannello alto uguale per ogni tipo, così la carta ha la stessa dimensione per minion,
// poteri e attacchi.
function openCardDialog(entry) {
  // Nel turno nemesi si apre solo per i minion (−1 / +1 alla vita)
  if (ui.isTransitioning || (resolving && entry.data.type !== 'Minion')) return;
  const { data } = entry;
  let close = () => {};
  const cancel = () => close();
  const dialog = el('div', 'ae-modal ae-modal--card');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', [data.name || I18N_IT.cardInPlay, typeName(data)].join(', '));
  const art = cardArt(data);
  art.classList.add('ae-modal-art');
  const panel = el('div', 'ae-card-panel');
  dialog.append(art, panel);
  // Scelta del giocatore x/y in sospeso (v200): la carta si guarda ma non si cambia (niente vita, niente rimuovi)
  const locked = needsPairChoice();

  if (hasHp(entry) && !locked) {
    buildHpPanel(dialog, panel, entry, () => close());
  } else if (data.type === 'Power' && !locked) {
    // Token rimasti come icone, un token per ogni token
    const tokens = el('p', 'ae-card-panel-tokens');
    tokens.setAttribute('aria-label', I18N_IT.tokensLeft(entry.tokens));
    tokens.appendChild(tokenIcons(entry.tokens));
    panel.appendChild(tokens);
    // Costo pagato: la carta diventa grigia (modifica non salvata); con "Salva modifiche" va negli scarti
    const remove = button(I18N_IT.removePower, 'danger', () => {
      close();
      setDraft(entry, { paid: true });
      render();
      focusQueueItem(entry.uid);
    });
    const footer = el('div', 'ae-modal-footer');
    footer.append(button(I18N_IT.close, 'secondary', cancel));
    // Solo i poteri con "TO DISCARD" si possono rimuovere pagando il costo (cards.json: removable)
    if (data.removable !== false && !entry.paid && !(draftOf(entry) && draftOf(entry).paid)) footer.appendChild(remove);
    dialog.appendChild(footer);
  } else {
    const footer = el('div', 'ae-modal-footer');
    footer.append(button(I18N_IT.close, 'secondary', cancel));
    dialog.appendChild(footer);
  }
  close = openModal(dialog, { onCancel: cancel });
}

// Punti vita in bozza: i pulsanti cambiano solo la bozza; Conferma applica una volta sola (un passo di undo);
// Annulla, X, Esc o tocco fuori lasciano la vita com'era
// Riga: "HP x / y" a sinistra, danno o cura della bozza a destra; sotto i pulsanti −5 −1 +1.
function buildHpPanel(dialog, panel, entry, close) {
  // (v214: minion a vita variabile non ancora impostata: si parte da 0, niente "/X", a 0 non muore)
  const unset = hpUnset(entry);
  // Turno giocatori: si parte dalla vita in bozza e la conferma scrive una bozza (si salva con "Salva modifiche")
  const original = resolving ? entry.hp : draftHp(entry);
  let draft = original;
  let committing = false;

  const row = el('div', 'ae-hp-row');
  const number = el('p', 'ae-hp-number');
  number.setAttribute('aria-live', 'polite');
  const delta = el('p', 'ae-hp-delta');
  row.append(number, delta);
  const controls = el('div', 'ae-hp-controls');
  // Turno giocatori: −5, −1 e +1 (solo fino alla vita di inizio turno); turno nemesi: −1 e +1
  // (v218: vita "?" da impostare: −5, −1, +1 e +5 nei due turni)
  const cap = hpCap(entry, resolving);
  const stepButtons = [];
  (unset ? [-5, -1, 1, 5] : resolving ? [-1, 1] : [-5, -1, 1]).forEach(step => {
    const b = button(step > 0 ? '+' + step : '−' + Math.abs(step), 'secondary', () => {
      draft = Math.min(cap, Math.max(0, draft + step));
      update();
    });
    stepButtons.push([step, b]);
    b.setAttribute('aria-label', (step > 0 ? 'Aggiungi ' : 'Togli ') + Math.abs(step) + ' punti vita');
    controls.appendChild(b);
  });
  const footer = el('div', 'ae-modal-footer');
  const confirm = button(I18N_IT.confirmHp, 'primary', commit);
  footer.append(button(I18N_IT.cancel, 'secondary', close), confirm);
  panel.append(row, controls);
  dialog.appendChild(footer);

  // "HP x / X": X è la vita prima del danno (la vita salvata), non la vita massima della carta
  const before = entry.hp;
  function update() {
    // Vita di riferimento non ancora impostata: solo "HP x" (v214)
    number.textContent = unset ? `HP ${draft}` : `HP ${draft} / ${before}`;
    const change = draft - original;
    const dies = draft === 0 && !unset;
    delta.className = 'ae-hp-delta' + (change < 0 ? ' is-loss' : change > 0 ? ' is-gain' : '');
    delta.replaceChildren();
    if (dies) delta.append(icon('heart'), el('span', '', I18N_IT.willBeDeleted));
    else if (change !== 0 && !unset) delta.append(icon('heart'), el('span', '', I18N_IT.hpDelta(change)));
    stepButtons.forEach(([step, b]) => {
      if (step > 0 && !resolving) { b.disabled = draft >= cap; b.classList.toggle('is-dimmed', draft >= cap); }
    });
    confirm.textContent = dies ? I18N_IT.deleteMinion : I18N_IT.confirmHp;
    confirm.className = 'ae-button ' + (dies ? 'ae-button--danger' : 'ae-button--primary');
  }

  function commit() {
    if (committing) return;
    committing = true;
    const index = queue.indexOf(entry);
    const name = entry.data.name;
    const value = draft;
    close();
    // Vita invariata: si chiude senza aggiungere un passo di undo
    if (value === original || index < 0) return;
    if (!resolving) {
      setDraft(entry, { hp: value });
      ui.queueAnchor = { uid: entry.uid, align: 'nearest' };
      render();
      focusQueueItem(entry.uid);
      return;
    }
    ui.drafts.delete(entry.uid);
    // Minion ucciso nel turno nemesi: vola negli scarti
    const killedArt = value <= 0 ? focusEl.querySelector(`.ae-focus-slide[data-uid="${entry.uid}"] .ae-focus-stage`) : null;
    const wasResolving = resolving;
    act(() => {
      entry.hp = value;
      // Prima impostazione della vita di un minion a vita variabile (v214): da qui valgono le regole normali
      // (v218: è anche la sua vita massima)
      if (unset && value > 0) { entry.hpSet = true; entry.turnHp = value; entry.hpMax = value; }
      if (value <= 0 && !unset) {
        // turno nemesi: esce subito; turno giocatori: resta grigio fino al turno nemesi (isGone)
        if (resolving) removeWhileResolving(entry);
      }
    });
    if (wasResolving) {
      ui.viewedUid = null;
      if (killedArt) flyToDiscard([killedArt]);
      render();
      if (resolving) resolveBtn.focus(); else nemesisBtn.focus();
      showToast(value <= 0 ? I18N_IT.minionDeleted(name) : I18N_IT.hpLeftToast(name, value));
      return;
    }
    ui.queueAnchor = { uid: entry.uid, align: 'nearest' };
    render();
    focusQueueItem(entry.uid);
    showToast(value <= 0 ? I18N_IT.minionKilled(name) : I18N_IT.hpLeftToast(name, value));
  }

  update();
}

