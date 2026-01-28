import { useMemo, useState } from "react";
import { useFascicoli } from "@/mock/useFascicoliStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/card";
import { Input } from "@/ui/components/input";
import { applyFascicoliFilters, createEmptyFilters } from "@/ui/fascicoli/FascicoliFilters";
import { FascicoliCards } from "@/ui/fascicoli/FascicoliCards";
import { useAuth } from "@/auth/AuthProvider";
import type { Action } from "@/auth/actions";
import { can, type FascicoloContext } from "@/auth/can";
import { States, type StateCode } from "@/workflow/states";
import type { Fascicolo } from "@/mock/fascicoli";
import type { Role } from "@/auth/roles";

const TAKE_BY_ROLE: Record<Role, Action | null> = {
  ADMIN: null,
  AMMINISTRATIVO: null,
  RESPONSABILE: null,
  COMMERCIALE: "FASCICOLO.TAKE_COMM",
  BO: "FASCICOLO.TAKE_BO",
  BOF: "FASCICOLO.TAKE_BOF",
  BOU: "FASCICOLO.TAKE_BOU",
  CONSEGNATORE: "DELIVERY.TAKE",
  VRC: "VRC.TAKE",
};

function mapLegacyStatoToState(stato: Fascicolo["stato"]) {
  // fallback di compatibilità
  switch (stato) {
    case "Bozza":
      return States.BOZZA;
    case "In compilazione":
      return States.NUOVO;
    case "In approvazione":
      return States.DA_VALIDARE_BO;
    case "Firmato":
      return States.APPROVATO;
    default:
      return States.BOZZA;
  }
}

function firstReviewBranchState(f: Fascicolo): StateCode | undefined {
  const bo = f.workflow?.bo;
  const bof = f.workflow?.bof;
  const bou = f.workflow?.bou;
  const candidates = [bo, bof, bou].filter(Boolean) as StateCode[];
  return candidates.find(
    (s) =>
      s === States.DA_RIVEDERE_BO ||
      s === States.DA_RIVEDERE_BOF ||
      s === States.DA_RIVEDERE_BOU,
  );
}

function buildCtx(f: Fascicolo, role?: Role): FascicoloContext {
  const anyF: any = f;

  const overall = (anyF.workflow?.overall ?? anyF.workflowState ?? mapLegacyStatoToState(f.stato)) as StateCode;
  const bo = (anyF.workflow?.bo ?? overall) as StateCode;
  // fallback: se il fascicolo è in validazione ma il ramo non esiste (vecchi dati), assumilo “in attesa di presa in carico”
  const bof = ((anyF.workflow?.bof ?? (overall === States.DA_VALIDARE_BO ? States.DA_VALIDARE_BOF : overall)) as StateCode);
  const bou = ((anyF.workflow?.bou ?? (overall === States.DA_VALIDARE_BO ? States.DA_VALIDARE_BOU : overall)) as StateCode);

  const state: StateCode | undefined = (() => {
    if (role === "BO") return bo;
    if (role === "BOF") return bof;
    if (role === "BOU") return bou;
    if (role === "COMMERCIALE") return firstReviewBranchState(f) ?? overall;
    return overall;
  })();

  return {
    state,
    ownerId: anyF.ownerId ?? (f.ownerId ?? undefined),
    // Se il ramo esiste nel workflow, l'area è da considerare attiva (anche se i flag nel mock sono incompleti).
    // Se il ramo esiste (o lo stiamo inferendo), l’area è attiva.
    hasFinanziamento: Boolean(anyF.hasFinanziamento) || Boolean(anyF.workflow?.bof) || overall === States.DA_VALIDARE_BO,
    hasPermuta: Boolean(anyF.hasPermuta) || Boolean(anyF.workflow?.bou) || overall === States.DA_VALIDARE_BO,
    inChargeBO: anyF.inChargeBO ?? null,
    inChargeBOF: anyF.inChargeBOF ?? null,
    inChargeBOU: anyF.inChargeBOU ?? null,
    inChargeDelivery: anyF.inChargeDelivery ?? null,
    inChargeVRC: anyF.inChargeVRC ?? null,
    deliverySentToVRC: anyF.deliverySentToVRC ?? !!(f as any).deliverySentToVRC,
  };
}

function getOverallState(f: Fascicolo): StateCode {
  const anyF: any = f;
  return (anyF.workflow?.overall ?? anyF.workflowState ?? mapLegacyStatoToState(f.stato)) as StateCode;
}

function roleMatchesAvailability(role: Role, overall: StateCode): boolean {
  // Regole di dominio:
  // - Bozza: solo Venditore
  // - In validazione: solo BackOffice
  // - Approvato: solo Operatore consegna
  // - Consegna (in attesa di presa in carico): solo Controllo consegna
  if (overall === States.BOZZA) return role === "COMMERCIALE";
  if (overall === States.DA_VALIDARE_BO) return role === "BO" || role === "BOF" || role === "BOU";
  if (overall === States.APPROVATO) return role === "CONSEGNATORE";
  if (overall === States.DA_VALIDARE_CONSEGNA) return role === "VRC";

  // Gli altri stati non hanno "Disponibili" dedicati (o sono gestiti dai can())
  return true;
}

function canTake(f: Fascicolo, user: { id: string; username: string; role: Role }) {
  const action = TAKE_BY_ROLE[user.role];
  if (!action) return false;
  const ctx = buildCtx(f, user.role);
  return can(user, action, ctx);
}

export function FascicoliDisponibiliPage() {
  const fascicoli = useFascicoli();
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState(createEmptyFilters());
  const { user } = useAuth();

  const base = useMemo(() => {
    if (!user) return [];
    // “Disponibili” = fascicoli “senza padrone” nel tuo reparto, che puoi prendere in carico
    return fascicoli.filter((f) => roleMatchesAvailability(user.role, getOverallState(f)) && canTake(f, user));
  }, [fascicoli, user]);

  const rows = useMemo(() => {
    const filtered = applyFascicoliFilters(base, filters);

    const query = q.trim().toLowerCase();
    if (!query) return filtered;

    return filtered.filter((f) =>
      [
        f.id,
        f.numero,
        f.cliente.nome,
        f.cliente.email,
        f.cliente.telefono,
        f.veicolo.modello,
        f.veicolo.targa,
        f.veicolo.vin,
      ]
        .filter(Boolean)
        .some((x) => String(x).toLowerCase().includes(query)),
    );
  }, [base, filters, q]);

  const role = (user?.role ?? null) as Role | null;
  const takeAction = role ? TAKE_BY_ROLE[role] : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fascicoli disponibili</h1>
          <p className="text-sm text-muted-foreground">
            Lista dei fascicoli senza operatore assegnato, disponibili alla presa in carico
          </p>
        </div>
        <div className="w-full md:w-[360px]">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ricerca per cliente, targa, numero..." />
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Elenco</CardTitle>
          <div className="text-sm text-muted-foreground">
            Risultati: <span className="font-medium text-foreground">{rows.length}</span>
          </div>
        </CardHeader>
        <CardContent>
          <FascicoliCards rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
