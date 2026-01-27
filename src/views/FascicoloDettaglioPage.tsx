import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useFascicolo } from "@/mock/useFascicoliStore";
import { addDocumento, removeDocumento } from "@/mock/runtimeFascicoliStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/components/card";
import { Badge } from "@/ui/components/badge";
import { Button } from "@/ui/components/button";
import { Input } from "@/ui/components/input";
import { ConfirmDialog } from "@/ui/components/confirm-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/components/tabs";
import { Progress } from "@/ui/components/progress";
import { cn, formatEuro } from "@/lib/utils";
import { FileUp, CheckCircle2, Clock3, XCircle, Car, User, CalendarDays, Trash2 } from "lucide-react";
import { FascicoloActionsTab } from "@/ui/fascicoli/FascicoloActionsTab";
import { useAuth } from "@/auth/AuthProvider";
import { branchStatusBadges, visibleStatusForRole } from "@/ui/fascicoli/workflowStatus";
import { statoVariant } from "@/ui/fascicoli/status";

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

export function FascicoloDettaglioPage() {
  const { id } = useParams();
  const fascicolo = useFascicolo(id);
  const { user } = useAuth();

  const [tab, setTab] = useState("overview");
  const [newNote, setNewNote] = useState("");
  const [newDocNote, setNewDocNote] = useState("");
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

  const vs = fascicolo.workflow ? visibleStatusForRole(fascicolo, user?.role as any) : null;
  const showBackofficeTab = Boolean(fascicolo.workflow);

  const DOCUMENTO_TIPI = [
    "Contratto di vendita",
    "Privacy",
    "Consenso marketing",
    "Documento identità",
    "Patente",
    "Prova pagamento",
  ] as const;

  const [selectedTipo, setSelectedTipo] = useState<(typeof DOCUMENTO_TIPI)[number]>(DOCUMENTO_TIPI[0]);

  const PAGE_SIZE = 8;
  const [docsPage, setDocsPage] = useState(1);

  const totalDocs = fascicolo.documenti.length;
  const totalPages = Math.max(1, Math.ceil(totalDocs / PAGE_SIZE));
  const pageStart = (docsPage - 1) * PAGE_SIZE;
  const pagedDocs = fascicolo.documenti.slice(pageStart, pageStart + PAGE_SIZE);

  // Se rimuovi documenti e la pagina corrente esce dal range, rientra nel range.
  useEffect(() => {
    setDocsPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  // se cambia il numero documenti (aggiunta/rimozione), evita di restare su una pagina "vuota"
  useEffect(() => {
    const nextTotalPages = Math.max(1, Math.ceil(totalDocs / PAGE_SIZE));
    setDocsPage((p) => Math.min(p, nextTotalPages));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalDocs]);

  const docLabelForRow = (() => {
    const seen = new Map<string, number>();
    return (tipo: string) => {
      const n = (seen.get(tipo) ?? 0) + 1;
      seen.set(tipo, n);
      // se è la prima occorrenza, niente suffix; altrimenti (2), (3)...
      return n === 1 ? tipo : `${tipo} (${n})`;
    };
  })();

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
              <CardDescription>Caricamento documenti</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-1">
                  <div className="text-sm font-medium">Aggiungi tipologia</div>
                  <div className="text-xs text-muted-foreground">Puoi inserire una nota (es. "cointestatario") durante l’aggiunta.</div>
                </div>

                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                  <select
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm sm:w-[240px]"
                    value={selectedTipo}
                    onChange={(e) => setSelectedTipo(e.target.value as any)}
                  >
                    {DOCUMENTO_TIPI.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={newDocNote}
                    onChange={(e) => setNewDocNote(e.target.value)}
                    placeholder="Note (es. cointestatario)"
                    className="h-9 w-full sm:w-[260px]"
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      addDocumento({
                        fascicoloId: fascicolo.id,
                        tipo: selectedTipo as any,
                        note: newDocNote,
                        actor: user?.name ?? user?.username ?? "Utente",
                      });
                      setNewDocNote("");
                      setDocsPage(1);
                    }}
                  >
                    Aggiungi
                  </Button>
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
                      <th className="px-4 py-3 text-left font-medium">Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedDocs.map((d) => {
                      const rowLabel = docLabelForRow(d.tipo);
                      return (
                        <tr key={d.id} className="border-t">
                          <td className="px-4 py-3 font-medium">{rowLabel}</td>
                        <td className="px-4 py-3">{d.richiesto ? "Sì" : "No"}</td>
                        <td className="px-4 py-3">
                          <span className={cn("inline-flex items-center gap-2", d.presente ? "text-foreground" : "text-muted-foreground")}>
                            {d.presente ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                            {d.presente ? "Presente" : "Mancante"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {d.note ? (
                            <span className="text-foreground">{d.note}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" disabled>
                              <FileUp className="h-4 w-4" /> Upload
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setRemoveTarget({ id: d.id, label: rowLabel });
                              }}
                            >
                              <Trash2 className="h-4 w-4" /> Rimuovi
                            </Button>
                          </div>
                        </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalDocs > PAGE_SIZE && (
                <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-muted-foreground">
                    Mostrati {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, totalDocs)} di {totalDocs}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={docsPage <= 1}
                      onClick={() => setDocsPage((p) => Math.max(1, p - 1))}
                    >
                      Indietro
                    </Button>
                    <div className="text-xs text-muted-foreground">
                      Pagina {docsPage} / {totalPages}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={docsPage >= totalPages}
                      onClick={() => setDocsPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Avanti
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <ConfirmDialog
            open={Boolean(removeTarget)}
            title="Rimuovere tipologia?"
            description={
              removeTarget
                ? `Vuoi rimuovere "${removeTarget.label}"? Se confermi, verrà eliminata la tipologia anche se è già presente un documento caricato.`
                : undefined
            }
            confirmText="Sì, rimuovi"
            cancelText="Annulla"
            tone="destructive"
            onOpenChange={(open) => {
              if (!open) setRemoveTarget(null);
            }}
            onConfirm={() => {
              if (!removeTarget) return;
              removeDocumento({
                fascicoloId: fascicolo.id,
                documentoId: removeTarget.id,
                actor: user?.name ?? user?.username ?? "Utente",
              });
            }}
          />
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
              <CardDescription>Commenti operativi</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
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
                  <Input value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Scrivi qui..." />
                  <Button
                    onClick={() => {
                      // mock only
                      setNewNote("");
                      alert("Demo: qui salveresti la nota su backend 🙂");
                    }}
                    disabled={!newNote.trim()}
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
