import type { FascicoloStato } from "@/mock/fascicoli";

/**
 * Colori "muted" e STABILI per stati.
 *
 * Questi colori vengono usati sia nella Dashboard (grafici) che nelle Badge in lista/dettaglio,
 * così lo stesso stato mantiene sempre lo stesso colore in tutta l'app.
 */
export const STATUS_COLORS = {
  BOZZA: "#9CA3AF",        // grigio slate
  NUOVO: "#4B6A88",        // blu acciaio
  VALIDAZIONE: "#6B5CA5",  // indigo soft
  APPROVATO: "#5F8F6B",    // verde soft
  CONSEGNA: "#2F6F6A",     // teal / petrolio
  COMPLETATO: "#1F4F3A",   // verde profondo
  ANNULLATO: "#B4534B",    // rosso smorzato
};


function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const num = parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/** Mix color with white. amount: 0 (no change) -> 1 (white) */
export function tint(hex: string, amount: number) {
  const a = clamp(amount, 0, 1);
  const { r, g, b } = hexToRgb(hex);
  const rr = Math.round(r + (255 - r) * a);
  const gg = Math.round(g + (255 - g) * a);
  const bb = Math.round(b + (255 - b) * a);
  return `rgb(${rr} ${gg} ${bb})`;
}

/**
 * Colore coerente per uno stato "visibile" (stringhe usate in lista/dettaglio).
 *
 * Nota: alcune label sono micro-stati (BO/consegna) e usano tinte del macro padre.
 */
export function colorForStatoLabel(label: FascicoloStato | string): string {
  switch (label) {
    case "Bozza":
      return STATUS_COLORS.BOZZA;
    case "Nuovo":
      return STATUS_COLORS.NUOVO;

    // Fase BO (micro)
    case "In attesa di presa in carico":
      return tint(STATUS_COLORS.VALIDAZIONE, 0.45);
    case "In verifica":
      return tint(STATUS_COLORS.VALIDAZIONE, 0.28);
    case "Da controllare":
      return tint(STATUS_COLORS.VALIDAZIONE, 0.12);
    case "In validazione – Validato":
    case "Validato":
      return tint(STATUS_COLORS.VALIDAZIONE, 0.05);

    // Macro
    case "In validazione":
      return STATUS_COLORS.VALIDAZIONE;
    case "Approvato":
      return STATUS_COLORS.APPROVATO;

    // Consegna (micro)
    case "In finalizzazione":
    case "Finalizzazione (OC)":
      return tint(STATUS_COLORS.CONSEGNA, 0.55);
    case "Consegna – in attesa di presa in carico":
    case "In attesa di presa in carico (Consegna)":
      return tint(STATUS_COLORS.CONSEGNA, 0.40);
    case "Consegna – in verifica":
    case "In verifica (Consegna)":
      return tint(STATUS_COLORS.CONSEGNA, 0.25);
    case "Consegna – da controllare":
    case "Da controllare (Consegna)":
      return tint(STATUS_COLORS.CONSEGNA, 0.12);
    case "Consegna":
      return STATUS_COLORS.CONSEGNA;

    case "Completato":
      return STATUS_COLORS.COMPLETATO;
    case "Annullato":
      return STATUS_COLORS.ANNULLATO;

    default:
      // fallback soft
      return STATUS_COLORS.BOZZA;
  }
}
