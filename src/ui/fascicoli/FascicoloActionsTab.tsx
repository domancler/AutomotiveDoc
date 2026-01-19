import * as React from "react";
import type { Fascicolo } from "@/mock/fascicoli";
import type { FascicoloContext } from "@/auth/can";
import { can } from "@/auth/can";
import { States } from "@/workflow/states";
import type { Action } from "@/auth/actions";
import type { Role } from "@/auth/roles";

import { Button } from "@/ui/components/button";
import { Badge } from "@/ui/components/badge";
import { cn } from "@/lib/utils";

import {
  Send,
  RotateCcw,
  Hand,
  CheckCircle2,
  AlertTriangle,
  FileUp,
  UserCheck,
  ArrowRightCircle,
} from "lucide-react";

import { useAuth } from "@/auth/AuthProvider";

/** -----------------------
 *  Stato: mapping temporaneo
 *  (finché non metti workflowState: "Sxx" nel mock)
 *  ---------------------- */
function mapLegacyStatoToState(stato: Fascicolo["stato"]) {
  switch (stato) {
    case "In compilazione":
      return States.NUOVO; // S01
    case "In approvazione":
      return States.DA_VALIDARE_BO; // S02 (macro validazione)
    case "Firmato":
      return States.APPROVATO; // S11
    default:
      return States.NUOVO;
  }
}

function hasProvaPagamentoDoc(f: Fascicolo) {
  return f.documenti?.some((d) => d.tipo === "Prova pagamento") ?? false;
}

function buildCtx(f: Fascicolo): FascicoloContext {
  const anyF: any = f;

  const state = (anyF.workflowState ?? mapLegacyStatoToState(f.stato)) as any;

  return {
    state,
    ownerId:
      anyF.ownerId ??
      (f.assegnatario ? String(f.assegnatario).toLowerCase() : undefined),
    hasFinanziamento: anyF.hasFinanziamento ?? hasProvaPagamentoDoc(f),
    hasPermuta: anyF.hasPermuta ?? false,
  };
}

function niceStateLabel(state?: string) {
  switch (state) {
    case States.NUOVO:
      return "Nuovo";
    case States.DA_VALIDARE_BO:
    case States.DA_VALIDARE_BOF:
    case States.DA_VALIDARE_BOU:
      return "In attesa di presa in carico";
    case States.VERIFICHE_BO:
    case States.VERIFICHE_BOF:
    case States.VERIFICHE_BOU:
      return "In verifica";
    case States.DA_RIVEDERE_BO:
    case States.DA_RIVEDERE_BOF:
    case States.DA_RIVEDERE_BOU:
      return "Da controllare";
    case States.VALIDATO_BO:
    case States.VALIDATO_BOF:
    case States.VALIDATO_BOU:
      return "Validato";
    case States.APPROVATO:
      return "Approvato";
    case States.DA_VALIDARE_CONSEGNA:
      return "Consegna - in attesa di verifica";
    case States.VERIFICHE_CONSEGNA:
      return "Consegna - in verifica";
    case States.DA_RIVEDERE_VRC:
      return "Consegna - da controllare";
    case States.CONSEGNATO:
      return "Completato";
    default:
      return state ?? "—";
  }
}

/** Spiegazione DISABLED: solo per il ruolo corrente (quindi niente messaggi “solo BO” se sei commerciale: non la vedrai proprio) */
function reasonByState(action: Action, state?: string) {
  if (!state) return "Stato non disponibile";

  const inState = (expected: string[]) =>
    expected.includes(state) ? "" : `Disponibile solo in: ${expected.map(s => niceStateLabel(s)).join(", ")}`;

  switch (action) {
    // COMM
    case "FASCICOLO.SEND_AS_COMM":
      return inState([
        States.NUOVO,
        States.DA_RIVEDERE_BO,
        States.DA_RIVEDERE_BOF,
        States.DA_RIVEDERE_BOU,
      ]);
    case "FASCICOLO.REQUEST_REOPEN":
      return inState([States.APPROVATO]);

    // BO
    case "FASCICOLO.TAKE_BO":
      return inState([States.DA_VALIDARE_BO]);
    case "FASCICOLO.REQUEST_REVIEW_BO":
    case "FASCICOLO.VALIDATE_BO":
      return inState([States.VERIFICHE_BO]);
    case "FASCICOLO.REOPEN":
      return inState([States.APPROVATO]);

    // BOF
    case "FASCICOLO.TAKE_BOF":
      return inState([States.DA_VALIDARE_BOF]);
    case "FASCICOLO.REQUEST_REVIEW_BOF":
    case "FASCICOLO.VALIDATE_BOF":
      return inState([States.VERIFICHE_BOF]);

    // BOU
    case "FASCICOLO.TAKE_BOU":
      return inState([States.DA_VALIDARE_BOU]);
    case "FASCICOLO.REQUEST_REVIEW_BOU":
    case "FASCICOLO.VALIDATE_BOU":
      return inState([States.VERIFICHE_BOU]);

    // Consegnatore
    case "DELIVERY.TAKE":
      return inState([States.APPROVATO]);
    case "DELIVERY.UPLOAD":
    case "DELIVERY.SEND_TO_VRC":
      return inState([States.APPROVATO, States.DA_RIVEDERE_VRC]);

    // VRC
    case "VRC.TAKE":
      return inState([States.DA_VALIDARE_CONSEGNA]);
    case "VRC.REQUEST_FIX":
    case "VRC.VALIDATE":
      return inState([States.VERIFICHE_CONSEGNA]);

    default:
      return "Non disponibile in questo stato";
  }
}

function ActionCard({
  title,
  subtitle,
  icon,
  tone = "default",
  enabled,
  onClick,
  disabledReason,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  tone?: "default" | "outline" | "danger";
  enabled: boolean;
  onClick: () => void;
  disabledReason?: string;
}) {
  const variant = tone === "danger" ? "destructive" : tone === "outline" ? "outline" : "default";

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-4",
        !enabled && "border-dashed opacity-70"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-xl border p-2">{icon}</div>
          <div>
            <div className="font-semibold leading-tight">{title}</div>
            <div className="text-sm text-muted-foreground">{subtitle}</div>
          </div>
        </div>

        {!enabled && <Badge variant="destructive">Non disponibile</Badge>}
      </div>

      {!enabled && disabledReason && (
        <div className="mt-3 text-sm text-muted-foreground">
          <span className="font-medium">Motivo:</span> {disabledReason}
        </div>
      )}

      <div className="mt-4">
        <Button
          variant={variant as any}
          className={cn("w-full", !enabled && "cursor-not-allowed")}
          disabled={!enabled}
          onClick={onClick}
          title={!enabled ? disabledReason : undefined}
        >
          {enabled ? "Esegui" : "Non disponibile"}
        </Button>
      </div>
    </div>
  );
}

function RolePanel(props: {
  title?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const {
    title,
    hint,
    children,
  } = props;

  return (
    <div className="rounded-2xl border bg-background">
      {
        (title || hint) && (
          <div className="p-4">
            <div className="text-lg font-semibold">{title}</div>
            <div className="text-sm text-muted-foreground">{hint}</div>
          </div>
        )
      }
      <div className={cn("p-4", (title || hint) ? "border-t" : "")}>{children}</div>
    </div>
  );
}

export function FascicoloActionsTab({ fascicolo }: { fascicolo: Fascicolo }) {
  const { user } = useAuth();
  const ctx = React.useMemo(() => buildCtx(fascicolo), [fascicolo]);

  const role = user?.role as Role | undefined;
  const state = ctx.state;

  const allowed = (action: Action) =>
    user ? can(user as any, action, ctx) : false;

  const disabledReason = (action: Action) => reasonByState(action, state);

  const act = (label: string) => {
    alert(`Azione (mock): ${label}`);
  };

  if (!user) {
    return (
      <div className="rounded-2xl border bg-card p-4">
        <div className="font-semibold">Azioni</div>
        <div className="text-sm text-muted-foreground">
          Devi essere loggato per vedere le azioni disponibili.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ✅ COMMERCIALE: vede SOLO queste */}
      {role === "COMMERCIALE" && (
        <RolePanel
          // title="Venditore"
          // hint="Compilazione e invio fascicolo, proposta riapertura dopo approvazione."
        >
          <div className="grid gap-3 md:grid-cols-2">
            <ActionCard
              title="Invia fascicolo"
              subtitle="Invia il fascicolo alla fase di validazione."
              icon={<Send className="h-5 w-5" />}
              enabled={allowed("FASCICOLO.SEND_AS_COMM")}
              onClick={() => act("Invia fascicolo (Venditore)")}
              disabledReason={disabledReason("FASCICOLO.SEND_AS_COMM")}
            />
            <ActionCard
              title="Proponi riapertura"
              subtitle="Segnala un errore dopo approvazione."
              icon={<RotateCcw className="h-5 w-5" />}
              tone="outline"
              enabled={allowed("FASCICOLO.REQUEST_REOPEN")}
              onClick={() => act("Proponi riapertura")}
              disabledReason={disabledReason("FASCICOLO.REQUEST_REOPEN")}
            />
          </div>
        </RolePanel>
      )}

      {/* ✅ BO */}
      {role === "BO" && (
        <RolePanel
          title="BackOffice Anagrafico"
          hint="Presa in carico, richiesta integrazioni, validazione, riapertura."
        >
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <ActionCard
              title="Prendi in carico"
              subtitle="Inizia le verifiche anagrafiche."
              icon={<Hand className="h-5 w-5" />}
              enabled={allowed("FASCICOLO.TAKE_BO")}
              onClick={() => act("Prendi in carico BO")}
              disabledReason={disabledReason("FASCICOLO.TAKE_BO")}
            />
            <ActionCard
              title="Richiedi integrazioni"
                subtitle="Invia al Venditore per documenti mancanti/non conformi."
              icon={<AlertTriangle className="h-5 w-5" />}
              tone="outline"
              enabled={allowed("FASCICOLO.REQUEST_REVIEW_BO")}
              onClick={() => act("Richiedi integrazioni BO")}
              disabledReason={disabledReason("FASCICOLO.REQUEST_REVIEW_BO")}
            />
            <ActionCard
              title="Valida"
              subtitle="Conferma esito positivo e completa la sezione."
              icon={<CheckCircle2 className="h-5 w-5" />}
              enabled={allowed("FASCICOLO.VALIDATE_BO")}
              onClick={() => act("Valida BO")}
              disabledReason={disabledReason("FASCICOLO.VALIDATE_BO")}
            />
            <div className="md:col-span-2 lg:col-span-3">
              <ActionCard
                title="Riapri fascicolo approvato"
                subtitle="Riapertura vera (solo su Approvato)."
                icon={<RotateCcw className="h-5 w-5" />}
                tone="danger"
                enabled={allowed("FASCICOLO.REOPEN")}
                onClick={() => act("Riapri fascicolo")}
                disabledReason={disabledReason("FASCICOLO.REOPEN")}
              />
            </div>
          </div>
        </RolePanel>
      )}

      {/* ✅ BOF */}
      {role === "BOF" && (
        <RolePanel
          title="BackOffice Finanziario"
          hint="Disponibile solo se la sezione finanziaria è attiva nel fascicolo."
        >
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <ActionCard
              title="Prendi in carico"
              subtitle="Inizia verifiche finanziarie."
              icon={<Hand className="h-5 w-5" />}
              enabled={allowed("FASCICOLO.TAKE_BOF")}
              onClick={() => act("Prendi in carico BOF")}
              disabledReason={disabledReason("FASCICOLO.TAKE_BOF")}
            />
            <ActionCard
              title="Richiedi integrazioni"
                subtitle="Invia al Venditore per integrazioni finanziarie."
              icon={<AlertTriangle className="h-5 w-5" />}
              tone="outline"
              enabled={allowed("FASCICOLO.REQUEST_REVIEW_BOF")}
              onClick={() => act("Richiedi integrazioni BOF")}
              disabledReason={disabledReason("FASCICOLO.REQUEST_REVIEW_BOF")}
            />
            <ActionCard
              title="Valida"
              subtitle="Completa la sezione finanziaria."
              icon={<CheckCircle2 className="h-5 w-5" />}
              enabled={allowed("FASCICOLO.VALIDATE_BOF")}
              onClick={() => act("Valida BOF")}
              disabledReason={disabledReason("FASCICOLO.VALIDATE_BOF")}
            />
            <div className="md:col-span-2 lg:col-span-3">
              <ActionCard
                title="Riapri fascicolo approvato"
                subtitle="Riapertura vera (solo su Approvato)."
                icon={<RotateCcw className="h-5 w-5" />}
                tone="danger"
                enabled={allowed("FASCICOLO.REOPEN")}
                onClick={() => act("Riapri fascicolo")}
                disabledReason={disabledReason("FASCICOLO.REOPEN")}
              />
            </div>
          </div>
        </RolePanel>
      )}

      {/* ✅ BOU */}
      {role === "BOU" && (
        <RolePanel
          title="BackOffice Permuta"
          hint="Disponibile solo se la sezione permuta/usato è attiva nel fascicolo."
        >
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <ActionCard
              title="Prendi in carico"
              subtitle="Inizia verifiche permuta/usato."
              icon={<Hand className="h-5 w-5" />}
              enabled={allowed("FASCICOLO.TAKE_BOU")}
              onClick={() => act("Prendi in carico BOU")}
              disabledReason={disabledReason("FASCICOLO.TAKE_BOU")}
            />
            <ActionCard
              title="Richiedi integrazioni"
                subtitle="Invia al Venditore per integrazioni permuta."
              icon={<AlertTriangle className="h-5 w-5" />}
              tone="outline"
              enabled={allowed("FASCICOLO.REQUEST_REVIEW_BOU")}
              onClick={() => act("Richiedi integrazioni BOU")}
              disabledReason={disabledReason("FASCICOLO.REQUEST_REVIEW_BOU")}
            />
            <ActionCard
              title="Valida"
              subtitle="Completa la sezione permuta/usato."
              icon={<CheckCircle2 className="h-5 w-5" />}
              enabled={allowed("FASCICOLO.VALIDATE_BOU")}
              onClick={() => act("Valida BOU")}
              disabledReason={disabledReason("FASCICOLO.VALIDATE_BOU")}
            />
            <div className="md:col-span-2 lg:col-span-3">
              <ActionCard
                title="Riapri fascicolo approvato"
                subtitle="Riapertura vera (solo su Approvato)."
                icon={<RotateCcw className="h-5 w-5" />}
                tone="danger"
                enabled={allowed("FASCICOLO.REOPEN")}
                onClick={() => act("Riapri fascicolo")}
                disabledReason={disabledReason("FASCICOLO.REOPEN")}
              />
            </div>
          </div>
        </RolePanel>
      )}

      {/* ✅ CONSEGNATORE */}
      {role === "CONSEGNATORE" && (
        <RolePanel
          title="Operatore consegna"
          hint="Operazioni post-approvazione: carica documenti consegna e invia al controllo consegna."
        >
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <ActionCard
              title="Prendi in carico"
              subtitle="Presa in carico su Approvato (senza cambio stato)."
              icon={<UserCheck className="h-5 w-5" />}
              enabled={allowed("DELIVERY.TAKE")}
              onClick={() => act("Prendi in carico Operatore consegna")}
              disabledReason={disabledReason("DELIVERY.TAKE")}
            />
            <ActionCard
              title="Carica documenti consegna"
              subtitle="Upload documenti richiesti per consegna."
              icon={<FileUp className="h-5 w-5" />}
              enabled={allowed("DELIVERY.UPLOAD")}
              onClick={() => act("Carica documenti consegna")}
              disabledReason={disabledReason("DELIVERY.UPLOAD")}
            />
            <ActionCard
              title="Invia a Controllo consegna"
              subtitle="Invia al controllo consegna per le verifiche."
              icon={<ArrowRightCircle className="h-5 w-5" />}
              enabled={allowed("DELIVERY.SEND_TO_VRC")}
              onClick={() => act("Invia a VRC")}
              disabledReason={disabledReason("DELIVERY.SEND_TO_VRC")}
            />
          </div>
        </RolePanel>
      )}

      {/* ✅ VRC */}
      {role === "VRC" && (
        <RolePanel
          title="Controllo consegna"
          hint="Prendi in carico, richiedi integrazioni all'operatore consegna e valida la consegna."
        >
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <ActionCard
              title="Prendi in carico"
              subtitle="Avvia verifiche consegna."
              icon={<Hand className="h-5 w-5" />}
              enabled={allowed("VRC.TAKE")}
              onClick={() => act("Prendi in carico VRC")}
              disabledReason={disabledReason("VRC.TAKE")}
            />
            <ActionCard
              title="Richiedi integrazioni"
              subtitle="Rimanda all'operatore consegna per documenti mancanti."
              icon={<AlertTriangle className="h-5 w-5" />}
              tone="outline"
              enabled={allowed("VRC.REQUEST_FIX")}
              onClick={() => act("VRC richiede integrazioni")}
              disabledReason={disabledReason("VRC.REQUEST_FIX")}
            />
            <ActionCard
              title="Valida consegna"
              subtitle="Chiude il processo (→ Completato)."
              icon={<CheckCircle2 className="h-5 w-5" />}
              enabled={allowed("VRC.VALIDATE")}
              onClick={() => act("Valida consegna")}
              disabledReason={disabledReason("VRC.VALIDATE")}
            />
          </div>
        </RolePanel>
      )}

      {/* Ruoli “solo lettura” o admin */}
      {role === "ADMIN" && (
        <div className="rounded-2xl border bg-card p-4">
          <div className="font-semibold">Admin</div>
          <div className="text-sm text-muted-foreground">
            L’admin non opera sui fascicoli: usa l’area configurazione documenti.
          </div>
        </div>
      )}
    </div>
  );
}
