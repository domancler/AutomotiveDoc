import { States, type StateCode } from "@/workflow/states";

export type FascicoloStato = "In compilazione" | "In approvazione" | "Firmato" | "Annullato";

export type FascicoloWorkflow = {
  /** Stato macro (Nuovo/Approvato/Consegna/...) */
  overall: StateCode;

  /** Rami di validazione in parallelo */
  bo: StateCode;
  bof?: StateCode;
  bou?: StateCode;
};

export type DocumentoTipo =
  | "Contratto di vendita"
  | "Privacy"
  | "Consenso marketing"
  | "Documento identità"
  | "Patente"
  | "Prova pagamento";

export type Documento = {
  id: string;
  tipo: DocumentoTipo;
  richiesto: boolean;
  presente: boolean;
  firmato?: boolean;
  updatedAt: string; // ISO
};

export type Fascicolo = {
  id: string;
  numero: string;
  cliente: { nome: string; telefono?: string; email?: string };
  veicolo: { marca: string; modello: string; targa?: string; vin?: string };
  stato: FascicoloStato;
  /** Workflow a stati (macro + rami BO) */
  workflow?: FascicoloWorkflow;
  /** Presa in carico per area (\"senza padrone\" quando null/undefined) */
  inChargeBO?: string | null;
  inChargeBOF?: string | null;
  inChargeBOU?: string | null;
  inChargeDelivery?: string | null;
  inChargeVRC?: string | null;
  /** Flag di dominio: abilita ramo finanziario */
  hasFinanziamento?: boolean;
  /** Flag di dominio: abilita ramo permuta */
  hasPermuta?: boolean;
  createdAt: string;
  updatedAt: string;
  valore: number;
  assegnatario: string; // commerciale
  progress: number; // 0..100
  documenti: Documento[];
  timeline: { at: string; actor: string; event: string }[];
  note: { id: string; at: string; author: string; text: string }[];
};

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

const seedFascicoli: Fascicolo[] = [
  {
    id: "F-10021",
    numero: "2026/00121",
    cliente: { nome: "Marco R.", telefono: "+39 333 123 4567", email: "marco@example.com" },
    veicolo: { marca: "Volkswagen", modello: "Golf 1.5 TSI", targa: "GA123BC" },
    stato: "In compilazione",
    workflow: {
	      overall: States.NUOVO,
	      bo: States.NUOVO,
	      bof: States.NUOVO,
	      bou: States.NUOVO,
    },
    inChargeBO: null,
    inChargeBOF: null,
    inChargeBOU: null,
    inChargeDelivery: null,
    inChargeVRC: null,
    createdAt: isoDaysAgo(10),
    updatedAt: isoDaysAgo(1),
    valore: 21990,
    assegnatario: "Venditore",
    progress: 45,
    documenti: [
      { id: "D1", tipo: "Contratto di vendita", richiesto: true, presente: true, firmato: false, updatedAt: isoDaysAgo(1) },
      { id: "D2", tipo: "Privacy", richiesto: true, presente: true, firmato: true, updatedAt: isoDaysAgo(3) },
      { id: "D3", tipo: "Documento identità", richiesto: true, presente: false, updatedAt: isoDaysAgo(10) },
      { id: "D4", tipo: "Patente", richiesto: true, presente: true, updatedAt: isoDaysAgo(2) },
      { id: "D5", tipo: "Prova pagamento", richiesto: false, presente: false, updatedAt: isoDaysAgo(10) },
    ],
    timeline: [
      { at: isoDaysAgo(10), actor: "Sistema", event: "Fascicolo creato" },
      { at: isoDaysAgo(3), actor: "Venditore", event: "Caricata informativa privacy firmata" },
      { at: isoDaysAgo(1), actor: "Venditore", event: "Caricato contratto (in attesa firma)" },
    ],
    note: [{ id: "N1", at: isoDaysAgo(2), author: "Backoffice 1", text: "Manca documento identità in fronte/retro." }],
  },
  {
    id: "F-10022",
    numero: "2026/00122",
    cliente: { nome: "Giulia S.", email: "giulia@example.com" },
    veicolo: { marca: "BMW", modello: "Serie 1 118i", targa: "BM456CD" },
    stato: "In approvazione",
    workflow: {
      // macro: in validazione BO
	      overall: States.DA_VALIDARE_BO,
      // rami indipendenti (esempio: anagrafico ancora da prendere, finanziario già validato)
	      bo: States.DA_VALIDARE_BO,
	      bof: States.VALIDATO_BOF,
	      bou: States.VERIFICHE_BOU,
    },
	    hasPermuta: true,
    createdAt: isoDaysAgo(22),
    updatedAt: isoDaysAgo(0),
    valore: 28900,
    assegnatario: "G. Rossi",
    progress: 72,
    documenti: [
      { id: "D1", tipo: "Contratto di vendita", richiesto: true, presente: true, firmato: true, updatedAt: isoDaysAgo(5) },
      { id: "D2", tipo: "Privacy", richiesto: true, presente: true, firmato: true, updatedAt: isoDaysAgo(8) },
      { id: "D3", tipo: "Consenso marketing", richiesto: false, presente: true, firmato: true, updatedAt: isoDaysAgo(8) },
      { id: "D4", tipo: "Documento identità", richiesto: true, presente: true, updatedAt: isoDaysAgo(6) },
      { id: "D5", tipo: "Patente", richiesto: true, presente: true, updatedAt: isoDaysAgo(6) },
    ],
    timeline: [
      { at: isoDaysAgo(22), actor: "Sistema", event: "Fascicolo creato" },
      { at: isoDaysAgo(8), actor: "G. Rossi", event: "Documenti cliente caricati" },
      { at: isoDaysAgo(5), actor: "Cliente", event: "Firmato contratto di vendita" },
      { at: isoDaysAgo(0), actor: "Backoffice 2", event: "Richiesta approvazione finale" },
    ],
    note: [],
  },
  {
    id: "F-10023",
    numero: "2025/00987",
    cliente: { nome: "Antonio P.", telefono: "+39 320 987 6543" },
    veicolo: { marca: "Fiat", modello: "500 Hybrid", targa: "FI987EF" },
    stato: "Firmato",
    workflow: {
	      overall: States.APPROVATO,
	      bo: States.VALIDATO_BO,
	      bof: States.VALIDATO_BOF,
	      bou: States.VALIDATO_BOU,
    },
	    hasFinanziamento: true,
	    hasPermuta: true,
    createdAt: isoDaysAgo(45),
    updatedAt: isoDaysAgo(20),
    valore: 16450,
    assegnatario: "Venditore",
    progress: 100,
    documenti: [
      { id: "D1", tipo: "Contratto di vendita", richiesto: true, presente: true, firmato: true, updatedAt: isoDaysAgo(24) },
      { id: "D2", tipo: "Privacy", richiesto: true, presente: true, firmato: true, updatedAt: isoDaysAgo(28) },
      { id: "D3", tipo: "Documento identità", richiesto: true, presente: true, updatedAt: isoDaysAgo(30) },
      { id: "D4", tipo: "Patente", richiesto: true, presente: true, updatedAt: isoDaysAgo(30) },
      { id: "D5", tipo: "Prova pagamento", richiesto: true, presente: true, updatedAt: isoDaysAgo(22) },
    ],
    timeline: [
      { at: isoDaysAgo(45), actor: "Sistema", event: "Fascicolo creato" },
      { at: isoDaysAgo(30), actor: "Venditore", event: "Caricati documenti cliente" },
      { at: isoDaysAgo(24), actor: "Cliente", event: "Firmato contratto" },
      { at: isoDaysAgo(20), actor: "Sistema", event: "Fascicolo completato" },
    ],
    note: [{ id: "N1", at: isoDaysAgo(21), author: "Backoffice 1", text: "Ok per emissione fattura." }],
  },
];

// --- Generazione altri fascicoli (mock) ---
const NAMES = [
  "Luca R.",
  "Marta S.",
  "Paolo G.",
  "Chiara D.",
  "Francesco P.",
  "Sara M.",
  "Andrea C.",
  "Valentina T.",
  "Giuseppe L.",
  "Elena F.",
];

const CARS = [
  { marca: "Audi", modello: "A3 Sportback" },
  { marca: "Toyota", modello: "Yaris Hybrid" },
  { marca: "Peugeot", modello: "208" },
  { marca: "Mercedes", modello: "Classe A" },
  { marca: "Renault", modello: "Clio" },
  { marca: "Ford", modello: "Focus" },
  { marca: "Hyundai", modello: "i20" },
  { marca: "Kia", modello: "Sportage" },
];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function cloneBase(i: number): Fascicolo {
  const base = seedFascicoli[i % seedFascicoli.length];
  const idNum = 10030 + i;
  const year = 2026;
  const num = 200 + i;
  const c = CARS[i % CARS.length];
  const name = NAMES[i % NAMES.length];
  const hasFinanziamento = i % 3 === 0;
  const hasPermuta = i % 4 === 0;

  const createdAt = isoDaysAgo(30 - (i % 25));
  const updatedAt = isoDaysAgo(i % 7);

  // workflow iniziale "plausibile"
  const wf: FascicoloWorkflow = {
    overall: States.NUOVO,
    bo: States.NUOVO,
    bof: hasFinanziamento ? States.NUOVO : undefined,
    bou: hasPermuta ? States.NUOVO : undefined,
  };

  // pattern stati: un po' di Nuovo, un po' in validazione, un po' approvato/consegna
  const bucket = i % 5;
  if (bucket === 0) {
    wf.overall = States.NUOVO;
    wf.bo = States.NUOVO;
  } else if (bucket === 1) {
    wf.overall = States.DA_VALIDARE_BO;
    wf.bo = States.DA_VALIDARE_BO;
    if (hasFinanziamento) wf.bof = States.VERIFICHE_BOF;
    if (hasPermuta) wf.bou = States.DA_VALIDARE_BOU;
  } else if (bucket === 2) {
    wf.overall = States.DA_VALIDARE_BO;
    wf.bo = States.VERIFICHE_BO;
    if (hasFinanziamento) wf.bof = States.VALIDATO_BOF;
    if (hasPermuta) wf.bou = States.DA_RIVEDERE_BOU;
  } else if (bucket === 3) {
    wf.overall = States.APPROVATO;
    wf.bo = States.VALIDATO_BO;
    if (hasFinanziamento) wf.bof = States.VALIDATO_BOF;
    if (hasPermuta) wf.bou = States.VALIDATO_BOU;
  } else {
    wf.overall = States.VERIFICHE_CONSEGNA;
    wf.bo = States.VALIDATO_BO;
    if (hasFinanziamento) wf.bof = States.VALIDATO_BOF;
    if (hasPermuta) wf.bou = States.VALIDATO_BOU;
  }

  const stato: FascicoloStato = wf.overall === States.NUOVO ? "In compilazione" : wf.overall === States.APPROVATO || wf.overall === States.VERIFICHE_CONSEGNA ? "Firmato" : "In approvazione";

  return {
    ...base,
    id: `F-${idNum}`,
    numero: `${year}/${pad2(Math.floor(num / 10))}${pad2(num % 10)}`,
    cliente: { ...base.cliente, nome: name },
    veicolo: { ...base.veicolo, marca: c.marca, modello: c.modello, targa: `MO${pad2(i)}${pad2((i * 3) % 99)}` },
    stato,
    workflow: wf,
    hasFinanziamento,
    hasPermuta,
    createdAt,
    updatedAt,
    valore: 15000 + (i % 10) * 2300,
    progress: 20 + (i % 9) * 10,
    timeline: [{ at: createdAt, actor: "Sistema", event: "Fascicolo creato" }],
    note: [],
  };
}

const generated: Fascicolo[] = Array.from({ length: 20 }, (_, i) => cloneBase(i));

export const fascicoli: Fascicolo[] = [...seedFascicoli, ...generated].slice(0, 20);
