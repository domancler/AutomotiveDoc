import * as React from "react";
import type { Fascicolo } from "@/mock/fascicoli";
import {
  getFascicoliSnapshot,
  subscribeFascicoli,
  getFascicoloById,
} from "@/mock/runtimeFascicoliStore";

export function useFascicoli() {
  return React.useSyncExternalStore(subscribeFascicoli, getFascicoliSnapshot);
}

export function useFascicolo(id?: string) {
  const fascicoli = useFascicoli() as Fascicolo[];
  // lookup su snapshot (così aggiorna al change)
  return React.useMemo(() => {
    if (!id) return undefined;
    return getFascicoloById(id) ?? fascicoli.find((f: Fascicolo) => f.id === id);
  }, [id, fascicoli]);
}
