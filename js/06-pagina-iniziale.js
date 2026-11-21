// 06-pagina-iniziale.js: Pagina iniziale, nuova partita e riprendi, collezione, opzioni. Caricato in ordine da script.js insieme agli altri file di js/ (script classici, variabili globali).
'use strict';

// --- 6. Pagina iniziale e nuova partita -----------------------------------------------------------------------------

function renderPlayers() {
  const container = document.getElementById('choices-players');
  container.replaceChildren(...startOptions.players.map(value => {
    const b = el('button', '', String(value));
    b.type = 'button';
    b.setAttribute('aria-pressed', String(value === settings.players));
    b.setAttribute('aria-label', I18N_IT.players(value));
    b.addEventListener('click', () => {
      settings.players = value;
      renderPlayers();
      // (le opzioni del mazzo dipendono anche dai giocatori: blocco di "Unisci" e riga di avviso, v213)
      if (startOptions && document.getElementById('deck-options')) renderDeckOptions();
      container.querySelector('[aria-pressed="true"]').focus();
    });
    return b;
  }));
}

// Carta della nemesi scelta: chiusa di default. Sul pulsante della nemesi scelta c'è una freccia verso il basso che
// la apre subito sotto il pulsante; in cima alla carta una freccia verso l'alto la richiude.
let nemesisPreviewOpen = false;
const CHEVRON_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">'
  + '<path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function chevronButton(className, label, handler) {
  const b = el('button', 'nemesis-toggle ' + className);
  b.type = 'button';
  b.setAttribute('aria-label', label);
  b.setAttribute('aria-controls', 'nemesis-preview');
  b.innerHTML = CHEVRON_SVG;
  b.addEventListener('click', handler);
  return b;
}

function setNemesisPreview(open) {
  nemesisPreviewOpen = open;
  renderNemesisPreview();
  const target = open ? document.querySelector('#nemesis-preview .nemesis-collapse') : document.querySelector('.nemesis-item.is-selected .nemesis-expand');
  if (target) target.focus({ preventScroll: true });
  if (open) {
    const preview = document.getElementById('nemesis-preview');
    if (preview) preview.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function renderNemesisPreview() {
  const list = document.getElementById('nemesis-list');
  let preview = document.getElementById('nemesis-preview');
  if (!preview) {
    // index.html vecchio ancora in cache del browser: il riquadro si crea qui
    preview = el('figure', 'nemesis-preview');
    preview.id = 'nemesis-preview';
    const image = el('img');
    image.alt = '';
    image.decoding = 'async';
    preview.appendChild(image);
  }
  if (!preview.querySelector('.nemesis-collapse')) {
    preview.prepend(chevronButton('nemesis-collapse', I18N_IT.hideNemesisCard, () => setNemesisPreview(false)));
  }
  if (!preview.querySelector('.nemesis-flip')) buildNemesisFlip(preview);
  // La carta sta subito dopo il pulsante della nemesi scelta, su tutta la larghezza della lista
  const item = list.querySelector('.nemesis-item.is-selected');
  if (item) item.after(preview); else list.after(preview);

  const art = settings.nemesis && nemesisArt[settings.nemesis];
  const open = !!art && nemesisPreviewOpen;
  preview.hidden = !open;
  const expand = item && item.querySelector('.nemesis-expand');
  if (expand) {
    expand.hidden = open;
    expand.setAttribute('aria-expanded', String(open));
  }
  if (!open) {
    // Chiusa: la prossima volta si riapre dal fronte e non ingrandita
    resetNemesisZoom();
    nemesisShowBack = false;
    nemesisFlipAngle = 0;
    const inner = preview.querySelector('.nemesis-flip-inner');
    inner.style.transition = 'none';
    inner.style.transform = '';
    preview.querySelector('.nemesis-flip').classList.remove('is-back');
    return;
  }
  const front = preview.querySelector('.nemesis-face--front');
  const back = preview.querySelector('.nemesis-face--back');
  front.alt = I18N_IT.nemesisCard(settings.nemesis);
  const src = encodeURI(art.card);
  if (front.getAttribute('src') !== src) front.src = src;
  // Retro (setup e storia), se c'è: si vede con uno slide sulla carta
  const flip = preview.querySelector('.nemesis-flip');
  flip.classList.toggle('has-back', !!art.back);
  if (art.back) {
    back.alt = I18N_IT.nemesisCardBack(settings.nemesis);
    const backSrc = encodeURI(art.back);
    if (back.getAttribute('src') !== backSrc) back.src = backSrc;
  } else {
    back.removeAttribute('src');
    nemesisShowBack = false;
    nemesisFlipAngle = 0;
    preview.querySelector('.nemesis-flip-inner').style.transform = '';
  }
  updateNemesisFlip(preview);
}

// Fronte e retro della carta nemesi aperta: uno slide orizzontale (destra o sinistra) la gira
let nemesisShowBack = false;
function buildNemesisFlip(preview) {
  const flip = el('div', 'nemesis-flip');
  const inner = el('div', 'nemesis-flip-inner');
  let front = preview.querySelector('img');
  if (!front) front = el('img');
  front.className = 'nemesis-face nemesis-face--front';
  front.decoding = 'async';
  const back = el('img', 'nemesis-face nemesis-face--back');
  back.alt = '';
  back.decoding = 'async';
  inner.append(front, back);
  flip.appendChild(inner);
  const dots = el('div', 'nemesis-flip-dots');
  dots.setAttribute('aria-hidden', 'true');
  dots.append(el('span'), el('span'));
  preview.append(flip, dots);

  // Zoom con due dita sul lato che si vede: sopra la carta compare un livello con la stessa immagine, ingrandita dentro
  // il riquadro della carta (fino a NEMESIS_ZOOM_MAX); da ingrandita un dito la sposta e un doppio tocco torna normale.
  // Il livello evita di ingrandire la carta che si gira in 3D (le due facce).
  const zoom = { scale: 1, tx: 0, ty: 0, layer: null, img: null };
  const pointers = new Map();
  let pinch = null;
  let pan = null;
  let lastTap = null;
  const applyZoom = animate => {
    const w = flip.offsetWidth, h = flip.offsetHeight;
    const maxX = Math.max(0, (w * zoom.scale - w) / 2), maxY = Math.max(0, (h * zoom.scale - h) / 2);
    zoom.tx = Math.max(-maxX, Math.min(maxX, zoom.tx));
    zoom.ty = Math.max(-maxY, Math.min(maxY, zoom.ty));
    zoom.img.style.transition = animate ? 'transform .2s ease-out' : 'none';
    zoom.img.style.transform = `translate(${zoom.tx}px, ${zoom.ty}px) scale(${zoom.scale})`;
  };
  const openZoomLayer = () => {
    if (zoom.layer) return;
    const art = nemesisArt[settings.nemesis];
    if (!art) return;
    const showBack = nemesisShowBack && !!art.back;
    zoom.layer = el('div', 'nemesis-zoom-layer');
    zoom.layer.setAttribute('aria-hidden', 'true');
    zoom.img = el('img');
    zoom.img.alt = '';
    zoom.img.draggable = false;
    zoom.img.src = encodeURI(showBack ? art.back : art.card);
    zoom.layer.appendChild(zoom.img);
    flip.appendChild(zoom.layer);
    flip.classList.add('is-zoomed');
  };
  const resetZoom = () => {
    if (zoom.layer) zoom.layer.remove();
    zoom.layer = null;
    zoom.img = null;
    zoom.scale = 1;
    zoom.tx = 0;
    zoom.ty = 0;
    pinch = null;
    pan = null;
    flip.classList.remove('is-zoomed');
  };
  resetNemesisZoom = resetZoom;
  // Punto (relativo al centro della carta) che resta sotto le dita / sotto il tocco
  const local = (x, y) => { const r = flip.getBoundingClientRect(); return { x: x - r.left - r.width / 2, y: y - r.top - r.height / 2 }; };
  const zoomAt = (scale, p, animate) => {
    const ix = (p.x - zoom.tx) / zoom.scale, iy = (p.y - zoom.ty) / zoom.scale;
    zoom.scale = Math.max(1, Math.min(NEMESIS_ZOOM_MAX, scale));
    zoom.tx = p.x - ix * zoom.scale;
    zoom.ty = p.y - iy * zoom.scale;
    applyZoom(animate);
  };

  // La carta ruota seguendo il dito (tutta la larghezza della carta = mezzo giro). Al rilascio: oltre
  // SWIPE_MIN_DISTANCE completa il mezzo giro nella direzione del dito, altrimenti torna com'era. Il retro si vede solo
  // così (un tocco non gira la carta) e non mentre la carta è ingrandita.
  let drag = null;
  const setAngle = (deg, animate) => {
    inner.style.transition = animate ? '' : 'none';
    inner.style.transform = `rotateY(${deg}deg)`;
  };
  flip.addEventListener('pointerdown', e => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      // Secondo dito: niente giro, comincia lo zoom
      if (drag) { setAngle(nemesisFlipAngle, true); drag = null; }
      pointers.forEach((p, id) => { try { flip.setPointerCapture(id); } catch (_) {} });
      openZoomLayer();
      if (!zoom.layer) return;
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s: zoom.scale, m: local((a.x + b.x) / 2, (a.y + b.y) / 2), tx: zoom.tx, ty: zoom.ty };
      pan = null;
      return;
    }
    if (pointers.size !== 1) return;
    if (zoom.layer) {
      try { flip.setPointerCapture(e.pointerId); } catch (_) {}
      pan = { x: e.clientX, y: e.clientY, tx: zoom.tx, ty: zoom.ty, moved: false };
      return;
    }
    if (!flip.classList.contains('has-back')) return;
    drag = { x: e.clientX, y: e.clientY, id: e.pointerId, dx: 0, active: false };
  });
  flip.addEventListener('pointermove', e => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size >= 2 && zoom.layer) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const m = local((a.x + b.x) / 2, (a.y + b.y) / 2);
      // Il punto dell'immagine che era sotto le dita all'inizio resta sotto le dita
      const ix = (pinch.m.x - pinch.tx) / pinch.s, iy = (pinch.m.y - pinch.ty) / pinch.s;
      zoom.scale = Math.max(1, Math.min(NEMESIS_ZOOM_MAX, pinch.s * d / pinch.d));
      zoom.tx = m.x - ix * zoom.scale;
      zoom.ty = m.y - iy * zoom.scale;
      applyZoom(false);
      return;
    }
    if (pan) {
      const dx = e.clientX - pan.x, dy = e.clientY - pan.y;
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD) pan.moved = true;
      zoom.tx = pan.tx + dx;
      zoom.ty = pan.ty + dy;
      applyZoom(false);
      return;
    }
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.active) {
      if (Math.abs(dx) < DRAG_THRESHOLD || Math.abs(dx) <= Math.abs(dy)) return;
      drag.active = true;
      try { flip.setPointerCapture(e.pointerId); } catch (_) {}
    }
    drag.dx = dx;
    const width = flip.offsetWidth || 300;
    setAngle(nemesisFlipAngle + Math.max(-180, Math.min(180, dx / width * 180)), false);
  });
  const endZoomGesture = e => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (!zoom.layer) return;
    if (pointers.size === 1) {
      // Da due dita a una: si continua a spostare con quella rimasta
      const [p] = [...pointers.values()];
      pan = { x: p.x, y: p.y, tx: zoom.tx, ty: zoom.ty, moved: true };
      return;
    }
    if (pointers.size) return;
    // Doppio tocco sulla carta ingrandita: torna normale
    if (pan && !pan.moved && e.type === 'pointerup') {
      const now = performance.now();
      if (lastTap && now - lastTap < 320) { lastTap = null; zoomAt(1, { x: 0, y: 0 }, true); }
      else lastTap = now;
    }
    pan = null;
    if (zoom.scale < 1.05) resetZoom();
  };
  const endDrag = (e, cancelled) => {
    endZoomGesture(e);
    if (!drag || (e && e.pointerId !== drag.id)) return;
    const { dx, active } = drag;
    drag = null;
    // Un tocco senza trascinare non gira la carta: il retro si vede solo con lo swipe
    if (!active) return;
    if (!cancelled && Math.abs(dx) >= SWIPE_MIN_DISTANCE) {
      nemesisFlipAngle += dx > 0 ? 180 : -180;
      nemesisShowBack = !nemesisShowBack;
    }
    setAngle(nemesisFlipAngle, true);
    updateNemesisFlip(preview);
  };
  flip.addEventListener('pointerup', e => endDrag(e, false));
  flip.addEventListener('pointercancel', e => endDrag(e, true));
}
let nemesisFlipAngle = 0;
const NEMESIS_ZOOM_MAX = 4;
// Toglie lo zoom della carta nemesi (carta chiusa o cambiata); la imposta buildNemesisFlip
let resetNemesisZoom = () => {};

function updateNemesisFlip(preview) {
  const flip = preview.querySelector('.nemesis-flip');
  const showBack = nemesisShowBack && flip.classList.contains('has-back');
  flip.classList.toggle('is-back', showBack);
  preview.querySelector('.nemesis-face--front').setAttribute('aria-hidden', String(showBack));
  preview.querySelector('.nemesis-face--back').setAttribute('aria-hidden', String(!showBack));
  const dots = preview.querySelector('.nemesis-flip-dots');
  dots.hidden = !flip.classList.contains('has-back');
  dots.children[0].classList.toggle('is-on', !showBack);
  dots.children[1].classList.toggle('is-on', showBack);
}

// Wave scelte nella pagina Nuova partita (anche più di una): si vedono le nemesi di tutte
let selectedWaves = [];

// Numero della wave in cifre romane per mostrarla ("4 - The New Age" → "IV - The New Age"); il valore resta quello di
// nemesis.json
function toRoman(n) {
  const map = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  map.forEach(([v, s]) => { while (n >= v) { out += s; n -= v; } });
  return out;
}
// Nome della wave dal suo codice: "4" -> "IV - The New Age"
function waveLabel(wave) {
  return toRoman(Number(wave)) + ' - ' + productName(wave);
}

// Nemesi delle wave scelte: prima le disponibili (pulsanti), le altre in un elenco chiuso e non interattivo
function renderBosses() {
  const list = document.getElementById('nemesis-list');
  // Per wave (nell'ordine delle wave); in ogni wave prima le nemesi della scatola base, poi quelle delle mini espansioni,
  // in ognuno dei due gruppi per battaglia
  const byBattle = n => (n.battle === null || n.battle === undefined ? 99 : n.battle);
  const ofWave = nemeses.filter(n => n.boxCode && selectedWaves.includes(waveOfNemesis(n)))
    .map((n, i) => ({ n, i }))
    .sort((a, b) => (Number(waveOfNemesis(a.n)) - Number(waveOfNemesis(b.n))) || (isMiniCode(a.n.boxCode) - isMiniCode(b.n.boxCode))
      || (byBattle(a.n) - byBattle(b.n)) || (a.i - b.i))
    .map(x => x.n);
  const playable = ofWave.filter(isPlayable);
  const others = ofWave.filter(n => !isPlayable(n));

  if (!playable.some(n => n.name === settings.nemesis)) settings.nemesis = playable.length ? playable[0].name : null;

  list.replaceChildren(...playable.map(info => {
    const b = el('button', 'nemesis-option');
    b.type = 'button';
    b.setAttribute('aria-pressed', String(info.name === settings.nemesis));
    const tags = el('span', 'nemesis-tags');
    tags.appendChild(el('span', '', info.battle ? I18N_IT.battle(info.battle) : I18N_IT.battleMissing));
    const art = nemesisArt[info.name];
    if (art) {
      // Parte dell'illustrazione a destra del pulsante (come nella wiki)
      b.classList.add('has-art');
      const portrait = el('span', 'nemesis-art');
      portrait.setAttribute('aria-hidden', 'true');
      portrait.style.backgroundImage = `url("${encodeURI(art.portrait)}")`;
      b.appendChild(portrait);
    }
    b.append(el('span', 'nemesis-name', info.name), tags);
    // Mini espansione: etichetta dorata piccola in basso a destra
    if (isMiniCode(info.boxCode)) b.appendChild(el('span', 'nemesis-expansion', productName(info.boxCode)));
    b.addEventListener('click', () => {
      // Toccare di nuovo la nemesi già scelta apre o chiude la sua carta (come le frecce)
      if (settings.nemesis === info.name) {
        if (art) {
          setNemesisPreview(!nemesisPreviewOpen);
          b.focus({ preventScroll: true });
        }
        return;
      }
      settings.nemesis = info.name;
      nemesisPreviewOpen = false;
      renderBosses();
      const selected = list.querySelector('.nemesis-item.is-selected .nemesis-option');
      if (selected) selected.focus({ preventScroll: true });
    });
    const item = el('div', 'nemesis-item');
    item.appendChild(b);
    if (info.name === settings.nemesis) {
      item.classList.add('is-selected');
      // Freccia verso il basso al centro del pulsante scelto: apre la carta della nemesi
      if (art) item.appendChild(chevronButton('nemesis-expand', I18N_IT.showNemesisCard(info.name), () => setNemesisPreview(true)));
    }
    return item;
  }));
  renderNemesisPreview();
  document.getElementById('nemesis-empty').hidden = playable.length > 0;

  // Nemesi non disponibili: box piccoli con solo il nome, barrati da una X rossa sottile, non cliccabili.
  // Stanno subito sotto i pulsanti delle disponibili (il vecchio elenco a scomparsa non si usa più).
  const oldOther = document.getElementById('nemesis-other');
  if (oldOther) oldOther.hidden = true;
  let unavailable = document.getElementById('nemesis-unavailable');
  if (!unavailable) {
    unavailable = el('ul', 'nemesis-unavailable');
    unavailable.id = 'nemesis-unavailable';
    unavailable.setAttribute('aria-label', I18N_IT.unavailableNemeses);
    list.after(unavailable);
  }
  unavailable.hidden = others.length === 0;
  unavailable.replaceChildren(...others.map(info => {
    // Nemesi che l'app ha (battaglia e carte) ma il cui prodotto non è nella collezione: niente "!", la scritta
    // "Non in collezione" a destra. Le altre (senza battaglia o senza carte) restano con il "!" rosso.
    const notOwned = info.battle !== null && !ownsProduct(productOfNemesis(info))
      && allCards.some(c => c.category === 'Specific' && c.nemesis === info.name);
    const li = el('li', 'nemesis-locked' + (notOwned ? ' is-not-owned' : ''));
    li.setAttribute('aria-label', notOwned ? I18N_IT.notInCollectionNemesis(info.name) : I18N_IT.unavailableNemesis(info.name));
    li.appendChild(el('span', '', info.name));
    if (notOwned) li.appendChild(el('span', 'nemesis-locked-note', I18N_IT.notInCollection));
    return li;
  }));
  updateStartActions();
}

function renderStartChoices() {
  nemesisPreviewOpen = false;
  startOptions.waves = ownedWaves();
  ensureCollectionButton();
  renderPlayers();
  const current = nemeses.find(n => n.name === settings.nemesis);
  // Wave scelte: quelle di prima ancora nella collezione; se nessuna, la wave della nemesi scelta (o la prima)
  selectedWaves = selectedWaves.filter(w => startOptions.waves.includes(w));
  if (!selectedWaves.length) {
    selectedWaves = [current && startOptions.waves.includes(waveOfNemesis(current)) ? waveOfNemesis(current) : startOptions.waves[0]].filter(Boolean);
  }
  ensureWaveGroup();
  renderWavePills();
  renderBosses();
}

// Pagina iniziale in due modi:
//   'home':  menu iniziale. Se c'è una partita salvata, la finestra "Partita in corso" (nemesi, giocatori, Riprendi
//            partita); sotto, sempre, "Nuova partita" e "Opzioni" (La mia collezione).
//   'setup': scelte della nuova partita (giocatori, wave, nemesi) e "Inizia partita"; in alto a destra il Menu
//            (Esci → menu iniziale, La mia collezione).
let startMode = 'home';

// Finestra "Partita in corso" sotto il titolo e, sotto, i pulsanti del menu iniziale. Creati qui, così funzionano
// anche con un index.html vecchio ancora in cache.
function startChoicePanel() {
  let panel = document.getElementById('start-choice');
  if (panel) return panel;
  panel = el('section', 'start-choice');
  panel.id = 'start-choice';
  panel.setAttribute('aria-labelledby', 'start-choice-title');
  const head = el('div', 'start-choice-head');
  const title = el('h2', 'start-choice-title', I18N_IT.savedGameTitle);
  title.id = 'start-choice-title';
  head.append(title, el('p', 'start-choice-info'));
  const resume = button(I18N_IT.resumeGame, 'primary', resumeGame);
  resume.classList.add('ae-button--full', 'start-choice-resume');
  panel.append(head, resume);
  document.querySelector('.start-title').after(panel);
  return panel;
}

function startHomeActions() {
  let box = document.getElementById('start-home');
  if (box) return box;
  box = el('div', 'start-home');
  box.id = 'start-home';
  const fresh = button(I18N_IT.newGame, 'primary', () => setStartMode('setup', true));
  fresh.classList.add('ae-button--full', 'start-home-new');
  // Collezione vuota (v194): "Inserisci collezione" apre La mia collezione; "Nuova partita" è oscurato
  const addCollection = button(I18N_IT.addCollection, 'primary', () => openCollection(addCollection, () => {
    const next = startHomeActions().querySelector('.start-home-new');
    if (next && !next.disabled) next.focus({ preventScroll: true });
  }));
  addCollection.classList.add('ae-button--full', 'start-home-collection');
  const options = button(I18N_IT.options, 'secondary', () => openOptions(options));
  options.classList.add('ae-button--full', 'start-home-options');
  // Modalità test (v215): scenari che partono in un momento preciso della partita
  const test = button(I18N_IT.testMenu, 'secondary', () => openTestScreen(test));
  test.classList.add('ae-button--full', 'start-home-test');
  box.append(addCollection, fresh, options, test);
  startChoicePanel().after(box);
  return box;
}
function updateHomeCollection() {
  const box = document.getElementById('start-home');
  if (!box) return;
  const empty = !collection || collection.size === 0;
  box.querySelector('.start-home-collection').hidden = !empty;
  const fresh = box.querySelector('.start-home-new');
  fresh.disabled = empty;
  fresh.title = empty ? I18N_IT.collectionEmptyHint : '';
  // Con la collezione vuota il pulsante principale è "Inserisci collezione"
  // (altrimenti principale solo senza partita salvata, come in setStartMode)
  const primary = !empty && !readSave();
  fresh.classList.toggle('ae-button--primary', primary);
  fresh.classList.toggle('ae-button--secondary', !primary);
}

// Testata della pagina "Nuova partita": titolo e X (torna al menu iniziale). Resta ferma in alto mentre la pagina scorre
// sotto, e sotto di lei il contenuto sfuma nel nero (style.css .start-setup-head)
function startSetupHead() {
  let head = document.getElementById('start-setup-head');
  if (head) return head;
  head = el('div', 'start-setup-head');
  head.id = 'start-setup-head';
  const x = el('button', 'ae-icon-button start-setup-close');
  x.type = 'button';
  x.setAttribute('aria-label', I18N_IT.backToMenu);
  x.appendChild(icon('close'));
  x.addEventListener('click', () => setStartMode('home', true));
  head.append(el('h1', 'start-setup-title', I18N_IT.newGameTitle), x);
  document.querySelector('.start-box').prepend(head);
  return head;
}

function setStartMode(mode, focus) {
  const saved = readSave();
  startMode = mode === 'setup' ? 'setup' : 'home';
  // Pagina Nuova partita: le opzioni del mazzo ripartono dalla preferenza del browser (v213)
  if (startMode === 'setup') Object.assign(settings, loadDeckOptions());
  const panel = startChoicePanel();
  const home = startHomeActions();
  const isHome = startMode === 'home';
  panel.hidden = !isHome || !saved;
  home.hidden = !isHome;
  startSetupHead().hidden = isHome;
  // Il vecchio Menu della pagina Nuova partita (sostituito dalla X) si toglie anche da una pagina già aperta
  const oldMenu = document.getElementById('start-menu-btn');
  if (oldMenu) oldMenu.remove();
  startLayer.classList.toggle('is-setup', !isHome);
  panel.parentElement.classList.toggle('is-choosing', isHome);
  // Con una partita in corso "Nuova partita" è secondario (il principale è Riprendi partita)
  const fresh = home.querySelector('.start-home-new');
  fresh.classList.toggle('ae-button--primary', !saved);
  fresh.classList.toggle('ae-button--secondary', !!saved);
  updateHomeCollection();
  if (saved) {
    const head = panel.querySelector('.start-choice-head');
    head.querySelector('.start-choice-info').textContent =
      [saved.settings.nemesis, I18N_IT.players(saved.settings.players)].filter(Boolean).join(' · ');
    const old = head.querySelector('.nemesis-art');
    if (old) old.remove();
    const art = nemesisArt[saved.settings.nemesis];
    head.classList.toggle('has-art', !!art);
    if (art) {
      const portrait = el('span', 'nemesis-art');
      portrait.setAttribute('aria-hidden', 'true');
      portrait.style.backgroundImage = `url("${encodeURI(art.portrait)}")`;
      head.prepend(portrait);
    }
  }
  startLayer.scrollTop = 0;
  updateStartActions();
  if (focus) {
    const target = isHome ? (saved ? panel.querySelector('.start-choice-resume')
      : fresh.disabled ? home.querySelector('.start-home-collection') : fresh) : document.querySelector('#choices-players button');
    if (target) target.focus({ preventScroll: true });
  }
}

// In 'setup' il pulsante principale è "Inizia partita"
function updateStartActions() {
  resumeBtn.hidden = true;
  resumeBtn.className = 'ae-button ae-button--full ae-button--secondary start-resume-alt';
  startBtn.textContent = I18N_IT.startNew;
  startBtn.className = 'ae-button ae-button--full ae-button--primary';
  startBtn.disabled = !settings.nemesis || !battleOf(settings.nemesis);
  startBtn.title = startBtn.disabled ? I18N_IT.chooseNemesis : '';
  renderDeckOptions();
}

// Opzioni del mazzo (v213): due interruttori sopra la wave ("Modalità battaglia", "Unisci le carte della collezione"),
// con il blocco di "Unisci" (mergeLockedWave) e, prima di "Inizia partita", una riga se il mazzo esce più corto
function deckOptionsGroup() {
  let group = document.getElementById('deck-options');
  if (group) return group;
  group = el('section', 'start-group start-deck-options');
  group.id = 'deck-options';
  group.setAttribute('aria-labelledby', 'deck-options-label');
  const label = el('h2', 'start-label', I18N_IT.deckOptions);
  label.id = 'deck-options-label';
  const row = (key, text, note) => {
    const r = el('label', 'ae-switch-row deck-option');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('role', 'switch');
    input.dataset.option = key;
    const sw = el('span', 'ae-switch');
    sw.setAttribute('aria-hidden', 'true');
    const texts = el('span', 'deck-option-text');
    texts.append(el('span', 'deck-option-label', text), el('span', 'deck-option-note', note));
    r.append(texts, input, sw);
    input.addEventListener('change', () => {
      if (input.disabled) return;
      settings[key] = input.checked;
      saveDeckOptions();
      renderDeckOptions();
    });
    return r;
  };
  const lockNote = el('p', 'start-note deck-option-lock');
  lockNote.id = 'deck-option-lock';
  group.append(label, row('battleMode', I18N_IT.battleMode, I18N_IT.battleModeNote),
    row('mergeCollection', I18N_IT.mergeCollection, I18N_IT.mergeCollectionNote), lockNote);
  ensureWaveGroup().before(group);
  return group;
}
function renderDeckOptions() {
  if (!deckSetup || !nemeses.length) return;
  const group = deckOptionsGroup();
  const battle = group.querySelector('[data-option="battleMode"]');
  const merge = group.querySelector('[data-option="mergeCollection"]');
  const lockNote = group.querySelector('.deck-option-lock');
  battle.checked = settings.battleMode !== false;
  const locked = mergeLockedWave();
  merge.checked = mergeActive();
  merge.disabled = !!locked;
  merge.closest('.ae-switch-row').classList.toggle('is-locked', !!locked);
  merge.setAttribute('aria-describedby', locked ? lockNote.id : '');
  lockNote.hidden = !locked;
  lockNote.textContent = locked ? I18N_IT.mergeLocked(waveLabel(locked).split(' - ')[0]) : '';
  // Riga di avviso prima di "Inizia partita": il mazzo esce più corto di deck-setup.json
  let warn = document.getElementById('deck-short');
  if (!warn) {
    warn = el('p', 'start-note deck-short');
    warn.id = 'deck-short';
    warn.setAttribute('role', 'status');
    startBtn.before(warn);
  }
  const short = settings.nemesis ? deckShortfall() : null;
  warn.hidden = !short;
  warn.textContent = short ? I18N_IT.deckShort(short.have, short.want) : '';
}

// Wave nella scelta della nemesi: solo quelle della collezione (se nessuna, tutte)
function ownedWaves() {
  const all = collectionCatalog().map(w => w.wave);
  const owned = all.filter(w => [...collection].some(id => waveOfCode(id) === w));
  return owned.length ? owned : all;
}

function buildStartPage() {
  loadCollection();
  startOptions = { players: Object.keys(deckSetup.battles[0].players).map(Number), waves: ownedWaves() };
  const firstPlayable = nemeses.find(isPlayable);
  settings = Object.assign({ players: startOptions.players[0], nemesis: firstPlayable ? firstPlayable.name : null }, loadDeckOptions());
  renderStartChoices();
}

// Wave: gruppo a sé ("Wave"), sopra la Nemesi, con un menu a tendina in cui si spuntano una o più wave (in cifre
// romane). Accanto al titolo "Nemesi" il dado sceglie una nemesi a caso. Creati qui, così valgono anche con un
// index.html vecchio (il vecchio <select> della wave resta nascosto e non si usa più).
function ensureWaveGroup() {
  let group = document.getElementById('wave-group');
  if (group) return group;
  const select = document.getElementById('wave-select');
  group = el('section', 'start-group start-wave');
  group.id = 'wave-group';
  group.setAttribute('aria-labelledby', 'wave-label');
  const label = el('h2', 'start-label', I18N_IT.wave);
  label.id = 'wave-label';
  const dropdown = el('div', 'wave-dropdown');
  dropdown.id = 'wave-pills';
  const toggle = el('button', 'wave-dropdown-toggle');
  toggle.type = 'button';
  toggle.setAttribute('aria-haspopup', 'true');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'wave-menu');
  toggle.append(el('span', 'wave-dropdown-text'));
  toggle.insertAdjacentHTML('beforeend', CHEVRON_SVG);
  const menu = el('div', 'wave-menu');
  menu.id = 'wave-menu';
  menu.setAttribute('role', 'group');
  menu.setAttribute('aria-label', I18N_IT.wavesLabel);
  menu.hidden = true;
  const setOpen = open => {
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    dropdown.classList.toggle('is-open', open);
  };
  toggle.addEventListener('click', () => setOpen(menu.hidden));
  // Un tocco fuori dal menu (o Esc) lo chiude
  document.addEventListener('pointerdown', e => { if (!menu.hidden && !dropdown.contains(e.target)) setOpen(false); });
  dropdown.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { e.stopPropagation(); setOpen(false); toggle.focus(); } });
  dropdown.append(toggle, menu);
  group.append(label, dropdown);
  const nemesisGroup = document.getElementById('nemesis-list').closest('.start-group');
  nemesisGroup.before(group);
  nemesisGroup.classList.add('start-nemesis');
  // Titolo "Nemesi" con a destra il dado (nemesi a caso tra tutte quelle della collezione)
  const nemesisLabel = document.getElementById('nemesis-label');
  if (nemesisLabel && !document.getElementById('nemesis-random')) {
    const row = el('div', 'start-label-row');
    nemesisLabel.before(row);
    row.appendChild(nemesisLabel);
    const dice = el('button', 'ae-icon-button nemesis-random');
    dice.id = 'nemesis-random';
    dice.type = 'button';
    dice.setAttribute('aria-label', I18N_IT.randomNemesis);
    dice.title = I18N_IT.randomNemesis;
    dice.innerHTML = DICE_SVG;
    dice.addEventListener('click', pickRandomNemesis);
    row.appendChild(dice);
  }
  if (select) {
    select.hidden = true;
    group.appendChild(select);
    const oldLabel = document.querySelector('label[for="wave-select"]');
    if (oldLabel) oldLabel.remove();
  }
  return group;
}

const DICE_SVG = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">'
  + '<rect x="3.5" y="3.5" width="17" height="17" rx="3.5" fill="none" stroke="currentColor" stroke-width="2"/>'
  + '<circle cx="8.5" cy="8.5" r="1.6" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.6" fill="currentColor"/>'
  + '<circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.6" fill="currentColor"/>'
  + '<circle cx="8.5" cy="15.5" r="1.6" fill="currentColor"/></svg>';

// Menu a tendina delle wave: testo con le wave scelte e, aperto, una casella per wave. Resta sempre almeno una wave.
function renderWavePills() {
  const dropdown = document.getElementById('wave-pills');
  const text = dropdown.querySelector('.wave-dropdown-text');
  const menu = dropdown.querySelector('.wave-menu');
  const chosen = startOptions.waves.filter(w => selectedWaves.includes(w));
  text.textContent = !chosen.length ? I18N_IT.wavesNone
    : chosen.length === 1 ? waveLabel(chosen[0]) : I18N_IT.wavesMore(waveLabel(chosen[0]), chosen.length - 1);
  menu.replaceChildren(...startOptions.waves.map(wave => {
    const row = el('label', 'wave-option');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = selectedWaves.includes(wave);
    input.addEventListener('change', () => {
      if (input.checked) selectedWaves.push(wave);
      else if (selectedWaves.length > 1) selectedWaves = selectedWaves.filter(w => w !== wave);
      else input.checked = true;
      nemesisPreviewOpen = false;
      renderWavePills();
      renderBosses();
    });
    row.append(input, el('span', 'wave-option-box'), el('span', 'wave-option-name', waveLabel(wave)));
    return row;
  }));
}

// Dado: una nemesi a caso tra tutte quelle giocabili della collezione (se possibile diversa da quella scelta); la sua
// wave si aggiunge alle wave scelte e la pagina scorre fino a lei
function pickRandomNemesis() {
  const all = nemeses.filter(isPlayable);
  if (!all.length) return;
  const pool = all.length > 1 ? all.filter(n => n.name !== settings.nemesis) : all;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  if (!selectedWaves.includes(waveOfNemesis(pick))) selectedWaves.push(waveOfNemesis(pick));
  settings.nemesis = pick.name;
  nemesisPreviewOpen = false;
  renderWavePills();
  renderBosses();
  const selected = document.querySelector('.nemesis-item.is-selected');
  if (selected) selected.scrollIntoView({ block: 'center', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  showToast(pick.name);
}

// Il pulsante "La mia collezione" non è più nella pagina "Nuova partita" (sta in Opzioni e nel Menu): si toglie anche
// da una versione vecchia
function ensureCollectionButton() {
  const row = document.getElementById('collection-row');
  if (row) row.remove();
}

function collectionSummaryText() {
  const waves = new Set([...collection].map(id => id.split('|')[0]));
  return I18N_IT.collectionSummary(waves.size, collection.size);
}

// Opzioni (dal menu iniziale): La mia collezione (con il riepilogo), Dorso delle carte e Sfondo
function openOptions(trigger) {
  const layer = el('div', 'collection-screen options-screen');
  layer.setAttribute('role', 'dialog');
  layer.setAttribute('aria-modal', 'true');
  layer.setAttribute('aria-label', I18N_IT.options);
  const head = el('div', 'collection-head');
  const close = () => {
    layer.remove();
    startLayer.inert = false;
    updateInert();
    if (trigger && trigger.isConnected) trigger.focus({ preventScroll: true });
  };
  const x = el('button', 'ae-icon-button');
  x.type = 'button';
  x.setAttribute('aria-label', I18N_IT.close);
  x.appendChild(icon('close'));
  x.addEventListener('click', close);
  head.append(el('h2', 'collection-title', I18N_IT.options), x);
  const body = el('div', 'collection-body');
  const item = el('button', 'options-item');
  item.type = 'button';
  const summary = el('span', 'options-item-note', collectionSummaryText());
  item.append(el('span', 'options-item-label', I18N_IT.myCollection), summary);
  item.addEventListener('click', () => openCollection(item, () => { summary.textContent = collectionSummaryText(); }));
  // Dorso delle carte: miniatura e nome del dorso scelto; si tocca per la griglia di tutti i dorsi. Chiusa la griglia,
  // la pagina iniziale resta coperta dalle Opzioni
  // (la miniatura sta piccola a destra della scritta)
  const backItem = el('div', 'options-item options-item--row');
  backItem.append(el('span', 'options-item-label', I18N_IT.cardBack),
    cardBackChoiceButton(() => { if (layer.isConnected) startLayer.inert = true; }, { compact: true }));
  // Sfondo: anteprima e nome dello sfondo scelto; si tocca per le anteprime di tutti gli sfondi
  const bgItem = el('div', 'options-item options-item--row');
  bgItem.append(el('span', 'options-item-label', I18N_IT.background),
    backgroundChoiceButton(() => { if (layer.isConnected) startLayer.inert = true; }, { compact: true }));
  // Carte turno 1/2 e 3/4 (wave 4, v192; dalla v193 qui e non nel Menu della partita): interruttore, attivo di default
  const pairsItem = el('label', 'options-item options-item--row ae-switch-row options-switch');
  const pairsInput = document.createElement('input');
  pairsInput.type = 'checkbox';
  pairsInput.setAttribute('role', 'switch');
  pairsInput.checked = turnPairsOn();
  pairsInput.addEventListener('change', () => setTurnPairs(pairsInput.checked));
  const pairsSw = el('span', 'ae-switch');
  pairsSw.setAttribute('aria-hidden', 'true');
  const pairsText = el('span', 'options-switch-text');
  pairsText.append(el('span', 'options-item-label', I18N_IT.turnPairsOption), el('span', 'options-item-note', I18N_IT.turnPairsHint));
  pairsItem.append(pairsText, pairsInput, pairsSw);
  body.append(item, backItem, bgItem, pairsItem);
  layer.append(head, body);
  layer.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } });
  document.body.appendChild(layer);
  startLayer.inert = true;
  item.focus();
}

// Schermata "La mia collezione": per ogni wave un interruttore (la wave, cioè la sua scatola base) e sotto le sue
// mini espansioni. Togliendo una wave si tolgono anche le sue mini espansioni. Le scelte valgono solo con
// "Salva collezione"; la X torna indietro senza salvare.
function openCollection(trigger, onSaved) {
  const draft = new Set(collection);
  const layer = el('div', 'collection-screen');
  layer.setAttribute('role', 'dialog');
  layer.setAttribute('aria-modal', 'true');
  layer.setAttribute('aria-label', I18N_IT.myCollection);
  const head = el('div', 'collection-head');
  const close = () => {
    layer.remove();
    updateInert();
    // Aperta da Opzioni: la pagina iniziale resta coperta dalle Opzioni
    if (document.querySelector('.options-screen')) startLayer.inert = true;
    if (trigger && trigger.isConnected) trigger.focus({ preventScroll: true });
  };
  const x = el('button', 'ae-icon-button');
  x.type = 'button';
  x.setAttribute('aria-label', I18N_IT.close);
  x.appendChild(icon('close'));
  x.addEventListener('click', close);
  head.append(el('h2', 'collection-title', I18N_IT.myCollection), x);
  const body = el('div', 'collection-body');
  body.appendChild(el('p', 'start-note', I18N_IT.collectionHint));
  // Seleziona tutto / Deseleziona tutto: spuntano o tolgono tutte le wave e le mini espansioni (valgono con "Salva")
  const bulk = el('div', 'collection-bulk');
  // (solo le wave che si possono scegliere, v199)
  const setAll = on => {
    collectionCatalog().filter(({ wave }) => collectionWaveEnabled(wave))
      .forEach(({ products }) => products.forEach(p => { if (on) draft.add(p.id); else draft.delete(p.id); }));
    body.querySelectorAll('.collection-wave:not(.is-locked) .collection-item input').forEach(input => {
      input.checked = on;
      if (input.closest('.is-mini')) input.disabled = !on;
    });
    body.querySelectorAll('.collection-wave:not(.is-locked) .collection-item.is-mini').forEach(r => r.classList.toggle('is-disabled', !on));
  };
  bulk.append(button(I18N_IT.selectAll, 'secondary', () => setAll(true)), button(I18N_IT.deselectAll, 'secondary', () => setAll(false)));
  body.appendChild(bulk);

  const toggle = (label, id, extraClass) => {
    const row = el('label', 'ae-switch-row collection-item' + (extraClass ? ' ' + extraClass : ''));
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('role', 'switch');
    input.checked = draft.has(id);
    input.dataset.id = id;
    const sw = el('span', 'ae-switch');
    sw.setAttribute('aria-hidden', 'true');
    row.append(el('span', '', label), input, sw);
    return row;
  };
  collectionCatalog().forEach(({ wave, products }) => {
    const block = el('section', 'collection-wave');
    const base = products[0];
    const waveRow = toggle(waveLabel(wave), base.id, 'is-wave');
    const minis = products.slice(1).map(m => toggle(m.name, m.id, 'is-mini'));
    const sync = () => {
      const on = draft.has(base.id);
      minis.forEach(r => {
        const input = r.querySelector('input');
        input.disabled = !on;
        r.classList.toggle('is-disabled', !on);
      });
    };
    waveRow.querySelector('input').addEventListener('change', e => {
      if (e.target.checked) draft.add(base.id);
      else { draft.delete(base.id); products.slice(1).forEach(m => draft.delete(m.id)); minis.forEach(r => { r.querySelector('input').checked = false; }); }
      sync();
    });
    minis.forEach(r => r.querySelector('input').addEventListener('change', e => {
      if (e.target.checked) draft.add(e.target.dataset.id); else draft.delete(e.target.dataset.id);
    }));
    block.append(waveRow, ...minis);
    sync();
    // Wave non ancora disponibili (v199): visibili ma spente e non si toccano
    if (!collectionWaveEnabled(wave)) {
      block.classList.add('is-locked');
      [waveRow, ...minis].forEach(r => {
        const input = r.querySelector('input');
        input.checked = false;
        input.disabled = true;
        r.classList.add('is-disabled');
      });
      waveRow.querySelector('span').append(el('span', 'collection-locked-note', I18N_IT.collectionLocked));
    }
    body.appendChild(block);
  });
  const footer = el('div', 'collection-footer');
  const saveBtn = button(I18N_IT.collectionSave, 'primary', () => {
    collection = draft;
    saveCollection();
    close();
    renderStartChoices();
    updateHomeCollection();
    if (onSaved) onSaved();
    showToast(I18N_IT.collectionSaved);
  });
  saveBtn.classList.add('ae-button--full');
  footer.appendChild(saveBtn);
  layer.append(head, body, footer);
  layer.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } });
  document.body.appendChild(layer);
  startLayer.inert = true;
  x.focus();
}

function showStartSkeleton() {
  document.getElementById('nemesis-list').replaceChildren(...[0, 1, 2, 3].map(() => el('div', 'nemesis-skeleton')));
}

function openStart() {
  // (v215: uscendo da un test, Esci dal test o Menu iniziale della Vittoria, tornano le scelte di prima)
  endTest();
  closeAllModals();
  closeDiscard();
  renderStartChoices();
  startLayer.hidden = false;
  updateInert();
  setStartMode('home', true);
}

function closeStart() {
  startLayer.hidden = true;
  updateInert();
}

// Inizia partita: la scelta "Nuova partita" nella finestra sotto il titolo vale già come conferma di sostituire
// la partita salvata, quindi qui non si chiede altro
function onStartClick() {
  startGame();
}

// Inizia: nuova partita con le scelte fatte (la partita salvata viene sostituita)
function startGame() {
  if (!battleOf(settings.nemesis)) return;
  clearTransition();
  closeAllModals();
  queue = [];
  resolving = false;
  currentIndex = 0;
  newIndex = -1;
  ui.viewedUid = null;
  ui.reveal = null;
  ui.lastDrawnUid = null;
  ui.drafts.clear();
  ui.flyingDiscards = 0;
  undoStack = [];
  ui.gameSaved = false;
  newGame();
  // Prima del turno giocatori: i 9 mazzi da cui nasce il mazzo nemesi e il pulsante "Crea mazzo"
  ui.deckBuilding = true;
  ui.deckShown = 0;
  ui.deckDark = true;
  showDeckBuild();
  render();
  slideToGame(() => nemesisBtn.focus());
  prefetchDeckImages();
}

// Riprendi partita: si ricarica lo stato salvato nel browser, compreso l'undo.
// v194: se la nemesi della partita non è più nella collezione, una finestra lo dice; "Continua" rimette nella
// collezione il suo prodotto (e la scatola base della sua wave) e riprende la partita.
function resumeGame() {
  const saved = readSave();
  if (!saved) return;
  const info = nemeses.find(n => n.name === saved.settings.nemesis);
  // (nemesi di una wave non ancora disponibile nella collezione, v199: si riprende e basta)
  if (info && info.boxCode && collection && collectionWaveEnabled(waveOfNemesis(info)) && !collection.has(productOfNemesis(info))) {
    openMissingNemesis(info, () => {
      collection.add(waveOfNemesis(info));
      collection.add(productOfNemesis(info));
      saveCollection();
      renderStartChoices();
      updateHomeCollection();
      resumeSavedGame(saved);
    });
    return;
  }
  resumeSavedGame(saved);
}
function openMissingNemesis(info, onContinue) {
  let close = () => {};
  const cancel = () => close();
  const dialog = dialogShell(I18N_IT.nemesisMissingTitle, '', cancel, { displayTitle: false });
  dialog.classList.add('ae-exit-confirm');
  dialog.appendChild(el('p', 'ae-modal-text', I18N_IT.nemesisMissingText(info.name,
    isMiniCode(info.boxCode) ? productName(info.boxCode) : waveLabel(waveOfNemesis(info)))));
  const footer = el('div', 'ae-modal-footer');
  const go = button(I18N_IT.continueLabel, 'primary', () => { close(); onContinue(); });
  footer.append(button(I18N_IT.cancel, 'secondary', cancel), go);
  dialog.appendChild(footer);
  close = openModal(dialog, { onCancel: cancel, initialFocus: go });
}
function resumeSavedGame(saved) {
  try {
    const previousSettings = settings;
    settings = saved.settings;
    try {
      restore(saved.state);
    } catch (err) {
      settings = previousSettings;
      throw err;
    }
    undoStack = Array.isArray(saved.undo) ? saved.undo : [];
    ui.gameSaved = true;
    ui.deckDark = false;
    startError.hidden = true;
    closeStart();
    render();
    prefetchDeckImages();
    (resolving ? resolveBtn : nemesisBtn).focus();
  } catch (err) {
    console.error(err);
    showStartError(I18N_IT.resumeError, false);
  }
}

function showStartError(text, withRetry) {
  startError.hidden = false;
  startErrorText.textContent = text;
  retryBtn.hidden = !withRetry;
}

