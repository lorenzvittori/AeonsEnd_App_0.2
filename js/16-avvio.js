// 16-avvio.js: Telefono in orizzontale, tasto Indietro e avvio (init). Caricato in ordine da script.js insieme agli altri file di js/ (script classici, variabili globali).
'use strict';

// Telefono in orizzontale: lo spazio in altezza non basta per le carte; si chiede di girarlo (CSS: .ae-rotate)
document.body.appendChild(el('div', 'ae-rotate', I18N_IT.rotatePhone));

// Tasto / gesto Indietro (Android, swipe di iOS): chiude il livello in primo piano invece di uscire dall'app.
// Nella cronologia c'è sempre una voce in più (stesso indirizzo): Indietro la consuma e qui la si rimette.
// Se non c'è niente da chiudere, il primo Indietro mostra "Premi di nuovo Indietro per uscire" e il secondo esce.
function closeTopForBack() {
  if (modals.length) { modals[modals.length - 1].onCancel(); return true; }
  if (undoFloat) { closeUndoFloat(); return true; }
  if (deckPopover) { closeDeckPopover(); return true; }
  // La mia collezione sopra le Opzioni: si chiude prima quella in cima
  const screens = document.querySelectorAll('.collection-screen');
  if (screens.length) { screens[screens.length - 1].querySelector('.collection-head .ae-icon-button').click(); return true; }
  if (!discardLayer.hidden) { closeDiscard(); return true; }
  // Pagina "Nuova partita": Indietro torna al menu iniziale
  if (!startLayer.hidden && startMode === 'setup') { setStartMode('home', true); return true; }
  return false;
}
function armBackGuard() { history.pushState({ aeBackGuard: true }, ''); }
window.addEventListener('popstate', () => {
  if (closeTopForBack()) armBackGuard();
  else {
    showToast(I18N_IT.backAgainToExit);
    // Passato il messaggio, Indietro torna a chiudere i livelli (e il prossimo "uscire" chiede di nuovo conferma)
    setTimeout(() => { if (!(history.state && history.state.aeBackGuard)) armBackGuard(); }, 2500);
  }
});
if (!(history.state && history.state.aeBackGuard)) armBackGuard();

// Avvio: legge cards.json, deck-setup.json e nemesis.json, mostra la pagina iniziale (con "Riprendi partita" se ce n'è una salvata)
let initRunning = false;
async function init() {
  if (initRunning) return;
  initRunning = true;
  startError.hidden = true;
  startBtn.disabled = true;
  showStartSkeleton();
  updateInert();
  try {
    const [cards, setup, nemesisList, productList, art] = await Promise.all([
      loadJson(DATA_ROOT + 'cards.json'), loadJson(DATA_ROOT + 'deck-setup.json'), loadJson(DATA_ROOT + 'nemesis.json'),
      loadJson(DATA_ROOT + 'products.json'), loadJson('Assets/nemesis/nemesis-art.json').catch(() => ({}))
    ]);
    nemesisArt = art || {};
    products = productList || {};
    if (cards.length === 0) throw new Error('Nessuna carta trovata in cards.json');
    // Le scansioni delle carte stanno nella cartella Data/, le miniature in thumbs/ con lo stesso percorso
    cards.forEach(c => {
      c.thumb = DATA_ROOT + String(c.image).replace(/^Data\//, THUMB_DIR);
      c.image = DATA_ROOT + c.image;
    });
    allCards = cards;
    deckSetup = setup;
    nemeses = nemesisList;
    cardsById = new Map(allCards.map(c => [c.id, c]));
    buildStartPage();
    newGame();
    // Il retro si scarica subito, così alla prima pesca è già pronto
    loadImage(CARD_BACK);
    preloadBannerFont();
    render();
    setStartMode('home', true);
  } catch (err) {
    console.error(err);
    // Senza replaceChildren: se l'errore viene da un browser vecchio, qui non deve fallire di nuovo
    document.getElementById('nemesis-list').innerHTML = '';
    // Sotto il messaggio, il motivo tecnico (utile per capire il problema su un dispositivo che non si può ispezionare)
    showStartError(I18N_IT.loadError + '\n(' + (err && err.message ? err.message : String(err)) + ')', true);
  } finally {
    initRunning = false;
  }
}
// (riga spostata qui dalla sezione 9 "Eventi": usa una funzione dichiarata sopra in questo file; dal file
// precedente darebbe errore, perché tra file diversi le funzioni non sono sollevate)
retryBtn.addEventListener('click', init);

init();
