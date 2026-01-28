import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useFascicolo } from "@/mock/useFascicoliStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/components/card";
import { Badge } from "@/ui/components/badge";
import { Button } from "@/ui/components/button";
import { Input } from "@/ui/components/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/components/tabs";
import { Progress } from "@/ui/components/progress";
import { cn, formatEuro } from "@/lib/utils";
import { FileUp, CheckCircle2, Clock3, Trash2, Car, User, CalendarDays } from "lucide-react";
import { FascicoloActionsTab } from "@/ui/fascicoli/FascicoloActionsTab";
import { useAuth } from "@/auth/AuthProvider";
import { branchStatusBadges, visibleStatusForRole } from "@/ui/fascicoli/workflowStatus";
import { statoVariant } from "@/ui/fascicoli/status";
import { States } from "@/workflow/states";
import type { DocumentoTipo } from "@/mock/fascicoli";
import { addDocumentoRow, markDocumentoPresente, removeDocumentoRow } from "@/mock/runtimeFascicoliStore";
import { ConfirmDialog } from "@/ui/components/confirm-dialog";
import { can, type FascicoloContext } from "@/auth/can";
import type { Action } from "@/auth/actions";
import type { Role } from "@/auth/roles";

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
  return candidates.find(
    (s) =>
      s === States.DA_RIVEDERE_BO ||
      s === States.DA_RIVEDERE_BOF ||
      s === States.DA_RIVEDERE_BOU,
  );
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

export function FascicoloDettaglioPage() {
  const { id } = useParams();
  const fascicolo = useFascicolo(id);
  const { user } = useAuth();

  const [tab, setTab] = useState("overview");
  const [newNote, setNewNote] = useState("");

  // --- Documenti: aggiunta tipologie + paginazione ---
  const [docTipo, setDocTipo] = useState<DocumentoTipo>("Documento identità");
  const [docRichiesto, setDocRichiesto] = useState(true);
  const [docNote, setDocNote] = useState("");
  const [docsPage, setDocsPage] = useState(0);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; label: string } | null>(null);

  if (!fascicolo) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Fascicolo non trovato</h1>
        <p className="text-sm text-muted-foreground">ID: {id}</p>
      </div>
    );
  }

  const docStats = (() => {
    const required = fascicolo.documenti.filter((d) => d.richiesto).length;
    const present = fascicolo.documenti.filter((d) => d.presente).length;
    return { required, present };
  })();

  // --- Read-only finché non sei in carico (o non hai permessi operativi nello stato corrente)
  const ctx: FascicoloContext = useMemo(() => {
    const anyF: any = fascicolo;

    // IMPORTANT: nel dettaglio lo stato deve essere quello "del ramo" del ruolo loggato,
    // altrimenti (es. BO in verifica) rimani in read-only perché overall non cambia.
    const state = stateForRole(anyF, user?.role as Role | undefined) as any;

    // Area attiva: se nel workflow esiste il ramo, deve essere considerata attiva anche se i flag booleani nel mock sono incompleti.
    // Nel flusso attuale i tre rami BO sono sempre attivi. Considera attiva l'area se:
    // - il flag è true, oppure
    // - esiste il ramo nel workflow, oppure
    // - overall è già in validazione (compatibilità con vecchi dati)
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

  const DOCS_PAGE_SIZE = 8;
  const docsTotalPages = Math.max(1, Math.ceil(fascicolo.documenti.length / DOCS_PAGE_SIZE));
  const docsRows = useMemo(() => {
    const start = docsPage * DOCS_PAGE_SIZE;
    return fascicolo.documenti.slice(start, start + DOCS_PAGE_SIZE);
  }, [fascicolo.documenti, docsPage]);

  useEffect(() => {
    const last = Math.max(0, docsTotalPages - 1);
    if (docsPage > last) setDocsPage(last);
  }, [docsPage, docsTotalPages]);

  const vs = fascicolo.workflow ? visibleStatusForRole(fascicolo, user?.role as any) : null;
  const showBackofficeTab = Boolean(
    fascicolo.workflow &&
      fascicolo.workflow.overall !== States.BOZZA &&
      fascicolo.workflow.overall !== States.NUOVO &&
      fascicolo.workflow.overall !== States.APPROVATO &&
      fascicolo.workflow.overall !== States.FASE_FINALE &&
      fascicolo.workflow.overall !== States.DA_VALIDARE_CONSEGNA &&
      fascicolo.workflow.overall !== States.VERIFICHE_CONSEGNA &&
      fascicolo.workflow.overall !== States.DA_RIVEDERE_VRC &&
      fascicolo.workflow.overall !== States.CONSEGNATO
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Fascicolo {fascicolo.numero}
          </h1>
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
            <Badge className="border-0" variant={vs.variant as any}>
              {vs.label}
            </Badge>
          ) : (
            <Badge className="border-0" variant={statoVariant(fascicolo.stato) as any}>
              {fascicolo.stato}
            </Badge>
          )}
          <Badge variant="outline">{formatEuro(fascicolo.valore)}</Badge>
          <Badge variant="outline">Assegnato: {fascicolo.assegnatario}</Badge>
        </div>
      </div>

      {/* Stati BackOffice: mostrati in un tab dedicato quando esiste il workflow */}

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
          {showBackofficeTab && (
            <TabsTrigger value="backoffice">Backoffice</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Cliente</CardTitle>
                <CardDescription>Dati essenziali</CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                <div><span className="text-muted-foreground">Nome:</span> {fascicolo.cliente.nome}</div>
                <div><span className="text-muted-foreground">Email:</span> {fascicolo.cliente.email ?? "—"}</div>
                <div><span className="text-muted-foreground">Telefono:</span> {fascicolo.cliente.telefono ?? "—"}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Veicolo</CardTitle>
                <CardDescription>Informazioni auto</CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                <div><span className="text-muted-foreground">Marca:</span> {fascicolo.veicolo.marca}</div>
                <div><span className="text-muted-foreground">Modello:</span> {fascicolo.veicolo.modello}</div>
                <div><span className="text-muted-foreground">Targa:</span> {fascicolo.veicolo.targa ?? "—"}</div>
                <div><span className="text-muted-foreground">VIN:</span> {fascicolo.veicolo.vin ?? "—"}</div>
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
                  Solo lettura: prendi in carico il fascicolo per aggiungere/rimuovere tipologie e caricare documenti.
                </div>
              )}

              <div className="rounded-lg border p-3">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Tipologia</div>
                    <select
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                      value={docTipo}
                      onChange={(e) => setDocTipo(e.target.value as DocumentoTipo)}
                      disabled={readOnly}
                    >
                      <option value="Contratto di vendita">Contratto di vendita</option>
                      <option value="Privacy">Privacy</option>
                      <option value="Consenso marketing">Consenso marketing</option>
                      <option value="Documento identità">Documento identità</option>
                      <option value="Patente">Patente</option>
                      <option value="Prova pagamento">Prova pagamento</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Note (opzionale)</div>
                    <Input
                      value={docNote}
                      onChange={(e) => setDocNote(e.target.value)}
                      placeholder="Es: cointestatario"
                      disabled={readOnly}
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Richiesto</div>
                    <div className="flex h-9 items-center">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={docRichiesto}
                          onChange={(e) => setDocRichiesto(e.target.checked)}
                          className="peer sr-only"
                          disabled={readOnly}
                        />
                        <span className="relative inline-flex h-6 w-11 items-center rounded-full border bg-muted transition-colors peer-checked:bg-foreground/80">
                          <span className="inline-block h-5 w-5 translate-x-1 rounded-full bg-background shadow transition peer-checked:translate-x-5" />
                        </span>
                        <span className="text-sm text-muted-foreground">{docRichiesto ? "Sì" : "No"}</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-end justify-end">
                    <Button
                      onClick={() => {
                        addDocumentoRow(fascicolo.id, {
                          tipo: docTipo,
                          richiesto: docRichiesto,
                          note: docNote.trim() ? docNote.trim() : undefined,
                        });
                        setDocNote("");
                      }}
                      disabled={readOnly}
                    >
                      Aggiungi tipologia
                    </Button>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border">
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
                    {docsRows.map((d) => (
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
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => markDocumentoPresente(fascicolo.id, d.id)}
                                disabled={readOnly || d.presente}
                              >
                                <FileUp className="h-4 w-4" /> Carica
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setRemoveTarget({ id: d.id, label: d.tipo })}
                                disabled={readOnly}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {docsTotalPages > 1 && (
                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="text-sm text-muted-foreground">
                    Pagina <span className="font-medium text-foreground">{docsPage + 1}</span> / {docsTotalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setDocsPage((p) => Math.max(0, p - 1))} disabled={docsPage === 0}>
                      Precedente
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDocsPage((p) => Math.min(docsTotalPages - 1, p + 1))} disabled={docsPage >= docsTotalPages - 1}>
                      Successiva
                    </Button>
                  </div>
                </div>
              )}

              <ConfirmDialog
                open={!!removeTarget}
                title="Eliminare tipologia?"
                description="Stai per eliminare la tipologia dal fascicolo. Se è presente anche un documento caricato, verrà rimosso insieme alla riga."
                confirmText="Elimina"
                cancelText="Annulla"
                onOpenChange={(o) => !o && setRemoveTarget(null)}
                onConfirm={() => {
                  if (!removeTarget) return;
                  removeDocumentoRow(fascicolo.id, removeTarget.id);
                  setRemoveTarget(null);
                }}
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
                  <Input
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder={readOnly ? "Solo lettura" : "Scrivi qui..."}
                    disabled={readOnly}
                  />
                  <Button
                    onClick={() => {
                      // mock only
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
                <CardDescription>
                  Dettaglio dei rami indipendenti (anagrafico, finanziario, permuta)
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {(() => {
                  const s = branchStatusBadges(fascicolo);
                  return (
                    <>
                      <Badge variant={s.bo.variant as any}>Anagrafico: {s.bo.label}</Badge>
                      <Badge variant={s.bof.variant as any}>Finanziario: {s.bof.label}</Badge>
                      <Badge variant={s.bou.variant as any}>Permuta: {s.bou.label}</Badge>
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
