# Aeon's End – Nemesis Companion: contesto

## Scopo

Web app personale, pensata per il telefono, che accompagna una partita al gioco da tavolo cooperativo **Aeon's End**
(in particolare *The New Age*). Gestisce al posto dei giocatori **il mazzo della nemesi**:
- lo prepara secondo le regole;
- pesca le carte;
- tiene in ordine le carte in gioco (poteri, minion, attacchi);
- tiene il conto di token potere e punti vita dei minion;
- guida la risoluzione del turno della nemesi.

Il resto del gioco, cioè i maghi, la vita di Gravehold e della nemesi, resta sul tavolo.

## Come si usa

**Pagina iniziale ("Aeon's End – Nemesis Companion")**
- Si sceglie quanti giocatori ci sono (2, 3 o 4).
- Si sceglie la nemesi, per *wave* (espansione).
  - Ogni pulsante mostra parte dell'illustrazione, la battaglia e, se c'è, la mini espansione.
  - Toccando di nuovo la nemesi scelta si apre la sua carta intera; uno slide gira la carta e mostra il retro con il setup.
  - Le nemesi senza carte nell'app sono elencate come "non disponibili".
- C'è un interruttore "Includi carte base potenziate".
- Se c'è una partita salvata, compare la finestra "Partita in corso" con *Riprendi partita* / *Nuova partita*.

**Costruzione del mazzo (regola "Nemesis Deck Setup")**
- Per ogni Tier (1, 2, 3) si estraggono a caso carte *Basic* e *Upgraded Basic*. Quante, lo dicono la battaglia e il numero di giocatori.
- A queste si aggiungono le carte specifiche della nemesi.
- Ogni Tier viene mescolato a parte, con il Tier 1 in cima.
- Le carte senza Tier (mazzi a parte, maledizioni, segnalini) non entrano nel mazzo.

**Turno dei giocatori**
- In alto c'è una fascia con tutte le carte in gioco in piccolo; sotto le stesse carte, grandi, che si scorrono in orizzontale.
- Sotto ogni carta grande ci sono i suoi comandi:
  - **minion:** −5 / −1 / +1 alla vita; a 0 compare "Elimina minion";
  - **potere con "TO DISCARD":** "Rimuovi · costo pagato";
  - **altri poteri:** la nota "! Non rimovibile".
- Il box della vita mostra la goccia con la vita; se in questo turno il minion ha subito danni mostra "vita/totale" e sulla carta compare "HP: −n".
- Il box dei minion e dei poteri con 1 token lampeggia di rosso: sono le carte che si attiveranno nel prossimo turno nemesi.
- Il pulsante "Turno Nemesi", con l'illustrazione della nemesi scelta, avvia il turno della nemesi.

**Turno nemesi**
- Le carte in gioco si risolvono dalla più vecchia, una alla volta.
- Le carte sono in un carosello che si scorre con il dito: ai lati si vede un pezzo della precedente e della successiva, e la fascia in alto indica quale si sta guardando.
- Il pulsante in basso dice cosa fare con la carta da risolvere:
  - **potere con più token:** si toglie 1 token e si va avanti;
  - **potere all'ultimo token o attacco:** la carta va negli scarti;
  - **minion:** resta in gioco e si va avanti.
- Dopo l'ultima carta si pesca la nuova carta. Il suo retro si gira, la carta mostra l'etichetta NUOVA e un bagliore dorato.
- Alla prima carta di Tier 2 e di Tier 3 compare la scritta "Tier N".
- Se il mazzo finisce, si rimescolano gli scarti.

**Altro**
- **Undo:** in alto a sinistra, annulla le azioni una alla volta fino all'inizio della partita.
- **Menu:** in alto a destra apre un pannello laterale con:
  - Esci dalla partita;
  - turno nemesi;
  - carte nel mazzo;
  - Scarti, la pila degli scarti con le carte consultabili.
- **Salvataggio:** la partita si salva da sola nel browser, insieme alla cronologia dell'undo.

## Dati

- `cards.json`: tutte le carte nemesi. Per ogni carta:
  - id, nome, categoria (Basic / Upgraded Basic / Specific), nemesi, Tier;
  - tipo (Attack / Power / Minion);
  - vita, token, quantità, testo, `removable` (solo per i poteri);
  - percorso dell'immagine.
- `nemesis.json`: le nemesi, con wave, mini espansione, battaglia e se sono possedute.
- `deck-setup.json`: la tabella del Nemesis Deck Setup.
- `Data/<Nemesi>/Tier_N/*.webp`: scansioni delle carte. `thumbs/` contiene le miniature.
- `Assets/nemesis/`: immagini delle nemesi per il menu (fronte, retro, ritaglio).
- Nemesi complete oggi: le 7 di *The New Age*, cioè:
  - Maggoth, Arachnos, Ageless Walker, Fenrix;
  - The Wailing, The Wanderer, Necroswarm (le mini espansioni).

## Tecnica

- HTML, CSS e JavaScript senza framework: `index.html`, `script.js`, `style.css`, `css/design-tokens.css`, `css/components.css`.
- Interfaccia scura, con oro e rosso come colori d'accento e font Cinzel e Inter.
- `version.json` forza l'aggiornamento della cache: va aumentato a ogni modifica di CSS o JS.
- Script in `tools/` (Python + Pillow):
  - conversione delle scansioni in WebP;
  - miniature;
  - immagini delle nemesi.
- Sito pubblicato su GitHub Pages da `.github/workflows/pages.yml`, che riprova da solo se la pubblicazione si blocca.
  - Repository: `lorenzvittori/AeonsEnd_App_0.2`
  - Sito: <https://lorenzvittori.github.io/AeonsEnd_App_0.2/>
- Esiste anche una versione precedente dell'app, nel repository `AeonsEnd_APP`.
