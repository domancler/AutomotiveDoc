import { States, type StateCode } from "@/workflow/states";
import type { Fascicolo } from "@/mock/fascicoli";
import type { Action } from "@/auth/actions";
import type { Role } from "@/auth/roles";

function nowIso() {
  return new Date().toISOString();
}

function normalizeStato(next: Fascicolo, overall?: StateCode): Fascicolo["stato"] {
  if (!overall) return "Bozza";
  if (overall === States.BOZZA) return "Bozza";
  if (overall === States.ANNULLATO) return "Annullato";
  if (overall === States.NUOVO) return "Nuovo";
  if (overall === States.APPROVATO) return "Approvato";
  if (overall === States.COMPLETATO) return "Completato";

  // --- Consegna ---
  if (overall === States.IN_FINALIZZAZIONE || overall === States.CONSEGNA_IN_ATTESA_PRESA_IN_CARICO)
    return "Consegna – in attesa di presa in carico";
  if (overall === States.CONSEGNA_IN_VERIFICA) return "Consegna – in verifica";
  if (overall === States.CONSEGNA_DA_CONTROLLARE) return "Consegna – da controllare";

  // --- BackOffice (rami paralleli) ---
  if (overall === States.DA_VALIDARE_BO) {
    const bo = next.workflow?.bo;
    const bof = next.workflow?.bof;
    const bou = next.workflow?.bou;
    const branches = [bo, bof, bou].filter(Boolean) as StateCode[];

    if (branches.some((s) => s === States.DA_RIVEDERE_BO || s === States.DA_RIVEDERE_BOF || s === States.DA_RIVEDERE_BOU)) {
      return "Da controllare";
    }
    if (branches.some((s) => s === States.VERIFICHE_BO || s === States.VERIFICHE_BOF || s === States.VERIFICHE_BOU)) {
      return "In verifica";
    }
    return "In attesa di presa in carico";
  }

  return "In attesa di presa in carico";
}

function requiredBranches(_f: Fascicolo) {
  return {
    // Nel dominio:
    // - Anagrafico (BO) è sempre presente
    // - Finanziario (BOF) e Permuta (BOU) sono opzionali in base ai flag del fascicolo
    bo: true,
    bof: !!_f.hasFinanziamento,
    bou: !!_f.hasPermuta,
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
  actor: { id?: string; role?: Role; name?: string },
  payload?: { note?: string }
): Fascicolo {
  const actorName = actor.name || actor.role || "Utente";
  const actorId = actor.id ?? null;

  // Normalizza la presenza dei rami opzionali in base ai flag di dominio.
  // IMPORTANTISSIMO:
  // - bof/bou devono essere *assenti* quando non sono attivi, altrimenti la UI li interpreta come presenti.
  const req0 = requiredBranches(f);
  const wf = (() => {
    const base: any = f.workflow
      ? { ...f.workflow }
      : {
          overall: States.BOZZA,
          bo: States.BOZZA,
        };

    // BO sempre presente
    if (!base.bo) base.bo = States.BOZZA;

    if (req0.bof) base.bof = base.bof ?? States.BOZZA;
    else delete base.bof;

    if (req0.bou) base.bou = base.bou ?? States.BOZZA;
    else delete base.bou;

    return base as Fascicolo["workflow"];
  })();

  // Se è già annullato: tutto no-op (irreversibile)
  if (wf.overall === States.ANNULLATO) return f;

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
      stato: normalizeStato(next, s),
    };
  };

  const setBranch = (branch: "bo" | "bof" | "bou", s: StateCode) => {
    // Non scrivere mai bof/bou se il ramo non è attivo (resta assente dalla workflow).
    if (branch === "bof" && !req.bof) return;
    if (branch === "bou" && !req.bou) return;

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
    case "FASCICOLO.CANCEL": {
      // Finale alternativo: Annullato (irreversibile)
      // - sempre possibile tranne in Bozza (la regola dei permessi lo impedisce)
      // - richiede nota (la UI la forza)
      const noteText = (payload?.note ?? "").trim();
      setOverall(States.ANNULLATO);
      setBranch("bo", States.ANNULLATO);
      setBranch("bof", States.ANNULLATO);
      setBranch("bou", States.ANNULLATO);

      next = {
        ...next,
        // nessuno lo ha più in carico
        inChargeBO: null,
        inChargeBOF: null,
        inChargeBOU: null,
        inChargeDelivery: null,
        inChargeVRC: null,
        deliverySentToVRC: false,
        reopenProposed: false,
        reopenCycle: false,
        progress: 100,
        stato: "Annullato",
        timeline: pushTimeline(next, actorName, "Fascicolo annullato"),
        note: [
          ...(Array.isArray(next.note) ? next.note : []),
          {
            id: `NOTE-${Math.random().toString(16).slice(2, 8)}`,
            at: nowIso(),
            author: actorName,
            text: noteText || "Annullamento del fascicolo.",
            kind: "cancel",
          },
        ],
      };
      return next;
    }

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
      // fan-out: entra nella fase BO.
      // Caso A (prima validazione): rami richiesti -> "in attesa di presa in carico"
      // Caso B (ritorno da "da controllare"): torna allo STESSO BO in "in verifica" (senza ri-passare da TAKE)

      setOverall(States.DA_VALIDARE_BO);

      const bo = next.workflow?.bo as any;
      const bof = next.workflow?.bof as any;
      const bou = next.workflow?.bou as any;

      // BO (sempre attivo)
      if (bo === States.DA_RIVEDERE_BO && next.lastInChargeBO) {
        setBranch("bo", States.VERIFICHE_BO);
        next = { ...next, inChargeBO: next.lastInChargeBO };
      } else {
        setBranch("bo", States.DA_VALIDARE_BO);
        next = { ...next, inChargeBO: null };
      }

      // BOF (solo se attivo)
      if (req.bof) {
        if (bof === States.DA_RIVEDERE_BOF && next.lastInChargeBOF) {
          setBranch("bof", States.VERIFICHE_BOF);
          next = { ...next, inChargeBOF: next.lastInChargeBOF };
        } else {
          setBranch("bof", States.DA_VALIDARE_BOF);
          next = { ...next, inChargeBOF: null };
        }
      } else {
        next = { ...next, inChargeBOF: null };
      }

      // BOU (solo se attivo)
      if (req.bou) {
        if (bou === States.DA_RIVEDERE_BOU && next.lastInChargeBOU) {
          setBranch("bou", States.VERIFICHE_BOU);
          next = { ...next, inChargeBOU: next.lastInChargeBOU };
        } else {
          setBranch("bou", States.DA_VALIDARE_BOU);
          next = { ...next, inChargeBOU: null };
        }
      } else {
        next = { ...next, inChargeBOU: null };
      }

      next = {
        ...next,
        progress: Math.max(next.progress ?? 0, 55),
        timeline: pushTimeline(
          next,
          actorName,
          bo === States.DA_RIVEDERE_BO || bof === States.DA_RIVEDERE_BOF || bou === States.DA_RIVEDERE_BOU
            ? "Integrazioni inviate ai BackOffice"
            : "Inviato ai BackOffice",
        ),
      };
      return next;
    }

    case "FASCICOLO.REQUEST_REOPEN": {
      // Proposta di riapertura (solo in APPROVATO).
      // Non cambia lo stato: segnala soltanto la richiesta.
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
      // Riapertura (da uno qualsiasi dei BO) in fase APPROVATO.
      // Effetto (README):
      // - il fascicolo rientra in validazione
      // - il BO che accetta va "In verifica"
      // - gli altri BO restano "Validato"
      if ((next.workflow?.overall as any) !== States.APPROVATO) return next;

      const role = actor.role;
      const acceptingBranch: "bo" | "bof" | "bou" | null =
        role === "BO" ? "bo" : role === "BOF" ? "bof" : role === "BOU" ? "bou" : null;

      if (!acceptingBranch) return next;

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

    // --- BO Anagrafico ---
    case "FASCICOLO.TAKE_BO": {
      setBranch("bo", States.VERIFICHE_BO);
      next = {
        ...next,
        inChargeBO: actorId,
        lastInChargeBO: actorId,
        timeline: pushTimeline(next, actorName, "BO Anagrafico: preso in carico"),
      };
      return next;
    }
    case "FASCICOLO.REQUEST_REVIEW_BO": {
      setBranch("bo", States.DA_RIVEDERE_BO);
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
        lastInChargeBOF: actorId,
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
        lastInChargeBOU: actorId,
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
      // da APPROVATO -> preso in carico dall'operatore consegna
      setOverall(States.IN_FINALIZZAZIONE);
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

      const returningToSameVrc =
        (next.workflow?.overall as any) === States.CONSEGNA_DA_CONTROLLARE && !!next.lastInChargeVRC;

      if (returningToSameVrc) {
        setOverall(States.CONSEGNA_IN_VERIFICA);
        next = {
          ...next,
          inChargeDelivery: null,
          deliverySentToVRC: true,
          inChargeVRC: next.lastInChargeVRC ?? null,
          timeline: pushTimeline(next, actorName, "Reinviato a Controllo consegna (ritorno diretto)"),
        };
        return next;
      }

      setOverall(States.CONSEGNA_IN_ATTESA_PRESA_IN_CARICO);
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
      setOverall(States.CONSEGNA_IN_VERIFICA);
      next = {
        ...next,
        inChargeVRC: actorId,
        lastInChargeVRC: actorId,
        timeline: pushTimeline(next, actorName, "Controllo consegna: preso in carico"),
      };
      return next;
    }

    case "VRC.REQUEST_FIX": {
      setOverall(States.CONSEGNA_DA_CONTROLLARE);
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
      setOverall(States.COMPLETATO);
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
