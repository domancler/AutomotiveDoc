export type FascicoloStato = "In compilazione" | "In approvazione" | "Firmato" | "Annullato";

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

export const fascicoli: Fascicolo[] = [
  {
    id: "F-10021",
    numero: "2026/00121",
    cliente: { nome: "Marco R.", telefono: "+39 333 123 4567", email: "marco@example.com" },
    veicolo: { marca: "Volkswagen", modello: "Golf 1.5 TSI", targa: "GA123BC" },
    stato: "In compilazione",
    createdAt: isoDaysAgo(10),
    updatedAt: isoDaysAgo(1),
    valore: 21990,
    assegnatario: "D. Ancler",
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
      { at: isoDaysAgo(3), actor: "D. Ancler", event: "Caricata informativa privacy firmata" },
      { at: isoDaysAgo(1), actor: "D. Ancler", event: "Caricato contratto (in attesa firma)" },
    ],
    note: [{ id: "N1", at: isoDaysAgo(2), author: "Backoffice 1", text: "Manca documento identità in fronte/retro." }],
  },
  {
    id: "F-10022",
    numero: "2026/00122",
    cliente: { nome: "Giulia S.", email: "giulia@example.com" },
    veicolo: { marca: "BMW", modello: "Serie 1 118i", targa: "BM456CD" },
    stato: "In approvazione",
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
    createdAt: isoDaysAgo(45),
    updatedAt: isoDaysAgo(20),
    valore: 16450,
    assegnatario: "D. Ancler",
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
      { at: isoDaysAgo(30), actor: "D. Ancler", event: "Caricati documenti cliente" },
      { at: isoDaysAgo(24), actor: "Cliente", event: "Firmato contratto" },
      { at: isoDaysAgo(20), actor: "Sistema", event: "Fascicolo completato" },
    ],
    note: [{ id: "N1", at: isoDaysAgo(21), author: "Backoffice 1", text: "Ok per emissione fattura." }],
  },
];
