# Grandi miglioramenti:
- Aggiungere ordine turno
- Implementare vita nemesi e vita gravehold
- Implementare biblioteca carte e assistente per la creazione del mercato

# Generale:
- il menu vittoria è rotto a destra
- cambiare visualizzazione di VITTORIA
- Fare una back senza la scritta da usare per i mazzi
- non mettere il nome nemesi e le info al centro ma spostale attaccate a destra
- creare la time line
- inserire nelle statistiche il tempo della partita
- nei turni in gioco dei Minions, mettere la foto del Minion
- rifare creazione del mazzo, la 0.3 ha delle buone idee
- quando faccio danni ad un Minion che ha vita X devo vedere x/X
- Rimpicciolire le carte in alto per guadagnare spazio, tenere i token potere e la vita. si può pensare di non fare la miniatura ma di creare delle carte solo gialle per i poteri e solo azzurre per i minion, o ancora meglio, tenere solo la parte in alto della carta, solo lartwork
- dare feedback di danni come nella 0.3
- le wave non numerarle con numeri arabi ma con numeri romani
- Aggiungere la scelta del back delle carte come valore estetico e customizzabile in più (idea: mettere il back delle carte da briscola)

# Menu Principale 
- togliere il box dei pulsanti, mostra solo le scritte

# Menu Nuova Partita
- Togliere titolo Aeons End e Nemesis Companion e scrivere Nuova Partita
- Sostituire il menu con la X che mi fa tornare al menu iniziale
- la sezione con Nuova partita e la X per uscire deve essere blcocata e sfumare di nero il resto
- per la wave metti un menu a tendina da cui selezionare, posso selezionarne più di una
- A destra della sezione Nemesi metti un simbolo per la scelta causale della nemesi tra tutte quelle in collezione
- il pulsante inizia partita ha una maschera nera sopra che sfuma, ma inizia a sfumare subito sopra il pulsante. metti un po' di pxel di nero al 100% e poi inizia a sfumare come adesso.
- la freccia verso il basso per aprire i dettagli del boss deve essere attaccata al boss selezionato, ora è troppo in basso

# Finestra Collezione
- il flag on/off delle espansioni devono essere più piccole le leggermente più a sinistra del falg della wave

# Barra informativa superiore
- inverti il nome della nemesi e i mazzi pesca e scarti. A sinitra mette il nome della nemesi, sotto metti battaglia, giocatori e turno. a destra metti mazzo pesca e mazzo scarti, ancora a destra il pulsante menu. 

# Barra lista carte piccole (in ogni fase):
- quando una carta viene rimossa(minion ucciso, potere pagato o risolto, attacco risolto) deve passare da trasparenza 100 a trasparenza 0 nello stesso tempo in un la carta grande va nel mazzo pesca. nella lista, le carta a destra della carta rimossa si rispostano a sinistra solo dopo che la carta è arrivata a 0 di trasparenza. a quel punto di blocco le carte si spostano velocemnte a sinistra in modo "pensate" con un'animazione che le fa rimbalzare unsa sola volta poco.
- nel poteri aggiungi un box in basso alle carte in cui metti il costo da pagare per scartalo
- aumenta la velocita si passaggio da una carta a quella cliccata del 50% 


# Vista grande carte (in ogni fase):
- devo poter vedere le interazioni (modificare vita per i minin e rimuovere poteri) solo per la carta al centro dello schermo, per le altre no. 
- se clicco su una carta che non è quella centrale, non mi apre la carta ma mi sposta su quella carta. la carta la apro solo se clicco la carta centrale nella visualizzzazione grande. 
- quando rimuovo una carta, le altre carte non si adattano subito e si mettano al centro, aspettano che la carta sia nel mazzo pesca e poi si spostano al centro. 
- vorrei che lo Swipe fosse più "magnetico", non può bloccarsi tra due carte, le animazioni più elastiche. 
- bug: nel turno nemesi ora vedo la vita dei minion del tipo x/X anche se non gli ho fatto danno
- quando faccio danno ad un minion voglio vedere x/X ma X non deve essere la vita iniziale del minion ma la vita che aveva prima del danno.


