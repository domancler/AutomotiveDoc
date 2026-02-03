import * as React from "react";
import { Button } from "@/ui/components/button";
import { Input } from "@/ui/components/input";
import { ToggleSwitch } from "@/ui/components/toggle-switch";
import { cn } from "@/lib/utils";
import { SEZIONI, type TipologiaSezione } from "@/mock/tipologie";

export type TipologiaDialogValue = {
  sezione: TipologiaSezione;
  nome: string;
  obbligatorio: boolean;
  attivo: boolean;
};

export function TipologiaDialog({
  open,
  title,
  initialValue,
  confirmText = "Salva",
  onConfirm,
  onOpenChange,
}: {
  open: boolean;
  title: string;
  initialValue: TipologiaDialogValue;
  confirmText?: string;
  onConfirm: (value: TipologiaDialogValue) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [value, setValue] = React.useState<TipologiaDialogValue>(initialValue);

  React.useEffect(() => {
    if (open) setValue(initialValue);
  }, [open, initialValue]);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    if (open) {
      document.addEventListener("keydown", onKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-black/40" aria-label="Chiudi" onClick={() => onOpenChange(false)} />

      <div className="relative w-full max-w-lg rounded-2xl border bg-background p-5 shadow-xl">
        <div className="space-y-1">
          <div className="text-base font-semibold">{title}</div>
          <div className="text-sm text-muted-foreground">
            Le modifiche influenzano la configurazione di sistema (demo: non persistente al refresh).
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">Sezione</div>
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={value.sezione}
              onChange={(e) => setValue((v) => ({ ...v, sezione: e.target.value as TipologiaSezione }))}
            >
              {SEZIONI.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Nome tipologia</div>
            <Input
              value={value.nome}
              onChange={(e) => setValue((v) => ({ ...v, nome: e.target.value }))}
              placeholder="Es. Documento identità"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <div className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2 sm:w-[220px]">
              <div className="text-sm">
                <div className="font-medium">Obbligatorio</div>
                <div className="text-xs text-muted-foreground">Richiesto per completare il fascicolo</div>
              </div>
              <ToggleSwitch
                checked={value.obbligatorio}
                onCheckedChange={(next) => setValue((v) => ({ ...v, obbligatorio: next }))}
                label="Obbligatorio"
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2 sm:w-[220px]">
              <div className="text-sm">
                <div className="font-medium">Attivo</div>
                <div className="text-xs text-muted-foreground">Se disattivata non è selezionabile</div>
              </div>
              <ToggleSwitch
                checked={value.attivo}
                onCheckedChange={(next) => setValue((v) => ({ ...v, attivo: next }))}
                label="Attivo"
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button
            className={cn("min-w-[110px]")}
            onClick={() => {
              onConfirm({ ...value, nome: value.nome.trim() });
              onOpenChange(false);
            }}
            disabled={!value.nome.trim()}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
