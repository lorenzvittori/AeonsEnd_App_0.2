// Aeon's End – Nemesis Companion (App 0.2): caricatore del codice. Documentazione completa: CONTESTO_SVILUPPO.md.
//
// Dalla v227 il codice dell'app è diviso nei file di js/ (prima era tutto qui). Questo file resta perché index.html
// carica "script.js?v=N" (N da version.json) e index.html non si cambia: GitHub Pages lo tiene in cache ~10 minuti e
// un index.html vecchio cercherebbe file che non ci sono. Qui si legge il proprio ?v=N e si aggiungono i file di js/
// con lo stesso ?v=N, così il browser non mescola versioni vecchie e nuove.
// I file si eseguono IN ORDINE (script aggiunti con async = false), come un unico file: sono script classici con
// variabili globali, e l'app parte una sola volta, alla fine dell'ultimo file (init() in 16-avvio.js).
// Un file nuovo in js/ si aggiunge SOLO aggiungendolo a questo elenco, nel punto giusto dell'ordine; dopo uno
// spostamento di codice tra i file: node tools/check-js-order.mjs (CONTESTO_SVILUPPO.md, sezione 9).

(function () {
  'use strict';
  var FILES = [
    '00-regole.js',
    '01-testi-stato.js',
    '02-dati-mazzo.js',
    '03-componenti.js',
    '04-vista-coda.js',
    '05-scarti.js',
    '06-pagina-iniziale.js',
    '07-salvataggio-undo.js',
    '08-vista-risoluzione.js',
    '09-eventi.js',
    '10-mazzo-turni.js',
    '11-testata-voli-vittoria.js',
    '12-crea-mazzo.js',
    '13-pesca-undo-passaggi.js',
    '14-menu-sfondo-rete.js',
    '15-modalita-test.js',
    '16-avvio.js'
  ];
  var me = document.currentScript;
  var match = me && me.src ? /[?&]v=([^&#]*)/.exec(me.src) : null;
  var query = match ? '?v=' + match[1] : '';
  FILES.forEach(function (name) {
    var js = document.createElement('script');
    js.src = 'js/' + name + query;
    js.async = false;
    document.body.appendChild(js);
  });
})();
