import { fascicoli as seedFascicoli, type Fascicolo, type Documento, type DocumentoTipo } from "@/mock/fascicoli";
import type { Action } from "@/auth/actions";
import type { Role } from "@/auth/roles";
import { applyWorkflowAction } from "@/workflow/transitions";

/**
 * Store IN-MEMORY (runtime only).
 * - Persiste durante logout/login (finché non refreshi/chiudi il browser)
 * - Si resetta a ogni refresh (nessun salvataggio su localStorage / backend)
 */

type Listener = () => void;

let state: Fascicolo[] = structuredClone(seedFascicoli);
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
}

export function subscribeFascicoli(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getFascicoliSnapshot() {
  return state;
}

export function getFascicoloById(id: string) {
  return state.find((f) => f.id === id);
}

export function updateFascicolo(id: string, updater: (current: Fascicolo) => Fascicolo) {
  const idx = state.findIndex((f) => f.id === id);
  if (idx < 0) return;
  const current = state[idx];
  const next = updater(current);
  // immutabile
  state = [...state.slice(0, idx), next, ...state.slice(idx + 1)];
  emit();
}



export function addDocumento(args: {
  fascicoloId: string;
  tipo: DocumentoTipo;
  /** default: false */
  richiesto?: boolean;
  /** default: false */
  presente?: boolean;
  /** opzionale: indicazioni extra (es. cointestatario) */
  note?: string;
  actor?: string;
}) {
  const now = new Date().toISOString();
  const id = `D-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const doc: Documento = {
    id,
    tipo: args.tipo,
    richiesto: Boolean(args.richiesto),
    presente: Boolean(args.presente),
    note: args.note?.trim() ? args.note.trim() : undefined,
    updatedAt: now,
  };

  updateFascicolo(args.fascicoloId, (f) => {
    const nextTimeline = [
      ...(f.timeline ?? []),
      {
        at: now,
        actor: args.actor ?? "Sistema",
        event: `Aggiunto documento: ${args.tipo}`,
      },
    ];

    return {
      ...f,
      documenti: [...f.documenti, doc],
      timeline: nextTimeline,
      updatedAt: now,
    };
  });
}


export function updateDocumentoNote(args: {
  fascicoloId: string;
  documentoId: string;
  note: string;
  actor?: string;
}) {
  const now = new Date().toISOString();
  updateFascicolo(args.fascicoloId, (f) => {
    const idx = f.documenti.findIndex((d) => d.id === args.documentoId);
    if (idx < 0) return f;

    const current = f.documenti[idx];
    const normalized = args.note.trim();
    const updated: Documento = {
      ...current,
      note: normalized.length ? normalized : undefined,
      updatedAt: now,
    };

    const nextDocs = [...f.documenti.slice(0, idx), updated, ...f.documenti.slice(idx + 1)];

    const nextTimeline = [
      ...(f.timeline ?? []),
      {
        at: now,
        actor: args.actor ?? "Sistema",
        event: `Aggiornate note documento: ${current.tipo}`,
      },
    ];

    return { ...f, documenti: nextDocs, timeline: nextTimeline, updatedAt: now };
  });
}


export function removeDocumento(args: {
  fascicoloId: string;
  documentoId: string;
  actor?: string;
}) {
  const now = new Date().toISOString();
  updateFascicolo(args.fascicoloId, (f) => {
    const doc = f.documenti.find((d) => d.id === args.documentoId);
    if (!doc) return f;

    const nextDocs = f.documenti.filter((d) => d.id !== args.documentoId);

    const nextTimeline = [
      ...(f.timeline ?? []),
      {
        at: now,
        actor: args.actor ?? "Sistema",
        event: `Rimossa tipologia documento: ${doc.tipo}`,
      },
    ];

    return { ...f, documenti: nextDocs, timeline: nextTimeline, updatedAt: now };
  });
}


export function dispatchFascicoloAction(args: {
  fascicoloId: string;
  action: Action;
  actor: { id?: string; role?: Role; name?: string };
}) {
  updateFascicolo(args.fascicoloId, (f) => applyWorkflowAction(f, args.action, args.actor));
}
