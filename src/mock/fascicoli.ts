import { States, type StateCode } from "@/workflow/states";

export type FascicoloStato =
  | "Bozza"
  | "Nuovo"
  | "In attesa di presa in carico"
  | "In verifica"
  | "Da controllare"
  | "Approvato"
  | "In finalizzazione"
  | "Consegna – in attesa di presa in carico"
  | "Consegna – in verifica"
  | "Consegna – da controllare"
  | "Completato"
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
  // Contratto
  | "Contratto di vendita"
  | "Proposta d'acquisto"
  | "Modulo ordine"
  | "Condizioni generali di vendita"
  // Anagrafica
  | "Documento identità"
  | "Codice fiscale / Tessera sanitaria"
  | "Patente"
  | "Dichiarazione residenza"
  | "Privacy"
  | "Consenso marketing"
  // Finanziaria
  | "Richiesta finanziamento"
  | "Delibera finanziaria"
  | "Busta paga / Redditi"
  | "IBAN / Mandato SEPA"
  | "Prova pagamento"
  // Permuta
  | "Libretto permuta"
  | "Certificato proprietà (CDP)"
  | "Atto di vendita usato"
  | "Perizia permuta"
  | "Foto permuta"
  // Consegna
  | "Verbale consegna"
  | "Check-list preconsegna"
  | "Liberatoria consegna"
  | "Assicurazione consegna";


export type Documento = {
  id: string;
  tipo: DocumentoTipo;
  richiesto: boolean;
  presente: boolean;
  /**
   * URL del file caricato (mock/static).
   * In produzione sarebbe un link firmato o un endpoint di download.
   */
  fileUrl?: string;
  /** Note operative (es: "cointestatario") - scrivibile solo alla creazione */
  note?: string;
  updatedAt: string; // ISO
};

export type Fascicolo = {
  id: string;
  numero: string;
  /** Dati cliente (overview) */
  cliente: {
    /** Nome visualizzato (es. "Marco Bianchi") */
    nome: string;
    /** Dati aggiuntivi (demo realistica) */
    codiceFiscale?: string;
    dataNascita?: string; // ISO date (YYYY-MM-DD)
    luogoNascita?: string;
    indirizzo?: string;
    telefono?: string;
    email?: string;
    tipo?: "Privato" | "Azienda";
  };

  /** Dati veicolo (overview) */
  veicolo: {
    marca: string;
    modello: string;
    versione?: string;
    anno?: number;
    alimentazione?: "Benzina" | "Diesel" | "Ibrida" | "Elettrica";
    cambio?: "Manuale" | "Automatico";
    colore?: string;
    targa?: string;
    /** VIN (compat: alias di telaio) */
    vin?: string;
    telaio?: string;
    prezzoListino?: number;
    prezzoConcordato?: number;
  };
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

  /** Condizioni di pagamento (overview) */
  pagamento?: {
    tipo: "Bonifico" | "Contanti" | "Finanziamento";
    acconto?: number;
    importoFinanziato?: number;
    durataMesi?: number;
    rataMensile?: number;
    note?: string;
  };

  /** Dati permuta/usato (overview) */
  permuta?: {
    veicolo?: string;
    targa?: string;
    km?: number;
    valoreStimato?: number;
    note?: string;
  };

  createdAt: string;
  updatedAt: string;
  valore: number;
  progress: number; // 0..100
  documenti: Documento[];
  timeline: { at: string; actor: string; event: string }[];
  note: {
    id: string;
    at: string;
    author: string;
    text: string;
    kind?: "reopen" | "generic" | "cancel";
  }[];
};

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function mkDoc(
  id: string,
  tipo: DocumentoTipo,
  richiesto: boolean,
  presente: boolean,
  daysAgo: number,
  note?: string,
  fileUrl?: string
): Documento {
  return { id, tipo, richiesto, presente, fileUrl, note, updatedAt: isoDaysAgo(daysAgo) };
}

// IDs/Nomi allineati a src/auth/auth.ts (DEMO_USERS)
const U = {
  admin: { id: "admin", name: "Paolo Riva" },
  sup: { id: "sup", name: "Stefano Marchetti" },
  ven: { id: "ven", name: "Luca Rinaldi" },
  bo: { id: "bo", name: "Sara Conti" },
  bof: { id: "bof", name: "Andrea Moretti" },
  bou: { id: "bou", name: "Elena Gallo" },
  del: { id: "del", name: "Michele Russo" },
  vrc: { id: "vrc", name: "Valentina De Luca" },
} as const;

function wfBozza(opts: { finanziamento?: boolean; permuta?: boolean }): FascicoloWorkflow {
  const wf: FascicoloWorkflow = { overall: States.BOZZA, bo: States.BOZZA };
  if (opts.finanziamento) wf.bof = States.BOZZA;
  if (opts.permuta) wf.bou = States.BOZZA;
  return wf;
}

function wfNuovo(opts: { finanziamento?: boolean; permuta?: boolean }): FascicoloWorkflow {
  const wf: FascicoloWorkflow = { overall: States.NUOVO, bo: States.NUOVO };
  if (opts.finanziamento) wf.bof = States.NUOVO;
  if (opts.permuta) wf.bou = States.NUOVO;
  return wf;
}

function wfBoPhase(opts: {
  bo: StateCode;
  finanziamento?: { active: boolean; state: StateCode };
  permuta?: { active: boolean; state: StateCode };
}): FascicoloWorkflow {
  const wf: FascicoloWorkflow = { overall: States.DA_VALIDARE_BO, bo: opts.bo };
  if (opts.finanziamento?.active) wf.bof = opts.finanziamento.state;
  if (opts.permuta?.active) wf.bou = opts.permuta.state;
  return wf;
}

function wfApproved(opts: { finanziamento?: boolean; permuta?: boolean }): FascicoloWorkflow {
  const wf: FascicoloWorkflow = { overall: States.APPROVATO, bo: States.VALIDATO_BO };
  if (opts.finanziamento) wf.bof = States.VALIDATO_BOF;
  if (opts.permuta) wf.bou = States.VALIDATO_BOU;
  return wf;
}

function wfDelivery(overall: StateCode): FascicoloWorkflow {
  // Durante consegna teniamo almeno BO validato (per UI/consistenza)
  return { overall, bo: States.VALIDATO_BO };
}

/**
 * Dataset più ricco (realistico) per demo/test:
 * - copre quasi tutti i rami e le transizioni
 * - molti fascicoli sono già in stati avanzati, MA hanno i "lastInCharge*" valorizzati
 *   così puoi portarli avanti/indietro a runtime senza rompere i ritorni allo stesso utente.
 */
const baseFascicoli: Fascicolo[] = [
  // =======================
  //  BOZZE (Disponibili ai venditori)
  // =======================
  {
    id: "F-30001",
    numero: "2026/03001",
    cliente: { nome: "Marco R.", telefono: "+39 333 123 4567", email: "marco.r@example.com" },
    veicolo: { marca: "Volkswagen", modello: "Golf 1.5 TSI", targa: "GA123BC" },
    stato: "Bozza",
    workflow: wfBozza({}),
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
    id: "F-30002",
    numero: "2026/03002",
    cliente: { nome: "Giulia S.", email: "giulia.s@example.com" },
    veicolo: { marca: "BMW", modello: "Serie 1 118i", targa: "BM456CD" },
    stato: "Bozza",
    workflow: wfBozza({ finanziamento: true }),
    hasFinanziamento: true,
    pagamento: { tipo: "Finanziamento", acconto: 3000, importoFinanziato: 25900, durataMesi: 60, rataMensile: 520 },
    ownerId: null,
    assegnatario: "—",
    createdAt: isoDaysAgo(6),
    updatedAt: isoDaysAgo(4),
    valore: 28900,
    progress: 0,
    documenti: [],
    timeline: [{ at: isoDaysAgo(6), actor: "Sistema", event: "Fascicolo creato (Bozza)" }],
    note: [],
  },
  {
    id: "F-30003",
    numero: "2026/03003",
    cliente: { nome: "Alessia D.", telefono: "+39 340 987 1200" },
    veicolo: { marca: "Peugeot", modello: "208 1.2", targa: "PE778KK" },
    stato: "Bozza",
    workflow: wfBozza({ permuta: true }),
    hasPermuta: true,
    permuta: { veicolo: "Opel Corsa", targa: "OP111ZZ", km: 102000, valoreStimato: 3500, note: "da valutare graffi" },
    ownerId: null,
    assegnatario: "—",
    createdAt: isoDaysAgo(9),
    updatedAt: isoDaysAgo(8),
    valore: 17900,
    progress: 0,
    documenti: [],
    timeline: [{ at: isoDaysAgo(9), actor: "Sistema", event: "Fascicolo creato (Bozza)" }],
    note: [],
  },
  {
    id: "F-30004",
    numero: "2026/03004",
    cliente: { nome: "Davide V.", email: "davide.v@example.com" },
    veicolo: { marca: "Mercedes", modello: "Classe A 180d", targa: "ME101AA" },
    stato: "Bozza",
    workflow: wfBozza({ finanziamento: true, permuta: true }),
    hasFinanziamento: true,
    hasPermuta: true,
    pagamento: { tipo: "Finanziamento", acconto: 5000, importoFinanziato: 28900, durataMesi: 72, rataMensile: 445 },
    permuta: { veicolo: "Renault Clio", targa: "RN456YY", km: 74000, valoreStimato: 6800 },
    ownerId: null,
    assegnatario: "—",
    createdAt: isoDaysAgo(11),
    updatedAt: isoDaysAgo(10),
    valore: 33900,
    progress: 0,
    documenti: [],
    timeline: [{ at: isoDaysAgo(11), actor: "Sistema", event: "Fascicolo creato (Bozza)" }],
    note: [],
  },
  {
    id: "F-30005",
    numero: "2026/03005",
    cliente: { nome: "Chiara L.", telefono: "+39 329 555 6622" },
    veicolo: { marca: "Toyota", modello: "Corolla Hybrid", targa: "TY909PP" },
    stato: "Bozza",
    workflow: wfBozza({}),
    ownerId: null,
    assegnatario: "—",
    createdAt: isoDaysAgo(14),
    updatedAt: isoDaysAgo(14),
    valore: 24900,
    progress: 0,
    documenti: [],
    timeline: [{ at: isoDaysAgo(14), actor: "Sistema", event: "Fascicolo creato (Bozza)" }],
    note: [],
  },
  {
    id: "F-30006",
    numero: "2026/03006",
    cliente: { nome: "Franco N.", email: "franco.n@example.com" },
    veicolo: { marca: "Fiat", modello: "Panda", targa: "FI606FF" },
    stato: "Bozza",
    workflow: wfBozza({ finanziamento: true }),
    hasFinanziamento: true,
    pagamento: { tipo: "Finanziamento", acconto: 1500, importoFinanziato: 9500, durataMesi: 48, rataMensile: 235 },
    ownerId: null,
    assegnatario: "—",
    createdAt: isoDaysAgo(17),
    updatedAt: isoDaysAgo(15),
    valore: 11000,
    progress: 0,
    documenti: [],
    timeline: [{ at: isoDaysAgo(17), actor: "Sistema", event: "Fascicolo creato (Bozza)" }],
    note: [],
  },

  // =======================
  //  NUOVI (In corso venditore)
  // =======================
  {
    id: "F-30007",
    numero: "2026/03007",
    cliente: { nome: "Antonio P.", telefono: "+39 320 987 6543" },
    veicolo: { marca: "Fiat", modello: "500 Hybrid", targa: "FI987EF" },
    stato: "Nuovo",
    workflow: wfNuovo({ finanziamento: true }),
    hasFinanziamento: true,
    pagamento: { tipo: "Finanziamento", acconto: 1500, importoFinanziato: 14950, durataMesi: 48, rataMensile: 360 },
    ownerId: U.ven.id,
    assegnatario: U.ven.name,
    createdAt: isoDaysAgo(12),
    updatedAt: isoDaysAgo(0),
    valore: 16450,
    progress: 18,
    documenti: [
      mkDoc("D-30007-1", "Documento identità", true, false, 0, "titolare"),
      mkDoc("D-30007-2", "Patente", true, true, 1, "titolare"),
      mkDoc("D-30007-3", "Privacy", true, true, 2),
    ],
    timeline: [
      { at: isoDaysAgo(12), actor: "Sistema", event: "Fascicolo creato" },
      { at: isoDaysAgo(0), actor: U.ven.name, event: "Presa in carico (venditore)" },
    ],
    note: [],
  },
  {
    id: "F-30008",
    numero: "2026/03008",
    cliente: { nome: "Sara M.", email: "sara.m@example.com" },
    veicolo: { marca: "Audi", modello: "A3 Sportback", targa: "AU112AA" },
    stato: "Nuovo",
    workflow: wfNuovo({ finanziamento: true, permuta: true }),
    hasFinanziamento: true,
    hasPermuta: true,
    pagamento: { tipo: "Finanziamento", acconto: 4000, importoFinanziato: 20800, durataMesi: 72, rataMensile: 390 },
    permuta: { veicolo: "Ford Fiesta 1.0 EcoBoost", targa: "FD321ZX", km: 78000, valoreStimato: 6200 },
    ownerId: U.ven.id,
    assegnatario: U.ven.name,
    createdAt: isoDaysAgo(9),
    updatedAt: isoDaysAgo(1),
    valore: 24800,
    progress: 25,
    documenti: [
      mkDoc("D-30008-1", "Contratto di vendita", true, false, 1),
      mkDoc("D-30008-2", "Documento identità", true, true, 3, "titolare"),
      mkDoc("D-30008-3", "Patente", true, true, 3),
    ],
    timeline: [
      { at: isoDaysAgo(9), actor: "Sistema", event: "Fascicolo creato" },
      { at: isoDaysAgo(6), actor: U.ven.name, event: "Presa in carico (venditore)" },
      { at: isoDaysAgo(1), actor: U.ven.name, event: "Inseriti documenti iniziali" },
    ],
    note: [],
  },
  {
    id: "F-30009",
    numero: "2026/03009",
    cliente: { nome: "Federica A.", telefono: "+39 328 440 0011" },
    veicolo: { marca: "Renault", modello: "Captur", targa: "RN303TT" },
    stato: "Nuovo",
    workflow: wfNuovo({}),
    ownerId: U.ven.id,
    assegnatario: U.ven.name,
    createdAt: isoDaysAgo(7),
    updatedAt: isoDaysAgo(2),
    valore: 19900,
    progress: 20,
    documenti: [mkDoc("D-30009-1", "Privacy", true, true, 2)],
    timeline: [
      { at: isoDaysAgo(7), actor: "Sistema", event: "Fascicolo creato" },
      { at: isoDaysAgo(5), actor: U.ven.name, event: "Presa in carico (venditore)" },
    ],
    note: [],
  },
  {
    id: "F-30010",
    numero: "2026/03010",
    cliente: { nome: "Michele F.", email: "michele.f@example.com" },
    veicolo: { marca: "Hyundai", modello: "i10", targa: "HY100MM" },
    stato: "Nuovo",
    workflow: wfNuovo({ permuta: true }),
    hasPermuta: true,
    permuta: { veicolo: "Fiat Punto", targa: "FP765GG", km: 154000, valoreStimato: 1800 },
    ownerId: U.ven.id,
    assegnatario: U.ven.name,
    createdAt: isoDaysAgo(16),
    updatedAt: isoDaysAgo(3),
    valore: 13900,
    progress: 22,
    documenti: [
      mkDoc("D-30010-1", "Documento identità", true, true, 5),
      mkDoc("D-30010-2", "Patente", true, false, 3),
    ],
    timeline: [
      { at: isoDaysAgo(16), actor: "Sistema", event: "Fascicolo creato" },
      { at: isoDaysAgo(15), actor: U.ven.name, event: "Presa in carico (venditore)" },
    ],
    note: [],
  },
  {
    id: "F-30011",
    numero: "2026/03011",
    cliente: { nome: "Vito C.", telefono: "+39 338 990 7788" },
    veicolo: { marca: "Opel", modello: "Corsa", targa: "OP777VV" },
    stato: "Nuovo",
    workflow: wfNuovo({ finanziamento: true }),
    hasFinanziamento: true,
    pagamento: { tipo: "Finanziamento", acconto: 2000, importoFinanziato: 11800, durataMesi: 60, rataMensile: 260 },
    ownerId: U.ven.id,
    assegnatario: U.ven.name,
    createdAt: isoDaysAgo(18),
    updatedAt: isoDaysAgo(6),
    valore: 13800,
    progress: 15,
    documenti: [],
    timeline: [
      { at: isoDaysAgo(18), actor: "Sistema", event: "Fascicolo creato" },
      { at: isoDaysAgo(17), actor: U.ven.name, event: "Presa in carico (venditore)" },
    ],
    note: [],
  },
  {
    id: "F-30012",
    numero: "2026/03012",
    cliente: { nome: "Elisa T.", email: "elisa.t@example.com" },
    veicolo: { marca: "Nissan", modello: "Qashqai", targa: "NS222QQ" },
    stato: "Nuovo",
    workflow: wfNuovo({ finanziamento: true, permuta: true }),
    hasFinanziamento: true,
    hasPermuta: true,
    pagamento: { tipo: "Finanziamento", acconto: 3500, importoFinanziato: 21500, durataMesi: 60, rataMensile: 435 },
    permuta: { veicolo: "Citroën C3", targa: "CT987RR", km: 90000, valoreStimato: 4800 },
    ownerId: U.ven.id,
    assegnatario: U.ven.name,
    createdAt: isoDaysAgo(21),
    updatedAt: isoDaysAgo(7),
    valore: 25000,
    progress: 28,
    documenti: [mkDoc("D-30012-1", "Contratto di vendita", true, true, 9)],
    timeline: [
      { at: isoDaysAgo(21), actor: "Sistema", event: "Fascicolo creato" },
      { at: isoDaysAgo(20), actor: U.ven.name, event: "Presa in carico (venditore)" },
      { at: isoDaysAgo(7), actor: U.ven.name, event: "Pronto per invio ai BackOffice" },
    ],
    note: [],
  },

  // =======================
  //  BACKOFFICE: disponibili (in attesa di presa in carico)
  // =======================
  {
    id: "F-30013",
    numero: "2026/03013",
    cliente: { nome: "Nadia G.", email: "nadia.g@example.com" },
    veicolo: { marca: "Seat", modello: "Arona", targa: "SE010NN" },
    stato: "In attesa di presa in carico",
    workflow: wfBoPhase({ bo: States.DA_VALIDARE_BO, finanziamento: { active: false, state: States.DA_VALIDARE_BOF }, permuta: { active: false, state: States.DA_VALIDARE_BOU } }),
    ownerId: U.ven.id,
    assegnatario: U.ven.name,
    inChargeBO: null,
    createdAt: isoDaysAgo(15),
    updatedAt: isoDaysAgo(2),
    valore: 20900,
    progress: 55,
    documenti: [
      mkDoc("D-30013-1", "Contratto di vendita", true, true, 6),
      mkDoc("D-30013-2", "Privacy", true, true, 6),
      mkDoc("D-30013-3", "Documento identità", true, true, 6),
    ],
    timeline: [
      { at: isoDaysAgo(15), actor: "Sistema", event: "Fascicolo creato" },
      { at: isoDaysAgo(14), actor: U.ven.name, event: "Inviato ai BackOffice" },
    ],
    note: [],
  },
  {
    id: "F-30014",
    numero: "2026/03014",
    cliente: { nome: "Sergio B.", telefono: "+39 331 700 1122" },
    veicolo: { marca: "Ford", modello: "Puma", targa: "FD444BB" },
    stato: "In attesa di presa in carico",
    workflow: wfBoPhase({
      bo: States.DA_VALIDARE_BO,
      finanziamento: { active: true, state: States.DA_VALIDARE_BOF },
      permuta: { active: false, state: States.DA_VALIDARE_BOU },
    }),
    hasFinanziamento: true,
    pagamento: { tipo: "Finanziamento", acconto: 2500, importoFinanziato: 16500, durataMesi: 60, rataMensile: 365 },
    ownerId: U.ven.id,
    assegnatario: U.ven.name,
    inChargeBO: null,
    inChargeBOF: null,
    createdAt: isoDaysAgo(23),
    updatedAt: isoDaysAgo(5),
    valore: 19000,
    progress: 55,
    documenti: [mkDoc("D-30014-1", "Contratto di vendita", true, true, 7)],
    timeline: [{ at: isoDaysAgo(5), actor: U.ven.name, event: "Inviato ai BackOffice" }],
    note: [],
  },
  {
    id: "F-30015",
    numero: "2026/03015",
    cliente: { nome: "Laura P.", email: "laura.p@example.com" },
    veicolo: { marca: "Jeep", modello: "Renegade", targa: "JP505LP" },
    stato: "In attesa di presa in carico",
    workflow: wfBoPhase({
      bo: States.DA_VALIDARE_BO,
      finanziamento: { active: true, state: States.DA_VALIDARE_BOF },
      permuta: { active: true, state: States.DA_VALIDARE_BOU },
    }),
    hasFinanziamento: true,
    hasPermuta: true,
    pagamento: { tipo: "Finanziamento", acconto: 3000, importoFinanziato: 22500, durataMesi: 72, rataMensile: 420 },
    permuta: { veicolo: "VW Polo", targa: "VP123XX", km: 68000, valoreStimato: 7100 },
    ownerId: U.ven.id,
    assegnatario: U.ven.name,
    inChargeBO: null,
    inChargeBOF: null,
    inChargeBOU: null,
    createdAt: isoDaysAgo(28),
    updatedAt: isoDaysAgo(8),
    valore: 25500,
    progress: 55,
    documenti: [
      mkDoc("D-30015-1", "Contratto di vendita", true, true, 10),
      mkDoc("D-30015-2", "Privacy", true, true, 10),
      mkDoc("D-30015-3", "Documento identità", true, true, 10),
    ],
    timeline: [{ at: isoDaysAgo(8), actor: U.ven.name, event: "Inviato ai BackOffice" }],
    note: [],
  },

  // =======================
  //  BACKOFFICE: in verifica (In corso ai rispettivi BO)
  // =======================
  {
    id: "F-30016",
    numero: "2026/03016",
    cliente: { nome: "Paolo R.", email: "paolo.r@example.com" },
    veicolo: { marca: "Skoda", modello: "Kamiq", targa: "SK161PP" },
    stato: "In verifica",
    workflow: wfBoPhase({ bo: States.VERIFICHE_BO, finanziamento: { active: false, state: States.VERIFICHE_BOF }, permuta: { active: false, state: States.VERIFICHE_BOU } }),
    ownerId: U.ven.id,
    assegnatario: U.ven.name,
    inChargeBO: U.bo.id,
    lastInChargeBO: U.bo.id,
    createdAt: isoDaysAgo(19),
    updatedAt: isoDaysAgo(0),
    valore: 22400,
    progress: 62,
    documenti: [mkDoc("D-30016-1", "Documento identità", true, true, 3), mkDoc("D-30016-2", "Patente", true, true, 3)],
    timeline: [{ at: isoDaysAgo(1), actor: U.bo.name, event: "BO Anagrafico: preso in carico" }],
    note: [{ id: "N-30016-1", at: isoDaysAgo(1), author: U.bo.name, text: "Verifica anagrafica in corso." }],
  },
  {
    id: "F-30017",
    numero: "2026/03017",
    cliente: { nome: "Ilaria C.", telefono: "+39 347 110 2233" },
    veicolo: { marca: "Citroën", modello: "C4", targa: "CT171IC" },
    stato: "In verifica",
    workflow: wfBoPhase({
      bo: States.VERIFICHE_BO,
      finanziamento: { active: true, state: States.VERIFICHE_BOF },
      permuta: { active: false, state: States.VERIFICHE_BOU },
    }),
    hasFinanziamento: true,
    pagamento: { tipo: "Finanziamento", acconto: 2500, importoFinanziato: 18700, durataMesi: 60, rataMensile: 390 },
    ownerId: U.ven.id,
    assegnatario: U.ven.name,
    inChargeBO: U.bo.id,
    lastInChargeBO: U.bo.id,
    inChargeBOF: U.bof.id,
    lastInChargeBOF: U.bof.id,
    createdAt: isoDaysAgo(25),
    updatedAt: isoDaysAgo(0),
    valore: 21200,
    progress: 64,
    documenti: [
      mkDoc("D-30017-1", "Contratto di vendita", true, true, 12),
      mkDoc("D-30017-2", "Prova pagamento", true, false, 0, "attesa esito pratica"),
    ],
    timeline: [
      { at: isoDaysAgo(3), actor: U.bo.name, event: "BO Anagrafico: preso in carico" },
      { at: isoDaysAgo(2), actor: U.bof.name, event: "BO Finanziario: preso in carico" },
    ],
    note: [{ id: "N-30017-1", at: isoDaysAgo(0), author: U.bof.name, text: "Verifica finanziamento: in attesa conferma." }],
  },
  {
    id: "F-30018",
    numero: "2026/03018",
    cliente: { nome: "Rosaria T.", email: "rosaria.t@example.com" },
    veicolo: { marca: "Mazda", modello: "CX-30", targa: "MZ181RT" },
    stato: "In verifica",
    workflow: wfBoPhase({
      bo: States.VERIFICHE_BO,
      finanziamento: { active: false, state: States.VERIFICHE_BOF },
      permuta: { active: true, state: States.VERIFICHE_BOU },
    }),
    hasPermuta: true,
    permuta: { veicolo: "Alfa Romeo Giulietta", targa: "AR555TT", km: 112000, valoreStimato: 5200 },
    ownerId: U.ven.id,
    assegnatario: U.ven.name,
    inChargeBO: U.bo.id,
    lastInChargeBO: U.bo.id,
    inChargeBOU: U.bou.id,
    lastInChargeBOU: U.bou.id,
    createdAt: isoDaysAgo(31),
    updatedAt: isoDaysAgo(1),
    valore: 27900,
    progress: 63,
    documenti: [
      mkDoc("D-30018-1", "Libretto permuta", true, true, 6),
      mkDoc("D-30018-2", "Foto permuta", true, false, 1, "mancano foto interni"),
    ],
    timeline: [
      { at: isoDaysAgo(4), actor: U.bou.name, event: "BO Permuta: preso in carico" },
      { at: isoDaysAgo(3), actor: U.bo.name, event: "BO Anagrafico: preso in carico" },
    ],
    note: [{ id: "N-30018-1", at: isoDaysAgo(1), author: U.bou.name, text: "Servono foto più dettagliate." }],
  },

  // =======================
  //  BACKOFFICE: da controllare (richiesta integrazioni al venditore)
  // =======================
  {
    id: "F-30019",
    numero: "2026/03019",
    cliente: { nome: "Giorgio S.", telefono: "+39 339 010 1112" },
    veicolo: { marca: "Volvo", modello: "XC40", targa: "VV199GS" },
    stato: "Da controllare",
    workflow: wfBoPhase({
      bo: States.DA_RIVEDERE_BO,
      finanziamento: { active: true, state: States.VALIDATO_BOF },
      permuta: { active: false, state: States.DA_VALIDARE_BOU },
    }),
    hasFinanziamento: true,
    pagamento: { tipo: "Finanziamento", acconto: 6000, importoFinanziato: 28900, durataMesi: 72, rataMensile: 470 },
    ownerId: U.ven.id,
    assegnatario: U.ven.name,
    // quando è DA_RIVEDERE, inCharge è nullo, ma lastInCharge deve esistere per il ritorno allo stesso BO
    inChargeBO: null,
    lastInChargeBO: U.bo.id,
    inChargeBOF: null,
    lastInChargeBOF: U.bof.id,
    createdAt: isoDaysAgo(40),
    updatedAt: isoDaysAgo(0),
    valore: 34900,
    progress: 60,
    documenti: [
      mkDoc("D-30019-1", "Documento identità", true, true, 20),
      mkDoc("D-30019-2", "Patente", true, true, 20),
      mkDoc("D-30019-3", "Contratto di vendita", true, false, 0, "firma mancante"),
    ],
    timeline: [
      { at: isoDaysAgo(3), actor: U.bo.name, event: "BO Anagrafico: richieste integrazioni" },
      { at: isoDaysAgo(2), actor: U.bof.name, event: "BO Finanziario: validato" },
    ],
    note: [{ id: "N-30019-1", at: isoDaysAgo(0), author: U.bo.name, text: "Serve contratto firmato." }],
  },
  {
    id: "F-30020",
    numero: "2026/03020",
    cliente: { nome: "Marta Q.", email: "marta.q@example.com" },
    veicolo: { marca: "Kia", modello: "Sportage", targa: "KA200MQ" },
    stato: "Da controllare",
    workflow: wfBoPhase({
      bo: States.VALIDATO_BO,
      finanziamento: { active: false, state: States.DA_VALIDARE_BOF },
      permuta: { active: true, state: States.DA_RIVEDERE_BOU },
    }),
    hasPermuta: true,
    permuta: { veicolo: "Kia Rio", targa: "KR012AA", km: 98000, valoreStimato: 4300 },
    ownerId: U.ven.id,
    assegnatario: U.ven.name,
    inChargeBO: null,
    lastInChargeBO: U.bo.id,
    inChargeBOU: null,
    lastInChargeBOU: U.bou.id,
    createdAt: isoDaysAgo(34),
    updatedAt: isoDaysAgo(1),
    valore: 31900,
    progress: 68,
    documenti: [
      mkDoc("D-30020-1", "Libretto permuta", true, true, 6),
      mkDoc("D-30020-2", "Foto permuta", true, false, 1, "mancano foto carrozzeria"),
    ],
    timeline: [
      { at: isoDaysAgo(7), actor: U.bou.name, event: "BO Permuta: richieste integrazioni" },
      { at: isoDaysAgo(6), actor: U.bo.name, event: "BO Anagrafico: validato" },
    ],
    note: [{ id: "N-30020-1", at: isoDaysAgo(1), author: U.bou.name, text: "Aggiungere foto lato destro e interno." }],
  },

  // =======================
  //  APPROVATI (Disponibili Operatore Consegna) + riaperture
  // =======================
  {
    id: "F-30021",
    numero: "2026/03021",
    cliente: { nome: "Stefano G.", telefono: "+39 339 888 0001" },
    veicolo: { marca: "Audi", modello: "Q2", targa: "AU777SG" },
    stato: "Approvato",
    workflow: wfApproved({}),
    ownerId: U.ven.id,
    assegnatario: U.ven.name,
    createdAt: isoDaysAgo(45),
    updatedAt: isoDaysAgo(5),
    valore: 26700,
    progress: 85,
    documenti: [
      mkDoc("D-30021-1", "Contratto di vendita", true, true, 40),
      mkDoc("D-30021-2", "Privacy", true, true, 40),
    ],
    timeline: [{ at: isoDaysAgo(5), actor: "Sistema", event: "Fascicolo approvato (tutti i rami validati)" }],
    note: [],
  },
  {
    id: "F-30022",
    numero: "2026/03022",
    cliente: { nome: "Elena F.", email: "elena.f@example.com" },
    veicolo: { marca: "Ford", modello: "Kuga", targa: "FD222EF" },
    stato: "Approvato",
    workflow: wfApproved({ finanziamento: true }),
    hasFinanziamento: true,
    pagamento: { tipo: "Finanziamento", acconto: 3500, importoFinanziato: 23900, durataMesi: 72, rataMensile: 420 },
    ownerId: U.ven.id,
    assegnatario: U.ven.name,
    createdAt: isoDaysAgo(52),
    updatedAt: isoDaysAgo(6),
    valore: 27400,
    progress: 86,
    documenti: [mkDoc("D-30022-1", "Prova pagamento", true, true, 10), mkDoc("D-30022-2", "Contratto di vendita", true, true, 20)],
    timeline: [{ at: isoDaysAgo(6), actor: "Sistema", event: "Fascicolo approvato (tutti i rami validati)" }],
    note: [],
  },
  {
    id: "F-30023",
    numero: "2026/03023",
    cliente: { nome: "Mauro Z.", email: "mauro.z@example.com" },
    veicolo: { marca: "Mini", modello: "Cooper", targa: "MN023MZ" },
    stato: "Approvato",
    workflow: wfApproved({ finanziamento: true, permuta: true }),
    hasFinanziamento: true,
    hasPermuta: true,
    pagamento: { tipo: "Finanziamento", acconto: 4000, importoFinanziato: 19900, durataMesi: 60, rataMensile: 410 },
    permuta: { veicolo: "Mini One", targa: "MN111OO", km: 88000, valoreStimato: 6200 },
    ownerId: U.ven.id,
    assegnatario: U.ven.name,
    // caso interessante: venditore ha proposto riapertura (test bottone "Riapri")
    reopenProposed: true,
    createdAt: isoDaysAgo(70),
    updatedAt: isoDaysAgo(0),
    valore: 23900,
    progress: 86,
    documenti: [mkDoc("D-30023-1", "Contratto di vendita", true, true, 60)],
    timeline: [
      { at: isoDaysAgo(8), actor: "Sistema", event: "Fascicolo approvato (tutti i rami validati)" },
      { at: isoDaysAgo(0), actor: U.ven.name, event: "Proposta riapertura" },
    ],
    note: [{ id: "N-30023-1", at: isoDaysAgo(0), author: U.ven.name, text: "Serve aggiornare documento identità." }],
  },

  // =======================
  //  IN FINALIZZAZIONE (In corso operatore consegna)
  // =======================
  {
    id: "F-30024",
    numero: "2026/03024",
    cliente: { nome: "Federico L.", telefono: "+39 346 100 9999" },
    veicolo: { marca: "Honda", modello: "HR-V", targa: "HN024FL" },
    stato: "In finalizzazione",
    workflow: { overall: States.IN_FINALIZZAZIONE, bo: States.VALIDATO_BO },
    ownerId: U.ven.id,
    assegnatario: U.ven.name,
    inChargeDelivery: U.del.id,
    lastInChargeDelivery: U.del.id,
    deliverySentToVRC: false,
    createdAt: isoDaysAgo(58),
    updatedAt: isoDaysAgo(1),
    valore: 28900,
    progress: 90,
    documenti: [mkDoc("D-30024-1", "Verbale consegna", true, false, 1)],
    timeline: [{ at: isoDaysAgo(1), actor: U.del.name, event: "Operatore consegna: presa in carico" }],
    note: [{ id: "N-30024-1", at: isoDaysAgo(1), author: U.del.name, text: "In attesa documentazione consegna." }],
  },
  {
    id: "F-30025",
    numero: "2026/03025",
    cliente: { nome: "Irene M.", email: "irene.m@example.com" },
    veicolo: { marca: "Tesla", modello: "Model 3", targa: "TS025IM" },
    stato: "In finalizzazione",
    workflow: { overall: States.IN_FINALIZZAZIONE, bo: States.VALIDATO_BO },
    ownerId: U.ven.id,
    assegnatario: U.ven.name,
    inChargeDelivery: U.del.id,
    lastInChargeDelivery: U.del.id,
    deliverySentToVRC: false,
    createdAt: isoDaysAgo(80),
    updatedAt: isoDaysAgo(0),
    valore: 42900,
    progress: 92,
    documenti: [mkDoc("D-30025-1", "Assicurazione consegna", true, true, 0), mkDoc("D-30025-2", "Verbale consegna", true, false, 0)],
    timeline: [{ at: isoDaysAgo(0), actor: U.del.name, event: "Operatore consegna: aggiornati documenti" }],
    note: [],
  },

  // =======================
  //  CONSEGNA: disponibili al VRC (in attesa di presa in carico)
  // =======================
  {
    id: "F-30026",
    numero: "2026/03026",
    cliente: { nome: "Luca N.", email: "luca.n@example.com" },
    veicolo: { marca: "Hyundai", modello: "i20", targa: "HY026LN" },
    stato: "Consegna – in attesa di presa in carico",
    workflow: wfDelivery(States.CONSEGNA_IN_ATTESA_PRESA_IN_CARICO),
    ownerId: U.ven.id,
    assegnatario: U.ven.name,
    inChargeDelivery: null,
    lastInChargeDelivery: U.del.id,
    deliverySentToVRC: true,
    inChargeVRC: null,
    createdAt: isoDaysAgo(33),
    updatedAt: isoDaysAgo(0),
    valore: 16700,
    progress: 94,
    documenti: [mkDoc("D-30026-1", "Verbale consegna", true, true, 2), mkDoc("D-30026-2", "Assicurazione consegna", true, true, 2)],
    timeline: [{ at: isoDaysAgo(0), actor: U.del.name, event: "Inviato a Controllo consegna" }],
    note: [],
  },

  // =======================
  //  CONSEGNA: in verifica (In corso VRC)
  // =======================
  {
    id: "F-30027",
    numero: "2026/03027",
    cliente: { nome: "Marta S.", email: "marta.s@example.com" },
    veicolo: { marca: "Kia", modello: "Sportage", targa: "KA027MS" },
    stato: "Consegna – in verifica",
    workflow: wfDelivery(States.CONSEGNA_IN_VERIFICA),
    ownerId: U.ven.id,
    assegnatario: U.ven.name,
    inChargeDelivery: null,
    lastInChargeDelivery: U.del.id,
    deliverySentToVRC: true,
    inChargeVRC: U.vrc.id,
    lastInChargeVRC: U.vrc.id,
    createdAt: isoDaysAgo(37),
    updatedAt: isoDaysAgo(0),
    valore: 31900,
    progress: 95,
    documenti: [
      mkDoc("D-30027-1", "Verbale consegna", true, true, 5),
      mkDoc("D-30027-2", "Assicurazione consegna", true, false, 0, "polizza non leggibile"),
    ],
    timeline: [{ at: isoDaysAgo(0), actor: U.vrc.name, event: "Controllo consegna: preso in carico" }],
    note: [],
  },

  // =======================
  //  CONSEGNA: da controllare (torna all'operatore consegna)
  // =======================
  {
    id: "F-30028",
    numero: "2026/03028",
    cliente: { nome: "Gianni P.", telefono: "+39 349 111 2222" },
    veicolo: { marca: "Renault", modello: "Austral", targa: "RN028GP" },
    stato: "Consegna – da controllare",
    workflow: wfDelivery(States.CONSEGNA_DA_CONTROLLARE),
    ownerId: U.ven.id,
    assegnatario: U.ven.name,
    // torna allo stesso operatore consegna
    lastInChargeDelivery: U.del.id,
    inChargeDelivery: U.del.id,
    deliverySentToVRC: false,
    // VRC precedente valorizzato: se reinvii con DELIVERY.SEND_TO_VRC torna diretto in verifica
    lastInChargeVRC: U.vrc.id,
    inChargeVRC: null,
    createdAt: isoDaysAgo(41),
    updatedAt: isoDaysAgo(0),
    valore: 33900,
    progress: 93,
    documenti: [mkDoc("D-30028-1", "Prova pagamento", true, false, 0, "manca bonifico finale")],
    timeline: [{ at: isoDaysAgo(0), actor: U.vrc.name, event: "Controllo consegna: richieste integrazioni" }],
    note: [{ id: "N-30028-1", at: isoDaysAgo(0), author: U.vrc.name, text: "Caricare prova pagamento finale." }],
  },

  // =======================
  //  COMPLETATI / ANNULLATI (storico)
  // =======================
  {
    id: "F-30029",
    numero: "2026/03029",
    cliente: { nome: "Andrea C.", email: "andrea.c@example.com" },
    veicolo: { marca: "Toyota", modello: "Yaris Hybrid", targa: "TY029AC" },
    stato: "Completato",
    workflow: { overall: States.COMPLETATO, bo: States.VALIDATO_BO },
    ownerId: U.ven.id,
    assegnatario: U.ven.name,
    lastInChargeDelivery: U.del.id,
    lastInChargeVRC: U.vrc.id,
    createdAt: isoDaysAgo(90),
    updatedAt: isoDaysAgo(25),
    valore: 15500,
    progress: 100,
    documenti: [
      mkDoc("D-30029-1", "Contratto di vendita", true, true, 70),
      mkDoc("D-30029-2", "Documento identità", true, true, 80, "titolare"),
      mkDoc("D-30029-3", "Verbale consegna", true, true, 28),
    ],
    timeline: [
      { at: isoDaysAgo(33), actor: "Sistema", event: "Fascicolo approvato (tutti i rami validati)" },
      { at: isoDaysAgo(25), actor: U.vrc.name, event: "Consegna completata" },
    ],
    note: [],
  },
  {
    id: "F-30030",
    numero: "2026/03030",
    cliente: { nome: "Cliente Test", email: "test@example.com" },
    veicolo: { marca: "Fiat", modello: "Tipo", targa: "FI030TT" },
    stato: "Annullato",
    workflow: { overall: States.ANNULLATO, bo: States.ANNULLATO },
    ownerId: U.ven.id,
    assegnatario: U.ven.name,
    inChargeBO: null,
    inChargeBOF: null,
    inChargeBOU: null,
    inChargeDelivery: null,
    inChargeVRC: null,
    createdAt: isoDaysAgo(44),
    updatedAt: isoDaysAgo(43),
    valore: 18900,
    progress: 100,
    documenti: [mkDoc("D-30030-1", "Contratto di vendita", true, false, 43)],
    timeline: [{ at: isoDaysAgo(43), actor: U.ven.name, event: "Fascicolo annullato" }],
    note: [
      { id: "N-30030-1", at: isoDaysAgo(43), author: U.ven.name, text: "Cliente ha rinunciato.", kind: "cancel" },
    ],
  },

  // =======================
  //  EXTRA: qualche caso in più per “distribuzione realistica”
  //  (tanti fascicoli in BO, alcuni approvati, pochi in consegna)
  // =======================
  {
    id: "F-30031",
    numero: "2026/03031",
    cliente: { nome: "Simone L.", email: "simone.l@example.com" },
    veicolo: { marca: "Dacia", modello: "Duster", targa: "DC031SL" },
    stato: "In verifica",
    workflow: wfBoPhase({ bo: States.VERIFICHE_BO, finanziamento: { active: true, state: States.DA_VALIDARE_BOF }, permuta: { active: true, state: States.VERIFICHE_BOU } }),
    hasFinanziamento: true,
    hasPermuta: true,
    pagamento: { tipo: "Finanziamento", acconto: 2000, importoFinanziato: 16800, durataMesi: 72, rataMensile: 300 },
    permuta: { veicolo: "Dacia Sandero", targa: "DS888WW", km: 64000, valoreStimato: 5300 },
    ownerId: U.ven.id,
    assegnatario: U.ven.name,
    inChargeBO: U.bo.id,
    lastInChargeBO: U.bo.id,
    inChargeBOU: U.bou.id,
    lastInChargeBOU: U.bou.id,
    // BOF non preso in carico ancora (rimane disponibile)
    inChargeBOF: null,
    lastInChargeBOF: null,
    createdAt: isoDaysAgo(26),
    updatedAt: isoDaysAgo(2),
    valore: 19900,
    progress: 61,
    documenti: [mkDoc("D-30031-1", "Libretto permuta", true, true, 7)],
    timeline: [{ at: isoDaysAgo(2), actor: U.bo.name, event: "BO Anagrafico: preso in carico" }],
    note: [],
  },
  {
    id: "F-30032",
    numero: "2026/03032",
    cliente: { nome: "Valeria S.", telefono: "+39 328 101 2020" },
    veicolo: { marca: "Suzuki", modello: "Vitara", targa: "SZ032VS" },
    stato: "In attesa di presa in carico",
    workflow: wfBoPhase({ bo: States.DA_VALIDARE_BO, finanziamento: { active: false, state: States.DA_VALIDARE_BOF }, permuta: { active: true, state: States.DA_VALIDARE_BOU } }),
    hasPermuta: true,
    permuta: { veicolo: "Suzuki Swift", targa: "SW123VV", km: 85000, valoreStimato: 4900 },
    ownerId: U.ven.id,
    assegnatario: U.ven.name,
    inChargeBO: null,
    inChargeBOU: null,
    createdAt: isoDaysAgo(29),
    updatedAt: isoDaysAgo(3),
    valore: 22900,
    progress: 55,
    documenti: [mkDoc("D-30032-1", "Contratto di vendita", true, true, 9)],
    timeline: [{ at: isoDaysAgo(3), actor: U.ven.name, event: "Inviato ai BackOffice" }],
    note: [],
  },
  {
    id: "F-30033",
    numero: "2026/03033",
    cliente: { nome: "Nicola D.", email: "nicola.d@example.com" },
    veicolo: { marca: "Cupra", modello: "Formentor", targa: "CP033ND" },
    stato: "Approvato",
    workflow: wfApproved({ permuta: true }),
    hasPermuta: true,
    permuta: { veicolo: "Seat Leon", targa: "SL777DD", km: 71000, valoreStimato: 8900 },
    ownerId: U.ven.id,
    assegnatario: U.ven.name,
    createdAt: isoDaysAgo(62),
    updatedAt: isoDaysAgo(4),
    valore: 37900,
    progress: 85,
    documenti: [mkDoc("D-30033-1", "Contratto di vendita", true, true, 40), mkDoc("D-30033-2", "Libretto permuta", true, true, 35)],
    timeline: [{ at: isoDaysAgo(4), actor: "Sistema", event: "Fascicolo approvato (tutti i rami validati)" }],
    note: [],
  },
  {
    id: "F-30034",
    numero: "2026/03034",
    cliente: { nome: "Rosa P.", email: "rosa.p@example.com" },
    veicolo: { marca: "MG", modello: "ZS", targa: "MG034RP" },
    stato: "Completato",
    workflow: { overall: States.COMPLETATO, bo: States.VALIDATO_BO },
    ownerId: U.ven.id,
    assegnatario: U.ven.name,
    lastInChargeDelivery: U.del.id,
    lastInChargeVRC: U.vrc.id,
    createdAt: isoDaysAgo(120),
    updatedAt: isoDaysAgo(40),
    valore: 18900,
    progress: 100,
    documenti: [mkDoc("D-30034-1", "Contratto di vendita", true, true, 100), mkDoc("D-30034-2", "Verbale consegna", true, true, 41)],
    timeline: [
      { at: isoDaysAgo(63), actor: "Sistema", event: "Fascicolo approvato (tutti i rami validati)" },
      { at: isoDaysAgo(40), actor: U.vrc.name, event: "Consegna completata" },
    ],
    note: [],
  },
  {
    id: "F-30035",
    numero: "2026/03035",
    cliente: { nome: "Giorgia M.", email: "giorgia.m@example.com" },
    veicolo: { marca: "Hyundai", modello: "i20", targa: "HY035GM" },
    stato: "Completato",
    workflow: { overall: States.COMPLETATO, bo: States.VALIDATO_BO },
    ownerId: U.ven.id,
    assegnatario: U.ven.name,
    lastInChargeDelivery: U.del.id,
    lastInChargeVRC: U.vrc.id,
    createdAt: isoDaysAgo(75),
    updatedAt: isoDaysAgo(18),
    valore: 17800,
    progress: 100,
    documenti: [
      mkDoc("D-30035-1", "Contratto di vendita", true, true, 65),
      mkDoc("D-30035-2", "Documento identità", true, true, 64),
      mkDoc("D-30035-3", "Verbale consegna", true, true, 20),
      mkDoc("D-30035-4", "Assicurazione consegna", true, true, 20),
    ],
    timeline: [
      { at: isoDaysAgo(30), actor: "Sistema", event: "Fascicolo approvato (tutti i rami validati)" },
      { at: isoDaysAgo(18), actor: U.vrc.name, event: "Consegna completata" },
    ],
    note: [],
  },
  {
    id: "F-30036",
    numero: "2026/03036",
    cliente: { nome: "Pietro F.", telefono: "+39 347 909 8080" },
    veicolo: { marca: "Peugeot", modello: "208", targa: "PG036PF" },
    stato: "Completato",
    workflow: { overall: States.COMPLETATO, bo: States.VALIDATO_BO },
    ownerId: U.ven.id,
    assegnatario: U.ven.name,
    lastInChargeDelivery: U.del.id,
    lastInChargeVRC: U.vrc.id,
    createdAt: isoDaysAgo(58),
    updatedAt: isoDaysAgo(12),
    valore: 20400,
    progress: 100,
    documenti: [
      mkDoc("D-30036-1", "Contratto di vendita", true, true, 50),
      mkDoc("D-30036-2", "Patente", true, true, 49),
      mkDoc("D-30036-3", "Verbale consegna", true, true, 14),
    ],
    timeline: [
      { at: isoDaysAgo(22), actor: "Sistema", event: "Fascicolo approvato (tutti i rami validati)" },
      { at: isoDaysAgo(12), actor: U.vrc.name, event: "Consegna completata" },
    ],
    note: [],
  },
];

// -----------------------------
// Enrichment demo (runtime)
// - Aggiunge dati realistici a Cliente e Veicolo per tutti i fascicoli demo
// - Non rompe le strutture esistenti: se un campo è già valorizzato, lo mantiene
// -----------------------------

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const CUSTOMER_POOL = [
  {
    nome: "Marco Bianchi",
    codiceFiscale: "BNCMRC85M15F205Z",
    dataNascita: "1985-08-15",
    luogoNascita: "Milano (MI)",
    indirizzo: "Via Verdi 12, 20121 Milano",
    telefono: "+39 333 456 7890",
    email: "marco.bianchi@email.it",
    tipo: "Privato" as const,
  },
  {
    nome: "Giulia Ferraro",
    codiceFiscale: "FRRGLI92C58F839K",
    dataNascita: "1992-03-18",
    luogoNascita: "Napoli (NA)",
    indirizzo: "Via Toledo 44, 80134 Napoli",
    telefono: "+39 320 112 3344",
    email: "giulia.ferraro@email.it",
    tipo: "Privato" as const,
  },
  {
    nome: "Lorenzo De Santis",
    codiceFiscale: "DSNLRN88T10H501Y",
    dataNascita: "1988-12-10",
    luogoNascita: "Roma (RM)",
    indirizzo: "Viale Trastevere 88, 00153 Roma",
    telefono: "+39 347 901 2233",
    email: "lorenzo.desantis@email.it",
    tipo: "Privato" as const,
  },
  {
    nome: "Claudia Romano",
    codiceFiscale: "RMNCLD90A41F205H",
    dataNascita: "1990-01-01",
    luogoNascita: "Milano (MI)",
    indirizzo: "Corso Buenos Aires 15, 20124 Milano",
    telefono: "+39 331 778 9900",
    email: "claudia.romano@email.it",
    tipo: "Privato" as const,
  },
  {
    nome: "AutoService S.r.l.",
    codiceFiscale: "12345670961",
    dataNascita: "2012-05-20",
    luogoNascita: "Bari (BA)",
    indirizzo: "Via Sparano 10, 70121 Bari",
    telefono: "+39 080 123 4567",
    email: "amministrazione@autoservice.it",
    tipo: "Azienda" as const,
  },
] as const;

const VEHICLE_POOL = [
  {
    marca: "Volkswagen",
    modello: "Golf",
    versione: "1.5 TSI Life",
    anno: 2023,
    alimentazione: "Benzina" as const,
    cambio: "Manuale" as const,
    colore: "Grigio Urano",
    prezzoListino: 27990,
    prezzoConcordato: 26490,
  },
  {
    marca: "BMW",
    modello: "Serie 1",
    versione: "118d M Sport",
    anno: 2024,
    alimentazione: "Diesel" as const,
    cambio: "Automatico" as const,
    colore: "Nero metallizzato",
    prezzoListino: 38900,
    prezzoConcordato: 36500,
  },
  {
    marca: "Audi",
    modello: "A3 Sportback",
    versione: "35 TFSI S line",
    anno: 2023,
    alimentazione: "Benzina" as const,
    cambio: "Automatico" as const,
    colore: "Bianco ghiaccio",
    prezzoListino: 37200,
    prezzoConcordato: 34900,
  },
  {
    marca: "Toyota",
    modello: "Yaris",
    versione: "1.5 Hybrid Active",
    anno: 2024,
    alimentazione: "Ibrida" as const,
    cambio: "Automatico" as const,
    colore: "Blu elettrico",
    prezzoListino: 24400,
    prezzoConcordato: 23200,
  },
  {
    marca: "Tesla",
    modello: "Model 3",
    versione: "RWD",
    anno: 2024,
    alimentazione: "Elettrica" as const,
    cambio: "Automatico" as const,
    colore: "Pearl White",
    prezzoListino: 42990,
    prezzoConcordato: 40990,
  },
] as const;

function mkVin(seed: string) {
  // VIN mock 17 char, alfanumerico (senza I/O/Q)
  const alphabet = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";
  let out = "";
  const h = hashStr(seed);
  for (let i = 0; i < 17; i++) out += alphabet[(h + i * 13) % alphabet.length];
  return out;
}

function enrichFascicolo(f: Fascicolo): Fascicolo {
  const idxC = hashStr(`${f.id}|C`) % CUSTOMER_POOL.length;
  const idxV = hashStr(`${f.id}|V`) % VEHICLE_POOL.length;
  const c = CUSTOMER_POOL[idxC];
  const v = VEHICLE_POOL[idxV];
  const vin = f.veicolo.vin ?? f.veicolo.telaio ?? mkVin(f.id);

  return {
    ...f,
    cliente: {
      ...c,
      ...f.cliente,
      // se nel mock vecchio c'era "Marco R." manteniamo eventuale override,
      // ma se è un'abbreviazione, preferiamo il nome realistico.
      nome: (f.cliente.nome ?? "").includes(".") ? c.nome : f.cliente.nome ?? c.nome,
    },
    veicolo: {
      ...v,
      ...f.veicolo,
      vin,
      telaio: f.veicolo.telaio ?? vin,
    },
  };
}

export const fascicoli: Fascicolo[] = baseFascicoli.map(enrichFascicolo);
