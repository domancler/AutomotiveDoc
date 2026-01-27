import * as React from "react";
import type { Fascicolo } from "@/mock/fascicoli";
import type { FascicoloContext } from "@/auth/can";
import { can } from "@/auth/can";
import { States, type StateCode } from "@/workflow/states";
import type { Action } from "@/auth/actions";
import type { Role } from "@/auth/roles";

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
import { dispatchFascicoloAction } from "@/mock/runtimeFascicoliStore";

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

function firstReviewBranchState(f: Fascicolo): StateCode | undefined {
  const bo = f.workflow?.bo;
  const bof = f.workflow?.bof;
  const bou = f.workflow?.bou;
  const candidates = [bo, bof, bou].filter(Boolean) as StateCode[];
  return candidates.find(
    (s) =>
      s === States.DA_RIVEDERE_BO ||
      s === States.DA_RIVEDERE_BOF ||
      s === States.DA_RIVEDERE_BOU
  );
}

function buildCtx(f: Fascicolo, role?: Role): FascicoloContext {
  const anyF: any = f;

  const overall = (anyF.workflow?.overall ?? anyF.workflowState ?? mapLegacyStatoToState(f.stato)) as StateCode;
  const bo = (anyF.workflow?.bo ?? overall) as StateCode;
  const bof = (anyF.workflow?.bof ?? overall) as StateCode;
  const bou = (anyF.workflow?.bou ?? overall) as StateCode;

  // Stato per le regole (can): dipende dal ruolo che sta agendo
  const state: StateCode | undefined = (() => {
    if (role === "BO") return bo;
    if (role === "BOF") return bof;
    if (role === "BOU") return bou;

    if (role === "COMMERCIALE") {
      const review = firstReviewBranchState(f);
      return review ?? overall;
    }

    return overall;
  })();

  return {
    state,
    ownerId:
      anyF.ownerId ??
      (f.assegnatario ? String(f.assegnatario).toLowerCase() : undefined),
    hasFinanziamento: anyF.hasFinanziamento ?? hasProvaPagamentoDoc(f),
    hasPermuta: anyF.hasPermuta ?? false,
    inChargeBO: anyF.inChargeBO ?? null,
    inChargeBOF: anyF.inChargeBOF ?? null,
    inChargeBOU: anyF.inChargeBOU ?? null,
    inChargeDelivery: anyF.inChargeDelivery ?? null,
    inChargeVRC: anyF.inChargeVRC ?? null,
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
  const iconTone =
    tone === "danger"
      ? "border-destructive/30 text-destructive"
      : "border-input";

  const baseCard = cn(
    "w-full rounded-2xl border bg-card p-4 text-left transition",
    "flex flex-col h-full", // <-- h-full importante per allineare nella griglia
    enabled
      ? "hover:bg-accent/40 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      : "border-dashed opacity-70 cursor-not-allowed"
  );

  const Header = (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3 min-w-0">
        <div
          className={cn(
            "mt-0.5 rounded-xl border p-2",
            iconTone,
            enabled ? "bg-background" : "opacity-50"
          )}
          aria-hidden="true"
        >
          {icon}
        </div>

        <div className="min-w-0">
          <div className="font-semibold leading-tight">{title}</div>

          {/* ✅ descrizione ATTACCATA al titolo (niente min-h qui) */}
          <div className="text-sm text-muted-foreground leading-snug mt-1">
            {subtitle}
          </div>
        </div>
      </div>

      {!enabled && (
        <Badge className="shrink-0 whitespace-nowrap" variant="danger">
          Non disponibile
        </Badge>
      )}
    </div>
  );

  // ✅ Footer allineato nella riga:
  // - mt-auto lo spinge in basso, quindi "Motivo" parte alla stessa altezza per le card della riga
  // - min-h garantisce base uniforme anche quando il motivo è corto/assente
  // - pt-3 dà quel margine "giusto" rispetto alla descrizione
  const Footer = (
    <div className="mt-auto pt-2 min-h-[32px] text-sm text-muted-foreground leading-snug">
      {!enabled && disabledReason ? (
        <span className="break-words">{disabledReason}</span>
      ) : null}
    </div>
  );

  if (enabled) {
    return (
      <button
        type="button"
        className={baseCard}
        onClick={onClick}
        title={`Esegui: ${title}`}
        aria-label={`Esegui: ${title}`}
      >
        {Header}
        {Footer}
      </button>
    );
  }

  return (
    <div
      className={baseCard}
      title={disabledReason}
      aria-label={`Non disponibile: ${title}`}
    >
      {Header}
      {Footer}
    </div>
  );
}

export function FascicoloActionsTab({ fascicolo }: { fascicolo: Fascicolo }) {
  const { user } = useAuth();
  const role = user?.role as Role | undefined;
  const ctx = React.useMemo(() => buildCtx(fascicolo, role), [fascicolo, role]);
  const state = ctx.state;

  const allowed = (action: Action) =>
    user ? can(user as any, action, ctx) : false;

  const disabledReason = (action: Action) => reasonByState(action, state);

  const doAction = (action: Action, label: string) => {
    dispatchFascicoloAction({
      fascicoloId: fascicolo.id,
      action,
      actor: { id: user?.id, role, name: user?.name || user?.username || user?.id },
    });

    // feedback leggero (rimane tutto runtime)
    // eslint-disable-next-line no-alert
    alert(`Azione eseguita (runtime): ${label}`);
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
    <div className="rounded-2xl border bg-card p-4">
      <div className="space-y-4">
      {/* ✅ COMMERCIALE: vede SOLO queste */}
      {role === "COMMERCIALE" && (
        <div className="grid gap-3 md:grid-cols-2">
          <ActionCard
            title="Invia fascicolo"
            subtitle="Invia il fascicolo alla fase di validazione."
            icon={<Send className="h-5 w-5" />}
            enabled={allowed("FASCICOLO.SEND_AS_COMM")}
            onClick={() => doAction("FASCICOLO.SEND_AS_COMM", "Invia fascicolo")}
            disabledReason={disabledReason("FASCICOLO.SEND_AS_COMM")}
          />
          <ActionCard
            title="Proponi riapertura"
            subtitle="Segnala un errore dopo approvazione."
            icon={<RotateCcw className="h-5 w-5" />}
            tone="outline"
            enabled={allowed("FASCICOLO.REQUEST_REOPEN")}
            onClick={() => doAction("FASCICOLO.REQUEST_REOPEN", "Proponi riapertura")}
            disabledReason={disabledReason("FASCICOLO.REQUEST_REOPEN")}
          />
        </div>
      )}

      {/* ✅ BO */}
      {role === "BO" && (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <ActionCard
              title="Prendi in carico"
              subtitle="Inizia le verifiche anagrafiche."
              icon={<Hand className="h-5 w-5" />}
              enabled={allowed("FASCICOLO.TAKE_BO")}
              onClick={() => doAction("FASCICOLO.TAKE_BO", "Prendi in carico (BO Anagrafico)")}
              disabledReason={disabledReason("FASCICOLO.TAKE_BO")}
            />
            <ActionCard
              title="Richiedi integrazioni"
                subtitle="Invia al Venditore per documenti mancanti/non conformi."
              icon={<AlertTriangle className="h-5 w-5" />}
              tone="outline"
              enabled={allowed("FASCICOLO.REQUEST_REVIEW_BO")}
              onClick={() => doAction("FASCICOLO.REQUEST_REVIEW_BO", "Richiedi integrazioni (BO Anagrafico)")}
              disabledReason={disabledReason("FASCICOLO.REQUEST_REVIEW_BO")}
            />
            <ActionCard
              title="Valida"
              subtitle="Conferma esito positivo e completa la sezione."
              icon={<CheckCircle2 className="h-5 w-5" />}
              enabled={allowed("FASCICOLO.VALIDATE_BO")}
              onClick={() => doAction("FASCICOLO.VALIDATE_BO", "Valida (BO Anagrafico)")}
              disabledReason={disabledReason("FASCICOLO.VALIDATE_BO")}
            />
            <div className="md:col-span-2 lg:col-span-3">
              <ActionCard
                title="Riapri fascicolo approvato"
                subtitle="Riapertura vera (solo su Approvato)."
                icon={<RotateCcw className="h-5 w-5" />}
                tone="danger"
                enabled={allowed("FASCICOLO.REOPEN")}
                onClick={() => doAction("FASCICOLO.REOPEN", "Riapri fascicolo")}
                disabledReason={disabledReason("FASCICOLO.REOPEN")}
              />
            </div>
        </div>
      )}

      {/* ✅ BOF */}
      {role === "BOF" && (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <ActionCard
              title="Prendi in carico"
              subtitle="Inizia verifiche finanziarie."
              icon={<Hand className="h-5 w-5" />}
              enabled={allowed("FASCICOLO.TAKE_BOF")}
              onClick={() => doAction("FASCICOLO.TAKE_BOF", "Prendi in carico (BO Finanziario)")}
              disabledReason={disabledReason("FASCICOLO.TAKE_BOF")}
            />
            <ActionCard
              title="Richiedi integrazioni"
              subtitle="Invia al Venditore per integrazioni finanziarie."
              icon={<AlertTriangle className="h-5 w-5" />}
              tone="outline"
              enabled={allowed("FASCICOLO.REQUEST_REVIEW_BOF")}
              onClick={() => doAction("FASCICOLO.REQUEST_REVIEW_BOF", "Richiedi integrazioni (BO Finanziario)")}
              disabledReason={disabledReason("FASCICOLO.REQUEST_REVIEW_BOF")}
            />
            <ActionCard
              title="Valida"
              subtitle="Completa la sezione finanziaria."
              icon={<CheckCircle2 className="h-5 w-5" />}
              enabled={allowed("FASCICOLO.VALIDATE_BOF")}
              onClick={() => doAction("FASCICOLO.VALIDATE_BOF", "Valida (BO Finanziario)")}
              disabledReason={disabledReason("FASCICOLO.VALIDATE_BOF")}
            />
            <div className="md:col-span-2 lg:col-span-3">
              <ActionCard
                title="Riapri fascicolo approvato"
                subtitle="Riapertura vera (solo su Approvato)."
                icon={<RotateCcw className="h-5 w-5" />}
                tone="danger"
                enabled={allowed("FASCICOLO.REOPEN")}
                onClick={() => doAction("FASCICOLO.REOPEN", "Riapri fascicolo")}
                disabledReason={disabledReason("FASCICOLO.REOPEN")}
              />
            </div>
        </div>
      )}

      {/* ✅ BOU */}
      {role === "BOU" && (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <ActionCard
              title="Prendi in carico"
              subtitle="Inizia verifiche permuta/usato."
              icon={<Hand className="h-5 w-5" />}
              enabled={allowed("FASCICOLO.TAKE_BOU")}
              onClick={() => doAction("FASCICOLO.TAKE_BOU", "Prendi in carico (BO Permuta)")}
              disabledReason={disabledReason("FASCICOLO.TAKE_BOU")}
            />
            <ActionCard
              title="Richiedi integrazioni"
              subtitle="Invia al Venditore per integrazioni permuta."
              icon={<AlertTriangle className="h-5 w-5" />}
              tone="outline"
              enabled={allowed("FASCICOLO.REQUEST_REVIEW_BOU")}
              onClick={() => doAction("FASCICOLO.REQUEST_REVIEW_BOU", "Richiedi integrazioni (BO Permuta)")}
              disabledReason={disabledReason("FASCICOLO.REQUEST_REVIEW_BOU")}
            />
            <ActionCard
              title="Valida"
              subtitle="Completa la sezione permuta/usato."
              icon={<CheckCircle2 className="h-5 w-5" />}
              enabled={allowed("FASCICOLO.VALIDATE_BOU")}
              onClick={() => doAction("FASCICOLO.VALIDATE_BOU", "Valida (BO Permuta)")}
              disabledReason={disabledReason("FASCICOLO.VALIDATE_BOU")}
            />
            <div className="md:col-span-2 lg:col-span-3">
              <ActionCard
                title="Riapri fascicolo approvato"
                subtitle="Riapertura vera (solo su Approvato)."
                icon={<RotateCcw className="h-5 w-5" />}
                tone="danger"
                enabled={allowed("FASCICOLO.REOPEN")}
                onClick={() => doAction("FASCICOLO.REOPEN", "Riapri fascicolo")}
                disabledReason={disabledReason("FASCICOLO.REOPEN")}
              />
            </div>
        </div>
      )}

      {/* ✅ CONSEGNATORE */}
      {role === "CONSEGNATORE" && (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <ActionCard
              title="Prendi in carico"
              subtitle="Presa in carico su Approvato (senza cambio stato)."
              icon={<UserCheck className="h-5 w-5" />}
              enabled={allowed("DELIVERY.TAKE")}
              onClick={() => doAction("DELIVERY.TAKE", "Prendi in carico (Consegna)")}
              disabledReason={disabledReason("DELIVERY.TAKE")}
            />
            <ActionCard
              title="Carica documenti consegna"
              subtitle="Upload documenti richiesti per consegna."
              icon={<FileUp className="h-5 w-5" />}
              enabled={allowed("DELIVERY.UPLOAD")}
              onClick={() => doAction("DELIVERY.UPLOAD", "Carica documenti consegna")}
              disabledReason={disabledReason("DELIVERY.UPLOAD")}
            />
            <ActionCard
              title="Invia a controllo consegna"
              subtitle="Invia al Controllo consegna."
              icon={<ArrowRightCircle className="h-5 w-5" />}
              enabled={allowed("DELIVERY.SEND_TO_VRC")}
              onClick={() => doAction("DELIVERY.SEND_TO_VRC", "Invia a Controllo consegna")}
              disabledReason={disabledReason("DELIVERY.SEND_TO_VRC")}
            />
        </div>
      )}

      {/* ✅ VRC */}
      {role === "VRC" && (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <ActionCard
              title="Prendi in carico"
              subtitle="Avvia verifiche consegna."
              icon={<Hand className="h-5 w-5" />}
              enabled={allowed("VRC.TAKE")}
              onClick={() => doAction("VRC.TAKE", "Prendi in carico (Controllo consegna)")}
              disabledReason={disabledReason("VRC.TAKE")}
            />
            <ActionCard
              title="Richiedi integrazioni"
              subtitle="Rimanda all'Operatore consegna per documenti mancanti."
              icon={<AlertTriangle className="h-5 w-5" />}
              tone="outline"
              enabled={allowed("VRC.REQUEST_FIX")}
              onClick={() => doAction("VRC.REQUEST_FIX", "Richiedi integrazioni (Controllo consegna)")}
              disabledReason={disabledReason("VRC.REQUEST_FIX")}
            />
            <ActionCard
              title="Valida consegna"
              subtitle="Chiude il processo (→ Completato)."
              icon={<CheckCircle2 className="h-5 w-5" />}
              enabled={allowed("VRC.VALIDATE")}
              onClick={() => doAction("VRC.VALIDATE", "Valida consegna")}
              disabledReason={disabledReason("VRC.VALIDATE")}
            />
          </div>
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
    </div>
  );
}