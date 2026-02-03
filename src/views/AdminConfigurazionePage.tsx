import * as React from "react";
import { Card } from "@/ui/components/card";
import { Button } from "@/ui/components/button";
import { Badge } from "@/ui/components/badge";
import { ToggleSwitch } from "@/ui/components/toggle-switch";
import { TipologiaDialog, type TipologiaDialogValue } from "@/ui/components/tipologia-dialog";
import { SEZIONI, type TipologiaDocumento, type TipologiaSezione } from "@/mock/tipologie";
import { useTipologieStore } from "@/mock/useTipologieStore";
import { addTipologia, moveTipologia, toggleTipologiaAttiva, updateTipologia } from "@/mock/runtimeTipologieStore";
import { ChevronDown, ChevronUp, Plus, Pencil } from "lucide-react";

type FilterMode = "ALL" | "ACTIVE" | "INACTIVE";

function sectionLabel(key: TipologiaSezione) {
  return SEZIONI.find((s) => s.key === key)?.label ?? key;
}

function sortByOrd(a: TipologiaDocumento, b: TipologiaDocumento) {
  if (a.sezione !== b.sezione) return a.sezione.localeCompare(b.sezione);
  return a.ordine - b.ordine;
}

export function AdminConfigurazionePage() {
  const tipologie = useTipologieStore();

  const [filter, setFilter] = React.useState<FilterMode>("ALL");
  const [openSections, setOpenSections] = React.useState<Record<TipologiaSezione, boolean>>(() =>
    Object.fromEntries(SEZIONI.map((s) => [s.key, true])) as any
  );

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogTitle, setDialogTitle] = React.useState("Aggiungi tipologia");
  const [dialogConfirmText, setDialogConfirmText] = React.useState("Aggiungi");
  const [dialogInitial, setDialogInitial] = React.useState<TipologiaDialogValue>({
    sezione: "CONTRATTO",
    nome: "",
    obbligatorio: false,
    attivo: true,
  });
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const filtered = tipologie
    .slice()
    .sort(sortByOrd)
    .filter((t) => {
      if (filter === "ACTIVE") return t.attivo;
      if (filter === "INACTIVE") return !t.attivo;
      return true;
    });

  function openAdd(sezione?: TipologiaSezione) {
    setEditingId(null);
    setDialogTitle("Aggiungi tipologia");
    setDialogConfirmText("Aggiungi");
    setDialogInitial({
      sezione: sezione ?? "CONTRATTO",
      nome: "",
      obbligatorio: false,
      attivo: true,
    });
    setDialogOpen(true);
  }

  function openEdit(t: TipologiaDocumento) {
    setEditingId(t.id);
    setDialogTitle("Modifica tipologia");
    setDialogConfirmText("Salva");
    setDialogInitial({
      sezione: t.sezione,
      nome: String(t.nome),
      obbligatorio: t.obbligatorio,
      attivo: t.attivo,
    });
    setDialogOpen(true);
  }

  function onDialogConfirm(val: TipologiaDialogValue) {
    if (editingId) {
      updateTipologia(editingId, {
        sezione: val.sezione,
        nome: val.nome as any,
        obbligatorio: val.obbligatorio,
        attivo: val.attivo,
      });
    } else {
      addTipologia({
        sezione: val.sezione,
        nome: val.nome,
        obbligatorio: val.obbligatorio,
        attivo: val.attivo,
      });
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="text-2xl font-semibold">Configurazione</div>
          <div className="text-sm text-muted-foreground">
            Gestione tipologie documentali per sezione. Le tipologie disattivate restano visibili nei fascicoli storici,
            ma non sono selezionabili nei nuovi.
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end md:shrink-0">
          <select
            className="h-10 w-full rounded-md border bg-background px-3 text-sm sm:w-[170px]"
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterMode)}
          >
            <option value="ALL">Tutte</option>
            <option value="ACTIVE">Solo attive</option>
            <option value="INACTIVE">Solo disattivate</option>
          </select>

          <Button onClick={() => openAdd()} className="w-full gap-2 sm:w-auto">
            <Plus className="h-4 w-4" />
            Aggiungi tipologia
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {SEZIONI.map((s) => {
          const rows = filtered.filter((t) => t.sezione === s.key).sort((a, b) => a.ordine - b.ordine);
          const open = !!openSections[s.key];

          return (
            <Card key={s.key} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 text-left"
                    onClick={() => setOpenSections((x) => ({ ...x, [s.key]: !x[s.key] }))}
                  >
                    <div className="text-lg font-semibold">{sectionLabel(s.key)}</div>
                    <span className="text-muted-foreground">{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span>
                  </button>
                  <Badge variant="outline">{rows.length} tipologie</Badge>
                </div>

                <Button variant="outline" onClick={() => openAdd(s.key)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Aggiungi
                </Button>
              </div>

              {open && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2 pr-3">Tipologia documento</th>
                        <th className="py-2 pr-3">Obbligatorio</th>
                        <th className="py-2 pr-3">Attivo</th>
                        <th className="py-2 pr-3">In uso</th>
                        <th className="py-2 pr-3 text-right">Ordine</th>
                        <th className="py-2 text-right">Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 ? (
                        <tr>
                          <td className="py-4 text-muted-foreground" colSpan={6}>
                            Nessuna tipologia in questa sezione.
                          </td>
                        </tr>
                      ) : (
                        rows.map((t) => (
                          <tr key={t.id} className="border-b last:border-0">
                            <td className="py-3 pr-3">
                              <div className="font-medium">{String(t.nome)}</div>
                              {!t.attivo && <div className="text-xs text-muted-foreground">Disattivata (non selezionabile)</div>}
                            </td>
                            <td className="py-3 pr-3">
                              {t.obbligatorio ? <Badge>Obbligatorio</Badge> : <Badge variant="outline">Facoltativo</Badge>}
                            </td>
                            <td className="py-3 pr-3">
                              <ToggleSwitch
                                checked={t.attivo}
                                onCheckedChange={(next) => toggleTipologiaAttiva(t.id, next)}
                                label={`Attiva ${String(t.nome)}`}
                              />
                            </td>
                            <td className="py-3 pr-3">
                              {t.inUso > 0 ? <Badge variant="outline">{t.inUso}</Badge> : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="py-3 pr-3">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  className="h-8 px-2"
                                  onClick={() => moveTipologia(t.id, "up")}
                                  aria-label="Sposta su"
                                >
                                  <ChevronUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  className="h-8 px-2"
                                  onClick={() => moveTipologia(t.id, "down")}
                                  aria-label="Sposta giù"
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                            <td className="py-3 text-right">
                              <Button variant="outline" className="h-8 gap-2 px-3" onClick={() => openEdit(t)}>
                                <Pencil className="h-4 w-4" />
                                Modifica
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <TipologiaDialog
        open={dialogOpen}
        title={dialogTitle}
        confirmText={dialogConfirmText}
        initialValue={dialogInitial}
        onConfirm={onDialogConfirm}
        onOpenChange={setDialogOpen}
      />

    </div>
  );
}
