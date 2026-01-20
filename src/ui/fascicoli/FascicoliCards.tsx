import * as React from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Hash, MoreHorizontal, User } from "lucide-react";

import type { Fascicolo } from "@/mock/fascicoli";
import { Badge } from "@/ui/components/badge";
import { Button, buttonVariants } from "@/ui/components/button";
import { Card } from "@/ui/components/card";
import { cn, formatEuro } from "@/lib/utils";
import { statoVariant } from "@/ui/fascicoli/status";
import { useAuth } from "@/auth/AuthProvider";
import { visibleStatusForRole } from "@/ui/fascicoli/workflowStatus";

type PageSize = 10 | 20 | 50;

function formatDateShort(iso: string) {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(d);
  } catch {
    return iso;
  }
}

function MetaItem({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="inline-flex h-4 w-4 items-center justify-center">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

export function FascicoliCards({
  rows,
  initialPageSize = 10,
}: {
  rows: Fascicolo[];
  initialPageSize?: PageSize;
}) {
  const { user } = useAuth();
  const [pageSize, setPageSize] = React.useState<PageSize>(initialPageSize);
  const [page, setPage] = React.useState(1);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));

  React.useEffect(() => {
    // se cambia dataset/size, assicurati che la pagina sia valida
    setPage((p) => Math.min(Math.max(1, p), pageCount));
  }, [rows.length, pageSize, pageCount]);

  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const slice = rows.slice(start, end);

  const Paginator = (
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
          Pagina <span className="font-medium">{page}</span> / <span className="font-medium">{pageCount}</span>
        </div>

        <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page === pageCount}>
          {">"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setPage(pageCount)} disabled={page === pageCount}>
          {">>"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="space-y-3">
        {slice.map((f) => {
          const vehicle = `${f.veicolo.marca} ${f.veicolo.modello}`;
          const idLabel = f.numero || f.id;
          const vs = f.workflow ? visibleStatusForRole(f, user?.role as any) : null;
          const targaOrVin = f.veicolo.targa
            ? { label: "Targa", value: f.veicolo.targa }
            : f.veicolo.vin
              ? { label: "Telaio", value: f.veicolo.vin }
              : null;

          return (
            <Card key={f.id} className="p-4">
              <div className="flex items-start gap-4">
                {/* avatar placeholder */}
                <div className="mt-0.5 h-10 w-10 shrink-0 rounded-full bg-muted" />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="min-w-0 truncate font-semibold">{vehicle}</div>
                    {vs ? (
                      <Badge className={cn("border-0")} variant={vs.variant as any}>
                        {vs.label}
                      </Badge>
                    ) : (
                      <Badge className={cn("border-0")} variant={statoVariant(f.stato) as any}>
                        {f.stato}
                      </Badge>
                    )}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1">
                    <MetaItem icon={<CalendarDays className="h-4 w-4" />}>Data: {formatDateShort(f.createdAt)}</MetaItem>
                    <MetaItem icon={<User className="h-4 w-4" />}>Operatore: {f.assegnatario}</MetaItem>
                    <MetaItem icon={<Hash className="h-4 w-4" />}>ID: {idLabel}</MetaItem>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-8 gap-y-1 text-sm">
                    <div>
                      <span className="font-medium">Cliente:</span> {f.cliente.nome}
                    </div>
                    {targaOrVin ? (
                      <div>
                        <span className="font-medium">{targaOrVin.label}:</span> {targaOrVin.value}
                      </div>
                    ) : null}
                    <div className="text-muted-foreground">Valore: {formatEuro(f.valore)}</div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    to={`/fascicoli/${f.id}`}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  >
                    Dettagli
                  </Link>
                  <Button variant="ghost" size="icon" aria-label="Altre azioni" disabled>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}

        {slice.length === 0 && (
          <div className="rounded-lg border p-10 text-center text-sm text-muted-foreground">
            Nessun risultato con i filtri attuali.
          </div>
        )}
      </div>

      {Paginator}
    </div>
  );
}
