import * as React from "react";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/ui/components/button";
import { Card } from "@/ui/components/card";
import { cn } from "@/lib/utils";

type Ymd = string; // YYYY-MM-DD

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toYmd(d: Date): Ymd {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function fromYmd(s?: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatIt(s?: string): string {
  const d = fromYmd(s);
  if (!d) return "";
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

const MONTHS_IT = [
  "Gennaio",
  "Febbraio",
  "Marzo",
  "Aprile",
  "Maggio",
  "Giugno",
  "Luglio",
  "Agosto",
  "Settembre",
  "Ottobre",
  "Novembre",
  "Dicembre",
];
const WEEK_IT = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"]; // monday-first

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, delta: number) {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

function clampToMonthViewAnchor(from?: string, to?: string) {
  const base = fromYmd(from) ?? fromYmd(to) ?? new Date();
  return startOfMonth(base);
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function compareYmd(a: string, b: string) {
  return a.localeCompare(b);
}

type DateRangePickerProps = {
  from?: string;
  to?: string;
  onChange: (range: { from?: string; to?: string }) => void;
  className?: string;
};

/**
 * Date range picker leggero (senza librerie esterne), stile calendario.
 * - UI in italiano
 * - selezione intervallo (da/a)
 */
export function DateRangePicker({ from, to, onChange, className }: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [viewMonth, setViewMonth] = React.useState<Date>(() => clampToMonthViewAnchor(from, to));
  const wrapRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    setViewMonth(clampToMonthViewAnchor(from, to));
  }, [open, from, to]);

  const viewStart = startOfMonth(viewMonth);
  const firstDow = (viewStart.getDay() + 6) % 7; // sunday(0) -> 6, monday(1)->0
  const gridStart = new Date(viewStart);
  gridStart.setDate(viewStart.getDate() - firstDow);

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push(d);
  }

  const fromD = fromYmd(from);
  const toD = fromYmd(to);
  const fromY = fromD ? toYmd(fromD) : undefined;
  const toY = toD ? toYmd(toD) : undefined;

  const onPick = (d: Date) => {
    const ymd = toYmd(d);
    // 1) se non ho from, imposto from
    if (!fromY) {
      onChange({ from: ymd, to: undefined });
      return;
    }
    // 2) se ho from e anche to, riparto
    if (fromY && toY) {
      onChange({ from: ymd, to: undefined });
      return;
    }
    // 3) ho from ma non to: imposto to (swap se serve)
    if (compareYmd(ymd, fromY) < 0) {
      onChange({ from: ymd, to: fromY });
      return;
    }
    onChange({ from: fromY, to: ymd });
  };

  const isInRange = (d: Date) => {
    if (!fromY) return false;
    const y = toYmd(d);
    if (!toY) return y === fromY;
    return compareYmd(y, fromY) >= 0 && compareYmd(y, toY) <= 0;
  };

  const isEdge = (d: Date) => {
    const y = toYmd(d);
    return (fromY && y === fromY) || (toY && y === toY);
  };

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="text-xs text-muted-foreground">Da</div>
          <button
            type="button"
            className={cn(
              "h-9 min-w-[160px] rounded-md border bg-background px-3 text-sm",
              "flex items-center justify-between gap-2",
              open && "ring-2 ring-primary/20"
            )}
            onClick={() => setOpen((v) => !v)}
          >
            <span className={cn(!from ? "text-muted-foreground" : "text-foreground")}>
              {from ? formatIt(from) : "gg/mm/aaaa"}
            </span>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs text-muted-foreground">A</div>
          <button
            type="button"
            className={cn(
              "h-9 min-w-[160px] rounded-md border bg-background px-3 text-sm",
              "flex items-center justify-between gap-2",
              open && "ring-2 ring-primary/20"
            )}
            onClick={() => setOpen((v) => !v)}
          >
            <span className={cn(!to ? "text-muted-foreground" : "text-foreground")}>
              {to ? formatIt(to) : "gg/mm/aaaa"}
            </span>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {open && (
        <Card className="absolute right-0 top-11 z-50 w-[320px] p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewMonth((m) => addMonths(m, -1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border bg-background text-foreground hover:bg-accent"
              aria-label="Mese precedente"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-sm font-medium">
              {MONTHS_IT[viewStart.getMonth()]} {viewStart.getFullYear()}
            </div>
            <button
              type="button"
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border bg-background text-foreground hover:bg-accent"
              aria-label="Mese successivo"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
            {WEEK_IT.map((w) => (
              <div key={w} className="py-1">
                {w}
              </div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-0">
            {days.map((d) => {
              const inMonth = d.getMonth() === viewStart.getMonth();
              const inRange = isInRange(d);
              const edge = isEdge(d);
              const y = toYmd(d);
              const isStart = Boolean(fromY && y === fromY);
              const isEnd = Boolean(toY && y === toY);
              const single = Boolean(fromY && toY && fromY === toY && isStart);

              const rangeMid = inRange && !edge;
              const rounded = single
                ? "rounded-md"
                : isStart && !isEnd
                ? "rounded-l-md"
                : isEnd && !isStart
                ? "rounded-r-md"
                : edge
                ? "rounded-md"
                : "rounded-none";

              return (
                <button
                  key={y}
                  type="button"
                  onClick={() => onPick(d)}
                  className={cn(
                    "h-9 text-sm",
                    "transition-colors",
                    rounded,
                    inMonth ? "text-foreground" : "text-muted-foreground",
                    rangeMid && "bg-primary/10",
                    edge && "bg-primary text-primary-foreground",
                    !edge && "hover:bg-accent"
                  )}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {fromY && toY && !isSameDay(fromD!, toD!)
                ? `${Math.round((toD!.getTime() - fromD!.getTime()) / 86400000) + 1} giorni`
                : fromY && toY
                ? "1 giorno"
                : ""}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange({ from: undefined, to: undefined });
              }}
            >
              Pulisci
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
