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

type DocSection = "contratto" | "anagrafica" | "finanziaria" | "permuta" | "consegna";

function docSectionForTipo(tipo: string): DocSection {
  switch (tipo) {
    case "Contratto di vendita":
      return "contratto";
    case "Privacy":
    case "Consenso marketing":
    case "Documento identità":
    case "Patente":
      return "anagrafica";
    case "Prova pagamento":
      return "finanziaria";
    case "Libretto permuta":
    case "Foto permuta":
      return "permuta";
    case "Verbale consegna":
    case "Assicurazione consegna":
      return "consegna";
    default:
      // future-proof: se arriva una tipologia nuova, considerala "contratto" (neutro)
      return "contratto";
  }
}

function sectionsForRole(role?: Role): DocSection[] {
  if (!role) return [];
  if (role === "COMMERCIALE") return ["contratto", "anagrafica", "finanziaria", "permuta", "consegna"];
  if (role === "BO") return ["anagrafica"];
  if (role === "BOF") return ["finanziaria"];
  if (role === "BOU") return ["permuta"];
  if (role === "CONSEGNATORE" || role === "VRC") return ["consegna"];
  return [];
}

function missingRequiredDocsBySections(f: Fascicolo, sections: DocSection[]): boolean {
  const docs = (f as any).documenti as Array<{ tipo?: string; richiesto?: boolean; presente?: boolean }> | undefined;
  if (!docs || docs.length === 0) return false;
  return docs.some((d) => {
    if (!d || !d.richiesto) return false;
    const sec = docSectionForTipo(String(d.tipo ?? ""));
    if (!sections.includes(sec)) return false;
    return !d.presente;
  });
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
  // fallback: se il fascicolo è in validazione ma i rami non esistono (vecchi dati), assumili “in attesa di presa in carico”
  const bof = (
    (anyF.workflow?.bof ?? (overall === States.DA_VALIDARE_BO ? States.DA_VALIDARE_BOF : overall)) as StateCode
  );
  const bou = (
    (anyF.workflow?.bou ?? (overall === States.DA_VALIDARE_BO ? States.DA_VALIDARE_BOU : overall)) as StateCode
  );

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
    ownerId: (() => {
      if (anyF.ownerId) return anyF.ownerId;
      const raw = typeof f.assegnatario === "string" ? f.assegnatario.trim() : "";
      // In dataset/mock usiamo spesso "—" come placeholder UI: non deve essere interpretato come owner.
      if (!raw || raw === "—" || raw === "-" || raw.toLowerCase() === "nessuno") return undefined;
      return raw.toLowerCase();
    })(),
    // Se esiste il ramo nel workflow, l'area è attiva anche se i flag nel mock sono incompleti.
    // Se il ramo esiste (o lo stiamo inferendo), l’area è attiva.
    hasFinanziamento:
      Boolean(anyF.hasFinanziamento) || hasProvaPagamentoDoc(f) || Boolean(anyF.workflow?.bof) || overall === States.DA_VALIDARE_BO,
    hasPermuta: Boolean(anyF.hasPermuta) || Boolean(anyF.workflow?.bou) || overall === States.DA_VALIDARE_BO,
    inChargeBO: anyF.inChargeBO ?? null,
    inChargeBOF: anyF.inChargeBOF ?? null,
    inChargeBOU: anyF.inChargeBOU ?? null,
    inChargeDelivery: anyF.inChargeDelivery ?? null,
    inChargeVRC: anyF.inChargeVRC ?? null,
    deliverySentToVRC: Boolean(anyF.deliverySentToVRC),
    commDocsComplete: (() => {
      // Per il venditore: completo solo se TUTTE le tipologie richieste hanno un documento.
      const docs = (f as any).documenti as Array<{ richiesto?: boolean; presente?: boolean }> | undefined;
      if (!docs || docs.length === 0) return true;
      return docs.filter((d) => !!d.richiesto).every((d) => !!d.presente);
    })(),
    deliveryDocsComplete: (() => {
      // Per la consegna: completo solo se TUTTE le tipologie richieste della sezione "consegna" hanno un documento.
      return !missingRequiredDocsBySections(f, ["consegna"]);
    })(),
  };
}

function niceStateLabel(state?: string) {
  switch (state) {
    case States.BOZZA:
      return "Bozza";
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
    case States.FASE_FINALE:
      return "Fase finale";
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
    case "FASCICOLO.TAKE_COMM":
      return inState([States.BOZZA]);
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
    case "DELIVERY.SEND_TO_VRC":
      return inState([States.FASE_FINALE, States.DA_RIVEDERE_VRC]);

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
        <>
          <span className="break-words">{disabledReason}</span>
        </>
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
  const missingRequiredDocs = React.useMemo(() => {
    const sections = sectionsForRole(role);
    // se per qualche motivo il ruolo non ha una sezione (admin/supervisore), non blocchiamo il flusso.
    if (sections.length === 0) return false;
    return missingRequiredDocsBySections(fascicolo, sections);
  }, [fascicolo, role]);

  const allowed = (action: Action) =>
    user ? can(user as any, action, ctx) : false;

  const disabledReason = (action: Action) => {
    if (action === "FASCICOLO.SEND_AS_COMM" && role === "COMMERCIALE" && ctx.commDocsComplete === false) {
      return "Non puoi procedere: ci sono tipologie richieste senza documento. Carica i documenti mancanti oppure rimuovi le tipologie.";
    }
    if (action === "DELIVERY.SEND_TO_VRC" && role === "CONSEGNATORE" && ctx.deliveryDocsComplete === false) {
      return "Non puoi procedere: ci sono tipologie richieste senza documento. Carica i documenti mancanti oppure rimuovi le tipologie.";
    }
    return reasonByState(action, state);
  };

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
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <ActionCard
            title="Prendi in carico"
            subtitle="Porta il fascicolo da Bozza a Nuovo."
            icon={<Hand className="h-5 w-5" />}
            enabled={allowed("FASCICOLO.TAKE_COMM")}
            onClick={() => doAction("FASCICOLO.TAKE_COMM", "Prendi in carico (venditore)")}
            disabledReason={disabledReason("FASCICOLO.TAKE_COMM")}
          />
          <ActionCard
            title="Procedi"
            subtitle="Invia il fascicolo alla fase di validazione."
            icon={<Send className="h-5 w-5" />}
            enabled={allowed("FASCICOLO.SEND_AS_COMM") && !missingRequiredDocs}
            onClick={() => doAction("FASCICOLO.SEND_AS_COMM", "Procedi")}
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
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <ActionCard
              title="Prendi in carico"
              subtitle="Inizia le verifiche anagrafiche."
              icon={<Hand className="h-5 w-5" />}
              enabled={allowed("FASCICOLO.TAKE_BO")}
              onClick={() => doAction("FASCICOLO.TAKE_BO", "Prendi in carico (BO Anagrafico)")}
              disabledReason={disabledReason("FASCICOLO.TAKE_BO")}
            />
            <ActionCard
              title="Procedi"
              subtitle={
                missingRequiredDocs
                  ? "Se mancano documenti richiesti, rimanda al Venditore."
                  : "Conferma esito positivo e completa la sezione."
              }
              icon={<CheckCircle2 className="h-5 w-5" />}
              tone={missingRequiredDocs ? "outline" : "default"}
              enabled={
                missingRequiredDocs
                  ? allowed("FASCICOLO.REQUEST_REVIEW_BO")
                  : allowed("FASCICOLO.VALIDATE_BO")
              }
              onClick={() =>
                doAction(
                  missingRequiredDocs ? "FASCICOLO.REQUEST_REVIEW_BO" : "FASCICOLO.VALIDATE_BO",
                  "Procedi (BO Anagrafico)"
                )
              }
              disabledReason={
                disabledReason(
                  missingRequiredDocs ? "FASCICOLO.REQUEST_REVIEW_BO" : "FASCICOLO.VALIDATE_BO"
                )
              }
            />
            <div className="md:col-span-2 xl:col-span-1">
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
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <ActionCard
              title="Prendi in carico"
              subtitle="Inizia verifiche finanziarie."
              icon={<Hand className="h-5 w-5" />}
              enabled={allowed("FASCICOLO.TAKE_BOF")}
              onClick={() => doAction("FASCICOLO.TAKE_BOF", "Prendi in carico (BO Finanziario)")}
              disabledReason={disabledReason("FASCICOLO.TAKE_BOF")}
            />
            <ActionCard
              title="Procedi"
              subtitle={
                missingRequiredDocs
                  ? "Se mancano documenti richiesti, rimanda al Venditore."
                  : "Completa la sezione finanziaria."
              }
              icon={<CheckCircle2 className="h-5 w-5" />}
              tone={missingRequiredDocs ? "outline" : "default"}
              enabled={
                missingRequiredDocs
                  ? allowed("FASCICOLO.REQUEST_REVIEW_BOF")
                  : allowed("FASCICOLO.VALIDATE_BOF")
              }
              onClick={() =>
                doAction(
                  missingRequiredDocs ? "FASCICOLO.REQUEST_REVIEW_BOF" : "FASCICOLO.VALIDATE_BOF",
                  "Procedi (BO Finanziario)"
                )
              }
              disabledReason={
                disabledReason(
                  missingRequiredDocs ? "FASCICOLO.REQUEST_REVIEW_BOF" : "FASCICOLO.VALIDATE_BOF"
                )
              }
            />
            <div className="md:col-span-2 xl:col-span-1">
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
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <ActionCard
              title="Prendi in carico"
              subtitle="Inizia verifiche permuta/usato."
              icon={<Hand className="h-5 w-5" />}
              enabled={allowed("FASCICOLO.TAKE_BOU")}
              onClick={() => doAction("FASCICOLO.TAKE_BOU", "Prendi in carico (BO Permuta)")}
              disabledReason={disabledReason("FASCICOLO.TAKE_BOU")}
            />
            <ActionCard
              title="Procedi"
              subtitle={
                missingRequiredDocs
                  ? "Se mancano documenti richiesti, rimanda al Venditore."
                  : "Completa la sezione permuta/usato."
              }
              icon={<CheckCircle2 className="h-5 w-5" />}
              tone={missingRequiredDocs ? "outline" : "default"}
              enabled={
                missingRequiredDocs
                  ? allowed("FASCICOLO.REQUEST_REVIEW_BOU")
                  : allowed("FASCICOLO.VALIDATE_BOU")
              }
              onClick={() =>
                doAction(
                  missingRequiredDocs ? "FASCICOLO.REQUEST_REVIEW_BOU" : "FASCICOLO.VALIDATE_BOU",
                  "Procedi (BO Permuta)"
                )
              }
              disabledReason={
                disabledReason(
                  missingRequiredDocs ? "FASCICOLO.REQUEST_REVIEW_BOU" : "FASCICOLO.VALIDATE_BOU"
                )
              }
            />
            <div className="md:col-span-2 xl:col-span-1">
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
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-2">
            <ActionCard
              title="Prendi in carico"
              subtitle="Presa in carico su Approvato (senza cambio stato)."
              icon={<UserCheck className="h-5 w-5" />}
              enabled={allowed("DELIVERY.TAKE")}
              onClick={() => doAction("DELIVERY.TAKE", "Prendi in carico (Consegna)")}
              disabledReason={disabledReason("DELIVERY.TAKE")}
            />
            <ActionCard
              title="Procedi"
              subtitle="Invia al Controllo consegna (o ritorna allo stesso controllo se era in integrazione)."
              icon={<ArrowRightCircle className="h-5 w-5" />}
              enabled={allowed("DELIVERY.SEND_TO_VRC") && !missingRequiredDocs}
              onClick={() => doAction("DELIVERY.SEND_TO_VRC", "Procedi (Consegna)")}
              disabledReason={disabledReason("DELIVERY.SEND_TO_VRC")}
            />
        </div>
      )}

      {/* ✅ VRC */}
      {role === "VRC" && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-2">
            <ActionCard
              title="Prendi in carico"
              subtitle="Avvia verifiche consegna."
              icon={<Hand className="h-5 w-5" />}
              enabled={allowed("VRC.TAKE")}
              onClick={() => doAction("VRC.TAKE", "Prendi in carico (Controllo consegna)")}
              disabledReason={disabledReason("VRC.TAKE")}
            />
            <ActionCard
              title="Procedi"
              subtitle="Se mancano documenti richiesti, rimanda all'Operatore consegna. Altrimenti completa la consegna."
              icon={<CheckCircle2 className="h-5 w-5" />}
              enabled={allowed("VRC.REQUEST_FIX") || allowed("VRC.VALIDATE")}
              onClick={() => {
                // Un solo bottone: decide in base ai documenti
                const missing = missingRequiredDocsBySections(fascicolo, ["consegna"]);
                doAction(missing ? "VRC.REQUEST_FIX" : "VRC.VALIDATE", "Procedi (Controllo consegna)");
              }}
              disabledReason={(() => {
                // Se posso validare o richiedere integrazioni, ok. Altrimenti mostra motivo coerente.
                if (allowed("VRC.REQUEST_FIX") || allowed("VRC.VALIDATE")) return "";
                // Preferisci il motivo del "VALIDATE" quando sei in verifica ma non hai in carico
                return disabledReason("VRC.VALIDATE") || disabledReason("VRC.REQUEST_FIX");
              })()}
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
