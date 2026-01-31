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
    // Nel dominio attuale i tre rami Back Office sono sempre presenti e indipendenti.
    // (Anagrafico / Finanziario / Permuta)
    bo: true,
    bof: true,
    bou: true,
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
    bof: States.BOZZA,
    bou: States.BOZZA,
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
      setBranch("bof", States.NUOVO);
      setBranch("bou", States.NUOVO);

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
      setBranch("bof", States.DA_VALIDARE_BOF);
      setBranch("bou", States.DA_VALIDARE_BOU);

      next = {
        ...next,
        progress: Math.max(next.progress ?? 0, 55),
        timeline: pushTimeline(next, actorName, "Inviato ai BackOffice"),
      };
      return next;
    }

    case "FASCICOLO.REQUEST_REOPEN": {
      // Proposta di riapertura (solo in APPROVATO).
      // Non cambia lo stato: segnala soltanto la richiesta.
      // La riapertura effettiva avverrà quando uno dei BO premerà "Riapri".
      if ((next.workflow?.overall as any) !== States.APPROVATO) return next;

      next = {
        ...next,
        reopenProposed: true,
        timeline: pushTimeline(next, actorName, "Proposta riapertura (venditore)"),
        note: [
          ...(Array.isArray(next.note) ? next.note : []),
          {
            id: `NOTE-${Math.random().toString(16).slice(2, 8)}`,
            at: nowIso(),
            author: actorName,
            text: "Richiesta riapertura del fascicolo.",
            kind: "reopen",
          },
        ],
      };
      return next;
    }

    case "FASCICOLO.REOPEN": {
      // Riapertura effettiva (BO/BOF/BOU). Se un BO riapre, il fascicolo viene riaperto per tutti i rami.
      // Regola README:
      // - BO che accetta -> In validazione / In verifica
      // - Altri BO -> restano Validati
      if ((next.workflow?.overall as any) !== States.APPROVATO) return next;

      const role = actor.role;
      const acceptingBranch: "bo" | "bof" | "bou" | null =
        role === "BO" ? "bo" : role === "BOF" ? "bof" : role === "BOU" ? "bou" : null;
      if (!acceptingBranch) return next;

      // Torna nella fase di validazione
      setOverall(States.DA_VALIDARE_BO);

      // Imposta gli stati dei rami
      if (req.bo) setBranch("bo", acceptingBranch === "bo" ? States.VERIFICHE_BO : States.VALIDATO_BO);
      if (req.bof) setBranch("bof", acceptingBranch === "bof" ? States.VERIFICHE_BOF : States.VALIDATO_BOF);
      if (req.bou) setBranch("bou", acceptingBranch === "bou" ? States.VERIFICHE_BOU : States.VALIDATO_BOU);

      // Presa in carico del ramo che accetta
      next = {
        ...next,
        reopenProposed: false,
        reopenCycle: true,
        // inCharge: solo il ramo che accetta è operativamente "in mano".
        inChargeBO: acceptingBranch === "bo" ? actorId : null,
        inChargeBOF: acceptingBranch === "bof" ? actorId : null,
        inChargeBOU: acceptingBranch === "bou" ? actorId : null,
        // memoria ultimo incaricato (utile per eventuali ritorni futuri)
        lastInChargeBO: acceptingBranch === "bo" ? actorId : next.lastInChargeBO ?? null,
        lastInChargeBOF: acceptingBranch === "bof" ? actorId : next.lastInChargeBOF ?? null,
        lastInChargeBOU: acceptingBranch === "bou" ? actorId : next.lastInChargeBOU ?? null,
        // progress: torna indietro ma rimane "avanzato"
        progress: Math.min(Math.max(next.progress ?? 0, 55), 75),
        timeline: pushTimeline(next, actorName, "Riapertura accettata (ritorno in validazione)"),
        note: [
          ...(Array.isArray(next.note) ? next.note : []),
          {
            id: `NOTE-${Math.random().toString(16).slice(2, 8)}`,
            at: nowIso(),
            author: actorName,
            text: "Riapertura accettata: riavviata la validazione.",
            kind: "reopen",
          },
        ],
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

    case "FASCICOLO.REOPEN": {
      // Riapertura: può essere fatta da BO/BOF/BOU anche senza proposta.
      // Comportamento (README):
      // - un qualsiasi BO che accetta riapre il ciclo per tutti e tre
      // - ramo del BO che accetta -> In verifica
      // - altri rami -> restano Validato
      if ((next.workflow?.overall as any) !== States.APPROVATO) return next;

      // torna alla fase di validazione
      setOverall(States.DA_VALIDARE_BO);

      const role = actor.role;
      const acceptBranch: "bo" | "bof" | "bou" | null =
        role === "BO" ? "bo" : role === "BOF" ? "bof" : role === "BOU" ? "bou" : null;

      // se per qualche motivo manca il ruolo, non cambiamo nulla (sicurezza)
      if (!acceptBranch) return next;

      // rami non accettanti: restano validati
      if (req.bo) setBranch("bo", States.VALIDATO_BO);
      if (req.bof) setBranch("bof", States.VALIDATO_BOF);
      if (req.bou) setBranch("bou", States.VALIDATO_BOU);

      // ramo accettante: torna in verifica
      if (acceptBranch === "bo") setBranch("bo", States.VERIFICHE_BO);
      if (acceptBranch === "bof") setBranch("bof", States.VERIFICHE_BOF);
      if (acceptBranch === "bou") setBranch("bou", States.VERIFICHE_BOU);

      next = {
        ...next,
        reopenProposed: false,
        reopenCycle: true,

        // assegna la presa in carico al BO che ha accettato
        inChargeBO: acceptBranch === "bo" ? actorId : null,
        inChargeBOF: acceptBranch === "bof" ? actorId : null,
        inChargeBOU: acceptBranch === "bou" ? actorId : null,
        lastInChargeBO: acceptBranch === "bo" ? actorId : next.lastInChargeBO ?? next.lastInChargeBO,
        lastInChargeBOF: acceptBranch === "bof" ? actorId : next.lastInChargeBOF ?? next.lastInChargeBOF,
        lastInChargeBOU: acceptBranch === "bou" ? actorId : next.lastInChargeBOU ?? next.lastInChargeBOU,

        progress: Math.min(next.progress ?? 85, 65),
        timeline: pushTimeline(next, actorName, "Riapertura accettata"),
      };

      return next;
    }

    case "FASCICOLO.REOPEN": {
      // Riapertura (da uno qualsiasi dei BO) in fase APPROVATO.
      // Effetto (README):
      // - il fascicolo rientra in validazione
      // - il BO che accetta va "In verifica"
      // - gli altri BO restano "Validato"

      const role = actor.role;
      const acceptingBranch: "bo" | "bof" | "bou" | null =
        role === "BO" ? "bo" : role === "BOF" ? "bof" : role === "BOU" ? "bou" : null;

      if (!acceptingBranch) {
        // azione non applicabile (fallback no-op)
        return next;
      }

      // torna in validazione (overall)
      setOverall(States.DA_VALIDARE_BO);

      // rami: uno torna in verifica, gli altri rimangono validati
      setBranch("bo", acceptingBranch === "bo" ? States.VERIFICHE_BO : States.VALIDATO_BO);
      setBranch("bof", acceptingBranch === "bof" ? States.VERIFICHE_BOF : States.VALIDATO_BOF);
      setBranch("bou", acceptingBranch === "bou" ? States.VERIFICHE_BOU : States.VALIDATO_BOU);

      next = {
        ...next,
        reopenProposed: false,
        reopenCycle: true,
        // assegna la presa in carico solo al ramo che ha accettato
        inChargeBO: acceptingBranch === "bo" ? actorId : null,
        inChargeBOF: acceptingBranch === "bof" ? actorId : null,
        inChargeBOU: acceptingBranch === "bou" ? actorId : null,
        lastInChargeBO: acceptingBranch === "bo" ? actorId : next.lastInChargeBO ?? next.inChargeBO ?? null,
        lastInChargeBOF: acceptingBranch === "bof" ? actorId : next.lastInChargeBOF ?? next.inChargeBOF ?? null,
        lastInChargeBOU: acceptingBranch === "bou" ? actorId : next.lastInChargeBOU ?? next.inChargeBOU ?? null,
        // riapertura = torna indietro: abbassa il progress (senza farlo crollare a 0)
        progress: Math.min(next.progress ?? 85, 70),
        note: [
          ...(Array.isArray(next.note) ? next.note : []),
          {
            id: `N-${Math.random().toString(16).slice(2, 8)}`,
            at: nowIso(),
            author: actorName,
            text: `Riaperto da ${actorName}`,
            kind: "reopen",
          },
        ],
        timeline: pushTimeline(next, actorName, "Riapertura fascicolo"),
      };

      return next;
    }

    // --- Consegna ---
    case "DELIVERY.TAKE": {
      // da APPROVATO -> fase finale (in mano all'operatore consegna)
      setOverall(States.FASE_FINALE);
      next = {
        ...next,
        inChargeDelivery: actorId,
        lastInChargeDelivery: actorId,
        deliverySentToVRC: false,
        progress: Math.max(next.progress ?? 0, 90),
        timeline: pushTimeline(next, actorName, "Operatore consegna: presa in carico"),
      };
      return next;
    }
    case "DELIVERY.SEND_TO_VRC": {
      // operatore consegna -> invio a controllo consegna
      // Caso 1: primo invio => diventa disponibile al VRC (che lo prende in carico)
      // Caso 2: ritorno da integrazioni (DA_RIVEDERE_VRC) => torna direttamente allo stesso VRC in "In verifica"

      const returningToSameVrc = (next.workflow?.overall as any) === States.DA_RIVEDERE_VRC && !!next.lastInChargeVRC;

      if (returningToSameVrc) {
        setOverall(States.VERIFICHE_CONSEGNA);
        next = {
          ...next,
          inChargeDelivery: null,
          deliverySentToVRC: true,
          inChargeVRC: next.lastInChargeVRC ?? null,
          timeline: pushTimeline(next, actorName, "Reinviato a Controllo consegna (ritorno diretto)"),
        };
        return next;
      }

      setOverall(States.DA_VALIDARE_CONSEGNA);
      next = {
        ...next,
        inChargeDelivery: null,
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
        lastInChargeVRC: actorId,
        timeline: pushTimeline(next, actorName, "Controllo consegna: preso in carico"),
      };
      return next;
    }
    case "VRC.REQUEST_FIX": {
      setOverall(States.DA_RIVEDERE_VRC);
      next = {
        ...next,
        inChargeVRC: null,
        // torna allo stesso operatore consegna di prima
        inChargeDelivery: next.lastInChargeDelivery ?? null,
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
