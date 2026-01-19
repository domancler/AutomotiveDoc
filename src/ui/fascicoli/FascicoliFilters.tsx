import * as React from "react";
import type { Fascicolo } from "@/mock/fascicoli";
import { Button } from "@/ui/components/button";
import { Input } from "@/ui/components/input";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, X } from "lucide-react";

export type DocFilter =
  | "missingRequired" // almeno un documento richiesto mancante
  | "unsignedContract" // contratto presente ma non firmato
  | "complete"; // tutti i richiesti presenti (e contratto firmato se presente)

export type FascicoliFilterState = {
  stati: Set<string>;
  assegnatari: Set<string>;
  marche: Set<string>;
  doc: Set<DocFilter>;
  /** YYYY-MM-DD */
  createdFrom?: string;
  /** YYYY-MM-DD */
  createdTo?: string;
};

export function createEmptyFilters(): FascicoliFilterState {
  return {
    stati: new Set(),
    assegnatari: new Set(),
    marche: new Set(),
    doc: new Set(),
    createdFrom: undefined,
    createdTo: undefined,
  };
}

export function countActive(filters: FascicoliFilterState) {
  return (
    filters.stati.size +
    filters.assegnatari.size +
    filters.marche.size +
    filters.doc.size +
    (filters.createdFrom ? 1 : 0) +
    (filters.createdTo ? 1 : 0)
  );
}

function toStartOfDayMs(yyyyMmDd: string) {
  return new Date(`${yyyyMmDd}T00:00:00.000`).getTime();
}

function toEndOfDayMs(yyyyMmDd: string) {
  return new Date(`${yyyyMmDd}T23:59:59.999`).getTime();
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

    if (filters.createdFrom) {
      const fromMs = toStartOfDayMs(filters.createdFrom);
      const createdMs = new Date(f.createdAt).getTime();
      if (createdMs < fromMs) return false;
    }

    if (filters.createdTo) {
      const toMs = toEndOfDayMs(filters.createdTo);
      const createdMs = new Date(f.createdAt).getTime();
      if (createdMs > toMs) return false;
    }

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

function DateInput({
  label,
  value,
  onChange,
  min,
  max,
  onClear,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  min?: string;
  max?: string;
  onClear: () => void;
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="relative">
        <CalendarIcon className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="date"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value)}
          className={cn("pl-8", value && "pr-8")}
        />
        {value && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label={`Pulisci data (${label})`}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function addDays(yyyyMmDd: string, days: number) {
  const d = new Date(`${yyyyMmDd}T00:00:00.000`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

function startOfMonthYmd(ymd: string) {
  const d = new Date(`${ymd}T00:00:00.000`);
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function endOfMonthYmd(ymd: string) {
  const d = new Date(`${ymd}T00:00:00.000`);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return d.toISOString().slice(0, 10);
}

export function FascicoliFilters({
  rows,
  value,
  onChange,
  defaultOpen = false,
  showAssegnatario = true,
}: {
  rows: Fascicolo[];
  value: FascicoliFilterState;
  onChange: (next: FascicoliFilterState) => void;
  defaultOpen?: boolean;
  showAssegnatario?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  const stati = React.useMemo(() => uniqueSorted(rows.map((r) => r.stato)), [rows]);
  const assegnatari = React.useMemo(() => uniqueSorted(rows.map((r) => r.assegnatario)), [rows]);
  const marche = React.useMemo(() => uniqueSorted(rows.map((r) => r.veicolo.marca)), [rows]);

  const activeCount = countActive(value);

  const setDateRange = React.useCallback(
    (nextFrom?: string, nextTo?: string) => {
      // "intelligente": se l'utente inverte il range, lo aggiustiamo automaticamente.
      if (nextFrom && nextTo && nextTo < nextFrom) {
        const tmp = nextFrom;
        nextFrom = nextTo;
        nextTo = tmp;
      }

      onChange({
        ...value,
        createdFrom: nextFrom || undefined,
        createdTo: nextTo || undefined,
      });
    },
    [onChange, value]
  );

  const handleFromChange = React.useCallback(
    (next: string) => {
      const nextFrom = next || undefined;
      // se ho gia' un "to" e l'utente sceglie un "from" dopo, spostiamo il "to".
      if (nextFrom && value.createdTo && value.createdTo < nextFrom) {
        setDateRange(nextFrom, nextFrom);
        return;
      }
      setDateRange(nextFrom, value.createdTo);
    },
    [setDateRange, value.createdTo]
  );

  const handleToChange = React.useCallback(
    (next: string) => {
      const nextTo = next || undefined;
      // se ho gia' un "from" e l'utente sceglie un "to" prima, spostiamo il "from".
      if (nextTo && value.createdFrom && nextTo < value.createdFrom) {
        setDateRange(nextTo, nextTo);
        return;
      }
      setDateRange(value.createdFrom, nextTo);
    },
    [setDateRange, value.createdFrom]
  );

  const applyPreset = React.useCallback(
    (preset: "today" | "last7" | "last30" | "thisMonth") => {
      const t = todayYmd();
      if (preset === "today") return setDateRange(t, t);
      if (preset === "last7") return setDateRange(addDays(t, -6), t);
      if (preset === "last30") return setDateRange(addDays(t, -29), t);

      // thisMonth
      return setDateRange(startOfMonthYmd(t), endOfMonthYmd(t));
    },
    [setDateRange]
  );

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

            {showAssegnatario && (
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
            )}

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

            <FilterBlock title="Data creazione">
              <div className="flex w-full flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-xs text-muted-foreground">Preset:</div>
                  <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("today")}
                    className="rounded-full">
                    Oggi
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("last7")}
                    className="rounded-full">
                    Ultimi 7gg
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("last30")}
                    className="rounded-full">
                    Ultimi 30gg
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("thisMonth")}
                    className="rounded-full">
                    Questo mese
                  </Button>
                  {(value.createdFrom || value.createdTo) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDateRange(undefined, undefined)}
                      className="ml-auto"
                    >
                      Pulisci
                    </Button>
                  )}
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  <DateInput
                    label="Da"
                    value={value.createdFrom ?? ""}
                    max={value.createdTo}
                    onClear={() => setDateRange(undefined, value.createdTo)}
                    onChange={handleFromChange}
                  />

                  <DateInput
                    label="A"
                    value={value.createdTo ?? ""}
                    min={value.createdFrom}
                    onClear={() => setDateRange(value.createdFrom, undefined)}
                    onChange={handleToChange}
                  />
                </div>

                {(value.createdFrom || value.createdTo) && (
                  <div className="text-xs text-muted-foreground">
                    Suggerimento: se selezioni una data finale precedente alla iniziale, il range si aggiusta da solo.
                  </div>
                )}
              </div>
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

