import { TIPologieSeed, type TipologiaDocumento, type TipologiaSezione } from "@/mock/tipologie";

type Listener = () => void;

let state: TipologiaDocumento[] = structuredClone(TIPologieSeed);
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
}

export function subscribeTipologie(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getTipologieSnapshot() {
  return state;
}

export function resetTipologie() {
  state = structuredClone(TIPologieSeed);
  emit();
}

function nextId() {
  return `TD-${Math.random().toString(16).slice(2, 10)}`;
}

export function addTipologia(args: {
  sezione: TipologiaSezione;
  nome: string;
  obbligatorio: boolean;
  attivo: boolean;
}) {
  const trimmed = args.nome.trim();
  if (!trimmed) return;

  // Se esiste già (stessa sezione + stesso nome), riattivala e aggiorna flags.
  const existingIdx = state.findIndex(
    (t) => t.sezione === args.sezione && t.nome.toLowerCase() === trimmed.toLowerCase()
  );
  if (existingIdx >= 0) {
    const existing = state[existingIdx];
    const updated: TipologiaDocumento = {
      ...existing,
      nome: existing.nome, // manteniamo la union string del mock
      obbligatorio: args.obbligatorio,
      attivo: args.attivo,
    };
    state = [...state.slice(0, existingIdx), updated, ...state.slice(existingIdx + 1)];
    emit();
    return;
  }

  const maxOrd = Math.max(-1, ...state.filter((t) => t.sezione === args.sezione).map((t) => t.ordine));
  const nuovo: TipologiaDocumento = {
    id: nextId(),
    sezione: args.sezione,
    // NB: nel mock DocumentoTipo è una union string; qui accettiamo input testo.
    // Per la demo va benissimo: a livello UI lo trattiamo come string.
    nome: trimmed as any,
    obbligatorio: args.obbligatorio,
    attivo: args.attivo,
    ordine: maxOrd + 1,
    inUso: 0,
  };

  state = [...state, nuovo];
  emit();
}

export function updateTipologia(id: string, patch: Partial<Pick<TipologiaDocumento, "sezione" | "nome" | "obbligatorio" | "attivo">>) {
  const idx = state.findIndex((t) => t.id === id);
  if (idx < 0) return;
  const current = state[idx];

  const next: TipologiaDocumento = {
    ...current,
    ...patch,
    nome: (patch.nome ?? current.nome) as any,
  };

  // se cambia sezione, mettila in fondo all'ordine della nuova sezione
  if (patch.sezione && patch.sezione !== current.sezione) {
    const maxOrd = Math.max(-1, ...state.filter((t) => t.sezione === patch.sezione).map((t) => t.ordine));
    next.ordine = maxOrd + 1;
  }

  state = [...state.slice(0, idx), next, ...state.slice(idx + 1)];
  emit();
}

export function toggleTipologiaAttiva(id: string, attivo: boolean) {
  updateTipologia(id, { attivo });
}

export function moveTipologia(id: string, direction: "up" | "down") {
  const idx = state.findIndex((t) => t.id === id);
  if (idx < 0) return;
  const t = state[idx];
  const same = state
    .filter((x) => x.sezione === t.sezione)
    .sort((a, b) => a.ordine - b.ordine);

  const pos = same.findIndex((x) => x.id === id);
  const swapWith = direction === "up" ? pos - 1 : pos + 1;
  if (swapWith < 0 || swapWith >= same.length) return;

  const a = same[pos];
  const b = same[swapWith];

  const newA = { ...a, ordine: b.ordine };
  const newB = { ...b, ordine: a.ordine };

  state = state.map((x) => {
    if (x.id === newA.id) return newA;
    if (x.id === newB.id) return newB;
    return x;
  });
  emit();
}
