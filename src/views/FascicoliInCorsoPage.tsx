import { useMemo, useState } from "react";
import { useFascicoli } from "@/mock/useFascicoliStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/card";
import { Input } from "@/ui/components/input";
import { applyFascicoliFilters, createEmptyFilters, FascicoliFilters } from "@/ui/fascicoli/FascicoliFilters";
import { FascicoliCards } from "@/ui/fascicoli/FascicoliCards";
import { useAuth } from "@/auth/AuthProvider";
import type { Action } from "@/auth/actions";
import { can, type FascicoloContext } from "@/auth/can";
import { States, type StateCode } from "@/workflow/states";
import type { Fascicolo } from "@/mock/fascicoli";
import type { Role } from "@/auth/roles";

// "In corso" = solo fascicoli che in questo momento l'utente ha in mano (owner/presa in carico per la fase)


function mapLegacyStatoToState(stato: Fascicolo["stato"]) {
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
      return States.NUOVO;
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
  const bof = (anyF.workflow?.bof ?? overall) as StateCode;
  const bou = (anyF.workflow?.bou ?? overall) as StateCode;

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
    hasFinanziamento: anyF.hasFinanziamento ?? !!anyF.workflow?.bof,
    hasPermuta: anyF.hasPermuta ?? !!anyF.workflow?.bou,
    inChargeBO: anyF.inChargeBO ?? null,
    inChargeBOF: anyF.inChargeBOF ?? null,
    inChargeBOU: anyF.inChargeBOU ?? null,
    inChargeDelivery: anyF.inChargeDelivery ?? null,
    inChargeVRC: anyF.inChargeVRC ?? null,
    deliverySentToVRC: anyF.deliverySentToVRC ?? !!(f as any).deliverySentToVRC,
  };
}

function isInCorsoForUser(f: Fascicolo, user: { id: string; username: string; role: Role }) {
  const ctx = buildCtx(f, user.role);
  switch (user.role) {
    case "COMMERCIALE":
      // venditore: owner + stati in cui deve operare
      return ctx.ownerId === user.id && [
        States.NUOVO,
        States.DA_RIVEDERE_BO,
        States.DA_RIVEDERE_BOF,
        States.DA_RIVEDERE_BOU,
        States.APPROVATO,
      ].includes(ctx.state as any);

    case "BO":
      return ctx.inChargeBO === user.id && ctx.state === States.VERIFICHE_BO;
    case "BOF":
      return ctx.inChargeBOF === user.id && ctx.state === States.VERIFICHE_BOF;
    case "BOU":
      return ctx.inChargeBOU === user.id && ctx.state === States.VERIFICHE_BOU;
    case "CONSEGNATORE":
      return ctx.inChargeDelivery === user.id && [States.FASE_FINALE, States.DA_RIVEDERE_VRC].includes(ctx.state as any);
    case "VRC":
      return ctx.inChargeVRC === user.id && ctx.state === States.VERIFICHE_CONSEGNA;
    default:
      return false;
  }
}

export function FascicoliInCorsoPage() {
  const fascicoli = useFascicoli();
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState(createEmptyFilters());
  const { user } = useAuth();

  const base = useMemo(
    () => {
      if (!user) return [];
      return fascicoli.filter((f) => isInCorsoForUser(f, user));
    },
    [fascicoli, user],
  );

  const rows = useMemo(() => {
    const filtered = applyFascicoliFilters(base, filters);

    const query = q.trim().toLowerCase();
    if (!query) return filtered;

    // AND: la search si applica in AND ai filtri
    // La search *non* include campi già coperti da filtri dedicati (es. stato, assegnatario, marca).
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fascicoli in corso</h1>
          <p className="text-sm text-muted-foreground">Lista dei fascicoli su cui puoi operare</p>
        </div>
        <div className="w-full md:w-[360px]">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ricerca per cliente, targa, numero..." />
        </div>
      </div>

      <FascicoliFilters
        rows={base}
        value={filters}
        onChange={setFilters}
        defaultOpen={false}
        showAssegnatario={false}
      />

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

