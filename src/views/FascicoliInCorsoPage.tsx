import { useMemo, useState } from "react";
import { useFascicoli } from "@/mock/useFascicoliStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/card";
import { Input } from "@/ui/components/input";
import { FascicoliTable } from "@/ui/fascicoli/FascicoliTable";
import { FascicoliFilters, applyFascicoliFilters, createEmptyFilters } from "@/ui/fascicoli/FascicoliFilters";
import { FascicoliCards } from "@/ui/fascicoli/FascicoliCards";

export function FascicoliInCorsoPage() {
  const fascicoli = useFascicoli();
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState(createEmptyFilters());

  const base = useMemo(
    () => fascicoli.filter((f) => f.stato === "In compilazione" || f.stato === "In approvazione"),
    [fascicoli],
  );

  const rows = useMemo(() => {
    const filtered = applyFascicoliFilters(base, filters);

    const query = q.trim().toLowerCase();
    if (!query) return filtered;

    // AND: la search si applica in AND ai filtri
    // La search *non* include campi già coperti da filtri dedicati (es. stato, assegnatario, marca).
    return filtered.filter((f) =>
      [
        f.id,
        f.numero,
        f.cliente.nome,
        f.cliente.email,
        f.cliente.telefono,
        f.veicolo.modello,
        f.veicolo.targa,
        f.veicolo.vin,
      ]
        .filter(Boolean)
        .some((x) => String(x).toLowerCase().includes(query)),
    );
  }, [base, filters, q]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fascicoli in corso</h1>
          <p className="text-sm text-muted-foreground">Quelli su cui stanno lavorando commerciali/backoffice.</p>
        </div>
        <div className="w-full md:w-[360px]">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ricerca (AND): cliente, targa, numero..." />
        </div>
      </div>

      <FascicoliFilters
        rows={base}
        value={filters}
        onChange={setFilters}
        defaultOpen={false}
        showAssegnatario={false}
      />

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

