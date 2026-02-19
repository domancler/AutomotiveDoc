import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useFascicolo } from "@/mock/useFascicoliStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/components/card";
import { Badge } from "@/ui/components/badge";
import { Button } from "@/ui/components/button";
import { Input } from "@/ui/components/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/components/tabs";
import { Progress } from "@/ui/components/progress";
import { cn, formatEuro } from "@/lib/utils";
import { FileUp, CheckCircle2, Clock3, Trash2, Car, User, CalendarDays, ChevronDown, Check, Search, PenLine } from "lucide-react";
import { FascicoloActionsTab } from "@/ui/fascicoli/FascicoloActionsTab";
import { useAuth } from "@/auth/AuthProvider";
import { branchStatusBadges, visibleStatusForViewer } from "@/ui/fascicoli/workflowStatus";
import { statoVariant } from "@/ui/fascicoli/status";
import { colorForStatoLabel } from "@/ui/fascicoli/statusColors";
import { States } from "@/workflow/states";
import type { DocumentoTipo } from "@/mock/fascicoli";
import { addDocumentoRow, markDocumentoAssente, markDocumentoPresente, removeDocumentoRow } from "@/mock/runtimeFascicoliStore";
import { ConfirmDialog } from "@/ui/components/confirm-dialog";
import { DocumentPreviewDialog } from "@/ui/components/document-preview-dialog";
import { DocumentSignDialog } from "@/ui/components/document-sign-dialog";
import { can, type FascicoloContext } from "@/auth/can";
import type { Action } from "@/auth/actions";
import type { Role } from "@/auth/roles";

type DocSection = "contratto" | "anagrafica" | "finanziaria" | "permuta" | "consegna";

const DOC_SECTION_LABEL: Record<DocSection, string> = {
  contratto: "Contratto",
  anagrafica: "Anagrafica",
  finanziaria: "Finanziaria",
  permuta: "Permuta",
  consegna: "Consegna",
};

function docSectionForTipo(tipo: DocumentoTipo): DocSection {
  switch (tipo) {
    // Contratto
    case "Contratto di vendita":
    case "Proposta d'acquisto":
    case "Modulo ordine":
    case "Condizioni generali di vendita":
      return "contratto";

    // Anagrafica
    case "Documento identità":
    case "Codice fiscale / Tessera sanitaria":
    case "Patente":
    case "Dichiarazione residenza":
    case "Privacy":
    case "Consenso marketing":
      return "anagrafica";

    // Finanziaria
    case "Richiesta finanziamento":
    case "Delibera finanziaria":
    case "Busta paga / Redditi":
    case "IBAN / Mandato SEPA":
    case "Prova pagamento":
      return "finanziaria";

    // Permuta
    case "Libretto permuta":
    case "Certificato proprietà (CDP)":
    case "Atto di vendita usato":
    case "Perizia permuta":
    case "Foto permuta":
      return "permuta";

    // Consegna
    case "Verbale consegna":
    case "Check-list preconsegna":
    case "Liberatoria consegna":
    case "Assicurazione consegna":
      return "consegna";
  }
}

/**
 * NOTA TIPI:
 * DocumentoTipo nel tuo progetto sembra NON includere tutte le stringhe qui sopra (o non in modo compatibile).
 * Per evitare guerre di tipi, qui trattiamo le tipologie come stringhe UI,
 * e castiamo a DocumentoTipo SOLO quando passiamo al runtime store/mock.
 */
const DOC_TIPI_BY_SECTION: Record<DocSection, readonly string[]> = {
  contratto: ["Contratto di vendita", "Proposta d'acquisto", "Modulo ordine", "Condizioni generali di vendita"],
  anagrafica: [
    "Documento identità",
    "Codice fiscale / Tessera sanitaria",
    "Patente",
    "Dichiarazione residenza",
    "Privacy",
    "Consenso marketing",
  ],
  finanziaria: ["Richiesta finanziamento", "Delibera finanziaria", "Busta paga / Redditi", "IBAN / Mandato SEPA", "Prova pagamento"],
  permuta: ["Libretto permuta", "Certificato proprietà (CDP)", "Atto di vendita usato", "Perizia permuta", "Foto permuta"],
  consegna: ["Verbale consegna", "Check-list preconsegna", "Liberatoria consegna", "Assicurazione consegna"],
} as const;

function allowedDocSectionsForRole(role?: Role): DocSection[] {
  if (!role) return [];
  if (role === "COMMERCIALE") return ["contratto", "anagrafica", "finanziaria", "permuta", "consegna"];
  // BO Anagrafico: gestisce sia anagrafica che contratto (controlli formali e firme)
  if (role === "BO") return ["contratto", "anagrafica"];
  if (role === "BOF") return ["finanziaria"];
  if (role === "BOU") return ["permuta"];
  if (role === "CONSEGNATORE" || role === "VRC") return ["consegna"];
  return [];
}

function reviewSectionsForCommerciale(f: any): DocSection[] {
  // In fase di integrazione, il venditore può operare SOLO sui rami che sono in "Da controllare".
  const bo = f.workflow?.bo;
  const bof = f.workflow?.bof;
  const bou = f.workflow?.bou;
  const sections: DocSection[] = [];
  if (bo === States.DA_RIVEDERE_BO) sections.push("contratto", "anagrafica");
  if (bof === States.DA_RIVEDERE_BOF) sections.push("finanziaria");
  if (bou === States.DA_RIVEDERE_BOU) sections.push("permuta");
  return Array.from(new Set(sections));
}

function formatDateIT(iso: string) {
  try {
    return new Intl.DateTimeFormat("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function firstReviewBranchState(f: any): string | undefined {
  const bo = f.workflow?.bo;
  const bof = f.workflow?.bof;
  const bou = f.workflow?.bou;
  const candidates = [bo, bof, bou].filter(Boolean) as string[];
  return candidates.find((s) => s === States.DA_RIVEDERE_BO || s === States.DA_RIVEDERE_BOF || s === States.DA_RIVEDERE_BOU);
}

function stateForRole(f: any, role?: Role): string | undefined {
  const overall = f.workflow?.overall;
  const bo = f.workflow?.bo ?? overall;
  // fallback compatibilità: se overall è in validazione ma i rami non esistono (vecchi dati),
  // assumili “in attesa di presa in carico” nel ramo specifico.
  const bof = f.workflow?.bof ?? (overall === States.DA_VALIDARE_BO ? States.DA_VALIDARE_BOF : overall);
  const bou = f.workflow?.bou ?? (overall === States.DA_VALIDARE_BO ? States.DA_VALIDARE_BOU : overall);

  if (role === "BO") return bo;
  if (role === "BOF") return bof;
  if (role === "BOU") return bou;
  if (role === "COMMERCIALE") return firstReviewBranchState(f) ?? overall;
  if (role === "CONSEGNATORE") return overall;
  if (role === "VRC") return f.workflow?.consegna ?? overall;
  return overall;
}

function TipologiePicker(props: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  /** Tipologie selezionabili per il ruolo corrente */
  allowedTipi: string[];
  /** Quando true mostra i gruppi per sezione */
  showGroups?: boolean;
}) {
  const { value, onChange, disabled, allowedTipi, showGroups } = props;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // click fuori per chiudere
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const el = wrapRef.current;
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (!el) return;
      if (el.contains(target)) return;
      setOpen(false);
    }
    if (!open) return;
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const normQ = q.trim().toLowerCase();
  const match = (s: string) => (normQ ? s.toLowerCase().includes(normQ) : true);

  const grouped = (Object.keys(DOC_TIPI_BY_SECTION) as DocSection[]).map((sec) => {
    const items = DOC_TIPI_BY_SECTION[sec].filter((t) => allowedTipi.includes(t)).filter((t) => match(t));
    return { sec, items };
  });

  const flat = allowedTipi.filter((t) => match(t));
  const hasAny = showGroups ? grouped.some((g) => g.items.length > 0) : flat.length > 0;

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-background px-3 text-left text-sm",
          disabled && "cursor-not-allowed opacity-50",
        )}
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
      >
        <span className="truncate">{value}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition", open && "rotate-180")} />
      </button>

      {open && !disabled && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-lg border bg-background shadow-xl ring-1 ring-border/50">
          <div className="border-b p-2">
            <div className="flex items-center gap-2 rounded-md border bg-background px-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cerca tipologia..."
                className="h-8 w-full bg-transparent text-sm outline-none"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-72 overflow-auto p-1">
            {!hasAny && <div className="px-2 py-6 text-center text-sm text-muted-foreground">Nessun risultato</div>}

            {showGroups ? (
              grouped
                .filter((g) => g.items.length > 0)
                .map((g) => (
                  <div key={g.sec} className="py-1">
                    <div className="px-2 py-1 text-xs font-medium text-muted-foreground">{DOC_SECTION_LABEL[g.sec]}</div>
                    {g.items.map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={cn(
                          "flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          t === value && "bg-muted",
                        )}
                        onClick={() => {
                          onChange(t);
                          setOpen(false);
                          setQ("");
                        }}
                      >
                        <span className="pr-2">{t}</span>
                        {t === value && <Check className="h-4 w-4 text-muted-foreground" />}
                      </button>
                    ))}
                  </div>
                ))
            ) : (
              flat.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    t === value && "bg-muted",
                  )}
                  onClick={() => {
                    onChange(t);
                    setOpen(false);
                    setQ("");
                  }}
                >
                  <span className="pr-2">{t}</span>
                  {t === value && <Check className="h-4 w-4 text-muted-foreground" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function FascicoloDettaglioPage() {
  const { id } = useParams();
  const fascicoloId = id ?? "";
  const fascicolo = useFascicolo(fascicoloId);
  const { user } = useAuth();
  const isCommercial = user?.role === "COMMERCIALE";

  const [tab, setTab] = useState("overview");
  const [newNote, setNewNote] = useState("");

  // --- Documenti: aggiunta tipologie + paginazione ---
  const [docTipo, setDocTipo] = useState<string>("Documento identità");
  const [docRichiesto, setDocRichiesto] = useState(true);
  const [docNote, setDocNote] = useState("");
  const [docsPage, setDocsPage] = useState(0);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; label: string } | null>(null);
  const [preview, setPreview] = useState<{ open: boolean; url: string; title?: string }>({
    open: false,
    url: "",
    title: undefined,
  });

  const [sign, setSign] = useState<{ open: boolean; url: string; title?: string }>({
    open: false,
    url: "",
    title: undefined,
  });

  // Regola di dominio: le tipologie inserite dai BackOffice sono sempre "richieste".
  // Per evitare casi ambigui (tipologia senza documento ma non "richiesta"), lasciamo il toggle
  // configurabile solo per il venditore.
  useEffect(() => {
    if (!isCommercial) setDocRichiesto(true);
  }, [isCommercial]);

  const ctx: FascicoloContext = useMemo(() => {
    const anyF: any = fascicolo;

    if (!anyF) {
      return {
        state: undefined as any,
        ownerId: undefined,
        hasFinanziamento: false,
        hasPermuta: false,
        inChargeBO: null,
        inChargeBOF: null,
        inChargeBOU: null,
        inChargeDelivery: null,
        inChargeVRC: null,
        deliverySentToVRC: false,
      };
    }

    const state = stateForRole(anyF, user?.role as Role | undefined) as any;

    const overall = anyF.workflow?.overall;
    const hasFinanziamento = Boolean(anyF.hasFinanziamento) || Boolean(anyF.workflow?.bof) || overall === States.DA_VALIDARE_BO;
    const hasPermuta = Boolean(anyF.hasPermuta) || Boolean(anyF.workflow?.bou) || overall === States.DA_VALIDARE_BO;

    return {
      state,
      ownerId: anyF.ownerId ?? undefined,
      hasFinanziamento,
      hasPermuta,
      inChargeBO: anyF.inChargeBO ?? null,
      inChargeBOF: anyF.inChargeBOF ?? null,
      inChargeBOU: anyF.inChargeBOU ?? null,
      inChargeDelivery: anyF.inChargeDelivery ?? null,
      inChargeVRC: anyF.inChargeVRC ?? null,
      deliverySentToVRC: anyF.deliverySentToVRC ?? false,
    };
  }, [fascicolo, user?.role]);

  // Regola di dominio (venditore <-> BO):
  // - Il flag "Richiesto" ha senso solo per il venditore.
  // - Le tipologie inserite dai BackOffice sono SEMPRE richieste.
  // Evita quindi che un BO inserisca una tipologia "non richiesta" e poi possa validare senza allegati.
  useEffect(() => {
    if (!isCommercial) setDocRichiesto(true);
  }, [isCommercial]);

  const allowed = useMemo(() => {
    return (action: Action) => (user ? can(user as any, action, ctx) : false);
  }, [user, ctx]);

  const canOperate =
    allowed("FASCICOLO.EDIT_OWN") ||
    allowed("FASCICOLO.SEND_AS_COMM") ||
    allowed("FASCICOLO.VALIDATE_BO") ||
    allowed("FASCICOLO.REQUEST_REVIEW_BO") ||
    allowed("FASCICOLO.VALIDATE_BOF") ||
    allowed("FASCICOLO.REQUEST_REVIEW_BOF") ||
    allowed("FASCICOLO.VALIDATE_BOU") ||
    allowed("FASCICOLO.REQUEST_REVIEW_BOU") ||
    allowed("DELIVERY.SEND_TO_VRC") ||
    allowed("VRC.VALIDATE") ||
    allowed("VRC.REQUEST_FIX");

  const readOnly = !canOperate;

  const isCommInReview =
    user?.role === "COMMERCIALE" &&
    (ctx.state === States.DA_RIVEDERE_BO || ctx.state === States.DA_RIVEDERE_BOF || ctx.state === States.DA_RIVEDERE_BOU);


  const docStats = useMemo(() => {
    if (!fascicolo) return { required: 0, present: 0 };
    const required = fascicolo.documenti.filter((d) => d.richiesto).length;
    const present = fascicolo.documenti.filter((d) => d.presente).length;
    return { required, present };
  }, [fascicolo]);

    const allowedSections = useMemo(() => {
      const role = user?.role as Role | undefined;
      if (!role) return [];
      const base = allowedDocSectionsForRole(role);

      // Venditore: in fase "Da controllare" può operare SOLO sulle sezioni richieste dai BO (rami in DA_RIVEDERE_*).
      if (role === "COMMERCIALE" && fascicolo?.workflow?.overall === States.DA_VALIDARE_BO) {
        const review = reviewSectionsForCommerciale(fascicolo as any);
        if (review.length > 0) return base.filter((s) => review.includes(s));
      }

      return base;
    }, [user?.role, fascicolo]);

  const allowedTipi = useMemo(() => {
    const all = (allowedSections ?? []).reduce<string[]>((acc, s) => {
      const arr = DOC_TIPI_BY_SECTION[s] ?? [];
      // arr è readonly string[]: lo spalmiamo in acc
      acc.push(...arr);
      return acc;
    }, []);

    return Array.from(new Set(all));
  }, [allowedSections]);

  useEffect(() => {
    if (allowedTipi.length === 0) return;
    if (!allowedTipi.includes(docTipo)) {
      setDocTipo(allowedTipi[0]);
    }
  }, [allowedTipi, docTipo]);

  const DOCS_PAGE_SIZE = 9999;

  const docsTotalPages = useMemo(() => {
    if (!fascicolo) return 1;
    return Math.max(1, Math.ceil(fascicolo.documenti.length / DOCS_PAGE_SIZE));
  }, [fascicolo]);

  const docsRows = useMemo(() => {
    if (!fascicolo) return [];
    const start = docsPage * DOCS_PAGE_SIZE;
    return fascicolo.documenti.slice(start, start + DOCS_PAGE_SIZE);
  }, [fascicolo, docsPage]);

  const docsBySection = useMemo(() => {
    const by: Record<DocSection, typeof docsRows> = {
      contratto: [],
      anagrafica: [],
      finanziaria: [],
      permuta: [],
      consegna: [],
    };
    for (const d of docsRows) {
      const sec = docSectionForTipo(d.tipo);
      by[sec].push(d);
    }
    return by;
  }, [docsRows]);

  useEffect(() => {
    const last = Math.max(0, docsTotalPages - 1);
    if (docsPage > last) setDocsPage(last);
  }, [docsPage, docsTotalPages]);

  const vs = useMemo(() => {
    if (!fascicolo) return null;
    return fascicolo.workflow ? visibleStatusForViewer(fascicolo, user) : null;
  }, [fascicolo, user?.role]);

  const showBackofficeTab = useMemo(() => {
    if (!fascicolo?.workflow) return false;
    const overall = fascicolo.workflow.overall;
    return Boolean(
      overall !== States.BOZZA &&
      overall !== States.NUOVO &&
      overall !== States.APPROVATO &&
      overall !== States.IN_FINALIZZAZIONE &&
      overall !== States.CONSEGNA_IN_ATTESA_PRESA_IN_CARICO &&
      overall !== States.CONSEGNA_IN_VERIFICA &&
      overall !== States.CONSEGNA_DA_CONTROLLARE &&
      overall !== States.COMPLETATO,
    );
  }, [fascicolo]);

  // ✅ early return DOPO hooks
  if (!fascicolo) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Fascicolo non trovato</h1>
        <p className="text-sm text-muted-foreground">ID: {fascicoloId || "—"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fascicolo {fascicolo.numero}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Auto:</span>
              <span className="font-medium text-foreground">
                {fascicolo.veicolo.marca} {fascicolo.veicolo.modello}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Cliente:</span>
              <span className="font-medium text-foreground">{fascicolo.cliente.nome}</span>
            </div>

            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Data:</span>
              <span className="font-medium text-foreground">{formatDateIT(fascicolo.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {vs ? <>
            <Badge
              className="border-0 text-sm px-3 py-1 text-white"
              variant={vs.variant as any}
              style={{ backgroundColor: colorForStatoLabel(vs.label) }}
            >
              {vs.label}
            </Badge>
            {user?.role === "RESPONSABILE" && fascicolo.cancelRequested && (
              <Badge className="border-0 text-xs px-2 py-1 text-white" style={{ backgroundColor: colorForStatoLabel("Annullato") }}>
                Richiesta annullamento
              </Badge>
            )}
          </> : (
            <Badge
              className="border-0 text-sm px-3 py-1 text-white"
              variant={statoVariant(fascicolo.stato) as any}
              style={{ backgroundColor: colorForStatoLabel(fascicolo.stato) }}
            >
              {fascicolo.stato}
            </Badge>
          )}

          <Badge className="text-sm px-3 py-1" variant="outline">
            {formatEuro(fascicolo.valore)}
          </Badge>

          <Badge className="text-sm px-3 py-1" variant="outline">
            Assegnato: {fascicolo.assegnatario}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Avanzamento</CardTitle>
          <CardDescription>
            Documenti richiesti: {docStats.required} · presenti: {docStats.present}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={fascicolo.progress} />
          <div className="text-sm text-muted-foreground">{fascicolo.progress}% completamento</div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="text-lg font-semibold">Azioni</div>
        <FascicoloActionsTab fascicolo={fascicolo} />
      </div>

      <div className="pt-2">
        <div className="text-lg font-semibold">Sezioni</div>
      </div>

      <Tabs value={tab} onValueChange={setTab} defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="docs">Documenti</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="notes">Note</TabsTrigger>
          {showBackofficeTab && <TabsTrigger value="backoffice">Backoffice</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview">
          {/*
            Layout "a colonne" per evitare buchi visivi dovuti ad altezze diverse tra le card.
            - Colonna sinistra: Cliente + Pagamento
            - Colonna destra: Veicolo + Permuta
          */}
          <div className="grid gap-4 lg:grid-cols-2 items-start">
            <div className="flex flex-col gap-4">
              <Card>
              <CardHeader>
                <CardTitle>Cliente</CardTitle>
                <CardDescription>Dati anagrafici e contatti</CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="grid gap-x-10 gap-y-2 sm:grid-cols-2">
                  <div className="space-y-0.5">
                    <div className="text-xs text-muted-foreground">Nome</div>
                    <div className="font-medium">{fascicolo.cliente.nome}</div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs text-muted-foreground">Tipo</div>
                    <div className="font-medium">{fascicolo.cliente.tipo ?? "—"}</div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs text-muted-foreground">Codice fiscale</div>
                    <div className="font-medium">{fascicolo.cliente.codiceFiscale ?? "—"}</div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs text-muted-foreground">Nascita</div>
                    <div className="font-medium">
                      {fascicolo.cliente.dataNascita
                        ? new Date(fascicolo.cliente.dataNascita).toLocaleDateString("it-IT")
                        : "—"}
                      {fascicolo.cliente.luogoNascita ? ` (${fascicolo.cliente.luogoNascita})` : ""}
                    </div>
                  </div>
                  <div className="space-y-0.5 sm:col-span-2">
                    <div className="text-xs text-muted-foreground">Indirizzo</div>
                    <div className="font-medium">{fascicolo.cliente.indirizzo ?? "—"}</div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs text-muted-foreground">Email</div>
                    <div className="font-medium break-all">{fascicolo.cliente.email ?? "—"}</div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs text-muted-foreground">Telefono</div>
                    <div className="font-medium">{fascicolo.cliente.telefono ?? "—"}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pagamento</CardTitle>
                  <CardDescription>Condizioni e modalità</CardDescription>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <div>
                    <span className="text-muted-foreground">Modalità:</span>{" "}
                    {fascicolo.pagamento?.tipo ?? (fascicolo.hasFinanziamento ? "Finanziamento" : "Pagamento diretto")}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Acconto:</span>{" "}
                    {fascicolo.pagamento?.acconto != null ? formatEuro(fascicolo.pagamento.acconto) : "—"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Importo finanziato:</span>{" "}
                    {fascicolo.hasFinanziamento
                      ? fascicolo.pagamento?.importoFinanziato != null
                        ? formatEuro(fascicolo.pagamento.importoFinanziato)
                        : "—"
                      : "Non previsto"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Durata:</span>{" "}
                    {fascicolo.hasFinanziamento
                      ? fascicolo.pagamento?.durataMesi != null
                        ? `${fascicolo.pagamento.durataMesi} mesi`
                        : "—"
                      : "—"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Rata:</span>{" "}
                    {fascicolo.hasFinanziamento
                      ? fascicolo.pagamento?.rataMensile != null
                        ? `${formatEuro(fascicolo.pagamento.rataMensile)}/mese`
                        : "—"
                      : "—"}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col gap-4">
              <Card>
              <CardHeader>
                <CardTitle>Veicolo</CardTitle>
                <CardDescription>Dati veicolo e condizioni economiche</CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="grid gap-x-10 gap-y-2 sm:grid-cols-2">
                  <div className="space-y-0.5">
                    <div className="text-xs text-muted-foreground">Marca</div>
                    <div className="font-medium">{fascicolo.veicolo.marca}</div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs text-muted-foreground">Modello</div>
                    <div className="font-medium">{fascicolo.veicolo.modello}</div>
                  </div>
                  <div className="space-y-0.5 sm:col-span-2">
                    <div className="text-xs text-muted-foreground">Versione</div>
                    <div className="font-medium">{fascicolo.veicolo.versione ?? "—"}</div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs text-muted-foreground">Anno</div>
                    <div className="font-medium">{fascicolo.veicolo.anno ?? "—"}</div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs text-muted-foreground">Alimentazione</div>
                    <div className="font-medium">{fascicolo.veicolo.alimentazione ?? "—"}</div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs text-muted-foreground">Cambio</div>
                    <div className="font-medium">{fascicolo.veicolo.cambio ?? "—"}</div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs text-muted-foreground">Colore</div>
                    <div className="font-medium">{fascicolo.veicolo.colore ?? "—"}</div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs text-muted-foreground">Targa</div>
                    <div className="font-medium">{fascicolo.veicolo.targa ?? "—"}</div>
                  </div>
                  <div className="space-y-0.5 sm:col-span-2">
                    <div className="text-xs text-muted-foreground">Telaio</div>
                    <div className="font-medium break-all">{fascicolo.veicolo.vin ?? fascicolo.veicolo.telaio ?? "—"}</div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs text-muted-foreground">Listino</div>
                    <div className="font-medium">
                      {fascicolo.veicolo.prezzoListino != null ? formatEuro(fascicolo.veicolo.prezzoListino) : "—"}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs text-muted-foreground">Concordato</div>
                    <div className="font-medium">
                      {fascicolo.veicolo.prezzoConcordato != null ? formatEuro(fascicolo.veicolo.prezzoConcordato) : "—"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Permuta</CardTitle>
                  <CardDescription>Usato / veicolo in ritiro</CardDescription>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <div>
                    <span className="text-muted-foreground">Prevista:</span> {fascicolo.hasPermuta ? "Sì" : "No"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Veicolo:</span>{" "}
                    {fascicolo.hasPermuta ? fascicolo.permuta?.veicolo ?? "—" : "—"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Targa:</span> {fascicolo.hasPermuta ? fascicolo.permuta?.targa ?? "—" : "—"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">KM:</span>{" "}
                    {fascicolo.hasPermuta
                      ? fascicolo.permuta?.km != null
                        ? fascicolo.permuta.km.toLocaleString("it-IT")
                        : "—"
                      : "—"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Valore stimato:</span>{" "}
                    {fascicolo.hasPermuta
                      ? fascicolo.permuta?.valoreStimato != null
                        ? formatEuro(fascicolo.permuta.valoreStimato)
                        : "—"
                      : "—"}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="docs">
          <Card>
            <CardHeader>
              <CardTitle>Documenti</CardTitle>
              <CardDescription>Gestione tipologie e allegati</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/*{readOnly && (*/}
              {/*  <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">*/}
              {/*    Solo lettura: prendi in carico il fascicolo per operare sui documenti.*/}
              {/*  </div>*/}
              {/*)}*/}

              <div className="rounded-lg border p-3">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Tipologia</div>
                    <TipologiePicker
                      value={docTipo}
                      onChange={(v) => setDocTipo(v)}
                      allowedTipi={allowedTipi}
                      showGroups={user?.role === "COMMERCIALE"}
                      disabled={readOnly || isCommInReview || allowedTipi.length === 0}
                    />
                    {allowedTipi.length === 0 && <div className="mt-1 text-xs text-muted-foreground">Nessuna tipologia disponibile</div>}
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Note (opzionale)</div>
                    <Input value={docNote} onChange={(e) => setDocNote(e.target.value)} placeholder="Es: cointestatario" disabled={readOnly || isCommInReview} />
                  </div>

                  <div className="space-y-1">
                    {/*<div className="text-xs font-medium text-muted-foreground">Richiesto</div>*/}
                    {/*<div className="flex h-9 items-center">*/}
                    {/*  <label className="inline-flex items-center gap-2">*/}
                    {/*    <input*/}
                    {/*      type="checkbox"*/}
                    {/*      checked={docRichiesto}*/}
                    {/*      onChange={(e) => setDocRichiesto(e.target.checked)}*/}
                    {/*      className="peer sr-only"*/}
                    {/*      disabled={readOnly || !isCommercial}*/}
                    {/*    />*/}
                    {/*    <span className="relative inline-flex h-6 w-11 items-center rounded-full border bg-muted transition-colors peer-checked:bg-foreground/80">*/}
                    {/*      <span className="inline-block h-5 w-5 translate-x-1 rounded-full bg-background shadow transition peer-checked:translate-x-5" />*/}
                    {/*    </span>*/}
                    {/*    <span className="text-sm text-muted-foreground">*/}
                    {/*      {isCommercial ? (docRichiesto ? "Sì" : "No") : "Sempre"}*/}
                    {/*    </span>*/}
                    {/*  </label>*/}
                    {/*</div>*/}
                  </div>

                  <div className="flex items-end justify-end">
                    <Button
                      onClick={() => {
                        addDocumentoRow(fascicoloId, {
                          tipo: docTipo as DocumentoTipo,
                          // Venditore può marcare tipologie facoltative. BackOffice: sempre richieste.
                          richiesto: isCommercial ? docRichiesto : true,
                          note: docNote.trim() ? docNote.trim() : undefined,
                        });
                        setDocNote("");
                      }}
                      disabled={readOnly || isCommInReview || allowedTipi.length === 0}
                    >
                      Aggiungi tipologia
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {(Object.keys(DOC_TIPI_BY_SECTION) as DocSection[]).map((sec) => {
                  const rows = docsBySection[sec];
                  if (!rows || rows.length === 0) return null;

                  const canEditSection = !readOnly && allowedSections.indexOf(sec) !== -1;
                  const defaultOpen = user?.role === "COMMERCIALE" ? true : allowedSections.indexOf(sec) !== -1;
                  const required = rows.filter((r) => r.richiesto).length;
                  const present = rows.filter((r) => r.presente).length;

                  return (
                    <details key={sec} className="overflow-hidden rounded-lg border" defaultOpen={defaultOpen}>
                      <summary className="flex cursor-pointer items-center justify-between gap-3 bg-muted/30 px-4 py-3">
                        <div className="font-medium">{DOC_SECTION_LABEL[sec]}</div>
                        <div className="text-xs text-muted-foreground">
                          Documenti richiesti: {required} · presenti: {present}
                        </div>
                      </summary>

                      {/*{!canEditSection && (*/}
                      {/*  <div className="border-t bg-muted/10 px-4 py-3 text-sm text-muted-foreground">*/}
                      {/*    {readOnly ? "Solo lettura: prendi in carico il fascicolo per operare sui documenti." : "Solo lettura: questa sezione è gestita da un altro reparto."}*/}
                      {/*  </div>*/}
                      {/*)}*/}

                      <div className="border-t">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/60 text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium">Tipo</th>
                            <th className="px-4 py-3 text-left font-medium">Richiesto</th>
                            <th className="px-4 py-3 text-left font-medium">Presente</th>
                            <th className="px-4 py-3 text-left font-medium">Note</th>
                          </tr>
                          </thead>
                          <tbody>
                          {rows.map((d) => (
                            <tr key={d.id} className="border-t">
                              <td className="px-4 py-3 font-medium">{d.tipo}</td>
                              <td className="px-4 py-3">{d.richiesto ? "Sì" : "No"}</td>
                              <td className="px-4 py-3">
                                  <span className={cn("inline-flex items-center gap-2", d.presente ? "text-foreground" : "text-muted-foreground")}>
                                    {d.presente ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                                    {d.presente ? "Presente" : "Mancante"}
                                  </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="text-muted-foreground">{d.note?.trim() ? d.note : "—"}</div>
                                  <div className="flex flex-wrap items-center justify-end gap-2">
                                    {(() => {
                                      const canDeleteTipologia = canEditSection && !(user?.role === "COMMERCIALE" && isCommInReview);
                                      return (
                                        <>
                                          {d.presente && d.fileUrl && (
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() =>
                                                setPreview({ open: true, url: d.fileUrl!, title: d.tipo })
                                              }
                                            >
                                              <Search className="h-4 w-4" /> Preview
                                            </Button>
                                          )}

                                          {d.presente && d.fileUrl && (
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => setSign({ open: true, url: d.fileUrl!, title: d.tipo })}
                                            >
                                              <PenLine className="h-4 w-4" /> Firma
                                            </Button>
                                          )}
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => markDocumentoPresente(fascicoloId, d.id)}
                                            disabled={!canEditSection || d.presente}
                                          >
                                            <FileUp className="h-4 w-4" /> Carica
                                          </Button>

                                          {canDeleteTipologia ? (
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => setRemoveTarget({ id: d.id, label: d.tipo })}
                                              disabled={!canEditSection}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          ) : (
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => markDocumentoAssente(fascicoloId, d.id)}
                                              disabled={!canEditSection || !d.presente}
                                            >
                                              <Trash2 className="h-4 w-4" /> Rimuovi
                                            </Button>
                                          )}
                                        </>
                                      );
                                    })()}</div>
                                </div>
                              </td>
                            </tr>
                          ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  );
                })}
              </div>

              <ConfirmDialog
                open={!!removeTarget}
                title="Eliminare tipologia?"
                description="Stai per eliminare la tipologia dal fascicolo. Se è presente anche un documento caricato, verrà rimosso insieme alla riga."
                confirmText="Elimina"
                cancelText="Annulla"
                onOpenChange={(o) => !o && setRemoveTarget(null)}
                onConfirm={() => {
                  if (!removeTarget) return;
                  removeDocumentoRow(fascicoloId, removeTarget.id);
                  setRemoveTarget(null);
                }}
              />

              <DocumentPreviewDialog
                open={preview.open}
                title={preview.title}
                fileUrl={preview.url}
                onOpenChange={(o) => setPreview((p) => ({ ...p, open: o }))}
              />

              <DocumentSignDialog
                open={sign.open}
                title={sign.title}
                fileUrl={sign.url}
                onOpenChange={(o) => setSign((s) => ({ ...s, open: o }))}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
              <CardDescription>Eventi del fascicolo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ol className="space-y-3">
                {fascicolo?.timeline
                  .slice()
                  .reverse()
                  .map((t, idx) => (
                    <li key={idx} className="rounded-lg border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-medium">{t.event}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(t.at).toLocaleString("it-IT")} · {t.actor}
                        </div>
                      </div>
                    </li>
                  ))}
              </ol>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle>Note</CardTitle>
              <CardDescription>Commenti operativi</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/*{readOnly && (*/}
              {/*  <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">*/}
              {/*    Solo lettura: prendi in carico il fascicolo per aggiungere note.*/}
              {/*  </div>*/}
              {/*)}*/}
              <div className="space-y-2">
                {!(fascicolo) || fascicolo.note.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Nessuna nota.</div>
                ) : (
                  fascicolo.note
                    .slice()
                    .reverse()
                    .map((n) => (
                      <div key={n.id} className="rounded-lg border p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-medium">{n.author}</div>
                          <div className="text-xs text-muted-foreground">{new Date(n.at).toLocaleString("it-IT")}</div>
                        </div>
                        <div className="mt-2 text-sm">{n.text}</div>
                      </div>
                    ))
                )}
              </div>

              <div className="rounded-lg border p-3">
                <div className="text-sm font-medium">Aggiungi nota</div>
                <div className="mt-2 flex flex-col gap-2 md:flex-row">
                  <Input value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder={readOnly ? "Solo lettura" : "Scrivi qui..."} disabled={readOnly} />
                  <Button
                    onClick={() => {
                      setNewNote("");
                      alert("Demo: qui salveresti la nota su backend 🙂");
                    }}
                    disabled={readOnly || !newNote.trim()}
                  >
                    Pubblica
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {showBackofficeTab && (
          <TabsContent value="backoffice">
            <Card>
              <CardHeader>
                <CardTitle>Stati BackOffice</CardTitle>
                <CardDescription>Dettaglio dei rami indipendenti (anagrafico, finanziario, permuta)</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {(() => {
                  const s = branchStatusBadges(fascicolo);
                  return (
                    <>
                      <Badge
                        className="border-0 text-white"
                        variant={s.bo.variant as any}
                        style={{ backgroundColor: colorForStatoLabel(s.bo.label) }}
                      >
                        Anagrafico: {s.bo.label}
                      </Badge>
                      <Badge
                        className="border-0 text-white"
                        variant={s.bof.variant as any}
                        style={{ backgroundColor: colorForStatoLabel(s.bof.label) }}
                      >
                        Finanziario: {s.bof.label}
                      </Badge>
                      <Badge
                        className="border-0 text-white"
                        variant={s.bou.variant as any}
                        style={{ backgroundColor: colorForStatoLabel(s.bou.label) }}
                      >
                        Permuta: {s.bou.label}
                      </Badge>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}