import { fascicoli as seedFascicoli, type Fascicolo } from "@/mock/fascicoli";
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

export function dispatchFascicoloAction(args: {
  fascicoloId: string;
  action: Action;
  actor: { role?: Role; name?: string };
}) {
  updateFascicolo(args.fascicoloId, (f) => applyWorkflowAction(f, args.action, args.actor));
}
