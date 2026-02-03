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
import { FileUp, CheckCircle2, Clock3, Trash2, Car, User, CalendarDays, ChevronDown, Check, Search } from "lucide-react";
import { FascicoloActionsTab } from "@/ui/fascicoli/FascicoloActionsTab";
import { useAuth } from "@/auth/AuthProvider";
import { branchStatusBadges, visibleStatusForRole } from "@/ui/fascicoli/workflowStatus";
import { statoVariant } from "@/ui/fascicoli/status";
import { colorForStatoLabel } from "@/ui/fascicoli/statusColors";
import { States } from "@/workflow/states";
import type { DocumentoTipo } from "@/mock/fascicoli";
import { addDocumentoRow, markDocumentoAssente, markDocumentoPresente, removeDocumentoRow } from "@/mock/runtimeFascicoliStore";
import { ConfirmDialog } from "@/ui/components/confirm-dialog";
import { DocumentPreviewDialog } from "@/ui/components/document-preview-dialog";
import { can, type FascicoloContext } from "@/auth/can";
import type { Action } from "@/auth/actions";
import type { Role } from "@/auth/roles";
import { useTipologieStore } from "@/mock/useTipologieStore";
import type { TipologiaDocumento, TipologiaSezione } from "@/mock/tipologie";

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
// Fallback statico (seed) usato solo se per qualche motivo lo store tipologie non è disponibile.
const DEFAULT_DOC_TIPI_BY_SECTION: Record<DocSection, readonly string[]> = {
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

const DOC_SECTIONS: DocSection[] = ["contratto", "anagrafica", "finanziaria", "permuta", "consegna"];

function docSectionFromSezione(sezione: TipologiaSezione): DocSection {
  switch (sezione) {
    case "CONTRATTO":
      return "contratto";
    case "ANAGRAFICA":
      return "anagrafica";
    case "FINANZIARIA":
      return "finanziaria";
    case "PERMUTA":
      return "permuta";
    case "CONSEGNA":
      return "consegna";
  }
}

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
  /** Mappa tipologie per sezione (serve per raggruppare / nascondere disattivate) */
  tipiBySection?: Record<DocSection, readonly string[]>;
}) {
  const { value, onChange, disabled, allowedTipi, showGroups, tipiBySection } = props;
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

  const bySection = tipiBySection ?? DEFAULT_DOC_TIPI_BY_SECTION;

  const grouped = (Object.keys(bySection) as DocSection[]).map((sec) => {
    const items = bySection[sec].filter((t) => allowedTipi.includes(t)).filter((t) => match(t));
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

  // Tipologie runtime configurabili dall'admin (in-memory)
  const tipologie = useTipologieStore();

  const [tab, setTab] = useState("overview");
  const [newNote, setNewNote] = useState("");

  // --- Documenti: aggiunta tipologie + paginazione ---
  const [docTipo, setDocTipo] = useState<string>("Documento identità");
  const [docNote, setDocNote] = useState("");
  const [docsPage, setDocsPage] = useState(0);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; label: string } | null>(null);
  const [preview, setPreview] = useState<{ open: boolean; url: string; title?: string }>({
    open: false,
    url: "",
    title: undefined,
  });

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

  // L'admin nel progetto è un ruolo “gestionale” (non operativo sui fascicoli):
  // nel dettaglio quindi nascondiamo la sezione Azioni per evitare pulsanti inutili/confusione.
  const showActionsSection = user?.role !== "ADMIN";

  const isCommInReview =
    user?.role === "COMMERCIALE" &&
    (ctx.state === States.DA_RIVEDERE_BO || ctx.state === States.DA_RIVEDERE_BOF || ctx.state === States.DA_RIVEDERE_BOU);


  const docStats = useMemo(() => {
    if (!fascicolo) return { required: 0, present: 0 };

    const required = fascicolo.documenti.filter((d) => {
      const meta = tipologie.find((t) => String(t.nome) === String(d.tipo));
      return meta ? meta.obbligatorio : d.richiesto;
    }).length;

    // "presenti" riferito ai documenti richiesti (coerente con l'etichetta in UI)
    const present = fascicolo.documenti.filter((d) => {
      const meta = tipologie.find((t) => String(t.nome) === String(d.tipo));
      const isReq = meta ? meta.obbligatorio : d.richiesto;
      return isReq && d.presente;
    }).length;

    return { required, present };
  }, [fascicolo, tipologie]);

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

  // Index tipologie per nome -> meta (sezione, attivo, ordine)
  const tipologiaByNome = useMemo(() => {
    const m = new Map<string, TipologiaDocumento>();
    for (const t of tipologie) m.set(String(t.nome), t);
    return m;
  }, [tipologie]);

  // Tipologie attive per sezione (usate nei picker: le disattivate devono essere nascoste)
  const tipiBySectionActive = useMemo(() => {
    const by: Record<DocSection, string[]> = {
      contratto: [],
      anagrafica: [],
      finanziaria: [],
      permuta: [],
      consegna: [],
    };

    const sorted = [...tipologie].sort((a, b) => (a.sezione === b.sezione ? a.ordine - b.ordine : a.sezione.localeCompare(b.sezione)));
    for (const t of sorted) {
      if (!t.attivo) continue;
      const sec = docSectionFromSezione(t.sezione);
      by[sec].push(String(t.nome));
    }

    // fallback seed se lo store è vuoto per qualche motivo
    const hasAny = DOC_SECTIONS.some((s) => by[s].length > 0);
    if (!hasAny) {
      for (const s of DOC_SECTIONS) by[s] = [...DEFAULT_DOC_TIPI_BY_SECTION[s]];
    }
    return by;
  }, [tipologie]);

  const docSectionForTipoRuntime = (tipo: DocumentoTipo): DocSection => {
    const meta = tipologiaByNome.get(String(tipo));
    if (meta) return docSectionFromSezione(meta.sezione);
    return docSectionForTipo(tipo);
  };

  const allowedTipi = useMemo(() => {
    const all = (allowedSections ?? []).reduce<string[]>((acc, s) => {
      const arr = tipiBySectionActive[s] ?? [];
      acc.push(...arr);
      return acc;
    }, []);

    return Array.from(new Set(all));
  }, [allowedSections, tipiBySectionActive]);

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
      const meta = tipologiaByNome.get(String(d.tipo));
      const sec = meta ? docSectionFromSezione(meta.sezione) : docSectionForTipo(d.tipo);
      by[sec].push(d);
    }
    return by;
  }, [docsRows, tipologiaByNome]);

  useEffect(() => {
    const last = Math.max(0, docsTotalPages - 1);
    if (docsPage > last) setDocsPage(last);
  }, [docsPage, docsTotalPages]);

  const vs = useMemo(() => {
    if (!fascicolo) return null;
    return fascicolo.workflow ? visibleStatusForRole(fascicolo, user?.role as any) : null;
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
          {vs ? (
            <Badge
              className="border-0 text-sm px-3 py-1 text-white"
              variant={vs.variant as any}
              style={{ backgroundColor: colorForStatoLabel(vs.label) }}
            >
              {vs.label}
            </Badge>
          ) : (
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
      {showActionsSection && (
        <div className="space-y-3">
          <div className="text-lg font-semibold">Azioni</div>
          <FascicoloActionsTab fascicolo={fascicolo} />
        </div>
      )}
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
          <div className="grid gap-4 lg:grid-cols-4">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Cliente</CardTitle>
                <CardDescription>Dati essenziali</CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                <div>
                  <span className="text-muted-foreground">Nome:</span> {fascicolo.cliente.nome}
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span> {fascicolo.cliente.email ?? "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">Telefono:</span> {fascicolo.cliente.telefono ?? "—"}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Veicolo</CardTitle>
                <CardDescription>Informazioni auto</CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                <div>
                  <span className="text-muted-foreground">Marca:</span> {fascicolo.veicolo.marca}
                </div>
                <div>
                  <span className="text-muted-foreground">Modello:</span> {fascicolo.veicolo.modello}
                </div>
                <div>
                  <span className="text-muted-foreground">Targa:</span> {fascicolo.veicolo.targa ?? "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">VIN:</span> {fascicolo.veicolo.vin ?? "—"}
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
                  <span className="text-muted-foreground">Veicolo:</span> {fascicolo.hasPermuta ? fascicolo.permuta?.veicolo ?? "—" : "—"}
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
        </TabsContent>

        <TabsContent value="docs">
          <Card>
            <CardHeader>
              <CardTitle>Documenti</CardTitle>
              <CardDescription>Gestione tipologie e allegati</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {readOnly && (
                <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  Solo lettura: prendi in carico il fascicolo per operare sui documenti.
                </div>
              )}

              <div className="rounded-lg border p-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Tipologia</div>
                    <TipologiePicker
                      value={docTipo}
                      onChange={(v) => setDocTipo(v)}
                      allowedTipi={allowedTipi}
                      tipiBySection={tipiBySectionActive}
                      showGroups={user?.role === "COMMERCIALE"}
                      disabled={readOnly || isCommInReview || allowedTipi.length === 0}
                    />
                    {allowedTipi.length === 0 && <div className="mt-1 text-xs text-muted-foreground">Nessuna tipologia disponibile</div>}
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Note (opzionale)</div>
                    <Input value={docNote} onChange={(e) => setDocNote(e.target.value)} placeholder="Es: cointestatario" disabled={readOnly || isCommInReview} />
                  </div>

                  <div className="flex items-end justify-end">
                    <Button
                      onClick={() => {
                        const meta = tipologiaByNome.get(String(docTipo));
                        addDocumentoRow(fascicoloId, {
                          tipo: docTipo as DocumentoTipo,
                          // Il requisito "Richiesto" è configurato dall'admin a livello di tipologia.
                          // Se per qualche motivo la meta non esiste (fallback), consideriamo la tipologia richiesta.
                          richiesto: meta ? meta.obbligatorio : true,
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
                {DOC_SECTIONS.map((sec) => {
                  const rows = docsBySection[sec];
                  if (!rows || rows.length === 0) return null;

                  const canEditSection = !readOnly && allowedSections.indexOf(sec) !== -1;
                  const defaultOpen = user?.role === "COMMERCIALE" ? true : allowedSections.indexOf(sec) !== -1;
                  const isRequired = (r: (typeof rows)[number]) => {
                    const meta = tipologiaByNome.get(String(r.tipo));
                    return meta ? meta.obbligatorio : r.richiesto;
                  };
                  const required = rows.filter((r) => isRequired(r)).length;
                  const present = rows.filter((r) => isRequired(r) && r.presente).length;

                  return (
                    <details key={sec} className="overflow-hidden rounded-lg border" defaultOpen={defaultOpen}>
                      <summary className="flex cursor-pointer items-center justify-between gap-3 bg-muted/30 px-4 py-3">
                        <div className="font-medium">{DOC_SECTION_LABEL[sec]}</div>
                        <div className="text-xs text-muted-foreground">
                          Documenti richiesti: {required} · presenti: {present}
                        </div>
                      </summary>

                      {!canEditSection && (
                        <div className="border-t bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
                          {readOnly ? "Solo lettura: prendi in carico il fascicolo per operare sui documenti." : "Solo lettura: questa sezione è gestita da un altro reparto."}
                        </div>
                      )}

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
                              <td className="px-4 py-3 font-medium">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span>{d.tipo}</span>
                                  {(() => {
                                    const meta = tipologiaByNome.get(String(d.tipo));
                                    if (meta && !meta.attivo) {
                                      return <Badge variant="outline" className="text-xs">Disattivata</Badge>;
                                    }
                                    return null;
                                  })()}
                                </div>
                              </td>
                              <td className="px-4 py-3">{(() => {
                                const meta = tipologiaByNome.get(String(d.tipo));
                                const req = meta ? meta.obbligatorio : d.richiesto;
                                return req ? "Sì" : "No";
                              })()}</td>
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
                {fascicolo.timeline
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
              <CardDescription>Commenti operativi (mock)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {readOnly && (
                <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  Solo lettura: prendi in carico il fascicolo per aggiungere note.
                </div>
              )}
              <div className="space-y-2">
                {fascicolo.note.length === 0 ? (
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