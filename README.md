# AutomotiveDoc

**AutomotiveDoc** è una web application per la gestione digitale dei
fascicoli contrattuali in ambito automotive.\
Il sistema supporta l'intero ciclo di vita di un fascicolo di vendita,
dalla creazione iniziale fino alla fase di consegna e completamento,
garantendo tracciabilità, controllo documentale e una chiara separazione
delle responsabilità tra i diversi ruoli aziendali coinvolti.

------------------------------------------------------------------------

## Ciclo di vita del fascicolo

Un fascicolo rappresenta l'insieme strutturato dei documenti necessari
alla gestione di una pratica di vendita.

Il ciclo di vita del fascicolo è articolato nei seguenti
**macro-stati**:

1.  **Bozza**\
    Stato iniziale del fascicolo.\
    Il fascicolo è visibile esclusivamente ai venditori e non è ancora
    preso in carico.\
    In questo stato non è consentita la segnalazione di annullamento.\
    L'annullamento diretto è consentito esclusivamente al Supervisore.

2.  **Nuovo**\
    Il venditore prende in carico il fascicolo.\
    Da questo momento può:

    -   aggiungere tipologie documentali\
    -   caricare documenti\
    -   inserire note

3.  **In validazione**\
    Stato centrale del processo, durante il quale intervengono uno o più
    rami di BackOffice\
    (Anagrafico, Finanziario, Permuta).

    Durante questa fase:

    -   ogni ramo di BackOffice segue un **flusso indipendente**
    -   il fascicolo può trovarsi in **più micro-stati
        contemporaneamente**, uno per ciascun ramo previsto
    -   la responsabilità ufficiale della fase è in capo ai BackOffice

4.  **Approvato**\
    Tutti i rami di BackOffice previsti hanno completato con esito
    positivo la verifica documentale.\
    Il fascicolo è pronto per la fase finale.

5.  **In finalizzazione**\
    Il fascicolo è preso in carico dall'Operatore Consegna per
    completare le attività conclusive\
    (caricamento documenti, verifiche operative, predisposizione alla
    consegna).\
    La responsabilità ufficiale della fase è in capo all'Operatore
    Consegna.

6.  **Consegna -- In attesa di presa in carico**\
    L'Operatore Consegna inoltra il fascicolo alla fase di Controllo
    Consegna.\
    Il fascicolo è in attesa che il Controllo Consegna lo prenda in
    carico.

7.  **In verifica (Consegna)**\
    Il Controllo Consegna sta verificando la documentazione di consegna.

8.  **Da controllare (Consegna)**\
    Il Controllo Consegna richiede integrazioni all'Operatore Consegna.\
    Dopo gli adeguamenti, l'Operatore Consegna reinoltra il fascicolo
    che torna in\
    **In verifica**.

9.  **Completato**\
    Il processo è concluso con esito positivo e il fascicolo risulta
    completato.

10. **Annullato**\
    Stato finale alternativo che rappresenta la chiusura definitiva del
    fascicolo con esito negativo.

    Lo stato di **Annullato** è:

    -   irreversibile
    -   tracciato
    -   consultabile in sola lettura
    -   associato a un avanzamento pari a **0%**

    L'annullamento può essere effettuato esclusivamente dal
    **Supervisore** e riguarda sempre l'intero fascicolo.

------------------------------------------------------------------------

## Micro-stati dei BackOffice

Durante la fase **In validazione**, ciascun ramo di BackOffice può
trovarsi in uno dei seguenti **micro-stati**:

-   **In attesa di presa in carico**\
    Il ramo è stato attivato ed è in attesa che un operatore lo prenda
    in carico.

-   **In verifica**\
    Il ramo è preso in carico da un operatore di BackOffice che sta
    verificando la documentazione.

-   **Da controllare**\
    Micro-stato che indica la necessità di integrazioni documentali da
    parte del venditore.

    Quando uno o più rami si trovano in questo stato:

    -   il venditore può intervenire esclusivamente sui documenti dei
        rami che hanno richiesto integrazione
    -   il BackOffice che ha richiesto il controllo è temporaneamente
        bloccato
    -   gli altri rami di BackOffice continuano a operare normalmente

-   **Validato**\
    Il ramo ha completato con esito positivo la verifica documentale.

I micro-stati dei rami evolvono in maniera indipendente e non si
influenzano reciprocamente.

------------------------------------------------------------------------

## Annullamento del fascicolo

L'annullamento del fascicolo rappresenta una decisione definitiva di
interruzione del processo.

### Annullamento diretto

L'annullamento diretto può essere eseguito esclusivamente dal
**Supervisore**, in qualunque stato del fascicolo.

L'operazione: - è irreversibile - richiede obbligatoriamente
l'inserimento di una nota motivazionale - viene tracciata nella timeline

------------------------------------------------------------------------

### Segnalazione di annullamento

Gli utenti operativi non possono annullare direttamente il fascicolo, ma
possono proporre una **segnalazione di annullamento**.

La possibilità di segnalare dipende dalla responsabilità ufficiale della
fase:

-   **Nuovo** → solo il Venditore owner
-   **In validazione** e **Approvato** → solo il BackOffice assegnatario
    del ramo
-   **In finalizzazione** → solo l'Operatore Consegna
-   **Consegna** → solo il Controllo Consegna
-   **Bozza** → non è consentita la segnalazione

La richiesta: - richiede l'inserimento di una motivazione - viene
tracciata - è visibile al Supervisore - può essere confermata o respinta

------------------------------------------------------------------------

## Riassegnazione del fascicolo

La riassegnazione del fascicolo è un'operazione di governance che
consente al Supervisore di sostituire l'utente attualmente assegnato a
una fase del processo, senza alterare lo stato o il flusso operativo del
fascicolo.

La riassegnazione: - è consentita esclusivamente tra utenti dello stesso
ruolo - non modifica i macro-stati né i micro-stati del fascicolo - è
tracciata nella timeline delle operazioni - richiede obbligatoriamente
l'inserimento di una nota

L'operazione non è disponibile nei seguenti stati: - Bozza - In attesa
di presa in carico - Approvato - Completato - Annullato

------------------------------------------------------------------------

## Visibilità dei fascicoli

L'interfaccia distingue i fascicoli nelle seguenti sezioni:

-   **Disponibili**\
    Fascicoli che l'utente, in base al proprio ruolo, può prendere in
    carico.

-   **In corso**\
    Fascicoli attualmente presi in carico dall'utente e sui quali può
    operare.

-   **Tutti**\
    Elenco completo dei fascicoli, consultabili in modalità sola
    lettura.

------------------------------------------------------------------------

## Visualizzazione contestuale dello stato

La label dello stato del fascicolo è contestuale al ruolo dell'utente:

-   Durante la fase di **In validazione**, il BackOffice assegnatario
    visualizza il micro-stato del proprio ramo; gli altri ruoli
    visualizzano il macrostato "In validazione".
-   Durante la fase di **Consegna**, il Controllo Consegna visualizza il
    micro-stato operativo; gli altri ruoli visualizzano il macrostato
    "Consegna".
-   In presenza di micro-stato **Da controllare**, il Venditore (in
    validazione) o l'Operatore Consegna (in consegna) visualizzano "Da
    controllare" quando devono effettuare integrazioni.

------------------------------------------------------------------------

## Ruoli utente

Il sistema distingue tra ruoli operativi e ruoli di governance.

### Venditore

-   Visualizza i fascicoli in stato di Bozza
-   Prende in carico i fascicoli portandoli allo stato Nuovo
-   Inserisce tipologie documentali, documenti e note
-   Gestisce integrazioni richieste dai BackOffice
-   Può proporre segnalazione di annullamento nello stato Nuovo

### BackOffice (Anagrafico, Finanziario, Permuta)

-   Prendono in carico il fascicolo nel proprio ramo di competenza
-   Verificano la documentazione richiesta
-   Possono richiedere integrazioni documentali
-   Completano la verifica del proprio ramo
-   Possono proporre segnalazione di annullamento in In validazione o
    Approvato se assegnatari

### Operatore Consegna

-   Prende in carico il fascicolo in In finalizzazione
-   Completa la documentazione necessaria alla consegna
-   Può proporre segnalazione di annullamento esclusivamente in In
    finalizzazione

### Controllo Consegna

-   Prende in carico il fascicolo in Consegna
-   Effettua le verifiche finali
-   Può proporre segnalazione di annullamento durante la fase di
    Consegna

### Admin

-   Accede alle funzionalità di configurazione
-   Non interviene nel flusso operativo dei fascicoli

### Supervisore

-   Dispone di accesso in sola lettura ai fascicoli
-   Può riassegnare
-   Può annullare direttamente in qualunque fase
-   Valuta le richieste di segnalazione di annullamento

------------------------------------------------------------------------

## Configurazione del sistema

Il sistema mette a disposizione un'area di configurazione accessibile
esclusivamente all'utente Admin.

Attraverso la sezione di configurazione è possibile gestire le tipologie
documentali specificandone: - sezione di appartenenza - nome -
obbligatorietà - stato di attivazione

Le tipologie disattivate restano visibili nei fascicoli storici,
garantendo coerenza e tracciabilità.
