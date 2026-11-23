# Aeon's End – Nemesis Companion: contesto per lo sviluppo

Unico documento di riferimento del progetto: cosa fa l'app, come si usa, come è fatta e come ci si lavora. Va dato
come contesto a una nuova sessione di sviluppo. (Fino alla v147 c'era anche `CONTESTO_APP.md`, ora unito qui.)

## 1. Cos'è

Web app personale, pensata prima di tutto per il telefono, che gestisce il **mazzo della nemesi** nel gioco da tavolo
cooperativo **Aeon's End** (soprattutto *The New Age*):
- prepara il mazzo secondo la regola "Nemesis Deck Setup";
- pesca le carte;
- tiene in ordine le carte in gioco (poteri, minion, attacchi);
- tiene il conto di token potere e vita dei minion;
- guida la risoluzione del turno nemesi.

Il resto del gioco (maghi, vita di Gravehold e della nemesi) resta sul tavolo.

## 2. Repository, cartelle, sito

| Cosa | Dove |
|---|---|
| Repo attivo (si lavora qui) | `C:\Users\lvitt\OneDrive\Documenti\GiuHub Local Repository\AeonsEnd\AeonsEnd_App_0.2` – GitHub `lorenzvittori/AeonsEnd_App_0.2` (non lavorare in `AeonsEnd_App_0.2.5`) |
| DataBase (fonte di cards.json e delle immagini, solo lettura) | `...\GiuHub Local Repository\AeonsEnd\DataBase` (predefinito di `tools/import-db.py`) |
| Sito | <https://lorenzvittori.github.io/AeonsEnd_App_0.2/> |
| Versione vecchia (v1, non toccare se non richiesto) | `...\GiuHub Local Repository\AeonsEnd_APP` – GitHub `lorenzvittori/AeonsEnd_APP` – il sito vecchio ha anche il prototipo in `new_design_0.2/` |

Il proprietario scrive in **italiano**: si risponde in italiano.

## 3. Regole di lavoro (concordate con l'utente)

- **Accesso ai file:** solo dentro le cartelle dei due repository e nei file che l'utente allega. Non si legge né si
  scrive altrove sul PC; se serve, prima si chiede.
- **Commit e push:** dopo ogni richiesta si fa commit e push su `main`.
  - Gli autori dei commit sono `Claude` e `noreply@anthropic.com`, passati con i flag del singolo comando. Non vanno mai
    scritti nella config, e il nome dell'utente non va mai usato:
    ```
    git -c user.name=Claude -c user.email=noreply@anthropic.com commit -m "..."
    ```
  - Nei commit si aggiungono solo i file toccati, con percorsi espliciti: niente `git add -A` sui file dell'utente.
- **`version.json`:** va aumentato (`{ "v": N }`) a **ogni** modifica di CSS o JS. È la cache-busting di tutti i file.
- **Pubblicazione:**
  - non si fa push mentre una pubblicazione di Pages è ancora in corso;
  - dopo il push si fa **un solo** controllo ritardato (un'attesa in background di ~100 s, poi la lettura di
    `https://lorenzvittori.github.io/AeonsEnd_App_0.2/version.json`).
  - L'API `api.github.com` a volte non risponde: in quel caso basta il `version.json` del sito.
- **Verifiche:** **niente screenshot** per verificare (costano troppi token). Si verifica con JS e testo: misure con
  `getBoundingClientRect`, classi, stato.
- **Fare solo ciò che è chiesto.** Se una richiesta è ambigua si chiede: l'utente non ama le interpretazioni
  sbagliate. Se l'utente non risponde, si sceglie l'opzione più sensata e lo si dice.
  - Le correzioni brevi di una riga di solito si riferiscono all'ultima cosa toccata.
- **Pacchetti e librerie:** installabili se pesano meno di 1 GB.
- **Modifiche grandi:** prima di farle si crea un **tag git di ripristino**, così l'utente può tornare indietro.
- **Messaggi di chiusura:** in italiano, chiari. Si dice cosa non è stato verificato (per esempio l'aspetto visivo o il
  telefono vero).
- **Documentazione:** quando cambia un comportamento visibile, si aggiorna questo file (sezioni 4 e 5). La storia delle
  modifiche sta nel git log, non nei commenti del codice.

## 4. Come si usa

**Menu iniziale ("Aeon's End – Nemesis Companion")**
- Se c'è una partita salvata, la finestra **Partita in corso** (nemesi, giocatori, illustrazione) con solo *Riprendi
  partita*. Sotto, sempre: **Nuova partita** (secondario se c'è una partita in corso) e **Opzioni**.
- **Collezione vuota** (v194; i nuovi utenti partono così): sopra compare **Inserisci collezione** (apre La mia
  collezione, `updateHomeCollection`) e **Nuova partita** è oscurato e non si tocca. Con almeno un prodotto il pulsante
  sparisce.
- **Riprendi partita con la nemesi non più nella collezione** (v194, `openMissingNemesis`): finestra "**Nemesi non più
  presente in collezione**" con Annulla e **Continua**; Continua rimette nella collezione il prodotto della nemesi (e la
  scatola base della sua wave) e riprende la partita.
- I pulsanti del menu iniziale sono **solo scritte** (Cinzel 22px, oro la voce principale), senza box (v163).
- **Opzioni:** *La mia collezione* (con il riepilogo wave · prodotti), *Dorso delle carte* (in una riga: la scritta a
  sinistra e, piccola a destra, la miniatura del dorso scelto, `cardBackChoiceButton` con `compact`; si tocca per la
  griglia) e *Sfondo* (stessa riga con l'anteprima piccola a destra; si tocca per le anteprime di tutti gli sfondi).
- **Test** (v215, solo scritta come le altre voci; dalla v222 in fondo allo schermo, staccata dalle altre voci:
  `.start-home-test` con `margin-top: auto`, la pagina iniziale è alta quanto lo schermo): **Modalità test**. Apre la schermata degli
  **scenari** (`openTestScreen`; nome e una riga di descrizione); toccandone uno parte una partita di test già nello stato
  dello scenario (`startScenario`). Se una carta dello scenario non è in `cards.json` (o il nome è di più carte senza
  `boxCode`) lo scenario non parte e sotto il suo nome compare il motivo.
  - Durante il test, nella testata sotto il nome della nemesi, la scritta **"TEST · <scenario>"** (`.ae-phase-test`,
    la testata si alza di 8px; non copre comandi). Nel Menu **"Ricomincia lo scenario"** (di nuovo dallo stato iniziale,
    undo vuoto) e **"Esci dal test"** al posto di "Esci dalla partita" (stessa conferma, poi il menu iniziale). Il tasto
    Indietro e l'undo funzionano come in partita.
  - **Isolamento:** con un test in corso (`testRun`) `save()` non scrive niente: la partita salvata vera e "Riprendi
    partita" non cambiano (la chiave `aeonsend-app-0.2-test-save` non si usa). La collezione non conta (le carte le
    sceglie lo scenario). Le preferenze non si toccano: lo scenario può solo sostituire, finché dura, le carte 1/2 e 3/4
    (`testRun.pairs`, letto da `turnPairsOn`) e il mazzo dei turni dei giri nuovi (`testRun.turnCards`, in
    `turnOrderCards`). Uscendo (`openStart` → `endTest`, anche da "Menu iniziale" della Vittoria) tornano le scelte di
    prima della pagina iniziale.
  - **Scenari** (elenco `SCENARI` in `script.js`, sezione "Modalità test"): Carte sul mazzo dei turni (solo carte
    nemesi nel mazzo dei turni; Hissing Acid, Sunder "4", Thunderous Tempest in cima), Minion a vita variabile (Carapace
    Queen, Maggot Engine e Mindguzzler in cima, pronto a pescare), Cambio Tier (prima carta di Tier 2 e poi di Tier 3),
    Coda piena (10 carte: minion pieni e danneggiati, poteri da 1 a 4 segnalini, forzati a 5 e 7, non rimovibili e con
    TO DISCARD), Vittoria (un minion a 1 di vita, una carta nel mazzo), Carte 1/2 e 3/4 (4 giocatori, la prossima carta
    turno è 1/2), Memoria 1/2 tra i giri (v220: 4 giocatori, memoria p12 = 'p2', la prossima 1/2 la gioca il 2 senza
    scelta), Wild e fine giro (3 giocatori, ultima carta del giro, wild = giocatore 2), Statistiche piene (turno 8,
    giro 3, statistiche riempite), Mazzo nemesi vuoto (un minion in gioco), Vite quasi a zero (v255: nemesi e
    Gravehold a 3; campi `graveLife` / `nemesisLife` dello scenario).

**Pagina Nuova partita** (`startMode = 'setup'`)
- In alto la testata **Nuova partita** con la **X** (torna al menu iniziale), ferma mentre la pagina scorre; sotto di
  lei il contenuto sfuma nel nero (`.start-setup-head`). Il vecchio Menu (tre linee) è stato tolto in v158: *La mia
  collezione* si apre da Opzioni nel menu iniziale. Anche il tasto Indietro torna al menu iniziale.
- **La mia collezione:** schermata con un interruttore per ogni wave (la sua scatola base) e, sotto, le sue mini
  espansioni (interruttori più piccoli e un po' più a sinistra). In cima *Seleziona tutto* e *Deseleziona tutto*. Nemesi e carte Basic / Upgraded Basic escono solo dai
  prodotti spuntati. Vale solo con "Salva collezione".
  - Per ora (v199, `COLLECTION_WAVES`) si possono scegliere **solo la wave 1 e la wave 4** con le loro mini
    espansioni: le altre wave si vedono spente con la scritta "Non ancora disponibile", *Seleziona tutto* spunta solo
    1 e 4, e i prodotti delle altre wave già salvati si tolgono dalla collezione all'avvio (`loadCollection`).
  - Le wave e le mini espansioni sono i prodotti di `products.json` (v210): la collezione salva i loro codici ("4",
    "4.1", ...). Una collezione salvata prima della v210 ("4 - The New Age|Shattered Dreams") si converte da sola nei
    codici all'avvio e si risalva (`convertCollectionKey`).
- **Giocatori:** 2, 3 o 4 (dalle colonne di `deck-setup.json`).
- **Mazzo nemesi** (v213, `deckOptionsGroup` / `renderDeckOptions`): due interruttori **sopra la wave**, stile degli
  interruttori della collezione. Sono una **preferenza del browser** (`aeonsend-app-0.2-deck-options`, ricordata tra le
  partite; la pagina Nuova partita riparte da lì) e si **copiano in `settings`** della partita (`battleMode`,
  `mergeCollection`): il salvataggio e "Ricomincia la partita" le ripetono; la finestra del nome della nemesi in "Crea
  mazzo" non le cambia. Salvataggi senza i campi (con il vecchio `includeUpgraded`): entrambe attive.
  - **Modalità battaglia** (predefinita attiva): attiva = numeri di `deck-setup.json` per la battaglia della nemesi
    (Basic + Upgraded); spenta = **setup standard**, sempre la riga della **battaglia 1** (solo Basic), qualunque sia la
    battaglia (`deckSetupRow`).
  - **Unisci le carte della collezione** (predefinita attiva): attiva = Basic e Upgraded da tutti i prodotti della
    collezione; spenta = solo dai prodotti della collezione della **stessa wave della nemesi** (scatola base + mini
    espansioni, `deckPool`).
  - **Blocco** (`mergeLockedWave`): con la Modalità battaglia attiva, se la battaglia chiede carte Upgraded e nei
    prodotti posseduti della wave della nemesi non ce ne sono (calcolato dai dati), "Unisci" resta **acceso e
    bloccato** con sotto "La wave I non ha carte Upgraded: si usano quelle della collezione". Si aggiorna cambiando
    nemesi, giocatori, opzioni o collezione.
  - Se il mazzo esce comunque più corto di `deck-setup.json` (`deckShortfall`), prima di "Inizia partita" una riga di
    avviso: "Il mazzo avrà N carte Basic e Upgraded invece di M…".
- **Wave:** menu a tendina con una casella per wave (solo quelle della collezione), **anche più di una**
  (`selectedWaves`); resta sempre almeno una wave. Le wave si mostrano in **cifre romane** (`waveLabel`: "IV - The New
  Age": numero romano del codice + nome in `products.json`), qui e nella collezione.
- **Nemesi:** separata dalla wave da una linea; si vedono le nemesi di tutte le wave scelte (per wave, poi scatola
  base / mini espansioni, poi battaglia). A destra del titolo "Nemesi" il **dado** sceglie una nemesi a caso tra tutte
  quelle giocabili della collezione (diversa da quella scelta), aggiunge la sua wave e scorre fino a lei.
  - Ogni pulsante mostra parte dell'illustrazione, la battaglia e, se c'è, la mini espansione.
  - Sulla nemesi scelta c'è una freccia, a cavallo del bordo in basso (o un secondo tocco), che apre la sua carta
    intera. Il retro con il setup si vede **solo con lo swipe** orizzontale (un tocco non gira più la carta).
  - **Zoom con due dita** direttamente sulla carta (v160; la lente e la finestra a tutto schermo sono state tolte):
    sopra la carta compare un livello con il lato che si vede, ingrandito dentro il riquadro della carta fino a 4×
    (`.nemesis-zoom-layer`, in `buildNemesisFlip`). Lasciando le dita resta ingrandita: un dito la sposta (la pagina non
    scorre), un doppio tocco o riavvicinare le dita la riporta normale; da ingrandita lo swipe non gira la carta.
    Chiudendo la carta lo zoom si toglie (`resetNemesisZoom`).
- **"Inizia partita"** in fondo: sopra il pulsante 16px di nero pieno, poi la sfumatura.
  - Le nemesi non giocabili sono in piccoli box non cliccabili: quelle che l'app ha (battaglia e carte) ma fuori dalla
    collezione hanno a destra la scritta "Non in collezione"; le altre (senza battaglia o senza carte) un "!" rosso
    (nella v204 per sbaglio l'icona di divieto, tolta nella v205).
  - Nelle v210-v213 avevano il "!" anche le nemesi con un minion a vita variabile nel mazzo (Carapace Queen, Prince of
    Gluttons); dalla v214 sono giocabili (vedi **Minion a vita variabile** nel turno giocatori).
  - Le nemesi Promo (`boxCode` null) non sono in nessuna wave e non si vedono.
- **Partite salvate prima della v210** (carte con gli id vecchi): si ignorano e si cancellano senza errori; il
  salvataggio ha ora `version` (`SAVE_VERSION = 2`).
- L'interruttore **Includi carte base potenziate** è stato tolto in v156; dalla v213 la sua logica in `buildDeck`
  (Upgraded sostituite da Basic) non c'è più: al suo posto le opzioni del mazzo qui sopra.

**Inizio partita**
- "Inizia partita": la pagina iniziale esce a sinistra e la partita entra da destra.
- Schermata **Crea mazzo**: i 9 mazzi da cui nasce il mazzo nemesi (righe Tier 1-3, colonne Base / Potenziate /
  Specifiche). Base e Potenziate sono dorsi con il numero di carte (al 60% dell'altezza della carta); le Specifiche
  sono a ventaglio, a faccia in su, e toccandole si vedono grandi (**Carte Nemesi Specifiche**: sopra
  "Tier 1 | Tier 2 | Tier 3" con un pallino per carta, acceso sulla carta mostrata; toccando un Tier si va alla sua prima
  carta).
- Sfondo **nero** (come il menu iniziale, `.ae-shell.is-deck-dark`); mazzo e scarti in alto non si toccano.
- Tocco sul **nome della nemesi** in alto (solo qui): finestra con nome, battaglia, illustrazione e **giocatori**, che si
  possono cambiare (il mazzo si rifà subito).
- Nel Menu c'è anche **Ricomincia la partita** (mazzo nuovo, stessa nemesi e giocatori).
- Al posto del pulsante principale c'è lo **slider** "Scorri per creare il mazzo" (`buildDeckSlider`), che pulsa finché
  non si tocca: il quadratino dorato si trascina a destra e le carte volano nel mazzo in alto **seguendo il dito**
  (`setDeckProgress`: a metà strada è nel mazzo metà delle carte; prima il Tier 3, poi il 2, poi l'1; le Specifiche si
  girano appena lo slider si muove). Lasciando prima della fine (`DECK_SLIDE_DONE`) il quadratino e le carte tornano
  indietro; arrivando in fondo il mazzo si completa. Da tastiera (Invio / freccia destra) si completa subito.
- Poi compare il banner **Partita iniziata**, con la stessa animazione del banner Tier; finito il banner lo sfondo passa
  dal nero a quello del turno giocatori e si è nel turno giocatori.

**Testata (uguale nei due turni)**
- A sinistra il **mazzo** (dorso con il numero di carte) e gli **scarti** (ultima carta con il numero).
  - Tocco sugli scarti: si apre la pila degli scarti, dalla più recente, e ogni carta si ingrandisce.
  - Tocco sul mazzo: compare "Pesca carta", che mostra la carta in cima con *Rimetti nel mazzo* (nessun cambiamento) o
    *Scarta* (va negli scarti, un passo di undo). Serve per gli effetti che fanno pescare o guardare la carta in cima.
- Dalla v163: **a sinistra** il nome della nemesi e sotto fiamma con il numero della battaglia | icona dei giocatori |
  Turno N (allineati a sinistra); **a destra** mazzo e scarti e, ancora a destra, il **Menu**. (Prima: mazzi a
  sinistra, nome al centro.) Dalla v169 **Turno N** conta i **giri del mazzo dei turni** (`turnOrder.round`, sale a
  ogni rimescolamento; salvataggi della v168: si parte dai turni nemesi giocati), non più i turni nemesi (`turn`, che
  resta per le statistiche e per i turni passati dai minion).
- **Nome della nemesi con carattere che si adatta alla colonna** (v216, `fitPhaseName`): il blocco del nome (`.ae-phase`)
  è largo al massimo quanto la sua colonna della griglia (`max-width: 100%`), quindi non finisce più sotto mazzo e
  scarti. Se a 18px il nome non ci sta, il carattere scende in proporzione finché ci sta tutto, **senza limite
  inferiore** (Prince of Gluttons: 15,77px a 360, 17,39px a 375, 18px a desktop; il nome più lungo, "Crooked Mask (9 -
  Beyond the Breach)", 7,43px a 360). I nomi che ci stanno restano a 18px. L'altezza della riga resta 24px (la testata
  non cambia altezza né posizione) e il letter-spacing in em segue la dimensione. Si ricalcola a ogni `render`, al
  ridimensionamento (evento `resize` e ResizeObserver sulla testata) e dopo `document.fonts.ready`. Una sola funzione,
  anche per il nome toccabile di "Crea mazzo" (`.ae-phase-name--button`) e per la copia della testata nella finestra del
  mazzo dei turni. L'ellissi resta solo come rete di sicurezza: dopo l'adattamento non scatta.
- **Mazzo dei turni** (v168; `turnOrder` nello stato, nel salvataggio e nell'undo; `drawTurnCard`): 6 carte come nel
  gioco. 2 giocatori: G1, G1, G2, G2; 3 giocatori: G1, G2, G3 e il **jolly** (sceglie il gruppo); 4 giocatori: G1-G4;
  sempre 2 carte nemesi. Alla fine di ogni turno si estrae a caso una carta tra quelle rimaste. Dalla v206 il mazzo è
  **in ordine** (`turnOrder.left[0]` = la carta in cima), mescolato a ogni giro (`shuffleTurnOrder`), e si pesca dalla
  cima: così le carte che guardano o riordinano il mazzo dei turni vedono le carte vere.
  - **Finestra del mazzo dei turni** (v211, `openTurnScreen`; al posto del menu e delle tre finestre della v206).
    **Toccando la barra della fase** si apre una finestra **a tutto schermo** (su desktop larga quanto la colonna
    della partita, `--ae-col`). È uno **strumento libero**: nessun vincolo per carta (Hissing Acid, Flare, Quartz
    Shard, Sunder, Xaxos... li applicano i giocatori). Non si apre quando `turnDeckBlocked()` lo impedisce.
    - **In cima** (v212) una **copia solo da guardare** della testata (nome nemesi, Turno N, Mazzo, Scarti, Menu;
      `viewOnlyCopy`, inerte, nella stessa posizione e misura dell'originale) e della **barra della fase**, che mostra
      la **bozza** (carte note, turno annullato; `trackPreviewCopy`: per un attimo `turnOrder` è la bozza, con
      `ui.trackPreview` niente scelta x/y né riquadro). Sotto, il titolo "Mazzo dei turni" con la X.
    - **Riga unica** (v233, branch `new_turn`; prima ventaglio del mazzo sopra e scarti sotto): **scarti e mazzo
      sulla stessa riga**, separati da un **segmento verticale** (`.ae-turn-row`: `.ae-turn-area--pile`,
      `.ae-turn-divider`, `.ae-turn-area--deck`); il segmento è lungo quanto le carte più il 10% sopra e sotto (v237) e,
      dalla v240, spesso e colorato come il "|" tra giocatori e turno nella testata (1px, testi secondari al 60%).
      **Sopra la riga** (v236, `.ae-turn-heads`, prima dentro le due parti) i titoli. Dalla v247 sono **su una linea
      sottile**: `[linea] SCARTI [linea] cuspide [linea] MAZZO TURNO [Mescola]` (`layoutHeads`).
      - **Linea e cuspide**: 1px, del colore delle scritte (`--ae-text-muted`), a metà altezza della riga dei titoli; la
        **cuspide** (`.ae-turn-cusp`; dalla v252 **due archi di circonferenza** di raggio 7, SVG 14x8 come il viewBox,
        `d="M0,0.5 A7,7 0 0 1 7,7.5 A7,7 0 0 1 14,0.5"`; la riga delle carte scende quanto serve perché il segmento
        cominci a 28px dall'alto dei titoli, 4px sotto la punta; v249-v251 curve di Bézier, ognuna parte tangente alla linea e
        arriva verticale nella punta; `vector-effect: non-scaling-stroke`; v247 una V 10x6). Dalla v250 è **figlia del
        segmento verticale** (`.ae-turn-divider .ae-turn-cusp`: left 50% + translateX(-50%), sopra di lui) con uno
        **spazio vuoto** di `--ae-cusp-gap` (4px) tra la punta e l'inizio del segmento, senza il trattino verticale
        della v249; si muove e si arrotonda ai pixel insieme al segmento (prima era un oggetto a parte posizionato
        copiando la sua posizione: a densità non intere poteva stare 1-2px a destra). L'altezza (dalla linea dei titoli
        alla punta) la calcola `layoutHeads`; le distanze lette dalla pagina passano in pixel CSS (`pageZoom`) e le
        scritte si misurano con la larghezza esatta (`textW`). Il colore del segmento è nel colore (testi secondari al
        60%), non nell'opacità, così la cuspide figlia ha il colore pieno della linea. È centrata sul **segmento verticale**
        tra scarti e mazzo, nella sua posizione finale (`split` = larghezza degli scarti + margine del segmento, non
        `offsetLeft`, che durante la transizione darebbe la partenza). Decorative (aria-hidden).
      - **Scritte**: "Scarti" al centro tra il bordo sinistro e la cuspide, "Mazzo turno" allineata a destra prima di
        Mescola (al bordo destro senza Mescola, e allora può usare anche 12px del margine destro della finestra); sempre
        su **una riga** (fino alla v246 "Mazzo turno" andava su due), almeno 4px dalla cuspide; se non ci stanno il
        carattere scende fino a 8px (`fitHead`) e, come ultima risorsa, senza spazio tra le lettere.
      - **Tratti di linea**: 6px di spazio attorno alle scritte, spariscono se più corti di 6px.
      - **Movimenti**: cuspide, linee e scritte si spostano con la transizione del segmento e delle carte (.2s ease); al
        primo disegno senza transizione (`.is-settling`); il carattere scende subito ma sale solo dopo lo spostamento
        (0,2s), e i tratti che compaiono arrivano in dissolvenza: niente sovrapposizioni nemmeno a metà movimento.
      - **"Mazzo turno" su due righe** (v251): se su una riga non ci sta va su due ("Mazzo" sopra, "Turno" sotto,
        `.is-two-lines`, allineate a destra, blocco centrato sulla linea dei titoli), poi se serve il carattere scende
        (min 8px); mai oltre il bordo destro della riga delle carte. La scritta non allarga più la corsia del mazzo
        (v247-v250 `deckHeadMinLane`): un posto per carta. **"Mazzo vuoto"** sta in un posto largo come una carta,
        anche su due righe, con il carattere che scende finché ci sta (`fitEmpty`).
      - Verifica (v247): scarti/mazzo 0/6, 1/5, 2/4, 3/3, 4/2, 5/1, 6/0, 0/4, 2/2, 4/0, a 360x780, 375x812 e
        1280x800, a riposo e con una carta degli scarti o del mazzo in mano, animazioni spente e accese: cuspide sul
        segmento (differenza 0px), nessuna sovrapposizione tra scritte, cuspide, linee e Mescola, carattere mai sotto
        8px, una riga.
      In fondo a destra il simbolo **Mescola** (due frecce incrociate, `Assets/ui/icons/shuffle.svg`, `.ae-icon--shuffle`), che
      sparisce con meno di 2 carte nel mazzo. Carte dritte, in fila, **senza sovrapporsi**, tutte larghe uguali
      (`rowGeometry`: la larghezza `--ae-turn-w` si calcola perché ci stiano tutte, un posto per carta, 1 se il mazzo è
      vuoto; v233-v239 il mazzo aveva almeno 3 posti e con poche carte restava spazio vuoto a destra). Con **una carta
      sola** nel mazzo niente "Rivela tutto" (v240): basta l'occhio sulla carta.
    - **Il mazzo** (`turnOrder.left`, corsia `.ae-turn-lane`) **si legge da sinistra a destra come la barra dei turni:
      la carta in cima è la prima a sinistra**. Carte coperte (dorso) o scoperte se **note**. Un **occhio al centro della
      carta in cima** la rivela; sotto il mazzo "**Rivela tutto**": dalla v237 un **rettangolo con l'occhio al
      centro, lungo quanto le carte del mazzo** e allineato con loro (larghezza da `layoutFan`; v235 tondo, senza
      scritta; il nome resta per i lettori di schermo), che con tutto scoperto ha l'**occhio barrato** "**Copri tutto**"
      (v222, ricopre tutto senza mescolare; `Assets/ui/icons/eye-off.svg`). (v235-v236: fascio di luce dall'occhio alle
      carte coperte e alone pulsante; tolti nella v237.)
    - **Girare le carte con la rotazione** (v235 per rivelare, v237 anche per coprire; `flipChange` / `flipCard`): una
      copia della carta com'era ruota fino a mettersi di taglio (rotateY 0 → 90°, 140ms), poi la carta com'è ora ruota da
      taglio a dritta (−90° → 0, 140ms). Più carte (Rivela tutto, Copri tutto) una dopo l'altra da sinistra (70ms di
      distanza).
    - **Gli scarti dei turni** (`turnOrder.drawn`) a sinistra del segmento, in fila da sinistra a destra, scoperti
      (vuoti: un posto tratteggiato). La carta del **turno in corso** (se è ancora negli scarti): bordo dorato e scritta
      "in corso".
    - **Testata e barra copiate** in cima: ferme come l'originale (v222: niente animazioni né transizioni nella copia; prima
      la copia della pila degli scarti rifaceva il lampo dello scarto). Mazzo, scarti e barra non si toccano.
    - **Facce delle carte turno** (v221, `turnCardFace`): l'immagine della carta vera, `Assets/ui/turn-cards/<carta>.webp`
      (p1, p2, p3, p4, p12, p34, nemesis, wild; 252 x 352, WebP 86, ritagliate a 63:88 dalle foto date dall'utente;
      style.css `.ae-turn-card[data-card]`). Sulle carte 1/2, 3/4 e Wild con il giocatore già deciso un **tondino** in
      basso a destra con il suo numero nel suo colore (`.ae-turn-card-who`); dalla v240 è il **token del giocatore**
      (`Assets/ui/turn-tokens/pN.webp`), grande uguale (20px) e centrato sotto la carta. Le due scelte della finestra "Chi gioca
      questo turno?" invece sono i **token** dei giocatori (dalla v223: `Assets/ui/turn-tokens/p1…p4.webp`, 232 x 232
      con angoli trasparenti, larghi 1,4 volte una carta piccola; `.ae-pair-pick[data-kind]`). Le carte coperte del mazzo hanno il
      **dorso vero** "Turn Order Deck" (dalla v226: `Assets/ui/turn-cards/back.webp`, 252 x 352, dalla foto data
      dall'utente; prima righe neutre).
    - **Spostamenti**: una carta si solleva e segue il dito **appena il dito si sposta** (dalla v219, `TURN_DRAG_PX` 6px;
      prima andava tenuta premuta 0,3 s; eventi pointer, dito e mouse); un tocco senza spostamento la seleziona. Segue il dito
      **ovunque nello schermo** (la finestra non scorre); si evidenziano solo le destinazioni permesse; rilasciata fuori
      da una destinazione valida torna al suo posto. Dalla v222 la carta trascinata sta **sopra il dito** (centrata, il
      bordo inferiore 16px sopra il dito) con un **bordo dorato**, e conta dove sta la carta (il suo centro), non il dito;
      nessuna carta diventa trasparente (nella rosa il posto dove cadrà ha la carta al 100% con un bordo tratteggiato). In alternativa si **tocca** (o Invio) la carta e poi la
      destinazione; Esc annulla la selezione.
      - Carta del mazzo **solo se nota**, **solo dentro il mazzo**, dalla v237 **come una carta degli scarti** (qui
        sotto): presa, lascia la fila (`.is-away`, `shownOrder`), le altre si avvicinano e il segmento dorato dice dove
        cadrà, anche prima della prima (cima) o dopo l'ultima (fondo). Con i **cerchi Cima e Fondo** (v242; v238-v241
        senza) e senza stringere gli scarti. Col tocco: la carta, poi Cima, Fondo o una carta del mazzo (prende il suo posto). La
        carta in cima appena rivelata si porta così in fondo. (v233-v236: le altre carte si spostavano per farle posto.)
      - Carta degli scarti **in qualunque posto del mazzo** (cima, fondo o tra due carte, come prima): appena la si
        prende (o la si seleziona col tocco) gli scarti **restano fermi** (v241; v234-v240 si sovrapponevano), **le
        carte del mazzo si avvicinano** (sovrapposte quanto serve, almeno 8px l'una dall'altra, centrate nella corsia) e
        subito prima e subito dopo compaiono i posti "**Cima**" (a sinistra) e "**Fondo**" (a destra). Dalla v241 sono
        **due cerchi senza scritta** (il nome resta per i lettori di schermo); dalla v242 **piccoli** (diametro
        `--ae-zone-d` = 30% della carta, al massimo 14px; v241 28px) e **spenti** (solo il contorno): il **bagliore
        giallo-arancio** compare solo sul cerchio dove la carta sta per andare (sopra il cerchio, o prima della prima
        carta / dopo l'ultima), che si ingrandisce (×1,3). Dalla v242 i cerchi ci sono anche spostando una **carta del
        mazzo**. Con poche carte nel mazzo i cerchi escono un po' dalla corsia o coprono il bordo delle carte. **Posto
        tra due carte** (v242): le carte a sinistra del segmento si spostano un po' a sinistra e quelle a destra un po' a
        destra (20% della carta, al massimo 10px) per farle spazio, e (v244) i cerchi si spostano con loro, così nessuna
        carta li copre. **Guida al posizionamento** (v245; v244 linea - cerchio acceso - linea; prima un segmento
        dorato): una **linea alta come le carte al 100%** con al centro un **pallino arancione pieno** (6px, sempre
        uguale; `.ae-turn-insert`), a metà altezza come i cerchi-luogo, centrata sul cerchio di Cima o di Fondo o tra due
        carte: in cima, in fondo o negli scarti il pallino entra nel cerchio-luogo, che si accende (contorno chiaro e
        alone, senza riempirsi). **Carta rivelata del mazzo verso gli scarti** (v244): in fondo a destra degli scarti c'è
        un cerchio-luogo (`.ae-turn-pile-zone`), spento finché la carta non ci sta per andare; dalla v245 il segmento
        verticale si sposta a destra per fargli posto (4px dopo l'ultimo scarto), così il cerchio non lo tocca.
        **Aspetto dei cerchi-luogo** (v248): il cerchio a pennello dato dall'utente (`Assets/ui/icons/place-circle.webp`,
        64x64 con trasparenza), stessa misura (`--ae-zone-d`) e posizione; spento al 75%, acceso pieno con un alone
        (prima un cerchio disegnato con il bordo).
        **Cerchi al centro tra i vicini** (v249): ogni cerchio-luogo sta esattamente a metà (in orizzontale) tra i bordi
        **visibili** dei suoi vicini: Cima tra il segmento verticale e la prima carta del mazzo, Fondo tra l'ultima carta
        e il bordo della finestra (a tutto schermo sul telefono; sul desktop il bordo della colonna), il cerchio degli
        scarti tra l'ultimo scarto (con zero scarti il posto tratteggiato) e il segmento. Le carte con una carta in mano
        sono all'85% (o meno), quindi conta il loro bordo visibile; si usano le posizioni finali della disposizione
        (larghezza finale della corsia, non quella a metà transizione del segmento). Lo spazio per ogni cerchio (cerchio +
        2px per lato + spostamento delle carte che si allargano) si conta dai vicini veri (il segmento è 8px prima della
        corsia, il bordo della finestra 16px dopo la riga), e la disposizione lo fa se manca. Anche la larghezza degli
        scarti cambia con la transizione delle carte (v249), così il segmento non salta quando una carta passa da una
        parte all'altra.
        **Mai sovrapposti** (v246): cerchi-luogo, guida, carte e segmento non si intersecano mai, nemmeno durante i
        movimenti.
        - **Stessa transizione** per tutto ciò che si sposta nella riga (carte, cerchi Cima/Fondo e degli scarti, guida,
          segmento verticale): `left` (il segmento `margin-left`) in .2s ease, come le carte; se partenza e arrivo non si
          sovrappongono, nemmeno le posizioni intermedie.
        - **Comparsa**: cerchi e guida che compaiono (erano nascosti) appaiono in dissolvenza **dopo** il movimento delle
          carte (`ae-turn-appear`, ritardo .2s con fill `backwards`, invisibili durante il ritardo): non compaiono mai
          sopra carte che si stanno ancora spostando.
        - **Disposizione** (`layoutFan`) calcolata sulle carte come si vedono (85%): per lato cerchio + 4px dalla carta +
          lo spostamento massimo delle carte che si allargano (`spreadMax`), così i cerchi restano dentro la corsia;
          tra due carte allargate almeno 8px liberi (il pallino della guida è 6px; l'elemento `.ae-turn-insert` è largo
          6px, linea e pallino centrati). Se la corsia è troppo stretta anche così (poche carte nel mazzo e molti
          scarti, per esempio mazzo 2 / scarti 4 o 1 / 5) le carte del mazzo scendono sotto l'85% quanto basta
          (`--ae-lane-scale`, al minimo 40%: a 375px circa 69% con 2/4 e 42% con 1/5).
        - Verifica (v246, browser interno, scenario "Carte 1/2 e 3/4", mazzo/scarti 5/1, 4/2, 3/3, 2/4, 1/5, 6/0, a
          360x780 e 375x812, dito che scorre sulla riga a passi di 4px con una carta degli scarti e una del mazzo):
          zero sovrapposizioni con le animazioni spente (posizioni finali) e accese (primo istante). La v245, con lo
          stesso controllo, aveva il cerchio Cima sul segmento in tutte le combinazioni con le carte allargate e sempre
          con 1/5. **Carta in mano** (v243): con una carta trascinata o
        selezionata tutte le altre carte, del mazzo e degli scarti, scendono all'**85%** (`.is-holding`, proprietà
        `scale`); la carta in mano resta al 100%, anche la copia che segue il dito (prima ingrandita al 108%). (v234-v240: riquadri grandi come una carta con la scritta, in verticale e poi in orizzontale.)
        Niente riquadro attorno alle carte del mazzo (v240) (`.ae-turn-zone`, `.ae-turn-lane.is-squeezed`). Trascinandola, il **segmento verticale dorato**
        (`.ae-turn-insert`) dice dove cadrà: tra Cima e la prima carta, tra due carte (`pileSlotAt`: prima della prima
        carta il cui centro è a destra della carta trascinata) o tra l'ultima carta e Fondo. Col tocco: la carta degli
        scarti, poi Cima, Fondo o una carta del mazzo (prende il suo posto, le altre scendono). (v233 per un giorno: solo
        in cima o in fondo.) **Mazzo vuoto** (v236): niente Cima e Fondo; la carta va nel mazzo vuoto (trascinata sulla
        corsia o, selezionata, con un tocco sulla corsia). Nel mazzo resta **nota** e si sposta come le rivelate. I giocatori scelti per le carte 1/2 e 3/4 si ricalcolano (`takeFromTurnPile`, la logica della v206
        `shuffleTurnCardsBack`): la scelta della carta che torna nel mazzo si perde;
      - **Zona degli scarti** (v252): per una carta del mazzo è tutta l'area a sinistra del centro del segmento
        verticale, nella stessa fascia verticale della corsia (±24px), sia trascinando sia col tocco (`inPileZone`):
        nessuna fascia morta tra scarti e Cima.
      - **Carta rivelata del mazzo negli scarti** (v240, `turnDraftOps.deckToPile`): solo **in fondo a destra** degli
        scarti (trascinata sugli scarti, a sinistra del segmento, con il segmento dorato dopo l'ultimo scarto; col tocco:
        la carta, poi gli scarti). **Non è un turno**: la storia del giro non cambia, la carta "in corso" resta quella e
        il turno di quella carta è perso (nella barra dei turni sparisce); nessun giocatore per le carte 1/2 e 3/4.
      - vietati: scarti → scarti, carta coperta (e, fino alla v239, mazzo → scarti). (v211-v221: nel turno nemesi la carta in corso non si
        spostava; dalla v222 si sposta anche lei, perché il turno continua.)
    - **Modifiche sempre valide** (v224, prima c'era "Salva modifiche"): la finestra lavora su una bozza
      (`turnDraftFrom`), ma ogni modifica (spostamento, rivela, copri, mescola) si scrive subito nella partita e nel
      salvataggio con `saveTurnDraft` (`draw()` confronta `turnDraftKey`). **Undo** (v238; v224-v237 un passo per
      modifica): **un solo passo per visita**. All'apertura si fotografa la partita (`before = snapshot()`); le modifiche
      non aggiungono passi; alla chiusura (`shut` → `commitUndo`: X, Indietro o una voce del Menu che porta altrove), se
      il mazzo dei turni è diverso da com'era, la fotografia diventa il passo di undo. Annulla porta quindi da dopo tutte
      le modifiche a prima di tutte; aprire e chiudere senza cambiare niente non aggiunge passi. **Annulla tutte le
      modifiche** torna allo stato di apertura (senza passi). X o Indietro chiudono **senza chiedere** (prima "Uscire
      senza salvare?").
    - **Carte già note all'apertura** (v224, `d.old`, parallelo a `left`, solo nella finestra): **scurite del 60%**
      (`.is-old`, `filter: brightness(.4)`) e **ferme**, tranne quando sono **in cima** (`turnDeckMovable`). Le carte
      scoperte o rimesse nel mazzo mentre la finestra è aperta restano chiare e spostabili fino alla chiusura.
    - **Mescola** (v233: simbolo a destra della scritta "Mazzo turno"; v224-v232 pulsante con la scritta sotto il
      mazzo) con un'**animazione**: le carte si raccolgono al centro della fila, si mischiano due volte (metà a sinistra
      e metà a destra) e si rimettono in fila coperte (`runShuffle`, proprietà CSS `translate` con Web Animations;
      finestra non toccabile durante, `.is-shuffling`).
    - **Apertura e chiusura** (v224): la copia della testata e della barra resta ferma (opaca, sopra) e tutto il resto è
      un **foglio** (`.ae-turn-sheet`) che **scende da sotto la barra dei turni** (`translateY(-100%)` → 0, 320ms); la
      finestra è trasparente, quindi sotto il foglio che scende si vede la partita oscurata. Con X/Indietro il foglio
      risale (`animDone` ha un tempo massimo se il browser non fa girare le animazioni).
    - **Menu** (v224): nella copia della testata il pulsante Menu funziona e apre il menu **sopra la finestra**;
      chiudendolo si torna al mazzo dei turni. Le voci che portano altrove (Undo, Scarti, Nemesi uccisa, Esci,
      Ricomincia) chiudono prima la finestra (`openSideMenu(leave)`).
    - **Segmento d'inserimento** (v224; dalla v233 sul mazzo stretto, a Cima, tra due carte o a Fondo): dice dove cadrà la carta
      degli scarti (come tra le slide di Canva; `.ae-turn-insert`, posizionato in `layoutFan`). La carta trascinata è
      **dritta** (prima inclinata di 4°).
    - **Contorno** (v224): le carte turno (immagini e dorso) hanno un contorno chiaro di 1,5px e un'ombra, per staccarle
      dallo sfondo.
    - **Carte note** (`turnOrder.known`, array di true/false **parallelo a `left`**, segue gli spostamenti e
      `drawTurnCard`): nello stato, nel salvataggio e nell'undo; si azzerano con Mescola e a ogni giro nuovo
      (`shuffleTurnOrder`); un salvataggio senza il campo = nessuna carta nota. Riaprendo la finestra restano scoperte.
      Dalla v212 (dopo "Salva") si vedono anche nella **barra dei turni**: le caselle dopo i turni del giro sono le
      carte del mazzo in ordine; quelle note hanno il colore del giocatore **tenue** (`.ae-turn-seg.is-known`) e sotto
      la sigla (1-4, N, W, 1/2) più chiara (`.ae-turn-mark.is-known`). Dalla v222 per le 1/2 e 3/4 note il giocatore è
      quello dedotto dalla memoria delle coppie (`predictedPairPlayers`), se si sa.
    - **Carta degli scarti rimessa nel mazzo** (v222): il turno giocato con quella carta **resta** nella barra come turno
      passato e la carta compare anche come turno futuro. Anche la carta del **turno in corso**: il turno **continua**
      (per esempio "Giocatore 4" resta acceso) e la carta diventa un turno futuro. Nelle v211-v221 il turno si annullava
      (`turnOrder.waiting`, attesa di "Pesca carta turno"); `waiting` resta solo per leggere quei salvataggi.
    Le carte che agiscono sul mazzo dei turni (nemesi: Hissing Acid, Sunder, Thunderous Tempest; giocatori: Flare, Quartz
    Shard, Xaxos...) non hanno niente di loro nell'app: si usa questa finestra (tocco sulla barra della fase). Il
    riquadro sopra il pulsante del turno nemesi per le tre carte nemesi (v206-v217, `renderTurnChip`) è stato tolto nella
    v218.
  - **Fine giro** (v194, `turnRoundOver`, `nextTurnCard`, `shuffleTurnOrder`): all'ultima carta del giro il pulsante è
    "**Fine turno · Mischia mazzo**" (nel turno nemesi "**Metti in gioco · Mischia mazzo**"). Toccandolo il mazzo dei
    turni si mischia (giro nuovo, "Turno N" sale) e parte l'animazione (`playTurnShuffle`): le scritte sotto la barra
    svaniscono, le caselle diventano tutte uguali e grigie (0,3 s), poi veloci si uniscono in una sola al centro, si
    fermano un attimo e tornano al loro posto (0,76 s). Poi il pulsante è "**Pesca la prima carta turno**" (attesa, come
    a inizio partita). Dal turno nemesi l'animazione parte dopo il passaggio al turno giocatori.
  - Dalla v193 il primo turno **non** si estrae da solo: finito "Crea mazzo" l'app è in **attesa**
  (`awaitingTurnCard`, nessuna carta estratta o, dalla v211, turno annullato; barra tutta grigia) e il pulsante principale è "**Pesca carta turno**"
  (fondo grigio chiaro tenue); toccandolo si estrae il primo turno (`drawFirstTurn`, con undo): se è la nemesi parte
  subito il turno nemesi. Salvataggi vecchi senza mazzo dei turni: giro nuovo con il turno in corso già estratto.
  - **Wild** (v179, solo con 3 giocatori; si chiamava "Jolly" fino alla v217: dalla v218 la scritta è "**Wild**", la
    sigla e la carta turno **W** invece di J): è uno dei 3 giocatori (`turnOrder.wild`, 1-3). Al primo giro si sceglie a
    caso, poi a ogni giro passa al giocatore dopo: (wild mod 3) + 1, cioè 1→2→3→1. I turni del wild valgono per quel
    giocatore (`turnCardPlayer`): colore, scritta, pulsante e Statistiche maghi. Salvataggi di prima: wild a caso.
  - **Carte 1/2 e 3/4** (v192, wave 4; solo con 4 giocatori): con l'opzione "**Carte turno 1/2 e 3/4**" nelle
    **Opzioni del menu iniziale** (v193; nella v192 era nel Menu della partita; interruttore, attivo di default;
    preferenza del browser `aeonsend-app-0.2-turn-pairs`; a partita in corso vale dal prossimo giro) il mazzo è 1/2,
    1/2, 3/4, 3/4 ('p12', 'p34') + 2 nemesi. Quando esce una carta x/y la casella è una **sfumatura dai due colori**
    (v194, strato `::after`; scelto il giocatore svanisce in 0,45 s e resta il suo colore; dalla v237 calcolata in
    oklab, `linear-gradient(90deg in oklab, …)`, e con il bagliore dei due colori, uno per lato: prima in sRGB il colore
    a metà tra blu e viola era un blu spento e il bagliore tutto del primo colore, e il centro sembrava spostato a
    destra), sotto
    c'è "x / y" e al centro compare la finestra "**Chi gioca questo turno?**" (v193, `renderPairChoice`): due carte
    grandi come quelle della fascia piccola, bordo nero, colore del giocatore scurito e numero nero al centro. Finché
    non si sceglie è tutto disattivato (inert) tranne la scelta e il pulsante Menu. Dalla v195 è **tutto oscurato
    tranne la barra della fase** in alto: velo `::before` della shell sullo sfondo e filtro `brightness(.28)` su
    testata (Menu compreso, che resta toccabile), parte centrale e pulsante.
    Dalla v200 con la finestra aperta il pulsante in basso **sparisce** (resta il suo spazio). **Toccando fuori dalla
    finestra** la scelta scende nel pulsante grande in basso, **diviso in due**: "Giocatore x | Giocatore y" nei loro
    colori (`.ae-pair-dock`, `ui.pairMinimized`, solo per quella carta). Allora l'app si usa normalmente tranne: comandi
    sotto le carte velati e spenti, finestra della carta senza vita né "Rimuovi" (`openCardDialog`), nessuna bozza
    (`setDraft`) e niente pesca dal mazzo in alto (velato).
    v201: il passaggio è animato (`animatePairToDock`, 0,42 s): una copia della finestra scende e si deforma fino al
    pulsante sfumando, e il pulsante compare mentre lei arriva. Le due metà hanno il colore del giocatore al 55% (prima
    22%, troppo scuro), con la scritta bianca in grassetto. Dalla v202 sono **due pulsanti separati** (10px tra i due,
    angoli tondi ognuno), non più un pulsante diviso in due. La scelta (`chooseTurnPlayer`) si annulla con l'undo; scelto il giocatore,
    casella, scritta e pulsante prendono il suo colore.
    **Memoria per coppia tra i giri** (v220, al posto di "l'altra carta x/y dello stesso giro va all'altro giocatore"):
    per ogni coppia (1/2 e 3/4) `turnOrder.pairNext` dice a chi tocca la prossima carta della coppia.
    - "nessuno" (null): quando esce una carta della coppia si sceglie (finestra "Chi gioca questo turno?"); scelto X, la
      memoria diventa l'altro giocatore della coppia (`chooseTurnPlayer`).
    - giocatore Y: quando esce una carta della coppia gioca Y **senza scelta** (carta OBBLIGATA, `drawTurnCard`) e la
      memoria torna a "nessuno".
    - La memoria si aggiorna quando la carta viene assegnata; **non si azzera** a fine giro né mescolando il mazzo dei
      turni (`shuffleTurnOrder`); riparte da "nessuno" con Nuova partita e "Ricomincia la partita" (`newGame`). Senza
      manipolazioni del mazzo dei turni il risultato è identico a prima; cambia quando carte 1/2 o 3/4 tornano nel mazzo
      o passano al giro dopo.
    - Carta della coppia rimessa nel mazzo dalla finestra del mazzo dei turni (anche quella del turno in corso, dalla v222):
      la memoria **non cambia** (quel turno è stato giocato) e la carta torna nel mazzo senza giocatore. Esempio: il 4 ha
      scelto la 3/4 (memoria "tocca al 3") e la rimette in cima durante il suo turno: il turno del 4 continua e la 3/4
      in cima è del 3 (la barra lo mostra già, dedotto). (v220-v221: rimettere la carta in corso annullava il turno e
      riportava la memoria a prima.) Undo riporta memoria e carta allo stato di prima.
    - Variante spenta a partita in corso: dal giro dopo non ci sono carte 1/2 e 3/4 e la memoria non si usa.
    - Ogni carta della coppia negli scarti dei turni ricorda chi l'ha giocata: `turnOrder.picks[pos] = { player, forced }`
      (`pickOf`; i picks di prima della v220 erano stringhe = scelte). `turnCardPlayer` legge solo questo.
    Sigla sotto la casella passata: il numero del giocatore (o "1/2" / "3/4" se non era stato scelto). Finché non si
    sceglie, quello che si salva non va nelle Statistiche maghi.
- **Barra dei turni** (v168, chiamata "barra della fase" fino alla v221; `renderTurnTrack`, `.ae-turn-track`), subito
  sotto la testata. Dalla v222 è la **storia dei turni del giro** (`turnOrder.history`), non la fila delle carte: prima
  i turni giocati, poi il turno in corso, poi le carte del mazzo dei turni (turni futuri). Una carta rimessa nel mazzo
  resta come turno passato e compare anche come futura, quindi le caselle possono essere **più di 6**: si stringono
  (`--ae-seg-n`; la casella accesa resta 122px). La storia riparte vuota a ogni giro. (Fino alla v221: 6 caselle, una
  per carta del mazzo dei turni, nell'ordine di estrazione.)
  - **Colori dei giocatori** (v222, dalle carte turno vere): 1 `#86811D`, 2 `#CF892B`, 3 `#007591`, 4 `#773067`
    (`--ae-turn-p1..p4`, style.css).
  - La casella del turno in corso è **accesa** (8px, colore pieno e un bagliore leggero: dalla v203 4px al 25%, prima 12px al 60%) e più lunga delle altre: dalla v184
    **122px fissi**, abbastanza per la scritta più lunga ("Nemesi · Risolvi", circa 114px); le altre 5 si dividono lo
    spazio che resta (circa 38px su un telefono da 375px). (v170: il doppio di una casella normale.) Quelle dei turni già giocati nel giro
    sono linee sottili colorate velate; quelle ancora da estrarre linee grigie.
  - Colori (palette dell'utente, v174): giocatore 1 **lime** `#BDD21C`, 2 **arancio** `#D78E1C`, 3 **blu**
    `#1C518D`, 4 **viola** `#7C158E` (le scritte "Giocatore N" di blu e viola sono schiarite per leggersi), nemesi **rosso
    scuro** (`--ae-turn-p1`…`--ae-turn-p4`, `--ae-turn-red`). Jolly (v179): **strisce bianche e del colore** del
    giocatore che è jolly in quel giro (`data-owner`); le bianche sono spesse la metà delle colorate (v180: 3px e 6px).
  - Sotto la casella accesa, **sempre centrata** sotto di lei anche alla prima e all'ultima casella (v196; prima lì
    era allineata al bordo della barra): nel turno di un giocatore "**Giocatore N**" nel colore del giocatore (v169); nel turno
    del wild "**Wild · N**" (v179; "Jolly" fino alla v217, poi "Wild"; in bianco dalla v181; dalla v183 solo il numero del giocatore, senza "Giocatore"); nel turno nemesi "**Nemesi · Risolvi**" o "**Nemesi · Pesca**". Nascosta durante "Crea mazzo".
  - Sotto le caselle dei turni già passati nel giro una sigla (v182, `.ae-turn-mark`): **N** = nemesi, **1-4** =
    giocatore, **J** = jolly (bianca), nel colore del turno e velata.
  - Quando dopo un giocatore tocca a un altro giocatore la casella accesa pulsa una volta.
  - Prima: due metà Giocatori/Nemesi con i pallini (v162), e prima ancora 6 segmenti fissi (v161).
- **Niente linee di separazione** tra testata, fascia piccola e carte grandi (v162): le zone sono separate solo dallo
  spazio.

**Turno dei giocatori**
- In alto la fascia piccola con tutte le carte in gioco; sotto le stesse carte, grandi, che si scorrono in orizzontale.
- Sotto ogni carta grande i suoi comandi:
  - **minion:** −5 / −1 / +1 alla vita (+1 solo fino alla vita di inizio turno). Mentre si fa danno il box mostra
    "x/X", con X = la vita che aveva prima del danno (non la vita massima della carta), e sulla carta "HP: −n"; senza
    danno in corso si vede solo la vita. Lo stesso nella finestra della vita ("HP x / X") e, nel turno nemesi, la riga
    sopra la carta mostra solo la vita;
  - **Minion a vita variabile** (v214; `data.hpVariable`, la vita la decidono i giocatori: oggi Maggot Engine di
    Carapace Queen e Mindguzzler di Prince of Gluttons): entra in gioco **senza vita** (`hp` 0, `turnHp` null,
    `hpSet` false, `makeEntry`) e mostra **"?"** ovunque (box della carta grande e della fascia piccola, finestra,
    riga del turno nemesi) finché non la si imposta una volta (`hpUnset`). Finché è "?" non muore a 0 e non va negli
    scarti con "Salva modifiche". Si imposta nella **scheda della carta** (la finestra della vita), che si apre:
    toccando la carta (anche nel passo Pesca sulla carta NUOVA), toccando il **box "?"** (v218, carta grande, fascia
    piccola, riga del turno nemesi: `unsetHpClick`), con il pulsante **"Imposta la vita"** sotto la carta grande del turno
    giocatori (al posto di −5 / −1 / +1) e, nel turno nemesi, con il pulsante in basso, che per un minion "?" è
    **"Imposta la vita"**: il minion **non si mette in gioco** finché la vita non è impostata (v218). Nella scheda di un
    minion "?" ci sono **−5, −1, +1 e +5** e si parte da 0; con "Conferma modifiche" quella vita diventa la sua **vita
    massima** (`hpMax`, v218): da lì il +1 non la supera (`hpCap`: nel turno giocatori anche la vita di inizio turno,
    come gli altri minion). Dopo la prima impostazione (`hpSet` e `hpMax` nella partita, nel salvataggio e nell'undo;
    salvataggi v214-v217 senza `hpMax`: la più alta tra vita e vita di inizio turno) valgono le regole normali (a 0 muore). Senza vita di
    riferimento niente "/X" (solo "x" e "HP x"). La prima impostazione non conta come danno nelle statistiche dei
    maghi; nelle Statistiche, per un minion ucciso a vita variabile, la vita della carta è "*";
  - **potere con "TO DISCARD":** "Rimuovi · costo pagato" (la carta diventa grigia), con "Annulla" per tornare indietro;
  - **poteri con 4 o 5 token** (v176, ovunque si vedono i token): i token si rimpiccioliscono di 3/n (`zoom`,
    `tokenIcons`), così il box resta largo come con 3 token; dalla v178 lo spazio libero si divide in parti uguali tra
    un token e l'altro e tra i token e il bordo (`.has-many-tokens`, `--ae-badge-px`);
  - **poteri con più di 5 token** (v178): un token e il numero, come la vita dei minion (`.ae-tokens.is-count`; il
    token che si spegne da solo nel turno nemesi qui non si anima);
  - **altri poteri:** la nota "! Non rimovibile". Nella fascia piccola (in tutti e due i turni) hanno in basso al
    centro un box uguale a quello di token e vita, simmetrico a quello in alto, con un **simbolo di divieto** rosso (cerchio barrato in SVG; nella v204 un'icona a colori, tolta nella v205
    perché l'utente preferisce questo). Box alto 18px come quello dei token. Lo stesso simbolo (v205) sta al posto
    del "!" nella nota "Non rimovibile" sotto la carta grande (`.queue-note.is-locked`)
    (v169, `.ae-ban-badge`).
- Le modifiche sono una bozza: il pulsante principale diventa **Salva modifiche**, con accanto **Annulla modifiche**.
  Salvando (un solo passo di undo) i minion a 0 e i poteri pagati volano negli scarti.
- I **comandi** sotto le carte si vedono solo sulla carta grande **al centro** (`.queue-slot.is-centred`, aggiornata
  da `markQueueRail` mentre si scorre).
- Toccando la carta grande al centro si apre la sua finestra (vita del minion, token del potere, rimozione del
  potere); toccando una carta di lato la si porta al centro, senza aprirla. Lo stesso nel turno nemesi.
- Gli scorrimenti animati verso una carta (tocco sulla fascia piccola o su una carta di lato, Turno Nemesi) sono
  circa il 50% più veloci di quelli del browser: `fastScrollTo`, 260ms, con lo scroll-snap spento durante
  l'animazione; un dito sulle carte la interrompe.
- Il pulsante **Fine turno · Pesca ordine turno** (v169; v168 "Fine turno", prima "Turno Nemesi") ha un fondo scuro
  velato, molto tenue, del **colore del giocatore** di turno (per il jolly il colore del giocatore che è jolly; `.has-player-color`) al posto
  dell'illustrazione della nemesi. Chiude il turno del
  giocatore (`endPlayerTurn`: vita di riferimento azzerata, poteri pagati negli scarti) ed estrae il turno dopo. Se
  esce la nemesi parte il turno nemesi: breve scossa dello schermo e vibrazione (urgenza, `shakeApp`) e lo sfondo
  (maga a sinistra, nemesi a destra) scorre verso il lato della nemesi. Se esce un giocatore si resta nel turno
  giocatori e cambia solo il colore nella barra della fase.

**Turno nemesi**
- Le carte in gioco si risolvono dalla più vecchia, una alla volta, in un carosello che si scorre con il dito; la fascia
  in alto indica la carta guardata. Guardando un'altra carta compare "Torna alla carta da risolvere".
- Toccando "Fine turno" (quando esce la nemesi) il carosello parte dalla carta che si stava guardando e scorre (animato) fino alla carta da
  risolvere; anche un tocco sulla fascia in alto fa scorrere il carosello, come nel turno giocatori.
- La carta da risolvere lampeggia di rosso, come l'attacco appena pescato; non lampeggiano i poteri con più di un token.
  Nella fascia piccola in alto la carta da risolvere ha un **bagliore rosso** fisso (v171; non il dorso da pescare né
  la carta appena pescata, che ha il bagliore dorato).
- Pulsante in basso:
  - **potere:** un token lampeggia e diventa grigio da solo; il pulsante dice "Vai avanti" (token −1) o "Effetto risolto
    e scarta" (ultimo token: negli scarti);
  - **minion:** "Effetto risolto", resta in gioco. Toccando il minion si apre la finestra con −1 / +1 alla vita;
  - **attacco:** "Effetto risolto", va negli scarti.
- **Passo Pesca:** dopo l'ultima carta un dorso vola dal mazzo al centro, con il pulsante dorato **Pesca** (o tocco sul
  dorso). La carta si gira e mostra NUOVA e un bagliore dorato; un attacco lampeggia di rosso. Dorso e carta pescata
  sono più grandi delle altre carte: il 90% (`BIG_CARD_SCALE`) della misura massima calcolata da `sizeFocus`.
  - Attacco pescato: "Effetto risolto", vola negli scarti. Altre carte: "**Metti in gioco · Fine turno nemesi**"
    (v168). Poi si estrae il turno dopo: se è un giocatore si torna al turno giocatori (la carta messa in gioco si
    rimpicciolisce al suo posto e le altre carte della coda entrano da sinistra); se è di nuovo la nemesi il turno
    nemesi riparte subito (scossa e vibrazione).
- Nella **fascia piccola**, durante la risoluzione, dopo l'ultima carta c'è il posto della carta da pescare: solo un
  **bordo tratteggiato grigio**, come mazzo e scarti vuoti (v168, `nextSlotItem`), con il box **NUOVA** come sul dorso
  (v169), ma con lo sfondo **grigio** (v173; dorato solo al passo Pesca, sul dorso). Al passo Pesca al suo posto compare il dorso.
- Alla prima carta di Tier 2 e di Tier 3 compare la scritta "Tier N".
- **Il mazzo non si rimescola:** se è vuoto la nemesi non pesca.
- **Vittoria:** mazzo vuoto e nessun potere né minion in gioco (dopo il primo turno nemesi), oppure "Nemesi uccisa" nel
  Menu → schermata Vittoria: la scritta "Vittoria" entra come il banner dei Tier e resta ferma; sotto *Statistiche* e
  *Menu iniziale*. Un tocco in una parte vuota dello schermo torna alla partita, che non cambia.
- **Vite di Gravehold e della nemesi** (v255): sotto la fascia delle carte piccole, nei due turni, una riga
  (`.ae-lives`, `renderLives`) con il box di **Gravehold** a sinistra e quello della **nemesi** a destra, ai margini
  della fascia. Dalla v257 ogni box ha **solo il numero**, a pillola (34px di altezza, raggio 17px: i lati sono mezzi
  cerchi); il nome resta solo nell'etichetta per i lettori di schermo. Dalla v262 sopra ogni box una scritta
  piccolissima **GRAVEHOLD** / **NEMESIS** (`.ae-life-tag`, 8px, alta 7px, 3px sopra il box); i box scendono di 3.8px
  (`.ae-lives` padding sopra 7.8px e margine sotto −3.8px: la riga resta alta uguale, le carte grandi non cambiano),
  così nello scheletro gli spazi 5 (fascia piccola → box vita) e 6 (box vita → riga vita/token) sono uguali (24.5px;
  ±0.3px in 19:9 e 20:9 per l'arrotondamento della carta centrata). Dalla v263 i box (con le scritte) sono 16px più
  in basso (`.ae-life-box { top: 16px }`, solo spostati: riga e carte grandi uguali): stanno ai lati e la riga
  vita/token della carta è sempre al centro, quindi scendono accanto a lei (scheletro: spazio 5 = 40.5px, 6 = 8.5px). Dalla v258 i box hanno uno **sfondo** velato
  (larghi almeno 72px): Gravehold = immagine scelta nel Menu della partita con la riga **"Sfondo Gravehold"** (Città
  o Torre, `GRAVEHOLD_BGS`, stessa finestra a anteprime dello Sfondo: `backgroundChoiceButton` / `openBackgroundPicker`
  con `choice`); nemesi = il ritratto della nemesi della partita (`nemesisArt[...].portrait`). Le carte grandi prendono lo spazio che resta (a 360×780 da 249 a 222px).
  Non c'è durante "Crea mazzo" né nella copia della testata della finestra del mazzo dei turni.
  - Toccando un box si apre la finestra della vita (`openLifeDialog`). Dalla v259 è una **pillola al centro** con la
    stessa forma e lo stesso sfondo del box (`.ae-life-modal`, larga fino a 340px): sopra il numero grande (64px,
    sempre bianco con un contorno grigio scuro attorno alle cifre, v263; il velo nero della v261 è tolto; a destra
    delle cifre, 10px dopo e IN ALTO, il cambio rispetto a prima "+x" verde / "−y" rosso, senza contorno, con la cima
    delle cifre alla stessa altezza di quella della vita), sotto **−5 −1 · +1 +5**. Dalla v263 la finestra esce dal
    box e si ingrandisce al centro (280ms, `LIFE_ZOOM_MS`); chiudendo torna nel box (il box è nascosto mentre è aperta).
    Dalla v264 le cifre **scorrono** (`renderLifeDigits`, 260ms): ogni cifra ha il suo posto, la maschera è il bordo
    alto e basso della riga del numero (`clip-path`); scendendo la cifra vecchia sale e sparisce sotto la linea in alto
    mentre la nuova arriva da sotto quella in basso (salendo il contrario), la vecchia sfuma e la nuova compare. Solo
    le cifre che cambiano (unità con unità, decine con decine; 10 → 9: la decina se ne va). Dalla v265 sopra la
    pillola il titolo in Cinzel **Gravehold** o **Nemesi** (`.ae-life-modal-title`, 26px, 12px sopra la pillola; fa
    parte della finestra e si ingrandisce con lei) (mai sopra la vita iniziale né sotto 0: il pulsante si spegne).
    Niente titolo né Conferma: si chiude toccando fuori, con Esc o Indietro, e alla chiusura la vita si applica una
    volta sola (un passo di undo, si salva; senza cambi niente undo).
  - A 0: nemesi → schermata **Vittoria**; Gravehold → schermata **Sconfitta** (`showDefeat`, stessa schermata della
    Vittoria con la scritta rossa, `showEndScreen`). Chiusa la schermata, Undo rimette la vita e la partita continua.
- **Statistiche:** turni nemesi, carte giocate del mazzo nemesi (mazzo iniziale − carte rimaste, quindi anche quelle
  scartate con "Pesca carta"), carte rimanenti, minion uccisi, poteri scartati pagando il costo, poteri risolti, Æ spesi
  per i poteri (solo i costi "Spend N Æ"; gli altri costi valgono 0), attacchi risolti e, per ogni minion, i turni nemesi
  passati da quando è stato pescato (uccisi e ancora in gioco). Sotto carte giocate, carte rimanenti (per Tier e nome),
  minion uccisi (con la vita della carta), poteri scartati, poteri risolti e attacchi risolti c'è un box con le carte in
  fila; toccandone una la si vede grande. Gli elenchi sono in `stats.cards` (id); i salvataggi più vecchi non li hanno.
  "Turni in gioco dei minion" ha una riga per minion con la miniatura della carta (toccandola si vede grande), il
  nome e i turni; i minion uccisi hanno l'id in `stats.minions` dalla v163 (prima si cerca la carta per nome).
  **Statistiche maghi** (v175, prima di "Turni in gioco dei minion"): tabella con una riga per giocatore (dalla v179
  niente riga Jolly: i turni del jolly contano per il giocatore che era jolly), con il pallino del suo colore, e le colonne, in quest'ordine (v178), *Danni minion*,
  *Minion uccisi*, *Poteri scartati* e *Æ spesi* (per ora vuota, "—"). I numeri sono in `stats.mages` (`p1`…`p4`, `wild`) e si contano in
  `saveAllDrafts`, assegnati al giocatore del turno in corso (mazzo dei turni): danni = vita tolta ai minion (le cure
  nello stesso salvataggio la riducono), minion uccisi = minion portati a 0. Non si contano le modifiche alla vita fatte
  nel turno nemesi né le partite salvate prima della v175.
  In cima i **Tempi**: tempo di partita e tempo nei Tier 1, 2 e 3 (`statsTimes`). L'inizio è `stats.startedAt`
  (`newGame`), l'inizio di un Tier è la sua prima carta pescata (`stats.tierAt`, in `drawNewCard`), la fine è l'ultima
  apertura della Vittoria (`stats.endedAt`) o adesso. È il tempo dell'orologio: comprende le pause con l'app chiusa.
  Le partite iniziate prima della v158 mostrano "—".
- La schermata Vittoria aveva la scritta a 64px, più larga del telefono, che spingeva tutto a destra: ora il carattere
  si adatta (`min(64px, 12.5vw)`).

**Menu (pannello laterale al 70%)**
- Entra da destra e (v249) esce verso destra mentre lo sfondo scuro svanisce (0,22s, `SIDE_MENU_OUT_MS`), con
  qualunque chiusura (X, tocco fuori, Indietro, una voce); se lo si è trascinato fuori col dito non salta.
- Turno nemesi N e carte nel mazzo.
- **Annulla ultima azione:** chiude il menu e lascia un pulsante sospeso che si può toccare più volte. Il primo Annulla
  toglie le modifiche non salvate, poi si torna indietro fino all'inizio della partita.
- Scarti.
- **Nemesi uccisa:** per quando la nemesi muore al tavolo; apre la schermata Vittoria.
- **Sfondo** e **Dorso delle carte** (v167): ognuno in una riga, la scritta a sinistra e l'anteprima piccola a
  destra, senza nome (`backgroundChoiceButton` / `cardBackChoiceButton` con `compact`; uguale in Opzioni).
- **Sfondo:** anteprima dello sfondo scelto (`backgroundChoiceButton`); toccandola si apre la scelta con
  l'**anteprima** di ogni sfondo (`openBackgroundPicker`: Nemesi mascherata, Demone cornuto, Bocca con tentacoli) e un
  tocco lo applica. Resta salvato nel browser; non entra nella partita né nell'undo. Uguale in Opzioni (v164; prima era
  un menu a tendina con i soli nomi).
- **Dorso delle carte:** miniatura e nome del dorso scelto; toccandolo si apre la griglia dei 29 dorsi
  (`openCardBackPicker`) e un tocco sceglie. Vale per mazzo in testata, carta da pescare, Crea mazzo e il retro della
  carta che si gira; resta salvato nel browser (`CARD_BACKS`, `setCardBack`), non entra nella partita.
- **Esci dalla partita:** rosso; dalla v193 apre la finestra di conferma "**Uscire dalla partita?**" (`openExitConfirm`:
  Annulla, con il fuoco, ed Esci). Esci porta al menu iniziale. (Fino alla v192 andava tenuto premuto.)
- Aprendo il Menu le tre linee del pulsante diventano una **X** (animazione, `menuCloseToggle`); toccando la X il menu si
  chiude. Vale anche per il Menu della pagina Nuova partita.

**Salvataggio:** la partita si salva da sola nel browser, insieme alla cronologia dell'undo, **solo dal primo turno
nemesi** (`save()` non scrive con `turn < 1`, a meno che la partita sia già stata salvata: `ui.gameSaved`). Durante
"Crea mazzo" non si salva niente e resta l'eventuale partita salvata prima.

**Telefono**
- **Schermo sempre acceso** finché l'app è aperta e visibile (Screen Wake Lock, `keepScreenOn` in `script.js`): si
  richiede all'avvio, al ritorno in primo piano e al primo tocco. Dove il browser non lo permette, non succede niente.
- **Tasto / gesto Indietro** (Android, swipe di iOS): chiude il livello in primo piano (finestre, Menu, Vittoria,
  "Annulla ultima azione" sospeso, "Pesca carta", La mia collezione, scarti) invece di uscire. Se non c'è niente da
  chiudere compare "Premi di nuovo Indietro per uscire" e un secondo Indietro (entro 2,5 s) esce. Funziona con una voce
  in più nella cronologia (`armBackGuard`, `closeTopForBack`), stesso indirizzo.
- **Solo verticale:** con il telefono in orizzontale (altezza ≤ 500px e schermo touch) l'app è coperta da "Gira il
  telefono in verticale" (`.ae-rotate`). Tablet e desktop non cambiano.
- **Aree di tocco:** mazzo e scarti in testata si toccano su 44×44 (il disegno resta 32×44); la freccia della carta
  nemesi su 44 di altezza; i comandi −5 / −1 / +1 sono a 10px e −5 ha il contorno rosso.
- **"Inizia partita"** resta sempre visibile in fondo alla pagina iniziale.
- **Menu:** si chiude anche trascinandolo verso destra (`swipeToClose`).
- **Vibrazione** (solo Android): carta pescata (doppia per un attacco) e scritte Tier / Partita iniziata (`buzz`).
- **Turno nemesi allineato** (v207, come la v186 poi annullata): `.ae-focus-track` sale di 24px come
  `.queue-view .ae-queue-list`, così nel turno nemesi box vita/token e carta grande sono alla stessa altezza del turno
  giocatori; la carta da pescare / pescata (`.is-big`) compensa con `translate: 0 24px`.
- **Scheletri** (`scheletri/`, non fa parte dell'app): `index.html` mostra lo scheletro del turno giocatori (il turno
  nemesi è uguale, senza i comandi sotto la carta) nei formati 18:9, 19:9, 19.5:9 e 20:9, con larghezza fissa di 68 mm,
  ogni box e ogni spazio verticale in mm; la scritta della fase è disegnata come tutta la sua fascia, da sinistra a
  destra (disegno in scala, 1× = mm veri su uno schermo calibrato). Misure prese il 18/11/2026 (layout della v207) con
  `getBoundingClientRect` a 360 px CSS × 720/760/780/800, convertite con 68/360 mm per px; gli stessi dati sono in
  `misure.json`. Vanno rifatte se il layout cambia. Partita di prova con 7 carte in gioco: fascia piccola piena (6
  carte, l'ultima tagliata dal bordo) e, nella vista grande, la 4a carta al centro con le carte laterali che spuntano
  ai due lati. In alto si sceglie il formato e l'unità delle misure scritte (px o mm; il disegno resta in scala in mm);
  gli spazi verticali sono numerati nel disegno e nella tabella.
  **Dinamico** (dal 18/11/2026): aprendo la pagina, l'app vera (`../index.html`) si carica in un iframe nascosto largo
  360 px; per ogni formato prende la sua altezza, prepara la stessa partita di prova e misura i box
  (`preparaApp`, `misuraApp` eseguite nell'iframe). Nell'iframe `save()` è spento (la partita salvata non cambia) e le
  barre di scorrimento sono nascoste come su un telefono. Una riga in alto dice da quale versione sono le misure; se la
  misura fallisce (per esempio se cambiano i nomi interni usati: `centredQueueUid`, `scrollToCard`, `makeEntry`,
  `turnTrackBar`, `turnTrackLabels`, `nemesisBtn`, `.ae-compact-rail`, `.queue-slot`, `.queue-controls`...) mostra
  le misure salvate in `misure.json` e lo dice. Con un cambio di posizionamento lo scheletro si aggiorna da solo.
  Dalla v255 misura anche i box **Vita Gravehold** e **Vita nemesi** (`.ae-lives`); `misure.json` rifatto il 23/11/2026.
- **App installabile:** `manifest.webmanifest` (a tutto schermo, verticale) e icone in `Assets/ui/app-icons/`
  (rifatte da `tools/build-app-icons.py`; dalla v198 a partire da `Assets/ui/decor/app-icon.png` (400×400), l'immagine
  quadrata scelta dall'utente con il logo e il ragno sotto la luna; prima dal dorso). Icona maskable: immagine nel 72%
  centrale con il bordo sfumato nella stessa immagine sfocata, così la scritta non si taglia nel cerchio di Android.
- **Senza rete:** `sw.js` (service worker). Codice e dati: prima la rete, senza rete l'ultima copia salvata (una per
  file, senza `?v=N`). Immagini e font: prima la copia salvata. All'inizio o alla ripresa della partita si scaricano le
  immagini di tutte le carte in gioco nel mazzo (`prefetchDeckImages`), non con "Risparmio dati". Se un'immagine già
  pubblicata viene **sostituita** con lo stesso nome, i telefoni tengono la vecchia: in quel caso si cambia
  `MEDIA_CACHE` in `sw.js` (dalla v256 è `ae-media-v2`: le carte turno di `Assets/ui/turn-cards/` sono tornate quelle
  di prima del commit "nre cards"). Il workflow di Pages copia anche `sw.js` e
  `manifest.webmanifest`.

**Tablet e desktop (da 768px di larghezza)**
- La partita è la stessa del telefono (testata, fascia piccola, carte grandi, pulsante), in una **colonna al centro**
  larga quanto la carta grande più un pezzo delle vicine (`--ae-col`, calcolata da `sizeColumn` in `script.js`: carta
  misurata dall'altezza + 2 × 54px, mai meno di 440px). Lo sfondo riempie tutto lo schermo. La pagina iniziale e la
  collezione hanno la loro colonna da 560px.
- Il tablet in verticale ha carte grandi (circa 460px a 768×1024); il desktop e il tablet in orizzontale sono limitati
  dall'altezza (carte da 270–300px).
- La rotella del mouse scorre le carte grandi e le fasce piccole (orizzontali).
- "Crea mazzo" ha mazzi più grandi (fino a 150px).
- La vecchia vista a due colonne (coda a sinistra, carta a destra, da 900px) è stata tolta in v153.

## 5. Terminologia (usata con l'utente)

| Termine | Significato |
|---|---|
| **Turno giocatori** (nel codice *VistaCoda*, `#queue-view`) | Vista delle carte in gioco tra un turno nemesi e l'altro. |
| **Turno nemesi** (nel codice *VistaRisoluzione*, `#resolve-view`) | Risoluzione delle carte in gioco, poi pesca della nuova carta. |
| **Coda** (`queue`) | Le carte nemesi in gioco, in ordine di arrivo. |
| **Vista piccola / fascia** (`.ae-compact-rail`) | Striscia in alto con tutte le carte in piccolo: `#queue-rail` nel turno giocatori, `#rail` (dentro `.ae-rail-row`) nel turno nemesi. |
| **Vista grande** | Le carte grandi: lista scorrevole nel turno giocatori, carosello nel turno nemesi. |
| **Carosello** (`#focus`, `.ae-focus-track`, `.ae-focus-slide`) | Turno nemesi: tutte le carte in fila, scroll-snap nativo, ai lati si vede un pezzo delle vicine. |
| **Carta da risolvere** | La carta indicata da `currentIndex`. |
| **Carta mostrata / in anteprima** | La carta al centro (`ui.viewedUid`). Se non è quella da risolvere compare "Torna alla carta da risolvere". |
| **Passo Pesca** (`isDrawStep()`, `DRAW_UID = -1`) | Dopo l'ultima carta risolta: dorso al centro e pulsante dorato "Pesca". |
| **Carta nuova** | Carta appena pescata: etichetta NUOVA e bagliore dorato; un attacco lampeggia di rosso. |
| **Banner Tier** (`showBanner`) | Scritta "Tier 2" / "Tier 3" alla prima carta di quel Tier pescata; la stessa animazione serve per "Partita iniziata". Il carattere Cinzel si carica all'avvio (`preloadBannerFont`); la scritta entra ferma (`is-preparing`) e parte quando il carattere è pronto (max 300 ms) e dopo due fotogrammi. L'animazione muove solo trasformazione e opacità. |
| **Lampeggio rosso** (`.is-to-resolve`, `.is-attack-drawn`) | Turno nemesi: carta da risolvere (non i poteri con più di un token) e attacco appena pescato. |
| **Box mazzo / box scarti** (`.ae-header-piles`, `.ae-pile`) | In testata, a sinistra, in entrambi i turni. |
| **Bozza** (`ui.drafts`) | Turno giocatori: vita e costi pagati non ancora salvati. "Salva modifiche" / "Annulla modifiche". |
| **Token automatico** (`.is-auto-token`) | Turno nemesi: sul potere da risolvere un token lampeggia e diventa grigio da solo. |
| **Crea mazzo** (`#deck-build`, `ui.deckBuilding`) | Schermata dei 9 mazzi dopo "Inizia partita", con lo slider (`deckSlider`). |
| **Menu iniziale** (`startMode = 'home'`) | Partita in corso (Riprendi), Nuova partita, Opzioni. |
| **Collezione** | Prodotti posseduti (wave e mini espansioni), scelti in "La mia collezione". |
| **Sfondo unico** (`--ae-battle-bg`, `BACKGROUNDS`) | Un'immagine sola su tutta l'app: maga a sinistra (turno giocatori), nemesi a destra (turno nemesi). Si sceglie nel Menu tra `battle-bg.webp`, `battle-bg-2.webp`, `battle-bg-3.webp` (1672 x 941). |
| **BannerInfoNemesi** | Tolto in v105, recuperabile dal tag `v104-banner-info-nemesi`. |

## 6. Architettura

### File

- `index.html`: il loader legge `version.json` (no-store) e carica `css/design-tokens.css`, `css/components.css`,
  `style.css` e `script.js` con `?v=N`.
  - GitHub Pages tiene in cache `index.html` per circa 10 minuti. Per questo molti elementi (pulsante Menu, box mazzo e
    scarti, "Annulla modifiche", finestra "Partita in corso", pulsante Collezione, fascia del turno giocatori) sono
    creati o spostati da `script.js` all'avvio: il DOM reale è diverso da quello scritto in `index.html`
    (per esempio `#info-row` viene tolto e `#undo-btn` resta nascosto).
- `script.js`: **un solo file**, voluto così per la cache-busting, diviso in 9 sezioni numerate (indice in cima):
  1. testi (`I18N_IT`), elementi, costanti e stato;
  2. dati e mazzo (collezione compresa);
  3. componenti;
  4. VistaCoda;
  5. scarti;
  6. pagina iniziale;
  7. salvataggio e undo;
  8. VistaRisoluzione;
  9. eventi, testata, animazioni di volo, passaggio tra i turni, vittoria, Crea mazzo, undo sospeso, "Pesca carta",
     menu e avvio.
- `css/design-tokens.css`: palette e font (Cinzel per i titoli, Inter per l'interfaccia, da Google Fonts). Colori:
  - `--ae-bg #101116`, `--ae-surface`, `--ae-surface-raised`, `--ae-border`;
  - `--ae-text` avorio, `--ae-text-muted`;
  - `--ae-gold #DFAE59`, `--ae-danger #D95E5C`, `--ae-heal`, `--ae-focus`.
- `css/components.css`: componenti (pulsanti, badge, carta, finestre, scarti, toast, interruttore).
- `style.css`: layout e quasi tutte le aggiunte recenti, in fondo al file, spesso come ridefinizioni di regole
  precedenti: in caso di dubbio vale l'ultima.

### Stato

- Partita (entra nel salvataggio e nell'undo): `queue` (voci `{ uid, data, tokens, hp, turnHp, isNew, paid, bornTurn }`,
  dove `data` è la carta di `cards.json` e `bornTurn` il turno in cui è stata pescata), `deck` e `discard` (array di
  `data`; si pesca dalla fine di `deck`), `currentIndex`, `newIndex` (≥0 quando c'è una carta appena pescata),
  `resolving`, `turn`, `maxTierDrawn`, `stats` (statistiche: `deckSize`, contatori e `minions`; si aggiornano in
  `discardGone`, `removeWhileResolving` e `resolveCurrent`). I salvataggi senza `stats` ripartono da zero.
- Vite (v254): `graveLife` (parte da `GRAVEHOLD_LIFE = 30`) e `nemesisLife` (parte da `nemesisStartLife()`, il campo
  `life` di `nemesis.json`). Entrano in snapshot, restore, salvataggio e undo; `newGame` (Nuova partita e "Ricomincia")
  le rimette ai valori iniziali; salvataggi senza i campi: valori iniziali.
- Mazzo dei turni: `turnOrder = { left, drawn, round, wild, picks, known, waiting, pairNext, history }`. Dalla v222
  `history = [{ kind, player, forced, pos }]`: un turno per ogni carta pescata nel giro (l'ultimo è il turno in corso,
  `currentTurn()`; `pos` = posizione negli scarti dei turni o null se la carta è tornata nel mazzo); salvataggi senza:
  un turno per ogni carta negli scarti (`historyFromPile`). `currentTurnCard()` e `turnCardPlayer(kind)` senza
  posizione leggono il turno in corso dalla storia. Dalla v220
  `picks = { posizione in drawn: { player: 'p1'..'p4', forced: true|false } }` (solo carte 1/2 e 3/4; prima stringhe)
  e `pairNext = { p12: null | 'p1' | 'p2', p34: null | 'p3' | 'p4' }` (memoria per coppia). Entrano in snapshot,
  restore, salvataggio, undo e nella bozza della finestra del mazzo dei turni (`turnDraftFrom`). Salvataggi senza
  `pairNext`: picks convertiti, la seconda carta della coppia del giro (che prima si deduceva) diventa obbligata e la
  memoria si ricostruisce dalle carte del giro.
- Impostazioni: `settings = { players, nemesis, battleMode, mergeCollection }` (v213; i salvataggi vecchi possono avere
  ancora `includeUpgraded`, che si ignora); collezione in `collection` (Set di codici
  prodotto di `products.json`: `"4"` scatola base, `"4.1"` mini espansione; la wave è la parte prima del punto,
  `waveOfCode`).
- `ui`: stato solo visivo, dichiarato tutto nell'oggetto `ui` in cima (viewedUid, holdUid, isTransitioning con
  `lockFor(ms)`, reveal, queueAnchor, drafts, flyingDiscards, tierBanner, deckBuilding, …).
- **Undo e salvataggio:** `act(fn)` fa `snapshot()` per l'undo, esegue l'azione e salva.
  - L'undo arriva fino a `UNDO_LIMIT = 300` passi; `restore()` ripristina.
  - Chiavi di `localStorage`: `aeonsend-app-0.2-save` (partita), `aeonsend-app-0.2-collection` (collezione),
    `aeonsend-app-0.2-background` (sfondo), `aeonsend-app-0.2-card-back` (dorso delle carte) e, dalla v213,
    `aeonsend-app-0.2-deck-options` (opzioni del mazzo della pagina Nuova partita), dalla v258
    `aeonsend-app-0.2-gravehold-bg` (sfondo del box della vita di Gravehold: `city` o `tower`), diverse da quelle della v1 perché il dominio github.io è condiviso. Il formato del salvataggio è quello della v48 con in più
    `version` (v210, `SAVE_VERSION`): `readSave` cancella i salvataggi di un'altra versione.
- **Rendering:** `render()` disegna tutto.
  - Turno nemesi: `renderResolve()`, con la fascia e `renderFocus` (carosello). Il carosello si ricostruisce solo quando
    cambia la "firma" (`focusStateSignature`); altrimenti scorre e basta.
  - `scrollFocusTo(uid, smooth, jump)`: mentre è in corso uno scorrimento animato avviato dallo script, le chiamate
    senza `smooth` (ridisegni, `sizeFocus`) aggiornano solo la meta invece di saltare; `jump` forza il salto.
  - Un `render()` ricostruisce le carte del turno giocatori e interrompe le loro animazioni: per questo `lockFor`, che
    ridisegna alla fine, deve durare almeno quanto le animazioni avviate (vedi `toPlayersTurn`, `ENTER_MS`).
  - Turno giocatori: `renderQueue()`, con la fascia, `.queue-slot` (carta + comandi) e `sizeQueue()`.
  - La misura delle carte grandi è una sola regola per i due turni (`sharedCardWidth`); `STATUS_H` deve restare uguale
    all'altezza della riga vita/token in `style.css`.

### Regole di gioco nel codice

- **Mazzo** (`buildDeck`): per ogni Tier 1-3 si prendono solo carte con `inNemesisDeck` e quel `tier`: a caso
  Basic e Upgraded dei prodotti della collezione (`boxCode`; senza "Unisci", solo della wave della nemesi: `deckPool`),
  nel numero indicato dalla riga di `deck-setup.json` (`deckSetupRow`: battaglia della nemesi, o battaglia 1 senza
  "Modalità battaglia"; se le carte non bastano, il Tier esce più corto), più le carte Specific della nemesi. Ogni Tier è mescolato a parte, con il Tier 1 in cima.
- **Risoluzione** (`resolveCurrent`): potere con più di 1 token: −1 token e avanti; minion: resta e avanti; attacco o
  potere all'ultimo token: negli scarti.
- **Pesca** (`drawNewCard`): solo con "Pesca". Il mazzo **non** si rimescola: vuoto = niente pesca.
- **Carta pescata:** un attacco va negli scarti; le altre carte "Metti in gioco". Poi si torna al turno giocatori.
- **Inizio turno nemesi** (`nemesisTurn`): `turnHp` diventa la vita attuale, le bozze si perdono, le carte grigie
  (`isGone`) vanno negli scarti.
- **Vittoria** (`isVictory`): `turn > 0`, mazzo vuoto e nessun potere né minion in coda.

## 7. Dati

- **Ponte DataBase → app** (`tools/import-db.py`, dalla v210): `cards.json`, `products.json`, `Data/Nemesis/` e
  `thumbs/Nemesis/` **non si modificano a mano**: li genera lo script dal DataBase (solo lettura: `Data/NEMESIS_CARDS.xlsx`,
  `Data/DataBase_*.xlsx` foglio MAIN, `BOXES_NAMES` di `pipeline.py`). Si rilancia dalla cartella del repo (servono
  openpyxl e Pillow):
  - `python tools/import-db.py` (DataBase predefinito `..\DataBase`) oppure `python tools/import-db.py "C:\percorso\DataBase"`;
  - `--no-images` rifà solo cards.json e products.json; `--force` rifà anche immagini e miniature già presenti (senza,
    un file esistente non si sovrascrive). Due lanci di fila danno lo stesso risultato.
- `cards.json` (244 carte nella v210: wave 1 Core Box + The Depths + The Nameless, wave 4 The New Age + Shattered
  Dreams, The Ancients, Into The Wild). Campi di ogni carta:
  - `id`: testo nella grammatica del DB (`"NA-1b-02"`, o un intervallo `"[NA-1b-02, NA-1b-04]"`): **solo
    identificatore** (salvataggi, statistiche), non si interpreta e non si usa nei nomi dei file;
  - `name`, `boxCode` (codice del prodotto: `"1"`, `"1.1"`, `"4"`, `"4.2"`...), `category` (`Basic` / `Upgraded` /
    `Specific`), `nemesis` (solo per le Specific);
  - `tier` (0…8, `"9+"` testo, o null), `inNemesisDeck` (true = entra nel mazzo nemesi; il mazzo usa solo queste);
  - `type` (`Attack` / `Power` / `Minion`; altri tipi solo fuori dal mazzo), `subType`, `hp` (intero o null),
    `hpVariable` (true = la vita la decidono i giocatori, "*"), `shield`, `powerTokens`, `quantity`;
  - `removalCost` (costo in Æ per scartare il potere, usato da `aetherCost` nelle statistiche), `removable`;
  - `effect`, `toDiscard`, `immediately`, `persistent`, `powerEffect` (testi, **non usati dall'app**);
  - `image`: `Data/Nemesis/<BoxCode>_<Prodotto>/<_Basics | _Upgraded | Nemesi>/Tier_N/<Nome>.webp`.
- `products.json`: `{ codice: nome del prodotto }` per tutti i 27 codici di `BOXES_NAMES` (`"4": "The New Age"`,
  `"4.1": "Shattered Dreams"`...). Il codice senza punto è la scatola base della wave; la wave di un codice è la parte
  prima del punto. Da qui vengono le wave e le mini espansioni della collezione e i loro nomi.
- `nemesis.json`: `name`, `boxCode` (codice del prodotto della nemesi; null per le Promo, mai giocabili), `waveOrder`,
  `battle`, `flagBattle5`, `owned` (dalla v194 non si usa più: la collezione iniziale è vuota), `life` (v254, vita
  iniziale della nemesi, solo le 14 giocabili: Carapace Queen 60, Rageborne 70, Crooked Mask 70, Prince of Gluttons 70,
  Horde-Crone 60, Blight Lord 70, Wayward One 60, Maggoth 45, Arachnos 70, Ageless Walker 80, Fenrix 60, The Wailing 50,
  The Wanderer 40, Necroswarm 70).
  - Una nemesi è giocabile (`isPlayable`) se ha `boxCode` e battaglia, il suo prodotto è nella collezione, ha carte
    Specific.
- `deck-setup.json`: la tabella del Nemesis Deck Setup.
- **Immagini:**
  - `Data/Nemesis/...`: scansioni in WebP qualità 90 (larghe al massimo 1640 px), generate dal ponte. Gli originali sono
    nel DataBase.
  - `thumbs/Nemesis/...`: miniature (264 x 369), stesso albero: la miniatura di una carta è il percorso dell'immagine
    con `thumbs/` al posto di `Data/`.
  - `Assets/nemesis/`: per ogni nemesi `<slug>.webp` (carta), `<slug>-back.webp` (retro con setup e storia),
    `<slug>-portrait.webp` (ritaglio) e `nemesis-art.json` (elenco).
  - `Assets/ui/decor/`: `card-back-logo.webp` (dorso predefinito), `battle-bg.webp`, `battle-bg-2.webp`,
    `battle-bg-3.webp` (sfondi scelti nel Menu).
  - `Assets/ui/gravehold/` (v258): `gravehold-city.webp` e `gravehold-tower.webp` (1000 x 500, dalle immagini date
    dall'utente), sfondi del box della vita di Gravehold.
  - `Assets/ui/backs/`: gli altri 28 dorsi (`<nome>.webp`, ritagliati al centro alle proporzioni 63:88) con le
    miniature `<nome>-thumb.webp` (150 x 210) per la griglia di scelta; `logo-thumb.webp` è la miniatura del dorso
    predefinito. I dorsi arrivati in alta risoluzione sono 630 x 880; i 10 della serie "back_nemesi_10" (pietra
    fessurata, vetrata gotica, acquerello, pop art, minimalista, impressionista, geometrico, inchiostro, organico,
    diagramma arcano) erano piccoli e restano a circa 289 x 404, senza ingrandirli.
  - `Assets/power-token-2.webp` (token), `Assets/ui/icons/`: `life-drop.webp` (goccia della vita), `alert.webp` ("!"),
    `flame.png` (battaglia), `players-1..4.png`, icone SVG usate come maschera (undo, eye, close, discard, empty-deck).
  - Immagini non più usate tolte in v148 (vecchi sfondi dei due turni, vecchi dorsi, gocce di vita, logo, icone del
    kit): recuperabili dal tag `v147-prima-della-pulizia`.
- **Nemesi complete:** le 7 di The New Age: Maggoth, Arachnos, Ageless Walker e Fenrix (scatola base); The Wailing,
  The Wanderer e Necroswarm (mini espansioni). Wave 1 (v210): Rageborne, Crooked Mask (scatola base), Horde-Crone (The
  Depths), Blight Lord e Wayward One (The Nameless); Carapace Queen e Prince of Gluttons (minion a vita variabile)
  giocabili dalla v214. Il Core Set non ha Upgraded: con la sola wave 1, dalla battaglia 2 il mazzo è
  più corto di quanto dice deck-setup.json (domanda aperta).

### Script in `tools/` (Python + Pillow, da lanciare dalla cartella del repo)

- `import-db.py`: il ponte DataBase → app (vedi sopra); serve anche openpyxl.
- `convert-webp.py`, `build-thumbs.py`: del formato di prima della v210 (immagini in `Data/<Nemesi>/` e
  `thumbs/<id>.webp`); per le carte nemesi ora si usa `import-db.py`.
- `convert-webp.py`: converte JPG/PNG di `Data/` in WebP 90 e aggiorna `cards.json`.
- `build-thumbs.py`: rifà tutte le miniature. Attenzione: rigenerandole dai WebP cambiano anche quelle esistenti, quindi
  si fa commit solo delle nuove.
- Le immagini delle nemesi del menu (`Assets/nemesis/`: carta, retro, ritaglio e `nemesis-art.json`) le genera
  `import-db.py` dal DataBase (commit fa171d5); il vecchio `build-nemesis-art.py` è stato tolto nella v214.

## 8. Pubblicazione

- `.github/workflows/pages.yml` (Pages → Source = "GitHub Actions").
  - Pubblica solo i file del sito: niente `tools/`, `README`, `.md`.
  - Ogni tentativo di deploy ha 3 minuti e ce ne sono fino a 3.
  - Motivo: GitHub ogni tanto si blocca fino al limite di 10 minuti e manda una mail di errore.

## 9. Test in locale

- **Server:** `python -m http.server 8124 --bind 127.0.0.1`, lanciato in background dalla cartella del repo. Poi si apre
  `http://127.0.0.1:8124/` nel browser interno.
- **Misura del telefono:** `resize_window` preset `mobile` (375×812); alla fine si torna a `desktop`.
- **Limiti del browser di prova:**
  - non esegue animazioni né transizioni (restano al tempo 0);
  - **requestAnimationFrame non scatta**;
  - gli eventi `scroll` nativi non arrivano;
  - script JS lunghi (molte attese in fila) possono far chiudere la scheda: meglio più script brevi.

  Si verifica quindi con lo stato e le misure, lanciando gli eventi a mano (`dispatchEvent(new Event('scroll'))`) e
  chiamando `clearTransition()` dopo le azioni animate. Per questo il carosello usa `setTimeout` invece di rAF.
- **Funzioni utili da console:** sono globali, per esempio `queue`, `allCards`, `makeEntry`, `act()`, `render()`,
  `undo()`, `startGame()`, `onNemesisClick()`, `onResolveClick()`, `viewCard()`, `isDrawStep()`, `centredFocusUid()`.
- Dopo le prove si toglie la partita di test: `localStorage.removeItem('aeonsend-app-0.2-save')`.
- **Scenari della Modalità test** (v215): servono anche alle verifiche degli operatori, per arrivare subito al momento
  da provare senza costruire lo stato a mano. Da console: `startScenario(SCENARI.find(s => s.id === 'tier'))`
  (restituisce `null` se è partito, altrimenti il motivo), `restartScenario()`, `openStart()` per uscire. Il test non
  salva niente, quindi dopo non c'è da pulire la partita salvata.
  - **Aggiungere uno scenario:** un oggetto in più nell'elenco `SCENARI` (`script.js`, sezione "Modalità test"; i
    campi sono descritti nel commento sopra l'elenco): `id`, `name`, `desc`, `players`, `nemesis`, `phase`
    ('players' / 'nemesis'), `deck` (dalla cima), `queue` (nome o `{ name, hp, tokens, hpSet, bornTurn }`), `discard`,
    `turnOrder` (`left` dalla cima, `drawn`, `round`, `wild`, `picks` come `{ pos: { player, forced } }`, `pairNext`),
    facoltativi `turnCards`, `pairs`, `turn`,
    `maxTier`, `stats`. Carte per nome, con `{ name, boxCode }` se il nome è di più carte (oggi Sunder, Needlemaw,
    Doom Aegis, Topple). `buildScenarioState` lo trasforma in una fotografia come `snapshot()` e `restore()` la applica:
    niente altro codice da scrivere. Poi una prova: lo scenario compare nella schermata Test e parte senza errori.

## 10. Punti di ripristino (tag git)

| Tag | Stato |
|---|---|
| `v86-prima-dei-comandi-sotto-le-carte` | Prima dei comandi sotto le carte nel turno giocatori. |
| `v98-prima-del-carosello` | Turno nemesi con una carta sola e slide a mano, prima del carosello nativo. |
| `v104-banner-info-nemesi` | Con il BannerInfoNemesi in basso, prima dei box mazzo e scarti. |
| `v113-prima-test-banner` | Testata con Undo e Menu e BannerInfoNemesi in alto, prima della prova che li ha tolti. |
| `v123-prima-sfondo-unico` | Due sfondi separati per i due turni, prima dello sfondo unico. |
| `v147-prima-della-pulizia` | Prima della pulizia del codice morto e dell'unione dei documenti (v148). |
| `v152-prima-layout-tablet-desktop` | Con la vecchia vista a due colonne da 900px, prima della colonna centrale per tablet e desktop (v153). |
| `v154-prima-mobile` | Prima delle modifiche per il telefono della v155 (orizzontale, aree di tocco, app installabile, service worker). |
| `v156-prima-menu-e-slider` | Prima della v157 (menu iniziale con Opzioni, slider di Crea mazzo, salvataggio dal primo turno nemesi). |
| `v162-prima-voci-semplici` | Prima della v163 (testata invertita, menu iniziale a scritte, comandi solo sulla carta al centro, scorrimento veloce, Opzioni con dorso e sfondo). |
| `v157-prima-nuova-partita-e-dorsi` | Prima della v158 (pagina Nuova partita con X e wave multiple, dorsi, tempi, zoom della carta nemesi). |

Per tornare a un tag si ripubblica quello stato con un nuovo commit, senza riscrivere la storia.

## 11. Idee e cose aperte

- Semplificazione del codice, proposta dopo l'analisi del repo (la pulizia del codice morto è fatta in v148):
  1. stato della partita in un solo oggetto `game` (lo snapshot diventa una copia);
  2. `script.js` diviso in 5–6 file caricati dal loader con `?v=N`, con le regole di gioco separate dall'interfaccia;
  3. un solo modo di creare il DOM (tutto in `index.html` o tutto da JS), senza le difese per l'`index.html` vecchio;
  4. CSS riorganizzato per componente, unendo i selettori ridefiniti più volte in `style.css`;
  5. qualche test sulle regole (mazzo, risoluzione, vittoria).
- Doppioni da unire: i due editor della vita del minion (comandi sotto la carta e finestra), le tre animazioni di volo
  (`flyToDiscard`, `launchDeckCard`, `animateDrawIn`).
- Le immagini delle altre nemesi (wave diverse da The New Age) mancano: l'utente le fornisce come scansioni della carta
  nemesi, fronte e retro.
- Il repo originale `AeonsEnd_APP` ha lo stesso problema di pubblicazione bloccata; lì non c'è ancora il workflow con i
  tentativi.
