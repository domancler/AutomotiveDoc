import * as React from "react";
import { Link } from "react-router-dom";
import { ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react";
import type { Fascicolo } from "@/mock/fascicoli";
import { Badge } from "@/ui/components/badge";
import { Progress } from "@/ui/components/progress";
import { Button } from "@/ui/components/button";
import { cn, formatEuro } from "@/lib/utils";
import { statoVariant } from "@/ui/fascicoli/status";

type PageSize = 10 | 20 | 50;

type SortKey =
  | "numero"
  | "cliente"
  | "veicolo"
  | "stato"
  | "valore"
  | "progress"
  | "assegnatario";

type SortDir = "asc" | "desc";

function compareString(a: string, b: string) {
  return a.localeCompare(b, "it", { sensitivity: "base" });
}

function fascicoloSortValue(f: Fascicolo, key: SortKey) {
  switch (key) {
    case "numero":
      return f.numero;
    case "cliente":
      return f.cliente.nome;
    case "veicolo":
      return `${f.veicolo.marca} ${f.veicolo.modello}`;
    case "stato":
      return f.stato;
    case "assegnatario":
      return f.assegnatario;
    case "valore":
      return f.valore;
    case "progress":
      return f.progress;
  }
}

export function FascicoliTable({
  rows,
  initialPageSize = 10,
}: {
  rows: Fascicolo[];
  initialPageSize?: PageSize;
}) {
  const [pageSize, setPageSize] = React.useState<PageSize>(initialPageSize);
  const [page, setPage] = React.useState(1);
  const [sortKey, setSortKey] = React.useState<SortKey | null>(null);
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");


const sortedRows = React.useMemo(() => {
  if (!sortKey) return rows;

  const copy = [...rows];
  copy.sort((a, b) => {
    const av = fascicoloSortValue(a, sortKey);
    const bv = fascicoloSortValue(b, sortKey);

    let cmp = 0;
    if (typeof av === "number" && typeof bv === "number") {
      cmp = av - bv;
    } else {
      cmp = compareString(String(av), String(bv));
    }

    return sortDir === "asc" ? cmp : -cmp;
  });

  return copy;
}, [rows, sortKey, sortDir]);

const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));

  React.useEffect(() => {
    // se cambia dataset/size, assicurati che la pagina sia valida
    setPage((p) => Math.min(Math.max(1, p), pageCount));
  }, [rows.length, pageSize, pageCount]);


React.useEffect(() => {
  // quando cambi ordinamento, riparti dalla prima pagina
  setPage(1);
}, [sortKey, sortDir]);


  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const slice = sortedRows.slice(start, end);


const toggleSort = (key: SortKey) => {
  if (sortKey !== key) {
    setSortKey(key);
    setSortDir("asc");
    return;
  }
  setSortDir((d) => (d === "asc" ? "desc" : "asc"));
};

const SortIcon = ({ active }: { active: boolean }) => {
  if (!active) return <ArrowUpDown className="h-3.5 w-3.5 opacity-70" />;
  return sortDir === "asc" ? (
    <ChevronUp className="h-3.5 w-3.5" />
  ) : (
    <ChevronDown className="h-3.5 w-3.5" />
  );
};

const ThButton = ({
  label,
  k,
}: {
  label: string;
  k: SortKey;
}) => {
  const active = sortKey === k;
  return (
    <button
      type="button"
      onClick={() => toggleSort(k)}
      className={cn(
        "inline-flex items-center gap-2 hover:text-foreground",
        active && "text-foreground",
      )}
    >
      {label}
      <SortIcon active={active} />
    </button>
  );
};

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="text-muted-foreground">
          Mostro <span className="font-medium text-foreground">{rows.length ? start + 1 : 0}</span>–
          <span className="font-medium text-foreground">{Math.min(end, rows.length)}</span> di{" "}
          <span className="font-medium text-foreground">{rows.length}</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs text-muted-foreground">Righe/pagina</div>
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value) as PageSize);
              setPage(1);
            }}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>

          <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={page === 1}>
            {"<<"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
            {"<"}
          </Button>

          <div className="min-w-[110px] text-center">
            Pagina <span className="font-medium">{page}</span> /{" "}
            <span className="font-medium">{pageCount}</span>
          </div>

          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page === pageCount}>
            {">"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPage(pageCount)} disabled={page === pageCount}>
            {">>"}
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium"><ThButton label="Numero" k="numero" /></th>
                <th className="px-4 py-3 text-left font-medium"><ThButton label="Cliente" k="cliente" /></th>
                <th className="px-4 py-3 text-left font-medium"><ThButton label="Veicolo" k="veicolo" /></th>
                <th className="px-4 py-3 text-left font-medium"><ThButton label="Stato" k="stato" /></th>
                <th className="px-4 py-3 text-left font-medium"><ThButton label="Valore" k="valore" /></th>
                <th className="px-4 py-3 text-left font-medium"><ThButton label="Avanzamento" k="progress" /></th>
                <th className="px-4 py-3 text-left font-medium"><ThButton label="Assegnatario" k="assegnatario" /></th>
              </tr>
            </thead>
            <tbody>
              {slice.map((f) => (
                <tr key={f.id} className="border-t hover:bg-accent/30">
                  <td className="px-4 py-3 font-medium">
                    <Link to={`/fascicoli/${f.id}`} className="hover:underline">
                      {f.numero}
                    </Link>
                    <div className="text-xs text-muted-foreground">{f.id}</div>
                  </td>
                  <td className="px-4 py-3">{f.cliente.nome}</td>
                  <td className="px-4 py-3">
                    {f.veicolo.marca} {f.veicolo.modello}
                    {f.veicolo.targa ? (
                      <div className="text-xs text-muted-foreground">Targa: {f.veicolo.targa}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={cn("border-0")} variant={statoVariant(f.stato) as any}>
                      {f.stato}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{formatEuro(f.valore)}</td>
                  <td className="px-4 py-3">
                    <div className="w-[160px]">
                      <Progress value={f.progress} />
                      <div className="mt-1 text-xs text-muted-foreground">{f.progress}%</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{f.assegnatario}</td>
                </tr>
              ))}

              {slice.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Nessun risultato con i filtri attuali.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

