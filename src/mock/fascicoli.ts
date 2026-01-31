import { States, type StateCode } from "@/workflow/states";

export type FascicoloStato =
  | "Bozza"
  | "In compilazione"
  | "In approvazione"
  | "Firmato"
  | "Annullato";

export type FascicoloWorkflow = {
  /** Stato macro (Bozza/Nuovo/Approvato/Consegna/...) */
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
  | "Prova pagamento"
  // Permuta
  | "Libretto permuta"
  | "Foto permuta"
  // Consegna
  | "Verbale consegna"
  | "Assicurazione consegna";

export type Documento = {
  id: string;
  tipo: DocumentoTipo;
  richiesto: boolean;
  presente: boolean;
  /** Note operative (es: "cointestatario") - scrivibile solo alla creazione */
  note?: string;
  updatedAt: string; // ISO
};

export type Fascicolo = {
  id: string;
  numero: string;
  cliente: { nome: string; telefono?: string; email?: string };
  veicolo: { marca: string; modello: string; targa?: string; vin?: string };
  stato: FascicoloStato;

  /** Workflow a stati (macro + rami BO) */
  workflow: FascicoloWorkflow;

  /** Venditore di riferimento (ritorno sempre allo stesso) */
  ownerId?: string | null;
  assegnatario: string;

  /** Presa in carico per area ("senza padrone" quando null/undefined) */
  inChargeBO?: string | null;
  inChargeBOF?: string | null;
  inChargeBOU?: string | null;
  inChargeDelivery?: string | null;
  inChargeVRC?: string | null;

  /** Ultimo incaricato per ramo (serve per i ritorni: deve tornare allo stesso BO/operatore) */
  lastInChargeBO?: string | null;
  lastInChargeBOF?: string | null;
  lastInChargeBOU?: string | null;
  lastInChargeDelivery?: string | null;
  lastInChargeVRC?: string | null;

  /** consegna: true quando l'operatore consegna ha premuto "Procedi" verso VRC */
  deliverySentToVRC?: boolean;

  /** APPROVATO: proposta riapertura fatta dal venditore */
  reopenProposed?: boolean;
  /** true dopo una riapertura (nuovo ciclo BO) */
  reopenCycle?: boolean;

  /** Flag di dominio: abilita ramo finanziario */
  hasFinanziamento?: boolean;
  /** Flag di dominio: abilita ramo permuta */
  hasPermuta?: boolean;

  createdAt: string;
  updatedAt: string;
  valore: number;
  progress: number; // 0..100
  documenti: Documento[];
  timeline: { at: string; actor: string; event: string }[];
  note: { id: string; at: string; author: string; text: string; kind?: "reopen" | "generic" }[];
};

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

const T = {
  v1: { id: "u-vend-1", name: "Venditore 1" },
  v2: { id: "u-vend-2", name: "Venditore 2" },
  bo: { id: "u-bo-1", name: "BO Anagrafico" },
  bof: { id: "u-bof-1", name: "BO Finanziario" },
  bou: { id: "u-bou-1", name: "BO Permuta" },
  del: { id: "u-del-1", name: "Operatore consegna" },
  vrc: { id: "u-vrc-1", name: "Controllo consegna" },
} as const;

/**
 * Dataset pensato per testare il giro completo:
 * - Bozza -> Nuovo (presa in carico venditore)
 * - In validazione: attesa presa / in verifica / da controllare / validato
 * - Approvato
 * - Consegna: fase finale / inviato a VRC / in verifica / da controllare / completato
 */
export const fascicoli: Fascicolo[] = [
  // --- BOZZE (visibili ai venditori su "Disponibili") ---
  {
    id: "F-20001",
    numero: "2026/02001",
    cliente: { nome: "Marco R.", telefono: "+39 333 123 4567", email: "marco.r@example.com" },
    veicolo: { marca: "Volkswagen", modello: "Golf 1.5 TSI", targa: "GA123BC" },
    stato: "Bozza",
    workflow: { overall: States.BOZZA, bo: States.BOZZA },
    ownerId: null,
    assegnatario: "—",
    createdAt: isoDaysAgo(2),
    updatedAt: isoDaysAgo(1),
    valore: 21990,
    progress: 0,
    documenti: [],
    timeline: [{ at: isoDaysAgo(2), actor: "Sistema", event: "Fascicolo creato (Bozza)" }],
    note: [],
  },
  {
    id: "F-20002",
    numero: "2026/02002",
    cliente: { nome: "Giulia S.", email: "giulia.s@example.com" },
    veicolo: { marca: "BMW", modello: "Serie 1 118i", targa: "BM456CD" },
    stato: "Bozza",
    workflow: { overall: States.BOZZA, bo: States.BOZZA, bof: States.BOZZA },
    hasFinanziamento: true,
    ownerId: null,
    assegnatario: "—",
    createdAt: isoDaysAgo(5),
    updatedAt: isoDaysAgo(3),
    valore: 28900,
    progress: 0,
    documenti: [],
    timeline: [{ at: isoDaysAgo(5), actor: "Sistema", event: "Fascicolo creato (Bozza)" }],
    note: [],
  },

  // --- NUOVO (in mano al venditore su "In corso") ---
  {
    id: "F-20003",
    numero: "2026/02003",
    cliente: { nome: "Antonio P.", telefono: "+39 320 987 6543" },
    veicolo: { marca: "Fiat", modello: "500 Hybrid", targa: "FI987EF" },
    stato: "In compilazione",
    workflow: { overall: States.NUOVO, bo: States.NUOVO, bof: States.NUOVO },
    hasFinanziamento: true,
    ownerId: T.v1.id,
    assegnatario: T.v1.name,
    createdAt: isoDaysAgo(12),
    updatedAt: isoDaysAgo(0),
    valore: 16450,
    progress: 18,
    documenti: [
      { id: "D1", tipo: "Documento identità", richiesto: true, presente: false, note: "titolare", updatedAt: isoDaysAgo(0) },
      { id: "D2", tipo: "Patente", richiesto: true, presente: true, note: "titolare", updatedAt: isoDaysAgo(1) },
    ],
    timeline: [
      { at: isoDaysAgo(12), actor: "Sistema", event: "Fascicolo creato" },
      { at: isoDaysAgo(0), actor: T.v1.name, event: "Presa in carico (venditore)" },
    ],
    note: [],
  },

  // --- IN VALIDAZIONE: attesa presa (Disponibili BO/BOF/BOU) ---
  {
    id: "F-20004",
    numero: "2026/02004",
    cliente: { nome: "Sara M.", email: "sara.m@example.com" },
    veicolo: { marca: "Audi", modello: "A3 Sportback", targa: "AU112AA" },
    stato: "In approvazione",
    workflow: {
      overall: States.DA_VALIDARE_BO,
      bo: States.DA_VALIDARE_BO,
      bof: States.DA_VALIDARE_BOF,
      bou: States.DA_VALIDARE_BOU,
    },
    hasFinanziamento: true,
    hasPermuta: true,
    ownerId: T.v2.id,
    assegnatario: T.v2.name,
    createdAt: isoDaysAgo(20),
    updatedAt: isoDaysAgo(2),
    valore: 24800,
    progress: 55,
    documenti: [
      { id: "D1", tipo: "Contratto di vendita", richiesto: true, presente: true, updatedAt: isoDaysAgo(4) },
      { id: "D2", tipo: "Privacy", richiesto: true, presente: true, updatedAt: isoDaysAgo(4) },
      { id: "D3", tipo: "Documento identità", richiesto: true, presente: true, note: "titolare", updatedAt: isoDaysAgo(3) },
    ],
    timeline: [
      { at: isoDaysAgo(20), actor: "Sistema", event: "Fascicolo creato" },
      { at: isoDaysAgo(2), actor: T.v2.name, event: "Procedi → In validazione" },
    ],
    note: [],
  },

  // --- IN VALIDAZIONE: BO in verifica (In corso BO) ---
  {
    id: "F-20005",
    numero: "2026/02005",
    cliente: { nome: "Chiara D.", telefono: "+39 345 555 1212" },
    veicolo: { marca: "Toyota", modello: "Yaris Hybrid", targa: "TY778BB" },
    stato: "In approvazione",
    workflow: {
      overall: States.DA_VALIDARE_BO,
      bo: States.VERIFICHE_BO,
      bof: States.DA_VALIDARE_BOF,
    },
    hasFinanziamento: true,
    ownerId: T.v1.id,
    assegnatario: T.v1.name,
    inChargeBO: T.bo.id,
    createdAt: isoDaysAgo(18),
    updatedAt: isoDaysAgo(0),
    valore: 19200,
    progress: 60,
    documenti: [
      { id: "D1", tipo: "Documento identità", richiesto: true, presente: true, note: "titolare", updatedAt: isoDaysAgo(1) },
      { id: "D2", tipo: "Documento identità", richiesto: true, presente: false, note: "cointestatario", updatedAt: isoDaysAgo(1) },
      { id: "D3", tipo: "Prova pagamento", richiesto: true, presente: false, updatedAt: isoDaysAgo(1) },
    ],
    timeline: [
      { at: isoDaysAgo(18), actor: "Sistema", event: "Fascicolo creato" },
      { at: isoDaysAgo(2), actor: T.v1.name, event: "Procedi → In validazione" },
      { at: isoDaysAgo(0), actor: T.bo.name, event: "BO Anagrafico: preso in carico" },
    ],
    note: [],
  },

  // --- IN VALIDAZIONE: da controllare (tornato al venditore - In corso venditore) ---
  {
    id: "F-20006",
    numero: "2026/02006",
    cliente: { nome: "Paolo G.", email: "paolo.g@example.com" },
    veicolo: { marca: "Mercedes", modello: "Classe A", targa: "ME333CC" },
    stato: "In approvazione",
    workflow: {
      overall: States.DA_VALIDARE_BO,
      bo: States.DA_RIVEDERE_BO,
      bou: States.DA_VALIDARE_BOU,
    },
    hasPermuta: true,
    ownerId: T.v2.id,
    assegnatario: T.v2.name,
    createdAt: isoDaysAgo(9),
    updatedAt: isoDaysAgo(0),
    valore: 31200,
    progress: 58,
    documenti: [
      { id: "D1", tipo: "Documento identità", richiesto: true, presente: true, note: "titolare", updatedAt: isoDaysAgo(2) },
      { id: "D2", tipo: "Patente", richiesto: true, presente: false, updatedAt: isoDaysAgo(2) },
    ],
    timeline: [
      { at: isoDaysAgo(9), actor: "Sistema", event: "Fascicolo creato" },
      { at: isoDaysAgo(1), actor: T.bo.name, event: "BO Anagrafico: richieste integrazioni" },
    ],
    note: [{ id: "N1", at: isoDaysAgo(1), author: T.bo.name, text: "Manca patente (fronte/retro)." }],
  },

  // --- APPROVATO (Disponibili consegna) ---
  {
    id: "F-20007",
    numero: "2026/02007",
    cliente: { nome: "Luca R.", telefono: "+39 333 000 9999" },
    veicolo: { marca: "Peugeot", modello: "208", targa: "PG909DD" },
    stato: "Firmato",
    workflow: {
      overall: States.APPROVATO,
      bo: States.VALIDATO_BO,
      bof: States.VALIDATO_BOF,
      bou: States.VALIDATO_BOU,
    },
    hasFinanziamento: true,
    hasPermuta: true,
    ownerId: T.v1.id,
    assegnatario: T.v1.name,
    createdAt: isoDaysAgo(40),
    updatedAt: isoDaysAgo(10),
    valore: 27800,
    progress: 85,
    documenti: [
      { id: "D1", tipo: "Contratto di vendita", richiesto: true, presente: true, updatedAt: isoDaysAgo(12) },
      { id: "D2", tipo: "Privacy", richiesto: true, presente: true, updatedAt: isoDaysAgo(13) },
      { id: "D3", tipo: "Documento identità", richiesto: true, presente: true, note: "titolare", updatedAt: isoDaysAgo(13) },
    ],
    timeline: [
      { at: isoDaysAgo(40), actor: "Sistema", event: "Fascicolo creato" },
      { at: isoDaysAgo(10), actor: "Sistema", event: "Fascicolo approvato (tutti i rami validati)" },
    ],
    note: [],
  },

  // --- CONSEGNA: fase finale (In corso operatore consegna) ---
  {
    id: "F-20008",
    numero: "2026/02008",
    cliente: { nome: "Elena F.", email: "elena.f@example.com" },
    veicolo: { marca: "Renault", modello: "Clio", targa: "RN101EE" },
    stato: "In approvazione",
    workflow: {
      overall: States.FASE_FINALE,
      bo: States.VALIDATO_BO,
    },
    ownerId: T.v2.id,
    assegnatario: T.v2.name,
    inChargeDelivery: T.del.id,
    deliverySentToVRC: false,
    createdAt: isoDaysAgo(25),
    updatedAt: isoDaysAgo(0),
    valore: 17900,
    progress: 90,
    documenti: [
      { id: "D1", tipo: "Contratto di vendita", richiesto: true, presente: true, updatedAt: isoDaysAgo(20) },
      { id: "D2", tipo: "Prova pagamento", richiesto: false, presente: false, updatedAt: isoDaysAgo(0) },
    ],
    timeline: [
      { at: isoDaysAgo(0), actor: T.del.name, event: "Operatore consegna: presa in carico" },
    ],
    note: [],
  },

  // --- CONSEGNA: inviato a VRC (Disponibili controllo consegna) ---
  {
    id: "F-20009",
    numero: "2026/02009",
    cliente: { nome: "Valentina T.", email: "valentina.t@example.com" },
    veicolo: { marca: "Ford", modello: "Focus", targa: "FD202FF" },
    stato: "In approvazione",
    workflow: { overall: States.DA_VALIDARE_CONSEGNA, bo: States.VALIDATO_BO },
    ownerId: T.v1.id,
    assegnatario: T.v1.name,
    inChargeDelivery: T.del.id,
    deliverySentToVRC: true,
    createdAt: isoDaysAgo(30),
    updatedAt: isoDaysAgo(0),
    valore: 20500,
    progress: 92,
    documenti: [{ id: "D1", tipo: "Contratto di vendita", richiesto: true, presente: true, updatedAt: isoDaysAgo(29) }],
    timeline: [{ at: isoDaysAgo(0), actor: T.del.name, event: "Procedi → Controllo consegna" }],
    note: [],
  },

  // --- CONSEGNA: VRC in verifica (In corso VRC) ---
  {
    id: "F-20010",
    numero: "2026/02010",
    cliente: { nome: "Francesco P.", telefono: "+39 349 111 2222" },
    veicolo: { marca: "Hyundai", modello: "i20", targa: "HY303GG" },
    stato: "In approvazione",
    workflow: { overall: States.VERIFICHE_CONSEGNA, bo: States.VALIDATO_BO },
    ownerId: T.v2.id,
    assegnatario: T.v2.name,
    inChargeDelivery: T.del.id,
    deliverySentToVRC: true,
    inChargeVRC: T.vrc.id,
    createdAt: isoDaysAgo(33),
    updatedAt: isoDaysAgo(0),
    valore: 16700,
    progress: 95,
    documenti: [
      { id: "D1", tipo: "Contratto di vendita", richiesto: true, presente: true, updatedAt: isoDaysAgo(33) },
      { id: "D2", tipo: "Prova pagamento", richiesto: true, presente: false, updatedAt: isoDaysAgo(0) },
    ],
    timeline: [{ at: isoDaysAgo(0), actor: T.vrc.name, event: "Controllo consegna: preso in carico" }],
    note: [],
  },

  // --- CONSEGNA: da controllare (torna all'operatore consegna, stesso owner) ---
  {
    id: "F-20011",
    numero: "2026/02011",
    cliente: { nome: "Marta S.", email: "marta.s@example.com" },
    veicolo: { marca: "Kia", modello: "Sportage", targa: "KA404HH" },
    stato: "In approvazione",
    workflow: { overall: States.DA_RIVEDERE_VRC, bo: States.VALIDATO_BO },
    ownerId: T.v1.id,
    assegnatario: T.v1.name,
    inChargeDelivery: T.del.id,
    deliverySentToVRC: false,
    createdAt: isoDaysAgo(37),
    updatedAt: isoDaysAgo(0),
    valore: 31900,
    progress: 93,
    documenti: [{ id: "D1", tipo: "Prova pagamento", richiesto: true, presente: false, updatedAt: isoDaysAgo(0) }],
    timeline: [{ at: isoDaysAgo(0), actor: T.vrc.name, event: "Controllo consegna: richieste integrazioni" }],
    note: [{ id: "N1", at: isoDaysAgo(0), author: T.vrc.name, text: "Caricare prova pagamento finale." }],
  },

  // --- COMPLETATO ---
  {
    id: "F-20012",
    numero: "2026/02012",
    cliente: { nome: "Andrea C.", email: "andrea.c@example.com" },
    veicolo: { marca: "Toyota", modello: "Yaris Hybrid", targa: "TY505II" },
    stato: "Firmato",
    workflow: { overall: States.CONSEGNATO, bo: States.VALIDATO_BO },
    ownerId: T.v2.id,
    assegnatario: T.v2.name,
    inChargeDelivery: T.del.id,
    createdAt: isoDaysAgo(60),
    updatedAt: isoDaysAgo(25),
    valore: 15500,
    progress: 100,
    documenti: [
      { id: "D1", tipo: "Contratto di vendita", richiesto: true, presente: true, updatedAt: isoDaysAgo(40) },
      { id: "D2", tipo: "Documento identità", richiesto: true, presente: true, note: "titolare", updatedAt: isoDaysAgo(50) },
    ],
    timeline: [{ at: isoDaysAgo(25), actor: T.vrc.name, event: "Consegna completata" }],
    note: [],
  },
];
