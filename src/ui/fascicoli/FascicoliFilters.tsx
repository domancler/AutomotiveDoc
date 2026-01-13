import * as React from "react";
import type { Fascicolo } from "@/mock/fascicoli";
import { Button } from "@/ui/components/button";
import { cn } from "@/lib/utils";

export type DocFilter =
  | "missingRequired" // almeno un documento richiesto mancante
  | "unsignedContract" // contratto presente ma non firmato
  | "complete"; // tutti i richiesti presenti (e contratto firmato se presente)

export type FascicoliFilterState = {
  stati: Set<string>;
  assegnatari: Set<string>;
  marche: Set<string>;
  doc: Set<DocFilter>;
};

export function createEmptyFilters(): FascicoliFilterState {
  return {
    stati: new Set(),
    assegnatari: new Set(),
    marche: new Set(),
    doc: new Set(),
  };
}

export function countActive(filters: FascicoliFilterState) {
  return filters.stati.size + filters.assegnatari.size + filters.marche.size + filters.doc.size;
}

function toggleSetValue<T>(set: Set<T>, value: T) {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function uniqueSorted(values: (string | undefined)[]) {
  return Array.from(new Set(values.filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, "it"));
}

function docLabel(k: DocFilter) {
  switch (k) {
    case "missingRequired":
      return "Doc richiesti mancanti";
    case "unsignedContract":
      return "Contratto non firmato";
    case "complete":
      return "Completo";
  }
}

function docMatchForFascicolo(f: Fascicolo, selected: Set<DocFilter>) {
  if (!selected.size) return true;

  const required = f.documenti.filter((d) => d.richiesto);
  const missingRequired = required.some((d) => !d.presente);

  const contract = f.documenti.find((d) => d.tipo === "Contratto di vendita");
  const unsignedContract = Boolean(contract?.presente && contract?.firmato === false);

  // "complete": nessun richiesto mancante e contratto firmato (se esiste)
  const contractOk = contract ? contract.firmato === true : true;
  const complete = !missingRequired && contractOk;

  // OR tra doc filters selezionati
  return (
    (selected.has("missingRequired") && missingRequired) ||
    (selected.has("unsignedContract") && unsignedContract) ||
    (selected.has("complete") && complete)
  );
}

export function applyFascicoliFilters(rows: Fascicolo[], filters: FascicoliFilterState) {
  return rows.filter((f) => {
    // AND tra filtri diversi. Dentro lo stesso filtro: OR (perché è multi-select).
    if (filters.stati.size && !filters.stati.has(f.stato)) return false;
    if (filters.assegnatari.size && !filters.assegnatari.has(f.assegnatario)) return false;
    if (filters.marche.size && !filters.marche.has(f.veicolo.marca)) return false;
    if (!docMatchForFascicolo(f, filters.doc)) return false;
    return true;
  });
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      className={cn("rounded-full", active && "bg-accent")}
    >
      {children}
    </Button>
  );
}

function FilterBlock({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border bg-background p-3", className)}>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function FascicoliFilters({
  rows,
  value,
  onChange,
  defaultOpen = false,
}: {
  rows: Fascicolo[];
  value: FascicoliFilterState;
  onChange: (next: FascicoliFilterState) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  const stati = React.useMemo(() => uniqueSorted(rows.map((r) => r.stato)), [rows]);
  const assegnatari = React.useMemo(() => uniqueSorted(rows.map((r) => r.assegnatario)), [rows]);
  const marche = React.useMemo(() => uniqueSorted(rows.map((r) => r.veicolo.marca)), [rows]);

  const activeCount = countActive(value);

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-2 p-4">
        <div className="flex items-center gap-2">
          <div className="font-semibold">Filtri</div>
          <div className="text-xs text-muted-foreground">AND tra filtri • OR tra opzioni</div>
          {activeCount > 0 && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
              {activeCount} attivi
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => onChange(createEmptyFilters())}>
              Reset
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
            {open ? "Nascondi" : "Mostra"}
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-t p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <FilterBlock title="Stato">
              {stati.map((s) => (
                <Pill
                  key={s}
                  active={value.stati.has(s)}
                  onClick={() => onChange({ ...value, stati: toggleSetValue(value.stati, s) })}
                >
                  {s}
                </Pill>
              ))}
            </FilterBlock>

            <FilterBlock title="Assegnatario">
              {assegnatari.map((a) => (
                <Pill
                  key={a}
                  active={value.assegnatari.has(a)}
                  onClick={() =>
                    onChange({ ...value, assegnatari: toggleSetValue(value.assegnatari, a) })
                  }
                >
                  {a}
                </Pill>
              ))}
            </FilterBlock>

            <FilterBlock title="Marca">
              {marche.map((m) => (
                <Pill
                  key={m}
                  active={value.marche.has(m)}
                  onClick={() => onChange({ ...value, marche: toggleSetValue(value.marche, m) })}
                >
                  {m}
                </Pill>
              ))}
            </FilterBlock>

            <FilterBlock title="Documenti" className="md:col-span-2 xl:col-span-3">
              {(["missingRequired", "unsignedContract", "complete"] as DocFilter[]).map((k) => (
                <Pill
                  key={k}
                  active={value.doc.has(k)}
                  onClick={() => onChange({ ...value, doc: toggleSetValue(value.doc, k) })}
                >
                  {docLabel(k)}
                </Pill>
              ))}
            </FilterBlock>
          </div>
        </div>
      )}
    </div>
  );
}

