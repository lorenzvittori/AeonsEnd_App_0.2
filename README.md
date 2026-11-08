# Aeon's End App 0.2

Versione con il nuovo design: interfaccia rifatta secondo `REPORT_IMPLEMENTAZIONE.md` (kit di design v1.0),
sopra la logica di gioco della versione 48 (mazzo, pesca, scarti, poteri/minion/attacchi, turni e undo invariati).

- Sito: https://lorenzvittori.github.io/AeonsEnd_App_0.2/
  - Pubblicato da `.github/workflows/pages.yml` (Pages → Source = "GitHub Actions"): ogni tentativo ha 3 minuti e,
    se GitHub si blocca, riprova da solo fino a 3 volte; pubblica solo i file del sito.
- Repository autonomo (non legge nulla da AeonsEnd_APP):
  - `index.html`, `script.js`, `version.json` (si aumenta a ogni cambio di CSS/JS: vale per tutti i CSS e per il JS)
  - `css/design-tokens.css` (colori, font Cinzel/Inter da Google Fonts, durate), `css/components.css` (componenti), `style.css` (layout)
  - `cards.json`, `deck-setup.json`, `nemesis.json`: dati delle carte, del Nemesis Deck Setup e delle nemesi (copiati da AeonsEnd_APP)
  - `Data/`: scansioni delle carte in WebP qualità 90 (usate per la carta grande), fatte da `tools/convert-webp.py`
    che aggiorna anche i percorsi in `cards.json`. Gli originali JPG/PNG restano sul PC nella stessa cartella ma sono
    esclusi da git (`.gitignore`), così il sito pesa ~38 MB invece di ~150 MB.
  - `thumbs/<id>.webp`: miniature della coda (264 x 369), generate da `tools/build-thumbs.py` (serve Pillow).
    Da rieseguire se cambiano `cards.json` o le immagini in `Data/`: `python tools/build-thumbs.py`
  - `Assets/ui/icons/*.svg` (icone del kit), `Assets/ui/decor/card-back.webp` (retro della carta pescata),
    `Assets/*.webp` (gocce di vita del dialogo). `Assets/ui/decor/card-back.svg` è il retro generico del kit, non più usato.
- La partita si salva nella chiave `aeonsend-app-0.2-save`. Tutti i siti di lorenzvittori.github.io condividono lo stesso
  salvataggio del browser, quindi la chiave è diversa da quella di AeonsEnd_APP e del suo prototipo. Il formato è quello della v48.
