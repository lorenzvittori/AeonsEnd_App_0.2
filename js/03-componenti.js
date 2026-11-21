// 03-componenti.js: Componenti dell'interfaccia: immagine carta, badge, miniatura, dialoghi, toast. Caricato in ordine da script.js insieme agli altri file di js/ (script classici, variabili globali).
'use strict';

// --- 3. Componenti dell'interfaccia --------------------------------------------------------------------------------

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function icon(name) {
  const span = el('span', 'ae-icon ae-icon--' + name);
  span.setAttribute('aria-hidden', 'true');
  return span;
}

function typeName(data) {
  return I18N_IT.types[data.type] || data.type;
}

function hasHp(entry) {
  return Regole.hasHp(entry);
}

// Stato numerico della carta in parole (per i lettori di schermo)
function statusText(entry) {
  if (hasHp(entry) && hpUnset(entry)) return I18N_IT.hpUnknown;
  if (hasHp(entry) && typeof hpMaxOf(entry) === 'number') return I18N_IT.hpLong(entry.hp, hpMaxOf(entry));
  if (hasHp(entry) && typeof entry.data.hp !== 'number') return I18N_IT.hpOnly(entry.hp);
  if (hasHp(entry)) return I18N_IT.hpLong(entry.hp, entry.data.hp);
  if (entry.data.type === 'Power') return I18N_IT.tokens(entry.tokens);
  return '';
}

// Riquadro segnaposto quando l'immagine non si carica: nome, tipo e avviso (mai un rettangolo vuoto)
function placeholderArt(data) {
  const box = el('span', 'ae-card-art ae-card-art--placeholder');
  box.append(el('strong', '', data.name), el('small', '', typeName(data)), el('em', '', I18N_IT.imageMissing));
  return box;
}

// Immagine di una carta. thumb = miniatura WebP (se non c'è si usa la scansione); se manca anche quella, segnaposto.
// sync: immagine già scaricata e decodificata (carte grandi del turno nemesi): si disegna subito, senza lampo vuoto
function cardArt(data, { thumb = false, lazy = false, sync = false } = {}) {
  const box = el('span', 'ae-card-art');
  const img = document.createElement('img');
  img.alt = '';
  img.decoding = sync ? 'sync' : 'async';
  img.width = 264;
  img.height = 369;
  if (lazy) img.loading = 'lazy';
  img.src = thumb ? data.thumb : encodeURI(data.image);
  img.addEventListener('error', () => {
    if (thumb && img.dataset.fallback !== '1') {
      img.dataset.fallback = '1';
      img.src = encodeURI(data.image);
      return;
    }
    box.replaceWith(Object.assign(placeholderArt(data), { className: box.className + ' ae-card-art--placeholder' }));
  });
  box.appendChild(img);
  return box;
}

// Token del potere come nella versione 1: un'immagine (Assets/power-token-2.webp) per ogni token rimasto
function tokenIcons(n) {
  const row = el('span', 'ae-tokens');
  row.setAttribute('aria-hidden', 'true');
  // Più di 5 token (v178): un token e il numero, come la vita dei minion (cuore e numero)
  if (n > 5) {
    row.classList.add('is-count');
    row.append(el('span', 'ae-token'), el('span', 'ae-token-count', String(n)));
    return row;
  }
  for (let i = 0; i < Math.max(0, n); i++) row.appendChild(el('span', 'ae-token'));
  // 4 o 5 token (v176): i token si rimpiccioliscono di 3/n, così la fila (e il box) resta larga come con 3.
  // v178: lo spazio libero si divide in parti uguali tra token e tra token e bordo (style.css .has-many-tokens)
  if (n > 3) {
    row.classList.add('is-many');
    row.style.setProperty('--ae-token-zoom', String(3 / n));
    row.style.setProperty('--ae-token-n', String(n));
  }
  return row;
}

// Carta che va negli scarti all'inizio del prossimo turno nemesi: potere con costo pagato o minion ucciso (vita 0 salvata).
// Nel turno giocatori resta in coda, grigia.
// (v214: un minion a vita variabile non ancora impostata non muore a 0)
function isGone(entry) {
  return Regole.isGone(entry);
}

// Turno giocatori: modifiche non ancora salvate di una carta (vita in bozza, costo pagato in bozza)
function draftOf(entry) {
  return ui.drafts.get(entry.uid) || null;
}
function draftHp(entry) {
  const d = draftOf(entry);
  return d && d.hp !== undefined ? d.hp : entry.hp;
}
function setDraft(entry, patch) {
  if (needsPairChoice()) return;
  const d = Object.assign({}, draftOf(entry), patch);
  if (d.hp === entry.hp) delete d.hp;
  if (!d.paid) delete d.paid;
  if (Object.keys(d).length) ui.drafts.set(entry.uid, d); else ui.drafts.delete(entry.uid);
}
// Copia della carta con la vita in bozza, per disegnare box e fascia
function displayEntry(entry) {
  const d = draftOf(entry);
  // isDraft: la vita è in bozza, il box mostra "x/X" con X = vita prima del danno (dopo Salva solo "x")
  if (!d) return entry;
  const view = Object.assign({}, entry);
  if (d.hp !== undefined) Object.assign(view, { hp: d.hp, hpBefore: entry.hp, isDraft: true });
  if (d.paid) view.paid = true;
  return view;
}

// Box sopra la carta: goccia + vita attuale (minion), un token per ogni token (potere), vuoto per gli attacchi.
// Uguale nella coda e nelle due fasce piccole.
function statusBadge(entry) {
  const badge = el('span', 'ae-status-badge');
  badge.setAttribute('aria-hidden', 'true');
  if (hasHp(entry)) {
    badge.classList.add('ae-status-badge--danger');
    // Vita + goccia; con una modifica non ancora salvata: vita / vita prima del danno
    // (v214: vita variabile non ancora impostata: "?"; in bozza solo "x", senza "/X")
    const hpText = entry.isDraft ? (hpUnset(entry) ? String(entry.hp) : I18N_IT.hp(entry.hp, entry.hpBefore))
      : hpUnset(entry) ? '?' : String(entry.hp);
    // Box "?" toccabile: apre la scheda della carta per impostare la vita (v218, unsetHpClick)
    if (hpUnset(entry) && !entry.isDraft) { badge.classList.add('is-unset'); badge.dataset.uid = String(entry.uid); }
    // Testo lungo (per esempio 13/17): nella fascia piccola il box si allarga e il testo si stringe
    if (hpText.length > 3) badge.classList.add('is-long');
    badge.append(icon('heart'), el('span', '', hpText));
  } else if (entry.data.type === 'Power') {
    badge.classList.add('ae-status-badge--tokens');
    if (entry.tokens > 3 && entry.tokens <= 5) badge.classList.add('has-many-tokens');
    badge.appendChild(tokenIcons(entry.tokens));
  } else {
    // Attacco: nessun badge, solo lo spazio per tenere allineate le carte
    badge.classList.add('ae-status-badge--empty');
    badge.textContent = '·';
  }
  return badge;
}

// Miniatura della coda (pulsante). opts: { compact, current, viewed, index, total, lazy }
function queueItem(entry, opts) {
  const { data } = entry;
  const button = el('button', 'ae-queue-item');
  button.type = 'button';
  button.dataset.uid = entry.uid;
  button.setAttribute('role', 'listitem');
  if (entry.isNew) button.classList.add('is-new');
  if (isGone(entry)) button.classList.add('is-paid');
  if (opts.current) button.setAttribute('aria-current', 'true');
  if (opts.viewed) button.dataset.viewed = 'true';

  const parts = [data.name, typeName(data), statusText(entry), I18N_IT.cardOf(opts.index + 1, opts.total)];
  if (entry.isNew) parts.push(I18N_IT.newTag.toLowerCase());
  if (data.type === 'Power' && data.removable === false) parts.push(I18N_IT.notRemovable.toLowerCase());
  if (entry.paid) parts.push(I18N_IT.paidNote.toLowerCase());
  else if (isGone(entry)) parts.push(I18N_IT.killedNote.toLowerCase());
  if (opts.current) parts.push('da risolvere');
  if (opts.viewed && !opts.current) parts.push('in anteprima');
  button.setAttribute('aria-label', parts.filter(Boolean).join(', '));

  const meta = el('span', 'ae-queue-meta');
  meta.setAttribute('aria-hidden', 'true');
  meta.append(el('strong', '', data.name), el('small', '', typeName(data)));

  // Le carte grandi della VistaCoda usano la scansione intera, le altre la miniatura
  // Fascia piccola: miniatura disegnata subito (sync), così ridisegnando la fascia (per esempio con Turno Nemesi) le carte
  // non spariscono per un attimo
  const art = cardArt(data, { thumb: !opts.full, lazy: opts.lazy, sync: !!opts.compact });
  button.append(statusBadge(entry), meta, art);
  // Fascia piccola: potere che non si può scartare pagando (niente "TO DISCARD") = simbolo di divieto in un box uguale a
  // quello di token e vita, in basso al centro (simmetrico al box in alto). v169
  if (opts.compact && data.type === 'Power' && data.removable === false) {
    const ban = el('span', 'ae-status-badge ae-ban-badge');
    ban.setAttribute('aria-hidden', 'true');
    ban.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" '
      + 'stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/></svg>';
    button.appendChild(ban);
  }
  if (entry.isNew) {
    const tag = el('span', 'ae-new-tag', I18N_IT.newTag);
    tag.setAttribute('aria-hidden', 'true');
    button.appendChild(tag);
  }
  return button;
}

// Posto della carta che si pescherà, nella fascia durante la risoluzione: solo il bordo tratteggiato (v168).
// Non è cliccabile e i lettori di schermo lo saltano.
function nextSlotItem() {
  const item = el('div', 'ae-queue-item ae-next-slot');
  item.setAttribute('aria-hidden', 'true');
  const badge = el('span', 'ae-status-badge ae-status-badge--empty', '·');
  // v169: anche qui il box NUOVA, come sul dorso al passo Pesca
  const tag = el('span', 'ae-new-tag', I18N_IT.newTag);
  item.append(badge, el('span', 'ae-card-art'), tag);
  return item;
}

// Prossima carta da pescare nella fascia della VistaRisoluzione: solo il retro (non si vede quale carta è) e NUOVA.
// Non è cliccabile.
function nextCardItem({ current = false, viewed = false } = {}) {
  const item = el(current ? 'button' : 'div', 'ae-queue-item ae-next-card');
  if (current) {
    // Nel passo da pescare è la carta da "risolvere": si può toccare per tornarci
    item.type = 'button';
    item.dataset.uid = DRAW_UID;
    item.setAttribute('aria-current', 'true');
  }
  if (viewed) item.dataset.viewed = 'true';
  item.setAttribute('role', 'listitem');
  item.setAttribute('aria-label', I18N_IT.nextCard);
  const badge = el('span', 'ae-status-badge ae-status-badge--empty', '·');
  badge.setAttribute('aria-hidden', 'true');
  const art = el('span', 'ae-card-art');
  const img = document.createElement('img');
  img.alt = '';
  img.src = CARD_BACK;
  art.appendChild(img);
  const tag = el('span', 'ae-new-tag', I18N_IT.newTag);
  tag.setAttribute('aria-hidden', 'true');
  item.append(badge, art, tag);
  return item;
}

// --- Dialoghi: un livello alla volta in primo piano, il resto è inerte; Tab resta nel dialogo, Esc annulla ---

const modals = [];

function topLayer() {
  if (modals.length) return modals[modals.length - 1].backdrop;
  if (!discardLayer.hidden) return discardLayer;
  if (!startLayer.hidden) return startLayer;
  return app;
}

function updateInert() {
  const top = topLayer();
  [app, startLayer, discardLayer, ...modals.map(m => m.backdrop)].forEach(layer => {
    layer.inert = layer !== top;
  });
}

// Apre un dialogo. onCancel = Esc, X o tocco fuori (closeOnScrim). Restituisce la funzione che lo chiude.
function openModal(node, { onCancel, initialFocus, closeOnScrim = true }) {
  const backdrop = el('div', 'ae-modal-backdrop');
  backdrop.appendChild(node);
  const record = { backdrop, onCancel, trigger: document.activeElement };
  backdrop.addEventListener('click', e => {
    if (e.target === backdrop && closeOnScrim) record.onCancel();
  });
  dialogRoot.appendChild(backdrop);
  modals.push(record);
  updateInert();
  (initialFocus || focusables(node)[0] || node).focus();
  return () => closeModal(record);
}

function closeModal(record) {
  const i = modals.indexOf(record);
  if (i < 0) return;
  modals.splice(i, 1);
  record.backdrop.remove();
  updateInert();
  restoreFocus(record.trigger);
}

function closeAllModals() {
  while (modals.length) closeModal(modals[modals.length - 1]);
}

function restoreFocus(trigger) {
  if (trigger && trigger.isConnected && !trigger.closest('[inert]')) trigger.focus({ preventScroll: true });
}

function focusables(root) {
  return Array.from(root.querySelectorAll('button, [href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])'))
    .filter(n => !n.disabled && !n.hidden && n.offsetParent !== null);
}

// Struttura comune: titolo, tipo, X per chiudere
let dialogCount = 0;
function dialogShell(titleText, kindText, onClose, { displayTitle = true } = {}) {
  const dialog = el('div', 'ae-modal');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  const titleId = 'dlg-title-' + (++dialogCount);
  dialog.setAttribute('aria-labelledby', titleId);
  const header = el('div', 'ae-modal-header');
  const titles = el('div');
  const title = el('h2', displayTitle ? 'ae-modal-title' : 'ae-modal-title ae-modal-title--ui', titleText);
  title.id = titleId;
  titles.appendChild(title);
  if (kindText) titles.appendChild(el('p', 'ae-modal-kind', kindText));
  const x = el('button', 'ae-icon-button');
  x.type = 'button';
  x.setAttribute('aria-label', I18N_IT.close);
  x.appendChild(icon('close'));
  x.addEventListener('click', onClose);
  header.append(titles, x);
  dialog.appendChild(header);
  return dialog;
}

function button(text, variant, handler) {
  const b = el('button', 'ae-button ae-button--' + variant, text);
  b.type = 'button';
  if (handler) b.addEventListener('click', handler);
  return b;
}

// Toast di conferma (visibile 3 secondi, si chiude anche toccandolo) e annunci per lettori di schermo
let toastTimer = null;
function showToast(text) {
  clearTimeout(toastTimer);
  const toast = el('div', 'ae-toast', text);
  toast.addEventListener('click', () => toast.remove());
  toastRoot.replaceChildren(toast);
  toastTimer = setTimeout(() => {
    toast.classList.add('is-leaving');
    setTimeout(() => toast.remove(), 160);
  }, 3000);
}

function announce(text) {
  liveRegion.textContent = '';
  setTimeout(() => { liveRegion.textContent = text; }, 30);
}

// Promessa che si risolve con true quando l'immagine è scaricata, false se non si carica (al massimo 8 secondi)
const decodedImages = new Map();
function keepDecoded(src, img) {
  decodedImages.delete(src);
  decodedImages.set(src, img);
  while (decodedImages.size > 12) decodedImages.delete(decodedImages.keys().next().value);
}

function loadImage(src) {
  return new Promise(resolve => {
    const img = new Image();
    let done = false;
    const finish = ok => { if (!done) { done = true; resolve(ok); } };
    // Scaricata e anche decodificata (pronta da disegnare): così la carta pescata si vede subito quando si gira.
    // L'immagine resta in memoria (decodedImages) finché serve, così il browser non butta la decodifica.
    img.onload = () => {
      keepDecoded(src, img);
      if (img.decode) img.decode().then(() => finish(true), () => finish(true));
      else finish(true);
    };
    img.onerror = () => finish(false);
    img.src = src;
    if (img.complete && img.naturalWidth) img.onload();
    setTimeout(() => finish(false), 8000);
  });
}

