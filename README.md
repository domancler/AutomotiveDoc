# AutomotiveDoc – Flusso di gestione del fascicolo

Questo documento descrive il **ciclo di vita completo di un fascicolo** all’interno dell’applicazione AutomotiveDoc, specificando:

- **stati**
- **ruoli coinvolti**
- **azioni consentite**
- **regole di avanzamento**
- **posizionamento nei tab dell’interfaccia**

Il flusso è basato su **presa in carico esplicita**, **rami indipendenti** e **ritorni controllati verso lo stesso utente**.

---

## Concetti chiave

- **Disponibili**
  - Fascicoli non presi in carico
  - Sola lettura
- **In corso**
  - Fascicoli presi in carico dall’utente loggato
  - Operativi
- **Prendi in carico**
  - Azione che assegna il fascicolo all’utente
- **Procedi**
  - Unica azione di avanzamento del flusso
  - Il comportamento dipende dallo stato e dalla completezza dei documenti
- **Ritorni controllati**
  - Quando sono richieste integrazioni, il fascicolo torna **sempre allo stesso utente** che lo aveva in carico in quella fase

---

## 1. Venditore – Avvio del fascicolo

### Stato: **Bozza**
- **Ruolo**: Venditore
- **Tab**: Disponibili
- **Descrizione**: fascicolo iniziale, non ancora assegnato
- **Permessi**: sola lettura

**Azione**
- *Prendi in carico* → il fascicolo passa al venditore

---

### Stato: **Nuovo**
- **Ruolo**: Venditore
- **Tab**: In corso
- **Permessi**:
  - aggiunta tipologie (di qualunque sezione)
  - caricamento documenti
  - inserimento note

**Regola Procedi**
- Se **esiste almeno una tipologia senza documento** → Procedi **non consentito**
- Se **tutte le tipologie hanno il documento** → Procedi consentito

**Procedi**
→ il fascicolo entra nello stato **In validazione**

---

## 2. Back Office – Validazione (BO / BOF / BOU)

La validazione è composta da **tre rami paralleli e indipendenti**:
- Back Office Anagrafico
- Back Office Finanziario
- Back Office Permuta

Ogni ramo ha **stato e presa in carico propri**.

---

### Stato: **In validazione – In attesa di presa in carico**
- **Ruolo**: BO
- **Tab**: Disponibili
- **Permessi**: sola lettura

**Azione**
- *Prendi in carico* (per il singolo ramo BO)

---

### Stato: **In validazione – In verifica**
- **Ruolo**: BO che ha preso in carico
- **Tab**: In corso
- **Permessi**:
  - gestione tipologie e documenti **solo della propria sezione**

**Procedi**
- Se **tutte le tipologie hanno il documento**
  → il ramo passa a **Validato**
- Se **mancano documenti**
  → il ramo passa a **Da controllare**
  → il fascicolo torna **allo stesso venditore** che lo aveva in carico

---

### Stato: **Da controllare**
- Stato del singolo ramo BO
- Indica che sono richieste integrazioni

**Comportamento**
- Il venditore carica i documenti mancanti
- **Procedi**
  → il fascicolo torna **allo stesso BO**
  → stato: **In validazione – In verifica**

Il BO ripete la verifica con la stessa logica.

---

### Stato: **Validato**
- Stato interno del singolo ramo BO
- Il ramo è concluso positivamente

---

### Passaggio automatico
Quando **tutti e tre i rami BO sono in stato Validato**:
→ il fascicolo passa allo stato **Approvato**

---

## 3. Stato Approvato e riapertura

### Stato: **Approvato**
- Tutti i BO hanno validato il fascicolo
- Il venditore **può ancora agire solo in questa fase**

---

### Riapertura proposta dal venditore
- Il venditore può **richiedere la riapertura** del fascicolo
- Il fascicolo ricompare negli **In corso** dei BO originali
- È visibile che è stata proposta una riapertura

**Accettazione**
- Se **uno qualsiasi dei BO** fa *Riapri*:
  - il fascicolo viene riaperto per **tutti e tre**
  - stati risultanti:
    - BO che accetta → **In validazione – In verifica**
    - altri BO → **In validazione – Validato**

---

### Riapertura diretta da parte dei BO
- I BO che avevano validato il fascicolo possono:
  - riaprire **anche senza proposta del venditore**

**Effetto**
- stesso comportamento della riapertura proposta
- stessi BO di prima
- stati differenziati come sopra

---

### Fine ruolo venditore
- Superata la fase **Approvato** (senza riapertura):
  - il ruolo del venditore è concluso

---

## 4. Operatore Consegna

### Stato: **Approvato**
- **Ruolo**: Operatore consegna
- **Tab**: Disponibili
- **Permessi**: sola lettura

**Azione**
- *Prendi in carico*

---

### Stato: **Consegna – In corso**
- **Ruolo**: Operatore consegna
- **Tab**: In corso
- **Permessi**:
  - gestione tipologie e documenti di consegna

**Regola Procedi**
- Se **esiste almeno una tipologia senza documento** → Procedi non consentito
- Se tutto completo → Procedi consentito

**Procedi**
→ stato **Consegna – In attesa di presa in carico**

---

## 5. Controllo Consegna

### Stato: **Consegna – In attesa di presa in carico**
- **Ruolo**: Controllo consegna
- **Tab**: Disponibili

**Azione**
- *Prendi in carico*

---

### Stato: **In verifica**
- **Ruolo**: Controllo consegna
- **Tab**: In corso
- **Permessi**:
  - gestione documenti della consegna

**Procedi**
- Se **mancano documenti**
  → ritorno **allo stesso operatore consegna**
- Se tutto corretto
  → **Completato**

---

### Ritorno dall’operatore consegna
- L’operatore carica i documenti mancanti
- **Procedi**
  → il fascicolo torna **direttamente allo stesso controllo consegna**
  → stato **In verifica**

---

## 6. Stato finale

### Stato: **Completato**
- Ciclo di vita concluso
- Fascicolo consultabile
- Nessuna operazione consentita

---

## Regole fondamentali

- **Disponibili ≠ In corso**
  - Disponibili: non preso in carico, sola lettura
  - In corso: preso in carico, operazioni abilitate
- **Procedi è l’unica azione di avanzamento**
- **Ogni ramo BO è indipendente**
- **I ritorni avvengono sempre verso lo stesso utente**
- **Le tipologie senza documenti bloccano l’avanzamento**
- **La riapertura mantiene i BO originali**