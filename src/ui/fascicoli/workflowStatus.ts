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
    case States.BOZZA:
      return "Bozza";
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

    case States.PRONTO_PER_LA_CONSEGNA:
      // Nel README questa fase è già rappresentata come "Consegna – in attesa di presa in carico".
      return "Consegna – in attesa di presa in carico";
    case States.DA_VALIDARE_CONSEGNA:
      return "Consegna – in attesa di presa in carico";
    case States.VERIFICHE_CONSEGNA:
      return "Consegna – in verifica";
    case States.DA_RIVEDERE_VRC:
      return "Consegna – da controllare";
    case States.CONSEGNATO:
      return "Completato";

    case States.ANNULLATO:
      return "Annullato";
  }

  return state ?? "—";
}

/**
 * Converte uno StateCode nel suo label "umano" (coerente con il workflow attuale).
 * Utile per grafici e KPI (es. Dashboard).
 */
export function labelFromStateCode(state?: StateCode): string {
  return niceStateLabel(state);
}

function toVisibleStatus(state?: StateCode, label?: string): VisibleStatus {
  const computedLabel = label ?? niceStateLabel(state);
  const variant = variantFromState(state);
  // Con exactOptionalPropertyTypes, una prop opzionale NON accetta `undefined` se presente.
  return state ? { label: computedLabel, variant, code: state } : { label: computedLabel, variant };
}

function variantFromState(state?: StateCode): VisibleStatus["variant"] {
  if (!state) return "secondary";
  if (state === States.BOZZA) return "secondary";
  if (state === States.CONSEGNATO) return "success";
  if (state === States.APPROVATO) return "success";
  if (state === States.ANNULLATO) return "danger";

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
    state === States.PRONTO_PER_LA_CONSEGNA ||
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

function anyBranchInVerifica(f: Fascicolo): boolean {
  const bo = f.workflow?.bo;
  const bof = f.workflow?.bof;
  const bou = f.workflow?.bou;
  const candidates = [bo, bof, bou].filter(Boolean) as StateCode[];
  return candidates.some(
    (s) =>
      s === States.VERIFICHE_BO ||
      s === States.VERIFICHE_BOF ||
      s === States.VERIFICHE_BOU
  );
}

/**
 * Stato “visibile” in lista/header, in base al ruolo.
 * - BO/BOF/BOU: vede lo stato del proprio ramo.
 * - Venditore: vede "Da controllare" solo se un ramo ha rimandato indietro, altrimenti vede lo stato macro della fase BO.
 * - Altri ruoli: stato macro della fase BO (il dettaglio mostra i rami).
 */
export function visibleStatusForRole(f: Fascicolo, role?: Role): VisibleStatus {
  const overall = getOverallState(f);

  if (overall === States.BOZZA) {
    return toVisibleStatus(overall);
  }

  // se siamo già oltre la validazione BO, tutti vedono lo stato macro
  if (
    overall &&
    [
      States.NUOVO,
      States.APPROVATO,
      States.PRONTO_PER_LA_CONSEGNA,
      States.DA_VALIDARE_CONSEGNA,
      States.VERIFICHE_CONSEGNA,
      States.DA_RIVEDERE_VRC,
      States.CONSEGNATO,
      States.ANNULLATO,
    ].includes(overall)
  ) {
    return toVisibleStatus(overall);
  }

  // fase BO: rami indipendenti
  // Nel README non esiste lo stato "In validazione (BackOffice)":
  // in lista usiamo SOLO i 3 stati canonici della fase BO.
  const review = firstReviewBranchState(f);
  const macroLabel = review
    ? "Da controllare"
    : anyBranchInVerifica(f)
      ? "In verifica"
      : "In attesa di presa in carico";
  const macroVariant: VisibleStatus["variant"] = review ? "danger" : "warning";
  const macro: VisibleStatus = overall
    ? { label: macroLabel, variant: macroVariant, code: overall }
    : { label: macroLabel, variant: macroVariant };

  if (role === "BO") {
    const s = getBranchState(f, "BO");
    return toVisibleStatus(s);
  }
  if (role === "BOF") {
    const s = getBranchState(f, "BOF");
    return toVisibleStatus(s);
  }
  if (role === "BOU") {
    const s = getBranchState(f, "BOU");
    return toVisibleStatus(s);
  }

  if (role === "COMMERCIALE") {
    if (review) return toVisibleStatus(review);
    return macro;
  }

  return macro;
}

export function branchStatusBadges(f: Fascicolo) {
  const bo = getBranchState(f, "BO");
  const bof = getBranchState(f, "BOF");
  const bou = getBranchState(f, "BOU");

  return {
    bo: toVisibleStatus(bo),
    bof: toVisibleStatus(bof),
    bou: toVisibleStatus(bou),
  };
}
