import { useMemo, useState } from "react";
import { useFascicoli } from "@/mock/useFascicoliStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/card";
import { Input } from "@/ui/components/input";
import { FascicoliTable } from "@/ui/fascicoli/FascicoliTable";
import { FascicoliFilters, applyFascicoliFilters, createEmptyFilters } from "@/ui/fascicoli/FascicoliFilters";
import { FascicoliCards } from "@/ui/fascicoli/FascicoliCards";

export function FascicoliTuttiPage() {
  const fascicoli = useFascicoli();
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState(createEmptyFilters());

  const rows = useMemo(() => {
    const filtered = applyFascicoliFilters(fascicoli, filters);

    const query = q.trim().toLowerCase();
    if (!query) return filtered;

    return filtered.filter((f) =>
      [f.id, f.numero, f.cliente.nome, f.veicolo.marca, f.veicolo.modello, f.veicolo.targa, f.assegnatario, f.stato]
        .filter(Boolean)
        .some((x) => String(x).toLowerCase().includes(query)),
    );
  }, [filters, q]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tutti i fascicoli</h1>
          <p className="text-sm text-muted-foreground">Storico completo (mock).</p>
        </div>
        <div className="w-full md:w-[360px]">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ricerca (AND): stato, cliente, targa..." />
        </div>
      </div>

      <FascicoliFilters rows={fascicoli} value={filters} onChange={setFilters} defaultOpen={false} />

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

