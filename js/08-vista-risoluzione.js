// 08-vista-risoluzione.js: VistaRisoluzione (turno nemesi): carta da risolvere e anteprima, pesca con retro, slide; render. Caricato in ordine da script.js insieme agli altri file di js/ (script classici, variabili globali).
'use strict';

// --- 8. VistaRisoluzione (turno nemesi) ---------------------------------------------------------------------------

// Scritta al centro ("Tier 2", "Tier 3", "Partita iniziata"), marcata: entra ingrandendosi con un bagliore dorato,
// resta, poi svanisce (1,76 s). App oscurata e non si può toccare; dopo si continua normalmente.
// Un testo lungo ha un carattere più piccolo (is-long), così sta nello schermo del telefono.
const TIER_BANNER_MS = 1760;
// Perché a volte andava a scatti: l'animazione partiva nello stesso fotogramma in cui la scritta veniva creata (e il
// carattere Cinzel a 64px poteva non essere ancora pronto), insieme al ridisegno dell'app. Ora: il carattere si carica
// all'avvio (preloadBannerFont); la scritta entra ferma e invisibile (is-preparing), si aspetta che il carattere sia
// pronto (al massimo 300 ms) e due fotogrammi, poi parte l'animazione.
function showBanner(text) {
  const banner = el('div', 'ae-tier-banner is-preparing');
  banner.setAttribute('role', 'status');
  banner.appendChild(el('span', 'ae-tier-banner-text' + (text.length > 8 ? ' is-long' : ''), text));
  document.body.appendChild(banner);
  let started = false;
  const go = () => {
    if (started) return;
    started = true;
    void banner.offsetWidth;
    banner.classList.remove('is-preparing');
    buzz([40, 60, 120]);
    setTimeout(() => banner.remove(), TIER_BANNER_MS);
  };
  const fontReady = document.fonts && document.fonts.load ? document.fonts.load(BANNER_FONT, text).catch(() => {}) : Promise.resolve();
  Promise.race([fontReady, new Promise(r => setTimeout(r, 300))]).then(() => {
    if (window.requestAnimationFrame) requestAnimationFrame(() => requestAnimationFrame(go));
    // il browser di prova non esegue requestAnimationFrame
    setTimeout(go, 60);
  });
}
const BANNER_FONT = '600 64px Cinzel';
function preloadBannerFont() {
  if (document.fonts && document.fonts.load) document.fonts.load(BANNER_FONT, 'Tier 123 Partita iniziata Vittoria!').catch(() => {});
}

// Vibrazione breve (solo dove il telefono la supporta: Android; iOS la ignora)
function buzz(pattern) {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (err) { /* niente vibrazione */ }
}

// Disegna tutto in base allo stato
// Nome della nemesi in testata (v216): il blocco è largo al massimo quanto la sua colonna (style.css .ae-phase
// max-width) e, se a 18px il nome non ci sta, il carattere scende in proporzione finché ci sta tutto, senza limite
// inferiore. L'altezza della riga resta 24px (line-height in px) e il letter-spacing in em segue la dimensione.
// root: la testata della partita o la sua copia (finestra del mazzo dei turni). Vale anche per il nome toccabile di
// "Crea mazzo" (.ae-phase-name--button). Si ricalcola a ogni render, al ridimensionamento e dopo il caricamento dei
// caratteri (document.fonts.ready), così non si misura con il carattere di riserva.
function fitPhaseName(root = phaseLabel) {
  const name = root && root.querySelector('.ae-phase-name');
  if (!name || !name.isConnected) return;
  name.style.fontSize = '';
  const style = getComputedStyle(name);
  const pad = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
  const room = name.clientWidth - pad;
  const text = name.scrollWidth - pad;
  // Nome nascosto (pagina iniziale sopra, testata non disegnata) o che ci sta già: carattere di base
  if (room <= 0 || text <= room + 0.5) return;
  const base = parseFloat(style.fontSize) || 18;
  let size = Math.floor(base * room / text * 100) / 100;
  name.style.fontSize = size + 'px';
  // Arrotondamenti del testo: si scende ancora di poco finché non c'è più niente di nascosto
  for (let i = 0; i < 12 && name.scrollWidth > name.clientWidth; i++) {
    size = Math.floor(size * 98) / 100;
    name.style.fontSize = size + 'px';
  }
}
window.addEventListener('resize', () => fitPhaseName());
// (la larghezza della testata cambia anche senza l'evento resize: rotazione, colonna del desktop, barra di scorrimento)
if (window.ResizeObserver) {
  let lastHeaderWidth = 0;
  new ResizeObserver(entries => {
    const width = Math.round(entries[0].contentRect.width);
    if (width === lastHeaderWidth) return;
    lastHeaderWidth = width;
    fitPhaseName();
  }).observe(document.getElementById('topbar'));
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fitPhaseName());

function render() {
  // Nel turno nemesi l'intestazione ha sempre il numero del turno
  // Tra Undo e Menu: il nome della nemesi della partita, in entrambi i turni
  // e sotto "Turno N" con il numero del turno nemesi (nascosto prima del primo turno nemesi)
  // A sinistra di "Turno N" l'icona del numero di giocatori (Assets/ui/icons/players-1..4.png, usata come maschera)
  const turnLine = el('span', 'ae-phase-turn');
  const players = Math.max(1, Math.min(4, Number(settings.players) || 1));
  const playersIcon = el('span', 'ae-players-icon');
  playersIcon.style.setProperty('--ae-players-icon', `url('Assets/ui/icons/players-${players}.png')`);
  playersIcon.setAttribute('role', 'img');
  playersIcon.setAttribute('aria-label', I18N_IT.players(players));
  // "Turno N" = giri del mazzo dei turni (v169; prima erano i turni nemesi)
  const turnText = el('span', '', I18N_IT.turnN(turnOrder.round));
  turnText.hidden = !(turnOrder.round >= 1);
  // Battaglia della nemesi: numero dentro la fiamma (Assets/ui/icons/flame.png); le informazioni sono separate da |
  const battleNo = battleOf(settings.nemesis);
  const battle = el('span', 'ae-battle-flame', battleNo ? String(battleNo) : '?');
  battle.setAttribute('role', 'img');
  battle.setAttribute('aria-label', battleNo ? I18N_IT.battle(battleNo) : I18N_IT.battleMissing);
  const sep = () => { const s = el('span', 'ae-info-sep', '|'); s.setAttribute('aria-hidden', 'true'); return s; };
  const sep2 = sep();
  sep2.hidden = turn < 1;
  turnLine.append(battle, sep(), playersIcon, sep2, turnText);
  phaseLabel.replaceChildren(el('span', 'ae-phase-name', settings.nemesis || ''), turnLine);
  // Modalità test (v215): "TEST · <scenario>" sempre visibile, sotto il nome della nemesi (non copre i comandi)
  if (testRun) phaseLabel.appendChild(el('span', 'ae-phase-test', I18N_IT.testLabel(testRun.name)));
  queueView.hidden = resolving;
  // la classe si toglie solo a vista nascosta (toglierla a vista visibile farebbe ripartire la dissolvenza)
  if (resolving) queueView.classList.remove('is-from-nemesis');
  resolveView.hidden = !resolving;
  app.classList.toggle('is-nemesis-turn', resolving);
  if (!resolving) app.classList.remove('is-draw-phase');
  nemesisBtn.hidden = resolving;
  nemesisBtn.disabled = !deckSetup;
  // "Turno Nemesi" con l'illustrazione della nemesi della partita (come nel menu iniziale), velata per leggere la scritta
  // Turno di un giocatore (o del jolly): niente illustrazione, fondo tenue del colore del giocatore (v169)
  const turnCard = currentTurnCard();
  // (jolly: il colore del giocatore che è jolly in questo giro)
  // (carta 1/2 o 3/4 non ancora scelta: metà e metà dei due colori, v192)
  // (attesa di "Pesca carta turno", v193: fondo grigio chiaro tenue, come il jolly)
  const playerKind = turnCardPlayer(turnCard) || (turnCard === 'wild' || isPairCard(turnCard) ? turnCard : null)
    || (awaitingTurnCard() ? 'wild' : null);
  nemesisBtn.classList.toggle('has-player-color', !!playerKind);
  if (playerKind) nemesisBtn.dataset.kind = playerKind;
  else delete nemesisBtn.dataset.kind;
  const nemesisArtNow = !playerKind && settings.nemesis && nemesisArt[settings.nemesis];
  nemesisBtn.classList.toggle('has-nemesis-art', !!nemesisArtNow);
  if (nemesisArtNow) nemesisBtn.style.setProperty('--ae-nemesis-art', `url("${encodeURI(nemesisArtNow.portrait)}")`);
  else nemesisBtn.style.removeProperty('--ae-nemesis-art');
  nemesisBtn.setAttribute('aria-disabled', String(ui.isTransitioning));
  // Turno giocatori con modifiche non salvate: il pulsante principale le salva
  const saving = !resolving && ui.drafts.size > 0;
  // v194: a inizio giro (dopo il primo) "Pesca la prima carta turno"; all'ultimo turno del giro "Fine turno · Mischia mazzo"
  // (durante l'animazione del mazzo mischiato resta "Fine turno · Mischia mazzo")
  nemesisBtn.textContent = saving ? I18N_IT.saveChanges
    : ui.trackShuffle ? I18N_IT.endTurnShuffle
    : awaitingTurnCard() ? (turnOrder.round >= 1 && !(turnOrder.history || []).length ? I18N_IT.drawFirstTurnCard : I18N_IT.drawTurnCard)
    : turnRoundOver() ? I18N_IT.endTurnShuffle : I18N_IT.endTurn;
  nemesisBtn.classList.toggle('is-save', saving);
  // "Crea mazzo": al posto del pulsante lo slider; sfondo nero fino alla fine del banner "Partita iniziata"
  if (ui.deckBuilding) nemesisBtn.hidden = true;
  if (deckSlider) deckSlider.box.hidden = !ui.deckBuilding;
  app.classList.toggle('is-deck-dark', ui.deckDark);
  app.classList.toggle('is-deck-building', ui.deckBuilding);
  // Nome della nemesi: durante "Crea mazzo" si tocca e apre la finestra con nemesi e giocatori
  const phaseName = phaseLabel.querySelector('.ae-phase-name');
  if (ui.deckBuilding && phaseName) {
    const nameBtn = el('button', 'ae-phase-name ae-phase-name--button', settings.nemesis || '');
    nameBtn.type = 'button';
    nameBtn.setAttribute('aria-haspopup', 'dialog');
    nameBtn.addEventListener('click', openGameSetup);
    phaseName.replaceWith(nameBtn);
  }
  fitPhaseName();
  if (cancelDraftsBtn) {
    cancelDraftsBtn.hidden = !saving || ui.deckBuilding;
    cancelDraftsBtn.parentElement.hidden = resolving;
  }
  updateInfo();
  renderDockPiles();
  renderTurnTrack();
  updateUndoBtn();
  if (ui.tierBanner) {
    ui.tierWaitUntil = performance.now() + TIER_BANNER_MS;
    showBanner(I18N_IT.tierN(ui.tierBanner));
    ui.tierBanner = null;
  }
  if (resolving) renderResolve();
  else {
    resolveBtn.hidden = true;
    backBtn.hidden = true;
    resolveHint.hidden = true;
    renderQueue();
  }
  checkVictory();
}

function activeEntry() {
  return queue[currentIndex] || null;
}

// Passo "da pescare": tutte le carte in gioco sono state risolte; si vede la prossima carta del mazzo coperta e il
// pulsante "Pesca". Si pesca solo quando il giocatore lo tocca (la carta poi si gira).
const DRAW_UID = -1;
function isDrawStep() {
  return Regole.isDrawStep(gameParts());
}
function canDraw() {
  return Regole.canDraw(gameParts());
}

// Testo del pulsante per la carta da risolvere (tabella §7.3). Anche sull'ultima carta si va solo avanti: la pesca è
// un passo a parte, con il pulsante "Pesca".
function actionText(entry, isNew) {
  const { data, tokens } = entry;
  // Minion con vita "?" (v218): non si mette in gioco finché non si imposta la vita; il pulsante apre la sua scheda
  if (hpUnset(entry)) return I18N_IT.ctaSetHp;
  // (ultima carta del giro dei turni: "Metti in gioco · Mischia mazzo", v194)
  if (isNew) return data.type === 'Attack' ? I18N_IT.ctaResolved
    : turnRoundOver() ? I18N_IT.ctaPutInPlayShuffle : I18N_IT.ctaPutInPlayEnd;
  // Potere: il token se ne va da solo; il pulsante dice solo cosa succede dopo
  if (data.type === 'Power') return tokens > 1 ? I18N_IT.ctaPowerNext : I18N_IT.ctaPowerLast;
  // Minion (resta in gioco) e attacco (va negli scarti)
  return I18N_IT.ctaResolved;
}

// Fascia del turno nemesi dentro .ae-rail-row (creata qui una volta sola) e classi della fase di pesca
function renderResolveInfo(drawStep) {
  if (!rail.parentElement.classList.contains('ae-rail-row')) {
    const row = el('div', 'ae-rail-row');
    rail.before(row);
    row.appendChild(rail);
  }
  resolveView.classList.toggle('is-draw-phase', drawStep);
  // Lo sfondo della vista è sull'app intera (anche dietro al pulsante principale)
  app.classList.toggle('is-draw-phase', drawStep);
}
function renderResolve() {
  const drawStep = isDrawStep();
  renderResolveInfo(drawStep);
  const active = activeEntry();
  if (!active && !drawStep) return;
  const isNewStep = newIndex >= 0;
  const viewedUid = ui.holdUid || ui.viewedUid;
  // Nel passo da pescare la carta "da risolvere" è la carta coperta (DRAW_UID)
  const viewed = (viewedUid === DRAW_UID && drawStep) ? null : (entryByUid(viewedUid) || active);
  const viewingDraw = drawStep && !viewed;
  if (!ui.holdUid) ui.viewedUid = viewingDraw ? DRAW_UID : viewed.uid;
  const previewing = !ui.holdUid && (drawStep ? !viewingDraw : viewed !== active);

  // Fascia compatta: rosso = da risolvere, avorio = mostrata
  const railScroll = rail.scrollLeft;
  const railScrollTop = rail.scrollTop;
  const railItems = queue.map((entry, i) => queueItem(entry, {
    compact: true, index: i, total: queue.length, current: entry === active, viewed: entry === viewed
  }));
  // Potere da risolvere: anche nella fascia il token lampeggia e diventa grigio insieme a quello della carta grande.
  // La fascia si ridisegna spesso: l'animazione riparte dal punto giusto (ritardo negativo) o il token resta nascosto.
  if (newIndex < 0 && active && active.data.type === 'Power') {
    const key = turn + ':' + currentIndex + ':' + active.uid + ':' + active.tokens;
    // Prima carta del turno: l'animazione parte quando lo sfondo ha finito di scorrere (ui.bgSlideUntil)
    if (ui.autoTokenKey !== key) { ui.autoTokenKey = key; ui.autoTokenAt = Math.max(performance.now(), ui.bgSlideUntil || 0); }
    const badge = railItems[currentIndex] && railItems[currentIndex].querySelector('.ae-status-badge');
    if (badge) {
      badge.classList.add('is-auto-token');
      badge.style.setProperty('--ae-token-delay', (ui.autoTokenAt - performance.now()) + 'ms');
    }
  }
  // In fondo alla fascia, finché non si pesca: la prossima carta del mazzo, coperta (retro) con NUOVA
  // Il dorso compare nella fascia solo al passo Pesca (non dall'inizio del turno nemesi)
  if (drawStep && canDraw()) railItems.push(nextCardItem({ current: drawStep, viewed: viewingDraw }));
  // Fase di risoluzione: al posto della carta da pescare solo una cornice tratteggiata grigia (come mazzo e scarti vuoti)
  else if (!drawStep && newIndex < 0 && canDraw()) railItems.push(nextSlotItem());
  rail.replaceChildren(...railItems);
  rail.scrollLeft = railScroll;
  rail.scrollTop = railScrollTop;
  const viewedItem = rail.querySelector(`[data-uid="${ui.viewedUid}"]`);
  if (viewedItem) scrollItemInto(rail, viewedItem, 'nearest');

  renderFocus(viewingDraw ? { uid: DRAW_UID } : viewed);

  // Dock: in anteprima al posto dell'azione c'è "Torna alla carta da risolvere"
  const text = drawStep ? I18N_IT.ctaDraw : actionText(active, isNewStep);
  backBtn.textContent = drawStep ? I18N_IT.backToDraw : I18N_IT.backToActive;
  resolveBtn.hidden = previewing;
  backBtn.hidden = !previewing;
  resolveBtn.textContent = text;
  // Fase di pesca: pulsante dorato, diverso da quelli della risoluzione
  resolveBtn.classList.toggle('is-draw', drawStep);
  // Durante l'animazione il pulsante resta focalizzabile ma non accetta tocchi (aria-disabled, controllato in onResolveClick)
  resolveBtn.setAttribute('aria-disabled', String(ui.isTransitioning));
  // Niente suggerimento sopra il pulsante: lo spazio resta alla carta
  resolveHint.hidden = true;
  // Ridimensiona di nuovo ora che il pulsante in basso è visibile: alla prima carta del turno nemesi il pulsante
  // compariva solo dopo il primo calcolo, quindi la carta era misurata su uno spazio più alto e usciva in basso
  sizeFocus(!ui.fromScroll);
}

// Carta in primo piano: solo immagine (o retro durante la pesca) e stato numerico. Nessuna etichetta, nome o tipo
// (nemmeno in anteprima): tutto lo spazio va alla carta.
// Riga sopra la carta grande del turno nemesi: goccia + vita (minion) o un token per ogni token (potere); vuota per gli attacchi
function focusStatus(entry) {
  const status = el('p', 'ae-focus-status');
  if (hasHp(entry)) {
    status.classList.add('is-hp');
    // Solo la vita attuale: "x/X" si vede solo mentre si fa danno (box del turno giocatori e finestra della vita)
    // (v214: "?" per un minion a vita variabile non ancora impostata)
    status.append(icon('heart'), el('span', '', hpUnset(entry) ? '?' : String(entry.hp)));
    // (v218: il box "?" si tocca e apre la scheda della carta, unsetHpClick)
    if (hpUnset(entry)) { status.classList.add('is-unset'); status.dataset.uid = String(entry.uid); }
  } else if (entry.data.type === 'Power') {
    status.classList.add('is-token');
    status.appendChild(tokenIcons(entry.tokens));
  }
  status.setAttribute('aria-label', statusText(entry));
  return status;
}

// Carosello del turno nemesi: tutte le carte della coda in fila in un contenitore che scorre da solo (scroll-snap).
// La carta mostrata è quella al centro; ai lati si vede un pezzo della precedente e della successiva. Lo slide è lo
// scorrimento nativo del browser; quando si ferma su un'altra carta, quella diventa la carta mostrata.
// Le carte si ridisegnano solo quando cambia qualcosa (coda, vita, token, pesca); altrimenti il carosello scorre e basta.
const PEEK_VISIBLE = 14;   // px visibili di ogni carta vicina
const PEEK_GAP = 12;       // spazio tra le carte
let focusTrack = null;
let focusSignature = '';
let focusProgrammaticUntil = 0;   // fino a quando lo scorrimento è quello avviato dallo script (non dal dito)

function focusSlide(entry) {
  const slide = el('div', 'ae-focus-slide');
  slide.dataset.uid = entry.uid;
  const reveal = ui.reveal && ui.reveal.uid === entry.uid ? ui.reveal : null;
  const stage = el('div', 'ae-focus-stage');
  if (reveal && reveal.status !== 'done') {
    stage.appendChild(flipCard(entry, reveal));
  } else {
    stage.appendChild(cardArt(entry.data, { sync: true }));
  }
  if (entry.isNew) {
    // Carta appena pescata: glow dorato attorno (come nella versione 1) ed etichetta NUOVA
    stage.classList.add('is-new');
    const tag = el('span', 'ae-new-tag', I18N_IT.newTag);
    tag.setAttribute('aria-hidden', 'true');
    stage.appendChild(tag);
  }
  // Stato sopra la carta: la riga c'è sempre, anche vuota (attacchi), così ogni carta ha la stessa dimensione
  const status = focusStatus(entry);
  if (ui.holdUid === entry.uid) status.classList.add('is-dropping', 'is-bumped');
  // Potere da risolvere: dopo 1 secondo un token sfuma da solo (il pulsante poi va solo avanti o scarta)
  if (newIndex < 0 && entry === queue[currentIndex] && entry.data.type === 'Power') {
    status.classList.add('is-auto-token');
    // stesso istante della fascia (dopo lo scorrimento dello sfondo, se è la prima carta del turno)
    status.style.setProperty('--ae-token-delay', ((ui.autoTokenAt || 0) - performance.now()) + 'ms');
  }
  // Carta appena pescata: durante il caricamento la riga è nascosta; mentre si gira, i token o la vita compaiono dopo
  // la rotazione. Un attacco pescato lampeggia di rosso.
  if (reveal && reveal.status === 'loading') slide.classList.add('is-draw-loading');
  if (reveal && (reveal.status === 'ready' || reveal.status === 'flipping')) slide.classList.add('is-drawing');
  if (entry.isNew && newIndex >= 0 && entry.data.type === 'Attack' && !(reveal && reveal.status === 'loading')) stage.classList.add('is-attack-drawn');
  // Carta da risolvere: lampeggia di rosso come l'attacco pescato (non i poteri con più di un token)
  if (newIndex < 0 && entry === queue[currentIndex] && !(entry.data.type === 'Power' && entry.tokens > 1)) {
    stage.classList.add('is-to-resolve');
  }
  slide.append(status, stage);
  return slide;
}

// Carta da pescare: il retro, con NUOVA; si gira dopo il tocco su "Pesca"
function drawSlide() {
  const slide = el('div', 'ae-focus-slide ae-focus-slide--draw');
  slide.dataset.uid = DRAW_UID;
  const stage = el('div', 'ae-focus-stage is-new');
  // Toccando il retro la carta si pesca (come il pulsante "Pesca")
  stage.setAttribute('role', 'button');
  stage.tabIndex = 0;
  stage.setAttribute('aria-label', I18N_IT.ctaDraw);
  const art = el('div', 'ae-card-art ae-card-back');
  const img = document.createElement('img');
  img.alt = I18N_IT.nextCard;
  img.src = CARD_BACK;
  art.appendChild(img);
  const tag = el('span', 'ae-new-tag', I18N_IT.newTag);
  tag.setAttribute('aria-hidden', 'true');
  stage.append(art, tag);
  slide.append(el('p', 'ae-focus-status'), stage);
  return slide;
}

function focusStateSignature() {
  return (isDrawStep() || newIndex >= 0 ? 'solo' + newIndex + ':' + ui.viewedUid + '|' : '') + 'c' + currentIndex + '|' + queue.map(e => [e.uid, e.hp, e.tokens, e.isNew ? 1 : 0].join(':')).join('|')
    + '#' + (ui.reveal ? ui.reveal.uid + ':' + ui.reveal.status : '') + '#' + (ui.holdUid || '');
}

function renderFocus(viewed) {
  if (!focusTrack || !focusTrack.isConnected) {
    focusTrack = el('div', 'ae-focus-track');
    focusEl.replaceChildren(focusTrack);
    focusSignature = '';
  }
  // Token e vita della carta pescata compaiono dopo il banner Tier (se c'è)
  focusEl.style.setProperty('--ae-tier-wait', Math.max(0, Math.round(ui.tierWaitUntil - performance.now())) + 'ms');
  const prevUid = focusEl.dataset.uid;
  const viewedChanged = prevUid !== String(viewed.uid);
  focusEl.dataset.uid = viewed.uid;
  if (focusStateSignature() !== focusSignature || !focusTrack.children.length) {
    // Passo Pesca: si vede solo la carta da girare (le carte già risolte a sinistra spariscono); se si guarda un'altra
    // carta dalla fascia, c'è solo quella accanto
    let slides;
    // Anche dopo la pesca si vede solo la carta pescata. La carta da pescare e quella pescata sono un po' più grandi.
    if (isDrawStep() || newIndex >= 0) {
      const drawn = newIndex >= 0 ? queue[newIndex] : null;
      const mainUid = drawn ? drawn.uid : DRAW_UID;
      const other = viewed.uid !== mainUid ? entryByUid(viewed.uid) : null;
      const main = drawn ? focusSlide(drawn) : drawSlide();
      main.classList.add('is-big');
      slides = [...(other ? [focusSlide(other)] : []), main];
    } else {
      slides = queue.map(focusSlide);
    }
    focusTrack.replaceChildren(...slides);
    // La firma si calcola dopo: disegnare la carta pescata può far avanzare il suo stato (pronta → si gira)
    focusSignature = focusStateSignature();
    sizeFocus(false);
    const prevStill = prevUid && focusTrack.querySelector(`.ae-focus-slide[data-uid="${prevUid}"]`);
    if (viewedChanged && prevStill) {
      // Si passa a una carta che c'era già (minion che resta, token tolto): il carosello scorre fino a lei
      scrollFocusTo(prevUid, false, true);
      scrollFocusTo(viewed.uid, true);
    } else {
      scrollFocusTo(viewed.uid, false, true);
      // La carta mostrata prima è sparita (risolta, negli scarti): la nuova entra con una breve animazione
      if (viewedChanged && prevUid) {
        const slide = focusTrack.querySelector(`.ae-focus-slide[data-uid="${viewed.uid}"]`);
        if (slide && !(ui.reveal && ui.reveal.uid === viewed.uid)) slide.classList.add('is-entering');
      }
    }
  } else if (!ui.fromScroll) {
    // Stesse carte: si porta al centro la carta mostrata (tocco sulla fascia, "Torna alla carta da risolvere", ...)
    scrollFocusTo(viewed.uid, viewedChanged);
  }
}

// smooth = scorrimento animato. Senza smooth la carta va al centro subito, tranne quando è in corso uno scorrimento
// animato avviato dallo script: allora si aggiorna solo la meta (altrimenti un ridisegno o un ridimensionamento
// interromperebbe l'animazione con un salto). jump = salto immediato comunque (carosello appena ridisegnato, misure).
function scrollFocusTo(uid, smooth, jump = false) {
  const slide = focusTrack && focusTrack.querySelector(`.ae-focus-slide[data-uid="${uid}"]`);
  if (!slide) return;
  const left = slide.offsetLeft + slide.offsetWidth / 2 - focusEl.clientWidth / 2;
  if (!smooth && !jump && performance.now() < focusProgrammaticUntil) smooth = true;
  if (Math.abs(focusEl.scrollLeft - left) < 1) return;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (smooth && !reduce) {
    focusProgrammaticUntil = performance.now() + FAST_SCROLL_MS + 200;
    fastScrollTo(focusEl, left);
  } else {
    cancelFastScroll(focusEl);
    focusEl.scrollLeft = left;
  }
}

function centredFocusUid() {
  if (!focusTrack) return null;
  const middle = focusEl.scrollLeft + focusEl.clientWidth / 2;
  let best = null;
  let bestDist = Infinity;
  for (const slide of focusTrack.children) {
    const d = Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - middle);
    if (d < bestDist) { bestDist = d; best = Number(slide.dataset.uid); }
  }
  return best;
}

// Il dito ha portato al centro un'altra carta: diventa la carta mostrata (fascia e pulsante si aggiornano)
let focusScrollFrame = 0;
focusEl.addEventListener('scroll', () => {
  if (focusScrollFrame) return;
  // circa un controllo per fotogramma (setTimeout invece di requestAnimationFrame: funziona anche a pagina in background)
  focusScrollFrame = setTimeout(() => {
    focusScrollFrame = 0;
    if (!resolving || ui.holdUid || ui.isTransitioning || performance.now() < focusProgrammaticUntil) return;
    const uid = centredFocusUid();
    if (uid === null || uid === ui.viewedUid) return;
    ui.viewedUid = uid;
    ui.fromScroll = true;
    renderResolve();
    ui.fromScroll = false;
  }, 16);
}, { passive: true });

// Larghezza della carta grande: UNA sola regola per turno giocatori e turno nemesi, così sono sempre uguali.
// Sopra la carta il box vita/token (STATUS_H + 8 di spazio); i comandi del turno giocatori (52px) stanno sotto, quindi
// si riserva lo spazio anche nel turno nemesi; il blocco è centrato in verticale.
// Altezza della riga vita/token sopra la carta: deve restare uguale a style.css .ae-focus-status e .queue-slot
const STATUS_H = 37;
function sharedCardWidth(boxW, boxH, padY, peekRoom) {
  const byWidth = boxW - 16 - peekRoom; // 8px di margine per lato
  const byHeight = (boxH - padY - STATUS_H - 8) / CARD_RATIO;
  const byControls = (boxH - 2 * 52 - STATUS_H - 8) / CARD_RATIO;
  return Math.floor(Math.min(byWidth, byHeight, byControls));
}

// Tablet e desktop (da 768px): la partita sta in una colonna al centro (--ae-col su .ae-shell, style.css). La colonna
// è larga quanto la carta grande (misurata solo dall'altezza: in larghezza c'è spazio) più un pezzo delle vicine
// (COLUMN_PEEK per lato), mai meno di COLUMN_MIN né più dello schermo. Sotto i 768px la colonna è lo schermo intero.
const COLUMN_MIN = 440;
const COLUMN_PEEK = 42;
function sizeColumn(box) {
  if (window.innerWidth < 768) { app.style.removeProperty('--ae-col'); return; }
  const style = getComputedStyle(box);
  const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  const card = sharedCardWidth(Infinity, box.clientHeight, padY, 0);
  if (!isFinite(card) || card <= 0) return;
  const col = Math.min(window.innerWidth, Math.max(COLUMN_MIN, card + 2 * (COLUMN_PEEK + PEEK_GAP) + 16));
  const current = parseFloat(app.style.getPropertyValue('--ae-col')) || 0;
  if (Math.abs(current - col) >= 1) app.style.setProperty('--ae-col', col + 'px');
}

// Dimensiona le carte del carosello: alte quanto lo spazio, ma più strette dell'area quanto basta per vedere un pezzo
// delle vicine. Il margine ai lati permette di centrare anche la prima e l'ultima carta.
const BIG_CARD_SCALE = 0.9;
function sizeFocus(recentre = true) {
  if (resolveView.hidden || !focusTrack) return;
  const slide = focusTrack.querySelector('.ae-focus-slide');
  if (!slide) return;
  sizeColumn(focusEl);
  const style = getComputedStyle(focusEl);
  const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  const peekRoom = queue.length > 1 ? 2 * (PEEK_VISIBLE + PEEK_GAP) : 0;
  const width = Math.max(40, sharedCardWidth(focusEl.clientWidth, focusEl.clientHeight, padY, peekRoom));
  focusEl.style.setProperty('--ae-focus-w', width + 'px');
  focusEl.style.setProperty('--cw', width + 'px');
  focusTrack.style.paddingInline = Math.max(0, (focusEl.clientWidth - width) / 2) + 'px';
  // Carta da pescare e carta pescata: più grandi (fino al 30%), stessa misura per dorso e fronte. Cresce solo la carta:
  // la riga vita/token resta grande come nelle altre carte. Il blocco (riga + carta) è centrato in verticale tra la
  // fascia piccola e il pulsante (style.css .ae-focus-slide.is-big), con 4px di margine sopra e sotto.
  const byHeight = (focusEl.clientHeight - 8 - STATUS_H - 8) / CARD_RATIO;
  // ... ridotta al 90% (BIG_CARD_SCALE) della misura massima: a tutta grandezza era troppo grande
  const bigW = Math.floor(Math.max(width, Math.min(width * 1.3, byHeight, focusEl.clientWidth - 16)) * BIG_CARD_SCALE);
  focusEl.style.setProperty('--ae-big-w', bigW + 'px');
  if (recentre && focusEl.dataset.uid) scrollFocusTo(focusEl.dataset.uid, false);
}

// Carta pescata: retro (con "Caricamento carta…") finché l'immagine non è pronta, poi si gira in 350ms.
// Se l'immagine non arriva: segnaposto con nome e tipo e "Riprova immagine"; il gioco può proseguire comunque.
function flipCard(entry, reveal) {
  const flip = el('div', 'ae-flip');
  const inner = el('div', 'ae-flip-inner');
  const back = el('div', 'ae-flip-face ae-flip-face--back');
  const backImg = document.createElement('img');
  backImg.alt = '';
  backImg.src = CARD_BACK;
  back.appendChild(backImg);
  const front = el('div', 'ae-flip-face ae-flip-face--front');
  inner.append(back, front);
  flip.appendChild(inner);

  if (reveal.status === 'error') {
    flip.classList.add('is-flipped');
    const holder = el('div', 'ae-flip-error');
    holder.appendChild(placeholderArt(entry.data));
    front.appendChild(holder.firstChild);
    const retry = button(I18N_IT.retryImage, 'secondary', () => {
      reveal.status = 'loading';
      startReveal(entry);
    });
    retry.classList.add('ae-flip-loading');
    retry.style.minHeight = '44px';
    flip.appendChild(retry);
    return flip;
  }

  front.appendChild(cardArt(entry.data, { sync: true }));
  if (reveal.status === 'loading') {
    flip.appendChild(el('p', 'ae-hint ae-flip-loading', I18N_IT.loadingCard));
  } else if (reveal.status === 'ready') {
    // Immagine pronta: si gira subito dopo essere stata disegnata; finita la rotazione resta la carta normale
    setTimeout(() => flip.classList.add('is-flipped'), 30);
    reveal.status = 'flipping';
    setTimeout(() => { if (reveal.status === 'flipping') reveal.status = 'done'; }, DRAW_MS + 50);
  } else if (reveal.status === 'flipping') {
    // Ridisegnata durante la rotazione: già girata, senza ripartire
    flip.classList.add('is-flipped');
  }
  return flip;
}

// Avvia il caricamento dell'immagine della carta pescata; alla fine la carta si gira (se è ancora quella mostrata)
function startReveal(entry) {
  ui.reveal = { uid: entry.uid, status: 'loading' };
  const reveal = ui.reveal;
  loadImage(encodeURI(entry.data.image)).then(ok => {
    if (ui.reveal !== reveal) return;
    reveal.status = ok ? 'ready' : 'error';
    if (resolving) renderResolve();
  });
}

// Scarica in anticipo le immagini che serviranno: prossima carta del mazzo e carta dopo quella da risolvere
function preloadNext() {
  const next = deck[deck.length - 1];
  if (next) loadImage(encodeURI(next.image));
  const after = queue[currentIndex + 1];
  if (after) loadImage(encodeURI(after.data.image));
}

// Un nuovo turno: la carta pescata nel turno precedente non è più "nuova"; coda vuota: si va subito alla carta da
// pescare (o, se non c'è niente da pescare, il turno finisce)
function startResolution() {
  withGame(g => Regole.startResolution(g));
}

// Pesca una carta in fondo alla coda e la mostra come nuova (NUOVA, entra girandosi dal retro). Mazzo vuoto (non si
// rimescola): si torna alla VistaCoda
function drawNewCard() {
  const drawn = withGame(g => Regole.drawNewCard(g, () => nextUid++, () => Date.now()));
  if (!drawn) return;
  const { data } = drawn.entry;
  ui.lastDrawnUid = drawn.entry.uid;
  // Carta pescata: vibrazione breve, doppia e più forte per un attacco (la scritta Tier, se c'è, ha la sua)
  buzz(data.type === 'Attack' ? [80, 60, 80] : 30);
  // Prima carta del Tier 2 o del Tier 3: scritta "Tier N" al centro (mostrata da render); nelle statistiche da qui
  // comincia il tempo del nuovo Tier (stats.tierAt, in Regole.drawNewCard)
  if (drawn.newTier) ui.tierBanner = drawn.newTier;
}

// Ritorno alla VistaCoda
function endResolution() {
  withGame(g => Regole.endResolution(g));
}

function nemesisTurn() {
  withGame(g => Regole.nemesisTurn(g));
}

// "Fine turno" nel turno di un giocatore: finisce il turno e si estrae il turno dopo dal mazzo dei turni.
// Nemesi: parte il turno nemesi; giocatore o jolly: resta il turno giocatori, con il colore nuovo nella barra.
function endPlayerTurn() {
  // Le modifiche non salvate si perdono; danno e cura del turno si azzerano (la vita attuale diventa il riferimento) e
  // le carte grigie (poteri con il costo pagato, minion a 0) vanno negli scarti
  ui.drafts.clear();
  withGame(g => Regole.endPlayerTurnCards(g));
  if (nextTurnCard() === 'nemesis') nemesisTurn();
}

// Fine del turno nemesi ("Metti in gioco · Fine turno nemesi"): si estrae il turno dopo; se è di nuovo la nemesi, il
// turno nemesi riparte subito. Ultima carta del giro: mazzo dei turni mischiato e attesa (v194)
function afterNemesisTurn() {
  if (nextTurnCard() === 'nemesis') nemesisTurn();
}

// Animazione "mazzo mischiato" della barra della fase (v194), a fine giro. Le scritte sotto la barra svaniscono e le
// caselle diventano grigie e tutte uguali (render con ui.trackShuffle, transizioni di style.css); poi, veloci, le 6
// caselle si uniscono in una sola al centro, si fermano un attimo e tornano al loro posto. fadeMs: attesa della
// dissolvenza (0 se è già avvenuta, per esempio durante il passaggio dal turno nemesi)
const SHUFFLE_FADE_MS = 320;
const SHUFFLE_MERGE_MS = 760;
function beginTrackShuffle() {
  ui.trackShuffle = true;
  turnTrack.classList.add('is-shuffling');
}
function playTurnShuffle(fadeMs) {
  beginTrackShuffle();
  const motion = !reducedMotion.matches && !!turnTrackBar.animate;
  const fade = motion ? fadeMs : 0;
  const merge = motion ? SHUFFLE_MERGE_MS : 0;
  lockFor(fade + merge + 40, () => {
    ui.trackShuffle = false;
    turnTrack.classList.remove('is-shuffling');
    nemesisBtn.focus({ preventScroll: true });
    announce(I18N_IT.drawFirstTurnCard);
  });
  render();
  if (!motion) return;
  setTimeout(() => {
    const bar = turnTrackBar.getBoundingClientRect();
    const cx = bar.left + bar.width / 2;
    [...turnTrackBar.children].forEach(seg => {
      const r = seg.getBoundingClientRect();
      const dx = cx - (r.left + r.width / 2);
      seg.animate([
        { transform: 'none' },
        { transform: `translateX(${dx}px)`, offset: 0.3 },
        { transform: `translateX(${dx}px)`, offset: 0.62 },
        { transform: 'none' }
      ], { duration: merge, easing: 'ease-in-out' });
    });
  }, fade);
}

// Logica del pulsante principale (come nella v48): agisce sulla carta da risolvere in base al suo tipo.
// Restituisce cosa è successo, per l'animazione: 'token', 'discard', 'next', 'play'.
// Carta appena pescata: un attacco si risolve subito ed esce dalla coda, le altre restano e smettono di essere nuove;
// poi ritorno alla VistaCoda. Altrimenti: potere con più token = −1 token e avanti; minion = resta e avanti; potere
// all'ultimo token o attacco = negli scarti. Finita la coda si passa alla carta da pescare (coperta); se non c'è niente
// da pescare il turno finisce (Regole.resolveCurrent)
function resolveCurrent() {
  return withGame(g => Regole.resolveCurrent(g));
}

// Tocco sul pulsante principale: prima la partita cambia (un passo di undo, salvataggio), poi l'animazione.
// Fino alla fine dell'animazione il pulsante non accetta altri tocchi (un tocco = un solo evento di gioco).
function onResolveClick() {
  if (!resolving || ui.isTransitioning) return;
  if (isDrawStep()) {
    // "Pesca": la carta coperta diventa la carta pescata, che si gira
    if (ui.viewedUid !== DRAW_UID) return;
    const roundAtDraw = turnOrder.round;
    act(() => {
      drawNewCard();
      // Mazzo vuoto: il turno nemesi finisce e si estrae il turno dopo
      if (!resolving) afterNemesisTurn();
    });
    if (resolving) {
      showActive(activeEntry());
      lockFor(duration('focus'));
    }
    render();
    // (mazzo vuoto all'ultimo turno del giro: mazzo dei turni mischiato, v194)
    if (!resolving && awaitingTurnCard() && turnOrder.round !== roundAtDraw) playTurnShuffle(SHUFFLE_FADE_MS);
    return;
  }
  const active = activeEntry();
  if (!active || ui.viewedUid !== active.uid) return;
  // Minion con vita "?" (v218): "Imposta la vita" apre la scheda della carta; si va avanti solo dopo averla impostata
  if (hpUnset(active)) {
    if (ui.reveal && ui.reveal.uid === active.uid && ui.reveal.status !== 'done') return;
    openCardDialog(active);
    return;
  }
  const ghostSource = focusEl.querySelector(`.ae-focus-slide[data-uid="${active.uid}"] .ae-focus-stage`);
  const wasNewStep = newIndex >= 0;
  const turnBefore = turn;
  const roundBefore = turnOrder.round;
  const effect = act(() => {
    const result = resolveCurrent();
    // Fine del turno nemesi: si estrae il turno dopo dal mazzo dei turni
    if (!resolving) afterNemesisTurn();
    return result;
  });
  // Dal mazzo dei turni è uscita di nuovo la nemesi: il turno nemesi riparte (scossa e annuncio)
  if (resolving && turn !== turnBefore) {
    shakeApp();
    announce(I18N_IT.trackNemesisResolve);
  }

  // Fine dell'ultimo turno del giro (v194): mazzo dei turni mischiato; scritte e colori della barra svaniscono durante
  // il passaggio al turno giocatori, poi le caselle si uniscono e si separano
  const roundShuffled = !resolving && awaitingTurnCard() && turnOrder.round !== roundBefore;
  const shuffleAfter = roundShuffled ? () => playTurnShuffle(0) : undefined;
  if (roundShuffled) beginTrackShuffle();
  if (!resolving) {
    // Fine del turno nemesi: si torna alla VistaCoda con la carta pescata in vista
    // Carta appena pescata e messa in gioco (si prende dalla carta risolta, non da ui.lastDrawnUid: dopo un undo gli uid cambiano)
    const kept = (wasNewStep && entryByUid(active.uid)) || entryByUid(ui.lastDrawnUid);
    const anchorUid = kept ? kept.uid : (queue.length ? queue[queue.length - 1].uid : null);
    ui.queueAnchor = anchorUid ? { uid: anchorUid, align: queue.length === 1 ? 'center' : 'anchor' } : null;
    ui.reveal = null;
    ui.viewedUid = null;
    if (effect === 'discard' && ghostSource) {
      // Attacco appena pescato: vola negli scarti restando nel turno nemesi; quando atterra si passa al turno giocatori
      flyToDiscard([ghostSource]);
      ghostSource.style.visibility = 'hidden';
      // Il blocco dura anche per l'entrata delle carte da sinistra: lockFor alla fine ridisegna, e farlo prima
      // interromperebbe l'animazione
      const flyMs = reducedMotion.matches ? 150 : FLY_MS + 80;
      lockFor(flyMs + (reducedMotion.matches ? 0 : ENTER_MS + 40), shuffleAfter);
      setTimeout(() => { toPlayersTurn(null); nemesisBtn.focus(); }, flyMs);
      return;
    }
    // Carta messa in gioco: passaggio morbido, la carta grande si trasforma nella carta del turno giocatori e le altre
    // entrano da sinistra (vedi toPlayersTurn)
    lockFor(reducedMotion.matches ? duration('phase') : Math.max(MORPH_MS, MORPH_MS / 2 + ENTER_MS) + 40, shuffleAfter);
    toPlayersTurn(kept && ghostSource ? kept.uid : null, ghostSource);
    if (wasNewStep) nemesisBtn.focus();
    return;
  }

  const next = activeEntry();
  // Carta risolta e scartata: vola verso la pila degli scarti in alto
  if (effect === 'discard' && ghostSource) flyToDiscard([ghostSource]);
  showActive(next);
  lockFor(duration(effect === 'discard' ? 'discard' : 'focus'));
  render();
  // Risolta l'ultima carta: la carta da pescare arriva volando dal mazzo, dopo che la carta scartata è atterrata
  if (isDrawStep()) animateDrawIn(effect === 'discard' && ghostSource ? FLY_MS + 60 : 0);
}

// Dopo un'azione si mostra la nuova carta da risolvere (o la carta appena pescata, che si gira)
function showActive(entry) {
  const current = activeEntry();
  ui.viewedUid = current ? current.uid : (isDrawStep() ? DRAW_UID : null);
  if (current && newIndex >= 0 && current.isNew && (!ui.reveal || ui.reveal.uid !== current.uid)) {
    startReveal(current);
    announce(I18N_IT.cardDrawn(current.data.name));
  }
  preloadNext();
}

function onNemesisClick(e) {
  if (resolving || ui.isTransitioning || !deckSetup) return;
  // Durante "Crea mazzo" al posto del pulsante c'è lo slider (deckSlider)
  if (ui.deckBuilding) return;
  // Con modifiche non salvate il pulsante è "Salva modifiche"
  if (ui.drafts.size) {
    saveAllDrafts();
    return;
  }
  // Carta x/y senza giocatore: si sceglie nella finestra (v193)
  if (needsPairChoice()) return;
  // Fine dell'ultimo turno del giro: mazzo dei turni mischiato, animazione, poi "Pesca la prima carta turno" (v194)
  const roundEnding = !awaitingTurnCard() && turnRoundOver();
  act(awaitingTurnCard() ? drawFirstTurn : endPlayerTurn);
  if (roundEnding) {
    playTurnShuffle(SHUFFLE_FADE_MS);
    return;
  }
  if (!resolving) {
    // Dal mazzo dei turni è uscito un giocatore (o il jolly): si resta nel turno giocatori, cambia il colore della barra
    render();
    announce(turnTrack.getAttribute('aria-label'));
    turnTrack.classList.remove('is-changed');
    void turnTrack.offsetWidth;
    turnTrack.classList.add('is-changed');
    return;
  }
  enterNemesisTurnView();
}

// Inizio del turno nemesi a schermo (dopo che lo stato è già passato al turno nemesi)
function enterNemesisTurnView() {
  // Urgenza: una breve scossa dello schermo e una vibrazione
  shakeApp();
  // Lo sfondo scorre verso il lato della nemesi (0,8 s, style.css .ae-shell): il token della prima carta aspetta
  ui.bgSlideUntil = reducedMotion.matches ? 0 : performance.now() + BG_SLIDE_MS;
  ui.viewedUid = null;
  // Le carte non spariscono e non ricompaiono: niente dissolvenza della vista, la fascia piccola resta dove era
  // (stesso scorrimento); cambiano solo lo sfondo e i pulsanti
  const railScroll = queueRail ? queueRail.scrollLeft : 0;
  // Le carte grandi partono dalla carta che si stava guardando e scorrono fino alla prima da risolvere (renderFocus)
  const shownUid = queue.length ? centredQueueUid() : null;
  if (shownUid !== null && entryByUid(shownUid)) focusEl.dataset.uid = String(shownUid);
  else delete focusEl.dataset.uid;
  if (resolving) {
    showActive(activeEntry());
    resolveView.classList.remove('is-entering');
    lockFor(duration('phase'));
  }
  render();
  if (resolving) {
    rail.scrollLeft = railScroll;
    const current = rail.querySelector('[aria-current="true"]');
    if (current) scrollItemInto(rail, current, 'nearest');
  }
  if (resolving) resolveBtn.focus();
  // Coda vuota: si va subito alla carta da pescare, che arriva dal mazzo
  if (isDrawStep()) animateDrawIn();
}

// Scossa breve dell'app all'inizio del turno nemesi (niente con riduzione del movimento)
function shakeApp() {
  buzz([60, 40, 60]);
  if (reducedMotion.matches) return;
  app.classList.remove('is-shaking');
  void app.offsetWidth;
  app.classList.add('is-shaking');
  setTimeout(() => app.classList.remove('is-shaking'), 520);
}

// Mostra un'altra carta senza risolvere nulla (anteprima): non cambia mazzo, vita, token, scarti, turno, undo
function viewCard(uid) {
  if (!resolving || ui.holdUid) return;
  if ((uid === DRAW_UID ? !isDrawStep() : !entryByUid(uid)) || ui.viewedUid === uid) return;
  ui.viewedUid = uid;
  renderResolve();
}

function moveView(step) {
  const i = queue.findIndex(e => e.uid === ui.viewedUid);
  const next = queue[i + step];
  if (next) viewCard(next.uid);
}

function backToActive() {
  const active = activeEntry();
  if (active) viewCard(active.uid);
  else if (isDrawStep()) viewCard(DRAW_UID);
  resolveBtn.focus();
}

