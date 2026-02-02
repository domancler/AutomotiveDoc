# AutomotiveDoc

**AutomotiveDoc** è una web application per la gestione digitale dei fascicoli contrattuali in ambito automotive.  
Il sistema supporta l’intero ciclo di vita di un fascicolo di vendita, dalla creazione iniziale fino alla fase di consegna e completamento, garantendo tracciabilità, controllo documentale e una chiara separazione delle responsabilità tra i diversi ruoli aziendali coinvolti.

---

## Ciclo di vita del fascicolo

Un fascicolo rappresenta l’insieme strutturato dei documenti necessari alla gestione di una pratica di vendita.

Il ciclo di vita del fascicolo è articolato nei seguenti stati:

1. **Bozza**  
   Stato iniziale del fascicolo.  
   Il fascicolo è visibile esclusivamente ai venditori e non è ancora preso in carico.

2. **Nuovo**  
   Il venditore prende in carico il fascicolo.  
   Da questo momento può:
   - aggiungere tipologie documentali  
   - caricare documenti  
   - inserire note  

3. **In attesa di presa in carico**  
   Il fascicolo è stato inoltrato a uno dei rami di BackOffice ed è in attesa che un operatore lo prenda in carico.

4. **In verifica**  
   Il fascicolo è preso in carico da un operatore di BackOffice che sta verificando la documentazione richiesta.

5. **Da controllare**  
   Il fascicolo presenta anomalie o documentazione incompleta e richiede integrazioni da parte dello step precedente.

6. **Validato**  
   La fase di verifica del singolo ramo di BackOffice è conclusa con esito positivo.

7. **Approvato**  
   Tutte le verifiche documentali dei rami attivi sono state completate.  
   Il fascicolo è pronto per la fase finale.

8. **In finalizzazione**  
   Il fascicolo è preso in carico dall’Operatore Consegna per completare le attività conclusive (caricamento documenti, verifiche operative, predisposizione alla consegna).

9. **Consegna – in attesa di presa in carico**  
   L’Operatore Consegna inoltra il fascicolo alla fase di controllo consegna.  
   Il fascicolo è in attesa che il Controllo Consegna lo prenda in carico.

10. **Consegna – in verifica**  
    Il Controllo Consegna sta verificando la documentazione e può concludere l’iter oppure richiedere integrazioni.

11. **Consegna – da controllare**  
    Il Controllo Consegna richiede integrazioni all’Operatore Consegna.  
    Dopo gli adeguamenti, l’Operatore Consegna inoltra nuovamente il fascicolo che torna in **Consegna – in verifica**.

12. **Completato**  
    Il processo è concluso con esito positivo e il fascicolo risulta completato.

13. **Annullato**  
    Stato finale alternativo che rappresenta la chiusura definitiva del fascicolo con esito negativo.  
    L’annullamento può avvenire in qualsiasi fase operativa, ad eccezione della **Bozza**, qualora emergano condizioni che rendano impossibile o non opportuno il proseguimento del processo.

    Lo stato di **Annullato** è:
    - irreversibile  
    - tracciato  
    - consultabile in sola lettura  

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

## Visibilità dei fascicoli

L’interfaccia distingue i fascicoli nelle seguenti sezioni:

- **Disponibili**  
  Fascicoli che l’utente, in base al proprio ruolo, può prendere in carico.

- **In corso**  
  Fascicoli attualmente presi in carico dall’utente e sui quali può operare.

- **Tutti**  
  Elenco completo dei fascicoli, consultabili in modalità **sola lettura**.

La consultazione globale dei fascicoli è una scelta progettuale volta a favorire il monitoraggio e la trasparenza del processo, senza incidere sulle responsabilità operative.

---

## Ruoli utente

Il sistema distingue tra **ruoli operativi**, che intervengono direttamente nel flusso del fascicolo, e **ruoli di governance e configurazione**, che svolgono funzioni di controllo, supervisione e configurazione del sistema.

---

## Ruoli operativi

### Venditore
- Sceglie i fascicoli tra quelli in stato di **Bozza**
- Prende in carico i fascicoli portandoli allo stato **Nuovo**
- Inserisce tipologie documentali, documenti e note
- Avvia il processo di validazione
- Può operare sul fascicolo fino allo stato **Approvato**, incluse eventuali integrazioni richieste
- Può annullare il fascicolo se responsabile dello stesso nella fase corrente

---

### BackOffice Anagrafico  
### BackOffice Finanziario  
### BackOffice Permuta

- Prendono in carico il fascicolo nel proprio ramo di competenza
- Verificano la documentazione richiesta
- Possono richiedere integrazioni documentali (stato **Da controllare**)
- Completano la verifica portando il fascicolo allo stato **Validato**
- Possono annullare il fascicolo se responsabili nella fase corrente

Quando un fascicolo viene restituito a uno step precedente, torna **sempre allo stesso operatore** che lo aveva precedentemente preso in carico.

---

### Operatore Consegna
- Prende in carico il fascicolo dopo l’approvazione e lo porta nello stato **In finalizzazione**
- Inserisce e completa la documentazione necessaria alla consegna
- Con l’azione **Procedi** inoltra il fascicolo al Controllo Consegna nello stato **Consegna – in attesa di presa in carico**
- In caso di integrazioni richieste dal Controllo Consegna (stato **Consegna – da controllare**), completa gli adeguamenti e reinoltra il fascicolo (ritorno in **Consegna – in verifica**)
- Può annullare il fascicolo se responsabile nella fase corrente

---

### Controllo Consegna
- Prende in carico il fascicolo nello stato **Consegna – in attesa di presa in carico** e lo porta in **Consegna – in verifica**
- Effettua le verifiche finali sulla documentazione di consegna
- Se necessita integrazioni dall’Operatore Consegna, con **Procedi** porta il fascicolo in **Consegna – da controllare** e lo restituisce allo stesso Operatore Consegna
- Se non necessita integrazioni, con **Procedi** conclude il processo portando il fascicolo allo stato **Completato**
- Può annullare il fascicolo se responsabile nella fase corrente

---

## Ruoli di governance e configurazione

### Admin
Profilo utente con funzioni esclusivamente amministrative sul sistema.

- Accede alle funzionalità di configurazione applicativa
- Gestisce le proprietà delle tipologie documentali
- Svolge attività di consultazione e controllo
- Non interviene nel flusso operativo dei fascicoli
- Non prende in carico fascicoli né modifica gli stati

---

### Supervisore
Profilo utente con funzioni di supervisione e governance del processo.

- Dispone di accesso in sola lettura ai fascicoli e alle dashboard
- Può intervenire in modo trasversale sul processo effettuando:
  - riassegnazioni tra operatori dello stesso ruolo
  - annullamenti motivati dei fascicoli
- Non opera direttamente sui documenti
- Non prende in carico i fascicoli
- Non modifica i normali stati di avanzamento del workflow

---

## Considerazioni progettuali

Il modello dei ruoli e degli stati è stato progettato per:

- garantire una chiara separazione delle responsabilità  
- consentire agli operatori di intervenire tempestivamente in caso di blocchi o errori  
- evitare riaperture del processo una volta concluso  
- mantenere la tracciabilità completa delle operazioni  
- preservare la coerenza e l’integrità del ciclo di vita del fascicolo  
