import { States, type StateCode } from "@/workflow/states";
import type { Fascicolo } from "@/mock/fascicoli";
import type { Action } from "@/auth/actions";
import type { Role } from "@/auth/roles";

function nowIso() {
  return new Date().toISOString();
}

function normalizeStatoFromOverall(overall?: StateCode): Fascicolo["stato"] {
  if (!overall) return "Bozza";
  if (overall === States.BOZZA) return "Bozza";
  if (overall === States.NUOVO) return "In compilazione";
  if (overall === States.CONSEGNATO) return "Firmato";
  if (overall === States.APPROVATO) return "Firmato";
  return "In approvazione";
}

function requiredBranches(f: Fascicolo) {
  return {
    bo: true,
    bof: !!f.hasFinanziamento,
    bou: !!f.hasPermuta,
  };
}

function allRequiredValidated(f: Fascicolo) {
  const req = requiredBranches(f);
  const wf = f.workflow;
  if (!wf) return false;
  if (req.bo && wf.bo !== States.VALIDATO_BO) return false;
  if (req.bof && wf.bof !== States.VALIDATO_BOF) return false;
  if (req.bou && wf.bou !== States.VALIDATO_BOU) return false;
  return true;
}

function pushTimeline(f: Fascicolo, actor: string, event: string) {
  const timeline = Array.isArray(f.timeline) ? f.timeline : [];
  return [...timeline, { at: nowIso(), actor, event }];
}

export function applyWorkflowAction(
  f: Fascicolo,
  action: Action,
  actor: { id?: string; role?: Role; name?: string }
): Fascicolo {
  const actorName = actor.name || actor.role || "Utente";
  const actorId = actor.id ?? null;
  const wf = f.workflow ?? {
    overall: States.BOZZA,
    bo: States.BOZZA,
    bof: f.hasFinanziamento ? States.BOZZA : undefined,
    bou: f.hasPermuta ? States.BOZZA : undefined,
  };

  let next: Fascicolo = {
    ...f,
    workflow: { ...wf },
    updatedAt: nowIso(),
  };

  const req = requiredBranches(next);
  const setOverall = (s: StateCode) => {
    next = {
      ...next,
      workflow: { ...(next.workflow as any), overall: s },
      stato: normalizeStatoFromOverall(s),
    };
  };

  const setBranch = (branch: "bo" | "bof" | "bou", s: StateCode) => {
    const cur = next.workflow as any;
    next = {
      ...next,
      workflow: { ...cur, [branch]: s },
    };
  };

  const maybeFanInApprove = () => {
    if (allRequiredValidated(next)) {
      setOverall(States.APPROVATO);
      next = {
        ...next,
        progress: Math.max(next.progress ?? 0, 85),
        timeline: pushTimeline(next, "Sistema", "Fascicolo approvato (tutti i rami validati)"),
      };
    }
  };

  switch (action) {
    case "FASCICOLO.TAKE_COMM": {
      // Bozza -> Nuovo: presa in carico iniziale del venditore
      setOverall(States.NUOVO);
      setBranch("bo", States.NUOVO);
      if (req.bof) setBranch("bof", States.NUOVO);
      if (req.bou) setBranch("bou", States.NUOVO);

      next = {
        ...next,
        ownerId: actorId,
        assegnatario: actor.name ?? next.assegnatario,
        progress: Math.max(next.progress ?? 0, 10),
        timeline: pushTimeline(next, actorName, "Presa in carico (venditore)"),
      };
      return next;
    }

    // --- COMMERCIALE ---
    case "FASCICOLO.SEND_AS_COMM": {
      // fan-out: entra nella fase BO e imposta i rami richiesti in attesa presa in carico
      setOverall(States.DA_VALIDARE_BO);
      setBranch("bo", States.DA_VALIDARE_BO);
      if (req.bof) setBranch("bof", States.DA_VALIDARE_BOF);
      if (req.bou) setBranch("bou", States.DA_VALIDARE_BOU);

      next = {
        ...next,
        progress: Math.max(next.progress ?? 0, 55),
        timeline: pushTimeline(next, actorName, "Inviato ai BackOffice"),
      };
      return next;
    }

    // --- BO Anagrafico ---
    case "FASCICOLO.TAKE_BO": {
      setBranch("bo", States.VERIFICHE_BO);
      next = {
        ...next,
        inChargeBO: actorId,
        timeline: pushTimeline(next, actorName, "BO Anagrafico: preso in carico"),
      };
      return next;
    }
    case "FASCICOLO.REQUEST_REVIEW_BO": {
      setBranch("bo", States.DA_RIVEDERE_BO);
      // rimane in fase BO: venditore vedrà “Da controllare”
      next = {
        ...next,
        inChargeBO: null,
        timeline: pushTimeline(next, actorName, "BO Anagrafico: richieste integrazioni"),
      };
      return next;
    }
    case "FASCICOLO.VALIDATE_BO": {
      setBranch("bo", States.VALIDATO_BO);
      next = {
        ...next,
        inChargeBO: null,
        progress: Math.max(next.progress ?? 0, 70),
        timeline: pushTimeline(next, actorName, "BO Anagrafico: validato"),
      };
      maybeFanInApprove();
      return next;
    }

    // --- BO Finanziario ---
    case "FASCICOLO.TAKE_BOF": {
      setBranch("bof", States.VERIFICHE_BOF);
      next = {
        ...next,
        inChargeBOF: actorId,
        timeline: pushTimeline(next, actorName, "BO Finanziario: preso in carico"),
      };
      return next;
    }
    case "FASCICOLO.REQUEST_REVIEW_BOF": {
      setBranch("bof", States.DA_RIVEDERE_BOF);
      next = {
        ...next,
        inChargeBOF: null,
        timeline: pushTimeline(next, actorName, "BO Finanziario: richieste integrazioni"),
      };
      return next;
    }
    case "FASCICOLO.VALIDATE_BOF": {
      setBranch("bof", States.VALIDATO_BOF);
      next = {
        ...next,
        inChargeBOF: null,
        progress: Math.max(next.progress ?? 0, 70),
        timeline: pushTimeline(next, actorName, "BO Finanziario: validato"),
      };
      maybeFanInApprove();
      return next;
    }

    // --- BO Permuta ---
    case "FASCICOLO.TAKE_BOU": {
      setBranch("bou", States.VERIFICHE_BOU);
      next = {
        ...next,
        inChargeBOU: actorId,
        timeline: pushTimeline(next, actorName, "BO Permuta: preso in carico"),
      };
      return next;
    }
    case "FASCICOLO.REQUEST_REVIEW_BOU": {
      setBranch("bou", States.DA_RIVEDERE_BOU);
      next = {
        ...next,
        inChargeBOU: null,
        timeline: pushTimeline(next, actorName, "BO Permuta: richieste integrazioni"),
      };
      return next;
    }
    case "FASCICOLO.VALIDATE_BOU": {
      setBranch("bou", States.VALIDATO_BOU);
      next = {
        ...next,
        inChargeBOU: null,
        progress: Math.max(next.progress ?? 0, 70),
        timeline: pushTimeline(next, actorName, "BO Permuta: validato"),
      };
      maybeFanInApprove();
      return next;
    }

    // --- Consegna ---
    case "DELIVERY.TAKE": {
      // da APPROVATO -> fase finale (in mano all'operatore consegna)
      setOverall(States.FASE_FINALE);
      next = {
        ...next,
        inChargeDelivery: actorId,
        deliverySentToVRC: false,
        progress: Math.max(next.progress ?? 0, 90),
        timeline: pushTimeline(next, actorName, "Operatore consegna: presa in carico"),
      };
      return next;
    }
    case "DELIVERY.SEND_TO_VRC": {
      // operatore consegna -> invio a controllo consegna
      setOverall(States.DA_VALIDARE_CONSEGNA);
      next = {
        ...next,
        deliverySentToVRC: true,
        inChargeVRC: null,
        timeline: pushTimeline(next, actorName, "Inviato a Controllo consegna"),
      };
      return next;
    }

    case "VRC.TAKE": {
      setOverall(States.VERIFICHE_CONSEGNA);
      next = {
        ...next,
        inChargeVRC: actorId,
        timeline: pushTimeline(next, actorName, "Controllo consegna: preso in carico"),
      };
      return next;
    }
    case "VRC.REQUEST_FIX": {
      setOverall(States.DA_RIVEDERE_VRC);
      next = {
        ...next,
        inChargeVRC: null,
        deliverySentToVRC: false,
        timeline: pushTimeline(next, actorName, "Controllo consegna: richieste integrazioni"),
      };
      return next;
    }
    case "VRC.VALIDATE": {
      setOverall(States.CONSEGNATO);
      next = {
        ...next,
        progress: 100,
        timeline: pushTimeline(next, actorName, "Consegna completata"),
      };
      return next;
    }
  }

  // default: nessun cambiamento
  return next;
}
