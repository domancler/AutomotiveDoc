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
  const state = st(fascicolo);

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
    if (action === "BACKOFFICE.REASSIGN") return true;
    return false;
  }

  // Regole di lettura
  if (action === "DASHBOARD.VIEW") {
    return role !== "ADMIN";
  }

  if (action === "FASCICOLO.VIEW_ALL") {
    return ["BO", "BOF", "BOU", "CONSEGNATORE", "VRC", "RESPONSABILE", "AMMINISTRATIVO"].includes(role);
  }

  if (action === "FASCICOLO.VIEW_OWN") {
    return role === "COMMERCIALE";
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
    if (action === "FASCICOLO.TAKE_BO") return state === States.DA_VALIDARE_BO;
    if (action === "FASCICOLO.VALIDATE_BO") return state === States.VERIFICHE_BO;
    if (action === "FASCICOLO.REQUEST_REVIEW_BO") return state === States.VERIFICHE_BO;
    if (action === "FASCICOLO.REOPEN") return state === States.APPROVATO;
    return false;
  }

  // BOF (Finanziario) - solo se area attiva
  if (role === "BOF") {
    if (!isActiveArea(fascicolo, "BOF")) return false;

    if (action === "FASCICOLO.TAKE_BOF") return state === States.DA_VALIDARE_BOF;
    if (action === "FASCICOLO.VALIDATE_BOF") return state === States.VERIFICHE_BOF;
    if (action === "FASCICOLO.REQUEST_REVIEW_BOF") return state === States.VERIFICHE_BOF;
    if (action === "FASCICOLO.REOPEN") return state === States.APPROVATO;
    return false;
  }

  // BOU (Usato/Permuta) - solo se area attiva
  if (role === "BOU") {
    if (!isActiveArea(fascicolo, "BOU")) return false;

    if (action === "FASCICOLO.TAKE_BOU") return state === States.DA_VALIDARE_BOU;
    if (action === "FASCICOLO.VALIDATE_BOU") return state === States.VERIFICHE_BOU;
    if (action === "FASCICOLO.REQUEST_REVIEW_BOU") return state === States.VERIFICHE_BOU;
    if (action === "FASCICOLO.REOPEN") return state === States.APPROVATO;
    return false;
  }

  // CONSEGNATORE
  if (role === "CONSEGNATORE") {
    if (action === "DELIVERY.TAKE") {
      // nota diagramma: prende in carico senza cambio stato in S11
      return state === States.APPROVATO;
    }
    if (action === "DELIVERY.UPLOAD") {
      return state === States.APPROVATO || state === States.DA_RIVEDERE_VRC;
    }
    if (action === "DELIVERY.SEND_TO_VRC") {
      // S11 -> S12 (o da S14 -> torna in S13)
      return state === States.APPROVATO || state === States.DA_RIVEDERE_VRC;
    }
    return false;
  }

  // VRC
  if (role === "VRC") {
    if (action === "VRC.TAKE") return state === States.DA_VALIDARE_CONSEGNA;
    if (action === "VRC.VALIDATE") return state === States.VERIFICHE_CONSEGNA;
    if (action === "VRC.REQUEST_FIX") return state === States.VERIFICHE_CONSEGNA;
    return false;
  }

  return false;
}
