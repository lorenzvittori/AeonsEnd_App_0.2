# Aeon's End – Nemesis Companion: contesto per lo sviluppo

Documento da dare come contesto a una nuova sessione di sviluppo. Per lo scopo dell'app in breve vedi anche
`CONTESTO_APP.md`.

## 1. Cos'è

Web app personale, pensata prima di tutto per il telefono, che gestisce il **mazzo della nemesi** nel gioco da tavolo
cooperativo **Aeon's End** (soprattutto *The New Age*).

Fa queste cose:
- prepara il mazzo;
- pesca le carte;
- tiene in ordine le carte in gioco (poteri, minion, attacchi);
- tiene il conto di token potere e vita dei minion;
- guida la risoluzione del turno nemesi.

Il resto del gioco (maghi, vita di Gravehold e della nemesi) resta sul tavolo.

## 2. Repository, cartelle, sito

| Cosa | Dove |
|---|---|
| Repo attivo (si lavora qui) | `C:\Users\lvitt\OneDrive\Documenti\GiuHub Local Repository\AeonsEnd_App_0.2` – GitHub `lorenzvittori/AeonsEnd_App_0.2` |
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

## 4. Terminologia (usata con l'utente)

| Termine | Significato |
|---|---|
| **Turno giocatori** (nel codice *VistaCoda*, `#queue-view`) | Vista delle carte in gioco tra un turno nemesi e l'altro. |
| **Turno nemesi** (nel codice *VistaRisoluzione*, `#resolve-view`) | Risoluzione delle carte in gioco, poi pesca della nuova carta. |
| **Coda** (`queue`) | Le carte nemesi in gioco, in ordine di arrivo. |
| **Vista piccola / fascia** (`.ae-compact-rail`) | Striscia in alto con tutte le carte in piccolo. C'è in entrambi i turni: `#queue-rail` nel turno giocatori, `#rail` nel turno nemesi. |
| **Vista grande / visualizzazione ingrandita** | Le carte grandi: lista scorrevole nel turno giocatori, carosello nel turno nemesi. |
| **Carosello** (`#focus`, `.ae-focus-track`, `.ae-focus-slide`) | Turno nemesi: tutte le carte in fila, scroll-snap nativo, ai lati si vede un pezzo delle vicine. |
| **Carta da risolvere** | La carta indicata da `currentIndex`. Nella fascia ha la pill rossa **RISOLVI** quando si guarda un'altra carta. |
| **Carta mostrata / in anteprima** | La carta al centro (`ui.viewedUid`). Se non è quella da risolvere compare "Torna alla carta da risolvere". |
| **Passo Pesca** (`isDrawStep()`, `DRAW_UID = -1`) | Dopo l'ultima carta risolta: si vede la carta **coperta** (dorso) nella fascia e nel carosello, con il pulsante dorato **"Pesca"**. Toccandolo la carta si gira. |
| **Carta nuova** | Carta appena pescata: etichetta **NUOVA** e bagliore dorato. Se è un attacco lampeggia di rosso. |
| **Banner Tier** | Scritta "Tier 2" / "Tier 3" alla prima carta di quel Tier pescata. |
| **Box mazzo / box scarti** (`.ae-pile`) | Ai lati della fascia del turno nemesi: a sinistra il dorso con il numero di carte nel mazzo, a destra l'ultima carta scartata con il numero di scarti (si tocca per aprire gli scarti). |
| **BannerInfoNemesi** | Banner con mazzo, nome della nemesi, fase e scarti. **Tolto** in v105, recuperabile dal tag `v104-banner-info-nemesi`. |
| **Lampeggio rosso** (`.is-imminent`) | Turno giocatori: tutta la carta lampeggia se si attiverà nel prossimo turno nemesi (minion e poteri con 1 token). |
| **Comandi sotto le carte** (`.queue-controls`) | Turno giocatori. Minion: −5 −1 +1 e, a 0, "Elimina minion". Potere con TO DISCARD: "Rimuovi · costo pagato". Altri poteri: nota "! Non rimovibile". |
| **HP del turno** (`turnHp`) | Vita del minion all'inizio del turno giocatori. Se cambia, il box mostra "x/tot" e la carta "HP: −n". |
| **Token automatico** (`.is-auto-token`) | Turno nemesi: sul potere da risolvere un token sfuma da solo dopo 1 s. Pulsante "Vai avanti", oppure "Effetto risolto e scarta" se era l'ultimo. |
| **Menu** (icona in alto a destra) | Pannello laterale al 70%: Esci dalla partita, turno nemesi, carte nel mazzo, Scarti. |
| **Pagina iniziale** | Giocatori, wave, pulsanti delle nemesi con illustrazione (nemesi non disponibili con "!"), carta nemesi apribile (freccia o secondo tocco, slide per il retro), "Includi carte base potenziate", finestra "Partita in corso". |

## 5. Architettura

### File

- `index.html`: il loader legge `version.json` (no-store) e carica `css/design-tokens.css`, `css/components.css`,
  `style.css` e `script.js` con `?v=N`.
- `script.js`: **un solo file**, voluto così per la cache-busting, diviso in 9 sezioni numerate (indice in cima):
  1. testi e stato;
  2. dati e mazzo;
  3. componenti;
  4. VistaCoda;
  5. scarti;
  6. pagina iniziale;
  7. salvataggio e undo;
  8. VistaRisoluzione;
  9. eventi e avvio.
- `css/design-tokens.css`: palette e font (Cinzel per i titoli, Inter per l'interfaccia, da Google Fonts). Colori:
  - `--ae-bg #101116`, `--ae-surface`, `--ae-surface-raised`, `--ae-border`;
  - `--ae-text` avorio, `--ae-text-muted`;
  - `--ae-gold #DFAE59`, `--ae-danger #D95E5C`, `--ae-heal`, `--ae-focus`.
- `css/components.css`: componenti (pulsanti, badge, carta, finestre, ecc.).
- `style.css`: layout e quasi tutte le aggiunte recenti, in fondo al file.

### Stato

- `queue`: array di voci `{ uid, data, tokens, hp, turnHp, isNew }`.
  - `data` è la carta di `cards.json`.
  - Altre variabili: `deck` e `discard` (array di `data`), `currentIndex`, `newIndex` (≥0 quando c'è una carta appena
    pescata), `resolving`, `turn`, `maxTierDrawn`, `settings = { players, nemesis, includeUpgraded }`.
- `ui`: stato solo visivo. Campi principali:
  - `viewedUid`, `holdUid`;
  - `isTransitioning` (blocca i tocchi durante le animazioni, con `lockFor(ms)`);
  - `reveal` (`{ uid, status: loading | ready | flipping | done | error }`, la rotazione della carta pescata);
  - `queueAnchor`, `tierBanner`, `fromScroll`.
- **Undo e salvataggio:** `act(fn)` fa `snapshot()` per l'undo, esegue l'azione e salva.
  - L'undo arriva fino a `UNDO_LIMIT = 300` passi; `restore()` ripristina.
  - Il salvataggio va in `localStorage` con la chiave `aeonsend-app-0.2-save`, diversa da quella della v1 perché il
    dominio github.io è condiviso.
- **Rendering:** `render()` disegna tutto.
  - Turno nemesi: `renderResolve()`, che chiama `renderResolveInfo` (box), la fascia e `renderFocus` (carosello).
  - Il carosello si ricostruisce solo quando cambia la "firma" (`focusStateSignature`); altrimenti scorre e basta.
  - Turno giocatori: `renderQueue()`, con la fascia, `.queue-slot` (carta + comandi) e `sizeQueue()`.

### Regole di gioco nel codice

- **Mazzo:** per ogni Tier si prendono a caso carte Basic e Upgraded Basic, nel numero indicato da
  `deck-setup.json[battaglia][giocatori]`, più le carte Specific della nemesi. Ogni Tier è mescolato a parte, con il
  Tier 1 in cima. Le carte senza Tier non entrano nel mazzo.
- **Risoluzione** (`resolveCurrent`):
  - potere con più di 1 token: −1 token e avanti;
  - minion: resta e avanti;
  - attacco o potere all'ultimo token: negli scarti.
- **Dopo l'ultima carta:** si entra nel passo Pesca. La pesca (`drawNewCard`) avviene solo con "Pesca"; se il mazzo è
  vuoto si rimescolano gli scarti.
- **Carta pescata:** un attacco va negli scarti; le altre carte "Metti in gioco". Poi si torna al turno giocatori.

## 6. Dati

- `cards.json` (stile PowerShell: 4 spazi e due spazi dopo i due punti). Campi di ogni carta:
  - `id`, `name`, `category` (`Basic Nemesis` / `Upgraded Basic Nemesis` / `Specific`), `nemesis`, `tier` (null = fuori
    dal mazzo), `subgroup`;
  - `type` (`Attack` / `Power` / `Minion`; altri tipi solo per le carte fuori dal mazzo), `hp`, `hpVariable`,
    `tokens`, `qty`;
  - `effect`, `toDiscard`, `immediately`, `persistent`, `powerEffect` (testi, **non usati dall'app**);
  - `removable` (solo i poteri: true se l'effetto contiene "TO DISCARD");
  - `image` (`Data/<Nemesi>/Tier_N/<Nome>.webp`).
- `nemesis.json`: `name`, `wave`, `waveOrder`, `miniExpansion`, `battle`, `flagBattle5`, `owned`.
  - Una nemesi è giocabile se è posseduta, ha la battaglia e ha carte Specific.
- `deck-setup.json`: la tabella del Nemesis Deck Setup.
- **Immagini:**
  - `Data/...`: scansioni in WebP qualità 90. Gli originali JPG/PNG sono sul PC ma esclusi da git.
  - `thumbs/<id>.webp`: miniature.
  - `Assets/nemesis/`: per ogni nemesi `<slug>.webp` (carta), `<slug>-back.webp` (retro con setup e storia),
    `<slug>-portrait.webp` (ritaglio) e `nemesis-art.json` (elenco).
  - `Assets/ui/decor/`: `card-back.webp` (dorso), `nemesis-turn-bg-2.webp`, `players-turn-bg.webp`, `logo.webp` (non
    usato).
  - `Assets/power-token-2.webp`, `Assets/ui/icons/life-drop.webp` (goccia), `Assets/ui/icons/alert.webp` ("!").
- **Nemesi complete:** le 7 di The New Age: Maggoth, Arachnos, Ageless Walker e Fenrix (scatola base); The Wailing,
  The Wanderer e Necroswarm (mini espansioni).

### Script in `tools/` (Python + Pillow, da lanciare dalla cartella del repo)

- `convert-webp.py`: converte JPG/PNG di `Data/` in WebP 90 e aggiorna `cards.json`.
- `build-thumbs.py`: rifà tutte le miniature. Attenzione: rigenerandole dai WebP cambiano anche quelle esistenti, quindi
  si fa commit solo delle nuove.
- `build-nemesis-art.py`: legge `Assets/nemesis/src/<Nome>.jpg` e `<Nome> - back.jpg` (esclusi da git) e crea carta,
  retro, ritaglio e manifest.

## 7. Pubblicazione

- `.github/workflows/pages.yml` (Pages → Source = "GitHub Actions").
  - Pubblica solo i file del sito: niente `tools/`, `README`, `.md`.
  - Ogni tentativo di deploy ha 3 minuti e ce ne sono fino a 3.
  - Motivo: GitHub ogni tanto si blocca fino al limite di 10 minuti e manda una mail di errore.
- GitHub Pages tiene in cache `index.html` per circa 10 minuti. Per questo gli elementi nuovi della pagina vengono creati
  da `script.js` quando mancano (difesa contro un `index.html` vecchio con uno script nuovo).

## 8. Test in locale

- **Server:** `python -m http.server 8124 --bind 127.0.0.1`, lanciato in background dalla cartella del repo. Poi si apre
  `http://127.0.0.1:8124/` nel browser interno.
- **Misura del telefono:** `resize_window` preset `mobile` (375×812); alla fine si torna a `desktop`.
- **Limiti del browser di prova:**
  - non esegue animazioni né transizioni (restano al tempo 0);
  - **requestAnimationFrame non scatta**;
  - gli eventi `scroll` nativi non arrivano.

  Si verifica quindi con lo stato e le misure, lanciando gli eventi a mano (`dispatchEvent(new Event('scroll'))`). Per
  questo il carosello usa `setTimeout` invece di rAF.
- **Funzioni utili da console:** sono globali, per esempio `queue`, `allCards`, `makeEntry`, `render()`, `undo()`,
  `viewCard()`, `isDrawStep()`, `centredFocusUid()`.

## 9. Punti di ripristino (tag git)

| Tag | Stato |
|---|---|
| `v86-prima-dei-comandi-sotto-le-carte` | Prima dei comandi sotto le carte nel turno giocatori. |
| `v98-prima-del-carosello` | Turno nemesi con una carta sola e slide a mano, prima del carosello nativo. |
| `v104-banner-info-nemesi` | Con il BannerInfoNemesi in basso, prima dei box mazzo e scarti ai lati della fascia. |

Per tornare a un tag si ripubblica quello stato con un nuovo commit, senza riscrivere la storia.

## 10. Idee e cose aperte

- Il nome della nemesi e l'etichetta di fase sono spariti insieme al BannerInfoNemesi. Si potrebbe scrivere il nome
  nell'intestazione, per esempio "Turno nemesi 3 · Maggoth".
- I box mazzo e scarti ci sono solo nel turno nemesi; non sono stati aggiunti al turno giocatori.
- Le immagini delle altre nemesi (wave diverse da The New Age) mancano: l'utente le fornisce come scansioni della carta
  nemesi, fronte e retro.
- Il repo originale `AeonsEnd_APP` ha lo stesso problema di pubblicazione bloccata; lì non c'è ancora il workflow con i
  tentativi.
