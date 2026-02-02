import type { FascicoloStato } from "@/mock/fascicoli";

export function statoVariant(stato: FascicoloStato) {
  switch (stato) {
    case "Bozza":
      return "secondary";
    case "Nuovo":
      return "info";
    case "Approvato":
    case "Completato":
      return "success";
    // Stati che richiedono attenzione/revisione ma non sono "errore": meglio un info (blu) che un danger (rosso)
    case "Consegna – da controllare":
    case "Da controllare":
      return "info";
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
