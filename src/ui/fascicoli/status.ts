import type { FascicoloStato } from "@/mock/fascicoli";

export function statoVariant(stato: FascicoloStato) {
  switch (stato) {
    case "Approvato":
    case "Completato":
      return "success";
    case "Consegna – da controllare":
    case "Da controllare":
      return "danger";
    case "Consegna – in attesa di presa in carico":
    case "Consegna – in verifica":
    case "In attesa di presa in carico":
    case "In verifica":
      return "warning";
    case "Annullato":
      return "danger";
    default:
      return "secondary";
  }
}
