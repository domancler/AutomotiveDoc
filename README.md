# AutomotiveDoc – Flusso di gestione del fascicolo

Questo documento descrive il **flusso completo di vita di un fascicolo** all’interno dell’applicazione AutomotiveDoc, indicando **ruoli coinvolti, stati, motivazioni delle transizioni** e **posizionamento nei tab dell’interfaccia**.

---

## Concetti chiave

- **Disponibili**: fascicoli non ancora presi in carico (sola lettura)
- **In corso**: fascicoli attualmente in carico all’utente loggato (operativi)
- **Procedi**: unica azione di avanzamento; il comportamento dipende dallo stato dei documenti
- **Ritorni controllati**: quando vengono richieste integrazioni, il fascicolo torna **sempre allo stesso utente** che lo aveva prima

---

## 1. Venditore – Avvio del fascicolo

### Stato: **Bozza**
- **Ruolo**: Venditore
- **Tab**: Disponibili
- **Descrizione**: fascicolo iniziale, non ancora assegnato
- **Permessi**: sola lettura

**Azione**
- *Prendi in carico* → il fascicolo diventa del venditore

---

### Stato: **Nuovo**
- **Ruolo**: Venditore
- **Tab**: In corso
- **Permessi**: aggiunta tipologie, caricamento documenti, note

**Regola Procedi**
- Se **non esistono tipologie** → Procedi consentito
- Se esistono tipologie → Procedi consentito **solo se tutte hanno il documento**

**Procedi**
→ Il fascicolo entra nella fase di validazione Back Office

---

## 2. Back Office – Validazione (BO / BOF / BOU)

La validazione è composta da **tre rami paralleli e indipendenti**:
- Back Office Anagrafico
- Back Office Finanziario
- Back Office Permuta

---

### Stato: **In validazione – In attesa di presa in carico**
- **Ruolo**: BO
- **Tab**: Disponibili
- **Permessi**: sola lettura

**Azione**
- *Prendi in carico* (per il singolo ramo)

---

### Stato: **In validazione – In verifica**
- **Ruolo**: BO che ha preso in carico
- **Tab**: In corso
- **Permessi**: aggiunta/rimozione tipologie e documenti

**Procedi**
- Se esistono tipologie richieste senza documento  
  → richiesta integrazioni  
  → il fascicolo torna **allo stesso venditore**
- Se tutto completo  
  → il ramo viene **validato**

---

### Stato: **In validazione – Validato**
- Stato interno del singolo ramo BO

Quando **tutti e tre i rami BO sono validati**:
→ passaggio automatico allo stato **Approvato**

---

## 3. Operatore Consegna – Fase finale

### Stato: **Approvato**
- **Ruolo**: Operatore consegna
- **Tab**: Disponibili
- **Permessi**: sola lettura

**Azione**
- *Prendi in carico*

---

### Stato: **Fase finale**
- **Ruolo**: Operatore consegna
- **Tab**: In corso
- **Permessi**: aggiunta tipologie e documenti di consegna

**Regola Procedi**
- Se esistono tipologie senza documento → Procedi **non consentito**
- Se tutto completo → Procedi consentito

**Procedi**
→ il fascicolo diventa disponibile per il Controllo consegna

---

## 4. Controllo Consegna (VRC)

### Stato: **Fase finale – In attesa di presa in carico**
- **Ruolo**: Controllo consegna
- **Tab**: Disponibili

**Azione**
- *Prendi in carico*

---

### Stato: **In verifica**
- **Ruolo**: Controllo consegna
- **Tab**: In corso
- **Permessi**: come un BO (tipologie e documenti)

**Procedi**
- Se mancano documenti richiesti  
  → il fascicolo torna **allo stesso operatore consegna**
- Se tutto corretto  
  → **Completato**

---

### Ritorno dall’Operatore Consegna
- L’operatore carica i documenti mancanti
- **Procedi**
  → il fascicolo torna **direttamente allo stesso Controllo consegna** in “In verifica”

---

## 5. Stato finale

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
- **I rami BO e Consegna sono indipendenti**
- **I ritorni avvengono sempre verso lo stesso utente**
- **Le tipologie senza documenti bloccano l’avanzamento**

---

