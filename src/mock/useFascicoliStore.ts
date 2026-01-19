import * as React from "react";
import {
  getFascicoliSnapshot,
  subscribeFascicoli,
  getFascicoloById,
} from "@/mock/runtimeFascicoliStore";

export function useFascicoli() {
  return React.useSyncExternalStore(subscribeFascicoli, getFascicoliSnapshot);
}

export function useFascicolo(id?: string) {
  const fascicoli = useFascicoli();
  // lookup su snapshot (così aggiorna al change)
  return React.useMemo(() => {
    if (!id) return undefined;
    return getFascicoloById(id) ?? fascicoli.find((f) => f.id === id);
  }, [id, fascicoli]);
}
