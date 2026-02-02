import * as React from "react";

import { Button } from "@/ui/components/button";
import { cn } from "@/lib/utils";

export type NoteConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  noteLabel?: string;
  notePlaceholder?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: "danger" | "default";
  defaultNote?: string;
  onConfirm: (note: string) => void;
  onOpenChange: (open: boolean) => void;
};

export function NoteConfirmDialog({
  open,
  title,
  description,
  noteLabel = "Nota (obbligatoria)",
  notePlaceholder = "Scrivi il motivo...",
  confirmText = "Conferma",
  cancelText = "Annulla",
  tone = "danger",
  defaultNote = "",
  onConfirm,
  onOpenChange,
}: NoteConfirmDialogProps) {
  const [note, setNote] = React.useState(defaultNote);

  React.useEffect(() => {
    if (open) setNote(defaultNote);
  }, [open, defaultNote]);

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

  const canConfirm = note.trim().length > 0;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        className="absolute inset-0 bg-black/40"
        aria-label="Chiudi"
        onClick={() => onOpenChange(false)}
      />

      <div className="relative w-full max-w-md rounded-2xl border bg-background p-5 shadow-xl">
        <div className="space-y-2">
          <div className="text-base font-semibold">{title}</div>
          {description ? (
            <div className="text-sm text-muted-foreground">{description}</div>
          ) : null}
        </div>

        <div className="mt-4 space-y-2">
          <div className="text-sm font-medium">{noteLabel}</div>
          <textarea
            className={cn(
              "min-h-[96px] w-full resize-none rounded-xl border bg-background p-3 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "disabled:opacity-50"
            )}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={notePlaceholder}
            autoFocus
          />
          {!canConfirm ? (
            <div className="text-xs text-muted-foreground">
              Inserisci una nota per poter confermare.
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {cancelText}
          </Button>
          <Button
            disabled={!canConfirm}
            className={cn(
              tone === "danger" &&
                "bg-destructive text-destructive-foreground hover:bg-destructive/90",
              !canConfirm && "opacity-60"
            )}
            onClick={() => {
              if (!canConfirm) return;
              onConfirm(note.trim());
            }}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
