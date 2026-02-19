import type { Role } from "@/auth/roles";
import type { Action } from "@/auth/actions";
import { States, type StateCode } from "@/workflow/states";

export type AppUser = {
  id: string;
  username: string;
  name?: string;
  role: Role;
};

export type FascicoloContext = {
  // stato principale (se nel tuo mock usi label, puoi mapparle a Sxx)
  state?: StateCode;
  /** stato principale del fascicolo (overall), utile quando state cambia per ruolo (es. BO branch) */
  overallState?: StateCode;

  // proprietà utili alle regole
  ownerId?: string;              // commerciale proprietario
  hasFinanziamento?: boolean;    // Pagam. Finanz. = Sì
  hasPermuta?: boolean;          // Permuta = Sì

  // “presa in carico” per area (se la modelli)
  inChargeBO?: string | null;    // userId
  inChargeBOF?: string | null;
  inChargeBOU?: string | null;
  inChargeDelivery?: string | null;
  inChargeVRC?: string | null;

  // ultimi incarichi (usati quando un ramo è "da controllare" e l'incarico è stato liberato)
  lastInChargeBO?: string | null;
  lastInChargeBOF?: string | null;
  lastInChargeBOU?: string | null;
  lastInChargeDelivery?: string | null;
  lastInChargeVRC?: string | null;

  /** true quando l'operatore consegna ha premuto "Procedi" verso controllo consegna */
  deliverySentToVRC?: boolean;

  /** COMMERCIALE: true se tutte le tipologie inserite hanno un documento presente (oppure non ci sono tipologie) */
  commDocsComplete?: boolean;

  /** CONSEGNATORE: true se tutte le tipologie inserite hanno un documento presente (oppure non ci sono tipologie) */
  deliveryDocsComplete?: boolean;

  /** stati dei rami (quando disponibili), utili per regole che dipendono dai micro-stati */
  branchStates?: {
    bo?: StateCode;
    bof?: StateCode;
    bou?: StateCode;
  };
};

const TAKE_BY_ROLE: Record<Role, Action | null> = {
  ADMIN: null,
  AMMINISTRATIVO: null,
  RESPONSABILE: null,
  COMMERCIALE: "FASCICOLO.TAKE_COMM",
  BO: "FASCICOLO.TAKE_BO",
  BOF: "FASCICOLO.TAKE_BOF",
  BOU: "FASCICOLO.TAKE_BOU",
  CONSEGNATORE: "DELIVERY.TAKE",
  VRC: "VRC.TAKE",
};

// helper: se non hai ancora gli Sxx nel mock, puoi passare undefined e la UI mostrerà solo le azioni “non stateful”
function st(f?: FascicoloContext) {
  return f?.state;
}

function isOwner(u: AppUser, f?: FascicoloContext) {
  return !!f?.ownerId && f.ownerId === u.id;
}

function isActiveArea(f: FascicoloContext | undefined, area: "BOF" | "BOU") {
  if (!f) return false;
  if (area === "BOF") return !!f.hasFinanziamento;
  if (area === "BOU") return !!f.hasPermuta;
  return true;
}

export function can(user: AppUser, action: Action, fascicolo?: FascicoloContext): boolean {
  const role = user.role;
  // NOTA: alcune UI passano anche overallState (macrostato) per distinguere fase reale vs microstati ramo.
  // Usiamo sempre overallState quando presente per le decisioni “di fase”, altrimenti fallback su state.
  const state = st(fascicolo);
  const phaseState = fascicolo?.overallState ?? state;

  // Annullamento: azione “finale” (irreversibile)
// - SOLO il Supervisore (RESPONSABILE) può annullare
// - consentito in qualsiasi stato, tranne se già ANNULLATO
if (action === "FASCICOLO.CANCEL") {
  if (!fascicolo) return false;
  if (!phaseState || phaseState === States.ANNULLATO) return false;
  return role === "RESPONSABILE";
}

// Richiesta annullamento (segnalazione verso Supervisore)
// - il Supervisore non segnala: annulla direttamente
// - gli altri possono segnalare solo in base al MACROSTATO e alla responsabilità “ufficiale”
if (action === "FASCICOLO.REQUEST_CANCEL") {
  if (!fascicolo) return false;
  if (!phaseState || phaseState === States.ANNULLATO) return false;
  if (role === "RESPONSABILE") return false; // annulla direttamente

  // Bozza: nessuno segnala
  if (phaseState === States.BOZZA) return false;

  // Nuovo: solo venditore owner
  if (phaseState === States.NUOVO) {
    return role === "COMMERCIALE" && fascicolo.ownerId === user.id;
  }

  // In finalizzazione: solo Operatore Consegna (CONSEGNATORE)
  // NB: solo quando ha effettivamente l'operatività (preso in carico)
  if (phaseState === States.IN_FINALIZZAZIONE) {
    return role === "CONSEGNATORE" && fascicolo.inChargeDelivery === user.id;
  }

  // Consegna: solo Controllo Consegna (VRC) *se incaricato*.
  // In particolare, in "in attesa di presa in carico" non deve poter segnalare finché non prende in carico.
  if (
    phaseState === States.CONSEGNA_IN_ATTESA_PRESA_IN_CARICO ||
    phaseState === States.CONSEGNA_IN_VERIFICA ||
    phaseState === States.CONSEGNA_DA_CONTROLLARE
  ) {
    return role === "VRC" && fascicolo.inChargeVRC === user.id;
  }

  // Validazione + Approvato: solo BO assegnatario del ramo (a prescindere dal sottostato del ramo)
  const isValidationState = [
    States.DA_VALIDARE_BO, States.VERIFICHE_BO, States.DA_RIVEDERE_BO, States.VALIDATO_BO,
    States.DA_VALIDARE_BOF, States.VERIFICHE_BOF, States.DA_RIVEDERE_BOF, States.VALIDATO_BOF,
    States.DA_VALIDARE_BOU, States.VERIFICHE_BOU, States.DA_RIVEDERE_BOU, States.VALIDATO_BOU,
    States.APPROVATO,
  ].includes(state);

  if (isValidationState) {
    if (role === "BO") {
      // In alcuni micro-stati (es. DA_RIVEDERE/VALIDATO) o in APPROVATO, l'incarico può risultare liberato (null).
      // In quel caso, la responsabilità resta attribuita all'ultimo incaricato del ramo.
      if (fascicolo.inChargeBO && fascicolo.inChargeBO !== user.id) return false;
      if (fascicolo.inChargeBO === user.id) return true;
      return fascicolo.lastInChargeBO === user.id;
    }
    if (role === "BOF") {
      if (fascicolo.inChargeBOF && fascicolo.inChargeBOF !== user.id) return false;
      if (fascicolo.inChargeBOF === user.id) return true;
      return fascicolo.lastInChargeBOF === user.id;
    }
    if (role === "BOU") {
      if (fascicolo.inChargeBOU && fascicolo.inChargeBOU !== user.id) return false;
      if (fascicolo.inChargeBOU === user.id) return true;
      return fascicolo.lastInChargeBOU === user.id;
    }
    return false;
  }

  return false;
}


  // Lettura generale: tutti i ruoli devono poter vedere Dashboard e tab 'Tutti'
  if (action === "DASHBOARD.VIEW") return true;
  if (action === "FASCICOLO.VIEW_ALL") return true;

  // ADMIN: solo config, zero fascicoli
  if (role === "ADMIN") {
    return action === "ADMIN.DOC_RULES_MANAGE";
  }

  // Amministrativo: lettura + upload fattura
  if (role === "AMMINISTRATIVO") {
    if (action === "DASHBOARD.VIEW") return true;
    if (action === "FASCICOLO.VIEW_ALL") return true;
    if (action === "FATTURA.UPLOAD") return true;
    return false;
  }

  // Responsabile: lettura + riassegnazione BO
  if (role === "RESPONSABILE") {
    if (action === "DASHBOARD.VIEW") return true;
    if (action === "FASCICOLO.VIEW_ALL") return true;
    if (action === "FASCICOLO.REASSIGN") {
      // Riassegnazione possibile "in qualunque momento" tranne stati finali o senza owner.
      // Esclusi: Bozza, In attesa di presa in carico (validazione+consegna), Approvato, Completato, Annullato.
      const s = fascicolo?.state;
      if (!s) return false;
      if (
        s === States.BOZZA ||
        s === States.CONSEGNA_IN_ATTESA_PRESA_IN_CARICO ||
        s === States.APPROVATO ||
        s === States.COMPLETATO ||
        s === States.ANNULLATO
      )
        return false;

      // In validazione: vietato solo quando TUTTI i rami sono ancora "in attesa di presa in carico".
      if (s === States.DA_VALIDARE_BO) {
        const bs = fascicolo?.branchStates;
        const bo = bs?.bo;
        const bof = bs?.bof;
        const bou = bs?.bou;
        const allWaiting =
          (bo ? bo === States.DA_VALIDARE_BO : true) &&
          (bof ? bof === States.DA_VALIDARE_BOF : true) &&
          (bou ? bou === States.DA_VALIDARE_BOU : true);
        if (allWaiting) return false;
      }
      return true;
    }
    return false;
  }

  // Regole di lettura
  if (action === "DASHBOARD.VIEW") {
    // Qui l'ADMIN è già stato gestito sopra.
    return true;
  }

  if (action === "FASCICOLO.VIEW_ALL") {
    return ["BO", "BOF", "BOU", "CONSEGNATORE", "VRC", "RESPONSABILE", "AMMINISTRATIVO"].includes(role);
  }

  if (action === "FASCICOLO.VIEW_OWN") {
    // Pagina dettaglio: permetti l'accesso se l'utente ha il fascicolo "in mano"
    // oppure se lo può prendere in carico (tab "Disponibili").
    if (!fascicolo) return false;

    // se già in carico (qualunque ruolo)
    if (
      fascicolo.ownerId === user.id ||
      fascicolo.inChargeBO === user.id ||
      fascicolo.inChargeBOF === user.id ||
      fascicolo.inChargeBOU === user.id ||
      fascicolo.inChargeDelivery === user.id ||
      fascicolo.inChargeVRC === user.id
    )
      return true;

    // se disponibile a presa in carico
    const takeAction = TAKE_BY_ROLE[role];
    return takeAction ? can(user, takeAction, fascicolo) : false;
  }

  // presa in carico iniziale (COMMERCIALE)
  if (action === "FASCICOLO.TAKE_COMM") {
    return role === "COMMERCIALE" && state === States.BOZZA && !fascicolo?.ownerId;
  }

  // COMMERCIALE
  if (role === "COMMERCIALE") {
    if (action === "FASCICOLO.EDIT_OWN") {
      // edit solo se proprio e in Nuovo o Da rivedere (di qualunque area)
      if (!isOwner(user, fascicolo)) return false;
      return (
        state === States.NUOVO ||
        state === States.DA_RIVEDERE_BO ||
        state === States.DA_RIVEDERE_BOF ||
        state === States.DA_RIVEDERE_BOU
      );
    }

    if (action === "FASCICOLO.SEND_AS_COMM") {
      if (!isOwner(user, fascicolo)) return false;
      // Regola di flusso: se il commerciale ha inserito tipologie, deve anche avere i documenti presenti.
      // Se non ci sono tipologie, può procedere.
      if (fascicolo?.commDocsComplete === false) return false;
      return (
        state === States.NUOVO ||
        state === States.DA_RIVEDERE_BO ||
        state === States.DA_RIVEDERE_BOF ||
        state === States.DA_RIVEDERE_BOU
      );
    }

    if (action === "FASCICOLO.REQUEST_REOPEN") {
      // in Approvato può “proporre” riapertura
      return state === States.APPROVATO && isOwner(user, fascicolo);
    }

    return false;
  }

  // BO (Anagrafica)
  if (role === "BO") {
    const inCharge = fascicolo?.inChargeBO ?? null;

    // “Disponibili” = solo se nessuno del ruolo ha già preso in carico
    if (action === "FASCICOLO.TAKE_BO") {
      const last = fascicolo?.lastInChargeBO ?? null;
      return state === States.DA_VALIDARE_BO && !inCharge && (!last || last === user.id);
    }

    // Dopo la presa in carico, può operare SOLO chi lo ha in carico
    if (action === "FASCICOLO.VALIDATE_BO") return state === States.VERIFICHE_BO && inCharge === user.id;
    if (action === "FASCICOLO.REQUEST_REVIEW_BO") return state === States.VERIFICHE_BO && inCharge === user.id;

    if (action === "FASCICOLO.REOPEN") return fascicolo?.overallState === States.APPROVATO;
    return false;
  }

  // BOF (Finanziario) - solo se area attiva
  if (role === "BOF") {
    if (!isActiveArea(fascicolo, "BOF")) return false;

    const inCharge = fascicolo?.inChargeBOF ?? null;

    if (action === "FASCICOLO.TAKE_BOF") {
      const last = fascicolo?.lastInChargeBOF ?? null;
      return state === States.DA_VALIDARE_BOF && !inCharge && (!last || last === user.id);
    }
    if (action === "FASCICOLO.VALIDATE_BOF") return state === States.VERIFICHE_BOF && inCharge === user.id;
    if (action === "FASCICOLO.REQUEST_REVIEW_BOF") return state === States.VERIFICHE_BOF && inCharge === user.id;

    if (action === "FASCICOLO.REOPEN") return fascicolo?.overallState === States.APPROVATO;
    return false;
  }

  // BOU (Usato/Permuta) - solo se area attiva
  if (role === "BOU") {
    if (!isActiveArea(fascicolo, "BOU")) return false;

    const inCharge = fascicolo?.inChargeBOU ?? null;

    if (action === "FASCICOLO.TAKE_BOU") {
      const last = fascicolo?.lastInChargeBOU ?? null;
      return state === States.DA_VALIDARE_BOU && !inCharge && (!last || last === user.id);
    }
    if (action === "FASCICOLO.VALIDATE_BOU") return state === States.VERIFICHE_BOU && inCharge === user.id;
    if (action === "FASCICOLO.REQUEST_REVIEW_BOU") return state === States.VERIFICHE_BOU && inCharge === user.id;

    if (action === "FASCICOLO.REOPEN") return fascicolo?.overallState === States.APPROVATO;
    return false;
  }

  // CONSEGNATORE
  if (role === "CONSEGNATORE") {
    const inCharge = fascicolo?.inChargeDelivery ?? null;

    if (action === "DELIVERY.TAKE") {
      // prende in carico SOLO se “senza padrone”
      return state === States.APPROVATO && !inCharge;
    }

    if (action === "DELIVERY.SEND_TO_VRC") {
      // Regola di flusso: se l'operatore consegna ha inserito tipologie,
      // deve anche avere i documenti presenti. Se non ci sono tipologie, può procedere.
      if (fascicolo?.deliveryDocsComplete === false) return false;
      return (
        inCharge === user.id &&
        (state === States.IN_FINALIZZAZIONE || state === States.CONSEGNA_DA_CONTROLLARE)
      );
    }

    return false;
  }

  // VRC
  if (role === "VRC") {
    const inCharge = fascicolo?.inChargeVRC ?? null;

    if (action === "VRC.TAKE") {
      return state === States.CONSEGNA_IN_ATTESA_PRESA_IN_CARICO && !inCharge && !!fascicolo?.deliverySentToVRC;
    }
    if (action === "VRC.VALIDATE") return state === States.CONSEGNA_IN_VERIFICA && inCharge === user.id;
    if (action === "VRC.REQUEST_FIX") return state === States.CONSEGNA_IN_VERIFICA && inCharge === user.id;

    return false;
  }

  return false;
}



export function roleHasTakeAction(role: Role): boolean {
  return TAKE_BY_ROLE[role] != null;
}
