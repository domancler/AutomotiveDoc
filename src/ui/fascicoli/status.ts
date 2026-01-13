import type { FascicoloStato } from "@/mock/fascicoli";

export function statoVariant(stato: FascicoloStato) {
  switch (stato) {
    case "Firmato":
      return "success";
    case "In approvazione":
      return "warning";
    case "Annullato":
      return "danger";
    default:
      return "secondary";
  }
}
