import type { Fascicolo } from "@/mock/fascicoli";
import type { Role } from "@/auth/roles";
import type { AppUser } from "@/auth/can";
import { States, type StateCode } from "@/workflow/states";
import { STATUS_COLORS, tint } from "@/ui/fascicoli/statusColors";

export type VisibleStatus = {
  label: string;
  variant: "success" | "warning" | "danger" | "secondary" | "info";
  /** colore badge (hex/rgb). Se presente, ha priorità sul mapping per label. */
  color?: string;
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
      // NB: "Validato" non è uno stato macro del fascicolo.
      // È un micro-stato di ramo (validazione BackOffice).
      return "Validato";

    case States.APPROVATO:
      return "Approvato";

    case States.IN_FINALIZZAZIONE:
      return "In finalizzazione";
    case States.CONSEGNA_IN_ATTESA_PRESA_IN_CARICO:
      return "In attesa di presa in carico";
    case States.CONSEGNA_IN_VERIFICA:
      return "In verifica";
    case States.CONSEGNA_DA_CONTROLLARE:
      return "Da controllare";
    case States.COMPLETATO:
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

function colorFromState(state?: StateCode): string | undefined {
  if (!state) return undefined;

  switch (state) {
    case States.BOZZA:
      return STATUS_COLORS.BOZZA;
    case States.NUOVO:
      return STATUS_COLORS.NUOVO;

    // Micro-stati validazione (tinte del macro VALIDAZIONE)
    case States.DA_VALIDARE_BO:
    case States.DA_VALIDARE_BOF:
    case States.DA_VALIDARE_BOU:
      return tint(STATUS_COLORS.VALIDAZIONE, 0.45);
    case States.VERIFICHE_BO:
    case States.VERIFICHE_BOF:
    case States.VERIFICHE_BOU:
      return tint(STATUS_COLORS.VALIDAZIONE, 0.28);
    case States.DA_RIVEDERE_BO:
    case States.DA_RIVEDERE_BOF:
    case States.DA_RIVEDERE_BOU:
      return tint(STATUS_COLORS.VALIDAZIONE, 0.12);
    case States.VALIDATO_BO:
    case States.VALIDATO_BOF:
    case States.VALIDATO_BOU:
      return tint(STATUS_COLORS.VALIDAZIONE, 0.05);

    // Macro
    case States.APPROVATO:
      return STATUS_COLORS.APPROVATO;
    case States.IN_FINALIZZAZIONE:
      return tint(STATUS_COLORS.CONSEGNA, 0.55);

    // Micro-stati consegna (tinte del macro CONSEGNA)
    case States.CONSEGNA_IN_ATTESA_PRESA_IN_CARICO:
      return tint(STATUS_COLORS.CONSEGNA, 0.40);
    case States.CONSEGNA_IN_VERIFICA:
      return tint(STATUS_COLORS.CONSEGNA, 0.25);
    case States.CONSEGNA_DA_CONTROLLARE:
      return tint(STATUS_COLORS.CONSEGNA, 0.12);

    case States.COMPLETATO:
      return STATUS_COLORS.COMPLETATO;
    case States.ANNULLATO:
      return STATUS_COLORS.ANNULLATO;

    default:
      return undefined;
  }
}

function toVisibleStatus(state?: StateCode, label?: string, colorOverride?: string): VisibleStatus {
  const computedLabel = label ?? niceStateLabel(state);
  const variant = variantFromState(state);
  const color = colorOverride ?? colorFromState(state);
  // Con exactOptionalPropertyTypes, una prop opzionale NON accetta `undefined` se presente.
  if (state) {
    return color ? { label: computedLabel, variant, color, code: state } : { label: computedLabel, variant, code: state };
  }
  return color ? { label: computedLabel, variant, color } : { label: computedLabel, variant };
}

function variantFromState(state?: StateCode): VisibleStatus["variant"] {
  if (!state) return "secondary";
  if (state === States.BOZZA) return "secondary";
  if (state === States.NUOVO) return "info";
  if (state === States.COMPLETATO) return "success";
  if (state === States.APPROVATO) return "success";
  if (state === States.ANNULLATO) return "danger";

  // "Da controllare" / "Da rivedere": richiede attenzione ma non è errore, meglio un colore neutro (blu)
  if (
    state === States.DA_RIVEDERE_BO ||
    state === States.DA_RIVEDERE_BOF ||
    state === States.DA_RIVEDERE_BOU ||
    state === States.CONSEGNA_DA_CONTROLLARE
  )
    return "info";

  if (
    state === States.DA_VALIDARE_BO ||
    state === States.DA_VALIDARE_BOF ||
    state === States.DA_VALIDARE_BOU ||
    state === States.IN_FINALIZZAZIONE ||
    state === States.CONSEGNA_IN_ATTESA_PRESA_IN_CARICO
  )
    return "warning";

  if (
    state === States.VERIFICHE_BO ||
    state === States.VERIFICHE_BOF ||
    state === States.VERIFICHE_BOU ||
    state === States.CONSEGNA_IN_VERIFICA
  )
    return "warning";

  if (
    state === States.VALIDATO_BO ||
    state === States.VALIDATO_BOF ||
    state === States.VALIDATO_BOU
  )
    return "success";

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
      States.IN_FINALIZZAZIONE,
      States.CONSEGNA_IN_ATTESA_PRESA_IN_CARICO,
      States.CONSEGNA_IN_VERIFICA,
      States.CONSEGNA_DA_CONTROLLARE,
      States.COMPLETATO,
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

/**
 * Stato “visibile” in lista/header, in base all'utente corrente.
 * Regole:
 * - Validazione:
 *   - BO/BOF/BOU vedono il micro-stato se il ramo non è ancora assegnato oppure se sono l'assegnatario (inCharge*).
 *   - COMMERCIALE vede "Da controllare" se almeno un ramo è "da controllare".
 *   - altri vedono il macro "In validazione".
 * - Consegna:
 *   - VRC vede il micro-stato.
 *   - CONSEGNATORE vede "Da controllare" se lo stato consegna è "da controllare".
 *   - altri vedono il macro "Consegna".
 */
export function visibleStatusForViewer(f: Fascicolo, user?: AppUser | null): VisibleStatus {
  const role = user?.role;
  const overall = getOverallState(f);

  // Stati semplici (macro)
  if (!overall) return toVisibleStatus(undefined, "—");
  if (overall === States.BOZZA) return toVisibleStatus(overall);
  if (overall === States.ANNULLATO) return toVisibleStatus(overall);
  if (overall === States.NUOVO) return toVisibleStatus(overall);
  if (overall === States.APPROVATO) return toVisibleStatus(overall);
  if (overall === States.IN_FINALIZZAZIONE) return toVisibleStatus(overall);
  if (overall === States.COMPLETATO) return toVisibleStatus(overall);

  // Consegna (macro + micro)
  if (
    overall === States.CONSEGNA_IN_ATTESA_PRESA_IN_CARICO ||
    overall === States.CONSEGNA_IN_VERIFICA ||
    overall === States.CONSEGNA_DA_CONTROLLARE
  ) {
    if (role === "VRC") {
      // VRC vede il micro-stato (label senza prefisso "Consegna")
      return toVisibleStatus(overall);
    }

    if (role === "CONSEGNATORE" && overall === States.CONSEGNA_DA_CONTROLLARE) {
      // OC vede "Da controllare" ma con tinta consegna
      return toVisibleStatus(overall, "Da controllare", tint(STATUS_COLORS.CONSEGNA, 0.12));
    }

    // altri: macro "Consegna" con colore macro
    return toVisibleStatus(undefined, "Consegna", STATUS_COLORS.CONSEGNA);
  }

  // Fase BO (validazione): overall è tipicamente uno dei codici della fase.
  const review = firstReviewBranchState(f);

  // Venditore: se almeno un ramo è "da controllare" mostra "Da controllare"
  if (role === "COMMERCIALE" && review) {
    return toVisibleStatus(review);
  }

  // BO / BOF / BOU: micro-stato se il ramo NON è ancora assegnato, oppure se l'utente è l'assegnatario.
  // Se il ramo è già preso in carico da un altro utente, il viewer viene trattato come "non BO" (macro).
  if (role === "BO" && user?.id) {
    if (!f.inChargeBO || f.inChargeBO === user.id) {
      return toVisibleStatus(getBranchState(f, "BO"));
    }
  }
  if (role === "BOF" && user?.id) {
    if (!f.inChargeBOF || f.inChargeBOF === user.id) {
      return toVisibleStatus(getBranchState(f, "BOF"));
    }
  }
  if (role === "BOU" && user?.id) {
    if (!f.inChargeBOU || f.inChargeBOU === user.id) {
      return toVisibleStatus(getBranchState(f, "BOU"));
    }
  }

  // Tutti gli altri: macro "In validazione" con colore macro
  return toVisibleStatus(undefined, "In validazione", STATUS_COLORS.VALIDAZIONE);
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
