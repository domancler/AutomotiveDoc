export type StateCode =
  | "S01"
  | "S02" | "S03" | "S04" | "S16"
  | "S05" | "S06" | "S07" | "S17"
  | "S08" | "S09" | "S10" | "S18"
  | "S11"
  | "S12" | "S13" | "S14" | "S15";

export const States = {
  // Ingresso
  NUOVO: "S01" as StateCode,

  // Validazione BO (Anagrafica)
  DA_VALIDARE_BO: "S02" as StateCode,
  VERIFICHE_BO: "S03" as StateCode,
  DA_RIVEDERE_BO: "S04" as StateCode,
  VALIDATO_BO: "S16" as StateCode,

  // Validazione BOF (Finanziario)
  DA_VALIDARE_BOF: "S05" as StateCode,
  VERIFICHE_BOF: "S06" as StateCode,
  DA_RIVEDERE_BOF: "S07" as StateCode,
  VALIDATO_BOF: "S17" as StateCode,

  // Validazione BOU (Usato/Permuta)
  DA_VALIDARE_BOU: "S08" as StateCode,
  VERIFICHE_BOU: "S09" as StateCode,
  DA_RIVEDERE_BOU: "S10" as StateCode,
  VALIDATO_BOU: "S18" as StateCode,

  // Approvazione
  APPROVATO: "S11" as StateCode,

  // Consegna (VRC)
  DA_VALIDARE_CONSEGNA: "S12" as StateCode,
  VERIFICHE_CONSEGNA: "S13" as StateCode,
  DA_RIVEDERE_VRC: "S14" as StateCode,
  CONSEGNATO: "S15" as StateCode,
} as const;

export type ValidationArea = "BO" | "BOF" | "BOU";
