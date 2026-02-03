import { fascicoli } from "@/mock/fascicoli";
import type { DocumentoTipo } from "@/mock/fascicoli";

export type TipologiaSezione = "CONTRATTO" | "ANAGRAFICA" | "FINANZIARIA" | "PERMUTA" | "CONSEGNA";

export const SEZIONI: { key: TipologiaSezione; label: string }[] = [
  { key: "CONTRATTO", label: "Contratto" },
  { key: "ANAGRAFICA", label: "Anagrafica" },
  { key: "FINANZIARIA", label: "Finanziaria" },
  { key: "PERMUTA", label: "Permuta" },
  { key: "CONSEGNA", label: "Consegna" },
];

export type TipologiaDocumento = {
  id: string;
  sezione: TipologiaSezione;
  nome: DocumentoTipo;
  obbligatorio: boolean;
  attivo: boolean;
  ordine: number;
  /** Numero di utilizzi nei fascicoli demo (solo informativo) */
  inUso: number;
};

const CONTRATTO: DocumentoTipo[] = [
  "Contratto di vendita",
  "Proposta d'acquisto",
  "Modulo ordine",
  "Condizioni generali di vendita",
];

const ANAGRAFICA: DocumentoTipo[] = [
  "Documento identità",
  "Codice fiscale / Tessera sanitaria",
  "Patente",
  "Dichiarazione residenza",
  "Privacy",
  "Consenso marketing",
];

const FINANZIARIA: DocumentoTipo[] = [
  "Richiesta finanziamento",
  "Delibera finanziaria",
  "Busta paga / Redditi",
  "IBAN / Mandato SEPA",
  "Prova pagamento",
];

const PERMUTA: DocumentoTipo[] = [
  "Libretto permuta",
  "Certificato proprietà (CDP)",
  "Atto di vendita usato",
  "Perizia permuta",
  "Foto permuta",
];

const CONSEGNA: DocumentoTipo[] = [
  "Verbale consegna",
  "Check-list preconsegna",
  "Liberatoria consegna",
  "Assicurazione consegna",
];

function countUso(tipo: DocumentoTipo) {
  let n = 0;
  for (const f of fascicoli) {
    for (const d of f.documenti) {
      if (d.tipo === tipo) n += 1;
    }
  }
  return n;
}

function mkSeed(sezione: TipologiaSezione, items: DocumentoTipo[], obbligatori: DocumentoTipo[] = []) {
  return items.map((nome, idx) => ({
    id: `${sezione}-${idx + 1}`,
    sezione,
    nome,
    obbligatorio: obbligatori.includes(nome),
    attivo: true,
    ordine: idx,
    inUso: countUso(nome),
  })) as TipologiaDocumento[];
}

// Scelte “ragionevoli” per demo: non deve essere perfetto, ma deve sembrare plausibile.
const OBBL_CONTRATTO: DocumentoTipo[] = ["Contratto di vendita"];
const OBBL_ANAGRAFICA: DocumentoTipo[] = ["Documento identità", "Codice fiscale / Tessera sanitaria", "Privacy"];
const OBBL_FINANZIARIA: DocumentoTipo[] = ["Richiesta finanziamento"];
const OBBL_PERMUTA: DocumentoTipo[] = ["Libretto permuta"];
const OBBL_CONSEGNA: DocumentoTipo[] = ["Verbale consegna", "Check-list preconsegna"];

export const TIPologieSeed: TipologiaDocumento[] = [
  ...mkSeed("CONTRATTO", CONTRATTO, OBBL_CONTRATTO),
  ...mkSeed("ANAGRAFICA", ANAGRAFICA, OBBL_ANAGRAFICA),
  ...mkSeed("FINANZIARIA", FINANZIARIA, OBBL_FINANZIARIA),
  ...mkSeed("PERMUTA", PERMUTA, OBBL_PERMUTA),
  ...mkSeed("CONSEGNA", CONSEGNA, OBBL_CONSEGNA),
];
