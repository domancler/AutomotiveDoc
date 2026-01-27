import { fascicoli as seedFascicoli, type Fascicolo } from "@/mock/fascicoli";
import type { Action } from "@/auth/actions";
import type { Role } from "@/auth/roles";
import { applyWorkflowAction } from "@/workflow/transitions";
import type { DocumentoTipo } from "@/mock/fascicoli";

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

function updateFascicoloById(id: string, updater: (f: Fascicolo) => Fascicolo) {
  const idx = state.findIndex((x) => x.id === id);
  if (idx === -1) return;
  // IMPORTANT: immutabile, altrimenti useSyncExternalStore non rileva cambi (Object.is)
  const next = updater(state[idx]);
  state = [...state.slice(0, idx), next, ...state.slice(idx + 1)];
  emit();
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

export function dispatchFascicoloAction(args: {
  fascicoloId: string;
  action: Action;
  actor: { id?: string; role?: Role; name?: string };
}) {
  updateFascicolo(args.fascicoloId, (f) => applyWorkflowAction(f, args.action, args.actor));
}

export function addDocumentoRow(
  fascicoloId: string,
  payload: { tipo: DocumentoTipo; richiesto: boolean; note?: string }
) {
  updateFascicoloById(fascicoloId, (f) => {
    // consenti duplicati: se aggiungi una seconda "Carta identità" per cointestatario, va bene
    const now = new Date().toISOString();
    const nextDoc = {
      id: `DOC-${Math.random().toString(16).slice(2, 8)}`,
      tipo: payload.tipo,
      richiesto: payload.richiesto,
      presente: false,
      note: payload.note,
      updatedAt: now,
    };
    return { ...f, documenti: [...f.documenti, nextDoc] };
  });
}

export function removeDocumentoRow(fascicoloId: string, documentoId: string) {
  updateFascicoloById(fascicoloId, (f) => ({
    ...f,
    documenti: f.documenti.filter((d) => d.id !== documentoId),
  }));
}

export function markDocumentoPresente(fascicoloId: string, documentoId: string) {
  const now = new Date().toISOString();
  updateFascicoloById(fascicoloId, (f) => ({
    ...f,
    documenti: f.documenti.map((d) =>
      d.id === documentoId ? { ...d, presente: true, updatedAt: now } : d
    ),
  }));
}
