import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { fascicoli } from "@/mock/fascicoli";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/components/card";
import { Badge } from "@/ui/components/badge";
import { Button } from "@/ui/components/button";
import { Input } from "@/ui/components/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/components/tabs";
import { Progress } from "@/ui/components/progress";
import { cn, formatEuro } from "@/lib/utils";
import { statoVariant } from "@/ui/fascicoli/status";
import { FileUp, CheckCircle2, Clock3, XCircle } from "lucide-react";
import { FascicoloActionsTab } from "@/ui/fascicoli/FascicoloActionsTab";

export function FascicoloDettaglioPage() {
  const { id } = useParams();
  const fascicolo = useMemo(() => fascicoli.find((f) => f.id === id), [id]);

  const [tab, setTab] = useState("overview");
  const [newNote, setNewNote] = useState("");

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
    const signed = fascicolo.documenti.filter((d) => d.firmato).length;
    return { required, present, signed };
  })();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Fascicolo {fascicolo.numero}
          </h1>
          <p className="text-sm text-muted-foreground">
            {fascicolo.cliente.nome} · {fascicolo.veicolo.marca} {fascicolo.veicolo.modello}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border-0" variant={statoVariant(fascicolo.stato) as any}>
            {fascicolo.stato}
          </Badge>
          <Badge variant="outline">{formatEuro(fascicolo.valore)}</Badge>
          <Badge variant="outline">Assegnato: {fascicolo.assegnatario}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Avanzamento</CardTitle>
          <CardDescription>
            Documenti richiesti: {docStats.required} · presenti: {docStats.present} · firmati: {docStats.signed}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={fascicolo.progress} />
          <div className="text-sm text-muted-foreground">{fascicolo.progress}% completamento</div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab} defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="docs">Documenti</TabsTrigger>
          <TabsTrigger value="azioni">Azioni</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="notes">Note</TabsTrigger>
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
              <CardDescription>Caricamento / firma (mock)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Tipo</th>
                      <th className="px-4 py-3 text-left font-medium">Richiesto</th>
                      <th className="px-4 py-3 text-left font-medium">Presente</th>
                      <th className="px-4 py-3 text-left font-medium">Firmato</th>
                      <th className="px-4 py-3 text-left font-medium">Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fascicolo.documenti.map((d) => (
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
                          {d.firmato === undefined ? "—" : d.firmato ? (
                            <span className="inline-flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              Sì
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 text-muted-foreground">
                              <XCircle className="h-4 w-4" />
                              No
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" disabled>
                              <FileUp className="h-4 w-4" /> Upload
                            </Button>
                            <Button variant="secondary" size="sm" disabled>
                              Firma
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-muted-foreground">
                Qui puoi agganciare la logica reale (upload su backend, firma digitale, workflow backoffice, ecc.).
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="azioni">
          <FascicoloActionsTab fascicolo={fascicolo} />
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
      </Tabs>
    </div>
  );
}
