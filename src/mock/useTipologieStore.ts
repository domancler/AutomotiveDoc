import * as React from "react";
import { getTipologieSnapshot, subscribeTipologie } from "@/mock/runtimeTipologieStore";

export function useTipologieStore() {
  return React.useSyncExternalStore(subscribeTipologie, getTipologieSnapshot, getTipologieSnapshot);
}
