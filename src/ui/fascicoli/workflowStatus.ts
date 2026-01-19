import type { Fascicolo } from "@/mock/fascicoli";
import type { Role } from "@/auth/roles";
import { States, type StateCode } from "@/workflow/states";

export type VisibleStatus = {
  label: string;
  variant: "success" | "warning" | "danger" | "secondary";
  /** per debug/uso interno */
  code?: StateCode;
};

function niceStateLabel(state?: StateCode) {
  switch (state) {
    case States.NUOVO:
      return "Nuovo";

    case States.DA_VALIDARE_BO:
    case States.DA_VALIDARE_BOF:
    case States.DA_VALIDARE_BOU:
      return "In attesa di presa in carico";

    case States.VERIFICHE_BO:
    case States.VERIFICHE_BOF:
    case States.VERIFICHE_BOU:
      return "In verifica";

    case States.DA_RIVEDERE_BO:
    case States.DA_RIVEDERE_BOF:
    case States.DA_RIVEDERE_BOU:
      return "Da controllare";

    case States.VALIDATO_BO:
    case States.VALIDATO_BOF:
    case States.VALIDATO_BOU:
      return "Validato";

    case States.APPROVATO:
      return "Approvato";

    case States.DA_VALIDARE_CONSEGNA:
      return "Consegna - in attesa di verifica";
    case States.VERIFICHE_CONSEGNA:
      return "Consegna - in verifica";
    case States.DA_RIVEDERE_VRC:
      return "Consegna - da controllare";
    case States.CONSEGNATO:
      return "Completato";
  }

  return state ?? "—";
}

function variantFromState(state?: StateCode): VisibleStatus["variant"] {
  if (!state) return "secondary";
  if (state === States.CONSEGNATO) return "success";
  if (state === States.APPROVATO) return "success";

  if (
    state === States.DA_RIVEDERE_BO ||
    state === States.DA_RIVEDERE_BOF ||
    state === States.DA_RIVEDERE_BOU ||
    state === States.DA_RIVEDERE_VRC
  )
    return "danger";

  if (
    state === States.DA_VALIDARE_BO ||
    state === States.DA_VALIDARE_BOF ||
    state === States.DA_VALIDARE_BOU ||
    state === States.DA_VALIDARE_CONSEGNA
  )
    return "warning";

  if (
    state === States.VERIFICHE_BO ||
    state === States.VERIFICHE_BOF ||
    state === States.VERIFICHE_BOU ||
    state === States.VERIFICHE_CONSEGNA
  )
    return "warning";

  if (
    state === States.VALIDATO_BO ||
    state === States.VALIDATO_BOF ||
    state === States.VALIDATO_BOU
  )
    return "secondary";

  return "secondary";
}

export function getOverallState(f: Fascicolo): StateCode | undefined {
  return f.workflow?.overall;
}

export function getBranchState(
  f: Fascicolo,
  branch: "BO" | "BOF" | "BOU"
): StateCode | undefined {
  if (!f.workflow) return undefined;
  if (branch === "BO") return f.workflow.bo;
  if (branch === "BOF") return f.workflow.bof;
  return f.workflow.bou;
}

function firstReviewBranchState(f: Fascicolo): StateCode | undefined {
  const bo = f.workflow?.bo;
  const bof = f.workflow?.bof;
  const bou = f.workflow?.bou;
  const candidates = [bo, bof, bou].filter(Boolean) as StateCode[];
  return candidates.find(
    (s) => s === States.DA_RIVEDERE_BO || s === States.DA_RIVEDERE_BOF || s === States.DA_RIVEDERE_BOU
  );
}

/**
 * Stato “visibile” in lista/header, in base al ruolo.
 * - BO/BOF/BOU: vede lo stato del proprio ramo.
 * - Venditore: vede "Da controllare" solo se un ramo ha rimandato al venditore, altrimenti vede uno stato macro "In validazione (BackOffice)".
 * - Altri ruoli: stato macro (dettaglio mostra i rami).
 */
export function visibleStatusForRole(f: Fascicolo, role?: Role): VisibleStatus {
  const overall = getOverallState(f);

  // se siamo già oltre la validazione BO, tutti vedono lo stato macro
  if (overall && [States.NUOVO, States.APPROVATO, States.DA_VALIDARE_CONSEGNA, States.VERIFICHE_CONSEGNA, States.DA_RIVEDERE_VRC, States.CONSEGNATO].includes(overall)) {
    return { label: niceStateLabel(overall), variant: variantFromState(overall), code: overall };
  }

  // fase BO: rami indipendenti
  const macro = { label: "In validazione (BackOffice)", variant: "warning" as const, code: overall };

  if (role === "BO") {
    const s = getBranchState(f, "BO");
    return { label: niceStateLabel(s), variant: variantFromState(s), code: s };
  }
  if (role === "BOF") {
    const s = getBranchState(f, "BOF");
    return { label: niceStateLabel(s), variant: variantFromState(s), code: s };
  }
  if (role === "BOU") {
    const s = getBranchState(f, "BOU");
    return { label: niceStateLabel(s), variant: variantFromState(s), code: s };
  }

  if (role === "COMMERCIALE") {
    const review = firstReviewBranchState(f);
    if (review) {
      return { label: niceStateLabel(review), variant: variantFromState(review), code: review };
    }
    return macro;
  }

  return macro;
}

export function branchStatusBadges(f: Fascicolo) {
  const bo = getBranchState(f, "BO");
  const bof = getBranchState(f, "BOF");
  const bou = getBranchState(f, "BOU");

  return {
    bo: { label: niceStateLabel(bo), variant: variantFromState(bo), code: bo },
    bof: { label: niceStateLabel(bof), variant: variantFromState(bof), code: bof },
    bou: { label: niceStateLabel(bou), variant: variantFromState(bou), code: bou },
  };
}
