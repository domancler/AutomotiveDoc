# AutomotiveDoc

**AutomotiveDoc** è una web application per la gestione digitale dei fascicoli contrattuali in ambito automotive.  
Il sistema supporta l’intero ciclo di vita di un fascicolo di vendita, dalla creazione iniziale fino alla fase di consegna e completamento, garantendo tracciabilità, controllo documentale e una chiara separazione delle responsabilità tra i diversi ruoli aziendali coinvolti.

---

## Ciclo di vita del fascicolo

Un fascicolo rappresenta l’insieme strutturato dei documenti necessari alla gestione di una pratica di vendita.

Il ciclo di vita del fascicolo è articolato nei seguenti **macro-stati**:

1. **Bozza**  
   Stato iniziale del fascicolo.  
   Il fascicolo è visibile esclusivamente ai venditori e non è ancora preso in carico.

2. **Nuovo**  
   Il venditore prende in carico il fascicolo.  
   Da questo momento può:
    - aggiungere tipologie documentali
    - caricare documenti
    - inserire note

3. **In validazione**  
   Stato centrale del processo, durante il quale intervengono uno o più rami di BackOffice
   (Anagrafico, Finanziario, Permuta).

   Durante questa fase:
    - ogni ramo di BackOffice segue un **flusso indipendente**
    - il fascicolo può trovarsi in **più micro-stati contemporaneamente**, uno per ciascun ramo previsto

4. **Approvato**  
   Tutti i rami di BackOffice previsti hanno completato con esito positivo la verifica documentale.  
   Il fascicolo è pronto per la fase finale.

5. **In finalizzazione**  
   Il fascicolo è preso in carico dall’Operatore Consegna per completare le attività conclusive
   (caricamento documenti, verifiche operative, predisposizione alla consegna).

6. **Consegna – in attesa di presa in carico**  
   L’Operatore Consegna inoltra il fascicolo alla fase di Controllo Consegna.  
   Il fascicolo è in attesa che il Controllo Consegna lo prenda in carico.

7. **Consegna – in verifica**  
   Il Controllo Consegna sta verificando la documentazione di consegna.

8. **Consegna – da controllare**  
   Il Controllo Consegna richiede integrazioni all’Operatore Consegna.  
   Dopo gli adeguamenti, l’Operatore Consegna reinoltra il fascicolo che torna in
   **Consegna – in verifica**.

9. **Completato**  
   Il processo è concluso con esito positivo e il fascicolo risulta completato.

10. **Annullato**  
    Stato finale alternativo che rappresenta la chiusura definitiva del fascicolo con esito negativo.  
    L’annullamento può avvenire in qualsiasi fase operativa, ad eccezione della **Bozza**.

    Lo stato di **Annullato** è:
    - irreversibile
    - tracciato
    - consultabile in sola lettura

---

## Micro-stati dei BackOffice

Durante la fase **In validazione**, ciascun ramo di BackOffice può trovarsi in uno dei seguenti **micro-stati**:

- **In attesa di presa in carico**  
  Il ramo è stato attivato ed è in attesa che un operatore lo prenda in carico.

- **In verifica**  
  Il ramo è preso in carico da un operatore di BackOffice che sta verificando la documentazione.

- **Da controllare**  
  Micro-stato che indica la necessità di integrazioni documentali da parte del venditore.

  Quando uno o più rami si trovano in questo stato:
    - il venditore può intervenire **esclusivamente sui documenti** dei rami che hanno richiesto integrazione
    - il BackOffice che ha richiesto il controllo è temporaneamente bloccato
    - gli altri rami di BackOffice continuano a operare normalmente, se previsti e se in uno stato operativo

> Nota: **“Validato” non è uno stato macro del fascicolo**.  
> È un **micro-stato del singolo ramo di BackOffice** e viene mostrato come  
> **“In validazione – Validato”**.

I micro-stati dei rami evolvono in maniera **indipendente** e non si influenzano reciprocamente.

---

## Annullamento del fascicolo

L’annullamento del fascicolo rappresenta una **presa d’atto dell’impossibilità di proseguire il processo**, e non una riapertura del flusso.

L’azione di annullamento:
- è disponibile in tutte le fasi operative, ad eccezione della **Bozza**
- può essere eseguita:
    - dall’utente attualmente responsabile del fascicolo
    - dal **Supervisore**
- richiede **obbligatoriamente l’inserimento di una nota**
- è **definitiva e non reversibile**

Una volta annullato, il fascicolo non può più essere modificato né riattivato e rimane disponibile esclusivamente in consultazione.

---

## Riassegnazione del fascicolo

La riassegnazione del fascicolo è un’operazione di governance che consente al
Supervisore di sostituire l’utente attualmente assegnato a una fase del processo,
senza alterare lo stato o il flusso operativo del fascicolo.

La riassegnazione:
- è consentita esclusivamente tra utenti dello stesso ruolo
- non modifica i macro-stati né i micro-stati del fascicolo
- è tracciata nella timeline delle operazioni
- richiede obbligatoriamente l’inserimento di una nota

L’operazione è disponibile in tutte le fasi operative del fascicolo,
ad eccezione dei seguenti stati:
- Bozza
- In attesa di presa in carico (validazione e consegna)
- Approvato
- Completato
- Annullato

---

## Visibilità dei fascicoli

L’interfaccia distingue i fascicoli nelle seguenti sezioni:

- **Disponibili**  
  Fascicoli che l’utente, in base al proprio ruolo, può prendere in carico.

- **In corso**  
  Fascicoli attualmente presi in carico dall’utente e sui quali può operare.

- **Tutti**  
  Elenco completo dei fascicoli, consultabili in modalità **sola lettura**.

La consultazione globale dei fascicoli è una scelta progettuale volta a favorire
il monitoraggio e la trasparenza del processo, senza incidere sulle responsabilità operative.

---

## Ruoli utente

Il sistema distingue tra **ruoli operativi**, che intervengono direttamente nel flusso del fascicolo,
e **ruoli di governance e configurazione**, che svolgono funzioni di controllo e supervisione.

---

## Ruoli operativi

### Venditore
- Visualizza i fascicoli in stato di **Bozza**
- Prende in carico i fascicoli portandoli allo stato **Nuovo**
- Inserisce tipologie documentali, documenti e note
- Avvia il processo di validazione
- In caso di integrazioni richieste da uno o più BackOffice (micro-stato **Da controllare**):
    - aggiunge o rimuove **esclusivamente i documenti** relativi ai rami che hanno richiesto integrazione
    - non può modificare le tipologie documentali
    - con l’azione **Procedi** reinoltra il fascicolo riportando i rami interessati
      direttamente in **In verifica**
- Può operare sul fascicolo fino allo stato **Approvato**
- Può annullare il fascicolo se responsabile dello stesso nella fase corrente

---

### BackOffice Anagrafico
### BackOffice Finanziario
### BackOffice Permuta

- Prendono in carico il fascicolo nel proprio ramo di competenza
- Verificano la documentazione richiesta
- Possono richiedere integrazioni documentali (micro-stato **Da controllare**)
- Completano la verifica del **proprio ramo** portandolo al micro-stato
  **In validazione – Validato**
- Possono annullare il fascicolo se responsabili nella fase corrente

Quando un ramo di BackOffice viene posto in **Da controllare** e successivamente
reintegrato dal venditore, il ramo torna allo **stesso operatore**
che lo aveva precedentemente preso in carico, **senza necessità di una nuova presa in carico**.

---

### Operatore Consegna
- Prende in carico il fascicolo dopo l’approvazione e lo porta nello stato **In finalizzazione**
- Inserisce e completa la documentazione necessaria alla consegna
- Con l’azione **Procedi** inoltra il fascicolo al Controllo Consegna
- In caso di integrazioni richieste dal Controllo Consegna (stato **Consegna – da controllare**),
  completa gli adeguamenti e reinoltra il fascicolo
- Può annullare il fascicolo se responsabile nella fase corrente

---

### Controllo Consegna
- Prende in carico il fascicolo nello stato **Consegna – in attesa di presa in carico**
- Effettua le verifiche finali sulla documentazione di consegna
- Può richiedere integrazioni all’Operatore Consegna
- Conclude il processo portando il fascicolo allo stato **Completato**
- Può annullare il fascicolo se responsabile nella fase corrente

---

## Ruoli di governance e configurazione

### Admin
Profilo utente con funzioni esclusivamente amministrative.

- Accede alle funzionalità di configurazione
- Gestisce le proprietà delle tipologie documentali
- Svolge attività di consultazione e controllo
- Non interviene nel flusso operativo dei fascicoli

---

### Supervisore
Profilo utente con funzioni di supervisione e governance del processo.

- Dispone di accesso in sola lettura ai fascicoli e alle dashboard
- Non prende in carico i fascicoli
- Non opera direttamente sui documenti
- Può intervenire trasversalmente effettuando:
    - riassegnazioni dei fascicoli tra operatori dello stesso ruolo
    - annullamenti motivati dei fascicoli

Le operazioni di riassegnazione consentono di sostituire l’utente assegnato
a una specifica fase del processo senza modificare lo stato o il flusso operativo
del fascicolo.  
Ogni riassegnazione è tracciata e richiede l’inserimento di una nota esplicativa.

---

## Configurazione del sistema

Il sistema mette a disposizione un’area di configurazione accessibile
esclusivamente all’utente Admin.

Attraverso la sezione di configurazione è possibile gestire le tipologie
documentali utilizzate nel processo di vendita, specificando per ciascuna:
- la sezione di appartenenza
- il nome della tipologia
- l’obbligatorietà
- lo stato di attivazione

Le tipologie disattivate non sono più selezionabili nei nuovi fascicoli,
ma restano visibili nei fascicoli storici, garantendo la coerenza
e la tracciabilità delle informazioni.

Le modifiche di configurazione hanno effetto a livello di sistema
e influenzano la composizione dei fascicoli nelle fasi operative successive.

---

## Considerazioni progettuali

Il modello dei ruoli e degli stati è stato progettato per:

- garantire una chiara separazione delle responsabilità
- consentire flussi paralleli e indipendenti tra i BackOffice
- evitare riavvii o reset non necessari del processo
- mantenere la tracciabilità completa delle operazioni
- preservare la coerenza e l’integrità del ciclo di vita del fascicolo